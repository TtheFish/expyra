using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;
using Tajriba.Application;
using Tajriba.Application.Common.Interfaces;
using Tajriba.Infrastructure;
using Tajriba.Infrastructure.Persistence;
using Tajriba.WebApi.Common;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) => config
    .ReadFrom.Configuration(context.Configuration)
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture));

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddOpenApi();

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

// CORS: origin'ler config'ten gelir. AllowAnyOrigin YASAK — kimlik doğrulamalı
// API'de credential taşıyan isteklerde güvenlik açığı yaratır.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddPolicy("default", policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => options.WithTitle("Tajriba API"));
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("default");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Migration'lar OTOMATİK uygulanmaz. `dotnet ef database update` ile elle çalıştırılır.
// Eski projede startup'ta DROP DATABASE vardı — bir daha asla.
if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
    if (pending.Count > 0)
    {
        app.Logger.LogWarning(
            "{Count} adet uygulanmamış migration var: {Migrations}. `dotnet ef database update` çalıştır.",
            pending.Count, string.Join(", ", pending));
    }
}

await app.RunAsync();

/// <summary>Integration testlerin WebApplicationFactory ile bağlanabilmesi için.</summary>
public partial class Program;
