using Shouldly;
using Expyra.Application.Features.Auth.Commands.RefreshSession;
using Expyra.Domain.Identity;

namespace Expyra.Application.UnitTests.Features.Auth;

/// <summary>
/// Rotasyon kararı: hangi durumda 401, hangisinde yeni çift, hangisinde AİLE İPTALİ.
/// Yanlış tarafa düşen tek bir dal ya çalınan zinciri yaşatır ya da meşru kullanıcıyı
/// paralel yenilemede rastgele dışarı atar — ikisi de üretimde teşhis edilmesi zor.
/// </summary>
public sealed class RefreshRotationDecisionTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Grace = TimeSpan.FromSeconds(30);

    [Fact]
    public void DecideRotation_TokenBulunamadi_InvalidDoner()
        => Decide(null).ShouldBe(RefreshRotationDecision.Invalid);

    [Fact]
    public void DecideRotation_AktifToken_RotateDoner()
        => Decide(Token()).ShouldBe(RefreshRotationDecision.Rotate);

    [Fact]
    public void DecideRotation_GraceIcindeRotated_ReuseDegilRotate()
    {
        // Mobil istemciler ve Next prefetch aynı token'ı gerçekten iki kez sunuyor.
        // Grace olmasaydı meşru kullanıcı KENDİ ailesini iptal ettirip çıkış yerdi.
        var token = Token(revokedAtUtc: Now.AddSeconds(-10), reason: TokenRevocationReason.Rotated);

        Decide(token).ShouldBe(RefreshRotationDecision.Rotate);
    }

    [Fact]
    public void DecideRotation_GraceTamSinirinda_HalaRotate()
    {
        // Sınır kapsayıcı (<=): tam 30. saniyede gelen paralel istek hâlâ meşru sayılır.
        var token = Token(revokedAtUtc: Now - Grace, reason: TokenRevocationReason.Rotated);

        Decide(token).ShouldBe(RefreshRotationDecision.Rotate);
    }

    [Fact]
    public void DecideRotation_GraceBirTickAsilmis_ReuseDetected()
    {
        var token = Token(
            revokedAtUtc: Now - Grace - TimeSpan.FromTicks(1),
            reason: TokenRevocationReason.Rotated);

        Decide(token).ShouldBe(RefreshRotationDecision.ReuseDetected);
    }

    [Fact]
    public void DecideRotation_GraceDisindaRotated_ReuseDetected()
    {
        // 60 sn önce dönmüş bir token'ın yeniden sunulması artık paralel istek değil:
        // ya çalınmış ya da klonlanmış. Ailenin tamamı kesilir.
        var token = Token(revokedAtUtc: Now.AddSeconds(-60), reason: TokenRevocationReason.Rotated);

        Decide(token).ShouldBe(RefreshRotationDecision.ReuseDetected);
    }

    [Fact]
    public void DecideRotation_ReuseDetectedIptali_GracePenceresineGirmez()
    {
        // Bu testin varlık sebebi: grace YALNIZ Rotated'a açık. Aksi halde reuse
        // alarmından sonraki 30 sn boyunca saldırgan yenilemeye devam edebilirdi.
        var token = Token(
            revokedAtUtc: Now.AddSeconds(-5), reason: TokenRevocationReason.ReuseDetected);

        Decide(token).ShouldBe(RefreshRotationDecision.ReuseDetected);
    }

    [Fact]
    public void DecideRotation_SignOutIptali_GracePenceresineGirmez()
    {
        // "Çıkış yaptım" bir sözdür: 30 sn daha çalışan bir oturum o sözü bozar.
        var token = Token(revokedAtUtc: Now.AddSeconds(-5), reason: TokenRevocationReason.SignOut);

        Decide(token).ShouldBe(RefreshRotationDecision.ReuseDetected);
    }

    [Fact]
    public void DecideRotation_AccountSuspendedIptali_GracePenceresineGirmez()
    {
        var token = Token(
            revokedAtUtc: Now.AddSeconds(-5), reason: TokenRevocationReason.AccountSuspended);

        Decide(token).ShouldBe(RefreshRotationDecision.ReuseDetected);
    }

    [Fact]
    public void DecideRotation_IptalEdilmisAmaSebepYok_ReuseDetected()
    {
        // Sebepsiz iptal veri anomalisi (elle UPDATE, eksik migration). Varsayılan
        // güvenli tarafa düşmeli: iptal edilmiş satır rotasyona açılmaz.
        Decide(Token(revokedAtUtc: Now.AddSeconds(-1), reason: null))
            .ShouldBe(RefreshRotationDecision.ReuseDetected);
    }

    [Fact]
    public void DecideRotation_MutlakTavanAsilmis_InvalidDoner()
    {
        // Tavan rotasyonla UZAMIYOR: 90 gün sonra zincir, normal ömrü dolmamış olsa
        // bile ölür. Çalınan bir zincirin sonsuza kadar yaşamasını engelleyen tek kural.
        var token = Token(absoluteExpiresAtUtc: Now);

        Decide(token).ShouldBe(RefreshRotationDecision.Invalid);
    }

    [Fact]
    public void DecideRotation_TavanAsilmisVeGraceIcinde_ReuseDegilInvalid()
    {
        // Sıralamanın anlamı: tavanı geçmiş aile zaten ölü. Ona reuse alarmı çalmak
        // (Error + alarm) gerçek bir hırsızlık sinyalini gürültüye gömerdi.
        var token = Token(
            revokedAtUtc: Now.AddSeconds(-5),
            reason: TokenRevocationReason.Rotated,
            absoluteExpiresAtUtc: Now.AddSeconds(-1));

        Decide(token).ShouldBe(RefreshRotationDecision.Invalid);
    }

    [Fact]
    public void DecideRotation_NormalOmruDolmus_InvalidDoner()
    {
        // 30 gün dokunulmamış oturum. İptal edilmediği için reuse değil, sadece bitmiş.
        var token = Token(expiresAtUtc: Now);

        Decide(token).ShouldBe(RefreshRotationDecision.Invalid);
    }

    [Fact]
    public void DecideRotation_SonAndanBirTickOnce_HalaRotate()
    {
        Decide(Token(expiresAtUtc: Now.AddTicks(1))).ShouldBe(RefreshRotationDecision.Rotate);
    }

    private static RefreshRotationDecision Decide(RefreshToken? token)
        => RefreshSessionCommandHandler.DecideRotation(token, Now, Grace);

    private static RefreshToken Token(
        DateTimeOffset? revokedAtUtc = null,
        TokenRevocationReason? reason = null,
        DateTimeOffset? expiresAtUtc = null,
        DateTimeOffset? absoluteExpiresAtUtc = null)
    {
        var familyId = Guid.CreateVersion7();
        return new RefreshToken
        {
            Id = familyId,
            UserId = Guid.CreateVersion7(),
            TokenHash = new byte[32],
            FamilyId = familyId,
            ExpiresAtUtc = expiresAtUtc ?? Now.AddDays(30),
            AbsoluteExpiresAtUtc = absoluteExpiresAtUtc ?? Now.AddDays(90),
            RevokedAtUtc = revokedAtUtc,
            RevocationReason = reason,
        };
    }
}
