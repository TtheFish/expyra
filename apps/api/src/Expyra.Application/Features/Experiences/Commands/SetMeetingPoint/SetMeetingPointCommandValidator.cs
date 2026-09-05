using System.Globalization;
using FluentValidation;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetMeetingPoint;

public sealed class SetMeetingPointCommandValidator : AbstractValidator<SetMeetingPointCommand>
{
    public SetMeetingPointCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("Dil kodu geçersiz.");

        RuleFor(x => x.Address)
            .Must(address => address!.Trim().Length <= Experience.MaxMeetingAddressLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Adres en fazla {Experience.MaxMeetingAddressLength} karakter olabilir."))
            .When(x => !string.IsNullOrWhiteSpace(x.Address));

        RuleFor(x => x)
            .Must(x => x.Latitude.HasValue == x.Longitude.HasValue)
            .WithMessage("Enlem ve boylam birlikte verilmeli.")
            .WithName("latitude");

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .When(x => x.Latitude is not null);

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .When(x => x.Longitude is not null);

        RuleFor(x => x.Instructions)
            .Must(TranslationText.FitsDetail)
            .WithMessage(TranslationText.DetailTooLong);
    }
}
