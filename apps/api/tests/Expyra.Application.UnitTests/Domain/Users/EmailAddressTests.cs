using System.Globalization;
using Shouldly;
using Expyra.Domain.Users;

namespace Expyra.Application.UnitTests.Domain.Users;

/// <summary>
/// E-posta bu sistemde ŞİFRENİN yerini tutuyor: normalizasyon iki yerde farklı
/// çalışırsa aynı kişi için ikinci bir hesap doğar ve geri alınamaz.
/// Kalıp: <c>LanguageCodeTests</c>.
/// </summary>
public sealed class EmailAddressTests
{
    [Theory]
    [InlineData("  User@Example.COM  ", "user@example.com")]
    [InlineData("user@example.com", "user@example.com")]
    [InlineData("USER@EXAMPLE.COM", "user@example.com")]
    [InlineData("a@mail.example.co.uk", "a@mail.example.co.uk")]
    // Gmail nokta silme ve +etiket kırpma BİLEREK yapılmıyor: sağlayıcıya özel
    // politikadır, uygulanırsa farklı insanların hesapları sessizce birleşir.
    [InlineData("First.Last+etiket@Example.com", "first.last+etiket@example.com")]
    public void TryNormalize_GecerliGirdi_TekBicimeIndirger(string input, string expected)
    {
        EmailAddress.TryNormalize(input, out var normalized).ShouldBeTrue();
        normalized.ShouldBe(expected);
        EmailAddress.IsValid(input).ShouldBeTrue();
    }

    /// <summary>
    /// Bu testin varlık sebebi: IDN adresi REDDETMEK universal platform sözünü
    /// (VISION §4) bozar, normalize ETMEMEK ise aynı adresi iki farklı yazımla
    /// iki satır yapar. Tek biçim punycode.
    /// </summary>
    [Theory]
    [InlineData("a@müller.de", "a@xn--mller-kva.de")]
    [InlineData("a@MÜLLER.de", "a@xn--mller-kva.de")]
    public void TryNormalize_IdnAlanAdi_PunycodeyeIner(string input, string expected)
    {
        EmailAddress.TryNormalize(input, out var normalized).ShouldBeTrue();
        normalized.ShouldBe(expected);
    }

    /// <summary>
    /// Bu testin varlık sebebi: tr-TR'de "I".ToLower() → "ı" verir. Kültüre duyarlı
    /// bir dönüşüm kullanılırsa <c>ux_app_user_normalized_email</c> satırı bulamaz;
    /// kullanıcı her girişte YENİ hesap açar. Hata yalnız Türkçe locale'li sunucuda
    /// çıkar — geliştiricinin makinesinde değil (LanguageCode.cs ile aynı tuzak).
    /// </summary>
    [Fact]
    public void TryNormalize_TurkceKulturAltinda_AyniSonucuVerir()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            EmailAddress.TryNormalize("INFO@X.COM", out var normalized).ShouldBeTrue();
            normalized.ShouldBe("info@x.com");        // "ınfo@x.com" DEĞİL

            // Asıl güvence: aynı adresin iki yazımı TEK anahtara inmeli.
            EmailAddress.Normalize("Info@x.com").ShouldBe(EmailAddress.Normalize("INFO@X.COM"));
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("a@b")]                     // nokta yok — tek etiketli alan adı kabul edilmiyor
    [InlineData("@x.com")]                  // local part boş
    [InlineData("user@")]                   // alan adı boş
    [InlineData("userexample.com")]         // @ yok
    [InlineData("müller@example.com")]      // local part ASCII değil: gönderici SMTPUTF8 konuşmuyor
    [InlineData("a b@example.com")]         // boşluk
    [InlineData("a@.com")]                  // boş etiket
    [InlineData("a@example..com")]          // boş etiket
    // Alıntılı local part ("a@b"@x.com) da reddediliyor: LastIndexOf('@') bunu ayırabilse
    // de LocalPartPattern \x40'ı dışarıda bırakıyor. Kasıtlı — Faz 1'in göndericisi bu
    // adresleri taşıyamaz. Desen bir gün gevşetilirse bu satır uyaracak.
    [InlineData("\"a@b\"@example.com")]
    public void TryNormalize_GecersizGirdi_FalseDoner(string? input)
    {
        EmailAddress.TryNormalize(input, out var normalized).ShouldBeFalse();
        normalized.ShouldBeEmpty();
        EmailAddress.IsValid(input).ShouldBeFalse();
    }

    /// <summary>
    /// RFC 5321 §4.5.3.1.3 sınırı. Sütun genişliği de 254 — sınır burada tutulmazsa
    /// hata kullanıcı girdisinden çalışma anında bir DB hatasına dönüşür.
    /// </summary>
    [Fact]
    public void TryNormalize_UstSinir_254Kabul_255Ret()
    {
        var local = new string('a', 242);   // 242 + '@' + "example.com" (11) = 254

        EmailAddress.TryNormalize($"{local}@example.com", out var normalized).ShouldBeTrue();
        normalized.Length.ShouldBe(EmailAddress.MaxLength);

        EmailAddress.TryNormalize($"{local}a@example.com", out _).ShouldBeFalse();
    }

    [Fact]
    public void Normalize_GecersizGirdi_Firlatir()
    {
        // Girdinin zaten doğrulanmış olduğu yerlerde çağrılıyor: sessizce boş dönmek
        // yerine patlaması gerekir (LanguageCode.Normalize ile aynı sözleşme).
        Should.Throw<ArgumentException>(() => EmailAddress.Normalize("a@b"));
    }
}
