using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Pricing;

/// <summary>
/// Gösterim kurunu çözer: "host CZK ile tahsil ediyor, misafir EUR görmek istiyor".
///
/// <para><b>Tahsilata HİÇ karışmıyor</b> (PLAN Blok 7 kabul kriteri 3). Bu sınıfın
/// ürettiği tek şey <see cref="DisplayConversion"/> ve <c>QuoteCalculator</c> onu
/// ayrı bir alana (<c>Quote.Display</c>) koyuyor — tahsilat alanı hiç görmüyor.</para>
///
/// <para><b>Neden tek anlık görüntüden çaprazlama:</b> iki para birimi de aynı
/// <c>snapshot_id</c>'den okunuyor. Satır satır "en yeni kuru" okuyan bir çözücü,
/// yenileme sırasında yarısı eski yarısı yeni bir sepet üretebilirdi.</para>
/// </summary>
internal static class ExchangeRateStore
{
    /// <summary>
    /// İstenen gösterim para birimi için çevrim. <b><c>null</c> dönmesi tek bir
    /// anlama geliyor: çevrim İSTENMEDİ</b> (parametre boş) ya da gerekmedi (istenen
    /// para birimi zaten tahsilat para birimi).
    ///
    /// <para>Kur bulunamadığında <c>null</c> DÖNMÜYOR, patlıyor (CLAUDE.md #1):
    /// sessizce çevirmemek, misafire istediğinden başka bir para biriminde fiyat
    /// göstermek olurdu ve o fark ekranda görünmezdi.</para>
    /// </summary>
    internal static async Task<CurrencyDisplay?> ResolveAsync(
        IAppDbContext dbContext,
        string chargeCurrency,
        int chargeMinorUnits,
        string? requestedCurrency,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(requestedCurrency))
        {
            return null;
        }

        var target = CurrencyCode.Normalize(requestedCurrency);

        if (string.Equals(target, chargeCurrency, StringComparison.Ordinal))
        {
            return null;
        }

        // En yeni ÖLÇÜM, en yeni kayıt değil: elle girilmiş eski tarihli bir düzeltme
        // sonradan eklenebilir ve o, daha yeni bir ölçümü gölgelememeli.
        var snapshot = await dbContext.ExchangeRateSnapshots
            .AsNoTracking()
            .OrderByDescending(x => x.CapturedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new { x.Id, x.CapturedAtUtc })
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        if (snapshot is null)
        {
            throw new ConflictException(
                "Kur tablosu boş; gösterim para birimi çevrilemiyor.", PricingConflict.NoExchangeRates);
        }

        // Kayıt defteri SOL join'li: "böyle bir para birimi yok" (400, kullanıcı
        // düzeltebilir) ile "var ama kuru yok" (409, veri eksiği) ayrımı ancak böyle
        // yapılabiliyor. İç join olsaydı ikisi de aynı boş sonuca düşer ve misafire
        // yanlış hata gösterilirdi.
        //
        // İki para birimi de TEK sorguda ve TEK anlık görüntüden: ayrı sorgular araya
        // giren bir yenilemede farklı anlara düşebilirdi.
        var rows = await (
            from currency in dbContext.Currencies.AsNoTracking()
            where currency.Code == target || currency.Code == chargeCurrency
            join rate in dbContext.ExchangeRates.AsNoTracking().Where(x => x.SnapshotId == snapshot.Id)
                on currency.Code equals rate.CurrencyCode into matched
            from rate in matched.DefaultIfEmpty()
            select new { currency.Code, currency.MinorUnits, Rate = (decimal?)rate.RatePerPivot })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var targetRow = rows.Find(x => string.Equals(x.Code, target, StringComparison.Ordinal));

        if (targetRow is null)
        {
            throw new BadRequestException($"'{requestedCurrency}' tanınan bir para birimi değil.");
        }

        var chargeRow = rows.Find(x => string.Equals(x.Code, chargeCurrency, StringComparison.Ordinal));

        if (targetRow.Rate is not { } targetPerPivot
            || chargeRow?.Rate is not { } chargePerPivot
            || chargePerPivot <= 0)
        {
            throw new ConflictException(
                $"{chargeCurrency} → {target} için kur yok.", PricingConflict.NoExchangeRates);
        }

        var targetMinorUnits = targetRow.MinorUnits;

        // Her iki oran da pivot başına; çapraz oran bölme. Pivot'un kendi satırı 1.0
        // olduğu için pivot'un kaynak ya da hedef olduğu durum ayrı bir dal istemiyor.
        return new CurrencyDisplay(
            new DisplayConversion(target, targetPerPivot / chargePerPivot, chargeMinorUnits, targetMinorUnits),
            snapshot.Id,
            snapshot.CapturedAtUtc,
            targetMinorUnits);
    }
}

/// <param name="SnapshotId">
/// Kullanılan anlık görüntü. Yanıtta gidiyor çünkü Blok 9 rezervasyona bunu yazacak:
/// "o an hangi kurları gösterdik" sorusunun cevabı tek bir kimlik.
/// </param>
internal sealed record CurrencyDisplay(
    DisplayConversion Conversion,
    Guid SnapshotId,
    DateTimeOffset CapturedAtUtc,
    int MinorUnits);

/// <summary>Fiyat tarafının makine-okunur çakışma kodları.</summary>
public static class PricingConflict
{
    /// <summary>İstenen çift için kur satırı yok — veri eksiği, kullanıcı hatası değil.</summary>
    public const string NoExchangeRates = "pricing-no-exchange-rate";

    /// <summary>Toplam tutar ödeme sağlayıcısının alt sınırının altında.</summary>
    public const string BelowMinimumCharge = "pricing-below-minimum";
}
