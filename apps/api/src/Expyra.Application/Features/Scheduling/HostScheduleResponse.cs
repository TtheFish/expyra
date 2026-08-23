using System.Globalization;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling;

/// <summary>
/// Üretim raporu. Host'a "kaç seans açıldı, neyi atladık" diyor.
///
/// <para><b>Atlananlar gizlenmiyor.</b> Yaz saati boşluğuna denk gelen bir
/// occurrence sessizce yok sayılsaydı host takviminde açıklanamayan bir delik
/// görürdü ve sebebini bulmasının yolu olmazdı.</para>
/// </summary>
public sealed record ScheduleGenerationResponse(
    int CreatedSlotCount,
    IReadOnlyList<SkippedOccurrenceResponse> Skipped);

/// <param name="Reason">
/// <c>"dst-gap"</c> | <c>"blackout"</c> — METİN, sayı değil. Arayüz sözlüğünde bir
/// anahtara eşleniyor (<c>ExperiencePublishRequirement</c> ile aynı gerekçe).
/// </param>
/// <param name="FirstValidLocal">
/// Yaz saati boşluğunda ilk geçerli yerel saat: "02:30 yok, 03:00'ten
/// başlayabilirsin". Diğer sebeplerde <c>null</c>.
/// </param>
public sealed record SkippedOccurrenceResponse(
    string LocalStart,
    string Reason,
    string? FirstValidLocal);

public sealed record RecurrenceResponse(
    Guid Id,
    string DayOfWeek,
    string StartTimeLocal,
    string StartsOnLocal,
    string? EndsOnLocal,
    string DstOverlap,
    string Status);

public sealed record BlackoutResponse(
    Guid Id,
    string StartsOnLocal,
    string EndsOnLocal,
    string? Note);

/// <param name="EndsAtUtc">
/// Türetilmiş: <c>StartsAtUtc + DurationMinutes</c>. Sunucuda hesaplanıyor çünkü
/// süre seansa kopyalanmış durumda ve istemcinin aynı toplamayı üç ayrı ekranda
/// tekrarlaması, birinde unutulması demekti.
/// </param>
public sealed record SlotResponse(
    Guid SlotId,
    DateTimeOffset StartsAtUtc,
    string StartsAtLocal,
    short UtcOffsetMinutes,
    DateTimeOffset EndsAtUtc,
    int DurationMinutes,
    int Capacity,
    int RemainingCapacity,
    string Status,
    string? ClosedReason,
    Guid? RecurrenceTemplateId);

/// <summary>
/// Host takvim ekranının TEK çağrısı: şablonlar, blackout'lar ve seanslar birlikte.
/// Üç ayrı uç olsaydı ay görünümü üç istek atardı ve aralarında tutarsız bir an
/// olurdu.
/// </summary>
public sealed record HostScheduleResponse(
    string TimeZoneId,
    int DurationMinutes,
    int Capacity,
    string From,
    string To,
    string? GeneratedThroughLocalDate,
    IReadOnlyList<string> MissingScheduleRequirements,
    IReadOnlyList<RecurrenceResponse> Recurrences,
    IReadOnlyList<BlackoutResponse> Blackouts,
    IReadOnlyList<SlotResponse> Slots);

/// <summary>
/// Tarih ve saatin tel üzerindeki biçimi. <b>Tek yerde</b>: üç ayrı yanıt tipinde
/// üç ayrı <c>ToString</c> çağrısı olsaydı biri bir gün kültüre duyarlı hâle gelir
/// ve Türkçe sunucuda "01.03.2026" üretirdi.
/// </summary>
internal static class ScheduleFormat
{
    /// <summary>ISO 8601 tarih: <c>2026-03-01</c>. Değişmez kültür — bkz. sınıf notu.</summary>
    internal static string Date(DateOnly value)
        => value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    /// <summary>
    /// Saat dilimi EKİ OLMADAN yerel damga: <c>2026-03-01T14:00</c>. Sonda <c>Z</c>
    /// ya da offset YOK ve bu bilinçli — bu bir duvar saati, kesin bir an değil;
    /// offset yazmak onu yanlışlıkla mutlak bir zamana çevirirdi.
    /// </summary>
    internal static string LocalStamp(DateTime value)
        => value.ToString("yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture);

    internal static string Time(TimeOnly value)
        => value.ToString("HH:mm", CultureInfo.InvariantCulture);

    /// <summary>
    /// Gün adı: <c>"tuesday"</c>. Sayı GİTMİYOR — .NET'te 0 = Pazar ama ISO 8601'de
    /// 1 = Pazartesi ve istemcinin hangisini varsaydığı görünmez bir hata kaynağı.
    /// </summary>
    internal static string Day(DayOfWeek value) => Name(value);

    /// <summary>
    /// Enum'un tel üzerindeki adı: <c>"open"</c>, <c>"blackout"</c>, <c>"tuesday"</c>.
    ///
    /// <para><c>Program.cs</c>'teki <c>JsonStringEnumConverter</c> ile AYNI düzen
    /// (camelCase). Bu yanıtlar enum'u elle metne çeviriyor — biri PascalCase üretse
    /// istemci aynı sözleşmede iki eşleme tablosu tutmak zorunda kalırdı.</para>
    ///
    /// <para>Buradaki değerlerin hepsi tek kelime, yani camelCase ile küçük harf
    /// aynı şey. Çok kelimeli bir enum eklenirse bu metot da naming policy'ye
    /// devredilmeli.</para>
    /// </summary>
    private static string Name<TEnum>(TEnum value)
        where TEnum : struct, Enum
        => value.ToString().ToLowerInvariant();

    internal static string SkipReason(SlotSkipReason reason) => reason switch
    {
        SlotSkipReason.DaylightGap => "dst-gap",
        SlotSkipReason.Blackout => "blackout",
        _ => throw new ArgumentOutOfRangeException(nameof(reason)),
    };

    internal static ScheduleGenerationResponse Report(SlotGenerationSummary summary)
        => new(
            summary.Created,
            summary.Skipped
                .Select(x => new SkippedOccurrenceResponse(
                    LocalStamp(x.LocalStart),
                    SkipReason(x.Reason),
                    x.FirstValidLocal is { } valid ? LocalStamp(valid) : null))
                .ToList());

    internal static RecurrenceResponse Recurrence(RecurrenceTemplate template)
        => new(
            template.Id,
            Day(template.DayOfWeek),
            Time(template.StartTimeLocal),
            Date(template.StartsOnLocal),
            template.EndsOnLocal is { } ends ? Date(ends) : null,
            Name(template.DstOverlap),
            Name(template.Status));

    internal static BlackoutResponse Blackout(AvailabilityBlackout blackout)
        => new(
            blackout.Id,
            Date(blackout.StartsOnLocal),
            Date(blackout.EndsOnLocal),
            blackout.Note);

    internal static SlotResponse Slot(AvailabilitySlot slot)
        => new(
            slot.Id,
            slot.StartsAtUtc,
            LocalStamp(slot.StartsAtLocal),
            slot.UtcOffsetMinutes,
            slot.StartsAtUtc.AddMinutes(slot.DurationMinutes),
            slot.DurationMinutes,
            slot.Capacity,
            slot.RemainingCapacity,
            Name(slot.Status),
            slot.ClosedReason is { } reason ? Name(reason) : null,
            slot.RecurrenceTemplateId);
}
