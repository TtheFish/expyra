using FluentValidation;

namespace Expyra.Application.Features.Auth.Commands.SignOut;

/// <summary>
/// Boş token handler'a ulaşırsa <c>HashRefreshToken</c> ArgumentException atıyor ve
/// istek 500 dönüyordu (#44). Üst sınır <c>RefreshSessionCommandValidator</c> ile aynı.
/// </summary>
public sealed class SignOutCommandValidator : AbstractValidator<SignOutCommand>
{
    public SignOutCommandValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty()
            .MaximumLength(512);
    }
}
