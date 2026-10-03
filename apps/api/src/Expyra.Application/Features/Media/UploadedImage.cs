using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Media;

/// <summary>
/// Yüklenmiş bir nesneyi doğrular ve herkese açık kopyasını üretir.
///
/// <para><b>Neden ayrı bir yerde:</b> aynı kontrolleri hem ilan görselleri hem avatar
/// çalıştırıyor. İki handler'a iki kez yazılsaydı, birinde eklenen bir kural (yeni bir
/// biçim, yeni bir tavan) diğerinde eksik kalır ve boşluk yalnız o yoldan sömürülürdü.</para>
///
/// <para><b>İki anahtar, tek yön (issue #50):</b> bayt imzalı adresin yazdığı YÜKLEME
/// anahtarından okunuyor; meta verisiz yeniden kodlanmış kopya hiç imza verilmemiş
/// HERKESE AÇIK anahtara yazılıyor. İmzalı adres onaydan sonra da geçerli olduğu için
/// tek anahtar kullanılsaydı istemci doğrulanmış görselin üstüne istediğini yazabilirdi.</para>
///
/// <para><b>Dosya bir kez okunuyor ve her kontrol o kopyaya bakıyor.</b> Başlığı depodan,
/// gövdeyi ayrı bir okumayla alsaydık, arada aynı imzalı adresle yapılan bir PUT
/// doğrulanandan başka bir baytın yayınlanmasına yol açardı.</para>
///
/// <para><b>İstisna atmıyor.</b> Başarısızlık bir sonuç değeri: çağıranların temizlik
/// yapması (satırı silmek, transaction'ı commit etmek) gerekiyor ve bunu istisna
/// akışının içinde doğru sırayla yapmak kolayca yanlış gider — nitekim ilk hâlinde
/// gitmişti: temizlik transaction içinde kalıp geri alınıyordu.</para>
/// </summary>
internal static class UploadedImage
{
    /// <summary>
    /// Doğrular, yeniden kodlar ve <paramref name="publicKey"/>'e yazar. Yükleme anahtarını
    /// SİLMİYOR: o, çağıranın işi — satır commit edildikten sonra (ters sırada, commit
    /// patlarsa host'un yüklediği bayt da gitmiş olurdu ve yeniden deneyemezdi).
    /// </summary>
    internal static async Task<UploadedImageResult> PublishAsync(
        IObjectStorage storage,
        IImageSanitizer sanitizer,
        string uploadKey,
        string publicKey,
        string declaredContentType,
        CancellationToken cancellationToken)
    {
        var stored = await storage.HeadAsync(uploadKey, cancellationToken).ConfigureAwait(false);

        if (stored is null)
        {
            return UploadedImageResult.NotUploaded();
        }

        // Depo tavanı zaten uyguluyor; bu ikinci kapı, imzayı üreten ile yüklemeyi
        // kabul eden bir gün ayrışırsa diye duruyor.
        if (stored.ByteSize > MediaRules.MaxByteSize)
        {
            return TooLarge();
        }

        var bytes = await ReadAllAsync(storage, uploadKey, cancellationToken).ConfigureAwait(false);

        if (bytes is null)
        {
            return UploadedImageResult.NotUploaded();
        }

        if (bytes.Length > MediaRules.MaxByteSize)
        {
            return TooLarge();
        }

        var header = bytes.AsSpan(0, Math.Min(bytes.Length, ImageProbe.MaxHeaderBytes));

        if (!ImageProbe.TryRead(header, out var info))
        {
            return NotAnImage();
        }

        // Beyan ile gerçeğin AYRIŞMASI reddediliyor. Yalnız "görsel mi" diye bakılsaydı,
        // .png uzantılı anahtara JPEG yüklenir ve depodaki content-type kalıcı olarak
        // yanlış kalırdı.
        if (!string.Equals(info.ContentType, declaredContentType, StringComparison.Ordinal))
        {
            return UploadedImageResult.Invalid(
                MediaConflict.ContentTypeMismatch,
                $"Dosya {declaredContentType} olarak bildirildi ama içeriği {info.ContentType}.");
        }

        if (!MediaRules.IsAcceptableSize(info))
        {
            return UploadedImageResult.Invalid(
                MediaConflict.TooSmall,
                $"Görsel en az {MediaRules.MinWidth}×{MediaRules.MinHeight} piksel olmalı; "
                + $"yüklenen {info.Width}×{info.Height}.");
        }

        // EXIF/GPS/cihaz bilgisi burada gidiyor: çıktı yalnız piksel (IImageSanitizer).
        var sanitized = sanitizer.Sanitize(bytes, info.Format);

        switch (sanitized.Failure)
        {
            case SanitizeFailure.None:
                break;
            case SanitizeFailure.Undecodable:
                return NotAnImage();
            case SanitizeFailure.TooManyPixels:
                return UploadedImageResult.Invalid(
                    MediaConflict.TooLarge,
                    $"Görsel çözünürlüğü çok yüksek ({info.Width}×{info.Height}); daha küçük bir dosya yükle.");
            default:
                throw new InvalidOperationException($"Bilinmeyen temizleme sonucu: {sanitized.Failure}");
        }

        await storage
            .PutAsync(publicKey, sanitized.Bytes, info.ContentType, cancellationToken)
            .ConfigureAwait(false);

        // Ölçü yön uygulandıktan SONRAKİ ölçü: dikey telefon fotoğrafı başlıkta
        // 4032×3024 yazar ama ekranda 3024×4032 çizilir; next/image'e giden bu.
        return UploadedImageResult.Ok(
            info with { Width = sanitized.Width, Height = sanitized.Height },
            sanitized.Bytes.Length);
    }

    /// <summary>
    /// Nesnenin tamamını, tavanın BİR bayt fazlasına kadar okur — fazlası "tavan aşıldı"
    /// demek ve okumaya devam edilmiyor.
    /// </summary>
    private static async Task<byte[]?> ReadAllAsync(
        IObjectStorage storage,
        string key,
        CancellationToken cancellationToken)
    {
        await using var stream = await storage
            .OpenReadAsync(key, (int)MediaRules.MaxByteSize + 1, cancellationToken)
            .ConfigureAwait(false);

        if (stream is null)
        {
            return null;
        }

        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken).ConfigureAwait(false);

        return buffer.ToArray();
    }

    private static UploadedImageResult TooLarge()
        => UploadedImageResult.Invalid(MediaConflict.TooLarge, "Yüklenen dosya izin verilen boyutu aşıyor.");

    private static UploadedImageResult NotAnImage()
        => UploadedImageResult.Invalid(MediaConflict.NotAnImage, "Yüklenen dosya geçerli bir görsel değil.");
}

/// <summary>
/// Medya çakışmalarının kararlı kodları. Sabit string, enum değil: değer istemciye
/// gidiyor ve arayüz sözlüğünde bir anahtara eşleniyor — enum yeniden adlandırılsa
/// derleyici sunucuyu düzeltir ama dolaşımdaki istemciyi düzeltmez
/// (<c>ExperiencePublishRequirement</c> ile aynı gerekçe).
/// </summary>
internal static class MediaConflict
{
    internal const string NotUploaded = "media-not-uploaded";
    internal const string NotAnImage = "media-not-an-image";
    internal const string ContentTypeMismatch = "media-content-type-mismatch";
    internal const string TooSmall = "media-too-small";
    internal const string TooLarge = "media-too-large";

    /// <summary>Deneyim başına görsel tavanı aşıldı.</summary>
    internal const string LimitReached = "media-limit-reached";

    /// <summary>
    /// Eski istemciler için tutuluyor; sunucu artık bu kodu üretmiyor —
    /// yayındaki son görsel silinince ilan taslağa düşüyor.
    /// </summary>
    internal const string LastOfPublished = "media-last-of-published";
}

/// <param name="Discard">
/// Yüklemenin bir daha kurtarılamayacağı — yani satırın ve nesnenin silinmesi gerektiği.
/// "Henüz yüklenmemiş" için <c>false</c>: orada bozuk bir şey yok, host yüklemeyi
/// tamamlayıp aynı kimlikle tekrar deneyebilir.
/// </param>
internal sealed record UploadedImageResult(
    ImageInfo? Info,
    long ByteSize,
    string? Reason,
    string? Message,
    bool Discard)
{
    internal static UploadedImageResult Ok(ImageInfo info, long byteSize)
        => new(info, byteSize, null, null, false);

    internal static UploadedImageResult NotUploaded()
        => new(null, 0, MediaConflict.NotUploaded, "Görsel henüz yüklenmemiş.", false);

    internal static UploadedImageResult Invalid(string reason, string message)
        => new(null, 0, reason, message, true);
}
