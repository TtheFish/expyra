using FluentValidation;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Auth.Commands.RequestLoginCode;

/// <summary>
/// Yalnız ŞEKİL doğrulanır. "Bu adres kayıtlı mı" sorusu ne buraya ne handler'a girer —
/// girdiği anda uç bir enumeration oracle'ına döner.
/// </summary>
public sealed class RequestLoginCodeCommandValidator : AbstractValidator<RequestLoginCodeCommand>
{
    public RequestLoginCodeCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .MaximumLength(EmailAddress.MaxLength)
            .Must(email => EmailAddress.IsValid(email))
            .WithMessage("Geçerli bir e-posta adresi gir.");

        // Opsiyonel alan: verilmemişse kural çalışmaz, dil Accept-Language'dan çözülür.
        RuleFor(x => x.PreferredLanguage)
            .Must(language => LanguageCode.IsValid(language))
            .WithMessage("Dil kodu geçersiz.")
            .When(x => !string.IsNullOrWhiteSpace(x.PreferredLanguage));
    }
}
