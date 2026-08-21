using System.Globalization;
using FluentValidation;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetExperienceTranslation;

/// <summary>
/// Yalnız ŞEKİL. Dilin kayıt defterinde olup olmadığı ve içerik girişine açıklığı
/// handler'ın işi — cevabı veritabanında.
/// </summary>
public sealed class SetExperienceTranslationCommandValidator
    : AbstractValidator<SetExperienceTranslationCommand>
{
    public SetExperienceTranslationCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("Dil kodu geçersiz.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Başlık zorunlu.");

        // KIRPILMIŞ hâl ölçülüyor, çünkü handler da kırpıp yazıyor: ham uzunluğa
        // bakılsaydı sondaki boşluklar sınırda keyfi ret üretirdi. Sınır Domain'den
        // geliyor, EF yapılandırması da aynı sabiti okuyor.
        RuleFor(x => x.Title)
            .Must(title => title.Trim().Length <= ExperienceTranslation.MaxTitleLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Başlık en fazla {ExperienceTranslation.MaxTitleLength} karakter olabilir."))
            .When(x => !string.IsNullOrWhiteSpace(x.Title));

        // Açıklama İSTEĞE BAĞLI: sihirbaz önce başlığı kaydediyor ve yayın doğrulaması
        // çeviri SATIRINI şart koşuyor, açıklamanın dolu olmasını değil
        // (PLAN Blok 5 kabul kriteri 1 — listeye kural eklemiyoruz).
        RuleFor(x => x.Description)
            .Must(description => description!.Trim().Length <= ExperienceTranslation.MaxDescriptionLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Açıklama en fazla {ExperienceTranslation.MaxDescriptionLength} karakter olabilir."))
            .When(x => !string.IsNullOrWhiteSpace(x.Description));
    }
}
