using System.Security.Claims;
using Expyra.Application.Common.Interfaces;
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

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAccessException("Token içinde geçerli kullanıcı kimliği yok.");
}
