using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;
using Expyra.Application;
using Expyra.Application.Common.Interfaces;
using Expyra.Infrastructure;
using Expyra.Infrastructure.Persistence;
using Expyra.WebApi.Common;

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

// Sahte gönderici SADECE arayüzün arkasında ve SADECE Development'ta yaşar; gerçek
// kayıt varsayılan, bu satır üzerine yazıyor. Config bayrağı (Email:Provider=filesystem)
// tercih EDİLMEDİ: yanlış bir ortam değişkeniyle üretime sızabilir ve OTP'ler diske düşer.
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDevelopmentEmailSender();
}

builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddClientContext();

builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddApiRateLimiter();

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

// Gövdesiz 4xx/5xx yanıtlara ProblemDetails gövdesi yazar. Bunsuz [Authorize]
// başarısızlığı BOŞ GÖVDELİ 401 döner: istemci "ağ hatası mı, oturum mu bitti"
// ayrımını yapamaz. Exception yolu GlobalExceptionHandler'da, bu onun tamamlayıcısı.
app.UseStatusCodePages();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => options.WithTitle("Expyra API"));
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("default");

// CORS'tan SONRA: 429 yanıtının da CORS başlıklarını taşıması gerekiyor, aksi halde
// tarayıcı hız sınırını "ağ hatası" olarak gösterir. Preflight'ı UseCors zaten kısa
// devre yaptığı için OPTIONS istekleri kotayı yemiyor.
// Kimlik doğrulamadan ÖNCE: seli token doğrulamaya ulaşmadan kesiyoruz.
app.UseRateLimiter();

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
