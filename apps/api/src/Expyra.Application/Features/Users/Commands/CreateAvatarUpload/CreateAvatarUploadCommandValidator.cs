using FluentValidation;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Users.Commands.CreateAvatarUpload;

/// <summary>
/// İlan görselleriyle AYNI sınırlar. Avatar için ayrı (daha küçük) bir tavan
/// tanımlanmadı: kullanıcı aynı fotoğrafı iki yere de yüklüyor ve birinde geçip
/// diğerinde reddedilen bir dosya, açıklaması olmayan bir tutarsızlık olurdu.
/// </summary>
internal sealed class CreateAvatarUploadCommandValidator : AbstractValidator<CreateAvatarUploadCommand>
{
    public CreateAvatarUploadCommandValidator()
    {
        RuleFor(x => x.ContentType)
            .NotEmpty()
            .Must(MediaRules.IsAllowedContentType)
            .WithMessage("Yalnız JPEG, PNG ve WebP yüklenebilir.");

        RuleFor(x => x.ByteSize)
            .GreaterThan(0)
            .LessThanOrEqualTo(MediaRules.MaxByteSize)
            .WithMessage($"Dosya en fazla {MediaRules.MaxByteSize / (1024 * 1024)} MB olabilir.");
    }
}
