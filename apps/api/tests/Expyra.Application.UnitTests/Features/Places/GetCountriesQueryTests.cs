using Shouldly;
using Expyra.Application.Features.Places.Queries.GetCountries;
using Expyra.Domain.Places;

namespace Expyra.Application.UnitTests.Features.Places;

/// <summary>
/// Sorgu mantığı <c>IQueryable</c> üzerinde çalıştığı için DB'siz test edilir —
/// <c>GetLanguagesQueryTests</c> ile aynı kalıp.
/// </summary>
public sealed class GetCountriesQueryTests
{
    private static IQueryable<Country> Countries()
    {
        var czechia = new Country { Code = "CZ", EnglishName = "Czechia" };
        czechia.Cities.Add(NewCity(czechia, "prague", "Praha", "Prague"));
        czechia.Cities.Add(NewCity(czechia, "brno", "Brno", "Brno"));

        var turkiye = new Country { Code = "TR", EnglishName = "Türkiye" };
        turkiye.Cities.Add(NewCity(turkiye, "istanbul", "İstanbul", "Istanbul"));

        var andorra = new Country { Code = "AD", EnglishName = "Andorra" };

        return new List<Country> { turkiye, andorra, czechia }.AsQueryable();
    }

    private static City NewCity(Country country, string slug, string name, string englishName)
        => new()
        {
            CountryCode = country.Code,
            Slug = slug,
            Name = name,
            EnglishName = englishName,
            TimeZoneId = "Europe/Prague",
            Latitude = 50,
            Longitude = 14,
        };

    [Fact]
    public void Project_TumUlkeler_SiralamaIngilizceAdaGore()
    {
        var result = GetCountriesQueryHandler.Project(Countries(), onlyWithCities: false).ToList();

        // Deterministik sıra: collation'a bağlı bir yerelleştirilmiş ada göre değil.
        result.Select(x => x.Code).ShouldBe(["AD", "CZ", "TR"]);
    }

    [Fact]
    public void Project_OnlyWithCities_ArziOlmayanUlkeElenir()
    {
        // Şehir seçicinin ülke filtresi: kayıt defterinde tek şehri olmayan ülkeyi
        // göstermek, kullanıcıyı boş sonuca yürütmek demek (VISION §"Arz dağılır").
        var result = GetCountriesQueryHandler.Project(Countries(), onlyWithCities: true).ToList();

        result.Select(x => x.Code).ShouldBe(["CZ", "TR"]);
    }

    [Fact]
    public void Project_CityCount_SorgudanHesaplanir_DenormalizeDegil()
    {
        var result = GetCountriesQueryHandler.Project(Countries(), onlyWithCities: false).ToList();

        result.Single(x => x.Code == "CZ").CityCount.ShouldBe(2);
        result.Single(x => x.Code == "AD").CityCount.ShouldBe(0);
    }

    [Fact]
    public void Project_YerellestirilmisAdDondurmez()
    {
        // Sözleşme kilidi: yanıtta yalnız kod + İngilizce ad var. Buraya bir
        // "localizedName" eklemek, 250 ülkeyi Blok 3'ün sözlüğüne yazmak demek olurdu;
        // istemci adı Intl.DisplayNames ile üretiyor (docs/I18N.md §1).
        typeof(CountryResponse).GetProperties().Select(x => x.Name)
            .ShouldBe(["Code", "EnglishName", "CityCount"], ignoreOrder: true);
    }
}
