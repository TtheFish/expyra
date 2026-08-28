using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Domain.Identity;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Auth;

/// <summary>
/// Hız sınırı sayaçları <c>login_code</c> tablosundan okunuyor — ayrı bir throttle
/// tablosu yok. Şifresiz bir sistemde bu sayaçlar bir sertleştirme değil, kimlik
/// doğrulama mekanizmasının kendisi.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class LoginCodeThrottleTests(ApiFactory factory)
{
    [Fact]
    public async Task RequestCode_AralikIcindeIkinciIstek_AyniChallengeIdDonuyorVeMailGitmiyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var first = await AuthApi.RequestCodeAsync(client, email);
        var second = await AuthApi.RequestCodeAsync(client, email);

        // İdempotency (ROADMAP 6.8 dersi): aralık içindeki ikinci istek YENİ KOD ÜRETMEZ.
        second.ChallengeId.ShouldBe(first.ChallengeId);
        second.ExpiresAtUtc.ShouldBe(first.ExpiresAtUtc);

        factory.Emails.CountFor(email).ShouldBe(1);

        var rows = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .CountAsync(x => x.NormalizedEmail == email));

        rows.ShouldBe(1);
    }

    [Fact]
    public async Task RequestCode_AralikGectiktenSonra_YeniKodUretiliyorVeEskisiSupersededOluyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var first = await AuthApi.RequestCodeAsync(client, email);

        using (factory.Clock.Shift(TimeSpan.FromSeconds(61)))
        {
            var second = await AuthApi.RequestCodeAsync(client, email);

            second.ChallengeId.ShouldNotBe(first.ChallengeId);
            factory.Emails.CountFor(email).ShouldBe(2);

            // Aynı anda en fazla 1 geçerli kod: aksi halde saldırganın deneme bütçesi katlanır.
            var pending = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
                .CountAsync(x => x.NormalizedEmail == email && x.Status == LoginCodeStatus.Pending));

            pending.ShouldBe(1);

            // Aralık ikinci koddan sonra uzuyor (60 → 120 sn).
            (second.ResendAvailableAtUtc - factory.Clock.UtcNow)
                .ShouldBeGreaterThan(TimeSpan.FromSeconds(90));
        }
    }

    [Fact]
    public async Task RequestCode_SaatlikEpostaKotasiDoldu_429VeRetryAfterDolu()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        // Kademeli aralıklar (60 → 120 → 300 sn) saati kaydırarak aşılıyor; toplam
        // kaydırma ~18 dk, yani beş kodun hepsi aynı SAATLİK pencerede kalıyor.
        using var shift = factory.Clock.Shift(TimeSpan.Zero);

        await AuthApi.RequestCodeAsync(client, email);

        foreach (var wait in new[] { 61, 121, 301, 301 })
        {
            factory.Clock.Advance(TimeSpan.FromSeconds(wait));
            await AuthApi.RequestCodeAsync(client, email);
        }

        factory.Emails.CountFor(email).ShouldBe(5);

        factory.Clock.Advance(TimeSpan.FromSeconds(301));
        var rejected = await AuthApi.PostRequestCodeAsync(client, email);

        rejected.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);

        // Orta katman limitinden (30/dk) değil, DB sayacından geldiğini mesaj ayırt ediyor.
        using var document = JsonDocument.Parse(await rejected.Content.ReadAsStringAsync());
        document.RootElement.GetProperty("title").GetString()
            .ShouldBe("Çok fazla kod istendi. Bir süre sonra tekrar dene.");

        rejected.Headers.RetryAfter.ShouldNotBeNull();
        rejected.Headers.RetryAfter!.Delta.ShouldNotBeNull();
        rejected.Headers.RetryAfter.Delta!.Value.ShouldBeGreaterThan(TimeSpan.Zero);

        // Reddedilen istek HİÇBİR ŞEY yazmadı: ne yeni satır, ne yeni mail.
        factory.Emails.CountFor(email).ShouldBe(5);

        var rows = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .CountAsync(x => x.NormalizedEmail == email));

        rows.ShouldBe(5);
    }
}
