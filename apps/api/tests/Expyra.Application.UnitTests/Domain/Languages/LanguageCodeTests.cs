using System.Globalization;
using Shouldly;
using Expyra.Domain.Languages;

namespace Expyra.Application.UnitTests.Domain.Languages;

public sealed class LanguageCodeTests
{
    [Theory]
    [InlineData("en", "en")]
    [InlineData("EN", "en")]
    [InlineData("  de  ", "de")]
    [InlineData("pt-br", "pt-BR")]
    [InlineData("PT-BR", "pt-BR")]
    [InlineData("en_US", "en-US")]          // Java/POSIX biçimi yaygın bir yanlış ayraç
    [InlineData("zh-hans", "zh-Hans")]
    [InlineData("sr-latn-rs", "sr-Latn-RS")]
    public void TryNormalize_GecerliGirdi_TekBicimeIndirger(string input, string expected)
    {
        LanguageCode.TryNormalize(input, out var normalized).ShouldBeTrue();
        normalized.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("e")]                        // tek harf dil kodu yok
    [InlineData("english")]                  // dil adı, kod değil
    [InlineData("en-")]                      // boş parça
    [InlineData("en-US-x-private-long")]     // 3 parçadan uzun
    [InlineData("en US")]
    [InlineData("tr;drop table language")]
    public void TryNormalize_GecersizGirdi_FalseDoner(string? input)
    {
        LanguageCode.TryNormalize(input, out var normalized).ShouldBeFalse();
        normalized.ShouldBeEmpty();
        LanguageCode.IsValid(input).ShouldBeFalse();
    }

    /// <summary>
    /// Bu testin varlık sebebi: Türkçe kültürde "i".ToUpper() → "İ" olur.
    /// Kültüre duyarlı bir dönüşüm kullanılırsa dil kodları SADECE Türkçe locale'li
    /// makinelerde bozulur — yani geliştiricinin makinesinde değil, sunucuda.
    /// docs/ROADMAP.md §Faz 7 aynı tuzağı bilet PDF'inde not ediyor.
    /// </summary>
    [Fact]
    public void TryNormalize_TurkceKulturAltinda_AyniSonucuVerir()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            LanguageCode.TryNormalize("IS", out var icelandic).ShouldBeTrue();
            icelandic.ShouldBe("is");        // "IS".ToLower() Türkçe'de "ıs" olurdu

            LanguageCode.TryNormalize("it-it", out var italian).ShouldBeTrue();
            italian.ShouldBe("it-IT");       // "it".ToUpper() Türkçe'de "İT" olurdu
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public void Normalize_GecersizGirdi_Firlatir()
    {
        // Seed verisi ve sabitler için: sessizce boş dönmek yerine patlaması gerekir.
        Should.Throw<ArgumentException>(() => LanguageCode.Normalize("not-a-language-code"));
    }

    [Theory]
    [InlineData("de-AT", "de")]
    [InlineData("pt-BR", "pt")]
    [InlineData("sr-Latn-RS", "sr")]
    [InlineData("de", null)]                 // zaten kök
    [InlineData("gecersiz", null)]
    public void BaseLanguageOf_FallbackZincirininIkinciAdimi(string input, string? expected)
        => LanguageCode.BaseLanguageOf(input).ShouldBe(expected);
}
