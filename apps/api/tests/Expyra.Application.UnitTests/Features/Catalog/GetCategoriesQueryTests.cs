using Shouldly;
using Expyra.Application.Features.Catalog.Queries.GetCategories;
using Expyra.Domain.Catalog;

namespace Expyra.Application.UnitTests.Features.Catalog;

public sealed class GetCategoriesQueryTests
{
    private static IQueryable<Category> Categories() => new List<Category>
    {
        new() { Slug = "nature-outdoors", SortOrder = 40, IsActive = true },
        new() { Slug = "food-drink", SortOrder = 10, IsActive = true },
        new() { Slug = "segway-tours", SortOrder = 5, IsActive = false },
        new() { Slug = "art-culture", SortOrder = 20, IsActive = true },
    }.AsQueryable();

    [Fact]
    public void Project_SiraSortOrderdanGelir_AlfabetikDegil()
    {
        // Alfabetik sıra her dilde farklı çıkar ve hiçbirinde anlamlı değil:
        // "sanat" ile "art" aynı kategori, farklı harf.
        var result = GetCategoriesQueryHandler.Project(Categories()).ToList();

        result.Select(x => x.Slug).ShouldBe(["food-drink", "art-culture", "nature-outdoors"]);
    }

    [Fact]
    public void Project_KapaliKategoriListelenmez_AmaSatiriDurur()
    {
        // Silmek, o kategoriye bağlı deneyimleri (Blok 5) yetim bırakırdı.
        var result = GetCategoriesQueryHandler.Project(Categories()).ToList();

        result.ShouldNotContain(x => x.Slug == "segway-tours");
    }

    [Fact]
    public void CategoryResponse_YalnizSlugTasir()
    {
        // Sözleşme kilidi: buraya bir "name" eklemek, arayüz çevirisini veritabanına
        // taşımak demektir (docs/I18N.md §1). Adlar Blok 3'ün sözlüğünde.
        typeof(CategoryResponse).GetProperties().Select(x => x.Name).ShouldBe(["Slug"]);
    }
}
