using Shouldly;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.UnitTests.Domain.Scheduling;

/// <summary>
/// PLAN Blok 7 kabul kriteri 1'in kalbi: DST geçişinde saat YEREL SAATTE SABİT
/// kalır, UTC'de kayar.
///
/// <para>Tarihler UYDURMA DEĞİL — 2026'nın gerçek geçişleri. Uydurma bir tarih
/// seçilseydi test yeşil kalır ama gerçek geçişte kırılan kodu yakalamazdı.</para>
///
/// <para>Saat dilimleri IANA kimliğiyle çağrılıyor; Windows kimliği (<c>"W. Europe
/// Standard Time"</c>) YAZILMIYOR çünkü <c>city.time_zone_id</c> de IANA tutuyor
/// ve seeder her satırı öyle doğruluyor.</para>
/// </summary>
public sealed class SlotStartResolverTests
{
    private static readonly TimeZoneInfo Prague = TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");
    private static readonly TimeZoneInfo Istanbul = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    private static DateTime Local(int year, int month, int day, int hour, int minute = 0)
        => new(year, month, day, hour, minute, 0, DateTimeKind.Unspecified);

    // -----------------------------------------------------------------------
    // Kabul kriteri 1 — yerel sabit, UTC kayar
    // -----------------------------------------------------------------------

    [Fact]
    public void YerelSaatSabitKalir_UtcKayar()
    {
        // Prag'da yaz saati 29 Mart 2026'da başlıyor. "Her cuma 14:00" şablonu
        // geçişin iki yanında AYNI duvar saatini vermeli — ama farklı UTC anlarını.
        SlotStartResolver.TryResolve(Local(2026, 3, 20, 14), Prague, DstOverlap.First, out var kis)
            .ShouldBeTrue();
        SlotStartResolver.TryResolve(Local(2026, 4, 20, 14), Prague, DstOverlap.First, out var yaz)
            .ShouldBeTrue();

        kis.Local.Hour.ShouldBe(14);
        yaz.Local.Hour.ShouldBe(14);

        kis.Utc.UtcDateTime.Hour.ShouldBe(13);
        yaz.Utc.UtcDateTime.Hour.ShouldBe(12);

        kis.Offset.ShouldBe(TimeSpan.FromHours(1));
        yaz.Offset.ShouldBe(TimeSpan.FromHours(2));
    }

    [Fact]
    public void DstOlmayanBolgedeKaymaYok()
    {
        // Türkiye 2016'da yaz saatini kaldırdı ve kalıcı UTC+3'te.
        // TUZAK: TimeZoneInfo.SupportsDaylightSavingTime İstanbul için yine de true
        // döner (tarihsel kurallar yüzünden) — "bu bölge saat kaydırır mı" sorusunun
        // cevabı o bayrak DEĞİL.
        SlotStartResolver.TryResolve(Local(2026, 3, 20, 14), Istanbul, DstOverlap.First, out var kis)
            .ShouldBeTrue();
        SlotStartResolver.TryResolve(Local(2026, 4, 20, 14), Istanbul, DstOverlap.First, out var yaz)
            .ShouldBeTrue();

        kis.Utc.UtcDateTime.Hour.ShouldBe(11);
        yaz.Utc.UtcDateTime.Hour.ShouldBe(11);
    }

    // -----------------------------------------------------------------------
    // Bahar boşluğu — var olmayan yerel saat
    // -----------------------------------------------------------------------

    [Theory]
    [InlineData(2, 0)]
    [InlineData(2, 30)]
    [InlineData(2, 59)]
    public void BaharBoslugu_CozulmezVeIstisnaATMAZ(int hour, int minute)
    {
        // Prag 2026-03-29: saat 02:00'de 03:00'e atlıyor, aradaki yerel saatler hiç
        // yaşanmıyor. TimeZoneInfo.ConvertTimeToUtc burada ArgumentException fırlatır;
        // ele alınmasaydı GlobalExceptionHandler'dan 500 çıkardı.
        SlotStartResolver
            .TryResolve(Local(2026, 3, 29, hour, minute), Prague, DstOverlap.First, out _)
            .ShouldBeFalse();
    }

    [Fact]
    public void BaharBoslugu_DuzConvertTimeToUtcGERCEKTENPatliyor()
    {
        // Bu test çözücünün gereksiz olmadığını kanıtlıyor: aynı girdi platformun
        // kendi metodunda istisna. "Sadeleştirip doğrudan çağıralım" diyen bir
        // refactor burada kırılır.
        Should.Throw<ArgumentException>(
            () => TimeZoneInfo.ConvertTimeToUtc(Local(2026, 3, 29, 2, 30), Prague));
    }

    [Fact]
    public void BaharBoslugu_IlkGecerliSaatBulunuyor()
    {
        SlotStartResolver
            .FirstValidLocalAfter(Local(2026, 3, 29, 2, 30), Prague)
            .ShouldBe(Local(2026, 3, 29, 3));
    }

    [Fact]
    public void BosluktaOlmayanSaatIcinIlkGecerliSaatKendisi()
        => SlotStartResolver
            .FirstValidLocalAfter(Local(2026, 3, 29, 10), Prague)
            .ShouldBe(Local(2026, 3, 29, 10));

    [Fact]
    public void YarimSaatlikBosluk_SabitKaydirmaYamalariniYakalar()
    {
        // Australia/Lord_Howe geçişi 30 DAKİKA. "Bir saat ekle" ya da "DaylightDelta
        // kadar kaydır" yamaları burada yanlış cevap verir; tarama boşluğun
        // uzunluğu hakkında hiçbir varsayım yapmıyor.
        var lordHowe = TimeZoneInfo.FindSystemTimeZoneById("Australia/Lord_Howe");
        var gecis = new DateTime(2026, 10, 4, 2, 15, 0, DateTimeKind.Unspecified);

        // Varsayım ATLANMIYOR, doğrulanıyor: IANA verisi değişip geçiş yer değiştirirse
        // test yanlış bir şeyi ölçmeye devam etmek yerine burada kırılsın.
        lordHowe.IsInvalidTime(gecis).ShouldBeTrue();

        SlotStartResolver.TryResolve(gecis, lordHowe, DstOverlap.First, out _).ShouldBeFalse();

        var ilk = SlotStartResolver.FirstValidLocalAfter(gecis, lordHowe);
        ilk.ShouldBe(new DateTime(2026, 10, 4, 2, 30, 0, DateTimeKind.Unspecified));
    }

    // -----------------------------------------------------------------------
    // Sonbahar belirsizliği — iki kez yaşanan yerel saat
    // -----------------------------------------------------------------------

    [Fact]
    public void SonbaharBelirsizligi_VarsayilanBirinciTekrar()
    {
        // Prag 2026-10-25 02:30 iki kez yaşanıyor: önce UTC+2 (yaz), sonra UTC+1.
        SlotStartResolver
            .TryResolve(Local(2026, 10, 25, 2, 30), Prague, DstOverlap.First, out var birinci)
            .ShouldBeTrue();

        birinci.WasAmbiguous.ShouldBeTrue();
        birinci.Offset.ShouldBe(TimeSpan.FromHours(2));
        birinci.Utc.UtcDateTime.ShouldBe(new DateTime(2026, 10, 25, 0, 30, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void SonbaharBelirsizligi_IkinciTekrarAcikcaSecilebiliyor()
    {
        SlotStartResolver
            .TryResolve(Local(2026, 10, 25, 2, 30), Prague, DstOverlap.Second, out var ikinci)
            .ShouldBeTrue();

        ikinci.Offset.ShouldBe(TimeSpan.FromHours(1));
        ikinci.Utc.UtcDateTime.ShouldBe(new DateTime(2026, 10, 25, 1, 30, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void SonbaharBelirsizligi_DuzConvertTimeToUtcSESSIZCEIkinciyiSeciyor()
    {
        // Çözücünün ikinci varlık sebebi: platform burada patlamıyor, SESSİZCE
        // standart offseti (ikinci tekrar) seçiyor. Varsayılanımız birinci tekrar,
        // yani düz çağrıdan FARKLI bir an. Bu testin kırılması, birinin çözücüyü
        // "sadeleştirip" varsayılanı ters çevirdiği anlamına gelir.
        var duz = TimeZoneInfo.ConvertTimeToUtc(Local(2026, 10, 25, 2, 30), Prague);

        SlotStartResolver
            .TryResolve(Local(2026, 10, 25, 2, 30), Prague, DstOverlap.First, out var bizim)
            .ShouldBeTrue();

        bizim.Utc.UtcDateTime.ShouldNotBe(duz);
        duz.ShouldBe(new DateTime(2026, 10, 25, 1, 30, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void IsDaylightSavingTime_BelirsizSaatiAyirtEtmekIcinKULLANILAMAZ()
    {
        // Belgelenmemiş ama ölçülebilir tuzak: belirsiz yerel saatlerin HEPSİNDE
        // false dönüyor, yani "hangi tekrar" sorusuna cevap vermiyor. Seçim daima
        // GetAmbiguousTimeOffsets üzerinden.
        Prague.IsAmbiguousTime(Local(2026, 10, 25, 2, 30)).ShouldBeTrue();
        Prague.IsDaylightSavingTime(Local(2026, 10, 25, 2, 30)).ShouldBeFalse();
    }

    [Fact]
    public void BelirsizOlmayanSaatteBayrakDusuk()
    {
        SlotStartResolver
            .TryResolve(Local(2026, 7, 1, 14), Prague, DstOverlap.First, out var yaz)
            .ShouldBeTrue();

        yaz.WasAmbiguous.ShouldBeFalse();
    }

    // -----------------------------------------------------------------------
    // Sözleşme
    // -----------------------------------------------------------------------

    [Theory]
    [InlineData(DateTimeKind.Utc)]
    [InlineData(DateTimeKind.Local)]
    public void YanlisKind_SessizceDuzeltilmiyor(DateTimeKind kind)
    {
        // Utc/Local işaretli bir değeri TimeZoneInfo başka türlü yorumlar ve sonuç
        // saatlerce kayar. Sessizce düzeltmek, çağıranın zamanı nereden aldığını
        // yanlış bildiğini gizlerdi.
        var yanlis = new DateTime(2026, 7, 1, 14, 0, 0, kind);

        Should.Throw<ArgumentException>(
            () => SlotStartResolver.TryResolve(yanlis, Prague, DstOverlap.First, out _));
    }

    [Fact]
    public void CozulenAnUtcOlarakIsaretli()
    {
        SlotStartResolver
            .TryResolve(Local(2026, 7, 1, 14), Prague, DstOverlap.First, out var slot)
            .ShouldBeTrue();

        // Offset sıfır olmalı: bu bir UTC damgası ve timestamptz'ye öyle yazılıyor.
        slot.Utc.Offset.ShouldBe(TimeSpan.Zero);
        slot.Local.Kind.ShouldBe(DateTimeKind.Unspecified);
    }
}
