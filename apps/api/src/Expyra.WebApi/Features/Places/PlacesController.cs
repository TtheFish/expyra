using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Expyra.Application.Features.Places.Queries.GetCountries;
using Expyra.Application.Features.Places.Queries.SearchCities;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Places;

/// <summary>
/// Yer kayıt defteri. Uçların tamamı ANONİM — fallback policy oturum istediği için
/// (#49) bu AÇIKÇA <c>[AllowAnonymous]</c> ile söyleniyor. Şehir seçici giriş yapmamış
/// misafirin gördüğü ilk şey; oturum istemek arama kutusunu kilitlerdi.
/// </summary>
[Route("api/places")]
[AllowAnonymous]
[EnableRateLimiting(RateLimiterExtensions.PublicPolicy)]
public sealed class PlacesController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <param name="onlyWithCities">
    /// true → yalnız kayıt defterinde şehri olan ülkeler (şehir seçicinin ülke filtresi).
    /// false → tümü (host onboarding'inin adres alanı).
    /// </param>
    [HttpGet("countries")]
    [PublicCache(
        ReferenceDataCache.RegistryMaxAgeSeconds,
        StaleWhileRevalidateSeconds = ReferenceDataCache.RegistryStaleSeconds)]
    [ProducesResponseType<IReadOnlyList<CountryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CountryResponse>>> GetCountries(
        CancellationToken cancellationToken,
        [FromQuery] bool onlyWithCities = false)
    {
        var result = await Mediator.Send(new GetCountriesQuery(onlyWithCities), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Şehir autocomplete'i. "prag", "Praha", "Prague" aynı satırı döndürür.
    /// En fazla <see cref="SearchCitiesQuery.MaxResults"/> satır — bu bir sayfalama değil,
    /// autocomplete tavanı.
    /// </summary>
    /// <param name="q">Aranan metin. Katlandıktan sonra en az 2 harf kalmalı, yoksa 400.</param>
    /// <param name="country">ISO 3166-1 alpha-2 filtresi. <paramref name="q"/> yoksa zorunlu.</param>
    [HttpGet("cities")]
    [PublicCache(
        ReferenceDataCache.SearchMaxAgeSeconds,
        StaleWhileRevalidateSeconds = ReferenceDataCache.SearchStaleSeconds)]
    [ProducesResponseType<IReadOnlyList<CityResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<CityResponse>>> SearchCities(
        CancellationToken cancellationToken,
        [FromQuery] string? q = null,
        [FromQuery] string? country = null)
    {
        var result = await Mediator.Send(new SearchCitiesQuery(q, country), cancellationToken);
        return Ok(result);
    }
}
