namespace Expyra.Domain.Catalog;

/// <summary>
/// Deneyim kategorisi. <b>Tabloda yalnızca slug var — ad ve açıklama YOK.</b>
///
/// <para>Gerekçe (docs/I18N.md §1'in doğru uygulanışı): kategori adı <b>bizim
/// metnimiz</b>, host'un içeriği değil. Bizim yazdığımız her metnin yeri Blok 3'ün
/// sözlüğü: <c>category.foodDrink</c> anahtarı eksikse <c>pnpm check</c> KIRILIR.
/// Aynı metni veritabanına koysaydık eksik çeviri çalışma anında boş etiket olurdu ve
/// yeni bir arayüz dili açmak veri göçü isterdi. Slug hem birincil anahtar hem de
/// sözlük anahtarının kaynağıdır.</para>
///
/// <para><b>Bunun bedeli ve sözleşmesi:</b> bu tabloya sözlükte karşılığı olmayan bir
/// slug eklemek arayüzde etiketsiz bir kategori üretir. Yeni kategori = bir satır +
/// bir sözlük anahtarı, ikisi aynı PR'da.</para>
/// </summary>
public sealed class Category
{
    /// <summary>Slug sütun genişliği. Gerçek slug'lar 20 karakterin altında.</summary>
    public const int MaxSlugLength = 40;

    /// <summary>
    /// Küçük harf, tire ayraçlı: <c>food-drink</c>, <c>nature-outdoors</c>.
    /// URL'de ve sözlük anahtarında görünüyor, bu yüzden kalıcı — bir kategoriyi
    /// yeniden adlandırmak yerine yenisini açıp eskisini <see cref="IsActive"/> ile
    /// kapatıyoruz.
    /// </summary>
    public required string Slug { get; set; }

    /// <summary>
    /// Listeleme sırası. Alfabetik sıralama her dilde farklı ve hiçbirinde anlamlı
    /// değil ("sanat" ile "art" aynı satır, farklı harf); sıra bir ürün kararı.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Kapalı kategori yeni deneyimde seçilemez ama mevcut satırlara FK olarak bağlı
    /// kalır. Silmek, o kategoriye bağlı deneyimleri yetim bırakırdı
    /// (<c>Language.ContentAllowed</c> ile aynı kalıp).
    /// </summary>
    public bool IsActive { get; set; } = true;
}
