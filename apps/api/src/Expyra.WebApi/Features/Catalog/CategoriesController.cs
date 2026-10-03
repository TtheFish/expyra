using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Expyra.Application.Features.Catalog.Queries.GetCategories;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Catalog;

/// <summary>
/// Kategori kayıt defteri. Anonim ve önbelleklenebilir.
///
/// <para>Yanıt yalnız slug taşır; etiketler arayüz sözlüğünde (docs/I18N.md §1).
/// Buraya bir <c>name</c> alanı eklemek çeviriyi veritabanına taşımak olur.</para>
/// </summary>
[Route("api/categories")]
[AllowAnonymous]
[EnableRateLimiting(RateLimiterExtensions.PublicPolicy)]
public sealed class CategoriesController(ISender mediator) : ApiControllerBase(mediator)
{
    [HttpGet]
    [PublicCache(
        ReferenceDataCache.CatalogMaxAgeSeconds,
        StaleWhileRevalidateSeconds = ReferenceDataCache.CatalogStaleSeconds)]
    [ProducesResponseType<IReadOnlyList<CategoryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> Get(
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCategoriesQuery(), cancellationToken);
        return Ok(result);
    }
}
