using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Expyra.Application.Features.Pricing.Queries.GetCurrencies;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Pricing;

/// <summary>
/// Para birimi kayıt defteri. Anonim ve önbelleklenebilir.
/// <c>minorUnits</c> alanı sözleşmenin kritik parçası — Blok 7'den itibaren tutarlar
/// minör birim tam sayısı olarak taşınacak.
/// </summary>
[Route("api/currencies")]
[AllowAnonymous]
[EnableRateLimiting(RateLimiterExtensions.PublicPolicy)]
public sealed class CurrenciesController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet]
    [PublicCache(
        ReferenceDataCache.RegistryMaxAgeSeconds,
        StaleWhileRevalidateSeconds = ReferenceDataCache.RegistryStaleSeconds)]
    [ProducesResponseType<IReadOnlyList<CurrencyResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CurrencyResponse>>> Get(
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCurrenciesQuery(), cancellationToken);
        return Ok(result);
    }
}
