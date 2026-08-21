import 'server-only'

/**
 * KAYNAK SÖZLÜK. Arayüzün anahtar kümesini bu dosya tanımlar.
 *
 * Üç ayrı tablo (`features/auth/messages.ts`, `account-messages.ts`,
 * `features/host/messages.ts`) burada birleşti; anahtar adları bugüne kadar
 * feature bazlı yazıldığı için taşıma mekanik oldu (docs/PLAN.md Blok 3).
 *
 * **Neden `.ts`, `.json` değil:** `as const` olmadan TypeScript metinleri
 * `string`'e genişletir; o zaman ne "hangi anahtar var" ne de "bu metinde hangi
 * yer tutucular var" derlemede bilinebilir. Eksik anahtarın derlemeyi kırması
 * (docs/I18N.md §5) bu literal tiplere dayanıyor. JSON bunu veremez.
 *
 * **Neden Türkçe kaynak:** ürün Türkçe yazıldı, İngilizce çeviri sonradan
 * geldi. Kaynağın dili bir tercih değil, tarihsel gerçek; çevirinin doğruluğu
 * kaynağa göre ölçülüyor (`dictionary.ts`).
 *
 * ### Yazım kuralları (üç tablodan devralındı, çeviri geldiğinde onarılamaz)
 *
 * 1. **Cümle birleştirme yok.** Değişken parça yer tutucuyla gelir (`{eposta}`).
 *    Almanca/Rusça/Arapça'da sözcük sırası farklı; parçaları JSX'te yan yana
 *    eklemek çeviri anında geri dönüşü olmayan bir tasarım hatasına dönüşür.
 * 2. **Sayı içeren metin ÇOĞUL tablosudur.** `{ one, other }` — Türkçe'de iki
 *    biçim aynı ama İngilizce'de değil ("1 experience" / "3 experiences").
 *    Çoğulu seçen değer daima `{n}`; bir metinde tek sayım olur, iki ayrı
 *    çekim gerekiyorsa metin ikiye bölünür.
 * 3. **Kalan deneme sayısı ASLA yazılmaz.** Saldırgana bütçe göstergesi,
 *    kullanıcıya panik. Hata metninde girilen kod da echo edilmez.
 * 4. **İÇ terim kullanıcıya gösterilmez.** "Faz 2'de açılıyor" değil, ne
 *    olacağını söyleyen bir cümle — kullanıcı "Faz 2"nin ne olduğunu bilmiyor.
 *
 * Belirsiz kalması gerekenler: hesabın var olup olmadığı, e-postanın teslim
 * edilip edilmediği ("gönderildi" değil "gönderdik"), ve kodun hane/ömür
 * bilgisi dışında hiçbir parametre.
 *
 * ### Burada OLMAYAN metin: sınır ekranları
 *
 * 404, hata sınırı, kök hata sınırı ve yükleniyor iskeleti `../boundary.ts`
 * dosyasında. Sebep bu tablonun `server-only` olması: o dört dosyanın Next 16
 * sözleşmesi gereği sunucu ebeveyni yok, yani metni prop olarak alamıyorlar.
 * Gerekçe ve bedeli orada yazılı — yeni bir sınır ekranı metni oraya, geri
 * kalan HER ŞEY buraya.
 */
export const tr = {
  // --- Belge başlığı ---------------------------------------------------------
  /** Marka adı çevrilmiyor; açıklama çevriliyor. */
  'meta.description': 'Yerel deneyimleri keşfet, rezervasyon yap.',

  // --- Gezinme (üst çubuk + alt bilgi) ---------------------------------------
  'nav.primaryLabel': 'Ana menü',
  'nav.footerLabel': 'Alt menü',
  'nav.explore': 'Keşfet',
  'nav.myExperiences': 'Deneyimlerim',
  'nav.becomeHost': 'Host ol',
  'nav.howItWorks': 'Nasıl çalışır?',

  // --- Dil seçici ------------------------------------------------------------
  /** İstemcide doldurulan tek şablon: seçim sayfa yenilenmeden değişiyor (bkz. language-picker.tsx). */
  'language.trigger': 'Dil: {dil}. Değiştir.',
  'language.dialogLabel': 'Dil seçimi',
  'language.search.label': 'Dil ara',
  'language.search.placeholder': 'Dil ara',
  'language.group.ui': 'Arayüz dilleri',
  'language.group.content': 'Diğer diller',
  'language.group.contentHint':
    'Arayüz çevirisi henüz yok — deneyim içeriği bu dillerde yayınlanabilir.',
  'language.empty': 'Bu aramaya uyan dil yok.',

  // --- Tema ------------------------------------------------------------------
  'theme.toLight': 'Açık temaya geç',
  'theme.toDark': 'Koyu temaya geç',

  // --- Ana sayfa -------------------------------------------------------------
  /**
   * Başlık iki satır; ikincisi marka gradyanıyla vurgulanıyor. İki anahtar
   * olmasının nedeni CÜMLE bölmek değil, DÜZEN: çevirmen cümleyi iki satıra
   * istediği gibi dağıtır ve vurgunun hangi sözcüğe düşeceğine kendi karar
   * verir. Türkçe'de vurgu "keşfetmenin yeni yolu"nda, İngilizce'de "local
   * experiences"ta — ikisi de doğru, ikisi de kendi dilinin cümlesi.
   */
  'home.hero.title': 'Yerel deneyimleri',
  'home.hero.titleAccent': 'keşfetmenin yeni yolu',
  'home.hero.lede':
    'Şehri en iyi bilenlerden. Küçük gruplar, gerçek insanlar, unutulmayan birkaç saat.',
  /** Yalnız ekran okuyucuya: kart ızgarasının ne olduğunu söyleyen başlık. */
  'home.samples.heading': 'Örnek deneyimler',

  // --- Arama çubuğu ----------------------------------------------------------
  'search.destination.label': 'Nereye?',
  'search.destination.placeholder': 'Şehir veya deneyim',
  'search.date.label': 'Ne zaman?',
  'search.submit': 'Ara',

  'search.guests.label': 'Misafirler',
  'search.guests.dialogLabel': 'Misafir sayısı',
  'search.guests.done': 'Tamam',
  'search.guests.adults': 'Yetişkin',
  'search.guests.adults.hint': '13 yaş ve üzeri',
  /**
   * Sayaç düğmelerinin `aria-label`'ı TAM CÜMLE olarak yazılıyor.
   * `${grup} sayısını azalt` biçiminde kurmak Türkçe'de çalışıyor ama
   * çekimli dillerde "Yetişkin" sözcüğünün hâli değişir; İngilizce'de de
   * "Adults count decrease" gibi bir şey çıkardı.
   */
  'search.guests.adults.decrease': 'Yetişkin sayısını azalt',
  'search.guests.adults.increase': 'Yetişkin sayısını artır',
  'search.guests.children': 'Çocuk',
  'search.guests.children.hint': '0-12 yaş',
  'search.guests.children.decrease': 'Çocuk sayısını azalt',
  'search.guests.children.increase': 'Çocuk sayısını artır',
  /**
   * Tetikleyicideki özet İSTEMCİDE kuruluyor: +/− düğmeleri sayfayı
   * yenilemiyor, dolayısıyla metni sunucu dolduramıyor. Çoğul biçim tablosu
   * `getPluralTemplates` ile şablon olarak iniyor (bkz. `translator.ts`).
   */
  'search.guests.summary.adults': { one: '{n} yetişkin', other: '{n} yetişkin' },
  'search.guests.summary.children': { one: '{n} çocuk', other: '{n} çocuk' },
  /** Çocuk yoksa yalnız yetişkin parçası basılır; ayırıcı ve sıra çevirmenin. */
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  // --- Deneyim kartı ---------------------------------------------------------
  'experience.place': '{sehir}, {ulke}',
  'experience.rating': '★ {puan}',
  'experience.perPerson': '/ kişi',
  /**
   * Süre AYRI anahtar, çünkü bir metinde tek çoğul sayacı olabiliyor (yazım
   * kuralı 2) ve burada iki sayım var: saat ve kişi. Süre önce kendi başına
   * çekimlenip `{sure}` olarak yerleştiriliyor — İngilizce'de "1 hour" /
   * "2 hours" ayrımı böyle korunuyor.
   */
  'experience.duration': { one: '{n} saat', other: '{n} saat' },
  'experience.meta': {
    one: '{sure} · en fazla {n} kişi',
    other: '{sure} · en fazla {n} kişi',
  },

  // --- Arama sonucu ----------------------------------------------------------
  'explore.heading.all': 'Tüm deneyimler',
  'explore.heading.query': '“{arama}” için sonuçlar',
  /**
   * Özet satırı TEK anahtar: parçaları JSX'te yan yana eklemek, sıranın
   * Türkçe'ye sabitlenmesi demekti. Tarihli/tarihsiz iki ayrı anahtar var
   * çünkü tarih satırın neresine gireceğini de çevirmen seçmeli.
   *
   * Misafir sayısı yer tutucu (`{misafir}`): ikinci bir çoğul sayacı aynı
   * metne sığmıyor, kendi anahtarında çekimlenip buraya yerleşiyor.
   */
  'explore.summary': { one: '{n} deneyim · {misafir}', other: '{n} deneyim · {misafir}' },
  'explore.summary.dated': {
    one: '{n} deneyim · {misafir} · {tarih}',
    other: '{n} deneyim · {misafir} · {tarih}',
  },
  'explore.summary.guests': { one: '{n} kişi', other: '{n} kişi' },
  'explore.dateNotice':
    'Seçtiğin tarih sonuçları henüz daraltmıyor: deneyimlerin takvimi sisteme girmedi. Aşağıdaki liste tüm tarihleri kapsıyor.',
  'explore.empty.title': 'Burada henüz deneyim yok',
  'explore.empty.body':
    'Aramanı genişletmeyi dene: farklı bir şehir yaz ya da misafir sayısını azalt. Yeni şehirler ekleniyor.',
  'explore.empty.cta': 'Tüm deneyimleri gör',

  // --- Nasıl çalışır ---------------------------------------------------------
  /** Sayfanın adı `nav.howItWorks`'ten geliyor — aynı sayfa, aynı ad. */
  'howItWorks.lede': 'Üç adımda bitiyor.',
  'howItWorks.back': 'Geri',
  'howItWorks.step.discover.title': 'Keşfet',
  'howItWorks.step.discover.body':
    'Şehrindeki yerel deneyimlere göz at. Küçük gruplar, gerçek hostlar.',
  'howItWorks.step.book.title': 'Rezerve et',
  'howItWorks.step.book.body': 'Tarih seç, yerini ayırt. Biletin anında cebinde.',
  'howItWorks.step.join.title': 'Katıl',
  'howItWorks.step.join.body': 'Girişte host QR kodunu okutur. Deneyimin başlar.',
  'howItWorks.backToExplore': 'Keşfe dön',

  // --- Deneyimlerim ----------------------------------------------------------
  /** Başlık `nav.myExperiences` — üst çubukla aynı ad (bkz. site-footer.tsx). */
  'myExperiences.lede': 'Biletlerin burada. Girişte host QR kodu okutacak.',
  /**
   * Sayı bölüm başlığında bir ROZET, sayılan bir isim değil ("Yaklaşan · 2").
   * Çoğul tablosu değil düz metin: İngilizce'de de çekimlenecek bir sözcük yok.
   */
  'myExperiences.upcoming': 'Yaklaşan · {sayi}',
  'myExperiences.past': 'Geçmiş işlemler · {sayi}',
  'myExperiences.downloadPdf': 'PDF indir',
  'myExperiences.wallet': 'Apple Cüzdan’a ekle',
  'myExperiences.wallet.soon': 'Yakında',
  'myExperiences.rate': 'Puan ver',
  'myExperiences.rate.soon': 'Deneyim tamamlanınca açılır',

  // --- Bilet -----------------------------------------------------------------
  /** Bilet bugün kapıda çalışmıyor; ibare Blok 12'de kalkar (bkz. glass-ticket.tsx). */
  'ticket.demoBadge': 'Demo bilet',
  'ticket.demoNote': 'Örnek bilet: QR henüz imzalanmıyor ve girişte doğrulanamıyor.',
  'ticket.guests': 'Kişi',
  'ticket.amount': 'Tutar',
  'ticket.status': 'Durum',
  'ticket.status.valid': 'Geçerli',
  'ticket.status.used': 'Kullanıldı',
  /** IANA kimliği (`Europe/Prague`) değil şehir: bu satır okunmak için var. */
  'ticket.timeZoneNote': '{sehir} saatiyle',

  'ticket.pdf.kicker': 'Deneyim bileti',
  'ticket.pdf.dateTime': 'Tarih ve saat',
  'ticket.pdf.docTitle': 'Expyra bileti — {baslik}',
  'ticket.pdf.code': 'Bilet kodu {kod}',
  'ticket.pdf.notice.valid': 'Girişte host bu kodu okutacak. Bilet tek kullanımlıktır.',
  'ticket.pdf.notice.used': 'Bu bilet giriş için kullanıldı.',

  /** PDF ucunun problem cevapları; kullanıcı bağlantıyı doğrudan açarsa görünür. */
  'ticket.error.signedOut': 'Bileti görmek için giriş yapmalısın.',
  'ticket.error.notFound': 'Bilet bulunamadı.',

  // --- Giriş akışı -----------------------------------------------------------
  'auth.meta.title': 'Giriş',
  'auth.title': 'Giriş yap veya kayıt ol',
  'auth.back': 'Geri',

  'auth.email.lede': 'Adresini yaz, sana tek kullanımlık bir kod gönderelim. Şifre yok.',
  'auth.email.label': 'E-posta adresin',
  'auth.email.help': 'Kodu bu adrese göndereceğiz.',
  'auth.email.placeholder': 'ad@site.com',
  'auth.email.error.invalid': 'Bu adres geçerli görünmüyor. Örnek: ad@site.com',

  'auth.code.lede': 'Şu adrese 6 haneli bir kod gönderdik:',
  'auth.code.label': 'E-postana gelen kod',
  'auth.code.hint': 'Kod 10 dakika geçerli. Postayı göremiyorsan spam klasörüne bak.',
  'auth.code.resend': 'Yeni kod gönder',
  'auth.code.changeEmail': 'Başka bir adres kullan',

  'auth.common.continue': 'Devam et',
  'auth.common.working': 'Gönderiliyor…',

  'auth.otp.error.invalid': 'Kod eşleşmedi. Son gelen e-postadaki 6 rakamı kontrol et.',
  'auth.otp.error.locked':
    'Çok fazla deneme yapıldı. Güvenlik için bu kodu kapattık — yeni kod iste.',
  'auth.otp.error.resendTooSoon': {
    one: 'Yeni kod için {n} saniye daha bekle.',
    other: 'Yeni kod için {n} saniye daha bekle.',
  },

  'auth.error.tooManyRequests': 'Çok fazla kod istendi. Bir süre sonra tekrar dene.',
  /** Destek adresi çevrilmiyor: var olan tek kutu bu. */
  'auth.error.suspended': 'Bu hesap askıya alındı. destek@expyra.com',
  'auth.error.expiredChallenge': 'Bu giriş denemesi zaman aşımına uğradı. Adresini tekrar yaz.',

  // --- Hesap -----------------------------------------------------------------
  'account.title': 'Hesabım',
  'account.lede': 'Adını ve tercih ettiğin dili buradan güncelleyebilirsin.',

  'account.email.label': 'E-posta adresin',
  // Adres değiştirme step-up doğrulama ister (docs/PLAN.md Blok 1 kapsam dışı).
  // Alanı "düzenlenebilir gibi" göstermek yerine neden olmadığını yazıyoruz.
  'account.email.note': 'E-posta adresi şimdilik değiştirilemiyor.',

  'account.name.label': 'Görünen adın',
  'account.name.help': 'Diğer kullanıcılar seni bu adla görür. Boş bırakabilirsin.',
  'account.name.placeholder': 'Örn. Deniz K.',

  'account.language.label': 'Tercih ettiğin dil',
  'account.language.help':
    'Sana yazdığımız e-postaların dili. Arayüzün dili adres çubuğundaki dil segmentinden gelir, bu seçimden değil.',
  'account.language.none': 'Belirtilmedi',

  'account.save': 'Kaydet',
  'account.saving': 'Kaydediliyor…',
  'account.saved': 'Değişiklikler kaydedildi.',

  'account.error.name': {
    one: 'Görünen ad en fazla {n} karakter olabilir.',
    other: 'Görünen ad en fazla {n} karakter olabilir.',
  },
  'account.error.language': 'Bu dili şu an desteklemiyoruz. Listeden başka bir dil seç.',
  'account.error.signedOut': 'Oturumun sona ermiş. Tekrar giriş yap.',

  'account.menu.trigger': 'Hesap menüsü: {ad}',
  'account.menu.title': 'Hesap',
  'account.menu.signedInAs': '{eposta} olarak giriş yaptın',
  'account.menu.account': 'Hesabım',
  'account.menu.signOut': 'Çıkış yap',
  /** Profil okunamadığında tetikleyicide görünen ad — "Giriş yap" YAZMIYORUZ (bkz. site-header.tsx). */
  'account.menu.fallbackLabel': 'Hesabım',

  'account.signIn': 'Giriş yap',
  'account.loading': 'Oturum durumu yükleniyor',

  // --- Host ------------------------------------------------------------------
  /** Sayfa başlığı oturumdan BAĞIMSIZ: `generateMetadata` oturum okumuyor. */
  'host.meta.title': 'Host ol',

  // Davet: oturum var ama rol yok, ya da oturum hiç yok.
  'host.invite.title': 'Kendi deneyimini yayınla',
  'host.invite.lede':
    'Bildiğin bir şeyi anlat, gezdirdiğin bir yeri göster. Fiyatı, grup büyüklüğünü, takvimi ve iptal politikasını sen belirlersin — platform ürüne karışmaz.',
  /** VISION §9'daki bağlayıcı karar: onay süreci YOK. Vaadi yazıyoruz ki kullanıcı beklemesin. */
  'host.invite.noApproval':
    'Onay süreci yok, başvuru formu yok. Host ol dediğin an panelin açılır.',
  'host.invite.cta': 'Host ol',
  'host.invite.pending': 'Açılıyor…',

  'host.signedOut.note':
    'Host olmak için önce giriş yapman gerekiyor. Şifre istemiyoruz — adresine tek kullanımlık bir kod gönderiyoruz.',
  'host.signedOut.cta': 'Host olmak için giriş yap',

  'host.panel.title': 'Host paneli',
  'host.panel.lede':
    'Deneyimlerini buradan yönetirsin. Fiyatı, grubu, takvimi ve iptal politikasını sen belirlersin — platform ürüne karışmaz.',
  'host.panel.status': 'Hesabın host olarak açık.',
  'host.panel.new': 'Yeni deneyim',

  /** Devre dışı düğmelerin `title`'ı. Neden kapalı olduğunu söylüyor, faz numarası vermiyor. */
  'host.soon': 'Deneyim yayınlama yakında açılıyor',

  'host.listings.heading': 'İlanlarım · {sayi}',
  /** Host OLMAYAN kullanıcıya "İlanlarım" yazmak yalan olurdu; aynı liste, dürüst başlık. */
  'host.listings.previewHeading': 'Panelin böyle görünecek',
  'host.listings.note':
    'Bu liste örnek veriyle gösteriliyor. Kendi ilanların, deneyim yayınlama açıldığında burada listelenecek.',
  'host.listings.previewNote':
    'Bu liste örnek veriyle gösteriliyor — host olduğunda kendi ilanların burada listelenir.',
  'host.listings.summary': {
    one: '{fiyat} · en fazla {n} kişi',
    other: '{fiyat} · en fazla {n} kişi',
  },
  'host.listings.progress': {
    one: '{tamam}/{n} adım tamam',
    other: '{tamam}/{n} adım tamam',
  },
  'host.listings.edit': 'Düzenle',
  'host.listings.status.draft': 'Taslak',
  'host.listings.status.published': 'Yayında',

  'host.steps.heading': 'Nasıl başlarım?',
  'host.steps.describe.title': 'Deneyimini anlat',
  'host.steps.describe.body':
    'Başlık, açıklama, süre ve kapasite. İstediğin kadar dilde yazabilirsin — gezgin kendi dilinde görür.',
  'host.steps.media.title': 'Görsellerini ekle',
  'host.steps.media.body':
    'En az bir kapak görseli. Deneyimin gerçekte nasıl göründüğünü göster; stok fotoğraf işe yaramıyor.',
  'host.steps.pricing.title': 'Takvimini ve fiyatını belirle',
  'host.steps.pricing.body':
    'Hangi günler, kaç kişi, ne kadar. Fiyatı kendi para biriminde yazarsın; tahsilat da onunla yapılır.',
  'host.steps.publish.title': 'Yayınla',
  'host.steps.publish.body': 'Onay beklemiyorsun. Yayınla dediğinde ilanın aramada çıkar.',

  'host.contact.title': 'Deneyim yayınlama yakında açılıyor',
  'host.contact.body':
    'Şu an ilk hostları tek tek topluyoruz. Ne anlatmak istediğini biliyorsan bize yaz — açıldığında ilanını birlikte hazırlarız.',
  'host.contact.cta': 'Bize yaz',
  'host.contact.howItWorks': 'Nasıl çalışır?',

  /**
   * 403'ün tek kaynağı: hesap Active değil (Suspended/Banned). Onay kapısı yok
   * ama ban var (VISION §9) — kullanıcıya "reddedildin" değil, hesabının durumu
   * söyleniyor; ikisi farklı şeyler.
   */
  'host.error.blocked': 'Bu hesap askıya alındı, host olamazsın. destek@expyra.com',
} as const
