using Expyra.Domain.Common;

namespace Expyra.Domain.Pricing;

/// <summary>
/// Bir ANIN tüm kurları. Kur bir tutar değil ORAN olduğu için burada
/// <c>numeric</c> kullanılıyor ve bu kabul kriteri 2'nin ("her tutar
/// <c>(AmountMinor, CurrencyCode)</c>") ihlali DEĞİL — kriter TUTARLARI bağlıyor.
/// Bu cümle burada duruyor çünkü aksi halde biri "decimal kalmış" diye düzeltmeye
/// kalkar.
///
/// <para><b>Neden anlık görüntü, tek tek kur satırı değil:</b> bir teklif
/// hesaplanırken kullanılan tüm kurlar AYNI ana ait olmalı. Satır satır "en yeni
/// kuru" okuyan bir model, yenileme sırasında yarısı eski yarısı yeni bir sepet
/// üretebilirdi. Blok 9 rezervasyona <c>snapshot_id</c> yazacak: "o an hangi
/// kurları gösterdik" sorusunun cevabı tek bir kimlik.</para>
///
/// <para><b>Gösterim içindir.</b> Tahsilat daima host'un para biriminde (VISION §9)
/// ve çevrilen tutar hiçbir yerde tahsilata girmiyor (kabul kriteri 3).</para>
/// </summary>
public sealed class ExchangeRateSnapshot : BaseEntity
{
    /// <summary>
    /// Tüm oranların ölçüldüğü para birimi. Pivot'un kendi satırı da
    /// <c>1</c> oranıyla yazılıyor — çözücüde "kaynak pivot mu" diye bir dal
    /// olmasın diye.
    /// </summary>
    public required string PivotCurrencyCode { get; set; }

    /// <summary>
    /// Kurun ölçüldüğü an. <b>Gelecek tarihli olamaz</b> ve bu yazma yolunda
    /// kontrol ediliyor, CHECK ile değil: <c>now()</c> Postgres'te STABLE, yani
    /// CHECK içinde kullanılamıyor. Gelecek damgalı bir snapshot asla bayatlamaz
    /// ve sonraki tüm gerçek çekimleri kalıcı olarak gölgelerdi.
    /// </summary>
    public required DateTimeOffset CapturedAtUtc { get; set; }

    public required ExchangeRateSource Source { get; set; }

    public required DateTimeOffset CreatedAtUtc { get; set; }
}

/// <summary>
/// Bir anlık görüntünün tek satırı.
///
/// <para><b>Bileşik birincil anahtar</b> (<c>snapshot_id</c> + <c>currency_code</c>)
/// ve bu güvenli: tablo yalnız ekleniyor, hiçbir satırı güncellenmiyor ya da
/// kilitlenmiyor. <c>AppDbContext.FindForUpdateAsync</c> bu tiple ÇALIŞMAZ —
/// tek sütunlu anahtar istiyor. Kilit gerektiren bir ihtiyaç doğarsa önce anahtar
/// değişmeli.</para>
/// </summary>
public sealed class ExchangeRate
{
    public required Guid SnapshotId { get; set; }

    public required string CurrencyCode { get; set; }

    /// <summary>
    /// "1 ana birim pivot = bu kadar ana birim <see cref="CurrencyCode"/>".
    /// Ana birim üzerinden, minör birim değil: kur bir orandır ve para biriminin
    /// üssünden bağımsızdır. Üs dönüşümü <c>Money.ConvertTo</c>'nun işi ve o,
    /// kaynak ile hedefin üssünü AYRI AYRI istiyor.
    /// </summary>
    public required decimal RatePerPivot { get; set; }
}

/// <summary>Kurun nereden geldiği. Metin olarak saklanıyor (repo enum kuralı).</summary>
public enum ExchangeRateSource
{
    /// <summary>Seed verisi — geliştirme ve test için sabit kurlar.</summary>
    Seed = 1,

    /// <summary>Elle girilmiş. Gerçek sağlayıcı gelene kadarki kaçış yolu.</summary>
    Manual = 2,

    /// <summary>Kur servisinden çekilmiş. Sağlayıcı Faz 7'de.</summary>
    Provider = 3,
}
