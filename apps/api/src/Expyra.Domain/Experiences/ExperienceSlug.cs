using System.Security.Cryptography;
using System.Text;
using Expyra.Domain.Common;

namespace Expyra.Domain.Experiences;

/// <summary>
/// Deneyim slug'ı üretir: <c>&lt;başlıktan-türeyen-gövde&gt;-&lt;kısa-sonek&gt;</c>.
///
/// <para><b>Kültür tuzağı:</b> katlama <see cref="SearchText.Fold"/> üzerinden, yani
/// INVARIANT. Türkçe kültürde <c>"İzmir".ToLower()</c> → <c>"i̇zmir"</c> (i + birleşen
/// nokta) verir ve slug sunucunun kültür ayarına göre değişirdi — hata testte değil,
/// prodüksiyonda çıkardı (<c>LanguageCode</c> ve <c>SearchText</c> ile aynı tuzak).
/// "İzmir Gezisi" burada daima <c>izmir-gezisi-…</c> üretir.</para>
///
/// <para><b>Neden sonek var:</b> "Boğaz turu" adını on host birden koyabilir. Sonek
/// olmasaydı ikinci host ya slug'ını kaybeder ya da <c>-2</c>, <c>-3</c> sayaçları için
/// her yazmada tabloyu taramak gerekirdi. Sonek ayrıca slug'ı TAHMİN EDİLEMEZ yapıyor:
/// başlığı bilen biri, henüz yayınlanmamış bir ilanın URL'ini deneyerek bulamaz.</para>
///
/// <para><b>Benzersizliğin gerçek garantisi bu sınıf DEĞİL</b>, <c>ux_experience_slug</c>
/// tekil index'i. Buradaki sonek + çağıranın aldığı advisory lock, o index'e hiç
/// çarpmamak için var.</para>
/// </summary>
public static class ExperienceSlug
{
    /// <summary>Başlıktan türeyen gövdenin tavanı. Uzun slug URL'de okunmuyor, yalnızca şişiriyor.</summary>
    public const int MaxBaseLength = 60;

    /// <summary>
    /// Sonek uzunluğu. 6 karakter × 31 harflik alfabe ≈ 9×10⁸ olasılık: aynı gövdede
    /// çakışma pratikte imkânsız, çakışsa bile çağıran yeniden deniyor.
    /// </summary>
    public const int SuffixLength = 6;

    /// <summary>
    /// Katlanınca ASCII'de hiçbir şey bırakmayan başlıklar için gövde (ör. yalnız
    /// noktalama, ya da Latin dışı bir alfabe). Türkçe/İngilizce bir kelime seçilmedi:
    /// slug bir arayüz metni değil, kalıcı bir URL kimliği — dil kimliğini URL'in
    /// kendisi (<c>/tr/deneyim/</c> ↔ <c>/en/experience/</c>) taşıyor.
    /// </summary>
    public const string FallbackBase = "experience";

    /// <summary>
    /// Karışan karakterler (0/o, 1/l/i) ÇIKARILDI: slug telefonda okunup elle
    /// yazılabiliyor ve "sıfır mıydı o muydu" sorusu bir destek biletidir.
    /// </summary>
    private const string SuffixAlphabet = "23456789abcdefghjkmnpqrstuvwxyz";

    /// <summary>Tek adımda tam slug. <paramref name="title"/> boşsa gövde <see cref="FallbackBase"/>.</summary>
    public static string New(string? title) => Compose(BaseFrom(title), NewSuffix());

    /// <summary>
    /// Başlıktan gövdeyi çıkarır: aksan düşer, büyük harf iner, harf/rakam dışı tek
    /// tireye döner. <b>Yalnız ASCII kalır</b> — <see cref="SearchText.Fold"/> Kiril ve
    /// CJK harflerini bilinçli olarak koruyor (transliterasyon katlama değildir), ama
    /// slug bir URL parçası: yüzde-kodlanmış bir bağlantı paylaşılabilir olmaktan çıkar.
    /// </summary>
    public static string BaseFrom(string? title)
    {
        var folded = SearchText.Fold(title);
        var builder = new StringBuilder(folded.Length);

        foreach (var character in folded)
        {
            if (char.IsAsciiLetterOrDigit(character))
            {
                builder.Append(character);
            }
            else if (builder.Length > 0 && builder[^1] != '-')
            {
                // Fold zaten noktalamayı tek boşluğa indirmişti; burada ayraca dönüyor.
                // Baştaki ayraç hiç yazılmıyor, ard arda geleni tekrarlanmıyor.
                builder.Append('-');
            }
        }

        Trim(builder);

        if (builder.Length > MaxBaseLength)
        {
            builder.Length = MaxBaseLength;

            // Kelimenin ortasından kesmek anlamsız bir hece bırakır ("istanbul-boga").
            // Son ayraca geri sarıyoruz; geri sarınca hiçbir şey kalmıyorsa sert kesim
            // kalıyor (tek uzun kelime).
            var lastSeparator = builder.ToString().LastIndexOf('-');
            if (lastSeparator > 0)
            {
                builder.Length = lastSeparator;
            }

            Trim(builder);
        }

        return builder.Length == 0 ? FallbackBase : builder.ToString();
    }

    /// <summary>
    /// Kriptografik rastgele sonek. <c>Random</c> DEĞİL: slug tahmin edilebilir olursa
    /// yayınlanmamış bir ilanın URL'i denenerek bulunabilir.
    /// </summary>
    public static string NewSuffix() => RandomNumberGenerator.GetString(SuffixAlphabet, SuffixLength);

    public static string Compose(string baseSlug, string suffix)
        => string.Concat(baseSlug, "-", suffix);

    private static void Trim(StringBuilder builder)
    {
        while (builder.Length > 0 && builder[^1] == '-')
        {
            builder.Length--;
        }
    }
}
