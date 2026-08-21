using Expyra.Domain.Common;

namespace Expyra.Domain.Experiences;

/// <summary>
/// Host'un yayınladığı deneyim. <b>Bu tabloda başlık ve açıklama YOK</b> — onlar
/// <see cref="ExperienceTranslation"/> satırlarında yaşıyor (docs/I18N.md §2).
///
/// <para><b>Neden hiç title/description sütunu açılmadı</b> (PLAN Blok 5'in en sert
/// uyarısı): ROADMAP 2.2 (başlık/açıklama) 2.3'ten (çok dillilik) önce listeli. Önce
/// tek dilli sütun açılıp sonra çeviri tablosuna taşınsaydı, ikinci adım canlı veri
/// migration'ına dönerdi. İkisi TEK migration'da doğuyor; tek dilli bir ara durum hiç
/// var olmuyor.</para>
///
/// <para><b>Navigation property YOK</b> (<c>UserConfiguration</c> kararı): çeviri,
/// konuşulan dil ve etiket satırlarına açık join ile gidilir. Kazara eager/lazy
/// yükleme sürprizi olmuyor ve her sorgunun maliyeti okunduğu yerde görünüyor.</para>
/// </summary>
public sealed class Experience : BaseAuditableEntity
{
    /// <summary>
    /// <c>slug</c> sütun genişliği. Üretilen slug <see cref="ExperienceSlug.MaxBaseLength"/>
    /// + ayraç + sonek kadar; kalan pay elle düzeltmeler için.
    /// </summary>
    public const int MaxSlugLength = 80;

    /// <summary>
    /// Kapasite tavanı. Fiziksel bir sınır değil, ilan kalitesi kapısı: dört haneli
    /// kapasite yazan bir "yerel deneyim" neredeyse her zaman yazım hatasıdır.
    /// Tek kaynak — hem doğrulayıcı hem de bu sabit üzerinden konuşuluyor.
    /// </summary>
    public const int MaxCapacity = 500;

    /// <summary>
    /// Süre tavanı: 7 gün. Daha uzunu bir "deneyim" değil seyahat programıdır ve
    /// Blok 7'nin seans takvimi onu doğru modelleyemez.
    /// </summary>
    public const int MaxDurationMinutes = 7 * 24 * 60;

    /// <summary>
    /// Sahibi. <c>app_user.id</c>'ye FK. İstemciden ASLA alınmaz
    /// (CLAUDE.md #3) — <c>ICurrentUser.RequireHostId()</c> yazar.
    /// </summary>
    public required Guid HostId { get; set; }

    /// <summary>
    /// Şehir. <b>Taslakta null olabilir</b>: yayınlama doğrulamasının "şehir yok" dalı
    /// (PLAN kabul kriteri 1) ancak sütun nullable ise gerçekten yaşanabilir. Sütun
    /// zorunlu yapılsaydı o kural hiç çalışmayan bir kod olurdu.
    ///
    /// <para>İlk yayından SONRA değişmez — gerekçe <see cref="PublishedAtUtc"/>'de.</para>
    /// </summary>
    public Guid? CityId { get; set; }

    /// <summary><c>category.slug</c>'a FK. Taslakta null — bkz. <see cref="CityId"/>.</summary>
    public string? CategorySlug { get; set; }

    /// <summary>
    /// IANA saat dilimi. <b>Şehirden TÜREYEN, istemciden alınmayan bir alan</b>: gezginin
    /// tarayıcı saati Prag'daki bir turun saatini tanımlayamaz.
    ///
    /// <para><b>Neden şehirden join ile okunmuyor da kopyalanıyor:</b> Blok 7'nin seansları
    /// bu saat diliminde çözülecek. <c>city.time_zone_id</c> bir gün düzeltilirse (sınır
    /// değişikliği, IANA birleşmesi) join'li model geçmişteki seansların saatini sessizce
    /// kaydırırdı. Kopya, deneyimin saatini yayınlandığı anda dondurur.</para>
    ///
    /// <para>Değişmez eşlik kuralı: şehir null ise burası da null
    /// (<c>ck_experience_time_zone_requires_city</c>).</para>
    /// </summary>
    public string? TimeZoneId { get; set; }

    /// <summary>
    /// Dakika. Taslakta 0 = "henüz girilmedi".
    ///
    /// <para><b>Yayın koşulu DEĞİL</b> ve bu bilinçli: PLAN Blok 5 kabul kriteri 1
    /// yayın kapısını dört koşulla tanımlıyor ve süre onlardan biri değil. Kapıya
    /// beşinci bir kural eklemek, PLAN'ın kapattığı kapsamı sessizce genişletirdi.
    /// Süre bunun yerine YAZILDIĞI yerde doğrulanıyor: <c>UpdateExperienceCommandValidator</c>
    /// 0 ve negatifi reddediyor, yani alanı bir kez dolduran host bir daha boşaltamıyor.</para>
    /// </summary>
    public int DurationMinutes { get; set; }

    /// <summary>
    /// Bir seansa kaç kişi alınır. Blok 7'de rezervasyonla düşülecek olan sayaç DEĞİL —
    /// bu, deneyimin tanımındaki tavan. Yayın koşulu: 0'dan büyük (PLAN kabul kriteri 1).
    /// </summary>
    public int Capacity { get; set; }

    /// <summary>
    /// Host'un ilanı İLK yazdığı dil. Fallback zincirinin üçüncü adımı ve slug'ın kaynağı
    /// (docs/I18N.md §2).
    ///
    /// <para><b>Değişmez.</b> Değiştirilebilseydi zorunlu çeviri satırı bir anda başka bir
    /// dile kayar, yayınlanmış bir ilan doğrulamayı ihlal eder hâle gelirdi; slug da
    /// artık var olmayan bir başlıktan türemiş olurdu.</para>
    /// </summary>
    public required string OriginalLanguage { get; set; }

    public ExperienceStatus Status { get; set; } = ExperienceStatus.Draft;

    /// <summary>
    /// URL'deki kalıcı kimlik. <b>Dile göre DEĞİŞMEZ</b>: tek slug tüm dillerde geçerli —
    /// aksi halde <c>/tr/deneyim/...</c> ile <c>/en/experience/...</c> farklı kaynaklara
    /// işaret eder ve hreflang halkası (Blok 5b) kurulamazdı.
    ///
    /// <para><see cref="OriginalLanguage"/> başlığı ilk yazıldığında bir kez üretilir ve
    /// başlık sonradan düzeltilse bile DEĞİŞMEZ: yayınlanmış bir URL'in altını oymak,
    /// paylaşılmış her bağlantıyı kırar.</para>
    ///
    /// <para>Başlık yazılana kadar null. Yayın doğrulaması zaten o çeviri satırını şart
    /// koştuğu için yayınlanmış bir deneyimin slug'ı daima dolu.</para>
    /// </summary>
    public string? Slug { get; set; }

    /// <summary>
    /// İLK yayınlanma anı. Arşivlenince temizlenmez; "bu ilan bir kez dışarı çıktı" bilgisi
    /// kalıcıdır ve iki şeye yarar:
    /// <list type="bullet">
    /// <item>Şehir bundan sonra kilitlenir — dışarı çıkmış bir ilan başka şehre taşınırsa
    /// hem saat dilimi hem de (Blok 7'den sonra) mevcut rezervasyonların yeri değişir.</item>
    /// <item>Blok 5b'nin "yeni eklenenler" sıralaması taslak yaşını değil yayın yaşını
    /// kullanır.</item>
    /// </list>
    /// </summary>
    public DateTimeOffset? PublishedAtUtc { get; set; }
}

/// <summary>
/// İlan yaşam döngüsü. <b>0'dan başlatılmıyor</b>: EF, CLR varsayılanına eşit değeri
/// INSERT'e koymaz (<c>UserStatus</c> ile aynı gerekçe). Sütunda METİN olarak duruyor —
/// psql'de okunabilir ve enum yeniden sıralanırsa eski satırlar başka anlama gelmez.
/// </summary>
public enum ExperienceStatus
{
    /// <summary>Yalnız sahibi görür. Misafir için 404 (PLAN kabul kriteri 3).</summary>
    Draft = 1,

    /// <summary>Yayında.</summary>
    Published = 2,

    /// <summary>
    /// Host tarafından raftan indirildi. <b>Silme değil</b> ve geri dönüşü var: yeniden
    /// yayınlanabilir. Arşivi tek yön yapmak, host'u "yazın kapalıyım" demek için ilanı
    /// yeniden yazmaya zorlardı.
    /// </summary>
    Archived = 3,
}
