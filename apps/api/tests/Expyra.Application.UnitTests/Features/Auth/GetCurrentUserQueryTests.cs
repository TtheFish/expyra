using NSubstitute;
using Shouldly;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Domain.Users;

namespace Expyra.Application.UnitTests.Features.Auth;

/// <summary>
/// <c>/me</c> hem projeksiyonu hem de "kimlik istemciden alınmaz" kuralını (CLAUDE.md #3)
/// kanıtlayan uç. Projeksiyon <c>IQueryable</c> üzerinden çalıştığı için DB'siz test edilir.
/// </summary>
public sealed class GetCurrentUserQueryTests
{
    private static readonly Guid UserId = Guid.CreateVersion7();
    private static readonly Guid OtherUserId = Guid.CreateVersion7();
    private static readonly DateTimeOffset CreatedAtUtc = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static readonly IQueryable<User> Users = new List<User>
    {
        new()
        {
            Id = UserId,
            Email = "User@Example.com",
            NormalizedEmail = "user@example.com",
            EmailVerifiedAtUtc = CreatedAtUtc,
            PreferredLanguage = "tr",
            CreatedAtUtc = CreatedAtUtc,
        },
        new()
        {
            Id = OtherUserId,
            Email = "Other@Example.com",
            NormalizedEmail = "other@example.com",
            EmailVerifiedAtUtc = CreatedAtUtc,
            DisplayName = "Komşu",
            CreatedAtUtc = CreatedAtUtc,
        },
    }.AsQueryable();

    [Fact]
    public void Project_OturumSahibi_GosterimHalindekiEpostayiDoner()
    {
        var user = GetCurrentUserQueryHandler.Project(Users, UserId).ToList().ShouldHaveSingleItem();

        user.Id.ShouldBe(UserId);
        // Aramada normalized_email kullanılır; GÖSTERİMDE kullanıcının yazdığı hâl.
        user.Email.ShouldBe("User@Example.com");
        user.DisplayName.ShouldBeNull();          // Faz 1.5'e kadar sorulmuyor
        user.PreferredLanguage.ShouldBe("tr");
        user.CreatedAtUtc.ShouldBe(CreatedAtUtc);
    }

    [Fact]
    public void Project_YalnizcaVerilenId_BaskaSatirDonmez()
    {
        // Filtre kaybolursa /me sıradaki ilk kullanıcının profilini döner — sessiz
        // ve en ağır sızıntı türü. Ayrıca bilinmeyen id BOŞ dönmeli ki handler
        // "oturum geçersiz" diyebilsin.
        GetCurrentUserQueryHandler.Project(Users, OtherUserId).Single().Id.ShouldBe(OtherUserId);
        GetCurrentUserQueryHandler.Project(Users, Guid.CreateVersion7()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_KimlikYoksa_RequireUserIdIstisnasiYutulmaz()
    {
        // Bu testin varlık sebebi CLAUDE.md #1: handler burada catch yazarsa kimliksiz
        // istek 401 yerine "boş profil" alır ve [Authorize] fiilen anlamını kaybeder.
        var dbContext = Substitute.For<IAppDbContext>();
        var currentUser = Substitute.For<ICurrentUser>();
        currentUser.RequireUserId()
            .Returns(_ => throw new UnauthorizedAccessException("Kimlik doğrulaması gerekli."));

        var handler = new GetCurrentUserQueryHandler(dbContext, currentUser);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await handler.Handle(new GetCurrentUserQuery(), CancellationToken.None));

        // Kimlik yoksa sorgu hiç kurulmamalı — kontrol sıralaması da sözleşmenin parçası.
        _ = dbContext.DidNotReceive().Users;
    }
}
