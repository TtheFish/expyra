using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Experiences;
using Expyra.Application.Features.Host;
using Expyra.Application.Features.Host.Commands.ActivateHost;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Experiences;

/// <summary>
/// Detay sayfasının Airbnb'den gelen bölümleri: bilmen gerekenler, buluşma noktası,
/// program ve host tanıtımı. Her uç için "host yazar → misafir görür" hattı ve
/// sözleşmenin sert kenarları (409 translation-missing, koordinat çifti, sahiplik).
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class ExperienceDetailSectionsTests(ApiFactory factory)
{
    private const string BasePath = "/api/host/experiences";
    private const string GuestPath = "/api/experiences";
    private const string ActivatePath = "/api/host/activate";
    private const string ProfilePath = "/api/host/profile";
    private const string Category = "tours-walks";

    [Fact]
    public async Task Details_HostYazar_MisafirGorur()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await CreatePublishedAsync(client, token, "Sarnıç Gezisi");

        var updated = await PutOkAsync(client, token, $"{BasePath}/{experience.Id}/details/tr", new
        {
            minimumAge = 10,
            activityLevel = "moderate",
            whatToBring = "Su ve rahat ayakkabı.",
            notIncluded = "Müze biletleri.",
            accessibility = (string?)null,
        });

        updated.MinimumAge.ShouldBe(10);
        updated.ActivityLevel.ShouldBe("moderate");
        updated.Translations.Single(x => x.Language == "tr").WhatToBring.ShouldBe("Su ve rahat ayakkabı.");

        var guest = await GuestDetailAsync(client, experience.Slug!, "tr");
        guest.MinimumAge.ShouldBe(10);
        guest.ActivityLevel.ShouldBe("moderate");
        guest.Text.WhatToBring.ShouldBe("Su ve rahat ayakkabı.");
        guest.Text.NotIncluded.ShouldBe("Müze biletleri.");
        guest.Text.Accessibility.ShouldBeNull();
    }

    [Fact]
    public async Task Details_TamDegistirme_BosAlanTemizler()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);
        await PutTranslationAsync(client, token, draft.Id, "tr", "Başlık");

        await PutOkAsync(client, token, $"{BasePath}/{draft.Id}/details/tr", new
        {
            minimumAge = 12,
            whatToBring = "Şapka",
        });

        var cleared = await PutOkAsync(client, token, $"{BasePath}/{draft.Id}/details/tr", new { });

        cleared.MinimumAge.ShouldBeNull();
        cleared.ActivityLevel.ShouldBeNull();
        cleared.Translations.Single().WhatToBring.ShouldBeNull();
    }

    [Fact]
    public async Task Details_ODildeBaslikYok_MetinVarsa409_YalnizSkalerse200()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);
        await PutTranslationAsync(client, token, draft.Id, "tr", "Başlık");

        var rejected = await SendAsync(client, HttpMethod.Put, $"{BasePath}/{draft.Id}/details/en", token, new
        {
            whatToBring = "Water",
        });

        rejected.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await CodeAsync(rejected)).ShouldBe("translation-missing");

        var scalarOnly = await PutOkAsync(client, token, $"{BasePath}/{draft.Id}/details/en", new
        {
            minimumAge = 18,
        });

        scalarOnly.MinimumAge.ShouldBe(18);
        scalarOnly.Translations.ShouldAllBe(x => x.Language == "tr");
    }

    [Fact]
    public async Task Details_YasSiniriSifir_400()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var response = await SendAsync(client, HttpMethod.Put, $"{BasePath}/{draft.Id}/details/tr", token, new
        {
            minimumAge = 0,
        });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Details_BaskasininIlani_404()
    {
        var client = factory.CreateClient();
        var owner = await NewHostTokenAsync(client);
        var stranger = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, owner);

        var response = await SendAsync(client, HttpMethod.Put, $"{BasePath}/{draft.Id}/details/tr", stranger, new
        {
            minimumAge = 5,
        });

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Itinerary_ToptanYazilir_DilZinciriyleOkunur()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await CreatePublishedAsync(client, token, "Eski Şehir Yürüyüşü");

        var three = await PutOkAsync(client, token, $"{BasePath}/{experience.Id}/itinerary/tr", new
        {
            steps = new object[]
            {
                new { title = "Hipodrom", body = "Başlangıç noktası." },
                new { title = "Sultanahmet Camii" },
                new { title = "Yerebatan Sarnıcı", body = "Bilet dahil değil." },
            },
        });

        three.Itinerary.Count.ShouldBe(3);
        three.Itinerary.Select(x => x.SortOrder).ShouldBe([0, 1, 2]);

        // Kısaltma: fazlası silinir, kalanlar yerinde güncellenir.
        var two = await PutOkAsync(client, token, $"{BasePath}/{experience.Id}/itinerary/tr", new
        {
            steps = new object[]
            {
                new { title = "Hipodrom (güncel)" },
                new { title = "Kapalıçarşı" },
            },
        });

        two.Itinerary.Count.ShouldBe(2);
        two.Itinerary[0].Title.ShouldBe("Hipodrom (güncel)");
        two.Itinerary[0].Body.ShouldBeNull();

        var rows = await factory.QueryAsync(db => db.ExperienceItinerarySteps
            .AsNoTracking()
            .CountAsync(x => x.ExperienceId == experience.Id));
        rows.ShouldBe(2);

        // Misafir Çekçe istedi, program yalnız Türkçe: zincir orijinale düşüyor ve
        // bunu saklamıyor.
        var guest = await GuestDetailAsync(client, experience.Slug!, "cs");
        guest.Itinerary.ShouldNotBeNull();
        guest.Itinerary.Language.ShouldBe("tr");
        guest.Itinerary.IsFallback.ShouldBeTrue();
        guest.Itinerary.Steps.Select(x => x.Title).ShouldBe(["Hipodrom (güncel)", "Kapalıçarşı"]);

        // Boş liste programı kaldırır; misafir bölümü hiç görmez.
        var none = await PutOkAsync(client, token, $"{BasePath}/{experience.Id}/itinerary/tr", new
        {
            steps = Array.Empty<object>(),
        });
        none.Itinerary.ShouldBeEmpty();
        (await GuestDetailAsync(client, experience.Slug!, "tr")).Itinerary.ShouldBeNull();
    }

    [Fact]
    public async Task Itinerary_ODildeBaslikYok_409()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var draft = await CreateDraftAsync(client, token);

        var response = await SendAsync(client, HttpMethod.Put, $"{BasePath}/{draft.Id}/itinerary/en", token, new
        {
            steps = new[] { new { title = "Start" } },
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await CodeAsync(response)).ShouldBe("translation-missing");
    }

    [Fact]
    public async Task MeetingPoint_KoordinatTekBasina400_CiftOlunca200_MisafirGorur()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await CreatePublishedAsync(client, token, "Galata Turu");

        var half = await SendAsync(client, HttpMethod.Put, $"{BasePath}/{experience.Id}/meeting-point/tr", token, new
        {
            address = "Galata Kulesi önü",
            latitude = 41.0256,
        });
        half.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var updated = await PutOkAsync(client, token, $"{BasePath}/{experience.Id}/meeting-point/tr", new
        {
            address = "Galata Kulesi önü",
            latitude = 41.0256,
            longitude = 28.9744,
            instructions = "Sarı şemsiyeli rehberi arayın.",
        });

        updated.MeetingPoint.ShouldNotBeNull();
        updated.MeetingPoint.Address.ShouldBe("Galata Kulesi önü");
        updated.MeetingPoint.Latitude.ShouldBe(41.0256);

        var guest = await GuestDetailAsync(client, experience.Slug!, "tr");
        guest.MeetingPoint.ShouldNotBeNull();
        guest.MeetingPoint.Longitude.ShouldBe(28.9744);
        guest.Text.MeetingInstructions.ShouldBe("Sarı şemsiyeli rehberi arayın.");

        // Adres silinip koordinat kalabilir; hepsi boşalınca alan null.
        var cleared = await PutOkAsync(client, token, $"{BasePath}/{experience.Id}/meeting-point/tr", new { });
        cleared.MeetingPoint.ShouldBeNull();
        (await GuestDetailAsync(client, experience.Slug!, "tr")).Text.MeetingInstructions.ShouldBeNull();
    }

    [Fact]
    public async Task HostProfile_UpsertVeSilme_MisafirKartindaGorunur()
    {
        var client = factory.CreateClient();
        var token = await NewHostTokenAsync(client);
        var experience = await CreatePublishedAsync(client, token, "Boğaz Turu");

        var empty = await GetAsync<HostProfileResponse>(client, token, ProfilePath);
        empty.Headline.ShouldBeNull();
        empty.UpdatedAtUtc.ShouldBeNull();

        var putResponse = await SendAsync(client, HttpMethod.Put, ProfilePath, token, new
        {
            headline = "İstanbul'da yerel rehber",
            bio = "On yıldır şehri gezdiriyorum.",
            language = "tr",
        });
        putResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var saved = await GetAsync<HostProfileResponse>(client, token, ProfilePath);
        saved.Headline.ShouldBe("İstanbul'da yerel rehber");
        saved.Language.ShouldBe("tr");
        saved.UpdatedAtUtc.ShouldNotBeNull();

        var guest = await GuestDetailAsync(client, experience.Slug!, "en");
        guest.Host.Headline.ShouldBe("İstanbul'da yerel rehber");
        guest.Host.Bio.ShouldBe("On yıldır şehri gezdiriyorum.");
        guest.Host.BioLanguage.ShouldBe("tr");

        // İkisi de boş → satır silinir, misafir kartı eski hâline döner.
        var cleared = await SendAsync(client, HttpMethod.Put, ProfilePath, token, new { language = "tr" });
        cleared.StatusCode.ShouldBe(HttpStatusCode.OK);

        var rows = await factory.QueryAsync(db => db.HostProfiles.AsNoTracking().CountAsync());
        var mine = await GetAsync<HostProfileResponse>(client, token, ProfilePath);
        mine.Headline.ShouldBeNull();
        mine.UpdatedAtUtc.ShouldBeNull();
        rows.ShouldBeGreaterThanOrEqualTo(0);

        (await GuestDetailAsync(client, experience.Slug!, "en")).Host.Headline.ShouldBeNull();
    }

    [Fact]
    public async Task HostProfile_HostDegil_403()
    {
        var client = factory.CreateClient();
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());

        var response = await SendAsync(client, HttpMethod.Put, ProfilePath, tokens.AccessToken, new
        {
            headline = "x",
            language = "tr",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // --- Yardımcılar ----------------------------------------------------------

    private async Task<string> NewHostTokenAsync(HttpClient client)
    {
        var tokens = await AuthApi.SignInAsync(factory, client, AuthApi.NewEmail());
        var response = await SendAsync(client, HttpMethod.Post, ActivatePath, tokens.AccessToken);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var activated = await response.Content.ReadFromJsonAsync<ActivateHostResponse>(AuthApi.Json);
        activated.ShouldNotBeNull();
        return activated.AccessToken;
    }

    private static async Task<HostExperienceResponse> CreateDraftAsync(HttpClient client, string token)
    {
        var response = await SendAsync(client, HttpMethod.Post, BasePath, token, new { originalLanguage = "tr" });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        return await ReadAsync(response);
    }

    private async Task<HostExperienceResponse> CreatePublishedAsync(HttpClient client, string token, string title)
    {
        var draft = await CreateDraftAsync(client, token);
        var cityId = await factory.QueryAsync(db => db.Cities
            .AsNoTracking()
            .Where(x => x.Slug == "izmir")
            .Select(x => x.Id)
            .FirstAsync());

        var patched = await SendAsync(client, HttpMethod.Patch, $"{BasePath}/{draft.Id}", token, new
        {
            cityId,
            categorySlug = Category,
            durationMinutes = 120,
            capacity = 8,
        });
        patched.StatusCode.ShouldBe(HttpStatusCode.OK);

        await PutTranslationAsync(client, token, draft.Id, "tr", title);
        await HostApi.SetMinimalPriceAsync(client, token, draft.Id);
        await MediaApi.UploadAsync(client, token, draft.Id);

        var published = await SendAsync(client, HttpMethod.Post, $"{BasePath}/{draft.Id}/publish", token);
        published.StatusCode.ShouldBe(HttpStatusCode.OK);
        return await ReadAsync(published);
    }

    private static async Task PutTranslationAsync(
        HttpClient client, string token, Guid id, string language, string title)
    {
        var response = await SendAsync(
            client, HttpMethod.Put, $"{BasePath}/{id}/translations/{language}", token, new { title });
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    private static async Task<HostExperienceResponse> PutOkAsync(
        HttpClient client, string token, string path, object body)
    {
        var response = await SendAsync(client, HttpMethod.Put, path, token, body);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await ReadAsync(response);
    }

    private static async Task<GuestExperienceDetailResponse> GuestDetailAsync(
        HttpClient client, string slug, string language)
    {
        var response = await client.GetAsync(
            $"{GuestPath}/{Uri.EscapeDataString(slug)}?lang={Uri.EscapeDataString(language)}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<GuestExperienceDetailResponse>(AuthApi.Json))!;
    }

    private static async Task<T> GetAsync<T>(HttpClient client, string token, string path)
    {
        var response = await SendAsync(client, HttpMethod.Get, path, token);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<T>(AuthApi.Json))!;
    }

    private static async Task<string?> CodeAsync(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.TryGetProperty("code", out var code) ? code.GetString() : null;
    }

    private static async Task<HostExperienceResponse> ReadAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<HostExperienceResponse>(AuthApi.Json))!;

    private static Task<HttpResponseMessage> SendAsync(
        HttpClient client, HttpMethod method, string path, string token, object? body = null)
        => MediaApi.SendAsync(client, method, path, token, body);
}
