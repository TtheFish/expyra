using FluentValidation;

namespace Expyra.Application.Features.Auth.Commands.RefreshSession;

public sealed class RefreshSessionCommandValidator : AbstractValidator<RefreshSessionCommand>
{
    public RefreshSessionCommandValidator()
    {
        // Üst sınır 512: 32 baytlık Base64Url token ~43 karakter. Sınır, hash'lemeye
        // hiç girmeden saçma boyutlu gövdeleri kesmek için — biçim doğrulaması değil.
        RuleFor(x => x.RefreshToken)
            .NotEmpty()
            .MaximumLength(512);
    }
}
