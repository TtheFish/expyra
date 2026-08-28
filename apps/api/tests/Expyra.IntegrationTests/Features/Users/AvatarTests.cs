using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Application.Features.Users.Commands.CreateAvatarUpload;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Users;

/// <summary>
/// Profil fotoğrafı akışı. Doğrulama ilan görselleriyle aynı koddan geçiyor
/// (<c>UploadedImage</c>), bu yüzden burada tekrarlanan tek şey <b>sahiplik</b>:
/// avatarın kendi tablosu yok, anahtar istemciden geliyor ve onu doğrulayan tek şey
/// ön ek kontrolü.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class AvatarTests(ApiFactory factory)
{
    private const string UploadPath = "/api/users/me/avatar/upload-url";
    private const string ConfirmPath = "/api/users/me/avatar/confirm";
    private const string DeletePath = "/api/users/me/avatar";

    [Fact]
    public async Task Avatar_YuklenirVeProfildeAdresOlarakDoner()
    {
        var client = factory.CreateClient();
        var token = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;

        var before = await MeAsync(client, token);
        before.AvatarUrl.ShouldBeNull();

        var user = await UploadAsync(client, token);

        user.AvatarUrl.ShouldNotBeNull();
        user.AvatarUrl.PathAndQuery.ShouldStartWith("/api/dev/objects/avatars/");

        // Yanıt "ne döndü"yü, bu satır "ne yazıldı"yı doğruluyor: sütunda ADRES değil
        // ANAHTAR duruyor — CDN alan adı değişince geçmiş satırlar migration istemesin.
        var key = await factory.QueryAsync(db => db.Users
            .AsNoTracking().Where(x => x.Id == before.Id).Select(x => x.AvatarKey).SingleAsync());

        key.ShouldNotBeNull();
        key.ShouldStartWith("avatars/");
        key.ShouldNotContain("http");
    }

    [Fact]
    public async Task Avatar_BaskasininAnahtari_404()
    {
        var client = factory.CreateClient();
        var victim = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;
        var attacker = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;

        // Kurban gerçekten yükleme yapıyor; nesne depoda VAR.
        var upload = await RequestUploadAsync(client, victim);
        await PutAsync(client, upload, MediaApi.ValidPng());

        // Saldırgan onun anahtarını kendi profiline bağlamaya çalışıyor. Ön ek kontrolü
        // olmasaydı bu geçerdi: nesne var, baytları geçerli, tek eksik sahiplik.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, ConfirmPath, attacker, new { storageKey = upload.StorageKey });

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Avatar_GorselOlmayanIcerik_409()
    {
        var client = factory.CreateClient();
        var token = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;

        var upload = await RequestUploadAsync(client, token);
        var payload = Encoding.UTF8.GetBytes("<svg xmlns='http://www.w3.org/2000/svg'/>");
        await PutAsync(client, upload, payload);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, ConfirmPath, token, new { storageKey = upload.StorageKey });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await MeAsync(client, token)).AvatarUrl.ShouldBeNull();
    }

    [Fact]
    public async Task Avatar_DegistirilirseEskiNesneSiliniyor()
    {
        var client = factory.CreateClient();
        var token = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;

        var first = await UploadAsync(client, token);
        var firstUrl = first.AvatarUrl!;

        var second = await UploadAsync(client, token);

        // Anahtar her yüklemede yeni: sabit bir ada yazılsaydı CDN önbelleği
        // geçersizleşmez ve kullanıcı günlerce eski fotoğrafını görürdü.
        second.AvatarUrl!.ShouldNotBe(firstUrl);

        (await client.GetAsync(new Uri(firstUrl.PathAndQuery, UriKind.Relative))).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Avatar_Silme_IdempotentVeNesneGidiyor()
    {
        var client = factory.CreateClient();
        var token = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;

        var uploaded = await UploadAsync(client, token);
        var url = uploaded.AvatarUrl!;

        var first = await MediaApi.SendAsync(client, HttpMethod.Delete, DeletePath, token);
        first.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadUserAsync(first)).AvatarUrl.ShouldBeNull();

        (await client.GetAsync(new Uri(url.PathAndQuery, UriKind.Relative))).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);

        // İkinci kez silmek hata değil: istenen durum zaten sağlanmış.
        var second = await MediaApi.SendAsync(client, HttpMethod.Delete, DeletePath, token);
        second.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Avatar_IzinVerilmeyenTip_400()
    {
        var client = factory.CreateClient();
        var token = (await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail())).AccessToken;

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, UploadPath, token,
            new { contentType = "image/gif", byteSize = 1024 });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // -----------------------------------------------------------------------

    private static async Task<CurrentUserResponse> UploadAsync(HttpClient client, string token)
    {
        var upload = await RequestUploadAsync(client, token);
        (await PutAsync(client, upload, MediaApi.ValidPng())).StatusCode
            .ShouldBe(HttpStatusCode.NoContent);

        var confirm = await MediaApi.SendAsync(
            client, HttpMethod.Post, ConfirmPath, token, new { storageKey = upload.StorageKey });

        confirm.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadUserAsync(confirm);
    }

    private static async Task<AvatarUploadResponse> RequestUploadAsync(HttpClient client, string token)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, UploadPath, token,
            new { contentType = "image/png", byteSize = MediaApi.ValidPng().Length });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<AvatarUploadResponse>(AuthApi.Json))!;
    }

    private static async Task<HttpResponseMessage> PutAsync(
        HttpClient client, AvatarUploadResponse upload, byte[] bytes)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, upload.UploadUrl.PathAndQuery);
        request.Content = new ByteArrayContent(bytes);
        request.Content.Headers.ContentType = new("image/png");

        return await client.SendAsync(request);
    }

    private static async Task<CurrentUserResponse> MeAsync(HttpClient client, string token)
        => await ReadUserAsync(await MediaApi.SendAsync(client, HttpMethod.Get, "/api/auth/me", token));

    private static async Task<CurrentUserResponse> ReadUserAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<CurrentUserResponse>(AuthApi.Json))!;
}
