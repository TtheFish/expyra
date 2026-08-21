using System.Reflection;
using System.Text.Json;

namespace Expyra.Infrastructure.Persistence.Seed;

/// <summary>
/// Gömülü seed dosyalarını okur. Kaynak dosyalar <c>docs/</c> altında yaşıyor ve
/// csproj'da <c>EmbeddedResource</c> olarak bağlandı — <b>kopyalanmadı</b>. Tek doğruluk
/// kaynağı dokümanın yanında durur; kod onu okur (<see cref="LanguageSeedData"/> ile
/// aynı karar).
/// </summary>
internal static class SeedResource
{
    /// <summary>Gömülü kaynak adlarının ortak öneki; csproj'daki <c>LogicalName</c> ile aynı.</summary>
    internal const string Prefix = "Expyra.Infrastructure.Seed.";

    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    /// <summary>
    /// Kaynağı okur ve çözer. Hata YUTULMAZ (CLAUDE.md #1): eksik dosya ya da bozuk JSON
    /// burada patlar — sessizce boş liste dönmek, seed'i "başarıyla hiçbir şey yazmadan"
    /// bitirir ve sorun ancak arama boş dönünce fark edilir.
    /// </summary>
    internal static T Load<T>(string fileName)
    {
        var resourceName = Prefix + fileName;
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Gömülü kaynak bulunamadı: {resourceName}. csproj'daki EmbeddedResource girdisini kontrol et.");

        return JsonSerializer.Deserialize<T>(stream, Options)
            ?? throw new InvalidOperationException($"{resourceName} boş veya okunamadı.");
    }
}
