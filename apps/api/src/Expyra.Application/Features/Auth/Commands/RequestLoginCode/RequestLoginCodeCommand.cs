using System.Net;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Auth;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Identity;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Auth.Commands.RequestLoginCode;

/// <summary>
/// Kod iste. Kayıt ve giriş TEK akış olduğu için bu yolda <c>app_user</c> tablosuna
/// HİÇ bakılmaz: hesap araması yapmamak enumeration'ı, "10 milyon boş kullanıcı satırı"
/// saldırısını ve zamanlama sızıntısını aynı anda kapatır.
/// </summary>
public sealed record RequestLoginCodeCommand(string Email, string? PreferredLanguage)
    : IRequest<RequestLoginCodeResponse>;

/// <param name="ChallengeId">
/// Yanıtta dönmesi sızıntı değil: isteği yapan tarafa dönüyor ve Guid v7'nin 74 bit
/// rastgeleliği tahmin edilemez. Web tarafı bunu tarayıcı JS'ine asla vermez.
/// </param>
/// <param name="ResendAvailableAtUtc">
/// Geri sayımın OTORİTESİ sunucudur. İstemcide 60'tan geri saymak yanlış: sekme
/// uyuyunca zamanlayıcı kısılır, yenilemede sıfırlanır ve buton erken açılıp 429 yer.
/// </param>
public sealed record RequestLoginCodeResponse(
    Guid ChallengeId,
    DateTimeOffset ExpiresAtUtc,
    DateTimeOffset ResendAvailableAtUtc,
    int CodeLength);

/// <summary>
/// Hız sınırı penceresindeki tek satır. Sayaçlar <c>login_code</c> tablosundan okunuyor —
/// ayrı bir throttle tablosu YOK (<c>ix_login_code_email_created</c> ve
/// <c>ix_login_code_ip_created</c> tam olarak bunun için var).
/// </summary>
internal sealed record LoginCodeWindowRow(
    Guid Id,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    LoginCodeStatus Status,
    int AttemptCount,
    bool MatchesEmail,
    bool MatchesIp)
{
    /// <summary>Domain'deki <see cref="LoginCode.IsUsable"/> ile aynı kural.</summary>
    public bool IsUsable(DateTimeOffset now, int maxAttempts)
        => Status == LoginCodeStatus.Pending && AttemptCount < maxAttempts && now < ExpiresAtUtc;
}

internal enum LoginCodeThrottleOutcome
{
    /// <summary>Yeni kod üret, mail gönder.</summary>
    Issue,

    /// <summary>Aralık içi: yeni kod ÜRETME, mail GÖNDERME, mevcut challenge'ı dön.</summary>
    ReturnExisting,

    /// <summary>Saatlik/günlük kota doldu → 429.</summary>
    RateLimited,
}

internal sealed record LoginCodeThrottleDecision(
    LoginCodeThrottleOutcome Outcome,
    DateTimeOffset ResendAvailableAtUtc,
    Guid? ExistingChallengeId,
    DateTimeOffset? ExistingExpiresAtUtc,
    TimeSpan? RetryAfter);

internal sealed class RequestLoginCodeCommandHandler(
    IAppDbContext dbContext,
    IDateTimeProvider dateTimeProvider,
    IClientContext clientContext,
    ILoginCodeGenerator codeGenerator,
    ILoginCodeHasher codeHasher,
    ILoginCodeEmailComposer emailComposer,
    IEmailSender emailSender,
    AuthOptions options,
    ILogger<RequestLoginCodeCommandHandler> logger)
    : IRequestHandler<RequestLoginCodeCommand, RequestLoginCodeResponse>
{
    public async Task<RequestLoginCodeResponse> Handle(
        RequestLoginCodeCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Validator biçimi zaten doğruladı; buradaki ikinci geçişin işi normalize
        // edilmiş hâli üretmek — tekilliğin ve tüm aramaların tek anahtarı bu.
        if (!EmailAddress.TryNormalize(request.Email, out var normalizedEmail))
        {
            throw new BadRequestException("Geçerli bir e-posta adresi gir.");
        }

        var now = dateTimeProvider.UtcNow;
        var ip = clientContext.IpPrefix;

        string code;
        LoginCode loginCode;
        DateTimeOffset resendAvailableAtUtc;

        await using (var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false))
        {
            // Aynı adres için eşzamanlı iki istek yoksa ikisi de "bekleyen kod yok"
            // görür ve ux_login_code_pending 23505 ile patlar. Kilit transaction
            // bitince kendiliğinden bırakılır.
            await dbContext
                .AcquireAdvisoryLockAsync(AdvisoryLockKey(normalizedEmail), cancellationToken)
                .ConfigureAwait(false);

            var window = await LoadWindowAsync(normalizedEmail, ip, now, cancellationToken)
                .ConfigureAwait(false);

            var decision = EvaluateThrottle(window, now, options);

            if (decision.Outcome == LoginCodeThrottleOutcome.RateLimited)
            {
                // Hiçbir şey yazmadık; transaction rollback ile kapanacak.
                throw new TooManyRequestsException(
                    "Çok fazla kod istendi. Bir süre sonra tekrar dene.",
                    decision.RetryAfter ?? TimeSpan.FromSeconds(options.ResendIntervalTier3Seconds));
            }

            if (decision.Outcome == LoginCodeThrottleOutcome.ReturnExisting)
            {
                // Aralık içindeki ikinci istek YENİ KOD ÜRETMEZ ve MAİL GÖNDERMEZ:
                // aynı challenge geri döner (idempotency — ROADMAP 6.8 dersi).
                return new RequestLoginCodeResponse(
                    decision.ExistingChallengeId!.Value,
                    decision.ExistingExpiresAtUtc!.Value,
                    decision.ResendAvailableAtUtc,
                    options.Digits);
            }

            await SupersedePendingAsync(normalizedEmail, now, cancellationToken).ConfigureAwait(false);

            var language = await ResolveLanguageAsync(request.PreferredLanguage, cancellationToken)
                .ConfigureAwait(false);

            // Id önce üretiliyor çünkü hash'in tuzu o: HMAC girdisi "{Id:N}:{code}".
            var challengeId = Guid.CreateVersion7();
            code = codeGenerator.Generate(options.Digits);

            loginCode = new LoginCode
            {
                Id = challengeId,
                NormalizedEmail = normalizedEmail,
                EmailDisplay = request.Email.Trim(),
                CodeHash = codeHasher.Hash(challengeId, code),
                ExpiresAtUtc = now + options.CodeLifetime,
                Language = language,
                RequestIp = ip,
            };

            dbContext.LoginCodes.Add(loginCode);
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            resendAvailableAtUtc = decision.ResendAvailableAtUtc;
        }

        // Mail COMMIT'TEN SONRA. Önce gönderirsek transaction düştüğünde kullanıcıya
        // var olmayan bir kod gitmiş olur; sonra gönderdiğimizde ise gönderim patlarsa
        // kullanıcı 500 alır ve yeniden gönderme aralığını beklemek zorunda kalır —
        // bilinçli bedel, outbox Faz 7.4'te kapatıyor (Riskler §4).
        var message = emailComposer.Compose(
            loginCode.EmailDisplay, code, loginCode.Language, options.CodeLifetime);

        try
        {
            await emailSender.SendAsync(message, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            // Hata YUTULMUYOR (CLAUDE.md #1) — yalnızca adlandırılıp yeniden fırlatılıyor;
            // alarm kuralının bağlandığı olay bu. Kod ASLA log'a girmez.
            logger.LogError(exception, "auth.email.failed challengeId={ChallengeId}", loginCode.Id);
            throw;
        }

        return new RequestLoginCodeResponse(
            loginCode.Id,
            loginCode.ExpiresAtUtc,
            resendAvailableAtUtc,
            options.Digits);
    }

    /// <summary>
    /// Hız sınırı + yeniden gönderme kararı. DbSet görmez, <see cref="IReadOnlyList{T}"/>
    /// alır — DB'siz test edilebilir (GetLanguagesQueryHandler.Project ile aynı disiplin).
    /// </summary>
    internal static LoginCodeThrottleDecision EvaluateThrottle(
        IReadOnlyList<LoginCodeWindowRow> window,
        DateTimeOffset now,
        AuthOptions authOptions)
    {
        ArgumentNullException.ThrowIfNull(window);
        ArgumentNullException.ThrowIfNull(authOptions);

        var hourStart = now - TimeSpan.FromHours(1);
        var dayStart = now - TimeSpan.FromDays(1);

        var emailHour = 0;
        var emailDay = 0;
        var ipHour = 0;
        var ipDay = 0;
        DateTimeOffset? oldestEmailHour = null;
        DateTimeOffset? oldestEmailDay = null;
        DateTimeOffset? oldestIpHour = null;
        DateTimeOffset? oldestIpDay = null;
        LoginCodeWindowRow? newestForEmail = null;

        foreach (var row in window)
        {
            if (row.CreatedAtUtc < dayStart)
            {
                continue;
            }

            var inHour = row.CreatedAtUtc >= hourStart;

            if (row.MatchesEmail)
            {
                emailDay++;
                oldestEmailDay = Earliest(oldestEmailDay, row.CreatedAtUtc);

                if (inHour)
                {
                    emailHour++;
                    oldestEmailHour = Earliest(oldestEmailHour, row.CreatedAtUtc);
                }

                if (newestForEmail is null || row.CreatedAtUtc > newestForEmail.CreatedAtUtc)
                {
                    newestForEmail = row;
                }
            }

            if (row.MatchesIp)
            {
                ipDay++;
                oldestIpDay = Earliest(oldestIpDay, row.CreatedAtUtc);

                if (inHour)
                {
                    ipHour++;
                    oldestIpHour = Earliest(oldestIpHour, row.CreatedAtUtc);
                }
            }
        }

        // Sıra: en dar pencere önce, kullanıcıya en kısa Retry-After'ı verelim.
        var exceeded =
            Exceeded(emailHour, authOptions.MaxCodesPerEmailPerHour, oldestEmailHour, TimeSpan.FromHours(1), now)
            ?? Exceeded(emailDay, authOptions.MaxCodesPerEmailPerDay, oldestEmailDay, TimeSpan.FromDays(1), now)
            ?? Exceeded(ipHour, authOptions.MaxCodesPerIpPerHour, oldestIpHour, TimeSpan.FromHours(1), now)
            ?? Exceeded(ipDay, authOptions.MaxCodesPerIpPerDay, oldestIpDay, TimeSpan.FromDays(1), now);

        if (exceeded is { } retryAfter)
        {
            return new LoginCodeThrottleDecision(
                LoginCodeThrottleOutcome.RateLimited, now + retryAfter, null, null, retryAfter);
        }

        if (newestForEmail is not null)
        {
            var resendAt = newestForEmail.CreatedAtUtc + authOptions.ResendIntervalFor(emailHour);

            // Aralık kuralı YALNIZ hâlâ kullanılabilir bir kod varsa uygulanır.
            // Yanmış ya da tüketilmiş bir challenge'ı geri döndürmek kullanıcıyı
            // "yeni kod iste" yönergesinin içinde kilitler.
            if (now < resendAt && newestForEmail.IsUsable(now, authOptions.MaxAttempts))
            {
                return new LoginCodeThrottleDecision(
                    LoginCodeThrottleOutcome.ReturnExisting,
                    resendAt,
                    newestForEmail.Id,
                    newestForEmail.ExpiresAtUtc,
                    null);
            }
        }

        // Yeni kod üretilecek: aralık ÜRETİMDEN SONRAKİ sayıya göre uzar (60 → 120 → 300).
        return new LoginCodeThrottleDecision(
            LoginCodeThrottleOutcome.Issue,
            now + authOptions.ResendIntervalFor(emailHour + 1),
            null,
            null,
            null);

        static DateTimeOffset Earliest(DateTimeOffset? current, DateTimeOffset candidate)
            => current is null || candidate < current.Value ? candidate : current.Value;

        static TimeSpan? Exceeded(
            int count, int max, DateTimeOffset? oldest, TimeSpan windowLength, DateTimeOffset at)
        {
            if (count < max || oldest is null)
            {
                return null;
            }

            // En eski satır pencereden düşünce yeniden hak doğar.
            var remaining = oldest.Value + windowLength - at;
            return remaining > TimeSpan.Zero ? remaining : TimeSpan.FromSeconds(1);
        }
    }

    private static string AdvisoryLockKey(string normalizedEmail)
        => $"auth:login-code:{normalizedEmail}";

    private async Task<IReadOnlyList<LoginCodeWindowRow>> LoadWindowAsync(
        string normalizedEmail,
        IPAddress? ip,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var since = now - TimeSpan.FromDays(1);
        var ipKnown = ip is not null;

        var query = dbContext.LoginCodes.AsNoTracking().Where(x => x.CreatedAtUtc >= since);

        // IP güvenilir değilse (TrustedProxies yapılandırılmamış) IP sayaçları devre
        // dışı: yanlış güven vermektense e-posta sayaçlarıyla yetiniyoruz (Riskler §5).
        query = ipKnown
            ? query.Where(x => x.NormalizedEmail == normalizedEmail || x.RequestIp == ip)
            : query.Where(x => x.NormalizedEmail == normalizedEmail);

        return await query
            .Select(x => new LoginCodeWindowRow(
                x.Id,
                x.CreatedAtUtc,
                x.ExpiresAtUtc,
                x.Status,
                x.AttemptCount,
                x.NormalizedEmail == normalizedEmail,
                ipKnown && x.RequestIp == ip))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task SupersedePendingAsync(
        string normalizedEmail,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        // KOŞULSUZ: süresi geçmiş bir Pending satır bırakılırsa kısmi unique index
        // (ux_login_code_pending) yeni kod istemeyi bloke eder. Satırlar SİLİNMİYOR —
        // hacim sinyali hız sınırı sayaçları için korunuyor.
        var pending = await dbContext.LoginCodes
            .Where(x => x.NormalizedEmail == normalizedEmail && x.Status == LoginCodeStatus.Pending)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (pending.Count == 0)
        {
            return;
        }

        foreach (var row in pending)
        {
            row.Status = LoginCodeStatus.Superseded;
            row.ClosedAtUtc = now;
        }

        // Ayrı SaveChanges: tek batch'te EF, INSERT'i UPDATE'ten önce sıralayabilir
        // ve unique index o an iki Pending satır görür.
        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Zincir: istek → Accept-Language → <c>en</c> (docs/I18N.md §2). Her aday
    /// <c>ui_available = true</c> listesine karşı DOĞRULANIR; doğrulanmayan kod
    /// <c>login_code.language</c>'a yazılmaz (FK'yı kırar ve şablonu bilinmeyen
    /// bir dile sokar).
    /// </summary>
    private async Task<string?> ResolveLanguageAsync(
        string? preferredLanguage,
        CancellationToken cancellationToken)
    {
        var candidates = new List<string>(capacity: 4);
        AddCandidate(candidates, preferredLanguage);

        foreach (var tag in clientContext.AcceptedLanguages)
        {
            AddCandidate(candidates, tag);
        }

        AddCandidate(candidates, options.FallbackLanguage);

        if (candidates.Count == 0)
        {
            return null;
        }

        var available = await dbContext.Languages.AsNoTracking()
            .Where(x => x.UiAvailable && candidates.Contains(x.Code))
            .Select(x => x.Code)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return candidates.FirstOrDefault(x => available.Contains(x, StringComparer.Ordinal));
    }

    private static void AddCandidate(List<string> target, string? raw)
    {
        if (!LanguageCode.TryNormalize(raw, out var normalized))
        {
            return;
        }

        if (!target.Contains(normalized, StringComparer.Ordinal))
        {
            target.Add(normalized);
        }

        // Bölgeli koddan köke in: arayüzde de-AT yoksa de denenir.
        var baseLanguage = LanguageCode.BaseLanguageOf(normalized);
        if (baseLanguage is not null && !target.Contains(baseLanguage, StringComparer.Ordinal))
        {
            target.Add(baseLanguage);
        }
    }
}
