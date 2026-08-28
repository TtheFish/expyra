using FluentValidation;

namespace Expyra.Application.Features.Experiences.Queries.GetHostExperiences;

/// <summary>
/// Tek kural, tek amaç: tanınmayan bir durum filtresi <b>sessizce yok sayılmasın</b>.
/// Yok sayılsaydı <c>?status=taslak</c> yazan istemci tüm ilanları alır ve listenin
/// yanlış olduğunu hiçbir yerden anlayamazdı (Blok 4 kabul kriteri 3'ün aynı ilkesi).
/// </summary>
public sealed class GetHostExperiencesQueryValidator : AbstractValidator<GetHostExperiencesQuery>
{
    public GetHostExperiencesQueryValidator()
        => RuleFor(x => x.Status)
            .Must(status => GetHostExperiencesQuery.TryParseStatus(status, out _))
            .WithMessage("Durum filtresi 'Draft', 'Published' veya 'Archived' olmalı.")
            .When(x => !string.IsNullOrWhiteSpace(x.Status));
}
