using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Scheduling.Commands.SetPricing;
using Expyra.Domain.Experiences;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Scheduling;

/// <summary>
/// Host'un girdiği fiyatı okur.
///
/// <para><b>Yazma ucuyla AYNI tipi döndürüyor</b> (<see cref="PricingResponse"/>):
/// form aynı şekli okuyup aynı şekli geri gönderiyor. Ayrı bir okuma tipi
/// yazılsaydı iki sözleşme olur ve biri bir gün diğerinden ayrışırdı — kademe
/// adının bir tarafta <c>"adult"</c>, diğerinde <c>"Adult"</c> olması gibi.</para>
///
/// <para>Misafir tarafının <c>GuestPricingStore</c>'undan ayrı çünkü sorular farklı:
/// misafir gösterim çevrimi ve "şu tutardan başlayan" istiyor, host ise ham
/// kademeleri ve <b>para biriminin kilitli olup olmadığını</b>.</para>
/// </summary>
internal static class HostPricingProjection
{
    /// <summary>
    /// <c>null</c> = host henüz fiyat girmemiş. Bu bir hata değil, tamamlanmamış bir
    /// adım; arayüz formu boş açıyor.
    /// </summary>
    internal static async Task<PricingResponse?> LoadAsync(
        IAppDbContext dbContext,
        Experience experience,
        CancellationToken cancellationToken)
    {
        // Tek sorgu: sayfa + kurallar + para biriminin üssü. İç join, kural satırı
        // olmayan bir fiyat sayfasını eliyor — o "fiyat girilmemiş" demek ve boş bir
        // kademe listesi döndürmek, formda "0" gösterirdi.
        var rows = await (
            from page in dbContext.ExperiencePrices.AsNoTracking()
            where page.ExperienceId == experience.Id
            join rule in dbContext.PriceRules.AsNoTracking()
                on page.Id equals rule.ExperiencePriceId
            join currency in dbContext.Currencies.AsNoTracking()
                on page.CurrencyCode equals currency.Code
            select new
            {
                page.CurrencyCode,
                currency.MinorUnits,
                rule.GuestType,
                rule.UnitPrice,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (rows.Count == 0)
        {
            return null;
        }

        var first = rows[0];

        // Kademe sırası SABİT, sözlük/veritabanı sırası değil: bu liste formun çizim
        // sırası ve sıranın kaynağı bir ORDER BY olmamalı — GuestPricingStore ve
        // QuoteCalculator ile aynı gerekçe.
        var rules = new List<PriceRuleResponse>(rows.Count);

        foreach (var tier in (ReadOnlySpan<GuestType>)[GuestType.Adult, GuestType.Child, GuestType.Infant])
        {
            var match = rows.Find(x => x.GuestType == tier);

            if (match is not null)
            {
                rules.Add(new PriceRuleResponse(tier.ToString().ToLowerInvariant(), match.UnitPrice.AmountMinor));
            }
        }

        return new PricingResponse(
            first.CurrencyCode,
            first.MinorUnits,

            // Kilit YAYIN DAMGASINA bakıyor, duruma değil — SetPricingCommand ile
            // birebir aynı koşul. Arayüz para birimi seçicisini bu bayrakla
            // kilitliyor; `publishedAtUtc`'yi kendi yorumlasaydı kural değiştiğinde
            // iki yerde birden değişmesi gerekirdi.
            experience.PublishedAtUtc is not null,
            rules);
    }
}
