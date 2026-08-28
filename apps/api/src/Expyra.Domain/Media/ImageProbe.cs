using System.Buffers.Binary;
using System.Text;

namespace Expyra.Domain.Media;

/// <summary>
/// Yüklenen baytın gerçekten görsel olup olmadığını ve ölçüsünü BAŞLIKTAN okur.
///
/// <para><b>Neden bir görüntü kütüphanesi değil:</b> ImageSharp 3.x ticari bir
/// bölünmüş lisansa geçti ve bu repo aynı tuzağa iki kez düştü (CLAUDE.md paket
/// bölümü: MediatR 13, FluentAssertions 8). <c>System.Drawing</c> yalnız Windows'ta
/// destekleniyor, sunucu Linux. İhtiyacımız olan şey de kütüphane gerektirmiyor:
/// dosyayı ÇÖZMÜYORUZ, yalnız başlığındaki genişlik/yüksekliği okuyoruz. Çözme işi
/// tarayıcıda, <c>next/image</c>'te.</para>
///
/// <para><b>Neden içerik tipine güvenilmiyor:</b> content-type istemcinin yazdığı
/// bir metin. "image/png" başlığıyla bir HTML dosyası yüklenebilir; depodan
/// servis edilince tarayıcı onu sayfa olarak çalıştırırsa saklı XSS olur. Sihirli
/// baytları okumak bu iddiayı doğrulamanın tek yolu.</para>
///
/// <para><b>Ne YAPMIYOR:</b> dosyanın tamamını doğrulamıyor. Başlığı geçerli olup
/// gövdesi bozuk bir JPEG buradan geçer ve tarayıcıda yarım görünür. Bunu yakalamak
/// tam çözme demek; kullanıcının kendi ilanına koyduğu bozuk görselin bedeli
/// sunucuda her yükleme için tam çözme yapmaktan düşük.</para>
/// </summary>
public static class ImageProbe
{
    /// <summary>
    /// Ayrıştırıcının okuduğu en fazla bayt. JPEG'de ölçü, EXIF ve gömülü küçük
    /// resimden SONRA gelebildiği için ilk birkaç yüz bayt yetmiyor; 512 KB
    /// telefon fotoğraflarının EXIF bloklarını rahatça aşıyor.
    ///
    /// <para>Sınırsız okumanın alternatifi yok: 2 GB'lık bir dosyayı ölçüsünü
    /// bulmak için baştan sona taramak, tek bir istekle sunucuyu meşgul etmenin
    /// ucuz yolu olurdu.</para>
    /// </summary>
    public const int MaxHeaderBytes = 512 * 1024;

    /// <summary>
    /// Kenar tavanı. Bunun üstü neredeyse her zaman bir sıkıştırma bombasıdır:
    /// 60000×60000 PNG birkaç yüz kilobayt olabilir ama çözüldüğünde gigabaytlarca
    /// bellek ister — ve onu çözecek olan bizim sunucumuz değil, kullanıcının
    /// tarayıcısı. Kabul etmemek her iki tarafı da koruyor.
    /// </summary>
    public const int MaxDimension = 12_000;

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    /// <summary>
    /// Başlığı ayrıştırır. Tanınmayan/bozuk/aşırı büyük her girdi için <c>false</c> —
    /// istisna atmıyor, çünkü burada "geçersiz dosya" beklenen bir durum, hata değil.
    /// </summary>
    public static bool TryRead(ReadOnlySpan<byte> header, out ImageInfo info)
    {
        info = null!;

        if (!TryReadDimensions(header, out var format, out var width, out var height))
        {
            return false;
        }

        // 0 ve negatif: bozuk başlık. Tavan: sıkıştırma bombası.
        if (width <= 0 || height <= 0 || width > MaxDimension || height > MaxDimension)
        {
            return false;
        }

        info = new ImageInfo(format, width, height);
        return true;
    }

    private static bool TryReadDimensions(
        ReadOnlySpan<byte> header,
        out ImageFormat format,
        out int width,
        out int height)
    {
        format = default;
        width = 0;
        height = 0;

        if (header.StartsWith(PngSignature))
        {
            format = ImageFormat.Png;
            return TryReadPng(header, out width, out height);
        }

        if (header.Length >= 2 && header[0] == 0xFF && header[1] == 0xD8)
        {
            format = ImageFormat.Jpeg;
            return TryReadJpeg(header, out width, out height);
        }

        if (header.Length >= 12
            && Ascii(header[..4]) == "RIFF"
            && Ascii(header.Slice(8, 4)) == "WEBP")
        {
            format = ImageFormat.Webp;
            return TryReadWebp(header, out width, out height);
        }

        return false;
    }

    /// <summary>
    /// PNG sabit yerleşimli: imzadan sonraki ilk chunk IHDR olmak ZORUNDA
    /// (spec §11.2.2), genişlik ve yükseklik onun ilk sekiz baytı.
    /// </summary>
    private static bool TryReadPng(ReadOnlySpan<byte> header, out int width, out int height)
    {
        width = 0;
        height = 0;

        // 8 imza + 4 uzunluk + 4 tip + 8 ölçü
        if (header.Length < 24 || Ascii(header.Slice(12, 4)) != "IHDR")
        {
            return false;
        }

        width = BinaryPrimitives.ReadInt32BigEndian(header.Slice(16, 4));
        height = BinaryPrimitives.ReadInt32BigEndian(header.Slice(20, 4));
        return true;
    }

    /// <summary>
    /// JPEG bir segment zinciri: <c>FF</c> + işaretçi + iki baytlık uzunluk. Ölçü,
    /// "start of frame" segmentlerinde duruyor ve dosyanın neresinde olacağı sabit
    /// DEĞİL — EXIF, ICC profili ve gömülü küçük resim önce gelebilir. Bu yüzden
    /// zincir gerçekten yürünüyor.
    /// </summary>
    private static bool TryReadJpeg(ReadOnlySpan<byte> header, out int width, out int height)
    {
        width = 0;
        height = 0;

        var offset = 2;

        while (offset + 3 < header.Length)
        {
            if (header[offset] != 0xFF)
            {
                // Hizadan çıktık: dolgu baytları (FF FF ...) yasal, gerisi bozuk dosya.
                return false;
            }

            var marker = header[offset + 1];
            offset += 2;

            // Dolgu: birden fazla FF üst üste gelebilir, işaretçi sonuncusundan sonra.
            if (marker == 0xFF)
            {
                offset--;
                continue;
            }

            // Yükü olmayan işaretçiler (RSTn, TEM). SOI/EOI de burada.
            if (marker is 0x01 or 0xD8 or 0xD9 || (marker >= 0xD0 && marker <= 0xD7))
            {
                continue;
            }

            // SOS'tan sonrası sıkıştırılmış görüntü verisi; segment yapısı biter.
            if (marker == 0xDA)
            {
                return false;
            }

            if (offset + 1 >= header.Length)
            {
                return false;
            }

            var length = BinaryPrimitives.ReadUInt16BigEndian(header.Slice(offset, 2));

            // Uzunluk kendisini de sayar; ikiden küçüğü sonsuz döngü demek.
            if (length < 2)
            {
                return false;
            }

            if (IsStartOfFrame(marker))
            {
                // Yük: hassasiyet(1) + yükseklik(2) + genişlik(2). Yükseklik ÖNCE.
                if (offset + 7 > header.Length)
                {
                    return false;
                }

                height = BinaryPrimitives.ReadUInt16BigEndian(header.Slice(offset + 3, 2));
                width = BinaryPrimitives.ReadUInt16BigEndian(header.Slice(offset + 5, 2));
                return true;
            }

            offset += length;
        }

        return false;
    }

    /// <summary>
    /// C4 (Huffman tablosu), C8 (JPEG uzantısı) ve CC (aritmetik kodlama tablosu)
    /// bu aralıkta ama frame başlığı DEĞİL; ölçü okunmaya kalkılırsa tablo verisi
    /// genişlik sanılır.
    /// </summary>
    private static bool IsStartOfFrame(byte marker)
        => marker >= 0xC0 && marker <= 0xCF && marker is not (0xC4 or 0xC8 or 0xCC);

    /// <summary>
    /// WebP tek bir biçim değil, üç kap: kayıplı (VP8), kayıpsız (VP8L) ve
    /// genişletilmiş (VP8X — saydamlık/animasyon burada). Ölçü üçünde de farklı
    /// yerde ve farklı kodlamada duruyor; yalnız birini bilmek dosyaların bir
    /// kısmını sessizce reddetmek olurdu.
    /// </summary>
    private static bool TryReadWebp(ReadOnlySpan<byte> header, out int width, out int height)
    {
        width = 0;
        height = 0;

        if (header.Length < 16)
        {
            return false;
        }

        var fourCc = Ascii(header.Slice(12, 4));
        var payload = header[20..];

        switch (fourCc)
        {
            case "VP8 ":
                // Çerçeve etiketi(3) + senkron kodu(3) + genişlik(2) + yükseklik(2).
                // Senkron kodu doğrulanıyor: olmadan rastgele bayt ölçü sanılır.
                if (payload.Length < 10 || payload[3] != 0x9D || payload[4] != 0x01 || payload[5] != 0x2A)
                {
                    return false;
                }

                // 14 bit ölçü + 2 bit ölçekleme. Ölçekleme görüntüleme ipucu, gerçek
                // piksel sayısı değil — maskeleniyor.
                width = BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(6, 2)) & 0x3FFF;
                height = BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(8, 2)) & 0x3FFF;
                return true;

            case "VP8L":
                // İmza(1) + 14 bit (genişlik-1) + 14 bit (yükseklik-1), bit bit paketli.
                if (payload.Length < 5 || payload[0] != 0x2F)
                {
                    return false;
                }

                var bits = BinaryPrimitives.ReadUInt32LittleEndian(payload.Slice(1, 4));
                width = (int)(bits & 0x3FFF) + 1;
                height = (int)((bits >> 14) & 0x3FFF) + 1;
                return true;

            case "VP8X":
                // Bayraklar(4) + tuval genişliği-1 (3 bayt LE) + tuval yüksekliği-1 (3 bayt LE).
                if (payload.Length < 10)
                {
                    return false;
                }

                width = ReadUInt24LittleEndian(payload.Slice(4, 3)) + 1;
                height = ReadUInt24LittleEndian(payload.Slice(7, 3)) + 1;
                return true;

            default:
                return false;
        }
    }

    /// <summary>24 bit little-endian — .NET'te karşılığı yok, WebP'de var.</summary>
    private static int ReadUInt24LittleEndian(ReadOnlySpan<byte> value)
        => value[0] | (value[1] << 8) | (value[2] << 16);

    /// <summary>
    /// Dört karakterlik kap etiketleri için. <c>Encoding.ASCII</c> geçersiz baytı
    /// '?' yapar, yani ASCII olmayan bir girdi burada eşleşmeye dönüşemez.
    /// </summary>
    private static string Ascii(ReadOnlySpan<byte> value) => Encoding.ASCII.GetString(value);
}
