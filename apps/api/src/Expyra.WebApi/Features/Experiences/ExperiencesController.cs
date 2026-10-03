using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Queries.GetAvailability;
using Expyra.Application.Features.Experiences.Queries.GetExperienceBySlug;
using Expyra.Application.Features.Experiences.Queries.GetExperiences;
using Expyra.Application.Features.Experiences.Queries.GetQuote;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Experiences;

/// <summary>
/// Misafirin gördüğü deneyimler. Uçların <b>hepsi ANONİM</b> — fallback policy oturum
/// istediği için (#49) bu AÇIKÇA <c>[AllowAnonymous]</c> ile söyleniyor. Keşif, giriş yapmamış
/// misafirin gördüğü ilk şey; oturum istemek vitrini kilitlerdi. Fiyat ve müsaitlik de
/// aynı kapıda: tarih ve tutarı görmek için hesap açtırmak, satın alma kararından
/// önce bir duvar örmek olurdu.
///
/// <para>Host'un kendi ilanları burada DEĞİL — onlar <c>/api/host/experiences</c> altında
/// ve rol kapısının arkasında. İki uç kümesinin ayrı controller'larda olması bir düzen
/// tercihi değil: sınıf düzeyindeki <c>[Authorize(Policy = "Host")]</c> ile anonim uçlar
/// aynı sınıfta yaşasaydı, kapıyı açmak tek bir <c>[AllowAnonymous]</c> unutmaya kalırdı.</para>
///
/// <para><b>Önbellek başlığı bilinçli olarak YOK.</b> <c>PublicCacheAttribute</c> kendi
/// notunda "yalnız kayıt defteri uçları" diyor ve ilan verisi kayıt defteri değil: host
/// "Yayınla"ya bastığında ilan görünmeli, "Arşivle"ye bastığında kaybolmalı. Paylaşılan
/// bir önbellekte <c>max-age</c>, arşivlenmiş bir ilanı süre dolana kadar servis etmeye
/// devam eder — misafir onu listede görür, tıklar ve 404 alır; yani önbelleğin bedelini
/// misafir kırık bir akış olarak öder. Trafik gerçekten gerektirdiğinde doğru araç,
/// yayınla/arşivle akışına bağlı bir CDN temizleme (purge) yolu — bir başlık değil.</para>
/// </summary>
[Route("api/experiences")]
[AllowAnonymous]
[EnableRateLimiting(RateLimiterExtensions.PublicPolicy)]
public sealed class ExperiencesController(ISender mediator) : ApiControllerBase(mediator)
{
    /// <summary>
    /// Yayındaki ilanlar, en yeni yayınlanan üstte. Cursor tabanlı sayfalama.
    /// </summary>
    /// <param name="city">
    /// <c>ülke-slug</c>: <c>cz-prague</c>, <c>tr-istanbul</c>. Şehir seçicinin
    /// (<c>GET /api/places/cities</c>) döndürdüğü satırdan kurulur.
    ///
    /// <para>Uuid DEĞİL: <c>city.id</c> seed sırasında üretiliyor ve ortamlar arasında
    /// değişiyor; paylaşılan bir bağlantı ikinci ortamda başka bir şehri gösterirdi.
    /// Yalnız slug da değil: benzersizlik <c>(ülke, slug)</c> çiftinde.</para>
    /// </param>
    /// <param name="cursor">Önceki yanıtın <c>nextCursor</c> değeri; opak.</param>
    /// <param name="lang">
    /// Metnin istendiği dil (BCP-47). Fallback zinciri SUNUCUDA çözülüyor, istemciye tek
    /// çeviri gidiyor; yanıt hangi dilin döndüğünü ve yedeğe düşülüp düşülmediğini söylüyor.
    /// </param>
    /// <param name="currency">
    /// Misafirin görüntüleme para birimi. Boşsa kartlar host tahsilatında kalır.
    /// </param>
    [HttpGet]
    [ProducesResponseType<GuestExperiencePageResponse>(StatusCodes.Status200OK)]
    // 400 iki yoldan gelebiliyor: biçim hatası (ValidationProblemDetails, alan bazlı) ve
    // kayıt defterinde olmayan şehir (düz ProblemDetails). Şema, ikisinin de tabanı olan
    // ValidationProblemDetails ile ilan ediliyor — HostExperiencesController ile aynı kalıp.
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GuestExperiencePageResponse>> List(
        CancellationToken cancellationToken,
        [FromQuery] string? city = null,
        [FromQuery] string? cursor = null,
        [FromQuery] string? lang = null,
        [FromQuery] string? currency = null)
    {
        var result = await Mediator.Send(
            new GetExperiencesQuery(city, cursor, lang, currency), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Tek ilan. Detay sayfası bu TEK çağrıyla doluyor: şehir, metin, konuşulan diller ve
    /// etiketler yanıtın içinde (PLAN Blok 5 kabul kriteri 4).
    /// </summary>
    /// <param name="slug">
    /// Kalıcı URL kimliği; dile göre değişmiyor. Bu yüzden <c>/tr/deneyim/{slug}</c> ile
    /// <c>/en/experience/{slug}</c> aynı kaynağı gösteriyor ve hreflang halkası kurulabiliyor.
    /// </param>
    /// <param name="lang">Bkz. <c>GET /api/experiences</c>.</param>
    /// <param name="currency">
    /// Fiyatın ayrıca gösterileceği para birimi (ISO 4217). Verilmezse çevrim yok.
    /// Çevrilen tutar <b>yalnız gösterim</b>; tahsilat daima host'un para biriminde
    /// ve yanıtta o da yazıyor.
    /// </param>
    /// <remarks>
    /// Taslak, arşiv, banlı host'un yayını ve olmayan slug — dördü de <b>404</b> ve
    /// mesajları da aynı. Farklı bir yanıt, yayınlanmamış ilanların varlığını haritalamaya
    /// yarayacak bir oracle olurdu.
    /// </remarks>
    [HttpGet("{slug}")]
    [ProducesResponseType<GuestExperienceDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GuestExperienceDetailResponse>> Get(
        string slug,
        CancellationToken cancellationToken,
        [FromQuery] string? lang = null,
        [FromQuery] string? currency = null)
    {
        var result = await Mediator.Send(
            new GetExperienceBySlugQuery(slug, lang, currency), cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// Seçilebilir seanslar ve fiyat — detay sayfasının takvim bölümünün TEK çağrısı.
    /// </summary>
    /// <param name="from">
    /// Deneyimin saat dilimindeki yerel tarih. Verilmezse orada bugün. <b>İstemcinin
    /// saat diliminden türetilmiyor</b>: Prag'daki bir tur, misafir İstanbul'dan baksa
    /// da Prag gününe göre listeleniyor.
    /// </param>
    /// <param name="to">Verilmezse <c>from + 30 gün</c>. Pencere en fazla 62 gün.</param>
    /// <param name="currency">
    /// Misafirin görmek istediği para birimi (ISO 4217). Verilmezse çevrim yok.
    /// Çevrilen tutar <b>yalnız gösterim</b>; tahsilat daima host'un para biriminde.
    /// </param>
    /// <remarks>
    /// Kapalı, dolu ve <b>geçmiş</b> seanslar dönmüyor (PLAN Blok 7 kabul kriteri 4).
    /// Host kendi takviminde hepsini görüyor — o ayrı bir uç ve ayrı bir soru.
    /// </remarks>
    [HttpGet("{slug}/availability")]
    [ProducesResponseType<GuestAvailabilityResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GuestAvailabilityResponse>> Availability(
        string slug,
        CancellationToken cancellationToken,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] string? currency = null)
    {
        var result = await Mediator.Send(
            new GetAvailabilityQuery(slug, from, to, currency), cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// "Bu seansa şu kadar kişi kaç eder?" Toplam SUNUCUDA hesaplanıyor — istemci
    /// kalem toplasaydı yuvarlama ve kur kuralları iki yerde yaşar, biri bir gün
    /// ayrışır ve misafir gördüğünden farklı bir tutar öderdi.
    /// </summary>
    /// <remarks>
    /// <b>Hiçbir şey rezerve etmiyor.</b> Kapasite kontrol ediliyor ama koltuk
    /// tutulmuyor; koltuğu kilitleyen yazma Blok 9'da.
    /// </remarks>
    [HttpGet("{slug}/quote")]
    [ProducesResponseType<GuestQuoteResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GuestQuoteResponse>> Quote(
        string slug,
        [FromQuery] Guid slotId,
        CancellationToken cancellationToken,
        [FromQuery] int adults = 0,
        [FromQuery] int children = 0,
        [FromQuery] int infants = 0,
        [FromQuery] string? currency = null)
    {
        var result = await Mediator.Send(
            new GetQuoteQuery(slug, slotId, adults, children, infants, currency), cancellationToken);

        return Ok(result);
    }
}
