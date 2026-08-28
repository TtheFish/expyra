using System.Net;
using Expyra.Domain.Common;

namespace Expyra.Domain.Identity;

/// <summary>
/// Rotasyonlu yenileme token'ı. Her yenilemede YENİ satır doğar; eski satır silinmez,
/// iptal edilir — yeniden kullanım tespiti tam olarak o eski satırlar sayesinde mümkün.
/// </summary>
public sealed class RefreshToken : BaseAuditableEntity
{
    public required Guid UserId { get; set; }

    /// <summary>
    /// SHA-256, 32 bayt. Pepper GEREKMİYOR: 256 bit CSPRNG çıktısı, kaba kuvvet uzayı yok.
    /// OTP'de pepper gerekiyordu çünkü 6 hane dardı.
    /// </summary>
    public required byte[] TokenHash { get; set; }

    /// <summary>
    /// Rotasyon ailesi: tek girişten türeyen tüm token'lar aynı değer. İlk token'da
    /// FamilyId = Id. Reuse tespitinde iptal tek indexli UPDATE ile aileye uygulanır.
    /// </summary>
    public required Guid FamilyId { get; set; }

    /// <summary>Yerini aldığı token. FK YOK — temizlik eski satırı silince sarkması serbest;
    /// forensik işaretçi, bütünlük kısıtı değil. Insert anında yazılır, hiç UPDATE edilmez.</summary>
    public Guid? PreviousTokenId { get; set; }

    public required DateTimeOffset ExpiresAtUtc { get; set; }

    /// <summary>Rotasyonla UZAMAZ. Tavan olmadan çalınan zincir sonsuza kadar yaşar.</summary>
    public required DateTimeOffset AbsoluteExpiresAtUtc { get; set; }

    public DateTimeOffset? RevokedAtUtc { get; set; }

    /// <summary>"Neden çıkış yaptırıldım" sorusunun tek cevabı. Bu sütun olmadan
    /// destek talebi debug edilemez. Grace penceresi de bunu okuyor.</summary>
    public TokenRevocationReason? RevocationReason { get; set; }

    public IPAddress? CreatedByIp { get; set; }

    public bool IsActive(DateTimeOffset now)
        => RevokedAtUtc is null && now < ExpiresAtUtc && now < AbsoluteExpiresAtUtc;
}

/// <summary>0'dan başlatılmıyor: EF, CLR varsayılanına eşit değeri INSERT'e koymaz.</summary>
public enum TokenRevocationReason
{
    /// <summary>Normal rotasyon. Grace penceresi YALNIZ bu sebebe açılır.</summary>
    Rotated = 1,

    ReuseDetected = 2,
    SignOut = 3,
    AccountSuspended = 4,
}
