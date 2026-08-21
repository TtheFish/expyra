using System.Globalization;
using Shouldly;
using Expyra.Domain.Common;

namespace Expyra.Application.UnitTests.Domain.Common;

/// <summary>
/// <see cref="Money"/>'nin sözleşmesi. Bu testlerin çoğu bir tasarım kararını KİLİTLİYOR:
/// tutar minör birimde tam sayı, yuvarlama açık ve tek bir adımda, farklı para birimi
/// sessizce dönüşmüyor. Blok 7 (fiyat) ve Blok 11 (komisyon) bunlara yaslanıyor.
/// </summary>
public sealed class MoneyTests
{
    [Fact]
    public void Jpy_MinorBirimiYok_TamSayiYenTutariBozulmaz()
    {
        // 100 yen 100'dür; "kuruşu" yoktur. decimal(18,2) seçilseydi bu satır 100.00
        // olurdu ve gösterimde 1.00 yen'e bölünme riski taşırdı.
        var money = new Money(100, "JPY");

        money.ToDecimal(minorUnits: 0).ShouldBe(100m);
    }

    [Fact]
    public void Kwd_UcHaneliMinorBirim_FilsKaybolmaz()
    {
        // 1.234 KWD = 1234 fils. decimal(18,2) bu tutarı 1.23'e yuvarlar ve HER SATIRDA
        // 4 fils kaybeder — biçim sorunu değil, para kaybı.
        var money = new Money(1234, "KWD");

        money.ToDecimal(minorUnits: 3).ShouldBe(1.234m);
    }

    [Fact]
    public void FromDecimal_KwdUcHane_TamTurRoundTrip()
    {
        var money = Money.FromDecimal(1.234m, "KWD", minorUnits: 3, MidpointRounding.ToEven);

        money.AmountMinor.ShouldBe(1234);
        money.ToDecimal(3).ShouldBe(1.234m);
    }

    [Fact]
    public void ParaBirimiKodu_BuyukHarfeNormalizeEdilir()
    {
        new Money(1, "try").Currency.ShouldBe("TRY");
    }

    [Fact]
    public void ParaBirimiKodu_TurkceKulturdeDeBozulmaz()
    {
        // "ils".ToUpper() Türkçe kültürde "İLS" verir; kod bir daha hiçbir satırla
        // eşleşmez. LanguageCode.cs ve EmailAddress.cs'teki aynı tuzak.
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            new Money(1, "ils").Currency.ShouldBe("ILS");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public void GecersizParaBirimi_Firlatir()
    {
        Should.Throw<ArgumentException>(() => new Money(1, "EURO"));
        Should.Throw<ArgumentException>(() => new Money(1, "E1R"));
        Should.Throw<ArgumentException>(() => new Money(1, ""));
    }

    [Fact]
    public void Topla_AyniParaBirimi()
    {
        (new Money(1250, "EUR") + new Money(750, "EUR")).ShouldBe(new Money(2000, "EUR"));
    }

    [Fact]
    public void Cikar_NegatifSonucGecerli()
    {
        // İade ve düzeltme kalemleri negatif tutar taşıyor; tip bunu yasaklamıyor.
        (new Money(500, "EUR") - new Money(800, "EUR")).AmountMinor.ShouldBe(-300);
    }

    [Fact]
    public void Carp_KisiSayisi_YuvarlamaGerekmez()
    {
        (new Money(4999, "TRY") * 3).AmountMinor.ShouldBe(14997);
    }

    [Fact]
    public void FarkliParaBirimi_ToplanamAZ_SessizDonusumYok()
    {
        // Kritik: sessizce çevirip toplayan bir tip, sonucu yanlış olan ama hata
        // vermeyen bir fatura üretir.
        Should.Throw<InvalidOperationException>(() => new Money(100, "EUR") + new Money(100, "TRY"));
        Should.Throw<InvalidOperationException>(() => new Money(100, "EUR") - new Money(100, "TRY"));
        Should.Throw<InvalidOperationException>(() => new Money(100, "EUR").CompareTo(new Money(100, "TRY")));
    }

    [Fact]
    public void Karsilastirma_AyniParaBiriminde()
    {
        (new Money(100, "EUR") < new Money(200, "EUR")).ShouldBeTrue();
        (new Money(200, "EUR") >= new Money(200, "EUR")).ShouldBeTrue();
    }

    [Fact]
    public void Esitlik_TutarVeParaBirimiIleBirlikte()
    {
        new Money(100, "EUR").ShouldBe(new Money(100, "EUR"));
        new Money(100, "EUR").ShouldNotBe(new Money(100, "USD"));
    }

    [Fact]
    public void Allocate_Komisyon_KurusYaratmaz_KaybetmeZ()
    {
        // 1233 kuruşun %15'i 184.95 — tam bölünmüyor. İki pay ayrı ayrı yuvarlansaydı
        // toplamları 1233 tutmazdı ve muhasebe bir kuruş açık verirdi.
        var parts = new Money(1233, "TRY").Allocate(15, 85);

        parts.Count.ShouldBe(2);
        parts.Sum(x => x.AmountMinor).ShouldBe(1233);
        parts[0].AmountMinor.ShouldBe(185);
        parts[1].AmountMinor.ShouldBe(1048);
    }

    [Fact]
    public void Allocate_UcEsitPay_ArtikIlkPaylaraDagitilir()
    {
        var parts = new Money(100, "EUR").Allocate(1, 1, 1);

        parts.Select(x => x.AmountMinor).ShouldBe([34, 33, 33]);
        parts.Sum(x => x.AmountMinor).ShouldBe(100);
    }

    [Fact]
    public void Allocate_NegatifTutar_ToplamiYineKorur()
    {
        // İade dağıtımı: işaret ne olursa olsun parçaların toplamı bütüne eşit kalmalı.
        var parts = new Money(-100, "EUR").Allocate(1, 1, 1);

        parts.Sum(x => x.AmountMinor).ShouldBe(-100);
    }

    [Fact]
    public void Allocate_GecersizOran_Firlatir()
    {
        Should.Throw<ArgumentException>(() => new Money(100, "EUR").Allocate());
        Should.Throw<ArgumentException>(() => new Money(100, "EUR").Allocate(0, 0));
        Should.Throw<ArgumentException>(() => new Money(100, "EUR").Allocate(-1, 2));
    }

    [Fact]
    public void MultiplyBy_YuvarlamaCagirandanIstenir()
    {
        // 1233 * 0.15 = 184.95. Hangi yöne yuvarlanacağı bir iş kararı; tip karar vermiyor.
        new Money(1233, "TRY").MultiplyBy(0.15m, MidpointRounding.AwayFromZero).AmountMinor.ShouldBe(185);
        new Money(1233, "TRY").MultiplyBy(0.15m, MidpointRounding.ToZero).AmountMinor.ShouldBe(184);
    }

    [Fact]
    public void ConvertTo_HedefinMinorBirimiKullanilir_EurToJpy()
    {
        // 100.00 EUR × 165.5 = 16.550 JPY. Hedefin minör birimi 0: sonuç 16550 "minör"
        // yen, yani 16.550 yen. Tek bir üs varsayan kod burada 100 kat şaşardı.
        var converted = new Money(10_000, "EUR")
            .ConvertTo("JPY", 165.5m, sourceMinorUnits: 2, targetMinorUnits: 0, MidpointRounding.ToEven);

        converted.Currency.ShouldBe("JPY");
        converted.AmountMinor.ShouldBe(16_550);
        converted.ToDecimal(0).ShouldBe(16_550m);
    }

    [Fact]
    public void ConvertTo_HedefUcHaneli_EurToKwd()
    {
        // 100.00 EUR × 0.3345 = 33.450 KWD = 33450 fils.
        var converted = new Money(10_000, "EUR")
            .ConvertTo("KWD", 0.3345m, sourceMinorUnits: 2, targetMinorUnits: 3, MidpointRounding.ToEven);

        converted.AmountMinor.ShouldBe(33_450);
        converted.ToDecimal(3).ShouldBe(33.450m);
    }

    [Fact]
    public void ToDecimal_GecersizUs_Firlatir()
    {
        Should.Throw<ArgumentOutOfRangeException>(() => new Money(100, "EUR").ToDecimal(5));
        Should.Throw<ArgumentOutOfRangeException>(() => new Money(100, "EUR").ToDecimal(-1));
    }

    [Fact]
    public void Tasma_SessizceSarilmaz()
    {
        // Sarmalanan bir toplam, negatif bir fatura üretir ve hiçbir yerde hata vermez.
        Should.Throw<OverflowException>(() => new Money(long.MaxValue, "EUR") + new Money(1, "EUR"));
        Should.Throw<OverflowException>(() => new Money(long.MaxValue, "EUR") * 2);
    }
}
