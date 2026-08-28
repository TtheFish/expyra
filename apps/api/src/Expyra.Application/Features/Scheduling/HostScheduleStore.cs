using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling;

/// <summary>
/// Takvim komutlarının ortak parçaları. <c>HostExperienceStore</c> ile aynı rol:
/// tekrar etmemek için değil, <b>kararların ayrışmasını engellemek</b> için — ön
/// koşul kontrolü ve seans üretimi altı ayrı komuttan çağrılıyor ve birinde
/// unutulan bir kural sessiz bir davranış farkı üretirdi.
/// </summary>
internal static class HostScheduleStore
{
    /// <summary>
    /// Deneyimin saat dilimi. <b>Ön koşul kontrolünden SONRA çağrılmalı</b> —
    /// <c>TimeZoneId</c> null ise bu metot patlıyor, çünkü buraya gelinmiş olması
    /// zaten bir hata demek.
    /// </summary>
    internal static TimeZoneInfo ResolveZone(Experience experience)
    {
        var id = experience.TimeZoneId
            ?? throw new InvalidOperationException(
                $"Deneyim {experience.Id} saat dilimi olmadan takvim akışına girdi; " +
                "ön koşul kontrolü atlanmış.");

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException exception)
        {
            // Şehir seeder'ı her satırı TryFindSystemTimeZoneById ile doğruluyor,
            // yani buraya düşmek işletim sisteminin saat dilimi verisinin eksik
            // olduğu anlamına gelir. Sessizce UTC'ye düşmek, seansları saatlerce
            // kaydırırdı (CLAUDE.md #1).
            throw new InvalidOperationException(
                $"'{id}' saat dilimi bu makinede çözülemedi; IANA verisi eksik olabilir.",
                exception);
        }
    }

    /// <summary>
    /// Takvim ön koşullarını uygular. Eksik varsa <b>409</b> — istekte yanlış bir şey
    /// yok, eksik olan kaynağın durumu (<c>PublishExperienceCommand</c> ile aynı
    /// gerekçe) ve eksiklerin kodları mesajda.
    /// </summary>
    internal static void RequireSchedulable(Experience experience)
    {
        var missing = ScheduleRules.MissingPrerequisites(experience);

        if (missing.Count > 0)
        {
            throw new ConflictException(
                $"Deneyimin takvimi kurulamaz, eksik alanlar: {string.Join(", ", missing)}.",
                ScheduleConflict.NotSchedulable);
        }
    }

    /// <summary>
    /// Deneyimin saat dilimindeki bugün. <b>Sunucunun yerel günü DEĞİL</b>: Prag'daki
    /// bir tur için "bugün" Prag'ın günü, sunucunun bulunduğu makinenin değil.
    /// </summary>
    internal static DateOnly TodayLocal(Experience experience, TimeZoneInfo zone, IDateTimeProvider clock)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(clock.UtcNow.UtcDateTime, zone));

    /// <summary>
    /// Şablonlardan seans üretir ve satırları ekler. Var olan başlangıçlar
    /// DURUMDAN BAĞIMSIZ okunuyor: kapatılmış bir seans da sayılmalı, aksi halde
    /// üretim onu diriltir ve host'un kapattığı gün geri gelir.
    ///
    /// <para>Çağıran AÇIK BİR TRANSACTION içinde olmak zorunda — satırlar deneyim
    /// kilidi altında yazılıyor, aksi halde iki eşzamanlı üretim aynı başlangıcı iki
    /// kez eklemeye çalışır ve <c>ux_availability_slot_experience_start</c>'a
    /// çarpardı.</para>
    /// </summary>
    internal static async Task<SlotGenerationSummary> GenerateAsync(
        IAppDbContext dbContext,
        Experience experience,
        TimeZoneInfo zone,
        DateOnly fromLocalDate,
        DateOnly throughLocalDate,
        DateTimeOffset now,
        IReadOnlyList<RecurrenceTemplate> templates,
        CancellationToken cancellationToken)
    {
        if (templates.Count == 0)
        {
            return SlotGenerationSummary.Empty;
        }

        var blackouts = await dbContext.AvailabilityBlackouts
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id && x.EndsOnLocal >= fromLocalDate)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Tek sorguda tüm mevcut başlangıçlar. Şablon başına sorgu açmak, yirmi bir
        // şablonlu bir deneyimde yirmi bir tur demekti.
        var existing = await dbContext.AvailabilitySlots
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id && x.StartsAtLocal >= fromLocalDate.ToDateTime(TimeOnly.MinValue))
            .Select(x => x.StartsAtLocal)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var seen = new HashSet<DateTime>(existing);
        var created = 0;
        var skips = new List<SlotSkip>();

        foreach (var template in templates)
        {
            var report = SlotGenerator.Generate(
                template, zone, fromLocalDate, throughLocalDate, blackouts, seen);

            skips.AddRange(report.Skipped);

            foreach (var start in report.Created)
            {
                // Tarama GÜN hassasiyetinde başlıyor (bugün), yani bugünün geçmiş
                // saatleri de üretime giriyor. Onları burada eliyoruz: yazılsalardı
                // host takviminde hiç yaşanmamış bir seans görürdü ve o satıra
                // dokunamazdı — hem kapatma hem silme geçmiş seansı reddediyor.
                //
                // Rapora YAZILMIYOR: bu bir anomali değil, "geçmişe seans açılmaz"
                // kuralının olağan sonucu ve her üretimde tekrarlanan gürültü olurdu.
                if (start.Utc <= now) continue;

                // İki şablon aynı başlangıcı üretemez: `seen`'e ekleyerek ikinci
                // şablonun aynı satırı yazmasını engelliyoruz. Veritabanı zaten
                // reddederdi ama hata 500 olarak çıkardı.
                if (!seen.Add(start.Local)) continue;

                dbContext.AvailabilitySlots.Add(new AvailabilitySlot
                {
                    Id = Guid.CreateVersion7(),
                    ExperienceId = experience.Id,
                    RecurrenceTemplateId = template.Id,
                    StartsAtUtc = start.Utc,
                    StartsAtLocal = start.Local,
                    UtcOffsetMinutes = (short)start.Offset.TotalMinutes,
                    DurationMinutes = experience.DurationMinutes,
                    Capacity = experience.Capacity,
                    RemainingCapacity = experience.Capacity,
                    Status = SlotStatus.Open,
                });

                created++;
            }
        }

        return new SlotGenerationSummary(created, skips);
    }
}

/// <param name="Skipped">
/// Üretilemeyen occurrence'lar. <b>Sessiz değil</b> (CLAUDE.md #1): host "neden
/// 29 Mart'ta seansım yok" diye sorabilmeli ve cevabı yanıtta.
/// </param>
internal sealed record SlotGenerationSummary(int Created, IReadOnlyList<SlotSkip> Skipped)
{
    internal static SlotGenerationSummary Empty { get; } = new(0, []);
}
