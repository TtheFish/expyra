using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Auth;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Identity;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Auth.Commands.RefreshSession;

/// <summary>Oturumu yeniler: eski token iptal edilir, aynı ailede yenisi doğar.</summary>
public sealed record RefreshSessionCommand(string RefreshToken) : IRequest<AuthTokensResponse>;

/// <summary>
/// Yenileme kararı. Saf fonksiyon <see cref="RefreshSessionCommandHandler.DecideRotation"/>
/// üretir — grace penceresi mantığı DB'siz test edilebilsin diye.
/// </summary>
internal enum RefreshRotationDecision
{
    /// <summary>Token bulunamadı / süresi geçmiş / mutlak tavan aşılmış → 401.</summary>
    Invalid,

    Rotate,

    /// <summary>Ailenin tamamı iptal + Error log + alarm.</summary>
    ReuseDetected,
}

internal sealed class RefreshSessionCommandHandler(
    IAppDbContext dbContext,
    IDateTimeProvider dateTimeProvider,
    IClientContext clientContext,
    ITokenService tokenService,
    AuthOptions options,
    ILogger<RefreshSessionCommandHandler> logger)
    : IRequestHandler<RefreshSessionCommand, AuthTokensResponse>
{
    private const string InvalidSessionMessage = "Oturum geçersiz.";
    private const string SuspendedMessage = "Bu hesap askıya alındı. destek@expyra.com";

    public async Task<AuthTokensResponse> Handle(
        RefreshSessionCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var tokenHash = tokenService.HashRefreshToken(request.RefreshToken);
        var now = dateTimeProvider.UtcNow;

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        // Önce ux_refresh_token_hash ile id, sonra FOR UPDATE: iki paralel yenileme
        // aynı satırı aynı anda değiştirmeye kalkmasın (CLAUDE.md #5).
        var tokenId = await dbContext.RefreshTokens.AsNoTracking()
            .Where(x => x.TokenHash == tokenHash)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        var current = tokenId is null
            ? null
            : await dbContext.FindForUpdateAsync<RefreshToken>(tokenId.Value, cancellationToken)
                .ConfigureAwait(false);

        var decision = DecideRotation(current, now, options.RefreshGrace);

        if (decision == RefreshRotationDecision.Invalid)
        {
            throw new UnauthorizedException(InvalidSessionMessage);
        }

        // Invalid dışındaki her kararda satır kesinlikle dolu.
        var presented = current!;

        if (decision == RefreshRotationDecision.ReuseDetected)
        {
            // Hangi halkanın çalındığını bilmiyoruz; zinciri komple kesiyoruz.
            await RevokeFamilyAsync(
                presented.FamilyId, TokenRevocationReason.ReuseDetected, now, cancellationToken)
                .ConfigureAwait(false);

            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            logger.LogError(
                "auth.refresh.reuse_detected familyId={FamilyId} userId={UserId}",
                presented.FamilyId,
                presented.UserId);

            throw new UnauthorizedException(InvalidSessionMessage);
        }

        var userId = presented.UserId;

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            // FK cascade bunu normalde imkânsız kılar; olursa oturum gerçekten geçersizdir.
            throw new UnauthorizedException(InvalidSessionMessage);
        }

        if (user.Status != UserStatus.Active)
        {
            // Ban token ÜRETİLMEDEN önce: aksi halde askıya alınan hesap kendini
            // 90 güne kadar yenilemeye devam eder.
            await RevokeFamilyAsync(
                presented.FamilyId, TokenRevocationReason.AccountSuspended, now, cancellationToken)
                .ConfigureAwait(false);

            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            throw new ForbiddenException(SuspendedMessage);
        }

        // Grace penceresindeysek sunulan token ZATEN iptal edilmiş durumda; iptal anı
        // forensik kayıt, üzerine yazılmaz.
        if (presented.RevokedAtUtc is null)
        {
            presented.RevokedAtUtc = now;
            presented.RevocationReason = TokenRevocationReason.Rotated;
        }

        var material = tokenService.CreateRefreshToken();

        // Mutlak tavan KOPYALANIR, uzatılmaz. Yeni ömür tavanı aşarsa tavana kırpılır —
        // aksi halde satır gerçekte olduğundan uzun yaşıyormuş gibi görünür ve
        // istemci çerezi yanlış süreyle yazar.
        var expiresAtUtc = material.ExpiresAtUtc < presented.AbsoluteExpiresAtUtc
            ? material.ExpiresAtUtc
            : presented.AbsoluteExpiresAtUtc;

        var rotatedId = Guid.CreateVersion7();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = rotatedId,
            UserId = userId,
            TokenHash = material.TokenHash,
            FamilyId = presented.FamilyId,
            PreviousTokenId = presented.Id,
            ExpiresAtUtc = expiresAtUtc,
            AbsoluteExpiresAtUtc = presented.AbsoluteExpiresAtUtc,
            CreatedByIp = clientContext.IpPrefix,
        });

        var accessToken = tokenService.CreateAccessToken(userId);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return new AuthTokensResponse(
            accessToken.Value,
            accessToken.ExpiresAtUtc,
            material.Value,
            expiresAtUtc,
            IsNewAccount: false);
    }

    /// <summary>
    /// Saf karar: DB görmez. Grace penceresi olmadan iki paralel yenileme (mobil
    /// istemciler ve Next prefetch bunu gerçekten yapıyor) meşru kullanıcıyı KENDİ
    /// ailesini iptal ettirerek dışarı atar. Bedeli, çalınan bir token'ın 30 saniye
    /// daha geçerli kalması — "her prefetch'te rastgele çıkış" hatasından küçük.
    /// </summary>
    internal static RefreshRotationDecision DecideRotation(
        RefreshToken? token,
        DateTimeOffset now,
        TimeSpan grace)
    {
        if (token is null)
        {
            return RefreshRotationDecision.Invalid;
        }

        // Mutlak tavan her şeyin üstünde: tavanı geçmiş bir aile zaten ölü, onun için
        // reuse alarmı çalmak gürültüden başka bir şey değil.
        if (now >= token.AbsoluteExpiresAtUtc)
        {
            return RefreshRotationDecision.Invalid;
        }

        if (token.RevokedAtUtc is { } revokedAtUtc)
        {
            // Grace YALNIZ Rotated için. SignOut / ReuseDetected / AccountSuspended
            // iptalleri niyetlidir; onlara pencere açmak "çıkış yaptım" sözünü bozar.
            return token.RevocationReason == TokenRevocationReason.Rotated
                && now - revokedAtUtc <= grace
                ? RefreshRotationDecision.Rotate
                : RefreshRotationDecision.ReuseDetected;
        }

        return now >= token.ExpiresAtUtc
            ? RefreshRotationDecision.Invalid
            : RefreshRotationDecision.Rotate;
    }

    /// <summary>
    /// Aile bazlı toplu iptal — <c>ix_refresh_token_family</c> kısmi index'i tam olarak
    /// bunun için var.
    /// </summary>
    private async Task RevokeFamilyAsync(
        Guid familyId,
        TokenRevocationReason reason,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var members = await dbContext.RefreshTokens
            .Where(x => x.FamilyId == familyId && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var member in members)
        {
            member.RevokedAtUtc = now;
            member.RevocationReason = reason;
        }

        if (members.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
