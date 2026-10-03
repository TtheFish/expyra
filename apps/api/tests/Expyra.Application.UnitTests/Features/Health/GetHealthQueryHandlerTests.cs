using NSubstitute;
using Shouldly;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Health.Queries.GetHealth;

namespace Expyra.Application.UnitTests.Features.Health;

/// <summary>
/// REFERANS TEST — handler testleri DB'siz çalışır, bağımlılıklar taklit edilir.
/// Her yeni handler için en az bir "mutlu yol" + bir "hata yolu" testi beklenir.
/// </summary>
public sealed class GetHealthQueryHandlerTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly IDateTimeProvider _clock = Substitute.For<IDateTimeProvider>();
    private readonly IAppDbContext _dbContext = Substitute.For<IAppDbContext>();
    private readonly IBuildInfo _buildInfo = Substitute.For<IBuildInfo>();

    private static readonly BuildInfo FixedBuild = new("1.0.0", "3f2a9c1e0b7d4a6f8e5c2b1a0d9e8f7c6b5a4d3e", FixedNow.AddHours(-1));

    public GetHealthQueryHandlerTests()
    {
        _clock.UtcNow.Returns(FixedNow);
        _buildInfo.Current.Returns(FixedBuild);
    }

    [Fact]
    public async Task Handle_VeritabaniErisilebilirse_HealthyDoner()
    {
        _dbContext.CanConnectAsync(Arg.Any<CancellationToken>()).Returns(true);
        var handler = new GetHealthQueryHandler(_dbContext, _clock, _buildInfo);

        var result = await handler.Handle(new GetHealthQuery(), CancellationToken.None);

        result.Status.ShouldBe("healthy");
        result.DatabaseReachable.ShouldBeTrue();
        result.CheckedAtUtc.ShouldBe(FixedNow);
        result.Version.ShouldBe("1.0.0");
        result.Commit.ShouldBe(FixedBuild.Commit);
        result.BuiltAtUtc.ShouldBe(FixedBuild.BuiltAtUtc);
    }

    [Fact]
    public async Task Handle_VeritabaniErisilemezse_DegradedDoner()
    {
        // Bu testin varlık sebebi: sağlık kontrolü ASLA yalan söylememeli.
        _dbContext.CanConnectAsync(Arg.Any<CancellationToken>()).Returns(false);
        var handler = new GetHealthQueryHandler(_dbContext, _clock, _buildInfo);

        var result = await handler.Handle(new GetHealthQuery(), CancellationToken.None);

        result.Status.ShouldBe("degraded");
        result.DatabaseReachable.ShouldBeFalse();

        // Veritabanı düşükken de hangi sürümün düştüğü görünmeli — deploy sonrası
        // en çok o an lazım.
        result.Commit.ShouldBe(FixedBuild.Commit);
    }

    [Theory]
    [InlineData("1.0.0+3f2a9c1e", "1.0.0", "3f2a9c1e")]
    [InlineData("1.0.0", "1.0.0", BuildInfo.UnknownCommit)]
    [InlineData("1.0.0+", "1.0.0", BuildInfo.UnknownCommit)]
    [InlineData(null, "0.0.0", BuildInfo.UnknownCommit)]
    public void BuildInfo_Parse_SurumVeCommitiAyirir(string? informational, string version, string commit)
    {
        var info = BuildInfo.Parse(informational, builtAtUtc: null);

        info.Version.ShouldBe(version);
        info.Commit.ShouldBe(commit);
        info.BuiltAtUtc.ShouldBeNull();
    }

    [Fact]
    public void BuildInfo_Parse_DerlemeZamaniniUtcOkur()
    {
        var info = BuildInfo.Parse("1.0.0+abc", "2026-10-03T08:15:00Z");

        info.BuiltAtUtc.ShouldBe(new DateTimeOffset(2026, 10, 3, 8, 15, 0, TimeSpan.Zero));
    }
}
