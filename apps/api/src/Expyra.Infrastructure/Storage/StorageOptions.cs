using Microsoft.Extensions.Configuration;

namespace Expyra.Infrastructure.Storage;

internal sealed class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>
    /// Dev sink'inin yazdığı klasör. <c>EmailOptions.DropDirectory</c> ile aynı
    /// mantık: göreli verilirse çalışma dizinine göre çözülür ve mutlak hâli
    /// açılışta loglanır.
    ///
    /// <para><c>.gitignore</c>'da olmak zorunda — burada kullanıcıların yüklediği
    /// gerçek fotoğraflar durur.</para>
    /// </summary>
    public string Directory { get; set; } = ".object-store";

    /// <summary>
    /// API'nin dışarıdan görünen kökü. Yükleme ve okuma adresleri buradan
    /// üretiliyor.
    ///
    /// <para><b>Neden isteğin kendi <c>Host</c> başlığından türetilmiyor:</b>
    /// imzalı adres, isteği yapan istemcinin gönderdiği başlığa bağlansaydı
    /// Host header injection ile başka bir alan adına imzalı bağlantı
    /// ürettirilebilirdi. Yapılandırmadan gelen sabit bir değer bunu imkânsız
    /// kılıyor.</para>
    /// </summary>
    public Uri PublicBaseUrl { get; set; } = new("http://localhost:5205");

    public static StorageOptions FromConfiguration(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var defaults = new StorageOptions();
        var rawBaseUrl = configuration[SectionName + ":PublicBaseUrl"];

        return new StorageOptions
        {
            Directory = Text(SectionName + ":Directory", defaults.Directory),
            PublicBaseUrl = string.IsNullOrWhiteSpace(rawBaseUrl)
                ? defaults.PublicBaseUrl
                // Geçersiz adres SESSİZCE varsayılana düşmüyor: yanlış yazılmış bir
                // ortam değişkeni, tüm görselleri localhost'a bakan adreslerle
                // servis etmeye yol açardı ve bu üretimde ancak kullanıcı şikayetiyle
                // fark edilirdi (CLAUDE.md #1).
                : new Uri(rawBaseUrl.Trim(), UriKind.Absolute),
        };

        string Text(string path, string fallback)
        {
            var raw = configuration[path];
            return string.IsNullOrWhiteSpace(raw) ? fallback : raw.Trim();
        }
    }

    public string ResolveDirectory() => Path.GetFullPath(Directory);
}
