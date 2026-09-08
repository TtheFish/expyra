using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetItinerary;

public sealed record ItineraryStepInput(string Title, string? Body);

/// <summary>
/// Programı (Airbnb "What you'll do") bir dil için TOPTAN yazar: gelen liste
/// o dilin listesi olur, boş liste "programı kaldır" demek. Medya sıralamasıyla
/// aynı sözleşme — kısmi güncelleme ucu yok, çünkü sıra listenin kendisi.
///
/// <para>Sil-yeniden yaz aynı transaction'da ve aynı birincil anahtarla; EF komut
/// sıralaması için var olan satırlar YERİNDE güncelleniyor, fazlası siliniyor,
/// eksik olan ekleniyor (<c>ApplySpokenLanguagesAsync</c> notuyla aynı gerekçe).</para>
/// </summary>
public sealed record SetItineraryCommand(
    Guid ExperienceId,
    string Language,
    IReadOnlyList<ItineraryStepInput> Steps) : IRequest<HostExperienceResponse>;

internal sealed class SetItineraryCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<SetItineraryCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        SetItineraryCommand request,
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

        // Program içerik: o dilde başlık yoksa program da olamaz. Boş liste (silme)
        // satır olmadan da geçerli.
        await TranslationText
            .RequireForWriteAsync(
                dbContext, experience, language, hasText: request.Steps.Count > 0, cancellationToken)
            .ConfigureAwait(false);

        var existing = await dbContext.ExperienceItinerarySteps
            .Where(x => x.ExperienceId == experience.Id && x.Language == language)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        for (var index = 0; index < request.Steps.Count; index++)
        {
            var input = request.Steps[index];
            var title = input.Title.Trim();
            var body = TranslationText.Clean(input.Body);

            if (index < existing.Count)
            {
                existing[index].Title = title;
                existing[index].Body = body;
                existing[index].SortOrder = index;
                continue;
            }

            dbContext.ExperienceItinerarySteps.Add(new ExperienceItineraryStep
            {
                ExperienceId = experience.Id,
                Language = language,
                SortOrder = index,
                Title = title,
                Body = body,
            });
        }

        for (var index = request.Steps.Count; index < existing.Count; index++)
        {
            dbContext.ExperienceItinerarySteps.Remove(existing[index]);
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
