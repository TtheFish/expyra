using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SkiaSharp;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Domain.Experiences;
using Expyra.Domain.Media;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Experiences;

/// <summary>
/// Görsel yükleme akışı uçtan uca: imzalı adres → PUT → doğrulama → galeri.
///
/// <para>Bu dosyanın asıl doğruladığı şey <b>doğrulamanın gerçekten baytlara bakması</b>
/// (PLAN Blok 6 kabul kriteri 2). "image/png" diye bildirilen bir HTML dosyası
/// depodan servis edilirse saklı XSS olur; buradaki testler o kapının kapalı
/// olduğunu her koşuda yeniden ölçüyor.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ExperienceMediaTests(ApiFactory factory)
{
    private const string BasePath = "/api/host/experiences";
    private const string ActivatePath = "/api/host/activate";
    private const string Category = "food-drink";

    // -----------------------------------------------------------------------
    // Mutlu yol ve kapak — kabul kriteri 1 ve 3
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Yukleme_BaytApiUcundanGecmiyor_VeOlcuBayttanOkunuyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 1024);

        // Adres API'nin KENDİ ucuna değil, deponun yükleme ucuna işaret ediyor ve
        // imzalı. Üretimde burası S3 olacak; akış aynı kalıyor.
        upload.UploadUrl.PathAndQuery.ShouldStartWith("/api/dev/uploads?token=");
        upload.Method.ShouldBe("PUT");
        upload.Headers["Content-Type"].ShouldBe("image/png");

        // Satır imzalı adresle BİRLİKTE doğuyor ve Pending: yüklemesini yarıda bırakan
        // host geride veritabanının bilmediği bir nesne bırakmasın.
        var pending = await MediaRowAsync(upload.MediaId);
        pending.Status.ShouldBe(MediaStatus.Pending);
        pending.Width.ShouldBe(0);

        var result = await MediaApi.UploadAsync(client, token, draft.Id, MediaApi.ValidPng(1600, 1200));

        var media = result.Media.ShouldHaveSingleItem();
        media.Width.ShouldBe(1600);
        media.Height.ShouldBe(1200);

        // İlk doğrulanan görsel kendiliğinden kapak: host hiçbir şey seçmese bile
        // ilan yayınlanabilir olsun.
        media.IsCover.ShouldBeTrue();
        media.SortOrder.ShouldBe(0);

        var row = await MediaRowAsync(media.Id);
        row.Status.ShouldBe(MediaStatus.Active);

        // Boyut istemcinin BEYANINDAN değil, yayındaki (yeniden kodlanmış) nesneden.
        var published = await client.GetByteArrayAsync(new Uri(media.Url.PathAndQuery, UriKind.Relative));
        row.ByteSize.ShouldBe(published.Length);
    }

    [Fact]
    public async Task Publish_KapakYok_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateCompleteDraftAsync(client, token, "Kapaksız İlan");

        var list = await MediaApi.SendAsync(client, HttpMethod.Get, BasePath, token);
        var listed = (await list.Content.ReadFromJsonAsync<HostExperiencePageResponse>(AuthApi.Json))!.Items;

        listed.Single(x => x.Id == draft.Id).MissingPublishRequirements
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Cover);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft.Id}/publish", token);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ExperienceRowAsync(draft.Id)).Status.ShouldBe(ExperienceStatus.Draft);

        // Kapak gelince aynı ilan yayınlanabiliyor: engel gerçekten kapaktı.
        await MediaApi.UploadAsync(client, token, draft.Id);

        var second = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft.Id}/publish", token);

        second.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PendingGorselKapakSayilmaz()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateCompleteDraftAsync(client, token, "Yarım Yükleme");

        // Adres alındı ama PUT hiç yapılmadı. Pending satır kapak sayılsaydı host,
        // yükleme ekranını açıp kapatarak görselsiz ilan yayınlayabilirdi.
        await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 1024);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft.Id}/publish", token);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    // -----------------------------------------------------------------------
    // Doğrulama — kabul kriteri 2
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Onay_IcerikGorselDegilse_409VeSatirDaNesneDeSiliniyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // "image/png" diye bildirilmiş bir SVG. Depodan servis edilseydi tarayıcı
        // içindeki script'i çalıştırırdı — saklı XSS.
        var payload = Encoding.UTF8.GetBytes(
            "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");

        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, payload.Length);
        (await MediaApi.PutAsync(client, upload, payload, "image/png")).StatusCode
            .ShouldBe(HttpStatusCode.NoContent);

        var confirm = await MediaApi.ConfirmAsync(client, token, draft.Id, upload.MediaId);

        confirm.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // Yarım kayıt bırakılmıyor: host'a "yüklendi ama görünmüyor" diye
        // açıklanamayan bir durum üretilmiyor.
        (await MediaRowOrNullAsync(upload.MediaId)).ShouldBeNull();
        (await ObjectExistsAsync(draft.Id, upload.MediaId, "png")).ShouldBeFalse();
        (await UploadExistsAsync(draft.Id, upload.MediaId, "png")).ShouldBeFalse();
    }

    [Fact]
    public async Task Onay_BeyanIleGercekBicimAyrisiyorsa_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // Beyan PNG, içerik JPEG. Yalnız "görsel mi" diye bakılsaydı bu geçer ve
        // depodaki content-type kalıcı olarak yanlış kalırdı.
        var payload = MediaApi.Jpeg(1600, 1200);
        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, payload.Length);
        await MediaApi.PutAsync(client, upload, payload, "image/png");

        var confirm = await MediaApi.ConfirmAsync(client, token, draft.Id, upload.MediaId);

        confirm.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await TitleAsync(confirm)).ShouldNotBeNull().ShouldContain("image/jpeg");
    }

    [Fact]
    public async Task Onay_CokKucukGorsel_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var payload = MediaApi.Png(320, 240);
        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, payload.Length);
        await MediaApi.PutAsync(client, upload, payload, "image/png");

        var confirm = await MediaApi.ConfirmAsync(client, token, draft.Id, upload.MediaId);

        confirm.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await TitleAsync(confirm)).ShouldNotBeNull().ShouldContain($"{MediaRules.MinWidth}");
    }

    [Fact]
    public async Task Onay_YuklemeHicYapilmadiysa_409VeSatirKALIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 1024);
        var confirm = await MediaApi.ConfirmAsync(client, token, draft.Id, upload.MediaId);

        confirm.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // Satır SİLİNMİYOR — bozuk dosyanın aksine burada düzeltilecek bir şey var:
        // host yüklemeyi tamamlayıp aynı kimlikle tekrar deneyebilir.
        (await MediaRowOrNullAsync(upload.MediaId)).ShouldNotBeNull();
    }

    [Fact]
    public async Task Onay_IkinciKez_200Idempotent()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var result = await MediaApi.UploadAsync(client, token, draft.Id);
        var mediaId = result.Media.ShouldHaveSingleItem().Id;

        // Ağ tekrarı ya da çift tıklama hata ekranı üretmemeli. Yeniden doğrulamak da
        // yanlış olurdu: nesne o sırada silinmişse çalışan bir görseli iptal ederdik.
        var again = await MediaApi.ConfirmAsync(client, token, draft.Id, mediaId);

        again.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await MediaRowAsync(mediaId)).Status.ShouldBe(MediaStatus.Active);
    }

    // -----------------------------------------------------------------------
    // İmza — depo tarafı
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Yukleme_ImzaBozuksa_403()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 1024);
        var tampered = upload with
        {
            UploadUrl = new Uri(upload.UploadUrl.ToString().Replace("token=", "token=x", StringComparison.Ordinal)),
        };

        var response = await MediaApi.PutAsync(client, tampered, MediaApi.ValidPng(), "image/png");

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Yukleme_ImzalanandanFarkliIcerikTipi_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 1024);

        // İmza içerik tipini de kapsıyor: istemci adresi alıp başka bir tiple
        // yükleyemiyor.
        var response = await MediaApi.PutAsync(client, upload, MediaApi.ValidPng(), "text/html");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Yukleme_BeyanEdilenBoyutuAsarsa_413()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // Beyan 100 bayt, gövde 5000. Tavan imzaya girdiği için depo reddediyor.
        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 100);
        var response = await MediaApi.PutAsync(
            client, upload, MediaApi.Png(1600, 1200, padding: 5000), "image/png");

        response.StatusCode.ShouldBe(HttpStatusCode.RequestEntityTooLarge);

        // Yarım nesne kalmıyor: geçici dosyaya yazılıp taşınıyor.
        (await UploadExistsAsync(draft.Id, upload.MediaId, "png")).ShouldBeFalse();
    }

    // -----------------------------------------------------------------------
    // Galeri yönetimi
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Siralama_ToptanYaziliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        await MediaApi.UploadAsync(client, token, draft.Id);
        await MediaApi.UploadAsync(client, token, draft.Id);
        var result = await MediaApi.UploadAsync(client, token, draft.Id);

        result.Media.Select(x => x.SortOrder).ShouldBe([0, 1, 2]);

        var reversed = result.Media.Select(x => x.Id).Reverse().ToList();
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{draft.Id}/media/order", token,
            new { mediaIds = reversed });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var reordered = await ReadAsync(response);
        reordered.Media.Select(x => x.Id).ShouldBe(reversed);
        reordered.Media.Select(x => x.SortOrder).ShouldBe([0, 1, 2]);
    }

    [Fact]
    public async Task Siralama_EksikKimlik_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        await MediaApi.UploadAsync(client, token, draft.Id);
        var result = await MediaApi.UploadAsync(client, token, draft.Id);

        // Eksik listeye izin verilseydi, listede olmayan görsellerin sırası belirsiz
        // kalır ve istemcinin gördüğü sıra sunucununkinden ayrışırdı.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{draft.Id}/media/order", token,
            new { mediaIds = new[] { result.Media[0].Id } });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Kapak_DegistirilebiliyorVeDaimaTekTane()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        await MediaApi.UploadAsync(client, token, draft.Id);
        var result = await MediaApi.UploadAsync(client, token, draft.Id);

        var second = result.Media.Single(x => !x.IsCover);
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{draft.Id}/media/{second.Id}/cover", token);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updated = await ReadAsync(response);
        updated.Media.Count(x => x.IsCover).ShouldBe(1);
        updated.Media.Single(x => x.IsCover).Id.ShouldBe(second.Id);
    }

    [Fact]
    public async Task Silme_NesneDeGidiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var result = await MediaApi.UploadAsync(client, token, draft.Id);
        var media = result.Media.ShouldHaveSingleItem();

        (await ObjectExistsAsync(draft.Id, media.Id, "png")).ShouldBeTrue();

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{draft.Id}/media/{media.Id}", token);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync(response)).Media.ShouldBeEmpty();

        // PLAN kabul kriteri 4: satır gidince nesne de gidiyor.
        (await ObjectExistsAsync(draft.Id, media.Id, "png")).ShouldBeFalse();
    }

    [Fact]
    public async Task Silme_KapakSilinirseSiradaki_Devraliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        await MediaApi.UploadAsync(client, token, draft.Id);
        var result = await MediaApi.UploadAsync(client, token, draft.Id);

        var cover = result.Media.Single(x => x.IsCover);
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{draft.Id}/media/{cover.Id}", token);

        // Kapağı boş bırakmak, host'a hiçbir şey sormadan ilanı yayınlanamaz hâle
        // getirmek olurdu.
        (await ReadAsync(response)).Media.ShouldHaveSingleItem().IsCover.ShouldBeTrue();
    }

    [Fact]
    public async Task Silme_YayindakiIlaninSonGorseli_TaslagaAlir()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateCompleteDraftAsync(client, token, "Tek Görselli İlan");

        var uploaded = await MediaApi.UploadAsync(client, token, draft.Id);
        await MediaApi.SendAsync(client, HttpMethod.Post, $"{BasePath}/{draft.Id}/publish", token);

        var media = uploaded.Media.ShouldHaveSingleItem();
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{draft.Id}/media/{media.Id}", token);

        // Kapak yayın koşulu: görselsiz ilan yayında kalamaz, ama host'u arşive
        // zorlamak yerine taslağa düşürmek yeterli — görseli değiştirip yeniden
        // yayınlayabilir.
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var body = await ReadAsync(response);
        body.Media.ShouldBeEmpty();
        body.Status.ShouldBe(nameof(ExperienceStatus.Draft));
        (await MediaRowOrNullAsync(media.Id)).ShouldBeNull();
    }

    // -----------------------------------------------------------------------
    // Misafir tarafı
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Misafir_KapagiVeGaleriyiGoruyor_HostKartiylaBirlikte()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        // Host'un adı var: kart adı gösterebilsin.
        await MediaApi.SendAsync(
            client, HttpMethod.Patch, "/api/users/me", token,
            new { displayName = "Deniz Kaptan", preferredLanguage = "tr" });

        var draft = await CreateCompleteDraftAsync(client, token, "Koy Turu");

        await MediaApi.UploadAsync(client, token, draft.Id, MediaApi.ValidPng(1600, 1200));
        var uploaded = await MediaApi.UploadAsync(client, token, draft.Id, MediaApi.ValidPng(1000, 900));

        await MediaApi.SendAsync(client, HttpMethod.Post, $"{BasePath}/{draft.Id}/publish", token);

        var slug = (await ExperienceRowAsync(draft.Id)).Slug;

        // Liste: kart yalnız KAPAĞI taşıyor — galerinin tamamı sayfa başına on kat
        // veri demek olurdu.
        var page = await client.GetFromJsonAsync<GuestExperiencePageResponse>(
            new Uri($"/api/experiences?language=tr&city=tr-izmir", UriKind.Relative), AuthApi.Json);

        var card = page!.Items.Single(x => x.Slug == slug);
        card.Cover.ShouldNotBeNull();
        card.Cover.Width.ShouldBe(1600);
        card.Cover.Height.ShouldBe(1200);

        var detail = await client.GetFromJsonAsync<GuestExperienceDetailResponse>(
            new Uri($"/api/experiences/{slug}?language=tr", UriKind.Relative), AuthApi.Json);

        // Galeri kapakla BAŞLIYOR: kartta görülen görsel ile detayda ilk görülen aynı.
        detail!.Images.Count.ShouldBe(2);
        detail.Images[0].Width.ShouldBe(1600);
        detail.Images[1].Width.ShouldBe(1000);

        detail.Host.DisplayName.ShouldBe("Deniz Kaptan");

        // Host'un avatarı yok: uydurulmuş bir adres değil null dönüyor, arayüz baş
        // harfe düşüyor.
        detail.Host.AvatarUrl.ShouldBeNull();

        // Doğrulanmamış görsel misafire GİTMİYOR: adres alındı, yükleme yapılmadı.
        await MediaApi.RequestUploadAsync(client, token, draft.Id, byteSize: 1024);

        var again = await client.GetFromJsonAsync<GuestExperienceDetailResponse>(
            new Uri($"/api/experiences/{slug}?language=tr", UriKind.Relative), AuthApi.Json);

        again!.Images.Count.ShouldBe(2);

        uploaded.Media.Count.ShouldBe(2);
    }

    // -----------------------------------------------------------------------
    // Sınırlar ve yetki
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Yukleme_TavaniAsarsa_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        for (var index = 0; index < MediaRules.MaxPerExperience; index++)
        {
            await MediaApi.UploadAsync(client, token, draft.Id);
        }

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft.Id}/media/upload-url", token,
            new { contentType = "image/png", byteSize = 1024 });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Yukleme_EsZamanliIstekler_TavaniAsamiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // Kilit olmadan aynı anda gelen istekler aynı sayıyı görür ve hepsi satır açardı
        // (issue #50). Tavanın iki katı istek aynı anda ateşleniyor.
        const int attempts = MediaRules.MaxPerExperience * 2;

        var responses = await Task.WhenAll(Enumerable.Range(0, attempts).Select(_ => MediaApi.SendAsync(
            factory.CreateClient(), HttpMethod.Post, $"{BasePath}/{draft.Id}/media/upload-url", token,
            new { contentType = "image/png", byteSize = 1024 })));

        responses.Count(x => x.StatusCode == HttpStatusCode.OK).ShouldBe(MediaRules.MaxPerExperience);
        responses.Count(x => x.StatusCode == HttpStatusCode.Conflict)
            .ShouldBe(attempts - MediaRules.MaxPerExperience);

        var rows = await factory.QueryAsync(db => db.ExperienceMedia
            .AsNoTracking().CountAsync(x => x.ExperienceId == draft.Id));

        rows.ShouldBe(MediaRules.MaxPerExperience);
    }

    // -----------------------------------------------------------------------
    // Meta veri ve yayın anahtarı — issue #50
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Onay_ExifVeGpsSiliniyor_YonPikseleUygulaniyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // Telefonun dikey çektiği fotoğraf: pikseller yatay (1600×1200) saklanıyor,
        // EXIF "90° saat yönünde döndür" diyor (6). Sol yarı kırmızı, sağ yarı mavi.
        const string make = "ExpyraTestPhone";
        var original = MediaApi.WithExif(
            MediaApi.RealJpeg(1600, 1200, SKColors.Red, SKColors.Blue), make, orientation: 6);

        AssertHasGps(original);

        var result = await MediaApi.UploadAsync(client, token, draft.Id, original, "image/jpeg");
        var media = result.Media.ShouldHaveSingleItem();

        // Ölçü yön UYGULANDIKTAN sonraki ölçü — tarayıcının çizeceği.
        media.Width.ShouldBe(1200);
        media.Height.ShouldBe(1600);

        var published = await client.GetByteArrayAsync(new Uri(media.Url.PathAndQuery, UriKind.Relative));

        // exiftool -gps:all karşılığı: EXIF bloğu yok, ne GPS ne üretici adı kaldı.
        published.AsSpan().IndexOf(MediaApi.ExifHeader).ShouldBe(-1);
        published.AsSpan().IndexOf(Encoding.ASCII.GetBytes(make)).ShouldBe(-1);
        HasMarker(published, 0xE1).ShouldBeFalse("APP1 (EXIF/XMP) segmenti kalmamalı");

        using var codec = SKCodec.Create(new MemoryStream(published));
        codec.ShouldNotBeNull();
        codec.EncodedFormat.ShouldBe(SKEncodedImageFormat.Jpeg);
        codec.EncodedOrigin.ShouldBe(SKEncodedOrigin.TopLeft);

        // 90° saat yönünde dönünce sol yarı ÜSTE çıkar.
        using var bitmap = SKBitmap.Decode(published);
        bitmap.Width.ShouldBe(1200);
        bitmap.Height.ShouldBe(1600);

        var top = bitmap.GetPixel(600, 200);
        var bottom = bitmap.GetPixel(600, 1400);
        top.Red.ShouldBeGreaterThan((byte)200);
        top.Blue.ShouldBeLessThan((byte)60);
        bottom.Blue.ShouldBeGreaterThan((byte)200);
        bottom.Red.ShouldBeLessThan((byte)60);

        // Ham yükleme (GPS'li bayt) onaydan sonra depoda kalmıyor.
        (await UploadExistsAsync(draft.Id, media.Id, "jpg")).ShouldBeFalse();
    }

    [Fact]
    public async Task Onay_SonrasiImzaliAdreseYazmak_YayindakiGorseliDegistirmiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var first = MediaApi.ValidPng();
        var upload = await MediaApi.RequestUploadAsync(client, token, draft.Id, MediaRules.MaxByteSize);
        (await MediaApi.PutAsync(client, upload, first, "image/png")).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await MediaApi.ConfirmAsync(client, token, draft.Id, upload.MediaId)).StatusCode.ShouldBe(HttpStatusCode.OK);

        var publicUrl = new Uri(
            "/api/dev/objects/" + MediaRules.ExperienceKey(draft.Id, upload.MediaId, "png"), UriKind.Relative);
        var before = await client.GetByteArrayAsync(publicUrl);

        // İmzalı adres hâlâ ömrünün içinde ve depo onu kabul ediyor — ama yazdığı yer
        // yükleme anahtarı, servis edilen nesne değil.
        var replacement = MediaApi.ValidPng(1700, 1300);
        (await MediaApi.PutAsync(client, upload, replacement, "image/png")).StatusCode
            .ShouldBe(HttpStatusCode.NoContent);

        var after = await client.GetByteArrayAsync(publicUrl);
        after.ShouldBe(before);

        // Yükleme alanı hiçbir adresten servis edilmiyor.
        var raw = await client.GetAsync(new Uri(
            "/api/dev/objects/" + MediaRules.UploadKeyOf(MediaRules.ExperienceKey(draft.Id, upload.MediaId, "png")),
            UriKind.Relative));
        raw.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Tekrar onay idempotent: üzerine yazılan ham bayt yeniden işlenmiyor.
        (await MediaApi.ConfirmAsync(client, token, draft.Id, upload.MediaId)).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await client.GetByteArrayAsync(publicUrl)).ShouldBe(before);
    }

    [Fact]
    public async Task Yukleme_ImzaYalnizYuklemeAnahtarinaVeriliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var upload = await MediaApi.RequestUploadAsync(
            client, token, draft.Id, byteSize: MediaApi.ValidPng().Length);
        var row = await MediaRowAsync(upload.MediaId);

        // Satırdaki (servis edilecek) anahtar yükleme ön ekinde DEĞİL; imzalı adres ise
        // onun yükleme karşılığına yazıyor.
        MediaRules.IsUploadKey(row.StorageKey).ShouldBeFalse();

        var put = await MediaApi.PutAsync(client, upload, MediaApi.ValidPng(), "image/png");
        put.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await UploadExistsAsync(draft.Id, upload.MediaId, "png")).ShouldBeTrue();
        (await ObjectExistsAsync(draft.Id, upload.MediaId, "png")).ShouldBeFalse();
    }

    [Fact]
    public async Task Yukleme_IzinVerilmeyenTip_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // SVG kapalı listede yok: içinde script çalışır.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft.Id}/media/upload-url", token,
            new { contentType = "image/svg+xml", byteSize = 1024 });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Yukleme_BaskasininIlani_404()
    {
        var client = factory.CreateClient();
        var owner = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, owner);

        var stranger = await NewHostTokenAsync(client);

        // 403 DEĞİL 404: 403, "bu id'de bir ilan var" bilgisini sızdırırdı.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft.Id}/media/upload-url", stranger,
            new { contentType = "image/png", byteSize = 1024 });

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Servis_YolGezinmesi_Reddediliyor()
    {
        var client = factory.CreateClient();

        // Anahtar dosya yoluna çevriliyor; `..` geçen bir anahtar depo kökünün dışını
        // okuturdu. Depo bunu beyaz liste ile kesiyor.
        var response = await client.GetAsync(
            new Uri("/api/dev/objects/experiences/../../appsettings.json", UriKind.Relative));

        // 401 de kabul: HttpClient `..` parçalarını gönderMEDEN çözüyor, istek hiçbir uçla
        // eşleşmiyor ve FallbackPolicy (#49) uç bulunmayan anonim isteğe de oturum soruyor.
        // Testin iddiası değişmedi — dosya servis edilmiyor.
        response.StatusCode.ShouldBeOneOf(
            HttpStatusCode.NotFound, HttpStatusCode.BadRequest, HttpStatusCode.Unauthorized);
    }

    // -----------------------------------------------------------------------

    private async Task<string> NewHostTokenAsync(HttpClient client)
    {
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());
        var response = await MediaApi.SendAsync(client, HttpMethod.Post, ActivatePath, tokens.AccessToken);

        var activated = await response.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json);

        return activated!.AccessToken;
    }

    private static async Task<HostExperienceResponse> CreateDraftAsync(HttpClient client, string token)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, BasePath, token, new { originalLanguage = "tr" });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        return await ReadAsync(response);
    }

    /// <summary>Kapak DIŞINDA tüm yayın koşullarını karşılayan taslak.</summary>
    private async Task<HostExperienceResponse> CreateCompleteDraftAsync(
        HttpClient client, string token, string title)
    {
        var draft = await CreateDraftAsync(client, token);

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{draft.Id}", token,
            new
            {
                cityId = await CityIdAsync("izmir"),
                categorySlug = Category,
                durationMinutes = 120,
                capacity = 8,
            });

        await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{draft.Id}/translations/tr", token,
            new { title, description = "Açıklama." });

        // Fiyat da Blok 7'de yayın koşulu oldu; bu yardımcının adı "kapak dışında
        // TÜM koşullar" ve o söz tutulmalı.
        await HostApi.SetMinimalPriceAsync(client, token, draft.Id);

        return draft;
    }

    private Task<Guid> CityIdAsync(string slug) => factory.QueryAsync(db => db.Cities
        .AsNoTracking().Where(x => x.Slug == slug).Select(x => x.Id).FirstAsync());

    private Task<Experience> ExperienceRowAsync(Guid id) => factory.QueryAsync(db => db.Experiences
        .AsNoTracking().SingleAsync(x => x.Id == id));

    private Task<ExperienceMedia> MediaRowAsync(Guid id) => factory.QueryAsync(db => db.ExperienceMedia
        .AsNoTracking().SingleAsync(x => x.Id == id));

    private Task<ExperienceMedia?> MediaRowOrNullAsync(Guid id) => factory.QueryAsync(
        db => db.ExperienceMedia.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id));

    /// <summary>
    /// Nesnenin depoda gerçekten durup durmadığı. HTTP yanıtı "ne döndü"yü, bu
    /// "depoda ne var"ı doğruluyor — silme testleri için tek anlamlı ölçüm.
    /// </summary>
    private async Task<bool> ObjectExistsAsync(Guid experienceId, Guid mediaId, string extension)
    {
        var key = MediaRules.ExperienceKey(experienceId, mediaId, extension);

        var response = await factory.CreateClient()
            .GetAsync(new Uri($"/api/dev/objects/{key}", UriKind.Relative));

        return response.StatusCode == HttpStatusCode.OK;
    }

    /// <summary>
    /// Ham yüklemenin (imzalı adresin yazdığı nesne) depoda durup durmadığı. HTTP'den
    /// bakılamıyor — yükleme alanı bilerek servis edilmiyor — o yüzden depoya doğrudan.
    /// </summary>
    private async Task<bool> UploadExistsAsync(Guid experienceId, Guid mediaId, string extension)
    {
        var key = MediaRules.UploadKeyOf(MediaRules.ExperienceKey(experienceId, mediaId, extension));
        var storage = factory.Services.GetRequiredService<IObjectStorage>();

        return await storage.HeadAsync(key, CancellationToken.None) is not null;
    }

    private static void AssertHasGps(byte[] jpeg)
    {
        // Fixture'ın kendisi doğru mu: EXIF bloğu var ve Skia onu okuyup yönü görüyor.
        // Bu tutmasaydı "yayındakinde EXIF yok" testi hiçbir şey kanıtlamazdı.
        jpeg.AsSpan().IndexOf(MediaApi.ExifHeader).ShouldBeGreaterThan(0);
        HasMarker(jpeg, 0xE1).ShouldBeTrue();

        using var codec = SKCodec.Create(new MemoryStream(jpeg));
        codec.ShouldNotBeNull();
        codec.EncodedOrigin.ShouldBe(SKEncodedOrigin.RightTop);
    }

    /// <summary>JPEG segment listesinde (SOS'a kadar) verilen APPn işaretçisi var mı.</summary>
    private static bool HasMarker(byte[] jpeg, byte marker)
    {
        var offset = 2;

        while (offset + 4 <= jpeg.Length && jpeg[offset] == 0xFF)
        {
            var current = jpeg[offset + 1];

            if (current == marker)
            {
                return true;
            }

            if (current == 0xDA)
            {
                return false;
            }

            offset += 2 + ((jpeg[offset + 2] << 8) | jpeg[offset + 3]);
        }

        return false;
    }

    private static async Task<HostExperienceResponse> ReadAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!;

    private static async Task<string?> TitleAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        return document.RootElement.TryGetProperty("title", out var title) ? title.GetString() : null;
    }
}
