using System.Globalization;
using FluentValidation;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Users.Commands.UpdateProfile;

/// <summary>
/// Yalnız ŞEKİL doğrulanır. "Bu dil kayıt defterinde var mı" sorusu handler'ın işi:
/// cevabı veritabanında ve validator'a DB bağımlılığı sokmak her isteği bir sorgu
/// daha pahalı yapar.
/// </summary>
public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        // KIRPILMIŞ hâl ölçülüyor, çünkü handler da kırpıp yazıyor. Ham uzunluğa
        // bakılsaydı sondaki boşluklar yüzünden sınırda keyfi ret üretirdi.
        //
        // Sınır User.DisplayNameMaxLength'ten geliyor; EF yapılandırması da aynı
        // sabiti okuyor. Ayrı yazıldıkları sürece biri değişip diğeri kalabiliyordu
        // ve sonucu 400 değil, DbUpdateException üzerinden 500 oluyordu.
        RuleFor(x => x.DisplayName)
            .Must(name => name is null || name.Trim().Length <= User.DisplayNameMaxLength)
            .WithMessage(string.Create(
                CultureInfo.InvariantCulture,
                $"Görünen ad en fazla {User.DisplayNameMaxLength} karakter olabilir."));

        // Opsiyonel alan: boş bırakılırsa kural çalışmaz ve tercih temizlenir.
        RuleFor(x => x.PreferredLanguage)
            .Must(language => LanguageCode.IsValid(language))
            .WithMessage("Dil kodu geçersiz.")
            .When(x => !string.IsNullOrWhiteSpace(x.PreferredLanguage));
    }
}
