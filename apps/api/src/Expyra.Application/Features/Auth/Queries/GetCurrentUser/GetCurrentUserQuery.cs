using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Auth.Queries.GetCurrentUser;

/// <summary>
/// Oturum sahibinin profili. Komutun içinde kullanıcı id'si YOK (CLAUDE.md #3) —
/// kimlik token'dan okunur. Bu uç aynı zamanda JWT şemasının ve
/// <see cref="ICurrentUser"/>'ın gerçekten çalıştığını kanıtlıyor.
/// </summary>
public sealed record GetCurrentUserQuery : IRequest<CurrentUserResponse>
{
    /// <summary>
    /// Profili okur ve yanıt şekline çevirir. <b>Profili DEĞİŞTİREN uçlar da bunu
    /// çağırıyor</b> (ad güncelleme, avatar onayı): yanıt şekli tek yerde kurulduğu
    /// için "PATCH sonrası dönen gövde ile /me'nin gövdesi ayrıştı" hatası doğamıyor.
    /// </summary>
    internal static async Task<CurrentUserResponse> ComposeAsync(
        IAppDbContext dbContext,
        IObjectStorage storage,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var row = await GetCurrentUserQueryHandler
            .Project(dbContext.Users.AsNoTracking(), userId)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        // Token imzası geçerli ama satır yok: hesap silinmiş ya da token başka bir
        // veritabanına ait. İkisi de "oturum geçersiz" demek.
        if (row is null)
        {
            throw new UnauthorizedException();
        }

        return ToResponse(row, storage);
    }

    /// <summary>
    /// Ham satırı yanıt şekline çevirir. Adres burada üretiliyor çünkü
    /// <c>PublicUrl</c> SQL'e çevrilemez — bkz. <c>GetCurrentUserQueryHandler.Project</c>.
    /// </summary>
    internal static CurrentUserResponse ToResponse(CurrentUserRow row, IObjectStorage storage)
        => new(
            row.Id,
            row.Email,
            row.DisplayName,
            row.PreferredLanguage,
            row.CreatedAtUtc,
            row.IsHost,
            row.AvatarKey is null ? null : storage.PublicUrl(row.AvatarKey));
}

/// <summary>
/// E-posta claim'i token'da YOK — PII'yi token'da taşımak yerine bu uçtan veriyoruz.
/// </summary>
/// <param name="IsHost">
/// Kaynağı VERİTABANI, token değil. Arayüz "Host paneli" bağlantısını buna göre
/// gösteriyor; token'dan okunsaydı rolünü yeni kazanmış kullanıcı menüde bağlantıyı
/// token yenilenene kadar göremezdi. Rol dizisi olduğu gibi DÖNMÜYOR: istemcinin
/// ihtiyacı "host mu" sorusunun cevabı ve dizi kıyaslamasını her istemcide yeniden
/// yazmak, rol adını üç ayrı yerde daha kopyalamak demek.
/// </param>
/// <param name="AvatarUrl">
/// Profil fotoğrafının okuma adresi; fotoğraf yoksa <c>null</c> ve arayüz baş harfe
/// düşüyor. Adres HER YANITTA yeniden üretiliyor — veritabanında anahtar duruyor,
/// böylece CDN alan adı değişince geçmiş satırlar migration istemiyor.
/// </param>
public sealed record CurrentUserResponse(
    Guid Id,
    string Email,
    string? DisplayName,
    string? PreferredLanguage,
    DateTimeOffset CreatedAtUtc,
    bool IsHost,
    Uri? AvatarUrl);

internal sealed class GetCurrentUserQueryHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<GetCurrentUserQuery, CurrentUserResponse>
{
    public async Task<CurrentUserResponse> Handle(
        GetCurrentUserQuery request,
        CancellationToken cancellationToken)
    {
        // RequireUserId fırlatırsa YAKALAMIYORUZ: kimlik yoksa 401 dönmeli,
        // "boş profil" değil (CLAUDE.md #1).
        var userId = currentUser.RequireUserId();

        return await GetCurrentUserQuery
            .ComposeAsync(dbContext, storage, userId, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Projeksiyon <c>IQueryable</c> aldığı için DB'siz test edilebiliyor
    /// (GetLanguagesQueryHandler.Project ile aynı kalıp).
    ///
    /// <para><b>Yanıt tipini DEĞİL ara satırı döndürüyor:</b> avatar adresi
    /// <c>IObjectStorage.PublicUrl</c> ile üretiliyor ve o metot SQL'e çevrilemez.
    /// Doğrudan yanıt kurulsaydı EF sorguyu istemci tarafında değerlendirmeye düşürür
    /// ya da patlardı; adresin bellekte kurulması bu yüzden bir tercih değil, zorunluluk.</para>
    /// </summary>
    internal static IQueryable<CurrentUserRow> Project(IQueryable<User> source, Guid userId)
        => source
            .Where(x => x.Id == userId)
            .Select(x => new CurrentUserRow(
                x.Id,
                x.Email,
                x.DisplayName,
                x.PreferredLanguage,
                x.CreatedAtUtc,
                // user.HasRole(...) DEĞİL: metot çağrısı SQL'e çevrilemez ve sorgu
                // istemciye değerlendirmeye düşerdi. Contains, Npgsql'de
                // `roles @> ARRAY['Host']` oluyor.
                x.Roles.Contains(UserRole.Host),
                x.AvatarKey));
}

/// <summary>Sorgudan dönen ham satır. <c>AvatarKey</c> istemciye GİTMİYOR — adrese çevriliyor.</summary>
internal sealed record CurrentUserRow(
    Guid Id,
    string Email,
    string? DisplayName,
    string? PreferredLanguage,
    DateTimeOffset CreatedAtUtc,
    bool IsHost,
    string? AvatarKey);
