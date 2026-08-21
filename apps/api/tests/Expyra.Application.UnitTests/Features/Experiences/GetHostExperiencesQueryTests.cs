using Shouldly;
using Expyra.Application.Features.Experiences.Queries.GetHostExperiences;
using Expyra.Domain.Experiences;

namespace Expyra.Application.UnitTests.Features.Experiences;

public sealed class GetHostExperiencesQueryTests
{
    [Theory]
    [InlineData("Draft", ExperienceStatus.Draft)]
    [InlineData("draft", ExperienceStatus.Draft)]
    [InlineData("PUBLISHED", ExperienceStatus.Published)]
    [InlineData("Archived", ExperienceStatus.Archived)]
    public void TryParseStatus_BuyukKucukHarfDuyarsiz(string raw, ExperienceStatus expected)
    {
        GetHostExperiencesQuery.TryParseStatus(raw, out var status).ShouldBeTrue();
        status.ShouldBe(expected);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("2")]
    public void TryParseStatus_SayisalDegerKabulEdilmez(string raw)
        // Enum.TryParse tek başına "1" için Draft döner ve sözleşmeyi sessizce enum
        // SIRASINA bağlar: sıra değiştiği gün eski istemci başka bir durumu sorar.
        => GetHostExperiencesQuery.TryParseStatus(raw, out _).ShouldBeFalse();

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("taslak")]
    [InlineData("Deleted")]
    [InlineData("Draft;drop")]
    public void TryParseStatus_TaninmayanDeger_False(string? raw)
        // False → validator 400 üretiyor. Sessizce yok sayılsaydı "taslaklarım" diyen
        // istemci yayındakileri de görürdü (Blok 4 kabul kriteri 3'ün aynı ilkesi).
        => GetHostExperiencesQuery.TryParseStatus(raw, out _).ShouldBeFalse();
}
