using Microsoft.Extensions.Configuration;

namespace Expyra.Infrastructure.Email;

internal sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string FromAddress { get; set; } = "giris@expyra.com";

    public string FromName { get; set; } = "Expyra";

    /// <summary>
    /// Dev sink'inin yazdığı klasör. Göreli verilirse çalışma dizinine göre çözülür;
    /// hangi mutlak yola indiği ilk gönderimde loglanıyor — "mailim nerede" sorusunun
    /// cevabı tahmine bırakılmıyor.
    ///
    /// <para>Bu klasörde GERÇEK kodlar durur: <c>.gitignore</c>'da olmak zorunda,
    /// aksi halde gitleaks tüm geçmişi tarar ve history yeniden yazılana kadar CI kırık kalır.</para>
    /// </summary>
    public string DropDirectory { get; set; } = ".mail-drop";

    public static EmailOptions FromConfiguration(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var defaults = new EmailOptions();

        return new EmailOptions
        {
            FromAddress = Text(SectionName + ":FromAddress", defaults.FromAddress),
            FromName = Text(SectionName + ":FromName", defaults.FromName),
            DropDirectory = Text(SectionName + ":DropDirectory", defaults.DropDirectory),
        };

        string Text(string path, string fallback)
        {
            var raw = configuration[path];
            return string.IsNullOrWhiteSpace(raw) ? fallback : raw.Trim();
        }
    }

    public string ResolveDropDirectory() => Path.GetFullPath(DropDirectory);
}
