using Shouldly;
using Expyra.Application.Features.Languages.Queries.GetLanguages;
using Expyra.Domain.Languages;

namespace Expyra.Application.UnitTests.Features.Languages;

/// <summary>
/// Sorgu mantığı <c>IQueryable</c> üzerinde çalıştığı için DB'siz test edilir.
/// Handler'ın kalan tek işi <c>ToListAsync</c> — orası EF'in sorumluluğu.
/// </summary>
public sealed class GetLanguagesQueryTests
{
    private static readonly IQueryable<Language> Languages = new List<Language>
    {
        new() { Code = "tr", NativeName = "Türkçe",  EnglishName = "Turkish", SearchConfig = "turkish", UiAvailable = true },
        new() { Code = "en", NativeName = "English", EnglishName = "English", SearchConfig = "english", UiAvailable = true },
        new() { Code = "cs", NativeName = "Čeština", EnglishName = "Czech",   SearchConfig = null,      UiAvailable = false },
        new() { Code = "ja", NativeName = "日本語",   EnglishName = "Japanese", SearchConfig = null,     UiAvailable = false },
    }.AsQueryable();

    [Fact]
    public void Project_OnlyUiAvailable_SadeceCevirisiTamamlananlariDoner()
    {
        var result = GetLanguagesQueryHandler.Project(Languages, onlyUiAvailable: true).ToList();

        result.Select(x => x.Code).ShouldBe(["en", "tr"]);
    }

    [Fact]
    public void Project_TumDiller_IcerikDiliSecimiIcinHepsiniDoner()
    {
        var result = GetLanguagesQueryHandler.Project(Languages, onlyUiAvailable: false).ToList();

        result.Count.ShouldBe(4);
        // Sıralama İngilizce ada göre — collation'dan bağımsız, deterministik.
        result.Select(x => x.EnglishName).ShouldBe(["Czech", "English", "Japanese", "Turkish"]);
    }

    [Fact]
    public void Project_SearchConfigYoksa_SearchIndexedFalseDoner()
    {
        // Arayüz bu bayrağa bakıp "bu dilde arama zayıf" uyarısı verebilmeli.
        // Çekçe ve Japonca'da yerleşik stemmer yok — docs/I18N.md §4.
        var result = GetLanguagesQueryHandler.Project(Languages, onlyUiAvailable: false).ToList();

        result.Single(x => x.Code == "cs").SearchIndexed.ShouldBeFalse();
        result.Single(x => x.Code == "ja").SearchIndexed.ShouldBeFalse();
        result.Single(x => x.Code == "tr").SearchIndexed.ShouldBeTrue();
    }
}
