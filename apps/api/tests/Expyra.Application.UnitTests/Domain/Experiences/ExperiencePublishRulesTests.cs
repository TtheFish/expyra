using Shouldly;
using Expyra.Domain.Experiences;

namespace Expyra.Application.UnitTests.Domain.Experiences;

/// <summary>
/// PLAN Blok 5 kabul kriteri 1 + Blok 6 kabul kriteri 3'ün saf tarafı. Kural veritabanı görmediği için her koşulu
/// tek tek denemek bedava — ve aynı fonksiyon hem yayın ucunda hem host listesindeki
/// "eksikler" rozetinde çalıştığı için burada geçen her satır ikisini birden doğruluyor.
/// </summary>
public sealed class ExperiencePublishRulesTests
{
    private static Experience Complete() => new()
    {
        HostId = Guid.CreateVersion7(),
        OriginalLanguage = "tr",
        CityId = Guid.CreateVersion7(),
        CategorySlug = "food-drink",
        TimeZoneId = "Europe/Istanbul",
        DurationMinutes = 120,
        Capacity = 8,
    };

    [Fact]
    public void Missing_TamIlan_BosDoner()
        => ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: true, hasCoverMedia: true)
            .ShouldBeEmpty();

    [Fact]
    public void Missing_OrijinalDildeCeviriYok_TekEksik()
    {
        // docs/I18N.md §2: OriginalLanguage için çeviri satırı ZORUNLU — fallback
        // zincirinin sonu o satır. Başka dilde çeviri olması bunu KARŞILAMAZ.
        var missing = ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: false, hasCoverMedia: true);

        missing.ShouldHaveSingleItem().ShouldBe(ExperiencePublishRequirement.Translation);
    }

    [Fact]
    public void Missing_SehirYok_TekEksik()
    {
        var experience = Complete();
        experience.CityId = null;
        experience.TimeZoneId = null;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.City);
    }

    [Fact]
    public void Missing_KategoriYok_TekEksik()
    {
        var experience = Complete();
        experience.CategorySlug = null;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Category);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Missing_KapasiteSifirVeyaNegatif_TekEksik(int capacity)
    {
        // "> 0", ">= 0" değil: kapasitesi sıfır olan ilan yayınlanmış ama satın
        // alınamaz bir şey olurdu.
        var experience = Complete();
        experience.Capacity = capacity;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Capacity);
    }

    [Fact]
    public void Missing_BosTaslak_TumKosullariSabitSirayla_Sayar()
    {
        var draft = new Experience { HostId = Guid.CreateVersion7(), OriginalLanguage = "tr" };

        // Sıra SABİT: arayüz sihirbaz adımlarını bu diziye göre işaretliyor.
        ExperiencePublishRules.Missing(draft, hasOriginalLanguageTranslation: false, hasCoverMedia: false)
            .ShouldBe(
            [
                ExperiencePublishRequirement.Translation,
                ExperiencePublishRequirement.City,
                ExperiencePublishRequirement.Category,
                ExperiencePublishRequirement.Capacity,
                ExperiencePublishRequirement.Duration,
                ExperiencePublishRequirement.Cover,
            ]);
    }

    [Fact]
    public void Missing_KapakYok_TekEksik()
    {
        // PLAN Blok 6 kabul kriteri 3. Görselsiz ilan listede gri bir kutu olur ve
        // paylaşıldığında önizlemesi boş çıkar.
        ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: true, hasCoverMedia: false)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Cover);
    }

    [Fact]
    public void Missing_SureYok_TekEksik()
    {
        // Süre Blok 7'de koşul OLDU: seansın bitiş saati ondan hesaplanıyor, yani
        // süresiz bir ilan takvim kuramaz. Önceki hâlinde bu test tam tersini
        // (süresiz ilan yayınlanabilir) sabitliyordu.
        var experience = Complete();
        experience.DurationMinutes = 0;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Duration);
    }
}
