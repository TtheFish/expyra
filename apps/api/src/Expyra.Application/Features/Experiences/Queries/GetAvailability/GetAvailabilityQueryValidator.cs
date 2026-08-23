using FluentValidation;
using Expyra.Domain.Common;

namespace Expyra.Application.Features.Experiences.Queries.GetAvailability;

internal sealed class GetAvailabilityQueryValidator : AbstractValidator<GetAvailabilityQuery>
{
    public GetAvailabilityQueryValidator()
    {
        RuleFor(x => x.Slug).NotEmpty();

        // Pencere genişliği ve "bitiş başlangıçtan önce" handler'da: ikisi de
        // deneyimin saat dilimindeki BUGÜNE göre kırpılıyor ve doğrulayıcı
        // veritabanı görmüyor.
        RuleFor(x => x.Currency)
            .Must(CurrencyCode.IsValid!)
            .When(x => !string.IsNullOrWhiteSpace(x.Currency))
            .WithMessage("Para birimi üç harfli ISO 4217 kodu olmalı.");
    }
}
