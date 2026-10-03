using System.Text;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Shouldly;
using Expyra.Domain.Scheduling;
using Expyra.IntegrationTests.Common;
using Expyra.WebApi.Common;

namespace Expyra.IntegrationTests.Features.Errors;

/// <summary>
/// #44 — validator'dan kaçan bir veritabanı kısıtı SON ÇARE olarak 400/409'a
/// dönüşüyor, 500'e değil. Asıl savunma validator'da; bu testler yalnız eşlemenin
/// tek yerde (GlobalExceptionHandler) doğru çalıştığını ölçüyor.
///
/// <para>22001 ve 23514 GERÇEK veritabanından alınıyor: EF'in hatayı nasıl sardığı
/// bir sürüm yükseltmesinde değişirse burası kırılmalı, elle kurulmuş bir istisna
/// bunu yakalayamazdı.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ConstraintViolationMappingTests(ApiFactory factory)
{
    [Fact]
    public async Task CheckIhlali_23514_400()
    {
        // CHECK satır yazılırken, FK ise ifade sonunda denetleniyor: var olmayan bir
        // deneyim kimliği bu yüzden önce aralık kısıtına çarpıyor.
        var exception = await CaptureAsync(new AvailabilityBlackout
        {
            Id = Guid.CreateVersion7(),
            ExperienceId = Guid.CreateVersion7(),
            StartsOnLocal = new DateOnly(2030, 1, 10),
            EndsOnLocal = new DateOnly(2030, 1, 9),
        });

        exception.InnerException.ShouldBeOfType<PostgresException>()
            .SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);

        var (status, body) = await HandleAsync(exception);

        status.ShouldBe(StatusCodes.Status400BadRequest);
        body.ShouldNotContain("ck_availability_blackout_range");
    }

    [Fact]
    public async Task UzunlukIhlali_22001_400()
    {
        var exception = await CaptureAsync(new AvailabilityBlackout
        {
            Id = Guid.CreateVersion7(),
            ExperienceId = Guid.CreateVersion7(),
            StartsOnLocal = new DateOnly(2030, 1, 10),
            EndsOnLocal = new DateOnly(2030, 1, 10),
            Note = new string('n', AvailabilityBlackout.MaxNoteLength + 1),
        });

        exception.InnerException.ShouldBeOfType<PostgresException>()
            .SqlState.ShouldBe(PostgresErrorCodes.StringDataRightTruncation);

        var (status, body) = await HandleAsync(exception);

        status.ShouldBe(StatusCodes.Status400BadRequest);
        body.ShouldNotContain("availability_blackout");
    }

    [Fact]
    public async Task TekillikIhlali_23505_409()
    {
        var exception = new DbUpdateException(
            "wrapped",
            new PostgresException(
                "duplicate key value violates unique constraint",
                "ERROR",
                "ERROR",
                PostgresErrorCodes.UniqueViolation,
                constraintName: "ux_slot_experience_start"));

        var (status, body) = await HandleAsync(exception);

        status.ShouldBe(StatusCodes.Status409Conflict);
        body.ShouldNotContain("ux_slot_experience_start");
    }

    [Fact]
    public async Task EslenmeyenPostgresHatasi_HalaDa500()
    {
        // Yalnız üç SQLSTATE eşleniyor; örn. FK ihlali (23503) bir programlama hatası
        // ve 4xx'e gizlenmemeli.
        var exception = new DbUpdateException(
            "wrapped",
            new PostgresException("fk", "ERROR", "ERROR", PostgresErrorCodes.ForeignKeyViolation));

        var (status, _) = await HandleAsync(exception);

        status.ShouldBe(StatusCodes.Status500InternalServerError);
    }

    private async Task<DbUpdateException> CaptureAsync(AvailabilityBlackout row)
        => await Should.ThrowAsync<DbUpdateException>(() => factory.QueryAsync(async db =>
        {
            db.AvailabilityBlackouts.Add(row);
            await db.SaveChangesAsync();
            return true;
        }));

    private async Task<(int Status, string Body)> HandleAsync(Exception exception)
    {
        await using var scope = factory.Services.CreateAsyncScope();

        var handler = scope.ServiceProvider.GetServices<IExceptionHandler>()
            .OfType<GlobalExceptionHandler>()
            .Single();

        using var stream = new MemoryStream();

        var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        context.Request.Path = "/test";
        context.Request.Headers.Accept = "application/problem+json";
        context.Response.Body = stream;

        (await handler.TryHandleAsync(context, exception, CancellationToken.None)).ShouldBeTrue();

        return (context.Response.StatusCode, Encoding.UTF8.GetString(stream.ToArray()));
    }
}
