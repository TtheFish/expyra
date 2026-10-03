using System.Globalization;

namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Çalışan ikilinin hangi commit'ten derlendiği (issue #46, vibe-check OPS-015).
///
/// <para>Deploy sonrası tek soru şu: "canlıda koşan, push ettiğim commit mi?"
/// <c>/api/health</c> bunu <see cref="Commit"/> ile yanıtlıyor; doğrulama adımı
/// docs/DEPLOY.md'de.</para>
/// </summary>
public interface IBuildInfo
{
    BuildInfo Current { get; }
}

/// <param name="Version">Ürün sürümü, <c>+sha</c> eki olmadan (ör. <c>1.0.0</c>).</param>
/// <param name="Commit">Tam git SHA'sı; derlemede verilmediyse <see cref="BuildInfo.UnknownCommit"/>.</param>
/// <param name="BuiltAtUtc">Derleme zamanı; yalnız CI veriyor, yerelde <c>null</c>.</param>
public sealed record BuildInfo(string Version, string Commit, DateTimeOffset? BuiltAtUtc)
{
    /// <summary>
    /// Commit bilinmiyor. Boş dizge yerine okunur bir değer: canlıda bunu görmek
    /// "derleme SHA'sız yapılmış" demek ve deploy doğrulaması bunu YAKALAMALI.
    /// </summary>
    public const string UnknownCommit = "dev";

    /// <summary>
    /// <c>AssemblyInformationalVersion</c> değerini ayrıştırır.
    ///
    /// <para>.NET SDK, <c>SourceRevisionId</c> verildiğinde sürüme <c>+&lt;sha&gt;</c>
    /// ekliyor (<c>1.0.0+3f2a…</c>). CI bunu <c>-p:SourceRevisionId=$GITHUB_SHA</c> ile
    /// açıkça veriyor; yerel derlemede verilmiyor, ek hiç gelmiyor ve commit
    /// <see cref="UnknownCommit"/> oluyor.</para>
    /// </summary>
    public static BuildInfo Parse(string? informationalVersion, string? builtAtUtc)
    {
        var raw = informationalVersion?.Trim() ?? string.Empty;
        var plus = raw.IndexOf('+', StringComparison.Ordinal);

        var version = plus >= 0 ? raw[..plus] : raw;
        var commit = plus >= 0 ? raw[(plus + 1)..] : string.Empty;

        DateTimeOffset? builtAt = DateTimeOffset.TryParse(
            builtAtUtc,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsed)
            ? parsed
            : null;

        return new BuildInfo(
            Version: version.Length > 0 ? version : "0.0.0",
            Commit: commit.Length > 0 ? commit : UnknownCommit,
            BuiltAtUtc: builtAt);
    }
}
