using System.Net;
using System.Net.Sockets;
using Expyra.Application.Common.Interfaces;

namespace Expyra.WebApi.Common;

/// <summary>
/// İsteğin istemci bağlamı. Application <c>HttpContext</c> tanımadığı için başlık
/// ayrıştırma ve IP maskeleme burada.
/// </summary>
internal sealed class ClientContext(
    IHttpContextAccessor httpContextAccessor,
    TrustedProxyRegistry trustedProxies) : IClientContext
{
    /// <summary>
    /// Next sunucusunun (BFF) gerçek istemci IP'sini ilettiği başlık. Adı bilerek
    /// <c>X-Forwarded-For</c> değil: o başlık her ara katman tarafından yazılıyor ve
    /// "kim ekledi" belirsizleşiyor. Bu başlık yalnız bizim BFF'imizin sözleşmesi.
    /// </summary>
    internal const string ClientIpHeader = "X-Expyra-Client-Ip";

    /// <summary>
    /// Kötü niyetli bir <c>Accept-Language</c> yüzlerce etiket taşıyabilir; her etiket
    /// dil çözümünde bir SQL <c>IN</c> parametresine dönüşüyor. Üst sınır koyuyoruz.
    /// </summary>
    private const int MaxAcceptedLanguages = 10;

    public IPAddress? IpPrefix
    {
        get
        {
            var httpContext = httpContextAccessor.HttpContext;
            var peer = Normalize(httpContext?.Connection.RemoteIpAddress);
            if (httpContext is null || peer is null)
            {
                return null;
            }

            // TrustedProxies yapılandırılmamışsa IP sayaçları DEVRE DIŞI (Riskler §5):
            // BFF arkasında peer daima Next sunucusudur ve onu gerçek istemci sanmak
            // tek bir adrese milyonlarca isteği yazmak demek. Yanlış güven vermektense
            // e-posta bazlı sayaçlarla yetiniyoruz.
            if (!trustedProxies.IsConfigured)
            {
                return null;
            }

            var forwarded = trustedProxies.Contains(peer) ? ReadForwardedIp(httpContext) : null;
            return Mask(forwarded ?? peer);
        }
    }

    public string? UserAgent
    {
        get
        {
            var raw = httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
            return string.IsNullOrWhiteSpace(raw) ? null : raw;
        }
    }

    public IReadOnlyList<string> AcceptedLanguages
    {
        get
        {
            var request = httpContextAccessor.HttpContext?.Request;
            if (request is null)
            {
                return [];
            }

            // Bozuk başlık istisna fırlatmaz, ayrıştırılamayan girdiler düşer.
            var accepted = request.GetTypedHeaders().AcceptLanguage;
            if (accepted.Count == 0)
            {
                return [];
            }

            return
            [
                .. accepted
                    // q değeri yoksa RFC 7231 §5.3.1 gereği 1.0. OrderByDescending kararlıdır,
                    // eşit q'da başlıktaki sıra korunur.
                    .OrderByDescending(x => x.Quality ?? 1.0)
                    .Select(x => x.Value.ToString())
                    .Where(x => x.Length > 0 && !string.Equals(x, "*", StringComparison.Ordinal))
                    .Take(MaxAcceptedLanguages),
            ];
        }
    }

    /// <summary>
    /// IPv6 <c>/64</c>, IPv4 <c>/32</c>. IPv6'da tek kullanıcı bir /64'ün tamamına
    /// sahiptir; tam adrese göre saymak sayacı bedavaya atlatılabilir kılar.
    /// </summary>
    private static IPAddress? Mask(IPAddress? address)
    {
        if (address is null || address.AddressFamily != AddressFamily.InterNetworkV6)
        {
            return address;
        }

        Span<byte> bytes = stackalloc byte[16];
        if (!address.TryWriteBytes(bytes, out _))
        {
            return address;
        }

        bytes[8..].Clear();
        return new IPAddress(bytes);
    }

    /// <summary>
    /// Kestrel çift yığın soketlerde IPv4 istemciyi <c>::ffff:127.0.0.1</c> olarak verir.
    /// Düzleştirmezsek hem güvenilir proxy karşılaştırması hem de /64 maskesi yanlış çalışır.
    /// </summary>
    private static IPAddress? Normalize(IPAddress? address)
        => address is { IsIPv4MappedToIPv6: true } ? address.MapToIPv4() : address;

    private static IPAddress? ReadForwardedIp(HttpContext httpContext)
    {
        var values = httpContext.Request.Headers[ClientIpHeader];

        // Birden fazla değer geldiyse hangisinin doğru olduğunu bilemeyiz — peer'a düşüyoruz.
        return values.Count == 1 && IPAddress.TryParse(values[0], out var parsed)
            ? Normalize(parsed)
            : null;
    }
}

/// <summary>
/// <c>Network:TrustedProxies</c> listesi. Singleton: yapılandırma bir kez ayrıştırılır
/// ve "boş liste" uyarısı bir kez loglanır.
/// </summary>
internal sealed class TrustedProxyRegistry(
    IConfiguration configuration,
    ILogger<TrustedProxyRegistry> logger)
{
    private readonly IPNetwork[] networks = Load(configuration, logger);

    public bool IsConfigured => networks.Length > 0;

    public bool Contains(IPAddress peer) => Array.Exists(networks, x => x.Contains(peer));

    private static IPNetwork[] Load(IConfiguration configuration, ILogger logger)
    {
        var entries = configuration.GetSection("Network:TrustedProxies").Get<string[]>() ?? [];
        var networks = Array.ConvertAll(entries, Parse);

        if (networks.Length == 0)
        {
            logger.LogWarning(
                "Network:TrustedProxies boş. X-Expyra-Client-Ip başlığı dikkate ALINMAYACAK ve " +
                "IP bazlı kimlik hız sınırı sayaçları devre dışı sayılacak. E-posta bazlı " +
                "sayaçlar çalışmaya devam ediyor.");
        }

        return networks;
    }

    private static IPNetwork Parse(string entry)
    {
        var trimmed = entry.Trim();

        // "10.0.0.0/8" gibi CIDR.
        if (IPNetwork.TryParse(trimmed, out var network))
        {
            return network;
        }

        // Tek adres: tam maske.
        if (IPAddress.TryParse(trimmed, out var address))
        {
            return new IPNetwork(
                address,
                address.AddressFamily == AddressFamily.InterNetworkV6 ? 128 : 32);
        }

        // Sessizce atlamak, IP sayaçlarını fark edilmeden kapatırdı (Riskler §5 tam olarak bu).
        throw new InvalidOperationException(
            $"Network:TrustedProxies içinde geçersiz giriş: '{entry}'. IP ya da CIDR bekleniyor.");
    }
}

internal static class ClientContextExtensions
{
    public static IServiceCollection AddClientContext(this IServiceCollection services)
    {
        services.AddSingleton<TrustedProxyRegistry>();
        services.AddScoped<IClientContext, ClientContext>();
        return services;
    }
}
