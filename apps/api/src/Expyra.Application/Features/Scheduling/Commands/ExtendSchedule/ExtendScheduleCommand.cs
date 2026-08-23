using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.ExtendSchedule;

/// <summary>
/// Takvim ufkunu ilerletir. Şablonlar sonsuza kadar seans üretemeyeceği için biri
/// zaman zaman "ileriyi de aç" demek zorunda.
///
/// <para><b>İDEMPOTENT</b> — ikinci çağrı yeni satır üretmiyor, çünkü üretim var
/// olan başlangıçları atlıyor.</para>
///
/// <para><b>Filigrana bakıp kısa devre YAPMIYOR</b>, cazip görünse de: üretim daima
/// bugünden tarıyor ve arada oluşmuş delikleri ancak bu tarama kapatıyor. Bir
/// blackout, aralığına düşen occurrence'ların hiç üretilmemesine sebep olur; aralık
/// sonra kaldırılınca <c>DeleteBlackoutCommand</c> yalnız VAR OLAN satırları geri
/// açabilir, hiç yazılmamış olanları yazamaz. O günleri geri getiren tek şey buradaki
/// yeniden tarama — filigran hedefteyken atlansaydı takvimde kalıcı bir delik kalırdı.</para>
/// </summary>
/// <param name="ThroughLocalDate">
/// İsteğe bağlı hedef. Verilmezse bugün + varsayılan ufuk. Verilen değer daha
/// yakınsa YOK SAYILIYOR: ufuk geri çekilmiyor — çekilseydi üretilmiş seansların
/// silinmesi gerekirdi ve bu uç onu yapmıyor.
/// </param>
public sealed record ExtendScheduleCommand(Guid ExperienceId, DateOnly? ThroughLocalDate)
    : IRequest<ExtendScheduleResponse>;

public sealed record ExtendScheduleResponse(
    string GeneratedThroughLocalDate,
    ScheduleGenerationResponse Report);

internal sealed class ExtendScheduleCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<ExtendScheduleCommand, ExtendScheduleResponse>
{
    public async Task<ExtendScheduleResponse> Handle(
        ExtendScheduleCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        HostScheduleStore.RequireSchedulable(experience);

        var zone = HostScheduleStore.ResolveZone(experience);
        var today = HostScheduleStore.TodayLocal(experience, zone, clock);

        var target = Later(today.AddDays(RecurrenceTemplate.GenerationHorizonDays), request.ThroughLocalDate);
        var ceiling = today.AddDays(ScheduleRules.MaxHorizonDays);

        if (target > ceiling)
        {
            throw new ConflictException(
                $"Takvim en fazla {ScheduleRules.MaxHorizonDays} gün ileriye açılabilir.",
                ScheduleConflict.HorizonTooFar);
        }

        var templates = await dbContext.RecurrenceTemplates
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id && x.Status == RecurrenceStatus.Active)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var summary = await HostScheduleStore
            .GenerateAsync(dbContext, experience, zone, today, target, clock.UtcNow, templates, cancellationToken)
            .ConfigureAwait(false);

        experience.ScheduleGeneratedThroughLocal = target;

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return new ExtendScheduleResponse(
            ScheduleFormat.Date(target),
            ScheduleFormat.Report(summary));
    }

    private static DateOnly Later(DateOnly left, DateOnly? right)
        => right is { } value && value > left ? value : left;
}
