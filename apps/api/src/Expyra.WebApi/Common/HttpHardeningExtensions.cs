using Microsoft.AspNetCore.HttpOverrides;

namespace Expyra.WebApi.Common;

/// <summary>
/// Proxy arkasında doğru istemci adresi + güvenlik başlıkları (#47).
/// </summary>
internal static class HttpHardeningExtensions
{
    /// <summary>
    /// <c>X-Forwarded-For</c> / <c>X-Forwarded-Proto</c> YALNIZ <c>Network:TrustedProxies</c>
    /// listesindeki bir peer'dan geldiğinde dikkate alınır.
    ///
    /// <para><b>Varsayılan liste temizleniyor:</b> ASP.NET Core loopback'e (127.0.0.0/8, ::1)
    /// kendiliğinden güveniyor. Üretimde API ile aynı makinede çalışan herhangi bir süreç
    /// o zaman sahte bir istemci adresi yazabilirdi; güven listesi tek kaynaktan
    /// (<see cref="TrustedProxyRegistry"/>) gelmeli.</para>
    ///
    /// <para><b>ForwardLimit 1 (varsayılan) kalıyor:</b> zincirin yalnız SON girdisi, yani
    /// güvenilir ara katmanın kendi eklediği adres okunuyor. İstemcinin uydurduğu önceki
    /// girdiler hiç okunmuyor — sahte <c>X-Forwarded-For: 1.2.3.4</c> ile hız sınırı
    /// kovası değiştirilemiyor.</para>
    ///
    /// <para><b>Proto neden:</b> TLS yük dengeleyicide bitiyorsa API isteği <c>http</c>
    /// görür ve <c>UseHttpsRedirection</c> her isteği HTTPS'e yollar; yük dengeleyici de
    /// onu tekrar <c>http</c> olarak iletir — sonsuz yönlendirme.</para>
    /// </summary>
    public static IServiceCollection AddTrustedForwardedHeaders(this IServiceCollection services)
    {
        services
            .AddOptions<ForwardedHeadersOptions>()
            .Configure<TrustedProxyRegistry>((options, trustedProxies) =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownProxies.Clear();
                options.KnownIPNetworks.Clear();

                foreach (var network in trustedProxies.Networks)
                {
                    options.KnownIPNetworks.Add(network);
                }
            });

        return services;
    }

    /// <summary>
    /// Her yanıta <c>X-Content-Type-Options: nosniff</c>. <c>OnStarting</c> ile yazılıyor:
    /// <c>UseExceptionHandler</c> hata yolunda yanıt başlıklarını temizliyor ve başlık
    /// isteğin başında yazılsaydı tam da 500 yanıtında kaybolurdu.
    /// </summary>
    public static IApplicationBuilder UseNoSniff(this IApplicationBuilder app)
        => app.Use((context, next) =>
        {
            context.Response.OnStarting(
                static state =>
                {
                    ((HttpResponse)state).Headers.XContentTypeOptions = "nosniff";
                    return Task.CompletedTask;
                },
                context.Response);

            return next(context);
        });
}

/// <summary>
/// Development dışında açılış kontrolü (#42, #47). Eksik her ayarı ADIYLA toplar ve
/// tek bir istisnayla süreci durdurur — birini düzeltip yeniden deploy edince sıradakini
/// öğrenmek yerine hepsini bir kerede görmek için.
///
/// <para><b>Neden çalışma anı değil:</b> eksik sağlayıcıyla API açılıyor, <c>/health</c>
/// 200 dönüyor ve hata ilk kullanıcıyla 500 olarak görünüyordu. Boş
/// <c>TrustedProxies</c> ise hiç hata vermiyordu: BFF arkasında tüm istekler tek IP'den
/// geliyor ve tek bir istemci herkesin girişini kilitleyebiliyordu.</para>
///
/// <para><b>Boş <c>Cors:AllowedOrigins</c> burada BİLİNÇLİ OLARAK YOK.</b> Tarayıcı .NET
/// API'yi hiç görmüyor: web her çağrıyı Next sunucusundan (BFF) yapıyor ve
/// <c>EXPYRA_API_URL</c>'in <c>NEXT_PUBLIC_</c> öneki yok. Expo da yerel uygulama, CORS
/// uygulamıyor. Üretimde boş CORS listesi doğru yapılandırma — onu zorunlu kılmak,
/// operatörü gereksiz bir origin açmaya iterdi.</para>
/// </summary>
internal static class ProductionReadiness
{
    public static void Ensure(WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            return;
        }

        var missing = new List<string>(Expyra.Infrastructure.DependencyInjection.MissingProductionProviders(app.Services));

        if (!app.Services.GetRequiredService<TrustedProxyRegistry>().IsConfigured)
        {
            missing.Add(
                "Network:TrustedProxies — BFF'in (Next sunucusu) ve varsa yük dengeleyicinin IP/CIDR " +
                "listesi. Boşken tüm istekler tek IP'den gelmiş sayılır ve kimlik hız sınırı herkes için " +
                "tek kova olur. Ortam değişkeni: Network__TrustedProxies__0=10.0.0.5");
        }

        if (!HasExplicitAllowedHosts(app.Configuration["AllowedHosts"]))
        {
            missing.Add(
                "AllowedHosts — API'nin kabul ettiği Host adları, ';' ile ayrılmış (ör. " +
                "\"api.expyra.com;expyra-api.internal\"). '*' Development dışında kabul edilmiyor: " +
                "Host başlığı enjeksiyonuna açık bırakır.");
        }

        if (missing.Count == 0)
        {
            return;
        }

        // Hata yutulmuyor (CLAUDE.md #1): istisna en üste çıkıp süreci sıfır olmayan
        // kodla bitiriyor. Mesaj ortam adını da söylüyor ki "Staging'de neden açılmıyor"
        // sorusu log'a bakınca cevaplansın.
        throw new InvalidOperationException(
            $"API '{app.Environment.EnvironmentName}' ortamında açılamaz; eksik ayar(lar):"
            + Environment.NewLine + "- "
            + string.Join(Environment.NewLine + "- ", missing));
    }

    private static bool HasExplicitAllowedHosts(string? raw)
    {
        var hosts = (raw ?? string.Empty).Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return hosts.Length > 0 && !Array.Exists(hosts, x => string.Equals(x, "*", StringComparison.Ordinal));
    }
}
