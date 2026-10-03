using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Media;
using Expyra.Domain.Experiences;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Experiences.Commands.ConfirmMedia;

/// <summary>
/// Yüklenen nesneyi DOĞRULAR ve medyayı yayına açar (PLAN Blok 6 kabul kriteri 2).
///
/// <para>Üç şey kontrol ediliyor ve üçü de <b>istemcinin beyanına değil depodaki
/// bayta</b> bakıyor:</para>
/// <list type="number">
/// <item>Nesne gerçekten yüklenmiş mi (HEAD).</item>
/// <item>İçeriği gerçekten iddia edilen biçim mi (<see cref="ImageProbe"/> — sihirli
/// baytlar). "image/png" başlığıyla HTML yüklenip depodan servis edilirse saklı XSS
/// olurdu.</item>
/// <item>Ölçü ve boyut sınırların içinde mi.</item>
/// </list>
///
/// <para><b>Bozuk baytta satır da nesne de siliniyor:</b> geride yarım bir kayıt
/// bırakmak, host'a "yüklendi ama görünmüyor" diye açıklanamayan bir durum üretirdi.
/// Host baştan deniyor.</para>
/// </summary>
public sealed record ConfirmMediaCommand(Guid ExperienceId, Guid MediaId)
    : IRequest<HostExperienceResponse>;

internal sealed class ConfirmMediaCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    IImageSanitizer sanitizer,
    ICurrentUser currentUser,
    ILogger<ConfirmMediaCommandHandler> logger)
    : IRequestHandler<ConfirmMediaCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        ConfirmMediaCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // Kapak seçimi ve sıra numarası "oku-değiştir-yaz": iki görselin aynı anda
        // onaylanması, ikisinin de aynı sırayı alması ya da ikisinin birden kapak
        // olması demekti (CLAUDE.md #5).
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        var media = await dbContext.ExperienceMedia
            .FirstOrDefaultAsync(
                x => x.Id == request.MediaId && x.ExperienceId == experience.Id,
                cancellationToken)
            .ConfigureAwait(false);

        if (media is null)
        {
            throw new NotFoundException("Görsel bulunamadı.");
        }

        // İDEMPOTENT: aynı onayın ikinci kez gelmesi (ağ tekrarı, çift tıklama)
        // hata değil. Yeniden doğrulamak da yanlış olurdu — nesne o sırada
        // silinmişse çalışan bir görseli iptal ederdik.
        if (media.Status == MediaStatus.Active)
        {
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            return await HostExperienceProjection
                .ToResponseAsync(dbContext, storage, experience, cancellationToken)
                .ConfigureAwait(false);
        }

        // Yeniden kodlama satır kilidi altında: aynı medyanın iki onayı aynı anda
        // yayın anahtarına yazmasın. Kilit yalnız BU ilanın medya işlemlerini
        // bekletiyor; çözme küçültülerek yapıldığı için süre kısa.
        var uploadKey = MediaRules.UploadKeyOf(media.StorageKey);

        var validation = await UploadedImage
            .PublishAsync(
                storage, sanitizer, uploadKey, media.StorageKey, media.ContentType, cancellationToken)
            .ConfigureAwait(false);

        if (validation.Info is null)
        {
            await RejectAsync(transaction, media, validation, cancellationToken).ConfigureAwait(false);
            throw new ConflictException(validation.Message!, validation.Reason);
        }

        var info = validation.Info;

        media.ByteSize = validation.ByteSize;
        media.Width = info.Width;
        media.Height = info.Height;

        // İçerik tipi BEYANDAN değil bayttan yazılıyor: ikisi eşit olduğu doğrulandı,
        // ama kaynağın hangisi olduğu belli kalsın.
        media.ContentType = info.ContentType;
        media.Status = MediaStatus.Active;

        await AssignPlacementAsync(media, cancellationToken).ConfigureAwait(false);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        // Ham yükleme COMMIT'TEN SONRA siliniyor: ters sırada, commit patlarsa host'un
        // yüklediği bayt da gitmiş olurdu ve aynı kimlikle yeniden deneyemezdi.
        await DeleteUploadAsync(uploadKey, media.Id, cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "experience.media.confirmed experienceId={ExperienceId} mediaId={MediaId} size={Width}x{Height}",
            experience.Id, media.Id, info.Width, info.Height);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Doğrulamayı geçemeyen medyayı temizler: önce satır, sonra COMMIT, sonra nesne.
    ///
    /// <para><b>Commit, istisnadan önce.</b> Çağıran hemen ardından
    /// <c>ConflictException</c> atıyor ve o istisna <c>await using</c> kapsamındaki
    /// transaction'ı geri alırdı. Nesne silme transaction'ın parçası olmadığı için
    /// geri alınmaz: sonuç, var olmayan bir dosyayı gösteren bir satır olurdu.</para>
    ///
    /// <para>Nesne commit'ten SONRA siliniyor. Ters sırada, commit patlarsa dosya
    /// silinmiş ama satır ayakta kalırdı.</para>
    /// </summary>
    private async Task RejectAsync(
        IDbContextTransaction transaction,
        ExperienceMedia media,
        UploadedImageResult validation,
        CancellationToken cancellationToken)
    {
        logger.LogWarning(
            "experience.media.rejected mediaId={MediaId} reason={Reason}",
            media.Id, validation.Reason);

        if (validation.Discard)
        {
            dbContext.ExperienceMedia.Remove(media);
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        if (validation.Discard)
        {
            await storage.DeleteAsync(MediaRules.UploadKeyOf(media.StorageKey), cancellationToken)
                .ConfigureAwait(false);
        }
    }

    /// <summary>
    /// Ham yüklemeyi siler. Başarısızlık isteği BOZMUYOR: görsel zaten yayında ve yükleme
    /// alanı servis edilmiyor — geride kalan yalnız temizleyicinin (Blok 10 / kova yaşam
    /// döngüsü kuralı) alacağı bir yetim. Yalnız G/Ç hatası yakalanıyor (CLAUDE.md #1).
    /// </summary>
    private async Task DeleteUploadAsync(string uploadKey, Guid mediaId, CancellationToken cancellationToken)
    {
        try
        {
            await storage.DeleteAsync(uploadKey, cancellationToken).ConfigureAwait(false);
        }
        catch (IOException exception)
        {
            logger.LogError(
                exception,
                "experience.media.upload-orphaned key={Key} mediaId={MediaId}",
                uploadKey, mediaId);
        }
    }

    /// <summary>
    /// Sıra ve kapak ataması. İkisi de MEVCUT satırlara bakıyor, bu yüzden çağıran
    /// transaction + satır kilidi içinde olmak zorunda.
    /// </summary>
    private async Task AssignPlacementAsync(ExperienceMedia media, CancellationToken cancellationToken)
    {
        var siblings = await dbContext.ExperienceMedia
            .Where(x => x.ExperienceId == media.ExperienceId
                && x.Id != media.Id
                && x.Status == MediaStatus.Active)
            .Select(x => new { x.SortOrder, x.IsCover })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        media.SortOrder = siblings.Count == 0 ? 0 : siblings.Max(x => x.SortOrder) + 1;

        // İlk doğrulanan görsel kendiliğinden kapak olur: host hiçbir şey seçmese bile
        // ilan yayınlanabilir durumda olsun. Sonrakiler olmuyor — mevcut kapağı
        // habersiz değiştirmek, host'un seçimini silmek olurdu.
        media.IsCover = !siblings.Any(x => x.IsCover);
    }
}
