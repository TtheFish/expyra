using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Shouldly;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Security;

/// <summary>
/// #47: hız sınırı kovası istemcinin UYDURDUĞU bir başlıkla değiştirilemiyor.
///
/// <para>Her test kendi düşük limitli host'unu kuruyor (<c>WithWebHostBuilder</c>):
/// paylaşılan <see cref="ApiFactory"/> limitleri bilerek etkisiz bırakıyor. Peer adresi
/// <c>X-Test-Client-Ip</c> ile veriliyor; Development'ta güvenilir proxy'ler
/// 127.0.0.1 ve ::1, 10/8 güvenilmeyen istemci.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class RateLimitAndForwardedHeadersTests(ApiFactory factory)
{
    private const int Limit = 3;

    private const string UntrustedPeer = "10.250.0.1";
    private const string TrustedPeer = "127.0.0.1";

    private const string PublicPath = "/api/languages";

    [Fact]
    public async Task AuthLimiti_GuvenilmeyenKaynak_HerIstekteFarkliXForwardedFor_AtlatilamaZ()
    {
        using var limited = WithLimits(authPerMinute: Limit);
        using var client = PeerlessClient(limited);

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i <= Limit; i++)
        {
            using var request = Refresh(UntrustedPeer);

            // İki kaçış yolu birden: standart başlık ve BFF sözleşmesinin başlığı.
            request.Headers.Add("X-Forwarded-For", FakeIp(i));
            request.Headers.Add("X-Expyra-Client-Ip", FakeIp(i + 100));

            statuses.Add((await client.SendAsync(request)).StatusCode);
        }

        statuses.Take(Limit).ShouldAllBe(x => x != HttpStatusCode.TooManyRequests);
        statuses[Limit].ShouldBe(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PublicLimiti_GuvenilmeyenKaynak_HerIstekteFarkliXForwardedFor_AtlatilamaZ()
    {
        using var limited = WithLimits(publicPerMinute: Limit);
        using var client = PeerlessClient(limited);

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i <= Limit; i++)
        {
            using var request = Get(PublicPath, UntrustedPeer);
            request.Headers.Add("X-Forwarded-For", FakeIp(i));
            request.Headers.Add("X-Expyra-Client-Ip", FakeIp(i + 100));

            statuses.Add((await client.SendAsync(request)).StatusCode);
        }

        statuses.Take(Limit).ShouldAllBe(x => x == HttpStatusCode.OK);
        statuses[Limit].ShouldBe(HttpStatusCode.TooManyRequests);
    }

    /// <summary>
    /// Pozitif kontrol: UseForwardedHeaders gerçekten bağlı. Güvenilir bir yük dengeleyici
    /// farklı istemcileri X-Forwarded-For ile iletince her biri AYRI kovaya düşüyor. Bu
    /// test olmadan yukarıdaki iki test, başlığı hiç okumayan bir uygulamada da geçerdi.
    /// </summary>
    [Fact]
    public async Task GuvenilirProxy_XForwardedFor_IleIletilenIstemciler_AyriKovadaSayilir()
    {
        using var limited = WithLimits(authPerMinute: Limit);
        using var client = PeerlessClient(limited);

        for (var i = 0; i <= Limit; i++)
        {
            using var request = Refresh(TrustedPeer);
            request.Headers.Add("X-Forwarded-For", FakeIp(i));

            (await client.SendAsync(request)).StatusCode.ShouldNotBe(HttpStatusCode.TooManyRequests);
        }
    }

    /// <summary>
    /// BFF'in istemci adresi taşımayan SSR çağrıları istemci kovasına DEĞİL, yüksek
    /// tavanlı proxy kovasına düşüyor — aksi halde sitenin tüm sunucu tarafı trafiği
    /// tek bir 120/dk kovasını paylaşırdı.
    /// </summary>
    [Fact]
    public async Task PublicLimiti_IstemciAdresiTasimayanBff_ProxyKovasinaDuser()
    {
        using var limited = WithLimits(publicPerMinute: Limit, publicProxyPerMinute: Limit * 3);
        using var client = PeerlessClient(limited);

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i <= Limit * 3; i++)
        {
            using var request = Get(PublicPath, TrustedPeer);
            statuses.Add((await client.SendAsync(request)).StatusCode);
        }

        statuses.Take(Limit * 3).ShouldAllBe(x => x == HttpStatusCode.OK);
        statuses[Limit * 3].ShouldBe(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task HerYanit_NosniffTasir()
    {
        using var client = factory.CreateClient();

        var ok = await client.GetAsync(PublicPath);
        var unauthorized = await client.GetAsync(AuthApi.MePath);

        ok.Headers.GetValues("X-Content-Type-Options").ShouldBe(["nosniff"]);
        unauthorized.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        unauthorized.Headers.GetValues("X-Content-Type-Options").ShouldBe(["nosniff"]);
    }

    private WebApplicationFactory<Program> WithLimits(
        int? authPerMinute = null,
        int? publicPerMinute = null,
        int? publicProxyPerMinute = null)
        => factory.WithWebHostBuilder(builder =>
        {
            if (authPerMinute is { } auth)
            {
                builder.UseSetting("Auth:RateLimit:PermitPerMinute", auth.ToString(CultureInfo.InvariantCulture));
            }

            if (publicPerMinute is { } publicLimit)
            {
                builder.UseSetting("RateLimit:Public:PermitPerMinute", publicLimit.ToString(CultureInfo.InvariantCulture));
            }

            if (publicProxyPerMinute is { } proxyLimit)
            {
                builder.UseSetting(
                    "RateLimit:Public:ProxyPermitPerMinute", proxyLimit.ToString(CultureInfo.InvariantCulture));
            }
        });

    /// <summary>Gövde geçersiz bir token: limiter MVC'den önce saydığı için sonuç önemsiz.</summary>
    private static HttpRequestMessage Refresh(string peer)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, AuthApi.RefreshPath)
        {
            Content = JsonContent.Create(new { refreshToken = "gecersiz" }, options: AuthApi.Json),
        };

        return WithPeer(request, peer);
    }

    private static HttpRequestMessage Get(string path, string peer)
        => WithPeer(new HttpRequestMessage(HttpMethod.Get, path), peer);

    /// <summary>
    /// Varsayılan peer başlığı SİLİNMİŞ istemci: peer'ı her istek kendisi taşıyor.
    /// Varsayılan kalsaydı HttpClient iki değeri birleştirir ve test ara katmanı ikisini
    /// de yok sayardı.
    /// </summary>
    private static HttpClient PeerlessClient(WebApplicationFactory<Program> host)
    {
        var client = host.CreateClient();
        client.DefaultRequestHeaders.Remove(TestClientIpStartupFilter.Header);
        return client;
    }

    private static HttpRequestMessage WithPeer(HttpRequestMessage request, string peer)
    {
        request.Headers.Add(TestClientIpStartupFilter.Header, peer);
        return request;
    }

    // 203.0.113.0/24 (TEST-NET-3): gerçek bir adresle çakışmıyor.
    private static string FakeIp(int ordinal)
        => string.Create(CultureInfo.InvariantCulture, $"203.0.113.{ordinal + 1}");
}
