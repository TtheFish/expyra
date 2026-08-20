using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Application.Features.Users.Commands.UpdateProfile;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Users;

/// <summary>
/// Hesabın kendi profili. Kaynak adı "me" — kullanıcı id'si URL'e GİRMEZ: kimlik
/// token'dan okunuyor (CLAUDE.md #3). Yoldan okunsaydı "başkasının profilini düzenleme"
/// denemesi tek bir yetki kontrolüne bağlı kalırdı; şimdi yapısal olarak imkânsız.
///
/// <para>Okuma tarafı bilerek burada DEĞİL: <c>GET /api/auth/me</c> oturum ucudur ve
/// zaten aynı <see cref="CurrentUserResponse"/> şeklini döner. İkisi tek projeksiyonu
/// paylaşıyor, iki uç iki farklı gövde üretmiyor.</para>
/// </summary>
[Route("api/users")]
[Authorize]
public sealed class UsersController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Profili günceller ve GÜNCEL profili döner — istemcinin ardından <c>/me</c>
    /// çağırmasına gerek yok, header'daki ad aynı yanıttan tazelenir.
    /// </summary>
    /// <remarks>
    /// Gövde TAM profili taşır: gönderilmeyen alan temizlenir (bkz.
    /// <see cref="UpdateProfileCommand"/>). Bilinmeyen dil kodu 400 döner, 500 değil.
    /// </remarks>
    [HttpPatch("me")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserResponse>> UpdateMe(
        UpdateProfileCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Ok(result);
    }
}
