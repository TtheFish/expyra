using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.SetExperienceTranslation;

/// <summary>
/// İlanın bir dildeki metnini yazar. <b>PUT ve upsert</b>: satır yoksa açılır, varsa
/// üzerine yazılır — istemcinin "bu dilde çeviri var mıydı" sorusunu sorması gerekmiyor.
///
/// <para><see cref="Language"/> YOLDAN gelir ve sunucuda kanonikleştirilir: <c>en_us</c>
/// ile <c>en-US</c> aynı dildir ve normalize edilmezse aynı ilan için iki satır doğar,
/// fallback zinciri de sessizce kırılırdı (docs/I18N.md §1).</para>
///
/// <para><b>Slug tam olarak burada doğuyor</b> — ve yalnız
/// <see cref="Experience.OriginalLanguage"/> yazıldığında. Başlığın ilk var olduğu an bu;
/// sonraki başlık düzeltmeleri slug'a DOKUNMAZ, çünkü yayınlanmış bir URL'in altını
/// oymak paylaşılmış her bağlantıyı kırar.</para>
/// </summary>
public sealed record SetExperienceTranslationCommand(
    Guid ExperienceId,
    string Language,
    string Title,
    string? Description) : IRequest<HostExperienceResponse>;

internal sealed class SetExperienceTranslationCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<SetExperienceTranslationCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        SetExperienceTranslationCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        if (!LanguageCode.TryNormalize(request.Language, out var language))
        {
            throw new BadRequestException("Dil kodu geçersiz.");
        }

        // Transaction + experience satırında kilit. ÇEVİRİ satırını kilitlemek mümkün
        // değil: bileşik birincil anahtarı var ve FindForUpdateAsync tek sütunlu anahtar
        // şart koşuyor (PLAN Blok 5 tuzakları). Kilit üst satırda alınıyor, böylece aynı
        // ilanın çevirilerine eşzamanlı iki yazma sıraya giriyor — slug üretimi de bu
        // kilidin altında olmak zorunda, aksi halde iki istek iki slug üretirdi.
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        // İÇERİK dili: kayıt defterinde olmalı VE ContentAllowed olmalı. Konuşulan dilden
        // ayrı bir kontrol ve bu bilinçli (docs/I18N.md §3).
        await HostExperienceStore
            .RequireContentLanguageAsync(dbContext, language, cancellationToken)
            .ConfigureAwait(false);

        var title = request.Title.Trim();
        var description = string.IsNullOrWhiteSpace(request.Description)
            ? null
            : request.Description.Trim();

        var translation = await dbContext.ExperienceTranslations
            .FirstOrDefaultAsync(
                x => x.ExperienceId == experience.Id && x.Language == language,
                cancellationToken)
            .ConfigureAwait(false);

        if (translation is null)
        {
            translation = new ExperienceTranslation
            {
                ExperienceId = experience.Id,
                Language = language,
                Title = title,
            };

            dbContext.ExperienceTranslations.Add(translation);
        }

        translation.Title = title;
        translation.Description = description;

        // Host kendi yazdı: makine çevirisinin ÜZERİNE yazmak serbest ve satır artık
        // HostWritten. Ters yön yasak — makine, host'un metnini ezmez (docs/I18N.md §2).
        translation.Source = TranslationSource.HostWritten;

        // BaseAuditableEntity olmadığı için ApplyAuditTimestamps bu satıra dokunmuyor;
        // zaman damgası burada, kesme yapan sağlayıcıdan yazılıyor (docs/DATABASE.md).
        translation.UpdatedAtUtc = clock.UtcNow;

        if (string.Equals(language, experience.OriginalLanguage, StringComparison.Ordinal))
        {
            await HostExperienceStore
                .EnsureSlugAsync(dbContext, experience, title, cancellationToken)
                .ConfigureAwait(false);
        }

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
