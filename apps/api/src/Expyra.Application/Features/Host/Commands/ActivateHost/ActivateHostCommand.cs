using MediatR;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Host.Commands.ActivateHost;

/// <summary>
/// "Host ol". ONAY SÜRECİ YOK (VISION §9): kullanıcı der, olur. Bu uç bir başvuru
/// değil, anahtar teslimi — elle moderasyon kapısı bilinçli olarak kurulmuyor.
///
/// <para>ALAN YOK ve olmayacak: kime rol verileceği token'dan okunur (CLAUDE.md #3).
/// Gövdeye bir <c>UserId</c> konsaydı bu uç "başkasını host yap" ucuna dönerdi.</para>
/// </summary>
public sealed record ActivateHostCommand : IRequest<ActivateHostResponse>;

/// <summary>
/// <b>Geçiş sorununun çözümü burada.</b> Rol claim'i access token'a yazılıyor; kullanıcı
/// "host ol" dedikten sonra elindeki token hâlâ ROLSÜZ ve süresi dolana kadar (15 dk)
/// host uçlarına giremezdi. Bu yüzden yanıt YENİ bir access token taşıyor: istemci
/// (Next BFF) çerezi bu değerle tazeliyor ve bir sonraki istek zaten rollü gidiyor.
///
/// <para><b>Neden refresh rotasyonu tetiklenmiyor:</b> refresh token'ın içinde rol yok,
/// dolayısıyla yenilenmesi gereken bir şey de yok — <c>RefreshSessionCommand</c> rolleri
/// her rotasyonda veritabanından TAZE okuyor. Rotasyon istemek bu ucun gövdesine refresh
/// token'ı da koymayı ve iptal/yeniden-kullanım mantığını ikinci bir yerde tekrar etmeyi
/// gerektirirdi. Eski access token 15 dk daha geçerli kalıyor ama TAŞIDIĞI YETKİ DAHA AZ;
/// güvenlik açısından zararsız yön.</para>
///
/// <para>Refresh token bilinçli olarak DÖNMÜYOR: dönseydi istemci onu da yazmak zorunda
/// kalır ve yazmayı atlayan bir istemci kendi oturumunu düşürürdü.</para>
/// </summary>
/// <param name="IsHost">
/// Yanıt 200 ise daima <c>true</c>. Sabit görünen bu alan sözleşmenin kendisi: istemci
/// "çağrı başarılı" ile "artık host" arasında çıkarım yapmak zorunda kalmıyor.
/// </param>
public sealed record ActivateHostResponse(
    bool IsHost,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAtUtc);

/// <summary>
/// Saf karar. Üç sonuç da veritabanı görmeden test edilebiliyor
/// (<c>LoginCodeVerdict</c> ve <c>RefreshRotationDecision</c> ile aynı disiplin).
/// </summary>
internal enum HostActivationDecision
{
    /// <summary>Rol yok, verilecek.</summary>
    Grant,

    /// <summary>Zaten host — yazma yok, yanıt yine 200 (idempotent).</summary>
    AlreadyHost,

    /// <summary>Hesap Active değil: 403. Onay kapısı yok ama ban var (VISION §9).</summary>
    Blocked,
}

internal sealed class ActivateHostCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    ITokenService tokenService,
    ILogger<ActivateHostCommandHandler> logger)
    : IRequestHandler<ActivateHostCommand, ActivateHostResponse>
{
    private const string SuspendedMessage = "Bu hesap askıya alındı. destek@expyra.com";

    public async Task<ActivateHostResponse> Handle(
        ActivateHostCommand request,
        CancellationToken cancellationToken)
    {
        // Kimlik EN BAŞTA ve istisnası YAKALANMIYOR (CLAUDE.md #1): kimliksiz istek
        // 401 dönmeli, "host oldun" değil.
        var userId = currentUser.RequireUserId();

        // roles sütununda OKU-DEĞİŞTİR-YAZ yapılıyor, o yüzden transaction + FOR UPDATE
        // (CLAUDE.md #5). Bugün iki eşzamanlı activate çağrısı zaten aynı sonuca
        // yakınsıyor — ikisi de {Host} yazar — ama sütuna İKİNCİ bir rol yazan uç
        // eklendiği gün (Admin) kilitsiz hâli sessizce rol kaybettirirdi: A boş diziyi
        // okur {Host} yazar, B aynı boş diziyi okur {Admin} yazar ve Host uçar.
        // Ömürde bir kez çağrılan bir uçta bir satır kilidi bedava.
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var user = await dbContext
            .FindForUpdateAsync<User>(userId, cancellationToken)
            .ConfigureAwait(false);

        // Token imzası geçerli ama satır yok: hesap silinmiş ya da token başka bir
        // veritabanına ait. GetCurrentUserQueryHandler ile aynı karar.
        if (user is null)
        {
            throw new UnauthorizedException();
        }

        var decision = Decide(user);

        if (decision == HostActivationDecision.Blocked)
        {
            logger.LogWarning(
                "host.activate.blocked userId={UserId} status={Status}", user.Id, user.Status);

            throw new ForbiddenException(SuspendedMessage);
        }

        if (decision == HostActivationDecision.Grant)
        {
            user.Roles.Add(UserRole.Host);
            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            logger.LogInformation("host.activate.granted userId={UserId}", user.Id);
        }

        // AlreadyHost yolunda da COMMIT ediliyor: yazılacak bir şey yok ama satır
        // kilidini burada bırakmak gerekiyor.
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        // Token COMMIT'ten SONRA üretiliyor: transaction geri alınsaydı elde rolü
        // olmayan bir kullanıcı için rollü token kalırdı.
        var accessToken = tokenService.CreateAccessToken(user.Id, user.Roles);

        return new ActivateHostResponse(true, accessToken.Value, accessToken.ExpiresAtUtc);
    }

    /// <summary>
    /// Kararın tamamı: DB görmez, saf.
    ///
    /// <para>SIRA ÖNEMLİ: durum kontrolü rol kontrolünden ÖNCE. Ters sırada, askıya
    /// alınmış bir host "zaten host" diye 200 alır ve elinde taze rollü bir token
    /// bulurdu — ban token üretilmeden önce kontrol edilmek zorunda (VISION §9).</para>
    /// </summary>
    internal static HostActivationDecision Decide(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        if (user.Status != UserStatus.Active)
        {
            return HostActivationDecision.Blocked;
        }

        return user.HasRole(UserRole.Host)
            ? HostActivationDecision.AlreadyHost
            : HostActivationDecision.Grant;
    }
}
