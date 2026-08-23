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
  /**
   * Vitrin başlığı. Eskiden `home.samples.heading` ("Örnek deneyimler") ve yalnız
   * ekran okuyucuya görünüyordu — altındaki üç kart uydurma veriydi. Kartlar
   * gerçek ilan olunca hem ad hem görünürlük değişti: "örnek" demek artık yalan.
   */
  'home.showcase.heading': 'Yayındaki deneyimler',
  'home.showcase.more': 'Tüm deneyimleri gör',
  /**
   * Vitrin OKUNAMADI — "hiç deneyim yok" DEĞİL. İki durumun ayrı cümlesi olması
   * şart: kesintiyi bir ürün durumu gibi göstermek, hatayı görünmez kılar
   * (CLAUDE.md #1).
   */
  'home.showcase.unavailable':
    'Deneyimleri şu an listeleyemedik. Bir süre sonra tekrar dene — ilanlar yerinde duruyor.',
  /** Gerçekten hiç yayında ilan yok. Çıkış yolu ARZ tarafında (VISION §8). */
  'home.showcase.empty.title': 'Henüz yayında bir deneyim yok',
  'home.showcase.empty.body':
    'Burada ilk deneyimi sen açabilirsin. Bildiğin bir şeyi anlat, küçük bir grupla paylaş.',
  'home.showcase.empty.cta': 'Host ol',

  // --- Arama çubuğu ----------------------------------------------------------
  'search.destination.label': 'Nereye?',
  /** Artık serbest metin değil: alan yalnız kayıt defterindeki şehirleri kabul ediyor. */
  'search.destination.placeholder': 'Şehir ara',
  'search.date.label': 'Ne zaman?',
  'search.submit': 'Ara',

  // --- Şehir seçici ----------------------------------------------------------
  /**
   * Liste bir COMBOBOX'ın önerileri (bkz. city-picker.tsx); ekran okuyucu bu adı
   * "liste kutusu" ile birlikte okuyor, o yüzden metinde "liste" sözcüğü yok.
   */
  'search.city.listLabel': 'Şehir önerileri',
  'search.city.countriesHeading': 'Ülkeler',
  'search.city.citiesHeading': 'Şehirler',
  /** Ülke filtresinden çıkış satırı. */
  'search.city.allCountries': 'Tüm ülkeler',
  /**
   * Sayı METİNDE YAZILI DEĞİL: eşik API ile paylaşılan bir sabit
   * (`SearchCitiesQuery.MinQueryLength`) ve bir gün değişirse çeviri dosyalarında
   * unutulurdu. "İki" yerine "birkaç" demek de yanlış olurdu — kullanıcı kaç harf
   * yazacağını bilmeli, ama bunu ekrandaki liste zaten anında gösteriyor.
   */
  'search.city.tooShort': 'Şehir adının ilk harflerini yaz ya da listeden bir ülke seç.',
  'search.city.loading': 'Aranıyor…',
  'search.city.error': 'Şehir listesi şu an yüklenemedi. Biraz sonra tekrar dene.',
  'search.city.empty': 'Bu aramaya uyan şehir yok.',
  /** Liste API'nin tavanında kırpıldı; sayı yazmıyoruz, tavan bizim sabitimiz değil. */
  'search.city.truncated': 'Daha fazla şehir var — aramayı daraltmak için yazmaya devam et.',
  'search.city.clear': 'Seçili şehri kaldır',
  /** İstemcide doldurulan ŞABLON: seçim sayfa yenilenmeden değişiyor. */
  'search.city.selectedValue': '{sehir}, {ulke}',
  /** Yalnız ekran okuyucuya: liste dolduğunda kaç sonuç geldiğini duyuruyor. */
  'search.city.results': { one: '{n} şehir bulundu', other: '{n} şehir bulundu' },
  /** Ülke satırındaki rozet — o ülkede kaç şehir kayıtlı. */
  'search.city.countryCities': { one: '{n} şehir', other: '{n} şehir' },

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
  /**
   * Şehir ve ülke. Ülke adı ICU'dan (`Intl.DisplayNames`) geliyor: API şehir
   * satırında yalnız ülke KODU dönüyor.
   *
   * **`experience.rating` ve `experience.perPerson` SİLİNDİ.** İkisi de prototip
   * verinin sabitleriydi (`★ 4.9`, `48 € / kişi`). Fiyat Blok 7'de, puan Blok
   * 14'te geliyor; o güne kadar uydurma bir sayı göstermek boş bırakmaktan kötü.
   */
  'experience.place': '{sehir}, {ulke}',
  /**
   * Süre AYRI anahtarlarda, çünkü bir metinde tek çoğul sayacı olabiliyor (yazım
   * kuralı 2). Kartta iki sayım var (süre ve kişi), sürenin kendisinde de iki
   * (saat ve dakika) — her biri kendi anahtarında çekimlenip yer tutucu olarak
   * yerleşiyor. İngilizce'de "1 hour"/"2 hours" ayrımı ancak böyle korunuyor.
   */
  'experience.duration.hours': { one: '{n} saat', other: '{n} saat' },
  'experience.duration.minutes': { one: '{n} dakika', other: '{n} dakika' },
  /** Saat ve dakikanın arasına ne gireceğine (boşluk, virgül, "ve") çevirmen karar verir. */
  'experience.duration.full': '{saat} {dakika}',
  /**
   * Süresi girilmemiş ilan. Yayın doğrulaması süreyi şart koşmuyor (dört koşul:
   * çeviri, şehir, kategori, kapasite), yani bu durum gerçekten oluşabiliyor.
   * "0 saat" yazmak bozuk veriyi doğru gibi gösterirdi.
   */
  'experience.duration.unknown': 'Süre belirtilmemiş',
  'experience.meta': {
    one: '{sure} · en fazla {n} kişi',
    other: '{sure} · en fazla {n} kişi',
  },
  /**
   * Kartta yedeğe düşülmüş metnin rozeti — yalnız EKRAN OKUYUCUYA. Gözle
   * görünen kısım dilin adı ("Çekçe"); tam cümle görsel olarak yer kaplamadan
   * aynı bilgiyi veriyor.
   */
  'experience.card.language': 'Bu ilan {dil} yazılmış',

  // --- Arama sonucu ----------------------------------------------------------
  'explore.heading.all': 'Tüm deneyimler',
  /** Şehir ÇÖZÜLDÜ: ad tırnaksız, çünkü artık bir arama metni değil bir yer. */
  'explore.heading.city': '{sehir} deneyimleri',
  /** Şehir çözülemedi: kullanıcının yazdığı metin tırnak içinde, olduğu gibi. */
  'explore.heading.query': '“{arama}” için sonuçlar',
  /**
   * Sayım İKİ ayrı anahtar ve ayrım doğrulukla ilgili: API toplam sayı DÖNMÜYOR
   * (her sayfada bir `COUNT(*)`, cursor sayfalamanın kaçındığı tam taramayı geri
   * getirirdi). Sonuçların tamamı ekrandaysa "12 deneyim" doğru; sayfalama varsa
   * yalnızca "bu sayfada 24 deneyim" doğru.
   *
   * Misafir sayısı ve tarih ARTIK BU SATIRDA YOK: ikisi de sonucu daraltmıyor ve
   * özet satırında görünmeleri "hesaba katıldı" izlenimi verirdi. İkisi aşağıdaki
   * uyarıya taşındı (`explore.summary.dated` ve `explore.summary.guests` silindi).
   */
  'explore.summary': { one: '{n} deneyim', other: '{n} deneyim' },
  'explore.summary.page': { one: 'Bu sayfada {n} deneyim', other: 'Bu sayfada {n} deneyim' },
  /**
   * Sonucu daraltmayan seçimlerin TEK cümlesi. Parçalar `Intl.ListFormat` ile
   * birleşiyor ("a ve b" / "a and b" ayrımı dilin işi), o yüzden filtre adları
   * cümlenin gerektirdiği hâlde yazılıyor — Türkçe'de belirtme hâli
   * ("tarihi", "sayısını"), İngilizce'de yalın.
   *
   * Tarih uyarısı Blok 4'ten geliyor ve KALDI; yanına misafir sayısı eklendi:
   * prototipteki kapasite süzmesi gerçek veriyle birlikte gitti (sunucuda böyle
   * bir filtre yok — Blok 8) ve sessizce yok saymak yerine söyleniyor.
   */
  'explore.filtersNotice':
    'Sonuçları yalnızca şehre göre süzüyoruz — {filtreler} henüz hesaba katmıyoruz.',
  'explore.filter.date': 'seçtiğin tarihi',
  'explore.filter.guests': 'misafir sayısını',

  /** Sayfa gezinmesi: cursor tek yönlü, o yüzden "önceki" yok, "başa dön" var. */
  'explore.pager.label': 'Sonuç sayfaları',
  'explore.pager.next': 'Sonraki sayfa',
  'explore.pager.first': 'İlk sayfaya dön',

  /**
   * Adres çubuğundaki sayfa bağlantısı bozuk. Sessizce ilk sayfayı göstermek,
   * sayfalayan bir istemciyi sonsuz döngüye sokan davranış (API'de de 400).
   */
  'explore.pageLink.title': 'Bu sayfa bağlantısı okunamadı',
  'explore.pageLink.body':
    'Adresteki sayfa işareti bozulmuş görünüyor. Aramaya baştan başla — sonuçlar yerinde duruyor.',

  'explore.empty.title': 'Burada henüz deneyim yok',
  /** "Yaz" değil "seç": şehir alanı artık bir seçici. Misafir sayısı süzmediği için o öneri kalktı. */
  'explore.empty.body':
    'Listeden başka bir şehir seçmeyi dene. Yeni şehirler ve yeni deneyimler sürekli ekleniyor.',
  'explore.empty.cta': 'Tüm deneyimleri gör',
  /** İkinci çıkış yolu ARZ tarafında: bu şehirde ilan olmamasının çözümü oradaki ilk host. */
  'explore.empty.hostCta': 'Bu şehirde ilk host sen ol',

  /**
   * Adres çubuğundaki şehir kayıt defterinde yok. "Sonuç bulunamadı" DEĞİL —
   * arama hiç yapılmadı ve bunu söylemek zorundayız (PLAN Blok 4, kabul kriteri 3).
   */
  'explore.cityMissing.title': 'Bu şehri tanımıyoruz',
  'explore.cityMissing.body':
    'Adresteki şehir kayıtlarımızda yok; bağlantı eskimiş olabilir. Yukarıdaki alandan listeden bir şehir seç.',
  'explore.cityMissing.cta': 'Tüm deneyimleri gör',

  // --- Deneyim detayı --------------------------------------------------------
  /**
   * Paylaşım önizlemesinde açıklama yoksa kullanılan cümle. Uydurma bir tanıtım
   * değil, yalnızca doğrulanabilir olan: şehir.
   */
  'experience.detail.meta.fallback': '{sehir} şehrinde bir yerel deneyim.',
  /**
   * Fallback rozeti (docs/I18N.md §2: *"Fallback devreye girdiğinde arayüz bunu
   * gizlemez: 'Bu açıklama Türkçe' yazar"*). Dil ADI `Intl.DisplayNames`'ten
   * geliyor — 49 dilin adını 49 dile çeviren bir tablo tutmuyoruz.
   */
  'experience.detail.text.fallback': 'Bu açıklama {dil}',
  'experience.detail.duration.label': 'Süre',
  'experience.detail.capacity.label': 'Grup büyüklüğü',
  'experience.detail.capacity.value': { one: 'En fazla {n} kişi', other: 'En fazla {n} kişi' },
  'experience.detail.about': 'Bu deneyim hakkında',
  /** Açıklama boş olabilir: yayın doğrulaması çeviri SATIRINI şart koşuyor, dolu olmasını değil. */
  'experience.detail.noDescription': 'Host henüz bir açıklama yazmadı.',
  'experience.detail.spoken.heading': 'Deneyim sırasında konuşulan diller',
  /**
   * docs/I18N.md §3 karıştırmasının arayüzdeki karşılığı: host ilanını İngilizce
   * yazıp turu yalnız Çekçe anlatabilir ve gezgin için kritik olan ikincisidir.
   * Bu cümle olmadan iki liste aynı şey sanılır.
   */
  'experience.detail.spoken.help':
    'Host deneyimi bu dillerde anlatıyor. İlan metninin yazıldığı dil ayrı bir şey.',
  'experience.detail.spoken.none': 'Host konuştuğu dilleri henüz yazmadı.',
  'experience.detail.tags.heading': 'Etiketler',
  'experience.detail.gallery.heading': 'Galeri',
  'experience.detail.host.heading': 'Bu deneyimi düzenleyen',
  'experience.detail.host.anonymous': "Expyra host'u",
  /**
   * Takvim Blok 7, rezervasyon Blok 9. Sessiz bir boşluk "bu sayfa yarım"
   * dedirtirdi; iç terim de kullanılmıyor (yazım kuralı 4).
   */
  'experience.detail.booking.title': 'Tarih ve fiyat',
  /**
   * Takvimi hiç kurulmamış ilan. Başlık artık "yok" demiyor çünkü çoğu ilanda
   * tarihler VAR; bu metin yalnızca boş durumda görünüyor.
   */
  'experience.detail.booking.noSlots':
    'Bu deneyim için şu an açık bir tarih yok. Host takvimini güncellediğinde burada görünecek.',
  'experience.detail.booking.perPerson': 'kişi başı',
  'experience.detail.booking.pickDate': 'Tarih seç',
  'experience.detail.booking.timeZone': 'Saatler {bolge} saatiyle.',
  'experience.detail.booking.adults': 'Yetişkin',
  'experience.detail.booking.children': 'Çocuk',
  'experience.detail.booking.infants': 'Bebek',
  'experience.detail.booking.currency': 'Para birimi',
  'experience.detail.booking.currencyNone': 'Host’un para birimi',
  'experience.detail.booking.update': 'Fiyatı hesapla',
  'experience.detail.booking.total': 'Toplam',
  /** Gösterim para birimindeki karşılık — tahsilat DEĞİL (PLAN Blok 7, kriter 3). */
  'experience.detail.booking.displayTotal': 'Yaklaşık {tutar}',
  'experience.detail.booking.chargedIn':
    'Tahsilat {paraBirimi} olarak yapılıyor. Kartının para birimi farklıysa bankan kendi kurunu uygular.',
  'experience.detail.booking.quoteFailed':
    'Bu seçim için fiyat hesaplanamadı. Seansta yeterli yer olmayabilir ya da seans kapanmış olabilir.',
  'experience.detail.cityLink': '{sehir} şehrindeki tüm deneyimler',
  'experience.detail.back': 'Keşfet’e dön',

  // --- Nasıl çalışır ---------------------------------------------------------
  /** Sayfanın adı `nav.howItWorks`'ten geliyor — aynı sayfa, aynı ad. */
  'howItWorks.lede': 'Üç adımda bitiyor.',
  'howItWorks.back': 'Geri',
  'howItWorks.step.discover.title': 'Keşfet',
  'howItWorks.step.discover.body':
    'Şehrindeki yerel deneyimlere göz at. Küçük gruplar, gerçek hostlar.',
  'howItWorks.step.book.title': 'Rezerve et',
  // Rezervasyon henüz yok (PLAN Blok 9). Olmayan bir akışı anlatmak, ilana giren
  // kullanıcıya vaat edilen düğmeyi aratıyordu.
  'howItWorks.step.book.body': 'Tarih ve kişi sayısını seç, fiyatı gör. Rezervasyon yakında.',
  'howItWorks.step.join.title': 'Katıl',
  'howItWorks.step.join.body': 'Host seni karşılar ve deneyimin başlar.',
  'howItWorks.backToExplore': 'Keşfe dön',

  // --- Deneyimlerim ----------------------------------------------------------
  /** Başlık `nav.myExperiences` — üst çubukla aynı ad (bkz. site-footer.tsx). */
  // Aynı ekranda biletin altında "QR henüz imzalanmıyor" yazıyor; başlık onu
  // yalanlamamalı.
  'myExperiences.lede': 'Biletlerin burada.',
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

  // --- Duvar kağıdı (ortak layout — HER sayfada görünür) ---------------------
  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Sokakta ızgara balık',
  'wallpaper.kitchen.place': 'Ev mutfağı',
  'wallpaper.kitchen.label': 'Teyze ile yemek',
  'wallpaper.cappadocia.place': 'Kapadokya',
  'wallpaper.cappadocia.label': 'Sıcak hava balonu',
  'wallpaper.pause': 'Arka plan videosunu durdur',
  'wallpaper.play': 'Arka plan videosunu oynat',
  'account.avatar.label': 'Profil fotoğrafı',
  'account.avatar.help': 'JPEG, PNG veya WebP · en az 800×600 piksel · en fazla 10 MB',
  'account.avatar.add': 'Fotoğraf ekle',
  'account.avatar.change': 'Değiştir',
  'account.avatar.remove': 'Kaldır',
  'account.avatar.uploading': 'Yükleniyor…',
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

  'host.listings.heading': 'İlanlarım · {sayi}',
  'host.listings.edit': 'Düzenle',
  'host.listings.view': 'İlanı gör',
  'host.listings.status.draft': 'Taslak',
  'host.listings.status.published': 'Yayında',
  /** Arşiv bir silme değil: satır duruyor, yalnız aramada çıkmıyor. Metin de öyle diyor. */
  'host.listings.status.archived': 'Arşivde',

  /** Yayına engel kalmadı. Sayı yazmıyoruz: "0 eksik" bir bilgi değil, bir çıkarım. */
  'host.listings.ready': 'Yayına hazır',
  'host.listings.missing': { one: '{n} eksik alan', other: '{n} eksik alan' },

  // Boş durum: host paneli ilk kez açan kişi. Bir hata değil, bir davet.
  'host.listings.empty.heading': 'İlanlarım',
  'host.listings.empty.title': 'Henüz bir ilanın yok',
  'host.listings.empty.body':
    'İlk taslağını aç. Yayınlamadan önce istediğin kadar üstünde çalışabilirsin — taslakları senden başkası görmez.',
  'host.listings.empty.cta': 'İlk deneyimini yaz',

  /**
   * Liste OKUNAMADI — "ilanın yok" ile aynı şey değil. İkisini tek cümleye
   * indirmek, bir kesintide host'a ilanlarının silindiğini düşündürürdü.
   */
  'host.listings.errorHeading': 'İlanlarım',
  'host.listings.error':
    'İlanların şu an yüklenemedi. Silinmediler — biraz sonra sayfayı yenile.',

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

  /**
   * Blok 5 ile birlikte "yakında açılıyor" ARTIK DOĞRU DEĞİL: ilan yazılıyor ve
   * yayınlanıyor. Metin, hâlâ doğru olan vaade çekildi — ilk hostlarla tek tek
   * ilgileniyoruz.
   */
  'host.contact.title': 'Takıldığın yerde bize yaz',
  'host.contact.body':
    'İlk hostlarla tek tek ilgileniyoruz. İlanını hazırlarken bir şey tıkanırsa ya da emin olamadığın bir karar varsa yaz; birlikte bakarız.',
  'host.contact.cta': 'Bize yaz',
  'host.contact.howItWorks': 'Nasıl çalışır?',

  /**
   * 403'ün tek kaynağı: hesap Active değil (Suspended/Banned). Onay kapısı yok
   * ama ban var (VISION §9) — kullanıcıya "reddedildin" değil, hesabının durumu
   * söyleniyor; ikisi farklı şeyler.
   */
  'host.error.blocked': 'Bu hesap askıya alındı, host olamazsın. destek@expyra.com',

  // --- Deneyim sihirbazı -----------------------------------------------------

  /** Sihirbazın girişi: geri alınamayan tek kararın sorulduğu ekran. */
  'host.experience.new.meta.title': 'Yeni deneyim',
  'host.experience.new.title': 'Yeni bir deneyim aç',
  'host.experience.new.lede':
    'Önce tek bir şey soruyoruz: ilanı hangi dilde yazacaksın. Gerisini taslağın içinde, istediğin sırayla dolduracaksın.',
  'host.experience.new.language.label': 'İlanı hangi dilde yazacaksın?',
  /**
   * Geri alınamazlık AÇIKÇA yazılı. Kullanıcı bunu sonradan, alanı aradığında
   * öğrenmemeli — "değiştiremezsin" cümlesini kaydettikten sonra görmek, kararı
   * bilinçsiz vermiş olmak demek.
   */
  'host.experience.new.language.help':
    'Bu dil sonradan değiştirilemez: ilanın adresi ondan türüyor ve başka dil yazılmamışsa gezgin bu metni görüyor. Başka dilleri sonra ekleyebilirsin.',
  'host.experience.new.submit': 'Taslağı aç',
  'host.experience.new.pending': 'Açılıyor…',

  'host.experience.new.next.heading': 'Sırada ne var?',
  'host.experience.new.next.text': 'Başlık ve açıklama — dilediğin kadar dilde.',
  'host.experience.new.next.basics': 'Süre ve kaç kişi alacağın.',
  'host.experience.new.next.place': 'Şehir, kategori ve turda konuştuğun diller.',
  'host.experience.new.next.publish': 'Hazır olduğunda yayınla. Onay beklemiyorsun.',

  'host.experience.edit.meta.title': 'Deneyimi düzenle',
  'host.experience.edit.lede':
    'Her bölüm ayrı kaydediliyor. İstediğin yerde bırakabilirsin; taslağın seni bekler.',
  /** Orijinal dilde başlık henüz yazılmamış ilan. Boş bırakmak satırı kimliksiz bırakırdı. */
  'host.experience.untitled': 'İsimsiz taslak',
  'host.experience.back': '← Host paneline dön',

  'host.experience.save': 'Kaydet',
  'host.experience.saving': 'Kaydediliyor…',
  'host.experience.saved': 'Kaydedildi.',

  'host.experience.section.text': 'Başlık ve açıklama',
  'host.experience.section.textHelp':
    'Gezgin bunu okuyup karar veriyor. Ne yapacağınızı, nerede buluşacağınızı ve senin bu işle bağını anlat.',
  'host.experience.section.basics': 'Süre ve kapasite',
  'host.experience.section.basicsHelp':
    'Bir seansın ne kadar sürdüğü ve aynı anda kaç kişi alabildiğin. Takvim ve fiyat sonra geliyor.',
  'host.experience.section.place': 'Şehir',
  'host.experience.section.placeHelp':
    'Deneyimin geçtiği şehir. Saat dilimi bundan türüyor — seansların saati buna göre gösterilecek.',
  'host.experience.section.category': 'Kategori',
  'host.experience.section.categoryHelp':
    'Gezgin aramada bununla filtreliyor. En yakın olanı seç; birden fazla seçilemiyor.',
  'host.experience.section.languages': 'Konuşulan diller ve etiketler',
  'host.experience.section.languagesHelp':
    'Turu hangi dillerde anlatıyorsun? Bu, ilanı hangi dilde yazdığından ayrı bir şey.',
  'host.experience.section.status': 'Yayın',
  'host.experience.section.statusHelp':
    'Yayınlamak için gerekenler aşağıda. Onay süreci yok — eksik kalmadıysa ilanın anında aramada çıkar.',

  // Çeviri sekmeleri
  'host.experience.translations.tabsLabel': 'İlan metninin dilleri',
  /** Orijinal dil: yayın koşulu. Rozetin işi, hangi sekmenin şart olduğunu söylemek. */
  'host.experience.translations.required': 'zorunlu',
  'host.experience.translations.optional': 'isteğe bağlı',
  'host.experience.translations.add.label': 'Başka bir dilde yaz',
  'host.experience.translations.add.submit': 'Aç',
  /**
   * Makine çevirisi rozeti (docs/I18N.md §2). Bu blokta hiç görünmüyor; alan
   * Blok 10 için hazır ve rozet şimdiden var ki o gün otomatik çeviri, host'un
   * yazdığı metin gibi görünmesin.
   */
  'host.experience.translations.machine':
    'Bu metin otomatik çevrildi. Düzeltip kaydedersen senin yazdığın metin olur.',

  'host.experience.title.label': 'Başlık',
  'host.experience.title.placeholder': 'Kadıköy’de sokak lezzetleri turu',
  'host.experience.title.help':
    'Kısa ve somut. Gezgin listede önce bunu görüyor; ilanın adresi de bundan türüyor.',
  'host.experience.description.label': 'Açıklama',
  'host.experience.description.placeholder':
    'Nerede buluşuyorsunuz, ne yapıyorsunuz, ne yemeli, ne giymeli…',
  'host.experience.description.help':
    'Yayınlamak için şart değil ama gezgin kararını burada veriyor. Programı sırayla anlat.',

  'host.experience.duration.label': 'Süre (dakika)',
  'host.experience.duration.help':
    'Bir seansın toplam süresi. Örnek: 90 dakika, 180 dakika. En fazla yedi gün.',
  'host.experience.capacity.label': 'Kapasite (kişi)',
  'host.experience.capacity.help':
    'Aynı seansta en fazla kaç kişi. Yayınlamak için en az bir kişi olmalı.',

  'host.experience.city.label': 'Deneyim hangi şehirde?',
  'host.experience.city.placeholder': 'Şehir ara',
  /**
   * Seçili şehrin ADI gösterilemiyor: API'de kimlikten şehre giden bir uç yok
   * (`features/places/api.ts`). Uydurmak yerine elimizdeki doğru bilgi yazılıyor.
   */
  'host.experience.place.saved': 'Şehir seçili · saat dilimi {saat}',
  'host.experience.place.empty': 'Henüz şehir seçilmedi.',
  'host.experience.place.locked':
    'Bir kez yayınlanmış ilanın şehri değiştirilemez: seansların saati ve rezervasyonların yeri buna bağlı. Başka bir şehir için yeni bir ilan aç.',

  'host.experience.category.label': 'Kategori',
  'host.experience.category.none': 'Seçilmedi',
  'host.experience.category.help': 'Deneyimin ağırlıklı olarak neye dair olduğu.',

  'host.experience.spoken.label': 'Deneyim sırasında konuştuğun diller',
  /**
   * docs/I18N.md §3'ün tam karşılığı: ilan metninin dili ile turda konuşulan dil
   * ayrı şeyler ve gezgin için kritik olan ikincisi. Cümle bunu açıkça söylüyor.
   */
  'host.experience.spoken.help':
    'İlanı hangi dilde yazdığından bağımsız: turu hangi dillerde anlatıyorsan onları işaretle. En fazla on dil.',
  'host.experience.tags.label': 'Etiketler',
  'host.experience.tags.placeholder': 'sokak lezzetleri, yürüyüş, küçük grup',
  'host.experience.tags.help':
    'Virgülle ayır. En fazla on etiket. Aramada eşleşmeye yardım ediyorlar.',

  'host.experience.missing.heading': 'Yayınlamak için gerekenler',
  'host.experience.ready': 'Hepsi tamam. İlanı yayınlayabilirsin.',
  /**
   * Yayın koşullarının kullanıcıya görünen adları. Sunucu KOD gönderiyor
   * (`ExperiencePublishRequirement`), cümle değil — bu satırlar o kodların
   * karşılığı ve hem kontrol listesinde hem de 409 mesajında AYNI metin.
   *
   * Kısa isim öbeği, emir cümlesi değil: `Intl.ListFormat` ile birleştirilip
   * "başlık, şehir ve kategori" gibi tek bir cümlenin içine giriyorlar.
   */
  'host.experience.missing.translation': 'ilanın yazıldığı dilde başlık',
  'host.experience.missing.city': 'şehir',
  'host.experience.missing.category': 'kategori',
  'host.experience.missing.capacity': 'kapasite',
  'host.experience.missing.duration': 'süre',
  'host.experience.missing.cover': 'kapak görseli',
  'host.experience.missing.price': 'fiyat',
  /** Sunucu tanımadığımız bir koşul eklerse: gizlemiyoruz, "bir şey daha var" diyoruz. */
  'host.experience.missing.unknown': 'tamamlanmamış bir alan',

  'host.experience.publish': 'Yayınla',
  'host.experience.republish': 'Yeniden yayınla',
  'host.experience.publishing': 'Yayınlanıyor…',
  'host.experience.published': 'İlanın yayında.',
  'host.experience.archive': 'Arşivle',
  'host.experience.archiving': 'Arşivleniyor…',
  'host.experience.archived': 'İlan arşivlendi.',

  // --- Görseller (Blok 6) -------------------------------------------------
  //
  // Hata metinleri SUNUCUDAN gelmiyor: API mesajları Türkçe ve arayüz iki dilde.
  // Sunucu makine-okunur bir kod veriyor (AppException.Code), cümleyi burası yazıyor.
  'host.media.heading': 'Görseller',
  'host.media.hint': 'JPEG, PNG veya WebP · en az 800×600 piksel · en fazla 10 MB · 12 görsele kadar',
  'host.media.add': 'Görsel ekle',
  'host.media.drop': 'Dosyaları buraya sürükleyin',
  'host.media.uploading': 'Yükleniyor…',
  'host.media.empty': 'Henüz görsel yok. İlk yüklediğin görsel kapak olur.',
  'host.media.cover': 'Kapak',
  'host.media.makeCover': 'Kapak yap',
  'host.media.delete': 'Sil',
  'host.media.moveEarlier': 'Öne al',
  'host.media.moveLater': 'Geri al',
  'host.media.position': '{n}. görsel',
  'host.media.error.rejected': 'Görsel kabul edilmedi.',
  'host.media.error.unsupported': 'Yalnız JPEG, PNG ve WebP yükleyebilirsin.',
  'host.media.error.notUploaded': 'Yükleme tamamlanmadı. Tekrar dene.',
  'host.media.error.notAnImage': 'Bu dosya bir görsel değil.',
  'host.media.error.mismatch': 'Dosyanın içeriği uzantısıyla uyuşmuyor.',
  'host.media.error.tooSmall': 'Görsel en az 800×600 piksel olmalı.',
  'host.media.error.tooLarge': 'Dosya en fazla 10 MB olabilir.',
  'host.media.error.limit': 'Bir ilanda en fazla 12 görsel olabilir.',
  'host.media.error.lastOfPublished':
    'Yayındaki bir ilanın son görseli silinemez. Önce başka bir görsel ekle ya da ilanı arşivle.',

  'host.experience.status.publishedNote':
    'İlanın aramada çıkıyor. Arşivlersen görünmez olur, silinmez — istediğin zaman geri yayınlarsın.',
  'host.experience.status.privateNote': 'Yayınlanana kadar bu ilanı senden başkası görmüyor.',

  // Hatalar. Hiçbiri API'nin metnini göstermiyor: o metnin dili kullanıcının
  // dili olmak zorunda değil (features/auth/api.ts kararı).
  'host.experience.error.notFound': 'Bu ilan bulunamadı. Panelden yeniden aç.',
  'host.experience.error.invalid': 'Bu bölüm kaydedilemedi. Alanları kontrol edip tekrar dene.',
  'host.experience.error.language':
    'Bu dilde ilan yazılamıyor. Listeden başka bir dil seç.',
  'host.experience.error.title': 'Başlık zorunlu ve en fazla 120 karakter olabilir.',
  'host.experience.error.description': 'Açıklama en fazla 4000 karakter olabilir.',
  'host.experience.error.duration': 'Süreyi dakika olarak yaz: en az 1, en fazla 10080.',
  'host.experience.error.capacity': 'Kapasiteyi kişi olarak yaz: en az 1, en fazla 500.',
  'host.experience.error.city': 'Şehri listeden seç — yazdığın metin tek başına yeterli değil.',
  'host.experience.error.category': 'Listeden bir kategori seç.',
  'host.experience.error.spokenLanguages': 'En fazla on dil işaretleyebilirsin.',
  'host.experience.error.tags': 'Etiketler boş olamaz; en fazla on tane ve her biri kısa olmalı.',
  /**
   * İki ayrı 409'un tek cevabı: yayınlanmış ilanın şehri değişmiyor, ve yayındaki
   * ilan yayın koşullarını ihlal edecek şekilde kaydedilemiyor. Çözüm ikisinde de
   * aynı, o yüzden cümle de aynı.
   */
  'host.experience.error.publishedConflict':
    'Yayındaki bir ilanda bu değişiklik yapılamıyor. Önce arşivle, sonra düzenle.',
  'host.experience.error.publishBlocked': 'Yayınlanamadı. Eksik olanlar: {eksikler}.',
  /** Eksik listesi okunamadı; sessiz kalmak yerine ne yapılacağını söylüyoruz. */
  'host.experience.error.publishBlockedUnknown':
    'Yayınlanamadı: ilan henüz tamam değil. Yukarıdaki listeyi kontrol et.',

  // --- Kategoriler -----------------------------------------------------------
  /**
   * Kategori ADI veritabanında YOK, burada (docs/I18N.md §1, docs/categories.json):
   * ad bizim yazdığımız arayüz metni, host'un içeriği değil. API yalnız slug dönüyor.
   *
   * `docs/categories.json`'a satır eklemek buraya ve `en.ts`'e de satır eklemeyi
   * gerektiriyor; eksikliği DERLEMEDE yakalanamıyor (slug listesi çalışma anında
   * veritabanından geliyor), bu yüzden eşlemesi olmayan slug ekranda ham hâliyle
   * görünüyor ve konsola yazılıyor.
   */
  'category.food-drink': 'Yeme içme',
  'category.art-culture': 'Sanat ve kültür',
  'category.history-heritage': 'Tarih ve miras',
  'category.nature-outdoors': 'Doğa ve açık hava',
  'category.water-sea': 'Su ve deniz',
  'category.sports-adventure': 'Spor ve macera',
  'category.crafts-workshops': 'El sanatları ve atölyeler',
  'category.music-nightlife': 'Müzik ve gece hayatı',
  'category.wellness': 'İyi yaşam',
  'category.photography': 'Fotoğrafçılık',
  'category.tours-walks': 'Turlar ve yürüyüşler',
  'category.local-life': 'Yerel hayat',
  // --- Fiyat (PLAN Blok 7) ---
  'host.experience.section.pricing': 'Fiyat',
  'host.experience.section.pricingHelp':
    'Kişi başı fiyatı kendi para biriminde gir. Tahsilat daima bu para biriminde yapılıyor; gezgin başka bir para birimi seçerse yalnızca gösterim çevriliyor.',

  'host.pricing.currency.label': 'Tahsilat para birimi',
  'host.pricing.currency.help':
    'Paranın sana ulaşacağı para birimi. Yayınladıktan sonra değiştirilemiyor — önce arşivlemen gerekir.',
  'host.pricing.currency.locked': 'İlan yayında olduğu için para birimi kilitli.',
  'host.pricing.currency.placeholder': 'Seç',

  'host.pricing.adult.label': 'Yetişkin (kişi başı)',
  'host.pricing.adult.help': 'Zorunlu. Kartlarda ve aramada görünen “şu fiyattan başlayan” tutar bu.',
  'host.pricing.child.label': 'Çocuk (kişi başı)',
  'host.pricing.child.help': 'Boş bırakırsan çocuk kademesi sunulmuyor. Ücretsizse 0 yaz.',
  'host.pricing.infant.label': 'Bebek (kişi başı)',
  'host.pricing.infant.help': 'Boş bırakırsan bebek kademesi sunulmuyor. Ücretsizse 0 yaz.',

  'host.pricing.saved': 'Fiyat kaydedildi.',
  'host.pricing.empty': 'Henüz fiyat girilmedi. Fiyatsız bir ilan yayınlanamıyor.',

  'host.pricing.error.currency': 'Geçerli bir para birimi seç.',
  'host.pricing.error.currencyLocked':
    'Yayındaki bir ilanın para birimi değiştirilemez. Önce arşivle.',
  'host.pricing.error.adult': 'Yetişkin fiyatı zorunlu ve geçerli bir tutar olmalı.',
  'host.pricing.error.child': 'Çocuk fiyatı geçerli bir tutar olmalı.',
  'host.pricing.error.infant': 'Bebek fiyatı geçerli bir tutar olmalı.',
  'host.pricing.error.range':
    'Tutar ödeme sağlayıcısının kabul ettiği aralığın dışında. Çok küçük ya da çok büyük bir fiyat girdin.',

  // --- Takvim (PLAN Blok 7) ---
  'host.experience.section.schedule': 'Takvim',
  'host.experience.section.scheduleHelp':
    'Hangi gün ve saatlerde yapıyorsun? Saatler deneyimin şehrinin saat diliminde — yaz saati geçişinde yazdığın saat değişmiyor.',

  'host.schedule.blocked':
    'Takvim kurmak için önce şehir, süre ve kapasite gerekiyor. Yukarıdaki bölümleri tamamla.',
  'host.schedule.timeZone': 'Saat dilimi: {bolge}',
  'host.schedule.generatedThrough': 'Takvim {tarih} tarihine kadar hazır.',

  // Haftalık kural
  'host.schedule.rule.heading': 'Haftalık kural',
  'host.schedule.rule.days': 'Günler',
  'host.schedule.rule.daysHelp': 'Birden fazla seçebilirsin; her gün ayrı bir kural olur.',
  'host.schedule.rule.time': 'Başlangıç saati',
  'host.schedule.rule.timeHelp': 'Deneyimin şehrinin saatiyle.',
  'host.schedule.rule.start': 'Bu tarihten itibaren',
  'host.schedule.rule.startHelp': 'Boş bırakırsan bugünden başlar.',
  'host.schedule.rule.submit': 'Kuralı ekle',
  'host.schedule.rule.pending': 'Ekleniyor…',
  'host.schedule.rule.stop': 'Durdur',
  'host.schedule.rule.stopping': 'Durduruluyor…',
  'host.schedule.rule.empty': 'Henüz haftalık kural yok.',
  'host.schedule.rule.stopped': 'durduruldu',

  // Kapalı aralık
  'host.schedule.blackout.heading': 'Kapalı günler',
  'host.schedule.blackout.start': 'Başlangıç',
  'host.schedule.blackout.end': 'Bitiş',
  'host.schedule.blackout.endHelp': 'Boş bırakırsan tek gün kapanır. Bitiş günü dâhil.',
  'host.schedule.blackout.submit': 'Kapat',
  'host.schedule.blackout.pending': 'Kapatılıyor…',
  'host.schedule.blackout.remove': 'Kaldır',
  'host.schedule.blackout.removing': 'Kaldırılıyor…',
  'host.schedule.blackout.empty': 'Kapalı gün yok.',

  // Seanslar
  'host.schedule.slots.heading': 'Yaklaşan seanslar',
  'host.schedule.slots.empty': 'Bu aralıkta seans yok.',
  'host.schedule.slots.remaining': {
    one: '{n} yer kaldı',
    other: '{n} yer kaldı',
  },
  'host.schedule.slots.closed': 'Kapalı',
  'host.schedule.slots.closedByBlackout': 'Kapalı gün',
  'host.schedule.slots.close': 'Kapat',
  'host.schedule.slots.closing': 'Kapatılıyor…',
  'host.schedule.slots.open': 'Aç',
  'host.schedule.slots.opening': 'Açılıyor…',
  'host.schedule.slots.more': 've {n} seans daha',

  // Günler
  'host.schedule.day.monday': 'Pazartesi',
  'host.schedule.day.tuesday': 'Salı',
  'host.schedule.day.wednesday': 'Çarşamba',
  'host.schedule.day.thursday': 'Perşembe',
  'host.schedule.day.friday': 'Cuma',
  'host.schedule.day.saturday': 'Cumartesi',
  'host.schedule.day.sunday': 'Pazar',

  // Onaylar
  'host.schedule.ruleSaved': 'Kural eklendi ve seanslar oluşturuldu.',
  'host.schedule.ruleStopped': 'Kural durduruldu.',
  'host.schedule.slotOpened': 'Seans açıldı.',
  'host.schedule.slotClosed': 'Seans kapatıldı.',
  'host.schedule.blackoutSaved': 'Günler kapatıldı.',
  'host.schedule.blackoutRemoved': 'Kapalı aralık kaldırıldı.',

  // Hatalar — her biri sunucunun makine-okunur koduna karşılık geliyor
  'host.schedule.error.noDay': 'En az bir gün seç.',
  'host.schedule.error.time': 'Saati SS:DD biçiminde gir.',
  'host.schedule.error.date': 'Tarihi geçerli bir gün olarak gir.',
  'host.schedule.error.range': 'Bitiş tarihi başlangıçtan önce olamaz.',
  'host.schedule.error.notSchedulable':
    'Takvim kurmak için önce şehir, süre ve kapasite gerekiyor.',
  'host.schedule.error.duplicateRule': 'O gün ve saatte zaten bir kural var.',
  'host.schedule.error.ruleLimit': 'Bir deneyimde daha fazla haftalık kural olamaz.',
  'host.schedule.error.dstGap':
    'O saat, yaz saati geçişi yüzünden o gün hiç yaşanmıyor. Bir saat sonrasını dene.',
  'host.schedule.error.past': 'Geçmiş bir seans değiştirilemez.',
  'host.schedule.error.slotExists': 'O saatte zaten bir seans var.',
  'host.schedule.error.blackedOut': 'O tarih kapalı olarak işaretli. Önce aralığı kaldır.',
  'host.schedule.error.generated':
    'Haftalık kuraldan doğan seans silinemez; kapatabilirsin.',
  'host.schedule.error.hasBookings': 'Rezervasyonu olan bir seans değiştirilemez.',
  'host.schedule.error.blackoutLimit': 'Daha fazla kapalı aralık eklenemez.',
  'host.schedule.error.horizon': 'Takvim bu kadar ileriye açılamıyor.',
  'host.schedule.error.generic': 'Bu işlem şu an yapılamadı.',

} as const
