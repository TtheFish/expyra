using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Pricing;
using Expyra.Application.Features.Scheduling;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Experiences.Queries.GetAvailability;

/// <summary>
/// Misafirin gördüğü seanslar. Anonim.
///
/// <para><b>Host ucundan üç farkı var</b> ve üçü de bilinçli: kapalı seanslar
/// dönmüyor, geçmiş seanslar dönmüyor (PLAN Blok 7 kabul kriteri 4) ve yeri
/// kalmamış seanslar dönmüyor. Host kendi takvimini olduğu gibi görmeli — o başka
/// bir soru ve başka bir uç.</para>
///
/// <para><b>Fiyat da bu yanıtta.</b> Ayrı bir uç olsaydı detay sayfası tarih ve
/// fiyatı iki istekle çeker, aralarında tutarsız bir an olurdu; üstelik "seans seç,
/// fiyatı gör" akışı zaten tek ekran.</para>
/// </summary>
/// <param name="From">Deneyimin saat dilimindeki yerel tarih. Verilmezse bugün.</param>
/// <param name="To">Verilmezse <c>from + 30 gün</c>. Pencere en fazla 62 gün.</param>
/// <param name="Currency">
/// Misafirin görmek istediği para birimi. Verilmezse çevrim yapılmıyor — 1.0 oranlı
/// sahte bir çevrim üretmek, "çevrildi mi" sorusunu cevaplanamaz yapardı.
/// </param>
public sealed record GetAvailabilityQuery(
    string Slug,
    DateOnly? From,
    DateOnly? To,
    string? Currency) : IRequest<GuestAvailabilityResponse>;

internal sealed class GetAvailabilityQueryHandler(IAppDbContext dbContext, IDateTimeProvider clock)
    : IRequestHandler<GetAvailabilityQuery, GuestAvailabilityResponse>
{
    public async Task<GuestAvailabilityResponse> Handle(
        GetAvailabilityQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var experience = await GuestScheduleStore
            .LoadVisibleAsync(dbContext, request.Slug, cancellationToken)
            .ConfigureAwait(false);

        var zone = HostScheduleStore.ResolveZone(experience);
        var today = HostScheduleStore.TodayLocal(experience, zone, clock);

        var from = request.From ?? today;
        var to = request.To ?? from.AddDays(GuestScheduleStore.DefaultWindowDays);

        if (to < from)
        {
            throw new BadRequestException("Bitiş tarihi başlangıçtan önce olamaz.");
        }

        if (to.DayNumber - from.DayNumber > ScheduleRules.MaxWindowDays)
        {
            throw new BadRequestException(
                $"Takvim penceresi en fazla {ScheduleRules.MaxWindowDays} gün olabilir.");
        }

        // Geçmiş DAİMA kırpılıyor, istemci ne isterse istesin: `from` geçmişe
        // verilebilir ve verilecek de (ay görünümü ayın 1'inden başlar).
        var effectiveFrom = from < today ? today : from;

        var now = clock.UtcNow;

        var slots = await dbContext.AvailabilitySlots
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id
                && x.Status == SlotStatus.Open
                && x.RemainingCapacity > 0
                // Kabul kriteri 4. Yerel tarih penceresi tek başına yetmiyor: bugünün
                // sabahki seansı pencerenin İÇİNDE ama geçmişte.
                && x.StartsAtUtc > now
                && x.StartsAtLocal >= effectiveFrom.ToDateTime(TimeOnly.MinValue)
                && x.StartsAtLocal < to.AddDays(1).ToDateTime(TimeOnly.MinValue))
            .OrderBy(x => x.StartsAtUtc)
            .Select(x => new
            {
                x.Id,
                x.StartsAtUtc,
                x.StartsAtLocal,
                x.DurationMinutes,
                x.RemainingCapacity,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Biçimlendirme bellekte: duvar saatinin metin hâli değişmez kültürde
        // üretiliyor ve o çağrı SQL'e çevrilemez.
        var rows = slots
            .Select(x => new GuestSlotResponse(
                x.Id,
                x.StartsAtUtc,
                GuestScheduleStore.LocalStamp(x.StartsAtLocal),
                x.StartsAtUtc.AddMinutes(x.DurationMinutes),
                x.DurationMinutes,
                x.RemainingCapacity))
            .ToList();

        var pricing = await GuestPricingStore
            .LoadAsync(dbContext, experience.Id, cancellationToken)
            .ConfigureAwait(false);

        var display = pricing is null
            ? null
            : await ExchangeRateStore
                .ResolveAsync(
                    dbContext, pricing.ChargeCurrency, pricing.ChargeMinorUnits,
                    request.Currency, cancellationToken)
                .ConfigureAwait(false);

        return new GuestAvailabilityResponse(
            experience.TimeZoneId!,
            GuestScheduleStore.Date(effectiveFrom),
            GuestScheduleStore.Date(to),
            pricing is null ? null : GuestPricingStore.ToResponse(pricing, display),
            rows);
    }
}
