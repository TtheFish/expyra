using System.Globalization;
using FluentValidation;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetExperienceDetails;

public sealed class SetExperienceDetailsCommandValidator : AbstractValidator<SetExperienceDetailsCommand>
{
    public SetExperienceDetailsCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("Dil kodu geçersiz.");

        // 0 kabul edilmiyor: "sınır yok" null ile söyleniyor, iki farklı yazım aynı
        // anlama gelmesin.
        RuleFor(x => x.MinimumAge)
            .InclusiveBetween(1, Experience.MaxMinimumAge)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Yaş sınırı 1 ile {Experience.MaxMinimumAge} arasında olmalı."))
            .When(x => x.MinimumAge is not null);

        RuleFor(x => x.ActivityLevel)
            .IsInEnum()
            .When(x => x.ActivityLevel is not null);

        RuleFor(x => x.WhatToBring).Must(TranslationText.FitsDetail).WithMessage(TranslationText.DetailTooLong);
        RuleFor(x => x.NotIncluded).Must(TranslationText.FitsDetail).WithMessage(TranslationText.DetailTooLong);
        RuleFor(x => x.Accessibility).Must(TranslationText.FitsDetail).WithMessage(TranslationText.DetailTooLong);
    }
}
