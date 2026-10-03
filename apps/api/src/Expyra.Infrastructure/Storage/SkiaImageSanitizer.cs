using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Media;
using SkiaSharp;

namespace Expyra.Infrastructure.Storage;

/// <summary>
/// <see cref="IImageSanitizer"/>'ın SkiaSharp (MIT) implementasyonu.
///
/// <para><b>Neden SkiaSharp:</b> ImageSharp 3.x+ Six Labors Split License — belli bir
/// gelirin üstünde ücretli; repo ticari lisans tuzağına daha önce iki kez düştü
/// (MediatR 13, FluentAssertions 8). <c>System.Drawing</c> Linux'ta desteklenmiyor.
/// SkiaSharp MIT, Linux native kütüphanesi ayrı pakette.</para>
///
/// <para><b>Neden çıktıda meta veri yok:</b> Skia'nın kodlayıcıları EXIF/XMP/IPTC
/// YAZMIYOR — yalnız piksel ve (sRGB değilse) renk profili. Çıktı kaynak dosyadan
/// hiçbir blok kopyalamıyor; temizlik bir kara liste değil, yapı gereği.</para>
/// </summary>
internal sealed class SkiaImageSanitizer : IImageSanitizer
{
    /// <summary>
    /// Kayıplı biçimlerin kalitesi. 85, telefon fotoğrafında gözle ayırt edilemeyen
    /// kalitede dosyayı aşağı yukarı yarıya indiriyor; 90 üstü boyutu hızla şişiriyor.
    /// </summary>
    internal const int LossyQuality = 85;

    public SanitizedImageResult Sanitize(ReadOnlyMemory<byte> source, ImageFormat format)
    {
        using var data = SKData.CreateCopy(source.Span);
        using var codec = SKCodec.Create(data);

        // Başlık ImageProbe'dan geçti ama gövde çözülemiyor ya da biçim başlığın
        // söylediği değil: ikisi de "geçerli görsel değil".
        if (codec is null || codec.EncodedFormat != ToSkia(format))
        {
            return SanitizedImageResult.Fail(SanitizeFailure.Undecodable);
        }

        var decodeSize = DecodeSize(codec);

        if ((long)decodeSize.Width * decodeSize.Height > MediaRules.MaxDecodePixels)
        {
            return SanitizedImageResult.Fail(SanitizeFailure.TooManyPixels);
        }

        var decodeInfo = new SKImageInfo(
            decodeSize.Width,
            decodeSize.Height,
            SKColorType.Rgba8888,
            format == ImageFormat.Jpeg ? SKAlphaType.Opaque : SKAlphaType.Premul,
            codec.Info.ColorSpace);

        using var decoded = new SKBitmap(decodeInfo);

        // Yalnız TAM başarı kabul: IncompleteInput (kesik dosya) yarısı gri bir görsel
        // üretir ve host onu "yüklendi" diye görürdü.
        if (codec.GetPixels(decodeInfo, decoded.GetPixels()) != SKCodecResult.Success)
        {
            return SanitizedImageResult.Fail(SanitizeFailure.Undecodable);
        }

        using var oriented = Orient(decoded, codec.EncodedOrigin);
        using var image = SKImage.FromBitmap(oriented);
        using var encoded = image.Encode(ToSkia(format), LossyQuality);

        // Kodlayıcı null dönerse bu bizim hatamız (desteklenmeyen renk tipi vb.),
        // kullanıcınınki değil: 500 olarak görünsün (CLAUDE.md #1).
        if (encoded is null)
        {
            throw new InvalidOperationException($"{format} kodlanamadı ({oriented.Width}×{oriented.Height}).");
        }

        return SanitizedImageResult.Ok(encoded.ToArray(), oriented.Width, oriented.Height);
    }

    /// <summary>
    /// Çözülecek boyut. JPEG ve WebP küçültülerek çözülebiliyor (JPEG'de 1/2, 1/4, 1/8
    /// doğrudan DCT'den) — 48 MP'lik fotoğraf belleğe hiç tam boy girmiyor. PNG
    /// desteklemiyor; Skia orada özgün boyutu döndürüyor.
    /// </summary>
    private static SKSizeI DecodeSize(SKCodec codec)
    {
        var width = codec.Info.Width;
        var height = codec.Info.Height;
        var longEdge = Math.Max(width, height);

        if (longEdge <= MediaRules.MaxStoredEdge)
        {
            return new SKSizeI(width, height);
        }

        var scaled = codec.GetScaledDimensions((float)MediaRules.MaxStoredEdge / longEdge);

        return scaled.Width > 0 && scaled.Height > 0 ? scaled : new SKSizeI(width, height);
    }

    /// <summary>
    /// EXIF yönünü piksele uygular ve uzun kenarı <see cref="MediaRules.MaxStoredEdge"/>'e
    /// indirir — tek çizimde. Matrisler EXIF 2.32 §4.6.4'teki sekiz yönün karşılığı:
    /// her biri kaynak (x, y)'yi hedefe taşıyor.
    /// </summary>
    private static SKBitmap Orient(SKBitmap source, SKEncodedOrigin origin)
    {
        var longEdge = Math.Max(source.Width, source.Height);
        var scale = longEdge > MediaRules.MaxStoredEdge ? (float)MediaRules.MaxStoredEdge / longEdge : 1f;

        // Ölçek önce uygulanıyor, yön matrisi ÖLÇEKLENMİŞ boyutla kuruluyor.
        var width = Math.Max(1, (int)Math.Round(source.Width * scale));
        var height = Math.Max(1, (int)Math.Round(source.Height * scale));

        var swapsAxes = origin is SKEncodedOrigin.LeftTop
            or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom
            or SKEncodedOrigin.LeftBottom;

        var targetInfo = source.Info.WithSize(swapsAxes ? height : width, swapsAxes ? width : height);
        var target = new SKBitmap(targetInfo);

        try
        {
            using var canvas = new SKCanvas(target);
            canvas.Clear(SKColors.Transparent);
            canvas.SetMatrix(OrientationMatrix(origin, width, height));
            canvas.Scale(scale);

            using var image = SKImage.FromBitmap(source);
            canvas.DrawImage(image, 0, 0, new SKSamplingOptions(SKCubicResampler.Mitchell));
            canvas.Flush();

            return target;
        }
        catch
        {
            target.Dispose();
            throw;
        }
    }

    private static SKMatrix OrientationMatrix(SKEncodedOrigin origin, float w, float h) => origin switch
    {
        // (scaleX, skewX, transX, skewY, scaleY, transY, persp0, persp1, persp2)
        SKEncodedOrigin.TopRight => new SKMatrix(-1, 0, w, 0, 1, 0, 0, 0, 1),
        SKEncodedOrigin.BottomRight => new SKMatrix(-1, 0, w, 0, -1, h, 0, 0, 1),
        SKEncodedOrigin.BottomLeft => new SKMatrix(1, 0, 0, 0, -1, h, 0, 0, 1),
        SKEncodedOrigin.LeftTop => new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1),
        SKEncodedOrigin.RightTop => new SKMatrix(0, -1, h, 1, 0, 0, 0, 0, 1),
        SKEncodedOrigin.RightBottom => new SKMatrix(0, -1, h, -1, 0, w, 0, 0, 1),
        SKEncodedOrigin.LeftBottom => new SKMatrix(0, 1, 0, -1, 0, w, 0, 0, 1),
        _ => SKMatrix.Identity,
    };

    private static SKEncodedImageFormat ToSkia(ImageFormat format) => format switch
    {
        ImageFormat.Jpeg => SKEncodedImageFormat.Jpeg,
        ImageFormat.Png => SKEncodedImageFormat.Png,
        ImageFormat.Webp => SKEncodedImageFormat.Webp,
        _ => throw new ArgumentOutOfRangeException(nameof(format)),
    };
}
