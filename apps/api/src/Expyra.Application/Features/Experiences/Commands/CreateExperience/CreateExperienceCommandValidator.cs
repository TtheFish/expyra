using FluentValidation;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.CreateExperience;

/// <summary>
/// Yalnız ŞEKİL. "Bu dil kayıt defterinde var mı ve içerik girişine açık mı" sorusu
/// handler'ın işi: cevabı veritabanında ve validator'a DB bağımlılığı sokmak her isteği
/// bir sorgu daha pahalı yapar (<c>UpdateProfileCommandValidator</c> ile aynı sınır).
/// </summary>
public sealed class CreateExperienceCommandValidator : AbstractValidator<CreateExperienceCommand>
{
    public CreateExperienceCommandValidator()
    {
        RuleFor(x => x.OriginalLanguage)
            .NotEmpty()
            .WithMessage("Deneyimin yazıldığı dil zorunlu.");

        // Ayrı RuleFor: `.When(...)` bir zincirin TAMAMINA uygulanır, yani NotEmpty ile
        // aynı zincire yazılsaydı boş değerde hiçbir kural çalışmaz ve istek sessizce
        // doğrulamayı geçerdi.
        RuleFor(x => x.OriginalLanguage)
            .Must(LanguageCode.IsValid)
            .WithMessage("Dil kodu geçersiz.")
            .When(x => !string.IsNullOrWhiteSpace(x.OriginalLanguage));
    }
}
