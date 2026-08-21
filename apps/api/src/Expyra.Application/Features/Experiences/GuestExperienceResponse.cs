namespace Expyra.Application.Features.Experiences;

/// <summary>
/// Misafir listesinin bir sayfası.
///
/// <para><b>Toplam sayı YOK ve olmayacak:</b> her sayfada bir <c>COUNT(*)</c> koşturmak,
/// cursor sayfalamanın kaçındığı tam tarama maliyetini geri getirir. "Kaç tane var"
/// sorusunun cevabı arama bloğunun (Blok 8) işi ve orada yaklaşık sayımla verilir.</para>
/// </summary>
/// <param name="NextCursor">
/// Sonraki sayfanın anahtarı; son sayfada <c>null</c>. Değer OPAK — istemci içeriğini
/// yorumlamaz, olduğu gibi <c>?cursor=</c> olarak geri gönderir.
///
/// <para>Sunucu sayfa boyutundan BİR FAZLA satır çekip fazlayı atıyor: bu yüzden dolu bir
/// <c>nextCursor</c> daima gerçekten satır olduğu anlamına geliyor. "Son sayfayı isteyip
/// boş liste almak" diye bir adım yok.</para>
/// </param>
public sealed record GuestExperiencePageResponse(
    IReadOnlyList<GuestExperienceSummaryResponse> Items,
    string? NextCursor);

/// <summary>
/// Karttaki deneyim. <b>Host'un gördüğü şekil DEĞİL</b>: burada taslak durumu, eksik
/// yayın koşulları ve tüm çeviriler yok — misafire yalnız yayındaki ilan ve fallback
/// zincirinden geçmiş TEK metin gidiyor (docs/I18N.md §2).
///
/// <para><b>Yanıtta hiç uuid yok</b> ve bu bilinçli: dışarıya açık kimlik slug
/// (deneyim için) ve <c>ülke-slug</c> (şehir için). Uuid'ler seed/kayıt sırasında
/// üretiliyor, ortamlar arasında değişiyor ve istemcinin onlarla yapabileceği bir şey
/// yok — <c>city.id</c>'yi şehre çevirecek bir uç bile bulunmuyor (bkz.
/// <c>Expyra.Domain.Places.CityKey</c>). Favori/rezervasyon uçları deneyim kimliğini
/// istediğinde (Blok 7/16) alan EKLENİR; şimdi eklenen bir alan, kullanılmayan bir
/// sözleşme parçası olurdu.</para>
/// </summary>
/// <param name="Text">
/// Fallback zincirinin kazananı. <b>Açıklama YOK</b>: hiçbir kart onu çizmiyor ve
/// 24 satırlık bir sayfada 4000 karakterlik alanı taşımak, gösterilmeyecek metnin
/// megabaytlarını demek. Detay ucu aynı nesneye <c>description</c> ekleyerek dönüyor —
/// yani liste şekli detay şeklinin ALT KÜMESİ, iki uç için tek ayrıştırıcı yetiyor.
/// </param>
public sealed record GuestExperienceSummaryResponse(
    string Slug,
    GuestExperienceCityResponse City,
    string CategorySlug,
    int DurationMinutes,
    int Capacity,
    GuestExperienceTextResponse Text,
    DateTimeOffset PublishedAtUtc);

/// <summary>
/// Detay sayfasının tamamı — <b>tek istekle</b> doluyor (PLAN Blok 5 kabul kriteri 4):
/// şehir, metin, konuşulan diller ve etiketler bu yanıtın içinde, SSR'ın ikinci bir
/// çağrı yapması gerekmiyor.
/// </summary>
/// <param name="SpokenLanguages">
/// Deneyim SIRASINDA konuşulan diller. <paramref name="Text"/>'in dili ile karıştırılmaz:
/// Prag'daki bir host ilanını İngilizce yazıp turu yalnız Çekçe anlatabilir ve gezgin
/// için kritik olan ikincisidir (docs/I18N.md §3).
/// </param>
/// <param name="Tags">
/// Host'un yazdığı serbest etiketler, yazdığı hâliyle. Kategori değil — o bizim kapalı
/// listemiz ve adı arayüz sözlüğünde.
/// </param>
public sealed record GuestExperienceDetailResponse(
    string Slug,
    GuestExperienceCityResponse City,
    string CategorySlug,
    int DurationMinutes,
    int Capacity,
    IReadOnlyList<string> SpokenLanguages,
    IReadOnlyList<string> Tags,
    GuestExperienceDetailTextResponse Text,
    DateTimeOffset PublishedAtUtc);

/// <summary>
/// Şehrin kart ve detayda görünen yüzü.
///
/// <para>Yerelleştirilmiş ad taşımıyor ve bu Blok 4'ün kararının aynısı: kayıt defterinde
/// şehir adının tam olarak iki yazımı var — endonim (<c>Praha</c>) ve İngilizce exonim
/// (<c>Prague</c>). Üçüncü bir dil için çeviri yok ve uydurulmuyor; hangisinin
/// gösterileceğine arayüz karar veriyor (<c>cityDisplayName</c>).</para>
///
/// <para><see cref="Slug"/> + <see cref="CountryCode"/> birlikte şehrin dışarıya açık
/// kimliğini veriyor (<c>cz-prague</c>) — aynı değer <c>?city=</c> filtresine geri
/// gönderiliyor. Anahtar HAZIR bir alan olarak dönmüyor: aynı bilgiyi iki biçimde
/// taşımak, ikisinin ayrışabileceği bir yanıt demek.</para>
/// </summary>
public sealed record GuestExperienceCityResponse(
    string Slug,
    string CountryCode,
    string Name,
    string EnglishName);

/// <summary>
/// Karttaki metin ve <b>hangi dilde olduğu</b>.
/// </summary>
/// <param name="Language">
/// Metnin GERÇEKTEN döndüğü dil — istenen dil değil. Arayüz "Bu açıklama Türkçe"
/// rozetini bu alandan basıyor (PLAN Blok 5 kabul kriteri 2).
/// </param>
/// <param name="IsFallback">
/// İstenen dil ile dönen dil ayrıştı mı. <c>lang</c> hiç verilmediyse <c>false</c>:
/// düşülecek bir talep yokken "yedeğe düşüldü" demek yanlış olurdu.
///
/// <para>Alan, <c>language != istenen</c> karşılaştırmasının istemciye bırakılmamış hâli:
/// istemcinin elinde istenen dil her zaman olmayabilir (yanıt önbellekten gelebilir,
/// bileşen prop olarak yalnız metni alabilir) ve aynı kural iki yerde yazılırsa ayrışır.</para>
/// </param>
/// <param name="Source">
/// <c>"HostWritten" | "Machine"</c> — METİN olarak (host yanıtındaki <c>status</c> ile
/// aynı gerekçe: enum bırakılsaydı sözleşme enum SIRASINA bağlanırdı). Bu blokta daima
/// <c>HostWritten</c>; alan Blok 10'un "otomatik çevrildi" rozeti için hazır duruyor.
/// </param>
public sealed record GuestExperienceTextResponse(
    string Language,
    string Title,
    bool IsFallback,
    string Source);

/// <summary>
/// Detaydaki metin: <see cref="GuestExperienceTextResponse"/> + açıklama. Alan sırası ve
/// adları bilinçli olarak aynı — JSON tarafında liste şekli bunun tam alt kümesi.
/// </summary>
/// <param name="Description">
/// Host boş bırakmış olabilir: yayın doğrulaması çeviri SATIRINI şart koşuyor, açıklamanın
/// dolu olmasını değil. Yani <c>null</c> burada "yazılmamış" demek, "gönderilmedi" değil.
/// </param>
public sealed record GuestExperienceDetailTextResponse(
    string Language,
    string Title,
    string? Description,
    bool IsFallback,
    string Source);
