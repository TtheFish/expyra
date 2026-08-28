using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Application.Features.Users.Commands.ConfirmAvatar;
using Expyra.Application.Features.Users.Commands.CreateAvatarUpload;
using Expyra.Application.Features.Users.Commands.DeleteAvatar;
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
    /// <summary>
    /// Profil fotoğrafı için imzalı adres üretir. Akış ilan görselleriyle AYNI:
    /// adres al → doğrudan depoya PUT et → onayla. Bayt bu uçtan geçmiyor.
    /// </summary>
    [HttpPost("me/avatar/upload-url")]
    [ProducesResponseType<AvatarUploadResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AvatarUploadResponse>> CreateAvatarUpload(
        CreateAvatarUploadCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Yüklemeyi doğrular ve fotoğrafı profile bağlar. Baytlar okunuyor: "image/png"
    /// diye bildirilmiş bir SVG burada reddediliyor. Güncel profili döner.
    /// </summary>
    [HttpPost("me/avatar/confirm")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CurrentUserResponse>> ConfirmAvatar(
        ConfirmAvatarCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Profil fotoğrafını kaldırır. İdempotent — fotoğrafı olmayan kullanıcı için de 200.
    /// </summary>
    [HttpDelete("me/avatar")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserResponse>> DeleteAvatar(CancellationToken cancellationToken)
    {
        // 204 DEĞİL 200: diğer profil uçlarıyla aynı şekli döndürmek, istemcinin
        // ardından /me çağırmasını gereksiz kılıyor.
        var result = await Mediator.Send(new DeleteAvatarCommand(), cancellationToken);
        return Ok(result);
    }
}
