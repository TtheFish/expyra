using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Expyra.WebApi.Common;

/// <summary>
/// Başarılı yanıta <c>Cache-Control: public</c> yazar.
///
/// <para><b>Neden <c>public</c> güvenli:</b> bu başlık YALNIZ kayıt defteri uçlarında
/// kullanılıyor — anonim, kullanıcıya göre değişmeyen, kişisel veri taşımayan yanıtlar.
/// Kimlik doğrulamalı bir uçta <c>public</c> yazmak, bir kullanıcının yanıtını paylaşılan
/// önbellekte başkasına servis ettirir; bu yüzden filtre bilinçli olarak yalnız 2xx'e ve
/// yalnız elle işaretlenmiş uçlara uygulanıyor, global bir varsayılan DEĞİL.</para>
///
/// <para><c>Vary: Accept-Language</c> gerekmiyor ve bu bir tesadüf değil: ülke, şehir ve
/// kategori uçları bilinçli olarak yerelleştirilmiş metin döndürmüyor (adları istemci
/// <c>Intl</c> ile üretiyor, kategori adları Blok 3'ün sözlüğünde). Yanıt dile bağımsız
/// olduğu için tek bir önbellek girdisi tüm dillere hizmet ediyor.</para>
///
/// <para><b>Neden <see cref="ResponseCacheAttribute"/> değil:</b> o <c>stale-while-revalidate</c>
/// yazamıyor ve başlığı durum kodundan bağımsız koyuyor — 400'e önbellek başlığı iliştirmek
/// istemiyoruz.</para>
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
internal sealed class PublicCacheAttribute(int maxAgeSeconds) : ActionFilterAttribute
{
    /// <summary>Tarayıcı ve CDN yanıtı kaç saniye taze sayar.</summary>
    public int MaxAgeSeconds { get; } = maxAgeSeconds;

    /// <summary>
    /// Tazelik bittikten sonra kaç saniye daha eski yanıt servis edilip arka planda
    /// yenilenebilir. Kayıt defteri uçlarında bu, API bir an düşse bile şehir seçicinin
    /// çalışmaya devam etmesi demek.
    /// </summary>
    public int StaleWhileRevalidateSeconds { get; set; }

    public override void OnResultExecuting(ResultExecutingContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        base.OnResultExecuting(context);

        // Doğrulama hatası, yetki hatası ve boş sonuç önbelleğe girmez.
        var statusCode = (context.Result as ObjectResult)?.StatusCode ?? StatusCodes.Status200OK;
        if (statusCode is < StatusCodes.Status200OK or >= StatusCodes.Status300MultipleChoices)
        {
            return;
        }

        var value = StaleWhileRevalidateSeconds > 0
            ? string.Create(
                CultureInfo.InvariantCulture,
                $"public, max-age={MaxAgeSeconds}, stale-while-revalidate={StaleWhileRevalidateSeconds}")
            : string.Create(CultureInfo.InvariantCulture, $"public, max-age={MaxAgeSeconds}");

        context.HttpContext.Response.Headers.CacheControl = value;
    }
}

/// <summary>
/// Kayıt defteri uçlarının önbellek süreleri. Tek yerde duruyorlar ki "şehir 10 dakika,
/// ülke 1 gün" kararı beş controller'a dağılmasın.
/// </summary>
internal static class ReferenceDataCache
{
    /// <summary>
    /// Ülke ve para birimi: ISO kayıt defterleri, pratikte hiç değişmiyor.
    /// Yıllık birkaç değişiklik için istemciyi her açılışta sorgulatmanın anlamı yok.
    /// </summary>
    internal const int RegistryMaxAgeSeconds = 24 * 60 * 60;

    internal const int RegistryStaleSeconds = 7 * 24 * 60 * 60;

    /// <summary>
    /// Kategori: ürün kararı, nadiren ama BİZİM elimizle değişiyor. Bir saat, yeni
    /// kategorinin sahada görünmesi için kabul edilebilir gecikme.
    /// </summary>
    internal const int CatalogMaxAgeSeconds = 60 * 60;

    internal const int CatalogStaleSeconds = 24 * 60 * 60;

    /// <summary>
    /// Şehir araması: sorguya göre değişiyor, dolayısıyla önbellek girdisi sayısı çok.
    /// Kısa süre hem autocomplete'in tekrar eden tuş vuruşlarını emiyor hem de yeni
    /// eklenen bir şehrin ortaya çıkmasını geciktirmiyor.
    /// </summary>
    internal const int SearchMaxAgeSeconds = 10 * 60;

    internal const int SearchStaleSeconds = 60 * 60;
}
