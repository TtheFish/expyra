using System.Globalization;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Languages;

namespace Expyra.Infrastructure.Email;

/// <summary>
/// Kod postasının metni. Faz 8.1'de sökülecek çeviri borcunun TEK dosyada kalması için
/// ayrı bir tip (docs/I18N.md §5) — metin buradan <c>messages/&lt;dil&gt;.json</c>'a taşınacak.
///
/// <para>Hiçbir yerde <c>ToUpper</c> yok. Gerekseydi alıcının kültürü AÇIKÇA verilirdi:
/// invariant kültürde "Türkiye".ToUpper() → "TURKIYE" olur ve hata yalnız sunucunun
/// kültür ayarına göre ortaya çıkar (ROADMAP Faz 7 tuzağı). Aynı gerekçeyle metinler
/// alıcının kültürüyle biçimleniyor, geçerli kültürle değil.</para>
/// </summary>
internal sealed class LoginCodeEmailComposer : ILoginCodeEmailComposer
{
    public EmailMessage Compose(string toEmail, string code, string? language, TimeSpan lifetime)
    {
        // 600 sn → 10 dk. En az 1: "0 dakika geçerli" cümlesi kurulmasın.
        var minutes = Math.Max(1, (int)Math.Round(lifetime.TotalMinutes, MidpointRounding.AwayFromZero));

        // Kod konu satırında: iOS/Android tek kullanımlık kod önerisi konuyu okuyor ve
        // kullanıcı çoğu zaman postayı hiç açmadan girebiliyor. Rakamlar gruplanmıyor
        // ("483 920" değil) — araya giren boşluk hem otomatik doldurmayı hem
        // kopyala-yapıştır'ı bozuyor.
        return RootOf(language) switch
        {
            "tr" => Turkish(toEmail, code, minutes),
            _ => English(toEmail, code, minutes),
        };
    }

    private static EmailMessage Turkish(string toEmail, string code, int minutes)
    {
        var culture = CultureInfo.GetCultureInfo("tr-TR");

        return new EmailMessage(
            toEmail,
            string.Create(culture, $"Expyra giriş kodun: {code}"),
            string.Create(culture, $"""
                Merhaba,

                Expyra giriş kodun: {code}

                Kod {minutes} dakika geçerli.

                Bu kodu kimseyle paylaşma; Expyra bu kodu asla telefonda, sohbette
                veya destek üzerinden istemez.

                Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.

                Expyra
                """));
    }

    private static EmailMessage English(string toEmail, string code, int minutes)
    {
        var culture = CultureInfo.GetCultureInfo("en-US");

        return new EmailMessage(
            toEmail,
            string.Create(culture, $"Your Expyra sign-in code: {code}"),
            string.Create(culture, $"""
                Hi,

                Your Expyra sign-in code: {code}

                The code is valid for {minutes} minutes.

                Never share this code with anyone. Expyra will never ask for it by
                phone, chat or support.

                If you did not request this, you can ignore this email.

                Expyra
                """));
    }

    /// <summary>
    /// <c>de-AT</c> → <c>de</c>. Şablon dili köke göre seçiliyor: bölge farkı bu
    /// metinlerde hiçbir şeyi değiştirmiyor, ama <c>login_code.language</c> bölgeli
    /// gelebiliyor. Tanınmayan/boş değer İngilizceye düşer.
    /// </summary>
    private static string RootOf(string? language)
    {
        if (!LanguageCode.TryNormalize(language, out var normalized))
        {
            return "en";
        }

        return LanguageCode.BaseLanguageOf(normalized) ?? normalized;
    }
}
