using Expyra.Domain.Users;

namespace Expyra.Application.Features.Host;

/// <summary>
/// Host'un kendi tanıtımı. Satır yoksa alanlar null ve <c>Language</c> host'un
/// tercih dili — form ilk açılışta hangi dilde yazacağını ondan alıyor.
/// </summary>
public sealed record HostProfileResponse(
    string? Headline,
    string? Bio,
    string Language,
    DateTimeOffset? UpdatedAtUtc)
{
    internal static HostProfileResponse From(HostProfile? profile, string fallbackLanguage)
        => profile is null
            ? new HostProfileResponse(null, null, fallbackLanguage, null)
            : new HostProfileResponse(profile.Headline, profile.Bio, profile.Language, profile.UpdatedAtUtc);
}
