using System.Globalization;
using FluentValidation;
using Expyra.Domain.Common;
using Expyra.Domain.Places;

namespace Expyra.Application.Features.Places.Queries.SearchCities;

public sealed class SearchCitiesQueryValidator : AbstractValidator<SearchCitiesQuery>
{
    public SearchCitiesQueryValidator()
    {
        // En az bir ölçüt: ikisi de boşsa istek "tüm dünyanın ilk 20 şehri" demektir ve
        // istemci bunu arama sonucu sanır. Sessiz yok sayma yerine 400 (kabul kriteri 3).
        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Query) || !string.IsNullOrWhiteSpace(x.Country))
            // OverridePropertyName: kök seviye kural, aksi halde ProblemDetails'te
            // anahtarı boş dize olur ve istemci hatayı hangi alana bağlayacağını bilemez.
            .OverridePropertyName("q")
            .WithMessage("Şehir araması için en az bir ölçüt gerekli: q ya da country.");

        // Uzunluk KATLANMIŞ metin üzerinden ölçülüyor: "??" iki karakter ama sıfır harf.
        // Ham uzunluğa bakan bir kural, hiçbir şey aramayan bir sorguyu geçerli sayardı.
        RuleFor(x => x.Query)
            .Must(query => query is null || SearchText.Fold(query).Length >= SearchCitiesQuery.MinQueryLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Arama metni en az {SearchCitiesQuery.MinQueryLength} harf içermeli."));

        RuleFor(x => x.Query)
            .MaximumLength(SearchText.MaxLength);

        RuleFor(x => x.Country)
            .Must(country => country is null || CountryCode.IsValid(country))
            .WithMessage("country iki harfli bir ISO 3166-1 alpha-2 kodu olmalı.");
    }
}
