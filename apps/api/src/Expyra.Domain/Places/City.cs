using Expyra.Domain.Common;

namespace Expyra.Domain.Places;

/// <summary>
/// Deneyimin geçtiği şehir. Serbest metin şehir alanı bu satırla değişti — aynı şehrin
/// "Prag", "prague", "Praha 1" gibi on yazımı tek satırda toplanıyor.
///
/// <para><b>Neden Guid PK, doğal anahtar değil</b> (<see cref="Country"/>'nin tersi):
/// şehir adı düzeltilebilir, birleştirilebilir, ülke değiştirebilir. <c>experience</c>
/// ve ileride <c>booking</c> buraya FK ile bağlanacak; kimliğin metinden bağımsız
/// olması gerekiyor. Doğal anahtar yine de var — <c>(CountryCode, Slug)</c> benzersiz
/// ve seed'in idempotent olmasını bu çift sağlıyor (Id'yi yeniden üretmiyoruz).</para>
/// </summary>
public sealed class City : BaseEntity
{
    /// <summary>Şehir adı sütun genişliği. En uzun gerçek adlar 60 karakterin altında.</summary>
    public const int MaxNameLength = 120;

    /// <summary>IANA saat dilimi kimliği için sütun genişliği ("America/Argentina/ComodRivadavia" 35).</summary>
    public const int MaxTimeZoneIdLength = 64;

    public required string CountryCode { get; set; }

    /// <summary>
    /// Doğal anahtarın metin yarısı: <c>prague</c>, <c>istanbul</c>, <c>cesky-krumlov</c>.
    /// Seed dosyasında AÇIKÇA yazılı, addan türetilmiyor: bir yazım düzeltmesi şehrin
    /// kimliğini değiştirip seed'i yeni satır yazmaya itmemeli.
    /// </summary>
    public required string Slug { get; set; }

    /// <summary>
    /// Yerel ad (endonim): "Praha", "İstanbul", "Wien", "København". Yerinde doğru olan
    /// ve eskimeyen ad budur; arayüz kullanıcının dilinde bir karşılık bulamazsa bunu gösterir.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// İngilizce exonim: "Prague", "Istanbul", "Vienna", "Copenhagen".
    /// <see cref="Country.EnglishName"/> ile aynı gerekçe — deterministik sıralama ve
    /// <c>en</c> arayüzünün gösterdiği ad.
    /// </summary>
    public required string EnglishName { get; set; }

    /// <summary>
    /// IANA saat dilimi ("Europe/Prague"). Deneyimin saat dilimi buradan TÜREYECEK
    /// (Blok 7); istemcinin saatinden asla türetilmez. Windows kimlikleri
    /// ("W. Europe Standard Time") YAZILMAZ: taşınabilir değil ve Postgres tanımaz.
    /// </summary>
    public required string TimeZoneId { get; set; }

    /// <summary>
    /// Enlem. Bu blokta hiçbir sorgu kullanmıyor; coğrafi yakınlık Blok 8'in işi
    /// (PLAN: "koordinat burada saklanıyor"). Bu yüzden coğrafi index de YOK —
    /// sorgusu olmayan index yazılmaz; PostGIS/earthdistance kararı o blokta verilir.
    /// </summary>
    public double Latitude { get; set; }

    /// <summary>Boylam. Bkz. <see cref="Latitude"/>.</summary>
    public double Longitude { get; set; }

    public Country? Country { get; set; }

    /// <summary>Aranabilir yazımlar — <see cref="CityAlias"/>.</summary>
    public ICollection<CityAlias> Aliases { get; } = [];
}
