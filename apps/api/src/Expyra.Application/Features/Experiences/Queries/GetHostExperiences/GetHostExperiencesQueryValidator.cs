using FluentValidation;

namespace Expyra.Application.Features.Experiences.Queries.GetHostExperiences;

/// <summary>
/// Tek ilke: anlaşılmayan bir parametre <b>sessizce yok sayılmaz</b>. Yok sayılsaydı
/// <c>?status=taslak</c> yazan istemci tüm ilanları alır, bozuk bir cursor sonsuz ilk
/// sayfaya döner, tavanı aşan bir limit sınırsız listeyi geri getirirdi — hiçbiri hata
/// olarak görünmezdi (Blok 4 kabul kriteri 3'ün aynı ilkesi).
/// </summary>
public sealed class GetHostExperiencesQueryValidator : AbstractValidator<GetHostExperiencesQuery>
{
    public GetHostExperiencesQueryValidator()
    {
        RuleFor(x => x.Status)
            .Must(status => GetHostExperiencesQuery.TryParseStatus(status, out _))
            .WithMessage("Durum filtresi 'Draft', 'Published' veya 'Archived' olmalı.")
            .When(x => !string.IsNullOrWhiteSpace(x.Status));

        RuleFor(x => x.Cursor)
            .Must(cursor => ExperienceCursor.TryDecode(cursor, out _))
            .WithMessage("cursor geçersiz; sayfalamaya baştan başla.")
            .When(x => !string.IsNullOrWhiteSpace(x.Cursor));

        RuleFor(x => x.Limit)
            .InclusiveBetween(1, GetHostExperiencesQuery.MaxPageSize)
            .WithMessage($"limit 1 ile {GetHostExperiencesQuery.MaxPageSize} arasında olmalı.")
            .When(x => x.Limit.HasValue);
    }
}
