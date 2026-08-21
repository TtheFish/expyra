using Shouldly;
using Expyra.Application.Features.Places.Queries.SearchCities;

namespace Expyra.Application.UnitTests.Features.Places;

/// <summary>
/// Kabul kriteri 3'ün sunucu tarafı: seçilmeyen ya da anlamsız bir arama metni
/// SESSİZCE yok sayılmaz. Yok sayılsaydı istemci "İstanbul'da ara" sanırken tüm
/// dünyanın ilk 20 şehrini alırdı ve bunu fark etmenin yolu olmazdı.
/// </summary>
public sealed class SearchCitiesQueryValidatorTests
{
    private static bool IsValid(string? query, string? country = null)
        => new SearchCitiesQueryValidator().Validate(new SearchCitiesQuery(query, country)).IsValid;

    [Theory]
    [InlineData("pra")]
    [InlineData("İs")]
    [InlineData("  praha  ")]
    public void GecerliArama(string query)
    {
        IsValid(query).ShouldBeTrue();
    }

    [Fact]
    public void OlcutYoksa_Gecersiz()
    {
        IsValid(query: null, country: null).ShouldBeFalse();
        IsValid(query: "   ", country: null).ShouldBeFalse();
    }

    [Fact]
    public void YalnizUlke_Gecerli()
    {
        // "Çekya'daki şehirleri listele" akışı: metin olmadan da anlamlı bir sorgu.
        IsValid(query: null, country: "CZ").ShouldBeTrue();
        IsValid(query: null, country: "cz").ShouldBeTrue();
    }

    [Theory]
    [InlineData("p")]
    [InlineData("%")]                 // katlandıktan sonra sıfır harf
    [InlineData("!!")]
    [InlineData("_")]
    public void KisaVeyaHarfsizMetin_Gecersiz(string query)
    {
        // Uzunluk KATLANMIŞ metin üzerinden ölçülüyor: "!!" iki karakter ama sıfır harf.
        // Ham uzunluğa bakan bir kural bunu geçerli sayar ve sorgu tüm şehirleri döndürürdü.
        IsValid(query).ShouldBeFalse();
    }

    [Theory]
    [InlineData("CZE")]
    [InlineData("C")]
    [InlineData("1Z")]
    public void GecersizUlkeKodu_Gecersiz(string country)
    {
        IsValid(query: "praha", country: country).ShouldBeFalse();
    }

    [Fact]
    public void CokUzunMetin_Gecersiz()
    {
        IsValid(new string('a', 500)).ShouldBeFalse();
    }

    [Fact]
    public void LimitSabiti_KabulKriteri2()
    {
        // Kabul kriteri 2 bir sayıya bağlı; sayı kod tabanında tek yerde dursun.
        SearchCitiesQuery.MaxResults.ShouldBe(20);
    }
}
