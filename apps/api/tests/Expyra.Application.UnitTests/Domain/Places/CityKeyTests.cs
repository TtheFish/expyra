using Shouldly;
using Expyra.Domain.Places;

namespace Expyra.Application.UnitTests.Domain.Places;

/// <summary>
/// <c>?city=</c> filtresinin çözülmesi. Anahtarın doğru parçalanması bir biçim ayrıntısı
/// değil: yanlış parçalanan bir anahtar, filtrenin sessizce boş sonuç vermesi demek.
/// </summary>
public sealed class CityKeyTests
{
    [Theory]
    [InlineData("cz-prague", "CZ", "prague")]
    [InlineData("tr-istanbul", "TR", "istanbul")]
    // Slug'ın kendisi tire içeriyor: ayrım İLK tireden yapılmalı, sonuncudan değil.
    [InlineData("cz-cesky-krumlov", "CZ", "cesky-krumlov")]
    // Adres çubuğunda büyük harfe dönmüş bağlantı çalışmaya devam etmeli.
    [InlineData("CZ-PRAGUE", "CZ", "prague")]
    [InlineData("  cz-prague  ", "CZ", "prague")]
    [InlineData("de-munich", "DE", "munich")]
    public void TryParse_GecerliAnahtar(string input, string expectedCountry, string expectedSlug)
    {
        CityKey.TryParse(input, out var country, out var slug).ShouldBeTrue();

        // Ülke kodu BÜYÜK harfe normalize: country_code sütununda öyle duruyor.
        country.ShouldBe(expectedCountry);

        // Slug küçük harfli: city.slug sütunuyla birebir ("C" collation, bayt bayt eşleşme).
        slug.ShouldBe(expectedSlug);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    // Ülke kodu yok: yalnız slug benzersiz DEĞİL, iki ülkede aynı slug olabilir.
    [InlineData("prague")]
    [InlineData("c-prague")]
    [InlineData("czz-prague")]
    [InlineData("1z-prague")]
    // Slug boş ya da ayraçla bitiyor.
    [InlineData("cz-")]
    [InlineData("cz-prague-")]
    [InlineData("cz--prague")]
    // Kayıt defterindeki hiçbir slug bu karakterleri taşımıyor; veritabanına kadar
    // taşımanın anlamı yok.
    [InlineData("cz-prag ue")]
    [InlineData("cz-prague!")]
    [InlineData("cz-praha_1")]
    [InlineData("cz-präg")]
    public void TryParse_GecersizAnahtar_False(string? input)
        // False → doğrulayıcı 400. Sessizce yok sayılsaydı istemci "Prag'da ara" sanırken
        // tüm dünyanın ilk 24 ilanını alırdı (Blok 4 kabul kriteri 3'ün aynı ilkesi).
        => CityKey.TryParse(input, out _, out _).ShouldBeFalse();

    [Fact]
    public void TryParse_CokUzunAnahtar_False()
        => CityKey.TryParse("cz-" + new string('a', CityKey.MaxLength), out _, out _).ShouldBeFalse();
}
