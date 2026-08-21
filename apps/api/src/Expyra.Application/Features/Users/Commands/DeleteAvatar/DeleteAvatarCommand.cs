using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;

namespace Expyra.Application.Features.Users.Commands.DeleteAvatar;

/// <summary>
/// Profil fotoğrafını kaldırır. <b>İdempotent</b>: fotoğrafı olmayan kullanıcı için de
/// 200 — "kaldır" isteğinin ikinci kez gelmesi hata değil, istenen durum zaten sağlanmış.
/// </summary>
public sealed record DeleteAvatarCommand : IRequest<CurrentUserResponse>;

internal sealed class DeleteAvatarCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    ILogger<DeleteAvatarCommandHandler> logger)
    : IRequestHandler<DeleteAvatarCommand, CurrentUserResponse>
{
    public async Task<CurrentUserResponse> Handle(
        DeleteAvatarCommand request,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new UnauthorizedException();

        var key = user.AvatarKey;

        if (key is not null)
        {
            user.AvatarKey = null;

            // Önce sütun, sonra nesne. Ters sırada, nesne silinip kayıt yazılamazsa
            // profil var olmayan bir dosyayı gösterirdi (DeleteMediaCommand ile aynı sıra).
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            try
            {
                await storage.DeleteAsync(key, cancellationToken).ConfigureAwait(false);
            }
            catch (IOException exception)
            {
                logger.LogError(exception, "user.avatar.orphaned userId={UserId} key={Key}", userId, key);
            }
        }

        return await GetCurrentUserQuery
            .ComposeAsync(dbContext, storage, userId, cancellationToken)
            .ConfigureAwait(false);
    }
}
