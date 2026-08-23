namespace Expyra.Domain.Pricing;

/// <summary>
/// Ödeme sağlayıcısının para birimi kısıtları. <b>ISO 4217 ile AYNI ŞEY DEĞİL</b> ve
/// bu ayrım tesadüfi değil: sağlayıcı bazı para birimlerinde ISO'dan farklı davranıyor.
///
/// <para><b>ISK tuzağı — yüz kat hata.</b> ISO'ya göre İzlanda kronunun küsuratı yok
/// (üs 0) ve <c>docs/currencies.json</c> doğru olarak öyle diyor. Stripe ise geriye
/// dönük uyumluluk için ISK'yi İKİ ondalıklı bekliyor ve son iki haneyi daima 00
/// istiyor: 5 ISK için <c>amount = 500</c>. Fiyatı ISO minör biriminde saklayıp
/// sağlayıcıya olduğu gibi göndermek, yüzde bir tahsil etmek demek. Bu tablo o
/// dönüşümün TEK yeri.</para>
///
/// <para><b>Neden <c>currency.minor_units</c>'a yazılmadı:</b> o sütun ISO kayıt
/// defteri ve <c>Money.ToDecimal</c> gösterimde onu kullanıyor. Sağlayıcının
/// yorumunu oraya yazmak, ekranda ISK'yi "0,05 kr" diye göstermek olurdu — yani
/// bir hatayı düzeltmek için ikincisini üretmek.</para>
///
/// <para><b>Neden sağlayıcı adı sınıf adında yok:</b> <c>IPaymentProvider</c>'ın
/// ikinci implementasyonu geldiğinde kısıtlar farklı olabilir; o gün bu tip bir
/// arayüzün arkasına geçer. Bugün tek sağlayıcı var ve erken soyutlama, hiç
/// kullanılmayan bir dolaylılık olurdu.</para>
/// </summary>
public sealed class PaymentCurrencyRules
{
    private readonly IReadOnlyDictionary<string, int> exponentOverrides;
    private readonly IReadOnlyDictionary<string, long> minimums;
    private readonly IReadOnlyDictionary<string, long> maximums;
    private readonly long defaultMaximum;

    public PaymentCurrencyRules(
        IReadOnlyDictionary<string, int> exponentOverrides,
        IReadOnlyDictionary<string, long> minimums,
        IReadOnlyDictionary<string, long> maximums,
        long defaultMaximum)
    {
        this.exponentOverrides = exponentOverrides;
        this.minimums = minimums;
        this.maximums = maximums;
        this.defaultMaximum = defaultMaximum;
    }

    /// <summary>
    /// Sağlayıcının bu para birimi için beklediği üs. Genelde ISO ile aynı; ISK ve
    /// UGX'te değil.
    /// </summary>
    /// <param name="isoMinorUnits"><c>currency.minor_units</c> — kayıt defterinden.</param>
    public int ProviderExponent(string currencyCode, int isoMinorUnits)
        => exponentOverrides.TryGetValue(currencyCode, out var value) ? value : isoMinorUnits;

    /// <summary>
    /// ISO minör birimindeki tutarı sağlayıcının beklediği minör birime çevirir.
    ///
    /// <para>Üsler eşitse dokunmuyor. ISK'de ISO 0 → sağlayıcı 2 olduğu için tutar
    /// 100 ile ÇARPILIYOR: 5 ISK (<c>AmountMinor = 5</c>) → <c>amount = 500</c>.</para>
    /// </summary>
    public long ToProviderAmount(long isoAmountMinor, string currencyCode, int isoMinorUnits)
    {
        var providerExponent = ProviderExponent(currencyCode, isoMinorUnits);
        var difference = providerExponent - isoMinorUnits;

        if (difference == 0) return isoAmountMinor;

        // Yalnız yukarı yön bekleniyor (ISO'dan daha çok hane). Tersi olsaydı
        // bölmek gerekirdi ve bölme kayıp demek — sessizce kuruş kaybetmektense
        // yüksek sesle patlıyoruz.
        if (difference < 0)
        {
            throw new InvalidOperationException(
                $"{currencyCode} için sağlayıcı üssü ({providerExponent}) ISO üssünden ({isoMinorUnits}) küçük; " +
                "bu dönüşüm kayıpsız yapılamaz.");
        }

        return checked(isoAmountMinor * Pow10(difference));
    }

    /// <summary>
    /// Sağlayıcının kabul edeceği en küçük tahsilat, <b>ISO minör biriminde</b>.
    /// Bilinmiyorsa <c>null</c> — uydurma bir alt sınır, geçerli fiyatları
    /// reddetmekten kötü.
    /// </summary>
    public long? MinimumChargeIsoMinor(string currencyCode, int isoMinorUnits)
    {
        if (!minimums.TryGetValue(currencyCode, out var providerMinimum)) return null;

        var difference = ProviderExponent(currencyCode, isoMinorUnits) - isoMinorUnits;

        // Tablo sağlayıcının üssünde; kıyaslama ISO üssünde yapılıyor.
        return difference == 0 ? providerMinimum : providerMinimum / Pow10(difference);
    }

    /// <summary>Sağlayıcının kabul edeceği en büyük tahsilat, ISO minör biriminde.</summary>
    public long MaximumChargeIsoMinor(string currencyCode, int isoMinorUnits)
    {
        var providerMaximum = maximums.TryGetValue(currencyCode, out var value) ? value : defaultMaximum;
        var difference = ProviderExponent(currencyCode, isoMinorUnits) - isoMinorUnits;

        return difference == 0 ? providerMaximum : providerMaximum / Pow10(difference);
    }

    private static long Pow10(int exponent)
    {
        long result = 1;
        for (var i = 0; i < exponent; i++) result *= 10;
        return result;
    }
}
