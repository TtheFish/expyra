using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Commands.ReorderMedia;

/// <summary>
/// Galeri sırasını TOPTAN yazar: gelen dizinin sırası yeni sıra.
///
/// <para><b>PLAN'dan bilinçli sapma.</b> PLAN Blok 6 sıralamayı
/// <c>PATCH .../media/{mediaId}</c> altında sayıyor, yani görsel başına bir istek ve
/// mutlak bir <c>sortOrder</c>. Sürükle-bırak ile bir görseli başa taşımak, aradaki
/// HER görselin numarasını değiştirmek demek; tek tek PATCH'lense liste istekler
/// arasında tutarsız kalır ve ortada kesilen bir sürükleme iki görseli aynı sıraya
/// bırakırdı. Tam liste tek işlemde yazıldığında ara durum hiç var olmuyor.</para>
///
/// <para>Kapak seçimi ayrı uçta: sıralama ile kapak farklı iki karar ve tek gövdede
/// birleştirilseydi "sırayı değiştir ama kapağa dokunma" ifade edilemezdi.</para>
/// </summary>
/// <param name="MediaIds">
/// Deneyimin doğrulanmış görsellerinin TAMAMI, istenen sırada. Eksik ya da fazla
/// kimlik reddediliyor: eksiğe izin verilseydi listede olmayan görsellerin sırası
/// belirsiz kalır, istemcinin gördüğü sıra ile sunucununki ayrışırdı.
/// </param>
public sealed record ReorderMediaCommand(Guid ExperienceId, IReadOnlyList<Guid> MediaIds)
    : IRequest<HostExperienceResponse>;

internal sealed class ReorderMediaCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<ReorderMediaCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        ReorderMediaCommand request,
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

        var byId = media.ToDictionary(x => x.Id);

        // Küme eşitliği: tekrar eden kimlik de burada yakalanıyor (sayı tutmaz).
        if (request.MediaIds.Count != byId.Count || !request.MediaIds.All(byId.ContainsKey))
        {
            throw new ConflictException(
                "Sıralama isteği deneyimin görselleriyle eşleşmiyor; listeyi yenileyip tekrar deneyin.");
        }

        for (var index = 0; index < request.MediaIds.Count; index++)
        {
            byId[request.MediaIds[index]].SortOrder = index;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
