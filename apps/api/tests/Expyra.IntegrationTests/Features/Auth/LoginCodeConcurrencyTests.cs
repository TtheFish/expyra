using System.Net;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Domain.Identity;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Auth;

/// <summary>
/// Yarışa açık iki yol: aynı kodla paralel doğrulama (satır kilidi) ve aynı adres için
/// paralel kod isteği (advisory lock). İkisi de <c>BeginTransactionAsync</c> ile
/// korunuyor (CLAUDE.md #5); bu testler korumanın gerçekten çalıştığını gösteriyor.
///
/// <para>Beklenen sonuç asla 500 değil: <c>ux_login_code_pending</c> tetiklenirse
/// 23505 → 500 gelirdi ve o "sistem bozuk" demektir.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class LoginCodeConcurrencyTests(ApiFactory factory)
{
    [Fact]
    public async Task VerifyCode_AyniKodlaIkiParalelIstek_TamBirTanesiBasarili()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var challenge = await AuthApi.RequestCodeAsync(client, email);
        var code = factory.Emails.CodeFor(email);

        var first = AuthApi.PostVerifyCodeAsync(client, challenge.ChallengeId, code);
        var second = AuthApi.PostVerifyCodeAsync(client, challenge.ChallengeId, code);

        var responses = await Task.WhenAll(first, second);
        var statuses = responses.Select(x => x.StatusCode).ToList();

        // Kaybeden taraf kilidi aldığında satırı Consumed görür ve temiz bir 400 alır.
        // xmin concurrency token seçilseydi DbUpdateConcurrencyException → 500 olurdu.
        statuses.Count(x => x == HttpStatusCode.OK).ShouldBe(1);
        statuses.Count(x => x == HttpStatusCode.BadRequest).ShouldBe(1);

        var user = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleAsync(x => x.NormalizedEmail == email));

        var tokenCount = await factory.QueryAsync(db => db.RefreshTokens.AsNoTracking()
            .CountAsync(x => x.UserId == user.Id));

        // İki oturum açılsaydı kullanıcı fark etmeden ikinci bir aile taşırdı.
        tokenCount.ShouldBe(1);

        var loginCode = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .SingleAsync(x => x.Id == challenge.ChallengeId));

        loginCode.Status.ShouldBe(LoginCodeStatus.Consumed);
    }

    [Fact]
    public async Task RequestCode_AyniEpostaIcinIkiParalelIstek_TekSatirVeTekMail()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();

        var first = AuthApi.PostRequestCodeAsync(client, email);
        var second = AuthApi.PostRequestCodeAsync(client, email);

        var responses = await Task.WhenAll(first, second);

        foreach (var response in responses)
        {
            response.StatusCode.ShouldBe(HttpStatusCode.Accepted);
        }

        var rows = await factory.QueryAsync(db => db.LoginCodes.AsNoTracking()
            .Where(x => x.NormalizedEmail == email)
            .ToListAsync());

        // Advisory lock olmasaydı ikisi de "bekleyen kod yok" görürdü ve kısmi unique
        // index 23505 ile patlardı; ikincisi kilidi bekleyip mevcut challenge'ı dönüyor.
        rows.Count.ShouldBe(1);
        rows[0].Status.ShouldBe(LoginCodeStatus.Pending);

        // Kullanıcının gelen kutusuna tek kod düşüyor (ROADMAP 5.6 kültürü).
        factory.Emails.CountFor(email).ShouldBe(1);
    }
}
