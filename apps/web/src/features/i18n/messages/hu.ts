import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Macarca arayüz.
 *
 * **Hitap "te" (tegezés).** Macar tüketici uygulamalarının çoğu (Wolt, Revolut,
 * Bolt) senli konuşuyor ve ürünün tonu da bu (tr/de/en ile aynı). "Host" =
 * házigazda.
 *
 * **Sayıdan sonra isim tekil:** "3 óra", "5 fő" — "3 órák" yanlış. `one` ve `other`
 * bu yüzden çoğu anahtarda aynı metin; şema CLDR'ın iki biçimini istediği için
 * ikisi de yazılı.
 *
 * **Şehir adı cümleye eksiz giriyor.** Macarca yer bildirmek için ünlü uyumlu ek
 * istiyor ("Prágában", "Isztambulban") ve ad kayıt defterinden eksiz geliyor;
 * bu yüzden "Élmények: {sehir}" gibi iki noktalı kuruluş. Dil adı ise
 * `Intl.DisplayNames('hu')`'dan küçük harfli sıfat olarak geliyor ("török") ve
 * "{dil} nyelvű" kalıbı her dilde eksiz çalışıyor.
 *
 * Tırnak „…” (Macar usulü). Çevrilmeyenler en.ts ile aynı: marka ve destek adresi.
 */
export const hu = {
  'meta.description': 'Találj helyi élményeket, és foglald le őket.',

  'nav.primaryLabel': 'Főmenü',
  'nav.footerLabel': 'Lábléc menü',
  'nav.explore': 'Felfedezés',
  'nav.myExperiences': 'Élményeim',
  'nav.becomeHost': 'Legyél házigazda',
  'nav.howItWorks': 'Hogyan működik',

  'language.trigger': 'Nyelv: {dil}. Módosítás.',
  'language.dialogLabel': 'Nyelvválasztás',
  'language.search.label': 'Nyelv keresése',
  'language.search.placeholder': 'Nyelv keresése',
  'language.group.ui': 'Felületi nyelvek',
  'language.group.content': 'További nyelvek',
  'language.group.contentHint':
    'A felület még nincs lefordítva — az élmények ettől még közzétehetők ezeken a nyelveken.',
  'language.empty': 'Egy nyelv sem felel meg a keresésnek.',

  'theme.toLight': 'Váltás világos témára',
  'theme.toDark': 'Váltás sötét témára',

  'currency.trigger': 'Pénznem: {para}. Módosítás.',
  'currency.dialogLabel': 'Pénznem kiválasztása',
  'currency.search.label': 'Pénznem keresése',
  'currency.search.placeholder': 'EUR, dollár, forint…',
  'currency.none': 'A házigazda pénzneme',
  'currency.empty': 'Egy pénznem sem felel meg a keresésnek.',

  'home.hero.title': 'Új módja annak, hogy megtaláld',
  'home.hero.titleAccent': 'az élményeket, amelyeket csak a helyiek ismernek',
  'home.hero.lede':
    'Olyan emberektől, akik tényleg ott élnek. Kis csoportok, valódi emberek, néhány óra, amit nem felejtesz el.',
  'home.showcase.heading': 'Élmények az Expyrán',
  'home.showcase.more': 'Az összes élmény',
  'home.showcase.unavailable':
    'Most nem tudtuk megjeleníteni az élményeket. Próbáld újra kicsit később — a hirdetések megvannak.',
  'home.showcase.empty.title': 'Még semmi sincs közzétéve',
  'home.showcase.empty.body':
    'Lehetsz te az első. Mutass meg egy kis csoportnak valamit, amit ismersz.',
  'home.showcase.empty.cta': 'Legyél házigazda',

  'search.destination.label': 'Hová?',
  'search.destination.placeholder': 'Város keresése',
  'search.date.label': 'Mikor?',
  'search.date.placeholder': 'Válassz dátumot',
  'search.date.dialogLabel': 'Válassz dátumot',
  'search.date.day': 'Nap',
  'search.date.month': 'Hónap',
  'search.date.year': 'Év',
  'search.date.done': 'Kész',
  'search.date.clear': 'Törlés',
  'search.date.stepUp': 'Előző: {alan}',
  'search.date.stepDown': 'Következő: {alan}',
  'search.submit': 'Keresés',

  'search.city.listLabel': 'Városjavaslatok',
  'search.city.countriesHeading': 'Országok',
  'search.city.citiesHeading': 'Városok',
  'search.city.allCountries': 'Minden ország',
  'search.city.tooShort': 'Kezdd el beírni egy város nevét, vagy válassz országot a listából.',
  'search.city.loading': 'Keresés…',
  'search.city.error': 'Nem sikerült betölteni a városlistát. Próbáld újra egy pillanat múlva.',
  'search.city.empty': 'Egy város sem felel meg a keresésnek.',
  'search.city.truncated': 'Több város is van — gépelj tovább a szűkítéshez.',
  'search.city.clear': 'A kiválasztott város törlése',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} város található', other: '{n} város található' },
  'search.city.countryCities': { one: '{n} város', other: '{n} város' },

  'search.guests.label': 'Vendégek',
  'search.guests.dialogLabel': 'Vendégek száma',
  'search.guests.done': 'Kész',
  'search.guests.adults': 'Felnőttek',
  'search.guests.adults.hint': '13 éves kortól',
  'search.guests.adults.decrease': 'Eggyel kevesebb felnőtt',
  'search.guests.adults.increase': 'Eggyel több felnőtt',
  'search.guests.children': 'Gyerekek',
  'search.guests.children.hint': '0–12 éves korig',
  'search.guests.children.decrease': 'Eggyel kevesebb gyerek',
  'search.guests.children.increase': 'Eggyel több gyerek',
  'search.guests.summary.adults': { one: '{n} felnőtt', other: '{n} felnőtt' },
  'search.guests.summary.children': { one: '{n} gyerek', other: '{n} gyerek' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} óra', other: '{n} óra' },
  'experience.duration.minutes': { one: '{n} perc', other: '{n} perc' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Az időtartam nincs megadva',
  'experience.meta': {
    one: '{sure} · legfeljebb {n} fő',
    other: '{sure} · legfeljebb {n} fő',
  },
  'experience.card.perPerson': 'vendégenként',
  'experience.card.language': 'A hirdetés {dil} nyelvű',

  'explore.heading.all': 'Összes élmény',
  'explore.heading.city': 'Élmények: {sehir}',
  'explore.heading.query': 'Találatok erre: „{arama}”',
  'explore.summary': { one: '{n} élmény', other: '{n} élmény' },
  'explore.summary.page': {
    one: '{n} élmény ezen az oldalon',
    other: '{n} élmény ezen az oldalon',
  },
  'explore.filtersNotice':
    'Egyelőre csak város szerint szűrünk. Még nem vesszük figyelembe: {filtreler}.',
  'explore.filter.date': 'a választott dátum',
  'explore.filter.guests': 'a vendégek száma',

  'explore.pager.label': 'Találati oldalak',
  'explore.pager.next': 'Következő oldal',
  'explore.pager.first': 'Vissza az első oldalra',

  'explore.pageLink.title': 'Nem tudtuk értelmezni ezt az oldallinket',
  'explore.pageLink.body':
    'A címben lévő oldaljelölő sérültnek tűnik. Indítsd újra a keresést — a találatok megvannak.',

  'explore.empty.title': 'Itt még nincsenek élmények',
  'explore.empty.body':
    'Próbálj ki egy másik várost a listából. Folyamatosan érkeznek új városok és új élmények.',
  'explore.empty.cta': 'Az összes élmény',
  'explore.empty.hostCta': 'Legyél itt az első házigazda',

  'explore.cityMissing.title': 'Ezt a várost nem ismerjük',
  'explore.cityMissing.body':
    'A címben szereplő város nincs a nyilvántartásunkban — lehet, hogy a link elavult. Válassz várost a fenti mező listájából.',
  'explore.cityMissing.cta': 'Az összes élmény',

  'experience.detail.meta.fallback': 'Helyi élmény · {sehir}.',
  'experience.detail.text.fallback': 'Ez a leírás {dil} nyelvű',
  'experience.detail.duration.label': 'Időtartam',
  'experience.detail.capacity.label': 'Csoportméret',
  'experience.detail.capacity.value': { one: 'Legfeljebb {n} fő', other: 'Legfeljebb {n} fő' },
  'experience.detail.about': 'Az élményről',
  'experience.detail.noDescription': 'A házigazda még nem írt leírást.',
  'experience.detail.spoken.heading': 'Az élmény során beszélt nyelvek',
  'experience.detail.spoken.help':
    'A házigazda ezeken a nyelveken vezeti az élményt. Az, hogy a hirdetés milyen nyelven íródott, külön kérdés.',
  'experience.detail.spoken.none': 'A házigazda még nem adta meg, milyen nyelveken beszél.',
  'experience.detail.tags.heading': 'Címkék',
  'experience.detail.gallery.heading': 'Galéria',
  'experience.detail.host.heading': 'A házigazdád',
  'experience.detail.itinerary.heading': 'Mit fogsz csinálni',
  'experience.detail.meeting.heading': 'Találkozási pont',
  'experience.detail.meeting.map': 'Megnyitás térképen',
  'experience.detail.meeting.mapEmbed': 'A találkozási pont térképe',
  'experience.detail.meeting.pin': 'Találkozási pont',
  'experience.detail.highlights.host': 'Házigazda: {ad}',
  'experience.detail.highlights.duration': 'Kb. {sure}',
  'experience.detail.highlights.spoken': 'Nyelvek: {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Legfeljebb {n} fő',
    other: 'Legfeljebb {n} fő',
  },
  'experience.detail.highlights.bring': 'Mit hozz magaddal',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} értékelés', other: '{n} értékelés' },
  'experience.detail.reviews.stars': { one: '{n} csillag', other: '{n} csillag' },
  'experience.detail.reviews.demoNote':
    'Minta értékelések — a valódi értékelések itt jelennek meg, amint elindulnak a foglalások.',
  'experience.detail.reviews.showAll': 'Az összes értékelés',
  'experience.detail.reviews.about': 'Tudd meg, hogyan működnek az értékelések.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Marosvásárhely, Románia',
  'experience.detail.reviews.demo.1.when': '1 napja',
  'experience.detail.reviews.demo.1.body':
    'Az idegenvezetőnk tájékozott és kedves volt. Vele egészen más volt felfedezni a várost.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milánó, Olaszország',
  'experience.detail.reviews.demo.2.when': '3 napja',
  'experience.detail.reviews.demo.2.body':
    'Kis csoport, sok beszélgetés. Még a fotós megállókat is betervezték — imádtuk.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Csehország',
  'experience.detail.reviews.demo.3.when': '1 hete',
  'experience.detail.reviews.demo.3.body':
    'Kicsit gyors tempó, de összességében csodás. Az utolsó megálló lett a kedvencünk.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berlin, Németország',
  'experience.detail.reviews.demo.4.when': '2 hete',
  'experience.detail.reviews.demo.4.body':
    'Személyesebb volt, mint vártuk. A házigazda helyi ízeket is ajánlott.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'Isztambul, Törökország',
  'experience.detail.reviews.demo.5.when': '3 hete',
  'experience.detail.reviews.demo.5.body':
    'Hibátlan szervezés. Egyértelmű találkozási pont, és pontosan tartottuk az időt.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Spanyolország',
  'experience.detail.reviews.demo.6.when': '1 hónapja',
  'experience.detail.reviews.demo.6.body': 'Az idegenvezetőnk imádnivaló volt 💕💕',
  'experience.detail.know.heading': 'Jó tudni',
  'experience.detail.know.minimumAge': 'Korhatár',
  'experience.detail.know.minimumAgeValue': '{n} éves kortól',
  'experience.detail.know.activityLevel': 'Aktivitási szint',
  'experience.detail.know.whatToBring': 'Mit hozz magaddal',
  'experience.detail.know.notIncluded': 'Nem tartalmazza',
  'experience.detail.know.accessibility': 'Akadálymentesség',
  'experience.detail.nearby.heading': 'További élmények: {sehir}',
  'experience.detail.host.anonymous': 'Egy Expyra-házigazda',
  'experience.detail.booking.title': 'Időpontok és ár',
  'experience.detail.booking.noSlots':
    'Jelenleg nincs szabad időpont. Itt jelennek meg, amint a házigazda frissíti a naptárát.',
  'experience.detail.booking.perPerson': 'fejenként',
  'experience.detail.booking.pickDate': 'Válassz dátumot',
  'experience.detail.booking.timeZone': 'Időzóna: {bolge}.',
  'experience.detail.booking.spotsLeft': { one: 'Még {n} hely', other: 'Még {n} hely' },
  'experience.detail.booking.adults': 'Felnőttek',
  'experience.detail.booking.children': 'Gyerekek',
  'experience.detail.booking.infants': 'Csecsemők',
  'experience.detail.booking.currency': 'Pénznem',
  'experience.detail.booking.currencyNone': 'A házigazda pénzneme',
  'experience.detail.booking.update': 'Ár kiszámítása',
  'experience.detail.booking.continue': 'Tovább a fizetéshez',
  'experience.detail.booking.pickDateFirst': 'Előbb válassz dátumot',
  'experience.detail.booking.pickDateHint': 'A folytatáshoz válassz fent egy dátumot.',
  'experience.detail.booking.total': 'Összesen',
  'experience.detail.booking.displayTotal': 'Kb. {tutar}',
  'experience.detail.booking.chargedIn':
    'A terhelés pénzneme: {paraBirimi}. Ha a kártyád más pénznemet használ, a bankod a saját árfolyamát alkalmazza.',
  'experience.detail.booking.quoteFailed':
    'Nem tudtuk beárazni ezt a választást. Lehet, hogy az időpontban nincs elég hely, vagy már lezárult.',
  'experience.detail.cityLink': 'Összes élmény: {sehir}',
  'experience.detail.back': 'Vissza a felfedezéshez',

  'checkout.title': 'Megerősítés és fizetés',
  'checkout.back': 'Vissza az élményhez',
  'checkout.payment.heading': 'Fizetési mód',
  'checkout.payment.bank': 'Online banki átutalás',
  'checkout.payment.bankSelect': 'Válaszd ki a bankodat',
  'checkout.payment.card': 'Hitel- vagy betéti kártya',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'A megerősítéssel és fizetéssel elfogadod a felhasználási feltételeket, a lemondási szabályzatot és az adatvédelmi tájékoztatót. Valódi fizetés még nincs bekötve — ez a lépés a felületet mutatja.',
  'checkout.payment.submit': 'Megerősítés és fizetés',
  'checkout.payment.submitting': 'Feldolgozás…',
  'checkout.payment.demoNote': 'Demó: a kártyádat nem terheljük, és nem jön létre foglalás.',
  'checkout.payment.unavailable':
    'A fizetés még nem érhető el: ez a gomb akkor válik aktívvá, amikor a fizetési szolgáltatónk csatlakozik. A kártyádat nem terheljük, és nem jön létre foglalás.',
  'checkout.success.title': 'Kész — demó visszaigazolás',
  'checkout.success.body':
    'Amikor a fizetési szolgáltató és a foglalási API elkészül, itt valódi jegy jelenik meg. Egyelőre a folyamat véget ért.',
  'checkout.success.back': 'Ugrás az élményeimhez',
  'checkout.summary.nonRefundable': 'Ez a foglalás nem téríthető vissza.',
  'checkout.summary.date': 'Dátum',
  'checkout.summary.guests': 'Vendégek',
  'checkout.summary.change': 'Módosítás',
  'checkout.summary.priceDetails': 'Ár részletei',
  'checkout.summary.total': 'Összesen ({paraBirimi})',

  'howItWorks.lede': 'Három lépés, és kész.',
  'howItWorks.back': 'Vissza',
  'howItWorks.step.discover.title': 'Fedezd fel',
  'howItWorks.step.discover.body':
    'Nézd meg a városod helyi élményeit. Kis csoportok, valódi házigazdák.',
  'howItWorks.step.book.title': 'Foglalj',
  'howItWorks.step.book.body':
    'Válassz dátumot és létszámot, nézd meg az árat. A foglalás hamarosan érkezik.',
  'howItWorks.step.join.title': 'Gyere el',
  'howItWorks.step.join.body': 'A házigazdád fogad, és kezdődik az élmény.',
  'howItWorks.backToExplore': 'Vissza a felfedezéshez',

  'myExperiences.lede': 'Itt vannak a jegyeid.',
  'myExperiences.upcoming': 'Közelgő · {sayi}',
  'myExperiences.past': 'Korábbi · {sayi}',
  'myExperiences.downloadPdf': 'PDF letöltése',
  'myExperiences.wallet': 'Hozzáadás az Apple Wallethez',
  'myExperiences.wallet.soon': 'Hamarosan',
  'myExperiences.rate': 'Értékeld',
  'myExperiences.rate.soon': 'Az élmény után nyílik meg',
  'myExperiences.empty.title': 'Még nincs jegyed',
  'myExperiences.empty.body': 'Ha lefoglalsz egy élményt, a jegyed itt jelenik meg.',
  'myExperiences.empty.cta': 'Élmények felfedezése',

  'ticket.demoBadge': 'Demójegy',
  'ticket.demoNote': 'Mintajegy: a QR-kód még nincs aláírva, a bejáratnál nem ellenőrizhető.',
  'ticket.view.title': 'A jegyed',
  'ticket.view.lede': 'Mutasd fel a QR-kódot a bejáratnál, vagy add hozzá a tárcádhoz.',
  'ticket.view.back': 'Vissza az élményeimhez',
  'ticket.wallet.view': 'Jegy megtekintése',
  'ticket.wallet.apple': 'Hozzáadás az Apple Wallethez',
  'ticket.wallet.google': 'Hozzáadás a Google Wallethez',
  'ticket.wallet.adding': 'Előkészítés…',
  'ticket.wallet.appleNotConfigured':
    'Az Apple Wallet nincs beállítva ebben a környezetben. Add meg az EXPYRA_APPLE_PASS_* változókat (lásd docs/WALLET.md); a jegyet itt továbbra is megnézheted.',
  'ticket.wallet.googleNotConfigured':
    'A Google Wallet nincs beállítva ebben a környezetben. Add meg az EXPYRA_GOOGLE_WALLET_* változókat (lásd docs/WALLET.md); a jegyet itt továbbra is megnézheted.',
  'ticket.guests': 'Vendégek',
  'ticket.amount': 'Összesen',
  'ticket.status': 'Állapot',
  'ticket.status.valid': 'Érvényes',
  'ticket.status.used': 'Felhasználva',
  'ticket.timeZoneNote': 'helyi idő: {sehir}',

  'ticket.pdf.kicker': 'Élményjegy',
  'ticket.pdf.dateTime': 'Dátum és idő',
  'ticket.pdf.docTitle': 'Expyra-jegy — {baslik}',
  'ticket.pdf.code': 'Jegykód: {kod}',
  'ticket.pdf.notice.valid': 'A házigazda a bejáratnál beolvassa ezt a kódot. Egyszer használható.',
  'ticket.pdf.notice.used': 'Ezt a jegyet a bejáratnál már felhasználták.',

  'ticket.error.signedOut': 'Jelentkezz be a jegy megtekintéséhez.',
  'ticket.error.notFound': 'Ezzel a kóddal nincs jegy.',

  'auth.meta.title': 'Bejelentkezés',
  'auth.title': 'Jelentkezz be, vagy hozz létre fiókot',
  'auth.back': 'Vissza',

  'auth.email.lede': 'Írd be a címed, és küldünk egy egyszer használatos kódot. Jelszó nincs.',
  'auth.email.label': 'Az e-mail-címed',
  'auth.email.help': 'Erre a címre küldjük a kódot.',
  'auth.email.placeholder': 'nev@example.com',
  'auth.email.error.invalid': 'Ez a cím nem tűnik helyesnek. Példa: nev@example.com',

  'auth.code.lede': 'Elküldtünk egy 6 jegyű kódot ide:',
  'auth.code.label': 'Az e-mailben kapott kód',
  'auth.code.hint':
    'A kód 10 percig érvényes. Ha nem találod az e-mailt, nézd meg a spam mappát.',
  'auth.code.resend': 'Új kód küldése',
  'auth.code.changeEmail': 'Másik cím használata',

  'auth.common.continue': 'Tovább',
  'auth.common.working': 'Küldés…',

  'auth.otp.error.invalid': 'A kód nem egyezik. Ellenőrizd a 6 számjegyet a legutóbbi e-mailben.',
  'auth.otp.error.locked':
    'Túl sok próbálkozás. A fiók védelmében lezártuk ezt a kódot — kérj újat.',
  'auth.otp.error.resendTooSoon': {
    one: 'Várj még {n} másodpercet, mielőtt új kódot kérsz.',
    other: 'Várj még {n} másodpercet, mielőtt új kódot kérsz.',
  },

  'auth.error.tooManyRequests': 'Túl sok kódot kértél. Próbáld újra egy kicsit később.',
  'auth.error.suspended': 'Ez a fiók fel van függesztve. destek@expyra.com',
  'auth.error.expiredChallenge': 'Ez a bejelentkezési kísérlet lejárt. Add meg újra a címed.',

  'account.title': 'A fiókod',
  'account.lede': 'Itt módosíthatod a neved és a kívánt nyelvet.',

  'account.email.label': 'Az e-mail-címed',
  'account.email.note': 'Az e-mail-cím egyelőre nem módosítható.',

  // --- Wallpaper (ortak layout — HER sayfada görünür) ------------------------
  'wallpaper.istanbul.place': 'Isztambul',
  'wallpaper.istanbul.label': 'Grillezett hal az utcán',
  'wallpaper.kitchen.place': 'Egy otthoni konyha',
  'wallpaper.kitchen.label': 'Főzés a nénivel',
  'wallpaper.cappadocia.place': 'Kappadókia',
  'wallpaper.cappadocia.label': 'Hőlégballon',
  'wallpaper.pause': 'Háttérvideó szüneteltetése',
  'wallpaper.play': 'Háttérvideó lejátszása',
  'account.avatar.label': 'Profilkép',
  'account.avatar.help': 'JPEG, PNG vagy WebP · legalább 800×600 pixel · legfeljebb 10 MB',
  'account.avatar.add': 'Fotó hozzáadása',
  'account.avatar.change': 'Csere',
  'account.avatar.remove': 'Eltávolítás',
  'account.avatar.uploading': 'Feltöltés…',
  'account.name.label': 'A megjelenített neved',
  'account.name.help': 'Ezt a nevet látják mások. Üresen is hagyhatod.',
  'account.name.placeholder': 'pl. Kovács A.',

  'account.language.label': 'A kívánt nyelved',
  'account.language.help':
    'Ezen a nyelven írunk neked. A felület nyelve a címsorból jön, nem ebből a beállításból.',
  'account.language.none': 'Nincs megadva',

  'account.save': 'Mentés',
  'account.saving': 'Mentés…',
  'account.saved': 'A módosítások elmentve.',

  'account.error.name': {
    one: 'A megjelenített név legfeljebb {n} karakter lehet.',
    other: 'A megjelenített név legfeljebb {n} karakter lehet.',
  },
  'account.error.language': 'Ezt a nyelvet még nem támogatjuk. Válassz egy másikat a listából.',
  'account.error.signedOut': 'A munkameneted lejárt. Jelentkezz be újra.',

  'account.menu.trigger': 'Fiókmenü: {ad}',
  'account.menu.title': 'Fiók',
  'account.menu.signedInAs': 'Bejelentkezve mint {eposta}',
  'account.menu.account': 'A fiókod',
  'account.menu.signOut': 'Kijelentkezés',
  'account.menu.fallbackLabel': 'A fiókod',

  'account.signIn': 'Bejelentkezés',
  'account.loading': 'A munkamenet betöltése',

  'host.meta.title': 'Legyél házigazda',

  'host.invite.title': 'Tedd közzé a saját élményedet',
  'host.invite.lede':
    'Mutass meg valamit, amihez értesz, vidd el az embereket oda, ahol amúgy is jársz. Te határozod meg az árat, a csoport méretét, a naptárat és a lemondási szabályokat — abba, amit kínálsz, nem szólunk bele.',
  'host.invite.noApproval':
    'Nincs jóváhagyás, nincs jelentkezési űrlap. Amint úgy döntesz, hogy házigazda leszel, megnyílik a paneled.',
  'host.invite.cta': 'Legyél házigazda',
  'host.invite.pending': 'Megnyitás…',

  'host.signedOut.note':
    'Házigazdaként előbb be kell jelentkezned. Jelszót nem kérünk — egyszer használatos kódot küldünk a címedre.',
  'host.signedOut.cta': 'Jelentkezz be, és legyél házigazda',

  'host.panel.title': 'Házigazda-panel',
  'host.panel.lede':
    'Itt kezeled az élményeidet. Te határozod meg az árat, a csoportot, a naptárat és a lemondási szabályokat — abba, amit kínálsz, nem szólunk bele.',
  'host.panel.status': 'A fiókod házigazdaként aktív.',
  'host.panel.new': 'Új élmény',

  'host.listings.heading': 'Hirdetéseim · {sayi}',
  'host.listings.headingPage': 'Hirdetéseim · {sayi} ezen az oldalon',
  'host.listings.pager.label': 'Hirdetésoldalak',
  'host.listings.pager.next': 'További hirdetések',
  'host.listings.pager.first': 'Vissza az első oldalra',
  'host.listings.edit': 'Szerkesztés',
  'host.listings.view': 'Hirdetés megtekintése',
  'host.listings.status.draft': 'Piszkozat',
  'host.listings.status.published': 'Közzétéve',
  'host.listings.status.archived': 'Archiválva',

  'host.listings.ready': 'Közzétehető',
  'host.listings.missing': { one: '{n} mező hiányzik', other: '{n} mező hiányzik' },

  'host.listings.empty.heading': 'Hirdetéseim',
  'host.listings.empty.title': 'Még nincs hirdetésed',
  'host.listings.empty.body':
    'Nyisd meg az első piszkozatodat. Annyit dolgozhatsz rajta közzététel előtt, amennyit csak akarsz — a piszkozatot más nem látja.',
  'host.listings.empty.cta': 'Írd meg az első élményedet',

  'host.listings.errorHeading': 'Hirdetéseim',
  'host.listings.error':
    'Most nem tudtuk betölteni a hirdetéseidet. Semmi sem törlődött — töltsd újra az oldalt egy pillanat múlva.',

  'host.steps.heading': 'Hogyan kezdjem?',
  'host.steps.describe.title': 'Írd le az élményedet',
  'host.steps.describe.body':
    'Cím, leírás, időtartam és csoportméret. Annyi nyelven írhatod, ahányon csak szeretnéd — az utazók a saját nyelvükön olvassák.',
  'host.steps.media.title': 'Add hozzá a fotóidat',
  'host.steps.media.body':
    'Legalább egy borítókép. Mutasd meg, milyen valójában az élmény; a stockfotók itt nem működnek.',
  'host.steps.pricing.title': 'Állítsd be a naptárat és az árat',
  'host.steps.pricing.body':
    'Mely napokon, hány főnek, mennyiért. Az árat a saját pénznemedben adod meg, és ebben a pénznemben kapod meg a pénzt.',
  'host.steps.publish.title': 'Tedd közzé',
  'host.steps.publish.body':
    'Nincs várakozás. Amint közzéteszed, a hirdetésed megjelenik a keresésben.',

  'host.contact.title': 'Írj nekünk, ha elakadsz',
  'host.contact.body':
    'Az első házigazdákat egyenként kísérjük. Ha valami megakaszt a hirdetés összeállítása közben, vagy bizonytalan vagy egy döntésben, írj — együtt megoldjuk.',
  'host.contact.cta': 'Írj nekünk',
  'host.contact.howItWorks': 'Hogyan működik',

  'host.error.blocked': 'Ez a fiók fel van függesztve, ezért nem lehet házigazda. destek@expyra.com',

  // --- Deneyim sihirbazı -----------------------------------------------------

  'host.experience.new.meta.title': 'Új élmény',
  'host.experience.new.title': 'Új élmény indítása',
  'host.experience.new.lede':
    'Először csak egy dolgot kérdezünk: milyen nyelven írod a hirdetést. Minden mást a piszkozatban töltesz ki, tetszőleges sorrendben.',
  'host.experience.new.language.label': 'Milyen nyelven fogsz írni?',
  'host.experience.new.language.help':
    'Ez később nem módosítható: ebből készül a hirdetésed webcíme, és az utazók ezt a szöveget látják, ha más nyelven nincs megírva. Később más nyelveket is hozzáadhatsz.',
  'host.experience.new.submit': 'Piszkozat megnyitása',
  'host.experience.new.pending': 'Megnyitás…',

  'host.experience.new.next.heading': 'Mi következik?',
  'host.experience.new.next.text': 'Cím és leírás — annyi nyelven, ahányon szeretnéd.',
  'host.experience.new.next.basics': 'Mennyi ideig tart, és hány főt fogadsz.',
  'host.experience.new.next.place': 'Város, kategória és a nyelvek, amelyeken aznap beszélsz.',
  'host.experience.new.next.publish': 'Tedd közzé, amikor készen állsz. Nincs várakozás.',

  'host.experience.edit.meta.title': 'Élmény szerkesztése',
  'host.experience.edit.lede':
    'Minden szakasz külön mentődik. Ott hagyod abba, ahol akarod — a piszkozatod megvár.',
  'host.experience.untitled': 'Cím nélküli piszkozat',
  'host.experience.back': '← Vissza a házigazda-panelre',

  'host.experience.save': 'Mentés',
  'host.experience.saving': 'Mentés…',
  'host.experience.saved': 'Elmentve.',

  'host.experience.section.text': 'Cím és leírás',
  'host.experience.section.textHelp':
    'Ezt olvassák az utazók, mielőtt döntenek. Mondd el, mit fogtok csinálni, hol találkoztok, és mi köt téged ehhez.',
  'host.experience.section.basics': 'Időtartam és létszám',
  'host.experience.section.basicsHelp':
    'Mennyi ideig tart egy alkalom, és hány főt fogadsz egyszerre. A naptár és az ár később jön.',
  'host.experience.section.place': 'Város',
  'host.experience.section.placeHelp':
    'Hol zajlik az élmény. Ebből jön az időzóna — az alkalmak időpontjai ebben jelennek meg.',
  'host.experience.section.category': 'Kategória',
  'host.experience.section.categoryHelp':
    'Az utazók ez alapján szűrnek a keresésben. Válaszd a legközelebbit; csak egy választható.',
  'host.experience.section.languages': 'Beszélt nyelvek és címkék',
  'host.experience.section.languagesHelp':
    'Milyen nyelveken vezeted az élményt? Ez független attól, hogy a hirdetést milyen nyelven írtad.',
  'host.experience.section.status': 'Közzététel',
  'host.experience.section.statusHelp':
    'A közzétételhez szükséges dolgok lent vannak felsorolva. Nincs jóváhagyás — ha semmi sem hiányzik, a hirdetésed azonnal megjelenik a keresésben.',

  'host.experience.translations.tabsLabel': 'A hirdetésszöveg nyelvei',
  'host.experience.translations.required': 'kötelező',
  'host.experience.translations.optional': 'opcionális',
  'host.experience.translations.add.label': 'Írás más nyelven',
  'host.experience.translations.add.submit': 'Megnyitás',
  'host.experience.translations.machine':
    'Ezt a szöveget automatikusan fordítottuk. Szerkeszd és mentsd el, és a saját szövegeddé válik.',

  'host.experience.title.label': 'Cím',
  'host.experience.title.placeholder': 'Utcai ételtúra Kadıköyben',
  'host.experience.title.help':
    'Rövid és konkrét. Ezt látják először az utazók a listában, és ebből készül a hirdetésed webcíme.',
  'host.experience.description.label': 'Leírás',
  'host.experience.description.placeholder':
    'Hol találkoztok, mit csináltok, mit esztek, mit vegyenek fel…',
  'host.experience.description.help':
    'A közzétételhez nem kötelező, de az utazók itt döntenek. Mesélj végig a napon sorrendben.',

  'host.experience.duration.label': 'Időtartam (óra)',
  'host.experience.duration.help':
    'Egy alkalom teljes hossza. Például 1,5 óra vagy 3. Legfeljebb hét nap (168 óra).',
  'host.experience.capacity.label': 'Létszám (fő)',
  'host.experience.capacity.help':
    'Legfeljebb hány fő vehet részt egy alkalmon. A közzétételhez legalább egy kell.',

  'host.experience.city.label': 'Melyik városban van?',
  'host.experience.city.placeholder': 'Város keresése',
  'host.experience.place.saved': 'Város kiválasztva · időzóna: {saat}',
  'host.experience.place.empty': 'Még nincs kiválasztott város.',
  'host.experience.place.locked':
    'A közzétett hirdetés városa rögzített: az alkalmak időpontjai és a foglalások ettől függenek. Másik városhoz nyiss új hirdetést.',

  'host.experience.category.label': 'Kategória',
  'host.experience.category.none': 'Nincs kiválasztva',
  'host.experience.category.help': 'Miről szól leginkább az élmény.',

  'host.experience.spoken.label': 'Nyelvek, amelyeken az élmény során beszélsz',
  'host.experience.spoken.help':
    'Független a hirdetés nyelvétől: jelöld be azokat a nyelveket, amelyeken ténylegesen vezeted. Legfeljebb tíz.',
  'host.experience.spoken.search.label': 'Nyelv keresése',
  'host.experience.spoken.search.placeholder': 'német, Deutsch, de…',
  'host.experience.spoken.search.results': {
    one: '{n} nyelv a listában',
    other: '{n} nyelv a listában',
  },
  'host.experience.spoken.search.none': 'Nincs egyező nyelv. A bejelölt nyelvek megmaradnak.',
  'host.experience.tags.label': 'Címkék',
  'host.experience.tags.placeholder': 'utcai étel, séta, kis csoport',
  'host.experience.tags.help':
    'Vesszővel válaszd el őket. Legfeljebb tíz. Segítenek, hogy a hirdetésed megjelenjen a keresésekben.',

  'host.experience.missing.heading': 'Mi kell a közzétételhez',
  'host.experience.ready': 'Minden kész. Közzéteheted ezt a hirdetést.',
  'host.experience.missing.translation': 'cím a hirdetés nyelvén',
  'host.experience.missing.city': 'város',
  'host.experience.missing.category': 'kategória',
  'host.experience.missing.capacity': 'létszám',
  'host.experience.missing.duration': 'időtartam',
  'host.experience.missing.cover': 'borítókép',
  'host.experience.missing.price': 'ár',
  'host.experience.missing.unknown': 'egy kitöltetlen mező',

  'host.experience.publish': 'Közzététel',
  'host.experience.republish': 'Újbóli közzététel',
  'host.experience.publishing': 'Közzététel…',
  'host.experience.published': 'A hirdetésed élő.',
  'host.experience.unpublish': 'Visszavonás',
  'host.experience.unpublishing': 'Visszavonás…',
  'host.experience.unpublished': 'A hirdetés visszakerült piszkozatba — a keresésben nem látszik.',
  'host.experience.archive': 'Archiválás',
  'host.experience.archiving': 'Archiválás…',
  'host.experience.archived': 'A hirdetés archiválva.',

  // --- Medya (Blok 6) ----------------------------------------------------------
  'host.media.heading': 'Fotók',
  'host.media.hint':
    'JPEG, PNG vagy WebP · legalább 800×600 pixel · legfeljebb 10 MB · legfeljebb 12 fotó',
  'host.media.add': 'Fotók hozzáadása',
  'host.media.drop': 'Húzd ide a fájlokat',
  'host.media.uploading': 'Feltöltés…',
  'host.media.empty': 'Még nincsenek fotók. Az első feltöltött kép lesz a borító.',
  'host.media.cover': 'Borító',
  'host.media.makeCover': 'Beállítás borítónak',
  'host.media.delete': 'Törlés',
  'host.media.moveEarlier': 'Előrébb',
  'host.media.moveLater': 'Hátrébb',
  'host.media.position': '{n}. fotó',
  'host.media.error.rejected': 'Ezt a fotót nem fogadtuk el.',
  'host.media.error.unsupported': 'Csak JPEG, PNG és WebP tölthető fel.',
  'host.media.error.notUploaded': 'A feltöltés nem fejeződött be. Próbáld újra.',
  'host.media.error.notAnImage': 'Ez a fájl nem kép.',
  'host.media.error.mismatch': 'A fájl tartalma nem egyezik a kiterjesztésével.',
  'host.media.error.tooSmall': 'A fotóknak legalább 800×600 pixelesnek kell lenniük.',
  'host.media.error.tooLarge': 'A fájlok legfeljebb 10 MB-osak lehetnek.',
  'host.media.error.limit': 'Egy hirdetéshez legfeljebb 12 fotó tartozhat.',

  'host.experience.status.publishedNote':
    'A hirdetésed megjelenik a keresésben. Vond vissza, hogy piszkozat legyen — cseréld a fotókat, majd tedd közzé újra. Az archiválás is elrejti, de nem törli.',
  'host.experience.status.privateNote':
    'Amíg nem teszed közzé, rajtad kívül senki sem látja ezt a hirdetést.',

  'host.experience.error.notFound': 'Nem találjuk ezt a hirdetést. Nyisd meg újra a panelről.',
  'host.experience.error.invalid':
    'Ezt a szakaszt nem sikerült menteni. Ellenőrizd a mezőket, és próbáld újra.',
  'host.experience.error.language':
    'Ezen a nyelven nem írható hirdetés. Válassz egy másikat a listából.',
  'host.experience.error.title': 'A cím kötelező, és legfeljebb 120 karakter lehet.',
  'host.experience.error.description': 'A leírás legfeljebb 4000 karakter lehet.',
  'host.experience.error.duration':
    'Add meg az időtartamot órában: legalább 0,5, legfeljebb 168.',
  'host.experience.error.capacity': 'Add meg a létszámot főben: legalább 1, legfeljebb 500.',
  'host.experience.error.city':
    'Válaszd ki a várost a listából — a név beírása önmagában nem elég.',
  'host.experience.error.category': 'Válassz kategóriát a listából.',
  'host.experience.section.itinerary': 'Mit fogtok csinálni',
  'host.experience.section.itineraryHelp':
    'Az élmény lépései sorrendben. Minden lépésnek van címe, és ha akarod, egy-két mondatos leírása. A lista a hirdetés nyelvén íródik; a fenti nyelvi fülek itt is érvényesek.',
  'host.experience.section.meeting': 'Találkozási pont',
  'host.experience.section.meetingHelp':
    'Hol találnak meg a vendégek? A cím nyelvfüggetlen, az útmutatás a kiválasztott nyelven íródik. Adj meg koordinátákat, és a vendégek térképen is megnyithatják.',
  'host.experience.section.details': 'Jó tudni',
  'host.experience.section.detailsHelp':
    'Korhatár, aktivitási szint és minden, amit a vendégeknek előre tudniuk kell. Az üresen hagyott mezők nem jelennek meg.',
  'host.experience.textLanguage.note':
    'Ennek a szakasznak a szövegei {dil} nyelvűek. A nyelvváltáshoz használd a 01-es szakasz füleit.',

  'host.experience.itinerary.stepTitle.label': '{n}. lépés',
  'host.experience.itinerary.stepTitle.placeholder': 'Találkozó a Hippodromnál',
  'host.experience.itinerary.stepBody.placeholder':
    'Bizánc kocsiversenypályája; itt áll az Obeliszk és a Kígyóoszlop.',
  'host.experience.itinerary.add': 'Lépés hozzáadása',
  'host.experience.itinerary.remove': 'Lépés törlése',
  'host.experience.itinerary.help': 'Az üres sorokat nem mentjük. Legfeljebb 20 lépés.',

  'host.experience.meeting.address.label': 'Cím',
  'host.experience.meeting.address.placeholder': 'A Galata-torony előtt, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Szélesség',
  'host.experience.meeting.longitude.label': 'Hosszúság',
  'host.experience.meeting.coords.help':
    'Mindkettő vagy egyik sem. Tizedes formában: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Útmutatás',
  'host.experience.meeting.instructions.placeholder':
    'A torony északi kapujánál keresd a sárga esernyős idegenvezetőt.',

  'host.experience.details.minimumAge.label': 'Minimális életkor',
  'host.experience.details.minimumAge.help': 'Üres = nincs korhatár. 1–99.',
  'host.experience.details.activityLevel.label': 'Aktivitási szint',
  'host.experience.details.activityLevel.none': 'Nincs megadva',
  'host.experience.details.whatToBring.label': 'Mit hozz magaddal',
  'host.experience.details.whatToBring.placeholder':
    'Víz, kényelmes cipő, kendő (mecsetlátogatáshoz)',
  'host.experience.details.notIncluded.label': 'Nem tartalmazza',
  'host.experience.details.notIncluded.placeholder': 'Múzeumi belépők, ebéd',
  'host.experience.details.accessibility.label': 'Akadálymentesség',
  'host.experience.details.accessibility.placeholder':
    'Az útvonalon lépcsők vannak; kerekesszékkel nem járható.',

  'host.experience.error.translationMissing':
    'Előbb írd meg a címet ezen a nyelven (01-es szakasz), utána töltsd ki ezeket a mezőket.',
  'host.experience.error.minimumAge': 'A minimális életkor 1 és 99 közötti egész szám lehet.',
  'host.experience.error.coordinates':
    'A szélesség és a hosszúság együtt jár; szélesség ±90, hosszúság ±180.',
  'host.experience.error.itinerary': 'Minden lépésnek kell cím; legfeljebb 20 lépés.',

  'experience.activity.light': 'Könnyű',
  'experience.activity.moderate': 'Közepes',
  'experience.activity.strenuous': 'Megerőltető',

  'host.profile.heading': 'Mutatkozz be',
  'host.profile.lede':
    'A hirdetés oldalán a neved alatt jelenik meg. Ki vagy, és miért pont te meséled el ezt a történetet — két mondat elég.',
  'host.profile.headline.label': 'Rövid bemutatkozás',
  'host.profile.headline.placeholder': 'Helyi idegenvezető és történész Isztambulban',
  'host.profile.bio.label': 'Rólam',
  'host.profile.bio.placeholder': 'Tíz éve kalauzolom az embereket a város mellékutcáiban…',
  'host.profile.language.label': 'A szöveg nyelve',
  'host.profile.error.invalid':
    'A rövid bemutatkozás legfeljebb 80, a bemutatkozás legfeljebb 2000 karakter lehet.',
  'host.experience.error.spokenLanguages': 'Legfeljebb tíz nyelvet jelölhetsz be.',
  'host.experience.error.tags':
    'A címkék nem lehetnek üresek; legfeljebb tíz, és mindegyik rövid.',
  'host.experience.error.publishedConflict':
    'Élő hirdetésen ez a módosítás nem lehetséges. Előbb archiváld, aztán szerkeszd.',
  'host.experience.error.publishBlocked': 'Nincs közzétéve. Még hiányzik: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Nincs közzétéve: a hirdetés még nem teljes. Nézd meg a fenti listát.',

  // --- Kategoriler -------------------------------------------------------------
  'category.food-drink': 'Étel és ital',
  'category.art-culture': 'Művészet és kultúra',
  'category.history-heritage': 'Történelem és örökség',
  'category.nature-outdoors': 'Természet és szabadtér',
  'category.water-sea': 'Víz és tenger',
  'category.sports-adventure': 'Sport és kaland',
  'category.crafts-workshops': 'Kézművesség és workshopok',
  'category.music-nightlife': 'Zene és éjszakai élet',
  'category.wellness': 'Wellness',
  'category.photography': 'Fotózás',
  'category.tours-walks': 'Túrák és séták',
  'category.local-life': 'Helyi élet',
  // --- Fiyat (PLAN Blok 7) ---
  'host.experience.section.pricing': 'Ár',
  'host.experience.section.pricingHelp':
    'Add meg a fejenkénti árat a saját pénznemedben. Mindig ebben a pénznemben kapod a pénzt; ha egy utazó mást választ, csak a megjelenítés változik.',

  'host.pricing.currency.label': 'Kifizetési pénznem',
  'host.pricing.currency.help':
    'Ebben a pénznemben érkezik hozzád a pénz. Közzététel után nem módosítható — előbb archiváld a hirdetést.',
  'host.pricing.currency.locked': 'A pénznem zárolva van, mert a hirdetés élő.',
  'host.pricing.currency.placeholder': 'Válassz',

  'host.pricing.adult.label': 'Felnőtt (fejenként)',
  'host.pricing.adult.help': 'Kötelező. Ez a kártyákon és a keresésben látható kezdőár.',
  'host.pricing.child.label': 'Gyerek (fejenként)',
  'host.pricing.child.help': 'Hagyd üresen, ha nincs gyerekár. Írj 0-t, ha ingyenes.',
  'host.pricing.infant.label': 'Csecsemő (fejenként)',
  'host.pricing.infant.help': 'Hagyd üresen, ha nincs csecsemőár. Írj 0-t, ha ingyenes.',

  'host.pricing.saved': 'Az ár elmentve.',
  'host.pricing.empty': 'Még nincs ár. Ár nélküli hirdetés nem tehető közzé.',

  'host.pricing.error.currency': 'Válassz érvényes pénznemet.',
  'host.pricing.error.currencyLocked': 'Élő hirdetés pénzneme nem módosítható. Előbb archiváld.',
  'host.pricing.error.adult': 'A felnőttár kötelező, és érvényes összegnek kell lennie.',
  'host.pricing.error.child': 'A gyerekárnak érvényes összegnek kell lennie.',
  'host.pricing.error.infant': 'A csecsemőárnak érvényes összegnek kell lennie.',
  'host.pricing.error.range':
    'Ez az összeg kívül esik a fizetési szolgáltató által elfogadott tartományon — vagy túl kicsi, vagy túl nagy.',

  // --- Takvim (PLAN Blok 7) ---
  'host.experience.section.schedule': 'Naptár',
  'host.experience.section.scheduleHelp':
    'Mely napokon és hánykor tartod? Az időpontok a város időzónájában vannak — a megadott óra az óraátállításkor sem tolódik el.',

  'host.schedule.blocked':
    'A naptárhoz előbb város, időtartam és létszám kell. Fejezd be a fenti szakaszokat.',
  'host.schedule.timeZone': 'Időzóna: {bolge}',
  'host.schedule.generatedThrough': 'A naptárad eddig kész: {tarih}.',

  // Haftalık kural
  'host.schedule.rule.heading': 'Heti szabály',
  'host.schedule.rule.days': 'Napok',
  'host.schedule.rule.daysHelp': 'Többet is választhatsz; minden nap külön szabály lesz.',
  'host.schedule.rule.time': 'Kezdési idő',
  'host.schedule.rule.timeHelp': 'A város helyi idejében.',
  'host.schedule.rule.start': 'Kezdés napja',
  'host.schedule.rule.startHelp': 'Hagyd üresen, ha ma kezdődik.',
  'host.schedule.rule.submit': 'Szabály hozzáadása',
  'host.schedule.rule.pending': 'Hozzáadás…',
  'host.schedule.rule.stop': 'Eltávolítás',
  'host.schedule.rule.stopping': 'Eltávolítás…',
  'host.schedule.rule.empty': 'Még nincs heti szabály.',
  'host.schedule.rule.stopped': 'leállítva',

  // Kapalı günler
  'host.schedule.blackout.heading': 'Szünnapok',
  'host.schedule.blackout.start': 'Ettől',
  'host.schedule.blackout.end': 'Eddig',
  'host.schedule.blackout.endHelp':
    'Hagyd üresen, ha csak egy napot zársz le. Az utolsó nap is beleszámít.',
  'host.schedule.blackout.submit': 'Lezárás',
  'host.schedule.blackout.pending': 'Lezárás…',
  'host.schedule.blackout.remove': 'Eltávolítás',
  'host.schedule.blackout.removing': 'Eltávolítás…',
  'host.schedule.blackout.empty': 'Nincs szünnap.',

  // Seanslar
  'host.schedule.slots.heading': 'Közelgő alkalmak',
  'host.schedule.slots.empty': 'Ebben az időszakban nincs alkalom.',
  'host.schedule.slots.remaining': { one: 'Még {n} hely', other: 'Még {n} hely' },
  'host.schedule.slots.closed': 'Lezárva',
  'host.schedule.slots.closedByBlackout': 'Szünnap',
  'host.schedule.slots.close': 'Lezárás',
  'host.schedule.slots.closing': 'Lezárás…',
  'host.schedule.slots.open': 'Megnyitás',
  'host.schedule.slots.opening': 'Megnyitás…',
  'host.schedule.slots.more': 'és még {n}',

  // Günler
  'host.schedule.day.monday': 'Hétfő',
  'host.schedule.day.tuesday': 'Kedd',
  'host.schedule.day.wednesday': 'Szerda',
  'host.schedule.day.thursday': 'Csütörtök',
  'host.schedule.day.friday': 'Péntek',
  'host.schedule.day.saturday': 'Szombat',
  'host.schedule.day.sunday': 'Vasárnap',

  // Onaylar
  'host.schedule.ruleSaved': 'Szabály hozzáadva, alkalmak létrehozva.',
  'host.schedule.ruleStopped': 'Szabály leállítva.',
  'host.schedule.slotOpened': 'Alkalom megnyitva.',
  'host.schedule.slotClosed': 'Alkalom lezárva.',
  'host.schedule.blackoutSaved': 'Napok lezárva.',
  'host.schedule.blackoutRemoved': 'Szünnapok eltávolítva.',

  // Hatalar — her biri sunucunun makine-okur koduna karşılık
  'host.schedule.error.noDay': 'Válassz legalább egy napot.',
  'host.schedule.error.time': 'Az időt ÓÓ:PP formában add meg.',
  'host.schedule.error.date': 'Adj meg érvényes dátumot.',
  'host.schedule.error.range': 'A záró dátum nem lehet a kezdő előtt.',
  'host.schedule.error.notSchedulable': 'A naptárhoz előbb város, időtartam és létszám kell.',
  'host.schedule.error.duplicateRule': 'Erre a napra és időpontra már van szabály.',
  'host.schedule.error.ruleLimit': 'Ehhez az élményhez nem adható több heti szabály.',
  'host.schedule.error.dstGap':
    'Ez az időpont azon a napon az óraátállítás miatt nem létezik. Próbálj egy órával későbbit.',
  'host.schedule.error.past': 'Múltbeli alkalom nem módosítható.',
  'host.schedule.error.slotExists': 'Erre az időpontra már van alkalom.',
  'host.schedule.error.blackedOut':
    'Ez a dátum szünnapként van jelölve. Előbb távolítsd el az időszakot.',
  'host.schedule.error.generated':
    'Heti szabályból létrejött alkalom nem törölhető; lezárni viszont lehet.',
  'host.schedule.error.hasBookings': 'Foglalással rendelkező alkalom nem módosítható.',
  'host.schedule.error.blackoutLimit': 'Több szünnap nem adható hozzá.',
  'host.schedule.error.horizon': 'A naptár nem nyitható meg ennyire előre.',
  'host.schedule.error.generic': 'Ez most nem sikerült.',
} as const satisfies Dictionary<'hu'>

/**
 * Metnin içi de kaynakla karşılaştırılıyor: bir yer tutucu düşerse ya da adı
 * değişirse derleme, hangi anahtarda olduğunu yazarak kırılır.
 * `export` bilinçli — kullanılmayan tip lint'te ölü kod sayılır.
 */
export type HuPlaceholders = Assert<PlaceholdersMatchSource<typeof hu>>
