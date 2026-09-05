using System.Reflection;
using Expyra.Domain.Media;

namespace Expyra.Infrastructure.Persistence.Seed;

/// <summary>
/// Demo ilan görselleri. Gömülü JPEG — ağ yok, seed her koşuda aynı baytı yazar.
/// Kaynak listesi: <c>DemoPhotos/SOURCES.md</c>.
/// </summary>
internal static class DemoPhoto
{
    private const string Prefix = "Expyra.Infrastructure.Seed.DemoPhotos.";

    internal static (byte[] Bytes, ImageInfo Info) Load(string fileName)
    {
        var resourceName = Prefix + fileName;
        var assembly = Assembly.GetExecutingAssembly();

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Gömülü demo görsel bulunamadı: {resourceName}. csproj EmbeddedResource girdisini kontrol et.");

        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        var bytes = buffer.ToArray();

        if (!ImageProbe.TryRead(bytes, out var info))
        {
            throw new InvalidOperationException($"{resourceName} geçerli bir görsel değil.");
        }

        if (!MediaRules.IsAcceptableSize(info))
        {
            throw new InvalidOperationException(
                $"{resourceName} çok küçük: {info.Width}×{info.Height}, " +
                $"en az {MediaRules.MinWidth}×{MediaRules.MinHeight} gerekir.");
        }

        return (bytes, info);
    }
}
