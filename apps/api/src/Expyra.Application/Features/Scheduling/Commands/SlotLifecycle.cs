using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands;

/// <summary>
/// Seansı açar ya da kapatır. <b>Gövdede yalnız durum var</b>: kapasite ve
/// başlangıç bu uçtan değişmiyor.
///
/// <para>Gerekçe: kapasiteyi değiştirmek satılmış koltukların altını oyabilir
/// (Blok 9) ve başlangıcı değiştirmek, rezervasyonu olan misafirin saatini haber
/// vermeden kaydırmak olurdu. İkisi de ayrı birer akış ve ayrı birer karar;
/// "seansı düzenle" diye tek bir uca sıkıştırılsalardı o kararlar görünmez olurdu.</para>
/// </summary>
public sealed record SetSlotStatusCommand(Guid ExperienceId, Guid SlotId, SlotStatus Status)
    : IRequest<SlotResponse>;

internal sealed class SetSlotStatusCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<SetSlotStatusCommand, SlotResponse>
{
    public async Task<SlotResponse> Handle(
        SetSlotStatusCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var slot = await LoadOwnedSlotAsync(dbContext, experience.Id, request.SlotId, cancellationToken)
            .ConfigureAwait(false);

        var now = clock.UtcNow;

        // Geçmiş seans DEĞİŞTİRİLEMEZ: olan olmuş, kaydı olduğu gibi kalmalı.
        if (slot.StartsAtUtc <= now)
        {
            throw new ConflictException(
                "Geçmiş bir seans değiştirilemez.", ScheduleConflict.SlotInPast);
        }

        // İDEMPOTENT: aynı duruma çekmek hata değil.
        if (slot.Status == request.Status)
        {
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
            return ScheduleFormat.Slot(slot);
        }

        if (request.Status == SlotStatus.Open)
        {
            var localDate = DateOnly.FromDateTime(slot.StartsAtLocal);

            var blackedOut = await dbContext.AvailabilityBlackouts
                .AsNoTracking()
                .AnyAsync(
                    x => x.ExperienceId == experience.Id
                        && x.StartsOnLocal <= localDate
                        && x.EndsOnLocal >= localDate,
                    cancellationToken)
                .ConfigureAwait(false);

            // Blackout hâlâ duruyorsa açmak, kuralı sessizce delmek olurdu.
            if (blackedOut)
            {
                throw new ConflictException(
                    "Bu tarih kapalı olarak işaretlenmiş; önce o aralığı kaldırın.",
                    ScheduleConflict.SlotBlackedOut);
            }

            slot.Status = SlotStatus.Open;
            slot.ClosedReason = null;
            slot.ClosedAtUtc = null;
        }
        else
        {
            slot.Status = SlotStatus.Closed;

            // Sebep HOST: blackout kaldırıldığında bu satır yeniden AÇILMAMALI.
            slot.ClosedReason = SlotClosedReason.Host;
            slot.ClosedAtUtc = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return ScheduleFormat.Slot(slot);
    }

    internal static async Task<AvailabilitySlot> LoadOwnedSlotAsync(
        IAppDbContext dbContext,
        Guid experienceId,
        Guid slotId,
        CancellationToken cancellationToken)
    {
        var slot = await dbContext.AvailabilitySlots
            .FirstOrDefaultAsync(x => x.Id == slotId && x.ExperienceId == experienceId, cancellationToken)
            .ConfigureAwait(false);

        // Başka bir deneyimin seansı da 404 — enumeration.
        return slot ?? throw new NotFoundException("Seans bulunamadı.");
    }
}

/// <summary>
/// Seansı SİLER. Yalnız elle eklenmiş, gelecekteki ve hiç satılmamış olanlar.
///
/// <para><b>Şablondan doğmuş seans silinemez</b> (409): silinse bir sonraki üretim
/// onu geri getirirdi, çünkü tekillik kontrolü var olan satıra bakıyor. Kapatma
/// yolu ayrı ve o kalıcı — kapalı satır bir mezar taşı.</para>
/// </summary>
public sealed record DeleteSlotCommand(Guid ExperienceId, Guid SlotId) : IRequest;

internal sealed class DeleteSlotCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<DeleteSlotCommand>
{
    public async Task Handle(DeleteSlotCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var slot = await SetSlotStatusCommandHandler
            .LoadOwnedSlotAsync(dbContext, experience.Id, request.SlotId, cancellationToken)
            .ConfigureAwait(false);

        if (slot.RecurrenceTemplateId is not null)
        {
            throw new ConflictException(
                "Haftalık kuraldan doğan seans silinemez; kapatabilirsiniz.",
                ScheduleConflict.SlotGenerated);
        }

        if (slot.StartsAtUtc <= clock.UtcNow)
        {
            throw new ConflictException(
                "Geçmiş bir seans silinemez.", ScheduleConflict.SlotInPast);
        }

        if (slot.RemainingCapacity != slot.Capacity)
        {
            throw new ConflictException(
                "Rezervasyonu olan bir seans silinemez.", ScheduleConflict.SlotHasBookings);
        }

        dbContext.AvailabilitySlots.Remove(slot);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
    }
}
