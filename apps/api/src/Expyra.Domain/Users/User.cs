using Expyra.Domain.Common;

namespace Expyra.Domain.Users;

/// <summary>
/// Hesap. Tablo adı app_user — "user" Postgres'te AYRILMIŞ kelime; EF tırnaklıyor
/// ama psql'de elle yazılan her SELECT patlıyor.
///
/// <para>Neden BaseAuditableEntity (Language'ın aksine doğal anahtar değil):
/// doğal anahtarı yok — e-posta aday görünüyor ama DEĞİŞEBİLİR ve PII'dir; PK olursa
/// her FK'ya, URL'e ve log satırına yayılır. CreatedAtUtc gerçek veri (hesap yaşı,
/// GDPR ihracı) ve ApplyAuditTimestamps zaten dolduruyor.</para>
///
/// <para>Bilerek YOK: password_hash, security_stamp, lockout_end, roles. Şifre yok;
/// rol modeli Faz 1.7'nin kendi migration'ı.</para>
/// </summary>
public sealed class User : BaseAuditableEntity
{
    /// <summary>Kullanıcının yazdığı hâl. GÖSTERİMDE bu kullanılır, aramada değil.</summary>
    public required string Email { get; set; }

    /// <summary>Tekillik ve tüm lookup'lar bunun üzerinden. Bkz. <see cref="EmailAddress"/>.</summary>
    public required string NormalizedEmail { get; set; }

    /// <summary>OTP akışında satır doğduğu anda dolu — "doğrulanmamış kullanıcı" durumu YOK.</summary>
    public DateTimeOffset? EmailVerifiedAtUtc { get; set; }

    /// <summary>Bu dilimde SORULMUYOR (Faz 1.5). Sütun şimdi açılıyor, ekran sonra.</summary>
    public string? DisplayName { get; set; }

    /// <summary>VISION §9: ban uygulanabilir olmalı. Token üretilmeden ÖNCE kontrol edilir.</summary>
    public UserStatus Status { get; set; } = UserStatus.Active;

    /// <summary>FK → language.code. null = "seçmedi", 'en' = "İngilizce seçti" (docs/I18N.md).</summary>
    public string? PreferredLanguage { get; set; }

    /// <summary>Sadece OTP doğrulamasında güncellenir — token yenilemede DEĞİL.</summary>
    public DateTimeOffset? LastLoginAtUtc { get; set; }
}

/// <summary>0'dan başlatılmıyor: EF, CLR varsayılanına eşit değeri INSERT'e koymaz.</summary>
public enum UserStatus
{
    Active = 1,
    Suspended = 2,
    Banned = 3,
}
