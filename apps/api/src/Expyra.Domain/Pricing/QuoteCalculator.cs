using Expyra.Domain.Common;

namespace Expyra.Domain.Pricing;

/// <summary>
/// Kişi sayısından tutarı hesaplar. <b>Saf</b>: veritabanı görmez, kur okumaz —
/// fiyat satırlarını ve (varsa) kuru çağıran veriyor.
///
/// <para><b>Kabul kriteri 3 TİP düzeyinde korunuyor.</b> Sonuç
/// <see cref="Quote"/> iki ayrı alan taşıyor: <see cref="Quote.Charge"/> (tahsilat,
/// daima host'un para biriminde) ve <see cref="Quote.Display"/> (gösterim, çevrilmiş
/// ya da <c>null</c>). İkisi tek bir <c>Total</c> alanında birleştirilseydi,
/// "hangisiydi bu" sorusu her çağrı yerinde yeniden sorulur ve bir gün yanlış
/// cevaplanırdı. Blok 9 rezervasyona yalnız <see cref="Quote.Charge"/>'ı yazacak.</para>
/// </summary>
public static class QuoteCalculator
{
    /// <summary>
    /// Teklifi hesaplar.
    /// </summary>
    /// <param name="unitPrices">
    /// Kademe başına kişi başı fiyat. İstenen bir kademe eksikse
    /// <see cref="QuoteResult.MissingTier"/> — sessizce sıfır saymıyoruz, o
    /// bedava bir bilet demek olurdu.
    /// </param>
    /// <param name="conversion">
    /// Gösterim çevrimi. <c>null</c> ise <see cref="Quote.Display"/> de <c>null</c>
    /// kalıyor: 1.0 oranlı sahte bir nesne üretmek, "çevrildi mi" sorusunu
    /// cevaplanamaz yapardı.
    /// </param>
    public static QuoteResult Calculate(
        string chargeCurrency,
        IReadOnlyDictionary<GuestType, Money> unitPrices,
        IReadOnlyDictionary<GuestType, int> party,
        DisplayConversion? conversion)
    {
        ArgumentNullException.ThrowIfNull(unitPrices);
        ArgumentNullException.ThrowIfNull(party);

        var lines = new List<QuoteLine>();
        var total = Money.Zero(chargeCurrency);
        var headcount = 0;

        // Kademeler SABİT SIRADA geziliyor, sözlüğün sırasıyla değil: yanıttaki
        // satır sırası istemcinin çizim sırası ve sözlük sırası garanti değil.
        foreach (var tier in (ReadOnlySpan<GuestType>)[GuestType.Adult, GuestType.Child, GuestType.Infant])
        {
            if (!party.TryGetValue(tier, out var count) || count <= 0)
            {
                continue;
            }

            if (!unitPrices.TryGetValue(tier, out var unit))
            {
                return QuoteResult.MissingTier(tier);
            }

            if (!string.Equals(unit.Currency, chargeCurrency, StringComparison.Ordinal))
            {
                // Sayfanın para birimi ile kademenin para birimi ayrışmış: veri
                // bozuk. Money.Add zaten patlardı ama hata orada "farklı para
                // birimleri" derdi ve sebebi görünmezdi.
                throw new InvalidOperationException(
                    $"{tier} kademesi {unit.Currency} taşıyor ama sayfa {chargeCurrency}.");
            }

            var lineTotal = unit.Multiply(count);

            lines.Add(new QuoteLine(tier, count, unit, lineTotal));
            total = total.Add(lineTotal);
            headcount += count;
        }

        if (headcount == 0)
        {
            return QuoteResult.EmptyParty();
        }

        if (headcount > PricingRules.MaxPartySize)
        {
            return QuoteResult.PartyTooLarge(headcount);
        }

        var display = conversion is { } c
            ? total.ConvertTo(
                c.TargetCurrency,
                c.RatePerCharge,
                c.ChargeMinorUnits,
                c.TargetMinorUnits,
                // Gösterimde AŞAĞI yuvarlama yok: kullanıcıya ödeyeceğinden düşük
                // bir sayı göstermek, ödeme ekranında sürpriz demek. Bankacılık
                // yuvarlaması da değil — o istatistiksel yansızlık için ve burada
                // önemli olan tek şey misafirin gördüğünün altında kalmamak.
                MidpointRounding.AwayFromZero)
            : null;

        return QuoteResult.Ok(new Quote(lines, total, display, headcount));
    }
}

/// <param name="RatePerCharge">
/// 1 ana birim tahsilat parası = bu kadar ana birim hedef para. Kurun pivot
/// üzerinden çaprazlanması ÇAĞIRANIN işi — bu tip hazır oran alıyor.
/// </param>
public sealed record DisplayConversion(
    string TargetCurrency,
    decimal RatePerCharge,
    int ChargeMinorUnits,
    int TargetMinorUnits);

/// <param name="Charge">
/// <b>Tahsil edilecek tutar.</b> Daima host'un para biriminde. Blok 9 rezervasyona
/// bunu donduracak.
/// </param>
/// <param name="Display">
/// Misafirin görüntüleme parası cinsinden karşılık; istenmemişse ya da tahsilat
/// para birimiyle aynıysa <c>null</c>. <b>Hiçbir yerde tahsilata girmiyor</b>
/// (kabul kriteri 3) — ayrı bir alan olması bunu tip düzeyinde koruyor.
/// </param>
public sealed record Quote(
    IReadOnlyList<QuoteLine> Lines,
    Money Charge,
    Money? Display,
    int Headcount);

public sealed record QuoteLine(GuestType Tier, int Count, Money UnitPrice, Money LineTotal);

/// <summary>
/// Hesabın sonucu. İstisna DEĞİL: "çocuk fiyatı girilmemiş" bir arıza değil,
/// host'un tamamlamadığı bir alan — çağıran bunu 409'a çeviriyor ve hangi kademenin
/// eksik olduğunu söyleyebiliyor.
/// </summary>
public sealed record QuoteResult(Quote? Value, QuoteFailure? Failure, GuestType? Tier, int Headcount)
{
    internal static QuoteResult Ok(Quote quote) => new(quote, null, null, quote.Headcount);

    internal static QuoteResult MissingTier(GuestType tier)
        => new(null, QuoteFailure.MissingTierPrice, tier, 0);

    internal static QuoteResult EmptyParty() => new(null, QuoteFailure.EmptyParty, null, 0);

    internal static QuoteResult PartyTooLarge(int headcount)
        => new(null, QuoteFailure.PartyTooLarge, null, headcount);
}

public enum QuoteFailure
{
    /// <summary>İstenen kademenin fiyatı girilmemiş.</summary>
    MissingTierPrice = 1,

    /// <summary>Hiç kişi seçilmemiş.</summary>
    EmptyParty = 2,

    /// <summary><see cref="PricingRules.MaxPartySize"/> aşıldı.</summary>
    PartyTooLarge = 3,
}
