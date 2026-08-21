using System.Buffers.Binary;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Commands.CreateMediaUpload;

namespace Expyra.IntegrationTests.Common;

/// <summary>
/// Görsel yükleme akışının test tarafı: imzalı adres al → PUT et → onayla.
///
/// <para><b>Neden gerçek bir JPEG dosyası kullanılmıyor:</b> API baytları ÇÖZMÜYOR,
/// yalnız başlığını okuyor (<c>ImageProbe</c>). Başlığı doğru kurulmuş bir bayt
/// dizisi, sunucunun gördüğü her şeyi sağlıyor — ve testin neyi doğruladığı
/// (ölçü şu, biçim bu) ikili bir fixture'da kaybolurdu. Ayrıştırıcının kendisi
/// <c>ImageProbeTests</c>'te gerçek biçim kurallarına karşı sınanıyor.</para>
/// </summary>
internal static class MediaApi
{
    internal const string HostExperiencesPath = "/api/host/experiences";

    /// <summary>Yayın koşulunu geçen ölçü (<c>MediaRules.MinWidth/MinHeight</c> üstü).</summary>
    internal static byte[] ValidPng(int width = 1600, int height = 1200) => Png(width, height);

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
