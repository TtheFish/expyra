using System.Security.Claims;
using Expyra.Application.Common.Interfaces;

namespace Expyra.WebApi.Common;

internal sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid? UserId
    {
        get
        {
            var raw = httpContextAccessor.HttpContext?.User
                .FindFirstValue(ClaimTypes.NameIdentifier);

            return Guid.TryParse(raw, out var id) && id != Guid.Empty ? id : null;
        }
    }

    public bool IsAuthenticated =>
        httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAccessException("Token içinde geçerli kullanıcı kimliği yok.");
}
