using System.Globalization;
using System.Text;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Email;

/// <summary>
/// Faz 1'in TEK göndericisi: ağa çıkmaz, mesajı <c>.eml</c> olarak diske bırakır.
/// Sahte sağlayıcı yalnız arayüzün arkasında yaşıyor ve kaydı <c>IsDevelopment()</c>
/// kapısından geçiyor — <c>Email:Provider=filesystem</c> gibi bir bayrak yanlış bir
/// ortam değişkeniyle üretime sızabilirdi.
/// </summary>
internal sealed class FileSystemEmailSender(
    EmailOptions options,
    IDateTimeProvider dateTimeProvider,
    ILogger<FileSystemEmailSender> logger)
    : IEmailSender, ILocalMailbox
{
    /// <summary>
    /// Bellekte tutulan mesaj tavanı. Sınırsız olsaydı uzun süre açık kalan bir dev
    /// sunucusu her giriş denemesini süresiz saklardı — kodlar dahil.
    /// </summary>
    private const int MailboxCapacity = 25;

    // BOM'suz UTF-8: .eml'i okuyan araçların çoğu BOM'u gövdenin parçası sayıyor.
    private static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false);

    /// <summary>
    /// Son mesajlar, en YENİSİ başta. Diske de yazılıyor ama dosya adı alıcıyı
    /// taşımıyor (bilinçli); alıcıya göre filtrelemenin tek yolu gönderim anında
    /// yakalamak.
    ///
    /// <para><c>Enqueue</c>/<c>TryDequeue</c> yerine kilit + liste: okuma sırasında
    /// tam bir anlık görüntü gerekiyor ve <c>ConcurrentQueue</c> numaralandırma
    /// sırasında tutarlı bir sıra garanti etmiyor.</para>
    /// </summary>
    private readonly List<LocalMailMessage> mailbox = [];

    private readonly Lock mailboxLock = new();

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);

        var directory = options.ResolveDropDirectory();
        Directory.CreateDirectory(directory);

        var now = dateTimeProvider.UtcNow;

        // Dosya adında ALICI ADRESİ YOK: klasör listesi tek başına "kim giriş denedi"
        // dökümüne dönerdi. Zaman damgası sıralama, Guid tekillik için.
        var fileName = string.Create(
            CultureInfo.InvariantCulture,
            $"{now.UtcDateTime:yyyyMMdd'T'HHmmssfff}-{Guid.CreateVersion7():N}.eml");

        var path = Path.Combine(directory, fileName);

        await File.WriteAllTextAsync(path, BuildEml(message, now), Utf8NoBom, cancellationToken)
            .ConfigureAwait(false);

        Record(new LocalMailMessage(message.To, message.Subject, message.Body, now));

        // Log'a YALNIZ dosya yolu gider. Konu satırı kodun kendisini taşıyor ve gövde
        // de öyle; ikisini loglamak, kodu "asla logda taşınmaz" kuralını tek satırda
        // bozardı. Geliştiricinin ihtiyacı olan tek şey mailin nereye düştüğü —
        // yolu mutlak basıyoruz ki çalışma dizini tahmin edilmek zorunda kalmasın.
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("auth.email.dropped file={File}", path);
        }
    }

    public IReadOnlyList<LocalMailMessage> Recent(string? to, int count)
    {
        lock (mailboxLock)
        {
            IEnumerable<LocalMailMessage> source = mailbox;

            if (!string.IsNullOrWhiteSpace(to))
            {
                var needle = to.Trim();

                // OrdinalIgnoreCase: e-posta yerel kısmı teknik olarak harf duyarlı ama
                // pratikte hiçbir sağlayıcı öyle davranmıyor ve bu bir dev aracı.
                source = source.Where(x => string.Equals(x.To, needle, StringComparison.OrdinalIgnoreCase));
            }

            return source.Take(count).ToList();
        }
    }

    private void Record(LocalMailMessage message)
    {
        lock (mailboxLock)
        {
            mailbox.Insert(0, message);

            if (mailbox.Count > MailboxCapacity)
            {
                mailbox.RemoveRange(MailboxCapacity, mailbox.Count - MailboxCapacity);
            }
        }
    }

    private string BuildEml(EmailMessage message, DateTimeOffset sentAtUtc)
    {
        var builder = new StringBuilder();

        builder.Append("From: ").Append(Header(options.FromName))
            .Append(" <").Append(Header(options.FromAddress)).Append(">\r\n");
        builder.Append("To: ").Append(Header(message.To)).Append("\r\n");
        builder.Append("Subject: ").Append(Header(message.Subject)).Append("\r\n");
        builder.Append("Date: ")
            .Append(sentAtUtc.ToString("r", CultureInfo.InvariantCulture)).Append("\r\n");
        builder.Append("MIME-Version: 1.0\r\n");

        // Başlıklar RFC 2047 ile kodlanmıyor, gövde 8 bit UTF-8 gidiyor: bu bir dev
        // sink'i, MTA değil. Gerçek kodlama Faz 7.4'ün (SMTP) işi.
        builder.Append("Content-Type: text/plain; charset=utf-8\r\n");
        builder.Append("Content-Transfer-Encoding: 8bit\r\n");
        builder.Append("\r\n");
        builder.Append(message.Body.ReplaceLineEndings("\r\n"));

        return builder.ToString();
    }

    /// <summary>
    /// Başlık değerinden CR/LF düşer. Değerler kendi composer'ımızdan geliyor ve
    /// e-posta adresi zaten doğrulanmış — ama tek bir satır sonu .eml biçimini
    /// bozmaya yeterdi ve savunması bir satır.
    /// </summary>
    private static string Header(string value)
        => value.Replace("\r", string.Empty, StringComparison.Ordinal)
            .Replace("\n", string.Empty, StringComparison.Ordinal);
}
