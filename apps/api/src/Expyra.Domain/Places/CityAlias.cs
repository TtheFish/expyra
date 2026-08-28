namespace Expyra.Domain.Places;

/// <summary>
/// Bir şehrin aranabilir yazımlarından biri. "Praha", "Prague", "Prag" üçü de aynı
/// <see cref="City"/> satırına bağlı üç alias'tır ve üçü de aynı sonucu döndürür.
///
/// <para><b>Şehir adının çok dilliliğine verilen cevap budur</b> (docs/I18N.md bunu
/// kapsamıyor; karar bu blokta veriliyor, Blok 8'de fark edilmesin diye). Ayrı bir
/// <c>city_translation</c> tablosu KURULMADI çünkü asıl ihtiyaç <b>bulmak</b>:
/// Çek "Praha", Alman ve Türk "Prag", İngiliz "Prague" yazar. Gösterim tarafı
/// <see cref="City.Name"/> (endonim) + <see cref="City.EnglishName"/> ile karşılanıyor;
/// dil başına gösterim adı gerçekten gerekirse bu tabloya bir dil sütunu eklenir —
/// bugün eklemek, hiçbir sorgunun okumadığı bir sütun yazmak olurdu.</para>
///
/// <para><b>Neden ayrı satır, dizi sütunu değil:</b> önek index'i ancak satır başına
/// bir metinle çalışır. <c>text[]</c> sütununda GIN index'i eşitlik arar, "praha ile
/// başlayan" aramasını hızlandırmaz.</para>
/// </summary>
public sealed class CityAlias
{
    public Guid CityId { get; set; }

    /// <summary>
    /// Aramanın gerçekten karşılaştırdığı anahtar: <c>SearchText.Fold(DisplayName)</c>.
    /// Birincil anahtarın parçası — aynı şehir için aynı katlanmış metin iki kez giremez
    /// ("Istanbul" ve "İstanbul" aynı satıra düşer, seed ikisini de yazmaz.)
    ///
    /// <para>Sütun <c>COLLATE "C"</c> ile saklanıyor: düz btree index'i böylece
    /// <c>LIKE 'önek%'</c> taramasında kullanılabiliyor, <c>pg_trgm</c>/<c>unaccent</c>
    /// eklentisine gerek kalmıyor (gerekçe: <see cref="Common.SearchText"/>).</para>
    /// </summary>
    public required string NormalizedName { get; set; }

    /// <summary>
    /// Katlanmadan önceki hâli. Hiçbir sorgu bunu okumuyor; alias verisi bozulduğunda
    /// "bu satırı hangi isim üretti" sorusunu cevaplayan tek şey bu — seed türetilmiş
    /// satırlar da yazıyor ("New York" → "york") ve köken görünmezse ayıklanamaz.
    /// </summary>
    public required string DisplayName { get; set; }

    public City? City { get; set; }
}
