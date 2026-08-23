using Expyra.Domain.Common;

namespace Expyra.Domain.Pricing;

/// <summary>
/// Bir deneyimin fiyat sayfası. Deneyim başına EN FAZLA BİR satır
/// (<c>ux_experience_price_experience</c>).
///
/// <para><b>Neden ayrı bir tablo, <c>experience</c>'a iki sütun değil:</b> fiyat
/// kademe başına bir tutar taşıyor (yetişkin/çocuk/bebek) ve bunlar
/// <see cref="PriceRule"/> satırları. Kademeleri sütun olarak açmak
/// (<c>adult_amount</c>, <c>child_amount</c>…) her yeni kademede migration
/// isterdi ve para birimi altı sütunda tekrarlanırdı.</para>
///
/// <para><b>Para birimi burada, kademede değil.</b> Bir ilanın tüm kademeleri aynı
/// para biriminde olmak ZORUNDA — "yetişkin 50 EUR, çocuk 300 TRY" anlamsız.
/// Kademelerde tekrarlansaydı bu kural kodla korunurdu; burada tek satır olduğu
/// için ihlal edilemiyor.</para>
/// </summary>
public sealed class ExperiencePrice : BaseAuditableEntity
{
    public required Guid ExperienceId { get; set; }

    /// <summary>
    /// Tahsilat para birimi (ISO 4217). <b>İlk yayından sonra DEĞİŞMEZ</b> —
    /// <c>Experience.CityId</c> ile aynı aile: dışarı çıkmış bir ilanın para
    /// birimini değiştirmek, Blok 9'un donduracağı tutarlarla çelişir ve
    /// yayınlanmış bir fiyatın anlamını geriye dönük değiştirir.
    ///
    /// <para>Misafirin gördüğü para birimi bundan farklı olabilir (kur çevrimi),
    /// ama tahsilat DAİMA bu (VISION §9). Çevrilen tutar hiçbir yerde tahsilata
    /// girmiyor — kabul kriteri 3.</para>
    /// </summary>
    public required string CurrencyCode { get; set; }
}

/// <summary>
/// Bir kademenin kişi başı fiyatı.
///
/// <para><b>Tarih aralığı YOK</b> ve bu bilinçli bir kapsam kararı: PLAN'ın beş
/// kabul kriterinin hiçbiri mevsimsel fiyat istemiyor. Eklenirse
/// <c>effective_from</c> sütunu ve bir çözümleyici gerekir; o gün geldiğinde
/// mevcut satırlar "temel kural" (sınırsız) olarak kalır, yani bugünkü model
/// ileriye dönük bir engel değil.</para>
/// </summary>
public sealed class PriceRule : BaseAuditableEntity
{
    public required Guid ExperiencePriceId { get; set; }

    public required GuestType GuestType { get; set; }

    /// <summary>
    /// Kişi başı tutar. <see cref="Money"/> owned type olarak İKİ sütuna açılıyor
    /// (<c>unit_amount_minor</c> + <c>unit_currency_code</c>) — sınıf notundaki
    /// talimat. Para birimi sayfa başlığında da var ve ikisi aynı olmak zorunda;
    /// buradaki kopya, EF'in owned type sözleşmesinin gereği.
    /// </summary>
    public required Money UnitPrice { get; set; }
}

/// <summary>
/// Misafir kademesi. Sabit değil enum: değer tel üzerinde METİN olarak gidiyor
/// (<c>"adult"</c>) ve karşılığı arayüz sözlüğünde — sayı gitseydi sıra
/// değiştiğinde eski istemciler başka bir kademe okurdu.
/// </summary>
public enum GuestType
{
    Adult = 1,
    Child = 2,

    /// <summary>
    /// 0-2 yaş. Koltuk tüketip tüketmediği DENEYİME bağlı
    /// (<c>Experience.InfantCountsTowardCapacity</c>): teknede her baş sayılır,
    /// yürüyüş turunda kucaktaki bebek saymayabilir. Karar host'un çünkü fiziksel
    /// sınırı bilen o.
    /// </summary>
    Infant = 3,
}

/// <summary>
/// Fiyatlandırmanın sabitleri. <c>MediaRules</c> ile aynı kalıp: tek kaynak,
/// hem doğrulayıcı hem veritabanı kısıtı buradan okuyor.
/// </summary>
public static class PricingRules
{
    /// <summary>
    /// Kişi başı tutar tavanı (minör birim). <b>Ürün kapısı değil taşma korkuluğu.</b>
    ///
    /// <para>Düşük bir tavan (ör. 10⁸) IDR, COP, VND gibi para birimlerinde gerçek
    /// fiyatları reddederdi — IDR'de 10⁸ minör birim yaklaşık 60 USD eder. 10¹²
    /// seçildi: <c>MaxCapacity</c> (500) ile çarpımı 5·10¹⁴ ve bu hâlâ 2⁵³'ün
    /// altında, yani her tahsilat tutarı JSON'da kayıpsız taşınıyor.</para>
    /// </summary>
    public const long MaxUnitAmountMinor = 1_000_000_000_000L;

    /// <summary>
    /// Tek rezervasyondaki en fazla kişi. <c>Experience.MaxCapacity</c> ile aynı
    /// tavan: bir seansa sığmayan bir grup için fiyat sorusu anlamsız.
    /// </summary>
    public const int MaxPartySize = 500;
}
