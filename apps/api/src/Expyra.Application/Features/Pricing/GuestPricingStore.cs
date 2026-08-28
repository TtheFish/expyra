using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Pricing;

/// <summary>
/// Misafir tarafının fiyat okuması. <c>SetPricing</c>'in yazdığını okuyor ve
/// gösterim çevrimini ekliyor.
///
/// <para><b>Ayrı bir sınıf çünkü üç yerden çağrılıyor:</b> liste, detay ve teklif.
/// Üçüne kopyalansaydı "yetişkin fiyatı yoksa ne olur" sorusu üç ayrı yerde
/// cevaplanır ve biri bir gün ayrışırdı.</para>
/// </summary>
internal static class GuestPricingStore
{
    /// <summary>
    /// Deneyimin fiyat satırları. <c>null</c> = host henüz fiyat girmemiş; bu bir hata
    /// değil, taslak bir durum ve liste/detay onu fiyatsız gösteriyor.
    /// </summary>
    internal static async Task<PricingSnapshot?> LoadAsync(
        IAppDbContext dbContext,
        Guid experienceId,
        CancellationToken cancellationToken)
        => (await LoadManyAsync(dbContext, [experienceId], cancellationToken).ConfigureAwait(false))
            .GetValueOrDefault(experienceId);

    /// <summary>
    /// Birden çok deneyimin fiyatı, <b>TEK sorguda</b>. Liste ucu bunu kullanıyor:
    /// deneyim başına sorgu açmak, yirmi dört kartlık bir sayfada kırk sekiz tur
    /// demekti (N+1 yok kuralı).
    ///
    /// <para>Sayfa, kural ve para birimi üssü tek join'de: üçünü ayrı sorgulara
    /// bölmek sorgu sayısını satırdan bağımsız tutardı ama yine de üçe çıkarırdı ve
    /// bu join dar — deneyim başına en fazla üç kural satırı var.</para>
    /// </summary>
    internal static async Task<Dictionary<Guid, PricingSnapshot>> LoadManyAsync(
        IAppDbContext dbContext,
        IReadOnlyCollection<Guid> experienceIds,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<Guid, PricingSnapshot>();

        if (experienceIds.Count == 0)
        {
            return result;
        }

        // İç join bilinçli: kural satırı olmayan bir fiyat sayfası "fiyat girilmemiş"
        // sayılıyor ve buradan hiç dönmüyor. Dış join yapılsaydı boş bir kademe
        // sözlüğü üretilir, o da kartta "0 TL" olarak görünürdü.
        //
        // Üs kayıt defterinden geliyor çünkü Money onu TAŞIMIYOR (tek doğruluk kaynağı
        // currency.minor_units) ve gösterim de çevrim de ona ihtiyaç duyuyor.
        var rows = await (
            from page in dbContext.ExperiencePrices.AsNoTracking()
            where experienceIds.Contains(page.ExperienceId)
            join rule in dbContext.PriceRules.AsNoTracking()
                on page.Id equals rule.ExperiencePriceId
            join currency in dbContext.Currencies.AsNoTracking()
                on page.CurrencyCode equals currency.Code
            select new
            {
                page.ExperienceId,
                page.CurrencyCode,
                currency.MinorUnits,
                rule.GuestType,
                rule.UnitPrice,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var group in rows.GroupBy(x => x.ExperienceId))
        {
            var first = group.First();

            result[group.Key] = new PricingSnapshot(
                first.CurrencyCode,
                first.MinorUnits,
                group.ToDictionary(x => x.GuestType, x => x.UnitPrice));
        }

        return result;
    }

    /// <summary>
    /// Fiyatı tel üzerindeki hâline çevirir; <paramref name="display"/> verilmişse
    /// gösterim satırlarını da hesaplar.
    /// </summary>
    internal static GuestPricingResponse ToResponse(PricingSnapshot pricing, CurrencyDisplay? display)
    {
        var lines = new List<GuestPriceLineResponse>(pricing.UnitPrices.Count);

        // Kademeler SABİT SIRADA: sözlük sırası garanti değil ve bu liste arayüzün
        // çizim sırası (QuoteCalculator ile aynı gerekçe).
        foreach (var tier in (ReadOnlySpan<GuestType>)[GuestType.Adult, GuestType.Child, GuestType.Infant])
        {
            if (!pricing.UnitPrices.TryGetValue(tier, out var unit)) continue;

            lines.Add(new GuestPriceLineResponse(
                tier.ToString().ToLowerInvariant(),
                unit.AmountMinor,
                display is null ? null : Convert(unit, display).AmountMinor));
        }

        // Yetişkin kademesi zorunlu (SetPricingCommandValidator); yoksa veri bozuk ve
        // sessizce sıfır göstermek "bedava" demek olurdu.
        var adult = pricing.UnitPrices.TryGetValue(GuestType.Adult, out var value)
            ? value
            : throw new InvalidOperationException(
                $"{pricing.ChargeCurrency} fiyat sayfasında yetişkin kademesi yok; veri bozuk.");

        return new GuestPricingResponse(
            pricing.ChargeCurrency,
            pricing.ChargeMinorUnits,
            adult.AmountMinor,
            lines,
            display is null
                ? null
                : new GuestDisplayPriceResponse(
                    display.Conversion.TargetCurrency,
                    display.MinorUnits,
                    Convert(adult, display).AmountMinor,
                    display.SnapshotId,
                    display.CapturedAtUtc));
    }

    /// <summary>
    /// Gösterim çevrimi. <b>Yukarı yuvarlıyor</b> — <c>QuoteCalculator</c> ile aynı
    /// karar: misafire ödeyeceğinden düşük bir sayı göstermek, ödeme ekranında
    /// sürpriz demek.
    /// </summary>
    private static Money Convert(Money amount, CurrencyDisplay display)
        => amount.ConvertTo(
            display.Conversion.TargetCurrency,
            display.Conversion.RatePerCharge,
            display.Conversion.ChargeMinorUnits,
            display.Conversion.TargetMinorUnits,
            MidpointRounding.AwayFromZero);
}
