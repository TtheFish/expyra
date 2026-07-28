namespace Tajriba.Application.Common.Interfaces;

/// <summary>
/// Aktif isteğin kullanıcısı. Controller'dan handler'a UserId parametresi TAŞIMA —
/// command'ın içine kullanıcı id'si koymak, istemcinin başkası adına işlem yapmasına kapı açar.
/// </summary>
public interface ICurrentUser
{
    Guid? UserId { get; }

    bool IsAuthenticated { get; }

    /// <summary>Kimlik yoksa UnauthorizedAccessException fırlatır.</summary>
    Guid RequireUserId();
}
