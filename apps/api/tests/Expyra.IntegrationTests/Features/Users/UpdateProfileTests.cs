using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Users;

/// <summary>
/// PATCH /api/users/me — profilin yazma yarısı. Okuma yarısı (<c>GET /api/auth/me</c>)
/// AYNI gövde şeklini döndüğü için her mutlu yol iki uçtan da doğrulanıyor: sözleşme
/// ayrışırsa arayüz iki farklı şekil ayrıştırmak zorunda kalır.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class UpdateProfileTests(ApiFactory factory)
{
    private const string ProfilePath = "/api/users/me";

    [Fact]
    public async Task Patch_AdVeDil_GuncelProfiliDonuyorVeMeAyniniGoruyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();
        var tokens = await AuthApi.SignInAsync(factory, client, email);

        var response = await PatchProfileAsync(
            client, tokens.AccessToken, new { displayName = "  Ada Lovelace  ", preferredLanguage = "de" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<CurrentUserResponse>(AuthApi.Json);

        updated.ShouldNotBeNull();
        updated.DisplayName.ShouldBe("Ada Lovelace");   // baştaki/sondaki boşluk kırpıldı
        updated.PreferredLanguage.ShouldBe("de");
        updated.Email.ShouldBe(email);

        // PLAN Blok 1, kabul kriteri 3: değişen ad AYNI oturumda görünüyor.
        // Yanıtın kendisi de güncel — arayüzün ardından /me çağırmasına gerek yok.
        var me = await AuthApi.GetMeAsync(client, tokens.AccessToken);

        me.Id.ShouldBe(updated.Id);
        me.DisplayName.ShouldBe("Ada Lovelace");
        me.PreferredLanguage.ShouldBe("de");
        me.CreatedAtUtc.ShouldBe(updated.CreatedAtUtc);

        // HTTP yanıtı "ne döndü"yü, bu satır "ne yazıldı"yı doğruluyor.
        var row = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleAsync(x => x.NormalizedEmail == email));

        row.DisplayName.ShouldBe("Ada Lovelace");
        row.PreferredLanguage.ShouldBe("de");
        row.UpdatedAtUtc.ShouldNotBeNull();
    }

    [Fact]
    public async Task Patch_GonderilmeyenAlan_Temizleniyor()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();
        var tokens = await AuthApi.SignInAsync(factory, client, email);

        var seeded = await PatchProfileAsync(
            client, tokens.AccessToken, new { displayName = "Ada", preferredLanguage = "tr" });

        seeded.StatusCode.ShouldBe(HttpStatusCode.OK);

        // SÖZLEŞME KİLİDİ: gövde tam profili taşır, delta değil. Dil alanı
        // gönderilmediği için TEMİZLENİYOR — arayüz hesap formunu her iki alanla
        // birlikte göndermek zorunda. Bu satır kırılırsa sözleşme değişmiş demektir.
        var response = await PatchProfileAsync(client, tokens.AccessToken, new { displayName = "   " });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<CurrentUserResponse>(AuthApi.Json);

        updated.ShouldNotBeNull();
        updated.DisplayName.ShouldBeNull();          // boşluk-only ad null'a indi
        updated.PreferredLanguage.ShouldBeNull();
    }

    [Fact]
    public async Task Patch_TokenYok_401VeProblemDetailsGovdesiDonuyor()
    {
        var client = factory.CreateClient();

        var response = await PatchProfileAsync(client, accessToken: null, new { displayName = "Ada" });

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

        // Gövdeyi UseStatusCodePages() yazıyor; o olmadan istemci "ağ hatası mı,
        // oturum mu bitti" ayrımını yapamaz.
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    [Fact]
    public async Task Patch_GecersizDilKodu_400Donuyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        // Biçim hatası validator'da yakalanıyor: alan bazlı ValidationProblemDetails.
        var response = await PatchProfileAsync(
            client, tokens.AccessToken, new { displayName = "Ada", preferredLanguage = "english" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        // Alan adı gövdede geçmeli ki arayüz hatayı doğru input'un altına basabilsin.
        // Baş harf kasıtlı olarak dışarıda: sözlük anahtarının camelCase'e dönüp
        // dönmeyeceği serileştirme ayarına bağlı, testin doğrulamak istediği şey o değil.
        var body = await response.Content.ReadAsStringAsync();
        body.ShouldContain("referredLanguage");
    }

    [Fact]
    public async Task Patch_KayitDefterindeOlmayanDil_400Donuyor_500Degil()
    {
        var client = factory.CreateClient();
        var email = AuthApi.NewEmail();
        var tokens = await AuthApi.SignInAsync(factory, client, email);

        // 'zu' geçerli bir BCP-47 etiketi ama seed'deki 49 dilin içinde yok.
        // Kontrol edilmeseydi fk_app_user_preferred_language patlar ve kullanıcı
        // 500 görürdü — bu testin varlık sebebi tam olarak o.
        var response = await PatchProfileAsync(
            client, tokens.AccessToken, new { displayName = "Ada", preferredLanguage = "zu" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        // Hata yolu YARIM PROFİL bırakmıyor: dil kontrolü yazmadan önce yapılıyor,
        // yoksa ad kaydedilir ve dil kaydedilmezdi.
        var row = await factory.QueryAsync(db => db.Users.AsNoTracking()
            .SingleAsync(x => x.NormalizedEmail == email));

        row.DisplayName.ShouldBeNull();
    }

    [Fact]
    public async Task Patch_CokUzunAd_400Donuyor()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        // Sütun genişliği 80. Doğrulanmazsa DbUpdateException 500'e düşer.
        var response = await PatchProfileAsync(
            client, tokens.AccessToken, new { displayName = new string('a', 81) });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    /// <summary>
    /// <c>PatchAsJsonAsync</c> istek başına header almıyor; token Authorization
    /// başlığında gitmek zorunda olduğu için istek elle kuruluyor.
    /// </summary>
    private static async Task<HttpResponseMessage> PatchProfileAsync<TBody>(
        HttpClient client, string? accessToken, TBody body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, ProfilePath)
        {
            Content = JsonContent.Create(body, options: AuthApi.Json),
        };

        if (accessToken is not null)
        {
            request.Headers.Authorization = new("Bearer", accessToken);
        }

        // İstek NESNESİ burada await ediliyor: `return client.SendAsync(request)`
        // yazılsaydı `using` isteği gönderim bitmeden atardı.
        return await client.SendAsync(request).ConfigureAwait(false);
    }
}
