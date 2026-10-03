using MediatR;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Application.Features.Health.Queries.GetHealth;

/// <summary>
/// REFERANS FEATURE — yeni feature yazarken bu dosyanın yapısını kopyala.
/// Kural: request + response + handler aynı dosyada durur. Feature'ı okumak için
/// 5 dosya açmak zorunda kalma.
/// </summary>
public sealed record GetHealthQuery : IRequest<HealthResponse>;

/// <param name="Version">Ürün sürümü (<c>1.0.0</c>).</param>
/// <param name="Commit">Bu ikilinin derlendiği git SHA'sı; bilinmiyorsa <c>"dev"</c>. Deploy doğrulaması: docs/DEPLOY.md.</param>
/// <param name="BuiltAtUtc">Derleme zamanı; yalnız CI derlemesinde dolu.</param>
public sealed record HealthResponse(
    string Status,
    bool DatabaseReachable,
    DateTimeOffset CheckedAtUtc,
    string Version,
    string Commit,
    DateTimeOffset? BuiltAtUtc);

internal sealed class GetHealthQueryHandler(
    IAppDbContext dbContext,
    IDateTimeProvider dateTimeProvider,
    IBuildInfo buildInfo)
    : IRequestHandler<GetHealthQuery, HealthResponse>
{
    public async Task<HealthResponse> Handle(GetHealthQuery request, CancellationToken cancellationToken)
    {
        // Not: burada try/catch ile hatayı yutup "ok" DÖNMÜYORUZ.
        // Sağlık kontrolü yalan söylerse hiçbir işe yaramaz.
        var reachable = await dbContext.CanConnectAsync(cancellationToken).ConfigureAwait(false);
        var build = buildInfo.Current;

        return new HealthResponse(
            Status: reachable ? "healthy" : "degraded",
            DatabaseReachable: reachable,
            CheckedAtUtc: dateTimeProvider.UtcNow,
            Version: build.Version,
            Commit: build.Commit,
            BuiltAtUtc: build.BuiltAtUtc);
    }
}
