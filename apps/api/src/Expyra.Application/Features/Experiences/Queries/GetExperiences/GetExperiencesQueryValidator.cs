using FluentValidation;
using Expyra.Domain.Common;
using Expyra.Domain.Languages;
using Expyra.Domain.Places;

namespace Expyra.Application.Features.Experiences.Queries.GetExperiences;

/// <summary>
/// Üç kural, tek ilke: <b>anlaşılmayan bir parametre sessizce yok sayılmaz</b>
/// (Blok 4 kabul kriteri 3). Yok sayılsaydı bozuk bir şehir anahtarı "bu şehirde ilan
/// yok" ekranına, bozuk bir cursor sonsuz ilk sayfaya dönerdi ve ikisi de hiçbir yerde
/// hata olarak görünmezdi.
/// </summary>
public sealed class GetExperiencesQueryValidator : AbstractValidator<GetExperiencesQuery>
{
    public GetExperiencesQueryValidator()
    {
        RuleFor(x => x.City)
            .Must(CityKey.IsValid)
            .WithMessage("city 'ülke-slug' biçiminde olmalı (örnek: cz-prague).")
            .When(x => !string.IsNullOrWhiteSpace(x.City));

        // Cursor'ı SUNUCU üretiyor: elle yazılmış ya da kırpılmış bir değer, kullanıcının
        // düzeltebileceği bir şey değil — istemci onu olduğu gibi geri göndermeli.
        RuleFor(x => x.Cursor)
            .Must(cursor => ExperienceCursor.TryDecode(cursor, out _))
            .WithMessage("cursor geçersiz; sayfalamaya baştan başla.")
            .When(x => !string.IsNullOrWhiteSpace(x.Cursor));

        // Kayıt defterinde OLMAYAN ama biçimi doğru bir kod (ör. 'de-AT') geçerli:
        // zincir onu ikinci adımda 'de'ye indiriyor. Reddedilen tek şey BİÇİM hatası —
        // aksi halde istemciye "önce dil listesini indir" zorunluluğu yüklenirdi.
        RuleFor(x => x.Language)
            .Must(LanguageCode.IsValid)
            .WithMessage("lang geçerli bir BCP-47 dil kodu olmalı (örnek: tr, en, de-AT).")
            .When(x => !string.IsNullOrWhiteSpace(x.Language));

        RuleFor(x => x.Currency)
            .Must(CurrencyCode.IsValid)
            .WithMessage("currency geçerli bir ISO 4217 para birimi kodu olmalı (örnek: EUR, TRY).")
            .When(x => !string.IsNullOrWhiteSpace(x.Currency));
    }
}
