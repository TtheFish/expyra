using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Application.Features.Media;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Users.Commands.ConfirmAvatar;

/// <summary>
/// Yüklenen avatarı doğrular ve profile bağlar. Doğrulama ilan görselleriyle AYNI
/// koddan geçiyor (<see cref="UploadedImage"/>) — "image/png" diye bildirilmiş bir
/// SVG buradan da geçemiyor.
/// </summary>
public sealed record ConfirmAvatarCommand(string StorageKey) : IRequest<CurrentUserResponse>;

internal sealed class ConfirmAvatarCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    ILogger<ConfirmAvatarCommandHandler> logger)
    : IRequestHandler<ConfirmAvatarCommand, CurrentUserResponse>
{
    public async Task<CurrentUserResponse> Handle(
        ConfirmAvatarCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var userId = currentUser.RequireUserId();

        // Anahtar İSTEMCİDEN geliyor, dolayısıyla sahipliği burada doğrulanmak zorunda.
        // Ön ek kontrolü olmasaydı kullanıcı A, kullanıcı B'nin yüklediği nesneyi kendi
        // profiline bağlayabilirdi. Aynı kontrol, keyfî bir anahtarla (ör. bir ilan
        // görseliyle) avatar oluşturmayı da engelliyor.
        if (!request.StorageKey.StartsWith(MediaRules.AvatarPrefix(userId), StringComparison.Ordinal))
        {
            throw new NotFoundException("Görsel bulunamadı.");
        }

        var validation = await UploadedImage
            .InspectAsync(storage, request.StorageKey, ContentTypeOf(request.StorageKey), cancellationToken)
            .ConfigureAwait(false);

        if (validation.Info is null)
        {
            if (validation.Discard)
            {
                await storage.DeleteAsync(request.StorageKey, cancellationToken).ConfigureAwait(false);
            }

            logger.LogWarning("user.avatar.rejected userId={UserId} reason={Reason}", userId, validation.Reason);

            throw new ConflictException(validation.Message!);
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        var previousKey = user.AvatarKey;
        user.AvatarKey = request.StorageKey;

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Eski nesne YAZDIKTAN SONRA siliniyor. Ters sırada, kayıt patlarsa kullanıcı
        // hem eski hem yeni fotoğrafını kaybederdi.
        if (previousKey is not null)
        {
            await DeleteQuietlyAsync(previousKey, userId, cancellationToken).ConfigureAwait(false);
        }

        return await GetCurrentUserQuery
            .ComposeAsync(dbContext, storage, userId, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task DeleteQuietlyAsync(string key, Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            await storage.DeleteAsync(key, cancellationToken).ConfigureAwait(false);
        }
        catch (IOException exception)
        {
            // Yalnız G/Ç hatası — `Exception` DEĞİL (CLAUDE.md #1). Yetim nesne
            // loglanıyor; kullanıcının isteği bu yüzden başarısız SAYILMIYOR, çünkü
            // istediği şey (yeni avatar) zaten oldu.
            logger.LogError(exception, "user.avatar.orphaned userId={UserId} key={Key}", userId, key);
        }
    }

    /// <summary>
    /// Beyan edilen tip anahtarın uzantısından okunuyor: uzantıyı yükleme ucu, imzalanan
    /// içerik tipinden üretti (<c>MediaRules.ExtensionOfContentType</c>). Yani buradaki
    /// değer istemcinin şimdi söylediği değil, imza anında söylediği şey.
    /// </summary>
    private static string ContentTypeOf(string storageKey) => Path.GetExtension(storageKey) switch
    {
        ".jpg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        _ => "application/octet-stream",
    };
}
