namespace Expyra.Application.Common.Exceptions;

/// <summary>
/// Uygulamanın bilinçli olarak fırlattığı hatalar. WebApi katmanı bunları
/// HTTP status koduna çevirir. Beklenmeyen hatalar bu tipten TÜREMEZ — onlar 500 olur.
/// </summary>
public abstract class AppException(string message) : Exception(message)
{
    public abstract int StatusCode { get; }

    /// <summary>
    /// Makine-okunur sebep kodu (`media-too-small`, `media-content-type-mismatch`).
    /// <c>null</c> ise yanıtta hiç görünmüyor.
    ///
    /// <para><b>Neden mesaj yetmiyor:</b> <see cref="Exception.Message"/> TÜRKÇE ve
    /// arayüz iki dilde. İstemci mesajı ekrana bassaydı İngilizce arayüzde Türkçe
    /// cümle çıkardı; mesaja bakıp dal seçseydi cümle düzeltildiği gün sessizce
    /// kırılırdı. Kod, cümleden bağımsız ve çevrilebilir bir tutamak — aynı ayrım
    /// <c>ExperiencePublishRequirement</c>'ta da var: sunucu kod verir, metni
    /// arayüz sözlüğü yazar (docs/I18N.md §1).</para>
    /// </summary>
    public string? Code { get; init; }
}

/// <summary>404 — kayıt yok.</summary>
public sealed class NotFoundException(string message = "Kayıt bulunamadı.") : AppException(message)
{
    public override int StatusCode => StatusCodes.NotFound;
}

/// <summary>
/// 409 — iş kuralı çakışması (kapasite dolu, e-posta kayıtlı vb.).
///
/// <para>Arayüzün ayırt etmesi gereken çakışmalarda <see cref="AppException.Code"/>
/// da verilir; tek bir "çakışma oldu" cümlesi host'a neyi düzelteceğini söylemez.</para>
/// </summary>
public sealed class ConflictException : AppException
{
    // Birincil kurucu DEĞİL: `Code` taban sınıfın init-only property'si ve onu
    // gölgeleyen bir `new string? Code` yazılsaydı, handler taban tip üzerinden
    // okuduğu için daima null görürdü — kod sessizce yanıta hiç girmezdi.
    public ConflictException(string message, string? code = null)
        : base(message) => Code = code;

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
/// 401 — oturum yok ya da artık geçerli değil (yenileme token'ı ölü, kullanıcı satırı silinmiş).
///
/// <para>Neden UnauthorizedAccessException değil: GlobalExceptionHandler onu sabit bir
/// başlıkla ("Kimlik doğrulaması gerekli.") çeviriyor ve mesaj kayboluyor. Yenileme
/// ucunun "Oturum geçersiz." demesi gerekiyor; AppException dalı mesajı zaten taşıyor.
/// UnauthorizedAccessException bu repoda "istekte hiç kimlik yok" anlamında kalır.</para>
/// </summary>
public sealed class UnauthorizedException(string message = "Oturum geçersiz.") : AppException(message)
{
    public override int StatusCode => StatusCodes.Unauthorized;
}

/// <summary>
/// 429 — hız sınırı. Şifresiz sistemde hız sınırı bir sertleştirme değil, kimlik
/// doğrulama mekanizmasının kendisidir.
///
/// <para><see cref="RetryAfter"/> TimeSpan olarak taşınır; saniyeye çevirme ve
/// Retry-After başlığını yazma işi GlobalExceptionHandler'ın — Application katmanı
/// HTTP başlığı bilmez.</para>
/// </summary>
public sealed class TooManyRequestsException(string message, TimeSpan retryAfter) : AppException(message)
{
    public TimeSpan RetryAfter { get; } = retryAfter;

    public override int StatusCode => StatusCodes.TooManyRequests;
}

/// <summary>
/// Application katmanı ASP.NET'e bağımlı olmadığı için status kodları burada sabit.
/// </summary>
internal static class StatusCodes
{
    internal const int BadRequest = 400;
    internal const int Unauthorized = 401;
    internal const int Forbidden = 403;
    internal const int NotFound = 404;
    internal const int Conflict = 409;
    internal const int TooManyRequests = 429;
}
