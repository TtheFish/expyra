using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Places;

namespace Expyra.Application.Features.Places.Queries.GetCountries;

/// <summary>
/// Ülke kayıt defterini döner. İki tüketicisi var: şehir seçicinin ülke filtresi
/// (<c>OnlyWithCities = true</c> — arzı olmayan ülkeyi göstermenin anlamı yok) ve
/// host onboarding'inin adres alanı (hepsi).
/// </summary>
public sealed record GetCountriesQuery(bool OnlyWithCities = false)
    : IRequest<IReadOnlyList<CountryResponse>>;

/// <param name="EnglishName">
/// Gösterim adı DEĞİL. İstemci <c>Code</c>'u alıp adı <c>Intl.DisplayNames</c> ile kendi
/// dilinde çiziyor (docs/I18N.md §1, Country sınıf notu); bu alan yönetim ekranı ve
/// arayüzün henüz locale çözemediği durumlar için son çare.
/// </param>
/// <param name="CityCount">
/// Kayıt defterinde bu ülkeye bağlı şehir sayısı. Ayrı bir sütun DEĞİL, sorgudan
/// hesaplanıyor — denormalize edilseydi şehir eklendiğinde güncellenmesi gereken
/// ikinci bir yer olurdu ve bir gün ayrışırdı.
/// </param>
public sealed record CountryResponse(string Code, string EnglishName, int CityCount);

internal sealed class GetCountriesQueryHandler(IAppDbContext dbContext)
    : IRequestHandler<GetCountriesQuery, IReadOnlyList<CountryResponse>>
{
    public async Task<IReadOnlyList<CountryResponse>> Handle(
        GetCountriesQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        return await Project(dbContext.Countries.AsNoTracking(), request.OnlyWithCities)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Filtre + projeksiyon + sıralama. <c>IQueryable</c> aldığı için DB'siz test
    /// edilebiliyor — <c>GetLanguagesQueryHandler.Project</c> ile aynı kalıp.
    /// </summary>
    internal static IQueryable<CountryResponse> Project(IQueryable<Country> source, bool onlyWithCities)
    {
        var filtered = onlyWithCities
            ? source.Where(x => x.Cities.Count > 0)
            : source;

        // Sıralama İngilizce ada göre: kullanıcının dilindeki ada göre sıralamak ICU
        // collation ister ve sonuç sunucunun ayarına göre değişir (docs/I18N.md §4).
        // İstemci listeyi kendi locale'iyle yeniden sıralayabilir; sunucunun işi
        // deterministik olmak.
        return filtered
            .OrderBy(x => x.EnglishName)
            .Select(x => new CountryResponse(x.Code, x.EnglishName, x.Cities.Count));
    }
}
