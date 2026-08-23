using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.DeletePricing;

/// <summary>
/// Fiyat sayfasını ve (cascade ile) kurallarını siler.
///
/// <para><b>Yayınlanmış ilanda 409</b> ve bu tesadüfi değil: para birimi kilidi
/// olmadan bu uç onun BYPASS'ı olurdu — sil, yeniden yaz, para birimi değişti.
/// Kilidin anlamlı olması için iki kapının da kapalı olması gerekiyor.</para>
///
/// <para>Kilit ve transaction <c>SetPricing</c> ile AYNI: kilitsiz "oku-kontrol
/// et-yaz" yapılsaydı araya giren bir publish kontrolü delerdi (CLAUDE.md #5).</para>
///
/// <para><b>İDEMPOTENT:</b> fiyatı olmayan ilanda da başarılı — istenen durum
/// zaten sağlanmış.</para>
/// </summary>
public sealed record DeletePricingCommand(Guid ExperienceId) : IRequest;

internal sealed class DeletePricingCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser)
    : IRequestHandler<DeletePricingCommand>
{
    public async Task Handle(DeletePricingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var page = await dbContext.ExperiencePrices
            .FirstOrDefaultAsync(x => x.ExperienceId == experience.Id, cancellationToken)
            .ConfigureAwait(false);

        if (page is null)
        {
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        if (experience.PublishedAtUtc is not null)
        {
            throw new ConflictException(
                "Yayınlanmış bir ilanın fiyatı silinemez. Önce arşivleyin.",
                ScheduleConflict.PricingLockedAfterPublish);
        }

        // Kural satırları CASCADE ile gidiyor (price_rule → experience_price).
        dbContext.ExperiencePrices.Remove(page);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
    }
}
