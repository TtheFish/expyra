namespace Expyra.Domain.Scheduling;

/// <summary>
/// Yerel duvar saatini kesin bir ana çevirir. <b>Bu tipin dışında hiçbir yerde
/// <see cref="TimeZoneInfo"/> çağrısı yapılmaz.</b>
///
/// <para>Karar üç yerde çalışacak: şablondan seans üretimi, elle seans ekleme ve
/// (Blok 10) hatırlatma zamanlaması. Üç kopya olsaydı birinde varsayılanın kayması
/// derleyicinin göremeyeceği bir davranış farkı üretirdi — <c>MediaRules</c> ve
/// <c>ExperiencePublishRules</c> ile aynı disiplin: saf, veritabanı görmeyen,
/// tek başına test edilebilir kural.</para>
///
/// <para><b>Neden <c>TimeZoneInfo.ConvertTimeToUtc</c> doğrudan çağrılmıyor:</b>
/// yılda iki kez yanlış cevap veriyor. Bahar geçişinde var olmayan bir yerel saat
/// için <c>ArgumentException</c> fırlatıyor (ele alınmazsa 500); sonbahar
/// geçişinde iki kez yaşanan bir saat için SESSİZCE standart offseti — yani ikinci
/// tekrarı — seçiyor. İkisi de bu tipte açık birer karara bağlandı.</para>
///
/// <para><b>Neden NodaTime eklenmedi:</b> ihtiyacımız olan iki soruyu
/// (<c>IsInvalidTime</c>, <c>GetAmbiguousTimeOffsets</c>) platform zaten
/// cevaplıyor ve IANA kimlikleri .NET 10'da Windows'ta da çözülüyor (şehir
/// seeder'ı her satırı <c>TryFindSystemTimeZoneById</c> ile doğruluyor). Yeni bir
/// bağımlılık, kazanmadığımız bir soyutlama olurdu.</para>
/// </summary>
public static class SlotStartResolver
{
    /// <summary>
    /// <see cref="FirstValidLocalAfter"/>'ın tarayacağı en uzun aralık.
    ///
    /// <para>İki gün, "boşluk en fazla bir saattir" varsayımı yapmamak için:
    /// America/Santiago geçişi gece yarısında (yani takvim günü atlıyor) ve Samoa
    /// 2011'de tarih çizgisini geçerken bütün bir günü atladı. Bulunamazsa sessizce
    /// bir tarih uydurmuyoruz — çağıran yüksek sesle patlıyor.</para>
    /// </summary>
    private static readonly TimeSpan MaxGapScan = TimeSpan.FromDays(2);

    /// <summary>
    /// Yerel saati çözer. <b>Var olmayan bir yerel saat için <c>false</c></b> —
    /// istisna değil, çünkü bu beklenen bir durum: host "her pazar 02:30" yazarken
    /// yılda bir kez o saatin yaşanmayacağını bilmiyor.
    /// </summary>
    /// <param name="localStart">
    /// Deneyimin saat dilimindeki duvar saati. <see cref="DateTimeKind.Unspecified"/>
    /// olmak ZORUNDA: <c>Utc</c> ya da <c>Local</c> işaretli bir değer
    /// <see cref="TimeZoneInfo"/> tarafından başka türlü yorumlanır ve sonuç sessizce
    /// kayar.
    /// </param>
    /// <param name="overlap">
    /// İki kez yaşanan saatlerde hangi tekrar. Belirsizlik yoksa hiç bakılmıyor.
    /// </param>
    public static bool TryResolve(
        DateTime localStart,
        TimeZoneInfo zone,
        DstOverlap overlap,
        out SlotStart resolved)
    {
        ArgumentNullException.ThrowIfNull(zone);

        if (localStart.Kind != DateTimeKind.Unspecified)
        {
            // Sessizce düzeltmiyoruz: yanlış Kind ile gelen bir çağrı, çağıranın
            // zamanı nereden aldığını yanlış bildiği anlamına gelir ve sonuç
            // saatlerce kayabilir.
            throw new ArgumentException(
                "Yerel başlangıç DateTimeKind.Unspecified olmalı; " +
                $"gelen: {localStart.Kind}.",
                nameof(localStart));
        }

        resolved = default;

        // BAHAR BOŞLUĞU. Prag'da 2026-03-29 02:00-02:59 hiç yaşanmıyor.
        if (zone.IsInvalidTime(localStart))
        {
            return false;
        }

        // SONBAHAR BELİRSİZLİĞİ. Prag'da 2026-10-25 02:30 iki kez yaşanıyor.
        if (zone.IsAmbiguousTime(localStart))
        {
            var offsets = zone.GetAmbiguousTimeOffsets(localStart);

            // Dizinin SIRASINA güvenilmiyor; seçim büyüklüğe göre. Büyük offset
            // daima BİRİNCİ tekrardır ve bu bir gözlem değil zorunluluk: belirsizlik
            // ancak offset KÜÇÜLDÜĞÜNDE doğuyor, dolayısıyla geçiş öncesi (birinci)
            // offset tanım gereği büyük olan.
            var offset = overlap == DstOverlap.Second ? Min(offsets) : Max(offsets);

            resolved = new SlotStart(
                new DateTimeOffset(localStart, offset).ToUniversalTime(),
                localStart,
                offset,
                WasAmbiguous: true);

            return true;
        }

        var utc = TimeZoneInfo.ConvertTimeToUtc(localStart, zone);

        resolved = new SlotStart(
            new DateTimeOffset(utc, TimeSpan.Zero),
            localStart,
            zone.GetUtcOffset(utc),
            WasAmbiguous: false);

        return true;
    }

    /// <summary>
    /// Boşluktan sonraki ilk geçerli yerel saat. Host'a "02:30 yok, 03:00'ten
    /// başlayabilirsin" diyebilmek için.
    ///
    /// <para><b>Dakika dakika taranıyor</b>, "bir saat ekle" ya da
    /// "<c>DaylightDelta</c> kadar kaydır" DEĞİL: Australia/Lord_Howe'da boşluk
    /// 30 dakika (02:00-02:29) ve o yamalar orada yanlış cevap verir. Tarama
    /// boşluğun uzunluğu hakkında hiçbir varsayım yapmıyor.</para>
    /// </summary>
    public static DateTime FirstValidLocalAfter(DateTime localStart, TimeZoneInfo zone)
    {
        ArgumentNullException.ThrowIfNull(zone);

        var candidate = localStart;
        var limit = localStart + MaxGapScan;

        while (candidate <= limit)
        {
            if (!zone.IsInvalidTime(candidate))
            {
                return candidate;
            }

            candidate = candidate.AddMinutes(1);
        }

        // Buraya düşmek veri bozukluğu demek: iki gün boyunca süren bir DST boşluğu
        // yok. Sessizce bir tarih döndürmek, host'a var olmayan bir saat önermek olurdu.
        throw new InvalidOperationException(
            $"{zone.Id} saat diliminde {localStart:O} sonrası iki gün içinde geçerli bir yerel saat bulunamadı.");
    }

    private static TimeSpan Max(TimeSpan[] offsets)
    {
        var result = offsets[0];
        foreach (var offset in offsets)
        {
            if (offset > result) result = offset;
        }

        return result;
    }

    private static TimeSpan Min(TimeSpan[] offsets)
    {
        var result = offsets[0];
        foreach (var offset in offsets)
        {
            if (offset < result) result = offset;
        }

        return result;
    }
}

/// <param name="Utc">Kesin an. <c>Offset</c> daima sıfır — bu bir UTC damgası.</param>
/// <param name="Local">Çözülen duvar saati; girdiyle aynı.</param>
/// <param name="Offset">
/// O andaki UTC farkı. Saklanıyor çünkü misafir yanıtı onu gösteriyor ve
/// <c>timestamp − timestamptz</c> çıkarması EF/Npgsql'de temiz ifade edilemiyor.
/// </param>
/// <param name="WasAmbiguous">
/// Yerel saat iki kez yaşanıyorsa <c>true</c>. Rapora yazılıyor: host "neden bu
/// saat" diye sorduğunda cevabı olsun.
/// </param>
public readonly record struct SlotStart(
    DateTimeOffset Utc,
    DateTime Local,
    TimeSpan Offset,
    bool WasAmbiguous);

/// <summary>
/// İki kez yaşanan yerel saatte hangi tekrar seçilsin.
///
/// <para>Varsayılan <see cref="First"/>: haftalık ritmi bozmuyor (bir önceki
/// haftaya 168 saat kalıyor) ve saate bakıp evden çıkan misafir seansı KAÇIRMIYOR,
/// en fazla bir saat bekliyor. İkinci tekrar seçilseydi tersi olurdu.</para>
/// </summary>
public enum DstOverlap
{
    /// <summary>Geçiş ÖNCESİ tekrar — büyük offset.</summary>
    First = 1,

    /// <summary>Geçiş SONRASI tekrar — küçük offset.</summary>
    Second = 2,
}
