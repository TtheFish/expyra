using FluentValidation;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Scheduling.Commands.SetPricing;

/// <summary>
/// Gövdenin ŞEKLİ. Ödeme sağlayıcısının alt/üst sınırı burada DEĞİL handler'da:
/// o sınır para biriminin kayıt defterindeki üssüne bağlı ve doğrulayıcı
/// veritabanı görmüyor.
/// </summary>
internal sealed class SetPricingCommandValidator : AbstractValidator<SetPricingCommand>
{
    public SetPricingCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.Currency)
            .NotEmpty()
            .Must(CurrencyCode.IsValid)
            .WithMessage("Para birimi üç harfli ISO 4217 kodu olmalı.");

        RuleFor(x => x.Rules)
            .NotEmpty()
            .WithMessage("En az bir kademe fiyatı gerekli.")
            .Must(rules => rules.Select(x => x.GuestType).Distinct().Count() == rules.Count)
            .WithMessage("Aynı kademe birden fazla kez verilemez.")
            // Yetişkin fiyatı ZORUNLU: kartta ve listede gösterilen "kişi başı"
            // tutar o. Olmadan ilan fiyatsız görünür ve teklif hiç hesaplanamaz.
            .Must(rules => rules.Any(x => x.GuestType == GuestType.Adult))
            .WithMessage("Yetişkin fiyatı zorunlu.");

        RuleForEach(x => x.Rules).ChildRules(rule =>
        {
            // Negatif tutar Money genelinde geçerli (iade, Blok 13) ama bir İLAN
            // FİYATI negatif olamaz. Sıfır geçerli: host bebeği ücretsiz yapabilir.
            rule.RuleFor(x => x.UnitAmountMinor)
                .GreaterThanOrEqualTo(0)
                .WithMessage("Fiyat negatif olamaz.")
                .LessThanOrEqualTo(PricingRules.MaxUnitAmountMinor)
                .WithMessage("Fiyat izin verilen tavanı aşıyor.");
        });
    }
}
