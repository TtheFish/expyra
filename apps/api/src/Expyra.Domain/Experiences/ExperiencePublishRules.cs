namespace Expyra.Domain.Experiences;

/// <summary>
/// Yayınlanabilirlik kuralı. <b>Saf</b>: veritabanı görmez, tek girdisi bir
/// <see cref="Experience"/> satırı ve "orijinal dilde çeviri var mı" bilgisi. Bu yüzden
/// hem yayın ucunda hem de host listesinde AYNI kod çalışıyor — sihirbazın "yayınla"
/// düğmesini kapatan koşullar ile sunucunun reddettiği koşullar ayrışamıyor.
///
/// <para>Liste PLAN'ın saydığı koşullardan ibaret ve keyfî büyümüyor: Blok 5
/// kabul kriteri 1 dördünü, Blok 6 kabul kriteri 3 kapak görselini, Blok 7 ise
/// fiyatı ekliyor. Buraya PLAN'da yazmayan bir kural koymak yayın kapısını
/// sessizce genişletir — üç genişletmenin de gerekçesi ilgili satırda yazılı.</para>
///
/// <para><b>Süre sonradan koşul OLDU</b> ve bu bilinçli bir kapsam genişletmesi:
/// Blok 7 seansların bitiş saatini <see cref="Experience.DurationMinutes"/>'ten
/// hesaplıyor, yani süresi olmayan bir yayın takvimi kuramaz. Kapı kapatılmasaydı
/// yayında "0 dakika" süren ilanlar birikir ve Blok 7 onları geriye dönük
/// düzeltmek zorunda kalırdı — sahibi başka bir şeyle uğraşırken.</para>
/// </summary>
public static class ExperiencePublishRules
{
    /// <summary>
    /// Eksik olanların KOD listesi — cümle değil. İstemci bunlara bakıp ilgili adımı
    /// işaretliyor; kullanıcıya gösterilecek metin arayüz sözlüğünde (docs/I18N.md §1),
    /// sunucudan gelen metinde değil.
    ///
    /// <para>Sıra sabit: aynı eksik küme daima aynı diziyi üretsin, test ve arayüz
    /// sıralamaya güvenebilsin.</para>
    /// </summary>
    /// <param name="hasCoverMedia">
    /// <see cref="MediaStatus.Active"/> ve <see cref="ExperienceMedia.IsCover"/> olan bir
    /// satır var mı. <c>Pending</c> sayılmaz: imzalı adres alınmış ama yüklenmemiş bir
    /// görsel, kartta boş bir kutu demek.
    /// </param>
    /// <param name="hasPrice">
    /// Fiyat sayfası VE en az bir kademe satırı var mı. Yalnız sayfanın varlığı
    /// yetmiyor: kural satırı olmayan bir sayfa "fiyat girilmedi" demek.
    /// </param>
    public static IReadOnlyList<string> Missing(
        Experience experience,
        bool hasOriginalLanguageTranslation,
        bool hasCoverMedia,
        bool hasPrice)
    {
        ArgumentNullException.ThrowIfNull(experience);

        var missing = new List<string>(5);

        // docs/I18N.md §2: OriginalLanguage için çeviri satırı ZORUNLU — fallback
        // zincirinin sonu o satır. Yoksa bazı dillerde ilan tamamen boş görünür.
        if (!hasOriginalLanguageTranslation)
        {
            missing.Add(ExperiencePublishRequirement.Translation);
        }

        if (experience.CityId is null)
        {
            missing.Add(ExperiencePublishRequirement.City);
        }

        if (string.IsNullOrEmpty(experience.CategorySlug))
        {
            missing.Add(ExperiencePublishRequirement.Category);
        }

        // "> 0", ">= 0" değil: kapasitesi sıfır olan ilan, ilk rezervasyon denemesinde
        // dolu görünür — yani yayınlanmış ama satın alınamaz bir şey.
        if (experience.Capacity <= 0)
        {
            missing.Add(ExperiencePublishRequirement.Capacity);
        }

        // Taslakta 0 = "henüz girilmedi" (Experience.DurationMinutes). Blok 7 seansın
        // bitiş saatini bundan türetiyor; süresiz bir ilan takvim kuramaz.
        if (experience.DurationMinutes <= 0)
        {
            missing.Add(ExperiencePublishRequirement.Duration);
        }

        // PLAN Blok 6 kabul kriteri 3. Görselsiz ilan listede gri bir kutu olarak durur
        // ve paylaşıldığında önizlemesi boş çıkar; "yayında ama kimse tıklamıyor" tam
        // olarak böyle doğar. Kapağı zorunlu kılmak, kapıyı geçen her ilanın en azından
        // görünebilir olmasını garanti ediyor.
        if (!hasCoverMedia)
        {
            missing.Add(ExperiencePublishRequirement.Cover);
        }

        // PLAN Blok 7. Fiyatsız bir ilan yayınlanabiliyordu ve sonucu şuydu: kart
        // fiyatsız görünüyor, misafir tarih seçiyor, teklif ucu 409 veriyor. Yani
        // yayında ama SATIN ALINAMAZ bir şey — kapasitenin sıfır olmasıyla aynı
        // sınıfta bir kusur ve o zaten kapıda.
        //
        // PLAN bu kararı açıkça vermemişti; kapı burada kapanıyor çünkü Blok 9
        // rezervasyonu fiyatın üzerine kuracak ve o gün fiyatsız yayınlar geriye
        // dönük düzeltilmek zorunda kalırdı — süre koşulunun eklenmesiyle aynı
        // gerekçe.
        if (!hasPrice)
        {
            missing.Add(ExperiencePublishRequirement.Price);
        }

        return missing;
    }

    public static bool CanPublish(
        Experience experience,
        bool hasOriginalLanguageTranslation,
        bool hasCoverMedia,
        bool hasPrice)
        => Missing(experience, hasOriginalLanguageTranslation, hasCoverMedia, hasPrice).Count == 0;
}

/// <summary>
/// Yayın koşullarının kararlı kodları. Sabit string, enum değil: değer istemciye
/// gidiyor ve arayüz sözlüğünde <c>experience.publish.missing.city</c> gibi bir
/// anahtara eşleniyor — enum yeniden adlandırıldığında derleyici sunucuyu düzeltir
/// ama dolaşımdaki istemciyi düzeltmez (<c>UserRole</c> ile aynı gerekçe).
/// </summary>
public static class ExperiencePublishRequirement
{
    /// <summary><see cref="Experience.OriginalLanguage"/> için çeviri satırı yok.</summary>
    public const string Translation = "translation";

    public const string City = "city";

    public const string Category = "category";

    /// <summary>Kapasite 0 (ya da negatif).</summary>
    public const string Capacity = "capacity";

    /// <summary>Kapak olarak işaretlenmiş, doğrulanmış bir görsel yok.</summary>
    public const string Cover = "cover";

    /// <summary>Süre hiç girilmemiş (0). Blok 7 seans bitişini bundan hesaplıyor.</summary>
    public const string Duration = "duration";

    /// <summary>Fiyat hiç girilmemiş. Fiyatsız ilan yayında görünür ama satın alınamaz.</summary>
    public const string Price = "price";
}
