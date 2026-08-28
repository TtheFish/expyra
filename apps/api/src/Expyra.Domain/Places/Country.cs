namespace Expyra.Domain.Places;

/// <summary>
/// Ülke kayıt defteri (ISO 3166-1 alpha-2). Kalıp: <see cref="Languages.Language"/> —
/// doğal anahtar, Guid PK yok; <c>city.country_code = 'CZ'</c> hem okunabilir hem de
/// seed verisi kopular arasında deterministik kalıyor.
///
/// <para><b>Yerelleştirilmiş ad SAKLANMIYOR — bilinçli karar (docs/I18N.md §1).</b>
/// Ülke adı ne host'un içeriği ne de bizim yazdığımız arayüz metni: ISO/CLDR'nin
/// standart sözlüğü ve o sözlük hem tarayıcıda hem sunucuda ZATEN var
/// (<c>Intl.DisplayNames(locale, { type: 'region' }).of('CZ')</c>,
/// .NET tarafında <c>RegionInfo</c>). 250 ülkeyi Blok 3'ün sözlüğüne yazmak, her yeni
/// arayüz dilinde 250 satırlık bir çeviri borcu üretirdi; koda gömmek ise CLDR
/// güncellendiğinde ("Türkiye", "Czechia", "Eswatini") bizi yanlış adla bırakırdı.
/// İstemci kodu alır, adı kendi locale'inde çizer.</para>
///
/// <para>Bunun bir yan faydası: bu uç dile bağımlı bir yanıt üretmiyor, dolayısıyla
/// paylaşılan bir önbellek <c>Vary: Accept-Language</c> olmadan saklayabiliyor.</para>
/// </summary>
public sealed class Country
{
    /// <summary>ISO 3166-1 alpha-2, BÜYÜK harf. Doğrulama: <see cref="CountryCode"/>.</summary>
    public required string Code { get; set; }

    /// <summary>
    /// ISO'nun İngilizce kısa adı. Kullanıcıya gösterilecek ad DEĞİL (yukarıdaki nota
    /// bakın); yönetim ekranları, log ve <b>deterministik sıralama</b> için — kendi
    /// dilindeki ada göre sıralamak ICU collation ister ve sonuç sunucunun ayarına
    /// göre değişir (docs/I18N.md §4).
    /// </summary>
    public required string EnglishName { get; set; }

    public ICollection<City> Cities { get; } = [];
}
