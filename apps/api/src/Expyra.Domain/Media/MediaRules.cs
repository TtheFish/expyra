using System.Globalization;

namespace Expyra.Domain.Media;

/// <summary>
/// Yüklemenin sınırları. <b>Tek kaynak</b>: aynı sayı hem imzalanan adreste
/// (depo reddediyor), hem doğrulayıcıda (400 dönüyor), hem de web'in dosya
/// seçicisinde (kullanıcıya söylüyor) geçiyor. Üçe dağılsaydı biri değiştiğinde
/// kullanıcı "10 MB'a kadar" yazısını okuyup 8 MB'lık dosyada hata alırdı.
/// </summary>
public static class MediaRules
{
    /// <summary>
    /// Dosya tavanı: 10 MB. Modern bir telefon fotoğrafı 3-6 MB; 10 MB rahat pay
    /// bırakıyor ve tek bir isteğin diskte açabileceği yeri sınırlı tutuyor.
    /// </summary>
    public const long MaxByteSize = 10 * 1024 * 1024;

    /// <summary>
    /// Alt ölçü. Kapak görseli kartta ve detay sayfasında büyük çiziliyor;
    /// bunun altındaki bir dosya ekranda bulanıklaşır. Reddetmek, host'un
    /// ilanının kötü görünmesine izin vermekten iyi.
    /// </summary>
    public const int MinWidth = 800;

    /// <summary>Alt ölçü — bkz. <see cref="MinWidth"/>.</summary>
    public const int MinHeight = 600;

    /// <summary>
    /// Deneyim başına görsel tavanı. Sınırsız olsaydı tek ilan galeriyi de
    /// depolama faturasını da tek başına şişirebilirdi. On iki, bir deneyimi
    /// anlatmaya fazlasıyla yeter.
    /// </summary>
    public const int MaxPerExperience = 12;

    /// <summary>
    /// İmzalı adresin ömrü. Kısa: adres sızarsa saldırganın penceresi bu kadar.
    /// Yavaş bağlantıda büyük dosya yüklemeye yetecek kadar uzun.
    /// </summary>
    public static readonly TimeSpan UploadLifetime = TimeSpan.FromMinutes(15);

    /// <summary>
    /// İstemcinin beyan edebileceği içerik tipleri. Beyan yalnız imzaya giriyor;
    /// KABUL kararı <see cref="ImageProbe"/>'un okuduğu gerçek bayta bakıyor.
    /// Bu liste onu gereksiz kılmıyor, yükleme daha başlamadan bariz olanı eliyor.
    /// </summary>
    public static bool IsAllowedContentType(string? contentType)
        => contentType is "image/jpeg" or "image/png" or "image/webp";

    /// <summary>
    /// Ölçü kabul edilebilir mi. <see cref="ImageProbe"/> tavanı zaten uyguluyor;
    /// buradaki taban bir ürün kararı, güvenlik kuralı değil.
    /// </summary>
    public static bool IsAcceptableSize(ImageInfo info)
    {
        ArgumentNullException.ThrowIfNull(info);
        return info.Width >= MinWidth && info.Height >= MinHeight;
    }

    /// <summary>Biçimin dosya uzantısı — depo anahtarında okunabilirlik için.</summary>
    public static string ExtensionOf(ImageFormat format) => format switch
    {
        ImageFormat.Jpeg => "jpg",
        ImageFormat.Png => "png",
        ImageFormat.Webp => "webp",
        _ => throw new ArgumentOutOfRangeException(nameof(format)),
    };

    /// <summary>Beyan edilen içerik tipinin uzantısı — yükleme ANINDA, bayt henüz yokken.</summary>
    public static string ExtensionOfContentType(string contentType) => contentType switch
    {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => throw new ArgumentOutOfRangeException(nameof(contentType)),
    };

    /// <summary>
    /// Deneyim görselinin depo anahtarı: <c>experiences/{experienceId}/{mediaId}.{uzantı}</c>.
    ///
    /// <para><b>Neden deneyim kimliği yolda:</b> kayıt ucu, istemcinin gönderdiği
    /// anahtarın bu deneyime ait olduğunu ön ekten doğruluyor. Düz bir
    /// <c>uploads/{guid}</c> olsaydı host A, host B'nin yüklediği nesneyi kendi
    /// ilanına kaydedebilirdi.</para>
    ///
    /// <para><b>Neden medya kimliği dosya adı:</b> aynı nesne iki kez yazılmıyor,
    /// yani CDN önbelleği hiç geçersizleşmiyor. Sabit bir ad (<c>cover.jpg</c>)
    /// üstüne yazılırdı ve kullanıcılar günlerce eski görseli görürdü.</para>
    /// </summary>
    public static string ExperienceKey(Guid experienceId, Guid mediaId, string extension)
        => string.Create(
            CultureInfo.InvariantCulture,
            $"experiences/{experienceId:N}/{mediaId:N}.{extension}");

    /// <summary>
    /// Avatar anahtarı. Deneyim görselleriyle aynı depoda ama ayrı ön ekte:
    /// silme/temizlik komutları ikisini ayırt edebilmeli.
    /// </summary>
    public static string AvatarKey(Guid userId, Guid mediaId, string extension)
        => string.Create(
            CultureInfo.InvariantCulture,
            $"{AvatarPrefix(userId)}{mediaId:N}.{extension}");

    /// <summary>
    /// Kullanıcının avatar klasörü. Onay ucu, istemciden gelen anahtarın bununla
    /// başladığını doğruluyor: aksi halde kullanıcı A, kullanıcı B'nin yüklediği
    /// nesneyi kendi profiline bağlayabilirdi.
    /// </summary>
    public static string AvatarPrefix(Guid userId)
        => string.Create(CultureInfo.InvariantCulture, $"avatars/{userId:N}/");
}
