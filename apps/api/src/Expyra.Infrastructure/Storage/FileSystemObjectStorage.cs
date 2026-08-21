using System.Buffers;
using System.Buffers.Text;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Storage;

/// <summary>
/// Faz 1'in TEK deposu: nesneleri diske yazar, imzalı adresleri kendi ucuna
/// gönderir. <c>FileSystemEmailSender</c> ile aynı kalıp — sahte sağlayıcı yalnız
/// arayüzün arkasında yaşıyor ve kaydı <c>IsDevelopment()</c> kapısından geçiyor.
///
/// <para><b>Neden gerçek imza mantığı kuruldu da "dev'de doğrulama yok" denmedi:</b>
/// S3'e geçişte değişen tek şey bu sınıf olmalı. Dev'de imzasız çalışılsaydı web
/// tarafı "adresi al, PUT et" akışını hiç öğrenmez, imzalı yükleme ilk kez üretimde
/// denenirdi.</para>
/// </summary>
internal sealed class FileSystemObjectStorage : IObjectStorage, ILocalUploadSink
{
    /// <summary>
    /// İmza anahtarı SÜREÇ BAŞINA rastgele. Yapılandırmadan okunmuyor çünkü bu bir
    /// dev sink'i: saklanacak bir sır olmaması, sızacak bir sır olmaması demek
    /// (CLAUDE.md #4). Bedeli, API yeniden başlayınca dolaşımdaki adreslerin
    /// geçersizleşmesi — 15 dakikalık ömürleri olan adresler için önemsiz.
    ///
    /// <para>Bu yaklaşım tek kopya varsayıyor. Üretimde çok kopya olacak ama orada
    /// imzayı zaten S3 üretecek.</para>
    /// </summary>
    private readonly byte[] signingKey = RandomNumberGenerator.GetBytes(32);

    private readonly StorageOptions options;
    private readonly IDateTimeProvider dateTimeProvider;
    private readonly ILogger<FileSystemObjectStorage> logger;

    public FileSystemObjectStorage(
        StorageOptions options,
        IDateTimeProvider dateTimeProvider,
        ILogger<FileSystemObjectStorage> logger)
    {
        this.options = options;
        this.dateTimeProvider = dateTimeProvider;
        this.logger = logger;

        var root = options.ResolveDirectory();
        Directory.CreateDirectory(root);

        // Hangi mutlak yola indiği bir kez loglanıyor: "yüklediğim dosya nerede"
        // sorusunun cevabı çalışma dizini tahminine bırakılmıyor.
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("storage.filesystem.root path={Path}", root);
        }
    }

    public Task<PresignedUpload> CreateUploadAsync(
        PresignedUploadRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        EnsureSafeKey(request.Key);

        var expiresAt = dateTimeProvider.UtcNow.Add(request.Lifetime);
        var token = CreateToken(request, expiresAt);

        var url = new Uri(
            options.PublicBaseUrl,
            string.Create(CultureInfo.InvariantCulture, $"/api/dev/uploads?token={token}"));

        return Task.FromResult(new PresignedUpload(
            request.Key,
            url,
            "PUT",
            // İçerik tipi imzaya girdiği için istemci onu AYNEN göndermek zorunda.
            // S3'ün presigned PUT davranışı da böyle; web tarafı aynı kodu kullanacak.
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Content-Type"] = request.ContentType,
            },
            expiresAt));
    }

    public Task<StoredObject?> HeadAsync(string key, CancellationToken cancellationToken)
    {
        EnsureSafeKey(key);

        var info = new FileInfo(PathFor(key));

        // Yok = null. İstisna değil: yüklemesini bitirmemiş host bir hata değil.
        return Task.FromResult<StoredObject?>(
            info.Exists ? new StoredObject(key, ContentTypeOf(key), info.Length) : null);
    }

    public Task<Stream?> OpenReadAsync(string key, int? maxBytes, CancellationToken cancellationToken)
    {
        EnsureSafeKey(key);

        var path = PathFor(key);

        if (!File.Exists(path))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 64 * 1024,
            useAsync: true);

        // Sınır varsa akış SARILIYOR, dosyanın tamamı okunup kesilmiyor: çağıranın
        // yanlışlıkla sonuna kadar okuması hâlinde bile diskten inen bayt sınırlı.
        if (maxBytes is { } limit)
        {
            stream = new LimitedStream(stream, limit);
        }

        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        EnsureSafeKey(key);

        // File.Delete yoksa sessiz. Silme tekrarlanabilir olmalı: satır silindi ama
        // nesne silinemeden süreç öldüyse ikinci deneme patlamamalı.
        File.Delete(PathFor(key));

        return Task.CompletedTask;
    }

    public Uri PublicUrl(string key)
    {
        EnsureSafeKey(key);

        return new Uri(
            options.PublicBaseUrl,
            string.Create(CultureInfo.InvariantCulture, $"/api/dev/objects/{key}"));
    }

    public async Task<LocalUploadResult> AcceptAsync(
        string? token,
        string? contentType,
        Stream body,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(body);

        if (!TryValidateToken(token, out var payload))
        {
            return LocalUploadResult.InvalidSignature;
        }

        if (payload.ExpiresAtUtc <= dateTimeProvider.UtcNow)
        {
            return LocalUploadResult.Expired;
        }

        // İmzalanan tip ile gönderilen tip ayrışırsa reddediliyor: depoda yazan
        // content-type'ın gerçekten imzalanmış olan olması gerekiyor, aksi halde
        // istemci imzayı alıp başka bir tiple yükleyebilirdi.
        if (!string.Equals(contentType, payload.ContentType, StringComparison.OrdinalIgnoreCase))
        {
            return LocalUploadResult.ContentTypeMismatch;
        }

        var path = PathFor(payload.Key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        // Önce geçici dosyaya yazılıyor: tavan aşılırsa ya da bağlantı koparsa
        // hedef anahtarda YARIM bir nesne kalmıyor. HEAD'in gördüğü her nesne tam.
        var temporaryPath = path + ".part";

        try
        {
            var written = await WriteLimitedAsync(body, temporaryPath, payload.MaxByteSize, cancellationToken)
                .ConfigureAwait(false);

            if (written is null)
            {
                File.Delete(temporaryPath);
                return LocalUploadResult.TooLarge;
            }

            File.Move(temporaryPath, path, overwrite: true);
        }
        catch
        {
            // İstisna YUTULMUYOR (CLAUDE.md #1) — yalnız geçici dosya temizlenip
            // yeniden fırlatılıyor.
            File.Delete(temporaryPath);
            throw;
        }

        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("storage.filesystem.uploaded key={Key}", payload.Key);
        }

        return LocalUploadResult.Accepted;
    }

    /// <summary>
    /// Gövdeyi tavana kadar yazar. Tavan aşılırsa <c>null</c> döner — akışın kalanı
    /// OKUNMUYOR: sınırı aşan istemciye diski yazdırmaya devam etmenin anlamı yok.
    /// </summary>
    private static async Task<long?> WriteLimitedAsync(
        Stream body,
        string path,
        long maxByteSize,
        CancellationToken cancellationToken)
    {
        var buffer = ArrayPool<byte>.Shared.Rent(64 * 1024);

        try
        {
            await using var file = new FileStream(
                path,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 64 * 1024,
                useAsync: true);

            long total = 0;

            while (true)
            {
                var read = await body.ReadAsync(buffer, cancellationToken).ConfigureAwait(false);

                if (read == 0)
                {
                    return total;
                }

                total += read;

                if (total > maxByteSize)
                {
                    return null;
                }

                await file.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    private string CreateToken(PresignedUploadRequest request, DateTimeOffset expiresAt)
    {
        var payload = string.Create(
            CultureInfo.InvariantCulture,
            $"{request.Key}\n{request.ContentType}\n{request.MaxByteSize}\n{expiresAt.ToUnixTimeSeconds()}");

        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = HMACSHA256.HashData(signingKey, payloadBytes);

        return string.Concat(Base64Url.EncodeToString(payloadBytes), ".", Base64Url.EncodeToString(signature));
    }

    private bool TryValidateToken(string? token, out UploadToken payload)
    {
        payload = default;

        if (string.IsNullOrEmpty(token))
        {
            return false;
        }

        var separator = token.IndexOf('.', StringComparison.Ordinal);

        if (separator <= 0 || separator == token.Length - 1)
        {
            return false;
        }

        byte[] payloadBytes;
        byte[] signatureBytes;

        try
        {
            // "Try" adına rağmen bozuk girdide istisna atabiliyor (Blok 5'te aynı
            // tuzak cursor çözümlemesinde 500 üretmişti).
            payloadBytes = Base64Url.DecodeFromChars(token.AsSpan(0, separator));
            signatureBytes = Base64Url.DecodeFromChars(token.AsSpan(separator + 1));
        }
        catch (FormatException)
        {
            return false;
        }

        var expected = HMACSHA256.HashData(signingKey, payloadBytes);

        // Sabit zamanlı karşılaştırma: baytları tek tek kıyaslayan bir kontrol,
        // doğru imzanın kaç baytının tuttuğunu süreden sızdırır.
        if (!CryptographicOperations.FixedTimeEquals(expected, signatureBytes))
        {
            return false;
        }

        var parts = Encoding.UTF8.GetString(payloadBytes).Split('\n');

        if (parts.Length != 4
            || !long.TryParse(parts[2], CultureInfo.InvariantCulture, out var maxByteSize)
            || !long.TryParse(parts[3], CultureInfo.InvariantCulture, out var expiresUnix))
        {
            return false;
        }

        // İmza tuttuğu hâlde anahtar yine de doğrulanıyor: imzalama tarafı
        // bir gün hatalı bir anahtar üretirse, yol gezinme buradan geçmemeli.
        if (!IsSafeKey(parts[0]))
        {
            return false;
        }

        payload = new UploadToken(
            parts[0],
            parts[1],
            maxByteSize,
            DateTimeOffset.FromUnixTimeSeconds(expiresUnix));

        return true;
    }

    private string PathFor(string key)
        => Path.Combine(options.ResolveDirectory(), key.Replace('/', Path.DirectorySeparatorChar));

    /// <summary>
    /// Uzantıdan içerik tipi. Yan dosyada meta tutulmuyor: anahtarın uzantısını
    /// zaten BİZ üretiyoruz (<c>MediaRules.ExperienceKey</c>), dolayısıyla uzantı
    /// imzalanan içerik tipinin birebir karşılığı.
    /// </summary>
    private static string ContentTypeOf(string key) => Path.GetExtension(key) switch
    {
        ".jpg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        // Bilinmeyen uzantı tarayıcıya "çalıştırılabilir bir şey" gibi sunulmuyor.
        _ => "application/octet-stream",
    };

    private static void EnsureSafeKey(string key)
    {
        if (!IsSafeKey(key))
        {
            throw new ArgumentException($"Güvenli olmayan depo anahtarı: {key}", nameof(key));
        }
    }

    /// <summary>
    /// Anahtar bir dosya yoluna çevrildiği için yol gezinmesine kapalı olmak zorunda:
    /// <c>../../appsettings.json</c> gibi bir anahtar, depo kökünün dışını okutur ya da
    /// üstüne yazdırırdı. Beyaz liste yaklaşımı — yasaklı karakter saymak yerine
    /// yalnız izin verilenlere geçit veriliyor.
    /// </summary>
    private static bool IsSafeKey(string? key)
    {
        if (string.IsNullOrEmpty(key)
            || key.Length > 512
            || key[0] == '/'
            || key[^1] == '/'
            || key.Contains("..", StringComparison.Ordinal)
            || key.Contains("//", StringComparison.Ordinal))
        {
            return false;
        }

        foreach (var character in key)
        {
            var allowed = char.IsAsciiLetterOrDigit(character)
                || character is '/' or '-' or '_' or '.';

            if (!allowed)
            {
                return false;
            }
        }

        return true;
    }

    private readonly record struct UploadToken(
        string Key,
        string ContentType,
        long MaxByteSize,
        DateTimeOffset ExpiresAtUtc);

    /// <summary>
    /// Alttaki akıştan en fazla N bayt okutur. <c>Stream.Read</c>'i kısıtlamak,
    /// çağıranın disiplinine güvenmekten sağlam: doğrulama kodu bir gün "sonuna
    /// kadar oku" derse 10 MB'lık dosya belleğe alınmaz, ilk 512 KB'da biter.
    /// </summary>
    private sealed class LimitedStream(Stream inner, int limit) : Stream
    {
        private int remaining = limit;

        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count)
            => Read(buffer.AsSpan(offset, count));

        public override int Read(Span<byte> buffer)
        {
            if (remaining == 0)
            {
                return 0;
            }

            var read = inner.Read(buffer[..Math.Min(buffer.Length, remaining)]);
            remaining -= read;
            return read;
        }

        public override async ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default)
        {
            if (remaining == 0)
            {
                return 0;
            }

            var read = await inner
                .ReadAsync(buffer[..Math.Min(buffer.Length, remaining)], cancellationToken)
                .ConfigureAwait(false);

            remaining -= read;
            return read;
        }

        public override void Flush() => inner.Flush();

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                inner.Dispose();
            }

            base.Dispose(disposing);
        }

        public override async ValueTask DisposeAsync()
        {
            await inner.DisposeAsync().ConfigureAwait(false);
            await base.DisposeAsync().ConfigureAwait(false);
        }
    }
}
