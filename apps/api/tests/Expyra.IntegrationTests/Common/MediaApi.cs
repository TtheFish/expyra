using System.Buffers.Binary;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Shouldly;
using SkiaSharp;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Commands.CreateMediaUpload;

namespace Expyra.IntegrationTests.Common;

/// <summary>
/// Görsel yükleme akışının test tarafı: imzalı adres al → PUT et → onayla.
///
/// <para><b>İki tür fixture var.</b> Onaydan GEÇMESİ gereken görseller gerçekten
/// çözülebilir olmalı: API onay adımında pikselleri çözüp meta verisiz yeniden kodluyor
/// (issue #50). Onaydan önce REDDEDİLMESİ gereken durumlar (tip uyuşmazlığı, küçük ölçü,
/// boyut tavanı) için yalnız başlığı kurulmuş bayt dizisi yeterli ve testin neyi
/// sınadığını (ölçü şu, biçim bu) daha açık gösteriyor.</para>
/// </summary>
internal static class MediaApi
{
    internal const string HostExperiencesPath = "/api/host/experiences";

    private static readonly ConcurrentDictionary<(int, int), byte[]> PngCache = new();

    /// <summary>
    /// Yayın koşulunu geçen ölçüde (<c>MediaRules.MinWidth/MinHeight</c> üstü), gerçekten
    /// çözülebilen bir PNG. Önbellekli: onlarca test aynı dosyayı yüklüyor.
    /// </summary>
    internal static byte[] ValidPng(int width = 1600, int height = 1200)
        => PngCache.GetOrAdd((width, height), static size => Encode(
            Draw(size.Item1, size.Item2, SKColors.Coral, SKColors.SteelBlue), SKEncodedImageFormat.Png));

    /// <summary>
    /// Gerçek JPEG. Sol yarı <paramref name="left"/>, sağ yarı <paramref name="right"/> —
    /// yön uygulandı mı sorusu renklerin nereye düştüğünden okunuyor.
    /// </summary>
    internal static byte[] RealJpeg(int width, int height, SKColor left, SKColor right)
        => Encode(Draw(width, height, left, right), SKEncodedImageFormat.Jpeg);

    /// <summary>
    /// JPEG'e telefon fotoğrafındaki gibi bir EXIF bloğu ekler: üretici adı, yön ve GPS
    /// konumu (İzmir, 38°25'N 27°8'E). Skia EXIF yazmadığı için blok elle kuruluyor.
    /// </summary>
    internal static byte[] WithExif(byte[] jpeg, string make, ushort orientation)
    {
        var tiff = ExifTiff(make, orientation);
        var app1Length = 2 + ExifHeader.Length + tiff.Length;

        var result = new byte[jpeg.Length + 2 + app1Length];
        jpeg.AsSpan(0, 2).CopyTo(result); // SOI

        var offset = 2;
        result[offset++] = 0xFF;
        result[offset++] = 0xE1;
        BinaryPrimitives.WriteUInt16BigEndian(result.AsSpan(offset, 2), (ushort)app1Length);
        offset += 2;
        ExifHeader.CopyTo(result.AsSpan(offset));
        offset += ExifHeader.Length;
        tiff.CopyTo(result.AsSpan(offset));
        offset += tiff.Length;

        jpeg.AsSpan(2).CopyTo(result.AsSpan(offset));
        return result;
    }

    internal static ReadOnlySpan<byte> ExifHeader => "Exif\0\0"u8;

    private static SKBitmap Draw(int width, int height, SKColor left, SKColor right)
    {
        var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);
        using var leftPaint = new SKPaint { Color = left };
        using var rightPaint = new SKPaint { Color = right };

        canvas.DrawRect(0, 0, width / 2f, height, leftPaint);
        canvas.DrawRect(width / 2f, 0, width / 2f, height, rightPaint);

        return bitmap;
    }

    private static byte[] Encode(SKBitmap bitmap, SKEncodedImageFormat format)
    {
        using (bitmap)
        using (var image = SKImage.FromBitmap(bitmap))
        using (var data = image.Encode(format, 90))
        {
            return data.ToArray();
        }
    }

    /// <summary>
    /// Büyük-sonlu (MM) TIFF: IFD0 = Make, Orientation, GPS işaretçisi; GPS IFD =
    /// enlem/boylam ve yönleri. Ofsetler TIFF başlığının başından.
    /// </summary>
    private static byte[] ExifTiff(string make, ushort orientation)
    {
        var makeBytes = Encoding.ASCII.GetBytes(make + "\0");

        const int ifd0 = 8;
        const int ifd0Size = 2 + (3 * 12) + 4;
        var makeOffset = ifd0 + ifd0Size;
        var gpsOffset = makeOffset + makeBytes.Length;
        const int gpsSize = 2 + (4 * 12) + 4;
        var latOffset = gpsOffset + gpsSize;
        var lonOffset = latOffset + 24;

        var tiff = new byte[lonOffset + 24];
        var span = tiff.AsSpan();

        "MM"u8.CopyTo(span);
        BinaryPrimitives.WriteUInt16BigEndian(span[2..], 42);
        BinaryPrimitives.WriteUInt32BigEndian(span[4..], ifd0);

        var cursor = ifd0;
        BinaryPrimitives.WriteUInt16BigEndian(span[cursor..], 3);
        cursor += 2;
        cursor = Entry(span, cursor, 0x010F, 2, (uint)makeBytes.Length, (uint)makeOffset);
        cursor = ShortEntry(span, cursor, 0x0112, orientation);
        cursor = Entry(span, cursor, 0x8825, 4, 1, (uint)gpsOffset);
        BinaryPrimitives.WriteUInt32BigEndian(span[cursor..], 0);

        makeBytes.CopyTo(span[makeOffset..]);

        cursor = gpsOffset;
        BinaryPrimitives.WriteUInt16BigEndian(span[cursor..], 4);
        cursor += 2;
        cursor = AsciiEntry(span, cursor, 0x0001, (byte)'N');
        cursor = Entry(span, cursor, 0x0002, 5, 3, (uint)latOffset);
        cursor = AsciiEntry(span, cursor, 0x0003, (byte)'E');
        cursor = Entry(span, cursor, 0x0004, 5, 3, (uint)lonOffset);
        BinaryPrimitives.WriteUInt32BigEndian(span[cursor..], 0);

        Rationals(span[latOffset..], 38, 25, 0);
        Rationals(span[lonOffset..], 27, 8, 0);

        return tiff;

        static int Entry(Span<byte> s, int at, ushort tag, ushort type, uint count, uint value)
        {
            BinaryPrimitives.WriteUInt16BigEndian(s[at..], tag);
            BinaryPrimitives.WriteUInt16BigEndian(s[(at + 2)..], type);
            BinaryPrimitives.WriteUInt32BigEndian(s[(at + 4)..], count);
            BinaryPrimitives.WriteUInt32BigEndian(s[(at + 8)..], value);
            return at + 12;
        }

        static int ShortEntry(Span<byte> s, int at, ushort tag, ushort value)
        {
            Entry(s, at, tag, 3, 1, 0);
            BinaryPrimitives.WriteUInt16BigEndian(s[(at + 8)..], value);
            return at + 12;
        }

        static int AsciiEntry(Span<byte> s, int at, ushort tag, byte letter)
        {
            Entry(s, at, tag, 2, 2, 0);
            s[at + 8] = letter;
            return at + 12;
        }

        static void Rationals(Span<byte> s, uint degrees, uint minutes, uint seconds)
        {
            uint[] values = [degrees, 1, minutes, 1, seconds, 1];

            for (var index = 0; index < values.Length; index++)
            {
                BinaryPrimitives.WriteUInt32BigEndian(s[(index * 4)..], values[index]);
            }
        }
    }

    /// <summary>
    /// Üç adımın tamamı. Dönen yanıt ilanın güncel hâli — galeri ve kapak dahil.
    /// </summary>
    internal static async Task<HostExperienceResponse> UploadAsync(
        HttpClient client,
        string token,
        Guid experienceId,
        byte[]? bytes = null,
        string contentType = "image/png")
    {
        var content = bytes ?? ValidPng();
        var upload = await RequestUploadAsync(client, token, experienceId, content.Length, contentType);

        var put = await PutAsync(client, upload, content, contentType);
        put.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var confirm = await ConfirmAsync(client, token, experienceId, upload.MediaId);
        confirm.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await confirm.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!;
    }

    internal static async Task<MediaUploadResponse> RequestUploadAsync(
        HttpClient client,
        string token,
        Guid experienceId,
        long byteSize,
        string contentType = "image/png")
    {
        var response = await SendAsync(
            client,
            HttpMethod.Post,
            $"{HostExperiencesPath}/{experienceId}/media/upload-url",
            token,
            new { contentType, byteSize });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<MediaUploadResponse>(AuthApi.Json))!;
    }

    /// <summary>
    /// İmzalı adrese yükler. <b>Authorization başlığı YOK</b> — yetki imzada, tıpkı
    /// S3'te olduğu gibi. Adres mutlak geliyor ama yalnız yol+sorgu kullanılıyor:
    /// test sunucusu 5205 portunu tanımıyor ve mutlak adres testi yapılandırmadaki
    /// bir porta bağlardı.
    /// </summary>
    internal static async Task<HttpResponseMessage> PutAsync(
        HttpClient client,
        MediaUploadResponse upload,
        byte[] bytes,
        string contentType)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, upload.UploadUrl.PathAndQuery);
        request.Content = new ByteArrayContent(bytes);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        return await client.SendAsync(request).ConfigureAwait(false);
    }

    internal static Task<HttpResponseMessage> ConfirmAsync(
        HttpClient client, string token, Guid experienceId, Guid mediaId)
        => SendAsync(
            client,
            HttpMethod.Post,
            $"{HostExperiencesPath}/{experienceId}/media/{mediaId}/confirm",
            token);

    internal static async Task<HttpResponseMessage> SendAsync(
        HttpClient client, HttpMethod method, string path, string token, object? body = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        if (body is not null)
        {
            request.Content = JsonContent.Create(body, body.GetType(), options: AuthApi.Json);
        }

        return await client.SendAsync(request).ConfigureAwait(false);
    }

    /// <summary>
    /// Geçerli PNG başlığı + dolgu. Dolgu, boyut sınırlarını gerçekten sınayabilmek
    /// için: yalnız 24 baytlık başlık gönderilseydi "dosya çok büyük" dalı hiç
    /// çalışmazdı.
    /// </summary>
    internal static byte[] Png(int width, int height, int padding = 0)
    {
        var bytes = new byte[24 + padding];
        ReadOnlySpan<byte> signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        signature.CopyTo(bytes);

        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(8, 4), 13);
        Encoding.ASCII.GetBytes("IHDR").CopyTo(bytes, 12);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(16, 4), width);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(20, 4), height);

        return bytes;
    }

    /// <summary>JPEG başlığı — "beyan PNG, içerik JPEG" dalını sınamak için.</summary>
    internal static byte[] Jpeg(int width, int height)
    {
        var bytes = new byte[12];
        bytes[0] = 0xFF;
        bytes[1] = 0xD8;
        bytes[2] = 0xFF;
        bytes[3] = 0xC0;
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(4, 2), 8); // segment uzunluğu
        bytes[6] = 8; // örnek hassasiyeti
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(7, 2), (ushort)height);
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(9, 2), (ushort)width);

        return bytes;
    }
}
