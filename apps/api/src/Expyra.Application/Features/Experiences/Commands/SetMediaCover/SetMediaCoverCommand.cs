using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Commands.SetMediaCover;

/// <summary>
/// Bu görseli kapak yapar. <b>Kapağı KALDIRAN bir işlem yok</b> ve bu bilinçli:
/// yayındaki bir ilanın kapaksız kalması yayın koşulunu ihlal ederdi
/// (<c>ExperiencePublishRequirement.Cover</c>). Kapak "değiştirilir", boşaltılmaz —
/// yani her zaman tam bir tane var.
/// </summary>
public sealed record SetMediaCoverCommand(Guid ExperienceId, Guid MediaId)
    : IRequest<HostExperienceResponse>;

internal sealed class SetMediaCoverCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<SetMediaCoverCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        SetMediaCoverCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var media = await dbContext.ExperienceMedia
            .Where(x => x.ExperienceId == experience.Id && x.Status == MediaStatus.Active)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var target = media.FirstOrDefault(x => x.Id == request.MediaId);

        // Doğrulanmamış (Pending) bir görsel de burada bulunamaz: yüklenmemiş bir
        // dosyanın kapak olması, kartta boş kutu demek.
        if (target is null)
        {
            throw new NotFoundException("Görsel bulunamadı.");
        }

        if (target.IsCover)
        {
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            return await HostExperienceProjection
                .ToResponseAsync(dbContext, storage, experience, cancellationToken)
                .ConfigureAwait(false);
        }

        // İKİ AYRI SaveChanges, tek transaction içinde. `ux_experience_media_cover`
        // kısmi tekil index'i deneyim başına bir kapak dayatıyor ve Postgres bunu
        // HER CÜMLEDE kontrol ediyor. Tek SaveChanges'te iki UPDATE'in hangisinin
        // önce gideceği EF tarafından garanti edilmiyor; yeni kapak eskisinden önce
        // yazılırsa index ihlali 500 üretirdi. Önce boşalt, sonra ata.
        foreach (var other in media.Where(x => x.IsCover))
        {
            other.IsCover = false;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        target.IsCover = true;

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
