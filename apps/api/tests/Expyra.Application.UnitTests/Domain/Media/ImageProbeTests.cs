using System.Buffers.Binary;
using System.Text;
using Shouldly;
using Expyra.Domain.Media;

namespace Expyra.Application.UnitTests.Domain.Media;

/// <summary>
/// Baytlar ELLE kuruluyor, diskten örnek dosya okunmuyor. Gerekçe: bir ikili
/// fixture "neden bu bayt burada" sorusuna cevap vermez ve bozulduğunda test
/// anlaşılmaz biçimde kırılır. Buradaki her sayı spec'teki alanın adıyla yazılı,
/// dolayısıyla test aynı zamanda biçimin dokümantasyonu.
/// </summary>
public sealed class ImageProbeTests
{
    [Fact]
    public void Png_OlcuyuIhdrChunkindanOkur()
    {
        var header = Png(width: 1600, height: 900);

        ImageProbe.TryRead(header, out var info).ShouldBeTrue();
        info.Format.ShouldBe(ImageFormat.Png);
        info.Width.ShouldBe(1600);
        info.Height.ShouldBe(900);
        info.ContentType.ShouldBe("image/png");
    }

    [Fact]
    public void Jpeg_OlcuyuSofSegmentindenOkur()
    {
        var header = Jpeg(width: 4032, height: 3024);

        ImageProbe.TryRead(header, out var info).ShouldBeTrue();
        info.Format.ShouldBe(ImageFormat.Jpeg);
        info.Width.ShouldBe(4032);
        info.Height.ShouldBe(3024);
    }

    [Fact]
    public void Jpeg_OlcuEksifBloklarinArkasindaOlsaDaBulunur()
    {
        // TUZAK: telefon fotoğrafında ilk segment SOF değil APP1'dir (EXIF) ve içinde
        // gömülü küçük resim vardır. Sabit bir offsetten okuyan ayrıştırıcı burada
        // EXIF verisini genişlik sanar. Zincir gerçekten yürünmeli.
        var exif = Segment(0xE1, new byte[8000]);
        var comment = Segment(0xFE, Encoding.ASCII.GetBytes("Adobe"));
        var header = Jpeg(width: 800, height: 600, leading: [.. exif, .. comment]);

        ImageProbe.TryRead(header, out var info).ShouldBeTrue();
        info.Width.ShouldBe(800);
        info.Height.ShouldBe(600);
    }

    [Fact]
    public void Jpeg_HuffmanTablosuFrameSanilmaz()
    {
        // TUZAK: C4 (DHT) SOF aralığının (C0-CF) içinde ama frame başlığı değil.
        // Ayrıştırıcı onu SOF sayarsa tablo baytları ölçü olarak okunur ve dosya
        // 16706×18507 gibi saçma bir boyutla kabul edilir.
        var huffman = Segment(0xC4, [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
        var header = Jpeg(width: 320, height: 240, leading: huffman);

        ImageProbe.TryRead(header, out var info).ShouldBeTrue();
        info.Width.ShouldBe(320);
        info.Height.ShouldBe(240);
    }

    [Fact]
    public void Jpeg_OlcuSostanOnceGelmiyorsaReddedilir()
    {
        // SOS'tan sonrası sıkıştırılmış veri; orada segment aramak rastgele baytı
        // işaretçi sanmak demek. Ölçüsü bulunamayan dosya kabul EDİLMEZ.
        List<byte> bytes = [0xFF, 0xD8, .. Segment(0xDA, [0x01, 0x02]), 0x11, 0x22, 0x33];

        ImageProbe.TryRead(bytes.ToArray(), out _).ShouldBeFalse();
    }

    [Fact]
    public void Webp_KayipliKap()
    {
        ImageProbe.TryRead(WebpLossy(1280, 720), out var info).ShouldBeTrue();
        info.Format.ShouldBe(ImageFormat.Webp);
        info.Width.ShouldBe(1280);
        info.Height.ShouldBe(720);
        info.ContentType.ShouldBe("image/webp");
    }

    [Fact]
    public void Webp_KayipsizKap()
    {
        // VP8L ölçüyü bit bit paketliyor ve 1 EKSİK saklıyor: 1'in yanlış yerde
        // eklenmesi her görseli bir piksel kaydırır.
        ImageProbe.TryRead(WebpLossless(1024, 768), out var info).ShouldBeTrue();
        info.Width.ShouldBe(1024);
        info.Height.ShouldBe(768);
    }

    [Fact]
    public void Webp_GenisletilmisKap()
    {
        // VP8X saydamlığı olan WebP'lerin kabı — sık karşılaşılan hâl.
        ImageProbe.TryRead(WebpExtended(2400, 1600), out var info).ShouldBeTrue();
        info.Width.ShouldBe(2400);
        info.Height.ShouldBe(1600);
    }

    [Fact]
    public void Webp_SenkronKoduYoksaReddedilir()
    {
        var bytes = WebpLossy(800, 600);
        bytes[23] = 0x00; // senkron kodunun ilk baytı (0x9D)

        ImageProbe.TryRead(bytes, out _).ShouldBeFalse();
    }

    [Theory]
    [InlineData("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")]
    [InlineData("<!DOCTYPE html><html><body>merhaba</body></html>")]
    [InlineData("GIF89a")]
    [InlineData("")]
    public void GorselOlmayanIcerikReddedilir(string content)
    {
        // İstemci content-type'a "image/png" yazabilir; kabul kararı BAYTA bakıyor.
        // SVG özellikle: içinde script çalışır, kullanıcı yüklemesi olarak
        // servis edilirse saklı XSS olur.
        ImageProbe.TryRead(Encoding.UTF8.GetBytes(content), out _).ShouldBeFalse();
    }

    [Fact]
    public void SikistirmaBombasiReddedilir()
    {
        // 60000×60000 PNG birkaç yüz kilobayt olabilir ama çözüldüğünde gigabaytlarca
        // bellek ister. Çözecek olan kullanıcının tarayıcısı — kabul etmiyoruz.
        ImageProbe.TryRead(Png(60_000, 60_000), out _).ShouldBeFalse();
    }

    [Fact]
    public void SifirOlcuReddedilir()
        => ImageProbe.TryRead(Png(0, 100), out _).ShouldBeFalse();

    [Fact]
    public void KesikBaslikPatlamaz()
    {
        // Yükleme yarıda kesilirse elimizde dosyanın ilk baytları kalır. Ayrıştırıcı
        // istisna atarsa bu 500 olur; beklenen cevap "geçersiz dosya".
        var full = Png(1600, 900);

        for (var length = 0; length < full.Length; length++)
        {
            ImageProbe.TryRead(full.AsSpan(0, length), out _).ShouldBeFalse();
        }
    }

    [Fact]
    public void JpegKesikBaslikPatlamaz()
    {
        var full = Jpeg(4032, 3024, leading: Segment(0xE1, new byte[512]));

        for (var length = 0; length < full.Length; length++)
        {
            Should.NotThrow(() => ImageProbe.TryRead(full.AsSpan(0, length), out _));
        }
    }

    private static byte[] Png(int width, int height)
    {
        var bytes = new byte[24];
        ReadOnlySpan<byte> signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        signature.CopyTo(bytes);

        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(8, 4), 13); // IHDR yük uzunluğu
        Encoding.ASCII.GetBytes("IHDR").CopyTo(bytes, 12);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(16, 4), width);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(20, 4), height);

        return bytes;
    }

    private static byte[] Jpeg(int width, int height, ReadOnlySpan<byte> leading = default)
    {
        var frame = new byte[6];
        frame[0] = 8; // örnek hassasiyeti
        BinaryPrimitives.WriteUInt16BigEndian(frame.AsSpan(1, 2), (ushort)height);
        BinaryPrimitives.WriteUInt16BigEndian(frame.AsSpan(3, 2), (ushort)width);
        frame[5] = 3; // bileşen sayısı

        List<byte> bytes = [0xFF, 0xD8];
        bytes.AddRange(leading);
        bytes.AddRange(Segment(0xC0, frame));
        return [.. bytes];
    }

    /// <summary>FF + işaretçi + uzunluk(kendisi dahil) + yük.</summary>
    private static byte[] Segment(byte marker, ReadOnlySpan<byte> payload)
    {
        var bytes = new byte[4 + payload.Length];
        bytes[0] = 0xFF;
        bytes[1] = marker;
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(2, 2), (ushort)(payload.Length + 2));
        payload.CopyTo(bytes.AsSpan(4));
        return bytes;
    }

    private static byte[] Riff(string fourCc, byte[] payload)
    {
        var bytes = new byte[20 + payload.Length];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(bytes, 0);
        BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(4, 4), (uint)(12 + payload.Length));
        Encoding.ASCII.GetBytes("WEBP").CopyTo(bytes, 8);
        Encoding.ASCII.GetBytes(fourCc).CopyTo(bytes, 12);
        BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(16, 4), (uint)payload.Length);
        payload.CopyTo(bytes, 20);
        return bytes;
    }

    private static byte[] WebpLossy(int width, int height)
    {
        var payload = new byte[10];
        payload[3] = 0x9D;
        payload[4] = 0x01;
        payload[5] = 0x2A;
        BinaryPrimitives.WriteUInt16LittleEndian(payload.AsSpan(6, 2), (ushort)width);
        BinaryPrimitives.WriteUInt16LittleEndian(payload.AsSpan(8, 2), (ushort)height);
        return Riff("VP8 ", payload);
    }

    private static byte[] WebpLossless(int width, int height)
    {
        var payload = new byte[5];
        payload[0] = 0x2F;
        var packed = (uint)(width - 1) | ((uint)(height - 1) << 14);
        BinaryPrimitives.WriteUInt32LittleEndian(payload.AsSpan(1, 4), packed);
        return Riff("VP8L", payload);
    }

    private static byte[] WebpExtended(int width, int height)
    {
        var payload = new byte[10];
        WriteUInt24LittleEndian(payload.AsSpan(4, 3), width - 1);
        WriteUInt24LittleEndian(payload.AsSpan(7, 3), height - 1);
        return Riff("VP8X", payload);
    }

    private static void WriteUInt24LittleEndian(Span<byte> destination, int value)
    {
        destination[0] = (byte)value;
        destination[1] = (byte)(value >> 8);
        destination[2] = (byte)(value >> 16);
    }
}
