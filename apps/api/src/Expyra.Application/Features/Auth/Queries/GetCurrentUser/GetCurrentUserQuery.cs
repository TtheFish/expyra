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
public sealed record GetCurrentUserQuery : IRequest<CurrentUserResponse>;

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
public sealed record CurrentUserResponse(
    Guid Id,
    string Email,
    string? DisplayName,
    string? PreferredLanguage,
    DateTimeOffset CreatedAtUtc,
    bool IsHost);

internal sealed class GetCurrentUserQueryHandler(
    IAppDbContext dbContext,
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

        var user = await Project(dbContext.Users.AsNoTracking(), userId)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        // Token imzası geçerli ama satır yok: hesap silinmiş ya da token başka bir
        // veritabanına ait. İkisi de "oturum geçersiz" demek.
        return user ?? throw new UnauthorizedException();
    }

    /// <summary>
    /// Projeksiyon <c>IQueryable</c> aldığı için DB'siz test edilebiliyor
    /// (GetLanguagesQueryHandler.Project ile aynı kalıp).
    /// </summary>
    internal static IQueryable<CurrentUserResponse> Project(IQueryable<User> source, Guid userId)
        => source
            .Where(x => x.Id == userId)
            .Select(x => new CurrentUserResponse(
                x.Id,
                x.Email,
                x.DisplayName,
                x.PreferredLanguage,
                x.CreatedAtUtc,
                // user.HasRole(...) DEĞİL: metot çağrısı SQL'e çevrilemez ve sorgu
                // istemciye değerlendirmeye düşerdi. Contains, Npgsql'de
                // `roles @> ARRAY['Host']` oluyor.
                x.Roles.Contains(UserRole.Host)));
}
