using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Tajriba.Application.Common.Exceptions;

namespace Tajriba.WebApi.Common;

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
        else if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("İş kuralı hatası ({Status}) {Path}: {Message}",
                problemDetails.Status, path, exception.Message);
        }

        httpContext.Response.StatusCode = problemDetails.Status ?? 500;

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
}
