using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Queries.GetHostSchedule;

/// <summary>
/// Host takvim ekranının TEK çağrısı.
///
/// <para><b>Neden <c>LoadOwnedForUpdateAsync</c> KULLANILMIYOR:</b> o metot açık
/// bir transaction istiyor ve satırı <c>FOR UPDATE</c> ile kilitliyor. Bu bir
/// OKUMA; her takvim açılışında deneyim satırını kilitlemek, ay görünümünde
/// gezinen host'un kendi yazma işlemlerini bekletirdi. Sahiplik doğrudan sorgunun
/// filtresinde.</para>
///
/// <para><b>Kapalı ve geçmiş seanslar DAHİL:</b> host kendi takvimini olduğu gibi
/// görmeli. Misafir ucu (Blok 7c) onları filtreliyor — iki farklı soru, iki farklı
/// sorgu.</para>
/// </summary>
public sealed record GetHostScheduleQuery(Guid ExperienceId, DateOnly? From, DateOnly? To)
    : IRequest<HostScheduleResponse>;

internal sealed class GetHostScheduleQueryHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<GetHostScheduleQuery, HostScheduleResponse>
{
    public async Task<HostScheduleResponse> Handle(
        GetHostScheduleQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        var experience = await dbContext.Experiences
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == request.ExperienceId && x.HostId == hostId,
                cancellationToken)
            .ConfigureAwait(false);

        // Başkasının ilanı 404 — enumeration (HostExperienceStore sınıf notu).
        if (experience is null)
        {
            throw new NotFoundException("Deneyim bulunamadı.");
        }

        // Saat dilimi yoksa takvim de yok ama sayfa yine AÇILMALI: host eksikleri
        // görüp tamamlayabilsin. Bu yüzden RequireSchedulable çağrılmıyor, eksikler
        // yanıtta bildiriliyor.
        var missing = ScheduleRules.MissingPrerequisites(experience);

        var zone = experience.TimeZoneId is null ? null : HostScheduleStore.ResolveZone(experience);

        var today = zone is null
            ? DateOnly.FromDateTime(clock.UtcNow.UtcDateTime)
            : HostScheduleStore.TodayLocal(experience, zone, clock);

        var from = request.From ?? today;
        var to = request.To ?? from.AddDays(30);

        if (to < from)
        {
            throw new BadRequestException("Bitiş tarihi başlangıçtan önce olamaz.");
        }

        if (to.DayNumber - from.DayNumber > ScheduleRules.MaxWindowDays)
        {
            throw new BadRequestException(
                $"Takvim penceresi en fazla {ScheduleRules.MaxWindowDays} gün olabilir.");
        }

        var recurrences = await dbContext.RecurrenceTemplates
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id)
            .OrderBy(x => x.DayOfWeek)
            .ThenBy(x => x.StartTimeLocal)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var blackouts = await dbContext.AvailabilityBlackouts
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id && x.EndsOnLocal >= from)
            .OrderBy(x => x.StartsOnLocal)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Pencere YEREL sütunda: host ayı yerel takvimde görüyor ve UTC'ye çevrilmiş
        // bir aralık, gün sınırında bir seansı komşu aya kaydırırdı.
        var windowStart = from.ToDateTime(TimeOnly.MinValue);
        var windowEnd = to.AddDays(1).ToDateTime(TimeOnly.MinValue);

        var slots = await dbContext.AvailabilitySlots
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id
                && x.StartsAtLocal >= windowStart
                && x.StartsAtLocal < windowEnd)
            .OrderBy(x => x.StartsAtUtc)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Fiyat da bu yanıtta ve bunun bir OKUMA YOLU olması şart: `PUT .../pricing`
        // tam değiştirme yapıyor, yani kayıtlı değeri okuyamayan bir form boş açılıp
        // kaydedilirse mevcut kademeleri gerçekten siler. Ayrı bir `GET .../pricing`
        // ucu açılmadı çünkü fiyat formu takvim ekranının bir bölümü — ikinci uç,
        // aynı ekranda ikinci bir istek ve aralarında tutarsız bir an demekti.
        //
        // Takvim ön koşullarından BAĞIMSIZ: şehri olmayan bir taslakta seans yok ama
        // fiyat girilmiş olabilir ve host onu görebilmeli.
        var pricing = await HostPricingProjection
            .LoadAsync(dbContext, experience, cancellationToken)
            .ConfigureAwait(false);

        return new HostScheduleResponse(
            experience.TimeZoneId ?? string.Empty,
            experience.DurationMinutes,
            experience.Capacity,
            ScheduleFormat.Date(from),
            ScheduleFormat.Date(to),
            experience.ScheduleGeneratedThroughLocal is { } through ? ScheduleFormat.Date(through) : null,
            missing,
            recurrences.Select(ScheduleFormat.Recurrence).ToList(),
            blackouts.Select(ScheduleFormat.Blackout).ToList(),
            slots.Select(ScheduleFormat.Slot).ToList(),
            pricing);
    }
}
