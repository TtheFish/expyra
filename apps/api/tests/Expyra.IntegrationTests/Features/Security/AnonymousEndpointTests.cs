using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Shouldly;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Security;

/// <summary>
/// #49: API varsayılan olarak KAPALI ve açık olan her uç burada adıyla yazılı.
///
/// <para>Yeni bir halka açık uç eklemek bu listeye bir satır eklemeyi gerektiriyor —
/// bilerek. Liste PR diff'inde görünür ve "bu uç neden giriş istemiyor" sorusu
/// review'da sorulur. Tersi (beklenmeyen bir anonim uç) testi kırar.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class AnonymousEndpointTests(ApiFactory factory)
{
    /// <summary>Kimliksiz çağrılabilen uçların TAM listesi (Development host'u).</summary>
    private static readonly string[] AnonymousWhitelist =
    [
        // Kimlik akışı: oturum açmanın kendisi oturum isteyemez. /me burada YOK.
        "POST api/auth/request-code",
        "POST api/auth/verify-code",
        "POST api/auth/refresh",
        "POST api/auth/sign-out",

        // Vitrin: keşif, detay, müsaitlik ve fiyat giriş öncesi görülüyor.
        "GET api/experiences",
        "GET api/experiences/{slug}",
        "GET api/experiences/{slug}/availability",
        "GET api/experiences/{slug}/quote",

        // Kayıt defterleri.
        "GET api/places/countries",
        "GET api/places/cities",
        "GET api/categories",
        "GET api/currencies",
        "GET api/languages",

        "GET api/health",
    ];

    /// <summary>
    /// Yalnız Development'ta kurulan uçlar. Üretimde hiç yoklar; hız sınırı da
    /// istemiyorlar (yerel geliştirici aracı).
    /// </summary>
    private static readonly string[] DevelopmentOnlyAnonymous =
    [
        "PUT api/dev/uploads",
        "GET api/dev/objects/{**key}",
        "GET api/dev/emails",
        "GET openapi/{documentName}.json",
        "GET scalar/{documentName?}",
    ];

    [Fact]
    public void FallbackPolicy_KimlikDogrulanmisKullaniciIster()
    {
        var options = factory.Services.GetRequiredService<IOptions<AuthorizationOptions>>().Value;

        options.FallbackPolicy.ShouldNotBeNull();
        options.FallbackPolicy.Requirements.ShouldContain(x => x is DenyAnonymousAuthorizationRequirement);
    }

    [Fact]
    public void AnonimUclar_BeyazListeyleBirebirAyni()
    {
        var anonymous = Endpoints()
            .Where(x => x.Endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            .Select(x => x.Key)
            .Order(StringComparer.Ordinal)
            .ToArray();

        anonymous.ShouldBe(
            AnonymousWhitelist.Concat(DevelopmentOnlyAnonymous).Order(StringComparer.Ordinal).ToArray(),
            customMessage: "Anonim uç kümesi değişti. Bilinçliyse AnonymousWhitelist'e ekle; " +
                           "değilse uçtaki [AllowAnonymous]'ı kaldır.");
    }

    [Fact]
    public void HalkaAcikUclarinHepsi_HizSinirliDir()
    {
        var unlimited = Endpoints()
            .Where(x => AnonymousWhitelist.Contains(x.Key, StringComparer.Ordinal))
            .Where(x => x.Endpoint.Metadata.GetMetadata<EnableRateLimitingAttribute>() is null)
            .Select(x => x.Key)
            .ToArray();

        unlimited.ShouldBeEmpty("Anonim uçta [EnableRateLimiting] yok (#47).");
    }

    private IEnumerable<(string Key, RouteEndpoint Endpoint)> Endpoints()
    {
        // EndpointDataSource DI'da tüm kaynakların bileşimi (controller'lar + minimal API).
        // Uygulamanın pipeline'ı kurulmadan liste boş: istemci oluşturmak host'u başlatıyor.
        using var _ = factory.CreateClient();

        return factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .SelectMany(endpoint => (endpoint.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? ["*"])
                .Select(method => ($"{method} {endpoint.RoutePattern.RawText?.Trim('/')}", endpoint)));
    }
}
