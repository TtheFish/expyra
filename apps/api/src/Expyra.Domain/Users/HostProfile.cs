namespace Expyra.Domain.Users;

/// <summary>
/// Host'un kendini tanıttığı metin (Airbnb "About me" + başlıktaki unvan).
///
/// <para><b>Neden <c>app_user</c>'a iki sütun değil de ayrı tablo:</b> biyografi
/// İÇERİK — host'un cümlesi, bir dilde yazılmış (docs/I18N.md §1). Kullanıcı
/// tablosu kimlik ve tercih taşıyor; içerik satırının kendi dili ve kendi
/// güncelleme damgası var. Ayrıca yalnız host'larda dolu: 1000 misafir hesabında
/// boş iki sütun taşımak yerine yalnız var olduğunda satır açılıyor.</para>
///
/// <para><b>Tek dil.</b> Çok dilli biyografi (dil başına satır) bugün gereksiz:
/// misafir tarafı metni <see cref="Language"/> ile birlikte alıyor ve arayüz
/// "bu metin Türkçe" rozetini basabiliyor. Çeviri satırı gerektiğinde bu tablo
/// (UserId, Language) anahtarına genişler; bugünkü satır o zaman ilk satır olur.</para>
/// </summary>
public sealed class HostProfile
{
    public const int MaxHeadlineLength = 80;

    public const int MaxBioLength = 2000;

    /// <summary><c>app_user.id</c>; aynı zamanda birincil anahtar.</summary>
    public Guid UserId { get; set; }

    /// <summary>"İstanbul'da yerel rehber ve tarihçi" — ad altındaki tek satır.</summary>
    public string? Headline { get; set; }

    public string? Bio { get; set; }

    /// <summary>Metinlerin yazıldığı dil (BCP-47, kanonik). <c>language.code</c>'a FK.</summary>
    public required string Language { get; set; }

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
