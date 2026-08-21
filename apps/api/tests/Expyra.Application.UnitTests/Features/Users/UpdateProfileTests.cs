using NSubstitute;
using Shouldly;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Users.Commands.UpdateProfile;
using Expyra.Domain.Languages;

namespace Expyra.Application.UnitTests.Features.Users;

/// <summary>
/// Handler'ın karar mantığı saf iki metotta toplandı (<c>Normalize</c> ve
/// <c>ContentLanguage</c>), bu yüzden DB'siz test ediliyor. Kalan iş EF'in:
/// tek satır oku, iki sütun yaz.
/// </summary>
public sealed class UpdateProfileTests
{
    private static readonly IQueryable<Language> Languages = new List<Language>
    {
        new() { Code = "tr", NativeName = "Türkçe",  EnglishName = "Turkish", UiAvailable = true },
        new() { Code = "de", NativeName = "Deutsch", EnglishName = "German",  UiAvailable = false },
        new() { Code = "cs", NativeName = "Čeština", EnglishName = "Czech",   ContentAllowed = false },
    }.AsQueryable();

    [Fact]
    public void Normalize_BoslukOnlyAd_NullaIniyor()
    {
        // "   " bir ad değil, temizleme niyeti. Olduğu gibi yazılırsa header'da
        // görünmez bir ad basılır ve kullanıcı adının kaybolduğunu sanır.
        UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand("   ", null))
            .DisplayName.ShouldBeNull();

        UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand(null, null))
            .DisplayName.ShouldBeNull();
    }

    [Fact]
    public void Normalize_Ad_BastakiVeSondakiBosluklariKirpiyor()
    {
        UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand("  Ada Lovelace  ", null))
            .DisplayName.ShouldBe("Ada Lovelace");
    }

    [Theory]
    [InlineData("en_us", "en-US")]
    [InlineData("PT-br", "pt-BR")]
    [InlineData(" de ", "de")]
    public void Normalize_DilKodu_KanonikHaleIniyor(string raw, string expected)
    {
        // Normalize edilmezse 'en_us' kayıt defterinde bulunamaz ve kullanıcı,
        // gerçekte desteklenen bir dil için 400 alır.
        UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand(null, raw))
            .PreferredLanguage.ShouldBe(expected);
    }

    [Fact]
    public void Normalize_BosDilKodu_TercihiTemizliyor()
    {
        UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand("Ada", null))
            .PreferredLanguage.ShouldBeNull();

        UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand("Ada", "   "))
            .PreferredLanguage.ShouldBeNull();
    }

    [Fact]
    public void Normalize_GecersizDilKodu_400Firlatiyor()
    {
        // Validator bunu zaten yakalıyor; buradaki ikinci kapı, komutu doğrudan
        // gönderen bir çağıranın FK'yı kırıp 500 üretmesini engelliyor.
        var exception = Should.Throw<BadRequestException>(() =>
            UpdateProfileCommandHandler.Normalize(new UpdateProfileCommand(null, "english")));

        exception.StatusCode.ShouldBe(400);
    }

    [Fact]
    public void ContentLanguage_ArayuzDiliOlmasaBileSecilebiliyor()
    {
        // Seed'deki 49 dilin 47'sinde UiAvailable=false. Filtre UiAvailable'a
        // bağlansaydı kullanıcı yalnız tr/en seçebilirdi; oysa bu alan İÇERİK dili
        // (docs/I18N.md §5.2), arayüz dilini URL taşıyor.
        UpdateProfileCommandHandler.ContentLanguage(Languages, "de").ShouldHaveSingleItem();
        UpdateProfileCommandHandler.ContentLanguage(Languages, "tr").ShouldHaveSingleItem();
    }

    [Fact]
    public void ContentLanguage_KapaliVeyaTanimsizDil_BosDonuyor()
    {
        // ContentAllowed=false: dil satırı silinmeden içerik girişine kapatılmış hâli.
        UpdateProfileCommandHandler.ContentLanguage(Languages, "cs").ShouldBeEmpty();

        // 'zu' geçerli bir BCP-47 etiketi ama kayıt defterinde yok — handler bunu
        // görüp 400 döner, FK'nın patlamasını beklemez.
        UpdateProfileCommandHandler.ContentLanguage(Languages, "zu").ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_KimlikYoksa_RequireUserIdIstisnasiYutulmaz()
    {
        // CLAUDE.md #1: handler burada catch yazarsa kimliksiz istek 401 yerine
        // "profil güncellendi" alır. Kimlik kontrolü ilk sırada olmalı — sonrasına
        // kayarsa kimliksiz bir istek önce veritabanına gider.
        var dbContext = Substitute.For<IAppDbContext>();
        var currentUser = Substitute.For<ICurrentUser>();
        currentUser.RequireUserId()
            .Returns(_ => throw new UnauthorizedAccessException("Kimlik doğrulaması gerekli."));

        var handler = new UpdateProfileCommandHandler(dbContext, Substitute.For<IObjectStorage>(), currentUser);

        await Should.ThrowAsync<UnauthorizedAccessException>(async () =>
            await handler.Handle(new UpdateProfileCommand("Ada", "tr"), CancellationToken.None));

        _ = dbContext.DidNotReceive().Users;
        _ = dbContext.DidNotReceive().Languages;
        await dbContext.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
