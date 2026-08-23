using System.Globalization;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Expyra.Domain.Catalog;
using Expyra.Domain.Common;
using Expyra.Domain.Places;
using Expyra.Domain.Pricing;

namespace Expyra.Infrastructure.Persistence.Seed;

/// <summary>
/// Ülke, şehir, para birimi ve kategori kayıt defterlerinin başlangıç verisini yazar.
/// <b>İdempotent</b>: iki kez çalıştırmak satır sayısını değiştirmez.
///
/// <para><b>Neden <c>HasData</c> ile migration'a gömülmedi</b> (Language'ın aksine):
/// 49 dil için doğruydu, 250 ülke + yüzlerce şehir + alias'lar için değil. Migration
/// dosyası şişer, her yazım düzeltmesi yeni bir migration doğurur ve şema değişikliği
/// olmayan bir veri düzeltmesi şema geçmişine karışır. PLAN Blok 4'ün açık uyarısı.</para>
///
/// <para><b>Neden açılışta değil ayrı komut</b> (CLAUDE.md #2): uygulama açılışında veri
/// yazmak, şema değiştirmekle aynı kapıya çıkar — iki sunucu kopyası aynı anda açıldığında
/// yarışır. Tetikleyici:
/// <c>dotnet run --project apps/api/src/Expyra.WebApi -- seed reference-data</c>
/// (kısayol: <c>pnpm api:seed</c>).</para>
///
/// <para><b>Silme yok, üzerine yazma var.</b> Kaynak dosyadan çıkarılan bir ülke/şehir/para
/// birimi satırı SİLİNMEZ: bu satırlara ileride <c>experience</c> ve <c>booking</c> FK ile
/// bağlanacak ve seed'in bir kaydı sessizce yok etmesi, yanında duran her şeyi götürür.
/// Kategoriler istisna — kaynakta olmayan kategori silinmez ama <c>is_active = false</c>
/// yapılır (yeni deneyimde seçilemez, eskiler bozulmaz). Şehir alias'ları da istisna:
/// onlar tamamen türetilmiş veri, kimse onlara FK ile bağlanmıyor ve bayat bir alias
/// yanlış eşleşme üretir — kaynakta olmayan alias silinir.</para>
/// </summary>
public static class ReferenceDataSeeder
{
    /// <summary>
    /// İki seed komutunun aynı anda koşmasını sıraya sokan advisory lock anahtarı.
    /// Kilit olmadan ikinci koşu, birincinin henüz commit etmediği satırları göremez ve
    /// aynı ülkeyi ikinci kez INSERT etmeye kalkar (birincil anahtar ihlali).
    /// </summary>
    public const string AdvisoryLockKey = "seed:reference-data";

    public static async Task<ReferenceDataSeedResult> SeedAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        // Tek transaction: yarım seed, "ülkeler var ama şehirler yok" gibi FK'si tutan
        // ama anlamsız bir duruma bırakırdı (CLAUDE.md #5 — çok satırlı yazma).
        await using var transaction = await dbContext.BeginTransactionAsync(cancellationToken)
            .ConfigureAwait(false);

        await dbContext.AcquireAdvisoryLockAsync(AdvisoryLockKey, cancellationToken).ConfigureAwait(false);

        var countryCodes = await SeedCountriesAsync(dbContext, cancellationToken).ConfigureAwait(false);
        var currencies = await SeedCurrenciesAsync(dbContext, cancellationToken).ConfigureAwait(false);
        var categories = await SeedCategoriesAsync(dbContext, cancellationToken).ConfigureAwait(false);
        var (cities, aliases) = await SeedCitiesAsync(dbContext, countryCodes, cancellationToken)
            .ConfigureAwait(false);

        var rates = await SeedExchangeRatesAsync(dbContext, cancellationToken).ConfigureAwait(false);

        var changed = await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return new ReferenceDataSeedResult(
            Countries: countryCodes.Count,
            Cities: cities,
            CityAliases: aliases,
            Currencies: currencies,
            Categories: categories,
            ExchangeRates: rates,
            ChangedRows: changed);
    }

    private static async Task<HashSet<string>> SeedCountriesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var file = SeedResource.Load<CountryFile>("countries.json");
        Require(file.Countries.Count > 0, "countries.json içinde hiç ülke yok.");

        var existing = await dbContext.Countries
            .ToDictionaryAsync(x => x.Code, StringComparer.Ordinal, cancellationToken)
            .ConfigureAwait(false);

        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var row in file.Countries)
        {
            // Bozuk seed verisi sessizce geçmez — LanguageSeedData ile aynı kalıp.
            var code = CountryCode.Normalize(row.Code);
            Require(seen.Add(code), $"countries.json içinde tekrar eden ülke kodu: '{code}'.");
            Require(
                !string.IsNullOrWhiteSpace(row.EnglishName),
                $"countries.json: '{code}' satırının englishName'i boş.");

            if (existing.TryGetValue(code, out var country))
            {
                country.EnglishName = row.EnglishName;
            }
            else
            {
                dbContext.Countries.Add(new Country { Code = code, EnglishName = row.EnglishName });
            }
        }

        // Dönen küme şehir doğrulaması için: kaynakta olmayan ama veritabanında duran
        // ülkeler de geçerli hedeftir (silmiyoruz).
        seen.UnionWith(existing.Keys);
        return seen;
    }

    private static async Task<int> SeedCurrenciesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var file = SeedResource.Load<CurrencyFile>("currencies.json");
        Require(file.Currencies.Count > 0, "currencies.json içinde hiç para birimi yok.");

        var existing = await dbContext.Currencies
            .ToDictionaryAsync(x => x.Code, StringComparer.Ordinal, cancellationToken)
            .ConfigureAwait(false);

        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var row in file.Currencies)
        {
            var code = CurrencyCode.Normalize(row.Code);
            Require(seen.Add(code), $"currencies.json içinde tekrar eden para birimi kodu: '{code}'.");

            // Bu alan yanlışsa para 10-100 kat kayar ve hiçbir yerde hata vermez;
            // veri katmanında CHECK var, burada da kapı: hata seed anında görünsün.
            Require(
                row.MinorUnits >= 0 && row.MinorUnits <= CurrencyCode.MaxMinorUnits,
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"currencies.json: '{code}' için minorUnits {row.MinorUnits} — ISO 4217 üssü 0-4 arasında olmalı."));

            var symbol = string.IsNullOrWhiteSpace(row.Symbol) ? null : row.Symbol.Trim();

            if (existing.TryGetValue(code, out var currency))
            {
                currency.EnglishName = row.EnglishName;
                currency.MinorUnits = row.MinorUnits;
                currency.Symbol = symbol;
            }
            else
            {
                dbContext.Currencies.Add(new Currency
                {
                    Code = code,
                    EnglishName = row.EnglishName,
                    MinorUnits = row.MinorUnits,
                    Symbol = symbol,
                });
            }
        }

        return seen.Count;
    }

    /// <summary>
    /// Kur anlık görüntüsü. <b>Diğer seed'lerden farklı davranıyor</b>: mevcut satırlar
    /// GÜNCELLENMİYOR, yalnız hiç <see cref="ExchangeRateSource.Seed"/> anlık görüntüsü
    /// yoksa bir tane yazılıyor.
    ///
    /// <para>Gerekçe: bu tablo bir kayıt defteri değil, <b>zaman serisi</b>. Ülke listesi
    /// "en güncel hâli doğru" mantığıyla üzerine yazılabilir; bir kur ölçümü ise
    /// geçmişte kalmış bir olgudur ve Blok 9 rezervasyona <c>snapshot_id</c> yazacak.
    /// Üzerine yazılsaydı, geçmiş bir rezervasyonun "o an hangi kuru gösterdik"
    /// cevabı geriye dönük değişirdi.</para>
    ///
    /// <para>Gerçek servis geldiğinde (Faz 7) o yeni anlık görüntüler ekleyecek ve
    /// çözücü en yenisini okuyor; bu satırlar kendiliğinden devre dışı kalacak.</para>
    /// </summary>
    private static async Task<int> SeedExchangeRatesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.ExchangeRateSnapshots
            .AnyAsync(x => x.Source == ExchangeRateSource.Seed, cancellationToken)
            .ConfigureAwait(false);

        if (exists)
        {
            return 0;
        }

        var file = SeedResource.Load<ExchangeRateFile>("exchange-rates.json");
        Require(file.Rates.Count > 0, "exchange-rates.json içinde hiç kur yok.");

        var pivot = CurrencyCode.Normalize(file.Pivot);

        // Pivot'un kendi satırı olmadan çözücü "kaynak pivot mu" diye dallanmak zorunda
        // kalırdı; o dal bir gün unutulur ve EUR→EUR çevrimi patlardı.
        Require(
            file.Rates.ContainsKey(pivot),
            $"exchange-rates.json: pivot '{pivot}' kendi oran satırına sahip değil.");

        // Gelecek damgalı bir anlık görüntü asla bayatlamaz ve sonraki tüm gerçek
        // çekimleri kalıcı olarak gölgelerdi (ExchangeRateSnapshot sınıf notu).
        var now = DateTimeOffset.UtcNow;
        Require(
            file.CapturedAtUtc <= now,
            $"exchange-rates.json: capturedAtUtc gelecekte ({file.CapturedAtUtc:O}).");

        var known = await dbContext.Currencies
            .Select(x => x.Code)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var registry = new HashSet<string>(known, StringComparer.Ordinal);

        var snapshot = new ExchangeRateSnapshot
        {
            Id = Guid.CreateVersion7(),
            PivotCurrencyCode = pivot,
            CapturedAtUtc = file.CapturedAtUtc,
            Source = ExchangeRateSource.Seed,
            CreatedAtUtc = now,
        };

        dbContext.ExchangeRateSnapshots.Add(snapshot);

        var written = 0;

        foreach (var (rawCode, rate) in file.Rates)
        {
            var code = CurrencyCode.Normalize(rawCode);

            // Kayıt defterinde olmayan kod FK'ye çarpardı; hata orada "insert or update
            // violates foreign key" derdi ve hangi satır olduğunu söylemezdi.
            Require(registry.Contains(code), $"exchange-rates.json: '{code}' currencies.json'da yok.");

            // Sıfır ya da negatif oran bölme hatası ya da negatif fiyat üretirdi.
            Require(rate > 0, $"exchange-rates.json: '{code}' oranı pozitif olmalı ({rate}).");

            dbContext.ExchangeRates.Add(new ExchangeRate
            {
                SnapshotId = snapshot.Id,
                CurrencyCode = code,
                RatePerPivot = rate,
            });

            written++;
        }

        return written;
    }

    private static async Task<int> SeedCategoriesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var file = SeedResource.Load<CategoryFile>("categories.json");
        Require(file.Categories.Count > 0, "categories.json içinde hiç kategori yok.");

        var existing = await dbContext.Categories
            .ToDictionaryAsync(x => x.Slug, StringComparer.Ordinal, cancellationToken)
            .ConfigureAwait(false);

        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var row in file.Categories)
        {
            var slug = RequireSlug(row.Slug, Category.MaxSlugLength, "categories.json");
            Require(seen.Add(slug), $"categories.json içinde tekrar eden slug: '{slug}'.");

            if (existing.TryGetValue(slug, out var category))
            {
                category.SortOrder = row.SortOrder;
                category.IsActive = true;
            }
            else
            {
                dbContext.Categories.Add(new Category
                {
                    Slug = slug,
                    SortOrder = row.SortOrder,
                    IsActive = true,
                });
            }
        }

        // Kaynaktan çıkarılan kategori SİLİNMEZ, kapatılır: ona bağlı deneyimler
        // (Blok 5) FK'yi korur, yeni deneyimde seçilemez.
        foreach (var (slug, category) in existing)
        {
            if (!seen.Contains(slug))
            {
                category.IsActive = false;
            }
        }

        return seen.Count;
    }

    private static async Task<(int Cities, int Aliases)> SeedCitiesAsync(
        AppDbContext dbContext,
        HashSet<string> countryCodes,
        CancellationToken cancellationToken)
    {
        var file = SeedResource.Load<CityFile>("cities.json");
        Require(file.Cities.Count > 0, "cities.json içinde hiç şehir yok.");

        var existing = await dbContext.Cities
            .Include(x => x.Aliases)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var byKey = new Dictionary<(string Country, string Slug), City>();
        foreach (var city in existing)
        {
            byKey[(city.CountryCode, city.Slug)] = city;
        }

        var seen = new HashSet<(string Country, string Slug)>();
        var aliasCount = 0;

        foreach (var row in file.Cities)
        {
            var country = CountryCode.Normalize(row.Country);
            Require(
                countryCodes.Contains(country),
                $"cities.json: '{row.Name}' satırı kayıt defterinde olmayan bir ülkeyi gösteriyor: '{country}'.");

            var slug = RequireSlug(row.Slug, City.MaxNameLength, "cities.json");
            Require(seen.Add((country, slug)), $"cities.json içinde tekrar eden şehir anahtarı: {country}/{slug}.");

            RequireName(row.Name, slug, nameof(row.Name));
            RequireName(row.EnglishName, slug, nameof(row.EnglishName));
            RequireCoordinates(row, slug);
            RequireTimeZone(row, slug);

            if (byKey.TryGetValue((country, slug), out var city))
            {
                city.Name = row.Name;
                city.EnglishName = row.EnglishName;
                city.TimeZoneId = row.TimeZoneId;
                city.Latitude = row.Latitude;
                city.Longitude = row.Longitude;
            }
            else
            {
                city = new City
                {
                    CountryCode = country,
                    Slug = slug,
                    Name = row.Name,
                    EnglishName = row.EnglishName,
                    TimeZoneId = row.TimeZoneId,
                    Latitude = row.Latitude,
                    Longitude = row.Longitude,
                };

                dbContext.Cities.Add(city);
            }

            var desired = BuildAliases(row);
            SyncAliases(dbContext, city, desired);
            aliasCount += desired.Count;
        }

        return (seen.Count, aliasCount);
    }

    /// <summary>
    /// Alias satırlarını kaynakla eşitler. Alias tamamen türetilmiş veri: kimse ona FK ile
    /// bağlanmıyor ve kaynaktan çıkmış bayat bir yazım, yanlış şehri döndürür — bu yüzden
    /// burada silme YAPILIYOR (diğer tablolarda yapılmıyor).
    /// </summary>
    private static void SyncAliases(AppDbContext dbContext, City city, Dictionary<string, string> desired)
    {
        // Anlık görüntü: aşağıda city.Aliases'e ekleme yapılıyor, üzerinde dolaşılamaz.
        var current = city.Aliases.ToDictionary(x => x.NormalizedName, StringComparer.Ordinal);

        foreach (var (normalized, alias) in current)
        {
            if (!desired.ContainsKey(normalized))
            {
                dbContext.CityAliases.Remove(alias);
            }
        }

        foreach (var (normalized, display) in desired)
        {
            if (current.TryGetValue(normalized, out var alias))
            {
                alias.DisplayName = display;
                continue;
            }

            // Navigation üzerinden ekleniyor: CityId'yi EF ilişki düzeltmesiyle kendisi
            // yazıyor ve yeni şehir + alias aynı SaveChanges'te doğru sırayla INSERT ediliyor.
            city.Aliases.Add(new CityAlias
            {
                NormalizedName = normalized,
                DisplayName = display,
            });
        }
    }

    private static Dictionary<string, string> BuildAliases(CitySeedRow row)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);

        // Endonim ve İngilizce exonim OTOMATİK alias — cities.json'da tekrarlanmıyor.
        AddAlias(result, row.Name);
        AddAlias(result, row.EnglishName);

        foreach (var alias in row.Aliases ?? [])
        {
            AddAlias(result, alias);
        }

        Require(result.Count > 0, $"cities.json: '{row.Slug}' için tek bir aranabilir yazım bile üretilemedi.");

        return result;
    }

    private static void AddAlias(Dictionary<string, string> target, string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return;
        }

        var display = raw.Trim();
        Require(
            display.Length <= SearchText.MaxLength,
            string.Create(
                CultureInfo.InvariantCulture,
                $"cities.json: alias çok uzun ({display.Length} karakter): '{display}'."));

        var folded = SearchText.Fold(display);
        if (folded.Length == 0)
        {
            return;
        }

        target.TryAdd(folded, display);

        // Çok kelimeli adlarda kelime başları da ayrı satır olarak yazılıyor:
        // "New York" → "york", "Český Krumlov" → "krumlov". Sorgunun saf önek taraması
        // kalması için — '%kelime%' araması index kullanamaz ve şehir sayısı büyüdükçe
        // her tuş vuruşu tam tarama olur.
        var separator = folded.IndexOf(' ');
        while (separator >= 0 && separator + 1 < folded.Length)
        {
            target.TryAdd(folded[(separator + 1)..], display);
            separator = folded.IndexOf(' ', separator + 1);
        }
    }

    private static string RequireSlug(string? candidate, int maxLength, string fileName)
    {
        var slug = candidate?.Trim() ?? string.Empty;

        Require(slug.Length > 0, $"{fileName}: slug boş olamaz.");
        Require(slug.Length <= maxLength, $"{fileName}: slug çok uzun: '{slug}'.");

        // Slug'ın kendisi zaten katlanmış biçimde olmalı — aksi halde kimlik anahtarı
        // aksanlı/büyük harfli olur ve URL'de yeniden yazılması gerekir.
        Require(
            string.Equals(slug, SearchText.ToSlug(slug), StringComparison.Ordinal),
            $"{fileName}: '{slug}' geçerli bir slug değil — küçük harf, aksansız, tire ayraçlı olmalı.");

        return slug;
    }

    private static void RequireName(string? value, string slug, string field)
        => Require(
            !string.IsNullOrWhiteSpace(value) && value.Length <= City.MaxNameLength,
            string.Create(
                CultureInfo.InvariantCulture,
                $"cities.json: '{slug}' satırının {field} alanı boş ya da {City.MaxNameLength} karakterden uzun."));

    private static void RequireCoordinates(CitySeedRow row, string slug)
    {
        Require(
            row.Latitude is >= -90d and <= 90d && row.Longitude is >= -180d and <= 180d,
            string.Create(
                CultureInfo.InvariantCulture,
                $"cities.json: '{slug}' koordinatı aralık dışında ({row.Latitude}, {row.Longitude})."));

        // (0, 0) Gine Körfezi'nde bir deniz noktası; veri setlerinde pratikte
        // "koordinat girilmemiş" demektir. Blok 8'in yakınlık sorgusu bunu sessizce
        // "Afrika açıklarında bir şehir" sanır.
        Require(
            row.Latitude is not 0d || row.Longitude is not 0d,
            $"cities.json: '{slug}' koordinatı (0, 0) — eksik veri. Doğrusu bilinmiyorsa şehir eklenmez.");
    }

    private static void RequireTimeZone(CitySeedRow row, string slug)
    {
        Require(
            !string.IsNullOrWhiteSpace(row.TimeZoneId) && row.TimeZoneId.Length <= City.MaxTimeZoneIdLength,
            $"cities.json: '{slug}' satırının timeZoneId alanı boş ya da çok uzun.");

        // Çözülemeyen bir saat dilimi sessizce kabul edilirse Blok 7 seans saatlerini
        // yanlış yerel saatte gösterir — ve bu, testte değil kullanıcıda ortaya çıkar.
        Require(
            TimeZoneInfo.TryFindSystemTimeZoneById(row.TimeZoneId, out _),
            $"cities.json: '{slug}' satırının saat dilimi çözülemedi: '{row.TimeZoneId}'. " +
            "IANA kimliği yanlış ya da makinenin tzdata'sı eski (Windows kimliği YAZILMAZ).");
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    // Kök koleksiyon adları AÇIKÇA yazılı (LanguageSeedData ile aynı kalıp): dosyanın
    // şekli koddan okunabilsin ve bir adlandırma politikası değişikliği seed'i sessizce
    // "0 satır" haline getirmesin.
    private sealed record CountryFile(
        [property: JsonPropertyName("countries")] IReadOnlyList<CountrySeedRow> Countries);

    private sealed record CountrySeedRow(string Code, string EnglishName);

    private sealed record CurrencyFile(
        [property: JsonPropertyName("currencies")] IReadOnlyList<CurrencySeedRow> Currencies);

    private sealed record CurrencySeedRow(string Code, string EnglishName, int MinorUnits, string? Symbol);

    /// <param name="Rates">
    /// <c>{ "TRY": 47.8 }</c> — "1 ana birim pivot = bu kadar ana birim TRY". Sözlük,
    /// liste değil: aynı kodun iki kez yazılması JSON düzeyinde zaten anlamsız ve
    /// tekrar kontrolü için ayrıca kod yazmaya gerek kalmıyor.
    /// </param>
    private sealed record ExchangeRateFile(
        [property: JsonPropertyName("pivot")] string Pivot,
        [property: JsonPropertyName("capturedAtUtc")] DateTimeOffset CapturedAtUtc,
        [property: JsonPropertyName("rates")] IReadOnlyDictionary<string, decimal> Rates);

    private sealed record CategoryFile(
        [property: JsonPropertyName("categories")] IReadOnlyList<CategorySeedRow> Categories);

    private sealed record CategorySeedRow(string Slug, int SortOrder);

    private sealed record CityFile(
        [property: JsonPropertyName("cities")] IReadOnlyList<CitySeedRow> Cities);

    private sealed record CitySeedRow(
        string Slug,
        string Country,
        string Name,
        string EnglishName,
        IReadOnlyList<string>? Aliases,
        string TimeZoneId,
        double Latitude,
        double Longitude);
}

/// <param name="ChangedRows">
/// <c>SaveChanges</c>'in bildirdiği etkilenen satır sayısı. <b>İkinci koşuda 0 olmalı</b> —
/// idempotentliğin tek satırlık kanıtı budur.
/// </param>
/// <param name="ExchangeRates">
/// Yazılan kur satırı sayısı. <b>İkinci koşuda 0</b> ve bu diğer sayaçlardan farklı
/// bir anlam taşıyor: kur tablosu bir zaman serisi, üzerine yazılmıyor — mevcut bir
/// seed anlık görüntüsü varsa hiç dokunulmuyor.
/// </param>
public sealed record ReferenceDataSeedResult(
    int Countries,
    int Cities,
    int CityAliases,
    int Currencies,
    int Categories,
    int ExchangeRates,
    int ChangedRows);
