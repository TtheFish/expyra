using System.Globalization;
using FluentValidation;
using Expyra.Application.Common.Auth;

namespace Expyra.Application.Features.Auth.Commands.VerifyLoginCode;

public sealed class VerifyLoginCodeCommandValidator : AbstractValidator<VerifyLoginCodeCommand>
{
    public VerifyLoginCodeCommandValidator(AuthOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        RuleFor(x => x.ChallengeId).NotEmpty();

        // [0-9], \d DEĞİL: \d Arap-Hint rakamlarını (٥) da kabul eder ve universal
        // bir platformda bu gerçek bir hata yolu. Uzunluk options'tan geliyor —
        // Auth:Otp:Digits = 8 kaçış valfi sabit regex yazılırsa sessizce çalışmaz olur.
        var pattern = string.Concat(
            "^[0-9]{", options.Digits.ToString(CultureInfo.InvariantCulture), "}$");

        RuleFor(x => x.Code)
            .NotEmpty()
            .Matches(pattern)
            .WithMessage("Kod yalnız rakamlardan oluşmalı.");
    }
}
