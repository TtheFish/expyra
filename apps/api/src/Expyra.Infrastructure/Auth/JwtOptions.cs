using System.Globalization;
using Microsoft.Extensions.Configuration;

namespace Expyra.Infrastructure.Auth;

/// <summary>
/// Token ömürleri ve iss/aud. Ömürler bilinçli olarak Infrastructure'da kalıyor:
/// handler token'ın ne kadar yaşadığını değil ne zaman bittiğini biliyor, böylece
/// ömür değiştiğinde Application katmanı hiç değişmiyor.
///
/// <para>İMZA ANAHTARI BURADA DURMAZ. Sır, DI'a kaydedilen bu nesnenin içinde
/// taşınırsa bir gün bir teşhis ucu tarafından serileştirilir; anahtar
/// <c>Auth:Jwt:SigningKey</c>'den okunup doğrudan servise veriliyor.</para>
///
/// <para><c>RefreshGraceSeconds</c> de burada DEĞİL: rotasyon kararı saf bir Application
/// fonksiyonu ve DB'siz test ediliyor, tek kaynağı <c>AuthOptions</c>. İki yerde
/// tutulursa değerler sessizce ayrışır.</para>
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Auth:Jwt";

    /// <summary>İmza anahtarının okunduğu yol. WebApi doğrulama tarafında aynısını okur.</summary>
    public const string SigningKeyPath = SectionName + ":SigningKey";

    public string Issuer { get; set; } = "expyra";

    public string Audience { get; set; } = "expyra";

    /// <summary>Tek servis doğruluyor, asimetrik gerekmiyor. İptal gecikmesinin tavanı bu.</summary>
    public int AccessTokenLifetimeMinutes { get; set; } = 15;

    public int RefreshTokenLifetimeDays { get; set; } = 30;

    /// <summary>Rotasyonla UZAMAZ. Tavan olmadan çalınan zincir asla ölmez.</summary>
    public int RefreshTokenAbsoluteLifetimeDays { get; set; } = 90;

    public TimeSpan AccessTokenLifetime => TimeSpan.FromMinutes(AccessTokenLifetimeMinutes);

    public TimeSpan RefreshTokenLifetime => TimeSpan.FromDays(RefreshTokenLifetimeDays);

    public TimeSpan RefreshTokenAbsoluteLifetime => TimeSpan.FromDays(RefreshTokenAbsoluteLifetimeDays);

    /// <summary>
    /// Açılışta okunur; bozuk değer varsayılana DÜŞMEZ, patlar. WebApi de doğrulama
    /// parametrelerini kurarken bunu çağırır — issuer/audience iki yerde elle
    /// yazılırsa üretilen token kendi API'sinde doğrulanamaz hâle gelir.
    /// </summary>
    public static JwtOptions FromConfiguration(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var defaults = new JwtOptions();

        var options = new JwtOptions
        {
            Issuer = Text(SectionName + ":Issuer", defaults.Issuer),
            Audience = Text(SectionName + ":Audience", defaults.Audience),
            AccessTokenLifetimeMinutes = Positive(
                SectionName + ":AccessTokenLifetimeMinutes", defaults.AccessTokenLifetimeMinutes),
            RefreshTokenLifetimeDays = Positive(
                SectionName + ":RefreshTokenLifetimeDays", defaults.RefreshTokenLifetimeDays),
            RefreshTokenAbsoluteLifetimeDays = Positive(
                SectionName + ":RefreshTokenAbsoluteLifetimeDays", defaults.RefreshTokenAbsoluteLifetimeDays),
        };

        if (options.RefreshTokenAbsoluteLifetimeDays < options.RefreshTokenLifetimeDays)
        {
            // Mutlak tavan normal ömürden kısaysa her token doğar doğmaz ölü olur.
            throw new InvalidOperationException(
                $"{SectionName}:RefreshTokenAbsoluteLifetimeDays, RefreshTokenLifetimeDays'ten küçük olamaz.");
        }

        return options;

        string Text(string path, string fallback)
        {
            var raw = configuration[path];
            return string.IsNullOrWhiteSpace(raw) ? fallback : raw.Trim();
        }

        int Positive(string path, int fallback)
        {
            var raw = configuration[path];
            if (string.IsNullOrWhiteSpace(raw))
            {
                return fallback;
            }

            if (!int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
                || value <= 0)
            {
                throw new InvalidOperationException($"{path} pozitif bir tam sayı olmalı; '{raw}' okundu.");
            }

            return value;
        }
    }
}
