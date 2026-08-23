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
        => ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: true, hasCoverMedia: true, hasPrice: true)
            .ShouldBeEmpty();

    [Fact]
    public void Missing_OrijinalDildeCeviriYok_TekEksik()
    {
        // docs/I18N.md §2: OriginalLanguage için çeviri satırı ZORUNLU — fallback
        // zincirinin sonu o satır. Başka dilde çeviri olması bunu KARŞILAMAZ.
        var missing = ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: false, hasCoverMedia: true, hasPrice: true);

        missing.ShouldHaveSingleItem().ShouldBe(ExperiencePublishRequirement.Translation);
    }

    [Fact]
    public void Missing_SehirYok_TekEksik()
    {
        var experience = Complete();
        experience.CityId = null;
        experience.TimeZoneId = null;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true, hasPrice: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.City);
    }

    [Fact]
    public void Missing_KategoriYok_TekEksik()
    {
        var experience = Complete();
        experience.CategorySlug = null;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true, hasPrice: true)
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

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true, hasPrice: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Capacity);
    }

    [Fact]
    public void Missing_BosTaslak_TumKosullariSabitSirayla_Sayar()
    {
        var draft = new Experience { HostId = Guid.CreateVersion7(), OriginalLanguage = "tr" };

        // Sıra SABİT: arayüz sihirbaz adımlarını bu diziye göre işaretliyor.
        ExperiencePublishRules.Missing(draft, hasOriginalLanguageTranslation: false, hasCoverMedia: false, hasPrice: true)
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
        ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: true, hasCoverMedia: false, hasPrice: true)
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

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true, hasCoverMedia: true, hasPrice: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Duration);
    }

    [Fact]
    public void Missing_FiyatYok_TekEksik()
    {
        // Fiyat Blok 7'de koşul OLDU. Fiyatsız bir ilan yayında görünür, misafir
        // tarih seçer ve teklif ucu 409 verir — yani satın alınamaz bir vitrin.
        // Kapasitenin sıfır olmasıyla aynı sınıfta bir kusur ve o zaten kapıda.
        ExperiencePublishRules.Missing(
            Complete(), hasOriginalLanguageTranslation: true, hasCoverMedia: true, hasPrice: false)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Price);
    }

    [Fact]
    public void Missing_SiraSABIT_EksikKumeAyniDiziyiUretiyor()
    {
        // Sıra sözleşmenin parçası: arayüz eksikleri bu sırada çiziyor ve testler
        // sıralamaya güveniyor. Yeni bir koşul eklendiğinde bu test onun nereye
        // girdiğini görünür kılıyor.
        var experience = Complete();
        experience.CityId = null;
        experience.TimeZoneId = null;
        experience.CategorySlug = null;
        experience.Capacity = 0;
        experience.DurationMinutes = 0;

        ExperiencePublishRules.Missing(
            experience, hasOriginalLanguageTranslation: false, hasCoverMedia: false, hasPrice: false)
            .ShouldBe(
            [
                ExperiencePublishRequirement.Translation,
                ExperiencePublishRequirement.City,
                ExperiencePublishRequirement.Category,
                ExperiencePublishRequirement.Capacity,
                ExperiencePublishRequirement.Duration,
                ExperiencePublishRequirement.Cover,
                ExperiencePublishRequirement.Price,
            ]);
    }
}
