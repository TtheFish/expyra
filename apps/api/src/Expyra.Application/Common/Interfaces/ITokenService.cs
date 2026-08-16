namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Access ve refresh token üretimi. ÖMÜRLER Infrastructure'da (JwtOptions) kalır —
/// handler ne kadar yaşadığını değil, ne zaman bittiğini bilir; bu sayede ömür
/// değiştiğinde Application katmanı hiç değişmez.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// JWT HS256. Claim'ler: sub, jti, iat, nbf, exp, iss, aud.
    /// Rol claim'i YOK (Faz 1.7), e-posta claim'i YOK (token küçük ve PII'siz kalsın).
    /// </summary>
    AccessToken CreateAccessToken(Guid userId);

    /// <summary>32 bayt CSPRNG → Base64Url. Ham değer yalnız yanıtta döner, DB'ye özeti yazılır.</summary>
    RefreshTokenMaterial CreateRefreshToken();

    /// <summary>
    /// Sunulan ham token'ın DB araması için SHA-256 özeti (pepper'sız — 256 bit
    /// CSPRNG çıktısının kaba kuvvet uzayı yok).
    /// </summary>
    byte[] HashRefreshToken(string refreshToken);
}

/// <param name="Value">İstemciye dönen JWT. Loglanmaz.</param>
public sealed record AccessToken(string Value, DateTimeOffset ExpiresAtUtc);

/// <param name="Value">İstemciye dönen ham token. DB'ye ASLA bu yazılmaz.</param>
/// <param name="AbsoluteExpiresAtUtc">
/// Mutlak tavan. Rotasyonda KOPYALANIR, uzatılmaz — tavan olmadan çalınan zincir asla ölmez.
/// </param>
public sealed record RefreshTokenMaterial(
    string Value,
    byte[] TokenHash,
    DateTimeOffset ExpiresAtUtc,
    DateTimeOffset AbsoluteExpiresAtUtc);
