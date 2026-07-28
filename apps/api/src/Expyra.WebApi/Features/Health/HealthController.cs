using MediatR;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Health.Queries.GetHealth;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Health;

/// <summary>
/// REFERANS CONTROLLER — controller'lar feature klasöründe durur, tek bir
/// dev "Controllers/" çöplüğünde değil.
/// </summary>
[Route("api/health")]
public sealed class HealthController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<HealthResponse>> Get(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetHealthQuery(), cancellationToken);
        return result.DatabaseReachable ? Ok(result) : StatusCode(StatusCodes.Status503ServiceUnavailable, result);
    }
}
