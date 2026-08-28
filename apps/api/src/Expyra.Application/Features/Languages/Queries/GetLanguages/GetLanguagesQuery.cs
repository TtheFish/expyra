using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Languages.Queries.GetLanguages;

/// <summary>
/// Dil kayıt defterini döner. İki ayrı tüketicisi var (docs/I18N.md §1):
/// arayüz dil seçici (<c>OnlyUiAvailable = true</c>) ve host'un içerik dili
/// seçtiği alan (hepsi).
/// </summary>
public sealed record GetLanguagesQuery(bool OnlyUiAvailable = false)
    : IRequest<IReadOnlyList<LanguageResponse>>;

/// <param name="SearchIndexed">
/// Bu dilde tam metin araması stemmer destekli mi. İstemciye Postgres
/// konfigürasyon adını sızdırmıyoruz — arayüzün bilmesi gereken tek şey,
/// aramanın bu dilde zayıf çalışacağı.
/// </param>
public sealed record LanguageResponse(
    string Code,
    string NativeName,
    string EnglishName,
    bool IsRightToLeft,
    bool UiAvailable,
    bool SearchIndexed);

internal sealed class GetLanguagesQueryHandler(IAppDbContext dbContext)
    : IRequestHandler<GetLanguagesQuery, IReadOnlyList<LanguageResponse>>
{
    public async Task<IReadOnlyList<LanguageResponse>> Handle(
        GetLanguagesQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        return await Project(dbContext.Languages.AsNoTracking(), request.OnlyUiAvailable)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Filtre + projeksiyon + sıralama. <c>IQueryable</c> aldığı için DB'siz test
    /// edilebiliyor — handler'ın tek işi bunu <c>ToListAsync</c> ile çalıştırmak.
    /// </summary>
    internal static IQueryable<LanguageResponse> Project(IQueryable<Language> source, bool onlyUiAvailable)
    {
        var filtered = onlyUiAvailable
            ? source.Where(x => x.UiAvailable)
            : source;

        // Sıralama İngilizce ada göre: kendi dilindeki ada göre sıralamak ICU
        // collation ister ve sonuç sunucunun collation ayarına göre değişir
        // (docs/I18N.md §4). Görüntüleme sırasını arayüz kendi locale'iyle düzeltir.
        return filtered
            .OrderBy(x => x.EnglishName)
            .Select(x => new LanguageResponse(
                x.Code,
                x.NativeName,
                x.EnglishName,
                x.IsRightToLeft,
                x.UiAvailable,
                x.SearchConfig != null));
    }
}
