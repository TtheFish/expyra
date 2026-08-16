using System.Net.Sockets;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Expyra.Application.Common.Interfaces;
using Expyra.Infrastructure.Persistence;

namespace Expyra.IntegrationTests.Common;

/// <summary>
/// Şemayı testler başlamadan önce MIGRATION ile kurar.
///
/// <para><c>EnsureCreated()</c> DEĞİL: migration geçmişini yazmaz, modelden doğrudan
/// şema üretir ve migration'larla sessizce ayrışır — "testte geçti, prodüksiyonda
/// tablo yok" tam olarak böyle doğar. Bu, CLAUDE.md #2'nin ihlali değil: yasak
/// UYGULAMA AÇILIŞINDA şema değiştirmek; test fixture'ı uygulama değil. Bu satırın
/// <c>Program.cs</c>'e sızmadığından emin ol.</para>
/// </summary>
public sealed class DatabaseFixture : IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        TestEnvironment.Ensure();

        await EnsureServerReachableAsync(TestEnvironment.ConnectionString).ConfigureAwait(false);

        await using var db = TestEnvironment.CreateDbContext();

        // Migration hataları SARILMADAN yukarı gider: "42P07 already exists" gibi bir
        // sorunun mesajını kendi metnimizle örtmek, hatayı bulunamaz hale getirir.
        await db.Database.MigrateAsync().ConfigureAwait(false);

        await EnsureIdentitySchemaAsync(db).ConfigureAwait(false);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>
    /// Postgres yoksa testler SESSİZCE YEŞİL GEÇMEZ (CLAUDE.md #1): fixture patlar ve
    /// koleksiyondaki her test bu mesajla kırmızı olur. Atlamak (skip) bilinçli olarak
    /// seçilmedi — "atlandı" satırı CI çıktısında kaybolur ve kimse kimlik akışının hiç
    /// test edilmediğini fark etmez.
    /// </summary>
    private static async Task EnsureServerReachableAsync(string connectionString)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            // Varsayılan 15 sn; yanlış host'ta her test koşusunun başında beklemek istemiyoruz.
            Timeout = 5,
        };

        await using var connection = new NpgsqlConnection(builder.ConnectionString);

        try
        {
            await connection.OpenAsync().ConfigureAwait(false);
        }
        catch (PostgresException postgres)
            when (string.Equals(postgres.SqlState, PostgresErrorCodes.InvalidCatalogName, StringComparison.Ordinal))
        {
            // Sunucuya ULAŞILDI, yalnızca hedef veritabanı yok — MigrateAsync onu oluşturur.
        }
        catch (Exception exception) when (exception is NpgsqlException or SocketException or TimeoutException)
        {
            throw new InvalidOperationException(
                $"Integration testler gerçek bir PostgreSQL istiyor; {builder.Host}:{builder.Port}/{builder.Database} " +
                "adresine bağlanılamadı. `pnpm db:up` çalıştır ya da bağlantı dizesini " +
                "EXPYRA_TEST_DB (veya ConnectionStrings__Default) ortam değişkeniyle ver. " +
                "Testler ATLANMIYOR: veritabanı yoksa bu paket kırmızı kalır.",
                exception);
        }
    }

    /// <summary>
    /// En olası ilk kırılmayı okunur bir mesaja çevirir: migration üretilmemişse
    /// <c>MigrateAsync</c> sorunsuz geçer (uygulanacak bir şey yoktur) ve hata ilk teste
    /// "relation login_code does not exist" olarak düşer.
    /// </summary>
    private static async Task EnsureIdentitySchemaAsync(AppDbContext db)
    {
        try
        {
            await db.LoginCodes.AsNoTracking().Take(1).ToListAsync().ConfigureAwait(false);
        }
        catch (PostgresException postgres)
            when (string.Equals(postgres.SqlState, PostgresErrorCodes.UndefinedTable, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "login_code tablosu yok: AddPasswordlessIdentity migration'ı henüz üretilmemiş. " +
                "`dotnet ef migrations add AddPasswordlessIdentity --project apps/api/src/Expyra.Infrastructure " +
                "--startup-project apps/api/src/Expyra.WebApi` çalıştır.",
                postgres);
        }
    }
}

/// <summary>
/// Tüm kimlik testleri TEK koleksiyonda: xUnit aynı koleksiyondaki sınıfları sırayla
/// koşturur. Paylaşılan <see cref="TestClock"/> ve orta katman hız sınırı sayacı ancak
/// bu sayede öngörülebilir.
/// </summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<DatabaseFixture>, ICollectionFixture<ApiFactory>
{
    public const string Name = "expyra-api";
}

/// <summary>
/// Test süreci için ortam değişkenlerini hazırlar.
///
/// <para><b>Neden ortam değişkeni, <c>ConfigureAppConfiguration</c> değil:</b> minimal
/// hosting'de <c>Program.cs</c> içindeki <c>AddInfrastructure(builder.Configuration)</c>
/// satırı <c>builder.Build()</c>'dan ÖNCE çalışır; WebApplicationFactory'nin yapılandırma
/// geri çağrıları ise ancak Build sırasında uygulanır. Sırları oraya koyarsak açılıştaki
/// fail-fast kontrolü tüm integration testleri daha ilk istekten önce öldürür.</para>
/// </summary>
internal static class TestEnvironment
{
    private const string DefaultConnectionString =
        "Host=localhost;Port=5432;Database=expyra_test;Username=postgres;Password=postgres";

    private static readonly Lock Gate = new();

    private static string? resolvedConnectionString;

    internal static string ConnectionString
    {
        get
        {
            Ensure();
            return resolvedConnectionString!;
        }
    }

    internal static void Ensure()
    {
        lock (Gate)
        {
            if (resolvedConnectionString is not null)
            {
                return;
            }

            // CI `ConnectionStrings__Default` veriyor; EXPYRA_TEST_DB yerel kutuda dev
            // veritabanını ezmeden ayrı bir hedef göstermek için önce okunuyor.
            var connectionString =
                Read("EXPYRA_TEST_DB")
                ?? Read("ConnectionStrings__Default")
                ?? DefaultConnectionString;

            Environment.SetEnvironmentVariable("ConnectionStrings__Default", connectionString);

            // appsettings.Development.json'daki localhost değerleri yüklensin; ayrıca
            // Development dışında Program.cs UseHttpsRedirection ekliyor.
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");

            // Sırlar ÇALIŞMA ANINDA üretiliyor: repoda sabit yüksek entropili bir string
            // bırakmak gitleaks'i tetikler ve `ci.yml` tüm geçmişi tarıyor.
            EnsureKey("Auth__Jwt__SigningKey");
            EnsureKey("Auth__Otp__HashKey");

            resolvedConnectionString = connectionString;
        }
    }

    internal static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        return new AppDbContext(options, SystemClock.Instance);
    }

    private static string? Read(string name)
        => Environment.GetEnvironmentVariable(name) is { Length: > 0 } value ? value : null;

    private static void EnsureKey(string name)
    {
        if (Read(name) is not null)
        {
            return;
        }

        Environment.SetEnvironmentVariable(
            name, Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
    }

    /// <summary>Fixture yalnızca migration uyguluyor; testlerin kaydırılabilir saati ApiFactory'de.</summary>
    private sealed class SystemClock : IDateTimeProvider
    {
        internal static readonly SystemClock Instance = new();

        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }
}
