namespace Expyra.Domain.Media;

/// <summary>
/// Kabul edilen görsel biçimleri. <b>Kapalı liste</b> — "ne gelirse depola" bir
/// dosya sunucusudur, ilan galerisi değil.
///
/// <para>Neden bu üçü: JPEG ve PNG evrensel, WebP <c>next/image</c>'in ürettiği
/// biçim. GIF yok (animasyon = video, PLAN Blok 6 kapsam dışı bırakıyor),
/// SVG kesinlikle yok: SVG içinde script çalışır ve kullanıcı yüklemesi olarak
/// servis edilen bir SVG saklı XSS'tir. HEIC yok — tarayıcı çözemiyor.</para>
/// </summary>
public enum ImageFormat
{
    Jpeg = 1,
    Png = 2,
    Webp = 3,
}

/// <summary>
/// <see cref="ImageProbe"/>'un bayttan okuduğu gerçek biçim ve ölçü.
/// İstemcinin beyanı DEĞİL — beyan yalnız karşılaştırma için kullanılıyor.
/// </summary>
public sealed record ImageInfo(ImageFormat Format, int Width, int Height)
{
    /// <summary>
    /// Bu biçimin HTTP içerik tipi. Depoya ve <c>&lt;img&gt;</c>'e giden değer
    /// istemcinin gönderdiği başlıktan değil BURADAN üretiliyor: istemci
    /// "image/png" deyip JPEG yükleyebilir, tarayıcı da byte'a bakıp çizer —
    /// ama depoda yanlış content-type kalırsa CDN ve indirme adı bozulur.
    /// </summary>
    public string ContentType => Format switch
    {
        ImageFormat.Jpeg => "image/jpeg",
        ImageFormat.Png => "image/png",
        ImageFormat.Webp => "image/webp",
        _ => throw new InvalidOperationException($"Bilinmeyen biçim: {Format}"),
    };
}
