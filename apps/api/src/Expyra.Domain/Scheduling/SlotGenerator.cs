namespace Expyra.Domain.Scheduling;

/// <summary>
/// Şablondan seans üretir. <b>Saf</b>: veritabanı görmez, saat okumaz — "şimdi"yi
/// ve blackout listesini çağıran veriyor. Bu yüzden DST davranışı tek başına
/// test edilebiliyor (<c>ExperiencePublishRules</c> ile aynı disiplin).
///
/// <para><b>Atlanan hiçbir şey sessiz değil</b> (CLAUDE.md #1): üretilemeyen her
/// occurrence sebebiyle birlikte <see cref="SlotGenerationReport"/>'a yazılıyor.
/// Host "neden 29 Mart'ta seansım yok" diye sorabilmeli.</para>
/// </summary>
public static class SlotGenerator
{
    /// <summary>
    /// Şablonun ufka kadar üreteceği occurrence'lar.
    /// </summary>
    /// <param name="fromLocalDate">
    /// Taramanın başlangıcı — normalde deneyimin saat dilimindeki BUGÜN. Geçmişe
    /// seans üretilmiyor: kabul kriteri 4 geçmiş seansların misafire dönmemesini
    /// istiyor ve hiç üretmemek, üretip filtrelemekten sağlam.
    /// </param>
    /// <param name="existingLocalStarts">
    /// Zaten var olan seansların yerel başlangıçları. <b>Durumdan bağımsız</b>:
    /// kapatılmış bir seans da burada olmalı, aksi halde tekrar üretim onu
    /// diriltir ve host'un kapattığı gün geri gelir.
    /// </param>
    public static SlotGenerationReport Generate(
        RecurrenceTemplate template,
        TimeZoneInfo zone,
        DateOnly fromLocalDate,
        IReadOnlyCollection<AvailabilityBlackout> blackouts,
        IReadOnlySet<DateTime> existingLocalStarts)
    {
        ArgumentNullException.ThrowIfNull(template);
        ArgumentNullException.ThrowIfNull(zone);
        ArgumentNullException.ThrowIfNull(blackouts);
        ArgumentNullException.ThrowIfNull(existingLocalStarts);

        var created = new List<SlotStart>();
        var skipped = new List<SlotSkip>();

        if (template.Status != RecurrenceStatus.Active)
        {
            return new SlotGenerationReport(created, skipped);
        }

        // Tarama daima şablonun başlangıcından ya da bugünden — hangisi geç ise.
        // Filigran (`schedule_generated_through_local`) burada KULLANILMIYOR: o
        // yalnız bir kısayol ve bozulursa fazladan iş olur, eksik satır olmaz.
        var cursor = Later(fromLocalDate, template.StartsOnLocal);
        var horizon = fromLocalDate.AddDays(RecurrenceTemplate.GenerationHorizonDays);

        if (template.EndsOnLocal is { } ends && ends < horizon)
        {
            horizon = ends;
        }

        // İlk uygun güne atla: gün gün ilerlemek yerine haftalık adım atmak için
        // önce doğru haftanın gününü bulmak gerekiyor.
        cursor = cursor.AddDays(DaysUntil(cursor.DayOfWeek, template.DayOfWeek));

        while (cursor <= horizon)
        {
            Consider(template, zone, cursor, blackouts, existingLocalStarts, created, skipped);
            cursor = cursor.AddDays(7);
        }

        return new SlotGenerationReport(created, skipped);
    }

    private static void Consider(
        RecurrenceTemplate template,
        TimeZoneInfo zone,
        DateOnly localDate,
        IReadOnlyCollection<AvailabilityBlackout> blackouts,
        IReadOnlySet<DateTime> existingLocalStarts,
        List<SlotStart> created,
        List<SlotSkip> skipped)
    {
        var localStart = localDate.ToDateTime(template.StartTimeLocal, DateTimeKind.Unspecified);

        // Var olan satır SESSİZCE geçiliyor: bu bir atlama değil, idempotentlik.
        // Rapora yazılsaydı ikinci çalıştırmada yüzlerce satırlık gürültü çıkardı.
        if (existingLocalStarts.Contains(localStart))
        {
            return;
        }

        foreach (var blackout in blackouts)
        {
            if (blackout.Covers(localDate))
            {
                skipped.Add(new SlotSkip(localStart, SlotSkipReason.Blackout, null));
                return;
            }
        }

        if (!SlotStartResolver.TryResolve(localStart, zone, template.DstOverlap, out var resolved))
        {
            // Yaz saati boşluğu: bu yerel saat o gün hiç yaşanmıyor. Occurrence
            // ATLANIYOR — kaydırmak çarpışma üretebilirdi (bir sonraki saatte
            // zaten bir seans varsa) ve atlama, boşluğun uzunluğu hakkında
            // hiçbir varsayım yapmayan tek politika.
            skipped.Add(new SlotSkip(
                localStart,
                SlotSkipReason.DaylightGap,
                SlotStartResolver.FirstValidLocalAfter(localStart, zone)));

            return;
        }

        created.Add(resolved);
    }

    /// <summary>Bir sonraki (ya da aynı) hedef güne kaç gün var.</summary>
    private static int DaysUntil(DayOfWeek from, DayOfWeek target)
        => ((int)target - (int)from + 7) % 7;

    private static DateOnly Later(DateOnly left, DateOnly right) => left > right ? left : right;
}

/// <param name="Created">
/// Üretilen başlangıçlar. Çağıran bunları satıra çeviriyor — <see cref="SlotGenerator"/>
/// entity kurmuyor çünkü kapasite ve süre deneyimden geliyor, şablondan değil.
/// </param>
/// <param name="Skipped">
/// Üretilemeyenler. Boş olması beklenen normal durum; dolu olması host'a
/// gösterilecek bir bilgi.
/// </param>
public sealed record SlotGenerationReport(
    IReadOnlyList<SlotStart> Created,
    IReadOnlyList<SlotSkip> Skipped);

/// <param name="FirstValidLocal">
/// Yaz saati boşluğunda ilk geçerli yerel saat; diğer sebeplerde <c>null</c>.
/// Host'a "02:30 yok, 03:00'ten başlayabilirsin" diyebilmek için.
/// </param>
public sealed record SlotSkip(DateTime LocalStart, SlotSkipReason Reason, DateTime? FirstValidLocal);

/// <summary>
/// Atlama sebepleri. Sabit string değil enum: bu değer istemciye GİTMİYOR, host
/// raporu sunucuda metne çevriliyor — <c>ExperiencePublishRequirement</c>'ın
/// aksine dolaşımdaki bir sözleşme parçası değil.
/// </summary>
public enum SlotSkipReason
{
    /// <summary>Yerel saat o gün hiç yaşanmıyor (yaz saatine geçiş).</summary>
    DaylightGap = 1,

    /// <summary>Gün bir blackout aralığına düşüyor.</summary>
    Blackout = 2,
}
