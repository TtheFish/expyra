using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Common;
using Expyra.Domain.Experiences;
using Expyra.Domain.Media;
using Expyra.Domain.Pricing;
using Expyra.Domain.Scheduling;
using Expyra.Domain.Users;
using Expyra.Infrastructure.Storage;

namespace Expyra.Infrastructure.Persistence.Seed;

/// <summary>
/// Geliştirme için demo hesaplar ve ilanlar (docs/DEMO.md). Referans veriden
/// (<see cref="ReferenceDataSeeder"/>) SONRA koşar: şehir, kategori ve kur ister.
///
/// <para><b>İdempotent, e-posta ve slug ile.</b> Hesap varsa yeniden yazılmıyor,
/// ilan slug'ı varsa atlanıyor — ikinci koşu 0 satır. Host'un demo ilanda yaptığı
/// düzenlemeler bu yüzden korunuyor; sıfırlamak için satırı silip yeniden koş.</para>
///
/// <para><b>Görseller depoya imzalı yükleme yoluyla yazılıyor</b> — yani
/// <c>FileSystemObjectStorage</c>'ın kendi kapısından, doğrudan diske değil.
/// Depo bir gün S3 olursa bu seeder de aynı arayüzle çalışır (yalnız
/// <see cref="ILocalUploadSink"/> yerine gerçek PUT gerekir).</para>
///
/// <para><b>Yayın kapısı ATLANMIYOR:</b> ilan Published yazılmadan önce
/// <see cref="ExperiencePublishRules"/>'un dört koşulu burada da sağlanıyor
/// (başlık, şehir, kategori, kapak, fiyat). Yalnız seansları takvim kuralı
/// yerine doğrudan üretiyoruz; kural şablonu host panelinden eklenebilir.</para>
/// </summary>
public static class DemoDataSeeder
{
    public const string HostAyse = "host.ayse@expyra.dev";
    public const string HostTuna = "host.tuna@expyra.dev";
    public const string Guest = "misafir@expyra.dev";

    private const string Turkey = "TR";

    public static async Task<DemoSeedResult> SeedAsync(
        AppDbContext dbContext,
        IObjectStorage storage,
        ILocalUploadSink sink,
        IDateTimeProvider clock,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentNullException.ThrowIfNull(storage);
        ArgumentNullException.ThrowIfNull(sink);
        ArgumentNullException.ThrowIfNull(clock);

        var now = clock.UtcNow;

        var ayse = await EnsureUserAsync(dbContext, HostAyse, "Ayşe Demir", "tr", host: true, now, cancellationToken)
            .ConfigureAwait(false);
        var tuna = await EnsureUserAsync(dbContext, HostTuna, "Tuna", "tr", host: true, now, cancellationToken)
            .ConfigureAwait(false);
        await EnsureUserAsync(dbContext, Guest, "Deniz Misafir", "en", host: false, now, cancellationToken)
            .ConfigureAwait(false);

        await EnsureProfileAsync(
            dbContext, ayse.Id, "İstanbul'da yerel rehber ve yemek yazarı",
            "On yıldır Kadıköy'ün ara sokaklarında yemek yürüyüşleri yapıyorum. Tarihi lezzetleri ve yeni açılan yerleri birlikte gezeriz.",
            now, cancellationToken).ConfigureAwait(false);
        await EnsureProfileAsync(
            dbContext, tuna.Id, "Ege ve Kapadokya'da doğa rehberi",
            "Dağcılık ve fotoğraf tutkunuyum. Kalabalıktan uzak rotalar ve gün doğumu yürüyüşleri benim işim.",
            now, cancellationToken).ConfigureAwait(false);

        var result = new DemoSeedResult();

        foreach (var spec in Specs(ayse.Id, tuna.Id))
        {
            var created = await EnsureExperienceAsync(dbContext, storage, sink, spec, now, cancellationToken)
                .ConfigureAwait(false);

            if (created)
            {
                result.Experiences++;
            }
        }

        result.ChangedRows = await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return result;
    }

    // -------------------------------------------------------------------------

    private static async Task<User> EnsureUserAsync(
        AppDbContext dbContext,
        string email,
        string displayName,
        string preferredLanguage,
        bool host,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var normalized = EmailAddress.Normalize(email);

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.NormalizedEmail == normalized, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            user = new User
            {
                Email = email,
                NormalizedEmail = normalized,
                DisplayName = displayName,
                PreferredLanguage = preferredLanguage,
                EmailVerifiedAtUtc = now,
            };

            dbContext.Users.Add(user);
        }

        if (host && !user.HasRole(UserRole.Host))
        {
            user.Roles.Add(UserRole.Host);
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return user;
    }

    private static async Task EnsureProfileAsync(
        AppDbContext dbContext,
        Guid userId,
        string headline,
        string bio,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.HostProfiles
            .AnyAsync(x => x.UserId == userId, cancellationToken)
            .ConfigureAwait(false);

        if (exists)
        {
            return;
        }

        dbContext.HostProfiles.Add(new HostProfile
        {
            UserId = userId,
            Headline = headline,
            Bio = bio,
            Language = "tr",
            UpdatedAtUtc = now,
        });
    }

    private static async Task<bool> EnsureExperienceAsync(
        AppDbContext dbContext,
        IObjectStorage storage,
        ILocalUploadSink sink,
        DemoExperience spec,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.Experiences
            .AnyAsync(x => x.Slug == spec.Slug, cancellationToken)
            .ConfigureAwait(false);

        if (exists)
        {
            return false;
        }

        var city = await dbContext.Cities
            .AsNoTracking()
            .FirstAsync(x => x.CountryCode == Turkey && x.Slug == spec.CitySlug, cancellationToken)
            .ConfigureAwait(false);

        var experience = new Experience
        {
            HostId = spec.HostId,
            CityId = city.Id,
            TimeZoneId = city.TimeZoneId,
            CategorySlug = spec.Category,
            DurationMinutes = spec.DurationMinutes,
            Capacity = spec.Capacity,
            OriginalLanguage = "tr",
            Status = ExperienceStatus.Published,
            Slug = spec.Slug,
            PublishedAtUtc = now.AddDays(-spec.PublishedDaysAgo),
            MinimumAge = spec.MinimumAge,
            ActivityLevel = spec.ActivityLevel,
            MeetingAddress = spec.MeetingAddress,
            MeetingLatitude = spec.Meeting?.Lat,
            MeetingLongitude = spec.Meeting?.Lng,
        };

        dbContext.Experiences.Add(experience);

        dbContext.ExperienceTranslations.Add(new ExperienceTranslation
        {
            ExperienceId = experience.Id,
            Language = "tr",
            Title = spec.TitleTr,
            Description = spec.DescriptionTr,
            WhatToBring = spec.WhatToBringTr,
            NotIncluded = spec.NotIncludedTr,
            MeetingInstructions = spec.MeetingInstructionsTr,
            UpdatedAtUtc = now,
        });

        dbContext.ExperienceTranslations.Add(new ExperienceTranslation
        {
            ExperienceId = experience.Id,
            Language = "en",
            Title = spec.TitleEn,
            Description = spec.DescriptionEn,
            WhatToBring = spec.WhatToBringEn,
            NotIncluded = spec.NotIncludedEn,
            MeetingInstructions = spec.MeetingInstructionsEn,
            UpdatedAtUtc = now,
        });

        foreach (var language in spec.SpokenLanguages)
        {
            dbContext.ExperienceSpokenLanguages.Add(new ExperienceSpokenLanguage
            {
                ExperienceId = experience.Id,
                Language = language,
            });
        }

        foreach (var tag in spec.Tags)
        {
            dbContext.ExperienceTags.Add(new ExperienceTag
            {
                ExperienceId = experience.Id,
                NormalizedTag = SearchText.Fold(tag),
                DisplayTag = tag,
            });
        }

        for (var index = 0; index < spec.ItineraryTr.Count; index++)
        {
            dbContext.ExperienceItinerarySteps.Add(new ExperienceItineraryStep
            {
                ExperienceId = experience.Id,
                Language = "tr",
                SortOrder = index,
                Title = spec.ItineraryTr[index].Title,
                Body = spec.ItineraryTr[index].Body,
            });
        }

        for (var index = 0; index < spec.ItineraryEn.Count; index++)
        {
            dbContext.ExperienceItinerarySteps.Add(new ExperienceItineraryStep
            {
                ExperienceId = experience.Id,
                Language = "en",
                SortOrder = index,
                Title = spec.ItineraryEn[index].Title,
                Body = spec.ItineraryEn[index].Body,
            });
        }

        // Görseller: kapak + bir tane daha. Renkler slug'dan türetiliyor ki her
        // ilan ayırt edilsin.
        for (var index = 0; index < 2; index++)
        {
            await AddImageAsync(dbContext, storage, sink, experience.Id, spec.Palette, index, cancellationToken)
                .ConfigureAwait(false);
        }

        var price = new ExperiencePrice { ExperienceId = experience.Id, CurrencyCode = spec.Currency };
        dbContext.ExperiencePrices.Add(price);
        dbContext.PriceRules.Add(new PriceRule
        {
            ExperiencePriceId = price.Id,
            GuestType = GuestType.Adult,
            UnitPrice = new Money(spec.AdultMinor, spec.Currency),
        });
        dbContext.PriceRules.Add(new PriceRule
        {
            ExperiencePriceId = price.Id,
            GuestType = GuestType.Child,
            UnitPrice = new Money(spec.AdultMinor / 2, spec.Currency),
        });

        // Seanslar: önümüzdeki 14 gün, iki günde bir, yerel 10:00 ve 15:00. Sonuncu
        // seans "son 2 yer" — kalan yer çipi bir ilanda hemen görülsün.
        var zone = TimeZoneInfo.FindSystemTimeZoneById(city.TimeZoneId);
        var startDay = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, zone).DateTime).AddDays(1);
        var slotIndex = 0;

        for (var day = 0; day < 14; day += 2)
        {
            foreach (var hour in spec.SlotHours)
            {
                var local = startDay.AddDays(day).ToDateTime(new TimeOnly(hour, 0), DateTimeKind.Unspecified);
                var offset = zone.GetUtcOffset(local);
                var utc = new DateTimeOffset(local, offset).ToUniversalTime();
                var remaining = slotIndex == 0 ? 2 : spec.Capacity;

                dbContext.AvailabilitySlots.Add(new AvailabilitySlot
                {
                    ExperienceId = experience.Id,
                    StartsAtUtc = utc,
                    StartsAtLocal = local,
                    UtcOffsetMinutes = (short)offset.TotalMinutes,
                    DurationMinutes = spec.DurationMinutes,
                    Capacity = spec.Capacity,
                    RemainingCapacity = remaining,
                });

                slotIndex++;
            }
        }

        experience.ScheduleGeneratedThroughLocal = startDay.AddDays(13);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static async Task AddImageAsync(
        AppDbContext dbContext,
        IObjectStorage storage,
        ILocalUploadSink sink,
        Guid experienceId,
        ((byte, byte, byte) Top, (byte, byte, byte) Bottom) palette,
        int index,
        CancellationToken cancellationToken)
    {
        var bytes = index == 0
            ? DemoImage.Png(1200, 900, palette.Top, palette.Bottom)
            : DemoImage.Png(1200, 900, palette.Bottom, palette.Top);

        var mediaId = Guid.CreateVersion7();
        var key = MediaRules.ExperienceKey(experienceId, mediaId, MediaRules.ExtensionOfContentType("image/png"));

        var upload = await storage
            .CreateUploadAsync(
                new PresignedUploadRequest(key, "image/png", bytes.Length, TimeSpan.FromMinutes(5)),
                cancellationToken)
            .ConfigureAwait(false);

        var token = System.Web.HttpUtility.ParseQueryString(upload.Url.Query)["token"];

        using var body = new MemoryStream(bytes);
        var accepted = await sink.AcceptAsync(token, "image/png", body, cancellationToken).ConfigureAwait(false);

        if (accepted != LocalUploadResult.Accepted)
        {
            throw new InvalidOperationException(
                string.Create(CultureInfo.InvariantCulture, $"Demo görsel depoya yazılamadı: {accepted}."));
        }

        dbContext.ExperienceMedia.Add(new ExperienceMedia
        {
            Id = mediaId,
            ExperienceId = experienceId,
            StorageKey = key,
            ContentType = "image/png",
            ByteSize = bytes.Length,
            Width = 1200,
            Height = 900,
            SortOrder = index,
            IsCover = index == 0,
            Status = MediaStatus.Active,
        });
    }

    // -------------------------------------------------------------------------

    private static IEnumerable<DemoExperience> Specs(Guid ayse, Guid tuna)
    {
        yield return new DemoExperience(
            HostId: ayse,
            Slug: "demo-kadikoy-lezzet-yuruyusu",
            CitySlug: "istanbul",
            Category: "food-drink",
            TitleTr: "Kadıköy lezzet yürüyüşü",
            TitleEn: "Kadıköy food walk",
            DescriptionTr: "Çarşıdan Moda'ya üç saatlik bir tat turu: tarihi bir börekçi, bir turşucu, bir kahveci ve mahallenin en iyi tatlıcısı. Küçük grup, bol sohbet.",
            DescriptionEn: "A three-hour tasting walk from the market to Moda: a historic börek shop, a pickle maker, a coffee roaster and the neighbourhood's best pastry chef. Small group, lots of talk.",
            DurationMinutes: 180,
            Capacity: 8,
            SpokenLanguages: ["tr", "en"],
            Tags: ["sokak lezzetleri", "yürüyüş", "küçük grup"],
            MinimumAge: 12,
            ActivityLevel: ActivityLevel.Light,
            MeetingAddress: "Kadıköy Boğa Heykeli, Altıyol",
            Meeting: (40.9905, 29.0294),
            MeetingInstructionsTr: "Boğa heykelinin önünde, elimde turuncu bir çanta olacak.",
            MeetingInstructionsEn: "In front of the bull statue; I'll carry an orange bag.",
            WhatToBringTr: "Aç bir mide ve yürüyüş ayakkabısı.",
            WhatToBringEn: "An empty stomach and walking shoes.",
            NotIncludedTr: "İçecekler (isteğe bağlı).",
            NotIncludedEn: "Drinks (optional).",
            ItineraryTr:
            [
                ("Altıyol'da buluşma", "Kısa tanışma ve tur planı."),
                ("Tarihi Çarşı", "Börek, peynir ve zeytin tadımı."),
                ("Moda sahili", "Kahve molası, deniz kenarında yürüyüş."),
                ("Tatlıcı", "Turun kapanışı: fırın sütlaç."),
            ],
            ItineraryEn:
            [
                ("Meet at Altıyol", "Short intro and the plan."),
                ("Historic market", "Börek, cheese and olive tasting."),
                ("Moda seafront", "Coffee break, a walk by the sea."),
                ("Pastry shop", "Closing with baked rice pudding."),
            ],
            Currency: "TRY",
            AdultMinor: 150_000,
            SlotHours: [10, 15],
            PublishedDaysAgo: 12,
            Palette: ((214, 96, 54), (250, 200, 120)));

        yield return new DemoExperience(
            HostId: ayse,
            Slug: "demo-balat-fotograf-yuruyusu",
            CitySlug: "istanbul",
            Category: "photography",
            TitleTr: "Balat'ta sabah fotoğraf yürüyüşü",
            TitleEn: "Morning photo walk in Balat",
            DescriptionTr: "Renkli evler, dar sokaklar ve sabah ışığı. Telefonla da gelebilirsin; kompozisyon ve ışık üstüne konuşuruz.",
            DescriptionEn: "Colourful houses, narrow streets and morning light. Phone cameras welcome; we talk composition and light.",
            DurationMinutes: 150,
            Capacity: 6,
            SpokenLanguages: ["tr", "en"],
            Tags: ["fotoğraf", "sabah", "mimari"],
            MinimumAge: null,
            ActivityLevel: ActivityLevel.Moderate,
            MeetingAddress: "Balat İskelesi",
            Meeting: (41.0296, 28.9497),
            MeetingInstructionsTr: "İskele çıkışı, saat kulesinin altı.",
            MeetingInstructionsEn: "Ferry pier exit, under the clock.",
            WhatToBringTr: "Fotoğraf makinesi ya da telefon, dolu pil.",
            WhatToBringEn: "A camera or phone, charged.",
            NotIncludedTr: null,
            NotIncludedEn: null,
            ItineraryTr:
            [
                ("İskelede buluşma", null),
                ("Renkli sokaklar", "Kiremit Caddesi ve merdivenler."),
                ("Kahve ve geri bildirim", "Çektiklerimize birlikte bakarız."),
            ],
            ItineraryEn:
            [
                ("Meet at the pier", null),
                ("The colourful streets", "Kiremit Street and the stairs."),
                ("Coffee and feedback", "We look at the shots together."),
            ],
            Currency: "TRY",
            AdultMinor: 120_000,
            SlotHours: [8],
            PublishedDaysAgo: 5,
            Palette: ((60, 110, 180), (240, 180, 90)));

        yield return new DemoExperience(
            HostId: ayse,
            Slug: "demo-bogaz-gunbatimi-tekne",
            CitySlug: "istanbul",
            Category: "water-sea",
            TitleTr: "Boğaz'da gün batımı tekne turu",
            TitleEn: "Bosphorus sunset boat tour",
            DescriptionTr: "Küçük bir tekneyle Beşiktaş'tan Rumeli Hisarı'na. Çay, simit ve gün batımı.",
            DescriptionEn: "A small boat from Beşiktaş to Rumeli Fortress. Tea, simit and the sunset.",
            DurationMinutes: 120,
            Capacity: 10,
            SpokenLanguages: ["tr", "en", "de"],
            Tags: ["tekne", "gün batımı"],
            MinimumAge: 6,
            ActivityLevel: ActivityLevel.Light,
            MeetingAddress: "Beşiktaş Barbaros Hayrettin Paşa İskelesi",
            Meeting: (41.0416, 29.0079),
            MeetingInstructionsTr: "İskelenin sağındaki küçük tekne rıhtımı.",
            MeetingInstructionsEn: "The small boat dock to the right of the ferry pier.",
            WhatToBringTr: "Rüzgarlık; akşam serin olur.",
            WhatToBringEn: "A windbreaker; evenings get cool.",
            NotIncludedTr: "Alkollü içecek.",
            NotIncludedEn: "Alcoholic drinks.",
            ItineraryTr:
            [
                ("Beşiktaş'tan hareket", null),
                ("Ortaköy ve köprü altı", "Fotoğraf molası."),
                ("Rumeli Hisarı önünde gün batımı", "Çay ve simit."),
                ("Dönüş", null),
            ],
            ItineraryEn:
            [
                ("Departure from Beşiktaş", null),
                ("Ortaköy and under the bridge", "Photo stop."),
                ("Sunset off Rumeli Fortress", "Tea and simit."),
                ("Return", null),
            ],
            Currency: "EUR",
            AdultMinor: 3_500,
            SlotHours: [18],
            PublishedDaysAgo: 20,
            Palette: ((20, 40, 90), (250, 140, 80)));

        yield return new DemoExperience(
            HostId: tuna,
            Slug: "demo-kemeralti-kahvalti-turu",
            CitySlug: "izmir",
            Category: "local-life",
            TitleTr: "Kemeraltı'nda serpme kahvaltı ve çarşı turu",
            TitleEn: "Kemeraltı breakfast and bazaar walk",
            DescriptionTr: "Boyoz, gevrek ve İzmir'in çarşı sabahı. Sonra Kızlarağası Hanı'nda Türk kahvesi.",
            DescriptionEn: "Boyoz, gevrek and the bazaar's morning rhythm. Then Turkish coffee at Kızlarağası Inn.",
            DurationMinutes: 150,
            Capacity: 8,
            SpokenLanguages: ["tr", "en"],
            Tags: ["kahvaltı", "çarşı"],
            MinimumAge: null,
            ActivityLevel: ActivityLevel.Light,
            MeetingAddress: "Konak Saat Kulesi",
            Meeting: (38.4189, 27.1287),
            MeetingInstructionsTr: "Saat kulesinin deniz tarafı.",
            MeetingInstructionsEn: "Sea side of the clock tower.",
            WhatToBringTr: null,
            WhatToBringEn: null,
            NotIncludedTr: null,
            NotIncludedEn: null,
            ItineraryTr:
            [
                ("Saat Kulesi'nde buluşma", null),
                ("Boyoz ve gevrek", "Çarşının girişinde ayaküstü."),
                ("Kızlarağası Hanı", "Kahve ve sohbet."),
            ],
            ItineraryEn:
            [
                ("Meet at the clock tower", null),
                ("Boyoz and gevrek", "Standing, at the bazaar entrance."),
                ("Kızlarağası Inn", "Coffee and conversation."),
            ],
            Currency: "TRY",
            AdultMinor: 90_000,
            SlotHours: [9],
            PublishedDaysAgo: 3,
            Palette: ((40, 140, 120), (240, 220, 140)));

        yield return new DemoExperience(
            HostId: tuna,
            Slug: "demo-goreme-gun-dogumu-yuruyusu",
            CitySlug: "goreme",
            Category: "nature-outdoors",
            TitleTr: "Göreme'de gün doğumu vadi yürüyüşü",
            TitleEn: "Sunrise valley hike in Göreme",
            DescriptionTr: "Balonlar havalanırken Kızılçukur'dan Güllüdere'ye. Orta zorlukta, yaklaşık 7 km.",
            DescriptionEn: "From Red Valley to Rose Valley while the balloons rise. Moderate, about 7 km.",
            DurationMinutes: 240,
            Capacity: 8,
            SpokenLanguages: ["tr", "en"],
            Tags: ["yürüyüş", "gün doğumu", "balon"],
            MinimumAge: 14,
            ActivityLevel: ActivityLevel.Strenuous,
            MeetingAddress: "Göreme Otogarı",
            Meeting: (38.6431, 34.8289),
            MeetingInstructionsTr: "Otogarın önünde, minibüsle alıyorum.",
            MeetingInstructionsEn: "In front of the bus station; I pick you up with a minibus.",
            WhatToBringTr: "Bot, kat kat giysi, 1 litre su.",
            WhatToBringEn: "Boots, layers, a litre of water.",
            NotIncludedTr: "Kahvaltı (dönüşte tavsiye ederim).",
            NotIncludedEn: "Breakfast (I recommend a place afterwards).",
            ItineraryTr:
            [
                ("Otogarda buluşma", "Minibüsle vadi girişine 10 dk."),
                ("Kızılçukur", "Gün doğumu ve balonlar."),
                ("Güllüdere", "Kaya kiliseleri."),
                ("Çavuşin", "Yürüyüşün bitişi, köye dönüş."),
            ],
            ItineraryEn:
            [
                ("Meet at the bus station", "10 minutes by minibus to the trailhead."),
                ("Red Valley", "Sunrise and balloons."),
                ("Rose Valley", "Rock churches."),
                ("Çavuşin", "End of the hike, back to the village."),
            ],
            Currency: "EUR",
            AdultMinor: 4_500,
            SlotHours: [5],
            PublishedDaysAgo: 8,
            Palette: ((120, 60, 40), (250, 190, 130)));
    }

    private sealed record DemoExperience(
        Guid HostId,
        string Slug,
        string CitySlug,
        string Category,
        string TitleTr,
        string TitleEn,
        string DescriptionTr,
        string DescriptionEn,
        int DurationMinutes,
        int Capacity,
        IReadOnlyList<string> SpokenLanguages,
        IReadOnlyList<string> Tags,
        int? MinimumAge,
        ActivityLevel ActivityLevel,
        string MeetingAddress,
        (double Lat, double Lng)? Meeting,
        string MeetingInstructionsTr,
        string MeetingInstructionsEn,
        string? WhatToBringTr,
        string? WhatToBringEn,
        string? NotIncludedTr,
        string? NotIncludedEn,
        IReadOnlyList<(string Title, string? Body)> ItineraryTr,
        IReadOnlyList<(string Title, string? Body)> ItineraryEn,
        string Currency,
        long AdultMinor,
        IReadOnlyList<int> SlotHours,
        int PublishedDaysAgo,
        ((byte, byte, byte) Top, (byte, byte, byte) Bottom) Palette);
}

public sealed class DemoSeedResult
{
    public int Experiences { get; set; }

    public int ChangedRows { get; set; }
}
