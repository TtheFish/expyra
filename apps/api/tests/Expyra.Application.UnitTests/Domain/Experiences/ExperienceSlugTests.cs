using System.Globalization;
using Shouldly;
using Expyra.Domain.Experiences;

namespace Expyra.Application.UnitTests.Domain.Experiences;

public sealed class ExperienceSlugTests
{
    [Theory]
    [InlineData("İzmir Gezisi", "izmir-gezisi")]
    [InlineData("Boğaz'da Gün Batımı Turu", "bogaz-da-gun-batimi-turu")]
    [InlineData("Praha: Staré Město", "praha-stare-mesto")]
    [InlineData("Straße & Gdańsk", "strasse-gdansk")]
    [InlineData("  çift   boşluk  ", "cift-bosluk")]
    public void BaseFrom_AksanDuserVeTekAyracKalir(string title, string expected)
        => ExperienceSlug.BaseFrom(title).ShouldBe(expected);

    [Fact]
    public void BaseFrom_TurkceKulturdeDeAyniSonucuVerir()
    {
        // TUZAK: Türkçe kültürde "İzmir".ToLower() → "i̇zmir" (i + birleşen nokta) verir.
        // Slug sunucunun kültür ayarına göre değişseydi hata testte değil PRODÜKSİYONDA
        // çıkardı — LanguageCode ve SearchText'teki aynı tuzak.
        var original = CultureInfo.CurrentCulture;

        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");

            ExperienceSlug.BaseFrom("İzmir Gezisi").ShouldBe("izmir-gezisi");
            ExperienceSlug.BaseFrom("IZMIR").ShouldBe("izmir");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("!!! ??? ...")]
    [InlineData("서울 산책")]
    public void BaseFrom_ASCIIde_HicbirSeyKalmazsa_YedekGovdeKullanilir(string title)
        // Latin dışı alfabe TRANSLITERE EDİLMİYOR (SearchText'in bilinçli kararı) ve
        // yüzde-kodlanmış bir URL paylaşılabilir olmaktan çıkar: gövde yedeğe düşüyor,
        // kimlik yine benzersiz çünkü sonek var.
        => ExperienceSlug.BaseFrom(title).ShouldBe(ExperienceSlug.FallbackBase);

    [Fact]
    public void BaseFrom_UzunBaslikKelimeSinirindanKesilir()
    {
        var title = string.Join(' ', Enumerable.Repeat("istanbul", 20));

        var result = ExperienceSlug.BaseFrom(title);

        result.Length.ShouldBeLessThanOrEqualTo(ExperienceSlug.MaxBaseLength);
        // Kelimenin ortasından kesilseydi anlamsız bir hece kalırdı ("istanb").
        result.ShouldNotEndWith("-");
        result.Split('-').ShouldAllBe(part => part == "istanbul");
    }

    [Fact]
    public void New_GovdeArtiSonekUretir()
    {
        var slug = ExperienceSlug.New("İzmir Gezisi");

        slug.ShouldStartWith("izmir-gezisi-");
        slug.Length.ShouldBe("izmir-gezisi-".Length + ExperienceSlug.SuffixLength);
        slug.Length.ShouldBeLessThanOrEqualTo(Experience.MaxSlugLength);
    }

    [Fact]
    public void NewSuffix_KarisanKarakterIcermez()
    {
        // 0/o ve 1/l/i alfabede yok: slug telefonda okunup elle yazılabiliyor.
        var suffixes = Enumerable.Range(0, 200).Select(_ => ExperienceSlug.NewSuffix()).ToList();

        suffixes.ShouldAllBe(x => x.Length == ExperienceSlug.SuffixLength);
        suffixes.ShouldAllBe(x => x.All(c => "23456789abcdefghjkmnpqrstuvwxyz".Contains(c, StringComparison.Ordinal)));

        // Rastgelelik gerçekten çalışıyor mu: 200 çekimde tek bir değere düşmesin.
        suffixes.Distinct(StringComparer.Ordinal).Count().ShouldBeGreaterThan(150);
    }
}
