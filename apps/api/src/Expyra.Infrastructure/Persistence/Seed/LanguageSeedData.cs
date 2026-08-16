using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Expyra.Domain.Languages;

namespace Expyra.Infrastructure.Persistence.Seed;

/// <summary>
/// Dil kayıt defterinin başlangıç verisi. Kaynak: <c>docs/languages.json</c> —
/// csproj'da gömülü kaynak olarak bağlandı, kopyalanmadı. Tek doğruluk kaynağı
/// dokümanın yanında durur; kod onu okur.
///
/// <para>
/// Veri <c>HasData</c> ile migration'a gömülür — startup'ta seed ÇALIŞMAZ.
/// Uygulama açılışında veri yazmak, "startup'ta şema/veri değiştirme yasağı"nın
/// (CLAUDE.md §2) aynı kapıya çıkan hâli: iki sunucu aynı anda açıldığında yarışır.
/// </para>
/// </summary>
internal static class LanguageSeedData
{
    private const string ResourceName = "Expyra.Infrastructure.Seed.languages.json";

    private static readonly Lazy<IReadOnlyList<Language>> Cache = new(Load, isThreadSafe: true);

    public static IReadOnlyList<Language> Rows() => Cache.Value;

    private static List<Language> Load()
    {
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException(
                $"Gömülü kaynak bulunamadı: {ResourceName}. csproj'daki EmbeddedResource girdisini kontrol et.");

        var file = JsonSerializer.Deserialize<SeedFile>(stream, SerializerOptions)
            ?? throw new InvalidOperationException($"{ResourceName} boş veya okunamadı.");

        if (file.Languages.Count == 0)
        {
            throw new InvalidOperationException($"{ResourceName} içinde hiç dil yok.");
        }

        var languages = new List<Language>(file.Languages.Count);
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var row in file.Languages)
        {
            // Bozuk seed verisi sessizce geçmez — migration üretimi burada patlar.
            // Yanlış normalize edilmiş tek bir kod, fallback zincirini sessizce kırar.
            var code = LanguageCode.Normalize(row.Code);

            if (!seen.Add(code))
            {
                throw new InvalidOperationException($"languages.json içinde tekrar eden dil kodu: '{code}'.");
            }

            languages.Add(new Language
            {
                Code = code,
                NativeName = row.NativeName,
                EnglishName = row.EnglishName,
                SearchConfig = string.IsNullOrWhiteSpace(row.SearchConfig) ? null : row.SearchConfig,
                IsRightToLeft = row.Rtl,
                UiAvailable = row.UiAvailable,
                ContentAllowed = true,
            });
        }

        return languages;
    }

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    private sealed record SeedFile(
        [property: JsonPropertyName("languages")] IReadOnlyList<SeedRow> Languages);

    private sealed record SeedRow(
        string Code,
        string NativeName,
        string EnglishName,
        string? SearchConfig,
        bool UiAvailable,
        bool Rtl);
}
