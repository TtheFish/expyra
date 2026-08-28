using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Common.Interfaces;

namespace Expyra.WebApi.Common;

/// <summary>
/// Orta katman hız sınırı. <c>Microsoft.AspNetCore.RateLimiting</c> shared framework'te —
/// paket eklenmiyor.
///
/// <para>Bu sayaç OTORİTE DEĞİL, sel kesici: in-memory, süreç başına ve yeniden başlatmada
/// sıfırlanıyor. Kimlik akışının gerçek kotaları (e-posta 5/saat-15/gün, IP 20/saat-60/gün,
/// challenge başına 5 deneme) <c>login_code</c> tablosundan okunuyor ve dağıtık ortamda da
/// doğru çalışıyor. Buradaki 30/dk yalnızca kaba trafiği DB'ye ulaşmadan kesiyor.</para>
/// </summary>
internal static class RateLimiterExtensions
{
    /// <summary>Controller'daki <c>[EnableRateLimiting]</c> ile aynı ad olmak zorunda.</summary>
    internal const string AuthPolicy = "auth";

    private const int VarsayilanAuthPermitLimit = 30;

    /// <summary>
    /// Dakikadaki izin. Yapılandırmadan okunuyor çünkü integration testler tek IP'den
    /// (localhost) yüzlerce istek atıyor ve bu sayaç süreç boyunca paylaşıldığı için
    /// testler birbirini 429'a düşürüyordu — tek başına geçen test, hep birlikte
    /// koşunca kırılıyordu. Test ortamı yüksek bir değer verir; asıl kotalar
    /// (e-posta 5/saat, IP 20/saat, challenge başına 5 deneme) `login_code`
    /// tablosundan okunduğu için testlerin doğruladığı davranış değişmiyor.
    /// </summary>
    private static int AuthPermitLimit(IConfiguration configuration)
        => configuration.GetValue<int?>("Auth:RateLimit:PermitPerMinute") ?? VarsayilanAuthPermitLimit;

    public static IServiceCollection AddApiRateLimiter(
        this IServiceCollection services,
        IConfiguration configuration)
        => services.AddRateLimiter(options =>
        {
            // Varsayılan 503'tür ve "sunucu çöktü" gibi okunur; doğrusu 429.
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy(AuthPolicy, httpContext => RateLimitPartition.GetFixedWindowLimiter(
                PartitionKey(httpContext),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = AuthPermitLimit(configuration),
                    Window = TimeSpan.FromMinutes(1),

                    // Kuyruk YOK: hız sınırına takılan istek beklemez, anında 429 alır.
                    // Kuyruk bırakmak DoS'u "yavaş DoS"a çevirir, sunucu kaynağı tutar.
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                }));

            options.OnRejected = async (context, _) =>
            {
                if (context.HttpContext.Response.HasStarted)
                {
                    return;
                }

                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
                }

                // Reddetme pipeline'ı kısa devre yapıyor, GlobalExceptionHandler'a hiç
                // uğramıyor. Gövdeyi burada yazmazsak istemci boş bir 429 görür.
                var problemDetailsService =
                    context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();

                await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context.HttpContext,
                    ProblemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status429TooManyRequests,
                        Title = "Çok fazla istek. Biraz bekleyip tekrar dene.",
                    },
                }).ConfigureAwait(false);
            };
        });

    /// <summary>
    /// Bölümleme anahtarı. <see cref="IClientContext.IpPrefix"/> önce gelir: BFF arkasında
    /// TÜM istekler Next sunucusunun IP'sinden geliyor ve ham peer'a bakan bir bölümleme
    /// sitenin tamamını tek bir 30/dk kovasına sıkıştırırdı. Güvenilir IP yoksa peer'a
    /// düşüyoruz — burada peer'ı kullanmak "yanlış güven" değil, çünkü bu sayaç kota
    /// otoritesi değil (kota <c>login_code</c> tablosunda ve IP güvenilmezken kapalı).
    /// </summary>
    private static string PartitionKey(HttpContext httpContext)
    {
        var clientContext = httpContext.RequestServices.GetRequiredService<IClientContext>();

        return clientContext.IpPrefix?.ToString()
            ?? httpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
    }
}
