using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Pricing;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Queries.GetAvailability;

/// <summary>
/// Misafirin seans listesi ve fiyatı — detay sayfasının takvim bölümünün TEK
/// çağrısı.
/// </summary>
/// <param name="TimeZoneId">
/// Deneyimin saat dilimi (<c>Europe/Prague</c>). İstemci saatleri bununla çiziyor;
/// KENDİ saat diliminden türetmiyor — Prag'daki bir tur, misafir İstanbul'dan
/// baksa da Prag saatinde başlıyor.
/// </param>
/// <param name="From">
/// Yanıtın gerçekten kapsadığı ilk gün. İstenen tarih geçmişteyse BUGÜNE kırpılmış
/// hâli — istemci ne istediğini değil ne aldığını görmeli.
/// </param>
/// <param name="Pricing">Host fiyat girmemişse <c>null</c>. Bu bir hata değil, eksik bir adım.</param>
public sealed record GuestAvailabilityResponse(
    string TimeZoneId,
    string From,
    string To,
    GuestPricingResponse? Pricing,
    IReadOnlyList<GuestSlotResponse> Slots);

/// <summary>
/// Misafire açık tek seans.
///
/// <para><b>Host yanıtındaki alanların yarısı burada YOK</b> ve bu bilinçli:
/// <c>capacity</c> (toplam kontenjan) kaç kişinin aldığını ele verirdi,
/// <c>status</c>/<c>closedReason</c> ise misafir için anlamsız — kapalı seans zaten
/// listede değil.</para>
/// </summary>
/// <param name="StartsAtLocal">
/// Saat dilimi eki OLMADAN duvar saati: <c>2026-10-13T14:00</c>. Ek yazılsaydı
/// istemci onu mutlak bir ana çevirir ve <see cref="StartsAtUtc"/> ile iki farklı
/// doğruluk kaynağı olurdu.
/// </param>
/// <param name="RemainingCapacity">
/// Kalan yer. Bu blokta yalnız OKUNUYOR — yazma Blok 9'da ve kilitli
/// (PLAN kabul kriteri 5).
/// </param>
public sealed record GuestSlotResponse(
    Guid SlotId,
    DateTimeOffset StartsAtUtc,
    string StartsAtLocal,
    DateTimeOffset EndsAtUtc,
    int DurationMinutes,
    int RemainingCapacity);

/// <summary>
/// Misafir takvim/teklif uçlarının ortak parçaları.
///
/// <para><c>HostScheduleStore</c>'un misafir tarafındaki karşılığı; ayrı olmasının
/// sebebi görünürlük kuralının farklı olması: host sahiplik, misafir yayın
/// durumu.</para>
/// </summary>
internal static class GuestScheduleStore
{
    /// <summary>Pencere verilmediğinde kaç gün. Ay görünümü için yeterli.</summary>
    internal const int DefaultWindowDays = 30;

    /// <summary>
    /// Yayındaki deneyim. <b>Yayınlanmamış her şey 404</b> —
    /// <c>GetExperienceBySlugQuery</c> ile aynı kural ve aynı gerekçe: farklı bir
    /// yanıt, yayınlanmamış ilanların varlığını haritalamaya yarayan bir oracle olurdu.
    ///
    /// <para>Takvim ön koşulu (saat dilimi) BURADA da aranıyor: şehri olmayan bir ilan
    /// zaten yayınlanamıyor, yani buraya düşmek şema ile yayın kuralının ayrıştığı
    /// anlamına gelir ve sessizce boş liste dönmek onu görünmez yapardı.</para>
    /// </summary>
    internal static async Task<Experience> LoadVisibleAsync(
        IAppDbContext dbContext,
        string slug,
        CancellationToken cancellationToken)
    {
        // ToLowerInvariant zorunlu: Türkçe kültürde "IZMIR".ToLower() → "ızmır".
        var normalized = slug.Trim().ToLowerInvariant();

        var experience = await GuestExperienceQuery
            .Visible(dbContext)
            .Where(x => x.Slug == normalized)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("Deneyim bulunamadı.");

        if (string.IsNullOrEmpty(experience.TimeZoneId))
        {
            throw new InvalidOperationException(
                $"Yayındaki deneyim {experience.Id} saat dilimi taşımıyor; yayın doğrulaması atlanmış.");
        }

        return experience;
    }

    internal static string Date(DateOnly value)
        => value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    /// <summary>
    /// Saat dilimi eki OLMAYAN yerel damga. <c>ScheduleFormat.LocalStamp</c> ile aynı
    /// biçim; iki uç aynı sözleşmeyi konuşuyor.
    /// </summary>
    internal static string LocalStamp(DateTime value)
        => value.ToString("yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture);
}
