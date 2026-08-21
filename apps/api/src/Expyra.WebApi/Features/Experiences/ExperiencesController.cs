using MediatR;
using Microsoft.AspNetCore.Mvc;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Experiences.Queries.GetExperienceBySlug;
using Expyra.Application.Features.Experiences.Queries.GetExperiences;
using Expyra.WebApi.Common;

namespace Expyra.WebApi.Features.Experiences;

/// <summary>
/// Misafirin gördüğü deneyimler. Uçların ikisi de <b>ANONİM</b> — <c>[Authorize]</c> yok
/// ve Program.cs'te fallback policy de yok, yani varsayılan anonim. Keşif, giriş yapmamış
/// misafirin gördüğü ilk şey; oturum istemek vitrini kilitlerdi.
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
    [HttpGet]
    [ProducesResponseType<GuestExperiencePageResponse>(StatusCodes.Status200OK)]
    // 400 iki yoldan gelebiliyor: biçim hatası (ValidationProblemDetails, alan bazlı) ve
    // kayıt defterinde olmayan şehir (düz ProblemDetails). Şema, ikisinin de tabanı olan
    // ValidationProblemDetails ile ilan ediliyor — HostExperiencesController ile aynı kalıp.
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GuestExperiencePageResponse>> List(
        CancellationToken cancellationToken,
        [FromQuery] string? city = null,
        [FromQuery] string? cursor = null,
        [FromQuery] string? lang = null)
    {
        var result = await Mediator.Send(new GetExperiencesQuery(city, cursor, lang), cancellationToken);
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
        [FromQuery] string? lang = null)
    {
        var result = await Mediator.Send(new GetExperienceBySlugQuery(slug, lang), cancellationToken);
        return Ok(result);
    }
}
