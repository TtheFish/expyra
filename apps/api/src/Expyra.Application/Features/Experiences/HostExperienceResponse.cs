using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences;

/// <summary>
/// Host'un kendi ilanını gördüğü şekil. <b>Beş host ucunun tamamı bunu döner</b>
/// (oluştur, düzenle, çeviri yaz, yayınla, arşivle) ve liste ucu da aynı şekli taşır —
/// istemci tek bir gövde ayrıştırıcısı yazıyor, uç başına bir tane değil
/// (<c>CurrentUserResponse</c>'un <c>/me</c> ile <c>PATCH /api/users/me</c> arasında
/// paylaşılmasıyla aynı karar).
///
/// <para><b>Bu MİSAFİRİN gördüğü şekil değil.</b> Burada tüm çeviriler, taslak durumu ve
/// eksik yayın koşulları var; misafir tarafı (Blok 5b) fallback zincirinden geçmiş TEK
/// çeviri görecek (docs/I18N.md §2).</para>
/// </summary>
/// <param name="Slug">
/// Başlık ilk yazılana kadar <c>null</c>. Yayınlanmış bir ilanda daima dolu.
/// </param>
/// <param name="Status">
/// METİN olarak: <c>"Draft" | "Published" | "Archived"</c>. Enum olarak bırakılsaydı
/// System.Text.Json onu SAYIYA çevirirdi (projede <c>JsonStringEnumConverter</c> kayıtlı
/// değil) ve sözleşme sessizce enum sırasına bağlanırdı — sıra değiştiği gün eski
/// istemciler başka bir durumu okurdu. Sütunun metin olarak saklanmasıyla aynı gerekçe.
/// </param>
/// <param name="SpokenLanguages">
/// Deneyim sırasında KONUŞULAN diller. <paramref name="Translations"/> ile karıştırılmaz —
/// ikisi ayrı kavram (docs/I18N.md §3).
/// </param>
/// <param name="MissingPublishRequirements">
/// Yayına engel olan koşulların kodları (<see cref="ExperiencePublishRequirement"/>).
/// Boşsa ilan yayınlanabilir. Sihirbaz "Yayınla" düğmesini buna bakarak açıyor; aynı
/// kural sunucuda da çalıştığı için düğme ile 409 arasında ayrışma olmuyor.
/// </param>
public sealed record HostExperienceResponse(
    Guid Id,
    string? Slug,
    string Status,
    Guid? CityId,
    string? CategorySlug,
    int DurationMinutes,
    int Capacity,
    string? TimeZoneId,
    string OriginalLanguage,
    IReadOnlyList<string> SpokenLanguages,
    IReadOnlyList<string> Tags,
    IReadOnlyList<HostExperienceTranslationResponse> Translations,
    IReadOnlyList<string> MissingPublishRequirements,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    DateTimeOffset? PublishedAtUtc);

/// <param name="Source">
/// <c>"HostWritten" | "Machine"</c> — metin, bkz. <see cref="HostExperienceResponse.Status"/>.
/// Bu blokta daima <c>HostWritten</c>; alan Blok 10'un makine çevirisi için hazır.
/// </param>
public sealed record HostExperienceTranslationResponse(
    string Language,
    string Title,
    string? Description,
    string Source,
    DateTimeOffset UpdatedAtUtc);

/// <summary>
/// <see cref="Experience"/> satırlarını yanıt şekline çevirir.
///
/// <para><b>Neden üç ayrı sorgu ve tek satır için de aynısı:</b> navigation property
/// kuralı gereği (UserConfiguration kararı) çeviri/dil/etiket satırları açık sorguyla
/// çekiliyor. Deneyim başına sorgu açmak N+1 olurdu; bunun yerine liste ne kadar uzun
/// olursa olsun sorgu sayısı SABİT: ana sorgu + 3. Tekil ve çoğul yol AYNI koddan
/// geçiyor, böylece "listede görünen alan tekil yanıtta yok" ayrışması doğamıyor.</para>
/// </summary>
internal static class HostExperienceProjection
{
    internal static async Task<HostExperienceResponse> ToResponseAsync(
        IAppDbContext dbContext,
        Experience experience,
        CancellationToken cancellationToken)
    {
        var responses = await ToResponsesAsync(dbContext, new[] { experience }, cancellationToken)
            .ConfigureAwait(false);

        return responses[0];
    }

    internal static async Task<IReadOnlyList<HostExperienceResponse>> ToResponsesAsync(
        IAppDbContext dbContext,
        IReadOnlyList<Experience> experiences,
        CancellationToken cancellationToken)
    {
        if (experiences.Count == 0)
        {
            return [];
        }

        var ids = experiences.Select(x => x.Id).ToArray();

        // Npgsql bu üç sorguyu `WHERE experience_id = ANY(@ids)` olarak yazıyor.
        var translations = await dbContext.ExperienceTranslations
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId))
            .OrderBy(x => x.Language)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var spoken = await dbContext.ExperienceSpokenLanguages
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId))
            .OrderBy(x => x.Language)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var tags = await dbContext.ExperienceTags
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId))
            .OrderBy(x => x.NormalizedTag)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var translationsById = translations.ToLookup(x => x.ExperienceId);
        var spokenById = spoken.ToLookup(x => x.ExperienceId);
        var tagsById = tags.ToLookup(x => x.ExperienceId);

        // Sıra girdideki sıra: sorgunun OrderBy'ı korunuyor, lookup onu bozmuyor.
        return experiences
            .Select(experience => Compose(
                experience,
                translationsById[experience.Id].ToList(),
                spokenById[experience.Id].Select(x => x.Language).ToList(),
                tagsById[experience.Id].Select(x => x.DisplayTag).ToList()))
            .ToList();
    }

    private static HostExperienceResponse Compose(
        Experience experience,
        IReadOnlyList<ExperienceTranslation> translations,
        IReadOnlyList<string> spokenLanguages,
        IReadOnlyList<string> tags)
    {
        // Yayın kuralı Domain'de ve TEK yerde: yayın ucu da, bu liste de aynı kodu
        // çağırıyor (ExperiencePublishRules sınıf notu).
        var hasOriginalTranslation = translations.Any(
            x => string.Equals(x.Language, experience.OriginalLanguage, StringComparison.Ordinal));

        return new HostExperienceResponse(
            experience.Id,
            experience.Slug,
            experience.Status.ToString(),
            experience.CityId,
            experience.CategorySlug,
            experience.DurationMinutes,
            experience.Capacity,
            experience.TimeZoneId,
            experience.OriginalLanguage,
            spokenLanguages,
            tags,
            translations
                .Select(x => new HostExperienceTranslationResponse(
                    x.Language,
                    x.Title,
                    x.Description,
                    x.Source.ToString(),
                    x.UpdatedAtUtc))
                .ToList(),
            ExperiencePublishRules.Missing(experience, hasOriginalTranslation),
            experience.CreatedAtUtc,
            experience.UpdatedAtUtc,
            experience.PublishedAtUtc);
    }
}
