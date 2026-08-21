using System.Globalization;
using Shouldly;
using Expyra.Domain.Places;

namespace Expyra.Application.UnitTests.Domain.Places;

public sealed class CountryCodeTests
{
    [Theory]
    [InlineData("cz", "CZ")]
    [InlineData("CZ", "CZ")]
    [InlineData("  tr  ", "TR")]
    [InlineData("de", "DE")]
    public void TryNormalize_GecerliGirdi_BuyukHarfeIndirger(string input, string expected)
    {
        CountryCode.TryNormalize(input, out var normalized).ShouldBeTrue();
        normalized.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("C")]
    [InlineData("CZE")]                      // alpha-3 kullanılmıyor
    [InlineData("C1")]
    [InlineData("203")]                      // sayısal kod kullanılmıyor
    [InlineData("cz; drop table city")]
    public void TryNormalize_GecersizGirdi_FalseDoner(string? input)
    {
        CountryCode.TryNormalize(input, out var normalized).ShouldBeFalse();
        normalized.ShouldBeEmpty();
        CountryCode.IsValid(input).ShouldBeFalse();
    }

    /// <summary>
    /// Bu testin varlık sebebi: Türkçe kültürde "ci".ToUpper() → "Cİ" olur ve
    /// Côte d'Ivoire ('CI') hiçbir satırla eşleşmez. Hata sunucunun kültür ayarına bağlı
    /// çıkar — geliştiricinin makinesinde değil, prodüksiyonda (LanguageCode.cs aynı tuzak).
    /// </summary>
    [Fact]
    public void TryNormalize_TurkceKulturAltinda_AyniSonucuVerir()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            CountryCode.TryNormalize("ci", out var ivoryCoast).ShouldBeTrue();
            ivoryCoast.ShouldBe("CI");       // Türkçe'de "Cİ" olurdu

            CountryCode.TryNormalize("is", out var iceland).ShouldBeTrue();
            iceland.ShouldBe("IS");          // Türkçe'de "İS" olurdu
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public void Normalize_GecersizGirdi_Firlatir()
    {
        // Seed verisi için: sessizce boş dönmek yerine patlaması gerekir.
        Should.Throw<ArgumentException>(() => CountryCode.Normalize("XYZ"));
    }
}
