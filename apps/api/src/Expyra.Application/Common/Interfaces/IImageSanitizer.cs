using Expyra.Domain.Media;

namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Yüklenen görseli herkese açılmadan önce YENİDEN KODLAR (issue #50).
///
/// <para><b>Neden yalnız "EXIF'i sil" değil de yeniden kodlama:</b> telefon fotoğrafındaki
/// GPS konumu EXIF'te, ama cihaz/seri numarası XMP'de, IPTC'de, MakerNote'ta da
/// durabiliyor ve her biçimin kendi kapsayıcısı var. Baytları segment segment ayıklamak
/// bir kara liste — unutulan her blok bir sızıntı. Pikselleri çözüp sıfırdan yazmak
/// beyaz liste: çıktıda yalnız piksel var.</para>
///
/// <para><b>Yön (orientation) ÖNCE piksele uygulanıyor:</b> EXIF silinince "bu fotoğraf
/// 90° döndürülerek gösterilsin" bilgisi de gidiyor. Uygulanmadan silinseydi dikey
/// çekilmiş her telefon fotoğrafı yan yatmış görünürdü.</para>
///
/// <para>Arayüz Application'da, implementasyon Infrastructure'da: görüntü kütüphanesi
/// (SkiaSharp) handler'lara sızmıyor, kütüphane değişirse yalnız bir sınıf değişiyor.</para>
/// </summary>
public interface IImageSanitizer
{
    /// <summary>
    /// Görseli çözer, yönünü piksele uygular, gerekirse küçültür ve AYNI biçimde
    /// meta verisiz olarak yeniden kodlar. İstisna atmıyor: çözülemeyen bayt beklenen
    /// bir durum (kullanıcı yüklemesi), hata değil.
    /// </summary>
    SanitizedImageResult Sanitize(ReadOnlyMemory<byte> source, ImageFormat format);
}

public enum SanitizeFailure
{
    None = 0,

    /// <summary>Başlık geçerli ama gövde çözülemiyor (bozuk, kesik ya da biçim uyuşmuyor).</summary>
    Undecodable = 1,

    /// <summary>Çözülecek piksel sayısı sunucunun bellek bütçesini aşıyor.</summary>
    TooManyPixels = 2,
}

/// <param name="Bytes">Meta verisiz yeni dosya. Başarısızlıkta boş.</param>
/// <param name="Width">Yön uygulandıktan SONRAKİ genişlik — tarayıcının çizeceği ölçü.</param>
/// <param name="Height">Yön uygulandıktan sonraki yükseklik.</param>
public sealed record SanitizedImageResult(
    ReadOnlyMemory<byte> Bytes,
    int Width,
    int Height,
    SanitizeFailure Failure)
{
    public bool Succeeded => Failure == SanitizeFailure.None;

    public static SanitizedImageResult Ok(ReadOnlyMemory<byte> bytes, int width, int height)
        => new(bytes, width, height, SanitizeFailure.None);

    public static SanitizedImageResult Fail(SanitizeFailure failure)
        => new(ReadOnlyMemory<byte>.Empty, 0, 0, failure);
}
