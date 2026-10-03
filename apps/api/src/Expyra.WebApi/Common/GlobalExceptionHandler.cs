using System.Globalization;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Expyra.Application.Common.Exceptions;

namespace Expyra.WebApi.Common;

/// <summary>
/// Tüm hatalar RFC 7807 ProblemDetails olarak döner.
/// KURAL: hatayı burada yut, handler'da yutma. `catch { return new List&lt;T&gt;(); }` YASAK —
/// eski projeyi çökerten şey buydu: bozuk sistem "veri yok" gibi görünüyordu.
/// </summary>
internal sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IProblemDetailsService problemDetailsService,
    IHostEnvironment environment) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problemDetails = Map(exception);

        var path = httpContext.Request.Path.Value;

        if (problemDetails.Status >= 500)
        {
            logger.LogError(exception, "İşlenmemiş hata: {Path}", path);
        }
        else if (ConstraintViolation(exception) is { } violation)
        {
            // 4xx ama Information DEĞİL: buraya düşmek, kolonu yazan komutun
            // validator'ında bir kuralın eksik olduğu ya da bir yarışın olduğu
            // anlamına geliyor (#44). Kısıt adı ve SQLSTATE yalnız logda.
            logger.LogWarning(exception,
                "Veritabanı kısıtı validator'dan kaçtı ({Status}) {Path}: {SqlState} {Constraint}",
                problemDetails.Status, path, violation.SqlState, violation.ConstraintName);
        }
        else if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("İş kuralı hatası ({Status}) {Path}: {Message}",
                problemDetails.Status, path, exception.Message);
        }

        httpContext.Response.StatusCode = problemDetails.Status ?? 500;

        // Map() içine yeni bir case gerekmiyor — TooManyRequestsException : AppException,
        // mevcut dal status'u zaten doğru üretiyor. Eksik olan tek şey başlık: Retry-After
        // olmadan istemci ne kadar bekleyeceğini bilemez ve hemen tekrar dener.
        if (exception is TooManyRequestsException tooMany)
        {
            httpContext.Response.Headers.RetryAfter =
                ((int)tooMany.RetryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = environment.IsDevelopment() ? exception : null,
            ProblemDetails = problemDetails,
        }).ConfigureAwait(false);
    }

    private static ProblemDetails Map(Exception exception) => exception switch
    {
        ValidationException validation => new ValidationProblemDetails(
            validation.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))
        {
            Status = 400,
            Title = "Girdi doğrulaması başarısız.",
        },

        AppException app => new ProblemDetails
        {
            Status = app.StatusCode,
            Title = app.Message,

            // Kod VARSA yanıta giriyor. Title Türkçe ve arayüz iki dilde: istemci
            // metne bakarak dal seçemez (bkz. AppException.Code).
            Extensions = app.Code is null
                ? new Dictionary<string, object?>(StringComparer.Ordinal)
                : new Dictionary<string, object?>(StringComparer.Ordinal) { ["code"] = app.Code },
        },

        // SON ÇARE. Asıl savunma validator'da; bu dallar yalnız bir kuralın eksik
        // kaldığı ya da validator'ın göremeyeceği bir yarışın (iki eşzamanlı istek
        // aynı tekil anahtarı yazıyor) olduğu durumlar için. Gövdede kısıt adı,
        // tablo ya da SQL YOK — şemayı dışarı sızdırmamak için.
        _ when ConstraintViolation(exception) is
            { SqlState: PostgresErrorCodes.StringDataRightTruncation or PostgresErrorCodes.CheckViolation }
            => new ProblemDetails
            {
                Status = 400,
                Title = "Gönderilen değer izin verilen sınırların dışında.",
            },

        _ when ConstraintViolation(exception) is { SqlState: PostgresErrorCodes.UniqueViolation }
            => new ProblemDetails
            {
                Status = 409,
                Title = "Bu kayıt başka bir istekle çakıştı; yenileyip tekrar deneyin.",
            },

        UnauthorizedAccessException => new ProblemDetails
        {
            Status = 401,
            Title = "Kimlik doğrulaması gerekli.",
        },

        OperationCanceledException => new ProblemDetails
        {
            Status = 499,
            Title = "İstek iptal edildi.",
        },

        // Beklenmeyen her şey 500. İçeriği DIŞARI SIZDIRMA.
        _ => new ProblemDetails
        {
            Status = 500,
            Title = "Beklenmeyen bir hata oluştu.",
        },
    };

    /// <summary>
    /// Eşlenen üç SQLSTATE'ten (22001, 23514, 23505) birini taşıyan Postgres hatası.
    /// EF onu <see cref="DbUpdateException"/> içine sarıyor; ham SQL / ExecuteUpdate
    /// yolu doğrudan atıyor — ikisi de aynı sonuca gitmeli.
    /// </summary>
    private static PostgresException? ConstraintViolation(Exception exception)
    {
        var postgres = exception switch
        {
            PostgresException direct => direct,
            DbUpdateException { InnerException: PostgresException inner } => inner,
            _ => null,
        };

        return postgres?.SqlState is PostgresErrorCodes.StringDataRightTruncation
            or PostgresErrorCodes.CheckViolation
            or PostgresErrorCodes.UniqueViolation
            ? postgres
            : null;
    }
}
