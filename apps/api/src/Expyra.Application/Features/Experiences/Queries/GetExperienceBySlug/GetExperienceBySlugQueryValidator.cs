using FluentValidation;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Queries.GetExperienceBySlug;

/// <summary>
/// Slug'ın <b>biçimi</b> doğrulanıyor, <b>varlığı</b> değil — var olmayan slug 404
/// (handler'ın işi), sütuna hiç sığmayan bir metin ise 400.
///
/// <para>Ayrımın sebebi: 500 karakterlik bir "slug" var olamaz, dolayısıyla onu
/// veritabanına kadar taşımak boşa bir sorgu. Buna karşılık biçimi doğru ama karşılığı
/// olmayan bir slug, ilanın arşivlenmiş olmasından ayırt EDİLEMEMELİ (kabul kriteri 3) —
/// o yüzden orada tek bir 404 var.</para>
/// </summary>
public sealed class GetExperienceBySlugQueryValidator : AbstractValidator<GetExperienceBySlugQuery>
{
    public GetExperienceBySlugQueryValidator()
    {
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(Experience.MaxSlugLength);

        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("lang geçerli bir BCP-47 dil kodu olmalı (örnek: tr, en, de-AT).")
            .When(x => !string.IsNullOrWhiteSpace(x.Language));
    }
}
