using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences;

/// <summary>
/// Host ilan listesinin bir sayfası — misafir listesiyle (<see cref="GuestExperiencePageResponse"/>)
/// aynı sözleşme: toplam sayı yok, <c>NextCursor</c> son sayfada <c>null</c> ve dolu bir
/// cursor daima gerçekten satır olduğu anlamına geliyor (sayfa boyutundan bir fazla
/// satır çekiliyor).
/// </summary>
public sealed record HostExperiencePageResponse(
    IReadOnlyList<HostExperienceResponse> Items,
    string? NextCursor);

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
/// METİN olarak: <c>"Draft" | "Published" | "Archived"</c>. Sözleşme enum SIRASINA
/// bağlanmasın diye — sıra değiştiği gün eski istemciler başka bir durumu okurdu.
/// Sütunun metin olarak saklanmasıyla aynı gerekçe.
///
/// <para><b>Büyük harfle</b> ve bu bir istisna: <c>Program.cs</c>'teki
/// <c>JsonStringEnumConverter</c> camelCase üretiyor ve takvim/fiyat yanıtları da
/// öyle (<c>"open"</c>, <c>"adult"</c>). Bu alan ondan ÖNCE yazıldı ve web
/// (<c>experiences-api.ts</c>, <c>host/experience/[id]/page.tsx</c>) PascalCase
/// karşılaştırıyor; değiştirmek istemciyi sessizce kırar. Hizalanacaksa iki taraf
/// AYNI commit'te değişmeli.</para>
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
/// <param name="Media">
/// Galeri, <see cref="ExperienceMedia.SortOrder"/> sırasında. <b>Yalnız doğrulanmış
/// satırlar</b>: imzalı adresi alınmış ama yüklenmemiş bir görsel burada çıksaydı host
/// panelinde kırık küçük resim olurdu. Yükleme ile kayıt arasındaki geçici durumu
/// istemci kendi belleğinde tutuyor — kimliği zaten yükleme ucundan aldı.
/// </param>
/// <param name="InfantCountsTowardCapacity">
/// Bebek koltuk tüketiyor mu. Arayüz anahtarı bununla çiziyor; misafir yanıtında YOK
/// çünkü misafirin gördüğü şey kararın kendisi değil sonucu (teklifteki <c>seats</c>).
/// </param>
public sealed record HostExperienceResponse(
    Guid Id,
    string? Slug,
    string Status,
    Guid? CityId,
    string? CategorySlug,
    int DurationMinutes,
    int Capacity,
    bool InfantCountsTowardCapacity,
    string? TimeZoneId,
    string OriginalLanguage,
    int? MinimumAge,
    string? ActivityLevel,
    HostMeetingPointResponse? MeetingPoint,
    IReadOnlyList<string> SpokenLanguages,
    IReadOnlyList<string> Tags,
    IReadOnlyList<HostExperienceTranslationResponse> Translations,
    IReadOnlyList<HostItineraryStepResponse> Itinerary,
    IReadOnlyList<HostExperienceMediaResponse> Media,
    IReadOnlyList<string> MissingPublishRequirements,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc,
    DateTimeOffset? PublishedAtUtc);

/// <param name="Url">
/// Okuma adresi, HER YANITTA yeniden üretiliyor (<c>IObjectStorage.PublicUrl</c>).
/// Veritabanında adres değil anahtar duruyor: CDN alan adı değiştiğinde geçmiş
/// satırların hiçbiri migration istemiyor.
/// </param>
/// <param name="Width">
/// Gerçek piksel genişliği — baytlardan okundu, istemcinin beyanı değil.
/// <c>next/image</c> düzen kaymasını önlemek için çizimden önce bunu istiyor.
/// </param>
public sealed record HostExperienceMediaResponse(
    Guid Id,
    Uri Url,
    int Width,
    int Height,
    int SortOrder,
    bool IsCover);

/// <param name="Source">
/// <c>"HostWritten" | "Machine"</c> — metin, bkz. <see cref="HostExperienceResponse.Status"/>.
/// Bu blokta daima <c>HostWritten</c>; alan Blok 10'un makine çevirisi için hazır.
/// </param>
public sealed record HostExperienceTranslationResponse(
    string Language,
    string Title,
    string? Description,
    string? WhatToBring,
    string? NotIncluded,
    string? Accessibility,
    string? MeetingInstructions,
    string Source,
    DateTimeOffset UpdatedAtUtc);

/// <summary>Adres dil bağımsız; yönerge çeviri satırında (<c>MeetingInstructions</c>).</summary>
public sealed record HostMeetingPointResponse(string? Address, double? Latitude, double? Longitude);

/// <summary>Tüm dillerin adımları tek listede; arayüz aktif dile göre süzüyor.</summary>
public sealed record HostItineraryStepResponse(string Language, int SortOrder, string Title, string? Body);

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
        IObjectStorage storage,
        Experience experience,
        CancellationToken cancellationToken)
    {
        var responses = await ToResponsesAsync(dbContext, storage, new[] { experience }, cancellationToken)
            .ConfigureAwait(false);

        return responses[0];
    }

    internal static async Task<IReadOnlyList<HostExperienceResponse>> ToResponsesAsync(
        IAppDbContext dbContext,
        IObjectStorage storage,
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

        // Yalnız Active: Pending satırlar yüklenmemiş olabilir ve panelde kırık
        // küçük resme dönerdi (Media parametresinin notu).
        var media = await dbContext.ExperienceMedia
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId) && x.Status == MediaStatus.Active)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Fiyatı OLAN ilanların kimlikleri. Kural satırı olmayan bir fiyat sayfası
        // sayılmıyor — o "fiyat girilmedi" demek (GuestPricingStore ile aynı ayrım).
        // Tutarlar çekilmiyor, yalnız varlık: yayın kapısının sorduğu soru bu.
        var itinerary = await dbContext.ExperienceItinerarySteps
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId))
            .OrderBy(x => x.Language)
            .ThenBy(x => x.SortOrder)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var priced = (await dbContext.ExperiencePrices
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId)
                && dbContext.PriceRules.Any(rule => rule.ExperiencePriceId == x.Id))
            .Select(x => x.ExperienceId)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false))
            .ToHashSet();

        var translationsById = translations.ToLookup(x => x.ExperienceId);
        var spokenById = spoken.ToLookup(x => x.ExperienceId);
        var tagsById = tags.ToLookup(x => x.ExperienceId);
        var mediaById = media.ToLookup(x => x.ExperienceId);
        var itineraryById = itinerary.ToLookup(x => x.ExperienceId);

        // Sıra girdideki sıra: sorgunun OrderBy'ı korunuyor, lookup onu bozmuyor.
        return experiences
            .Select(experience => Compose(
                experience,
                translationsById[experience.Id].ToList(),
                spokenById[experience.Id].Select(x => x.Language).ToList(),
                tagsById[experience.Id].Select(x => x.DisplayTag).ToList(),
                itineraryById[experience.Id]
                    .Select(x => new HostItineraryStepResponse(x.Language, x.SortOrder, x.Title, x.Body))
                    .ToList(),
                mediaById[experience.Id]
                    .Select(x => new HostExperienceMediaResponse(
                        x.Id,
                        storage.PublicUrl(x.StorageKey),
                        x.Width,
                        x.Height,
                        x.SortOrder,
                        x.IsCover))
                    .ToList(),
                priced.Contains(experience.Id)))
            .ToList();
    }

    private static HostExperienceResponse Compose(
        Experience experience,
        IReadOnlyList<ExperienceTranslation> translations,
        IReadOnlyList<string> spokenLanguages,
        IReadOnlyList<string> tags,
        IReadOnlyList<HostItineraryStepResponse> itinerary,
        IReadOnlyList<HostExperienceMediaResponse> media,
        bool hasPrice)
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
            experience.InfantCountsTowardCapacity,
            experience.TimeZoneId,
            experience.OriginalLanguage,
            experience.MinimumAge,
            TranslationText.ActivityLevelName(experience.ActivityLevel),
            // Üçü de boşsa null: arayüz "buluşma noktası girilmemiş" dalını tek
            // bir null kontrolüyle seçiyor.
            experience.MeetingAddress is null && experience.MeetingLatitude is null
                ? null
                : new HostMeetingPointResponse(
                    experience.MeetingAddress, experience.MeetingLatitude, experience.MeetingLongitude),
            spokenLanguages,
            tags,
            translations
                .Select(x => new HostExperienceTranslationResponse(
                    x.Language,
                    x.Title,
                    x.Description,
                    x.WhatToBring,
                    x.NotIncluded,
                    x.Accessibility,
                    x.MeetingInstructions,
                    x.Source.ToString(),
                    x.UpdatedAtUtc))
                .ToList(),
            itinerary,
            media,
            ExperiencePublishRules.Missing(
                experience, hasOriginalTranslation, media.Any(x => x.IsCover), hasPrice),
            experience.CreatedAtUtc,
            experience.UpdatedAtUtc,
            experience.PublishedAtUtc);
    }
}
