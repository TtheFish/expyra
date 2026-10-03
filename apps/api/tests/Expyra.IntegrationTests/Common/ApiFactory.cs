using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Shouldly;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Auth;
using Expyra.Application.Features.Auth.Commands.RequestLoginCode;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Infrastructure.Persistence;

namespace Expyra.IntegrationTests.Common;

/// <summary>
/// Gerçek uygulamayı ayağa kaldırır. Sahte olan yalnız üç şey var: e-posta göndericisi
/// (kodu okuyabilmek için), saat (60 sn'lik aralıkları gerçekten beklememek için) ve
/// istemci IP'si. Hız sınırı, JWT doğrulaması, transaction'lar ve advisory lock GERÇEK.
///
/// <para>Sırlar <see cref="TestEnvironment"/>'da ortam değişkeni olarak üretiliyor;
/// buradaki <c>ConfigureTestServices</c> onlar için çok geç kalırdı.</para>
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static int clientCounter;

    public ApiFactory() => TestEnvironment.Ensure();

    /// <summary>
    /// Bu koşuya ait nesne deposu klasörü. Süreç başına bir tane: <c>ApiFactory</c>
    /// koleksiyon başına yeniden kuruluyor ve her birine ayrı klasör vermek, aynı
    /// süreçteki iki koleksiyonun birbirinin dosyasını görmemesi dışında bir şey
    /// kazandırmazdı — zaten anahtarlar deneyim kimliğiyle ayrışıyor.
    /// </summary>
    private static readonly string StorageDirectory = Path.Combine(
        Path.GetTempPath(), "expyra-tests", Guid.CreateVersion7().ToString("N"));

    /// <summary>Testin kodu okuduğu TEK yer — API yanıtı kodu asla taşımıyor.</summary>
    public CapturingEmailSender Emails { get; } = new();

    /// <summary>
    /// Kaydırılabilir saat. Yeniden gönderme aralığı (60/120/300 sn), saatlik kota ve
    /// 30 sn'lik yenileme grace penceresi gerçek zamanla test edilemezdi.
    /// </summary>
    public TestClock Clock { get; } = new();

    /// <summary>
    /// Uygulamanın kendi kapsamından bir <see cref="AppDbContext"/> ile okuma yapar:
    /// HTTP yanıtı "ne döndü"yü, bu "ne yazıldı"yı doğruluyor.
    /// </summary>
    public async Task<T> QueryAsync<T>(Func<AppDbContext, Task<T>> query)
    {
        ArgumentNullException.ThrowIfNull(query);

        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await query(db).ConfigureAwait(false);
    }

    /// <summary>
    /// Refresh token satırını bulmak için. Ham token DB'de DURMUYOR; arama anahtarı
    /// uygulamanın kendi hash'i olmak zorunda, testin ayrı bir kopyası değil.
    /// </summary>
    public byte[] HashRefreshToken(string refreshToken)
        => Services.GetRequiredService<ITokenService>().HashRefreshToken(refreshToken);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        // Orta katman hız sınırı testlerde ETKİSİZ.
        //
        // O sayaç süreç boyunca yaşıyor ve koleksiyondaki tüm sınıflar tek süreçte
        // koşuyor: dakikada 30 isteklik kova, testleri birbirine 429 yedirir. Belirtisi
        // aldatıcıdır — test tek başına geçer, hep birlikte koşunca kırılır ve hata
        // "bu testte bir şey bozuldu" gibi görünür.
        //
        // Kaldırılan şey bir güvenlik davranışı DEĞİL: o kova yalnız kaba trafiği
        // DB'ye ulaşmadan kesen bir sel kesici. Kimlik akışının gerçek kotaları
        // (e-posta 5/saat, IP 20/saat, challenge başına 5 deneme) `login_code`
        // tablosundan okunuyor ve bu testlerde AYNEN çalışmaya devam ediyor.
        builder.UseSetting("Auth:RateLimit:PermitPerMinute", "1000000");

        // Anonim okuma uçlarının kovası da aynı gerekçeyle etkisiz. Kovaların kendisi
        // RateLimitAndForwardedHeadersTests'te düşük limitli ayrı bir host'la sınanıyor.
        builder.UseSetting("RateLimit:Public:PermitPerMinute", "1000000");
        builder.UseSetting("RateLimit:Public:ProxyPermitPerMinute", "1000000");

        // Nesne deposu koşuya ÖZEL bir klasöre yazıyor. Varsayılan `.object-store`
        // kullanılsaydı iki koşu birbirinin dosyalarını görür ve "yükleme yapılmadan
        // onaylandı" gibi bir hata testte YEŞİL geçerdi.
        builder.UseSetting("Storage:Directory", StorageDirectory);

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);

            services.RemoveAll<IDateTimeProvider>();
            services.AddSingleton<IDateTimeProvider>(Clock);

            // Pipeline'ın EN BAŞINA giriyor: hız sınırı bölümleme anahtarını okumadan
            // önce istemci IP'sinin yerinde olması gerekiyor.
            services.AddTransient<IStartupFilter, TestClientIpStartupFilter>();
        });
    }

    /// <summary>
    /// Her istemciye AYRI bir IP. Orta katman limiti IP başına 30/dk ve koleksiyondaki
    /// tüm sınıflar tek süreçte koşuyor: ortak kova kullanılsaydı testler birbirine
    /// 429 yedirir, hata da "bu testte bir şey bozuldu" gibi görünürdü.
    /// </summary>
    protected override void ConfigureClient(HttpClient client)
    {
        base.ConfigureClient(client);

        var ordinal = Interlocked.Increment(ref clientCounter);
        client.DefaultRequestHeaders.Add(
            TestClientIpStartupFilter.Header, IpFor(ordinal).ToString());
    }

    // 10/8 özel aralık: appsettings.Development.json'daki TrustedProxies (127.0.0.1, ::1)
    // ile kesişmiyor, yani X-Expyra-Client-Ip yok sayılıyor ve peer gerçek istemci sayılıyor.
    private static IPAddress IpFor(int ordinal)
        => new(new byte[] { 10, (byte)(ordinal >> 16), (byte)(ordinal >> 8), (byte)ordinal });
}

/// <summary>
/// <c>DateTimeOffset.UtcNow</c> + kaydırma. Mutlak bir sabit değil: JWT'yi ÜRETEN taraf
/// bu saati, DOĞRULAYAN taraf (JwtBearer) gerçek saati kullanıyor ve
/// <c>ClockSkew = TimeSpan.Zero</c>. Saat kaydırılmışken üretilen access token'ın
/// <c>nbf</c>'i gelecekte kalır — kaydırma altında <c>/api/auth/me</c> ÇAĞIRMA.
/// </summary>
public sealed class TestClock : IDateTimeProvider
{
    private long offsetTicks;

    // Kesme üretim sağlayıcısıyla AYNI olmalı: yalnız üretim keserse test,
    // üretimde var olmayan bir hassasiyet farkı üretir ve sahte kırmızı verir.
    public DateTimeOffset UtcNow =>
        DateTimeOffset.UtcNow.AddTicks(Interlocked.Read(ref offsetTicks)).TruncateToMicroseconds();

    /// <summary>
    /// <c>using</c> ile kullanılır: kapsam bitince kaydırma sıfırlanır. Sıfırlanmazsa
    /// sonraki testin ürettiği token'lar gelecekte doğar ve hata çok uzakta patlar.
    /// </summary>
    public IDisposable Shift(TimeSpan by)
    {
        var scope = new ClockShift(this);
        Advance(by);
        return scope;
    }

    public void Advance(TimeSpan by) => Interlocked.Add(ref offsetTicks, by.Ticks);

    private void Reset() => Interlocked.Exchange(ref offsetTicks, 0);

    private sealed class ClockShift(TestClock clock) : IDisposable
    {
        public void Dispose() => clock.Reset();
    }
}

/// <summary>
/// TestServer <c>RemoteIpAddress</c> ayarlamıyor; istemci başına IP'yi bu ara katman
/// yerleştiriyor. <see cref="IStartupFilter"/> kullanılıyor çünkü uygulamanın kendi
/// pipeline'ından ÖNCE çalışması gerekiyor (<c>UseRateLimiter</c> dahil).
/// </summary>
internal sealed class TestClientIpStartupFilter : IStartupFilter
{
    internal const string Header = "X-Test-Client-Ip";

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        ArgumentNullException.ThrowIfNull(next);

        return app =>
        {
            app.Use(async (context, continuation) =>
            {
                if (context.Request.Headers.TryGetValue(Header, out var raw)
                    && raw.Count == 1
                    && IPAddress.TryParse(raw[0], out var address))
                {
                    context.Connection.RemoteIpAddress = address;
                }

                await continuation(context).ConfigureAwait(false);
            });

            next(app);
        };
    }
}

/// <summary>
/// HTTP yüzeyinin test tarafındaki tek tanımı. Uç adresleri ve gövde şekilleri burada
/// toplandı: sözleşme değişirse tek dosya kırılır, beş test dosyası değil.
/// </summary>
internal static class AuthApi
{
    internal const string RequestCodePath = "/api/auth/request-code";
    internal const string VerifyCodePath = "/api/auth/verify-code";
    internal const string RefreshPath = "/api/auth/refresh";
    internal const string SignOutPath = "/api/auth/sign-out";
    internal const string MePath = "/api/auth/me";

    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Her test kendi adresini kullanır: veritabanı koleksiyon boyunca paylaşılıyor ve
    /// hız sınırı sayaçları e-posta bazlı — ortak adres testleri birbirine bağlardı.
    /// </summary>
    internal static string NewEmail()
        => string.Create(CultureInfo.InvariantCulture, $"t{Guid.NewGuid():N}@expyra.test");

    /// <summary>Şekil doğrulamasını geçen ama DEĞERİ yanlış olan kod.</summary>
    internal static string WrongCode(string code)
    {
        var digits = code.ToCharArray();
        digits[^1] = digits[^1] == '9' ? '0' : (char)(digits[^1] + 1);
        return new string(digits);
    }

    internal static Task<HttpResponseMessage> PostRequestCodeAsync(
        HttpClient client, string email, string? preferredLanguage = null)
        => client.PostAsJsonAsync(RequestCodePath, new { email, preferredLanguage }, Json);

    internal static async Task<RequestLoginCodeResponse> RequestCodeAsync(
        HttpClient client, string email, string? preferredLanguage = null)
    {
        var response = await PostRequestCodeAsync(client, email, preferredLanguage).ConfigureAwait(false);

        // Kayıtlı da olsa kayıtsız da olsa 202 — fark yaratmak enumeration oracle'ı kurar.
        response.StatusCode.ShouldBe(HttpStatusCode.Accepted);

        return (await response.Content.ReadFromJsonAsync<RequestLoginCodeResponse>(Json)
            .ConfigureAwait(false))!;
    }

    internal static Task<HttpResponseMessage> PostVerifyCodeAsync(
        HttpClient client, Guid challengeId, string code)
        => client.PostAsJsonAsync(VerifyCodePath, new { challengeId, code }, Json);

    internal static Task<HttpResponseMessage> PostRefreshAsync(HttpClient client, string refreshToken)
        => client.PostAsJsonAsync(RefreshPath, new { refreshToken }, Json);

    internal static Task<HttpResponseMessage> PostSignOutAsync(HttpClient client, string refreshToken)
        => client.PostAsJsonAsync(SignOutPath, new { refreshToken }, Json);

    internal static async Task<AuthTokensResponse> VerifyCodeAsync(
        HttpClient client, Guid challengeId, string code)
    {
        var response = await PostVerifyCodeAsync(client, challengeId, code).ConfigureAwait(false);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<AuthTokensResponse>(Json)
            .ConfigureAwait(false))!;
    }

    internal static async Task<AuthTokensResponse> RefreshAsync(HttpClient client, string refreshToken)
    {
        var response = await PostRefreshAsync(client, refreshToken).ConfigureAwait(false);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<AuthTokensResponse>(Json)
            .ConfigureAwait(false))!;
    }

    /// <summary>Kod iste → postadan oku → doğrula. Tüm testlerin başlangıç noktası.</summary>
    internal static async Task<AuthTokensResponse> SignInAsync(
        ApiFactory factory, HttpClient client, string email)
    {
        ArgumentNullException.ThrowIfNull(factory);

        var challenge = await RequestCodeAsync(client, email).ConfigureAwait(false);
        var code = factory.Emails.CodeFor(email);

        return await VerifyCodeAsync(client, challenge.ChallengeId, code).ConfigureAwait(false);
    }

    internal static async Task<CurrentUserResponse> GetMeAsync(HttpClient client, string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, MePath);
        request.Headers.Authorization = new("Bearer", accessToken);

        var response = await client.SendAsync(request).ConfigureAwait(false);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<CurrentUserResponse>(Json)
            .ConfigureAwait(false))!;
    }
}
