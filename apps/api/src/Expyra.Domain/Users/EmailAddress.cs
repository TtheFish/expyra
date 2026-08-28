using System.Globalization;
using System.Text.RegularExpressions;

namespace Expyra.Domain.Users;

/// <summary>
/// Neden ayrı bir tip: e-posta bu sistemde ŞİFRENİN yerini alıyor — kimliğin kendisi.
/// İki yerde iki farklı normalize edilirse aynı kişi için iki hesap doğar.
/// Kalıp: <see cref="Languages.LanguageCode"/>.
///
/// <para>Bilerek yapılmayan normalizasyon: Gmail nokta silme ve +etiket kırpma.
/// Sağlayıcıya özel politikadır; uygularsan farklı insanların hesaplarını sessizce
/// birleştirirsin.</para>
/// </summary>
public static partial class EmailAddress
{
    /// <summary>RFC 5321 §4.5.3.1.3 — adresin tamamı için üst sınır.</summary>
    public const int MaxLength = 254;

    // Local part ASCII: Faz 1'in göndericisi SMTPUTF8 konuşmuyor. Domain punycode'a iner.
    [GeneratedRegex(@"^[\x21-\x3F\x41-\x7E]+$", RegexOptions.CultureInvariant)]
    private static partial Regex LocalPartPattern();

    [GeneratedRegex(@"^[^@\s.]+(\.[^@\s.]+)+$", RegexOptions.CultureInvariant)]
    private static partial Regex DomainPattern();

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

        // LastIndexOf: local part '@' içerebilir (quoted string), domain içeremez.
        var at = trimmed.LastIndexOf('@');
        if (at <= 0 || at == trimmed.Length - 1)
        {
            return false;
        }

        var local = trimmed[..at];
        if (!LocalPartPattern().IsMatch(local))
        {
            return false;
        }

        string domain;
        try
        {
            // Universal platformuz (VISION §4): müller.de'yi REDDETMEK yerine tek biçime
            // indiriyoruz → xn--mller-kva.de. Aksi halde IDN adresler yarı normalize kalır.
            domain = new IdnMapping().GetAscii(trimmed[(at + 1)..]);
        }
        catch (ArgumentException)
        {
            // Hata YUTMA değil (CLAUDE.md #1): TryNormalize'ın sözleşmesi geçersiz girdide
            // false dönmek. LanguageCode.TryNormalize ile aynı kalıp.
            return false;
        }

        if (!DomainPattern().IsMatch(domain))
        {
            return false;
        }

        // Büyük/küçük dönüşümü DAİMA invariant. tr-TR'de "I".ToLower() → "ı" verir ve
        // normalized_email üzerindeki benzersizlik index'i satırı bulamaz. Hata sunucunun
        // kültür ayarına bağlı çıkar: testte yok, prodüksiyonda var (LanguageCode.cs:58-61).
        var result = string.Concat(local.ToLowerInvariant(), "@", domain.ToLowerInvariant());
        if (result.Length > MaxLength)
        {
            return false;
        }

        normalized = result;
        return true;
    }

    /// <summary>
    /// Normalize eder; geçersizse fırlatır. Girdinin zaten doğrulanmış olduğu
    /// yerlerde kullanılır — kullanıcı girdisinde <see cref="TryNormalize"/> tercih edilir.
    /// </summary>
    public static string Normalize(string candidate)
        => TryNormalize(candidate, out var normalized)
            ? normalized
            : throw new ArgumentException($"Geçersiz e-posta adresi: '{candidate}'.", nameof(candidate));

    public static bool IsValid(string? candidate) => TryNormalize(candidate, out _);
}
