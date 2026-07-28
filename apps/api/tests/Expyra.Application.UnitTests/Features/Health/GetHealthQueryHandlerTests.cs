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

    public GetHealthQueryHandlerTests() => _clock.UtcNow.Returns(FixedNow);

    [Fact]
    public async Task Handle_VeritabaniErisilebilirse_HealthyDoner()
    {
        _dbContext.CanConnectAsync(Arg.Any<CancellationToken>()).Returns(true);
        var handler = new GetHealthQueryHandler(_dbContext, _clock);

        var result = await handler.Handle(new GetHealthQuery(), CancellationToken.None);

        result.Status.ShouldBe("healthy");
        result.DatabaseReachable.ShouldBeTrue();
        result.CheckedAtUtc.ShouldBe(FixedNow);
    }

    [Fact]
    public async Task Handle_VeritabaniErisilemezse_DegradedDoner()
    {
        // Bu testin varlık sebebi: sağlık kontrolü ASLA yalan söylememeli.
        _dbContext.CanConnectAsync(Arg.Any<CancellationToken>()).Returns(false);
        var handler = new GetHealthQueryHandler(_dbContext, _clock);

        var result = await handler.Handle(new GetHealthQuery(), CancellationToken.None);

        result.Status.ShouldBe("degraded");
        result.DatabaseReachable.ShouldBeFalse();
    }
}
