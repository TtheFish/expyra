using System.Globalization;
using System.Text;

namespace Expyra.Domain.Common;

/// <summary>
/// Aksan/büyük-küçük duyarsız arama anahtarı üretir. Şehir adı araması bunun üzerine
/// kurulu: <c>city_alias.normalized_name</c> bu fonksiyonun çıktısıdır ve sorgu da
/// aynı fonksiyondan geçer — iki taraf aynı kodu kullanmazsa "Praha" satırı "praha"
/// aramasını bulamaz.
///
/// <para><b>Neden .NET'te katlanıyor, Postgres'te değil</b> (kararın gerekçesi,
/// docs/I18N.md §4 "şehir adı araması tam metin değil, önek/benzerlik"):</para>
/// <list type="bullet">
/// <item><c>unaccent</c> IMMUTABLE değil (sözlük dosyasına bağlı), bu yüzden
/// <c>CREATE INDEX ... (unaccent(col))</c> doğrudan çalışmaz; sarmalayıcı bir IMMUTABLE
/// fonksiyon + eklenti kurulumu (süperkullanıcı) gerekir. Yönetilen Postgres'te ve
/// CI'da kırılgan bir bağımlılık.</item>
/// <item><c>pg_trgm</c> yazım hatası toleransı için iyi ama 2-3 harflik bir autocomplete
/// önekinde benzerlik sıralaması kötü çalışır ve o da eklenti ister. Birkaç bin satırlık
/// bir kayıt defteri için düz btree önek taraması yeter.</item>
/// <item>Postgres'in <c>lower()</c>'ı Türkçe olmayan bir collation altında
/// <c>İ</c> (U+0130) → <c>i + birleşen nokta</c> üretir; bu <c>i</c>'ye EŞİT DEĞİLDİR.
/// "İstanbul" satırı "istanbul" aramasını kaçırırdı. Katlamayı burada yapmak, i/I
/// tuzağını <see cref="Languages.LanguageCode"/> ile aynı yerde ve aynı biçimde
/// çözmemizi sağlıyor.</item>
/// </list>
///
/// <para>Sonuç: kolon <c>COLLATE "C"</c> ile saklanıyor ve düz btree index'i
/// <c>LIKE 'önek%'</c> taramasına açık kalıyor — eklenti yok, özel opclass yok.</para>
/// </summary>
public static class SearchText
{
    /// <summary>
    /// Katlanmış anahtarın sütun genişliği. Gerçek şehir adları çok daha kısa;
    /// sınır, kullanıcıdan gelen metnin index'i şişirmesini engelliyor.
    /// </summary>
    public const int MaxLength = 200;

    /// <summary>
    /// Aksanı düşürür, küçük harfe indirir, harf/rakam dışını tek boşluğa çevirir.
    /// Kültürden BAĞIMSIZDIR: sunucunun kültür ayarı değişse de çıktı aynı kalır.
    /// </summary>
    public static string Fold(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var source = value.Trim();
        if (source.Length > MaxLength)
        {
            source = source[..MaxLength];
        }

        // Unicode ayrıştırmasıyla ÇÖZÜLMEYEN harfler önce açılıyor: ß→ss, ø→o, æ→ae…
        // Bunların kanonik ayrıştırması yok, NFD onlara dokunmaz.
        var expanded = Expand(source);

        // NFD: "ş" → "s" + birleşen çengel. Birleşen işaretleri atınca aksan düşer.
        var decomposed = expanded.Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder(decomposed.Length);
        var pendingSpace = false;

        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(character))
            {
                if (pendingSpace && builder.Length > 0)
                {
                    builder.Append(' ');
                }

                pendingSpace = false;

                // Invariant: Türkçe kültürde 'I'.ToLower() → 'ı' olurdu ve "ISTANBUL"
                // araması "istanbul" satırını bulamazdı (LanguageCode.cs'teki aynı tuzak).
                builder.Append(char.ToLowerInvariant(character));
                continue;
            }

            // Noktalama ve ayraçlar tek boşluğa iner; baştaki/sondaki boşluk yazılmaz.
            pendingSpace = true;
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>
    /// URL ve doğal anahtar için slug: katlanmış metnin boşlukları tire olur.
    /// <c>city.slug</c> bu biçimde saklanıyor — ad düzeltmesi kimliği değiştirmesin diye
    /// seed dosyasında AÇIKÇA yazılı, burada yalnız doğrulanıyor.
    /// </summary>
    public static string ToSlug(string? value) => Fold(value).Replace(' ', '-');

    /// <summary>
    /// Kanonik ayrıştırması OLMAYAN harfleri ASCII karşılığına açar. NFD bunlara
    /// dokunmadığı için burada elle ele alınmazlarsa katlanmış metinde aynen kalırlar
    /// ve "Straße" ile "Strasse", "Gdańsk" ile "Gdansk" ayrı satır sayılır.
    ///
    /// <para>Kiril/Yunan alfabesi BİLİNÇLİ olarak dönüştürülmüyor: o transliterasyondur,
    /// katlama değil. Bulgarca "София" gibi adlar <c>city_alias</c> satırı olarak
    /// giriyor ve kendi alfabesinde aranıyor.</para>
    /// </summary>
    private static string Expand(string source)
    {
        // Hızlı yol: metinde açılacak harf yoksa kopya üretme.
        var needsExpansion = false;
        foreach (var character in source)
        {
            if (!char.IsAscii(character) && Replacement(character) is not null)
            {
                needsExpansion = true;
                break;
            }
        }

        if (!needsExpansion)
        {
            return source;
        }

        var builder = new StringBuilder(source.Length + 4);
        foreach (var character in source)
        {
            var replacement = char.IsAscii(character) ? null : Replacement(character);
            if (replacement is null)
            {
                builder.Append(character);
            }
            else
            {
                builder.Append(replacement);
            }
        }

        return builder.ToString();
    }

    private static string? Replacement(char character) => character switch
    {
        'ı' => "i",                 // U+0131 — Türkçe noktasız i; 'İ' (U+0130) NFD ile çözülüyor
        'ß' or 'ẞ' => "ss",         // Almanca eszett
        'ø' or 'Ø' => "o",          // Danca/Norveççe
        'æ' or 'Æ' => "ae",
        'œ' or 'Œ' => "oe",
        'đ' or 'Đ' => "d",          // Hırvatça/Boşnakça/Sırpça
        'ð' or 'Ð' => "d",          // İzlandaca eth
        'þ' or 'Þ' => "th",         // İzlandaca thorn
        'ł' or 'Ł' => "l",          // Lehçe
        'ħ' or 'Ħ' => "h",          // Maltaca
        'ŀ' or 'Ŀ' => "l",          // Katalanca ela geminada
        _ => null,
    };
}
