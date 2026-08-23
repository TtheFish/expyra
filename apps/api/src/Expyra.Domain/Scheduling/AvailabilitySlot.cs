using Expyra.Domain.Common;

namespace Expyra.Domain.Scheduling;

/// <summary>
/// Misafirin seçebileceği tek bir seans. <b>Blok 9'un kilitleyeceği satır bu.</b>
///
/// <para><b>Neden materyalize ediliyor</b> (şablondan okuma anında üretmek yerine):
/// rezervasyon <c>SELECT ... FOR UPDATE</c> ile bir satırı kilitleyecek ve okuma
/// anında üretilen bir seansın kilitlenecek satırı yoktur. Aynı sebeple birincil
/// anahtar TEK SÜTUNLU <c>Guid</c> — <c>AppDbContext.FindForUpdateAsync</c> bileşik
/// anahtarda <c>InvalidOperationException</c> atıyor.</para>
///
/// <para><b>Süre ve kapasite deneyimden KOPYALANIYOR.</b> Join ile okunsaydı host
/// yarın kapasiteyi 8'den 4'e indirdiğinde geçmiş ve rezervasyonlu seanslar da
/// sessizce küçülürdü — satılmış koltuklar kaybolurdu. Kopya, seansın koşullarını
/// üretildiği anda donduruyor (<c>Experience.TimeZoneId</c> ile aynı gerekçe).</para>
/// </summary>
public sealed class AvailabilitySlot : BaseAuditableEntity
{
    public required Guid ExperienceId { get; set; }

    /// <summary>
    /// Bu seansı üreten şablon; elle eklendiyse <c>null</c>. Ayrı bir "kaynak"
    /// sütunu YOK — kimliğin varlığı zaten cevabı veriyor ve iki alan bir gün
    /// birbiriyle çelişirdi.
    /// </summary>
    public Guid? RecurrenceTemplateId { get; set; }

    /// <summary>Otorite an. Sıralama, filtreleme ve "geçmiş mi" sorusu bunun üstünde.</summary>
    public required DateTimeOffset StartsAtUtc { get; set; }

    /// <summary>
    /// Deneyimin saat dilimindeki duvar saati. <b>Türetilmiş değil saklanan:</b>
    /// host takvimi yerel saate göre çiziyor ve her satır için saat dilimi
    /// dönüşümü yapmak, ay görünümünde otuz kez <c>TimeZoneInfo</c> çağırmak
    /// demekti. <see cref="DateTimeKind.Unspecified"/> — <c>timestamp without
    /// time zone</c> sütununa yazılıyor.
    /// </summary>
    public required DateTime StartsAtLocal { get; set; }

    /// <summary>
    /// O andaki UTC farkı, dakika. Misafir yanıtı bunu gösteriyor ve
    /// <c>timestamp − timestamptz</c> çıkarması EF/Npgsql'de temiz ifade
    /// edilemiyor; türetilebilir olması saklanmamasını gerektirmiyor.
    /// </summary>
    public required short UtcOffsetMinutes { get; set; }

    /// <summary>Deneyimden kopya — bkz. sınıf notu.</summary>
    public required int DurationMinutes { get; set; }

    /// <summary>Deneyimden kopya — bkz. sınıf notu.</summary>
    public required int Capacity { get; set; }

    /// <summary>
    /// Kalan koltuk. <b>Bu blokta yalnız OKUNUR</b> (PLAN Blok 7 kabul kriteri 5):
    /// oluşturmada <c>= Capacity</c> yazılıyor ve azaltan tek bir yol yok. Düşüm
    /// Blok 9'da, satır kilidi altında.
    ///
    /// <para><b>Tek istisna</b> ve neden istisna sayılmadığı: kapalı bir seans
    /// yeniden açılırken (<c>CreateSlotCommand</c>) bu alan yeni kapasiteyle
    /// yeniden kuruluyor. O yol, satırda koltuk satılmışsa <b>409 veriyor</b>, yani
    /// atama yalnız <c>RemainingCapacity == Capacity</c> iken çalışıyor — canlı bir
    /// sayacı değiştirmiyor. Kontrol kaldırılırsa satılmış koltuk sessizce geri
    /// gelir ve aynı yer ikinci kez satılır.</para>
    ///
    /// <para>Denormalize tutuluyor, <c>booking</c> sayımından hesaplanmıyor: Blok 9
    /// bu satırı zaten kilitleyecek ve kilit altındaki bir sayaç, her okumada
    /// COUNT çalıştırmaktan hem ucuz hem de yarışa kapalı.</para>
    /// </summary>
    public required int RemainingCapacity { get; set; }

    public SlotStatus Status { get; set; } = SlotStatus.Open;

    /// <summary>
    /// Neden kapatıldı. Blackout kaldırılınca hangi satırların yeniden açılacağını
    /// bu ayırıyor: host'un elle kapattığı bir seans, blackout geri alındı diye
    /// açılmamalı.
    /// </summary>
    public SlotClosedReason? ClosedReason { get; set; }

    /// <summary>
    /// Kapatılma anı. <c>UpdatedAtUtc</c> yetmiyor: o her düzenlemede kirleniyor,
    /// oysa Blok 13'ün iade politikası "başlangıçtan kaç saat önce iptal edildi"
    /// diye soracak.
    /// </summary>
    public DateTimeOffset? ClosedAtUtc { get; set; }
}

/// <summary>
/// Seansın durumu. Silme YOK: kapatılan seans mezar taşı olarak kalıyor, aksi
/// halde şablon bir sonraki üretimde onu diriltirdi.
/// </summary>
public enum SlotStatus
{
    Open = 1,
    Closed = 2,
}

/// <summary>Kapatma sebebi — geri alma davranışını bu belirliyor.</summary>
public enum SlotClosedReason
{
    /// <summary>Host tek tek kapattı. Blackout kaldırılsa bile açılmaz.</summary>
    Host = 1,

    /// <summary>Bir blackout aralığına düştü. Aralık kalkarsa yeniden açılır.</summary>
    Blackout = 2,

    /// <summary>Şablon durduruldu ya da kuralı değişti.</summary>
    Template = 3,
}
