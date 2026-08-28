using MediatR;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Commands.ArchiveExperience;

/// <summary>
/// İlanı raftan indirir. <b>Silme değil</b> ve doğrulama İSTEMEZ: eksik bir taslağı da
/// arşivlemek serbest — "bundan vazgeçtim" demenin yolu.
///
/// <para><b>Silme ucu bilerek YOK.</b> İlan satırı Blok 7'den sonra rezervasyonlara,
/// Blok 11'den sonra değerlendirmelere FK ile bağlı olacak; onu silmek gezginin biletini
/// ve geçmişini götürürdü. Arşiv, aynı ihtiyacın veriyi bozmayan karşılığı
/// (<c>Category.IsActive</c> ve <c>Language.ContentAllowed</c> ile aynı kalıp).</para>
///
/// <para><b>İDEMPOTENT:</b> arşivdeki ilana ikinci kez arşivle demek 200 döner.
/// Geri dönüş yolu <c>POST .../publish</c>.</para>
/// </summary>
public sealed record ArchiveExperienceCommand(Guid ExperienceId) : IRequest<HostExperienceResponse>;

internal sealed class ArchiveExperienceCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    ILogger<ArchiveExperienceCommandHandler> logger)
    : IRequestHandler<ArchiveExperienceCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        ArchiveExperienceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // publish ile AYNI satırda yarışıyor: kilitsiz hâlde iki istek birbirinin
        // durumunu ezebilir (CLAUDE.md #5).
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        if (experience.Status != ExperienceStatus.Archived)
        {
            experience.Status = ExperienceStatus.Archived;

            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            logger.LogInformation(
                "experience.archived experienceId={ExperienceId} hostId={HostId}",
                experience.Id, hostId);
        }

        // Zaten arşivdeyken de COMMIT: yazma yok ama satır kilidi burada bırakılıyor.
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
