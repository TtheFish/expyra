using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Domain.Experiences;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Experiences;

/// <summary>
/// Host ilan uçlarının tamamı — gerçek veritabanı, gerçek yetki kapısı, gerçek
/// transaction'lar üzerinde.
///
/// <para>Bu dosyanın asıl doğruladığı iki şey: <b>yayın kapısının her koşulu gerçekten
/// tutuyor mu</b> (PLAN Blok 5 kabul kriteri 1) ve <b>başkasının ilanı 404 mü</b>
/// (kabul kriteri 3 — 403 bir enumeration oracle'ı olurdu).</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class HostExperienceTests(ApiFactory factory)
{
    private const string BasePath = "/api/host/experiences";
    private const string ActivatePath = "/api/host/activate";
    private const string Category = "food-drink";

    // -----------------------------------------------------------------------
    // Yayınlama doğrulaması — kabul kriteri 1
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Publish_OrijinalDildeCeviriYok_409VeTaslakYayinlanmiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token);
        await PatchAsync(client, token, draft.Id, new
        {
            cityId = await CityIdAsync("izmir"),
            categorySlug = Category,
            durationMinutes = 120,
            capacity = 8,
        });

        var response = await PostAsync(client, token, $"{BasePath}/{draft.Id}/publish");

        // 409, 400 DEĞİL: istekte yanlış bir şey yok (gövdesi bile yok), eksik olan
        // KAYNAĞIN DURUMU — istemci isteği düzelterek bunu geçemez.
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // "Taslak yayınlanmaz": HTTP yanıtı ne döndüğünü, bu satır ne YAZILDIĞINI doğruluyor.
        var row = await ExperienceRowAsync(draft.Id);
        row.Status.ShouldBe(ExperienceStatus.Draft);
        row.PublishedAtUtc.ShouldBeNull();
    }

    [Fact]
    public async Task Publish_SehirYok_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token);
        await PatchAsync(client, token, draft.Id, new { categorySlug = Category, capacity = 8 });
        await PutTranslationAsync(client, token, draft.Id, "tr", "İzmir Gezisi");

        var response = await PostAsync(client, token, $"{BasePath}/{draft.Id}/publish");

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ExperienceRowAsync(draft.Id)).Status.ShouldBe(ExperienceStatus.Draft);
    }

    [Fact]
    public async Task Publish_KategoriYok_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token);
        await PatchAsync(client, token, draft.Id, new
        {
            cityId = await CityIdAsync("izmir"),
            capacity = 8,
        });
        await PutTranslationAsync(client, token, draft.Id, "tr", "İzmir Gezisi");

        var response = await PostAsync(client, token, $"{BasePath}/{draft.Id}/publish");

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ExperienceRowAsync(draft.Id)).Status.ShouldBe(ExperienceStatus.Draft);
    }

    [Fact]
    public async Task Publish_KapasiteSifir_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        // Kapasite hiç yazılmadı: taslakta 0. Sıfır kapasiteli ilan yayınlansaydı
        // misafir onu listede görür, rezervasyon ilk adımda ölürdü.
        var draft = await CreateDraftAsync(client, token);
        await PatchAsync(client, token, draft.Id, new
        {
            cityId = await CityIdAsync("izmir"),
            categorySlug = Category,
            durationMinutes = 120,
        });
        await PutTranslationAsync(client, token, draft.Id, "tr", "İzmir Gezisi");

        // Kapak yükleniyor ki kalan TEK eksik kapasite olsun — testin ölçtüğü şey bu.
        await MediaApi.UploadAsync(client, token, draft.Id);

        var before = await GetAsync<HostExperienceResponse[]>(client, token, BasePath);
        before.Single(x => x.Id == draft.Id).MissingPublishRequirements
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Capacity);

        var response = await PostAsync(client, token, $"{BasePath}/{draft.Id}/publish");

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ExperienceRowAsync(draft.Id)).Status.ShouldBe(ExperienceStatus.Draft);
    }

    [Fact]
    public async Task Publish_TumKosullarTamam_YayinlaniyorVeSlugDolu()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var experience = await CreatePublishableAsync(client, token, "İzmir Gezisi");

        experience.MissingPublishRequirements.ShouldBeEmpty();

        var published = await PublishAsync(client, token, experience.Id);

        published.Status.ShouldBe(nameof(ExperienceStatus.Published));
        published.PublishedAtUtc.ShouldNotBeNull();
        published.Slug.ShouldNotBeNullOrWhiteSpace();

        var row = await ExperienceRowAsync(experience.Id);
        row.Status.ShouldBe(ExperienceStatus.Published);
    }

    // -----------------------------------------------------------------------
    // Sahiplik — kabul kriteri 3
    // -----------------------------------------------------------------------

    [Fact]
    public async Task BaskaHostunDeneyimi_HerUctan_404()
    {
        var ownerClient = factory.CreateClient();
        var ownerToken = await NewHostTokenAsync(ownerClient);
        var experience = await CreatePublishableAsync(ownerClient, ownerToken, "Ege Kahvaltısı");

        var intruderClient = factory.CreateClient();
        var intruderToken = await NewHostTokenAsync(intruderClient);

        // 403 DEĞİL 404: 403 "bu id'de bir ilan var" bilgisini sızdırır ve saldırgan
        // id uzayını tarayarak hangi ilanların var olduğunu haritalayabilirdi.
        (await PatchRawAsync(intruderClient, intruderToken, experience.Id, new { capacity = 3 }))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await PostAsync(intruderClient, intruderToken, $"{BasePath}/{experience.Id}/publish"))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await PostAsync(intruderClient, intruderToken, $"{BasePath}/{experience.Id}/archive"))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await PutTranslationRawAsync(intruderClient, intruderToken, experience.Id, "tr", "Ele geçirildi"))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Başkasının ilanı listede de yok.
        var list = await GetAsync<HostExperienceResponse[]>(intruderClient, intruderToken, BasePath);
        list.ShouldNotContain(x => x.Id == experience.Id);

        // Sahibi hâlâ dokunabiliyor: 404'ün sebebi ilanın yok olması değil.
        (await PatchRawAsync(ownerClient, ownerToken, experience.Id, new { capacity = 3 }))
            .StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task OlmayanDeneyim_VarOlanBaskasininkiyle_AYNI_YanitiVeriyor()
    {
        var ownerClient = factory.CreateClient();
        var ownerToken = await NewHostTokenAsync(ownerClient);
        var experience = await CreatePublishableAsync(ownerClient, ownerToken, "Kordon Turu");

        var intruderClient = factory.CreateClient();
        var intruderToken = await NewHostTokenAsync(intruderClient);

        var foreign = await PostAsync(intruderClient, intruderToken, $"{BasePath}/{experience.Id}/publish");
        var missing = await PostAsync(intruderClient, intruderToken, $"{BasePath}/{Guid.CreateVersion7()}/publish");

        // Durum kodu VE mesaj aynı: farklı bir metin de bir oracle'dır. (traceId ve
        // instance alanları isteğe özgü olduğu için gövdenin tamamı karşılaştırılmıyor.)
        foreign.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        missing.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await TitleAsync(foreign)).ShouldBe(await TitleAsync(missing));
    }

    [Fact]
    public async Task HostOlmayanHesap_403()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        // Sınıf düzeyindeki [Authorize(Policy = "Host")] kapısı: kimlik var, rol yok.
        // 401 değil 403 — istemci "yeniden giriş yap" ile "önce host ol" arasını ayırabilsin.
        var response = await PostAsync(client, tokens.AccessToken, BasePath, new { originalLanguage = "tr" });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // -----------------------------------------------------------------------
    // Slug
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Slug_TurkceBaslik_InvariantKatlamaylaUretiliyorVeBenzersiz()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var first = await CreatePublishableAsync(client, token, "İzmir Gezisi");
        var second = await CreatePublishableAsync(client, token, "İzmir Gezisi");

        // Türkçe kültürde "İ".ToLower() → "i̇" (i + birleşen nokta) olurdu; katlama
        // invariant olduğu için gövde daima "izmir-gezisi".
        first.Slug.ShouldNotBeNullOrWhiteSpace();
        first.Slug.ShouldStartWith("izmir-gezisi-");
        second.Slug.ShouldNotBeNullOrWhiteSpace();
        second.Slug.ShouldStartWith("izmir-gezisi-");

        // Aynı başlık iki kez: sonek ayırıyor, ux_experience_slug hiç çarpılmıyor.
        first.Slug.ShouldNotBe(second.Slug);
    }

    [Fact]
    public async Task Slug_BaslikDuzeltilince_DEGISMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var experience = await CreatePublishableAsync(client, token, "İzmir Gezisi");
        var original = experience.Slug;
        original.ShouldNotBeNullOrWhiteSpace();

        var updated = await PutTranslationAsync(client, token, experience.Id, "tr", "Bambaşka Bir Başlık");

        // Yayınlanmış bir URL'in altını oymak, paylaşılmış her bağlantıyı kırar.
        updated.Slug.ShouldBe(original);
    }

    [Fact]
    public async Task Slug_YalnizOrijinalDilYazilincaDoguyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token, originalLanguage: "tr");

        // Önce İNGİLİZCE çeviri: slug hâlâ yok, çünkü kaynağı OriginalLanguage başlığı.
        var afterEnglish = await PutTranslationAsync(client, token, draft.Id, "en", "Izmir Walk");
        afterEnglish.Slug.ShouldBeNull();

        var afterTurkish = await PutTranslationAsync(client, token, draft.Id, "tr", "İzmir Gezisi");
        afterTurkish.Slug.ShouldNotBeNullOrWhiteSpace();
        afterTurkish.Slug.ShouldStartWith("izmir-gezisi-");
    }

    // -----------------------------------------------------------------------
    // Çeviri ucu
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Ceviri_PUT_YeniEklerVeVarOlaniGunceller()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token);

        var created = await PutTranslationAsync(client, token, draft.Id, "tr", "İlk Başlık", "İlk açıklama");
        created.Translations.ShouldHaveSingleItem().Title.ShouldBe("İlk Başlık");

        var updated = await PutTranslationAsync(client, token, draft.Id, "tr", "İkinci Başlık", "İkinci açıklama");

        // Upsert: ikinci PUT yeni satır AÇMIYOR, aynı satırı yazıyor.
        var translation = updated.Translations.ShouldHaveSingleItem();
        translation.Title.ShouldBe("İkinci Başlık");
        translation.Description.ShouldBe("İkinci açıklama");
        translation.Source.ShouldBe(nameof(TranslationSource.HostWritten));

        var added = await PutTranslationAsync(client, token, draft.Id, "en", "English Title");
        added.Translations.Count.ShouldBe(2);
        added.Translations.Select(x => x.Language).ShouldBe(["en", "tr"]);
    }

    [Fact]
    public async Task Ceviri_DilKoduKanoniklestiriliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token);

        // 'EN' ile 'en' aynı dil. Normalize edilmeseydi aynı ilan için iki satır doğar
        // ve fallback zinciri sessizce kırılırdı (docs/I18N.md §1).
        await PutTranslationAsync(client, token, draft.Id, "EN", "English Title");
        var result = await PutTranslationAsync(client, token, draft.Id, "en", "English Title 2");

        result.Translations.ShouldHaveSingleItem().Language.ShouldBe("en");
    }

    [Fact]
    public async Task Ceviri_KayitDefterindeOlmayanDil_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // FK'ye çarpmadan önce yakalanıyor: yakalanmasaydı kullanıcı 500 görürdü.
        var response = await PutTranslationRawAsync(client, token, draft.Id, "zz", "Başlık");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // -----------------------------------------------------------------------
    // Temel bilgi ucu
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Patch_SaatDilimiSehirdenTuruyor_IstemciGondermiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var updated = await PatchAsync(client, token, draft.Id, new
        {
            cityId = await CityIdAsync("izmir"),
            // timeZoneId GÖNDERİLMİYOR ve gönderilecek bir alan da yok: gezginin
            // tarayıcı saati Prag'daki bir turun saatini tanımlayamaz.
            timeZoneId = "Europe/London",
        });

        updated.TimeZoneId.ShouldBe("Europe/Istanbul");
    }

    [Fact]
    public async Task Patch_KonusulanDilIleCeviriDiliAyriKavram()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token, originalLanguage: "tr");

        // İlan Türkçe + İngilizce yazılı ama tur yalnızca Çekçe anlatılıyor.
        // docs/I18N.md §3: ikisi aynı alana bindirilirse "İngilizce konuşulan
        // deneyimler" filtresi yanlış sonuç verir.
        await PutTranslationAsync(client, token, draft.Id, "tr", "İzmir Gezisi");
        await PutTranslationAsync(client, token, draft.Id, "en", "Izmir Walk");

        var updated = await PatchAsync(client, token, draft.Id, new { spokenLanguages = new[] { "cs" } });

        updated.SpokenLanguages.ShouldBe(["cs"]);
        updated.Translations.Select(x => x.Language).ShouldBe(["en", "tr"]);

        // Join tablosu, dizi DEĞİL: satırlar language.code'a FK ile bağlı.
        var rows = await factory.QueryAsync(db => db.ExperienceSpokenLanguages
            .AsNoTracking()
            .Where(x => x.ExperienceId == draft.Id)
            .Select(x => x.Language)
            .ToListAsync());

        rows.ShouldBe(["cs"]);
    }

    [Fact]
    public async Task Patch_VerilmeyenAlanDegismiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        await PatchAsync(client, token, draft.Id, new { capacity = 8, durationMinutes = 90 });

        // Gerçek bir PATCH: yalnız kapasiteyi gönderen istek süreyi SİLMİYOR.
        // (PATCH /api/users/me'nin tersi — gerekçe UpdateExperienceCommand'da.)
        var updated = await PatchAsync(client, token, draft.Id, new { capacity = 12 });

        updated.Capacity.ShouldBe(12);
        updated.DurationMinutes.ShouldBe(90);
    }

    [Fact]
    public async Task Patch_Etiketler_KatlanmisHalUzerindenTekilVeYazimGuncellenebilir()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var tagged = await PatchAsync(client, token, draft.Id, new { tags = new[] { "Gün batımı", "gün batımı", "Vegan" } });

        // "Gün batımı" ile "gün batımı" aynı etiket: anahtar katlanmış hâl.
        tagged.Tags.ShouldBe(["Gün batımı", "Vegan"]);

        var renamed = await PatchAsync(client, token, draft.Id, new { tags = new[] { "GÜN BATIMI" } });

        // Aynı satır, yeni yazım — ve listeden çıkarılan etiket gerçekten silindi.
        renamed.Tags.ShouldBe(["GÜN BATIMI"]);

        var cleared = await PatchAsync(client, token, draft.Id, new { tags = Array.Empty<string>() });

        // Koleksiyonda "boşalt" niyeti BOŞ DİZİ ile anlatılıyor (null "dokunma" demek).
        cleared.Tags.ShouldBeEmpty();
    }

    [Fact]
    public async Task Patch_BilinmeyenSehirVeKategori_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        (await PatchRawAsync(client, token, draft.Id, new { cityId = Guid.CreateVersion7() }))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        (await PatchRawAsync(client, token, draft.Id, new { categorySlug = "olmayan-kategori" }))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Patch_YayindakiIlaninSehri_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var experience = await CreatePublishableAsync(client, token, "İzmir Gezisi");
        await PublishAsync(client, token, experience.Id);

        // Yayınlanmış ilanın şehri değişseydi hem saat dilimi hem de (Blok 7'den sonra)
        // mevcut rezervasyonların yeri kayardı.
        var response = await PatchRawAsync(client, token, experience.Id, new
        {
            cityId = await CityIdAsync("ankara"),
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ExperienceRowAsync(experience.Id)).TimeZoneId.ShouldBe("Europe/Istanbul");
    }

    [Fact]
    public async Task Patch_YayindakiIlaninKapasitesiSifirlanamaz_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var experience = await CreatePublishableAsync(client, token, "İzmir Gezisi");
        await PublishAsync(client, token, experience.Id);

        // Yayın kapısı yalnız GEÇİŞİ değil, DURUMU da korumak zorunda: aksi halde host
        // yayınlar, ertesi gün kapasiteyi 0 yapar ve ilan yayında kalırdı.
        var response = await PatchRawAsync(client, token, experience.Id, new { capacity = 0 });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ExperienceRowAsync(experience.Id)).Capacity.ShouldBe(8);
    }

    // -----------------------------------------------------------------------
    // Durum geçişleri
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Publish_IkinciCagri_200VeYayinTarihiDegismiyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var experience = await CreatePublishableAsync(client, token, "İzmir Gezisi");

        var first = await PublishAsync(client, token, experience.Id);
        var second = await PublishAsync(client, token, experience.Id);

        // İDEMPOTANLIK: çift tıklama hata ekranı üretmemeli.
        second.Status.ShouldBe(nameof(ExperienceStatus.Published));
        second.PublishedAtUtc.ShouldBe(first.PublishedAtUtc);
        second.Slug.ShouldBe(first.Slug);
    }

    [Fact]
    public async Task Archive_IdempotentVeYayindanGeriDonulebiliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var experience = await CreatePublishableAsync(client, token, "İzmir Gezisi");
        var published = await PublishAsync(client, token, experience.Id);

        var archived = await ArchiveAsync(client, token, experience.Id);
        archived.Status.ShouldBe(nameof(ExperienceStatus.Archived));

        var archivedAgain = await ArchiveAsync(client, token, experience.Id);
        archivedAgain.Status.ShouldBe(nameof(ExperienceStatus.Archived));

        // Arşiv bir SİLME değil: geri dönüş var ve ilk yayın damgası korunuyor
        // (şehir kilidi ona dayanıyor).
        var republished = await PublishAsync(client, token, experience.Id);

        republished.Status.ShouldBe(nameof(ExperienceStatus.Published));
        republished.PublishedAtUtc.ShouldBe(published.PublishedAtUtc);
    }

    // -----------------------------------------------------------------------
    // Liste ucu
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Liste_DurumFiltresiCalisiyor_VeYalnizKendiIlanlariniDonuyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        var draft = await CreateDraftAsync(client, token);
        var live = await CreatePublishableAsync(client, token, "Yayındaki Gezi");
        await PublishAsync(client, token, live.Id);

        var drafts = await GetAsync<HostExperienceResponse[]>(client, token, $"{BasePath}?status=draft");
        drafts.ShouldContain(x => x.Id == draft.Id);
        drafts.ShouldNotContain(x => x.Id == live.Id);

        var published = await GetAsync<HostExperienceResponse[]>(client, token, $"{BasePath}?status=Published");
        published.ShouldContain(x => x.Id == live.Id);
        published.ShouldNotContain(x => x.Id == draft.Id);

        var all = await GetAsync<HostExperienceResponse[]>(client, token, BasePath);
        all.Select(x => x.Id).ShouldContain(draft.Id);
        all.Select(x => x.Id).ShouldContain(live.Id);
    }

    [Fact]
    public async Task Liste_TaninmayanDurum_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        // Sessizce yok sayılsaydı istemci "taslaklarım" sanırken yayındakileri de görürdü.
        var response = await SendAsync(client, HttpMethod.Get, $"{BasePath}?status=taslak", token);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // -----------------------------------------------------------------------
    // Yardımcılar
    // -----------------------------------------------------------------------

    /// <summary>Giriş yapar, host rolünü alır ve ROLLÜ access token'ı döner.</summary>
    private async Task<string> NewHostTokenAsync(HttpClient client)
    {
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var response = await PostAsync(client, tokens.AccessToken, ActivatePath);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var activated = await response.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json);
        activated.ShouldNotBeNull();

        // Rol claim'i access token'da: aktivasyondan ÖNCEKİ token hâlâ rolsüz.
        return activated.AccessToken;
    }

    /// <summary>ProblemDetails gövdesinin <c>title</c> alanı — hata mesajının kendisi.</summary>
    private static async Task<string?> TitleAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        return document.RootElement.TryGetProperty("title", out var title) ? title.GetString() : null;
    }

    private static async Task<HostExperienceResponse> CreateDraftAsync(
        HttpClient client, string token, string originalLanguage = "tr")
    {
        var response = await PostAsync(client, token, BasePath, new { originalLanguage });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        return await ReadAsync(response);
    }

    /// <summary>
    /// Yayın koşullarının HEPSİNİ karşılayan ama henüz yayınlanmamış ilan.
    ///
    /// <para>Kapak görseli de burada yükleniyor (PLAN Blok 6 kabul kriteri 3). Blok 6
    /// öncesinde bu yardımcı kapaksız bir ilan üretiyordu; kural eklenince yayın yapan
    /// yedi test birden kırıldı ve doğru düzeltme testleri gevşetmek değil, "yayına
    /// hazır ilan"ın tanımını güncellemekti.</para>
    /// </summary>
    private async Task<HostExperienceResponse> CreatePublishableAsync(
        HttpClient client, string token, string title)
    {
        var draft = await CreateDraftAsync(client, token);

        await PatchAsync(client, token, draft.Id, new
        {
            cityId = await CityIdAsync("izmir"),
            categorySlug = Category,
            durationMinutes = 120,
            capacity = 8,
            spokenLanguages = new[] { "tr", "en" },
        });

        await PutTranslationAsync(client, token, draft.Id, "tr", title, "Açıklama metni.");

        return await MediaApi.UploadAsync(client, token, draft.Id);
    }

    private Task<Guid> CityIdAsync(string slug) => factory.QueryAsync(db => db.Cities
        .AsNoTracking()
        .Where(x => x.Slug == slug)
        .Select(x => x.Id)
        .FirstAsync());

    private Task<Experience> ExperienceRowAsync(Guid id) => factory.QueryAsync(db => db.Experiences
        .AsNoTracking()
        .SingleAsync(x => x.Id == id));

    private static async Task<HostExperienceResponse> PatchAsync(
        HttpClient client, string token, Guid id, object body)
    {
        var response = await PatchRawAsync(client, token, id, body);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync(response);
    }

    private static Task<HttpResponseMessage> PatchRawAsync(
        HttpClient client, string token, Guid id, object body)
        => SendAsync(client, HttpMethod.Patch, $"{BasePath}/{id}", token, body);

    private static async Task<HostExperienceResponse> PutTranslationAsync(
        HttpClient client, string token, Guid id, string language, string title, string? description = null)
    {
        var response = await PutTranslationRawAsync(client, token, id, language, title, description);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync(response);
    }

    private static Task<HttpResponseMessage> PutTranslationRawAsync(
        HttpClient client, string token, Guid id, string language, string title, string? description = null)
        => SendAsync(
            client,
            HttpMethod.Put,
            $"{BasePath}/{id}/translations/{language}",
            token,
            new { title, description });

    private static async Task<HostExperienceResponse> PublishAsync(HttpClient client, string token, Guid id)
    {
        var response = await PostAsync(client, token, $"{BasePath}/{id}/publish");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync(response);
    }

    private static async Task<HostExperienceResponse> ArchiveAsync(HttpClient client, string token, Guid id)
    {
        var response = await PostAsync(client, token, $"{BasePath}/{id}/archive");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync(response);
    }

    private static Task<HttpResponseMessage> PostAsync(
        HttpClient client, string token, string path, object? body = null)
        => SendAsync(client, HttpMethod.Post, path, token, body);

    private static async Task<T> GetAsync<T>(HttpClient client, string token, string path)
    {
        var response = await SendAsync(client, HttpMethod.Get, path, token);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<T>(AuthApi.Json))!;
    }

    private static async Task<HostExperienceResponse> ReadAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!;

    private static async Task<HttpResponseMessage> SendAsync(
        HttpClient client, HttpMethod method, string path, string token, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new("Bearer", token);

        if (body is not null)
        {
            // Tip AÇIKÇA veriliyor: gövdeler `object` olarak taşınıyor ve serileştirme
            // bildirilen tipe düşerse anonim nesne boş `{}` olarak giderdi.
            request.Content = JsonContent.Create(body, body.GetType(), options: AuthApi.Json);
        }

        // İstek NESNESİ burada await ediliyor: `return client.SendAsync(request)`
        // yazılsaydı `using` isteği gönderim bitmeden atardı.
        return await client.SendAsync(request).ConfigureAwait(false);
    }
}
