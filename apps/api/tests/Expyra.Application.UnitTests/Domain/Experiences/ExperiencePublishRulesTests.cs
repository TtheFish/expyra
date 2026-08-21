using Shouldly;
using Expyra.Domain.Experiences;

namespace Expyra.Application.UnitTests.Domain.Experiences;

/// <summary>
/// PLAN Blok 5 kabul kriteri 1'in saf tarafı. Kural veritabanı görmediği için her koşulu
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
        => ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: true)
            .ShouldBeEmpty();

    [Fact]
    public void Missing_OrijinalDildeCeviriYok_TekEksik()
    {
        // docs/I18N.md §2: OriginalLanguage için çeviri satırı ZORUNLU — fallback
        // zincirinin sonu o satır. Başka dilde çeviri olması bunu KARŞILAMAZ.
        var missing = ExperiencePublishRules.Missing(Complete(), hasOriginalLanguageTranslation: false);

        missing.ShouldHaveSingleItem().ShouldBe(ExperiencePublishRequirement.Translation);
    }

    [Fact]
    public void Missing_SehirYok_TekEksik()
    {
        var experience = Complete();
        experience.CityId = null;
        experience.TimeZoneId = null;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.City);
    }

    [Fact]
    public void Missing_KategoriYok_TekEksik()
    {
        var experience = Complete();
        experience.CategorySlug = null;

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true)
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

        ExperiencePublishRules.Missing(experience, hasOriginalLanguageTranslation: true)
            .ShouldHaveSingleItem()
            .ShouldBe(ExperiencePublishRequirement.Capacity);
    }

    [Fact]
    public void Missing_BosTaslak_TumKosullariSabitSirayla_Sayar()
    {
        var draft = new Experience { HostId = Guid.CreateVersion7(), OriginalLanguage = "tr" };

        // Sıra SABİT: arayüz sihirbaz adımlarını bu diziye göre işaretliyor.
        ExperiencePublishRules.Missing(draft, hasOriginalLanguageTranslation: false).ShouldBe(
        [
            ExperiencePublishRequirement.Translation,
            ExperiencePublishRequirement.City,
            ExperiencePublishRequirement.Category,
            ExperiencePublishRequirement.Capacity,
        ]);
    }

    [Fact]
    public void Missing_SureBirKosulDEGIL()
    {
        // PLAN kabul kriteri 1 dört koşul sayıyor ve süre onlardan biri değil. Bu test
        // kapının SESSİZCE genişlemesine karşı: süreyi buraya eklemek isteyen, önce bu
        // satırı silmek ve PLAN'ı yeniden okumak zorunda kalsın.
        var experience = Complete();
        experience.DurationMinutes = 0;

        ExperiencePublishRules.CanPublish(experience, hasOriginalLanguageTranslation: true)
            .ShouldBeTrue();
    }
}
