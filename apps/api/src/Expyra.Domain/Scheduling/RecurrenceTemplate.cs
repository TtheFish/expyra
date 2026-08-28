using Expyra.Domain.Common;

namespace Expyra.Domain.Scheduling;

/// <summary>
/// Haftalık kural: "her salı 14:00". Bir satır = bir gün + bir saat.
///
/// <para><b>Neden aralık değil tek saat:</b> host "salı 10:00 ve salı 16:00"
/// isteyebiliyor ve bunu tek satırda ifade etmek ya bir saat listesi sütunu
/// (Postgres dizisi, index'lenemez, tekillik kurulamaz) ya da ayrı bir tablo
/// gerektirirdi. İki satır yazmak hem daha basit hem de tekilliği
/// <c>ux_recurrence_template_active</c> ile veritabanına bağlıyor.</para>
/// </summary>
public sealed class RecurrenceTemplate : BaseAuditableEntity
{
    /// <summary>
    /// Üretimin en fazla ne kadar ileri gideceği. Kabul kriteri "8 hafta" diyor ama
    /// 56 gün seçilemez: misafirin görebildiği pencere 62 güne kadar çıkıyor ve
    /// ufkun altında kalan bir üretim, "o gün seans yok" ile "o gün henüz
    /// üretilmedi" arasındaki farkı görünmez yapardı.
    /// </summary>
    public const int GenerationHorizonDays = 180;

    public required Guid ExperienceId { get; set; }

    /// <summary>
    /// .NET <see cref="System.DayOfWeek"/> numaralandırması — <b>0 = Pazar</b>.
    /// Sayı olarak saklanıyor: metin alfabetik sıralanır ("cuma" &lt; "pazartesi")
    /// ve platform enum'u donmuş durumda. Tel üzerinde DAİMA metin
    /// (<c>"tuesday"</c>), çünkü istemcinin sayı sırasını bilmesi gerekmez.
    /// </summary>
    public required DayOfWeek DayOfWeek { get; set; }

    /// <summary>
    /// Deneyimin saat dilimindeki duvar saati. <b>Kabul kriteri 1'in tamamı bu
    /// sütunda:</b> saklanan şey yerel saat olduğu için DST geçtiğinde üretilen
    /// UTC anı kayıyor, host'un yazdığı saat kaymıyor.
    /// </summary>
    public required TimeOnly StartTimeLocal { get; set; }

    public required DateOnly StartsOnLocal { get; set; }

    /// <summary>Bitiş günü DAHİL. <c>null</c> = süresiz.</summary>
    public DateOnly? EndsOnLocal { get; set; }

    /// <summary>
    /// Yılda bir kez iki kez yaşanan saatte hangi tekrar. Şablonda saklanıyor
    /// çünkü karar host'un: sabah 02:30 turu yapan biri için hangi tekrarın doğru
    /// olduğunu sunucu bilemez.
    /// </summary>
    public DstOverlap DstOverlap { get; set; } = DstOverlap.First;

    /// <summary>
    /// Durdurulmuş şablon SİLİNMİYOR: ürettiği seansların <c>recurrence_template_id</c>
    /// alanı hâlâ ona işaret ediyor ve o bağ "bu seans nereden geldi" sorusunun tek
    /// cevabı. Silinseydi FK ya kırılır ya da seansları da silerdi.
    /// </summary>
    public RecurrenceStatus Status { get; set; } = RecurrenceStatus.Active;
}

public enum RecurrenceStatus
{
    Active = 1,
    Stopped = 2,
}
