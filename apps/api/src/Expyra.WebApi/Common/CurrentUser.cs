using System.Security.Claims;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Users;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Expyra.WebApi.Common;

internal sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid? UserId
    {
        get
        {
            // 'sub' — ClaimTypes.NameIdentifier DEĞİL. JwtBearer'da MapInboundClaims = false
            // olduğu için 'sub' eski WS-Federation URI'sine çevrilmiyor. İki claim'i birden
            // deneyen "hoşgörülü" bir sürüm BİLEREK yazılmadı: eşleme bir gün değişirse
            // hatayı 401 olarak görmek, yanlış claim'den sessizce null almaktan iyidir.
            var raw = httpContextAccessor.HttpContext?.User
                .FindFirstValue(JwtRegisteredClaimNames.Sub);

            return Guid.TryParse(raw, out var id) && id != Guid.Empty ? id : null;
        }
    }

    public bool IsAuthenticated =>
        httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    /// <summary>
    /// 'role' claim'i doğrudan okunuyor — <c>IsInRole</c> DEĞİL. IsInRole,
    /// <c>TokenValidationParameters.RoleClaimType</c> ayarına bakar; o ayar bir gün
    /// kayarsa host olan kullanıcı sessizce 403 almaya başlar ve nedeni hiçbir yerde
    /// görünmez. UserId'deki 'sub' kararının aynısı: hoşgörülü değil, açık.
    /// </summary>
    public bool IsHost => HasRole(UserRole.Host);

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAccessException("Token içinde geçerli kullanıcı kimliği yok.");

    public Guid RequireHostId()
    {
        // Sıra ÖNEMLİ: önce kimlik (401), sonra yetki (403). Ters sırada token'sız istek
        // "yetkiniz yok" derdi ve istemci yeniden giriş yapması gerektiğini anlamazdı.
        var userId = RequireUserId();

        return IsHost
            ? userId
            : throw new ForbiddenException("Bu işlem host hesabı gerektiriyor.");
    }

    private bool HasRole(string role)
        => httpContextAccessor.HttpContext?.User.HasClaim(AuthClaimNames.Role, role) ?? false;
}
