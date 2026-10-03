using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Experiences.Commands.DeleteMedia;

/// <summary>
/// Görseli hem veritabanından hem depodan siler (PLAN Blok 6 kabul kriteri 4).
///
/// <para><b>Sıra: önce satır, sonra nesne.</b> Ters sırada, nesne silinip satır
/// silinemeden süreç ölürse geride var olmayan bir dosyayı gösteren kayıt kalır ve
/// misafir kırık görsel görür. Bu sırada en kötü ihtimalle kimsenin göstermediği
/// bir nesne kalıyor — görünmez ve temizlenebilir bir yetim.</para>
///
/// <para><b>Nesne silinemezse istek yine de başarılı sayılıyor</b> ve yetim
/// loglanıyor. Alternatif, satırı geri getirmekti; ama o zaman "sildim" diyen host
/// görseli hâlâ görürdü. Depo hatası kullanıcının sorunu değil.</para>
/// </summary>
public sealed record DeleteMediaCommand(Guid ExperienceId, Guid MediaId)
    : IRequest<HostExperienceResponse>;

internal sealed class DeleteMediaCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    ILogger<DeleteMediaCommandHandler> logger)
    : IRequestHandler<DeleteMediaCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        DeleteMediaCommand request,
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
            .Where(x => x.ExperienceId == experience.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var target = media.FirstOrDefault(x => x.Id == request.MediaId);

        if (target is null)
        {
            throw new NotFoundException("Görsel bulunamadı.");
        }

        var remaining = media
            .Where(x => x.Id != target.Id && x.Status == MediaStatus.Active)
            .OrderBy(x => x.SortOrder)
            .ToList();

        // Yayındaki ilanın son aktif görseli silinirse ilan otomatik taslağa düşer:
        // kapak yayın koşulu korunur (artık yayında değil) ve host arşivlemeden
        // görseli değiştirebilir. Eski 409 (media-last-of-published) host'u
        // arşive zorluyordu — gereksiz uzun yol.
        var unpublish =
            experience.Status == ExperienceStatus.Published
            && target.Status == MediaStatus.Active
            && remaining.Count == 0;

        if (unpublish)
        {
            experience.Status = ExperienceStatus.Draft;
            logger.LogInformation(
                "experience.unpublished.viaMediaDelete experienceId={ExperienceId}",
                experience.Id);
        }

        dbContext.ExperienceMedia.Remove(target);
        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Kapak silindiyse sıradaki devralıyor. Boş bırakmak, host'a hiçbir şey
        // sormadan ilanı yayınlanamaz hâle getirmek olurdu.
        if (target.IsCover && remaining.Count > 0)
        {
            remaining[0].IsCover = true;
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        await DeleteObjectAsync(target, cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task DeleteObjectAsync(ExperienceMedia media, CancellationToken cancellationToken)
    {
        try
        {
            await storage.DeleteAsync(media.StorageKey, cancellationToken).ConfigureAwait(false);

            // Ham yükleme de: onaylanmamış (Pending) satırda bayt yalnız orada, onaylanmış
            // satırda ise onay sonrası silinemediyse kalmış olabilir. Silme idempotent.
            await storage
                .DeleteAsync(MediaRules.UploadKeyOf(media.StorageKey), cancellationToken)
                .ConfigureAwait(false);
        }
        catch (IOException exception)
        {
            // Yalnız G/Ç hatası yakalanıyor, `Exception` DEĞİL (CLAUDE.md #1).
            // Nesne yetim kalıyor ve anahtarı loglanıyor — elle temizlenebilsin.
            logger.LogError(
                exception,
                "experience.media.orphaned key={Key} mediaId={MediaId}",
                media.StorageKey, media.Id);
        }
    }
}
