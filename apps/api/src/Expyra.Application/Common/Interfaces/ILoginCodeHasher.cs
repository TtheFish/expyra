namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Kod özeti: <c>HMACSHA256(pepper, $"{challengeId:N}:{code}")</c> → 32 bayt.
///
/// <para>Argon2 HAYIR: 20 bitlik, 10 dakika yaşayan, 5 denemede ölen bir sır için
/// 64 MiB + 100 ms bedeli, kimlik doğrulamasız bir uçta DoS yüzeyidir. Hash'in işi
/// çevrimdışı tarama değil, kazara ifşa. <c>challengeId</c> satır bazlı tuz görevi
/// görür — ayrı bir salt sütunu yok.</para>
/// </summary>
public interface ILoginCodeHasher
{
    byte[] Hash(Guid challengeId, string code);

    /// <summary>
    /// Karşılaştırma <c>CryptographicOperations.FixedTimeEquals</c> ile yapılır —
    /// <c>SequenceEqual</c>/<c>==</c> yazılmaz.
    /// </summary>
    bool Verify(Guid challengeId, string code, byte[] expectedHash);
}
