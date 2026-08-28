using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Common.Interfaces;
using Expyra.Infrastructure.Email;
using Expyra.Infrastructure.Storage;

namespace Expyra.WebApi.Features.Dev;

/// <summary>
/// Dev nesne deposunun HTTP yüzü: imzalı yükleme ve dosya servisi.
///
/// <para><b>Üretimde bu uçlar HİÇ YOK.</b> <c>Program.cs</c> onları yalnız
/// <c>IsDevelopment()</c> altında kuruyor — bir yapılandırma bayrağıyla değil, çünkü
/// bayrak yanlış bir ortam değişkeniyle üretime sızabilir (<c>AddDevelopmentEmailSender</c>
/// ile aynı gerekçe). Üretimde tarayıcı doğrudan S3/R2'ye yüklüyor ve dosyaları CDN
/// servis ediyor; API bayt taşımıyor.</para>
///
/// <para><b>Neden controller değil minimal API:</b> controller'lar otomatik keşfediliyor,
/// yani ortam kapısı sınıfın kendi içinde bir <c>if</c>'e dönerdi ve o <c>if</c> bir gün
/// silinebilirdi. Burada uçların var olup olmaması tek bir çağrıya bağlı.</para>
/// </summary>
internal static class DevelopmentObjectEndpoints
{
    internal static WebApplication MapDevelopmentObjectStorage(this WebApplication app)
    {
        // Yükleme: kimlik doğrulaması YOK, yetki imzada. S3 presigned PUT de böyle
        // çalışıyor ve web tarafının aynı kodu üretimde de kullanabilmesi için akışın
        // birebir aynı olması gerekiyor.
        app.MapPut("/api/dev/uploads", async (
            [FromQuery] string? token,
            HttpRequest request,
            ILocalUploadSink sink,
            CancellationToken cancellationToken) =>
        {
            var result = await sink.AcceptAsync(
                token, request.ContentType, request.Body, cancellationToken);

            return result switch
            {
                LocalUploadResult.Accepted => Results.NoContent(),

                // 403: imza geçersiz ya da süresi dolmuş. S3'ün aynı durumdaki cevabı
                // da 403 — web tarafı iki ortamda aynı dalı çalıştırıyor.
                LocalUploadResult.InvalidSignature or LocalUploadResult.Expired
                    => Results.StatusCode(StatusCodes.Status403Forbidden),

                LocalUploadResult.ContentTypeMismatch
                    => Results.StatusCode(StatusCodes.Status400BadRequest),

                LocalUploadResult.TooLarge
                    => Results.StatusCode(StatusCodes.Status413PayloadTooLarge),

                // Sessiz varsayılan yok: yeni bir sonuç eklenip burası unutulursa
                // 200 dönmektense yüksek sesle patlıyor (CLAUDE.md #1).
                _ => throw new InvalidOperationException($"Bilinmeyen yükleme sonucu: {result}"),
            };
        })
        .AllowAnonymous()
        .ExcludeFromDescription();

        // Servis: `{**key}` çok segmentli anahtarı (experiences/{id}/{id}.jpg) tek
        // parametrede yakalıyor. Yol gezinmesi depo tarafında engelleniyor —
        // FileSystemObjectStorage.IsSafeKey.
        app.MapGet("/api/dev/objects/{**key}", async (
            string key,
            IObjectStorage storage,
            CancellationToken cancellationToken) =>
        {
            var stored = await storage.HeadAsync(key, cancellationToken);

            if (stored is null)
            {
                return Results.NotFound();
            }

            var stream = await storage.OpenReadAsync(key, maxBytes: null, cancellationToken);

            return stream is null
                ? Results.NotFound()
                // enableRangeProcessing: <video> ve bazı tarayıcılar aralık istiyor;
                // desteklenmezse dosya hiç oynatılmaz. Görselde de zararsız.
                : Results.File(stream, stored.ContentType, enableRangeProcessing: true);
        })
        .AllowAnonymous()
        .ExcludeFromDescription();

        return app;
    }

    /// <summary>
    /// Dev posta kutusu: son gönderilen e-postalar. <b>Giriş kodları burada AÇIK.</b>
    ///
    /// <para>Üretimde bu uç HİÇ YOK — <c>Program.cs</c> onu yalnız <c>IsDevelopment()</c>
    /// altında kuruyor. Yapılandırma bayrağıyla değil ortamla kapatılıyor: bayrak yanlış
    /// bir ortam değişkeniyle üretime sızabilir ve o gün herkesin giriş kodu bir GET
    /// isteğiyle okunabilir olurdu.</para>
    ///
    /// <para><b>Neden var:</b> şifresiz sistemde her giriş bir OTP istiyor ve kodu
    /// okumanın tek yolu <c>.mail-drop</c> klasöründeki en yeni dosyayı elle açmaktı.
    /// Arayüz bunu çağırıp kodu giriş ekranında gösteriyor.</para>
    /// </summary>
    internal static WebApplication MapDevelopmentMailbox(this WebApplication app)
    {
        app.MapGet("/api/dev/emails", (
            [FromQuery] string? to,
            [FromQuery] int? count,
            ILocalMailbox mailbox) =>
        {
            // Tavan sabit: istemcinin verdiği sayı kutunun kapasitesini aşamaz.
            var take = Math.Clamp(count ?? 5, 1, 25);

            return Results.Ok(mailbox.Recent(to, take));
        })
        .AllowAnonymous()
        .ExcludeFromDescription();

        return app;
    }
}
