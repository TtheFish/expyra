namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Access ve refresh token üretimi. ÖMÜRLER Infrastructure'da (JwtOptions) kalır —
/// handler ne kadar yaşadığını değil, ne zaman bittiğini bilir; bu sayede ömür
/// değiştiğinde Application katmanı hiç değişmez.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// JWT HS256. Claim'ler: sub, jti, iat, nbf, exp, iss, aud + rol varsa
    /// <see cref="AuthClaimNames.Role"/>. E-posta claim'i YOK (token küçük ve PII'siz kalsın).
    /// </summary>
    /// <param name="roles">
    /// Kullanıcının rolleri — <c>app_user.roles</c> sütununun aynısı. Parametre olarak
    /// isteniyor çünkü token üretilirken satır ZATEN elde oluyor; servisin kendi başına
    /// veritabanına gitmesi her giriş ve her yenilemeye bir sorgu daha eklerdi. Boş
    /// koleksiyon geçerli ve olağan hâl: "yalnız gezgin".
    /// </param>
    AccessToken CreateAccessToken(Guid userId, IReadOnlyCollection<string> roles);

    /// <summary>32 bayt CSPRNG → Base64Url. Ham değer yalnız yanıtta döner, DB'ye özeti yazılır.</summary>
    RefreshTokenMaterial CreateRefreshToken();

    /// <summary>
    /// Sunulan ham token'ın DB araması için SHA-256 özeti (pepper'sız — 256 bit
    /// CSPRNG çıktısının kaba kuvvet uzayı yok).
    /// </summary>
    byte[] HashRefreshToken(string refreshToken);
}

/// <summary>
/// Token'a yazılan, RFC 7519'da karşılığı olmayan claim adları. Üreten (JwtTokenService)
/// ve okuyan (CurrentUser, authorization policy) taraf AYNI sabiti kullanmak zorunda.
///
/// <para>Kısa ad bilinçli: JwtBearer'da <c>MapInboundClaims = false</c>, yani buraya
/// yazılan ad token'da ve <c>ClaimsPrincipal</c>'da AYNEN duruyor — WS-Federation
/// URI'sine dönüşüm yok. Uzun URI'ler token'ı büyütmekten başka bir şey yapmıyordu.</para>
/// </summary>
public static class AuthClaimNames
{
    /// <summary>
    /// Rol claim'i. Değerleri <c>Expyra.Domain.Users.UserRole</c> sabitleri;
    /// birden fazla rol JSON dizisi olarak yazılır ve okuyan tarafta ayrı ayrı
    /// claim'lere açılır.
    /// </summary>
    public const string Role = "role";
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
