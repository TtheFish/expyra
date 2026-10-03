using Shouldly;
using Expyra.Application.Features.Experiences;

namespace Expyra.Application.UnitTests.Features.Experiences;

/// <summary>
/// Cursor'ın tek işi var: bir satırın YERİNİ kaybetmeden taşımak. Bu dosya o taşımanın
/// kayıpsız olduğunu ve bozuk girdinin sessizce "başa sar"a dönüşmediğini sabitliyor.
/// </summary>
public sealed class ExperienceCursorTests
{
    [Fact]
    public void Encode_Decode_MikrosaniyeyeKadarAyni()
    {
        // Postgres timestamptz mikrosaniye hassasiyetinde. Cursor unix milisaniye
        // taşısaydı bu değer yuvarlanır ve aynı milisaniyede yayınlanmış satırlar ya
        // atlanır ya iki kez görünürdü.
        var publishedAt = new DateTimeOffset(2026, 8, 21, 9, 14, 3, TimeSpan.Zero).AddTicks(1234560);
        var id = Guid.CreateVersion7();

        var decoded = Decode(new ExperienceCursor(publishedAt, id).Encode());

        decoded.SortedAtUtc.UtcTicks.ShouldBe(publishedAt.UtcTicks);
        decoded.Id.ShouldBe(id);
    }

    [Fact]
    public void Encode_YerelSaatliDamga_UtcOlarakTasinir()
    {
        // Aynı ana işaret eden iki değer aynı cursor'ı üretmeli: karşılaştırma UTC
        // üzerinden yapılıyor, aksi halde sayfa sınırı sunucunun saat dilimine bağlanırdı.
        var utc = new DateTimeOffset(2026, 8, 21, 9, 0, 0, TimeSpan.Zero);
        var sameInstant = utc.ToOffset(TimeSpan.FromHours(3));
        var id = Guid.CreateVersion7();

        new ExperienceCursor(sameInstant, id).Encode()
            .ShouldBe(new ExperienceCursor(utc, id).Encode());
    }

    [Fact]
    public void Encode_UrlGuvenli()
    {
        var encoded = new ExperienceCursor(DateTimeOffset.UtcNow, Guid.CreateVersion7()).Encode();

        // Query string'de taşınıyor: '+', '/' ve '=' kaçış gerektirir ve bir kopyala-yapıştır
        // adımında sessizce bozulur.
        encoded.Length.ShouldBe(ExperienceCursor.EncodedLength);
        encoded.ShouldNotContain("+");
        encoded.ShouldNotContain("/");
        encoded.ShouldNotContain("=");
    }

    [Fact]
    public void Encode_FarkliSatirlar_FarkliCursor()
    {
        var publishedAt = DateTimeOffset.UtcNow;

        // Aynı anda yayınlanan iki ilan: ayrımı yapan tek şey ikincil anahtar.
        new ExperienceCursor(publishedAt, Guid.CreateVersion7()).Encode()
            .ShouldNotBe(new ExperienceCursor(publishedAt, Guid.CreateVersion7()).Encode());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abc")]
    public void TryDecode_BozukDeger_False(string? raw)
        // False → doğrulayıcı 400 üretiyor. Sessizce ilk sayfaya dönseydi, sayfalayan
        // istemci sonsuz döngüye girer ve bunu hiçbir yerden anlayamazdı.
        => ExperienceCursor.TryDecode(raw, out _).ShouldBeFalse();

    [Fact]
    public void TryDecode_DogruUzunlukAmaAlfabeDisi_False()
        // Uzunluk kontrolünü geçen ama base64url olmayan girdi de reddedilmeli:
        // uzunluk bir doğrulama değil, yalnız ucuz bir ön eleme.
        => ExperienceCursor.TryDecode(new string('!', ExperienceCursor.EncodedLength), out _)
            .ShouldBeFalse();

    [Fact]
    public void TryDecode_FazladanKarakter_False()
        => ExperienceCursor.TryDecode(new string('A', ExperienceCursor.EncodedLength + 1), out _)
            .ShouldBeFalse();

    [Fact]
    public void TryDecode_KirpilmisCursor_False()
    {
        // Kopyala-yapıştırda bir karakteri düşen cursor: yaklaşık bir yere değil,
        // hiçbir yere çözülmeli.
        var encoded = new ExperienceCursor(DateTimeOffset.UtcNow, Guid.CreateVersion7()).Encode();

        ExperienceCursor.TryDecode(encoded[..^1], out _).ShouldBeFalse();
    }

    private static ExperienceCursor Decode(string raw)
    {
        ExperienceCursor.TryDecode(raw, out var cursor).ShouldBeTrue();
        return cursor;
    }
}
