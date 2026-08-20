using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Shouldly;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Domain.Users;

namespace Expyra.Application.UnitTests.Features.Host;

/// <summary>
/// "Host ol" kararının tamamı <c>Decide</c> içinde ve saf: DB görmüyor, bu yüzden üç
/// sonucun hepsi burada test ediliyor. Handler'a kalan iş EF'in: bir satır kilitle,
/// bir sütun yaz.
/// </summary>
public sealed class ActivateHostTests
{
    [Fact]
    public void Decide_RolsuzAktifHesap_Grant()
    {
        // VISION §9: onay süreci YOK. Aktif hesabın rol istemesi tek başına yeterli.
        ActivateHostCommandHandler.Decide(NewUser()).ShouldBe(HostActivationDecision.Grant);
    }

    [Fact]
    public void Decide_ZatenHost_AlreadyHost()
    {
        // İdempotanlığın kaynağı burası: ikinci çağrı hata değil, yalnız YAZMA YOK.
        // Grant dönseydi diziye ikinci bir 'Host' eklenirdi.
        var user = NewUser();
        user.Roles.Add(UserRole.Host);

        ActivateHostCommandHandler.Decide(user).ShouldBe(HostActivationDecision.AlreadyHost);
    }

    [Theory]
    [InlineData(UserStatus.Suspended)]
    [InlineData(UserStatus.Banned)]
    public void Decide_AktifOlmayanHesap_Blocked(UserStatus status)
    {
        // Onay kapısı yok ama ban var (VISION §9): askıya alınmış hesap rol kazanamaz.
        var user = NewUser();
        user.Status = status;

        ActivateHostCommandHandler.Decide(user).ShouldBe(HostActivationDecision.Blocked);
    }

    [Fact]
    public void Decide_BanliHost_Blocked_AlreadyHostDegil()
    {
        // SIRA KİLİDİ: durum kontrolü rol kontrolünden ÖNCE. Ters sırada banlı bir host
        // "zaten host" diye 200 alır ve elinde TAZE, rollü bir access token bulurdu —
        // ban token üretilmeden önce kontrol edilmek zorunda.
        var user = NewUser();
        user.Roles.Add(UserRole.Host);
        user.Status = UserStatus.Banned;

        ActivateHostCommandHandler.Decide(user).ShouldBe(HostActivationDecision.Blocked);
    }

    [Fact]
    public void HasRole_BuyukKucukHarfDuyarli()
    {
        // Rol adı hem text[] sütununda hem JWT claim'inde AYNEN duruyor. Karşılaştırma
        // gevşetilirse 'host' yazan elle düzenlenmiş bir satır kapıyı açardı.
        var user = NewUser();
        user.Roles.Add("host");

        user.HasRole(UserRole.Host).ShouldBeFalse();
    }

    [Fact]
    public async Task Handle_KimlikYoksa_RequireUserIdIstisnasiYutulmaz()
    {
        // CLAUDE.md #1: handler burada catch yazarsa kimliksiz istek 401 yerine
        // "host oldun" + geçerli bir token alır. Kimlik kontrolü ilk sırada olmalı;
        // sonrasına kayarsa kimliksiz istek önce transaction açar.
        var dbContext = Substitute.For<IAppDbContext>();
        var tokenService = Substitute.For<ITokenService>();
        var currentUser = Substitute.For<ICurrentUser>();
        currentUser.RequireUserId()
            .Returns(_ => throw new UnauthorizedAccessException("Kimlik doğrulaması gerekli."));

        // Logger sahtelenmiyor: handler internal ve Castle proxy'si internal generic
        // argümanla üretilemiyor. NullLogger gerçek bir tip, hiçbir şey iddia etmiyoruz.
        var handler = new ActivateHostCommandHandler(
            dbContext,
            currentUser,
            tokenService,
            NullLogger<ActivateHostCommandHandler>.Instance);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await handler.Handle(new ActivateHostCommand(), CancellationToken.None));

        await dbContext.DidNotReceive().BeginTransactionAsync(Arg.Any<CancellationToken>());
        await dbContext.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        tokenService.DidNotReceive()
            .CreateAccessToken(Arg.Any<Guid>(), Arg.Any<IReadOnlyCollection<string>>());
    }

    private static User NewUser() => new()
    {
        Email = "ada@expyra.test",
        NormalizedEmail = "ada@expyra.test",
    };
}
