namespace Expyra.Domain.Places;

/// <summary>
/// ISO 3166-1 alpha-2 ülke kodu normalizasyonu ve doğrulaması.
/// Kalıp: <see cref="Languages.LanguageCode"/>.
/// </summary>
public static class CountryCode
{
    /// <summary>alpha-2: daima 2 harf. alpha-3 ve sayısal kodlar kullanılmıyor.</summary>
    public const int Length = 2;

    /// <summary>
    /// Normalize edip doğrular. Geçersizse <c>false</c> döner — istisna fırlatmaz,
    /// çünkü çağıranların çoğu kullanıcı girdisi (query string) doğruluyor.
    /// </summary>
    public static bool TryNormalize(string? candidate, out string normalized)
    {
        normalized = string.Empty;

        if (string.IsNullOrWhiteSpace(candidate))
        {
            return false;
        }

        var trimmed = candidate.Trim();
        if (trimmed.Length != Length)
        {
            return false;
        }

        // Invariant ZORUNLU: Türkçe kültürde "ci".ToUpper() → "Cİ" verir ve Côte d'Ivoire
        // ('CI') hiçbir satırla eşleşmez. Hata sunucunun kültür ayarına bağlı çıkar —
        // testte yok, prodüksiyonda var (LanguageCode.cs'teki aynı tuzak).
        var upper = trimmed.ToUpperInvariant();

        foreach (var character in upper)
        {
            if (!char.IsAsciiLetterUpper(character))
            {
                return false;
            }
        }

        normalized = upper;
        return true;
    }

    /// <summary>Normalize eder; geçersizse fırlatır. Seed verisi ve sabitler için.</summary>
    public static string Normalize(string candidate)
        => TryNormalize(candidate, out var normalized)
            ? normalized
            : throw new ArgumentException($"Geçersiz ISO 3166-1 alpha-2 ülke kodu: '{candidate}'.", nameof(candidate));

    public static bool IsValid(string? candidate) => TryNormalize(candidate, out _);
}
