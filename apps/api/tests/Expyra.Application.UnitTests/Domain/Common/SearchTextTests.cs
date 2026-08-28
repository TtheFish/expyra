using System.Globalization;
using Shouldly;
using Expyra.Domain.Common;

namespace Expyra.Application.UnitTests.Domain.Common;

/// <summary>
/// Şehir aramasının tamamı bu fonksiyonun üzerinde duruyor: <c>city_alias.normalized_name</c>
/// bunun çıktısı, kullanıcının yazdığı metin de aynı fonksiyondan geçiyor. İkisi ayrışırsa
/// arama sessizce boş döner — kırmızı test değil, "sonuç bulunamadı" ekranı.
/// </summary>
public sealed class SearchTextTests
{
    [Theory]
    [InlineData("Praha", "praha")]
    [InlineData("Prague", "prague")]
    [InlineData("Prag", "prag")]
    [InlineData("Plzeň", "plzen")]
    [InlineData("Český Krumlov", "cesky krumlov")]
    [InlineData("Kraków", "krakow")]
    [InlineData("Gdańsk", "gdansk")]
    [InlineData("München", "munchen")]
    [InlineData("Málaga", "malaga")]
    [InlineData("Göteborg", "goteborg")]
    [InlineData("Reykjavík", "reykjavik")]
    [InlineData("București", "bucuresti")]
    public void Fold_AksanDusurulur(string input, string expected)
    {
        SearchText.Fold(input).ShouldBe(expected);
    }

    /// <summary>
    /// Kabul kriteri 4'ün özü. "İ" (U+0130) NFD ile "I + birleşen nokta"ya ayrışıyor;
    /// işaret atılınca "I" kalıyor ve invariant küçültme "i" veriyor.
    ///
    /// <para>Postgres'in <c>lower()</c>'ı bunu YAPMIYOR: Türkçe olmayan bir collation
    /// altında "İ" → "i + birleşen nokta" olarak kalıyor ve "i" ile eşit çıkmıyor.
    /// Katlamanın .NET tarafında olmasının somut sebebi bu.</para>
    /// </summary>
    [Theory]
    [InlineData("İstanbul", "istanbul")]
    [InlineData("istanbul", "istanbul")]
    [InlineData("ISTANBUL", "istanbul")]
    [InlineData("ıstanbul", "istanbul")]        // noktasız ı ile yazan kullanıcı
    [InlineData("İzmir", "izmir")]
    [InlineData("Iğdır", "igdir")]
    [InlineData("Şanlıurfa", "sanliurfa")]
    [InlineData("Çanakkale", "canakkale")]
    public void Fold_TurkceIHarfiTuzagi(string input, string expected)
    {
        SearchText.Fold(input).ShouldBe(expected);
    }

    /// <summary>
    /// Kültüre duyarlı bir dönüşüm kullanılsaydı hata SADECE Türkçe locale'li makinede
    /// çıkardı — geliştiricinin makinesinde değil, sunucuda (LanguageCode.cs ile aynı tuzak).
    /// </summary>
    [Fact]
    public void Fold_TurkceKulturAltinda_AyniSonucuVerir()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            SearchText.Fold("ISTANBUL").ShouldBe("istanbul");   // Türkçe'de "ıstanbul" olurdu
            SearchText.Fold("İstanbul").ShouldBe("istanbul");
            SearchText.Fold("Innsbruck").ShouldBe("innsbruck");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    /// <summary>
    /// Unicode ayrıştırması bu harflere DOKUNMUYOR (kanonik ayrıştırmaları yok);
    /// elle açılmasalar "Straße" ile "Strasse" ayrı satır sayılırdı.
    /// </summary>
    [Theory]
    [InlineData("Straße", "strasse")]
    [InlineData("Ærøskøbing", "aeroskobing")]
    [InlineData("Łódź", "lodz")]
    [InlineData("Reykjavík Þingvellir", "reykjavik thingvellir")]
    [InlineData("Đakovo", "dakovo")]
    public void Fold_AyrisMayanHarflerAcilir(string input, string expected)
    {
        SearchText.Fold(input).ShouldBe(expected);
    }

    [Theory]
    [InlineData("  New   York  ", "new york")]
    [InlineData("Praha 1!", "praha 1")]
    [InlineData("Frankfurt am Main", "frankfurt am main")]
    [InlineData("Cluj-Napoca", "cluj napoca")]
    public void Fold_NoktalamaVeBosluk_TekBoslugaIner(string input, string expected)
    {
        SearchText.Fold(input).ShouldBe(expected);
    }

    /// <summary>
    /// LIKE joker karakterleri katlamadan sağ çıkmıyor — sorgu tarafında ayrı bir kaçış
    /// adımına gerek kalmamasının sebebi bu (SearchCitiesQueryHandler).
    /// </summary>
    [Theory]
    [InlineData("%", "")]
    [InlineData("pra%ha", "pra ha")]
    [InlineData("_", "")]
    [InlineData("'; drop table city; --", "drop table city")]
    public void Fold_JokerVeNoktalamaAyiklanir(string input, string expected)
    {
        SearchText.Fold(input).ShouldBe(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Fold_BosGirdi_BosDoner(string? input)
    {
        SearchText.Fold(input).ShouldBeEmpty();
    }

    [Fact]
    public void Fold_KiralAlfabesiCevrilmez_KendiAlfabesindeAranir()
    {
        // Transliterasyon katlama DEĞİL: "София" Kiril kalıyor, Latin karşılıkları
        // cities.json'da ayrı alias olarak duruyor.
        SearchText.Fold("София").ShouldBe("софия");
    }

    [Theory]
    [InlineData("Český Krumlov", "cesky-krumlov")]
    [InlineData("İzmir", "izmir")]
    [InlineData("Frankfurt am Main", "frankfurt-am-main")]
    [InlineData("The Hague", "the-hague")]
    public void ToSlug_KucukHarfAksansizTireli(string input, string expected)
    {
        SearchText.ToSlug(input).ShouldBe(expected);
    }

    /// <summary>
    /// Slug'ın kendisi katlanmış biçimde olduğu için ikinci kez katlanınca değişmemeli —
    /// seed doğrulaması (<c>ReferenceDataSeeder.RequireSlug</c>) tam olarak bunu kontrol ediyor.
    /// </summary>
    [Theory]
    [InlineData("cesky-krumlov")]
    [InlineData("istanbul")]
    [InlineData("the-hague")]
    [InlineData("food-drink")]
    public void ToSlug_ZatenSlugIseDegismez(string slug)
    {
        SearchText.ToSlug(slug).ShouldBe(slug);
    }
}
