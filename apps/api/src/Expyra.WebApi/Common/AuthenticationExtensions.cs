using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Users;

namespace Expyra.WebApi.Common;

/// <summary>
/// Policy adları. Controller'daki <c>[Authorize(Policy = ...)]</c> ile AYNI string
/// olmak zorunda; yazım hatası derlenmez ama çalışma anında
/// "policy not found" ile 500 verir, bu yüzden sabit.
/// </summary>
internal static class AuthorizationPolicies
{
    /// <summary>3-16 arası her host ucunun önündeki kapı.</summary>
    internal const string Host = "Host";
}

/// <summary>
/// JWT Bearer şeması. Program.cs şişmesin diye ayrı dosyada.
///
/// <para>Token'ı ÜRETEN taraf Infrastructure (JwtTokenService), DOĞRULAYAN taraf burası.
/// İkisi de aynı config anahtarlarını (<c>Auth:Jwt:Issuer|Audience|SigningKey</c>) okur —
/// bir taraf koda gömülü varsayılana düşerse her token sessizce reddedilir ve hata
/// "token geçersiz" diye görünür, "config eksik" diye değil. Bu yüzden üçü de
/// açılışta ZORUNLU: eksikse uygulama patlar, varsayılana düşmez.</para>
/// </summary>
internal static class AuthenticationExtensions
{
    /// <summary>HS256 için asgari anahtar boyu; kısa anahtar IdentityModel'de anlaşılmaz bir hata verir.</summary>
    private const int MinimumSigningKeyBytes = 32;

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var issuer = Required(configuration, "Auth:Jwt:Issuer");
        var audience = Required(configuration, "Auth:Jwt:Audience");
        var signingKey = DecodeSigningKey(Required(configuration, "Auth:Jwt:SigningKey"));

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // KRİTİK: varsayılan true, yani JwtBearer 'sub' claim'ini eski WS-Federation
                // URI'sine (ClaimTypes.NameIdentifier) çevirirdi. Kapatıyoruz ve CurrentUser
                // doğrudan JwtRegisteredClaimNames.Sub okuyor. İkisini birden okuyan
                // "hoşgörülü" bir CurrentUser YAZILMAZ: bu ayar bir gün değişirse hata
                // "UserId sessizce null" biçiminde çıkar ve nedeni hiçbir yerde görünmez.
                options.MapInboundClaims = false;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(signingKey),
                    ValidateLifetime = true,

                    // Algoritmayı sabitliyoruz: token başlığındaki 'alg' değerine güvenmek
                    // klasik algoritma karıştırma açığıdır.
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],

                    // Varsayılan 5 dk, access token'ın ömrü 15 dk. Skew bırakmak iptal
                    // gecikmesinin tavanını sessizce 20 dk'ya çıkarır. İmzalayan ve
                    // doğrulayan aynı süreç olduğu için saat kayması yok.
                    ClockSkew = TimeSpan.Zero,

                    // Varsayılan, WS-Federation URI'si (ClaimTypes.Role). Token'da o ad
                    // YOK — MapInboundClaims kapalı ve biz 'role' yazıyoruz. Ayarlanmazsa
                    // User.IsInRole ve [Authorize(Roles = ...)] hep false döner; hata
                    // "host olduğum hâlde 403 alıyorum" biçiminde çıkar ve nedeni
                    // görünmez. Kapı bugün RequireClaim ile kuruluyor (aşağıda), bu satır
                    // ikisinin bir gün ayrışmasını engelliyor.
                    RoleClaimType = AuthClaimNames.Role,
                };
            });

        return services;
    }

    /// <summary>
    /// Yetki politikaları. <c>AddAuthorization()</c> ÇIPLAK bırakılmıyor: host uçlarının
    /// kapısı tek yerde tanımlanmalı ki Blok 3-16'daki her uç aynı kararı miras alsın,
    /// her controller kendi claim kontrolünü yazmasın.
    /// </summary>
    public static IServiceCollection AddExpyraAuthorization(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        return services.AddAuthorization(options =>
        {
            // Varsayılan KAPALI (#49): hiçbir yetki niteliği taşımayan uç oturum ister.
            // Fallback olmadan [Authorize]'ı unutulan yeni bir controller sessizce herkese
            // açık kalıyordu; artık unutulan şey [AllowAnonymous] ve bedeli bir 401 —
            // hata güvenli yöne düşüyor. Halka açık uçların tam listesi
            // AnonymousEndpointTests'te beyaz liste olarak duruyor.
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();

            options.AddPolicy(AuthorizationPolicies.Host, policy => policy
                // İki başarısızlık AYRI kod üretiyor ve bu bilinçli: kimliksiz istek
                // RequireAuthenticatedUser'a takılıp 401 (challenge) alıyor, kimliği olup
                // rolü olmayan 403 (forbid). Aynı koda indirilirse istemci "yeniden giriş
                // yap" ile "önce host ol" arasındaki farkı gösteremez.
                .RequireAuthenticatedUser()

                // RequireRole DEĞİL: o, RoleClaimType ayarı üzerinden dolaşır.
                // RequireClaim doğrudan token'da duran adı ve değeri arıyor.
                .RequireClaim(AuthClaimNames.Role, UserRole.Host));
        });
    }

    private static string Required(IConfiguration configuration, string key)
    {
        var value = configuration[key];

        return string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException(
                $"{key} tanımlı değil. `dotnet user-secrets set \"{key}\" \"<değer>\"` ya da ortam değişkeni ile ver.")
            : value;
    }

    private static byte[] DecodeSigningKey(string configured)
    {
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(configured);
        }
        catch (FormatException exception)
        {
            // Hata YUTULMUYOR: iç istisna korunarak açılışta patlıyoruz. Anahtar
            // bozuksa uygulamanın hiç kalkmaması, her isteğin sebepsiz 401 vermesinden iyidir.
            throw new InvalidOperationException(
                "Auth:Jwt:SigningKey base64 değil. `openssl rand -base64 32` çıktısını ver.", exception);
        }

        return bytes.Length >= MinimumSigningKeyBytes
            ? bytes
            : throw new InvalidOperationException(
                $"Auth:Jwt:SigningKey en az {MinimumSigningKeyBytes} bayt olmalı (HS256), verilen: {bytes.Length}.");
    }
}
