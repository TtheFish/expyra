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
    /// Herkese açık kopyanın uzun kenar tavanı. Sunucu artık pikselleri ÇÖZÜYOR
    /// (EXIF temizliği, issue #50); 48 MP'lik bir telefon fotoğrafını tam çözünürlükte
    /// yeniden kodlamak hem bellek hem süre demek, üstelik hiçbir ekran ilan
    /// galerisinde 4096 pikselden genişini göstermiyor.
    /// </summary>
    public const int MaxStoredEdge = 4096;

    /// <summary>
    /// Sunucuda tek seferde çözülebilecek piksel sayısı (~160 MB RGBA). JPEG ve WebP
    /// küçültülerek çözülebildiği için tavana pratikte yalnız dev PNG'ler takılıyor.
    /// <see cref="ImageProbe.MaxDimension"/> 12000×12000'e izin veriyor; o PNG tam
    /// çözülse 576 MB isterdi.
    /// </summary>
    public const long MaxDecodePixels = 40_000_000;

    /// <summary>
    /// İmzalı yükleme adreslerinin yazdığı ön ek. <b>Bu ön ekteki nesneler hiçbir zaman
    /// servis edilmiyor</b> (issue #50): onay adımı baytı buradan okuyor, yeniden
    /// kodlanmış kopyayı ön eksiz anahtara yazıyor ve buradakini siliyor. İmzalı adres
    /// ömrü boyunca geçerli kaldığı için onaydan sonra da PUT edilebilir — ama yazdığı
    /// yer artık kimsenin okumadığı bir anahtar.
    ///
    /// <para>Üretimde kovanın bu ön eki herkese KAPALI olmalı ve bir yaşam döngüsü
    /// kuralıyla (ör. 1 gün) temizlenmeli; dev deposu ön eki zaten servis etmiyor.</para>
    /// </summary>
    public const string UploadPrefix = "uploads/";

    /// <summary>Herkese açık anahtarın yükleme karşılığı — imza YALNIZ buna veriliyor.</summary>
    public static string UploadKeyOf(string publicKey)
    {
        ArgumentException.ThrowIfNullOrEmpty(publicKey);

        if (IsUploadKey(publicKey))
        {
            throw new ArgumentException($"Zaten bir yükleme anahtarı: {publicKey}", nameof(publicKey));
        }

        return UploadPrefix + publicKey;
    }

    /// <summary>Yükleme anahtarının herkese açık karşılığı; yükleme anahtarı değilse <c>null</c>.</summary>
    public static string? PublicKeyOfUpload(string uploadKey)
        => IsUploadKey(uploadKey) ? uploadKey[UploadPrefix.Length..] : null;

    public static bool IsUploadKey(string? key)
        => key is not null && key.StartsWith(UploadPrefix, StringComparison.Ordinal);

    /// <summary>
    /// İmzalı adresin ömrü. Kısa: adres sızarsa saldırganın penceresi bu kadar.
    /// Yavaş bağlantıda büyük dosya yüklemeye yetecek kadar uzun.
    /// </summary>
    public static readonly TimeSpan UploadLifetime = TimeSpan.FromMinutes(15);

    /// <summary>
    /// İstemcinin beyan edebileceği içerik tipleri. Beyan yalnız imzaya giriyor;
    /// KABUL kararı <see cref="ImageProbe"/>'un okuduğu gerçek bayta bakıyor.
    /// Bu liste onu gereksiz kılmıyor, yükleme daha başlamadan bariz olanı eliyor.
    ///
    /// <para><c>image/jpg</c> bazı tarayıcı/OS çiftlerinde geliyor; imzada tek
    /// kanonik değer (<c>image/jpeg</c>) kullanılsın diye normalize ediliyor.</para>
    /// </summary>
    public static bool IsAllowedContentType(string? contentType)
        => NormalizeContentType(contentType) is not null;

    /// <summary>
    /// Beyanı kanonik MIME'a çevirir. Bilinmeyen / boş → <c>null</c>.
    /// </summary>
    public static string? NormalizeContentType(string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return null;
        }

        return contentType.Trim().ToLowerInvariant() switch
        {
            "image/jpg" or "image/jpeg" => "image/jpeg",
            "image/png" => "image/png",
            "image/webp" => "image/webp",
            _ => null,
        };
    }

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
