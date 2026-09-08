using MediatR;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Commands.UnpublishExperience;

/// <summary>
/// Yayındaki ilanı taslağa alır. Arşivden hafif: host görsel değiştirmek veya
/// ara vermek istediğinde arşivlemeden ilanı aramadan indirir.
///
/// <para><b>İDEMPOTENT:</b> zaten taslak veya arşivdeki ilana ikinci kez demek
/// 200 döner ve durumu değiştirmez — arşivi taslağa zorlamak, "rafta dursun"
/// niyetini bozardı. Arşivden dönüş yolu <c>POST .../publish</c>.</para>
/// </summary>
public sealed record UnpublishExperienceCommand(Guid ExperienceId) : IRequest<HostExperienceResponse>;

internal sealed class UnpublishExperienceCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    ILogger<UnpublishExperienceCommandHandler> logger)
    : IRequestHandler<UnpublishExperienceCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        UnpublishExperienceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // publish/archive ile aynı satırda yarışıyor (CLAUDE.md #5).
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        if (experience.Status == ExperienceStatus.Published)
        {
            experience.Status = ExperienceStatus.Draft;

            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            logger.LogInformation(
                "experience.unpublished experienceId={ExperienceId} hostId={HostId}",
                experience.Id, hostId);
        }

        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
