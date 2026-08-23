using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences.Queries.GetAvailability;
using Expyra.Application.Features.Pricing;
using Expyra.Domain.Common;
using Expyra.Domain.Pricing;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Experiences.Queries.GetQuote;

/// <summary>
/// "Bu seansa 2 yetişkin 1 çocuk kaç eder?" Anonim — fiyatı görmek için oturum
/// gerekmiyor.
///
/// <para><b>Hesap sunucuda</b> ve bu bir tercih değil zorunluluk: istemci kalem
/// toplasaydı yuvarlama, kur ve kademe kuralları iki yerde yaşar, biri bir gün
/// ayrışır ve misafir ekranda gördüğünden farklı bir tutar öderdi.</para>
///
/// <para><b>Hiçbir şey rezerve ETMİYOR.</b> Kapasite kontrolü var ama koltuk
/// tutulmuyor; iki misafir aynı anda aynı son koltuk için teklif alabilir. Koltuğu
/// kilitleyen yazma Blok 9'da (kabul kriteri 5: bu blokta
/// <c>RemainingCapacity</c> yalnız okunuyor).</para>
/// </summary>
/// <param name="Adults">Yetişkin sayısı. Üç kademe de sıfır olamaz.</param>
public sealed record GetQuoteQuery(
    string Slug,
    Guid SlotId,
    int Adults,
    int Children,
    int Infants,
    string? Currency) : IRequest<GuestQuoteResponse>;

internal sealed class GetQuoteQueryHandler(IAppDbContext dbContext, IDateTimeProvider clock)
    : IRequestHandler<GetQuoteQuery, GuestQuoteResponse>
{
    public async Task<GuestQuoteResponse> Handle(
        GetQuoteQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var experience = await GuestScheduleStore
            .LoadVisibleAsync(dbContext, request.Slug, cancellationToken)
            .ConfigureAwait(false);

        var slot = await dbContext.AvailabilitySlots
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == request.SlotId && x.ExperienceId == experience.Id,
                cancellationToken)
            .ConfigureAwait(false)
            // Başka bir deneyimin seansı da 404: id'nin varlığını doğrulamak, seans
            // kimliklerini haritalamaya yarardı.
            ?? throw new NotFoundException("Seans bulunamadı.");

        // Geçmiş seans için teklif, satın alınamayacak bir şeye fiyat vermek olurdu.
        if (slot.StartsAtUtc <= clock.UtcNow)
        {
            throw new ConflictException("Bu seans geçti.", ScheduleConflict.SlotInPast);
        }

        if (slot.Status != SlotStatus.Open)
        {
            throw new ConflictException("Bu seans kapalı.", ScheduleConflict.SlotClosed);
        }

        var pricing = await GuestPricingStore
            .LoadAsync(dbContext, experience.Id, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new ConflictException(
                "Bu deneyimin fiyatı henüz girilmemiş.", ScheduleConflict.PricingMissing);

        var party = new Dictionary<GuestType, int>
        {
            [GuestType.Adult] = request.Adults,
            [GuestType.Child] = request.Children,
            [GuestType.Infant] = request.Infants,
        };

        var display = await ExchangeRateStore
            .ResolveAsync(
                dbContext, pricing.ChargeCurrency, pricing.ChargeMinorUnits,
                request.Currency, cancellationToken)
            .ConfigureAwait(false);

        var result = QuoteCalculator.Calculate(
            pricing.ChargeCurrency, pricing.UnitPrices, party, display?.Conversion);

        var quote = result.Value ?? throw Reject(result);

        // Bebeğin koltuk tüketip tüketmediği DENEYİME bağlı: teknede her baş sayılır,
        // yürüyüş turunda kucaktaki bebek saymayabilir.
        var seats = experience.InfantCountsTowardCapacity
            ? quote.Headcount
            : quote.Headcount - request.Infants;

        if (seats > slot.RemainingCapacity)
        {
            throw new ConflictException(
                $"Bu seansta {slot.RemainingCapacity} yer kaldı, {seats} kişi seçtiniz.",
                ScheduleConflict.InsufficientCapacity);
        }

        return new GuestQuoteResponse(
            slot.Id,
            slot.StartsAtUtc,
            GuestScheduleStore.LocalStamp(slot.StartsAtLocal),
            experience.TimeZoneId!,
            quote.Headcount,
            seats,
            new GuestQuoteAmountResponse(
                quote.Charge.Currency,
                pricing.ChargeMinorUnits,
                quote.Charge.AmountMinor),
            quote.Display is { } shown && display is { } rate
                ? new GuestQuoteDisplayResponse(
                    shown.Currency, rate.MinorUnits, shown.AmountMinor,
                    rate.SnapshotId, rate.CapturedAtUtc)
                : null,
            [.. quote.Lines.Select(x => new GuestQuoteLineResponse(
                x.Tier.ToString().ToLowerInvariant(),
                x.Count,
                x.UnitPrice.AmountMinor,
                x.LineTotal.AmountMinor))]);
    }

    /// <summary>
    /// Hesap sonucunu HTTP'ye çevirir. <see cref="QuoteFailure"/> bir istisna değil
    /// bir dönüş değeri; hangi kademenin eksik olduğunu söyleyebilmek için.
    /// </summary>
    private static AppException Reject(QuoteResult result) => result.Failure switch
    {
        QuoteFailure.EmptyParty => new BadRequestException("En az bir kişi seçilmeli."),

        QuoteFailure.PartyTooLarge => new BadRequestException(
            $"Tek seferde en fazla {PricingRules.MaxPartySize} kişi seçilebilir."),

        // 409, 400 DEĞİL: istekte yanlış bir şey yok, host o kademenin fiyatını
        // girmemiş — istemci isteği düzelterek bunu geçemez.
        QuoteFailure.MissingTierPrice => new ConflictException(
            $"Bu deneyimde {result.Tier} kademesi için fiyat tanımlı değil.",
            ScheduleConflict.TierNotOffered),

        _ => throw new ArgumentOutOfRangeException(nameof(result)),
    };
}

/// <param name="Seats">
/// Kontenjandan düşen kişi sayısı. <see cref="Headcount"/>'tan farklı olabilir:
/// bebek, deneyimin ayarına göre koltuk tüketmeyebilir.
/// </param>
/// <param name="Charge">
/// <b>Tahsil edilecek tutar</b>, daima host'un para biriminde. Blok 9 rezervasyona
/// bunu donduracak.
/// </param>
/// <param name="Display">
/// Misafirin para birimindeki karşılık; istenmemişse <c>null</c>. <b>Ayrı alan</b>
/// olması kabul kriteri 3'ü tip düzeyinde koruyor — çevrilmiş tutar hiçbir yerde
/// tahsilata girmiyor.
/// </param>
public sealed record GuestQuoteResponse(
    Guid SlotId,
    DateTimeOffset StartsAtUtc,
    string StartsAtLocal,
    string TimeZoneId,
    int Headcount,
    int Seats,
    GuestQuoteAmountResponse Charge,
    GuestQuoteDisplayResponse? Display,
    IReadOnlyList<GuestQuoteLineResponse> Lines);

public sealed record GuestQuoteAmountResponse(string Currency, int MinorUnits, long AmountMinor);

public sealed record GuestQuoteDisplayResponse(
    string Currency,
    int MinorUnits,
    long AmountMinor,
    Guid RateSnapshotId,
    DateTimeOffset CapturedAtUtc);

/// <summary>
/// Tek kalem. <b>Yalnız tahsilat para biriminde</b>: kalem kalem çevrilmiş tutarlar
/// toplandığında yuvarlama farkı yüzünden gösterim toplamını tutmayabilirdi ve
/// ekranda "2+1 ≠ 3" görünürdü. Gösterim TOPLAM üzerinden bir kez çevriliyor.
/// </summary>
public sealed record GuestQuoteLineResponse(
    string GuestType,
    int Count,
    long UnitAmountMinor,
    long LineTotalMinor);
