using FluentValidation;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Experiences.Commands.CreateMediaUpload;

internal sealed class CreateMediaUploadCommandValidator : AbstractValidator<CreateMediaUploadCommand>
{
    public CreateMediaUploadCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        // Beyan edilen tip kapalı listeden. Bu kontrol yükleme daha BAŞLAMADAN
        // bariz olanı eliyor; gerçek karar baytlara bakan ImageProbe'un
        // (kayıt adımı). İkisi birbirinin yerine geçmiyor.
        RuleFor(x => x.ContentType)
            .NotEmpty()
            .Must(MediaRules.IsAllowedContentType)
            .WithMessage("Yalnız JPEG, PNG ve WebP yüklenebilir.");

        // 0 ve negatif: imzalanan tavan anlamsız olurdu. Üst sınır tek kaynaktan.
        RuleFor(x => x.ByteSize)
            .GreaterThan(0)
            .LessThanOrEqualTo(MediaRules.MaxByteSize)
            .WithMessage($"Dosya en fazla {MediaRules.MaxByteSize / (1024 * 1024)} MB olabilir.");
    }
}
