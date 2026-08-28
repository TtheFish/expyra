using Expyra.Domain.Experiences;

namespace Expyra.Domain.Scheduling;

/// <summary>
/// Takvim kurmanın ön koşulları ve sınırları. <c>ExperiencePublishRules</c> ile aynı
/// disiplin: saf, veritabanı görmeyen, tek kaynak.
/// </summary>
public static class ScheduleRules
{
    /// <summary>
    /// Deneyim başına aktif şablon tavanı. Haftada 7 gün × 3 saat = 21; daha
    /// fazlası bir "deneyim" değil bir tarife. Sınır olmasaydı tek bir istek
    /// yüz binlerce satır üretebilirdi.
    /// </summary>
    public const int MaxTemplatesPerExperience = 21;

    /// <summary>Deneyim başına blackout tavanı.</summary>
    public const int MaxBlackoutsPerExperience = 60;

    /// <summary>Tek bir blackout'un en uzun süresi — bir yıl + artık gün payı.</summary>
    public const int MaxBlackoutDays = 366;

    /// <summary>
    /// Üretimin gidebileceği en uzak nokta. <see cref="RecurrenceTemplate.GenerationHorizonDays"/>
    /// varsayılan, bu ise host'un açıkça isteyebileceği tavan.
    /// </summary>
    public const int MaxHorizonDays = 365;

    /// <summary>
    /// Takvim penceresinin en fazla kaç günü. Hem host hem misafir okumasında:
    /// sınırsız pencere, tek istekle bütün tabloyu okutmanın yolu olurdu.
    /// </summary>
    public const int MaxWindowDays = 62;

    /// <summary>
    /// Takvim kurulabilmesi için deneyimde ne eksik. <b>Liste döner, ilk eksikte
    /// durmaz</b> — host'a "önce süre gir" deyip kaydettikten sonra "bir de şehir"
    /// demek üç tur ettirir (<c>ExperiencePublishRules</c> ile aynı gerekçe).
    /// </summary>
    public static IReadOnlyList<string> MissingPrerequisites(Experience experience)
    {
        ArgumentNullException.ThrowIfNull(experience);

        var missing = new List<string>(3);

        // Saat dilimi şehirden türüyor; şehir yoksa seansın hangi duvar saatinde
        // olduğu sorusunun cevabı yok.
        if (string.IsNullOrEmpty(experience.TimeZoneId))
        {
            missing.Add(ScheduleRequirement.TimeZone);
        }

        // Seansın bitişi süreden hesaplanıyor.
        if (experience.DurationMinutes <= 0)
        {
            missing.Add(ScheduleRequirement.Duration);
        }

        // Kapasite seansa kopyalanıyor; sıfır kapasiteli seans satılamaz.
        if (experience.Capacity <= 0)
        {
            missing.Add(ScheduleRequirement.Capacity);
        }

        return missing;
    }

    public static bool CanSchedule(Experience experience)
        => MissingPrerequisites(experience).Count == 0;
}

/// <summary>
/// Takvim ön koşullarının kararlı kodları — <c>ExperiencePublishRequirement</c> ile
/// aynı kalıp: sunucu kod verir, metni arayüz sözlüğü yazar.
/// </summary>
public static class ScheduleRequirement
{
    /// <summary>Şehir seçilmediği için saat dilimi de yok.</summary>
    public const string TimeZone = "time-zone";

    public const string Duration = "duration";

    public const string Capacity = "capacity";
}

/// <summary>
/// Takvim ve fiyat çakışmalarının makine-okunur kodları. Sunucu mesajları Türkçe ve
/// arayüz iki dilde; dal seçimi bu kodlara göre (<c>MediaConflict</c> ile aynı
/// gerekçe, <c>AppException.Code</c>).
/// </summary>
public static class ScheduleConflict
{
    /// <summary>Deneyimde takvim ön koşulu eksik; ayrıntı listede.</summary>
    public const string NotSchedulable = "schedule-not-schedulable";

    /// <summary>Yerel saat o gün hiç yaşanmıyor (yaz saatine geçiş).</summary>
    public const string DaylightGap = "slot-dst-gap";

    /// <summary>Geçmişe seans açılamaz / geçmiş seans değiştirilemez.</summary>
    public const string SlotInPast = "slot-in-past";

    /// <summary>Aynı başlangıçta açık bir seans zaten var.</summary>
    public const string SlotExists = "slot-exists";

    /// <summary>Tarih bir blackout aralığına düşüyor.</summary>
    public const string SlotBlackedOut = "slot-blacked-out";

    /// <summary>Şablondan doğmuş seans silinemez — kapatma yolu ayrı.</summary>
    public const string SlotGenerated = "slot-generated";

    /// <summary>Satılmış koltuğu olan seans silinemez.</summary>
    public const string SlotHasBookings = "slot-has-bookings";

    public const string RecurrenceLimit = "recurrence-limit";

    /// <summary>Aynı gün ve saatte aktif bir şablon zaten var.</summary>
    public const string RecurrenceDuplicate = "recurrence-duplicate";

    public const string BlackoutLimit = "blackout-limit";

    public const string HorizonTooFar = "schedule-horizon-too-far";

    /// <summary>Yayınlanmış ilanın tahsilat para birimi değiştirilemez.</summary>
    public const string PricingCurrencyLocked = "pricing-currency-locked";

    /// <summary>Yayınlanmış ilanın fiyatı silinemez — para birimi kilidinin bypass'ını kapatıyor.</summary>
    public const string PricingLockedAfterPublish = "pricing-locked-after-publish";

    /// <summary>Deneyimin fiyatı hiç girilmemiş.</summary>
    public const string PricingMissing = "pricing-missing";

    /// <summary>İstenen misafir kademesinin fiyatı tanımlı değil.</summary>
    public const string TierNotOffered = "tier-not-offered";

    /// <summary>Seansta yeterli yer yok.</summary>
    public const string InsufficientCapacity = "insufficient-capacity";

    /// <summary>Seans kapalı.</summary>
    public const string SlotClosed = "slot-closed";
}
