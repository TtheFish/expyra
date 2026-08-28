namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// İkili nesne deposu. Bugünkü tek implementasyon diske yazan dev sink'i
/// (<c>IEmailSender</c>/<c>FileSystemEmailSender</c> ile birebir aynı kalıp);
/// S3/R2 hesabı geldiğinde arkasına <c>S3ObjectStorage</c> giriyor ve çağıran
/// hiçbir kod değişmiyor.
///
/// <para><b>Bayt bu arayüzden GEÇMİYOR</b> (PLAN Blok 6 kabul kriteri 1).
/// Yükleme <see cref="CreateUploadAsync"/>'in verdiği imzalı adrese doğrudan
/// tarayıcıdan yapılıyor. Base64 gövde ile gelseydi 10 MB'lık bir fotoğraf
/// JSON'da ~13 MB'a şişer, MediatR boru hattından geçer ve bir kopyası da
/// istek log'una düşerdi.</para>
///
/// <para><see cref="OpenReadAsync"/> bunun istisnası değil: doğrulama için
/// yalnız BAŞLIK okunuyor (<c>ImageProbe.MaxHeaderBytes</c>), dosyanın tamamı
/// değil.</para>
/// </summary>
public interface IObjectStorage
{
    /// <summary>
    /// Tarayıcının doğrudan PUT edeceği imzalı adres. Adres kısa ömürlü ve tek
    /// nesneye bağlı — sızsa bile başka bir anahtarın üstüne yazmaya yaramaz.
    /// </summary>
    Task<PresignedUpload> CreateUploadAsync(PresignedUploadRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Nesnenin gerçekten yüklendiğini ve boyutunu söyler. Yoksa <c>null</c> —
    /// istisna değil: "yüklemeyi bitirmemiş host" bir hata değil, beklenen durum.
    /// </summary>
    Task<StoredObject?> HeadAsync(string key, CancellationToken cancellationToken);

    /// <summary>
    /// Nesneyi okumak için açar. <paramref name="maxBytes"/> verilirse yalnız o kadarı
    /// okunur — S3 tarafında bu bir aralık isteğine (Range) çevrilecek, yani sınır
    /// ağdan inen bayt sayısını da belirliyor. <c>null</c> ise nesnenin tamamı.
    ///
    /// <para>Doğrulama daima sınırlı okur (<c>ImageProbe.MaxHeaderBytes</c>); sınırsız
    /// hâli yalnız dev sink'inin dosyayı servis eden ucunda kullanılıyor, üretimde
    /// o işi CDN yapıyor.</para>
    /// </summary>
    Task<Stream?> OpenReadAsync(string key, int? maxBytes, CancellationToken cancellationToken);

    /// <summary>
    /// Nesneyi siler. Yoksa sessizce başarılı: silme isteği tekrarlanabilir olmalı
    /// (satır silindi ama nesne silinemeden süreç öldü — ikinci deneme patlamamalı).
    /// </summary>
    Task DeleteAsync(string key, CancellationToken cancellationToken);

    /// <summary>
    /// Nesnenin herkese açık okuma adresi. Dev sink'inde API üzerinden, üretimde
    /// CDN alan adı. <b>Veritabanında saklanmıyor</b>: kaydedilseydi CDN alan adı
    /// değiştiğinde geçmiş tüm satırlar migration ister ve eski adresler ölürdü.
    /// Saklanan tek şey anahtar; adres her okunuşta buradan üretiliyor.
    /// </summary>
    Uri PublicUrl(string key);
}

/// <param name="Key">Depodaki tam yol. Çağıran üretir — bkz. <c>MediaStorageKey</c>.</param>
/// <param name="ContentType">
/// İstemcinin BEYAN ettiği tip. Depoya bu yazılıyor ama doğrulama buna değil
/// gerçek bayta bakıyor (<c>ImageProbe</c>); uyuşmazlık yüklemeden sonra yakalanıyor.
/// </param>
/// <param name="MaxByteSize">
/// Üst sınır. İmzaya giriyor: dev sink'i bunu aşan gövdeyi reddediyor, S3 de
/// <c>content-length-range</c> koşuluyla aynısını yapacak. Sunucu tarafında
/// zorlanmasaydı "10 MB" beyanıyla 10 GB yüklenebilirdi.
/// </param>
public sealed record PresignedUploadRequest(
    string Key,
    string ContentType,
    long MaxByteSize,
    TimeSpan Lifetime);

/// <param name="Method">
/// HTTP yöntemi. Sabit "PUT" yazmıyoruz: S3 POST politikası da bir seçenek ve
/// istemcinin bunu sunucudan öğrenmesi, ileride yöntem değişirse web'i
/// dokunulmadan bırakır.
/// </param>
/// <param name="RequiredHeaders">
/// İstemcinin AYNEN göndermek zorunda olduğu başlıklar. İmza bunların üzerine
/// kuruluyor; eksik gönderilirse yükleme reddedilir.
/// </param>
public sealed record PresignedUpload(
    string Key,
    Uri Url,
    string Method,
    IReadOnlyDictionary<string, string> RequiredHeaders,
    DateTimeOffset ExpiresAtUtc);

public sealed record StoredObject(string Key, string ContentType, long ByteSize);
