using Shouldly;
using Expyra.Domain.Pricing;

namespace Expyra.Application.UnitTests.Domain.Pricing;

/// <summary>
/// Ödeme sağlayıcısının ISO'dan ayrıştığı yerler. Bu testlerin varlık sebebi tek bir
/// cümle: sağlayıcı ISK'yi iki ondalıklı bekliyor, ISO ise sıfır diyor — ve aradaki
/// fark yüz kat.
/// </summary>
public sealed class PaymentCurrencyRulesTests
{
    private static PaymentCurrencyRules Rules() => new(
        exponentOverrides: new Dictionary<string, int>(StringComparer.Ordinal) { ["ISK"] = 2, ["UGX"] = 2 },
        minimums: new Dictionary<string, long>(StringComparer.Ordinal)
        {
            ["EUR"] = 50,
            ["JPY"] = 50,
            ["CZK"] = 1500,
        },
        maximums: new Dictionary<string, long>(StringComparer.Ordinal) { ["INR"] = 999_999_999 },
        defaultMaximum: 99_999_999);

    [Fact]
    public void SiradanParaBiriminde_UsDegismiyor()
    {
        Rules().ProviderExponent("EUR", 2).ShouldBe(2);
        Rules().ToProviderAmount(4800, "EUR", 2).ShouldBe(4800);
    }

    [Fact]
    public void SifirOndalikliParaBiriminde_UsDegismiyor()
    {
        // JPY'de sağlayıcı da ISO da sıfır diyor — burada bir sürpriz yok.
        Rules().ProviderExponent("JPY", 0).ShouldBe(0);
        Rules().ToProviderAmount(8160, "JPY", 0).ShouldBe(8160);
    }

    [Fact]
    public void ISK_SaglayiciyaGiderkenYUZILECarpiliyor()
    {
        // ISO: 5 ISK = AmountMinor 5 (küsurat yok).
        // Sağlayıcı: "5 ISK için amount = 500".
        // Dönüşüm atlanırsa yüzde bir tahsil edilir.
        Rules().ProviderExponent("ISK", 0).ShouldBe(2);
        Rules().ToProviderAmount(5, "ISK", 0).ShouldBe(500);
        Rules().ToProviderAmount(1200, "ISK", 0).ShouldBe(120_000);
    }

    [Fact]
    public void SaglayiciUssuISOdanKucukse_YuksekSeslePatliyor()
    {
        // Bölme kayıp demek. Sessizce kuruş kaybetmektense patlamak doğru.
        var ters = new PaymentCurrencyRules(
            exponentOverrides: new Dictionary<string, int>(StringComparer.Ordinal) { ["KWD"] = 2 },
            minimums: new Dictionary<string, long>(StringComparer.Ordinal),
            maximums: new Dictionary<string, long>(StringComparer.Ordinal),
            defaultMaximum: 99_999_999);

        Should.Throw<InvalidOperationException>(() => ters.ToProviderAmount(15_840, "KWD", 3))
            .Message.ShouldContain("KWD");
    }

    // -----------------------------------------------------------------------
    // Alt ve üst sınırlar
    // -----------------------------------------------------------------------

    [Fact]
    public void AltSinir_ISOMinorBiriminde()
    {
        // 0.50 EUR = 50 minör; iki tarafın üssü aynı, dönüşüm yok.
        Rules().MinimumChargeIsoMinor("EUR", 2).ShouldBe(50);

        // 50 JPY = 50 minör (yen'in altı yok).
        Rules().MinimumChargeIsoMinor("JPY", 0).ShouldBe(50);

        // 15.00 CZK = 1500 minör.
        Rules().MinimumChargeIsoMinor("CZK", 2).ShouldBe(1500);
    }

    [Fact]
    public void BilinmeyenParaBiriminde_AltSinirYOK()
    {
        // Uydurma bir alt sınır, geçerli fiyatları reddetmekten kötü.
        Rules().MinimumChargeIsoMinor("TRY", 2).ShouldBeNull();
    }

    [Fact]
    public void UstSinir_VarsayilanVeIstisna()
    {
        // Çoğu para biriminde 8 hane.
        Rules().MaximumChargeIsoMinor("EUR", 2).ShouldBe(99_999_999);

        // INR istisnası.
        Rules().MaximumChargeIsoMinor("INR", 2).ShouldBe(999_999_999);
    }

    [Fact]
    public void ISK_SinirlariDaISOUssuneCevriliyor()
    {
        // Tablo sağlayıcının üssünde; kıyaslama ISO üssünde yapılıyor, yoksa
        // ISK fiyatları yüz kat yanlış sınıra çarpardı.
        Rules().MaximumChargeIsoMinor("ISK", 0).ShouldBe(999_999);
    }
}
