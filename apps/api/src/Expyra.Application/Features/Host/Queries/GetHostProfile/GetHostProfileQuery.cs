using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Host.Queries.GetHostProfile;

public sealed record GetHostProfileQuery : IRequest<HostProfileResponse>;

internal sealed class GetHostProfileQueryHandler(IAppDbContext dbContext, ICurrentUser currentUser)
    : IRequestHandler<GetHostProfileQuery, HostProfileResponse>
{
    public async Task<HostProfileResponse> Handle(
        GetHostProfileQuery request,
        CancellationToken cancellationToken)
    {
        var hostId = currentUser.RequireHostId();

        var profile = await dbContext.HostProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == hostId, cancellationToken)
            .ConfigureAwait(false);

        var preferred = await dbContext.Users
            .AsNoTracking()
            .Where(x => x.Id == hostId)
            .Select(x => x.PreferredLanguage)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        return HostProfileResponse.From(profile, preferred ?? ExperienceTextFallback.LastResortLanguage);
    }
}
