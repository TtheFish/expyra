using System.Net;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Domain.Identity;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Auth;

/// <summary>
/// Rotasyon, yeniden kullanım tespiti ve 30 sn'lik grace penceresi. Ham token DB'de
/// durmuyor: satırlar uygulamanın kendi SHA-256 özetiyle bulunuyor.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class RefreshRotationTests(ApiFactory factory)
{
    [Fact]
    public async Task Refresh_MutluYol_EskisiRotatedYenisiAyniAiledeVeTavanUzamiyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var issued = await FindTokenAsync(tokens.RefreshToken);
        issued.FamilyId.ShouldBe(issued.Id, "İlk token'da aile kendisidir.");
        issued.PreviousTokenId.ShouldBeNull();

        var rotated = await AuthApi.RefreshAsync(client, tokens.RefreshToken);

        rotated.RefreshToken.ShouldNotBe(tokens.RefreshToken);
        rotated.AccessToken.ShouldNotBe(tokens.AccessToken);
        rotated.IsNewAccount.ShouldBeFalse();

        var previous = await FindTokenAsync(tokens.RefreshToken);
        previous.RevokedAtUtc.ShouldNotBeNull();
        previous.RevocationReason.ShouldBe(TokenRevocationReason.Rotated);

        var current = await FindTokenAsync(rotated.RefreshToken);
        current.PreviousTokenId.ShouldBe(previous.Id);
        current.FamilyId.ShouldBe(previous.FamilyId);

        // Mutlak tavan KOPYALANIR, uzatılmaz: tavan olmadan çalınan zincir asla ölmez.
        current.AbsoluteExpiresAtUtc.ShouldBe(previous.AbsoluteExpiresAtUtc);

        // Yanıttaki ömür de tavana kırpılmış değeri taşıyor, aksi halde BFF çerezi
        // gerçekte ölü bir token için 30 gün yazardı.
        rotated.RefreshTokenExpiresAtUtc.ShouldBeLessThanOrEqualTo(current.AbsoluteExpiresAtUtc);

        // Tam eşitlik aranmıyor: timestamptz mikrosaniyeye kırpıyor, bellekteki değer
        // 100 ns çözünürlükte. Karşılaştırılan şey aynı an olduğu sürece fark önemsiz.
        (rotated.RefreshTokenExpiresAtUtc - current.ExpiresAtUtc).Duration()
            .ShouldBeLessThan(TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Refresh_GracePenceresiIcinde_ReuseSayilmiyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        await AuthApi.RefreshAsync(client, tokens.RefreshToken);

        // Aynı token 30 sn içinde ikinci kez: mobil istemciler ve Next prefetch bunu
        // gerçekten yapıyor. Grace olmasaydı meşru kullanıcı KENDİ ailesini iptal ettirirdi.
        var second = await AuthApi.PostRefreshAsync(client, tokens.RefreshToken);

        second.StatusCode.ShouldBe(HttpStatusCode.OK);

        var family = await FamilyOfAsync(tokens.RefreshToken);
        // `is null` yerine `== null`: Shouldly'nin predicate'i ifade ağacına
        // çevriliyor, oraya pattern matching giremiyor (CS8122).
        family.ShouldContain(x => x.RevokedAtUtc == null);
        family.ShouldNotContain(x => x.RevocationReason == TokenRevocationReason.ReuseDetected);
    }

    [Fact]
    public async Task Refresh_GraceDisindaIkinciKullanim_401VeAileninTamamiIptal()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        await AuthApi.RefreshAsync(client, tokens.RefreshToken);

        // Grace 30 sn; 61 sn sonra aynı token sunulursa artık paralel yenileme değil,
        // çalınmış halka.
        using (factory.Clock.Shift(TimeSpan.FromSeconds(61)))
        {
            var reused = await AuthApi.PostRefreshAsync(client, tokens.RefreshToken);

            reused.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        }

        var family = await FamilyOfAsync(tokens.RefreshToken);

        // Hangi halkanın çalındığını bilmiyoruz; zincir komple kesiliyor.
        family.Count.ShouldBeGreaterThanOrEqualTo(2);
        family.ShouldAllBe(x => x.RevokedAtUtc != null);
        family.ShouldContain(x => x.RevocationReason == TokenRevocationReason.ReuseDetected);
    }

    [Fact]
    public async Task Refresh_IptalEdilmisAileninTokeni_YeniCiftUretmiyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var rotated = await AuthApi.RefreshAsync(client, tokens.RefreshToken);

        using (factory.Clock.Shift(TimeSpan.FromSeconds(61)))
        {
            await AuthApi.PostRefreshAsync(client, tokens.RefreshToken);

            // Aile iptal edildikten sonra GEÇERLİ olan halka da çalışmamalı.
            var afterBreach = await AuthApi.PostRefreshAsync(client, rotated.RefreshToken);

            afterBreach.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        }
    }

    [Fact]
    public async Task SignOut_AileyiIptalEdiyor_SonrakiRefresh401()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var signedOut = await AuthApi.PostSignOutAsync(client, tokens.RefreshToken);

        signedOut.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var family = await FamilyOfAsync(tokens.RefreshToken);
        family.ShouldAllBe(x => x.RevocationReason == TokenRevocationReason.SignOut);

        var refreshed = await AuthApi.PostRefreshAsync(client, tokens.RefreshToken);
        refreshed.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SignOut_BilinmeyenToken_204Donuyor()
    {
        var client = factory.CreateClient();

        // Hata yutma DEĞİL: ortada hata yok, istenen son durum zaten sağlanmış.
        // Farklı davranmak "bu token var mıydı" oracle'ı kurardı.
        var unknown = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

        var response = await AuthApi.PostSignOutAsync(client, unknown);

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task SignOut_BosToken_400_500DEGIL(string? token)
    {
        var client = factory.CreateClient();

        // #44: validator yokken boş token HashRefreshToken'da ArgumentException
        // atıyor ve 500 dönüyordu.
        var response = await AuthApi.PostSignOutAsync(client, token!);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SignOut_CokUzunToken_400()
    {
        var client = factory.CreateClient();

        var response = await AuthApi.PostSignOutAsync(client, new string('a', 513));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    private async Task<RefreshToken> FindTokenAsync(string rawToken)
    {
        var hash = factory.HashRefreshToken(rawToken);

        return await factory.QueryAsync(db => db.RefreshTokens.AsNoTracking()
            .SingleAsync(x => x.TokenHash == hash));
    }

    private async Task<IReadOnlyList<RefreshToken>> FamilyOfAsync(string rawToken)
    {
        var member = await FindTokenAsync(rawToken);

        return await factory.QueryAsync(db => db.RefreshTokens.AsNoTracking()
            .Where(x => x.FamilyId == member.FamilyId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync());
    }
}
