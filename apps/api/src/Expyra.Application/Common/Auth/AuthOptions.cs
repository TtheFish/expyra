namespace Expyra.Application.Common.Auth;

/// <summary>
/// Kimlik akışının politika parametreleri. DÜZ POCO — <c>IOptions&lt;T&gt;</c> DEĞİL:
/// Application katmanı Microsoft.Extensions.Options'ı yalnız transitive görüyor ve
/// saf karar fonksiyonları (EvaluateThrottle, DecideRotation) bunu doğrudan alıyor;
/// testte <c>new AuthOptions()</c> yazabilmek IOptions sarmalayıcısından değerli.
/// DI'da tek bir singleton instance olarak kaydedilir.
///
/// <para>Sır BURADA DURMAZ. HashKey/SigningKey Infrastructure'ın kendi options
/// tiplerinde kalır (CLAUDE.md #4).</para>
/// </summary>
public sealed class AuthOptions
{
    /// <summary>
    /// Kod hane sayısı. Kaçış valfi: 8 yapılırsa 30 günlük kesintisiz kaba kuvvet
    /// olasılığı %0,22'den %0,0022'ye iner ve migration GEREKMEZ — hash girdisi
    /// zaten değişken uzunlukta.
    /// </summary>
    public int Digits { get; set; } = 6;

    /// <summary>
    /// 10 dakika. 5 dakika tam olarak yavaş teslimatı olan kullanıcıyı cezalandırır:
    /// kurumsal MTA greylisting'i 1-5 dk geciktiriyor.
    /// </summary>
    public int CodeLifetimeSeconds { get; set; } = 600;

    /// <summary>
    /// Challenge başına deneme. Dolunca kod YANAR (hesap kilitlenmez — hesap kilitleme
    /// anonim saldırgana bedava DoS silahı verir). Yakılan kodun maliyeti bir fazladan e-posta.
    /// </summary>
    public int MaxAttempts { get; set; } = 5;

    /// <summary>Saat içindeki 1. koddan sonra beklenecek süre.</summary>
    public int ResendIntervalTier1Seconds { get; set; } = 60;

    /// <summary>2. koddan sonra.</summary>
    public int ResendIntervalTier2Seconds { get; set; } = 120;

    /// <summary>3. ve sonrası.</summary>
    public int ResendIntervalTier3Seconds { get; set; } = 300;

    public int MaxCodesPerEmailPerHour { get; set; } = 5;

    public int MaxCodesPerEmailPerDay { get; set; } = 15;

    /// <summary>IPv6'da /64 prefix, IPv4'te /32 sayılır — maskeleme WebApi'de yapılır.</summary>
    public int MaxCodesPerIpPerHour { get; set; } = 20;

    public int MaxCodesPerIpPerDay { get; set; } = 60;

    /// <summary>
    /// Yenileme grace penceresi. Paralel yenileme (mobil istemciler ve Next prefetch
    /// bunu gerçekten yapıyor) yanlışlıkla "reuse" sayılıp meşru kullanıcıyı kendi
    /// ailesini iptal ettirerek dışarı atmasın.
    ///
    /// <para>Neden Infrastructure'daki JwtOptions'ta değil: rotasyon kararı saf bir
    /// Application fonksiyonu ve DB'siz test ediliyor. İki yerde tutulursa değerler
    /// sessizce ayrışır — tek kaynak burası.</para>
    /// </summary>
    public int RefreshGraceSeconds { get; set; } = 30;

    /// <summary>
    /// Dil zincirinin son halkası (docs/I18N.md §2). Bu da <c>ui_available</c>
    /// listesine karşı DOĞRULANIR — doğrulanmadan login_code.language'a yazılmaz.
    /// </summary>
    public string FallbackLanguage { get; set; } = "en";

    public TimeSpan CodeLifetime => TimeSpan.FromSeconds(CodeLifetimeSeconds);

    public TimeSpan RefreshGrace => TimeSpan.FromSeconds(RefreshGraceSeconds);

    /// <summary>
    /// Aynı adres saat içinde ne kadar çok kod istediyse aralık o kadar uzar:
    /// 60 → 120 → 300 sn. Aralık içindeki istek yeni kod ÜRETMEZ, mevcudu döner.
    /// </summary>
    public TimeSpan ResendIntervalFor(int codesInLastHour) => codesInLastHour switch
    {
        <= 1 => TimeSpan.FromSeconds(ResendIntervalTier1Seconds),
        2 => TimeSpan.FromSeconds(ResendIntervalTier2Seconds),
        _ => TimeSpan.FromSeconds(ResendIntervalTier3Seconds),
    };
}
