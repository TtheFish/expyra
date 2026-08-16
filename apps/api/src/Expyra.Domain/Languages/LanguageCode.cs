using System.Text.RegularExpressions;

namespace Expyra.Domain.Languages;

/// <summary>
/// BCP-47 dil etiketi normalizasyonu ve doğrulaması.
///
/// Neden ayrı bir tip: dil kodu sistemin her yerinden geçiyor (içerik çevirisi,
/// arayüz seçimi, arama konfigürasyonu, URL segmenti). "en-us", "EN", "en_US"
/// gibi varyantlar tek biçime indirgenmezse aynı dil için iki satır oluşur ve
/// fallback zinciri sessizce kırılır.
///
/// Biçim: dil küçük, script Title, bölge BÜYÜK — <c>en</c>, <c>pt-BR</c>,
/// <c>zh-Hans</c>, <c>sr-Latn-RS</c>.
/// </summary>
public static partial class LanguageCode
{
    /// <summary>Veritabanı sütun genişliği. <c>sr-Latn-RS</c> en uzun gerçekçi hâli.</summary>
    public const int MaxLength = 20;

    [GeneratedRegex(@"^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$", RegexOptions.CultureInvariant)]
    private static partial Regex Bcp47Pattern();

    /// <summary>
    /// Normalize edip doğrular. Geçersizse <c>false</c> döner — istisna fırlatmaz,
    /// çünkü çağıranların çoğu kullanıcı girdisi doğruluyor.
    /// </summary>
    public static bool TryNormalize(string? candidate, out string normalized)
    {
        normalized = string.Empty;

        if (string.IsNullOrWhiteSpace(candidate))
        {
            return false;
        }

        var trimmed = candidate.Trim();
        if (trimmed.Length > MaxLength)
        {
            return false;
        }

        // Alt çizgi yaygın bir yanlış ayraç (Java/POSIX locale biçimi): en_US.
        var parts = trimmed.Replace('_', '-').Split('-');
        if (parts.Length > 3)
        {
            return false;
        }

        for (var i = 0; i < parts.Length; i++)
        {
            var part = parts[i];
            if (part.Length == 0)
            {
                return false;
            }

            // Büyük/küçük dönüşümü DAİMA invariant kültürle yapılır.
            // Türkçe kültürde "i".ToUpper() → "İ" olur; bu, dil kodunu bozar ve
            // hatanın sunucunun kültür ayarına bağlı olarak ortaya çıkması demektir
            // (yani testte değil, prodüksiyonda). Aynı tuzak: docs/ROADMAP.md Faz 7.
            parts[i] = i switch
            {
                0 => part.ToLowerInvariant(),
                _ when part.Length == 4 => string.Concat(
                    char.ToUpperInvariant(part[0]),
                    part[1..].ToLowerInvariant()),
                _ => part.ToUpperInvariant(),
            };
        }

        var result = string.Join('-', parts);
        if (!Bcp47Pattern().IsMatch(result))
        {
            return false;
        }

        normalized = result;
        return true;
    }

    /// <summary>
    /// Normalize eder; geçersizse fırlatır. Girdinin zaten doğrulanmış olduğu
    /// yerlerde (seed verisi, sabitler) kullanılır — kullanıcı girdisinde
    /// <see cref="TryNormalize"/> tercih edilir.
    /// </summary>
    public static string Normalize(string candidate)
        => TryNormalize(candidate, out var normalized)
            ? normalized
            : throw new ArgumentException($"Geçersiz BCP-47 dil kodu: '{candidate}'.", nameof(candidate));

    public static bool IsValid(string? candidate) => TryNormalize(candidate, out _);

    /// <summary>
    /// Fallback zincirinin ikinci adımı: bölgeli koddan bölgesiz köke iner
    /// (<c>de-AT</c> → <c>de</c>). Zaten köksüz ise <c>null</c> döner.
    /// Tam zincir: docs/I18N.md §2.
    /// </summary>
    public static string? BaseLanguageOf(string code)
    {
        if (!TryNormalize(code, out var normalized))
        {
            return null;
        }

        var separator = normalized.IndexOf('-', StringComparison.Ordinal);
        return separator < 0 ? null : normalized[..separator];
    }
}
