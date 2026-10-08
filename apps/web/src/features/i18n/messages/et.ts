import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Eestikeelne kasutajaliides.
 *
 * `satisfies Dictionary<'et'>` nõuab kahte asja: iga lähtesõnastiku võti ON ka
 * siin olemas ja mitmuse võtmed kannavad eesti keele CLDR-vorme: `one` +
 * `other`. `one` on ainult täpselt 1 (ilma komakohtadeta); kõik muu, ka
 * "1,5 tundi", on `other`. Pärast arvu tuleb `other` vormis osastav kääne
 * ("2 tundi", "5 inimest"). `as const` hoiab literaalid alles, et faili lõpus
 * olev kohatäitjate kontroll saaks teksti sisu lugeda.
 *
 * Linnade ja keelte nimed tulevad väljast valmis kujul (nimetavas), neid ei saa
 * käänata. Seepärast on laused ehitatud nii, et nimi jääb nimetavasse:
 * "Elamused linnas {sehir}", "Kuulutuse keel: {dil}" — mitte "{sehir}s".
 *
 * **Toon (VISION §6):** toode räägib inimesega, mitte agentuuriga. Pöördume
 * "sina" vormis, otse ja lühidalt — ilma turundusomadussõnade, "palun" ja
 * hüüumärkideta.
 *
 * Teadlikult ei tõlgita kahte asja: kaubamärki (Expyra) ja tugiaadressi
 * (`destek@expyra.com` — see on ainus olemasolev postkast).
 */
export const et = {
  'meta.description': 'Leia kohalikke elamusi ja broneeri need.',

  'nav.primaryLabel': 'Peamenüü',
  'nav.footerLabel': 'Jaluse menüü',
  'nav.explore': 'Avasta',
  'nav.myExperiences': 'Minu elamused',
  'nav.becomeHost': 'Hakka võõrustajaks',
  'nav.howItWorks': 'Kuidas see toimib',

  'language.trigger': 'Keel: {dil}. Muuda.',
  'language.dialogLabel': 'Keele valik',
  'language.search.label': 'Otsi keelt',
  'language.search.placeholder': 'Otsi keelt',
  'language.group.ui': 'Kasutajaliidese keeled',
  'language.group.content': 'Muud keeled',
  'language.group.contentHint':
    'Kasutajaliidest pole veel tõlgitud — elamusi saab nendes keeltes siiski avaldada.',
  'language.empty': 'Sellele otsingule ei vasta ükski keel.',

  'theme.toLight': 'Lülitu heledale teemale',
  'theme.toDark': 'Lülitu tumedale teemale',

  'currency.trigger': 'Valuuta: {para}. Muuda.',
  'currency.dialogLabel': 'Valuuta valik',
  'currency.search.label': 'Otsi valuutat',
  'currency.search.placeholder': 'EUR, dollar, liir…',
  'currency.none': 'Võõrustaja valuuta',
  'currency.empty': 'Sellele otsingule ei vasta ükski valuuta.',

  'home.hero.title': 'Uus viis leida',
  'home.hero.titleAccent': 'elamusi, mida kohalikud hoiavad endale',
  'home.hero.lede':
    'Inimestelt, kes seal päriselt elavad. Väikesed grupid, päris inimesed, paar tundi, mida sa ei unusta.',
  'home.showcase.heading': 'Elamused Expyras',
  'home.showcase.more': 'Vaata kõiki elamusi',
  'home.showcase.unavailable':
    'Me ei saanud elamusi praegu kuvada. Proovi hetke pärast uuesti — kuulutused on endiselt alles.',
  'home.showcase.empty.title': 'Midagi pole veel avaldatud',
  'home.showcase.empty.body':
    'Sina võid olla esimene. Näita inimestele midagi, mida sa tunned, väikeses grupis.',
  'home.showcase.empty.cta': 'Hakka võõrustajaks',

  'search.destination.label': 'Kuhu?',
  'search.destination.placeholder': 'Otsi linna',
  'search.date.label': 'Millal?',
  'search.date.placeholder': 'Vali kuupäev',
  'search.date.dialogLabel': 'Vali kuupäev',
  'search.date.day': 'Päev',
  'search.date.month': 'Kuu',
  'search.date.year': 'Aasta',
  'search.date.done': 'Valmis',
  'search.date.clear': 'Tühjenda',
  'search.date.stepUp': 'Eelmine: {alan}',
  'search.date.stepDown': 'Järgmine: {alan}',
  'search.submit': 'Otsi',

  'search.city.listLabel': 'Linnade soovitused',
  'search.city.countriesHeading': 'Riigid',
  'search.city.citiesHeading': 'Linnad',
  'search.city.allCountries': 'Kõik riigid',
  'search.city.tooShort': 'Hakka linna nime kirjutama või vali loendist riik.',
  'search.city.loading': 'Otsin…',
  'search.city.error': 'Me ei saanud linnade loendit laadida. Proovi hetke pärast uuesti.',
  'search.city.empty': 'Sellele otsingule ei vasta ükski linn.',
  'search.city.truncated': 'Linnu on rohkem — kirjuta edasi, et otsingut kitsendada.',
  'search.city.clear': 'Eemalda valitud linn',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: 'Leitud {n} linn', other: 'Leitud {n} linna' },
  'search.city.countryCities': { one: '{n} linn', other: '{n} linna' },

  'search.guests.label': 'Külalised',
  'search.guests.dialogLabel': 'Külaliste arv',
  'search.guests.done': 'Valmis',
  'search.guests.adults': 'Täiskasvanud',
  'search.guests.adults.hint': '13-aastased ja vanemad',
  'search.guests.adults.decrease': 'Üks täiskasvanu vähem',
  'search.guests.adults.increase': 'Üks täiskasvanu rohkem',
  'search.guests.children': 'Lapsed',
  'search.guests.children.hint': '0–12-aastased',
  'search.guests.children.decrease': 'Üks laps vähem',
  'search.guests.children.increase': 'Üks laps rohkem',
  'search.guests.summary.adults': { one: '{n} täiskasvanu', other: '{n} täiskasvanut' },
  'search.guests.summary.children': { one: '{n} laps', other: '{n} last' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} tund', other: '{n} tundi' },
  'experience.duration.minutes': { one: '{n} minut', other: '{n} minutit' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Kestus pole märgitud',
  'experience.meta': {
    one: '{sure} · kuni {n} inimene',
    other: '{sure} · kuni {n} inimest',
  },
  'experience.card.perPerson': 'külalise kohta',
  'experience.card.language': 'Kuulutuse keel: {dil}',

  'explore.heading.all': 'Kõik elamused',
  'explore.heading.city': 'Elamused linnas {sehir}',
  'explore.heading.query': 'Tulemused: „{arama}“',
  'explore.summary': { one: '{n} elamus', other: '{n} elamust' },
  'explore.summary.page': {
    one: 'Sellel lehel {n} elamus',
    other: 'Sellel lehel {n} elamust',
  },
  'explore.filtersNotice':
    'Kitsendame tulemusi ainult linna järgi — {filtreler} me veel arvesse ei võta.',
  'explore.filter.date': 'valitud kuupäeva',
  'explore.filter.guests': 'külaliste arvu',

  'explore.pager.label': 'Tulemuste lehed',
  'explore.pager.next': 'Järgmine leht',
  'explore.pager.first': 'Tagasi esimesele lehele',

  'explore.pageLink.title': 'Me ei saanud lehe linki lugeda',
  'explore.pageLink.body':
    'Aadressis olev lehe märge paistab olevat katki. Alusta otsingut uuesti — tulemused on endiselt alles.',

  'explore.empty.title': 'Siin pole veel elamusi',
  'explore.empty.body':
    'Proovi loendist mõnda teist linna. Uusi linnu ja elamusi lisandub kogu aeg.',
  'explore.empty.cta': 'Vaata kõiki elamusi',
  'explore.empty.hostCta': 'Ole siin esimene võõrustaja',

  'explore.cityMissing.title': 'Seda linna me ei tunne',
  'explore.cityMissing.body':
    'Aadressis olevat linna pole meie registris — link võib olla aegunud. Vali linn ülal oleva välja loendist.',
  'explore.cityMissing.cta': 'Vaata kõiki elamusi',

  'experience.detail.meta.fallback': 'Kohalik elamus linnas {sehir}.',
  'experience.detail.text.fallback': 'Kirjelduse keel: {dil}',
  'experience.detail.duration.label': 'Kestus',
  'experience.detail.capacity.label': 'Grupi suurus',
  'experience.detail.capacity.value': { one: 'Kuni {n} inimene', other: 'Kuni {n} inimest' },
  'experience.detail.about': 'Elamusest',
  'experience.detail.noDescription': 'Võõrustaja pole veel kirjeldust kirjutanud.',
  'experience.detail.spoken.heading': 'Elamuse ajal räägitavad keeled',
  'experience.detail.spoken.help':
    'Võõrustaja viib elamuse läbi nendes keeltes. Keel, milles kuulutus on kirjutatud, on eraldi asi.',
  'experience.detail.spoken.none': 'Võõrustaja pole veel märkinud, milliseid keeli ta räägib.',
  'experience.detail.tags.heading': 'Sildid',
  'experience.detail.gallery.heading': 'Galerii',
  'experience.detail.host.heading': 'Sinu võõrustaja',
  'experience.detail.itinerary.heading': 'Mida sa teed',
  'experience.detail.meeting.heading': 'Kus kohtume',
  'experience.detail.meeting.map': 'Ava kaardil',
  'experience.detail.meeting.mapEmbed': 'Kohtumispaiga kaart',
  'experience.detail.meeting.pin': 'Kohtumispaik',
  'experience.detail.highlights.host': 'Võõrustaja: {ad}',
  'experience.detail.highlights.duration': 'Umbes {sure}',
  'experience.detail.highlights.spoken': 'Keeled: {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Kuni {n} inimene',
    other: 'Kuni {n} inimest',
  },
  'experience.detail.highlights.bring': 'Mida kaasa võtta',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} arvustus', other: '{n} arvustust' },
  'experience.detail.reviews.stars': { one: '{n} täht', other: '{n} tähte' },
  'experience.detail.reviews.demoNote':
    'Näidisarvustused — päris hinnangud ilmuvad siia, kui broneerimine käivitub.',
  'experience.detail.reviews.showAll': 'Näita kõiki arvustusi',
  'experience.detail.reviews.about': 'Kuidas hinnangud ja arvustused toimivad.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Rumeenia',
  'experience.detail.reviews.demo.1.when': '1 päev tagasi',
  'experience.detail.reviews.demo.1.body':
    'Meie giid oli asjatundlik ja soe. Linna koos temaga avastada tundus hoopis teistmoodi.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milano, Itaalia',
  'experience.detail.reviews.demo.2.when': '3 päeva tagasi',
  'experience.detail.reviews.demo.2.body':
    'Väike grupp, palju juttu. Ka fotopeatused olid planeeritud — meile väga meeldis.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Tšehhi',
  'experience.detail.reviews.demo.3.when': '1 nädal tagasi',
  'experience.detail.reviews.demo.3.body':
    'Tempo oli veidi kiire, aga kokkuvõttes imeline. Viimane peatus oli meie lemmik.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berliin, Saksamaa',
  'experience.detail.reviews.demo.4.when': '2 nädalat tagasi',
  'experience.detail.reviews.demo.4.body':
    'Isiklikum, kui ootasime. Võõrustaja juhatas meid ka kohalike maitsete juurde.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'İstanbul, Türgi',
  'experience.detail.reviews.demo.5.when': '3 nädalat tagasi',
  'experience.detail.reviews.demo.5.body':
    'Laitmatu korraldus. Selge kohtumispaik ja ajakava pidas täpselt.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Hispaania',
  'experience.detail.reviews.demo.6.when': '1 kuu tagasi',
  'experience.detail.reviews.demo.6.body': 'Meie giid oli armas 💕💕',
  'experience.detail.know.heading': 'Hea teada',
  'experience.detail.know.minimumAge': 'Vanusepiirang',
  'experience.detail.know.minimumAgeValue': 'Alates {n}. eluaastast',
  'experience.detail.know.activityLevel': 'Aktiivsuse tase',
  'experience.detail.know.whatToBring': 'Mida kaasa võtta',
  'experience.detail.know.notIncluded': 'Hinnas ei sisaldu',
  'experience.detail.know.accessibility': 'Ligipääsetavus',
  'experience.detail.nearby.heading': 'Veel elamusi linnas {sehir}',
  'experience.detail.host.anonymous': 'Expyra võõrustaja',
  'experience.detail.booking.title': 'Kuupäevad ja hind',
  'experience.detail.booking.noSlots':
    'Praegu pole vabu kuupäevi. Need ilmuvad siia, kui võõrustaja kalendrit uuendab.',
  'experience.detail.booking.perPerson': 'inimese kohta',
  'experience.detail.booking.pickDate': 'Vali kuupäev',
  'experience.detail.booking.timeZone': 'Ajad on ajavööndis {bolge}.',
  'experience.detail.booking.spotsLeft': { one: 'Vaba {n} koht', other: 'Vaba {n} kohta' },
  'experience.detail.booking.adults': 'Täiskasvanud',
  'experience.detail.booking.children': 'Lapsed',
  'experience.detail.booking.infants': 'Imikud',
  'experience.detail.booking.currency': 'Valuuta',
  'experience.detail.booking.currencyNone': 'Võõrustaja valuuta',
  'experience.detail.booking.update': 'Arvuta hind',
  'experience.detail.booking.continue': 'Jätka maksmisega',
  'experience.detail.booking.pickDateFirst': 'Vali kõigepealt kuupäev',
  'experience.detail.booking.pickDateHint': 'Jätkamiseks vali ülal kuupäev.',
  'experience.detail.booking.total': 'Kokku',
  'experience.detail.booking.displayTotal': 'Umbes {tutar}',
  'experience.detail.booking.chargedIn':
    'Tasu võetakse valuutas {paraBirimi}. Kui sinu kaart kasutab muud valuutat, rakendab pank oma kurssi.',
  'experience.detail.booking.quoteFailed':
    'Me ei saanud selle valiku hinda arvutada. Kohti ei pruugi piisavalt olla või on aeg suletud.',
  'experience.detail.cityLink': 'Kõik elamused linnas {sehir}',
  'experience.detail.back': 'Tagasi avastama',

  'checkout.title': 'Kinnita ja maksa',
  'checkout.back': 'Tagasi elamuse juurde',
  'checkout.payment.heading': 'Makseviis',
  'checkout.payment.bank': 'Internetipank',
  'checkout.payment.bankSelect': 'Vali oma pank',
  'checkout.payment.card': 'Krediit- või deebetkaart',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Kinnitades ja makstes nõustud kasutustingimuste, tühistamistingimuste ja privaatsusteatega. Päris makse pole veel ühendatud — see samm näitab kasutajaliidest.',
  'checkout.payment.submit': 'Kinnita ja maksa',
  'checkout.payment.submitting': 'Töötlen…',
  'checkout.payment.demoNote': 'Demo: sinu kaardilt raha ei võeta ja broneeringut ei looda.',
  'checkout.payment.unavailable':
    'Maksmine pole veel saadaval: nupp aktiveerub, kui makseteenuse pakkuja on ühendatud. Sinu kaardilt raha ei võeta ja broneeringut ei looda.',
  'checkout.success.title': 'Valmis — demokinnitus',
  'checkout.success.body':
    'Kui makseteenuse pakkuja ja broneerimise API on valmis, ilmub siia päris pilet. Praegu on voog lõpuni läbitud.',
  'checkout.success.back': 'Mine minu elamuste juurde',
  'checkout.summary.nonRefundable': 'Seda broneeringut ei hüvitata.',
  'checkout.summary.date': 'Kuupäev',
  'checkout.summary.guests': 'Külalised',
  'checkout.summary.change': 'Muuda',
  'checkout.summary.priceDetails': 'Hinna üksikasjad',
  'checkout.summary.total': 'Kokku {paraBirimi}',

  'howItWorks.lede': 'Kolm sammu ja ongi valmis.',
  'howItWorks.back': 'Tagasi',
  'howItWorks.step.discover.title': 'Avasta',
  'howItWorks.step.discover.body':
    'Sirvi oma linna kohalikke elamusi. Väikesed grupid, päris võõrustajad.',
  'howItWorks.step.book.title': 'Broneeri',
  'howItWorks.step.book.body':
    'Vali kuupäev ja inimeste arv ning vaata hinda. Broneerimine tuleb peagi.',
  'howItWorks.step.join.title': 'Tule kohale',
  'howItWorks.step.join.body': 'Võõrustaja võtab sind vastu ja elamus algab.',
  'howItWorks.backToExplore': 'Tagasi avastama',

  'myExperiences.lede': 'Siin on sinu piletid.',
  'myExperiences.upcoming': 'Tulevased · {sayi}',
  'myExperiences.past': 'Möödunud · {sayi}',
  'myExperiences.downloadPdf': 'Laadi PDF alla',
  'myExperiences.wallet': 'Lisa Apple Walletisse',
  'myExperiences.wallet.soon': 'Tulekul',
  'myExperiences.rate': 'Hinda',
  'myExperiences.rate.soon': 'Avaneb, kui elamus on läbi',
  'myExperiences.empty.title': 'Pileteid veel pole',
  'myExperiences.empty.body': 'Kui broneerid elamuse, ilmub sinu pilet siia.',
  'myExperiences.empty.cta': 'Avasta elamusi',

  'ticket.demoBadge': 'Demopilet',
  'ticket.demoNote': 'Näidispilet: QR-kood pole veel allkirjastatud ja seda ei saa sissepääsu juures kontrollida.',
  'ticket.view.title': 'Sinu pilet',
  'ticket.view.lede': 'Näita QR-koodi sissepääsu juures või lisa see oma rahakotti.',
  'ticket.view.back': 'Tagasi minu elamuste juurde',
  'ticket.wallet.view': 'Vaata piletit',
  'ticket.wallet.apple': 'Lisa Apple Walletisse',
  'ticket.wallet.google': 'Lisa Google Walletisse',
  'ticket.wallet.adding': 'Valmistan ette…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet pole selles keskkonnas seadistatud. Lisa EXPYRA_APPLE_PASS_* (vt docs/WALLET.md); piletit saad siin endiselt vaadata.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet pole selles keskkonnas seadistatud. Lisa EXPYRA_GOOGLE_WALLET_* (vt docs/WALLET.md); piletit saad siin endiselt vaadata.',
  'ticket.guests': 'Külalised',
  'ticket.amount': 'Kokku',
  'ticket.status': 'Olek',
  'ticket.status.valid': 'Kehtiv',
  'ticket.status.used': 'Kasutatud',
  'ticket.timeZoneNote': 'kohalik aeg: {sehir}',

  'ticket.pdf.kicker': 'Elamuse pilet',
  'ticket.pdf.dateTime': 'Kuupäev ja kellaaeg',
  'ticket.pdf.docTitle': 'Expyra pilet — {baslik}',
  'ticket.pdf.code': 'Pileti kood {kod}',
  'ticket.pdf.notice.valid': 'Võõrustaja skannib selle koodi sissepääsu juures. Ainult ühekordseks kasutamiseks.',
  'ticket.pdf.notice.used': 'Seda piletit on sissepääsu juures kasutatud.',

  'ticket.error.signedOut': 'Pileti nägemiseks logi sisse.',
  'ticket.error.notFound': 'Selle koodiga piletit pole.',

  'auth.meta.title': 'Logi sisse',
  'auth.title': 'Logi sisse või loo konto',
  'auth.back': 'Tagasi',

  'auth.email.lede': 'Sisesta oma aadress ja saadame sulle ühekordse koodi. Parooli pole vaja.',
  'auth.email.label': 'Sinu e-posti aadress',
  'auth.email.help': 'Saadame koodi sellele aadressile.',
  'auth.email.placeholder': 'sina@example.com',
  'auth.email.error.invalid': 'See aadress ei tundu õige. Näide: sina@example.com',

  'auth.code.lede': 'Saatsime 6-kohalise koodi aadressile:',
  'auth.code.label': 'Kood sinu e-kirjast',
  'auth.code.hint':
    'Kood kehtib 10 minutit. Kui sa kirja ei leia, vaata rämpspostikausta.',
  'auth.code.resend': 'Saada uus kood',
  'auth.code.changeEmail': 'Kasuta teist aadressi',

  'auth.common.continue': 'Jätka',
  'auth.common.working': 'Saadan…',

  'auth.otp.error.invalid': 'See kood ei sobinud. Kontrolli viimase kirja 6 numbrit.',
  'auth.otp.error.locked':
    'Liiga palju katseid. Sulgesime selle koodi, et konto turvaliselt hoida — küsi uus.',
  'auth.otp.error.resendTooSoon': {
    one: 'Oota veel {n} sekund, enne kui uue koodi küsid.',
    other: 'Oota veel {n} sekundit, enne kui uue koodi küsid.',
  },

  'auth.error.tooManyRequests': 'Küsitud on liiga palju koode. Proovi natukese aja pärast uuesti.',
  'auth.error.suspended': 'See konto on peatatud. destek@expyra.com',
  'auth.error.expiredChallenge': 'Sisselogimise katse aegus. Sisesta oma aadress uuesti.',

  'account.title': 'Sinu konto',
  'account.lede': 'Siin saad muuta oma nime ja eelistatud keelt.',

  'account.email.label': 'Sinu e-posti aadress',
  'account.email.note': 'E-posti aadressi ei saa veel muuta.',

  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Grillitud kala tänaval',
  'wallpaper.kitchen.place': 'Koduköök',
  'wallpaper.kitchen.label': 'Süüa tegemas tädiga',
  'wallpaper.cappadocia.place': 'Kapadookia',
  'wallpaper.cappadocia.label': 'Kuumaõhupall',
  'wallpaper.pause': 'Peata taustavideo',
  'wallpaper.play': 'Esita taustavideo',
  'account.avatar.label': 'Profiilipilt',
  'account.avatar.help': 'JPEG, PNG või WebP · vähemalt 800×600 pikslit · kuni 10 MB',
  'account.avatar.add': 'Lisa pilt',
  'account.avatar.change': 'Muuda',
  'account.avatar.remove': 'Eemalda',
  'account.avatar.uploading': 'Laadin üles…',
  'account.name.label': 'Sinu kuvatav nimi',
  'account.name.help': 'Seda nime näevad teised. Võid selle tühjaks jätta.',
  'account.name.placeholder': 'nt Kadri T.',

  'account.language.label': 'Sinu eelistatud keel',
  'account.language.help':
    'Keel, milles me sulle kirjutame. Kasutajaliidese keel tuleb aadressiribalt, mitte sellest valikust.',
  'account.language.none': 'Määramata',

  'account.save': 'Salvesta',
  'account.saving': 'Salvestan…',
  'account.saved': 'Muudatused salvestatud.',

  'account.error.name': {
    one: 'Kuvatav nimi võib olla kuni {n} tähemärk.',
    other: 'Kuvatav nimi võib olla kuni {n} tähemärki.',
  },
  'account.error.language': 'Seda keelt me veel ei toeta. Vali loendist mõni teine.',
  'account.error.signedOut': 'Sinu seanss on lõppenud. Logi uuesti sisse.',

  'account.menu.trigger': 'Konto menüü: {ad}',
  'account.menu.title': 'Konto',
  'account.menu.signedInAs': 'Sisse logitud: {eposta}',
  'account.menu.account': 'Sinu konto',
  'account.menu.signOut': 'Logi välja',
  'account.menu.fallbackLabel': 'Sinu konto',

  'account.signIn': 'Logi sisse',
  'account.loading': 'Laadin sinu seanssi',

  'host.meta.title': 'Hakka võõrustajaks',

  'host.invite.title': 'Avalda oma elamus',
  'host.invite.lede':
    'Näita inimestele midagi, mida sa tunned, vii nad kohtadesse, kus sa niikuinii käid. Sina määrad hinna, grupi suuruse, kalendri ja tühistamistingimused — me ei sekku sellesse, mida sa pakud.',
  'host.invite.noApproval':
    'Kinnitust ega taotlusvormi pole. Niipea kui ütled hakka võõrustajaks, avaneb sinu paneel.',
  'host.invite.cta': 'Hakka võõrustajaks',
  'host.invite.pending': 'Avan…',

  'host.signedOut.note':
    'Võõrustajaks hakkamiseks pead sisse logima. Parooli me ei küsi — saadame sinu aadressile ühekordse koodi.',
  'host.signedOut.cta': 'Logi sisse, et hakata võõrustajaks',

  'host.panel.title': 'Võõrustaja paneel',
  'host.panel.lede':
    'Siin haldad oma elamusi. Sina määrad hinna, grupi, kalendri ja tühistamistingimused — me ei sekku sellesse, mida sa pakud.',
  'host.panel.status': 'Sinu konto on avatud võõrustajana.',
  'host.panel.new': 'Uus elamus',

  'host.listings.heading': 'Minu kuulutused · {sayi}',
  'host.listings.headingPage': 'Minu kuulutused · sellel lehel {sayi}',
  'host.listings.pager.label': 'Kuulutuste lehed',
  'host.listings.pager.next': 'Rohkem kuulutusi',
  'host.listings.pager.first': 'Tagasi esimesele lehele',
  'host.listings.edit': 'Muuda',
  'host.listings.view': 'Vaata kuulutust',
  'host.listings.status.draft': 'Mustand',
  'host.listings.status.published': 'Avaldatud',
  'host.listings.status.archived': 'Arhiveeritud',

  'host.listings.ready': 'Valmis avaldamiseks',
  'host.listings.missing': { one: 'Puudu {n} väli', other: 'Puudu {n} välja' },

  'host.listings.empty.heading': 'Minu kuulutused',
  'host.listings.empty.title': 'Sul pole veel ühtegi kuulutust',
  'host.listings.empty.body':
    'Ava oma esimene mustand. Võid selle kallal töötada nii kaua, kui soovid, enne kui avaldad — mustandit ei näe keegi teine.',
  'host.listings.empty.cta': 'Kirjuta oma esimene elamus',

  'host.listings.errorHeading': 'Minu kuulutused',
  'host.listings.error':
    'Me ei saanud sinu kuulutusi praegu laadida. Midagi pole kustutatud — laadi leht hetke pärast uuesti.',

  'host.steps.heading': 'Kuidas alustada?',
  'host.steps.describe.title': 'Kirjelda oma elamust',
  'host.steps.describe.body':
    'Pealkiri, kirjeldus, kestus ja grupi suurus. Kirjuta nii paljudes keeltes, kui soovid — reisijad loevad seda oma keeles.',
  'host.steps.media.title': 'Lisa oma pildid',
  'host.steps.media.body':
    'Vähemalt üks kaanepilt. Näita, milline elamus päriselt välja näeb; pildipanga fotod siin ei sobi.',
  'host.steps.pricing.title': 'Määra kalender ja hind',
  'host.steps.pricing.body':
    'Millistel päevadel, mitu inimest, kui palju. Kirjutad hinna oma valuutas ja selles valuutas saad ka raha kätte.',
  'host.steps.publish.title': 'Avalda',
  'host.steps.publish.body':
    'Midagi pole vaja oodata. Niipea kui avaldad, ilmub sinu kuulutus otsingusse.',

  'host.contact.title': 'Kirjuta meile, kui jääd hätta',
  'host.contact.body':
    'Hoolitseme esimeste võõrustajate eest ükshaaval. Kui miski takistab sind kuulutust koostamast või sa kahtled mõnes otsuses, kirjuta — lahendame selle koos.',
  'host.contact.cta': 'Kirjuta meile',
  'host.contact.howItWorks': 'Kuidas see toimib',

  'host.error.blocked': 'See konto on peatatud, seega ei saa sellest võõrustajat. destek@expyra.com',

  'host.experience.new.meta.title': 'Uus elamus',
  'host.experience.new.title': 'Alusta uut elamust',
  'host.experience.new.lede':
    'Kõigepealt küsime ühte asja: millises keeles sa kuulutuse kirjutad. Kõik muu täidad mustandis, endale sobivas järjekorras.',
  'host.experience.new.language.label': 'Millises keeles sa kirjutad?',
  'host.experience.new.language.help':
    'Seda ei saa hiljem muuta: sinu kuulutuse aadress tuleb sellest ja reisijad näevad seda teksti, kui muus keeles pole kirjutatud. Teisi keeli saad lisada hiljem.',
  'host.experience.new.submit': 'Ava mustand',
  'host.experience.new.pending': 'Avan…',

  'host.experience.new.next.heading': 'Mis edasi?',
  'host.experience.new.next.text': 'Pealkiri ja kirjeldus — nii paljudes keeltes, kui soovid.',
  'host.experience.new.next.basics': 'Kui kaua see kestab ja mitu inimest kaasa võtad.',
  'host.experience.new.next.place': 'Linn, kategooria ja keeled, mida sel päeval räägid.',
  'host.experience.new.next.publish': 'Avalda, kui oled valmis. Midagi pole vaja oodata.',

  'host.experience.edit.meta.title': 'Muuda elamust',
  'host.experience.edit.lede':
    'Iga jaotis salvestub eraldi. Peatu, kus soovid — sinu mustand ootab sind.',
  'host.experience.untitled': 'Pealkirjata mustand',
  'host.experience.back': '← Tagasi võõrustaja paneelile',

  'host.experience.save': 'Salvesta',
  'host.experience.saving': 'Salvestan…',
  'host.experience.saved': 'Salvestatud.',

  'host.experience.section.text': 'Pealkiri ja kirjeldus',
  'host.experience.section.textHelp':
    'Seda loevad reisijad enne otsustamist. Räägi, mida te teete, kus kohtute ja mis sind sellega seob.',
  'host.experience.section.basics': 'Kestus ja mahutavus',
  'host.experience.section.basicsHelp':
    'Kui kaua üks sessioon kestab ja mitu inimest korraga kaasa võtad. Kalender ja hind tulevad hiljem.',
  'host.experience.section.place': 'Linn',
  'host.experience.section.placeHelp':
    'Kus elamus toimub. Ajavöönd tuleb sellest — sessioonide ajad kuvatakse selles.',
  'host.experience.section.category': 'Kategooria',
  'host.experience.section.categoryHelp':
    'Reisijad filtreerivad selle järgi otsingus. Vali kõige lähedasem; valida saab ainult ühe.',
  'host.experience.section.languages': 'Räägitavad keeled ja sildid',
  'host.experience.section.languagesHelp':
    'Millistes keeltes sa elamust läbi viid? See on eraldi asi keelest, milles kuulutuse kirjutasid.',
  'host.experience.section.status': 'Avaldamine',
  'host.experience.section.statusHelp':
    'Mida avaldamiseks vaja on, on kirjas allpool. Kinnitusetappi pole — kui midagi ei puudu, ilmub sinu kuulutus kohe otsingusse.',

  'host.experience.translations.tabsLabel': 'Kuulutuse teksti keeled',
  'host.experience.translations.required': 'kohustuslik',
  'host.experience.translations.optional': 'valikuline',
  'host.experience.translations.add.label': 'Kirjuta teises keeles',
  'host.experience.translations.add.submit': 'Ava',
  'host.experience.translations.machine':
    'See tekst on automaatselt tõlgitud. Muuda ja salvesta see ning sellest saab sinu enda tekst.',

  'host.experience.title.label': 'Pealkiri',
  'host.experience.title.placeholder': 'Tänavatoidu jalutuskäik Kadıköys',
  'host.experience.title.help':
    'Lühike ja konkreetne. Seda näevad reisijad loendis esimesena ja sinu kuulutuse aadress tuleb sellest.',
  'host.experience.description.label': 'Kirjeldus',
  'host.experience.description.placeholder':
    'Kus kohtute, mida teete, mida sööte, mida selga panna…',
  'host.experience.description.help':
    'Avaldamiseks pole kohustuslik, aga just siin reisijad otsustavad. Käi päev järjekorras läbi.',

  'host.experience.duration.label': 'Kestus (tundides)',
  'host.experience.duration.help':
    'Ühe sessiooni kogupikkus. Näiteks 1,5 tundi või 3. Kõige rohkem seitse päeva (168 tundi).',
  'host.experience.capacity.label': 'Mahutavus (inimesi)',
  'host.experience.capacity.help':
    'Ühe sessiooni suurim inimeste arv. Avaldamiseks on vaja vähemalt ühte.',

  'host.experience.city.label': 'Millises linnas see toimub?',
  'host.experience.city.placeholder': 'Otsi linna',
  'host.experience.place.saved': 'Linn valitud · ajavöönd {saat}',
  'host.experience.place.empty': 'Linna pole veel valitud.',
  'host.experience.place.locked':
    'Kui kuulutus on avaldatud, on linn lukus: sessioonide ajad ja broneeringute asukoht sõltuvad sellest. Teise linna jaoks ava uus kuulutus.',

  'host.experience.category.label': 'Kategooria',
  'host.experience.category.none': 'Valimata',
  'host.experience.category.help': 'Millest elamus peamiselt räägib.',

  'host.experience.spoken.label': 'Keeled, mida elamuse ajal räägid',
  'host.experience.spoken.help':
    'Sõltumata keelest, milles kuulutuse kirjutasid: märgi keeled, milles sa elamust päriselt läbi viid. Kõige rohkem kümme.',
  'host.experience.spoken.search.label': 'Otsi keelt',
  'host.experience.spoken.search.placeholder': 'Saksa, Deutsch, de…',
  'host.experience.spoken.search.results': { one: 'Näidatud {n} keel', other: 'Näidatud {n} keelt' },
  'host.experience.spoken.search.none': 'Sobivat keelt pole. Märgitud keeled jäävad alles.',
  'host.experience.tags.label': 'Sildid',
  'host.experience.tags.placeholder': 'tänavatoit, jalutuskäik, väike grupp',
  'host.experience.tags.help':
    'Eralda komadega. Kõige rohkem kümme. Need aitavad sinu kuulutusel otsingutega kokku sobida.',

  'host.experience.missing.heading': 'Mida avaldamiseks vaja on',
  'host.experience.ready': 'Kõik on valmis. Võid selle kuulutuse avaldada.',
  'host.experience.missing.translation': 'pealkiri kuulutuse kirjutamise keeles',
  'host.experience.missing.city': 'linn',
  'host.experience.missing.category': 'kategooria',
  'host.experience.missing.capacity': 'mahutavus',
  'host.experience.missing.duration': 'kestus',
  'host.experience.missing.cover': 'kaanepilt',
  'host.experience.missing.price': 'hind',
  'host.experience.missing.unknown': 'lõpetamata väli',

  'host.experience.publish': 'Avalda',
  'host.experience.republish': 'Avalda uuesti',
  'host.experience.publishing': 'Avaldan…',
  'host.experience.published': 'Sinu kuulutus on avaldatud.',
  'host.experience.unpublish': 'Võta avaldamine tagasi',
  'host.experience.unpublishing': 'Võtan avaldamise tagasi…',
  'host.experience.unpublished': 'Kuulutus on jälle mustand — otsingus peidetud.',
  'host.experience.archive': 'Arhiveeri',
  'host.experience.archiving': 'Arhiveerin…',
  'host.experience.archived': 'Kuulutus arhiveeritud.',

  'host.media.heading': 'Pildid',
  'host.media.hint': 'JPEG, PNG või WebP · vähemalt 800×600 pikslit · kuni 10 MB · kuni 12 pilti',
  'host.media.add': 'Lisa pilte',
  'host.media.drop': 'Lohista failid siia',
  'host.media.uploading': 'Laadin üles…',
  'host.media.empty': 'Pilte veel pole. Esimesest üleslaaditud pildist saab kaanepilt.',
  'host.media.cover': 'Kaas',
  'host.media.makeCover': 'Tee kaanepildiks',
  'host.media.delete': 'Kustuta',
  'host.media.moveEarlier': 'Liiguta ettepoole',
  'host.media.moveLater': 'Liiguta tahapoole',
  'host.media.position': 'Pilt {n}',
  'host.media.error.rejected': 'Seda pilti ei aktsepteeritud.',
  'host.media.error.unsupported': 'Üles saab laadida ainult JPEG-, PNG- ja WebP-faile.',
  'host.media.error.notUploaded': 'Üleslaadimine ei lõppenud. Proovi uuesti.',
  'host.media.error.notAnImage': 'See fail pole pilt.',
  'host.media.error.mismatch': 'Faili sisu ei vasta selle laiendile.',
  'host.media.error.tooSmall': 'Pildid peavad olema vähemalt 800×600 pikslit.',
  'host.media.error.tooLarge': 'Failid võivad olla kuni 10 MB.',
  'host.media.error.limit': 'Kuulutusel võib olla kuni 12 pilti.',

  'host.experience.status.publishedNote':
    'Sinu kuulutus on otsingus nähtav. Võta avaldamine tagasi, et see uuesti mustandiks muuta — muuda pilte ja avalda siis uuesti. Arhiveerimine peidab selle samuti, ilma kustutamata.',
  'host.experience.status.privateNote': 'Kuni sa avaldad, ei näe seda kuulutust keegi peale sinu.',

  'host.experience.error.notFound': 'Me ei leidnud seda kuulutust. Ava see paneelilt uuesti.',
  'host.experience.error.invalid': 'Seda jaotist ei saanud salvestada. Kontrolli välju ja proovi uuesti.',
  'host.experience.error.language':
    'Selles keeles ei saa kuulutusi kirjutada. Vali loendist mõni teine.',
  'host.experience.error.title': 'Pealkiri on kohustuslik ja võib olla kuni 120 tähemärki.',
  'host.experience.error.description': 'Kirjeldus võib olla kuni 4000 tähemärki.',
  'host.experience.error.duration': 'Kirjuta kestus tundides: vähemalt 0,5, kõige rohkem 168.',
  'host.experience.error.capacity': 'Kirjuta mahutavus inimestes: vähemalt 1, kõige rohkem 500.',
  'host.experience.error.city': 'Vali linn loendist — ainult nime kirjutamisest ei piisa.',
  'host.experience.error.category': 'Vali loendist kategooria.',
  'host.experience.section.itinerary': 'Mida sa teed',
  'host.experience.section.itineraryHelp':
    'Elamuse sammud järjekorras. Iga samm on pealkiri ja soovi korral lause või kaks. Loend kirjutatakse kuulutuse keeles; ülal olevad keelte vahekaardid kehtivad ka siin.',
  'host.experience.section.meeting': 'Kohtumispaik',
  'host.experience.section.meetingHelp':
    'Kust külalised sind leiavad? Aadress ei sõltu keelest, juhised on valitud keeles. Lisa koordinaadid ja külalised saavad koha kaardil avada.',
  'host.experience.section.details': 'Hea teada',
  'host.experience.section.detailsHelp':
    'Vanusepiirang, aktiivsuse tase ja see, mida külalised peaksid ette teadma. Tühjaks jäetud välju ei näidata.',
  'host.experience.textLanguage.note': 'Selle jaotise tekstide keel: {dil}. Keele vahetamiseks kasuta jaotise 01 vahekaarte.',

  'host.experience.itinerary.stepTitle.label': 'Samm {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Kohtume hipodroomil',
  'host.experience.itinerary.stepBody.placeholder': 'Bütsantsi vankrivõistluste rada; siin seisavad obelisk ja Maosammas.',
  'host.experience.itinerary.add': 'Lisa samm',
  'host.experience.itinerary.remove': 'Eemalda samm',
  'host.experience.itinerary.help': 'Tühje ridu ei salvestata. Kuni 20 sammu.',

  'host.experience.meeting.address.label': 'Aadress',
  'host.experience.meeting.address.placeholder': 'Galata torni ees, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Laiuskraad',
  'host.experience.meeting.longitude.label': 'Pikkuskraad',
  'host.experience.meeting.coords.help': 'Mõlemad või mitte kumbki. Kümnendmurd: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Juhised',
  'host.experience.meeting.instructions.placeholder': 'Torni põhjavärava juures — otsi kollase vihmavarjuga giidi.',

  'host.experience.details.minimumAge.label': 'Alampiir vanusele',
  'host.experience.details.minimumAge.help': 'Tühi = piirangut pole. 1–99.',
  'host.experience.details.activityLevel.label': 'Aktiivsuse tase',
  'host.experience.details.activityLevel.none': 'Määramata',
  'host.experience.details.whatToBring.label': 'Mida kaasa võtta',
  'host.experience.details.whatToBring.placeholder': 'Vesi, mugavad jalanõud, sall (mošeekülastuseks)',
  'host.experience.details.notIncluded.label': 'Hinnas ei sisaldu',
  'host.experience.details.notIncluded.placeholder': 'Muuseumipiletid, lõuna',
  'host.experience.details.accessibility.label': 'Ligipääsetavus',
  'host.experience.details.accessibility.placeholder': 'Marsruudil on treppe; ratastooliga ei sobi.',

  'host.experience.error.translationMissing': 'Kirjuta kõigepealt pealkiri selles keeles (jaotis 01) ja täida siis need väljad.',
  'host.experience.error.minimumAge': 'Vanuse alampiir peab olema täisarv vahemikus 1–99.',
  'host.experience.error.coordinates': 'Laius- ja pikkuskraad käivad koos; laiuskraad ±90, pikkuskraad ±180.',
  'host.experience.error.itinerary': 'Igal sammul peab olema pealkiri; kuni 20 sammu.',

  'experience.activity.light': 'Kerge',
  'experience.activity.moderate': 'Mõõdukas',
  'experience.activity.strenuous': 'Pingutav',

  'host.profile.heading': 'Tutvusta ennast',
  'host.profile.lede':
    'Näidatakse kuulutuse lehel sinu nime all. Kes sa oled ja miks just sina peaksid seda lugu jutustama — kaks lauset on piisav.',
  'host.profile.headline.label': 'Pealkiri',
  'host.profile.headline.placeholder': 'Kohalik giid ja ajaloolane İstanbulis',
  'host.profile.bio.label': 'Minust',
  'host.profile.bio.placeholder': 'Olen kümme aastat inimesi linna kõrvaltänavatel ringi juhatanud…',
  'host.profile.language.label': 'Teksti keel',
  'host.profile.error.invalid': 'Pealkiri kuni 80 tähemärki, tutvustus kuni 2000.',
  'host.experience.error.spokenLanguages': 'Märkida saab kõige rohkem kümme keelt.',
  'host.experience.error.tags': 'Sildid ei tohi olla tühjad; kõige rohkem kümme ja igaüks lühike.',
  'host.experience.error.publishedConflict':
    'Seda muudatust ei saa avaldatud kuulutuses teha. Arhiveeri see kõigepealt ja muuda siis.',
  'host.experience.error.publishBlocked': 'Ei avaldatud. Veel puudu: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Ei avaldatud: kuulutus pole veel valmis. Vaata ülal olevat loendit.',

  'category.food-drink': 'Toit ja jook',
  'category.art-culture': 'Kunst ja kultuur',
  'category.history-heritage': 'Ajalugu ja pärand',
  'category.nature-outdoors': 'Loodus ja vabaõhk',
  'category.water-sea': 'Vesi ja meri',
  'category.sports-adventure': 'Sport ja seiklus',
  'category.crafts-workshops': 'Käsitöö ja töötoad',
  'category.music-nightlife': 'Muusika ja ööelu',
  'category.wellness': 'Heaolu',
  'category.photography': 'Fotograafia',
  'category.tours-walks': 'Tuurid ja jalutuskäigud',
  'category.local-life': 'Kohalik elu',

  'host.experience.section.pricing': 'Hind',
  'host.experience.section.pricingHelp':
    'Määra hind inimese kohta oma valuutas. Raha makstakse sulle alati selles valuutas; kui reisija valib muu valuuta, arvutatakse ümber ainult kuvamine.',

  'host.pricing.currency.label': 'Väljamakse valuuta',
  'host.pricing.currency.help':
    'Valuuta, milles raha sinuni jõuab. Seda ei saa pärast kuulutuse avaldamist muuta — arhiveeri see kõigepealt.',
  'host.pricing.currency.locked': 'Valuuta on lukus, sest kuulutus on avaldatud.',
  'host.pricing.currency.placeholder': 'Vali',

  'host.pricing.adult.label': 'Täiskasvanu (inimese kohta)',
  'host.pricing.adult.help': 'Kohustuslik. See on „alates“-hind, mida näidatakse kaartidel ja otsingus.',
  'host.pricing.child.label': 'Laps (inimese kohta)',
  'host.pricing.child.help': 'Jäta tühjaks, kui sa lapsehinda ei paku. Sisesta 0, kui see on tasuta.',
  'host.pricing.infant.label': 'Imik (inimese kohta)',
  'host.pricing.infant.help': 'Jäta tühjaks, kui sa imikuhinda ei paku. Sisesta 0, kui see on tasuta.',

  'host.pricing.saved': 'Hind salvestatud.',
  'host.pricing.empty': 'Hinda veel pole. Hinnata kuulutust ei saa avaldada.',

  'host.pricing.error.currency': 'Vali kehtiv valuuta.',
  'host.pricing.error.currencyLocked':
    'Avaldatud kuulutuse valuutat ei saa muuta. Arhiveeri see kõigepealt.',
  'host.pricing.error.adult': 'Täiskasvanu hind on kohustuslik ja peab olema kehtiv summa.',
  'host.pricing.error.child': 'Lapse hind peab olema kehtiv summa.',
  'host.pricing.error.infant': 'Imiku hind peab olema kehtiv summa.',
  'host.pricing.error.range':
    'See summa jääb väljapoole vahemikku, mida makseteenuse pakkuja aktsepteerib — see on kas liiga väike või liiga suur.',

  'host.experience.section.schedule': 'Ajakava',
  'host.experience.section.scheduleHelp':
    'Millistel päevadel ja kellaaegadel sa seda pakud? Ajad on linna ajavööndis — sinu kirjutatud kellaaeg jääb paigale ka suveaja vahetumisel.',

  'host.schedule.blocked':
    'Ajakava jaoks on kõigepealt vaja linna, kestust ja mahutavust. Lõpeta ülal olevad jaotised.',
  'host.schedule.timeZone': 'Ajavöönd: {bolge}',
  'host.schedule.generatedThrough': 'Sinu kalender on valmis kuni {tarih}.',

  'host.schedule.rule.heading': 'Iganädalane reegel',
  'host.schedule.rule.days': 'Päevad',
  'host.schedule.rule.daysHelp': 'Võid valida mitu; igast päevast saab eraldi reegel.',
  'host.schedule.rule.time': 'Algusaeg',
  'host.schedule.rule.timeHelp': 'Linna kohaliku aja järgi.',
  'host.schedule.rule.start': 'Alates',
  'host.schedule.rule.startHelp': 'Jäta tühjaks, et alustada täna.',
  'host.schedule.rule.submit': 'Lisa reegel',
  'host.schedule.rule.pending': 'Lisan…',
  'host.schedule.rule.stop': 'Eemalda',
  'host.schedule.rule.stopping': 'Eemaldan…',
  'host.schedule.rule.empty': 'Iganädalasi reegleid veel pole.',
  'host.schedule.rule.stopped': 'peatatud',

  'host.schedule.blackout.heading': 'Vabad päevad',
  'host.schedule.blackout.start': 'Alates',
  'host.schedule.blackout.end': 'Kuni',
  'host.schedule.blackout.endHelp': 'Jäta tühjaks, et sulgeda üks päev. Lõpupäev on kaasa arvatud.',
  'host.schedule.blackout.submit': 'Sulge',
  'host.schedule.blackout.pending': 'Sulgen…',
  'host.schedule.blackout.remove': 'Eemalda',
  'host.schedule.blackout.removing': 'Eemaldan…',
  'host.schedule.blackout.empty': 'Vabu päevi pole.',

  'host.schedule.slots.heading': 'Tulevased sessioonid',
  'host.schedule.slots.empty': 'Selles vahemikus sessioone pole.',
  'host.schedule.slots.remaining': {
    one: 'Vaba {n} koht',
    other: 'Vaba {n} kohta',
  },
  'host.schedule.slots.closed': 'Suletud',
  'host.schedule.slots.closedByBlackout': 'Vaba päev',
  'host.schedule.slots.close': 'Sulge',
  'host.schedule.slots.closing': 'Sulgen…',
  'host.schedule.slots.open': 'Ava',
  'host.schedule.slots.opening': 'Avan…',
  'host.schedule.slots.more': 'ja veel {n}',

  'host.schedule.day.monday': 'Esmaspäev',
  'host.schedule.day.tuesday': 'Teisipäev',
  'host.schedule.day.wednesday': 'Kolmapäev',
  'host.schedule.day.thursday': 'Neljapäev',
  'host.schedule.day.friday': 'Reede',
  'host.schedule.day.saturday': 'Laupäev',
  'host.schedule.day.sunday': 'Pühapäev',

  'host.schedule.ruleSaved': 'Reegel lisatud ja sessioonid loodud.',
  'host.schedule.ruleStopped': 'Reegel peatatud.',
  'host.schedule.slotOpened': 'Sessioon avatud.',
  'host.schedule.slotClosed': 'Sessioon suletud.',
  'host.schedule.blackoutSaved': 'Päevad suletud.',
  'host.schedule.blackoutRemoved': 'Vabad päevad eemaldatud.',

  'host.schedule.error.noDay': 'Vali vähemalt üks päev.',
  'host.schedule.error.time': 'Kirjuta kellaaeg kujul TT:MM.',
  'host.schedule.error.date': 'Sisesta kehtiv kuupäev.',
  'host.schedule.error.range': 'Lõppkuupäev ei saa olla enne alguskuupäeva.',
  'host.schedule.error.notSchedulable':
    'Ajakava jaoks on kõigepealt vaja linna, kestust ja mahutavust.',
  'host.schedule.error.duplicateRule': 'Sellel päeval ja kellaajal on juba reegel.',
  'host.schedule.error.ruleLimit': 'Sellele elamusele ei saa rohkem iganädalasi reegleid lisada.',
  'host.schedule.error.dstGap':
    'Seda kellaaega sel päeval suveajale ülemineku tõttu ei eksisteeri. Proovi tund hiljem.',
  'host.schedule.error.past': 'Möödunud sessiooni ei saa muuta.',
  'host.schedule.error.slotExists': 'Sellel ajal on juba sessioon.',
  'host.schedule.error.blackedOut': 'See kuupäev on märgitud vabaks päevaks. Eemalda kõigepealt vahemik.',
  'host.schedule.error.generated':
    'Iganädalase reegli loodud sessiooni ei saa kustutada; saad selle sulgeda.',
  'host.schedule.error.hasBookings': 'Broneeringutega sessiooni ei saa muuta.',
  'host.schedule.error.blackoutLimit': 'Rohkem vabu päevi ei saa lisada.',
  'host.schedule.error.horizon': 'Kalendrit ei saa nii kaugele ette avada.',
  'host.schedule.error.generic': 'See ei õnnestunud praegu.',
} as const satisfies Dictionary<'et'>

/**
 * Teksti võrreldakse ka lähtekeelega: kui kohatäitja kaob või muudab nime,
 * katkeb kompileerimine ja annab teada, millise võtmega on tegu.
 * `export` on teadlik — kasutamata tüüpi loeb lint surnud koodiks.
 */
export type EtPlaceholders = Assert<PlaceholdersMatchSource<typeof et>>
