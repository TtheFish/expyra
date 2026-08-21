using System.Globalization;
using FluentValidation;
using Expyra.Domain.Catalog;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.UpdateExperience;

/// <summary>
/// Yalnız ŞEKİL ve sınırlar. "Bu şehir/kategori/dil var mı" soruları handler'da —
/// cevapları veritabanında.
///
/// <para>Sınırlar Domain'deki sabitlerden okunuyor (<c>User.DisplayNameMaxLength</c>
/// kalıbı): ayrı yazılsalardı yalnız biri değişir ve sınırı aşan girdi 400 yerine
/// <c>DbUpdateException</c> üzerinden 500 olurdu.</para>
///
/// <para>Her kural AYRI <c>RuleFor</c> bloğunda: <c>.When(...)</c> bir zincirin
/// TAMAMINA uygulanır ve tek zincire yığılan kurallarda koşul yanlışlıkla hepsini
/// birden susturur.</para>
/// </summary>
public sealed class UpdateExperienceCommandValidator : AbstractValidator<UpdateExperienceCommand>
{
    /// <summary>
    /// Aynı ilanda 10'dan fazla konuşulan dil ya da etiket bilgi değil gürültüdür —
    /// ve doğrulanmamış bir liste uzunluğu, tek istekte binlerce satır yazdırmanın yolu.
    /// </summary>
    private const int MaxListItems = 10;

    public UpdateExperienceCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();

        RuleFor(x => x.CityId)
            .NotEmpty()
            .WithMessage("Şehir kimliği boş olamaz.")
            .When(x => x.CityId is not null);

        RuleFor(x => x.CategorySlug)
            .NotEmpty()
            .WithMessage("Kategori boş olamaz.")
            .When(x => x.CategorySlug is not null);

        RuleFor(x => x.CategorySlug)
            .MaximumLength(Category.MaxSlugLength)
            .When(x => !string.IsNullOrWhiteSpace(x.CategorySlug));

        // Alan bir kez doldurulduktan sonra 0'a geri DÖNEMİYOR. Yayın kapısı süreye
        // bakmıyor (PLAN kabul kriteri 1 dört koşul sayıyor); "0 dakikalık deneyim"e
        // karşı tek koruma bu satır.
        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(1, Experience.MaxDurationMinutes)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Süre 1 ile {Experience.MaxDurationMinutes} dakika arasında olmalı."))
            .When(x => x.DurationMinutes is not null);

        // 0'a İZİN VAR: taslakta "henüz karar vermedim" geçerli bir durum ve yayın
        // doğrulaması zaten Capacity > 0 arıyor. Negatif ise anlamsız.
        RuleFor(x => x.Capacity)
            .InclusiveBetween(0, Experience.MaxCapacity)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Kapasite 0 ile {Experience.MaxCapacity} arasında olmalı."))
            .When(x => x.Capacity is not null);

        RuleFor(x => x.SpokenLanguages)
            .Must(languages => languages!.Count <= MaxListItems)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"En fazla {MaxListItems} konuşulan dil seçilebilir."))
            .When(x => x.SpokenLanguages is not null);

        RuleFor(x => x.SpokenLanguages)
            .Must(languages => languages!.All(LanguageCode.IsValid))
            .WithMessage("Konuşulan dil kodlarından biri geçersiz.")
            .When(x => x.SpokenLanguages is not null);

        RuleFor(x => x.Tags)
            .Must(tags => tags!.Count <= MaxListItems)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"En fazla {MaxListItems} etiket eklenebilir."))
            .When(x => x.Tags is not null);

        RuleFor(x => x.Tags)
            // KIRPILMIŞ hâl ölçülüyor, çünkü handler da kırpıp yazıyor: ham uzunluğa
            // bakılsaydı sondaki boşluklar sınırda keyfi ret üretirdi.
            .Must(tags => tags!.All(tag =>
                !string.IsNullOrWhiteSpace(tag) && tag.Trim().Length <= ExperienceTag.MaxDisplayLength))
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Etiket boş olamaz ve en fazla {ExperienceTag.MaxDisplayLength} karakter olabilir."))
            .When(x => x.Tags is not null);
    }
}
