using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands;

/// <summary>
/// "Şu tarihlerde yokum." İleriye dönük bir KURAL: aralığa düşen mevcut seansları
/// kapatıyor ve o aralıkta yeni seans üretilmesini engelliyor.
/// </summary>
public sealed record CreateBlackoutCommand(
    Guid ExperienceId,
    DateOnly StartsOnLocal,
    DateOnly EndsOnLocal,
    string? Note) : IRequest<CreateBlackoutResponse>;

/// <param name="SkippedSoldSlotCount">
/// Aralığa düşen ama SATILMIŞ olduğu için kapatılmayan seanslar. Sayı yanıtta,
/// çünkü host tatile çıktığını sanıp o gün müşteriyle karşılaşmamalı.
/// </param>
public sealed record CreateBlackoutResponse(
    BlackoutResponse Blackout,
    int ClosedSlotCount,
    int SkippedSoldSlotCount);

internal sealed class CreateBlackoutCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock,
    ILogger<CreateBlackoutCommandHandler> logger)
    : IRequestHandler<CreateBlackoutCommand, CreateBlackoutResponse>
{
    public async Task<CreateBlackoutResponse> Handle(
        CreateBlackoutCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var zone = HostScheduleStore.ResolveZone(experience);
        var today = HostScheduleStore.TodayLocal(experience, zone, clock);

        // Tamamen geçmişte kalan bir aralık hiçbir şey yapmaz. Sessizce kabul etmek,
        // host'a "tatilini kaydettim" deyip hiçbir seansı kapatmamak olurdu.
        if (request.EndsOnLocal < today)
        {
            throw new BadRequestException("Tamamen geçmişte kalan bir aralık kaydedilemez.");
        }

        var count = await dbContext.AvailabilityBlackouts
            .CountAsync(x => x.ExperienceId == experience.Id, cancellationToken)
            .ConfigureAwait(false);

        if (count >= ScheduleRules.MaxBlackoutsPerExperience)
        {
            throw new ConflictException(
                $"Bir deneyimde en fazla {ScheduleRules.MaxBlackoutsPerExperience} kapalı aralık olabilir.",
                ScheduleConflict.BlackoutLimit);
        }

        var blackout = new AvailabilityBlackout
        {
            Id = Guid.CreateVersion7(),
            ExperienceId = experience.Id,
            StartsOnLocal = request.StartsOnLocal,
            EndsOnLocal = request.EndsOnLocal,
            Note = request.Note,
        };

        dbContext.AvailabilityBlackouts.Add(blackout);

        var now = clock.UtcNow;

        // Yalnız GELECEK ve açık seanslar. Geçmişi kapatmak kaydı değiştirmek olurdu.
        var affected = await dbContext.AvailabilitySlots
            .Where(x => x.ExperienceId == experience.Id
                && x.Status == SlotStatus.Open
                && x.StartsAtUtc > now)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var closed = 0;
        var sold = 0;

        foreach (var slot in affected)
        {
            if (!blackout.Covers(DateOnly.FromDateTime(slot.StartsAtLocal))) continue;

            // Satılmış seans KAPATILMIYOR: koltuğu iptal etmek Blok 13'ün işi ve
            // burada sessizce yapılamaz.
            if (slot.RemainingCapacity != slot.Capacity)
            {
                sold++;
                continue;
            }

            slot.Status = SlotStatus.Closed;
            slot.ClosedReason = SlotClosedReason.Blackout;
            slot.ClosedAtUtc = now;
            closed++;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "schedule.blackout.created experienceId={ExperienceId} closed={Closed} sold={Sold}",
            experience.Id, closed, sold);

        return new CreateBlackoutResponse(ScheduleFormat.Blackout(blackout), closed, sold);
    }
}

/// <summary>
/// Kapalı aralığı kaldırır ve <b>yalnız onun kapattığı</b> gelecek seansları geri
/// açar.
///
/// <para>Sebep ayrımı burada karşılığını buluyor: <c>Host</c> ile kapatılmış bir
/// seans açılmıyor (host onu ayrıca kapatmıştı) ve başka bir aralık hâlâ o günü
/// kapsıyorsa da açılmıyor — çakışan aralıklara izin var, birleşim semantiği.</para>
/// </summary>
public sealed record DeleteBlackoutCommand(Guid ExperienceId, Guid BlackoutId)
    : IRequest<DeleteBlackoutResponse>;

public sealed record DeleteBlackoutResponse(int ReopenedSlotCount);

internal sealed class DeleteBlackoutCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<DeleteBlackoutCommand, DeleteBlackoutResponse>
{
    public async Task<DeleteBlackoutResponse> Handle(
        DeleteBlackoutCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var blackout = await dbContext.AvailabilityBlackouts
            .FirstOrDefaultAsync(
                x => x.Id == request.BlackoutId && x.ExperienceId == experience.Id,
                cancellationToken)
            .ConfigureAwait(false);

        if (blackout is null)
        {
            throw new NotFoundException("Kapalı aralık bulunamadı.");
        }

        dbContext.AvailabilityBlackouts.Remove(blackout);

        // KALAN aralıklar okunuyor: silinen aralığın kapsadığı bir gün, başka bir
        // aralık tarafından da kapsanıyor olabilir.
        var remaining = await dbContext.AvailabilityBlackouts
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id && x.Id != blackout.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var now = clock.UtcNow;

        var candidates = await dbContext.AvailabilitySlots
            .Where(x => x.ExperienceId == experience.Id
                && x.Status == SlotStatus.Closed
                && x.ClosedReason == SlotClosedReason.Blackout
                && x.StartsAtUtc > now)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var reopened = 0;

        foreach (var slot in candidates)
        {
            var localDate = DateOnly.FromDateTime(slot.StartsAtLocal);

            if (!blackout.Covers(localDate)) continue;
            if (remaining.Any(x => x.Covers(localDate))) continue;

            slot.Status = SlotStatus.Open;
            slot.ClosedReason = null;
            slot.ClosedAtUtc = null;
            reopened++;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return new DeleteBlackoutResponse(reopened);
    }
}
