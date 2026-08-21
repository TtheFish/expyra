using System.Globalization;
using Shouldly;
using Expyra.Domain.Common;

namespace Expyra.Application.UnitTests.Domain.Common;

public sealed class CurrencyCodeTests
{
    [Theory]
    [InlineData("try", "TRY")]
    [InlineData("EUR", "EUR")]
    [InlineData("  jpy  ", "JPY")]
    [InlineData("kwd", "KWD")]
    public void TryNormalize_GecerliGirdi_BuyukHarfeIndirger(string input, string expected)
    {
        CurrencyCode.TryNormalize(input, out var normalized).ShouldBeTrue();
        normalized.ShouldBe(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("EU")]
    [InlineData("EURO")]
    [InlineData("E1R")]
    [InlineData("₺")]
    public void TryNormalize_GecersizGirdi_FalseDoner(string? input)
    {
        CurrencyCode.TryNormalize(input, out var normalized).ShouldBeFalse();
        normalized.ShouldBeEmpty();
        CurrencyCode.IsValid(input).ShouldBeFalse();
    }

    /// <summary>
    /// Türkçe kültürde "ils".ToUpper() → "İLS". Kod bozulursa Money hiçbir satırla
    /// eşleşmez ve hata yalnız Türkçe locale'li sunucuda çıkar.
    /// </summary>
    [Fact]
    public void TryNormalize_TurkceKulturAltinda_AyniSonucuVerir()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            CurrencyCode.TryNormalize("ils", out var shekel).ShouldBeTrue();
            shekel.ShouldBe("ILS");

            CurrencyCode.TryNormalize("isk", out var krona).ShouldBeTrue();
            krona.ShouldBe("ISK");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }
}
