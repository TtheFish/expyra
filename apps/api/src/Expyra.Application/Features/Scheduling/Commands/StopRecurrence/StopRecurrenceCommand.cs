using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.StopRecurrence;

/// <summary>
/// Şablonu DURDURUR — silmez.
///
/// <para><b>Neden silinmiyor:</b> ürettiği seansların <c>recurrence_template_id</c>
/// alanı hâlâ ona işaret ediyor ve o bağ "bu seans nereden geldi" sorusunun tek
/// cevabı. Silinseydi ya FK kırılır ya da seanslar da giderdi — oysa satılmış bir
/// seansın kuralı kaldırıldı diye yok olması kabul edilemez.</para>
///
/// <para><b>Hangi seanslar kapanıyor:</b> yalnız GELECEKTEKİ, açık ve HİÇ
/// SATILMAMIŞ olanlar. Rezervasyonu olan bir seansı kapatmak, satılmış koltuğu
/// iptal etmek demek ve o Blok 13'ün (iptal/iade) işi — burada sessizce
/// yapılamaz.</para>
/// </summary>
public sealed record StopRecurrenceCommand(Guid ExperienceId, Guid RecurrenceId)
    : IRequest<StopRecurrenceResponse>;

/// <param name="KeptSlotCount">
/// Kapatılmayan gelecek seanslar — satılmış oldukları için dokunulmadı. Sayı
/// yanıtta çünkü host "kural kalktı ama takvimde hâlâ seans var" diye
/// sormamalı.
/// </param>
public sealed record StopRecurrenceResponse(
    Guid StoppedTemplateId,
    int ClosedSlotCount,
    int KeptSlotCount);

internal sealed class StopRecurrenceCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock,
    ILogger<StopRecurrenceCommandHandler> logger)
    : IRequestHandler<StopRecurrenceCommand, StopRecurrenceResponse>
{
    public async Task<StopRecurrenceResponse> Handle(
        StopRecurrenceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var template = await dbContext.RecurrenceTemplates
            .FirstOrDefaultAsync(
                x => x.Id == request.RecurrenceId && x.ExperienceId == experience.Id,
                cancellationToken)
            .ConfigureAwait(false);

        // Başkasının deneyimine ait şablon da 404 — 403 "bu id'de bir kural var"
        // bilgisini sızdırırdı (LoadOwnedForUpdateAsync ile aynı gerekçe).
        if (template is null)
        {
            throw new NotFoundException("Kural bulunamadı.");
        }

        // İDEMPOTENT: ikinci çağrı hata değil. Çift tıklama hata ekranı üretmemeli.
        if (template.Status == RecurrenceStatus.Stopped)
        {
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
            return new StopRecurrenceResponse(template.Id, 0, 0);
        }

        template.Status = RecurrenceStatus.Stopped;

        var now = clock.UtcNow;

        var future = await dbContext.AvailabilitySlots
            .Where(x => x.RecurrenceTemplateId == template.Id
                && x.StartsAtUtc > now
                && x.Status == SlotStatus.Open)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var closed = 0;
        var kept = 0;

        foreach (var slot in future)
        {
            // Satılmış koltuk varsa DOKUNULMUYOR. RemainingCapacity bu blokta yalnız
            // okunuyor (kabul kriteri 5) ama "hiç satılmamış mı" sorusunun cevabı
            // zaten o sütunda.
            if (slot.RemainingCapacity != slot.Capacity)
            {
                kept++;
                continue;
            }

            slot.Status = SlotStatus.Closed;
            slot.ClosedReason = SlotClosedReason.Template;
            slot.ClosedAtUtc = now;
            closed++;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "schedule.recurrence.stopped templateId={TemplateId} closed={Closed} kept={Kept}",
            template.Id, closed, kept);

        return new StopRecurrenceResponse(template.Id, closed, kept);
    }
}
