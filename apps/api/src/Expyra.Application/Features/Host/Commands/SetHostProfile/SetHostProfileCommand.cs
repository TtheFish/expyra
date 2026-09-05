using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Host.Commands.SetHostProfile;

/// <summary>
/// Host tanıtımını yazar (upsert, tam değiştirme). İki metin de boşsa satır
/// SİLİNİYOR: boş bir satır "profil var ama boş" ile "profil yok"u ayırt
/// edilemez kılardı ve misafir tarafı ikisinde de aynı şeyi (hiçbir şey) gösteriyor.
/// </summary>
public sealed record SetHostProfileCommand(
    string? Headline,
    string? Bio,
    string Language) : IRequest<HostProfileResponse>;

internal sealed class SetHostProfileCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<SetHostProfileCommand, HostProfileResponse>
{
    public async Task<HostProfileResponse> Handle(
        SetHostProfileCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        if (!LanguageCode.TryNormalize(request.Language, out var language))
        {
            throw new BadRequestException("Dil kodu geçersiz.");
        }

        await HostExperienceStore
            .RequireContentLanguageAsync(dbContext, language, cancellationToken)
            .ConfigureAwait(false);

        var headline = TranslationText.Clean(request.Headline);
        var bio = TranslationText.Clean(request.Bio);

        var profile = await dbContext.HostProfiles
            .FirstOrDefaultAsync(x => x.UserId == hostId, cancellationToken)
            .ConfigureAwait(false);

        if (headline is null && bio is null)
        {
            if (profile is not null)
            {
                dbContext.HostProfiles.Remove(profile);
                await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }

            return HostProfileResponse.From(null, language);
        }

        if (profile is null)
        {
            profile = new HostProfile { UserId = hostId, Language = language };
            dbContext.HostProfiles.Add(profile);
        }

        profile.Headline = headline;
        profile.Bio = bio;
        profile.Language = language;
        profile.UpdatedAtUtc = clock.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return HostProfileResponse.From(profile, language);
    }
}
