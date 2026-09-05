using System.Globalization;
using FluentValidation;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetItinerary;

public sealed class SetItineraryCommandValidator : AbstractValidator<SetItineraryCommand>
{
    public SetItineraryCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("Dil kodu geçersiz.");

        RuleFor(x => x.Steps)
            .NotNull()
            .Must(steps => steps.Count <= ExperienceItineraryStep.MaxSteps)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Program en fazla {ExperienceItineraryStep.MaxSteps} adım olabilir."));

        RuleForEach(x => x.Steps).ChildRules(step =>
        {
            step.RuleFor(x => x.Title)
                .NotEmpty()
                .WithMessage("Adım başlığı zorunlu.")
                .Must(title => title.Trim().Length <= ExperienceItineraryStep.MaxTitleLength)
                .WithMessage(string.Create(
                    CultureInfo.InvariantCulture,
                    $"Adım başlığı en fazla {ExperienceItineraryStep.MaxTitleLength} karakter olabilir."));

            step.RuleFor(x => x.Body)
                .Must(body => body!.Trim().Length <= ExperienceItineraryStep.MaxBodyLength)
                .WithMessage(string.Create(
                    CultureInfo.InvariantCulture,
                    $"Adım açıklaması en fazla {ExperienceItineraryStep.MaxBodyLength} karakter olabilir."))
                .When(x => !string.IsNullOrWhiteSpace(x.Body));
        });
    }
}
