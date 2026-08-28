using System.Net;

namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Aktif isteğin istemci bağlamı. Application <c>HttpContext</c> tanımaz —
/// <see cref="ICurrentUser"/> ile birebir aynı gerekçe.
/// </summary>
public interface IClientContext
{
    /// <summary>
    /// Hız sınırı sayaç anahtarı: IPv6'da /64'e maskelenmiş, IPv4'te /32.
    ///
    /// <para><c>null</c> = güvenilir bir istemci IP'si çıkarılamadı. BFF mimarisinde
    /// her web isteği Next sunucusunun IP'sinden gelir; gerçek IP yalnız çağıran peer
    /// <c>Network:TrustedProxies</c> içindeyse dikkate alınır. Yapılandırma yoksa IP
    /// sayaçları devre dışı kalır — yanlış güven vermektense saymamak (bkz. Riskler §5).</para>
    /// </summary>
    IPAddress? IpPrefix { get; }

    string? UserAgent { get; }

    /// <summary>
    /// <c>Accept-Language</c> başlığı, q-değerine göre sıralanmış. Ayrıştırma WebApi'de:
    /// RFC 7231 q-değeri ayrıştırmak ASP.NET'te hazır (StringWithQualityHeaderValue),
    /// Application'da elle yazılırsa ikinci bir hata kaynağı olur.
    /// </summary>
    IReadOnlyList<string> AcceptedLanguages { get; }
}
