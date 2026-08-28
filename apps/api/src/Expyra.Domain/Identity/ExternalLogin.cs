using Expyra.Domain.Common;

namespace Expyra.Domain.Identity;

/// <summary>
/// Sosyal giriş bağı (Faz 1.9). Bu dilimde HİÇBİR KOD yazmıyor — tablo şimdi
/// kuruluyor çünkü Apple e-postaya bağlanmaya izin vermiyor: @privaterelay.appleid.com
/// takma adresi veriyor ve gerçek e-postayı yalnız İLK yetkilendirmede döndürüyor.
/// Sütunları 1.9'da eklemek, canlı veriyle "hangi kullanıcı hangi Apple hesabı"
/// eşleşmesini geriye dönük kurmak demek — imkânsıza yakın.
/// </summary>
public sealed class ExternalLogin : BaseAuditableEntity
{
    /// <summary>"google" | "apple". Language'ın aksine tabloya taşınmıyor: her sağlayıcı kod ister.</summary>
    public required string Provider { get; set; }

    /// <summary>Sağlayıcının kararlı 'sub' değeri. Hesabın gerçek çapası BUDUR, e-posta değil.</summary>
    public required string ProviderKey { get; set; }

    public required Guid UserId { get; set; }

    /// <summary>Sadece bilgi amaçlı; ASLA eşleştirme anahtarı değil.</summary>
    public string? ProviderEmail { get; set; }
}
