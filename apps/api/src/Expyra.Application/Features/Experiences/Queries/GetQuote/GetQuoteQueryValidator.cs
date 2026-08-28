using FluentValidation;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Experiences.Queries.GetQuote;

/// <summary>
/// İsteğin ŞEKLİ. "Hiç kişi seçilmemiş" ve "kalabalık çok büyük" kontrolleri burada
/// DEĞİL <c>QuoteCalculator</c>'da: o kurallar hesabın parçası ve saf tarafta test
/// ediliyor — burada tekrarlanırsa iki kaynak ayrışır.
/// </summary>
internal sealed class GetQuoteQueryValidator : AbstractValidator<GetQuoteQuery>
{
    public GetQuoteQueryValidator()
    {
        RuleFor(x => x.Slug).NotEmpty();
        RuleFor(x => x.SlotId).NotEmpty();

        // Negatif sayı bir toplamı DÜŞÜRÜRDÜ: -5 yetişkin, çocuk kalemini bedavaya
        // getirebilirdi. Tavan ayrıca kontrol ediliyor ama burada da var, çünkü
        // int.MaxValue kişi Money.Multiply'da taşma üretirdi.
        RuleFor(x => x.Adults).InclusiveBetween(0, PricingRules.MaxPartySize);
        RuleFor(x => x.Children).InclusiveBetween(0, PricingRules.MaxPartySize);
        RuleFor(x => x.Infants).InclusiveBetween(0, PricingRules.MaxPartySize);

        RuleFor(x => x.Currency)
            .Must(CurrencyCode.IsValid!)
            .When(x => !string.IsNullOrWhiteSpace(x.Currency))
            .WithMessage("Para birimi üç harfli ISO 4217 kodu olmalı.");
    }
}
