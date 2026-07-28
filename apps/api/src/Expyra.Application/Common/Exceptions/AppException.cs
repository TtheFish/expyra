namespace Expyra.Application.Common.Exceptions;

/// <summary>
/// Uygulamanın bilinçli olarak fırlattığı hatalar. WebApi katmanı bunları
/// HTTP status koduna çevirir. Beklenmeyen hatalar bu tipten TÜREMEZ — onlar 500 olur.
/// </summary>
public abstract class AppException(string message) : Exception(message)
{
    public abstract int StatusCode { get; }
}

/// <summary>404 — kayıt yok.</summary>
public sealed class NotFoundException(string message = "Kayıt bulunamadı.") : AppException(message)
{
    public override int StatusCode => StatusCodes.NotFound;
}

/// <summary>409 — iş kuralı çakışması (kapasite dolu, e-posta kayıtlı vb.).</summary>
public sealed class ConflictException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.Conflict;
}

/// <summary>403 — kimlik doğru ama yetki yok.</summary>
public sealed class ForbiddenException(string message = "Bu işlem için yetkiniz yok.") : AppException(message)
{
    public override int StatusCode => StatusCodes.Forbidden;
}

/// <summary>400 — girdi geçersiz. Alan bazlı hatalar için ValidationException kullanılır.</summary>
public sealed class BadRequestException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.BadRequest;
}

/// <summary>
/// Application katmanı ASP.NET'e bağımlı olmadığı için status kodları burada sabit.
/// </summary>
internal static class StatusCodes
{
    internal const int BadRequest = 400;
    internal const int Forbidden = 403;
    internal const int NotFound = 404;
    internal const int Conflict = 409;
}
