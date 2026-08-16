using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Expyra.Application.Common.Interfaces;

namespace Expyra.IntegrationTests.Common;

/// <summary>
/// Testin kodu okuduğu TEK yer. API yanıtı, log ve DTO'lar kodu hiçbir koşulda
/// taşımıyor — testler de kodu buradan başka bir yerden okumamalı, aksi halde yeşil
/// kalan bir test o kuralın bozulduğunu gizler.
///
/// <para>Koleksiyon boyunca paylaşılıyor ve hiç temizlenmiyor: her test kendi
/// e-posta adresini üretiyor, arama adres bazlı.</para>
/// </summary>
public sealed partial class CapturingEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> messages = new();

    public int Count => messages.Count;

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);

        messages.Enqueue(message);
        return Task.CompletedTask;
    }

    /// <summary>Bu adrese kaç posta gitti. "İkinci istek mail GÖNDERMEDİ" iddiasının ölçüsü.</summary>
    public int CountFor(string email)
        => messages.Count(x => Matches(x, email));

    /// <summary>
    /// Adrese giden SON postadaki kod. Konu satırından okunuyor: gövdede "10 dakika"
    /// gibi başka sayılar var, konuda yalnız kod.
    /// </summary>
    public string CodeFor(string email)
    {
        var message = messages.LastOrDefault(x => Matches(x, email))
            ?? throw new InvalidOperationException(
                $"'{email}' adresine hiç kod postası gitmedi. Kod isteği 202 döndü mü?");

        var match = CodePattern().Match(message.Subject);

        return match.Success
            ? match.Value
            : throw new InvalidOperationException(
                $"Konu satırında kod bulunamadı: '{message.Subject}'.");
    }

    /// <summary>Kullanıcının yazdığı hâl saklanıyor (normalize edilmiş adres değil).</summary>
    private static bool Matches(EmailMessage message, string email)
        => string.Equals(message.To, email, StringComparison.OrdinalIgnoreCase);

    // Hane sayısı Auth:Otp:Digits ile 4-9 arasında değişebiliyor; sabit {6} yazmak
    // kaçış valfi açıldığında testleri sessizce anlamsız kılardı. [0-9], \d DEĞİL.
    [GeneratedRegex("[0-9]{4,9}")]
    private static partial Regex CodePattern();
}
