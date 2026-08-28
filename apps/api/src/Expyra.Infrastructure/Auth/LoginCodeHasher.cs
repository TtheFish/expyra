using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Auth;

/// <summary>
/// <c>HMACSHA256(pepper, $"{challengeId:N}:{code}")</c> → 32 bayt.
///
/// <para>Argon2 HAYIR: 20 bitlik, 10 dakika yaşayan, 5 denemede ölen bir sır için
/// 64 MiB + 100 ms bedeli, kimlik doğrulamasız bir uçta DoS silahıdır. Hash'in işi
/// çevrimdışı tarama değil, kazara ifşa (log, yedek, DB sızıntısı).</para>
/// </summary>
internal sealed class LoginCodeHasher(byte[] pepper) : ILoginCodeHasher
{
    public byte[] Hash(Guid challengeId, string code)
    {
        ArgumentException.ThrowIfNullOrEmpty(code);

        // challengeId satır bazlı TUZ görevi görüyor — ayrı bir salt sütunu yok ve
        // aynı kod iki farklı challenge'da farklı özet veriyor.
        var payload = string.Create(CultureInfo.InvariantCulture, $"{challengeId:N}:{code}");

        return HMACSHA256.HashData(pepper, Encoding.UTF8.GetBytes(payload));
    }

    public bool Verify(Guid challengeId, string code, byte[] expectedHash)
    {
        ArgumentNullException.ThrowIfNull(expectedHash);

        // SequenceEqual / == YAZILMAZ: ikisi de ilk farklı baytta dönüyor ve
        // karşılaştırma süresi kaç baytın tuttuğunu sızdırıyor.
        return CryptographicOperations.FixedTimeEquals(Hash(challengeId, code), expectedHash);
    }
}
