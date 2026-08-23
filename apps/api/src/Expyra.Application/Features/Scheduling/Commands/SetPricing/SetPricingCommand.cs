using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.SetPricing;

/// <summary>
/// Fiyatı TAM DEĞİŞTİRME ile yazar: gövdedeki liste, kademelerin son hâli.
///
/// <para><b>Neden delta değil:</b> fiyat üç satırlık kapalı bir küme ve host onu
/// tek ekranda görüyor. Delta olsaydı "çocuk fiyatını sil" ayrı bir uç isterdi ve
/// ekranla sözleşme ayrışırdı (<c>PATCH /experiences</c> deltası ise altı alanlık
/// bir sihirbaza hizmet ediyor — farklı ihtiyaç, farklı sözleşme).</para>
///
/// <para><b>Tutar MİNÖR BİRİM tam sayısı.</b> API hiçbir yerde ondalık para metni
/// ayrıştırmıyor: "48,50" ile "48.50" arasındaki fark kültüre bağlı ve o ayrıştırma
/// bir gün yanlış kültürde yapılırsa fiyat yüz kat kayardı.</para>
/// </summary>
public sealed record SetPricingCommand(
    Guid ExperienceId,
    string Currency,
    IReadOnlyList<PriceRuleInput> Rules) : IRequest<PricingResponse>;

public sealed record PriceRuleInput(GuestType GuestType, long UnitAmountMinor);

/// <param name="CurrencyLocked">
/// Yayınlanmış ilanda para birimi DEĞİŞTİRİLEMEZ. Arayüz seçiciyi bu bayrakla
/// kilitliyor — <c>publishedAtUtc</c>'yi kendi yorumlamıyor, çünkü o kural bir gün
/// değişirse iki yerde birden değişmesi gerekirdi.
/// </param>
public sealed record PricingResponse(
    string Currency,
    int MinorUnits,
    bool CurrencyLocked,
    IReadOnlyList<PriceRuleResponse> Rules);

public sealed record PriceRuleResponse(string GuestType, long UnitAmountMinor);

internal sealed class SetPricingCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    PaymentCurrencyRules paymentRules,
    ILogger<SetPricingCommandHandler> logger)
    : IRequestHandler<SetPricingCommand, PricingResponse>
{
    public async Task<PricingResponse> Handle(
        SetPricingCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();
        var currency = CurrencyCode.Normalize(request.Currency);

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        // Kayıt defteri kontrolü FK'ye ÇARPMADAN önce: FK ihlali 500 üretirdi, oysa
        // bu kullanıcının düzeltebileceği bir girdi hatası.
        var registry = await dbContext.Currencies
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Code == currency, cancellationToken)
            .ConfigureAwait(false);

        if (registry is null)
        {
            throw new BadRequestException($"'{request.Currency}' tanınan bir para birimi değil.");
        }

        RequirePayableAmounts(request.Rules, currency, registry.MinorUnits);

        var page = await dbContext.ExperiencePrices
            .FirstOrDefaultAsync(x => x.ExperienceId == experience.Id, cancellationToken)
            .ConfigureAwait(false);

        if (page is null)
        {
            page = new ExperiencePrice
            {
                Id = Guid.CreateVersion7(),
                ExperienceId = experience.Id,

                // Para birimi YALNIZ burada yazılıyor. Aşağıdaki kilit onu
                // değiştirilemez kılıyor; INSERT dışında ona dokunan bir satır yok.
                CurrencyCode = currency,
            };

            dbContext.ExperiencePrices.Add(page);
        }
        else if (!string.Equals(page.CurrencyCode, currency, StringComparison.Ordinal)
            && experience.PublishedAtUtc is not null)
        {
            // Şehir kilidiyle aynı aile: dışarı çıkmış bir ilanın para birimini
            // değiştirmek, yayınlanmış bir fiyatın anlamını geriye dönük değiştirir
            // ve Blok 9'un donduracağı tutarlarla çelişir.
            throw new ConflictException(
                "Yayınlanmış bir ilanın tahsilat para birimi değiştirilemez. Önce arşivleyin.",
                ScheduleConflict.PricingCurrencyLocked);
        }
        else
        {
            page.CurrencyCode = currency;
        }

        await UpsertRulesAsync(page, currency, request.Rules, cancellationToken).ConfigureAwait(false);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "pricing.saved experienceId={ExperienceId} currency={Currency} rules={Rules}",
            experience.Id, currency, request.Rules.Count);

        return new PricingResponse(
            currency,
            registry.MinorUnits,
            experience.PublishedAtUtc is not null,
            request.Rules
                // Kademe adı KÜÇÜK HARF: enum sözleşmesinin geri kalanıyla aynı düzen
                // (bkz. Program.cs'teki JsonStringEnumConverter ve ScheduleFormat.Name).
                .Select(x => new PriceRuleResponse(x.GuestType.ToString().ToLowerInvariant(), x.UnitAmountMinor))
                .ToList());
    }

    /// <summary>
    /// Ödeme sağlayıcısının kabul edeceği aralık. <b>Fiyat yazılırken kontrol
    /// ediliyor, ödeme anında değil</b>: altında fiyat verilen bir ilan
    /// yayınlanabilir ama her ödeme reddedilirdi ve host sebebini haftalar sonra
    /// öğrenirdi.
    /// </summary>
    private void RequirePayableAmounts(
        IReadOnlyList<PriceRuleInput> rules,
        string currency,
        int minorUnits)
    {
        var minimum = paymentRules.MinimumChargeIsoMinor(currency, minorUnits);
        var maximum = paymentRules.MaximumChargeIsoMinor(currency, minorUnits);

        foreach (var rule in rules)
        {
            // SIFIR muaf: bedava bebek geçerli bir fiyat ve o satır tek başına
            // tahsilat üretmiyor. Alt sınır TOPLAM tahsilata değil kaleme
            // bakıyor — toplam kontrolü teklif anında (Blok 7c).
            if (rule.UnitAmountMinor == 0) continue;

            if (minimum is { } floor && rule.UnitAmountMinor < floor)
            {
                throw new BadRequestException(
                    $"{rule.GuestType} fiyatı ödeme sağlayıcısının alt sınırının altında "
                    + $"({floor} minör birim {currency}).");
            }

            if (rule.UnitAmountMinor > maximum)
            {
                throw new BadRequestException(
                    $"{rule.GuestType} fiyatı ödeme sağlayıcısının üst sınırını aşıyor "
                    + $"({maximum} minör birim {currency}).");
            }
        }
    }

    /// <summary>
    /// Kural satırlarını doğal anahtarla (kademe) eşleyip günceller.
    ///
    /// <para><b>"Hepsini sil + hepsini ekle" YOK:</b> <c>ux_price_rule_tier</c> aynı
    /// <c>SaveChanges</c> içinde aynı anahtarı silip yeniden eklemeyi kırılgan
    /// yapıyor — EF'in cümle sırası garanti değil ve silme eklemeden sonra giderse
    /// tekil index ihlali 500 üretir. Aynı bedeli <c>SetMediaCoverCommand</c> de
    /// ödemişti.</para>
    /// </summary>
    private async Task UpsertRulesAsync(
        ExperiencePrice page,
        string currency,
        IReadOnlyList<PriceRuleInput> rules,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.PriceRules
            .Where(x => x.ExperiencePriceId == page.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var wanted = rules.ToDictionary(x => x.GuestType);

        foreach (var row in existing)
        {
            if (wanted.TryGetValue(row.GuestType, out var input))
            {
                row.UnitPrice = new Money(input.UnitAmountMinor, currency);
                wanted.Remove(row.GuestType);
                continue;
            }

            dbContext.PriceRules.Remove(row);
        }

        foreach (var input in wanted.Values)
        {
            dbContext.PriceRules.Add(new PriceRule
            {
                Id = Guid.CreateVersion7(),
                ExperiencePriceId = page.Id,
                GuestType = input.GuestType,
                UnitPrice = new Money(input.UnitAmountMinor, currency),
            });
        }
    }
}
