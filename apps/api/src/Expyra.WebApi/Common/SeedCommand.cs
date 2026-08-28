using Expyra.Infrastructure.Persistence;
using Expyra.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;

namespace Expyra.WebApi.Common;

/// <summary>
/// Referans veri seed'ini AYRI bir komut olarak çalıştırır:
/// <c>dotnet run --project apps/api/src/Expyra.WebApi -- seed reference-data</c>
/// (kısayol: <c>pnpm api:seed</c>).
///
/// <para><b>Neden açılışta değil</b> (CLAUDE.md #2): uygulama açılışında veri yazmak,
/// şema değiştirmekle aynı sınıfta bir hata. İki sunucu kopyası aynı anda açıldığında
/// yarışır; hata da açılış logunda kaybolur. Bu komut çalıştığında uygulama HTTP
/// dinlemeye hiç başlamaz — iş biter, süreç çıkış kodu döner.</para>
///
/// <para>Argümanlar <c>WebApplication.CreateBuilder(args)</c>'ın yapılandırma
/// sağlayıcısını bozmuyor: komut satırı sağlayıcısı <c>--anahtar=değer</c> biçiminde
/// olmayan argümanları yok sayıyor.</para>
/// </summary>
internal static class SeedCommand
{
    internal const string Verb = "seed";

    internal const string ReferenceDataTarget = "reference-data";

    /// <summary>Bilinmeyen hedef — kullanıcı hatası, veri durumu değişmedi.</summary>
    private const int ExitUnknownTarget = 2;

    /// <summary>Bekleyen migration var — seed edilecek tablo henüz yok.</summary>
    private const int ExitPendingMigrations = 3;

    internal static bool Matches(string[] args, out string target)
    {
        target = string.Empty;

        if (args.Length == 0 || !string.Equals(args[0], Verb, StringComparison.Ordinal))
        {
            return false;
        }

        target = args.Length > 1 ? args[1] : string.Empty;
        return true;
    }

    internal static async Task<int> RunAsync(WebApplication app, string target)
    {
        ArgumentNullException.ThrowIfNull(app);

        if (!string.Equals(target, ReferenceDataTarget, StringComparison.Ordinal))
        {
            app.Logger.LogError(
                "Bilinmeyen seed hedefi: '{Target}'. Kullanım: -- {Verb} {ValidTarget}",
                target, Verb, ReferenceDataTarget);

            return ExitUnknownTarget;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Şema DEĞİŞTİRİLMİYOR, yalnızca kontrol ediliyor. Bu kontrol olmasaydı hata
        // "relation country does not exist" olarak çıkardı ve nedenini söylemezdi.
        var pending = (await dbContext.Database.GetPendingMigrationsAsync().ConfigureAwait(false)).ToList();
        if (pending.Count > 0)
        {
            app.Logger.LogError(
                "{Count} adet uygulanmamış migration var: {Migrations}. Önce `pnpm api:migrate` çalıştır.",
                pending.Count, string.Join(", ", pending));

            return ExitPendingMigrations;
        }

        // Hata YUTULMUYOR (CLAUDE.md #1): bozuk seed verisinde seeder açıklayıcı bir
        // mesajla patlıyor ve süreç sıfırdan farklı bir kodla ölüyor. Sessizce
        // "0 satır yazıldı" demek, sorunun ancak arama boş dönünce fark edilmesi demek.
        var result = await ReferenceDataSeeder.SeedAsync(dbContext).ConfigureAwait(false);

        app.Logger.LogInformation(
            "Referans veri seed edildi — {Countries} ülke, {Cities} şehir, {Aliases} alias, " +
            "{Currencies} para birimi, {Categories} kategori, {Rates} kur satırı. " +
            "Değişen satır: {Changed} (ikinci koşuda 0 bekleniyor).",
            result.Countries,
            result.Cities,
            result.CityAliases,
            result.Currencies,
            result.Categories,
            result.ExchangeRates,
            result.ChangedRows);

        return 0;
    }
}
