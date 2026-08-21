using System.Buffers;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Media;

/// <summary>
/// Yüklenmiş bir nesnenin gerçekten kabul edilebilir bir görsel olup olmadığını söyler.
///
/// <para><b>Neden ayrı bir yerde:</b> aynı kontrolleri hem ilan görselleri hem avatar
/// çalıştırıyor. İki handler'a iki kez yazılsaydı, birinde eklenen bir kural (yeni bir
/// biçim, yeni bir tavan) diğerinde eksik kalır ve boşluk yalnız o yoldan sömürülürdü.</para>
///
/// <para><b>İstisna atmıyor.</b> Başarısızlık bir sonuç değeri: çağıranların temizlik
/// yapması (satırı silmek, transaction'ı commit etmek) gerekiyor ve bunu istisna
/// akışının içinde doğru sırayla yapmak kolayca yanlış gider — nitekim ilk hâlinde
/// gitmişti: temizlik transaction içinde kalıp geri alınıyordu.</para>
/// </summary>
internal static class UploadedImage
{
    internal static async Task<UploadedImageResult> InspectAsync(
        IObjectStorage storage,
        string storageKey,
        string declaredContentType,
        CancellationToken cancellationToken)
    {
        var stored = await storage.HeadAsync(storageKey, cancellationToken).ConfigureAwait(false);

        if (stored is null)
        {
            return UploadedImageResult.NotUploaded();
        }

        // Depo tavanı zaten uyguluyor; bu ikinci kapı, imzayı üreten ile yüklemeyi
        // kabul eden bir gün ayrışırsa diye duruyor.
        if (stored.ByteSize > MediaRules.MaxByteSize)
        {
            return UploadedImageResult.Invalid("byte-size", "Yüklenen dosya izin verilen boyutu aşıyor.");
        }

        var info = await ProbeAsync(storage, storageKey, cancellationToken).ConfigureAwait(false);

        if (info is null)
        {
            return UploadedImageResult.Invalid("not-an-image", "Yüklenen dosya geçerli bir görsel değil.");
        }

        // Beyan ile gerçeğin AYRIŞMASI reddediliyor. Yalnız "görsel mi" diye bakılsaydı,
        // .png uzantılı anahtara JPEG yüklenir ve depodaki content-type kalıcı olarak
        // yanlış kalırdı.
        if (!string.Equals(info.ContentType, declaredContentType, StringComparison.Ordinal))
        {
            return UploadedImageResult.Invalid(
                "content-type-mismatch",
                $"Dosya {declaredContentType} olarak bildirildi ama içeriği {info.ContentType}.");
        }

        if (!MediaRules.IsAcceptableSize(info))
        {
            return UploadedImageResult.Invalid(
                "too-small",
                $"Görsel en az {MediaRules.MinWidth}×{MediaRules.MinHeight} piksel olmalı; "
                + $"yüklenen {info.Width}×{info.Height}.");
        }

        return UploadedImageResult.Ok(info, stored.ByteSize);
    }

    /// <summary>
    /// Nesnenin BAŞINI okur — tamamını değil. 10 MB'lık bir dosyanın ölçüsünü bulmak
    /// için tamamını indirmek, her onayda gereksiz bir aktarım olurdu.
    /// </summary>
    private static async Task<ImageInfo?> ProbeAsync(
        IObjectStorage storage,
        string storageKey,
        CancellationToken cancellationToken)
    {
        await using var stream = await storage
            .OpenReadAsync(storageKey, ImageProbe.MaxHeaderBytes, cancellationToken)
            .ConfigureAwait(false);

        if (stream is null)
        {
            return null;
        }

        var buffer = ArrayPool<byte>.Shared.Rent(ImageProbe.MaxHeaderBytes);

        try
        {
            // ReadAtLeast: tek Read çağrısı akışın tamamını vermek zorunda değil ve kısa
            // okuma, başlığın ortasında kesilmiş gibi görünüp geçerli bir dosyayı
            // reddederdi. Akış bittiğinde patlamıyor — kısa dosya normal.
            var read = await stream
                .ReadAtLeastAsync(
                    buffer, ImageProbe.MaxHeaderBytes, throwOnEndOfStream: false, cancellationToken)
                .ConfigureAwait(false);

            return ImageProbe.TryRead(buffer.AsSpan(0, read), out var info) ? info : null;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }
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
        => new(null, 0, "not-uploaded", "Görsel henüz yüklenmemiş.", false);

    internal static UploadedImageResult Invalid(string reason, string message)
        => new(null, 0, reason, message, true);
}
