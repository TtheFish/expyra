using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Queries.GetAvailability;
using Expyra.Application.Features.Experiences.Queries.GetQuote;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Application.Features.Scheduling;
using Expyra.Domain.Pricing;
using Expyra.Domain.Scheduling;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Scheduling;

/// <summary>
/// PLAN Blok 7 kabul kriterleri 3, 4 ve 5 — misafir tarafı.
///
/// <para>Kurulum HTTP üzerinden: host gerçekten giriş yapıyor, ilanı gerçekten
/// yayınlıyor, takvimi ve fiyatı gerçek uçlardan giriyor. Satırları doğrudan
/// veritabanına yazmak daha hızlı olurdu ama o zaman test, misafir ucunun
/// <b>host'un yazdığını</b> okuduğunu değil, kendi yazdığını okuduğunu
/// doğrulardı.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class GuestAvailabilityTests(ApiFactory factory)
{
    private const string HostPath = "/api/host/experiences";
    private const string GuestPath = "/api/experiences";
    private const string ActivatePath = "/api/host/activate";

    /// <summary>
    /// Bu dosyaya AYRILMIŞ şehir. Testler veritabanını paylaşıyor ve liste testlerinin
    /// çoğu "bu şehirde tek ilan var" diyor; başka bir dosyanın kullandığı bir şehre
    /// ilan yayınlamak onları kırardı — bir kez kırdı da.
    ///
    /// <para>Saat dilimi Europe/Warsaw ve bu yeterli: yaz saati davranışını ölçen yer
    /// <c>HostScheduleTests</c>; burada saat diliminin tek işi "sunucununki değil,
    /// deneyiminki" olduğunu göstermek.</para>
    /// </summary>
    private const string City = "wroclaw";

    private const string Zone = "Europe/Warsaw";

    private static readonly TimeZoneInfo CityZone = TimeZoneInfo.FindSystemTimeZoneById(Zone);

    // -----------------------------------------------------------------------
    // Kabul kriteri 4 — geçmiş seans misafire dönmez
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Musaitlik_AcikSeanslariDonuyor()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await CreateRecurrenceAsync(client, listing, DayOfWeek.Tuesday, "14:00");

        var response = await client.GetAsync($"{GuestPath}/{listing.Slug}/availability");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var availability = (await response.Content.ReadFromJsonAsync<GuestAvailabilityResponse>(AuthApi.Json))!;

        availability.TimeZoneId.ShouldBe(Zone);
        availability.Slots.ShouldNotBeEmpty();
        availability.Slots.ShouldAllBe(x => x.StartsAtLocal.EndsWith("T14:00", StringComparison.Ordinal));

        // Pencere varsayılan 30 gün: dört-beş salı.
        availability.Slots.Count.ShouldBeInRange(4, 5);

        // Süre yanıtta hesaplanmış: istemcinin aynı toplamayı üç ekranda tekrarlaması,
        // birinde unutulması demekti.
        var first = availability.Slots[0];
        (first.EndsAtUtc - first.StartsAtUtc).ShouldBe(TimeSpan.FromMinutes(first.DurationMinutes));
    }

    [Fact]
    public async Task Musaitlik_GECMIS_SeansiDONDURMUYOR()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        // Geçmiş seans DOĞRUDAN veritabanına yazılıyor: host ucu onu kabul etmiyor
        // (ve etmemeli) ama eski bir kayıt olarak tabloda duruyor olabilir. Kriter 4'ün
        // koruduğu şey tam olarak bu satırın misafire sızmaması.
        var past = await InsertSlotAsync(listing.Id, DateTime.UtcNow.AddDays(-3));
        var future = await InsertSlotAsync(listing.Id, DateTime.UtcNow.AddDays(3));

        var availability = await AvailabilityAsync(
            client, listing.Slug, from: DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-10));

        availability.Slots.ShouldNotContain(x => x.SlotId == past);
        availability.Slots.ShouldContain(x => x.SlotId == future);

        // Pencerenin başı da bugüne kırpılmış: istemci ne istediğini değil ne aldığını
        // görmeli.
        availability.From.ShouldBe(TodayInCity().ToString("yyyy-MM-dd"));
    }

    [Fact]
    public async Task Musaitlik_KapaliVeDoluSeansiDONDURMUYOR()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await CreateRecurrenceAsync(client, listing, DayOfWeek.Wednesday, "10:00");

        var slots = await SlotRowsAsync(listing.Id);
        var closed = slots[0];
        var full = slots[1];

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{HostPath}/{listing.Id}/slots/{closed.Id}", listing.Token,
            new { status = "closed" });

        // Yeri kalmamış seans: kapasite yazma Blok 9'un işi, burada satırı doğrudan
        // kuruyoruz — misafir ucunun onu ELEDİĞİNİ ölçmek için.
        await SetRemainingAsync(full.Id, 0);

        var availability = await AvailabilityAsync(client, listing.Slug);

        availability.Slots.ShouldNotContain(x => x.SlotId == closed.Id);
        availability.Slots.ShouldNotContain(x => x.SlotId == full.Id);
        availability.Slots.ShouldNotBeEmpty();

        // Toplam kapasite yanıtta YOK: kaç kişinin aldığını ele verirdi.
        availability.Slots.ShouldAllBe(x => x.RemainingCapacity > 0);
    }

    [Fact]
    public async Task Musaitlik_YayindaOlmayanIlan_404()
    {
        var client = factory.CreateClient();
        var draft = await DraftListingAsync(client);

        (await client.GetAsync($"{GuestPath}/{draft.Slug}/availability"))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await client.GetAsync($"{GuestPath}/yok-boyle-bir-slug/availability"))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Musaitlik_CokGenisPencere_400()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        var from = TodayInCity();
        var to = from.AddDays(ScheduleRules.MaxWindowDays + 1);

        var response = await client.GetAsync(
            $"{GuestPath}/{listing.Slug}/availability?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // -----------------------------------------------------------------------
    // Kabul kriteri 3 — çevrim gösterim, tahsilat host'un para biriminde
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Musaitlik_FiyatTahsilatParaBiriminde()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000), (GuestType.Child, 45_000));

        var availability = await AvailabilityAsync(client, listing.Slug);
        var pricing = availability.Pricing.ShouldNotBeNull();

        pricing.ChargeCurrency.ShouldBe("CZK");
        pricing.ChargeMinorUnits.ShouldBe(2);
        pricing.FromAmountMinor.ShouldBe(90_000);

        // Çevrim istenmedi: sahte bir 1.0 oranı üretmek "çevrildi mi" sorusunu
        // cevaplanamaz yapardı.
        pricing.Display.ShouldBeNull();
        pricing.Rules.ShouldAllBe(x => x.DisplayUnitAmountMinor == null);
    }

    [Fact]
    public async Task Musaitlik_CevrilenTutarAYRI_TahsilatDEGISMIYOR()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));

        var availability = await AvailabilityAsync(client, listing.Slug, currency: "EUR");
        var pricing = availability.Pricing.ShouldNotBeNull();

        // Tahsilat DOKUNULMAMIŞ — kriter 3'ün özü. Çevrilen sayı ayrı alanda duruyor
        // ve bu ayrım tip düzeyinde korunuyor (Quote.Charge / Quote.Display).
        pricing.ChargeCurrency.ShouldBe("CZK");
        pricing.FromAmountMinor.ShouldBe(90_000);

        var display = pricing.Display.ShouldNotBeNull();
        display.Currency.ShouldBe("EUR");
        display.MinorUnits.ShouldBe(2);

        // 900 CZK ≈ 35 EUR: kesin sayı seed kuruna bağlı, ama büyüklük mertebesi
        // sabit. Oranların hepsi 1.0 olsaydı burası 90.000 çıkar ve çevrimin hiç
        // yapılmadığı görünürdü.
        display.FromAmountMinor.ShouldBeInRange(2_000, 6_000);

        // Kullanılan anlık görüntü yanıtta: Blok 9 rezervasyona bunu yazacak.
        display.RateSnapshotId.ShouldNotBe(Guid.Empty);
        display.CapturedAtUtc.ShouldBeLessThan(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task Musaitlik_AyniParaBirimiIstenirse_CevrimYOK()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));

        var availability = await AvailabilityAsync(client, listing.Slug, currency: "czk");

        // Küçük harf de normalleşiyor ve aynı para birimine çevrim yapılmıyor: 1.0
        // oranlı bir blok, arayüzde iki kez aynı sayıyı göstermek olurdu.
        availability.Pricing!.Display.ShouldBeNull();
    }

    [Fact]
    public async Task Musaitlik_TaninmayanParaBirimi_400()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));

        (await client.GetAsync($"{GuestPath}/{listing.Slug}/availability?currency=XXZ"))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Musaitlik_FiyatGirilmemisse_PricingNULL()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await CreateRecurrenceAsync(client, listing, DayOfWeek.Thursday, "09:00");
        await StripPricingAsync(listing.Id);

        var availability = await AvailabilityAsync(client, listing.Slug);

        // Fiyatsız YAYINDA bir ilan artık API'den üretilemiyor — fiyat Blok 7'de
        // yayın koşulu oldu. Ama kuraldan ÖNCE yayınlanmış satırlar fiyatsız duruyor
        // ve misafir ucu onları çizebilmeli; satır bu yüzden doğrudan siliniyor.
        // Kapak koşulunun geriye dönük uygulanamamasıyla aynı durum.
        availability.Pricing.ShouldBeNull();
        availability.Slots.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task Detay_FiyatiTasiyor()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));

        var response = await client.GetAsync($"{GuestPath}/{listing.Slug}?currency=EUR");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var detail = (await response.Content.ReadFromJsonAsync<GuestExperienceDetailResponse>(AuthApi.Json))!;

        detail.Pricing.ShouldNotBeNull().ChargeCurrency.ShouldBe("CZK");
        detail.Pricing.Display.ShouldNotBeNull().Currency.ShouldBe("EUR");
    }

    // -----------------------------------------------------------------------
    // Teklif
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Teklif_KalemleriToplarVeCevirir()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000), (GuestType.Child, 45_000));
        await CreateRecurrenceAsync(client, listing, DayOfWeek.Friday, "11:00");

        var slot = (await SlotRowsAsync(listing.Id))[0];

        var quote = await QuoteAsync(client, listing.Slug, slot.Id, adults: 2, children: 1, currency: "EUR");

        quote.Headcount.ShouldBe(3);
        quote.Seats.ShouldBe(3);
        quote.SlotId.ShouldBe(slot.Id);
        quote.TimeZoneId.ShouldBe(Zone);

        // 2 × 900 + 1 × 450 = 2250 CZK.
        quote.Charge.Currency.ShouldBe("CZK");
        quote.Charge.AmountMinor.ShouldBe(225_000);

        quote.Lines.Count.ShouldBe(2);
        quote.Lines[0].GuestType.ShouldBe("adult");
        quote.Lines[0].LineTotalMinor.ShouldBe(180_000);
        quote.Lines[1].GuestType.ShouldBe("child");
        quote.Lines[1].LineTotalMinor.ShouldBe(45_000);

        // Gösterim AYRI alanda ve tahsilata dokunmuyor (kabul kriteri 3).
        var display = quote.Display.ShouldNotBeNull();
        display.Currency.ShouldBe("EUR");
        display.AmountMinor.ShouldBeInRange(5_000, 15_000);
    }

    [Fact]
    public async Task Teklif_FiyatiOlmayanKademe_409()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        // Yalnız yetişkin fiyatı var.
        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));
        await CreateRecurrenceAsync(client, listing, DayOfWeek.Saturday, "12:00");

        var slot = (await SlotRowsAsync(listing.Id))[0];

        // Sessizce sıfır saymak, bedava bir bilet demek olurdu. 409 çünkü istekte
        // yanlış bir şey yok — host o kademeyi tanımlamamış.
        var response = await QuoteResponseAsync(client, listing.Slug, slot.Id, adults: 1, children: 1);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Teklif_HicKisiSecilmemis_400()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));
        await CreateRecurrenceAsync(client, listing, DayOfWeek.Sunday, "13:00");

        var slot = (await SlotRowsAsync(listing.Id))[0];

        (await QuoteResponseAsync(client, listing.Slug, slot.Id))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Teklif_KapasiteAsiliyorsa_409()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));
        await CreateRecurrenceAsync(client, listing, DayOfWeek.Monday, "15:00");

        var slot = (await SlotRowsAsync(listing.Id))[0];

        // Kapasite 8; dokuz kişi sığmıyor. Bu bir kontrol, bir REZERVASYON değil:
        // koltuk tutulmuyor (kriter 5 — bu blokta kapasite yalnız okunuyor).
        var response = await QuoteResponseAsync(client, listing.Slug, slot.Id, adults: 9);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        (await SlotRowsAsync(listing.Id))
            .Single(x => x.Id == slot.Id).RemainingCapacity.ShouldBe(8);
    }

    [Fact]
    public async Task Teklif_GecmisSeans_409()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(client, listing, "CZK", (GuestType.Adult, 90_000));

        var past = await InsertSlotAsync(listing.Id, DateTime.UtcNow.AddDays(-1));

        (await QuoteResponseAsync(client, listing.Slug, past, adults: 1))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Teklif_BaskaIlaninSeansi_404()
    {
        var client = factory.CreateClient();

        var mine = await PublishedListingAsync(client);
        var other = await PublishedListingAsync(client);

        await SetPricingAsync(client, mine, "CZK", (GuestType.Adult, 90_000));
        await CreateRecurrenceAsync(client, other, DayOfWeek.Tuesday, "16:00");

        var stranger = (await SlotRowsAsync(other.Id))[0];

        // 404: seans kimliğinin varlığını doğrulamak, onları haritalamaya yarardı.
        (await QuoteResponseAsync(client, mine.Slug, stranger.Id, adults: 1))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Teklif_FiyatsizIlan_409()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await CreateRecurrenceAsync(client, listing, DayOfWeek.Wednesday, "17:00");

        // Bkz. Musaitlik_FiyatGirilmemisse_PricingNULL: bu durum artık yalnız
        // kuraldan önce yayınlanmış satırlarda var.
        await StripPricingAsync(listing.Id);

        var slot = (await SlotRowsAsync(listing.Id))[0];

        (await QuoteResponseAsync(client, listing.Slug, slot.Id, adults: 1))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Teklif_BebekKoltukTuketmiyorsa_SeatsFARKLI()
    {
        var client = factory.CreateClient();
        var listing = await PublishedListingAsync(client);

        await SetPricingAsync(
            client, listing, "CZK", (GuestType.Adult, 90_000), (GuestType.Infant, 0));

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{HostPath}/{listing.Id}", listing.Token,
            new { infantCountsTowardCapacity = false });

        await CreateRecurrenceAsync(client, listing, DayOfWeek.Thursday, "18:00");

        var slot = (await SlotRowsAsync(listing.Id))[0];
        var quote = await QuoteAsync(client, listing.Slug, slot.Id, adults: 2, infants: 1);

        // Kucaktaki bebek sayılıyor ama koltuk tüketmiyor: karar host'un, çünkü
        // fiziksel sınırı bilen o.
        quote.Headcount.ShouldBe(3);
        quote.Seats.ShouldBe(2);
        quote.Charge.AmountMinor.ShouldBe(180_000);
    }

    // -----------------------------------------------------------------------
    // Kurulum
    // -----------------------------------------------------------------------

    private sealed record Listing(Guid Id, string Slug, string Token);

    private static DateOnly TodayInCity()
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, CityZone));

    private async Task<Listing> DraftListingAsync(HttpClient client)
    {
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var activated = await MediaApi.SendAsync(
            client, HttpMethod.Post, ActivatePath, tokens.AccessToken);

        var token = (await activated.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json))!.AccessToken;

        var created = await MediaApi.SendAsync(
            client, HttpMethod.Post, HostPath, token, new { originalLanguage = "pl" });

        var draft = (await created.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!;

        var prague = await factory.QueryAsync(db => db.Cities
            .AsNoTracking().Where(x => x.Slug == City).Select(x => x.Id).FirstAsync());

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{HostPath}/{draft.Id}", token,
            new { cityId = prague, categorySlug = "tours-walks", durationMinutes = 120, capacity = 8 });

        await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{HostPath}/{draft.Id}/translations/pl", token,
            new { title = "Wrocławski spacer", description = "Opis." });

        var slug = await factory.QueryAsync(db => db.Experiences
            .AsNoTracking().Where(x => x.Id == draft.Id).Select(x => x.Slug!).FirstAsync());

        return new Listing(draft.Id, slug, token);
    }

    private async Task<Listing> PublishedListingAsync(HttpClient client)
    {
        var listing = await DraftListingAsync(client);

        // Kapak Blok 6'da, fiyat Blok 7'de yayın koşulu oldu.
        //
        // Para birimi CZK: testlerin çoğu fiyatın ÜZERİNE yazıyor ve yayından sonra
        // para birimi KİLİTLİ. Burada EUR yazılsaydı sonraki her SetPricingAsync(CZK)
        // 409 alırdı — kilidin kendisi doğru çalışıyor, kurulum yanlış olurdu.
        await MediaApi.UploadAsync(client, listing.Token, listing.Id);
        await HostApi.SetMinimalPriceAsync(client, listing.Token, listing.Id, "CZK", 90_000);

        var published = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{HostPath}/{listing.Id}/publish", listing.Token);

        published.StatusCode.ShouldBe(HttpStatusCode.OK);

        return listing;
    }

    private static async Task CreateRecurrenceAsync(
        HttpClient client, Listing listing, DayOfWeek day, string time)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{HostPath}/{listing.Id}/recurrences", listing.Token,
            new
            {
                daysOfWeek = new[] { day.ToString().ToLowerInvariant() },
                startTimeLocal = time,
                startsOnLocal = TodayInCity().ToString("yyyy-MM-dd"),
            });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    private static async Task SetPricingAsync(
        HttpClient client,
        Listing listing,
        string currency,
        params (GuestType Tier, long AmountMinor)[] rules)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{HostPath}/{listing.Id}/pricing", listing.Token,
            new
            {
                currency,
                rules = rules
                    .Select(x => new
                    {
                        guestType = x.Tier.ToString().ToLowerInvariant(),
                        unitAmountMinor = x.AmountMinor,
                    })
                    .ToArray(),
            });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    private async Task<GuestAvailabilityResponse> AvailabilityAsync(
        HttpClient client, string slug, DateOnly? from = null, string? currency = null)
    {
        var query = new List<string>(2);

        if (from is { } start) query.Add($"from={start:yyyy-MM-dd}");
        if (currency is not null) query.Add($"currency={currency}");

        var path = $"{GuestPath}/{slug}/availability";
        var response = await client.GetAsync(query.Count == 0 ? path : $"{path}?{string.Join('&', query)}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        _ = factory;

        return (await response.Content.ReadFromJsonAsync<GuestAvailabilityResponse>(AuthApi.Json))!;
    }

    private static async Task<GuestQuoteResponse> QuoteAsync(
        HttpClient client,
        string slug,
        Guid slotId,
        int adults = 0,
        int children = 0,
        int infants = 0,
        string? currency = null)
    {
        var response = await QuoteResponseAsync(client, slug, slotId, adults, children, infants, currency);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<GuestQuoteResponse>(AuthApi.Json))!;
    }

    private static Task<HttpResponseMessage> QuoteResponseAsync(
        HttpClient client,
        string slug,
        Guid slotId,
        int adults = 0,
        int children = 0,
        int infants = 0,
        string? currency = null)
    {
        var query = $"slotId={slotId}&adults={adults}&children={children}&infants={infants}";

        if (currency is not null)
        {
            query += $"&currency={currency}";
        }

        return client.GetAsync($"{GuestPath}/{slug}/quote?{query}");
    }

    /// <summary>
    /// Fiyat satırlarını DOĞRUDAN siler. Fiyat yayın koşulu olduğundan bu durumu
    /// API üretemiyor;  de yayındaki ilanda 409 veriyor (para
    /// birimi kilidinin bypass'ını kapatmak için). Yine de test edilmesi gerekiyor:
    /// kuraldan önce yayınlanmış satırlar fiyatsız duruyor.
    /// </summary>
    private Task<bool> StripPricingAsync(Guid experienceId)
        => factory.QueryAsync(async db =>
        {
            var pages = await db.ExperiencePrices
                .Where(x => x.ExperienceId == experienceId)
                .ToListAsync();

            db.ExperiencePrices.RemoveRange(pages);
            await db.SaveChangesAsync();

            return true;
        });

    private Task<List<AvailabilitySlot>> SlotRowsAsync(Guid experienceId)
        => factory.QueryAsync(db => db.AvailabilitySlots
            .AsNoTracking()
            .Where(x => x.ExperienceId == experienceId)
            .OrderBy(x => x.StartsAtUtc)
            .ToListAsync());

    /// <summary>
    /// Seansı DOĞRUDAN yazar. Host ucu geçmişe seans açmıyor (ve açmamalı) ama eski
    /// bir kayıt tabloda duruyor olabilir; kriter 4'ün koruduğu şey o satır.
    /// </summary>
    private Task<Guid> InsertSlotAsync(Guid experienceId, DateTime startsAtUtc)
        => factory.QueryAsync(async db =>
        {
            var start = new DateTimeOffset(DateTime.SpecifyKind(startsAtUtc, DateTimeKind.Utc));
            var local = TimeZoneInfo.ConvertTime(start, CityZone);

            var slot = new AvailabilitySlot
            {
                Id = Guid.CreateVersion7(),
                ExperienceId = experienceId,
                StartsAtUtc = start,
                StartsAtLocal = local.DateTime,
                UtcOffsetMinutes = (short)local.Offset.TotalMinutes,
                DurationMinutes = 120,
                Capacity = 8,
                RemainingCapacity = 8,
                Status = SlotStatus.Open,
            };

            db.AvailabilitySlots.Add(slot);
            await db.SaveChangesAsync();

            return slot.Id;
        });

    private Task<bool> SetRemainingAsync(Guid slotId, int remaining)
        => factory.QueryAsync(async db =>
        {
            var slot = await db.AvailabilitySlots.SingleAsync(x => x.Id == slotId);
            slot.RemainingCapacity = remaining;
            await db.SaveChangesAsync();

            return true;
        });
}
