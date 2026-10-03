using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Expyra.Application.Features.Auth;
using Expyra.Application.Features.Auth.Commands.RefreshSession;
using Expyra.Application.Features.Auth.Commands.RequestLoginCode;
using Expyra.Application.Features.Auth.Commands.SignOut;
using Expyra.Application.Features.Auth.Commands.VerifyLoginCode;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Auth;

/// <summary>
/// Şifresiz kimlik. Kayıt ve giriş TEK akış: adres → kod → oturum.
///
/// <para>API cookie BİLMEZ — token'lar JSON gövdede döner, <c>httpOnly</c> çerezleri
/// Next sunucusu (BFF) yazar. Ambient credential olmadığı için bu uçlar yapısal
/// olarak CSRF'e kapalı ve Faz 9'daki Expo aynı sözleşmeyi kullanıyor.</para>
/// </summary>
[Route("api/auth")]
[EnableRateLimiting(RateLimiterExtensions.AuthPolicy)]
// [AllowAnonymous] sınıfta DEĞİL, eylemlerde: sınıf düzeyinde olsaydı /me üzerindeki
// [Authorize]'ı da ezerdi (AllowAnonymous her yetki kontrolünü atlatır).
public sealed class AuthController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Kod iste. Adres kayıtlı olsun olmasın YANIT AYNI (202, aynı gövde şekli) —
    /// fark yaratmak enumeration oracle'ı kurar.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("request-code")]
    [ProducesResponseType<RequestLoginCodeResponse>(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RequestLoginCodeResponse>> RequestCode(
        RequestLoginCodeCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Accepted(result);
    }

    /// <summary>
    /// Kodu doğrula, oturumu aç. İstekte E-POSTA ALANI YOK (CLAUDE.md #3): adres
    /// sunucudaki challenge satırından okunur.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("verify-code")]
    [ProducesResponseType<AuthTokensResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthTokensResponse>> VerifyCode(
        VerifyLoginCodeCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType<AuthTokensResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuthTokensResponse>> Refresh(
        RefreshSessionCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>Bilinmeyen/süresi geçmiş token da 204 — idempotent, oracle üretmiyor.</summary>
    [AllowAnonymous]
    [HttpPost("sign-out")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SignOutSession(
        SignOutCommand command,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Token'sız istek 401 + ProblemDetails gövdesi döner — gövdeyi
    /// <c>UseStatusCodePages()</c> yazıyor, o olmadan boş gelir.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserResponse>> Me(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCurrentUserQuery(), cancellationToken);
        return Ok(result);
    }
}
