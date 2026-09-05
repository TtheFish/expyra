using System.Globalization;
using FluentValidation;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Host.Commands.SetHostProfile;

public sealed class SetHostProfileCommandValidator : AbstractValidator<SetHostProfileCommand>
{
    public SetHostProfileCommandValidator()
    {
        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("Dil kodu geçersiz.");

        RuleFor(x => x.Headline)
            .Must(value => value!.Trim().Length <= HostProfile.MaxHeadlineLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Unvan en fazla {HostProfile.MaxHeadlineLength} karakter olabilir."))
            .When(x => !string.IsNullOrWhiteSpace(x.Headline));

        RuleFor(x => x.Bio)
            .Must(value => value!.Trim().Length <= HostProfile.MaxBioLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Tanıtım en fazla {HostProfile.MaxBioLength} karakter olabilir."))
            .When(x => !string.IsNullOrWhiteSpace(x.Bio));
    }
}
