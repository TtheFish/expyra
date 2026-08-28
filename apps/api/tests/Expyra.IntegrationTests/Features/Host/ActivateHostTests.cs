using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Application.Features.Host.Queries.GetHostIdentity;
using Expyra.Domain.Users;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Host;

/// <summary>
/// POST /api/host/activate ve arkasındaki yetki kapısı.
///
/// <para>Bu dosyanın asıl doğruladığı şey "rol yazıldı mı" değil, <b>rolün kapıyı
/// gerçekten açıp açmadığı</b>: sütuna yazılmış ama token'a geçmemiş bir rol,
/// kullanıcı için hiç yokmuş gibidir.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ActivateHostTests(ApiFactory factory)
{
    private const string ActivatePath = "/api/host/activate";
    private const string HostMePath = "/api/host/me";

    [Fact]
    public async Task Activate_IlkCagri_HostYapiyorVeDonenTokenKapiyiAciyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();
        var tokens = await AuthApi.SignInAsync(factory, client, email);

        var response = await PostAsync(client, ActivatePath, tokens.AccessToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var activated = await response.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json);

        activated.ShouldNotBeNull();
        activated.IsHost.ShouldBeTrue();
        activated.AccessToken.ShouldNotBeNullOrWhiteSpace();

        // HTTP yanıtı "ne döndü"yü, bu satır "ne yazıldı"yı doğruluyor.
        var row = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleAsync(x => x.NormalizedEmail == email));

        row.Roles.ShouldHaveSingleItem().ShouldBe(UserRole.Host);

        // PLAN Blok 2, kabul kriteri 3: rol edindikten sonra YENİDEN GİRİŞ YAPMADAN
        // host uçları kullanılabiliyor. Bunu mümkün kılan şey yanıttaki yeni token.
        var gated = await GetAsync(client, HostMePath, activated.AccessToken);

        gated.StatusCode.ShouldBe(HttpStatusCode.OK);

        var identity = await gated.Content.ReadFromJsonAsync<HostIdentityResponse>(AuthApi.Json);

        identity.ShouldNotBeNull();
        identity.HostId.ShouldBe(row.Id);

        // /me rolü VERİTABANINDAN okuyor: arayüz "Host paneli" bağlantısını eski
        // token'la bile doğru gösterebilsin.
        var me = await AuthApi.GetMeAsync(client, tokens.AccessToken);

        me.IsHost.ShouldBeTrue();
    }

    [Fact]
    public async Task Activate_IkinciCagri_200VeRolTekSatirKaliyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();
        var tokens = await AuthApi.SignInAsync(factory, client, email);

        var first = await PostAsync(client, ActivatePath, tokens.AccessToken);
        first.StatusCode.ShouldBe(HttpStatusCode.OK);

        // İDEMPOTANLIK: ikinci çağrı çakışma değil. Arayüzdeki çift tıklama ya da
        // yeniden denenen bir istek hata ekranı üretmemeli.
        var second = await PostAsync(client, ActivatePath, tokens.AccessToken);

        second.StatusCode.ShouldBe(HttpStatusCode.OK);

        var repeated = await second.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json);

        repeated.ShouldNotBeNull();
        repeated.IsHost.ShouldBeTrue();

        // Diziye ikinci bir 'Host' eklenmediği: karar AlreadyHost dalına düştüyse
        // yazma hiç olmadı demektir.
        var row = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleAsync(x => x.NormalizedEmail == email));

        row.Roles.ShouldHaveSingleItem().ShouldBe(UserRole.Host);
    }

    [Fact]
    public async Task Activate_TokenYok_401VeProblemDetailsGovdesiDonuyor()
    {
        var client = factory.CreateClient();

        var response = await PostAsync(client, ActivatePath, accessToken: null);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

        // 401 ile 403 AYRI: istemci "yeniden giriş yap" ile "önce host ol" arasındaki
        // farkı yalnız buradan görüyor.
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    [Fact]
    public async Task Activate_BanliHesap_403VeRolYazilmiyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();
        var tokens = await AuthApi.SignInAsync(factory, client, email);

        await SetStatusAsync(email, UserStatus.Banned);

        // Access token hâlâ imzalı ve süresi dolmamış — ban kontrolü token'da değil,
        // handler'da. Aksi halde banlı hesap 15 dk boyunca host olabilirdi.
        var response = await PostAsync(client, ActivatePath, tokens.AccessToken);

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

        var row = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleAsync(x => x.NormalizedEmail == email));

        row.Roles.ShouldBeEmpty();
    }

    [Fact]
    public async Task HostUcu_RolsuzToken_403()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        // PLAN Blok 2, kabul kriteri 1: host olmayan kullanıcı host ucuna 403 alıyor.
        // 404 DEĞİL: uç var ve kimliği biliniyor, eksik olan yalnız rol.
        var response = await GetAsync(client, HostMePath, tokens.AccessToken);

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task HostUcu_AktivasyondanOncekiToken_403Kaliyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var activate = await PostAsync(client, ActivatePath, tokens.AccessToken);
        activate.StatusCode.ShouldBe(HttpStatusCode.OK);

        // GEÇİŞ SORUNUNUN KENDİSİ: rol claim'i access token'a yazıldığı için ESKİ token
        // rolsüz kalıyor ve süresi dolana kadar öyle kalacak. Bu satır kırılırsa
        // "activate dönüşünde yeni token" gereksinimi de gereksizleşmiş demektir —
        // ikisi birlikte doğru ya da birlikte yanlış.
        var withOldToken = await GetAsync(client, HostMePath, tokens.AccessToken);

        withOldToken.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Refresh_HostRolunuKoruyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var activate = await PostAsync(client, ActivatePath, tokens.AccessToken);
        activate.StatusCode.ShouldBe(HttpStatusCode.OK);

        // PLAN Blok 2, kabul kriteri 4: yenileme rolü koruyor. Roller token'dan
        // KOPYALANMIYOR, her rotasyonda veritabanından taze okunuyor — bu yüzden
        // aktivasyondan ÖNCE alınmış refresh token bile rollü access token üretiyor.
        var refreshed = await AuthApi.RefreshAsync(client, tokens.RefreshToken);

        var gated = await GetAsync(client, HostMePath, refreshed.AccessToken);

        gated.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    /// <summary>Hesabın durumunu doğrudan veritabanından değiştirir — ban ucu henüz yok.</summary>
    private async Task SetStatusAsync(string normalizedEmail, UserStatus status)
    {
        await factory.QueryAsync(async db =>
        {
            var user = await db.Users.SingleAsync(x => x.NormalizedEmail == normalizedEmail);
            user.Status = status;

            return await db.SaveChangesAsync();
        });
    }

    private static async Task<HttpResponseMessage> PostAsync(
        HttpClient client, string path, string? accessToken)
    {
        // Gövde YOK: uç hiçbir alan almıyor, kimlik token'dan okunuyor (CLAUDE.md #3).
        using var request = new HttpRequestMessage(HttpMethod.Post, path);

        if (accessToken is not null)
        {
            request.Headers.Authorization = new("Bearer", accessToken);
        }

        // İstek NESNESİ burada await ediliyor: `return client.SendAsync(request)`
        // yazılsaydı `using` isteği gönderim bitmeden atardı.
        return await client.SendAsync(request).ConfigureAwait(false);
    }

    private static async Task<HttpResponseMessage> GetAsync(
        HttpClient client, string path, string? accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);

        if (accessToken is not null)
        {
            request.Headers.Authorization = new("Bearer", accessToken);
        }

        return await client.SendAsync(request).ConfigureAwait(false);
    }
}
