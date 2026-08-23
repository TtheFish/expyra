using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.Application.Features.Scheduling;
using Expyra.Application.Features.Scheduling.Commands.SetPricing;
using Expyra.Domain.Pricing;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Scheduling;

/// <summary>
/// PLAN Blok 7 kabul kriteri 3'ün host tarafı: tutarlar <b>minör birim tam
/// sayısı</b>, para birimi yayından sonra <b>kilitli</b> ve ödeme sağlayıcısının
/// kabul etmeyeceği bir fiyat <b>hiç kaydedilmiyor</b>.
///
/// <para>Son madde en önemlisi: alt sınırın altındaki bir fiyat kaydedilebilseydi
/// ilan yayınlanır, her ödeme reddedilir ve host sebebini haftalar sonra
/// öğrenirdi.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class HostPricingTests(ApiFactory factory)
{
    private const string BasePath = "/api/host/experiences";
    private const string ActivatePath = "/api/host/activate";

    [Fact]
    public async Task Fiyat_YazilirVeOkunur_TutarMINOR_BIRIM()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        var response = await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 4500), (GuestType.Child, 2500));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var pricing = (await response.Content.ReadFromJsonAsync<PricingResponse>(AuthApi.Json))!;
        pricing.Currency.ShouldBe("EUR");
        pricing.MinorUnits.ShouldBe(2);
        pricing.CurrencyLocked.ShouldBeFalse();
        pricing.Rules.Count.ShouldBe(2);

        // Satırda ne yazdığı da ölçülüyor: yanıt doğru olup veritabanı yanlış
        // olabilirdi ve o fark ancak ödeme anında görünürdü.
        var rows = await RuleRowsAsync(draft);
        rows.Single(x => x.GuestType == GuestType.Adult).UnitPrice.AmountMinor.ShouldBe(4500);
        rows.Single(x => x.GuestType == GuestType.Adult).UnitPrice.Currency.ShouldBe("EUR");
    }

    [Fact]
    public async Task Fiyat_GERI_OKUNABILIYOR_TakvimYanitinda()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 4500), (GuestType.Child, 2500));

        // Okuma yolu OLMADAN fiyat formu kayıtlı değeri gösteremez ve PUT tam
        // değiştirme olduğu için boş açılıp kaydedilen bir form kademeleri silerdi.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Get, $"{BasePath}/{draft}/schedule", token);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var schedule = (await response.Content.ReadFromJsonAsync<HostScheduleResponse>(AuthApi.Json))!;
        var pricing = schedule.Pricing.ShouldNotBeNull();

        pricing.Currency.ShouldBe("EUR");
        pricing.MinorUnits.ShouldBe(2);
        pricing.CurrencyLocked.ShouldBeFalse();

        // Kademe sırası SABİT: yetişkin önce. Sıra veritabanından gelseydi form
        // satırları rastgele sırada çizerdi.
        pricing.Rules.Count.ShouldBe(2);
        pricing.Rules[0].GuestType.ShouldBe("adult");
        pricing.Rules[0].UnitAmountMinor.ShouldBe(4500);
        pricing.Rules[1].GuestType.ShouldBe("child");
        pricing.Rules[1].UnitAmountMinor.ShouldBe(2500);
    }

    [Fact]
    public async Task Fiyat_GirilmemisseTakvimYanitinda_NULL()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Get, $"{BasePath}/{draft}/schedule", token);

        // Boş kademe listesi DEĞİL null: boş liste formda "0" gösterirdi ve
        // "fiyatsız" ile "bedava" ayrımı kaybolurdu.
        (await response.Content.ReadFromJsonAsync<HostScheduleResponse>(AuthApi.Json))!
            .Pricing.ShouldBeNull();
    }

    [Fact]
    public async Task Fiyat_YayindanSonraOkumada_KilitBayragiDOLU()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await PublishedAsync(client, token);

        await SetPricingAsync(client, token, experience, "EUR", (GuestType.Adult, 4500));

        var response = await MediaApi.SendAsync(
            client, HttpMethod.Get, $"{BasePath}/{experience}/schedule", token);

        var schedule = (await response.Content.ReadFromJsonAsync<HostScheduleResponse>(AuthApi.Json))!;

        // Arayüz para birimi seçicisini bu bayrakla kilitliyor; publishedAtUtc'yi
        // kendi yorumlamıyor. Yazma ucundaki koşulun aynısı.
        schedule.Pricing.ShouldNotBeNull().CurrencyLocked.ShouldBeTrue();
    }

    [Fact]
    public async Task Fiyat_TAM_DEGISTIRME_EksikKademeSILINIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 4500), (GuestType.Child, 2500));

        // İkinci yazım listeyi TAM DEĞİŞTİRİYOR: çocuk kademesi listede yok, yani
        // silinmeli. Delta olsaydı "çocuk fiyatını kaldır" ayrı bir uç isterdi.
        await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 5000));

        var rows = await RuleRowsAsync(draft);
        rows.ShouldHaveSingleItem().GuestType.ShouldBe(GuestType.Adult);
        rows[0].UnitPrice.AmountMinor.ShouldBe(5000);
    }

    [Fact]
    public async Task Fiyat_SifirBebek_KABUL()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        // Bedava bebek geçerli bir fiyat ve o satır tek başına tahsilat üretmiyor;
        // alt sınır ona uygulanmıyor.
        var response = await SetPricingAsync(
            client, token, draft, "EUR", (GuestType.Adult, 4500), (GuestType.Infant, 0));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await RuleRowsAsync(draft)).Single(x => x.GuestType == GuestType.Infant)
            .UnitPrice.AmountMinor.ShouldBe(0);
    }

    [Fact]
    public async Task Fiyat_SaglayicininAltSinirininAltinda_400_VeHicKAYDEDILMIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        // EUR alt sınırı 50 minör birim (0,50 €). 30 kaydedilebilseydi ilan
        // yayınlanır ve her ödeme reddedilirdi.
        var response = await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 30));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await RuleRowsAsync(draft)).ShouldBeEmpty();
    }

    [Fact]
    public async Task Fiyat_UstSinirinUstunde_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        var response = await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 100_000_000));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await RuleRowsAsync(draft)).ShouldBeEmpty();
    }

    [Fact]
    public async Task Fiyat_TaninmayanParaBirimi_400_FK_IHLALI_DEGIL()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        // Kayıt defteri kontrolü FK'ye çarpmadan önce: FK ihlali 500 üretirdi, oysa
        // bu kullanıcının düzeltebileceği bir girdi hatası.
        var response = await SetPricingAsync(client, token, draft, "XXZ", (GuestType.Adult, 4500));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Fiyat_ParaBirimiKucukHarfle_NORMALLESIYOR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        var response = await SetPricingAsync(client, token, draft, "eur", (GuestType.Adult, 4500));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadFromJsonAsync<PricingResponse>(AuthApi.Json))!.Currency.ShouldBe("EUR");
    }

    // -----------------------------------------------------------------------
    // Yayın kilidi
    // -----------------------------------------------------------------------

    [Fact]
    public async Task YayinlanmisIlanda_ParaBirimiDEGISTIRILEMEZ_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await PublishedAsync(client, token);

        await SetPricingAsync(client, token, experience, "EUR", (GuestType.Adult, 4500));

        // Yayınlanmış bir fiyatın para birimini değiştirmek, dışarı çıkmış bir
        // sayının anlamını geriye dönük değiştirmek olurdu.
        var response = await SetPricingAsync(client, token, experience, "USD", (GuestType.Adult, 4500));

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await RuleRowsAsync(experience)).ShouldAllBe(x => x.UnitPrice.Currency == "EUR");
    }

    [Fact]
    public async Task YayinlanmisIlanda_TUTAR_Degistirilebiliyor()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await PublishedAsync(client, token);

        await SetPricingAsync(client, token, experience, "EUR", (GuestType.Adult, 4500));

        // Kilit para biriminde, tutarda DEĞİL: host zam yapabilmeli. Donan tutar
        // rezervasyonun kendi kaydında olacak (Blok 9).
        var response = await SetPricingAsync(client, token, experience, "EUR", (GuestType.Adult, 5500));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadFromJsonAsync<PricingResponse>(AuthApi.Json))!
            .CurrencyLocked.ShouldBeTrue();

        (await RuleRowsAsync(experience)).ShouldHaveSingleItem().UnitPrice.AmountMinor.ShouldBe(5500);
    }

    [Fact]
    public async Task YayinlanmisIlanda_FiyatSILINEMEZ_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await PublishedAsync(client, token);

        await SetPricingAsync(client, token, experience, "EUR", (GuestType.Adult, 4500));

        // Bu kapı kapalı olmasaydı para birimi kilidinin bypass'ı olurdu: sil,
        // yeniden yaz, para birimi değişti.
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Delete, $"{BasePath}/{experience}/pricing", token);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await RuleRowsAsync(experience)).ShouldNotBeEmpty();
    }

    [Fact]
    public async Task TaslakIlanda_FiyatSILINEBILIR_VeIdempotent()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 4500));

        (await MediaApi.SendAsync(client, HttpMethod.Delete, $"{BasePath}/{draft}/pricing", token))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await RuleRowsAsync(draft)).ShouldBeEmpty();

        // İstenen durum zaten sağlanmışsa ikinci çağrı da başarılı.
        (await MediaApi.SendAsync(client, HttpMethod.Delete, $"{BasePath}/{draft}/pricing", token))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task TaslakIlanda_ParaBirimiDEGISTIRILEBILIR()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, token);

        await SetPricingAsync(client, token, draft, "EUR", (GuestType.Adult, 4500));
        var response = await SetPricingAsync(client, token, draft, "USD", (GuestType.Adult, 4500));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Kural satırları da yeni para birimine geçmeli: sayfa USD derken satır EUR
        // kalsaydı toplam iki para biriminden toplanırdı.
        (await RuleRowsAsync(draft)).ShouldAllBe(x => x.UnitPrice.Currency == "USD");
    }

    [Fact]
    public async Task BaskaHostunFiyati_404()
    {
        var client = factory.CreateClient();
        var owner = await NewHostTokenAsync(client);
        var draft = await DraftAsync(client, owner);

        var stranger = await NewHostTokenAsync(client);

        (await SetPricingAsync(client, stranger, draft, "EUR", (GuestType.Adult, 4500)))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // -----------------------------------------------------------------------

    private async Task<string> NewHostTokenAsync(HttpClient client)
    {
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());
        var response = await MediaApi.SendAsync(client, HttpMethod.Post, ActivatePath, tokens.AccessToken);

        return (await response.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json))!.AccessToken;
    }

    private async Task<Guid> DraftAsync(HttpClient client, string token)
    {
        var response = await MediaApi.SendAsync(
            client, HttpMethod.Post, BasePath, token, new { originalLanguage = "tr" });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var draft = (await response.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!;

        var izmir = await factory.QueryAsync(db => db.Cities
            .AsNoTracking().Where(x => x.Slug == "izmir").Select(x => x.Id).FirstAsync());

        await MediaApi.SendAsync(
            client, HttpMethod.Patch, $"{BasePath}/{draft.Id}", token,
            new { cityId = izmir, categorySlug = "food-drink", durationMinutes = 120, capacity = 8 });

        return draft.Id;
    }

    /// <summary>Yayına hazır ve YAYINLANMIŞ ilan — para birimi kilidi ancak burada test edilebiliyor.</summary>
    private async Task<Guid> PublishedAsync(HttpClient client, string token)
    {
        var id = await DraftAsync(client, token);

        await MediaApi.SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{id}/translations/tr", token,
            new { title = "İzmir Mutfak Turu", description = "Açıklama metni." });

        await MediaApi.UploadAsync(client, token, id);

        var published = await MediaApi.SendAsync(
            client, HttpMethod.Post, $"{BasePath}/{id}/publish", token);

        published.StatusCode.ShouldBe(HttpStatusCode.OK);

        return id;
    }

    private static Task<HttpResponseMessage> SetPricingAsync(
        HttpClient client,
        string token,
        Guid experienceId,
        string currency,
        params (GuestType Tier, long AmountMinor)[] rules)
        => MediaApi.SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{experienceId}/pricing", token,
            new
            {
                currency,
                // Kademe adı KÜÇÜK HARF gidiyor: gerçek istemci de öyle gönderecek
                // ve sözleşmenin o hâlini sınamak istiyoruz.
                rules = rules
                    .Select(x => new
                    {
                        guestType = x.Tier.ToString().ToLowerInvariant(),
                        unitAmountMinor = x.AmountMinor,
                    })
                    .ToArray(),
            });

    private Task<List<PriceRule>> RuleRowsAsync(Guid experienceId)
        => factory.QueryAsync(db =>
            (from rule in db.PriceRules.AsNoTracking()
             join page in db.ExperiencePrices.AsNoTracking() on rule.ExperiencePriceId equals page.Id
             where page.ExperienceId == experienceId
             select rule).ToListAsync());
}
