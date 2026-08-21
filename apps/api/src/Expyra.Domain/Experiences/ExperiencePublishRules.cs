namespace Expyra.Domain.Experiences;

/// <summary>
/// Yayınlanabilirlik kuralı. <b>Saf</b>: veritabanı görmez, tek girdisi bir
/// <see cref="Experience"/> satırı ve "orijinal dilde çeviri var mı" bilgisi. Bu yüzden
/// hem yayın ucunda hem de host listesinde AYNI kod çalışıyor — sihirbazın "yayınla"
/// düğmesini kapatan koşullar ile sunucunun reddettiği koşullar ayrışamıyor.
///
/// <para>Liste PLAN Blok 5 kabul kriteri 1'in TAM karşılığı ve bilerek daha uzun değil:
/// buraya bir kural daha eklemek (ör. süre girilmiş olmalı) yayın kapısını PLAN'ın
/// kapattığı kapsamın dışına taşır. Süre alanı doğrulanıyor ama YAZILDIĞI yerde —
/// <c>UpdateExperienceCommandValidator</c> sıfır ya da negatif süreyi zaten reddediyor.</para>
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
    public static IReadOnlyList<string> Missing(Experience experience, bool hasOriginalLanguageTranslation)
    {
        ArgumentNullException.ThrowIfNull(experience);

        var missing = new List<string>(4);

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

        return missing;
    }

    public static bool CanPublish(Experience experience, bool hasOriginalLanguageTranslation)
        => Missing(experience, hasOriginalLanguageTranslation).Count == 0;
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
}
