using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.CreateRecurrence;

/// <summary>
/// Haftalık şablon(lar) açar ve AYNI transaction'da ufka kadar seans üretir.
///
/// <para><b>Neden üretim aynı istekte:</b> host "her salı 14:00" yazdıktan sonra
/// takvimini boş görmemeli. Arka plan işine bırakılsaydı ekran birkaç saniye
/// yalan söylerdi ve repoda arka plan altyapısı da yok (Blok 10).</para>
///
/// <para><b>Neden gün LİSTESİ:</b> "salı ve perşembe" tek bir kural gibi
/// yazılıyor ama iki satır oluyor. Bitmask ya da dizi sütunu seçilseydi
/// <c>ux_recurrence_template_active</c> kurulamaz ve "aynı gün ve saatte iki
/// şablon" veritabanı düzeyinde engellenemezdi.</para>
/// </summary>
public sealed record CreateRecurrenceCommand(
    Guid ExperienceId,
    IReadOnlyList<DayOfWeek> DaysOfWeek,
    TimeOnly StartTimeLocal,
    DateOnly StartsOnLocal,
    DateOnly? EndsOnLocal,
    DstOverlap DstOverlap) : IRequest<CreateRecurrenceResponse>;

public sealed record CreateRecurrenceResponse(
    IReadOnlyList<RecurrenceResponse> Templates,
    ScheduleGenerationResponse Report);

internal sealed class CreateRecurrenceCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock,
    ILogger<CreateRecurrenceCommandHandler> logger)
    : IRequestHandler<CreateRecurrenceCommand, CreateRecurrenceResponse>
{
    public async Task<CreateRecurrenceResponse> Handle(
        CreateRecurrenceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // Seans üretimi "oku-değiştir-yaz": mevcut başlangıçlar okunup yenileri
        // yazılıyor. Kilitsiz iki eşzamanlı istek aynı başlangıcı iki kez eklemeye
        // çalışır ve tekil index'e çarpardı (CLAUDE.md #5).
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        HostScheduleStore.RequireSchedulable(experience);

        var zone = HostScheduleStore.ResolveZone(experience);

        var active = await dbContext.RecurrenceTemplates
            .Where(x => x.ExperienceId == experience.Id && x.Status == RecurrenceStatus.Active)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (active.Count + request.DaysOfWeek.Count > ScheduleRules.MaxTemplatesPerExperience)
        {
            throw new ConflictException(
                $"Bir deneyimde en fazla {ScheduleRules.MaxTemplatesPerExperience} haftalık kural olabilir.",
                ScheduleConflict.RecurrenceLimit);
        }

        // Çakışma KODDA da kontrol ediliyor, yalnız index'e güvenilmiyor: index
        // ihlali 500 üretir, oysa bu kullanıcının düzeltebileceği bir durum ve
        // hangi günün çakıştığını söyleyebiliyoruz.
        foreach (var day in request.DaysOfWeek)
        {
            if (active.Any(x => x.DayOfWeek == day && x.StartTimeLocal == request.StartTimeLocal))
            {
                throw new ConflictException(
                    $"{day} günü {request.StartTimeLocal:HH\\:mm} saatinde zaten bir kural var.",
                    ScheduleConflict.RecurrenceDuplicate);
            }
        }

        var created = new List<RecurrenceTemplate>(request.DaysOfWeek.Count);

        foreach (var day in request.DaysOfWeek)
        {
            var template = new RecurrenceTemplate
            {
                Id = Guid.CreateVersion7(),
                ExperienceId = experience.Id,
                DayOfWeek = day,
                StartTimeLocal = request.StartTimeLocal,
                StartsOnLocal = request.StartsOnLocal,
                EndsOnLocal = request.EndsOnLocal,
                DstOverlap = request.DstOverlap,
                Status = RecurrenceStatus.Active,
            };

            dbContext.RecurrenceTemplates.Add(template);
            created.Add(template);
        }

        var today = HostScheduleStore.TodayLocal(experience, zone, clock);
        var horizon = today.AddDays(RecurrenceTemplate.GenerationHorizonDays);

        var summary = await HostScheduleStore
            .GenerateAsync(dbContext, experience, zone, today, horizon, clock.UtcNow, created, cancellationToken)
            .ConfigureAwait(false);

        // Filigran yalnız "takviminiz şu tarihe kadar hazır" demek için; üretimin
        // alt sınırı DEĞİL (üretim daima bugünden tarıyor). Bozulursa fazladan iş
        // olur, eksik satır olmaz.
        experience.ScheduleGeneratedThroughLocal = Later(experience.ScheduleGeneratedThroughLocal, horizon);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "schedule.recurrence.created experienceId={ExperienceId} templates={Templates} slots={Slots} skipped={Skipped}",
            experience.Id, created.Count, summary.Created, summary.Skipped.Count);

        return new CreateRecurrenceResponse(
            created.Select(ScheduleFormat.Recurrence).ToList(),
            ScheduleFormat.Report(summary));
    }

    private static DateOnly Later(DateOnly? left, DateOnly right)
        => left is { } value && value > right ? value : right;
}
