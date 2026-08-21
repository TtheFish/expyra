using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Catalog;

namespace Expyra.Application.Features.Catalog.Queries.GetCategories;

/// <summary>
/// Deneyim kategorilerini döner — <b>yalnızca slug</b>.
///
/// <para>Ad yok ve bu bir eksiklik değil (docs/I18N.md §1): kategori adı bizim
/// yazdığımız arayüz metni, host'un içeriği değil. Arayüz slug'ı alıp karşılığını
/// Blok 3'ün sözlüğünden çiziyor (<c>category.foodDrink</c>); eksik anahtar DERLEMEYİ
/// kırıyor, çalışma anında boş etiket üretmiyor.</para>
///
/// <para>Yan faydası: yanıt dile bağımlı değil, paylaşılan bir önbellek onu
/// <c>Vary: Accept-Language</c> olmadan saklayabiliyor.</para>
/// </summary>
public sealed record GetCategoriesQuery : IRequest<IReadOnlyList<CategoryResponse>>;

/// <summary>
/// Tek alanlı görünüyor ve öyle kalması bilinçli. Buraya bir <c>name</c> eklemek,
/// çeviriyi veritabanına taşımak demektir.
/// </summary>
public sealed record CategoryResponse(string Slug);

internal sealed class GetCategoriesQueryHandler(IAppDbContext dbContext)
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryResponse>>
{
    public async Task<IReadOnlyList<CategoryResponse>> Handle(
        GetCategoriesQuery request,
        CancellationToken cancellationToken)
        => await Project(dbContext.Categories.AsNoTracking())
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

    internal static IQueryable<CategoryResponse> Project(IQueryable<Category> source)
        // Kapatılmış kategori listelenmez ama satırı durur — ona bağlı deneyimler
        // (Blok 5) FK'sini koruyor.
        //
        // Sıra sort_order'dan geliyor: alfabetik sıra her dilde farklı çıkar ve
        // hiçbirinde anlamlı değil ("sanat" ile "art" aynı kategori, farklı harf).
        => source
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Slug)
            .Select(x => new CategoryResponse(x.Slug));
}
