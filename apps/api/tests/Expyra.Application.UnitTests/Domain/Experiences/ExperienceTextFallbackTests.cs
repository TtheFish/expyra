using Shouldly;
using Expyra.Domain.Experiences;

namespace Expyra.Application.UnitTests.Domain.Experiences;

/// <summary>
/// Fallback zincirinin HER adımı (docs/I18N.md §2, PLAN Blok 5 kabul kriteri 2).
///
/// <para>Zincir burada saf bir fonksiyon olduğu için her adım tek başına sınanabiliyor —
/// SQL'e gömülmüş bir <c>ORDER BY CASE</c> olsaydı bu testlerin karşılığı "üretilen SQL'i
/// okumak" olurdu ve yanlış bir dal hata değil, yalnızca yanlış dilde metin üretirdi.</para>
/// </summary>
public sealed class ExperienceTextFallbackTests
{
    [Fact]
    public void Candidates_BolgeliKod_DortAdim()
        // I18N §2'deki örnek zincirin birebir kendisi.
        => ExperienceTextFallback.Candidates("de-AT", "tr")
            .ShouldBe(["de-AT", "de", "tr", "en"]);

    [Fact]
    public void Candidates_BolgesizKod_KokAdimiAtlanir()
        // "de" zaten köksüz: ikinci adım yeni bir şey sormuyor.
        => ExperienceTextFallback.Candidates("de", "tr")
            .ShouldBe(["de", "tr", "en"]);

    [Fact]
    public void Candidates_DilIstenmedi_HostunDilindenBaslar()
        // İstenmemiş bir dil için "eşleşme yok" doğru olan: zincir doğrudan 3. adımdan
        // başlıyor, İngilizce'ye kaçmıyor.
        => ExperienceTextFallback.Candidates(null, "tr")
            .ShouldBe(["tr", "en"]);

    [Fact]
    public void Candidates_NormalizeEdilmemisKod_KanoniklestirilirIliskiKurulur()
        // "en_US" (Java/POSIX biçimi) normalize edilmeseydi zincir ilk adımda sessizce
        // düşerdi; ikinci adım da "en"i hiç bulamazdı.
        => ExperienceTextFallback.Candidates("en_us", "tr")
            .ShouldBe(["en-US", "en", "tr"]);

    [Theory]
    [InlineData("en", "tr", new[] { "en", "tr" })]
    [InlineData("tr", "tr", new[] { "tr", "en" })]
    public void Candidates_TekrarEdenKodBirKezGirer(
        string requested, string original, string[] expected)
        // Liste veritabanı filtresi olarak kullanılıyor: tekrar eden kod yanlış sonuç
        // vermez ama sorguya gereksiz bir parametre yazar ve "kaç dil sorduk" sorusunu
        // bulanıklaştırır.
        => ExperienceTextFallback.Candidates(requested, original).ShouldBe(expected);

    [Fact]
    public void Candidates_BozukKod_IstenmemisSayilir()
        => ExperienceTextFallback.Candidates("bu bir dil kodu değil", "tr")
            .ShouldBe(["tr", "en"]);

    [Fact]
    public void Candidates_OrijinalDilBos_Firlatir()
        // Zincirin çıpası: boşsa sessizce "en"e düşmek, host'un yazdığı metni kaybetmek olur.
        => Should.Throw<ArgumentException>(() => ExperienceTextFallback.Candidates("tr", "  "));

    // -----------------------------------------------------------------------
    // Resolve — zincirin hangi adımının kazandığı
    // -----------------------------------------------------------------------

    [Fact]
    public void Resolve_TamEslesme_IstenenDil()
        => ExperienceTextFallback.Resolve("de", "tr", ["tr", "de", "en"]).ShouldBe("de");

    [Fact]
    public void Resolve_KokEslesmesi_BolgesizKardes()
        // de-AT için ayrı çeviri tutulmuyor (I18N §1: bölge kodu sadece gerçekten
        // farklıysa) — Avusturyalı misafir Almanca metni görüyor.
        => ExperienceTextFallback.Resolve("de-AT", "tr", ["tr", "de", "en"]).ShouldBe("de");

    [Fact]
    public void Resolve_EslesmeYok_OrijinalDilIngilizceyiYENER()
        // Zincirin can alıcı yeri: host'un yazdığı Türkçe, elde İngilizce çeviri OLSA
        // BİLE önce geliyor. Sıra ters olsaydı, gezgin Fransızca isterken host'un
        // anlattığı deneyimi değil, onun makineden geçmiş özetini okurdu.
        => ExperienceTextFallback.Resolve("fr", "tr", ["tr", "en"]).ShouldBe("tr");

    [Fact]
    public void Resolve_OrijinalDildeSatirYok_SonCareIngilizce()
        // Yayın kapısı bu durumu üretemiyor (orijinal dilde çeviri zorunlu); adım,
        // veri elle bozulursa metnin boş kalmaması için duruyor.
        => ExperienceTextFallback.Resolve("fr", "cs", ["en"]).ShouldBe("en");

    [Fact]
    public void Resolve_HicbirAdayYok_Null()
        // Çağıran bunu 500'e çeviriyor: yayındaki bir ilanın metinsiz olması bozuk veri
        // demek ve boş başlık üretip gizlemek yasak (CLAUDE.md #1).
        => ExperienceTextFallback.Resolve("fr", "cs", ["de", "it"]).ShouldBeNull();

    [Fact]
    public void Resolve_KarsilastirmaOrdinal_BuyukHarfliSatirEslesmez()
        // Kayıt defterindeki kodlar normalize; "TR" diye bir satır varsa o bozuk veridir
        // ve kültüre duyarlı bir karşılaştırma onu Türkçe kuralda ('i' harfi) sunucunun
        // ayarına göre bazen eşleştirip bazen eşleştirmezdi.
        => ExperienceTextFallback.Resolve("tr", "tr", ["TR"]).ShouldBeNull();
}
