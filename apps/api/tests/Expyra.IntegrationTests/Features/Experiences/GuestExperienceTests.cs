using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Queries.GetExperiences;
using Expyra.Domain.Experiences;
using Expyra.Domain.Places;
using Expyra.Domain.Users;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Experiences;

/// <summary>
/// Misafirin okuma uçları — gerçek veritabanı, gerçek index'ler, gerçek SQL üzerinde.
///
/// <para><b>Satırlar API ile değil doğrudan veritabanına yazılıyor.</b> Yazma yolu 5a'nın
/// testlerinde zaten kanıtlı; burada gereken şey yazmanın çalıştığı değil, OKUMANIN
/// doğru olduğu. Doğrudan yazmak üç şeyi mümkün kılıyor: (1) yayın damgasını kontrol
/// etmek — sayfa sınırı ancak bilinen damgalarla sınanabilir, (2) API'nin üretemeyeceği
/// bozuk durumları kurmak — "orijinal dilde çevirisi olmayan yayın" gibi, (3) 27 satırlık
/// bir sayfayı yüzlerce HTTP isteği yerine tek SaveChanges ile hazırlamak.</para>
///
/// <para><b>Her test kendi ŞEHRİNDE çalışıyor.</b> Veritabanı koleksiyon boyunca
/// paylaşılıyor ve bu uçta durum filtresi gibi bir izolasyon aracı yok; şehir filtresi
/// testleri birbirinden ayıran şey. Aynı şehri iki test kullansaydı, biri diğerinin
/// satırlarını sayardı ve hata "sayfalama bozuldu" gibi görünürdü.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class GuestExperienceTests(ApiFactory factory)
{
    private const string BasePath = "/api/experiences";
    private const string Category = "tours-walks";

    /// <summary>Damgalar TAM dakika: Postgres timestamptz mikrosaniyeye yuvarlıyor.</summary>
    private static readonly DateTimeOffset BaseTime = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// Test başına tek istemci: xUnit her test için sınıfı yeniden kuruyor, dolayısıyla
    /// her testin kendi IP'si oluyor (<c>ApiFactory.ConfigureClient</c>) ve hız sınırı
    /// sayaçları testler arasında paylaşılmıyor.
    /// </summary>
    private readonly HttpClient client = factory.CreateClient();

    // -----------------------------------------------------------------------
    // Görünürlük — kabul kriteri 3
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Liste_YayindakiIlan_KartinIhtiyaciOlanHerSeyiTasiyor()
    {
        var host = await NewHostAsync();
        var slug = await SeedAsync(host, "cz-prague", "cs", [("cs", "Vltava fotoğraf turu", null)]);

        var page = await ListAsync("cz-prague");

        var item = page.Items.ShouldHaveSingleItem();
        item.Slug.ShouldBe(slug);
        item.CategorySlug.ShouldBe(Category);
        item.DurationMinutes.ShouldBe(120);
        item.Capacity.ShouldBe(8);

        // Kart şehri kendi başına çizebilmeli: ikinci bir isteğe (id → şehir) gerek yok.
        item.City.Slug.ShouldBe("prague");
        item.City.CountryCode.ShouldBe("CZ");
        item.City.Name.ShouldBe("Praha");
        item.City.EnglishName.ShouldBe("Prague");

        item.Text.Title.ShouldBe("Vltava fotoğraf turu");
        item.Text.Language.ShouldBe("cs");
        item.Text.Source.ShouldBe(nameof(TranslationSource.HostWritten));

        page.NextCursor.ShouldBeNull();
    }

    [Fact]
    public async Task Liste_TaslakVeArsiv_Gorunmez()
    {
        var host = await NewHostAsync();

        var published = await SeedAsync(host, "cz-brno", "cs", [("cs", "Brno turu", null)]);
        var draft = await SeedAsync(host, "cz-brno", "cs", [("cs", "Taslak", null)], ExperienceStatus.Draft);
        var archived = await SeedAsync(host, "cz-brno", "cs", [("cs", "Arşiv", null)], ExperienceStatus.Archived);

        var page = await ListAsync("cz-brno");

        page.Items.ShouldHaveSingleItem().Slug.ShouldBe(published);

        // Kabul kriteri 3: yayınlanmamış olan misafir için YOK — 403 değil 404, çünkü
        // 403 "bu slug'da bir ilan var" bilgisini sızdırırdı.
        (await GetDetailResponseAsync(draft)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await GetDetailResponseAsync(archived)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Detay_OlmayanSlug_VeTaslak_AYNI404()
    {
        var host = await NewHostAsync();
        var draft = await SeedAsync(host, "cz-brno", "cs", [("cs", "Gizli taslak", null)], ExperienceStatus.Draft);

        var missing = await GetDetailResponseAsync("boyle-bir-slug-yok-abcdef");
        var hidden = await GetDetailResponseAsync(draft);

        missing.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        hidden.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Mesaj bile aynı: farklı bir metin, "bu slug var ama yayında değil" diyen bir
        // oracle olurdu ve yayınlanmamış ilanları haritalamaya yarardı. (Gövdenin tamamı
        // karşılaştırılmıyor: ProblemDetails `instance` ve `traceId` alanları istek
        // başına doğal olarak farklı.)
        (await TitleAsync(hidden)).ShouldBe(await TitleAsync(missing));
    }

    [Theory]
    [InlineData(UserStatus.Banned, "cz-ostrava")]
    [InlineData(UserStatus.Suspended, "cz-plzen")]
    public async Task BanliVeAskidakiHostunYayini_ListedeYokDetaydaDA404(UserStatus status, string cityKey)
    {
        // Host YAYINDAYKEN banlanıyor: yaptırım ilan satırlarına dokunmadan, tek yerden
        // uygulanıyor. İlanları tek tek arşivlemek gerekseydi yaptırım hem yavaş hem de
        // geri alınamaz olurdu.
        var host = await NewHostAsync();
        var slug = await SeedAsync(host, cityKey, "cs", [("cs", "Gizlenecek tur", null)]);

        (await ListAsync(cityKey)).Items.ShouldHaveSingleItem();

        await SetUserStatusAsync(host, status);

        (await ListAsync(cityKey)).Items.ShouldBeEmpty();
        (await GetDetailResponseAsync(slug)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // -----------------------------------------------------------------------
    // Fallback zinciri — kabul kriteri 2 (docs/I18N.md §2)
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Fallback_ZincirinHerAdimi_SunucudaCozuluyor()
    {
        // Orijinal dil Çekçe; elde Çekçe, Almanca ve İngilizce metin var.
        var host = await NewHostAsync();
        var slug = await SeedAsync(host, "cz-olomouc", "cs",
        [
            ("cs", "Olomoucká prohlídka", "Popis."),
            ("de", "Olmützer Rundgang", "Beschreibung."),
            ("en", "Olomouc walking tour", "Description."),
        ]);

        // 1. adım — tam eşleşme.
        var exact = await GetDetailAsync(slug, "de");
        exact.Text.Language.ShouldBe("de");
        exact.Text.Title.ShouldBe("Olmützer Rundgang");
        exact.Text.IsFallback.ShouldBeFalse();

        // 2. adım — bölgesiz kök. de-AT için ayrı satır tutulmuyor (I18N §1) ve
        // Avusturyalı misafir boş ekran görmüyor.
        var root = await GetDetailAsync(slug, "de-AT");
        root.Text.Language.ShouldBe("de");
        // Rozet: "istediğin dil değil, Almanca gösteriyoruz".
        root.Text.IsFallback.ShouldBeTrue();

        // 3. adım — host'un kendi dili, İngilizce'yi YENEREK. Elde İngilizce çeviri var
        // ama gezgin Fransızca istediğinde host'un yazdığı Çekçe metin geliyor.
        var original = await GetDetailAsync(slug, "fr");
        original.Text.Language.ShouldBe("cs");
        original.Text.IsFallback.ShouldBeTrue();

        // Dil hiç verilmediğinde: düşülecek bir talep yok, rozet basılmıyor.
        var none = await GetDetailAsync(slug);
        none.Text.Language.ShouldBe("cs");
        none.Text.IsFallback.ShouldBeFalse();
    }

    [Fact]
    public async Task Fallback_OrijinalDildeSatirYok_SonCareIngilizce()
    {
        // API bu durumu ÜRETEMEZ (yayın kapısı orijinal dildeki satırı şart koşuyor);
        // zincirin 4. adımı, veri elle bozulduğunda metnin boş kalmaması için var.
        var host = await NewHostAsync();
        var slug = await SeedAsync(host, "cz-liberec", "cs", [("en", "Liberec by night", null)]);

        var detail = await GetDetailAsync(slug, "fr");

        detail.Text.Language.ShouldBe("en");
        detail.Text.IsFallback.ShouldBeTrue();
    }

    [Fact]
    public async Task Fallback_HicMetinYok_SessizceGizlenmiyor_500()
    {
        // Bozuk satır boş başlıkla listelenmiyor; gürültüyle patlıyor (CLAUDE.md #1).
        var host = await NewHostAsync();
        var slug = await SeedAsync(host, "at-salzburg", "de", []);

        try
        {
            var response = await GetDetailResponseAsync(slug);

            response.StatusCode.ShouldBe(HttpStatusCode.InternalServerError);
        }
        finally
        {
            // Satır SİLİNİYOR: koleksiyondaki başka bir test şehirsiz liste çektiğinde
            // bu bozuk kayıt onun isteğini de 500'e düşürürdü.
            await DeleteExperienceAsync(slug);
        }
    }

    [Fact]
    public async Task Liste_IstenenDilVarsa_KartMetniOnDilde()
    {
        var host = await NewHostAsync();
        await SeedAsync(host, "cz-cesky-krumlov", "cs",
        [
            ("cs", "Krumlovská plavba", null),
            ("en", "Krumlov river trip", null),
        ]);

        var page = await ListAsync("cz-cesky-krumlov", language: "en");

        var text = page.Items.ShouldHaveSingleItem().Text;
        text.Language.ShouldBe("en");
        text.Title.ShouldBe("Krumlov river trip");
        text.IsFallback.ShouldBeFalse();
    }

    // -----------------------------------------------------------------------
    // Cursor sayfalama
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Cursor_SayfaSiniriDeterministik_VeAyniSatirIkiSayfadaYok()
    {
        const int extra = 3;
        var total = GetExperiencesQuery.PageSize + extra;

        var host = await NewHostAsync();
        var slugs = new List<string>(total);

        for (var index = 0; index < total; index++)
        {
            slugs.Add(await SeedAsync(
                host, "cz-kutna-hora", "cs",
                [("cs", $"Kutná Hora {index}", null)],
                publishedAt: BaseTime.AddMinutes(index)));
        }

        // Beklenen sıra: en yeni YAYINLANAN üstte. Taslak yaşı (created_at / Guid v7)
        // değil, yayın damgası — ocakta yazılıp haziranda yayınlanan ilan haziran ilanıdır.
        var expected = Enumerable.Range(0, total).Reverse().Select(index => slugs[index]).ToList();

        var first = await ListAsync("cz-kutna-hora");
        first.Items.Select(x => x.Slug).ShouldBe(expected.Take(GetExperiencesQuery.PageSize));
        first.NextCursor.ShouldNotBeNull();

        var second = await ListAsync("cz-kutna-hora", cursor: first.NextCursor);
        second.Items.Select(x => x.Slug).ShouldBe(expected.Skip(GetExperiencesQuery.PageSize));

        // Son sayfada cursor YOK: sunucu sayfa boyutundan bir fazla satır çektiği için
        // "boş bir sayfaya götüren cursor" hiç üretilmiyor.
        second.NextCursor.ShouldBeNull();

        first.Items.Select(x => x.Slug)
            .Intersect(second.Items.Select(x => x.Slug), StringComparer.Ordinal)
            .ShouldBeEmpty();
    }

    [Fact]
    public async Task Cursor_AyniAndaYayinlananlar_IkincilAnahtarlaAyriliyor()
    {
        // Toplu içe aktarma ya da çift tıklama: damgalar birebir aynı. Yalnız zamana
        // bakan bir sınır burada belirsiz kalır ve satırlar iki sayfada birden ya da
        // hiçbirinde görünür.
        var total = GetExperiencesQuery.PageSize + 1;

        var host = await NewHostAsync();
        var slugs = new List<string>(total);

        for (var index = 0; index < total; index++)
        {
            slugs.Add(await SeedAsync(
                host, "cz-karlovy-vary", "cs",
                [("cs", $"Karlovy Vary {index}", null)],
                publishedAt: BaseTime));
        }

        var first = await ListAsync("cz-karlovy-vary");
        var second = await ListAsync("cz-karlovy-vary", cursor: first.NextCursor);

        var seen = first.Items.Concat(second.Items).Select(x => x.Slug).ToList();

        seen.Count.ShouldBe(total);
        seen.Distinct(StringComparer.Ordinal).Count().ShouldBe(total);
        seen.Order(StringComparer.Ordinal).ShouldBe(slugs.Order(StringComparer.Ordinal));

        // Sıra deterministik: aynı istek iki kez aynı sayfayı veriyor.
        var again = await ListAsync("cz-karlovy-vary");
        again.Items.Select(x => x.Slug).ShouldBe(first.Items.Select(x => x.Slug));
        again.NextCursor.ShouldBe(first.NextCursor);
    }

    [Fact]
    public async Task Cursor_Bozuk_400()
    {
        // Sessizce ilk sayfaya dönseydi sayfalayan istemci sonsuz döngüye girerdi.
        var response = await ListResponseAsync("cz-prague", cursor: "bu-bir-cursor-degil");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // -----------------------------------------------------------------------
    // Şehir filtresi
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Liste_SehirFiltresi_YalnizOSehir()
    {
        var host = await NewHostAsync();
        var munich = await SeedAsync(host, "de-munich", "de", [("de", "München Rundgang", null)]);
        await SeedAsync(host, "de-hamburg", "de", [("de", "Hamburg Hafentour", null)]);

        var page = await ListAsync("de-munich");

        page.Items.ShouldHaveSingleItem().Slug.ShouldBe(munich);
    }

    [Theory]
    // Biçim hatası: ülke kodu yok, yalnız slug benzersiz DEĞİL.
    [InlineData("munich")]
    [InlineData("d-munich")]
    [InlineData("de münchen")]
    public async Task Liste_BozukSehirAnahtari_400(string city)
        => (await ListResponseAsync(city)).StatusCode.ShouldBe(HttpStatusCode.BadRequest);

    [Fact]
    public async Task Liste_BilinmeyenSehir_400_BosListeDegil()
    {
        // Boş liste dönseydi misafir "burada ilan yok" sanırdı; oysa sorulan şehir
        // kayıt defterinde hiç yok — bu bir istemci hatası ve söylenmeli.
        var response = await ListResponseAsync("cz-praha");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Liste_BozukDilKodu_400()
        => (await ListResponseAsync("cz-prague", language: "bu bir dil değil")).StatusCode
            .ShouldBe(HttpStatusCode.BadRequest);

    // -----------------------------------------------------------------------
    // Detay
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Detay_TekCagriyla_KonusulanDilVeEtiketlerDeGeliyor()
    {
        var host = await NewHostAsync();
        var slug = await SeedAsync(
            host, "de-dresden", "de",
            [("de", "Dresdner Altstadt", "Ein Spaziergang durch die Altstadt.")],
            spokenLanguages: ["de", "en"],
            tags: [("sunset", "Sunset"), ("fotograf", "Fotoğraf")]);

        var detail = await GetDetailAsync(slug, "de");

        detail.Slug.ShouldBe(slug);
        detail.City.Slug.ShouldBe("dresden");
        detail.Text.Description.ShouldBe("Ein Spaziergang durch die Altstadt.");

        // Konuşulan dil, metnin dili DEĞİL (docs/I18N.md §3) — ikisi ayrı alanlarda.
        detail.SpokenLanguages.ShouldBe(["de", "en"]);

        // Etiket sırası katlanmış hâle göre: gösterimdeki yazıma göre sıralamak listeyi
        // sunucunun kültür ayarına bağlardı.
        detail.Tags.ShouldBe(["Fotoğraf", "Sunset"]);
    }

    [Fact]
    public async Task Detay_BuyukHarfliUrl_AyniIlana_Cozuluyor()
    {
        // Postadan/PDF'ten gelen bağlantılarda büyük harfe dönmüş slug'lar oluyor.
        // Küçük harfe indirme INVARIANT: Türkçe kuralda "IZMIR" → "ızmır" olurdu.
        var host = await NewHostAsync();
        var slug = await SeedAsync(host, "at-vienna", "de", [("de", "Wiener Kaffeehaus", null)]);

        var detail = await GetDetailAsync(slug.ToUpperInvariant());

        detail.Slug.ShouldBe(slug);
    }

    // -----------------------------------------------------------------------
    // N+1 yok — kabul kriteri 4
    // -----------------------------------------------------------------------

    /// <summary>
    /// <b>Nasıl doğrulanıyor:</b> EF Core her komut için <c>DiagnosticListener</c>'a
    /// <c>...Database.Command.CommandExecuted</c> olayı yazıyor. Test süreç içinden bu
    /// olayları sayıyor — yani ölçülen şey "kaç SQL komutu koştu", tahmini değil.
    /// Uygulamanın kablolamasına dokunulmuyor (Serilog, <c>ILoggerProvider</c> ekleme
    /// yolunu kapatıyor; DiagnosticSource ondan bağımsız).
    ///
    /// <para>Asıl iddia MUTLAK sayı değil, <b>sayının satır sayısından bağımsız olması</b>:
    /// N+1 tam olarak bu bağımlılığın adı. Mutlak sınır ayrıca sabitleniyor ki ileride
    /// sessizce bir sorgu daha eklenmesin.</para>
    /// </summary>
    [Fact]
    public async Task Liste_SorguSayisi_SatirSayisindanBagimsiz()
    {
        var host = await NewHostAsync();

        await SeedAsync(host, "cz-ceske-budejovice", "cs", [("cs", "Budvar turu", null)]);

        for (var index = 0; index < 5; index++)
        {
            await SeedAsync(host, "de-leipzig", "cs",
            [
                ("cs", $"Lipsko {index}", "Popis."),
                ("de", $"Leipzig {index}", "Beschreibung."),
                ("en", $"Leipzig {index}", "Description."),
            ]);
        }

        // Isınma: ilk çağrı EF'in sorgu derlemesini ve bağlantı havuzunu hazırlıyor.
        await ListAsync("cz-ceske-budejovice");
        await ListAsync("de-leipzig");

        var one = await CountCommandsAsync(() => ListAsync("cz-ceske-budejovice", language: "de-AT"));
        var many = await CountCommandsAsync(() => ListAsync("de-leipzig", language: "de-AT"));

        // Sayaç GERÇEKTEN sayıyor mu: sıfır çıkarsa aşağıdaki eşitlik (0 == 0) sessizce
        // geçer ve test hiçbir şey ölçmeden yeşil kalırdı.
        one.ShouldBeGreaterThan(0);

        // 1 satır ile 5 satır AYNI maliyette: sayfa + metinler + kapaklar. Testin
        // koruduğu şey tavanın kendisi değil, tavanın SATIR SAYISINDAN BAĞIMSIZ olması —
        // N+1 buradan girer. Blok 6'da kapak sorgusu eklendi ve sayı 2'den 3'e çıktı;
        // yükselen tavan, düşen değil, çünkü kapaklar da tek sorguda geliyor.
        many.ShouldBe(one);
        one.ShouldBeLessThanOrEqualTo(3);
    }

    [Fact]
    public async Task Detay_SorguSayisi_IcerikMiktarindanBagimsiz()
    {
        var host = await NewHostAsync();

        var lean = await SeedAsync(host, "de-nuremberg", "cs", [("cs", "Norimberk krátce", null)]);

        var rich = await SeedAsync(
            host, "de-nuremberg", "cs",
            [
                ("cs", "Norimberský pivovar", "Popis."),
                ("de", "Nürnberger Brauerei", "Beschreibung."),
                ("en", "Nuremberg brewery", "Description."),
            ],
            spokenLanguages: ["cs", "de", "en"],
            tags: [("bira", "Bira"), ("gezi", "Gezi"), ("tarih", "Tarih")]);

        await GetDetailAsync(lean);

        var leanCount = await CountCommandsAsync(() => GetDetailAsync(lean, "de-AT"));
        var richCount = await CountCommandsAsync(() => GetDetailAsync(rich, "de-AT"));

        // Sayaç gerçekten sayıyor mu — bkz. liste testindeki aynı satır.
        leanCount.ShouldBeGreaterThan(0);

        // Detay sayfası TEK çağrıyla doluyor ve sunucu tarafındaki sorgu sayısı içerik
        // miktarıyla büyümüyor: ilan + konuşulan diller + etiketler + metin + galeri.
        // Üç görselli ilan da bir görselli ilan da aynı sayıda sorgu koşuyor.
        richCount.ShouldBe(leanCount);

        // Tavan Blok 6'da 4'ten 5'e çıktı (galeri sorgusu). Asıl korunan şey bu sayı
        // değil, üstteki eşitlik: içerik büyüdükçe sorgu sayısı SABİT kalıyor.
        leanCount.ShouldBeLessThanOrEqualTo(5);
    }

    // -----------------------------------------------------------------------
    // Yardımcılar — HTTP
    // -----------------------------------------------------------------------

    private async Task<GuestExperiencePageResponse> ListAsync(
        string? city = null, string? cursor = null, string? language = null)
    {
        var response = await ListResponseAsync(city, cursor, language);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<GuestExperiencePageResponse>(AuthApi.Json))!;
    }

    private Task<HttpResponseMessage> ListResponseAsync(
        string? city = null, string? cursor = null, string? language = null)
    {
        var query = new List<string>(3);

        if (city is not null)
        {
            query.Add($"city={Uri.EscapeDataString(city)}");
        }

        if (cursor is not null)
        {
            query.Add($"cursor={Uri.EscapeDataString(cursor)}");
        }

        if (language is not null)
        {
            query.Add($"lang={Uri.EscapeDataString(language)}");
        }

        var path = query.Count == 0 ? BasePath : $"{BasePath}?{string.Join('&', query)}";

        return client.GetAsync(path);
    }

    private async Task<GuestExperienceDetailResponse> GetDetailAsync(string slug, string? language = null)
    {
        var response = await GetDetailResponseAsync(slug, language);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<GuestExperienceDetailResponse>(AuthApi.Json))!;
    }

    private Task<HttpResponseMessage> GetDetailResponseAsync(string slug, string? language = null)
    {
        var path = language is null
            ? $"{BasePath}/{Uri.EscapeDataString(slug)}"
            : $"{BasePath}/{Uri.EscapeDataString(slug)}?lang={Uri.EscapeDataString(language)}";

        return client.GetAsync(path);
    }

    /// <summary>ProblemDetails gövdesinin <c>title</c> alanı — hata mesajının kendisi.</summary>
    private static async Task<string?> TitleAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        return document.RootElement.TryGetProperty("title", out var title) ? title.GetString() : null;
    }

    // -----------------------------------------------------------------------
    // Yardımcılar — veri
    // -----------------------------------------------------------------------

    private Task<Guid> NewHostAsync() => factory.QueryAsync(async db =>
    {
        var email = AuthApi.NewEmail();

        var user = new User
        {
            Email = email,
            NormalizedEmail = EmailAddress.Normalize(email),
            EmailVerifiedAtUtc = BaseTime,
        };

        user.Roles.Add(UserRole.Host);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return user.Id;
    });

    private Task SetUserStatusAsync(Guid userId, UserStatus status) => factory.QueryAsync(async db =>
    {
        var user = await db.Users.SingleAsync(x => x.Id == userId);
        user.Status = status;
        await db.SaveChangesAsync();

        return true;
    });

    private Task DeleteExperienceAsync(string slug) => factory.QueryAsync(async db =>
    {
        // Çeviri/dil/etiket satırları FK cascade ile gidiyor.
        var experience = await db.Experiences.SingleAsync(x => x.Slug == slug);
        db.Experiences.Remove(experience);
        await db.SaveChangesAsync();

        return true;
    });

    /// <summary>
    /// Tek SaveChanges ile bir ilan ve metinleri. Şehir kayıt defterinden çözülüyor
    /// (uydurma bir satır, gerçek index'lerin üzerinde koşmayan bir test demek olurdu).
    /// </summary>
    private Task<string> SeedAsync(
        Guid hostId,
        string cityKey,
        string originalLanguage,
        IReadOnlyList<(string Language, string Title, string? Description)> translations,
        ExperienceStatus status = ExperienceStatus.Published,
        DateTimeOffset? publishedAt = null,
        IReadOnlyList<string>? spokenLanguages = null,
        IReadOnlyList<(string Normalized, string Display)>? tags = null)
        => factory.QueryAsync(async db =>
        {
            CityKey.TryParse(cityKey, out var countryCode, out var citySlug).ShouldBeTrue();

            var city = await db.Cities
                .AsNoTracking()
                .SingleAsync(x => x.CountryCode == countryCode && x.Slug == citySlug);

            var experience = new Experience
            {
                HostId = hostId,
                OriginalLanguage = originalLanguage,
                CityId = city.Id,
                // ck_experience_time_zone_requires_city: şehir varsa saat dilimi de var.
                TimeZoneId = city.TimeZoneId,
                CategorySlug = Category,
                DurationMinutes = 120,
                Capacity = 8,
                Status = status,
                Slug = ExperienceSlug.New(translations.Count > 0 ? translations[0].Title : "deneyim"),
                PublishedAtUtc = status == ExperienceStatus.Published
                    ? publishedAt ?? BaseTime
                    : null,
            };

            db.Experiences.Add(experience);

            foreach (var (language, title, description) in translations)
            {
                db.ExperienceTranslations.Add(new ExperienceTranslation
                {
                    ExperienceId = experience.Id,
                    Language = language,
                    Title = title,
                    Description = description,
                    UpdatedAtUtc = BaseTime,
                });
            }

            if (spokenLanguages is not null)
            {
                foreach (var language in spokenLanguages)
                {
                    db.ExperienceSpokenLanguages.Add(new ExperienceSpokenLanguage
                    {
                        ExperienceId = experience.Id,
                        Language = language,
                    });
                }
            }

            if (tags is not null)
            {
                foreach (var (normalized, display) in tags)
                {
                    db.ExperienceTags.Add(new ExperienceTag
                    {
                        ExperienceId = experience.Id,
                        NormalizedTag = normalized,
                        DisplayTag = display,
                    });
                }
            }

            await db.SaveChangesAsync();

            return experience.Slug!;
        });

    // -----------------------------------------------------------------------
    // Yardımcılar — SQL komut sayacı
    // -----------------------------------------------------------------------

    private static async Task<int> CountCommandsAsync(Func<Task> action)
    {
        using var counter = SqlCommandCounter.Start();

        await action();

        return counter.Count;
    }

    /// <summary>
    /// EF Core'un DiagnosticSource olaylarından koşan SQL komutlarını sayar.
    ///
    /// <para>Koleksiyondaki tüm test sınıfları TEK süreçte ve SIRAYLA koşuyor
    /// (<see cref="ApiCollection"/>), yani ölçüm sırasında başka bir testin sorgusu
    /// araya girmiyor.</para>
    /// </summary>
    private sealed class SqlCommandCounter : IDisposable
    {
        private const string ListenerName = "Microsoft.EntityFrameworkCore";
        private const string CommandExecuted = "Microsoft.EntityFrameworkCore.Database.Command.CommandExecuted";

        private readonly List<IDisposable> subscriptions = [];
        private int count;

        private SqlCommandCounter()
        {
        }

        internal int Count => Volatile.Read(ref count);

        internal static SqlCommandCounter Start()
        {
            var counter = new SqlCommandCounter();

            counter.subscriptions.Add(DiagnosticListener.AllListeners.Subscribe(
                new Observer<DiagnosticListener>(listener =>
                {
                    if (!string.Equals(listener.Name, ListenerName, StringComparison.Ordinal))
                    {
                        return;
                    }

                    counter.subscriptions.Add(listener.Subscribe(
                        new Observer<KeyValuePair<string, object?>>(item =>
                        {
                            if (string.Equals(item.Key, CommandExecuted, StringComparison.Ordinal))
                            {
                                Interlocked.Increment(ref counter.count);
                            }
                        })));
                })));

            return counter;
        }

        public void Dispose()
        {
            foreach (var subscription in subscriptions)
            {
                subscription.Dispose();
            }

            subscriptions.Clear();
        }

        private sealed class Observer<T>(Action<T> onNext) : IObserver<T>
        {
            public void OnCompleted()
            {
            }

            public void OnError(Exception error)
            {
            }

            public void OnNext(T value) => onNext(value);
        }
    }
}
