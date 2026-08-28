using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Pricing.Queries.GetCurrencies;

/// <summary>
/// Para birimi kayıt defterini döner. İki tüketicisi var: host'un satış para birimini
/// seçtiği alan (Blok 5/7) ve misafirin görüntüleme para birimi seçicisi — platform
/// araya sabit bir para birimi koymuyor (VISION §9).
/// </summary>
public sealed record GetCurrenciesQuery : IRequest<IReadOnlyList<CurrencyResponse>>;

/// <param name="MinorUnits">
/// ISO 4217 üssü. <b>İstemci bunu bilmek ZORUNDA:</b> tutarlar API'de minör birim tam
/// sayısı olarak taşınacak (Blok 7) ve 15000 sayısının 150.00 mı 15000 mi olduğunu
/// söyleyen tek şey bu alan. JPY 0, KWD 3.
/// </param>
/// <param name="Symbol">
/// <c>null</c> ise ayrı bir sembol yok, kodun kendisi gösterilir. Biçimlendirme
/// <c>Intl.NumberFormat</c>'ın işi; bu alan yalnız dar yüzeyler için (docs/I18N.md §5).
/// </param>
public sealed record CurrencyResponse(string Code, string EnglishName, int MinorUnits, string? Symbol);

internal sealed class GetCurrenciesQueryHandler(IAppDbContext dbContext)
    : IRequestHandler<GetCurrenciesQuery, IReadOnlyList<CurrencyResponse>>
{
    public async Task<IReadOnlyList<CurrencyResponse>> Handle(
        GetCurrenciesQuery request,
        CancellationToken cancellationToken)
        => await Project(dbContext.Currencies.AsNoTracking())
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    // Sıralama koda göre: deterministik ve collation'dan bağımsız. Arayüz listeyi
    // kendi locale'inde yeniden sıralayabilir (Intl.DisplayNames ile ad üreterek).
    internal static IQueryable<CurrencyResponse> Project(IQueryable<Currency> source)
        => source
            .OrderBy(x => x.Code)
            .Select(x => new CurrencyResponse(x.Code, x.EnglishName, x.MinorUnits, x.Symbol));
}
