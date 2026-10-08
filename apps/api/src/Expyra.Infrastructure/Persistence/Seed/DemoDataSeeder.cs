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
/// <para><b>İstisna — gradyan placeholder görseller:</b> eski seed'in ürettiği
/// PNG gradyanlar, gömülü JPEG'lerle değiştirilir. Host kendi fotoğrafını
/// yüklediyse (<c>image/jpeg</c> / <c>image/webp</c>) dokunulmaz.</para>
///
/// <para><b>Görseller depoya <c>IObjectStorage.PutAsync</c> ile yazılıyor</b> —
/// doğrudan diske değil, yani depo bir gün S3 olursa bu seeder de aynı arayüzle
/// çalışır. İmzalı yükleme yolu kullanılmıyor: o yol yalnız <c>uploads/</c> ön ekine
/// imza veriyor ve repoya gömülü dosya bir kullanıcı yüklemesi değil (issue #50).</para>
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
        IDateTimeProvider clock,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentNullException.ThrowIfNull(storage);
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
            var created = await EnsureExperienceAsync(dbContext, storage, spec, now, cancellationToken)
                .ConfigureAwait(false);

            if (created)
            {
                result.Experiences++;
            }
            else if (await RefreshPlaceholderMediaAsync(dbContext, storage, spec, cancellationToken)
                .ConfigureAwait(false))
            {
                result.MediaRefreshed++;
            }

            // Eski seed yalnız tr+en yazıyordu. Dil değiştirince fallback orijinal
            // dile (tr) düşmesin diye eksik UI dillerini doldur — mevcut satırı ezmez.
            result.TranslationsAdded += await EnsureMissingUiTextsAsync(dbContext, spec, now, cancellationToken)
                .ConfigureAwait(false);
        }

        // Host'un elle açtığı Prag ilanı — demo spec'te yok ama keşfette görünüyor;
        // UI dilleri eksikse doldur (fallback'in tr'de kalmaması için).
        result.TranslationsAdded += await EnsurePragueUiTextsAsync(dbContext, now, cancellationToken)
            .ConfigureAwait(false);

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

        foreach (var (language, text) in spec.UiTexts)
        {
            AddTranslation(dbContext, experience.Id, language, text, now);
            AddItinerary(dbContext, experience.Id, language, text.Itinerary);
        }

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

        // Görseller: kapak + bir galeri karesi (gömülü JPEG, tema uyumlu).
        for (var index = 0; index < spec.Photos.Count; index++)
        {
            await AddImageAsync(dbContext, storage, experience.Id, spec.Photos[index], index, cancellationToken)
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

    /// <summary>
    /// Eski seed'in PNG gradyanlarını gömülü JPEG'lerle değiştirir. Host gerçek
    /// fotoğraf yüklediyse (jpeg/webp) dokunmaz — demo metin düzenlemeleri gibi
    /// host çalışması korunur.
    /// </summary>
    private static async Task<bool> RefreshPlaceholderMediaAsync(
        AppDbContext dbContext,
        IObjectStorage storage,
        DemoExperience spec,
        CancellationToken cancellationToken)
    {
        var experience = await dbContext.Experiences
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == spec.Slug, cancellationToken)
            .ConfigureAwait(false);

        if (experience is null)
        {
            return false;
        }

        var media = await dbContext.ExperienceMedia
            .Where(x => x.ExperienceId == experience.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (media.Count == 0)
        {
            for (var index = 0; index < spec.Photos.Count; index++)
            {
                await AddImageAsync(dbContext, storage, experience.Id, spec.Photos[index], index, cancellationToken)
                    .ConfigureAwait(false);
            }

            return true;
        }

        // Hepsi eski gradyan PNG ise yükselt; karışık / gerçek foto varsa bırak.
        if (media.Any(x => !string.Equals(x.ContentType, "image/png", StringComparison.Ordinal)))
        {
            return false;
        }

        foreach (var item in media)
        {
            await storage.DeleteAsync(item.StorageKey, cancellationToken).ConfigureAwait(false);
            dbContext.ExperienceMedia.Remove(item);
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        for (var index = 0; index < spec.Photos.Count; index++)
        {
            await AddImageAsync(dbContext, storage, experience.Id, spec.Photos[index], index, cancellationToken)
                .ConfigureAwait(false);
        }

        return true;
    }

    private static async Task AddImageAsync(
        AppDbContext dbContext,
        IObjectStorage storage,
        Guid experienceId,
        string photoFileName,
        int index,
        CancellationToken cancellationToken)
    {
        var (bytes, info) = DemoPhoto.Load(photoFileName);
        var extension = MediaRules.ExtensionOf(info.Format);
        var contentType = info.ContentType;

        var mediaId = Guid.CreateVersion7();
        var key = MediaRules.ExperienceKey(experienceId, mediaId, extension);

        // Doğrudan yayın anahtarına: herkese açık anahtara imzalı adres verilmiyor
        // (issue #50) ve repoya gömülü dosya bir kullanıcı yüklemesi değil.
        await storage.PutAsync(key, bytes, contentType, cancellationToken).ConfigureAwait(false);

        dbContext.ExperienceMedia.Add(new ExperienceMedia
        {
            Id = mediaId,
            ExperienceId = experienceId,
            StorageKey = key,
            ContentType = contentType,
            ByteSize = bytes.Length,
            Width = info.Width,
            Height = info.Height,
            SortOrder = index,
            IsCover = index == 0,
            Status = MediaStatus.Active,
        });
    }

    /// <summary>
    /// Eksik UI dili satırlarını ekler (tr/en/cs/de). Host'un yazdığı satırı ezmez —
    /// yalnız dil hiç yoksa yazar. Eski demo seed'ler tr+en ile kaldığı için
    /// <c>pnpm api:seed:demo</c> ikinci kez de çeviri doldurabilir.
    /// </summary>
    private static async Task<int> EnsureMissingUiTextsAsync(
        AppDbContext dbContext,
        DemoExperience spec,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var experience = await dbContext.Experiences
            .FirstOrDefaultAsync(x => x.Slug == spec.Slug, cancellationToken)
            .ConfigureAwait(false);

        if (experience is null)
        {
            return 0;
        }

        var existingLanguages = await dbContext.ExperienceTranslations
            .Where(x => x.ExperienceId == experience.Id)
            .Select(x => x.Language)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var existingItineraryLanguages = await dbContext.ExperienceItinerarySteps
            .Where(x => x.ExperienceId == experience.Id)
            .Select(x => x.Language)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var added = 0;

        foreach (var (language, text) in spec.UiTexts)
        {
            if (!existingLanguages.Contains(language, StringComparer.Ordinal))
            {
                AddTranslation(dbContext, experience.Id, language, text, now);
                added++;
            }

            if (text.Itinerary.Count > 0
                && !existingItineraryLanguages.Contains(language, StringComparer.Ordinal))
            {
                AddItinerary(dbContext, experience.Id, language, text.Itinerary);
                added++;
            }
        }

        return added;
    }

    /// <summary>
    /// Geliştirme DB'sindeki host Prag ilanı (slug değişebilir; title eşleşmesi yok —
    /// bilinen slug öneki). Yalnız eksik UI dillerini ekler.
    /// </summary>
    private static async Task<int> EnsurePragueUiTextsAsync(
        AppDbContext dbContext,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var experience = await dbContext.Experiences
            .FirstOrDefaultAsync(
                x => x.Slug != null && EF.Functions.Like(x.Slug, "turk-rehber-ile-prag%"),
                cancellationToken)
            .ConfigureAwait(false);

        if (experience is null)
        {
            return 0;
        }

        var texts = new Dictionary<string, DemoUiText>(StringComparer.Ordinal)
        {
            ["en"] = new(
                "Discover Prague with a Turkish-speaking guide",
                "See Prague's centre, side streets and lesser-known corners with a Turkish-speaking local guide.",
                null,
                null,
                null,
                []),
            ["de"] = new(
                "Prag mit türkischsprachigem Guide entdecken",
                "Entdecke Prags Zentrum, Seitengassen und weniger bekannte Ecken mit einem türkischsprachigen lokalen Guide.",
                null,
                null,
                null,
                []),
            ["cs"] = new(
                "Objevte Prahu s turecky hovořícím průvodcem",
                "Projděte centrum Prahy, boční uličky i méně známá místa s turecky hovořícím místním průvodcem.",
                null,
                null,
                null,
                []),
            ["bg"] = new(
                "Открий Прага с турскоезичен гид",
                "Разгледай центъра на Прага, страничните улички и по-малко известните кътчета с местен гид, който говори турски.",
                null,
                null,
                null,
                []),
            ["hr"] = new(
                "Otkrij Prag s turskim vodičem",
                "Prođi centrom Praga, sporednim uličicama i manje poznatim kutovima s lokalnim vodičem koji govori turski.",
                null,
                null,
                null,
                []),
            ["da"] = new(
                "Oplev Prag med en tyrkisktalende guide",
                "Se Prags centrum, sidegader og mindre kendte hjørner med en lokal guide, der taler tyrkisk.",
                null,
                null,
                null,
                []),
            ["nl"] = new(
                "Ontdek Praag met een Turkssprekende gids",
                "Bekijk het centrum van Praag, de zijstraatjes en minder bekende hoekjes met een lokale gids die Turks spreekt.",
                null,
                null,
                null,
                []),
            ["et"] = new(
                "Avasta Praha türgi keelt kõneleva giidiga",
                "Vaata Praha kesklinna, kõrvaltänavaid ja vähem tuntud nurgakesi koos kohaliku giidiga, kes räägib türgi keelt.",
                null,
                null,
                null,
                []),
            ["fi"] = new(
                "Tutustu Prahaan turkkia puhuvan oppaan kanssa",
                "Näe Prahan keskusta, sivukujat ja vähemmän tunnetut kolkat paikallisen, turkkia puhuvan oppaan kanssa.",
                null,
                null,
                null,
                []),
        };

        var existingLanguages = await dbContext.ExperienceTranslations
            .Where(x => x.ExperienceId == experience.Id)
            .Select(x => x.Language)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var added = 0;

        foreach (var (language, text) in texts)
        {
            if (existingLanguages.Contains(language, StringComparer.Ordinal))
            {
                continue;
            }

            AddTranslation(dbContext, experience.Id, language, text, now);
            added++;
        }

        return added;
    }

    private static void AddTranslation(
        AppDbContext dbContext,
        Guid experienceId,
        string language,
        DemoUiText text,
        DateTimeOffset now)
    {
        dbContext.ExperienceTranslations.Add(new ExperienceTranslation
        {
            ExperienceId = experienceId,
            Language = language,
            Title = text.Title,
            Description = text.Description,
            WhatToBring = text.WhatToBring,
            NotIncluded = text.NotIncluded,
            MeetingInstructions = text.MeetingInstructions,
            Source = TranslationSource.HostWritten,
            UpdatedAtUtc = now,
        });
    }

    private static void AddItinerary(
        AppDbContext dbContext,
        Guid experienceId,
        string language,
        IReadOnlyList<(string Title, string? Body)> steps)
    {
        for (var index = 0; index < steps.Count; index++)
        {
            dbContext.ExperienceItinerarySteps.Add(new ExperienceItineraryStep
            {
                ExperienceId = experienceId,
                Language = language,
                SortOrder = index,
                Title = steps[index].Title,
                Body = steps[index].Body,
            });
        }
    }

    // -------------------------------------------------------------------------

    private static IEnumerable<DemoExperience> Specs(Guid ayse, Guid tuna)
    {
        yield return Kadikoy(ayse);
        yield return Balat(ayse);
        yield return Bogaz(ayse);
        yield return Kemeralti(tuna);
        yield return Goreme(tuna);
    }

    private static DemoExperience Kadikoy(Guid hostId) => new(
        HostId: hostId,
        Slug: "demo-kadikoy-lezzet-yuruyusu",
        CitySlug: "istanbul",
        Category: "food-drink",
        DurationMinutes: 180,
        Capacity: 8,
        SpokenLanguages: ["tr", "en"],
        Tags: ["sokak lezzetleri", "yürüyüş", "küçük grup"],
        MinimumAge: 12,
        ActivityLevel: ActivityLevel.Light,
        MeetingAddress: "Kadıköy Boğa Heykeli, Altıyol",
        Meeting: (40.9905, 29.0294),
        Currency: "TRY",
        AdultMinor: 150_000,
        SlotHours: [10, 15],
        PublishedDaysAgo: 12,
        Photos: ["kadikoy-1.jpg", "kadikoy-2.jpg"],
        UiTexts: new Dictionary<string, DemoUiText>(StringComparer.Ordinal)
        {
            ["tr"] = new(
                "Kadıköy lezzet yürüyüşü",
                "Çarşıdan Moda'ya üç saatlik bir tat turu: tarihi bir börekçi, bir turşucu, bir kahveci ve mahallenin en iyi tatlıcısı. Küçük grup, bol sohbet.",
                "Boğa heykelinin önünde, elimde turuncu bir çanta olacak.",
                "Aç bir mide ve yürüyüş ayakkabısı.",
                "İçecekler (isteğe bağlı).",
                [
                    ("Altıyol'da buluşma", "Kısa tanışma ve tur planı."),
                    ("Tarihi Çarşı", "Börek, peynir ve zeytin tadımı."),
                    ("Moda sahili", "Kahve molası, deniz kenarında yürüyüş."),
                    ("Tatlıcı", "Turun kapanışı: fırın sütlaç."),
                ]),
            ["en"] = new(
                "Kadıköy food walk",
                "A three-hour tasting walk from the market to Moda: a historic börek shop, a pickle maker, a coffee roaster and the neighbourhood's best pastry chef. Small group, lots of talk.",
                "In front of the bull statue; I'll carry an orange bag.",
                "An empty stomach and walking shoes.",
                "Drinks (optional).",
                [
                    ("Meet at Altıyol", "Short intro and the plan."),
                    ("Historic market", "Börek, cheese and olive tasting."),
                    ("Moda seafront", "Coffee break, a walk by the sea."),
                    ("Pastry shop", "Closing with baked rice pudding."),
                ]),
            ["de"] = new(
                "Kulinarischer Spaziergang in Kadıköy",
                "Drei Stunden Verkostung vom Markt bis nach Moda: historische Börekerei, Essigwaren, Rösterei und die beste Konditorei der Nachbarschaft. Kleine Gruppe, viel Gespräch.",
                "Vor der Stierstatue; ich trage eine orangefarbene Tasche.",
                "Leeren Magen und bequeme Schuhe.",
                "Getränke (optional).",
                [
                    ("Treffpunkt Altıyol", "Kurze Vorstellung und Plan."),
                    ("Historischer Markt", "Börek, Käse und Oliven."),
                    ("Moda am Meer", "Kaffeepause und Spaziergang."),
                    ("Konditorei", "Abschluss mit gebackenem Milchreis."),
                ]),
            ["cs"] = new(
                "Gurmánská procházka Kadıköy",
                "Tříhodinová degustace z trhu do Moda: historická börekárna, nakládač, pražírna a nejlepší cukrář ve čtvrti. Malá skupina, spousta řeči.",
                "Před sochou býka; budu mít oranžovou tašku.",
                "Prázdný žaludek a pohodlné boty.",
                "Nápoje (volitelné).",
                [
                    ("Sraz na Altıyol", "Krátké seznámení a plán."),
                    ("Historický trh", "Börek, sýr a olivy."),
                    ("Nábřeží Moda", "Káva a procházka u moře."),
                    ("Cukrárna", "Závěr s pečeným mléčným rýžovým pudinkem."),
                ]),
            ["bg"] = new(
                "Вкусна разходка в Кадъкьой",
                "Три часа дегустация от чаршията до Мода: историческа бюрекчийница, туршия, пекарна за кафе и най-добрият сладкар в квартала. Малка група, много разговори.",
                "Пред статуята на бика; ще нося оранжева чанта.",
                "Празен стомах и удобни обувки.",
                "Напитки (по желание).",
                [
                    ("Среща на Алтъйол", "Кратко запознанство и план."),
                    ("Историческият пазар", "Бюрек, сирене и маслини."),
                    ("Крайбрежието на Мода", "Кафе пауза и разходка край морето."),
                    ("Сладкарница", "Край с печен млечен ориз."),
                ]),
            ["hr"] = new(
                "Gurmanska šetnja Kadıköyem",
                "Tri sata degustacije od tržnice do Mode: povijesna börekarnica, kiseli specijaliteti, pržionica kave i najbolji slastičar u četvrti. Mala grupa, puno razgovora.",
                "Ispred kipa bika; nosit ću narančastu torbu.",
                "Prazan želudac i udobne cipele.",
                "Pića (po želji).",
                [
                    ("Sastanak na Altıyolu", "Kratko upoznavanje i plan."),
                    ("Povijesna tržnica", "Börek, sir i masline."),
                    ("Obala Mode", "Pauza za kavu i šetnja uz more."),
                    ("Slastičarna", "Završetak s pečenim mliječnim rižinom."),
                ]),
            ["da"] = new(
                "Madvandring i Kadıköy",
                "Tre timers smagstur fra markedet til Moda: et historisk börek-bageri, en syltemager, et kafferisteri og kvarterets bedste konditor. Lille gruppe, masser af snak.",
                "Foran tyrestatuen; jeg har en orange taske med.",
                "En tom mave og gode gåsko.",
                "Drikkevarer (valgfrit).",
                [
                    ("Vi mødes ved Altıyol", "Kort præsentation og plan."),
                    ("Det historiske marked", "Börek, ost og oliven."),
                    ("Strandpromenaden i Moda", "Kaffepause og gåtur ved vandet."),
                    ("Konditoriet", "Vi slutter med bagt risengrød."),
                ]),
            ["nl"] = new(
                "Culinaire wandeling door Kadıköy",
                "Een proeverij van drie uur van de markt naar Moda: een historische börekbakker, een inmaker, een koffiebranderij en de beste banketbakker van de buurt. Kleine groep, veel gesprekken.",
                "Voor het stierenbeeld; ik heb een oranje tas bij me.",
                "Een lege maag en goede wandelschoenen.",
                "Drankjes (optioneel).",
                [
                    ("Verzamelen bij Altıyol", "Korte kennismaking en de planning."),
                    ("De historische markt", "Börek, kaas en olijven proeven."),
                    ("De kust van Moda", "Koffiepauze en een wandeling langs het water."),
                    ("Banketbakker", "Afsluiting met gebakken rijstpudding."),
                ]),
            ["et"] = new(
                "Maitseretk Kadıköys",
                "Kolmetunnine maitsmisretk turult Modasse: ajalooline börekipagar, hapendaja, kohvirösteri ja linnaosa parim kondiiter. Väike grupp, palju juttu.",
                "Pullikuju ees; mul on käes oranž kott.",
                "Tühi kõht ja mugavad jalanõud.",
                "Joogid (soovi korral).",
                [
                    ("Kohtumine Altıyolis", "Lühike tutvumine ja plaan."),
                    ("Ajalooline turg", "Böreki, juustu ja oliivide maitsmine."),
                    ("Moda rannapromenaad", "Kohvipaus ja jalutuskäik mere ääres."),
                    ("Kondiitriäri", "Lõpetuseks küpsetatud riisipuding."),
                ]),
            ["fi"] = new(
                "Makukävely Kadıköyssä",
                "Kolmen tunnin maistelukierros torilta Modaan: historiallinen börek-leipomo, säilykemestari, kahvipaahtimo ja kaupunginosan paras kondiittori. Pieni ryhmä, paljon juttelua.",
                "Härkäpatsaan edessä; minulla on oranssi laukku.",
                "Tyhjä vatsa ja hyvät kävelykengät.",
                "Juomat (valinnaiset).",
                [
                    ("Tapaaminen Altıyolissa", "Lyhyt tutustuminen ja suunnitelma."),
                    ("Historiallinen tori", "Börekiä, juustoa ja oliiveja."),
                    ("Modan rantabulevardi", "Kahvitauko ja kävely meren rannalla."),
                    ("Konditoria", "Lopuksi uunissa paistettua riisipuuroa."),
                ]),
        });

    private static DemoExperience Balat(Guid hostId) => new(
        HostId: hostId,
        Slug: "demo-balat-fotograf-yuruyusu",
        CitySlug: "istanbul",
        Category: "photography",
        DurationMinutes: 150,
        Capacity: 6,
        SpokenLanguages: ["tr", "en"],
        Tags: ["fotoğraf", "sabah", "mimari"],
        MinimumAge: null,
        ActivityLevel: ActivityLevel.Moderate,
        MeetingAddress: "Balat İskelesi",
        Meeting: (41.0296, 28.9497),
        Currency: "TRY",
        AdultMinor: 120_000,
        SlotHours: [8],
        PublishedDaysAgo: 5,
        Photos: ["balat-1.jpg", "balat-2.jpg"],
        UiTexts: new Dictionary<string, DemoUiText>(StringComparer.Ordinal)
        {
            ["tr"] = new(
                "Balat'ta sabah fotoğraf yürüyüşü",
                "Renkli evler, dar sokaklar ve sabah ışığı. Telefonla da gelebilirsin; kompozisyon ve ışık üstüne konuşuruz.",
                "İskele çıkışı, saat kulesinin altı.",
                "Fotoğraf makinesi ya da telefon, dolu pil.",
                null,
                [
                    ("İskelede buluşma", null),
                    ("Renkli sokaklar", "Kiremit Caddesi ve merdivenler."),
                    ("Kahve ve geri bildirim", "Çektiklerimize birlikte bakarız."),
                ]),
            ["en"] = new(
                "Morning photo walk in Balat",
                "Colourful houses, narrow streets and morning light. Phone cameras welcome; we talk composition and light.",
                "Ferry pier exit, under the clock.",
                "A camera or phone, charged.",
                null,
                [
                    ("Meet at the pier", null),
                    ("The colourful streets", "Kiremit Street and the stairs."),
                    ("Coffee and feedback", "We look at the shots together."),
                ]),
            ["de"] = new(
                "Morgen-Fotospaziergang in Balat",
                "Bunte Häuser, enge Gassen und Morgenlicht. Handykameras willkommen; wir sprechen über Komposition und Licht.",
                "Ausgang der Fähranlegestelle, unter der Uhr.",
                "Kamera oder Handy, voll geladen.",
                null,
                [
                    ("Treffpunkt am Pier", null),
                    ("Bunte Straßen", "Kiremit-Straße und die Treppen."),
                    ("Kaffee und Feedback", "Wir schauen uns die Fotos gemeinsam an."),
                ]),
            ["cs"] = new(
                "Ranní fotografická procházka Balatem",
                "Barevné domy, úzké uličky a ranní světlo. Mobily vítány; mluvíme o kompozici a světle.",
                "Výstup z přístaviště, pod hodinami.",
                "Foťák nebo telefon, nabitý.",
                null,
                [
                    ("Sraz u přístaviště", null),
                    ("Barevné ulice", "Ulice Kiremit a schody."),
                    ("Káva a zpětná vazba", "Společně si prohlédneme snímky."),
                ]),
            ["bg"] = new(
                "Сутрешна фоторазходка в Балат",
                "Цветни къщи, тесни улички и сутрешна светлина. Можеш и с телефон; говорим за композиция и светлина.",
                "Изходът от кея, под часовника.",
                "Фотоапарат или телефон, зареден.",
                null,
                [
                    ("Среща на кея", null),
                    ("Цветните улици", "Улица Киремит и стълбите."),
                    ("Кафе и обратна връзка", "Заедно гледаме снимките."),
                ]),
            ["hr"] = new(
                "Jutarnja foto šetnja Balatom",
                "Šarene kuće, uske uličice i jutarnje svjetlo. Možeš i s telefonom; pričamo o kompoziciji i svjetlu.",
                "Izlaz s pristaništa, ispod sata.",
                "Fotoaparat ili telefon, napunjen.",
                null,
                [
                    ("Sastanak na pristaništu", null),
                    ("Šarene ulice", "Ulica Kiremit i stepenice."),
                    ("Kava i povratne informacije", "Zajedno gledamo snimke."),
                ]),
            ["da"] = new(
                "Fotovandring i Balat om morgenen",
                "Farverige huse, smalle gader og morgenlys. Du kan også komme med din telefon; vi taler om komposition og lys.",
                "Ved udgangen fra færgelejet, under uret.",
                "Kamera eller telefon, fuldt opladet.",
                null,
                [
                    ("Vi mødes ved færgelejet", null),
                    ("De farverige gader", "Kiremit-gaden og trapperne."),
                    ("Kaffe og feedback", "Vi ser billederne igennem sammen."),
                ]),
            ["nl"] = new(
                "Ochtendfotowandeling in Balat",
                "Kleurrijke huizen, smalle straatjes en ochtendlicht. Je kunt ook met je telefoon komen; we praten over compositie en licht.",
                "Bij de uitgang van de aanlegsteiger, onder de klok.",
                "Een camera of telefoon, volledig opgeladen.",
                null,
                [
                    ("Verzamelen bij de steiger", null),
                    ("De kleurrijke straten", "De Kiremitstraat en de trappen."),
                    ("Koffie en feedback", "We bekijken de foto’s samen."),
                ]),
            ["et"] = new(
                "Hommikune fotoretk Balatis",
                "Värvilised majad, kitsad tänavad ja hommikuvalgus. Võid tulla ka telefoniga; räägime kompositsioonist ja valgusest.",
                "Sadamakai väljapääsu juures, kella all.",
                "Kaamera või telefon, täis laetud.",
                null,
                [
                    ("Kohtumine kai ääres", null),
                    ("Värvilised tänavad", "Kiremiti tänav ja trepid."),
                    ("Kohv ja tagasiside", "Vaatame pildid koos üle."),
                ]),
            ["fi"] = new(
                "Aamun valokuvauskävely Balatissa",
                "Värikkäät talot, kapeat kujat ja aamun valo. Voit tulla myös puhelimen kanssa; puhumme sommittelusta ja valosta.",
                "Laiturin uloskäynnillä, kellon alla.",
                "Kamera tai puhelin, täyteen ladattuna.",
                null,
                [
                    ("Tapaaminen laiturilla", null),
                    ("Värikkäät kadut", "Kiremit-katu ja portaat."),
                    ("Kahvi ja palaute", "Katsomme kuvat yhdessä läpi."),
                ]),
        });

    private static DemoExperience Bogaz(Guid hostId) => new(
        HostId: hostId,
        Slug: "demo-bogaz-gunbatimi-tekne",
        CitySlug: "istanbul",
        Category: "water-sea",
        DurationMinutes: 120,
        Capacity: 10,
        SpokenLanguages: ["tr", "en", "de"],
        Tags: ["tekne", "gün batımı"],
        MinimumAge: 6,
        ActivityLevel: ActivityLevel.Light,
        MeetingAddress: "Beşiktaş Barbaros Hayrettin Paşa İskelesi",
        Meeting: (41.0416, 29.0079),
        Currency: "EUR",
        AdultMinor: 3_500,
        SlotHours: [18],
        PublishedDaysAgo: 20,
        Photos: ["bogaz-1.jpg", "bogaz-2.jpg"],
        UiTexts: new Dictionary<string, DemoUiText>(StringComparer.Ordinal)
        {
            ["tr"] = new(
                "Boğaz'da gün batımı tekne turu",
                "Küçük bir tekneyle Beşiktaş'tan Rumeli Hisarı'na. Çay, simit ve gün batımı.",
                "İskelenin sağındaki küçük tekne rıhtımı.",
                "Rüzgarlık; akşam serin olur.",
                "Alkollü içecek.",
                [
                    ("Beşiktaş'tan hareket", null),
                    ("Ortaköy ve köprü altı", "Fotoğraf molası."),
                    ("Rumeli Hisarı önünde gün batımı", "Çay ve simit."),
                    ("Dönüş", null),
                ]),
            ["en"] = new(
                "Bosphorus sunset boat tour",
                "A small boat from Beşiktaş to Rumeli Fortress. Tea, simit and the sunset.",
                "The small boat dock to the right of the ferry pier.",
                "A windbreaker; evenings get cool.",
                "Alcoholic drinks.",
                [
                    ("Departure from Beşiktaş", null),
                    ("Ortaköy and under the bridge", "Photo stop."),
                    ("Sunset off Rumeli Fortress", "Tea and simit."),
                    ("Return", null),
                ]),
            ["de"] = new(
                "Sonnenuntergangstour auf dem Bosporus",
                "Mit einem kleinen Boot von Beşiktaş zur Rumeli-Festung. Tee, Simit und Sonnenuntergang.",
                "Der kleine Bootssteg rechts vom Fähranleger.",
                "Eine Windjacke; abends wird es kühl.",
                "Alkoholische Getränke.",
                [
                    ("Abfahrt von Beşiktaş", null),
                    ("Ortaköy und unter der Brücke", "Fotostopp."),
                    ("Sonnenuntergang an der Rumeli-Festung", "Tee und Simit."),
                    ("Rückfahrt", null),
                ]),
            ["cs"] = new(
                "Západ slunce na Bosporu lodí",
                "Malá loď z Beşiktaş k pevnosti Rumeli. Čaj, simit a západ slunce.",
                "Malé přístaviště vpravo od trajektu.",
                "Větrovka; večer se ochladí.",
                "Alkoholické nápoje.",
                [
                    ("Odjezd z Beşiktaş", null),
                    ("Ortaköy a pod mostem", "Fotostop."),
                    ("Západ u pevnosti Rumeli", "Čaj a simit."),
                    ("Návrat", null),
                ]),
            ["bg"] = new(
                "Залез с лодка по Босфора",
                "Малка лодка от Бешикташ до крепостта Румели. Чай, симит и залез.",
                "Малкият кей вдясно от ферибота.",
                "Ветровка; вечер става хладно.",
                "Алкохолни напитки.",
                [
                    ("Тръгване от Бешикташ", null),
                    ("Ортакьой и под моста", "Фото пауза."),
                    ("Залез пред крепостта Румели", "Чай и симит."),
                    ("Връщане", null),
                ]),
            ["hr"] = new(
                "Zalazak sunca brodom na Bosporu",
                "Mali brod od Beşiktaşa do tvrđave Rumeli. Čaj, simit i zalazak sunca.",
                "Mali dok desno od trajektnog pristaništa.",
                "Vjetrovka; navečer zahladi.",
                "Alkoholna pića.",
                [
                    ("Polazak iz Beşiktaşa", null),
                    ("Ortaköy i ispod mosta", "Foto stanka."),
                    ("Zalazak kod tvrđave Rumeli", "Čaj i simit."),
                    ("Povratak", null),
                ]),
            ["da"] = new(
                "Solnedgangstur med båd på Bosporus",
                "En lille båd fra Beşiktaş til Rumeli-fæstningen. Te, simit og solnedgang.",
                "Den lille bådebro til højre for færgelejet.",
                "En vindjakke; om aftenen bliver det køligt.",
                "Alkoholiske drikke.",
                [
                    ("Afgang fra Beşiktaş", null),
                    ("Ortaköy og under broen", "Fotostop."),
                    ("Solnedgang ved Rumeli-fæstningen", "Te og simit."),
                    ("Hjemtur", null),
                ]),
            ["nl"] = new(
                "Boottocht bij zonsondergang op de Bosporus",
                "Met een kleine boot van Beşiktaş naar het fort Rumeli. Thee, simit en de zonsondergang.",
                "De kleine bootsteiger rechts van de veerpont.",
                "Een windjack; ’s avonds wordt het koel.",
                "Alcoholische dranken.",
                [
                    ("Vertrek vanuit Beşiktaş", null),
                    ("Ortaköy en onder de brug", "Fotostop."),
                    ("Zonsondergang bij het fort Rumeli", "Thee en simit."),
                    ("Terugvaart", null),
                ]),
            ["et"] = new(
                "Päikeseloojangu paadisõit Bosporusel",
                "Väikese paadiga Beşiktaşist Rumeli kindluseni. Tee, simit ja päikeseloojang.",
                "Väike paadisild praamikaist paremal.",
                "Tuulejope; õhtuti läheb jahedaks.",
                "Alkohoolsed joogid.",
                [
                    ("Väljumine Beşiktaşist", null),
                    ("Ortaköy ja silla all", "Fotopeatus."),
                    ("Päikeseloojang Rumeli kindluse juures", "Tee ja simit."),
                    ("Tagasisõit", null),
                ]),
            ["fi"] = new(
                "Auringonlaskun veneretki Bosporinsalmella",
                "Pienellä veneellä Beşiktaşista Rumelin linnoitukselle. Teetä, simit-rinkeleitä ja auringonlasku.",
                "Pieni venelaituri lauttalaiturin oikealla puolella.",
                "Tuulitakki; iltaisin tulee viileää.",
                "Alkoholijuomat.",
                [
                    ("Lähtö Beşiktaşista", null),
                    ("Ortaköy ja sillan alitse", "Kuvaustauko."),
                    ("Auringonlasku Rumelin linnoituksella", "Teetä ja simitiä."),
                    ("Paluu", null),
                ]),
        });

    private static DemoExperience Kemeralti(Guid hostId) => new(
        HostId: hostId,
        Slug: "demo-kemeralti-kahvalti-turu",
        CitySlug: "izmir",
        Category: "local-life",
        DurationMinutes: 150,
        Capacity: 8,
        SpokenLanguages: ["tr", "en"],
        Tags: ["kahvaltı", "çarşı"],
        MinimumAge: null,
        ActivityLevel: ActivityLevel.Light,
        MeetingAddress: "Konak Saat Kulesi",
        Meeting: (38.4189, 27.1287),
        Currency: "TRY",
        AdultMinor: 90_000,
        SlotHours: [9],
        PublishedDaysAgo: 3,
        Photos: ["kemeralti-1.jpg", "kemeralti-2.jpg"],
        UiTexts: new Dictionary<string, DemoUiText>(StringComparer.Ordinal)
        {
            ["tr"] = new(
                "Kemeraltı'nda serpme kahvaltı ve çarşı turu",
                "Boyoz, gevrek ve İzmir'in çarşı sabahı. Sonra Kızlarağası Hanı'nda Türk kahvesi.",
                "Saat kulesinin deniz tarafı.",
                null,
                null,
                [
                    ("Saat Kulesi'nde buluşma", null),
                    ("Boyoz ve gevrek", "Çarşının girişinde ayaküstü."),
                    ("Kızlarağası Hanı", "Kahve ve sohbet."),
                ]),
            ["en"] = new(
                "Kemeraltı breakfast and bazaar walk",
                "Boyoz, gevrek and the bazaar's morning rhythm. Then Turkish coffee at Kızlarağası Inn.",
                "Sea side of the clock tower.",
                null,
                null,
                [
                    ("Meet at the clock tower", null),
                    ("Boyoz and gevrek", "Standing, at the bazaar entrance."),
                    ("Kızlarağası Inn", "Coffee and conversation."),
                ]),
            ["de"] = new(
                "Frühstück und Basarrundgang in Kemeraltı",
                "Boyoz, Gevrek und der Morgenrhythmus des Basars. Danach türkischer Kaffee im Kızlarağası-Han.",
                "Seeseite des Uhrturms.",
                null,
                null,
                [
                    ("Treffpunkt am Uhrturm", null),
                    ("Boyoz und Gevrek", "Im Stehen am Basareingang."),
                    ("Kızlarağası-Han", "Kaffee und Gespräch."),
                ]),
            ["cs"] = new(
                "Snídaně a procházka bazarem Kemeraltı",
                "Boyoz, gevrek a ranní rytmus bazaru. Pak turecká káva v hanu Kızlarağası.",
                "Strana hodinové věže k moři.",
                null,
                null,
                [
                    ("Sraz u hodinové věže", null),
                    ("Boyoz a gevrek", "Ve stoje u vstupu do bazaru."),
                    ("Han Kızlarağası", "Káva a rozhovor."),
                ]),
            ["bg"] = new(
                "Закуска и разходка на чаршията Кемералтъ",
                "Бойоз, геврек и сутрешният ритъм на чаршията. После турско кафе в хана Къзлараасъ.",
                "Към морето от часовниковата кула.",
                null,
                null,
                [
                    ("Среща при часовниковата кула", null),
                    ("Бойоз и геврек", "На крак, на входа на чаршията."),
                    ("Хан Къзлараасъ", "Кафе и разговор."),
                ]),
            ["hr"] = new(
                "Doručak i šetnja čaršijom Kemeraltı",
                "Boyoz, gevrek i jutarnji ritam čaršije. Zatim turska kava u hanu Kızlarağası.",
                "Strana satnog tornja prema moru.",
                null,
                null,
                [
                    ("Sastanak kod satnog tornja", null),
                    ("Boyoz i gevrek", "Stojeći, na ulazu u čaršiju."),
                    ("Han Kızlarağası", "Kava i razgovor."),
                ]),
            ["da"] = new(
                "Morgenmad og basartur i Kemeraltı",
                "Boyoz, gevrek og basarens morgenrytme. Bagefter tyrkisk kaffe i Kızlarağası Han.",
                "Ved havsiden af klokketårnet.",
                null,
                null,
                [
                    ("Vi mødes ved klokketårnet", null),
                    ("Boyoz og gevrek", "Stående, ved indgangen til basaren."),
                    ("Kızlarağası Han", "Kaffe og snak."),
                ]),
            ["nl"] = new(
                "Ontbijt en bazaarwandeling in Kemeraltı",
                "Boyoz, gevrek en het ochtendritme van de bazaar. Daarna Turkse koffie in de Kızlarağası Han.",
                "Aan de zeekant van de klokkentoren.",
                null,
                null,
                [
                    ("Verzamelen bij de klokkentoren", null),
                    ("Boyoz en gevrek", "Staand, bij de ingang van de bazaar."),
                    ("Kızlarağası Han", "Koffie en een praatje."),
                ]),
            ["et"] = new(
                "Hommikusöök ja basaariretk Kemeraltıs",
                "Boyoz, gevrek ja basaari hommikune rütm. Seejärel türgi kohv Kızlarağası hanis.",
                "Kellatorni mere poolsel küljel.",
                null,
                null,
                [
                    ("Kohtumine kellatorni juures", null),
                    ("Boyoz ja gevrek", "Püsti seistes, basaari sissepääsu juures."),
                    ("Kızlarağası han", "Kohv ja jutuajamine."),
                ]),
            ["fi"] = new(
                "Aamiainen ja basaarikävely Kemeraltıssa",
                "Boyozia, gevrekiä ja basaarin aamurytmi. Sen jälkeen turkkilaista kahvia Kızlarağasın karavaaniserajissa.",
                "Kellotornin merenpuoleisella sivulla.",
                null,
                null,
                [
                    ("Tapaaminen kellotornilla", null),
                    ("Boyoz ja gevrek", "Seisaaltaan, basaarin sisäänkäynnillä."),
                    ("Kızlarağasın karavaaniseraji", "Kahvia ja juttelua."),
                ]),
        });

    private static DemoExperience Goreme(Guid hostId) => new(
        HostId: hostId,
        Slug: "demo-goreme-gun-dogumu-yuruyusu",
        CitySlug: "goreme",
        Category: "nature-outdoors",
        DurationMinutes: 240,
        Capacity: 8,
        SpokenLanguages: ["tr", "en"],
        Tags: ["yürüyüş", "gün doğumu", "balon"],
        MinimumAge: 14,
        ActivityLevel: ActivityLevel.Strenuous,
        MeetingAddress: "Göreme Otogarı",
        Meeting: (38.6431, 34.8289),
        Currency: "EUR",
        AdultMinor: 4_500,
        SlotHours: [5],
        PublishedDaysAgo: 8,
        Photos: ["goreme-1.jpg", "goreme-2.jpg"],
        UiTexts: new Dictionary<string, DemoUiText>(StringComparer.Ordinal)
        {
            ["tr"] = new(
                "Göreme'de gün doğumu vadi yürüyüşü",
                "Balonlar havalanırken Kızılçukur'dan Güllüdere'ye. Orta zorlukta, yaklaşık 7 km.",
                "Otogarın önünde, minibüsle alıyorum.",
                "Bot, kat kat giysi, 1 litre su.",
                "Kahvaltı (dönüşte tavsiye ederim).",
                [
                    ("Otogarda buluşma", "Minibüsle vadi girişine 10 dk."),
                    ("Kızılçukur", "Gün doğumu ve balonlar."),
                    ("Güllüdere", "Kaya kiliseleri."),
                    ("Çavuşin", "Yürüyüşün bitişi, köye dönüş."),
                ]),
            ["en"] = new(
                "Sunrise valley hike in Göreme",
                "From Red Valley to Rose Valley while the balloons rise. Moderate, about 7 km.",
                "In front of the bus station; I pick you up with a minibus.",
                "Boots, layers, a litre of water.",
                "Breakfast (I recommend a place afterwards).",
                [
                    ("Meet at the bus station", "10 minutes by minibus to the trailhead."),
                    ("Red Valley", "Sunrise and balloons."),
                    ("Rose Valley", "Rock churches."),
                    ("Çavuşin", "End of the hike, back to the village."),
                ]),
            ["de"] = new(
                "Sonnenaufgangswanderung im Tal bei Göreme",
                "Vom Roten Tal zum Rosental, während die Ballons aufsteigen. Mittel, etwa 7 km.",
                "Vor dem Busbahnhof; ich hole euch mit dem Minibus ab.",
                "Stiefel, Schichten, einen Liter Wasser.",
                "Frühstück (danach empfehle ich einen Ort).",
                [
                    ("Treffpunkt Busbahnhof", "10 Minuten mit dem Minibus zum Start."),
                    ("Rotes Tal", "Sonnenaufgang und Ballons."),
                    ("Rosental", "Felsenkirchen."),
                    ("Çavuşin", "Ende der Wanderung, zurück ins Dorf."),
                ]),
            ["cs"] = new(
                "Východ slunce — túra údolím v Göreme",
                "Z Červeného údolí do Růžového, zatímco stoupají balóny. Střední náročnost, asi 7 km.",
                "Před autobusovým nádražím; vyzvednu vás minibusem.",
                "Boty, vrstvy, litr vody.",
                "Snídaně (potom doporučím místo).",
                [
                    ("Sraz na nádraží", "10 minut minibusem k začátku trasy."),
                    ("Červené údolí", "Východ slunce a balóny."),
                    ("Růžové údolí", "Skalní kostely."),
                    ("Çavuşin", "Konec túry, zpět do vesnice."),
                ]),
            ["bg"] = new(
                "Изгрев — разходка в долината при Гьореме",
                "От Червената долина до Розовата, докато балоните се издигат. Средна трудност, около 7 км.",
                "Пред автогарата; вземам ви с минибус.",
                "Ботуши, слоеве дрехи, литър вода.",
                "Закуска (после препоръчвам място).",
                [
                    ("Среща на автогарата", "10 минути с минибус до началото на пътеката."),
                    ("Червената долина", "Изгрев и балони."),
                    ("Розовата долина", "Скални църкви."),
                    ("Чавушин", "Край на разходката, обратно в селото."),
                ]),
            ["hr"] = new(
                "Izlazak sunca — šetnja dolinom kod Göremea",
                "Od Crvene do Ružičaste doline dok se baloni dižu. Srednja težina, oko 7 km.",
                "Ispred autobusnog kolodvora; dolazim po tebe minibustom.",
                "Čizme, slojevi odjeće, litra vode.",
                "Doručak (poslije preporučujem mjesto).",
                [
                    ("Sastanak na kolodvoru", "10 minuta minibustom do početka staze."),
                    ("Crvena dolina", "Izlazak sunca i baloni."),
                    ("Ružičasta dolina", "Stambene crkve."),
                    ("Çavuşin", "Kraj šetnje, natrag u selo."),
                ]),
            ["da"] = new(
                "Solopgangsvandring i dalen ved Göreme",
                "Fra Den Røde Dal til Rosendalen, mens ballonerne stiger op. Middel sværhedsgrad, cirka 7 km.",
                "Foran busstationen; jeg henter dig i minibus.",
                "Vandrestøvler, flere lag tøj, en liter vand.",
                "Morgenmad (bagefter anbefaler jeg et sted).",
                [
                    ("Vi mødes ved busstationen", "10 minutter i minibus til startpunktet."),
                    ("Den Røde Dal", "Solopgang og balloner."),
                    ("Rosendalen", "Klippekirker."),
                    ("Çavuşin", "Vandringen slutter, tilbage til landsbyen."),
                ]),
            ["nl"] = new(
                "Zonsopgangswandeling door de vallei bij Göreme",
                "Van de Rode Vallei naar de Rozenvallei terwijl de ballonnen opstijgen. Gemiddeld zwaar, ongeveer 7 km.",
                "Voor het busstation; ik haal je op met een minibus.",
                "Wandelschoenen, laagjes kleding, een liter water.",
                "Ontbijt (daarna raad ik een adresje aan).",
                [
                    ("Verzamelen bij het busstation", "10 minuten met de minibus naar het startpunt."),
                    ("De Rode Vallei", "Zonsopgang en ballonnen."),
                    ("De Rozenvallei", "Rotskerken."),
                    ("Çavuşin", "Einde van de wandeling, terug naar het dorp."),
                ]),
            ["et"] = new(
                "Päikesetõusu matk orus Göreme lähedal",
                "Punasest orust Roosade orgu, samal ajal kui õhupallid tõusevad. Keskmise raskusega, umbes 7 km.",
                "Bussijaama ees; tulen sulle minibussiga järele.",
                "Matkasaapad, kihiti riided, liiter vett.",
                "Hommikusöök (pärast soovitan üht kohta).",
                [
                    ("Kohtumine bussijaamas", "Minibussiga 10 minutit raja alguseni."),
                    ("Punane org", "Päikesetõus ja õhupallid."),
                    ("Roosade org", "Kaljukirikud."),
                    ("Çavuşin", "Matka lõpp, tagasi külla."),
                ]),
            ["fi"] = new(
                "Auringonnousuvaellus laaksossa Göremen lähellä",
                "Punaisesta laaksosta Ruusulaaksoon, kun kuumailmapallot nousevat. Keskivaativa, noin 7 km.",
                "Linja-autoaseman edessä; haen sinut pikkubussilla.",
                "Vaelluskengät, kerrospukeutuminen, litra vettä.",
                "Aamiainen (suosittelen jälkeenpäin yhtä paikkaa).",
                [
                    ("Tapaaminen linja-autoasemalla", "Pikkubussilla 10 minuuttia polun alkuun."),
                    ("Punainen laakso", "Auringonnousu ja kuumailmapallot."),
                    ("Ruusulaakso", "Kalliokirkot."),
                    ("Çavuşin", "Vaellus päättyy, paluu kylään."),
                ]),
        });

    private sealed record DemoUiText(
        string Title,
        string Description,
        string? MeetingInstructions,
        string? WhatToBring,
        string? NotIncluded,
        IReadOnlyList<(string Title, string? Body)> Itinerary);

    private sealed record DemoExperience(
        Guid HostId,
        string Slug,
        string CitySlug,
        string Category,
        int DurationMinutes,
        int Capacity,
        IReadOnlyList<string> SpokenLanguages,
        IReadOnlyList<string> Tags,
        int? MinimumAge,
        ActivityLevel ActivityLevel,
        string MeetingAddress,
        (double Lat, double Lng)? Meeting,
        string Currency,
        long AdultMinor,
        IReadOnlyList<int> SlotHours,
        int PublishedDaysAgo,
        IReadOnlyList<string> Photos,
        IReadOnlyDictionary<string, DemoUiText> UiTexts);
}

public sealed class DemoSeedResult
{
    public int Experiences { get; set; }

    /// <summary>Eski PNG gradyanı gömülü JPEG ile değiştirilen ilan sayısı.</summary>
    public int MediaRefreshed { get; set; }

    /// <summary>Yeni eklenen çeviri / program dili satırı (eksik UI dilleri).</summary>
    public int TranslationsAdded { get; set; }

    public int ChangedRows { get; set; }
}
