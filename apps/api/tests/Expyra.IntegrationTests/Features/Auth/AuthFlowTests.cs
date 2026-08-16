using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Domain.Identity;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Auth;

/// <summary>
/// Uçtan uca akış: adres → kod → oturum. Kayıt ve giriş TEK akış olduğu için
/// "kayıt" diye ayrı bir senaryo yok; fark yalnız <c>isNewAccount</c>.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class AuthFlowTests(ApiFactory factory)
{
    [Fact]
    public async Task RequestCode_SonraVerifyCode_HesabiOlusturuyorVeOturumAciyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var challenge = await AuthApi.RequestCodeAsync(client, email, preferredLanguage: "tr");

        challenge.ChallengeId.ShouldNotBe(Guid.Empty);
        challenge.CodeLength.ShouldBe(6);
        challenge.ExpiresAtUtc.ShouldBeGreaterThan(challenge.ResendAvailableAtUtc);

        // Kod YALNIZ postadan okunabiliyor.
        factory.Emails.CountFor(email).ShouldBe(1);
        var code = factory.Emails.CodeFor(email);
        code.Length.ShouldBe(challenge.CodeLength);

        var tokens = await AuthApi.VerifyCodeAsync(client, challenge.ChallengeId, code);

        tokens.IsNewAccount.ShouldBeTrue();
        tokens.AccessToken.ShouldNotBeNullOrWhiteSpace();
        tokens.RefreshToken.ShouldNotBeNullOrWhiteSpace();

        var user = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleOrDefaultAsync(x => x.NormalizedEmail == email));

        user.ShouldNotBeNull();

        // "Doğrulanmamış kullanıcı" durumu YOK: satır ancak posta kutusu sahipliği
        // kanıtlandığında doğuyor, dolayısıyla bu alan daima dolu.
        user.EmailVerifiedAtUtc.ShouldNotBeNull();
        user.LastLoginAtUtc.ShouldNotBeNull();

        // Dil zinciri: istekteki tercih login_code.language'a yazıldı ve hesap oradan tohumlandı.
        user.PreferredLanguage.ShouldBe("tr");

        var loginCode = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .SingleAsync(x => x.Id == challenge.ChallengeId));

        loginCode.Status.ShouldBe(LoginCodeStatus.Consumed);
        loginCode.ClosedAtUtc.ShouldNotBeNull();

        // JWT şeması + MapInboundClaims=false + CurrentUser'ın 'sub' okuması burada kanıtlanıyor.
        var me = await AuthApi.GetMeAsync(client, tokens.AccessToken);

        me.Id.ShouldBe(user.Id);
        me.Email.ShouldBe(email);
        me.DisplayName.ShouldBeNull();
    }

    [Fact]
    public async Task VerifyCode_IkinciGiris_IkinciKullaniciSatiriAcmiyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var first = await AuthApi.SignInAsync(factory, client, email);
        first.IsNewAccount.ShouldBeTrue();

        // Yeniden gönderme aralığı (60 sn) gerçekten beklenmiyor, saat kaydırılıyor.
        // Kaydırma altında üretilen access token'ın nbf'i gelecekte kalıyor: burada
        // /me çağrılmıyor, yalnız gövde ve DB durumu okunuyor.
        using (factory.Clock.Shift(TimeSpan.FromSeconds(61)))
        {
            var second = await AuthApi.SignInAsync(factory, client, email);
            second.IsNewAccount.ShouldBeFalse();
        }

        var userCount = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .CountAsync(x => x.NormalizedEmail == email));

        userCount.ShouldBe(1);
    }

    [Fact]
    public async Task Me_TokenYok_401VeProblemDetailsGovdesiDonuyor()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(AuthApi.MePath);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

        // UseStatusCodePages() olmadan gövde BOŞ gelir ve istemci "ağ hatası mı, oturum
        // mu bitti" ayrımını yapamaz. Bu satır o regresyonun bekçisi.
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");

        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());

        document.RootElement.GetProperty("status").GetInt32().ShouldBe(401);
    }

    [Fact]
    public async Task VerifyCode_YanlisKod_400DonuyorVeDenemeSayaciArtiyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var challenge = await AuthApi.RequestCodeAsync(client, email);
        var wrong = AuthApi.WrongCode(factory.Emails.CodeFor(email));

        var response = await AuthApi.PostVerifyCodeAsync(client, challenge.ChallengeId, wrong);

        // 401 DEĞİL 400: giriş ucunun kendisinde 401, istemcileri giriş sayfasına
        // yönlendirdiği için sonsuz döngü demek.
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await ReadTitleAsync(response)).ShouldBe("Kod geçersiz veya süresi dolmuş.");

        var loginCode = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .SingleAsync(x => x.Id == challenge.ChallengeId));

        // Sayaç COMMIT edilmemiş olsaydı rollback denemeyi geri alır, kaba kuvvet bedavaya gelirdi.
        loginCode.AttemptCount.ShouldBe(1);
        loginCode.Status.ShouldBe(LoginCodeStatus.Pending);
    }

    [Fact]
    public async Task VerifyCode_BesinciYanlisDeneme_KoduYakiyorVeDogruKodDaKabulEdilmiyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var challenge = await AuthApi.RequestCodeAsync(client, email);
        var code = factory.Emails.CodeFor(email);
        var wrong = AuthApi.WrongCode(code);

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            var rejected = await AuthApi.PostVerifyCodeAsync(client, challenge.ChallengeId, wrong);
            rejected.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        }

        var burned = await AuthApi.PostVerifyCodeAsync(client, challenge.ChallengeId, wrong);

        burned.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
        (await ReadTitleAsync(burned)).ShouldBe("Çok fazla hatalı deneme. Yeni kod iste.");

        // Retry-After bir ALT SINIR (login_code.CreatedAtUtc + tier1): gerçek anı
        // hesaplamak verify yolunda ikinci bir throttle sorgusu açardı.
        burned.Headers.RetryAfter.ShouldNotBeNull();
        burned.Headers.RetryAfter!.Delta.ShouldNotBeNull();

        var loginCode = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .SingleAsync(x => x.Id == challenge.ChallengeId));

        loginCode.Status.ShouldBe(LoginCodeStatus.Burned);
        loginCode.AttemptCount.ShouldBe(5);
        loginCode.ClosedAtUtc.ShouldNotBeNull();

        // Aynı testte devam ediyor çünkü "yanmış challenge" durumunu yeniden kurmak
        // beş istek daha demek: yanmış koda DOĞRU kod gelse bile kabul edilmez.
        var correct = await AuthApi.PostVerifyCodeAsync(client, challenge.ChallengeId, code);

        correct.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);

        var users = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .CountAsync(x => x.NormalizedEmail == email));

        users.ShouldBe(0);
    }

    /// <summary>ProblemDetails'in <c>title</c> alanı: AppException'ın mesajı buraya düşüyor.</summary>
    private static async Task<string?> ReadTitleAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        return document.RootElement.TryGetProperty("title", out var title) ? title.GetString() : null;
    }
}
