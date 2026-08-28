using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Time;

internal sealed class DateTimeProvider : IDateTimeProvider
{
    /// <summary>Kesme gerekçesi: <see cref="DateTimeOffsetExtensions.TruncateToMicroseconds"/>.</summary>
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow.TruncateToMicroseconds();
}
