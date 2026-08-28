using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Identity;

namespace Expyra.Application.Features.Auth.Commands.SignOut;

/// <summary>
/// Oturumu kapatır. Yanıt gövdesi yok (204) ve bilinmeyen/süresi geçmiş token de
/// 204 döner — idempotent. Bu HATA YUTMA değil: ortada hata yok, istenen son durum
/// zaten sağlanmış; farklı davranmak "bu token var mıydı" oracle'ı kurardı.
/// </summary>
public sealed record SignOutCommand(string RefreshToken) : IRequest;

internal sealed class SignOutCommandHandler(
    IAppDbContext dbContext,
    IDateTimeProvider dateTimeProvider,
    ITokenService tokenService)
    : IRequestHandler<SignOutCommand>
{
    public async Task Handle(SignOutCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var tokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var now = dateTimeProvider.UtcNow;

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var familyId = await dbContext.RefreshTokens.AsNoTracking()
            .Where(x => x.TokenHash == tokenHash)
            .Select(x => (Guid?)x.FamilyId)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        if (familyId is null)
        {
            return;
        }

        // Ailenin TAMAMI: grace penceresi aynı ailede kısa süreliğine iki aktif token
        // bırakabiliyor; yalnız sunulanı iptal etmek oturumu gerçekten kapatmazdı.
        var family = familyId.Value;

        var active = await dbContext.RefreshTokens
            .Where(x => x.FamilyId == family && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var member in active)
        {
            member.RevokedAtUtc = now;
            member.RevocationReason = TokenRevocationReason.SignOut;
        }

        if (active.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
    }
}
