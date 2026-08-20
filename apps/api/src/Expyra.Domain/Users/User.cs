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
/// <para>Bilerek YOK: password_hash, security_stamp, lockout_end. Şifre yok.</para>
/// </summary>
public sealed class User : BaseAuditableEntity
{
    /// <summary>
    /// app_user.display_name sütun genişliği. TEK KAYNAK: hem EF yapılandırması hem
    /// doğrulayıcı buradan okur.
    ///
    /// <para>Neden Domain'de: iki yerde ayrı sabit olarak duruyordu ve yalnız biri
    /// değiştiğinde 81 karakterlik ad doğrulamayı geçip DbUpdateException'a, yani
    /// kullanıcı tarafında 500'e düşüyordu (Blok 1'den kalan borç).</para>
    /// </summary>
    public const int DisplayNameMaxLength = 80;

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

    /// <summary>
    /// Hesabın SONRADAN kazandığı roller. Postgres <c>text[]</c> olarak saklanır —
    /// <c>status</c> sütunundaki okunabilirlik tercihinin aynısı: psql'de <c>{Host}</c>
    /// diye görünür, sayı tablosuna bakmak gerekmez. jsonb değil dizi, çünkü gerektiği
    /// gün <c>roles @&gt; ARRAY['Host']</c> ile doğrudan sorgulanabilir.
    ///
    /// <para><b>Gezgin bu listede YOK ve bu bilinçli.</b> Gezginlik bir rol değil taban:
    /// her hesap gezgindir ve geri alınamaz. Her satıra <c>'Traveler'</c> yazmak sütunu
    /// sabite çevirir, token'ı hiçbir policy'nin bakmadığı bir claim'le şişirir ve
    /// "gezginliği kaldır" gibi anlamsız bir işlemi mümkün gösterirdi. Dolayısıyla
    /// boş dizi = "yalnız gezgin", <c>{Host}</c> = "gezgin + host".</para>
    ///
    /// <para><b>Neden ayrı user_role tablosu değil:</b> satırın taşıyacağı tek bilgi
    /// "var/yok" olurdu ve her token üretimine bir JOIN daha eklerdi. Dizi, rol sayısı
    /// artınca da çalışır; gerçekten "hangi rol ne zaman verildi" gerektiği gün
    /// (denetim kaydı) ayrı bir olay tablosu açılır — o zaten farklı bir ihtiyaç.</para>
    ///
    /// <para>Salt-okunur property + koleksiyon başlatıcı: EF, set edici olmayan
    /// property'yi arka alan üzerinden dolduruyor; dışarıya set edici açmak sütunun
    /// tamamının yanlışlıkla değiştirilmesine kapı olurdu.</para>
    /// </summary>
    public List<string> Roles { get; } = [];

    /// <summary>
    /// Bellekteki satırda rol kontrolü. Property DEĞİL metot: EF get-only property'leri
    /// sütuna eşlemeye çalışır, metotlara hiç bakmaz.
    ///
    /// <para>Sorgu tarafında bu metot KULLANILMAZ — <c>Roles.Contains(...)</c> doğrudan
    /// yazılır ki Npgsql <c>roles @&gt; ARRAY['Host']</c> üretebilsin.</para>
    /// </summary>
    public bool HasRole(string role) => Roles.Contains(role, StringComparer.Ordinal);
}

/// <summary>0'dan başlatılmıyor: EF, CLR varsayılanına eşit değeri INSERT'e koymaz.</summary>
public enum UserStatus
{
    Active = 1,
    Suspended = 2,
    Banned = 3,
}

/// <summary>
/// Rol adları. Enum DEĞİL ve bu bilinçli: aynı değer üç yerde AYNEN duruyor —
/// <c>app_user.roles</c> sütununda, JWT'nin <c>role</c> claim'inde ve authorization
/// policy'sinde. Enum yeniden adlandırılırsa derleyici üç yeri de düzeltir ama
/// veritabanındaki eski satırlar ve dolaşımdaki token'lar sessizce eşleşmez olur.
/// Sabit string burada sözleşmenin kendisidir; değeri değiştirmek migration ister.
///
/// <para>Bugün tek üye var. VISION'a göre ileride Admin gelebilir; o gün buraya bir
/// satır eklenir, veri modeli değişmez.</para>
/// </summary>
public static class UserRole
{
    /// <summary>Deneyim yayınlayabilen hesap. Onay süreci YOK (VISION §9).</summary>
    public const string Host = "Host";
}
