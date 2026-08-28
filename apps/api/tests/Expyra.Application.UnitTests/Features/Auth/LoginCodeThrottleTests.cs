using Shouldly;
using Expyra.Application.Common.Auth;
using Expyra.Application.Features.Auth.Commands.RequestLoginCode;
using Expyra.Domain.Identity;

namespace Expyra.Application.UnitTests.Features.Auth;

/// <summary>
/// Şifresiz sistemde hız sınırı bir sertleştirme değil, kimlik doğrulama
/// mekanizmasının KENDİSİ — dolayısıyla kararı veren fonksiyon DB'siz test edilir.
/// Sayaçlar ayrı bir throttle tablosundan değil, login_code satırlarından okunuyor.
/// </summary>
public sealed class LoginCodeThrottleTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void EvaluateThrottle_HicKodYok_IssueVeIlkKademe()
    {
        var decision = Evaluate([]);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.Issue);
        decision.ResendAvailableAtUtc.ShouldBe(Now.AddSeconds(60));
        decision.ExistingChallengeId.ShouldBeNull();
        decision.RetryAfter.ShouldBeNull();
    }

    [Fact]
    public void EvaluateThrottle_AralikIcindeIkinciIstek_MevcutChallengeiDoner()
    {
        // Aralık içindeki istek YENİ KOD ÜRETMEZ ve MAİL GÖNDERMEZ (idempotency):
        // çift tıklama kullanıcıya ikinci bir e-posta göndermemeli.
        var existing = Row(TimeSpan.FromSeconds(30));

        var decision = Evaluate([existing]);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.ReturnExisting);
        decision.ExistingChallengeId.ShouldBe(existing.Id);
        decision.ExistingExpiresAtUtc.ShouldBe(existing.ExpiresAtUtc);
        decision.ResendAvailableAtUtc.ShouldBe(existing.CreatedAtUtc.AddSeconds(60));
        decision.RetryAfter.ShouldBeNull();
    }

    [Fact]
    public void EvaluateThrottle_SaatteIkiKod_IkinciKademe_120sn()
    {
        var newest = Row(TimeSpan.FromSeconds(30));

        var decision = Evaluate([Superseded(TimeSpan.FromMinutes(20)), newest]);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.ReturnExisting);
        decision.ResendAvailableAtUtc.ShouldBe(newest.CreatedAtUtc.AddSeconds(120));
    }

    [Fact]
    public void EvaluateThrottle_SaatteUcKod_UcuncuKademe_300sn()
    {
        // Kademe SON kodun yaşından değil, saatteki kod SAYISINDAN geliyor:
        // ısrarla kod isteyen her istekte biraz daha uzun bekliyor.
        var newest = Row(TimeSpan.FromSeconds(30));

        var decision = Evaluate(
            [Superseded(TimeSpan.FromMinutes(40)), Superseded(TimeSpan.FromMinutes(20)), newest]);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.ReturnExisting);
        decision.ResendAvailableAtUtc.ShouldBe(newest.CreatedAtUtc.AddSeconds(300));
    }

    [Fact]
    public void EvaluateThrottle_AralikGecti_IssueVeSonrakiKademe()
    {
        // Saatte 1 kod var ve 60 sn'lik aralık geçmiş: yeni kod üretilir, bir SONRAKİ
        // aralık üretimden sonraki sayıya (2 kod → 120 sn) göre hesaplanır. Aksi halde
        // arayüzün geri sayımı doğduğu anda yanlış olur.
        var decision = Evaluate([Superseded(TimeSpan.FromMinutes(5))]);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.Issue);
        decision.ResendAvailableAtUtc.ShouldBe(Now.AddSeconds(120));
        decision.ExistingChallengeId.ShouldBeNull();
    }

    [Fact]
    public void EvaluateThrottle_SonKodYanmis_AralikIcindeBileYeniKodUretilir()
    {
        // Yanmış challenge'ı geri döndürmek kullanıcıyı kendi hata mesajının içinde
        // kilitler: arayüz 429'da "yeni kod iste" diyor, aralık ise 60-300 sn boyunca
        // vermiyor. Kotalar bu kapıyı zaten kapatıyor.
        var burned = Row(TimeSpan.FromSeconds(10), status: LoginCodeStatus.Burned, attemptCount: 5);

        var decision = Evaluate([burned]);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.Issue);
        decision.ExistingChallengeId.ShouldBeNull();
    }

    [Fact]
    public void EvaluateThrottle_SonKodunDenemeleriBitmis_AralikIcindeBileYeniKodUretilir()
    {
        // Aynı kural, satır henüz Burned yazılmamışken: 5 hatalı deneme 60 sn'nin
        // içine rahatça sığıyor, en sık gerçekleşen hâli bu.
        var exhausted = Row(TimeSpan.FromSeconds(10), attemptCount: 5);

        Evaluate([exhausted]).Outcome.ShouldBe(LoginCodeThrottleOutcome.Issue);
    }

    [Fact]
    public void EvaluateThrottle_SaatlikEpostaKotasi_EnEskiSatiraGoreRetryAfter()
    {
        // 5 kod/saat. Retry-After, en ESKİ satırın pencereden düşeceği ana göre:
        // 50 dk önce üretildiyse 10 dk kaldı. Sabit bir süre vermek ya erken 429
        // ürettirir ya da gereksiz bekletir.
        var rows = new[]
        {
            Row(TimeSpan.FromMinutes(50)),
            Row(TimeSpan.FromMinutes(40)),
            Row(TimeSpan.FromMinutes(30)),
            Row(TimeSpan.FromMinutes(20)),
            Row(TimeSpan.FromMinutes(10)),
        };

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.RateLimited);
        decision.RetryAfter.ShouldBe(TimeSpan.FromMinutes(10));
        decision.ResendAvailableAtUtc.ShouldBe(Now.AddMinutes(10));
        decision.ExistingChallengeId.ShouldBeNull();
    }

    [Fact]
    public void EvaluateThrottle_EnEskiSatirTamPencereSinirinda_RetryAfterEnAz1sn()
    {
        // Sıfır (ya da negatif) bir Retry-After istemciye "hemen dene" der ve anında
        // ikinci bir 429 yer. Alt sınır 1 sn.
        var rows = new[]
        {
            Row(TimeSpan.FromHours(1)),          // tam hourStart üstünde
            Row(TimeSpan.FromMinutes(40)),
            Row(TimeSpan.FromMinutes(30)),
            Row(TimeSpan.FromMinutes(20)),
            Row(TimeSpan.FromMinutes(10)),
        };

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.RateLimited);
        decision.RetryAfter.ShouldBe(TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void EvaluateThrottle_GunlukEpostaKotasi_SaatlikBosOlsaBileRateLimited()
    {
        // Saatlik pencere tamamen boş (hepsi 1 saatten eski) ama 24 saatte 15 kod var.
        // Bu sayaç olmadan saldırgan saatte 5 istekle sonsuza kadar devam eder.
        var rows = Enumerable.Range(1, 15)
            .Select(i => Row(TimeSpan.FromMinutes(60 + (i * 10))))
            .ToArray();

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.RateLimited);
        decision.RetryAfter.ShouldBe(TimeSpan.FromHours(24) - TimeSpan.FromMinutes(210));
    }

    [Fact]
    public void EvaluateThrottle_SaatlikIpKotasi_EpostaSayaclariTemizOlsaBileRateLimited()
    {
        // Tek IP'den 20 FARKLI adrese kod istenmiş: e-posta sayaçları temiz.
        // Dağıtık numaralandırmayı kapatan tek sayaç bu.
        var rows = Enumerable.Range(0, 20)
            .Select(_ => Row(TimeSpan.FromMinutes(30), matchesEmail: false, matchesIp: true))
            .ToArray();

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.RateLimited);
        decision.RetryAfter.ShouldBe(TimeSpan.FromMinutes(30));
    }

    [Fact]
    public void EvaluateThrottle_GunlukIpKotasi_RateLimited()
    {
        var rows = Enumerable.Range(1, 60)
            .Select(i => Row(TimeSpan.FromMinutes(60 + i), matchesEmail: false, matchesIp: true))
            .ToArray();

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.RateLimited);
        decision.RetryAfter.ShouldBe(TimeSpan.FromHours(22));   // en eski 2 saat önce
    }

    [Fact]
    public void EvaluateThrottle_HemEpostaHemIpDolu_EpostaPenceresiOncelikli()
    {
        // İki sayaç birden doluyken e-posta penceresinin süresi dönüyor — IP'ninki
        // daha kısa olsa bile. Sıra sabit tutuluyor ki dönen değer tahmin edilebilir
        // olsun; kullanıcı tekrar denediğinde ikinci sayaç kendi süresini bildirir.
        var rows = Enumerable.Range(1, 5)
            .Select(i => Row(TimeSpan.FromMinutes(i * 10)))                    // en eski 50 dk
            .Concat(Enumerable.Range(0, 20)
                .Select(_ => Row(TimeSpan.FromMinutes(55), matchesEmail: false, matchesIp: true)))
            .ToArray();

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.RateLimited);
        decision.RetryAfter.ShouldBe(TimeSpan.FromMinutes(10));   // IP'ninki 5 dk olurdu
    }

    [Fact]
    public void EvaluateThrottle_24SaattenEskiSatirlar_HicSayilmaz()
    {
        // login_code satırları 7 gün duruyor (temizlik scripti öyle). Pencereden
        // düşmüş satırlar sayılsaydı kullanıcı kalıcı olarak kilitlenirdi.
        var rows = Enumerable.Range(1, 30)
            .Select(i => Row(TimeSpan.FromHours(24) + TimeSpan.FromMinutes(i)))
            .ToArray();

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.Issue);
        decision.ResendAvailableAtUtc.ShouldBe(Now.AddSeconds(60));
    }

    [Fact]
    public void EvaluateThrottle_TumLimitlerinAltinda_RateLimitedDegil()
    {
        // 4 e-posta kodu (limit 5) + 19 IP kodu (limit 20). Sınırın bir altında
        // kalmak 429 üretmemeli — aksi halde limitler fiilen bir eksik çalışır.
        var rows = Enumerable.Range(1, 4)
            .Select(i => Row(TimeSpan.FromMinutes(i * 10)))
            .Concat(Enumerable.Range(0, 19)
                .Select(_ => Row(TimeSpan.FromMinutes(30), matchesEmail: false, matchesIp: true)))
            .ToArray();

        var decision = Evaluate(rows);

        decision.Outcome.ShouldBe(LoginCodeThrottleOutcome.Issue);
        decision.RetryAfter.ShouldBeNull();
        decision.ResendAvailableAtUtc.ShouldBe(Now.AddSeconds(300));
    }

    private static LoginCodeThrottleDecision Evaluate(IReadOnlyList<LoginCodeWindowRow> window)
        => RequestLoginCodeCommandHandler.EvaluateThrottle(window, Now, new AuthOptions());

    private static LoginCodeWindowRow Row(
        TimeSpan age,
        bool matchesEmail = true,
        bool matchesIp = false,
        LoginCodeStatus status = LoginCodeStatus.Pending,
        int attemptCount = 0)
    {
        var createdAtUtc = Now - age;
        return new LoginCodeWindowRow(
            Guid.CreateVersion7(),
            createdAtUtc,
            createdAtUtc.AddMinutes(10),
            status,
            attemptCount,
            matchesEmail,
            matchesIp);
    }

    /// <summary>Yeni kod istendiğinde eski satırların gerçekte aldığı durum.</summary>
    private static LoginCodeWindowRow Superseded(TimeSpan age)
        => Row(age, status: LoginCodeStatus.Superseded);
}
