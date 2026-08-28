using Shouldly;
using Expyra.Application.Features.Auth.Commands.VerifyLoginCode;
using Expyra.Domain.Identity;

namespace Expyra.Application.UnitTests.Features.Auth;

/// <summary>
/// Doğrulama kararının tamamı saf bir fonksiyonda: DB'siz yedi sonucun hepsi burada.
/// Dışarıya bunlardan yalnız İKİ yanıt çıkıyor (400 ve 429) ve ayrım sadece log'a
/// gidiyor — yani tek yerde test edilmezse fark sessizce kaybolur.
/// </summary>
public sealed class LoginCodeVerdictTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
    private const int MaxAttempts = 5;

    [Fact]
    public void Evaluate_KullanilabilirSatirVeDogruKod_ValidDoner()
        => Evaluate(Code(), codeMatches: true).ShouldBe(LoginCodeVerdict.Valid);

    [Fact]
    public void Evaluate_SatirYok_NotFoundDoner()
    {
        // Uydurma challengeId ya da temizlenmiş satır. Dışarıya yine 400 ve AYNI mesaj
        // gidiyor: farklı mesaj "bu adres için aktif kod var mı" oracle'ı kurardı.
        Evaluate(loginCode: null, codeMatches: false).ShouldBe(LoginCodeVerdict.NotFound);
    }

    [Fact]
    public void Evaluate_SuresiDolmus_DogruKodOlsaBileExpiredDoner()
    {
        // Süre dolumu ayrı bir DURUM değil, expires_at_utc'den türetiliyor — bu yüzden
        // Pending kalmış bir satırın süresini yalnız bu karşılaştırma kapatıyor.
        Evaluate(Code(expiresAtUtc: Now), codeMatches: true).ShouldBe(LoginCodeVerdict.Expired);
    }

    [Fact]
    public void Evaluate_SonAndanBirTickOnce_HalaValid()
    {
        // Sınır kapsayıcı olsaydı (now > expires) süresi dolmuş kod 1 tick daha yaşardı.
        Evaluate(Code(expiresAtUtc: Now.AddTicks(1)), codeMatches: true)
            .ShouldBe(LoginCodeVerdict.Valid);
    }

    [Fact]
    public void Evaluate_ZatenKullanilmis_ConsumedDoner()
    {
        // Tek kullanımlık: doğru kod ikinci kez sunulduğunda da reddedilir.
        Evaluate(Code(status: LoginCodeStatus.Consumed), codeMatches: true)
            .ShouldBe(LoginCodeVerdict.Consumed);
    }

    [Fact]
    public void Evaluate_YeniKodIstenmis_SupersededDoner()
    {
        // Gerçek hayattaki en sık senaryo: kullanıcı "tekrar gönder"e bastıktan sonra
        // ESKİ e-postadaki kodu yazıyor. "Aynı anda en fazla 1 geçerli kod" kuralı bu.
        Evaluate(Code(status: LoginCodeStatus.Superseded), codeMatches: true)
            .ShouldBe(LoginCodeVerdict.Superseded);
    }

    [Fact]
    public void Evaluate_YanlisKod_WrongCodeDoner()
        => Evaluate(Code(attemptCount: 2), codeMatches: false).ShouldBe(LoginCodeVerdict.WrongCode);

    [Fact]
    public void Evaluate_YanmisKod_DogruKodGelseBileBurnedDoner()
    {
        // Yakma geri alınamaz: 5 denemeden sonra doğru kodu bulan saldırgan da giremez.
        Evaluate(Code(status: LoginCodeStatus.Burned), codeMatches: true)
            .ShouldBe(LoginCodeVerdict.Burned);
    }

    [Fact]
    public void Evaluate_DenemeSayisiDolmus_StatusPendingOlsaBileBurnedDoner()
    {
        // Sayacın limite ulaştığı istekte status da yazılıyor; bu kontrol o yazma
        // gerçekleşmese bile (yarış, elle müdahale) kapının kapalı kalmasını sağlıyor.
        Evaluate(Code(attemptCount: MaxAttempts), codeMatches: false)
            .ShouldBe(LoginCodeVerdict.Burned);
    }

    [Fact]
    public void Evaluate_HemYanmisHemSuresiDolmus_BurnedOncelikli()
    {
        // Sıralamanın kullanıcıya bakan sonucu var: Burned 429 + "yeni kod iste",
        // Expired 400 + "kod geçersiz" üretiyor. Ters sırada yönerge kaybolur.
        Evaluate(
            Code(status: LoginCodeStatus.Burned, expiresAtUtc: Now.AddMinutes(-1)),
            codeMatches: false)
            .ShouldBe(LoginCodeVerdict.Burned);
    }

    private static LoginCodeVerdict Evaluate(LoginCode? loginCode, bool codeMatches)
        => VerifyLoginCodeCommandHandler.Evaluate(loginCode, codeMatches, Now, MaxAttempts);

    private static LoginCode Code(
        LoginCodeStatus status = LoginCodeStatus.Pending,
        int attemptCount = 0,
        DateTimeOffset? expiresAtUtc = null)
        => new()
        {
            NormalizedEmail = "user@example.com",
            EmailDisplay = "User@Example.com",
            CodeHash = new byte[32],
            Status = status,
            AttemptCount = attemptCount,
            ExpiresAtUtc = expiresAtUtc ?? Now.AddMinutes(10),
        };
}
