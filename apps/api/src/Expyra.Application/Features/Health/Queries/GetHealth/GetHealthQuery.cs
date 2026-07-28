using MediatR;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Application.Features.Health.Queries.GetHealth;

/// <summary>
/// REFERANS FEATURE — yeni feature yazarken bu dosyanın yapısını kopyala.
/// Kural: request + response + handler aynı dosyada durur. Feature'ı okumak için
/// 5 dosya açmak zorunda kalma.
/// </summary>
public sealed record GetHealthQuery : IRequest<HealthResponse>;

public sealed record HealthResponse(string Status, bool DatabaseReachable, DateTimeOffset CheckedAtUtc);

internal sealed class GetHealthQueryHandler(
    IAppDbContext dbContext,
    IDateTimeProvider dateTimeProvider)
    : IRequestHandler<GetHealthQuery, HealthResponse>
{
    public async Task<HealthResponse> Handle(GetHealthQuery request, CancellationToken cancellationToken)
    {
        // Not: burada try/catch ile hatayı yutup "ok" DÖNMÜYORUZ.
        // Sağlık kontrolü yalan söylerse hiçbir işe yaramaz.
        var reachable = await dbContext.CanConnectAsync(cancellationToken).ConfigureAwait(false);

        return new HealthResponse(
            Status: reachable ? "healthy" : "degraded",
            DatabaseReachable: reachable,
            CheckedAtUtc: dateTimeProvider.UtcNow);
    }
}
