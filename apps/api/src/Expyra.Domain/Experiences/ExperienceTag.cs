using Expyra.Domain.Common;

namespace Expyra.Domain.Experiences;

/// <summary>
/// Serbest etiket ("sunset", "vegan", "aile dostu"). <see cref="Experience.CategorySlug"/>
/// ile karıştırılmaz: kategori BİZİM kapalı listemiz ve adı arayüz sözlüğünde
/// (<c>Category</c> sınıf notu); etiket HOST'un kendi kelimesi, dolayısıyla içerik.
///
/// <para><b>Neden iki sütun</b> (<see cref="Places.CityAlias"/> kalıbının aynısı):
/// <see cref="NormalizedTag"/> eşleşmenin anahtarı (aksan ve büyük/küçük harf duyarsız),
/// <see cref="DisplayTag"/> host'un yazdığı hâl. Tek sütun tutulsaydı ya "Vegan" ile
/// "vegan" iki ayrı etiket olurdu ya da host'un yazımı kaybolurdu.</para>
///
/// <para>Etiketin dili YOK ve bu bilinçli: host hangi dilde yazarsa o kelime saklanır.
/// Etiketi çevrilebilir yapmak, host'tan her etiketi her dilde yazmasını istemek demek —
/// karşılığında alınan şey, kimsenin aramadığı bir kelimenin ikinci bir yazımı.</para>
/// </summary>
public sealed class ExperienceTag
{
    /// <summary>Host'un yazdığı hâlin sınırı. Etiket bir cümle değil, bir kelimedir.</summary>
    public const int MaxDisplayLength = 40;

    /// <summary>
    /// Katlanmış hâlin sütun genişliği — display'in İKİ KATI. <see cref="SearchText.Fold"/>
    /// bazı harfleri AÇIYOR (ß→ss, æ→ae), yani katlanmış metin girdiden uzun olabilir.
    /// Aynı sayı yazılsaydı yalnız Almanca/Danca etiketlerde taşma olurdu ve hata 400
    /// değil, DbUpdateException üzerinden 500 olarak çıkardı.
    /// </summary>
    public const int MaxNormalizedLength = MaxDisplayLength * 2;

    public Guid ExperienceId { get; set; }

    /// <summary>
    /// Bileşik anahtarın ikinci yarısı: aynı deneyime aynı etiket iki kez giremez.
    /// "Vegan" ve "vegan" aynı satır — anahtar katlanmış hâl olduğu için tekrar
    /// veritabanı tarafından engelleniyor, handler'da bir kontrolle değil.
    /// </summary>
    public required string NormalizedTag { get; set; }

    /// <summary>Gösterimde bu kullanılır, eşleşmede değil.</summary>
    public required string DisplayTag { get; set; }
}
