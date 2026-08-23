using Shouldly;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Application.UnitTests.Domain.Pricing;

/// <summary>
/// PLAN Blok 7 kabul kriteri 2 ve 3: her tutar <c>(AmountMinor, CurrencyCode)</c>
/// ve çevrilen tutar hiçbir yerde tahsilata girmiyor.
/// </summary>
public sealed class QuoteCalculatorTests
{
    private static Dictionary<GuestType, Money> Prices(
        long adult = 4800, long child = 2400, long? infant = 0, string currency = "EUR")
    {
        var map = new Dictionary<GuestType, Money>
        {
            [GuestType.Adult] = new(adult, currency),
            [GuestType.Child] = new(child, currency),
        };

        if (infant is { } value) map[GuestType.Infant] = new Money(value, currency);

        return map;
    }

    private static Dictionary<GuestType, int> Party(int adults = 2, int children = 0, int infants = 0)
    {
        var map = new Dictionary<GuestType, int>();
        if (adults > 0) map[GuestType.Adult] = adults;
        if (children > 0) map[GuestType.Child] = children;
        if (infants > 0) map[GuestType.Infant] = infants;
        return map;
    }

    [Fact]
    public void ToplamKademelerinToplami()
    {
        var result = QuoteCalculator.Calculate("EUR", Prices(), Party(adults: 2, children: 1), null);

        var quote = result.Value.ShouldNotBeNull();
        quote.Charge.AmountMinor.ShouldBe(2 * 4800 + 2400);
        quote.Charge.Currency.ShouldBe("EUR");
        quote.Headcount.ShouldBe(3);
        quote.Lines.Count.ShouldBe(2);
    }

    [Fact]
    public void SatirlarSABITSirada_SozlugunSirasiylaDegil()
    {
        // Sözlüğe ters sırada yazılıyor; yanıt yine yetişkin→çocuk→bebek olmalı,
        // çünkü istemci bu sırayla çiziyor.
        var party = new Dictionary<GuestType, int>
        {
            [GuestType.Infant] = 1,
            [GuestType.Child] = 1,
            [GuestType.Adult] = 1,
        };

        var quote = QuoteCalculator.Calculate("EUR", Prices(), party, null).Value.ShouldNotBeNull();

        quote.Lines.Select(x => x.Tier)
            .ShouldBe([GuestType.Adult, GuestType.Child, GuestType.Infant]);
    }

    // -----------------------------------------------------------------------
    // Kabul kriteri 3 — çevrim yalnız GÖSTERİM
    // -----------------------------------------------------------------------

    [Fact]
    public void Cevrim_TahsilatiDEGISTIRMIYOR()
    {
        var conversion = new DisplayConversion("TRY", RatePerCharge: 47.5m, ChargeMinorUnits: 2, TargetMinorUnits: 2);

        var quote = QuoteCalculator
            .Calculate("EUR", Prices(), Party(adults: 2), conversion)
            .Value.ShouldNotBeNull();

        // Tahsilat host'un para biriminde ve DOKUNULMAMIŞ.
        quote.Charge.Currency.ShouldBe("EUR");
        quote.Charge.AmountMinor.ShouldBe(9600);

        // Gösterim ayrı bir alanda — aynı alanda birleşselerdi hangisinin tahsil
        // edileceği her çağrı yerinde yeniden sorulurdu.
        var display = quote.Display.ShouldNotBeNull();
        display.Currency.ShouldBe("TRY");
        display.AmountMinor.ShouldBe(456_000);
    }

    [Fact]
    public void CevrimIstenmezse_GosterimNULL()
    {
        // 1.0 oranlı sahte bir nesne üretmek "çevrildi mi" sorusunu cevaplanamaz
        // yapardı; null açık bir cevap.
        QuoteCalculator.Calculate("EUR", Prices(), Party(), null)
            .Value.ShouldNotBeNull()
            .Display.ShouldBeNull();
    }

    [Fact]
    public void UssuSifirParaBirimineCevrim_YuzKatKaymiyor()
    {
        // TUZAK: EUR (üs 2) → JPY (üs 0). Tek üs varsayan bir çevrim 165 yeni
        // 1.65 yen yapardı. Money.ConvertTo iki üssü AYRI istiyor.
        var conversion = new DisplayConversion("JPY", RatePerCharge: 170m, ChargeMinorUnits: 2, TargetMinorUnits: 0);

        var display = QuoteCalculator
            .Calculate("EUR", Prices(), Party(adults: 1), conversion)
            .Value.ShouldNotBeNull()
            .Display.ShouldNotBeNull();

        // 48.00 EUR × 170 = 8160 JPY; yen'in altı olmadığı için minör = ana birim.
        display.AmountMinor.ShouldBe(8160);
        display.Currency.ShouldBe("JPY");
    }

    [Fact]
    public void UcHaneliParaBirimineCevrim()
    {
        // KWD üs 3 (1 dinar = 1000 fils). İki hane varsayan bir kod on kat şaşırır.
        var conversion = new DisplayConversion("KWD", RatePerCharge: 0.33m, ChargeMinorUnits: 2, TargetMinorUnits: 3);

        QuoteCalculator
            .Calculate("EUR", Prices(), Party(adults: 1), conversion)
            .Value.ShouldNotBeNull()
            .Display.ShouldNotBeNull()
            // 48.00 × 0.33 = 15.84 KWD = 15840 fils
            .AmountMinor.ShouldBe(15_840);
    }

    [Fact]
    public void GosterimYuvarlamasiASAGIDegil()
    {
        // Kullanıcıya ödeyeceğinden DÜŞÜK bir sayı göstermek ödeme ekranında
        // sürpriz demek. 1 × 4800 × 1.005 = 4824 (tam); yarım kuruş üreten bir
        // oranla sınayalım.
        var conversion = new DisplayConversion("USD", RatePerCharge: 1.00005m, ChargeMinorUnits: 2, TargetMinorUnits: 2);

        QuoteCalculator
            .Calculate("EUR", Prices(), Party(adults: 1), conversion)
            .Value.ShouldNotBeNull()
            .Display.ShouldNotBeNull()
            // 4800 × 1.00005 = 4800.24 → 4800; yarım noktada yukarı gider.
            .AmountMinor.ShouldBe(4800);
    }

    // -----------------------------------------------------------------------
    // Başarısızlıklar — istisna değil sonuç
    // -----------------------------------------------------------------------

    [Fact]
    public void EksikKademeFiyati_SESSIZCESifirSayilmiyor()
    {
        // Bedava bilet üretmek yerine hangi kademenin eksik olduğunu söylüyoruz.
        var eksik = Prices(infant: null);

        var result = QuoteCalculator.Calculate("EUR", eksik, Party(adults: 1, infants: 1), null);

        result.Value.ShouldBeNull();
        result.Failure.ShouldBe(QuoteFailure.MissingTierPrice);
        result.Tier.ShouldBe(GuestType.Infant);
    }

    [Fact]
    public void IstenmeyenKademeninFiyatiEksikOlabilir()
    {
        // Bebek seçilmediyse bebek fiyatının olmaması sorun değil.
        QuoteCalculator
            .Calculate("EUR", Prices(infant: null), Party(adults: 2), null)
            .Value.ShouldNotBeNull();
    }

    [Fact]
    public void BosGrup_Reddediliyor()
        => QuoteCalculator.Calculate("EUR", Prices(), new Dictionary<GuestType, int>(), null)
            .Failure.ShouldBe(QuoteFailure.EmptyParty);

    [Fact]
    public void SifirKisiSayisiGrubuDoldurmuyor()
        => QuoteCalculator
            .Calculate("EUR", Prices(), new Dictionary<GuestType, int> { [GuestType.Adult] = 0 }, null)
            .Failure.ShouldBe(QuoteFailure.EmptyParty);

    [Fact]
    public void CokBuyukGrup_Reddediliyor()
    {
        var result = QuoteCalculator.Calculate(
            "EUR", Prices(), Party(adults: PricingRules.MaxPartySize + 1), null);

        result.Failure.ShouldBe(QuoteFailure.PartyTooLarge);
        result.Headcount.ShouldBe(PricingRules.MaxPartySize + 1);
    }

    [Fact]
    public void KademeParaBirimiSayfaylaCelisirse_YuksekSeslePatliyor()
    {
        // Veri bozukluğu. Money.Add zaten patlardı ama hata "farklı para birimleri"
        // derdi ve hangi kademenin bozuk olduğu görünmezdi.
        var bozuk = Prices();
        bozuk[GuestType.Child] = new Money(2400, "TRY");

        Should.Throw<InvalidOperationException>(
            () => QuoteCalculator.Calculate("EUR", bozuk, Party(adults: 1, children: 1), null))
            .Message.ShouldContain("Child");
    }

    [Fact]
    public void BedavaBebek_SifirTutarGecerli()
    {
        // Host bebeği ücretsiz yapabilir: 0 geçerli bir fiyat, eksik fiyat değil.
        var quote = QuoteCalculator
            .Calculate("EUR", Prices(infant: 0), Party(adults: 2, infants: 1), null)
            .Value.ShouldNotBeNull();

        quote.Charge.AmountMinor.ShouldBe(9600);
        quote.Headcount.ShouldBe(3);
        quote.Lines.ShouldContain(x => x.Tier == GuestType.Infant && x.LineTotal.IsZero);
    }
}
