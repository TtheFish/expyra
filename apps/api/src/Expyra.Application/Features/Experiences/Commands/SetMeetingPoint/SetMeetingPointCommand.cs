using MediatR;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetMeetingPoint;

/// <summary>
/// Buluşma noktası (Airbnb "Where we'll meet"). Adres ve koordinat dil bağımsız,
/// yönerge dile bağlı — aynı formdan tek komut, gerekçe <c>SetExperienceDetailsCommand</c>.
///
/// <para>Tam değiştirme: adres boş gelirse silinir. Koordinat çifti ya ikisi ya hiçbiri
/// (doğrulayıcı + DB kısıtı).</para>
/// </summary>
public sealed record SetMeetingPointCommand(
    Guid ExperienceId,
    string Language,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? Instructions) : IRequest<HostExperienceResponse>;

internal sealed class SetMeetingPointCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<SetMeetingPointCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        SetMeetingPointCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        if (!LanguageCode.TryNormalize(request.Language, out var language))
        {
            throw new BadRequestException("Dil kodu geçersiz.");
        }

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        experience.MeetingAddress = TranslationText.Clean(request.Address);
        experience.MeetingLatitude = request.Latitude;
        experience.MeetingLongitude = request.Longitude;

        var translation = await TranslationText
            .RequireForWriteAsync(
                dbContext, experience, language, hasText: request.Instructions is not null, cancellationToken)
            .ConfigureAwait(false);

        if (translation is not null)
        {
            translation.MeetingInstructions = TranslationText.Clean(request.Instructions);
            translation.UpdatedAtUtc = clock.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
