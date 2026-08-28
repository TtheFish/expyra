namespace Expyra.Domain.Languages;

/// <summary>
/// Dil kayıt defteri. Sistemin "desteklenen diller" listesi budur — kodda enum YOK.
/// Yeni dil açmak satır eklemektir; kod değişmez, deploy gerekmez (docs/I18N.md).
///
/// <para>
/// Neden <see cref="Common.BaseEntity"/> değil: bu bir referans tablosu, doğal
/// anahtarı var. Guid PK verilirse çeviri satırları <c>language_id</c> ile bağlanır
/// ve her sorgu bir join daha ister; <c>experience_translation.language = 'de'</c>
/// hem okunabilir hem de seed verisi migration'lar arasında deterministik kalır.
/// </para>
/// </summary>
public sealed class Language
{
    /// <summary>BCP-47, normalize edilmiş. Doğrulama: <see cref="LanguageCode"/>.</summary>
    public required string Code { get; set; }

    /// <summary>Dil seçicide kendi dilinde gösterilir — "Deutsch", "日本語".</summary>
    public required string NativeName { get; set; }

    /// <summary>Yönetim ekranları ve deterministik sıralama için.</summary>
    public required string EnglishName { get; set; }

    /// <summary>
    /// Postgres full-text konfigürasyonu ("german", "turkish"). <c>null</c> ise
    /// o dil için yerleşik stemmer yok — arama trigram benzerliğine düşer.
    /// Çekçe, Ukraynaca, Korece ve Japonca bu durumda: docs/I18N.md §4.
    /// </summary>
    public string? SearchConfig { get; set; }

    /// <summary>Arapça/İbranice geldiğinde arayüz <c>dir="rtl"</c> ile render edilir.</summary>
    public bool IsRightToLeft { get; set; }

    /// <summary>Arayüz çevirisi tamam mı. Yarım çeviri yayına alınmaz.</summary>
    public bool UiAvailable { get; set; }

    /// <summary>
    /// Host bu dilde içerik girebilir mi. Varsayılan açık — kapatmak bir dili
    /// silmeden durdurmanın yolu (silmek çeviri satırlarını yetim bırakırdı).
    /// </summary>
    public bool ContentAllowed { get; set; } = true;
}
