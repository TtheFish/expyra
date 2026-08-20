using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Application.Features.Host.Queries.GetHostIdentity;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Host;

/// <summary>
/// Host tarafı. Kaynak adı "host" — kullanıcı kimliği URL'e GİRMEZ (CLAUDE.md #3).
///
/// <para>Sınıf düzeyinde <c>[Authorize]</c>: bu uçların hepsi oturum ister. Rol kapısı
/// ise uç bazında, çünkü "host ol" ucunu rol kapısının arkasına koymak — host olmak için
/// host olmayı şart koşmak — kapıyı kilitli bir odaya koymak olurdu.</para>
/// </summary>
[Route("api/host")]
[Authorize]
public sealed class HostController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Host ol. ONAY SÜRECİ YOK (VISION §9) ve İDEMPOTENT: ikinci çağrı da 200 döner,
    /// çakışma değil — arayüzdeki çift tıklama hata ekranı üretmemeli.
    /// </summary>
    /// <remarks>
    /// Yanıt YENİ bir access token taşıyor. İstemci bunu saklamazsa kullanıcı host
    /// olduğu hâlde eski (rolsüz) token'ı bitene kadar host uçlarına giremez —
    /// gerekçesi <see cref="ActivateHostResponse"/> üzerinde yazılı.
    /// </remarks>
    [HttpPost("activate")]
    [ProducesResponseType<ActivateHostResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ActivateHostResponse>> Activate(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new ActivateHostCommand(), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Kapının arkasındaki asgari uç: rol claim'i olmayan istek buraya 403 alır, token'ı
    /// olmayan 401. Blok 5 gerçek host uçlarını eklediğinde bu uç kalkar
    /// (bkz. <see cref="GetHostIdentityQuery"/>).
    /// </summary>
    [HttpGet("me")]
    [Authorize(Policy = AuthorizationPolicies.Host)]
    [ProducesResponseType<HostIdentityResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<HostIdentityResponse>> Me(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetHostIdentityQuery(), cancellationToken);
        return Ok(result);
    }
}
