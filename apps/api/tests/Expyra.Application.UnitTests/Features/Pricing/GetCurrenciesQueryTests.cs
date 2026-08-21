using Shouldly;
using Expyra.Application.Features.Pricing.Queries.GetCurrencies;
using Expyra.Domain.Pricing;

namespace Expyra.Application.UnitTests.Features.Pricing;

public sealed class GetCurrenciesQueryTests
{
    private static IQueryable<Currency> Currencies() => new List<Currency>
    {
        new() { Code = "TRY", EnglishName = "Turkish Lira", MinorUnits = 2, Symbol = "₺" },
        new() { Code = "JPY", EnglishName = "Yen", MinorUnits = 0, Symbol = "¥" },
        new() { Code = "KWD", EnglishName = "Kuwaiti Dinar", MinorUnits = 3, Symbol = null },
        new() { Code = "EUR", EnglishName = "Euro", MinorUnits = 2, Symbol = "€" },
    }.AsQueryable();

    [Fact]
    public void Project_KodaGoreSirali_CollationdanBagimsiz()
    {
        var result = GetCurrenciesQueryHandler.Project(Currencies()).ToList();

        result.Select(x => x.Code).ShouldBe(["EUR", "JPY", "KWD", "TRY"]);
    }

    [Fact]
    public void Project_MinorUnitsSozlesmeninParcasi()
    {
        // İstemci bunu bilmek zorunda: Blok 7'den itibaren tutarlar minör birim tam
        // sayısı olarak taşınacak ve 15000'in 150.00 mı 15000 mi olduğunu bu alan söyler.
        var result = GetCurrenciesQueryHandler.Project(Currencies()).ToList();

        result.Single(x => x.Code == "JPY").MinorUnits.ShouldBe(0);
        result.Single(x => x.Code == "KWD").MinorUnits.ShouldBe(3);
        result.Single(x => x.Code == "EUR").MinorUnits.ShouldBe(2);
    }

    [Fact]
    public void Project_SembolOlmayabilir()
    {
        var result = GetCurrenciesQueryHandler.Project(Currencies()).ToList();

        result.Single(x => x.Code == "KWD").Symbol.ShouldBeNull();
        result.Single(x => x.Code == "TRY").Symbol.ShouldBe("₺");
    }
}
