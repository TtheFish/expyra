namespace Expyra.Domain.Places;

/// <summary>
/// Şehrin <b>dışarıya açık kimliği</b>: <c>cz-prague</c>, <c>tr-istanbul</c> —
/// ülke kodu + tire + slug, yani <see cref="City"/>'nin doğal anahtarının
/// (<c>ux_city_country_slug</c>) metin hâli.
///
/// <para><b>Neden <c>city.id</c> (uuid) DEĞİL</b> — üçü de tek başına yeterli üç sebep,
/// aynısı web tarafında <c>features/places/api.ts</c> içinde de yazılı:</para>
/// <list type="number">
/// <item>Uuid seed sırasında üretiliyor ve yeniden üretilmiyor; aynı şehrin kimliği her
/// veritabanında farklı. Paylaşılan bir bağlantı ikinci ortamda başka bir şehri
/// gösterirdi.</item>
/// <item><c>GET /api/places/cities/{id}</c> YOK — uuid'i geri şehre çevirecek bir uç
/// olmadan sunucu, filtrelenen şehrin adını bile yazamazdı.</item>
/// <item><c>?city=cz-prague</c> okunabilir ve paylaşılabilir; uuid opak.</item>
/// </list>
///
/// <para><b>Slug tek başına yetmiyor:</b> benzersizlik <c>(ülke, slug)</c> çiftinde —
/// aynı slug iki ülkede olabilir. Yalnız slug alan bir filtre, iki şehri sessizce
/// birbirine karıştırırdı.</para>
///
/// <para>Ayrım İLK tireden yapılıyor: slug'ın kendisi tire içerebiliyor
/// (<c>cesky-krumlov</c>) ama ülke kodunun uzunluğu sabit, dolayısıyla belirsizlik yok.</para>
/// </summary>
public static class CityKey
{
    /// <summary>Ülke kodu + ayraç + slug.</summary>
    public const int MaxLength = CountryCode.Length + 1 + City.MaxNameLength;

    /// <summary>
    /// Anahtarı parçalar. Biçimi tutmayan değer <c>false</c> — çağıran bunu 400'e
    /// çevirir, sessizce yok saymaz (PLAN Blok 4 kabul kriteri 3'ün aynı ilkesi:
    /// yok sayılan bir filtre, istemciye "bu şehirde sonuç yok" diye görünür).
    /// </summary>
    /// <param name="countryCode">Normalize edilmiş ISO 3166-1 alpha-2 (BÜYÜK harf).</param>
    /// <param name="slug">Küçük harfli slug — <c>city.slug</c> ile birebir.</param>
    public static bool TryParse(string? candidate, out string countryCode, out string slug)
    {
        countryCode = string.Empty;
        slug = string.Empty;

        if (string.IsNullOrWhiteSpace(candidate))
        {
            return false;
        }

        var trimmed = candidate.Trim();
        if (trimmed.Length > MaxLength)
        {
            return false;
        }

        var separator = trimmed.IndexOf('-', StringComparison.Ordinal);
        if (separator != CountryCode.Length)
        {
            return false;
        }

        if (!CountryCode.TryNormalize(trimmed[..separator], out var normalizedCountry))
        {
            return false;
        }

        // ToLowerInvariant ZORUNLU: Türkçe kültürde "TR-ISTANBUL".ToLower() → "tr-ıstanbul"
        // olur ve slug hiçbir satırla eşleşmez. Hata sunucunun kültür ayarına bağlı çıkar,
        // yani testte değil prodüksiyonda (LanguageCode.cs ve SearchText.cs aynı tuzak).
        var normalizedSlug = trimmed[(separator + 1)..].ToLowerInvariant();

        if (!IsSlug(normalizedSlug))
        {
            return false;
        }

        countryCode = normalizedCountry;
        slug = normalizedSlug;
        return true;
    }

    public static bool IsValid(string? candidate) => TryParse(candidate, out _, out _);

    /// <summary>
    /// Slug biçimi: küçük ASCII harf/rakam, aralarında tek tire. Kayıt defterindeki
    /// tüm slug'lar bu biçimde (docs/cities.json) — daha geniş bir kabul, eşleşmeyeceği
    /// baştan belli bir değeri veritabanına kadar taşırdı.
    /// </summary>
    private static bool IsSlug(string value)
    {
        if (value.Length == 0 || value[0] == '-' || value[^1] == '-')
        {
            return false;
        }

        var previousWasSeparator = false;

        foreach (var character in value)
        {
            if (character == '-')
            {
                if (previousWasSeparator)
                {
                    return false;
                }

                previousWasSeparator = true;
                continue;
            }

            if (!char.IsAsciiLetterLower(character) && !char.IsAsciiDigit(character))
            {
                return false;
            }

            previousWasSeparator = false;
        }

        return true;
    }
}
