using Expyra.Domain.Common;

namespace Expyra.Domain.Experiences;

/// <summary>
/// Deneyime ait tek bir görsel. <b>Bayt burada değil</b>: satır yalnız depodaki
/// anahtarı ve ölçüleri taşıyor (PLAN Blok 6 kabul kriteri 1).
///
/// <para><b>Neden ölçü kopyalanıyor:</b> <c>next/image</c> düzen kaymasını
/// (CLS) önlemek için genişlik/yüksekliği ÇİZİMDEN ÖNCE ister. Her istekte
/// depodan okumak, sayfa başına onlarca ağ turu demek olurdu.</para>
///
/// <para><b>Neden satır yüklemeden ÖNCE doğuyor:</b> imzalı adres verildiği anda
/// depoda bir nesne belirebilir. Kaydı sonradan açsaydık, yüklemesini yarıda
/// bırakan her host geride sahibi bilinmeyen bir nesne bırakırdı ve onları
/// bulmanın tek yolu tüm kovayı taramak olurdu. <see cref="MediaStatus.Pending"/>
/// satırı, temizliğin veritabanından yürüyebilmesini sağlıyor.</para>
/// </summary>
public sealed class ExperienceMedia : BaseAuditableEntity
{
    /// <summary>Depo anahtarı genişliği — <c>experiences/{32}/{32}.webp</c> ve pay.</summary>
    public const int MaxStorageKeyLength = 200;

    public required Guid ExperienceId { get; set; }

    /// <summary>
    /// Depodaki tam yol. <b>Adres değil anahtar</b>: herkese açık adres her
    /// okunuşta <c>IObjectStorage.PublicUrl</c> ile üretiliyor, aksi halde CDN
    /// alan adı değiştiğinde geçmiş satırların hepsi migration isterdi.
    /// </summary>
    public required string StorageKey { get; set; }

    /// <summary>
    /// <see cref="MediaStatus.Pending"/> iken istemcinin BEYANI, <c>Active</c>
    /// olduğunda baytlardan okunan gerçek tip. İkisi ayrı sütunda tutulmuyor:
    /// beyan, doğrulama bittikten sonra hiçbir işe yaramıyor.
    /// </summary>
    public required string ContentType { get; set; }

    /// <summary>Beyan edilen tavan; <c>Active</c> olunca depodan okunan gerçek boyut.</summary>
    public long ByteSize { get; set; }

    /// <summary>Doğrulama bitene kadar 0 — ölçü ancak bayt yüklendikten sonra bilinir.</summary>
    public int Width { get; set; }

    /// <summary>Doğrulama bitene kadar 0 — bkz. <see cref="Width"/>.</summary>
    public int Height { get; set; }

    /// <summary>
    /// Galerideki sıra. Host sürükleyerek değiştiriyor. Bitişik olması ŞART DEĞİL:
    /// araya ekleme ve silme boşluk bırakabilir, sıralama yalnız karşılaştırma için.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Kartta ve paylaşım önizlemesinde çıkan görsel. Deneyim başına EN FAZLA BİR
    /// tane — kısmi tekil index ile veritabanı düzeyinde zorlanıyor: iki kapak,
    /// listede hangi görselin çıkacağını sorgunun sıralamasına bırakırdı.
    /// </summary>
    public bool IsCover { get; set; }

    public MediaStatus Status { get; set; } = MediaStatus.Pending;
}

/// <summary>
/// Medyanın yaşam döngüsü. <c>ExperienceStatus</c> ile aynı gerekçelerle 1'den
/// başlıyor ve sütunda METİN olarak duruyor.
/// </summary>
public enum MediaStatus
{
    /// <summary>
    /// İmzalı adres verildi, doğrulanmış bayt henüz yok. Bu satır misafire
    /// GÖSTERİLMEZ ve yayın kapısında kapak sayılmaz.
    ///
    /// <para>Uzun süre bu durumda kalan satırlar yetim: host yüklemeyi yarıda
    /// bıraktı ya da hiç başlamadı. Temizliği zamanlayıcı ister; repoda arka plan
    /// işi altyapısı Blok 10'da geliyor, o gelene kadar elle komut
    /// (<c>seed</c> komutuyla aynı kalıp).</para>
    /// </summary>
    Pending = 1,

    /// <summary>
    /// Bayt yüklendi, gerçek biçim ve ölçü okundu, sınırları geçti. Misafire
    /// yalnız bu durumdakiler gösteriliyor.
    /// </summary>
    Active = 2,
}
