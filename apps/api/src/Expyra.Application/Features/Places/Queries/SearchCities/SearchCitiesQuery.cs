using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Common;
using Expyra.Domain.Places;

namespace Expyra.Application.Features.Places.Queries.SearchCities;

/// <summary>
/// Şehir autocomplete'i. "prag", "Praha" ve "Prague" AYNI satırı döndürür —
/// eşleşme <c>city_alias</c> üzerinden, aksan ve büyük/küçük harf duyarsız
/// (<see cref="SearchText"/>).
///
/// <para><b>En az bir ölçüt zorunlu</b> ve doğrulamayı geçemeyen istek 400 alır
/// (<see cref="SearchCitiesQueryValidator"/>). Kabul kriteri 3'ün özü bu: seçilmeyen
/// ya da anlamsız bir metin sunucuda SESSİZCE yok sayılmaz — yok sayılsaydı istemci
/// "İstanbul'da ara" sanırken tüm dünyanın ilk 20 şehrini alırdı.</para>
/// </summary>
/// <param name="Query">Kullanıcının yazdığı ham metin. Katlandıktan sonra en az 2 harf kalmalı.</param>
/// <param name="Country">ISO 3166-1 alpha-2 filtresi. <c>Query</c> yoksa zorunlu.</param>
public sealed record SearchCitiesQuery(string? Query = null, string? Country = null)
    : IRequest<IReadOnlyList<CityResponse>>
{
    /// <summary>
    /// Kabul kriteri 2: uç 20 satırdan uzun cevap dönmez. Bu bir sayfalama değil,
    /// autocomplete tavanı — daha fazlasını isteyen akış (Blok 8'in arama sonuç sayfası)
    /// kendi ucunu açacak.
    /// </summary>
    public const int MaxResults = 20;

    /// <summary>
    /// Tek harflik önek her tuşta yüzlerce satır getirir ve kullanıcıya hiçbir şey
    /// söylemez. Arayüz "en az 2 harf yaz" diyor, sunucu da aynı kuralı uyguluyor.
    /// </summary>
    public const int MinQueryLength = 2;
}

public sealed record CityResponse(
    Guid Id,
    string Slug,
    string CountryCode,
    string Name,
    string EnglishName,
    string TimeZoneId,
    double Latitude,
    double Longitude);

internal sealed class SearchCitiesQueryHandler(IAppDbContext dbContext)
    : IRequestHandler<SearchCitiesQuery, IReadOnlyList<CityResponse>>
{
    public async Task<IReadOnlyList<CityResponse>> Handle(
        SearchCitiesQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var source = dbContext.Cities.AsNoTracking();

        if (CountryCode.TryNormalize(request.Country, out var country))
        {
            source = source.Where(x => x.CountryCode == country);
        }

        var prefix = SearchText.Fold(request.Query);
        if (prefix.Length > 0)
        {
            // Pattern'i elle kuruyoruz ve EF.Functions.Like kullanıyoruz: StartsWith'in
            // hangi SQL'e çevrildiği sağlayıcı sürümüne göre değişiyor ve LEFT(...)
            // biçimine düşerse ix_city_alias_normalized hiç kullanılmaz — autocomplete
            // her tuşta tam tarama olur.
            //
            // Joker kaçışı GEREKMİYOR: SearchText.Fold harf/rakam/boşluk dışını atıyor,
            // yani '%' ve '_' kullanıcı girdisinden buraya ULAŞAMIYOR.
            var pattern = prefix + "%";

            source = source.Where(x => x.Aliases.Any(a => EF.Functions.Like(a.NormalizedName, pattern)));
        }

        // Şehir bazında sonuç: bir şehrin üç alias'ı da eşleşse tek satır döner
        // (kabul kriteri 1). Alias üzerinden değil City üzerinden sorguladığımız için
        // ayrıca DISTINCT gerekmiyor.
        //
        // Sıralama alfabetik ve deterministik. Alaka sıralaması (nüfus/öne çıkarma)
        // BİLİNÇLİ olarak yok: elde nüfus verisi yok ve uydurma bir ağırlık, yanlış
        // olduğu ölçülemeyen bir sıra üretir. Sıralama Blok 8'in (keşif) işi.
        return await source
            .OrderBy(x => x.EnglishName)
            .ThenBy(x => x.Id)
            .Take(SearchCitiesQuery.MaxResults)
            .Select(x => new CityResponse(
                x.Id,
                x.Slug,
                x.CountryCode,
                x.Name,
                x.EnglishName,
                x.TimeZoneId,
                x.Latitude,
                x.Longitude))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }
}
