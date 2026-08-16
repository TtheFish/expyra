using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Auth;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Identity;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Auth.Commands.VerifyLoginCode;

/// <summary>
/// Kodu doğrula ve oturumu aç. E-POSTA ALANI YOK (CLAUDE.md #3): adres sunucudaki
/// challenge satırından okunur, istemci "hangi hesaba giriyorum" diyemez.
/// </summary>
public sealed record VerifyLoginCodeCommand(Guid ChallengeId, string Code)
    : IRequest<AuthTokensResponse>;

/// <summary>
/// Reddetme sebebi. İlk dördü (NotFound/Expired/Consumed/Superseded) ve WrongCode
/// dışarıya AYNI mesajı ve AYNI 400'ü döndürür — ayrım yalnız log'a gider. Farklı
/// mesaj, "bu e-posta için aktif kod var mı" oracle'ı kurar.
/// </summary>
internal enum LoginCodeVerdict
{
    Valid,
    NotFound,
    Expired,
    Consumed,
    Superseded,
    WrongCode,
    Burned,
}

internal sealed class VerifyLoginCodeCommandHandler(
    IAppDbContext dbContext,
    IDateTimeProvider dateTimeProvider,
    IClientContext clientContext,
    ILoginCodeHasher codeHasher,
    ITokenService tokenService,
    AuthOptions options,
    ILogger<VerifyLoginCodeCommandHandler> logger)
    : IRequestHandler<VerifyLoginCodeCommand, AuthTokensResponse>
{
    private const string InvalidCodeMessage = "Kod geçersiz veya süresi dolmuş.";
    private const string SuspendedMessage = "Bu hesap askıya alındı. destek@expyra.com";

    public async Task<AuthTokensResponse> Handle(
        VerifyLoginCodeCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var now = dateTimeProvider.UtcNow;

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        // Satır DAİMA id ile çekilir: "WHERE code_hash = @h" yazılırsa kod, tüm hesaplar
        // için global bir arama anahtarına döner. FOR UPDATE iki paralel doğrulamadan
        // yalnız birinin kazanmasını sağlar (CLAUDE.md #5).
        //
        // Burada advisory lock ALINMIYOR: request-code önce advisory sonra satır kilidi
        // alıyor; burada ters sırada alsaydık iki akış klasik ABBA kilitlenmesine girerdi.
        // "Aynı anda en fazla 1 Pending kod" değişmezi zaten aynı adres için iki
        // eşzamanlı geçerli doğrulamayı imkânsız kılıyor.
        var loginCode = await dbContext
            .FindForUpdateAsync<LoginCode>(request.ChallengeId, cancellationToken)
            .ConfigureAwait(false);

        var codeMatches = loginCode is not null
            && codeHasher.Verify(loginCode.Id, request.Code, loginCode.CodeHash);

        var verdict = Evaluate(loginCode, codeMatches, now, options.MaxAttempts);

        if (verdict != LoginCodeVerdict.Valid)
        {
            // Reddetme yolu önce yazıp COMMIT etmek zorunda; fırlatılacak istisnayı
            // döndürüyor ki akışın burada bittiği derleyiciye de görünsün.
            throw await BuildRejectionAsync(
                loginCode, verdict, request.ChallengeId, now, transaction, cancellationToken)
                .ConfigureAwait(false);
        }

        // Buradan sonrası: kod doğru ve satır kullanılabilir durumdaydı.
        loginCode!.Status = LoginCodeStatus.Consumed;
        loginCode.ClosedAtUtc = now;

        var normalizedEmail = loginCode.NormalizedEmail;

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken)
            .ConfigureAwait(false);

        var isNewAccount = user is null;

        if (user is null)
        {
            user = new User
            {
                Email = loginCode.EmailDisplay,
                NormalizedEmail = normalizedEmail,
                // "Doğrulanmamış kullanıcı" durumu YOK: satır ancak posta kutusu
                // sahipliği kanıtlandığında doğuyor.
                EmailVerifiedAtUtc = now,
                // Hesabın ilk dili kodun İSTENDİĞİ andaki dilden tohumlanır
                // (docs/I18N.md §2) — kullanıcı henüz hiçbir şey seçmedi.
                PreferredLanguage = loginCode.Language,
                LastLoginAtUtc = now,
            };

            dbContext.Users.Add(user);
        }
        else if (user.Status != UserStatus.Active)
        {
            // VISION §9: ban kontrolü token ÜRETİLMEDEN önce. Kod tüketilmiş olarak
            // kapanıyor — doğru kod girildi, ikinci kez kullanılamamalı. Bu yüzden
            // önce COMMIT, sonra 403. Sızıntı yok: ban ancak posta kutusu sahipliği
            // kanıtlandıktan sonra görünüyor.
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            logger.LogWarning(
                "auth.verify.blocked userId={UserId} status={Status}", user.Id, user.Status);

            throw new ForbiddenException(SuspendedMessage);
        }
        else
        {
            // Token yenilemede DEĞİL, yalnız burada güncellenir.
            user.LastLoginAtUtc = now;
            user.EmailVerifiedAtUtc ??= now;
        }

        var refreshMaterial = tokenService.CreateRefreshToken();
        var refreshTokenId = Guid.CreateVersion7();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = refreshTokenId,
            UserId = user.Id,
            TokenHash = refreshMaterial.TokenHash,
            // İlk token'da aile kendisidir; rotasyon bu değeri kopyalayarak ilerler.
            FamilyId = refreshTokenId,
            ExpiresAtUtc = refreshMaterial.ExpiresAtUtc,
            AbsoluteExpiresAtUtc = refreshMaterial.AbsoluteExpiresAtUtc,
            CreatedByIp = clientContext.IpPrefix,
        });

        var accessToken = tokenService.CreateAccessToken(user.Id);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return new AuthTokensResponse(
            accessToken.Value,
            accessToken.ExpiresAtUtc,
            refreshMaterial.Value,
            refreshMaterial.ExpiresAtUtc,
            isNewAccount);
    }

    /// <summary>
    /// Kararın tamamı: DB görmez, saf. Yedi sonucun hepsi DB'siz test edilebilir.
    /// </summary>
    internal static LoginCodeVerdict Evaluate(
        LoginCode? loginCode,
        bool codeMatches,
        DateTimeOffset now,
        int maxAttempts)
    {
        if (loginCode is null)
        {
            return LoginCodeVerdict.NotFound;
        }

        if (loginCode.Status == LoginCodeStatus.Consumed)
        {
            return LoginCodeVerdict.Consumed;
        }

        if (loginCode.Status == LoginCodeStatus.Superseded)
        {
            return LoginCodeVerdict.Superseded;
        }

        // Yanmış kod DOĞRU kod gelse bile kabul edilmez — sıra bu yüzden önemli.
        if (loginCode.Status == LoginCodeStatus.Burned || loginCode.AttemptCount >= maxAttempts)
        {
            return LoginCodeVerdict.Burned;
        }

        // Süre dolumu ayrı bir durum değil, expires_at_utc'den türetiliyor.
        if (now >= loginCode.ExpiresAtUtc)
        {
            return LoginCodeVerdict.Expired;
        }

        return codeMatches ? LoginCodeVerdict.Valid : LoginCodeVerdict.WrongCode;
    }

    /// <summary>
    /// Deneme sayacını yazar, COMMIT eder ve çağıranın fırlatacağı istisnayı üretir.
    /// </summary>
    private async Task<AppException> BuildRejectionAsync(
        LoginCode? loginCode,
        LoginCodeVerdict verdict,
        Guid challengeId,
        DateTimeOffset now,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var burnedNow = false;

        if (verdict == LoginCodeVerdict.WrongCode)
        {
            loginCode!.AttemptCount++;
            burnedNow = loginCode.AttemptCount >= options.MaxAttempts;

            if (burnedNow)
            {
                loginCode.Status = LoginCodeStatus.Burned;
                loginCode.ClosedAtUtc = now;
            }

            // Sayaç COMMIT edilmeden fırlatırsak rollback denemeyi geri alır ve
            // kaba kuvvet bedavaya gelir.
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
        }

        // Sebep YALNIZ log'a. Kod hiçbir koşulda loglanmaz.
        // Guard, enum'un boxing'ini log seviyesi kapalıyken hiç yapmamak için (CA1873).
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation(
                "auth.verify.rejected challengeId={ChallengeId} reason={Reason}", challengeId, verdict);
        }

        if (verdict == LoginCodeVerdict.Burned || burnedNow)
        {
            return new TooManyRequestsException(
                "Çok fazla hatalı deneme. Yeni kod iste.", ResendLowerBound(loginCode, now));
        }

        return new BadRequestException(InvalidCodeMessage);
    }

    /// <summary>
    /// Retry-After için ALT SINIR. Gerçek "yeni kod isteyebilirsin" anını request-code
    /// ucu hesaplıyor (saat içindeki kod sayısına göre 60/120/300); burada ikinci bir
    /// sorgu açmıyoruz.
    /// </summary>
    private TimeSpan ResendLowerBound(LoginCode? loginCode, DateTimeOffset now)
    {
        var earliest = (loginCode?.CreatedAtUtc ?? now) + options.ResendIntervalFor(1);
        var remaining = earliest - now;
        return remaining > TimeSpan.Zero ? remaining : TimeSpan.FromSeconds(1);
    }
}
