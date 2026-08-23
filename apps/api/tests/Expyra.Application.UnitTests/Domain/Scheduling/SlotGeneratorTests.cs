using Shouldly;
using Expyra.Domain.Scheduling;

namespace Expyra.Application.UnitTests.Domain.Scheduling;

/// <summary>
/// PLAN Blok 7 kabul kriteri 1: "her salı 14:00" şablonu ileri seans üretir ve DST
/// geçişinde saat yerel saatte sabit kalır.
/// </summary>
public sealed class SlotGeneratorTests
{
    private static readonly TimeZoneInfo Prague = TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");

    private static RecurrenceTemplate Template(
        DayOfWeek day = DayOfWeek.Tuesday,
        int hour = 14,
        int minute = 0,
        DateOnly? startsOn = null,
        DateOnly? endsOn = null,
        DstOverlap overlap = DstOverlap.First,
        RecurrenceStatus status = RecurrenceStatus.Active) => new()
        {
            ExperienceId = Guid.CreateVersion7(),
            DayOfWeek = day,
            StartTimeLocal = new TimeOnly(hour, minute),
            StartsOnLocal = startsOn ?? new DateOnly(2026, 3, 1),
            EndsOnLocal = endsOn,
            DstOverlap = overlap,
            Status = status,
        };

    /// <param name="through">
    /// Verilmezse çağıranların ürettiği varsayılan ufuk. Testlerin çoğu bu ufka
    /// bakmıyor; ufkun KENDİSİNİ ölçenler değeri açıkça veriyor.
    /// </param>
    private static SlotGenerationReport Run(
        RecurrenceTemplate template,
        DateOnly from,
        IReadOnlyCollection<AvailabilityBlackout>? blackouts = null,
        IReadOnlySet<DateTime>? existing = null,
        DateOnly? through = null)
        => SlotGenerator.Generate(
            template,
            Prague,
            from,
            through ?? from.AddDays(RecurrenceTemplate.GenerationHorizonDays),
            blackouts ?? [],
            existing ?? new HashSet<DateTime>());

    [Fact]
    public void UfukCagirandanGeliyor_180GunSABIT_DEGIL()
    {
        var from = new DateOnly(2026, 6, 1);

        // Üretecin içinde sabitlenmiş bir 180 gün olsaydı bu satır 180 günlük sonuç
        // verirdi ve "bir yıl ileriyi aç" isteği sessizce kesilirdi: filigran istenen
        // tarihe ilerler, seanslar ilerlemezdi — takvim "hazır" der, gün boş çıkardı.
        var uzun = Run(Template(), from, through: from.AddDays(364));
        var kisa = Run(Template(), from, through: from.AddDays(70));

        uzun.Created.Count.ShouldBe(52);
        kisa.Created.Count.ShouldBe(10);
    }

    [Fact]
    public void SekizHaftaIleriUretiyor_VeHepsiSali()
    {
        var report = Run(Template(), new DateOnly(2026, 6, 1));

        // 180 günlük ufuk: 8 haftadan fazlası üretiliyor. Kriterin istediği "8 hafta
        // ileri" bunun ALT sınırı — 56 gün seçilseydi misafirin 62 günlük penceresi
        // ufkun ötesine düşer ve "seans yok" ile "henüz üretilmedi" ayırt edilemezdi.
        report.Created.Count.ShouldBeGreaterThan(8);
        report.Created.ShouldAllBe(x => x.Local.DayOfWeek == DayOfWeek.Tuesday);
        report.Created.ShouldAllBe(x => x.Local.Hour == 14);
        report.Skipped.ShouldBeEmpty();
    }

    [Fact]
    public void DstGecisindeYerelSaatSabit_UtcKayiyor()
    {
        // Prag'da yaz saati 29 Mart 2026'da başlıyor. Geçişin iki yanındaki salılar:
        // 24 Mart (kış, UTC+1) ve 31 Mart (yaz, UTC+2).
        var report = Run(Template(), new DateOnly(2026, 3, 20));

        var oncesi = report.Created.Single(x => x.Local.Date == new DateTime(2026, 3, 24));
        var sonrasi = report.Created.Single(x => x.Local.Date == new DateTime(2026, 3, 31));

        // Host'un yazdığı saat değişmiyor...
        oncesi.Local.Hour.ShouldBe(14);
        sonrasi.Local.Hour.ShouldBe(14);

        // ...ama gerçek an bir saat kayıyor. Kabul kriteri 1 tam olarak bu.
        oncesi.Utc.UtcDateTime.Hour.ShouldBe(13);
        sonrasi.Utc.UtcDateTime.Hour.ShouldBe(12);
    }

    [Fact]
    public void YazSaatiBoslugu_AtlanIYORVeRaporlanIYOR()
    {
        // "Her pazar 02:30" — 29 Mart 2026'da o saat Prag'da hiç yaşanmıyor.
        var report = Run(
            Template(DayOfWeek.Sunday, hour: 2, minute: 30, startsOn: new DateOnly(2026, 3, 1)),
            new DateOnly(2026, 3, 20));

        report.Created.ShouldNotContain(x => x.Local.Date == new DateTime(2026, 3, 29));

        var skip = report.Skipped.ShouldHaveSingleItem();
        skip.LocalStart.Date.ShouldBe(new DateTime(2026, 3, 29));
        skip.Reason.ShouldBe(SlotSkipReason.DaylightGap);

        // Host'a ne söyleyeceğimiz de raporda: "02:30 yok, 03:00'ten başlayabilirsin".
        skip.FirstValidLocal.ShouldBe(new DateTime(2026, 3, 29, 3, 0, 0, DateTimeKind.Unspecified));

        // Sonraki pazarlar etkilenmiyor — atlama tek occurrence'ı kapsıyor.
        report.Created.ShouldContain(x => x.Local.Date == new DateTime(2026, 4, 5));
    }

    [Fact]
    public void SonbaharBelirsizligi_TekSeansUretiyor()
    {
        // 25 Ekim 2026 pazar, 02:30 iki kez yaşanıyor. İKİ seans üretmek yanlış
        // olurdu: host bir tur planladı, iki değil.
        var report = Run(
            Template(DayOfWeek.Sunday, hour: 2, minute: 30, startsOn: new DateOnly(2026, 10, 1)),
            new DateOnly(2026, 10, 20));

        var belirsiz = report.Created.Where(x => x.Local.Date == new DateTime(2026, 10, 25)).ToList();

        belirsiz.ShouldHaveSingleItem().WasAmbiguous.ShouldBeTrue();
        belirsiz[0].Offset.ShouldBe(TimeSpan.FromHours(2));
    }

    [Fact]
    public void BlackoutAralikTAKuretimEngelleniyor()
    {
        var template = Template();
        var blackout = new AvailabilityBlackout
        {
            ExperienceId = template.ExperienceId,
            StartsOnLocal = new DateOnly(2026, 6, 8),
            EndsOnLocal = new DateOnly(2026, 6, 21),
        };

        var report = Run(template, new DateOnly(2026, 6, 1), [blackout]);

        // 9 ve 16 Haziran salıları aralığın içinde.
        report.Created.ShouldNotContain(x => x.Local.Date == new DateTime(2026, 6, 9));
        report.Created.ShouldNotContain(x => x.Local.Date == new DateTime(2026, 6, 16));

        // Aralığın dışı etkilenmiyor.
        report.Created.ShouldContain(x => x.Local.Date == new DateTime(2026, 6, 2));
        report.Created.ShouldContain(x => x.Local.Date == new DateTime(2026, 6, 23));

        report.Skipped.Count(x => x.Reason == SlotSkipReason.Blackout).ShouldBe(2);
    }

    [Fact]
    public void BlackoutIkiUcuDaKAPSIYOR()
    {
        var template = Template();

        // Tek günlük blackout, tam bir salı: yarı açık aralık olsaydı bu gün açık kalırdı.
        var blackout = new AvailabilityBlackout
        {
            ExperienceId = template.ExperienceId,
            StartsOnLocal = new DateOnly(2026, 6, 9),
            EndsOnLocal = new DateOnly(2026, 6, 9),
        };

        Run(template, new DateOnly(2026, 6, 1), [blackout])
            .Created.ShouldNotContain(x => x.Local.Date == new DateTime(2026, 6, 9));
    }

    [Fact]
    public void VarOlanSeansTekrarURETILMIYOR_veRaporaGirmiyor()
    {
        var template = Template();
        var mevcut = new DateTime(2026, 6, 9, 14, 0, 0, DateTimeKind.Unspecified);

        var report = Run(template, new DateOnly(2026, 6, 1), existing: new HashSet<DateTime> { mevcut });

        report.Created.ShouldNotContain(x => x.Local == mevcut);

        // İdempotentlik bir "atlama" değil: rapora yazılsaydı ikinci çalıştırma
        // yüzlerce satırlık gürültü üretirdi.
        report.Skipped.ShouldBeEmpty();
    }

    [Fact]
    public void KapatilmisSeansDIRILTILMIYOR()
    {
        // Var olan başlangıçlar DURUMDAN BAĞIMSIZ veriliyor: host'un kapattığı seans
        // da listede olmalı, yoksa tekrar üretim onu geri getirir.
        var template = Template();
        var kapali = new DateTime(2026, 6, 9, 14, 0, 0, DateTimeKind.Unspecified);

        Run(template, new DateOnly(2026, 6, 1), existing: new HashSet<DateTime> { kapali })
            .Created.ShouldNotContain(x => x.Local == kapali);
    }

    [Fact]
    public void GecmiseUretimYok()
    {
        var report = Run(Template(startsOn: new DateOnly(2026, 1, 1)), new DateOnly(2026, 6, 1));

        report.Created.ShouldAllBe(x => x.Local >= new DateTime(2026, 6, 1));
    }

    [Fact]
    public void BitisGunuDAHIL()
    {
        var report = Run(
            Template(endsOn: new DateOnly(2026, 6, 16)),
            new DateOnly(2026, 6, 1));

        report.Created.ShouldContain(x => x.Local.Date == new DateTime(2026, 6, 16));
        report.Created.ShouldNotContain(x => x.Local.Date == new DateTime(2026, 6, 23));
    }

    [Fact]
    public void DurdurulmusSablonUretmiyor()
        => Run(Template(status: RecurrenceStatus.Stopped), new DateOnly(2026, 6, 1))
            .Created.ShouldBeEmpty();

    [Fact]
    public void UfkunOtesineGecmiyor()
    {
        var from = new DateOnly(2026, 6, 1);
        var report = Run(Template(), from);

        var son = from.AddDays(RecurrenceTemplate.GenerationHorizonDays);
        report.Created.ShouldAllBe(x => DateOnly.FromDateTime(x.Local) <= son);
    }
}
