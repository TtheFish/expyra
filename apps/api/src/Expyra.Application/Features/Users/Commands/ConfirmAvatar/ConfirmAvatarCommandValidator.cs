using FluentValidation;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Users.Commands.ConfirmAvatar;

/// <summary>
/// Anahtar <c>users.avatar_key</c> kolonuna yazılıyor ve o kolon
/// <see cref="ExperienceMedia.MaxStorageKeyLength"/> ile sınırlı.
/// </summary>
internal sealed class ConfirmAvatarCommandValidator : AbstractValidator<ConfirmAvatarCommand>
{
    public ConfirmAvatarCommandValidator()
    {
        RuleFor(x => x.StorageKey)
            .NotEmpty()
            .MaximumLength(ExperienceMedia.MaxStorageKeyLength);
    }
}
