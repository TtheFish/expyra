namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// DateTime.UtcNow'u doğrudan çağırma — test edilemez hale gelir. Bunu enjekte et.
/// </summary>
public interface IDateTimeProvider
{
    DateTimeOffset UtcNow { get; }
}
