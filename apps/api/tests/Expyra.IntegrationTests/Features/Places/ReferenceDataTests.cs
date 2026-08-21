using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Catalog.Queries.GetCategories;
using Expyra.Application.Features.Places.Queries.GetCountries;
using Expyra.Application.Features.Pricing.Queries.GetCurrencies;
using Expyra.Domain.Common;
using Expyra.Infrastructure.Persistence.Seed;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Places;

/// <summary>
/// Kayıt defteri uçları + seed'in idempotentliği.
///
/// <para>Seed testinin gerçek konusu PLAN Blok 4'ün riski: veri migration'a gömülmediği
/// için komutun tekrar tekrar çalıştırılması olağan (yeni şehir eklendiğinde). İkinci
/// koşu satır ÜRETİRSE kayıt defteri sessizce ikizlenir ve arama aynı şehri iki kez
/// döndürür.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ReferenceDataTests(ApiFactory factory)
{
    private const string CountriesPath = "/api/places/countries";
    private const string CategoriesPath = "/api/categories";
    private const string CurrenciesPath = "/api/currencies";

    [Fact]
    public async Task Seed_IkiKezCalisinca_SatirSayisiDegismez()
    {
        // Fixture zaten bir kez seed etti; bu, ikinci (ve üçüncü) koşu.
        var before = await CountRowsAsync();

        var result = await factory.QueryAsync(db => ReferenceDataSeeder.SeedAsync(db));

        var after = await CountRowsAsync();

        after.ShouldBe(before);

        // Daha keskin kanıt: hiçbir satır DEĞİŞMEDİ bile. Sayılar aynı kalıp içerik
        // değişseydi (ör. alias silinip yenisi eklenseydi) yukarıdaki eşitlik yalan söylerdi.
        result.ChangedRows.ShouldBe(0);
    }

    [Fact]
    public async Task Seed_KaynaktakiSehirlerinTamaminiYazar()
    {
        var cityCount = await factory.QueryAsync(db => db.Cities.AsNoTracking().CountAsync());
        var aliasCount = await factory.QueryAsync(db => db.CityAliases.AsNoTracking().CountAsync());

        cityCount.ShouldBeGreaterThan(100);

        // Her şehir en az kendi adı ve İngilizce adıyla aranabiliyor.
        aliasCount.ShouldBeGreaterThan(cityCount);
    }

    /// <summary>
    /// Alias'ın veritabanına KATLANMIŞ hâliyle yazıldığını doğrular. Ham hâliyle
    /// yazılsaydı sorgu tarafındaki katlama hiçbir şeyle eşleşmezdi ve arama sessizce
    /// boş dönerdi — kırmızı test değil, "sonuç bulunamadı" ekranı.
    /// </summary>
    [Fact]
    public async Task CityAlias_KatlanmisHalindeSaklanir()
    {
        var aliases = await factory.QueryAsync(db => db.CityAliases.AsNoTracking()
            .Select(x => x.NormalizedName)
            .Take(500)
            .ToListAsync());

        aliases.ShouldAllBe(x => x == SearchText.Fold(x));
    }

    /// <summary>Kabul kriteri 4: JPY 0, KWD 3.</summary>
    [Fact]
    public async Task Currencies_MinorUnitsDogru()
    {
        var client = factory.CreateClient();

        var currencies = await GetAsync<CurrencyResponse>(client, CurrenciesPath);

        currencies.Single(x => x.Code == "JPY").MinorUnits.ShouldBe(0);
        currencies.Single(x => x.Code == "KWD").MinorUnits.ShouldBe(3);
        currencies.Single(x => x.Code == "BHD").MinorUnits.ShouldBe(3);
        currencies.Single(x => x.Code == "ISK").MinorUnits.ShouldBe(0);
        currencies.Single(x => x.Code == "TRY").MinorUnits.ShouldBe(2);
        currencies.Single(x => x.Code == "EUR").MinorUnits.ShouldBe(2);
    }

    [Fact]
    public async Task Countries_TamListeVeSehirSayisi()
    {
        var client = factory.CreateClient();

        var all = await GetAsync<CountryResponse>(client, CountriesPath);

        // ISO 3166-1'de resmî olarak atanmış 249 kod var; liste eksikse host
        // onboarding'inde bir ülke seçilemez hale gelir.
        all.Count.ShouldBe(249);
        all.ShouldContain(x => x.Code == "CZ");
        all.ShouldContain(x => x.Code == "TR");
        all.Single(x => x.Code == "CZ").CityCount.ShouldBeGreaterThan(0);

        var withCities = await GetAsync<CountryResponse>(client, CountriesPath + "?onlyWithCities=true");

        withCities.Count.ShouldBeLessThan(all.Count);
        withCities.ShouldAllBe(x => x.CityCount > 0);
    }

    [Fact]
    public async Task Categories_YalnizSlugDoner()
    {
        var client = factory.CreateClient();

        var categories = await GetAsync<CategoryResponse>(client, CategoriesPath);

        categories.Count.ShouldBeInRange(8, 12);
        categories.ShouldAllBe(x => x.Slug == SearchText.ToSlug(x.Slug));

        // Sözleşme kilidi: yanıt gövdesinde ad ya da açıklama alanı YOK — kategori
        // adları Blok 3'ün sözlüğünde (docs/I18N.md §1).
        var raw = await client.GetStringAsync(new Uri(CategoriesPath, UriKind.Relative));

        raw.Contains("name", StringComparison.OrdinalIgnoreCase).ShouldBeFalse();
        raw.Contains("description", StringComparison.OrdinalIgnoreCase).ShouldBeFalse();
    }

    [Theory]
    [InlineData(CountriesPath)]
    [InlineData(CurrenciesPath)]
    [InlineData(CategoriesPath)]
    public async Task KayitDefteriUclari_AnonimVeOnbelleklenebilir(string path)
    {
        // Kimlik başlığı GÖNDERİLMİYOR: şehir/kategori seçici giriş yapmamış misafirin
        // gördüğü ilk şey, oturum istemek arama kutusunu kilitlerdi.
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(path, UriKind.Relative));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var cacheControl = response.Headers.CacheControl;

        cacheControl.ShouldNotBeNull();
        cacheControl.Public.ShouldBeTrue();
        cacheControl.MaxAge.ShouldNotBeNull();
    }

    private async Task<(int Countries, int Cities, int Aliases, int Currencies, int Categories)> CountRowsAsync()
        => await factory.QueryAsync(async db => (
            await db.Countries.AsNoTracking().CountAsync(),
            await db.Cities.AsNoTracking().CountAsync(),
            await db.CityAliases.AsNoTracking().CountAsync(),
            await db.Currencies.AsNoTracking().CountAsync(),
            await db.Categories.AsNoTracking().CountAsync()));

    private static async Task<List<T>> GetAsync<T>(HttpClient client, string path)
    {
        var response = await client.GetAsync(new Uri(path, UriKind.Relative));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<List<T>>(AuthApi.Json))!;
    }
}
