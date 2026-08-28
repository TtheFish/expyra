using System.Net;
using Expyra.Domain.Common;

namespace Expyra.Domain.Identity;

/// <summary>
/// Tek kullanımlık giriş kodu. Kayıt ve giriş TEK akış olduğu için kod istendiğinde
/// kullanıcı satırı henüz var olmayabilir — bu yüzden satırın çapası E-POSTADIR,
/// user_id değil. user_id'ye FK YOK, bilinçli.
///
/// <para>Purpose sütunu YOK: bu dilimde tek amaç var. E-posta değişikliği doğrulaması
/// (Faz 1.5) geldiğinde sütun eklemek, 7 günde ölen satırları olan bir tabloda
/// önemsiz bir migration — bugün tahmin etmekten ucuz.</para>
/// </summary>
public sealed class LoginCode : BaseAuditableEntity
{
    public required string NormalizedEmail { get; set; }

    /// <summary>Kullanıcının yazdığı hâl. Mail buraya gider, app_user.email buradan tohumlanır.</summary>
    public required string EmailDisplay { get; set; }

    /// <summary>HMACSHA256(pepper, $"{Id:N}:{code}") — 32 bayt. Id satır bazlı tuz.</summary>
    public required byte[] CodeHash { get; set; }

    public LoginCodeStatus Status { get; set; } = LoginCodeStatus.Pending;

    /// <summary>Pending'den çıkış anı (tüketildi / yandı / geçersizleşti). Forensik için.</summary>
    public DateTimeOffset? ClosedAtUtc { get; set; }

    public int AttemptCount { get; set; }

    public required DateTimeOffset ExpiresAtUtc { get; set; }

    /// <summary>
    /// Kodun İSTENDİĞİ andaki dil (FK → language.code). Yeni kullanıcıda user satırı yok,
    /// dolayısıyla preferred_language de yok — e-postanın dili BURADAN okunur ve hesap
    /// oluşurken app_user.preferred_language buradan tohumlanır.
    /// </summary>
    public string? Language { get; set; }

    /// <summary>IPv6'da /64'e maskelenmiş. Faz 10.1 gelene kadar tek kötüye kullanım sinyali.</summary>
    public IPAddress? RequestIp { get; set; }

    /// <summary>
    /// Süre dolumu ayrı bir DURUM değil, <see cref="ExpiresAtUtc"/>'den türetilir —
    /// arka planda satır yeniden yazmaya gerek kalmasın diye.
    /// </summary>
    public bool IsUsable(DateTimeOffset now, int maxAttempts)
        => Status == LoginCodeStatus.Pending && AttemptCount < maxAttempts && now < ExpiresAtUtc;
}

/// <summary>0'dan başlatılmıyor: EF, CLR varsayılanına eşit değeri INSERT'e koymaz.</summary>
public enum LoginCodeStatus
{
    Pending = 1,

    /// <summary>Doğru kod girildi.</summary>
    Consumed = 2,

    /// <summary>Deneme limiti doldu — doğru kod gelse bile kabul edilmez.</summary>
    Burned = 3,

    /// <summary>Aynı e-posta için yeni kod istendi.</summary>
    Superseded = 4,
}
