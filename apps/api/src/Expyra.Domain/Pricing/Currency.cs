using Expyra.Domain.Common;

namespace Expyra.Domain.Pricing;

/// <summary>
/// Para birimi kayıt defteri (ISO 4217). Kalıp: <see cref="Languages.Language"/>.
/// Sistemde artık koda gömülü para birimi yok — sabit bir ana para birimi de yok
/// (VISION §9): host hangi para biriminde satacağına kendi karar veriyor.
///
/// <para><b>Bu tablonun asıl işi <see cref="MinorUnits"/>.</b> <see cref="Money"/> tutarı
/// minör birimde tam sayı olarak saklıyor ve o sayıyı insana gösterilebilir bir tutara
/// çevirmenin tek yolu bu üs. Kod tarafında sabit 100 varsaymak JPY'yi 100 kat büyük,
/// KWD'yi 10 kat küçük gösterir.</para>
/// </summary>
public sealed class Currency
{
    /// <summary>ISO 4217 alfabetik kod. Doğrulama: <see cref="CurrencyCode"/>.</summary>
    public required string Code { get; set; }

    /// <summary>
    /// İngilizce ad. Yönetim ekranı ve deterministik sıralama için;
    /// gösterim adını arayüz <c>Intl.DisplayNames(locale, { type: 'currency' })</c>
    /// ile kendi dilinde üretiyor (<see cref="Places.Country.EnglishName"/> ile aynı karar).
    /// </summary>
    public required string EnglishName { get; set; }

    /// <summary>
    /// ISO 4217 üssü: JPY ve ISK 0, KWD/BHD/OMR/JOD/TND 3, geri kalanın çoğu 2.
    /// Veritabanında 0-4 aralığı bir CHECK kısıtıyla garanti — bozuk bir satır
    /// para hesabını sessizce 10 kat kaydırır.
    /// </summary>
    public int MinorUnits { get; set; }

    /// <summary>
    /// Kısa sembol ("₺", "Kč", "¥") — <c>null</c> ise kodun kendisi gösterilir.
    /// <b>Biçimlendirme için değil:</b> sembolün yeri, ayraçlar ve negatif gösterimi
    /// locale'e bağlı ve onu <c>Intl.NumberFormat</c> yapıyor (docs/I18N.md §5).
    /// Bu alan, tam biçimlendirmenin sığmadığı dar yüzeyler (fiyat rozeti, seçici
    /// listesi) içindir.
    /// </summary>
    public string? Symbol { get; set; }
}
