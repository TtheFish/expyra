using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Expyra.Application.Features.Places.Queries.SearchCities;
using Expyra.IntegrationTests.Common;

namespace Expyra.IntegrationTests.Features.Places;

/// <summary>
/// PLAN Blok 4'ün 1., 2. ve 3. kabul kriterleri.
///
/// <para>Bu testler bilinçli olarak <b>integration</b>: aranan şey gerçek seed verisi,
/// gerçek <c>city_alias</c> satırları ve gerçek <c>LIKE 'önek%'</c> davranışı. Bellek
/// içi bir <c>IQueryable</c> üzerinde koşsalardı <c>COLLATE "C"</c> kararını,
/// index'i ve Postgres'in karşılaştırma kurallarını hiç sınamazlardı — yani tam da
/// yanlış gidebilecek kısmı.</para>
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class CitySearchTests(ApiFactory factory)
{
    private const string CitiesPath = "/api/places/cities";

    /// <summary>
    /// Kabul kriteri 1: "prag", "Praha" ve "Prague" AYNI şehir satırını döndürür.
    /// Üçü de <c>city_alias</c> üzerinden aynı <c>city.id</c>'ye çıkıyor.
    /// </summary>
    [Fact]
    public async Task PragPrahaPrague_AyniSatiriDondurur()
    {
        var client = factory.CreateClient();

        var viaGerman = await FindAsync(client, "prag");
        var viaCzech = await FindAsync(client, "Praha");
        var viaEnglish = await FindAsync(client, "Prague");

        var prague = viaCzech.ShouldHaveSingleItem();
        prague.Name.ShouldBe("Praha");
        prague.EnglishName.ShouldBe("Prague");
        prague.CountryCode.ShouldBe("CZ");
        prague.TimeZoneId.ShouldBe("Europe/Prague");

        viaEnglish.ShouldHaveSingleItem().Id.ShouldBe(prague.Id);

        // "prag" hem Almanca/Türkçe exonime hem de "prague" önekine uyuyor; sonuç
        // yine TEK satır olmalı — alias üzerinden değil şehir üzerinden sorguluyoruz.
        viaGerman.ShouldHaveSingleItem().Id.ShouldBe(prague.Id);
    }

    /// <summary>
    /// Türkçe i/I tuzağı: kullanıcı ASCII "istanbul" yazıyor, satırda "İstanbul" var.
    /// Postgres'in <c>lower()</c>'ı bu ikisini eşitlemez; katlama .NET'te yapıldığı için
    /// eşleşiyor (SearchText).
    /// </summary>
    [Theory]
    [InlineData("istanbul")]
    [InlineData("İstanbul")]
    [InlineData("ISTANBUL")]
    [InlineData("ıstanbul")]
    public async Task AksanVeBuyukHarfDuyarsiz_IstanbulBulunur(string query)
    {
        var client = factory.CreateClient();

        var cities = await FindAsync(client, query);

        cities.ShouldContain(x => x.Slug == "istanbul");
        cities.Single(x => x.Slug == "istanbul").Name.ShouldBe("İstanbul");
    }

    [Theory]
    [InlineData("plzen", "plzen")]
    [InlineData("Plzeň", "plzen")]
    [InlineData("krakow", "krakow")]
    [InlineData("Kraków", "krakow")]
    [InlineData("munchen", "munich")]
    [InlineData("München", "munich")]
    [InlineData("Munich", "munich")]
    public async Task AksanliVeAksansizYazim_AyniSehre_Cikar(string query, string expectedSlug)
    {
        var client = factory.CreateClient();

        var cities = await FindAsync(client, query);

        cities.ShouldContain(x => x.Slug == expectedSlug);
    }

    /// <summary>
    /// Çok kelimeli adlarda kelime başları da aranabiliyor: seed her kelime başı için
    /// ayrı bir alias satırı yazıyor, sorgu saf önek taraması olarak kalıyor.
    /// </summary>
    [Theory]
    [InlineData("krumlov", "cesky-krumlov")]
    [InlineData("hague", "the-hague")]
    [InlineData("napoca", "cluj-napoca")]
    public async Task KelimeBasindanArama(string query, string expectedSlug)
    {
        var client = factory.CreateClient();

        var cities = await FindAsync(client, query);

        cities.ShouldContain(x => x.Slug == expectedSlug);
    }

    /// <summary>Kabul kriteri 2: uç 20 satırdan uzun cevap dönmez.</summary>
    [Fact]
    public async Task Limit_YirmiSatirdanUzunCevapDonmez()
    {
        var client = factory.CreateClient();

        // Testin anlamlı olması için kaynakta 20'den FAZLA satır olmalı; aksi halde
        // "limit çalışıyor" iddiası boş bir tespit olurdu.
        var turkishCityCount = await factory.QueryAsync(db =>
            db.Cities.AsNoTracking().CountAsync(x => x.CountryCode == "TR"));

        turkishCityCount.ShouldBeGreaterThan(SearchCitiesQuery.MaxResults);

        var cities = await GetAsync(client, "?country=TR");

        cities.Count.ShouldBe(SearchCitiesQuery.MaxResults);
        cities.ShouldAllBe(x => x.CountryCode == "TR");
    }

    [Fact]
    public async Task UlkeFiltresi_KucukHarfleDeCalisir()
    {
        var client = factory.CreateClient();

        var cities = await GetAsync(client, "?q=pra&country=cz");

        cities.ShouldNotBeEmpty();
        cities.ShouldAllBe(x => x.CountryCode == "CZ");
    }

    [Fact]
    public async Task UlkeFiltresi_BaskaUlkedekiSehriElemeli()
    {
        var client = factory.CreateClient();

        var cities = await GetAsync(client, "?q=prag&country=TR");

        cities.ShouldBeEmpty();
    }

    /// <summary>
    /// Kabul kriteri 3: anlamsız ya da eksik ölçüt sunucuda SESSİZCE yok sayılmıyor.
    /// Yok sayılsaydı istemci filtreli bir sonuç sanırken rastgele 20 şehir alırdı.
    /// </summary>
    [Theory]
    [InlineData("")]                  // hiç ölçüt yok
    [InlineData("?q=p")]              // tek harf
    [InlineData("?q=%25")]            // katlandıktan sonra sıfır harf ('%')
    [InlineData("?country=CZE")]      // alpha-3 kodu
    public async Task GecersizOlcut_400Doner(string queryString)
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(CitiesPath + queryString, UriKind.Relative));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BilinmeyenSehir_BosListeDoner_HataDegil()
    {
        var client = factory.CreateClient();

        var cities = await FindAsync(client, "zzzqqq");

        cities.ShouldBeEmpty();
    }

    /// <summary>
    /// Anonim, kişisel veri taşımayan ve dile bağımlı olmayan bir yanıt — paylaşılan
    /// önbellek saklayabilmeli. Başlık düşerse autocomplete her tuşta API'ye gider.
    /// </summary>
    [Fact]
    public async Task OnbellekBasligi_PublicVeSureli()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(CitiesPath + "?q=praha", UriKind.Relative));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var cacheControl = response.Headers.CacheControl;

        cacheControl.ShouldNotBeNull();
        cacheControl.Public.ShouldBeTrue();
        cacheControl.MaxAge.ShouldNotBeNull();
        cacheControl.MaxAge!.Value.TotalSeconds.ShouldBeGreaterThan(0);
    }

    private static Task<List<CityResponse>> FindAsync(HttpClient client, string query)
        => GetAsync(client, "?q=" + Uri.EscapeDataString(query));

    private static async Task<List<CityResponse>> GetAsync(HttpClient client, string queryString)
    {
        var response = await client.GetAsync(new Uri(CitiesPath + queryString, UriKind.Relative));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return (await response.Content.ReadFromJsonAsync<List<CityResponse>>(AuthApi.Json))!;
    }
}
