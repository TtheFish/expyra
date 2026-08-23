using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.Features.Scheduling.Commands.CreateSlot;

/// <summary>
/// Tek seferlik seans. Şablon dışında, "bu cumartesi de yapıyorum" durumu.
///
/// <para><b>Yaz saati boşluğunda 400, atlama YOK.</b> Şablon üretiminde atlıyoruz
/// çünkü host toplu bir kural yazarken o günü bilmiyor; burada ise açıkça o saati
/// istedi ve sessizce hiçbir şey yapmamak, "kaydettim" deyip kaydetmemek olurdu.
/// Mesajda ilk geçerli saat var.</para>
///
/// <para><b>Kapalı bir seans yeniden AÇILIYOR</b>, ikinci satır eklenmiyor:
/// tekillik durumdan bağımsız (<c>ux_availability_slot_experience_start</c>) ve
/// "aynı saate tekrar seans aç" isteğinin makul karşılığı diriltmek. Satılmış
/// koltuğu olan seans bunun DIŞINDA — o 409 alıyor.</para>
/// </summary>
public sealed record CreateSlotCommand(
    Guid ExperienceId,
    DateTime StartsAtLocal,
    DstOverlap DstOverlap) : IRequest<CreateSlotResult>;

/// <param name="Reopened">
/// Kapalı bir satır yeniden açıldıysa <c>true</c> — çağıran 200, aksi halde 201
/// döndürüyor. İki durumu tek koda sıkıştırmak, istemcinin "yeni mi geldi" sorusunu
/// cevaplayamaması demekti.
/// </param>
public sealed record CreateSlotResult(SlotResponse Slot, bool Reopened);

internal sealed class CreateSlotCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock)
    : IRequestHandler<CreateSlotCommand, CreateSlotResult>
{
    public async Task<CreateSlotResult> Handle(
        CreateSlotCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        HostScheduleStore.RequireSchedulable(experience);

        var zone = HostScheduleStore.ResolveZone(experience);

        if (!SlotStartResolver.TryResolve(request.StartsAtLocal, zone, request.DstOverlap, out var start))
        {
            var firstValid = SlotStartResolver.FirstValidLocalAfter(request.StartsAtLocal, zone);

            // 400, 409 DEĞİL: istenen saat o gün hiç yaşanmıyor, yani istek KENDİSİ
            // geçersiz — kaynağın durumuyla ilgili bir çakışma değil.
            throw new BadRequestException(
                $"{request.StartsAtLocal:HH\\:mm} bu bölgede o gün yaşanmıyor (yaz saati geçişi); "
                + $"ilk geçerli saat {firstValid:HH\\:mm}.")
            {
                Code = ScheduleConflict.DaylightGap,
            };
        }

        if (start.Utc <= clock.UtcNow)
        {
            throw new ConflictException("Geçmişe seans açılamaz.", ScheduleConflict.SlotInPast);
        }

        var localDate = DateOnly.FromDateTime(start.Local);

        var blackedOut = await dbContext.AvailabilityBlackouts
            .AsNoTracking()
            .AnyAsync(
                x => x.ExperienceId == experience.Id
                    && x.StartsOnLocal <= localDate
                    && x.EndsOnLocal >= localDate,
                cancellationToken)
            .ConfigureAwait(false);

        if (blackedOut)
        {
            throw new ConflictException(
                "Bu tarih kapalı olarak işaretlenmiş; önce o aralığı kaldırın.",
                ScheduleConflict.SlotBlackedOut);
        }

        var existing = await dbContext.AvailabilitySlots
            .FirstOrDefaultAsync(
                x => x.ExperienceId == experience.Id && x.StartsAtUtc == start.Utc,
                cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            if (existing.Status == SlotStatus.Open)
            {
                throw new ConflictException(
                    "Bu saatte zaten bir seans var.", ScheduleConflict.SlotExists);
            }

            // Satılmış koltuğu olan seans bu yoldan DİRİLTİLMİYOR. Aşağıdaki
            // tazeleme sayacı ezerdi ve satılmış koltuklar sessizce kaybolurdu —
            // üstelik azaltarak değil ARTIRARAK, yani aynı koltuk ikinci kez
            // satılabilir hale gelirdi.
            //
            // Silme (SlotLifecycle), kural durdurma (StopRecurrence) ve kapalı
            // aralık (BlackoutLifecycle) aynı kontrolü zaten yapıyordu; bu yol
            // atlanmıştı. Koltuk taşıyan bir seansın yeniden açılması Blok 9'un
            // işi (kabul kriteri 5: bu blokta RemainingCapacity yalnız okunuyor).
            if (existing.RemainingCapacity != existing.Capacity)
            {
                throw new ConflictException(
                    "Rezervasyonu olan bir seans yeniden açılamaz.",
                    ScheduleConflict.SlotHasBookings);
            }

            existing.Status = SlotStatus.Open;
            existing.ClosedReason = null;
            existing.ClosedAtUtc = null;

            // Kapasite ve süre TAZELENİYOR: satır kapatıldıktan sonra host bunları
            // değiştirmiş olabilir ve dirilen bir seansın eski koşullarla açılması,
            // ekranda görünmeyen bir tutarsızlık olurdu.
            //
            // Üstteki kontrol sayesinde RemainingCapacity zaten Capacity'ye eşit;
            // yani buradaki atama canlı bir sayacı değiştirmiyor, dokunulmamış bir
            // satırı yeni kapasiteyle yeniden kuruyor.
            existing.DurationMinutes = experience.DurationMinutes;
            existing.Capacity = experience.Capacity;
            existing.RemainingCapacity = experience.Capacity;

            await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            return new CreateSlotResult(ScheduleFormat.Slot(existing), Reopened: true);
        }

        var slot = new AvailabilitySlot
        {
            Id = Guid.CreateVersion7(),
            ExperienceId = experience.Id,

            // Elle eklendi: şablon kimliği YOK. Ayrı bir "kaynak" sütunu olmamasının
            // sebebi bu — kimliğin yokluğu zaten cevabı veriyor.
            RecurrenceTemplateId = null,
            StartsAtUtc = start.Utc,
            StartsAtLocal = start.Local,
            UtcOffsetMinutes = (short)start.Offset.TotalMinutes,
            DurationMinutes = experience.DurationMinutes,
            Capacity = experience.Capacity,
            RemainingCapacity = experience.Capacity,
            Status = SlotStatus.Open,
        };

        dbContext.AvailabilitySlots.Add(slot);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return new CreateSlotResult(ScheduleFormat.Slot(slot), Reopened: false);
    }
}
