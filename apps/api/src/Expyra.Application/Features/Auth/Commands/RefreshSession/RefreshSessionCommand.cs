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

        // Grace penceresindeki tekrarda değiştirilecek halef (varsa). Tekrar meşru
        // değilse aile iptal edilip 401 dönülüyor.
        RefreshToken? replacedSuccessor = null;

        if (presented.RevokedAtUtc is null)
        {
            presented.RevokedAtUtc = now;
            presented.RevocationReason = TokenRevocationReason.Rotated;
        }
        else if (presented.SuccessorTokenId is { } successorId)
        {
            // Grace penceresi içinde tekrar. Sunulan satır yukarıda FOR UPDATE ile
            // kilitli: eş zamanlı iki tekrar burada sıraya giriyor ve ikincisi
            // birincinin yazdığı halefi görüyor. Halef de kilitleniyor — kendi
            // rotasyonuyla yarışmasın.
            var successor = await dbContext
                .FindForUpdateAsync<RefreshToken>(successorId, cancellationToken)
                .ConfigureAwait(false);

            if (successor is null || !successor.IsActive(now))
            {
                // Halef zaten ilerlemiş (kendisi rotasyona girmiş) ya da iptal
                // edilmiş: meşru istemci artık bu token'ı sunmaz. Çalınmış halka.
                await RevokeFamilyAsync(
                    presented.FamilyId, TokenRevocationReason.ReuseDetected, now, cancellationToken)
                    .ConfigureAwait(false);

                await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

                logger.LogError(
                    "auth.refresh.reuse_detected familyId={FamilyId} userId={UserId} reason=successor_advanced",
                    presented.FamilyId,
                    presented.UserId);

                throw new UnauthorizedException(InvalidSessionMessage);
            }

            // Ham halef değeri DB'de yok (yalnız SHA-256 özeti), aynısını geri
            // veremiyoruz. Onun yerine halef DEĞİŞTİRİLİYOR: eskisi Rotated olarak
            // iptal (paralel isteğin kaybeden tarafı pencere içinde onu hâlâ
            // kullanabilir), yerine yenisi. Ailede aktif halka sayısı 1'de kalıyor.
            successor.RevokedAtUtc = now;
            successor.RevocationReason = TokenRevocationReason.Rotated;
            replacedSuccessor = successor;
        }

        // SuccessorTokenId'si boş + iptal edilmiş bir satır yalnız bu alan eklenmeden
        // ÖNCE dönmüş token olabilir; onun için eski davranış (yeni halka) korunuyor —
        // pencere 30 sn, geçiş anından sonra bu dal ölü.
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

        presented.SuccessorTokenId = rotatedId;

        // Değiştirilen halef de yenisini gösteriyor: onu taşıyan istemci pencere
        // içinde yenilerse yine TEK halef üzerinden geçer, kardeş üretmez.
        if (replacedSuccessor is not null)
        {
            replacedSuccessor.SuccessorTokenId = rotatedId;
        }

        // Roller her yenilemede DB'den TAZE okunuyor (satır yukarıda ban kontrolü için
        // zaten çekildi). İki sonucu var: host olan kullanıcı 90 gün boyunca rolünü
        // koruyor (PLAN Blok 2, kabul kriteri 4) ve rolü alınan kullanıcı en geç bir
        // yenileme sonra rolsüz kalıyor — rol geri alma ayrı bir mekanizma istemiyor.
        var accessToken = tokenService.CreateAccessToken(userId, user.Roles);

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
