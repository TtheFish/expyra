using MediatR;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Languages.Queries.GetLanguages;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Languages;

[Route("api/languages")]
public sealed class LanguagesController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <param name="onlyUiAvailable">
    /// true → sadece arayüz çevirisi tamamlanmış diller (dil seçici için).
    /// false → tümü (host'un içerik dili seçtiği alan için).
    /// </param>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<LanguageResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LanguageResponse>>> Get(
        CancellationToken cancellationToken,
        [FromQuery] bool onlyUiAvailable = false)
    {
        var result = await Mediator.Send(new GetLanguagesQuery(onlyUiAvailable), cancellationToken);
        return Ok(result);
    }
}
