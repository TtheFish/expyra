using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Auth.Queries.GetCurrentUser;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Users.Commands.UpdateProfile;

/// <summary>
/// Oturum sahibinin düzenleyebildiği profil alanları. İstekte <c>UserId</c> ALANI YOK
/// (CLAUDE.md #3) — kimlik token'dan okunur.
///
/// <para><b>Sözleşme: gövde TAM profili taşır, delta değil.</b> Verilmeyen (null) alan
/// "değiştirme" değil "temizle" anlamına gelir. "Yok / null / değer" üçlü ayrımı JSON'da
/// ayrı bir sarmalayıcı tip ister; iki alanlık bir formda bedeli faydasından büyük.
/// İstemci hesap formunu HER İKİ alanla birlikte göndermek zorunda — yalnız adı
/// gönderirse kullanıcının dil tercihi sessizce silinir.</para>
///
/// <para>Bilerek YOK: e-posta (step-up OTP ister), avatar, biyografi, rol — hepsi
/// başka bloklarda (docs/PLAN.md Blok 1).</para>
/// </summary>
public sealed record UpdateProfileCommand(string? DisplayName, string? PreferredLanguage)
    : IRequest<CurrentUserResponse>;

/// <summary>Normalize edilmiş, doğrudan sütuna yazılabilir hâl.</summary>
internal sealed record ProfileEdit(string? DisplayName, string? PreferredLanguage);

internal sealed class UpdateProfileCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser)
    : IRequestHandler<UpdateProfileCommand, CurrentUserResponse>
{
    public async Task<CurrentUserResponse> Handle(
        UpdateProfileCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Kimlik EN BAŞTA: kimliksiz istek için veritabanına hiç gitmiyoruz ve
        // RequireUserId'nin istisnası yakalanmıyor (CLAUDE.md #1).
        var userId = currentUser.RequireUserId();

        var edit = Normalize(request);

        if (edit.PreferredLanguage is not null)
        {
            // Kayıt defterinde olmayan kod fk_app_user_preferred_language'ı kırar ve
            // kullanıcı 500 görür. Kontrol YAZMADAN ÖNCE: hata yolu yarım profil bırakmasın.
            var known = await ContentLanguage(dbContext.Languages.AsNoTracking(), edit.PreferredLanguage)
                .AnyAsync(cancellationToken)
                .ConfigureAwait(false);

            if (!known)
            {
                throw new BadRequestException($"'{edit.PreferredLanguage}' desteklenen bir dil değil.");
            }
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            .ConfigureAwait(false);

        // Token imzası geçerli ama satır yok: hesap silinmiş ya da token başka bir
        // veritabanına ait. GetCurrentUserQueryHandler ile aynı karar.
        if (user is null)
        {
            throw new UnauthorizedException();
        }

        user.DisplayName = edit.DisplayName;
        user.PreferredLanguage = edit.PreferredLanguage;

        // Transaction YOK ve bu bilinçli: tek satırın iki skaler sütunu yazılıyor, yeni
        // değer eskisinden TÜREMİYOR. CLAUDE.md #5'in hedefi "oku-değiştir-yaz" ile
        // korunan bir invariant (kapasite düşümü gibi); burada öyle bir invariant yok,
        // tek SaveChanges zaten atomik. İki eşzamanlı düzenlemede son yazan kazanır.
        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Şekil /me ile TEK projeksiyondan üretiliyor — istemci iki ayrı gövde
        // ayrıştırmasın. Sorgu bellekteki tek satır üstünde koşuyor: ikinci DB gidişi yok.
        return GetCurrentUserQueryHandler
            .Project(new[] { user }.AsQueryable(), userId)
            .Single();
    }

    /// <summary>
    /// Girdi normalizasyonu. Veritabanı görmez — DB'siz test edilir
    /// (GetLanguagesQueryHandler.Project ile aynı disiplin).
    ///
    /// <para>Boşluk-only ad <c>null</c>'a iner: "   " bir ad değil, temizleme niyetidir.
    /// Olduğu gibi yazılırsa header'da görünmez bir ad basılır ve kullanıcı adının
    /// kaybolduğunu sanır.</para>
    /// </summary>
    internal static ProfileEdit Normalize(UpdateProfileCommand request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName)
            ? null
            : request.DisplayName.Trim();

        if (string.IsNullOrWhiteSpace(request.PreferredLanguage))
        {
            return new ProfileEdit(displayName, null);
        }

        // Validator biçimi zaten doğruladı; buradaki ikinci geçişin işi KANONİK hâli
        // üretmek (RequestLoginCode'daki e-posta kalıbının aynısı). 'en_us' ile 'en-US'
        // aynı dildir; normalize edilmezse ikincisi kayıt defterinde bulunamaz.
        if (!LanguageCode.TryNormalize(request.PreferredLanguage, out var normalized))
        {
            throw new BadRequestException("Dil kodu geçersiz.");
        }

        return new ProfileEdit(displayName, normalized);
    }

    /// <summary>
    /// "Bu kod kayıt defterinde var mı ve içerik dili olarak açık mı" filtresi.
    /// <c>IQueryable</c> aldığı için DB'siz test edilebilir.
    ///
    /// <para><c>UiAvailable</c> DEĞİL <c>ContentAllowed</c>: bu alan kullanıcıya hangi
    /// dilde YAZACAĞIMIZI söyler (e-posta, içerik tercihi). Arayüzün hangi dilde
    /// render edileceğini URL taşıyor (docs/I18N.md §5.2). UiAvailable'a bağlanırsa
    /// kullanıcı 49 dilden yalnız 2'sini seçebilir — dil seçicideki liste yalan olur.</para>
    /// </summary>
    internal static IQueryable<Language> ContentLanguage(IQueryable<Language> source, string code)
        => source.Where(x => x.Code == code && x.ContentAllowed);
}
