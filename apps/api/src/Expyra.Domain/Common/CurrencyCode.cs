namespace Expyra.Domain.Common;

/// <summary>
/// ISO 4217 para birimi kodu normalizasyonu ve doğrulaması.
/// Kalıp: <see cref="Languages.LanguageCode"/>, <see cref="Places.CountryCode"/>.
///
/// <para>Neden <c>Domain/Common</c> altında, <c>Domain/Pricing</c> değil:
/// <see cref="Money"/> bu tip olmadan kurulamıyor ve Common'ın bir feature
/// namespace'ine bağımlı olması bağımlılık yönünü ters çevirirdi. Kayıt defteri
/// (<c>Pricing.Currency</c>) buraya bakar, tersi değil.</para>
/// </summary>
public static class CurrencyCode
{
    /// <summary>ISO 4217 alfabetik kod daima 3 harf.</summary>
    public const int Length = 3;

    /// <summary>
    /// ISO 4217'de üs (minör birim hane sayısı) 0-4 arasında. CLF (Şili UF) 4 ile
    /// tavanı belirliyor; JPY 0, KWD 3. Aralık dışı bir değer veri hatasıdır.
    /// </summary>
    public const int MaxMinorUnits = 4;

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
        if (trimmed.Length != Length)
        {
            return false;
        }

        // Büyük harfe çevirim DAİMA invariant. Türkçe kültürde "ils".ToUpper() → "İLS"
        // verir; kod bir daha hiçbir satırla eşleşmez ve hata sunucunun kültür ayarına
        // bağlı olarak yalnızca prodüksiyonda çıkar (LanguageCode.cs'teki aynı tuzak).
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

    /// <summary>
    /// Normalize eder; geçersizse fırlatır. Girdinin zaten doğrulanmış olduğu
    /// yerlerde (seed verisi, sabitler, <see cref="Money"/>) kullanılır.
    /// </summary>
    public static string Normalize(string candidate)
        => TryNormalize(candidate, out var normalized)
            ? normalized
            : throw new ArgumentException($"Geçersiz ISO 4217 para birimi kodu: '{candidate}'.", nameof(candidate));

    public static bool IsValid(string? candidate) => TryNormalize(candidate, out _);
}
