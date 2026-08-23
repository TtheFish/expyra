using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Application.Features.Scheduling;
using Expyra.Application.Features.Scheduling.Commands;
using Expyra.Application.Features.Scheduling.Commands.CreateRecurrence;
using Expyra.Application.Features.Scheduling.Commands.ExtendSchedule;
using Expyra.Application.Features.Scheduling.Commands.StopRecurrence;
using Expyra.Domain.Scheduling;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Scheduling;

/// <summary>
/// PLAN Blok 7 kabul kriterleri 1, 4 ve 5 — gerçek veritabanı, gerçek IANA saat
/// dilimi verisi, gerçek kısıtlar üzerinde.
///
/// <para>Şehir <b>Prag</b>: yaz saati uygulayan bir bölge. İzmir seçilseydi (kalıcı
/// UTC+3) kriter 1'in tamamı ölçülmeden yeşil geçerdi.</para>
///
/// <para><b>Hiçbir geçiş tarihi elle YAZILMIYOR.</b> "2026-03-29" yazsaydık test o
/// tarih geçmişte kalınca sessizce hiçbir şey ölçmeyen bir yeşile dönerdi — en
/// tehlikeli test türü. Geçişler <see cref="TimeZoneInfo"/>'dan bugüne göre
/// aranıyor.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class HostScheduleTests(ApiFactory factory)
{
    private const string BasePath = "/api/host/experiences";
    private const string ActivatePath = "/api/host/activate";

    private static readonly TimeZoneInfo Prague = TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");

    /// <summary>
    /// Geçiş araması penceresi. Ufuk tavanı 365 gün ve bulunan günden bir hafta
    /// sonrasına kadar üretim istiyoruz; 350 o tavanın altında kalıyor. Prag'da iki
    /// geçiş arası en fazla ~214 gün olduğu için bu pencere yılın hangi gününde
    /// çalışırsak çalışalım hem bir ilkbahar hem bir sonbahar geçişi içeriyor.
    /// </summary>
    private const int SearchDays = 350;

    // -----------------------------------------------------------------------
    // Kabul kriteri 1 — DST'de yerel saat sabit
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Sablon_IleriSeansUretiyor_VeDstGecisindeYerelSaatSABIT()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var transition = NextOffsetChange(TodayInPrague(), new TimeOnly(10, 0));

        var created = await CreateRecurrenceAsync(client, token, experience, transition.DayOfWeek, "10:00");

        // Sekiz haftadan fazlası: kriterin "8 hafta ileri" şartı ALT sınır.
        created.Report.CreatedSlotCount.ShouldBeGreaterThan(8);

        // Varsayılan ufuk 180 gün; geçiş daha uzaktaysa oraya kadar açıyoruz.
        await ExtendAsync(client, token, experience, transition.AddDays(7));

        var slots = await SlotRowsAsync(experience);

        var oncesi = slots.Single(x => DateOnly.FromDateTime(x.StartsAtLocal) == transition.AddDays(-7));
        var sonrasi = slots.Single(x => DateOnly.FromDateTime(x.StartsAtLocal) == transition);

        // Host'un yazdığı duvar saati DEĞİŞMİYOR...
        oncesi.StartsAtLocal.Hour.ShouldBe(10);
        sonrasi.StartsAtLocal.Hour.ShouldBe(10);

        // ...ama gerçek an tam bir saat kayıyor. Kriter 1 tam olarak bu.
        Math.Abs(oncesi.UtcOffsetMinutes - sonrasi.UtcOffsetMinutes).ShouldBe(60);

        oncesi.StartsAtUtc.UtcDateTime.Hour.ShouldBe(10 - (oncesi.UtcOffsetMinutes / 60));
        sonrasi.StartsAtUtc.UtcDateTime.Hour.ShouldBe(10 - (sonrasi.UtcOffsetMinutes / 60));
    }

    [Fact]
    public async Task Sablon_YazSaatiBoslugunuATLIYOR_VeSebebiniRAPORLUYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        // İleride 02:30'un HİÇ yaşanmadığı ilk gün — ilkbahar geçişi.
        var gap = NextInvalidDay(TodayInPrague(), new TimeOnly(2, 30));

        await CreateRecurrenceAsync(client, token, experience, gap.DayOfWeek, "02:30");

        // Rapora ufuk yanıtından bakılıyor, kural yanıtından DEĞİL: geçiş varsayılan
        // 180 günün ötesine düştüğünde kural yanıtı onu henüz görmemiş olur ve test
        // yılın bir bölümünde sessizce hiçbir şey ölçmezdi. Ufuk daima bugünden
        // yeniden tarıyor, yani geçiş nereye düşerse düşsün bu yanıtta.
        var extended = await ExtendAsync(client, token, experience, gap.AddDays(7));

        var skipped = extended.Report.Skipped.ShouldHaveSingleItem();
        skipped.Reason.ShouldBe("dst-gap");
        skipped.LocalStart.ShouldBe($"{gap:yyyy-MM-dd}T02:30");

        // Host'a ne söyleyeceğimiz de raporda: "02:30 yok, 03:00'ten başlayabilirsin".
        skipped.FirstValidLocal.ShouldBe($"{gap:yyyy-MM-dd}T03:00");

        var slots = await SlotRowsAsync(experience);

        // Rapor doğru ama satır yine de yazılmış olsaydı rapor yalan söylüyor olurdu.
        slots.ShouldNotContain(x => DateOnly.FromDateTime(x.StartsAtLocal) == gap);

        // Ve atlama TEK SEFERLİK: bir sonraki hafta normale dönüyor.
        slots.ShouldContain(x => DateOnly.FromDateTime(x.StartsAtLocal) == gap.AddDays(7));
    }

    [Fact]
    public async Task TekilSeans_YazSaatiBoslugunda_400_VeIlkGecerliSaatiSOYLUYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var gap = NextInvalidDay(TodayInPrague(), new TimeOnly(2, 30));

        // Şablonda ATLANIYOR, burada REDDEDİLİYOR: host bu saati açıkça istedi ve
        // sessizce hiçbir şey yapmamak, "kaydettim" deyip kaydetmemek olurdu.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = $"{gap:yyyy-MM-dd}T02:30" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).ShouldContain("03:00");

        (await SlotRowsAsync(experience)).ShouldBeEmpty();
    }

    [Fact]
    public async Task TekilSeans_IkiKezYasananSaatte_HangiTekrarSORULUYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        // Sonbahar geçişi: 02:30 o gün İKİ KEZ yaşanıyor.
        var day = NextAmbiguousDay(TodayInPrague(), new TimeOnly(2, 30));
        var stamp = $"{day:yyyy-MM-dd}T02:30";

        var ilk = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = stamp, dstOverlap = "first" });

        var ikinci = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = stamp, dstOverlap = "second" });

        ilk.StatusCode.ShouldBe(HttpStatusCode.Created);
        ikinci.StatusCode.ShouldBe(HttpStatusCode.Created);

        var a = (await ilk.Content.ReadFromJsonAsync<SlotResponse>(AuthApi.Json))!;
        var b = (await ikinci.Content.ReadFromJsonAsync<SlotResponse>(AuthApi.Json))!;

        // Aynı duvar saati, FARKLI an. Sessizce birine düşülseydi host yılda bir kez
        // bir saat erken ya da geç sahada olurdu.
        a.StartsAtLocal.ShouldBe(b.StartsAtLocal);
        (b.StartsAtUtc - a.StartsAtUtc).ShouldBe(TimeSpan.FromHours(1));

        // İlk tekrar yaz saatinde: farkı BÜYÜK olan.
        a.UtcOffsetMinutes.ShouldBeGreaterThan(b.UtcOffsetMinutes);
    }

    // -----------------------------------------------------------------------
    // Ön koşullar, pencere ve ufuk
    // -----------------------------------------------------------------------

    [Fact]
    public async Task SehirsizDeneyimde_TakvimKURULAMAZ_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);

        // Şehir yok → saat dilimi de yok; "seans hangi duvar saatinde" sorusunun
        // cevabı yok.
        var draft = await CreateDraftAsync(client, token);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{draft}/recurrences", token,
            new
            {
                daysOfWeek = new[] { "tuesday" },
                startTimeLocal = "14:00",
                startsOnLocal = TodayInPrague().ToString("yyyy-MM-dd"),
            });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task TakvimEkrani_OnKosulEksikOlsaDaACILIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        // Yazma ucu reddediyor, okuma ucu yol gösteriyor: host eksikleri GÖRÜP
        // tamamlayabilmeli, 409 yiyip boş ekrana bakmamalı.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Get, $"{BasePath}/{draft}/schedule", token);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var schedule = (await response.Content.ReadFromJsonAsync<HostScheduleResponse>(AuthApi.Json))!;
        schedule.MissingScheduleRequirements.ShouldContain(ScheduleRequirement.TimeZone);
        schedule.Slots.ShouldBeEmpty();
    }

    [Fact]
    public async Task TakvimPenceresi_CokGenisse_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var from = TodayInPrague();
        var to = from.AddDays(ScheduleRules.MaxWindowDays + 1);

        var response = await MediaApi.SendAsync(
            client,
            HttpMethod.Get,
            $"{BasePath}/{experience}/schedule?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}",
            token);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Ufuk_TavaninOtesine_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/schedule/extend", token,
            new
            {
                throughLocalDate = TodayInPrague()
                    .AddDays(ScheduleRules.MaxHorizonDays + 1).ToString("yyyy-MM-dd"),
            });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Ufuk_IstenenTarihe_GERCEKTEN_Aciliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var today = TodayInPrague();
        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Wednesday, "12:00");

        // Varsayılan ufkun ÖTESİ. Üretecin içinde sabit bir 180 gün olsaydı filigran
        // buraya ilerler, seanslar ilerlemezdi: takvim "hazır" der, gün boş çıkardı.
        var target = today.AddDays(ScheduleRules.MaxHorizonDays - 5);

        var extended = await ExtendAsync(client, token, experience, target);
        extended.GeneratedThroughLocalDate.ShouldBe(target.ToString("yyyy-MM-dd"));

        var son = (await SlotRowsAsync(experience)).Max(x => DateOnly.FromDateTime(x.StartsAtLocal));

        son.ShouldBeGreaterThan(today.AddDays(RecurrenceTemplate.GenerationHorizonDays));
        son.ShouldBeLessThanOrEqualTo(target);
    }

    // -----------------------------------------------------------------------
    // Çakışma ve tekillik
    // -----------------------------------------------------------------------

    [Fact]
    public async Task AyniGunVeSaatteIkinciKural_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Wednesday, "10:00");

        // İki kural aynı seansı üretip tekil index'e çarpardı; kod bunu önce
        // yakalıyor ki hata 500 değil, hangi günün çakıştığını söyleyen bir 409 olsun.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/recurrences", token,
            new
            {
                daysOfWeek = new[] { "wednesday" },
                startTimeLocal = "10:00",
                startsOnLocal = TodayInPrague().ToString("yyyy-MM-dd"),
            });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Uretim_BugununGECMIS_SaatineSeansYAZMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Prague);
        var today = DateOnly.FromDateTime(now);

        // İçinde bulunduğumuz saatin başı: istek sunucuya vardığında kesinlikle
        // geçmişte (eşitlik de eleniyor).
        var created = await CreateRecurrenceAsync(
            client, token, experience, today.DayOfWeek, $"{now.Hour:00}:00");

        var slots = await SlotRowsAsync(experience);

        // Yazılsaydı host takviminde hiç yaşanmamış bir seans dururdu ve o satıra
        // dokunamazdı: kapatma da silme de geçmiş seansı reddediyor.
        slots.ShouldNotContain(x => DateOnly.FromDateTime(x.StartsAtLocal) == today);
        slots.ShouldAllBe(x => x.StartsAtUtc > DateTimeOffset.UtcNow);

        // Bir sonraki hafta yerinde: elenen yalnız bugün.
        created.Report.CreatedSlotCount.ShouldBeGreaterThan(8);
        slots.ShouldContain(x => DateOnly.FromDateTime(x.StartsAtLocal) == today.AddDays(7));
    }

    [Fact]
    public async Task KapatilanSeans_TekrarUretimdeDIRILMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Friday, "09:00");

        var slot = (await SlotRowsAsync(experience)).First();

        (await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{experience}/slots/{slot.Id}", token,
            new { status = "closed" })).StatusCode.ShouldBe(HttpStatusCode.OK);

        // Tekrar üretim tetikleniyor. Tekillik DURUMDAN BAĞIMSIZ olduğu için kapalı
        // satır korunmalı: host'un kapattığı gün geri gelmemeli.
        await ExtendAsync(client, token, experience, null);

        var after = (await SlotRowsAsync(experience)).Single(x => x.Id == slot.Id);
        after.Status.ShouldBe(SlotStatus.Closed);
        after.ClosedReason.ShouldBe(SlotClosedReason.Host);
    }

    // -----------------------------------------------------------------------
    // Blackout
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Blackout_SeanslariKapatiyor_KaldirilincaGeriACIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Monday, "11:00");

        var target = (await SlotRowsAsync(experience)).First(x => x.Status == SlotStatus.Open);
        var day = DateOnly.FromDateTime(target.StartsAtLocal);

        var blackout = await CreateBlackoutAsync(client, token, experience, day);
        blackout.ClosedSlotCount.ShouldBeGreaterThan(0);

        var closed = (await SlotRowsAsync(experience)).Single(x => x.Id == target.Id);
        closed.Status.ShouldBe(SlotStatus.Closed);
        closed.ClosedReason.ShouldBe(SlotClosedReason.Blackout);

        var removed = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/blackouts/{blackout.Blackout.Id}", token);

        removed.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await removed.Content.ReadFromJsonAsync<DeleteBlackoutResponse>(AuthApi.Json))!
            .ReopenedSlotCount.ShouldBe(blackout.ClosedSlotCount);

        (await SlotRowsAsync(experience)).Single(x => x.Id == target.Id).Status.ShouldBe(SlotStatus.Open);
    }

    [Fact]
    public async Task Blackout_HostunElleKapattiginiGERIACMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Thursday, "16:00");

        var target = (await SlotRowsAsync(experience)).First(x => x.Status == SlotStatus.Open);
        var day = DateOnly.FromDateTime(target.StartsAtLocal);

        // Host ÖNCE elle kapatıyor.
        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{experience}/slots/{target.Id}", token,
            new { status = "closed" });

        var blackout = await CreateBlackoutAsync(client, token, experience, day);

        await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/blackouts/{blackout.Blackout.Id}", token);

        // Sebep ayrımı burada karşılığını buluyor: host'un kapattığı satır, blackout
        // kalktı diye açılmıyor.
        var after = (await SlotRowsAsync(experience)).Single(x => x.Id == target.Id);
        after.Status.ShouldBe(SlotStatus.Closed);
        after.ClosedReason.ShouldBe(SlotClosedReason.Host);
    }

    [Fact]
    public async Task Blackout_UretimiDE_Engelliyor_KaldirilincaGunGeriGELIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        // Aralık ÖNCE konuyor: o güne hiç satır yazılmamalı — kapatılacak bir şey yok.
        var day = NextWeekday(TodayInPrague().AddDays(21), DayOfWeek.Tuesday);
        var blackout = await CreateBlackoutAsync(client, token, experience, day);

        blackout.ClosedSlotCount.ShouldBe(0);

        var created = await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Tuesday, "15:00");

        created.Report.Skipped.ShouldContain(x =>
            x.Reason == "blackout" && x.LocalStart == $"{day:yyyy-MM-dd}T15:00");

        (await SlotRowsAsync(experience)).ShouldNotContain(x => DateOnly.FromDateTime(x.StartsAtLocal) == day);

        await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/blackouts/{blackout.Blackout.Id}", token);

        // Aralık kalktı ama o gün için AÇILACAK satır yok — hiç yazılmamıştı. Günü
        // geri getiren tek şey yeniden tarama; ufuk filigrana bakıp kısa devre
        // yapsaydı takvimde kalıcı bir delik kalırdı.
        await ExtendAsync(client, token, experience, null);

        (await SlotRowsAsync(experience)).ShouldContain(x => DateOnly.FromDateTime(x.StartsAtLocal) == day);
    }

    [Fact]
    public async Task BlackoutliTariheTekilSeans_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var day = TodayInPrague().AddDays(40);
        await CreateBlackoutAsync(client, token, experience, day);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = $"{day:yyyy-MM-dd}T15:00" });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task GecmisteKalanBlackout_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var day = TodayInPrague().AddDays(-10);

        // Sessizce kabul etmek, host'a "tatilini kaydettim" deyip hiçbir seansı
        // kapatmamak olurdu.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/blackouts", token,
            new { startsOnLocal = day.ToString("yyyy-MM-dd"), endsOnLocal = day.ToString("yyyy-MM-dd") });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // -----------------------------------------------------------------------
    // Seans yaşam döngüsü
    // -----------------------------------------------------------------------

    [Fact]
    public async Task TekilSeans_AcilirKapanir_TekrarIstenince_DIRILIR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var stamp = $"{TodayInPrague().AddDays(20):yyyy-MM-dd}T13:00";

        var first = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = stamp });

        first.StatusCode.ShouldBe(HttpStatusCode.Created);
        var slot = (await first.Content.ReadFromJsonAsync<SlotResponse>(AuthApi.Json))!;

        // Açıkken tekrar istemek 409.
        (await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token, new { startsAtLocal = stamp }))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{experience}/slots/{slot.SlotId}", token,
            new { status = "closed" });

        // Kapalıyken tekrar istemek YENİDEN AÇIYOR: 200 ve AYNI satır. İkinci satır
        // yazılsaydı tekil index'e çarpardı.
        var reopened = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token, new { startsAtLocal = stamp });

        reopened.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await reopened.Content.ReadFromJsonAsync<SlotResponse>(AuthApi.Json))!.SlotId.ShouldBe(slot.SlotId);

        (await SlotRowsAsync(experience)).ShouldHaveSingleItem().Status.ShouldBe(SlotStatus.Open);
    }

    [Fact]
    public async Task AyniBaslangicaIkinciSatir_VERITABANI_Reddediyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = $"{TodayInPrague().AddDays(30):yyyy-MM-dd}T11:00" });

        var slot = (await SlotRowsAsync(experience)).ShouldHaveSingleItem();

        // Satır KAPATILIYOR: tekillik DURUMDAN BAĞIMSIZ olmalı. Şema yalnız "Open"
        // filtreli bir tekil index taşısaydı bu ekleme başarılı olur ve host'un
        // kapattığı gün bir sonraki üretimde geri gelirdi.
        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{experience}/slots/{slot.Id}", token,
            new { status = "closed" });

        // Kod yolundan DEĞİL doğrudan veritabanına yazılıyor: burada sınanan şey
        // uygulamanın kontrolü değil, ux_availability_slot_experience_start index'inin
        // gerçekten var olup olmadığı. O index bir kez sessizce oluşmamıştı — aynı
        // sütun çiftine iki adsız HasIndex çağrısı EF'te tek nesneye çöküyor.
        var duplicate = await Should.ThrowAsync<DbUpdateException>(() => factory.QueryAsync(async db =>
        {
            db.AvailabilitySlots.Add(new AvailabilitySlot
            {
                Id = Guid.CreateVersion7(),
                ExperienceId = experience,
                StartsAtUtc = slot.StartsAtUtc,
                StartsAtLocal = slot.StartsAtLocal,
                UtcOffsetMinutes = slot.UtcOffsetMinutes,
                DurationMinutes = slot.DurationMinutes,
                Capacity = slot.Capacity,
                RemainingCapacity = slot.Capacity,
                Status = SlotStatus.Open,
            });

            await db.SaveChangesAsync();

            return true;
        }));

        duplicate.InnerException?.Message.ShouldContain("ux_availability_slot_experience_start");

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task RezervasyonluKapaliSeans_YenidenACILAMAZ()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var stamp = $"{TodayInPrague().AddDays(31):yyyy-MM-dd}T12:00";

        var created = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = stamp });

        var slot = (await created.Content.ReadFromJsonAsync<SlotResponse>(AuthApi.Json))!;

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{experience}/slots/{slot.SlotId}", token,
            new { status = "closed" });

        // Satılmış koltuk taklidi. Rezervasyon Blok 9'da; burada sınanan şey
        // diriltmenin o sayacı EZMEMESİ.
        await SetRemainingAsync(slot.SlotId, 5);

        var revive = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = stamp });

        revive.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // Sayaç DOKUNULMAMIŞ olmalı. Kontrol olmasaydı 5 → 8 olurdu: satılmış üç
        // koltuk geri gelir ve aynı yer ikinci kez satılabilirdi.
        var after = (await SlotRowsAsync(experience)).Single(x => x.Id == slot.SlotId);
        after.RemainingCapacity.ShouldBe(5);
        after.Status.ShouldBe(SlotStatus.Closed);
    }

    [Fact]
    public async Task ElleEklenenSeans_SILINEBILIR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/slots", token,
            new { startsAtLocal = $"{TodayInPrague().AddDays(25):yyyy-MM-dd}T17:00" });

        var slot = (await response.Content.ReadFromJsonAsync<SlotResponse>(AuthApi.Json))!;

        (await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/slots/{slot.SlotId}", token))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await SlotRowsAsync(experience)).ShouldBeEmpty();
    }

    [Fact]
    public async Task SablondanDoganSeans_SILINEMEZ()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Saturday, "08:00");

        var slot = (await SlotRowsAsync(experience)).First(x => x.RecurrenceTemplateId != null);

        // Silinse bir sonraki üretim onu geri getirirdi; kapatma yolu ayrı ve kalıcı.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/slots/{slot.Id}", token);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await SlotRowsAsync(experience)).ShouldContain(x => x.Id == slot.Id);
    }

    [Fact]
    public async Task KuralDurdurulunca_GelecekSeanslarKapaniyor_SablonSILINMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var created = await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Sunday, "18:00");
        var template = created.Templates.ShouldHaveSingleItem();

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/recurrences/{template.Id}", token);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var stopped = (await response.Content.ReadFromJsonAsync<StopRecurrenceResponse>(AuthApi.Json))!;
        stopped.ClosedSlotCount.ShouldBe(created.Report.CreatedSlotCount);
        stopped.KeptSlotCount.ShouldBe(0);

        (await SlotRowsAsync(experience)).ShouldAllBe(x => x.Status == SlotStatus.Closed);

        // Şablon SİLİNMİYOR: ürettiği seansların nereden geldiği kayıtlı kalmalı.
        var row = await factory.QueryAsync(db => db.RecurrenceTemplates
            .AsNoTracking().SingleAsync(x => x.Id == template.Id));

        row.Status.ShouldBe(RecurrenceStatus.Stopped);
    }

    [Fact]
    public async Task DurdurulmusKural_ArtikURETMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        var created = await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Sunday, "19:00");

        await MediaApi.SendAsync(
            client,
            HttpMethod.Delete,
            $"{BasePath}/{experience}/recurrences/{created.Templates.Single().Id}",
            token);

        var extended = await ExtendAsync(client, token, experience, TodayInPrague().AddDays(300));

        extended.Report.CreatedSlotCount.ShouldBe(0);
    }

    [Fact]
    public async Task BaskaHostunTakvimi_404()
    {
        var client = factory.CreateClient();
        var owner = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, owner);

        var stranger = await NewHostTokenAsync(client);

        // 403 DEĞİL 404: 403 "bu id var" demek olurdu — enumeration oracle'ı.
        (await MediaApi.SendAsync(client, HttpMethod.Get, $"{BasePath}/{experience}/schedule", stranger))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experience}/recurrences", stranger,
            new
            {
                daysOfWeek = new[] { "tuesday" },
                startTimeLocal = "14:00",
                startsOnLocal = TodayInPrague().ToString("yyyy-MM-dd"),
            }))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Takvim_SablonBlackoutVeSeanslari_TEK_CAGRIDA_Donuyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await SchedulableExperienceAsync(client, token);

        await CreateRecurrenceAsync(client, token, experience, DayOfWeek.Monday, "09:30");
        await CreateBlackoutAsync(client, token, experience, TodayInPrague().AddDays(45));

        var from = TodayInPrague();

        var response = await MediaApi.SendAsync(
            client,
            HttpMethod.Get,
            $"{BasePath}/{experience}/schedule?from={from:yyyy-MM-dd}&to={from.AddDays(60):yyyy-MM-dd}",
            token);

        var schedule = (await response.Content.ReadFromJsonAsync<HostScheduleResponse>(AuthApi.Json))!;

        schedule.TimeZoneId.ShouldBe("Europe/Prague");
        schedule.MissingScheduleRequirements.ShouldBeEmpty();
        schedule.Recurrences.ShouldHaveSingleItem().DayOfWeek.ShouldBe("monday");
        schedule.Blackouts.ShouldHaveSingleItem();
        schedule.Slots.ShouldNotBeEmpty();

        // Duvar saati saat dilimi eki OLMADAN gidiyor: bu bir duvar saati, kesin bir
        // an değil ve offset yazmak onu yanlışlıkla mutlak bir zamana çevirirdi.
        schedule.Slots[0].StartsAtLocal.ShouldEndWith("T09:30");
        schedule.GeneratedThroughLocalDate.ShouldNotBeNull();
    }

    // -----------------------------------------------------------------------
    // Saat dilimi yardımcıları — hiçbir geçiş tarihi elle yazılmıyor
    // -----------------------------------------------------------------------

    private static DateOnly TodayInPrague()
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Prague));

    /// <summary>UTC farkının bir önceki günden ayrıldığı ilk gün.</summary>
    private static DateOnly NextOffsetChange(DateOnly from, TimeOnly at)
    {
        var previous = Prague.GetUtcOffset(from.ToDateTime(at, DateTimeKind.Unspecified));

        for (var i = 1; i <= SearchDays; i++)
        {
            var day = from.AddDays(i);
            var offset = Prague.GetUtcOffset(day.ToDateTime(at, DateTimeKind.Unspecified));

            if (offset != previous) return day;

            previous = offset;
        }

        throw new InvalidOperationException(
            $"Europe/Prague'da {SearchDays} gün içinde saat geçişi bulunamadı; IANA verisi eksik olabilir.");
    }

    /// <summary>Verilen yerel saatin HİÇ yaşanmadığı ilk gün (ilkbahar geçişi).</summary>
    private static DateOnly NextInvalidDay(DateOnly from, TimeOnly at)
        => FindDay(from, at, Prague.IsInvalidTime, "hiç yaşanmadığı");

    /// <summary>Verilen yerel saatin İKİ KEZ yaşandığı ilk gün (sonbahar geçişi).</summary>
    private static DateOnly NextAmbiguousDay(DateOnly from, TimeOnly at)
        => FindDay(from, at, Prague.IsAmbiguousTime, "iki kez yaşandığı");

    private static DateOnly FindDay(DateOnly from, TimeOnly at, Func<DateTime, bool> match, string what)
    {
        for (var i = 1; i <= SearchDays; i++)
        {
            var day = from.AddDays(i);

            if (match(day.ToDateTime(at, DateTimeKind.Unspecified))) return day;
        }

        throw new InvalidOperationException(
            $"Europe/Prague'da {SearchDays} gün içinde {at:HH\\:mm} saatinin {what} bir gün bulunamadı.");
    }

    private static DateOnly NextWeekday(DateOnly from, DayOfWeek day)
        => from.AddDays(((int)day - (int)from.DayOfWeek + 7) % 7);

    // -----------------------------------------------------------------------
    // Kurulum
    // -----------------------------------------------------------------------

    private async Task<string> NewHostTokenAsync(HttpClient client)
    {
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());
        var response = await MediaApi.SendAsync(client, HttpMethod.Post, ActivatePath, tokens.AccessToken);

        return (await response.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json))!.AccessToken;
    }

    private static async Task<Guid> CreateDraftAsync(HttpClient client, string token)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, BasePath, token, new { originalLanguage = "cs" });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!.Id;
    }

    /// <summary>Takvim ön koşullarını karşılayan deneyim: Prag, süre ve kapasite dolu.</summary>
    private async Task<Guid> SchedulableExperienceAsync(HttpClient client, string token)
    {
        var id = await CreateDraftAsync(client, token);

        var prague = await factory.QueryAsync(db => db.Cities
            .AsNoTracking().Where(x => x.Slug == "prague").Select(x => x.Id).FirstAsync());

        var patched = await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{id}", token,
            new { cityId = prague, categorySlug = "tours-walks", durationMinutes = 120, capacity = 8 });

        patched.StatusCode.ShouldBe(HttpStatusCode.OK);

        return id;
    }

    private static async Task<CreateRecurrenceResponse> CreateRecurrenceAsync(
        HttpClient client, string token, Guid experienceId, DayOfWeek day, string time)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experienceId}/recurrences", token,
            new
            {
                daysOfWeek = new[] { day.ToString().ToLowerInvariant() },
                startTimeLocal = time,
                startsOnLocal = TodayInPrague().ToString("yyyy-MM-dd"),
            });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<CreateRecurrenceResponse>(AuthApi.Json))!;
    }

    private static async Task<CreateBlackoutResponse> CreateBlackoutAsync(
        HttpClient client, string token, Guid experienceId, DateOnly day)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experienceId}/blackouts", token,
            new { startsOnLocal = day.ToString("yyyy-MM-dd"), endsOnLocal = day.ToString("yyyy-MM-dd") });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        return (await response.Content.ReadFromJsonAsync<CreateBlackoutResponse>(AuthApi.Json))!;
    }

    private static async Task<ExtendScheduleResponse> ExtendAsync(
        HttpClient client, string token, Guid experienceId, DateOnly? through)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{experienceId}/schedule/extend", token,
            new { throughLocalDate = through?.ToString("yyyy-MM-dd") });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<ExtendScheduleResponse>(AuthApi.Json))!;
    }

    /// <summary>
    /// Kalan koltuğu doğrudan yazar — rezervasyon taklidi. Rezervasyon Blok 9'da;
    /// bu blokta sayacı azaltan bir uç yok ve testin ihtiyacı olan şey tam olarak
    /// "azalmış bir sayaç".
    /// </summary>
    private Task<bool> SetRemainingAsync(Guid slotId, int remaining)
        => factory.QueryAsync(async db =>
        {
            var slot = await db.AvailabilitySlots.SingleAsync(x => x.Id == slotId);
            slot.RemainingCapacity = remaining;
            await db.SaveChangesAsync();

            return true;
        });

    private Task<List<AvailabilitySlot>> SlotRowsAsync(Guid experienceId)
        => factory.QueryAsync(db => db.AvailabilitySlots
            .AsNoTracking()
            .Where(x => x.ExperienceId == experienceId)
            .OrderBy(x => x.StartsAtUtc)
            .ToListAsync());
}
