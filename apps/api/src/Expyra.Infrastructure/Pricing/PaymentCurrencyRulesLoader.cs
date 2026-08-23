using System.Reflection;
using System.Text.Json;
using Expyra.Domain.Pricing;

namespace Expyra.Infrastructure.Pricing;

/// <summary>
/// <c>docs/payment-constraints.json</c>'ı gömülü kaynaktan okur.
///
/// <para><b>Neden veritabanına seed edilmiyor:</b> bu tablo sağlayıcının
/// dokümanından elle çıkarılmış bir sabit, kullanıcı verisi değil. Veritabanına
/// yazılsaydı iki kopya olurdu ve hangisinin güncel olduğu belirsizleşirdi —
/// <c>docs/languages.json</c>'ın gömülü kaynak olarak bağlanmasıyla aynı gerekçe.</para>
///
/// <para><b>Açılışta bir kez</b> okunuyor ve singleton olarak kayıtlı: dosya
/// değişmiyor ve her istekte JSON ayrıştırmak boşa iş.</para>
/// </summary>
internal static class PaymentCurrencyRulesLoader
{
    private const string ResourceName = "Expyra.Infrastructure.Seed.payment-constraints.json";

    internal static PaymentCurrencyRules Load()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException(
                $"Gömülü kaynak bulunamadı: {ResourceName}. csproj'daki EmbeddedResource kaydını kontrol et.");

        using var document = JsonDocument.Parse(stream);
        var root = document.RootElement;

        return new PaymentCurrencyRules(
            ReadInts(root, "amountExponentOverrides"),
            ReadLongs(root, "minimumChargeMinor"),
            ReadLongs(root, "maximumChargeMinor"),
            ReadDefaultMaximum(root));
    }

    private static long ReadDefaultMaximum(JsonElement root)
        => root.TryGetProperty("maximumChargeMinor", out var section)
            && section.TryGetProperty("default", out var value)
            ? value.GetInt64()
            // Varsayılan YOKSA patlıyor: sessizce sınırsız bir tavan, taşma
            // korkuluğunu tamamen kaldırmak olurdu.
            : throw new InvalidOperationException(
                "payment-constraints.json içinde maximumChargeMinor.default yok.");

    private static Dictionary<string, int> ReadInts(JsonElement root, string section)
    {
        var result = new Dictionary<string, int>(StringComparer.Ordinal);

        if (!root.TryGetProperty(section, out var element)) return result;

        foreach (var property in element.EnumerateObject())
        {
            // `note` alanları insan için; sayı olmayan her şey atlanıyor.
            if (property.Value.ValueKind == JsonValueKind.Number)
            {
                result[property.Name] = property.Value.GetInt32();
            }
        }

        return result;
    }

    private static Dictionary<string, long> ReadLongs(JsonElement root, string section)
    {
        var result = new Dictionary<string, long>(StringComparer.Ordinal);

        if (!root.TryGetProperty(section, out var element)) return result;

        foreach (var property in element.EnumerateObject())
        {
            // "default" bir para birimi kodu değil; ayrıca okunuyor.
            if (property.Value.ValueKind == JsonValueKind.Number
                && !string.Equals(property.Name, "default", StringComparison.Ordinal))
            {
                result[property.Name] = property.Value.GetInt64();
            }
        }

        return result;
    }
}
