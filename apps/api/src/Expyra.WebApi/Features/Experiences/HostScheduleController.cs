using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Scheduling;
using Expyra.Application.Features.Scheduling.Commands;
using Expyra.Application.Features.Scheduling.Commands.CreateRecurrence;
using Expyra.Application.Features.Scheduling.Commands.CreateSlot;
using Expyra.Application.Features.Scheduling.Commands.DeletePricing;
using Expyra.Application.Features.Scheduling.Commands.ExtendSchedule;
using Expyra.Application.Features.Scheduling.Commands.SetPricing;
using Expyra.Application.Features.Scheduling.Commands.StopRecurrence;
using Expyra.Application.Features.Scheduling.Queries.GetHostSchedule;
using Expyra.Domain.Pricing;
using Expyra.Domain.Scheduling;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Experiences;

/// <summary>
/// Host'un takvimi ve fiyatı. <c>HostExperiencesController</c>'dan AYRI dosya:
/// aynı kaynağın altında (<c>/api/host/experiences/{id}/…</c>) ama farklı bir konu
/// ve o dosya zaten ilanın kendisiyle dolu.
///
/// <para>Sınıf düzeyinde rol kapısı ve host kimliğinin yolda olmaması kararları
/// <c>HostExperiencesController</c> ile aynı — gerekçeleri orada yazılı.</para>
/// </summary>
[Route("api/host/experiences")]
[Authorize(Policy = AuthorizationPolicies.Host)]
public sealed class HostScheduleController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Host takvimi: şablonlar, kapalı aralıklar ve seanslar TEK çağrıda. Kapalı ve
    /// geçmiş seanslar DAHİL — host kendi takvimini olduğu gibi görmeli (misafir ucu
    /// onları filtreliyor; iki farklı soru).
    /// </summary>
    /// <param name="from">Yerel tarih. Verilmezse deneyimin saat dilimindeki bugün.</param>
    /// <param name="to">Verilmezse <c>from + 30 gün</c>. Pencere en fazla 62 gün.</param>
    [HttpGet("{id:guid}/schedule")]
    [ProducesResponseType<HostScheduleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HostScheduleResponse>> GetSchedule(
        Guid id,
        CancellationToken cancellationToken,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null)
    {
        var result = await Mediator.Send(new GetHostScheduleQuery(id, from, to), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Haftalık kural(lar) açar ve AYNI istekte ufka kadar seans üretir — host
    /// "her salı 14:00" yazdıktan sonra takvimini boş görmemeli.
    /// </summary>
    /// <remarks>
    /// Yanıttaki <c>report.skipped</c> üretilemeyen günleri sebebiyle veriyor: yaz
    /// saati geçişinde var olmayan bir saat sessizce atlanmıyor.
    /// </remarks>
    [HttpPost("{id:guid}/recurrences")]
    [ProducesResponseType<CreateRecurrenceResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CreateRecurrenceResponse>> CreateRecurrence(
        Guid id,
        CreateRecurrenceRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        // Gövde komuttan AYRI: komut doğrudan bağlansaydı `[ApiController]`
        // doğrulaması `ExperienceId`'yi gövdede arar ve action'a hiç girmeden 400
        // üretirdi (SetTranslationRequest'in ödediği bedel).
        var result = await Mediator.Send(
            new CreateRecurrenceCommand(
                id,
                body.DaysOfWeek,
                body.StartTimeLocal,
                body.StartsOnLocal,
                body.EndsOnLocal,
                body.DstOverlap ?? DstOverlap.First),
            cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <param name="DaysOfWeek">
    /// Gün adları (<c>"tuesday"</c>). Her gün için AYRI kural satırı yazılıyor;
    /// bitmask yok — tekillik ancak satır başına kurulabiliyor.
    /// </param>
    /// <param name="DstOverlap">
    /// Yılda bir kez iki kez yaşanan saatte hangi tekrar. Verilmezse <c>First</c>.
    /// </param>
    public sealed record CreateRecurrenceRequest(
        IReadOnlyList<DayOfWeek> DaysOfWeek,
        TimeOnly StartTimeLocal,
        DateOnly StartsOnLocal,
        DateOnly? EndsOnLocal,
        DstOverlap? DstOverlap);

    /// <summary>
    /// Kuralı DURDURUR (silmez) ve ondan doğmuş, gelecekteki, satılmamış seansları
    /// kapatır. Satılmış olanlar korunuyor — koltuk iptali Blok 13'ün işi.
    /// </summary>
    [HttpDelete("{id:guid}/recurrences/{recurrenceId:guid}")]
    [ProducesResponseType<StopRecurrenceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StopRecurrenceResponse>> StopRecurrence(
        Guid id,
        Guid recurrenceId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new StopRecurrenceCommand(id, recurrenceId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Tek seferlik seans. Yaz saati boşluğuna denk gelirse <b>400</b> — şablonda
    /// atlanıyor, burada reddediliyor çünkü host bu saati AÇIKÇA istedi.
    /// </summary>
    /// <remarks>
    /// Aynı saatte kapalı bir seans varsa YENİDEN AÇILIYOR ve 200 dönüyor; yepyeni
    /// satır 201.
    /// </remarks>
    [HttpPost("{id:guid}/slots")]
    [ProducesResponseType<SlotResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<SlotResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SlotResponse>> CreateSlot(
        Guid id,
        CreateSlotRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new CreateSlotCommand(id, body.StartsAtLocal, body.DstOverlap ?? DstOverlap.First),
            cancellationToken);

        return result.Reopened
            ? Ok(result.Slot)
            : StatusCode(StatusCodes.Status201Created, result.Slot);
    }

    /// <param name="StartsAtLocal">
    /// Deneyimin saat dilimindeki duvar saati (<c>2026-10-13T14:00</c>). Saat dilimi
    /// eki YOK ve olmamalı: bu bir duvar saati, kesin bir an değil.
    /// </param>
    public sealed record CreateSlotRequest(DateTime StartsAtLocal, DstOverlap? DstOverlap);

    /// <summary>
    /// Seansı açar ya da kapatır. <b>Kapasite ve başlangıç bu uçtan DEĞİŞMEZ</b>:
    /// ikisi de satılmış koltukların altını oyabilir ve ayrı birer karar.
    /// </summary>
    [HttpPatch("{id:guid}/slots/{slotId:guid}")]
    [ProducesResponseType<SlotResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SlotResponse>> SetSlotStatus(
        Guid id,
        Guid slotId,
        SetSlotStatusRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new SetSlotStatusCommand(id, slotId, body.Status), cancellationToken);

        return Ok(result);
    }

    public sealed record SetSlotStatusRequest(SlotStatus Status);

    /// <summary>
    /// Seansı siler. Yalnız ELLE eklenmiş, gelecekteki ve hiç satılmamış olanlar;
    /// şablondan doğan seans 409 çünkü bir sonraki üretim onu geri getirirdi.
    /// </summary>
    [HttpDelete("{id:guid}/slots/{slotId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteSlot(Guid id, Guid slotId, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteSlotCommand(id, slotId), cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// "Şu tarihlerde yokum." Aralığa düşen açık ve satılmamış seansları kapatıyor;
    /// satılmış olanların SAYISI yanıtta — host tatile çıktığını sanıp o gün
    /// müşteriyle karşılaşmamalı.
    /// </summary>
    [HttpPost("{id:guid}/blackouts")]
    [ProducesResponseType<CreateBlackoutResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CreateBlackoutResponse>> CreateBlackout(
        Guid id,
        CreateBlackoutRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new CreateBlackoutCommand(id, body.StartsOnLocal, body.EndsOnLocal, body.Note),
            cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <param name="EndsOnLocal">Gün <b>DAHİL</b>.</param>
    public sealed record CreateBlackoutRequest(DateOnly StartsOnLocal, DateOnly EndsOnLocal, string? Note);

    /// <summary>
    /// Kapalı aralığı kaldırır ve YALNIZ onun kapattığı gelecek seansları geri açar.
    /// Host'un elle kapattıkları ve başka bir aralığın kapsadığı günler kapalı kalıyor.
    /// </summary>
    [HttpDelete("{id:guid}/blackouts/{blackoutId:guid}")]
    [ProducesResponseType<DeleteBlackoutResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeleteBlackoutResponse>> DeleteBlackout(
        Guid id,
        Guid blackoutId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new DeleteBlackoutCommand(id, blackoutId), cancellationToken);
        return Ok(result);
    }

    /// <summary>Takvim ufkunu ilerletir. İdempotent; filigran hedefteyse iş yapmıyor.</summary>
    [HttpPost("{id:guid}/schedule/extend")]
    [ProducesResponseType<ExtendScheduleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExtendScheduleResponse>> ExtendSchedule(
        Guid id,
        ExtendScheduleRequest? body,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(
            new ExtendScheduleCommand(id, body?.ThroughLocalDate), cancellationToken);

        return Ok(result);
    }

    public sealed record ExtendScheduleRequest(DateOnly? ThroughLocalDate);

    /// <summary>
    /// Fiyatı TAM DEĞİŞTİRME ile yazar. Tutarlar <b>minör birim tam sayısı</b> —
    /// API hiçbir yerde ondalık para metni ayrıştırmıyor, çünkü "48,50" ile "48.50"
    /// arasındaki fark kültüre bağlı ve yanlış kültürde yüz kat kayardı.
    /// </summary>
    /// <remarks>
    /// Ödeme sağlayıcısının alt/üst sınırı BURADA uygulanıyor: altında fiyat verilen
    /// bir ilan yayınlanabilir ama her ödeme reddedilirdi ve host sebebini haftalar
    /// sonra öğrenirdi.
    /// </remarks>
    [HttpPut("{id:guid}/pricing")]
    [ProducesResponseType<PricingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PricingResponse>> SetPricing(
        Guid id,
        SetPricingRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new SetPricingCommand(id, body.Currency, body.Rules), cancellationToken);

        return Ok(result);
    }

    public sealed record SetPricingRequest(string Currency, IReadOnlyList<PriceRuleInput> Rules);

    /// <summary>
    /// Fiyatı siler. Yayınlanmış ilanda <b>409</b> — bu, para birimi kilidinin
    /// "sil ve yeniden yaz" bypass'ını kapatan şey.
    /// </summary>
    [HttpDelete("{id:guid}/pricing")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeletePricing(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeletePricingCommand(id), cancellationToken);
        return NoContent();
    }
}
