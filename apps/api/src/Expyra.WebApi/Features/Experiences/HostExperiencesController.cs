using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Commands.ArchiveExperience;
using Expyra.Application.Features.Experiences.Commands.ConfirmMedia;
using Expyra.Application.Features.Experiences.Commands.CreateExperience;
using Expyra.Application.Features.Experiences.Commands.CreateMediaUpload;
using Expyra.Application.Features.Experiences.Commands.DeleteMedia;
using Expyra.Application.Features.Experiences.Commands.PublishExperience;
using Expyra.Application.Features.Experiences.Commands.UnpublishExperience;
using Expyra.Application.Features.Experiences.Commands.ReorderMedia;
using Expyra.Application.Features.Experiences.Commands.SetExperienceDetails;
using Expyra.Application.Features.Experiences.Commands.SetExperienceTranslation;
using Expyra.Application.Features.Experiences.Commands.SetItinerary;
using Expyra.Application.Features.Experiences.Commands.SetMeetingPoint;
using Expyra.Domain.Experiences;
using Expyra.Application.Features.Experiences.Commands.SetMediaCover;
using Expyra.Application.Features.Experiences.Commands.UpdateExperience;
using Expyra.Application.Features.Experiences.Queries.GetHostExperiences;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Experiences;

/// <summary>
/// Host'un kendi ilanları. <b>Sınıf düzeyinde rol kapısı</b>: buradaki uçların hiçbiri
/// host olmayan bir hesaba açık değil, dolayısıyla kapı uç bazında tekrarlanmıyor —
/// unutulan tek bir <c>[Authorize]</c> tüm ilan yönetimini herkese açardı
/// (<c>HostController</c> kapıyı uç bazında koyuyor çünkü orada "host ol" ucu var,
/// yani kapının kendisi kapının arkasında olamaz).
///
/// <para>Host kimliği YOLDA YOK ve olmayacak (CLAUDE.md #3): kaynak adı
/// <c>/api/host/experiences</c>, <c>/api/hosts/{hostId}/experiences</c> değil. Kimlik
/// token'dan okunuyor; başkasının ilanını düzenleme denemesi tek bir yetki kontrolüne
/// değil, sorgunun şekline bağlı.</para>
///
/// <para>Misafirin gördüğü uçlar burada DEĞİL — onlar <c>/api/experiences</c> altında
/// ve anonim (Blok 5b).</para>
/// </summary>
[Route("api/host/experiences")]
[Authorize(Policy = AuthorizationPolicies.Host)]
public sealed class HostExperiencesController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Host'un ilanları, durum filtresiyle. Taslaklar ve arşivler DAHİL — bu liste
    /// misafirin gördüğü listenin bir alt kümesi değil, host panelinin kendisi.
    /// </summary>
    /// <param name="status">
    /// <c>Draft</c> | <c>Published</c> | <c>Archived</c>. Tanınmayan değer 400 döner,
    /// sessizce yok sayılmaz.
    /// </param>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<HostExperienceResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<HostExperienceResponse>>> List(
        CancellationToken cancellationToken,
        [FromQuery] string? status = null)
    {
        var result = await Mediator.Send(new GetHostExperiencesQuery(status), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Boş taslak açar. Tek alanı <c>originalLanguage</c> ve o alan bir daha DEĞİŞMEZ
    /// (bkz. <see cref="CreateExperienceCommand"/>).
    /// </summary>
    /// <remarks>
    /// 201 dönüyor ama <c>Location</c> başlığı YOK: bu blokta host tarafında tekil bir
    /// GET ucu bulunmuyor (liste ucu var) ve misafirin göreceği kalıcı URL ancak ilan
    /// yayınlandığında doğuyor. Var olmayan bir adrese işaret eden bir başlık, olmayandan
    /// kötüdür.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<HostExperienceResponse>> Create(
        CreateExperienceCommand command,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Dil-bağımsız alanlar. Gerçek bir PATCH: verilmeyen alan değişmez, koleksiyonlarda
    /// "boşalt" niyeti boş dizi ile anlatılır (bkz. <see cref="UpdateExperienceCommand"/>).
    /// </summary>
    /// <remarks>
    /// Başkasının ilanı <b>404</b> döner, 403 değil — 403 "bu id'de bir ilan var" bilgisini
    /// sızdırırdı. Saat dilimi istemciden ALINMAZ, seçilen şehirden türer.
    /// </remarks>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> Update(
        Guid id,
        UpdateExperienceCommand command,
        CancellationToken cancellationToken)
    {
        // Kaynak kimliği YOLDAN gelir. Gövdedeki değer ne olursa olsun üzerine yazılıyor:
        // iki farklı id taşıyan bir istekte hangisinin kazandığı belirsiz kalmamalı.
        var result = await Mediator.Send(command with { ExperienceId = id }, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Bir dildeki başlık ve açıklama. PUT ve upsert: satır yoksa açılır, varsa üzerine
    /// yazılır. Dil kodu sunucuda kanonikleşir (<c>en_us</c> → <c>en-US</c>).
    /// </summary>
    /// <param name="language">
    /// İlan METNİNİN dili — host'un konuştuğu dil DEĞİL (docs/I18N.md §3). İkincisi
    /// PATCH ucundaki <c>spokenLanguages</c> alanı.
    /// </param>
    [HttpPut("{id:guid}/translations/{language}")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HostExperienceResponse>> SetTranslation(
        Guid id,
        string language,
        SetTranslationRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new SetExperienceTranslationCommand(id, language, body.Title, body.Description),
            cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// Gövde tipi komuttan AYRI.
    ///
    /// <para>Komut doğrudan gövdeye bağlanırsa <c>[ApiController]</c>'ın otomatik
    /// doğrulaması action'a HİÇ girmeden 400 üretiyor: <c>Language</c> ve
    /// <c>ExperienceId</c> yoldan geliyor ama doğrulayıcı onları gövdede arıyor.
    /// Yani <c>command with { … }</c> satırı çalışmıyordu bile. Gövde yalnız
    /// gerçekten gövdede olan alanları taşıyor.</para>
    /// </summary>
    public sealed record SetTranslationRequest(string Title, string? Description);

    /// <summary>
    /// "Bilmen gerekenler": yaş sınırı, aktivite seviyesi (dil bağımsız) ve üç
    /// serbest metin (<paramref name="language"/> dilinde). Tam değiştirme; boş alan
    /// temizler. O dilde başlık yoksa metin yazılamaz: 409 <c>translation-missing</c>.
    /// </summary>
    [HttpPut("{id:guid}/details/{language}")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> SetDetails(
        Guid id,
        string language,
        SetDetailsRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new SetExperienceDetailsCommand(
                id,
                language,
                body.MinimumAge,
                body.ActivityLevel,
                body.WhatToBring,
                body.NotIncluded,
                body.Accessibility),
            cancellationToken);

        return Ok(result);
    }

    public sealed record SetDetailsRequest(
        int? MinimumAge,
        ActivityLevel? ActivityLevel,
        string? WhatToBring,
        string? NotIncluded,
        string? Accessibility);

    /// <summary>
    /// Buluşma noktası: adres ve koordinat dil bağımsız, yönerge
    /// <paramref name="language"/> dilinde. Tam değiştirme.
    /// </summary>
    [HttpPut("{id:guid}/meeting-point/{language}")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> SetMeetingPoint(
        Guid id,
        string language,
        SetMeetingPointRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new SetMeetingPointCommand(
                id, language, body.Address, body.Latitude, body.Longitude, body.Instructions),
            cancellationToken);

        return Ok(result);
    }

    public sealed record SetMeetingPointRequest(
        string? Address,
        double? Latitude,
        double? Longitude,
        string? Instructions);

    /// <summary>
    /// Program ("Neler yapacağız") — <paramref name="language"/> dilinin listesi
    /// TOPTAN yazılır; boş liste programı kaldırır.
    /// </summary>
    [HttpPut("{id:guid}/itinerary/{language}")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> SetItinerary(
        Guid id,
        string language,
        SetItineraryRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new SetItineraryCommand(id, language, body.Steps ?? []),
            cancellationToken);

        return Ok(result);
    }

    public sealed record SetItineraryRequest(IReadOnlyList<ItineraryStepInput>? Steps);

    /// <summary>
    /// Yayına alır. Eksik ilan <b>409</b> alır ve taslak DEĞİŞMEDEN kalır; hangi alanların
    /// eksik olduğu yanıttaki <c>missingPublishRequirements</c> alanından da okunabiliyor
    /// (liste ucu). İdempotent: yayındaki ilan için 200.
    /// </summary>
    [HttpPost("{id:guid}/publish")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> Publish(
        Guid id,
        CancellationToken cancellationToken)
    {
        // Gövde YOK: uç hiçbir alan almıyor, kaynak yoldan, kimlik token'dan.
        var result = await Mediator.Send(new PublishExperienceCommand(id), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Yayındaki ilanı taslağa alır. Arşivden hafif alternatif — görsel düzenlemek
    /// veya kısa ara vermek için. İdempotent: taslak/arsiv için 200, durum değişmez.
    /// </summary>
    [HttpPost("{id:guid}/unpublish")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HostExperienceResponse>> Unpublish(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new UnpublishExperienceCommand(id), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Raftan indirir. Doğrulama İSTEMEZ (eksik taslak da arşivlenebilir) ve idempotenttir.
    /// Silme ucu yok — gerekçe <see cref="ArchiveExperienceCommand"/>'da.
    /// </summary>
    [HttpPost("{id:guid}/archive")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HostExperienceResponse>> Archive(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new ArchiveExperienceCommand(id), cancellationToken);
        return Ok(result);
    }
    /// <summary>
    /// Görsel yüklemek için imzalı adres üretir. <b>Bayt bu uçtan geçmiyor</b> — dönen
    /// adrese tarayıcı doğrudan PUT ediyor (PLAN Blok 6 kabul kriteri 1).
    /// </summary>
    /// <remarks>
    /// İki adımlı akışın birincisi. İkincisi <c>POST .../media/{mediaId}/confirm</c>:
    /// yükleme bitince çağrılıyor ve doğrulamayı O yapıyor. Tek adım mümkün değil —
    /// sunucu, tarayıcının yüklemeyi bitirdiğini kendiliğinden öğrenemiyor.
    /// </remarks>
    [HttpPost("{id:guid}/media/upload-url")]
    [ProducesResponseType<MediaUploadResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MediaUploadResponse>> CreateMediaUpload(
        Guid id,
        CreateMediaUploadRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        // Gövde komuttan ayrı — gerekçe SetTranslationRequest'te.
        var result = await Mediator.Send(
            new CreateMediaUploadCommand(id, body.ContentType, body.ByteSize),
            cancellationToken);

        return Ok(result);
    }

    /// <param name="ByteSize">
    /// Yüklenecek dosyanın boyutu. İmzalanan tavana giriyor: beyandan büyük bir gövde
    /// depo tarafından reddediliyor.
    /// </param>
    public sealed record CreateMediaUploadRequest(string ContentType, long ByteSize);

    /// <summary>
    /// Yüklemeyi doğrular ve görseli yayına açar. Sihirli baytlar okunuyor: "image/png"
    /// başlığıyla gönderilmiş bir HTML burada reddediliyor (PLAN Blok 6 kabul kriteri 2).
    /// İdempotent — doğrulanmış görsel için 200.
    /// </summary>
    [HttpPost("{id:guid}/media/{mediaId:guid}/confirm")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> ConfirmMedia(
        Guid id,
        Guid mediaId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new ConfirmMediaCommand(id, mediaId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Galeri sırasını toptan yazar. Görsel başına PATCH DEĞİL — gerekçe
    /// <see cref="ReorderMediaCommand"/>'da.
    /// </summary>
    [HttpPut("{id:guid}/media/order")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> ReorderMedia(
        Guid id,
        ReorderMediaRequest body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        var result = await Mediator.Send(
            new ReorderMediaCommand(id, body.MediaIds), cancellationToken);

        return Ok(result);
    }

    public sealed record ReorderMediaRequest(IReadOnlyList<Guid> MediaIds);

    /// <summary>
    /// Kapağı bu görsele taşır. Kapağı BOŞALTAN uç yok — gerekçe
    /// <see cref="SetMediaCoverCommand"/>'da.
    /// </summary>
    [HttpPut("{id:guid}/media/{mediaId:guid}/cover")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HostExperienceResponse>> SetMediaCover(
        Guid id,
        Guid mediaId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new SetMediaCoverCommand(id, mediaId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Görseli siler; depodaki nesne de gidiyor (PLAN Blok 6 kabul kriteri 4).
    /// Yayındaki ilanın SON görseli silinemez — 409.
    /// </summary>
    [HttpDelete("{id:guid}/media/{mediaId:guid}")]
    [ProducesResponseType<HostExperienceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HostExperienceResponse>> DeleteMedia(
        Guid id,
        Guid mediaId,
        CancellationToken cancellationToken)
    {
        // 204 DEĞİL 200: silme sonrası kapak devredilmiş olabilir ve istemcinin
        // yeni durumu ayrıca sorgulaması gerekmiyor (diğer host uçlarıyla aynı şekil).
        var result = await Mediator.Send(new DeleteMediaCommand(id, mediaId), cancellationToken);
        return Ok(result);
    }
}
