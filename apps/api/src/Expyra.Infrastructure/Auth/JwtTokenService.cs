using System.Buffers.Text;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Auth;

/// <summary>
/// Access token JWT HS256, refresh token ham CSPRNG çıktısı.
///
/// <para>Refresh token neden JWT DEĞİL: JWT'nin tek avantajı sunucuya sormadan
/// doğrulanabilmesi — ama rotasyon ve yeniden kullanım tespiti zaten her yenilemede
/// DB satırı okuyor. Yapısız 32 baytın kaba kuvvet uzayı yok ve içinde sızacak
/// hiçbir alan taşımıyor.</para>
/// </summary>
internal sealed class JwtTokenService(
    JwtOptions options,
    byte[] signingKey,
    IDateTimeProvider dateTimeProvider)
    : ITokenService
{
    /// <summary>32 bayt = 256 bit. Bu boyutta kaba kuvvet fizik olarak imkânsız.</summary>
    private const int RefreshTokenBytes = 32;

    // JsonWebTokenHandler durumsuz ve thread-safe; istek başına yeniden kurmak boşa iş.
    private static readonly JsonWebTokenHandler TokenHandler = new();

    private readonly SigningCredentials credentials =
        new(new SymmetricSecurityKey(signingKey), SecurityAlgorithms.HmacSha256);

    public AccessToken CreateAccessToken(Guid userId, IReadOnlyCollection<string> roles)
    {
        ArgumentNullException.ThrowIfNull(roles);

        var now = dateTimeProvider.UtcNow;
        var expiresAtUtc = now + options.AccessTokenLifetime;

        var claims = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            // "D" formatı: okuyan taraf Guid.Parse ediyor ve "N" ile yazılırsa
            // sessizce başka bir string olur. E-posta claim'i YOK — token PII'siz kalıyor.
            [JwtRegisteredClaimNames.Sub] = userId.ToString("D", CultureInfo.InvariantCulture),

            // Guid v7: jti hem tekil hem zaman sıralı; ileride kara liste tutulursa
            // eski kayıtlar aralıkla süpürülebilir.
            [JwtRegisteredClaimNames.Jti] = Guid.CreateVersion7().ToString("D", CultureInfo.InvariantCulture),
        };

        // Rol claim'i YALNIZ rol varsa yazılıyor. Gezginlik taban olduğu için her token'a
        // sabit bir "Traveler" koymak, hiçbir policy'nin bakmadığı bir claim'le token'ı
        // şişirmek olurdu — claim'in yokluğu zaten "yalnız gezgin" demek.
        //
        // Dizi olarak veriliyor, tek rolde bile: JsonWebTokenHandler tek değeri skaler,
        // birden fazlasını dizi yazardı ve okuyan taraf iki farklı JSON şekli görürdü.
        if (roles.Count > 0)
        {
            claims[AuthClaimNames.Role] = roles.ToArray();
        }

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAtUtc.UtcDateTime,
            SigningCredentials = credentials,
            Claims = claims,
        };

        return new AccessToken(TokenHandler.CreateToken(descriptor), expiresAtUtc);
    }

    public RefreshTokenMaterial CreateRefreshToken()
    {
        var now = dateTimeProvider.UtcNow;

        // Base64Url: token çerezde ve JSON'da taşınıyor, '+' ve '/' kaçış gerektirirdi.
        var value = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(RefreshTokenBytes));

        return new RefreshTokenMaterial(
            value,
            HashRefreshToken(value),
            now + options.RefreshTokenLifetime,
            now + options.RefreshTokenAbsoluteLifetime);
    }

    public byte[] HashRefreshToken(string refreshToken)
    {
        ArgumentException.ThrowIfNullOrEmpty(refreshToken);

        // Hash'lenen şey kodlanmış METİN, ham baytlar değil: istemci geri tam olarak bu
        // metni sunuyor ve aramanın iki ucu aynı girdiden türemek zorunda.
        //
        // Pepper GEREKMİYOR (OTP'nin aksine): 256 bitlik CSPRNG çıktısında denenecek
        // bir uzay yok. Hash'in tek işi, DB sızıntısında satırların doğrudan
        // kullanılabilir token olmaması.
        return SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
    }
}
