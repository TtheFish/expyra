using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;
using Expyra.Application;
using Expyra.Application.Common.Interfaces;
using Expyra.Infrastructure;
using Expyra.Infrastructure.Persistence;
using Expyra.WebApi.Common;
using Expyra.WebApi.Features.Dev;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) => config
    .ReadFrom.Configuration(context.Configuration)
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture));

// Enum'lar tel üzerinde İSİMLE taşınıyor, sayıyla değil.
//
// Gerekçe DayOfWeek'te en görünür: .NET'te Pazar = 0 ama ISO 8601'de Pazartesi = 1.
// Sayı kabul edilseydi istemcinin hangi sözleşmeyi varsaydığı görünmez bir hata
// kaynağı olurdu ve "salı" isteyen bir host "çarşamba" alırdı. Aynısı GuestType
// için de geçerli: sıralama değişirse eski istemciler başka bir kademe okurdu.
//
// camelCase, yanıtların elle ürettiği metinlerle (ScheduleFormat.Day → "tuesday")
// aynı hizada olsun diye: aynı sözleşmede iki farklı büyük/küçük harf düzeni,
// istemcide iki farklı eşleme tablosu demekti.
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(
        new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
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

    // Nesne deposu da aynı kapının arkasında: gerçek depo (S3/R2) hesap açılana kadar
    // yok, o gelene kadar dosyalar diske düşüyor.
    builder.Services.AddDevelopmentObjectStorage();
}

builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddClientContext();

builder.Services.AddJwtAuthentication(builder.Configuration);

// Çıplak AddAuthorization() DEĞİL: "Host" policy'si burada kayıtlı olmadan
// [Authorize(Policy = "Host")] taşıyan uç çalışma anında 500 verir.
builder.Services.AddExpyraAuthorization();
builder.Services.AddApiRateLimiter(builder.Configuration);

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

// `dotnet run --project apps/api/src/Expyra.WebApi -- seed reference-data`
//
// Seed AYRI bir komut, açılışın parçası DEĞİL (CLAUDE.md #2): açılışta veri yazmak,
// şema değiştirmekle aynı sınıfta bir hata — iki kopya aynı anda kalkınca yarışır.
// Bu dal çalıştığında uygulama HTTP dinlemeye hiç başlamıyor; iş bitince çıkış kodu
// dönüyor ve normal açılış yolu hiç değişmiyor.
if (SeedCommand.Matches(args, out var seedTarget))
{
    var seedExitCode = await SeedCommand.RunAsync(app, seedTarget);

    // Açıkça dispose: log sağlayıcıları boşaltılsın ve veritabanı bağlantı havuzu
    // kapansın. Süreç zaten ölecek ama "çıktı kayboldu" ile "iş yapılmadı" arasındaki
    // farkı görmek isteyen tek şey bu satır.
    await app.DisposeAsync();

    return seedExitCode;
}

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

// Dev deposunun yükleme ve servis uçları. Üretimde HİÇ kurulmuyorlar — tarayıcı
// doğrudan S3'e yükleyecek, dosyaları CDN servis edecek.
if (app.Environment.IsDevelopment())
{
    app.MapDevelopmentObjectStorage();

    // Giriş kodlarını okunur kılan dev ucu. Üretimde hiç kurulmuyor.
    app.MapDevelopmentMailbox();
}

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

// Seed komutu `return seedExitCode` yazdığı andan itibaren giriş noktası int döndürüyor;
// normal sunucu yolu da açık bir çıkış kodu vermek zorunda (CS0161).
return 0;

/// <summary>Integration testlerin WebApplicationFactory ile bağlanabilmesi için.</summary>
public partial class Program;
