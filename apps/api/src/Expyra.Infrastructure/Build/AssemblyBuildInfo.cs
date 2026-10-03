using System.Reflection;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Build;

/// <summary>
/// Sürüm bilgisini derleme sırasında gömülen öznitelikten okur — çalışma anında
/// ortam değişkeninden DEĞİL. Ortam değişkeni ikiliden bağımsız değiştirilebilir;
/// öznitelik ise ikilinin kendisi, yalan söyleyemez.
///
/// <para><c>SourceRevisionId</c> ve <c>ExpyraBuildTimeUtc</c> MSBuild'e global
/// özellik olarak verildiği için çözümdeki her derleme aynı değeri taşıyor;
/// hangisinden okunduğu fark etmiyor.</para>
/// </summary>
internal sealed class AssemblyBuildInfo : IBuildInfo
{
    /// <summary>Directory.Build.props'taki <c>AssemblyMetadata</c> anahtarıyla aynı olmalı.</summary>
    private const string BuildTimeKey = "ExpyraBuildTimeUtc";

    public AssemblyBuildInfo()
    {
        var assembly = typeof(AssemblyBuildInfo).Assembly;

        var informational = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
            .InformationalVersion;

        var builtAt = assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(x => x.Key == BuildTimeKey)?
            .Value;

        Current = BuildInfo.Parse(informational, builtAt);
    }

    public BuildInfo Current { get; }
}
