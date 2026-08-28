using Expyra.Domain.Languages;

namespace Expyra.Domain.Experiences;

/// <summary>
/// İçerik dili fallback zinciri (docs/I18N.md §2). <b>Saf</b>: veritabanı görmez,
/// girdisi üç şey — istenen dil, ilanın orijinal dili, elde olan diller.
///
/// <para><b>Zincir SUNUCUDA çözülür</b> (PLAN Blok 5 kabul kriteri 2). İstemciye çeviri
/// listesi gönderip orada seçtirmek, her deneyim için tüm dillerin taşınması demek;
/// 24 ilanlık bir sayfada bu, gösterilmeyecek metnin onlarca katını indirtir.</para>
///
/// <para><b>Neden ayrı bir sınıf ve neden Domain'de:</b> zincir bir sunum tercihi değil,
/// ürün kuralı — "host'un yazdığı Türkçe, kimsenin yazmadığı İngilizce'den iyidir".
/// Sorgunun içine gömülseydi (SQL tarafında bir CASE olarak) doğruluğu ancak üretilen
/// SQL okunarak denetlenebilirdi ve yanlışı SESSİZ olurdu: hata fırlatmaz, yalnızca
/// yanlış dilde metin gösterirdi. Burada her adım tek başına test edilebiliyor.</para>
/// </summary>
public static class ExperienceTextFallback
{
    /// <summary>
    /// Zincirin son çaresi (docs/I18N.md §2, adım 4).
    ///
    /// <para><b>Bugün pratikte ULAŞILAMAZ ve bu bilinçli olarak böyle bırakıldı:</b>
    /// yayın kapısı orijinal dilde çeviri satırını şart koşuyor
    /// (<see cref="ExperiencePublishRules"/>), yani 3. adım daima tutuyor. Zincirde
    /// durmasının sebebi savunma: yayın kuralı bir gün gevşerse ya da veri elle
    /// bozulursa metin yine de bir yere düşüyor, boş başlık üretmiyor.</para>
    /// </summary>
    public const string LastResortLanguage = "en";

    /// <summary>
    /// Zincirin sırası: <c>de-AT</c> → <c>de</c> → <c>OriginalLanguage</c> → <c>en</c>.
    ///
    /// <para>3. adım 4'ten ÖNCE geliyor çünkü host'un kendi yazdığı metin, kimsenin
    /// yazmadığı bir dildeki boşluktan iyidir (docs/I18N.md §2).</para>
    ///
    /// <para>Tekrar eden kod bir kez giriyor: istenen dil <c>en</c> ise ya da orijinal
    /// dile eşitse zincir kısalıyor. Tekrarlı bir liste yanlış sonuç vermezdi ama
    /// "kaç dil sorduk" sorusunun cevabını bulanıklaştırır ve çağıran o listeyi
    /// veritabanı filtresi olarak kullanıyor.</para>
    ///
    /// <para>İstenen dil BURADA normalize ediliyor (<c>en_US</c> → <c>en-US</c>):
    /// çağıranın normalize etmeyi unutması, zinciri sessizce ilk adımdan düşürürdü.</para>
    /// </summary>
    /// <param name="requestedLanguage">
    /// Misafirin istediği dil. <c>null</c> ya da geçersiz ise zincir doğrudan orijinal
    /// dilden başlar — istenmemiş bir dil için "eşleşme yok" demek doğru olan.
    /// </param>
    /// <param name="originalLanguage">Host'un ilanı ilk yazdığı dil. Zincirin çıpası.</param>
    public static IReadOnlyList<string> Candidates(string? requestedLanguage, string originalLanguage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(originalLanguage);

        var normalizedRequest = LanguageCode.TryNormalize(requestedLanguage, out var normalized)
            ? normalized
            : null;

        var chain = new List<string>(4);

        // 1) Tam eşleşme.
        Append(chain, normalizedRequest);

        // 2) Bölgesiz kök: de-AT isteyen birine de metni Almanca gelsin.
        Append(chain, normalizedRequest is null ? null : LanguageCode.BaseLanguageOf(normalizedRequest));

        // 3) Host'un kendi dili.
        Append(chain, originalLanguage);

        // 4) Son çare.
        Append(chain, LastResortLanguage);

        return chain;
    }

    /// <summary>
    /// Elde olan diller arasından zincirin kazananını seçer. Hiçbiri yoksa <c>null</c> —
    /// çağıran bunu <b>bozuk satır</b> olarak ele almalı, sessizce boş metne çevirmemeli
    /// (CLAUDE.md #1).
    /// </summary>
    /// <param name="availableLanguages">
    /// Bu deneyimin çeviri satırlarının dilleri. Karşılaştırma ORDINAL: dil kodları
    /// zaten normalize ve kültüre duyarlı karşılaştırma Türkçe kuralda 'i' harfini
    /// bozar (<c>LanguageCode</c> ile aynı tuzak).
    /// </param>
    public static string? Resolve(
        string? requestedLanguage,
        string originalLanguage,
        IReadOnlyCollection<string> availableLanguages)
    {
        ArgumentNullException.ThrowIfNull(availableLanguages);

        foreach (var candidate in Candidates(requestedLanguage, originalLanguage))
        {
            if (availableLanguages.Contains(candidate, StringComparer.Ordinal))
            {
                return candidate;
            }
        }

        return null;
    }

    private static void Append(List<string> chain, string? code)
    {
        if (string.IsNullOrWhiteSpace(code) || chain.Contains(code, StringComparer.Ordinal))
        {
            return;
        }

        chain.Add(code);
    }
}
