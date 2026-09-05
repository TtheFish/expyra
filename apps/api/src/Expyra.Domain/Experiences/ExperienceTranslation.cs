namespace Expyra.Domain.Experiences;

/// <summary>
/// Deneyimin bir dildeki metni. <b>Bileşik birincil anahtar: (ExperienceId, Language)</b>
/// (docs/I18N.md §2).
///
/// <para><b>Neden ayrı tablo, <c>jsonb</c> değil:</b> dil bazlı full-text index (I18N §4)
/// satır başına farklı Postgres konfigürasyonu istiyor. JSONB içinde her dile ayrı GIN
/// index atmak ifade tabanlı index cehennemi; satır modelinde
/// <c>WHERE language = 'ja'</c> kısmi index'i doğal düşüyor.</para>
///
/// <para><b>Dikkat — <c>FindForUpdateAsync</c> BU TİPLE KULLANILAMAZ:</b>
/// <c>AppDbContext</c> satır kilidi için tek sütunlu birincil anahtar şart koşuyor ve
/// burada anahtar iki sütun. Çeviri satırında oku-değiştir-yaz gerekiyorsa kilit
/// <c>experience</c> satırında alınır (PLAN Blok 5 tuzakları).</para>
/// </summary>
public sealed class ExperienceTranslation
{
    /// <summary>
    /// Başlık sütun genişliği. Karttaki ve arama sonucundaki tek satırlık alan bu kadarını
    /// taşıyor; daha uzunu her yüzeyde kırpılır, yani aslında yazılmamış olur.
    /// TEK KAYNAK — doğrulayıcı da buradan okuyor.
    /// </summary>
    public const int MaxTitleLength = 120;

    /// <summary>Açıklama sütun genişliği.</summary>
    public const int MaxDescriptionLength = 4000;

    /// <summary>
    /// "Bilmen gerekenler" alanlarının ortak tavanı. Açıklama kadar uzun olmaları
    /// beklenmiyor; 1000, Airbnb'deki en uzun "What to bring" örneklerinin üstünde.
    /// </summary>
    public const int MaxDetailLength = 1000;

    public Guid ExperienceId { get; set; }

    /// <summary>
    /// Metnin dili — BCP-47, normalize (<c>LanguageCode</c>). <c>language.code</c>'a FK.
    ///
    /// <para><b>Bu, "host'un konuştuğu dil" DEĞİL</b> (docs/I18N.md §3): Prag'daki bir host
    /// ilanını Çekçe + İngilizce yazıp turu yalnız Çekçe anlatabilir. Konuşulan dil
    /// <see cref="ExperienceSpokenLanguage"/> tablosunda ve ikisi asla aynı alana bindirilmez.</para>
    /// </summary>
    public required string Language { get; set; }

    public required string Title { get; set; }

    /// <summary>
    /// Boş bırakılabilir: sihirbaz önce başlığı kaydediyor. Yayın doğrulaması çeviri
    /// SATIRINI şart koşuyor, açıklamanın dolu olmasını değil (PLAN kabul kriteri 1) —
    /// listeye ek kural yazmak, PLAN'ın kapattığı kapsamı sessizce genişletmek olurdu.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>Misafirin yanında getirmesi gerekenler (Airbnb "What to bring").</summary>
    public string? WhatToBring { get; set; }

    /// <summary>Fiyata dahil OLMAYANLAR — müze bileti, yemek vb.</summary>
    public string? NotIncluded { get; set; }

    /// <summary>Erişilebilirlik notu: merdiven, tekerlekli sandalye, işaret dili.</summary>
    public string? Accessibility { get; set; }

    /// <summary>
    /// Buluşma yönergesi ("kulenin kuzey kapısında, sarı şemsiyeli rehber"). Adres
    /// <c>Experience.MeetingAddress</c>'te — bu satır dile bağlı olan kısım.
    /// </summary>
    public string? MeetingInstructions { get; set; }

    /// <summary>
    /// Metni kim üretti. Makine çevirisi bu blokta YOK; alan Blok 10 için hazır duruyor.
    ///
    /// <para>Ayrımın işlevi: makine çevirisi arayüzde "otomatik çevrildi" rozetiyle gösterilir
    /// ve host kendi eliyle yazdığında satır <see cref="TranslationSource.HostWritten"/>'a
    /// döner. Ters yön yasak — makine, host'un yazdığının üzerine yazmaz (docs/I18N.md §2).</para>
    /// </summary>
    public TranslationSource Source { get; set; } = TranslationSource.HostWritten;

    /// <summary>
    /// Son yazma anı. <c>BaseAuditableEntity</c> KULLANILAMIYOR (o <c>Guid Id</c> taşıyor,
    /// buranın anahtarı bileşik), bu yüzden <c>ApplyAuditTimestamps</c> bu satıra dokunmuyor
    /// ve değeri handler <c>IDateTimeProvider</c>'dan yazıyor.
    /// </summary>
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

/// <summary>0'dan başlatılmıyor — <see cref="ExperienceStatus"/> ile aynı gerekçe.</summary>
public enum TranslationSource
{
    /// <summary>Host kendi yazdı.</summary>
    HostWritten = 1,

    /// <summary>Makine çevirisi. Arayüzde rozetle gösterilir; bu blokta üretilmiyor.</summary>
    Machine = 2,
}
