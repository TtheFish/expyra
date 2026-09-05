using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetExperienceDetails;

/// <summary>
/// "Bilmen gerekenler" (Airbnb "Things to know"): yaş sınırı, aktivite seviyesi ve
/// üç serbest metin. <b>Tam değiştirme</b>, PATCH değil: form her alanı taşıyor ve
/// boş gelen alan "temizle" demek — <c>UpdateExperienceCommand</c>'in "null = dokunma"
/// sözleşmesinin tersi. İki komutun ayrı olmasının sebebi tam olarak bu.
///
/// <para>Metinler dile bağlı (içerik), skalerler değil. İkisi tek komutta çünkü host
/// tek formda giriyor ve iki uca bölünmüş bir form yarım kayıt üretebilirdi.</para>
/// </summary>
public sealed record SetExperienceDetailsCommand(
    Guid ExperienceId,
    string Language,
    int? MinimumAge,
    ActivityLevel? ActivityLevel,
    string? WhatToBring,
    string? NotIncluded,
    string? Accessibility) : IRequest<HostExperienceResponse>;

internal sealed class SetExperienceDetailsCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<SetExperienceDetailsCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        SetExperienceDetailsCommand request,
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

        experience.MinimumAge = request.MinimumAge;
        experience.ActivityLevel = request.ActivityLevel;

        var translation = await TranslationText
            .RequireForWriteAsync(
                dbContext,
                experience,
                language,
                hasText: request.WhatToBring is not null
                    || request.NotIncluded is not null
                    || request.Accessibility is not null,
                cancellationToken)
            .ConfigureAwait(false);

        if (translation is not null)
        {
            translation.WhatToBring = TranslationText.Clean(request.WhatToBring);
            translation.NotIncluded = TranslationText.Clean(request.NotIncluded);
            translation.Accessibility = TranslationText.Clean(request.Accessibility);
            translation.UpdatedAtUtc = clock.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
