using FluentValidation;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Users.Commands.UpdateProfile;

/// <summary>
/// Yalnız ŞEKİL doğrulanır. "Bu dil kayıt defterinde var mı" sorusu handler'ın işi:
/// cevabı veritabanında ve validator'a DB bağımlılığı sokmak her isteği bir sorgu
/// daha pahalı yapar.
/// </summary>
public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    /// <summary>
    /// app_user.display_name sütun genişliği (UserConfiguration.HasMaxLength(80)).
    /// Blok 1 bilinçli olarak migration'sız olduğu için sabit Domain'e TAŞINMADI —
    /// iki yer birlikte değişmeli, yalnız biri değişirse DbUpdateException 500'e düşer.
    /// </summary>
    private const int DisplayNameMaxLength = 80;

    public UpdateProfileCommandValidator()
    {
        // KIRPILMIŞ hâl ölçülüyor, çünkü handler da kırpıp yazıyor. Ham uzunluğa
        // bakılsaydı sondaki boşluklar yüzünden sınırda keyfi ret üretirdi.
        RuleFor(x => x.DisplayName)
            .Must(name => name is null || name.Trim().Length <= DisplayNameMaxLength)
            .WithMessage("Görünen ad en fazla 80 karakter olabilir.");

        // Opsiyonel alan: boş bırakılırsa kural çalışmaz ve tercih temizlenir.
        RuleFor(x => x.PreferredLanguage)
            .Must(language => LanguageCode.IsValid(language))
            .WithMessage("Dil kodu geçersiz.")
            .When(x => !string.IsNullOrWhiteSpace(x.PreferredLanguage));
    }
}
