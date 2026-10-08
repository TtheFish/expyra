import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Suomenkielinen käyttöliittymä.
 *
 * `satisfies Dictionary<'fi'>` vaatii kaksi asiaa: jokainen lähdesanaston
 * avain ON myös täällä, ja monikkoavaimet kantavat suomen CLDR-muodot: `one` +
 * `other`. `one` on vain tasan 1 (ilman desimaaleja); kaikki muu, myös
 * "1,5 tuntia", on `other`. Luvun jälkeen `other`-muoto on partitiivissa
 * ("2 tuntia", "5 henkilöä"). `as const` säilyttää literaalit, jotta tiedoston
 * lopussa oleva paikkamerkkien tarkistus voi lukea tekstin sisällön.
 *
 * Kaupunkien ja kielten nimet tulevat valmiina (nominatiivissa), eikä niitä
 * voi taivuttaa. Siksi lauseet on rakennettu niin, että nimi pysyy
 * nominatiivissa: "Elämykset: {sehir}", "Ilmoituksen kieli: {dil}" — ei
 * "{sehir}ssa".
 *
 * "Host" on suomeksi **järjestäjä** — elämysalustojen vakiintunut termi, ja
 * se ei viittaa sukupuoleen kuten "isäntä/emäntä".
 *
 * **Sävy (VISION §6):** tuote puhuu ihmiselle, ei toimistolle. Puhuttelemme
 * sinä-muodossa, suoraan ja lyhyesti — ilman markkinointiadjektiiveja,
 * "ole hyvä" -fraaseja ja huutomerkkejä.
 *
 * Kahta asiaa ei tietoisesti käännetä: tuotemerkkiä (Expyra) ja tukiosoitetta
 * (`destek@expyra.com` — se on ainoa olemassa oleva postilaatikko).
 */
export const fi = {
  'meta.description': 'Löydä paikallisia elämyksiä ja varaa ne.',

  'nav.primaryLabel': 'Päävalikko',
  'nav.footerLabel': 'Alatunnisteen valikko',
  'nav.explore': 'Tutustu',
  'nav.myExperiences': 'Omat elämykset',
  'nav.becomeHost': 'Ryhdy järjestäjäksi',
  'nav.howItWorks': 'Näin se toimii',

  'language.trigger': 'Kieli: {dil}. Vaihda.',
  'language.dialogLabel': 'Kielen valinta',
  'language.search.label': 'Hae kieltä',
  'language.search.placeholder': 'Hae kieltä',
  'language.group.ui': 'Käyttöliittymän kielet',
  'language.group.content': 'Muut kielet',
  'language.group.contentHint':
    'Käyttöliittymää ei ole vielä käännetty — elämyksiä voi silti julkaista näillä kielillä.',
  'language.empty': 'Haulla ei löytynyt kieltä.',

  'theme.toLight': 'Vaihda vaaleaan teemaan',
  'theme.toDark': 'Vaihda tummaan teemaan',

  'currency.trigger': 'Valuutta: {para}. Vaihda.',
  'currency.dialogLabel': 'Valuutan valinta',
  'currency.search.label': 'Hae valuuttaa',
  'currency.search.placeholder': 'EUR, dollari, liira…',
  'currency.none': 'Järjestäjän valuutta',
  'currency.empty': 'Haulla ei löytynyt valuuttaa.',

  'home.hero.title': 'Uusi tapa löytää',
  'home.hero.titleAccent': 'elämykset, jotka paikalliset pitävät omanaan',
  'home.hero.lede':
    'Ihmisiltä, jotka oikeasti asuvat siellä. Pienet ryhmät, oikeat ihmiset, muutama tunti, jota et unohda.',
  'home.showcase.heading': 'Elämyksiä Expyrassa',
  'home.showcase.more': 'Katso kaikki elämykset',
  'home.showcase.unavailable':
    'Emme saaneet näytettyä elämyksiä juuri nyt. Yritä hetken päästä uudelleen — ilmoitukset ovat yhä tallessa.',
  'home.showcase.empty.title': 'Mitään ei ole vielä julkaistu',
  'home.showcase.empty.body':
    'Sinä voit olla ensimmäinen. Näytä ihmisille jotain, minkä tunnet, pienessä ryhmässä.',
  'home.showcase.empty.cta': 'Ryhdy järjestäjäksi',

  'search.destination.label': 'Minne?',
  'search.destination.placeholder': 'Hae kaupunkia',
  'search.date.label': 'Milloin?',
  'search.date.placeholder': 'Valitse päivämäärä',
  'search.date.dialogLabel': 'Valitse päivämäärä',
  'search.date.day': 'Päivä',
  'search.date.month': 'Kuukausi',
  'search.date.year': 'Vuosi',
  'search.date.done': 'Valmis',
  'search.date.clear': 'Tyhjennä',
  'search.date.stepUp': 'Edellinen: {alan}',
  'search.date.stepDown': 'Seuraava: {alan}',
  'search.submit': 'Hae',

  'search.city.listLabel': 'Kaupunkiehdotukset',
  'search.city.countriesHeading': 'Maat',
  'search.city.citiesHeading': 'Kaupungit',
  'search.city.allCountries': 'Kaikki maat',
  'search.city.tooShort': 'Ala kirjoittaa kaupungin nimeä tai valitse maa luettelosta.',
  'search.city.loading': 'Haetaan…',
  'search.city.error': 'Emme saaneet ladattua kaupunkiluetteloa. Yritä hetken päästä uudelleen.',
  'search.city.empty': 'Haulla ei löytynyt kaupunkia.',
  'search.city.truncated': 'Kaupunkeja on enemmän — jatka kirjoittamista rajataksesi hakua.',
  'search.city.clear': 'Poista valittu kaupunki',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} kaupunki löytyi', other: '{n} kaupunkia löytyi' },
  'search.city.countryCities': { one: '{n} kaupunki', other: '{n} kaupunkia' },

  'search.guests.label': 'Vieraat',
  'search.guests.dialogLabel': 'Vieraiden määrä',
  'search.guests.done': 'Valmis',
  'search.guests.adults': 'Aikuiset',
  'search.guests.adults.hint': '13 vuotta täyttäneet',
  'search.guests.adults.decrease': 'Yksi aikuinen vähemmän',
  'search.guests.adults.increase': 'Yksi aikuinen lisää',
  'search.guests.children': 'Lapset',
  'search.guests.children.hint': '0–12-vuotiaat',
  'search.guests.children.decrease': 'Yksi lapsi vähemmän',
  'search.guests.children.increase': 'Yksi lapsi lisää',
  'search.guests.summary.adults': { one: '{n} aikuinen', other: '{n} aikuista' },
  'search.guests.summary.children': { one: '{n} lapsi', other: '{n} lasta' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} tunti', other: '{n} tuntia' },
  'experience.duration.minutes': { one: '{n} minuutti', other: '{n} minuuttia' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Kestoa ei ole ilmoitettu',
  'experience.meta': {
    one: '{sure} · enintään {n} henkilö',
    other: '{sure} · enintään {n} henkilöä',
  },
  'experience.card.perPerson': 'vierasta kohden',
  'experience.card.language': 'Ilmoituksen kieli: {dil}',

  'explore.heading.all': 'Kaikki elämykset',
  'explore.heading.city': 'Elämykset: {sehir}',
  'explore.heading.query': 'Tulokset haulle ”{arama}”',
  'explore.summary': { one: '{n} elämys', other: '{n} elämystä' },
  'explore.summary.page': {
    one: 'Tällä sivulla {n} elämys',
    other: 'Tällä sivulla {n} elämystä',
  },
  'explore.filtersNotice':
    'Rajaamme tuloksia vain kaupungin mukaan — {filtreler} emme vielä huomioi.',
  'explore.filter.date': 'valittua päivämäärää',
  'explore.filter.guests': 'vieraiden määrää',

  'explore.pager.label': 'Tulossivut',
  'explore.pager.next': 'Seuraava sivu',
  'explore.pager.first': 'Takaisin ensimmäiselle sivulle',

  'explore.pageLink.title': 'Emme pystyneet lukemaan sivulinkkiä',
  'explore.pageLink.body':
    'Osoitteen sivumerkintä näyttää rikkinäiseltä. Aloita haku alusta — tulokset ovat yhä tallessa.',

  'explore.empty.title': 'Täällä ei ole vielä elämyksiä',
  'explore.empty.body':
    'Kokeile toista kaupunkia luettelosta. Uusia kaupunkeja ja elämyksiä tulee jatkuvasti lisää.',
  'explore.empty.cta': 'Katso kaikki elämykset',
  'explore.empty.hostCta': 'Ole täällä ensimmäinen järjestäjä',

  'explore.cityMissing.title': 'Emme tunne tätä kaupunkia',
  'explore.cityMissing.body':
    'Osoitteessa olevaa kaupunkia ei ole rekisterissämme — linkki voi olla vanhentunut. Valitse kaupunki yllä olevan kentän luettelosta.',
  'explore.cityMissing.cta': 'Katso kaikki elämykset',

  'experience.detail.meta.fallback': 'Paikallinen elämys · {sehir}.',
  'experience.detail.text.fallback': 'Kuvauksen kieli: {dil}',
  'experience.detail.duration.label': 'Kesto',
  'experience.detail.capacity.label': 'Ryhmän koko',
  'experience.detail.capacity.value': { one: 'Enintään {n} henkilö', other: 'Enintään {n} henkilöä' },
  'experience.detail.about': 'Tietoa elämyksestä',
  'experience.detail.noDescription': 'Järjestäjä ei ole vielä kirjoittanut kuvausta.',
  'experience.detail.spoken.heading': 'Elämyksen aikana puhutut kielet',
  'experience.detail.spoken.help':
    'Järjestäjä vetää elämyksen näillä kielillä. Kieli, jolla ilmoitus on kirjoitettu, on eri asia.',
  'experience.detail.spoken.none': 'Järjestäjä ei ole vielä ilmoittanut puhumiaan kieliä.',
  'experience.detail.tags.heading': 'Tunnisteet',
  'experience.detail.gallery.heading': 'Galleria',
  'experience.detail.host.heading': 'Järjestäjäsi',
  'experience.detail.itinerary.heading': 'Mitä teet',
  'experience.detail.meeting.heading': 'Missä tapaamme',
  'experience.detail.meeting.map': 'Avaa kartalla',
  'experience.detail.meeting.mapEmbed': 'Tapaamispaikan kartta',
  'experience.detail.meeting.pin': 'Tapaamispaikka',
  'experience.detail.highlights.host': 'Järjestäjä: {ad}',
  'experience.detail.highlights.duration': 'Noin {sure}',
  'experience.detail.highlights.spoken': 'Kielet: {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Enintään {n} henkilö',
    other: 'Enintään {n} henkilöä',
  },
  'experience.detail.highlights.bring': 'Mitä ottaa mukaan',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} arvio', other: '{n} arviota' },
  'experience.detail.reviews.stars': { one: '{n} tähti', other: '{n} tähteä' },
  'experience.detail.reviews.demoNote':
    'Esimerkkiarvioita — oikeat arviot näkyvät täällä, kun varaukset käynnistyvät.',
  'experience.detail.reviews.showAll': 'Näytä kaikki arviot',
  'experience.detail.reviews.about': 'Näin arviot ja arvostelut toimivat.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Romania',
  'experience.detail.reviews.demo.1.when': '1 päivä sitten',
  'experience.detail.reviews.demo.1.body':
    'Oppaamme oli asiantunteva ja lämmin. Kaupunkiin tutustuminen hänen kanssaan tuntui aivan erilaiselta.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milano, Italia',
  'experience.detail.reviews.demo.2.when': '3 päivää sitten',
  'experience.detail.reviews.demo.2.body':
    'Pieni ryhmä, paljon juttelua. Myös kuvaustauot oli suunniteltu — rakastimme sitä.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Tšekki',
  'experience.detail.reviews.demo.3.when': '1 viikko sitten',
  'experience.detail.reviews.demo.3.body':
    'Tahti oli vähän nopea, mutta kaiken kaikkiaan ihana. Viimeinen pysähdys oli suosikkimme.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berliini, Saksa',
  'experience.detail.reviews.demo.4.when': '2 viikkoa sitten',
  'experience.detail.reviews.demo.4.body':
    'Henkilökohtaisempi kuin odotimme. Järjestäjä vinkkasi meille myös paikallisia makuja.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'İstanbul, Turkki',
  'experience.detail.reviews.demo.5.when': '3 viikkoa sitten',
  'experience.detail.reviews.demo.5.body':
    'Moitteeton järjestely. Selkeä tapaamispaikka ja aikataulu piti tarkalleen.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Espanja',
  'experience.detail.reviews.demo.6.when': '1 kuukausi sitten',
  'experience.detail.reviews.demo.6.body': 'Oppaamme oli ihana 💕💕',
  'experience.detail.know.heading': 'Hyvä tietää',
  'experience.detail.know.minimumAge': 'Ikäraja',
  'experience.detail.know.minimumAgeValue': 'Vähintään {n} vuotta',
  'experience.detail.know.activityLevel': 'Aktiivisuustaso',
  'experience.detail.know.whatToBring': 'Mitä ottaa mukaan',
  'experience.detail.know.notIncluded': 'Ei sisälly hintaan',
  'experience.detail.know.accessibility': 'Saavutettavuus',
  'experience.detail.nearby.heading': 'Lisää elämyksiä: {sehir}',
  'experience.detail.host.anonymous': 'Expyran järjestäjä',
  'experience.detail.booking.title': 'Päivämäärät ja hinta',
  'experience.detail.booking.noSlots':
    'Vapaita päivämääriä ei ole juuri nyt. Ne ilmestyvät tähän, kun järjestäjä päivittää kalenterin.',
  'experience.detail.booking.perPerson': 'henkilöltä',
  'experience.detail.booking.pickDate': 'Valitse päivämäärä',
  'experience.detail.booking.timeZone': 'Ajat ovat aikavyöhykkeellä {bolge}.',
  'experience.detail.booking.spotsLeft': { one: '{n} paikka jäljellä', other: '{n} paikkaa jäljellä' },
  'experience.detail.booking.adults': 'Aikuiset',
  'experience.detail.booking.children': 'Lapset',
  'experience.detail.booking.infants': 'Vauvat',
  'experience.detail.booking.currency': 'Valuutta',
  'experience.detail.booking.currencyNone': 'Järjestäjän valuutta',
  'experience.detail.booking.update': 'Laske hinta',
  'experience.detail.booking.continue': 'Jatka maksamaan',
  'experience.detail.booking.pickDateFirst': 'Valitse ensin päivämäärä',
  'experience.detail.booking.pickDateHint': 'Valitse yllä päivämäärä jatkaaksesi.',
  'experience.detail.booking.total': 'Yhteensä',
  'experience.detail.booking.displayTotal': 'Noin {tutar}',
  'experience.detail.booking.chargedIn':
    'Veloitusvaluutta on {paraBirimi}. Jos korttisi käyttää eri valuuttaa, pankkisi käyttää omaa kurssiaan.',
  'experience.detail.booking.quoteFailed':
    'Emme pystyneet hinnoittelemaan tätä valintaa. Paikkoja ei ehkä ole tarpeeksi, tai aika on suljettu.',
  'experience.detail.cityLink': 'Kaikki elämykset: {sehir}',
  'experience.detail.back': 'Takaisin tutustumaan',

  'checkout.title': 'Vahvista ja maksa',
  'checkout.back': 'Takaisin elämykseen',
  'checkout.payment.heading': 'Maksutapa',
  'checkout.payment.bank': 'Verkkopankki',
  'checkout.payment.bankSelect': 'Valitse pankkisi',
  'checkout.payment.card': 'Luotto- tai pankkikortti',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Vahvistamalla ja maksamalla hyväksyt käyttöehdot, peruutusehdot ja tietosuojaselosteen. Oikeaa maksua ei ole vielä kytketty — tämä vaihe näyttää käyttöliittymän.',
  'checkout.payment.submit': 'Vahvista ja maksa',
  'checkout.payment.submitting': 'Käsitellään…',
  'checkout.payment.demoNote': 'Demo: korttiasi ei veloiteta eikä varausta luoda.',
  'checkout.payment.unavailable':
    'Maksaminen ei ole vielä käytettävissä: painike aktivoituu, kun maksupalvelu on kytketty. Korttiasi ei veloiteta eikä varausta luoda.',
  'checkout.success.title': 'Valmis — demovahvistus',
  'checkout.success.body':
    'Kun maksupalvelu ja varausrajapinta ovat valmiita, tähän ilmestyy oikea lippu. Toistaiseksi kulku on valmis.',
  'checkout.success.back': 'Siirry omiin elämyksiin',
  'checkout.summary.nonRefundable': 'Tätä varausta ei hyvitetä.',
  'checkout.summary.date': 'Päivämäärä',
  'checkout.summary.guests': 'Vieraat',
  'checkout.summary.change': 'Muuta',
  'checkout.summary.priceDetails': 'Hinnan erittely',
  'checkout.summary.total': 'Yhteensä {paraBirimi}',

  'howItWorks.lede': 'Kolme vaihetta, ja olet valmis.',
  'howItWorks.back': 'Takaisin',
  'howItWorks.step.discover.title': 'Tutustu',
  'howItWorks.step.discover.body':
    'Selaa kaupunkisi paikallisia elämyksiä. Pienet ryhmät, oikeat järjestäjät.',
  'howItWorks.step.book.title': 'Varaa',
  'howItWorks.step.book.body':
    'Valitse päivämäärä ja henkilömäärä ja näe hinta. Varaaminen tulee pian.',
  'howItWorks.step.join.title': 'Saavu paikalle',
  'howItWorks.step.join.body': 'Järjestäjä ottaa sinut vastaan, ja elämys alkaa.',
  'howItWorks.backToExplore': 'Takaisin tutustumaan',

  'myExperiences.lede': 'Täällä ovat lippusi.',
  'myExperiences.upcoming': 'Tulevat · {sayi}',
  'myExperiences.past': 'Menneet · {sayi}',
  'myExperiences.downloadPdf': 'Lataa PDF',
  'myExperiences.wallet': 'Lisää Apple Walletiin',
  'myExperiences.wallet.soon': 'Tulossa pian',
  'myExperiences.rate': 'Arvioi',
  'myExperiences.rate.soon': 'Avautuu, kun elämys on ohi',
  'myExperiences.empty.title': 'Ei vielä lippuja',
  'myExperiences.empty.body': 'Kun varaat elämyksen, lippusi ilmestyy tähän.',
  'myExperiences.empty.cta': 'Tutustu elämyksiin',

  'ticket.demoBadge': 'Demolippu',
  'ticket.demoNote': 'Esimerkkilippu: QR-koodia ei ole vielä allekirjoitettu, eikä sitä voi tarkistaa sisäänkäynnillä.',
  'ticket.view.title': 'Lippusi',
  'ticket.view.lede': 'Näytä QR-koodi sisäänkäynnillä tai lisää se lompakkoosi.',
  'ticket.view.back': 'Takaisin omiin elämyksiin',
  'ticket.wallet.view': 'Näytä lippu',
  'ticket.wallet.apple': 'Lisää Apple Walletiin',
  'ticket.wallet.google': 'Lisää Google Walletiin',
  'ticket.wallet.adding': 'Valmistellaan…',
  'ticket.wallet.appleNotConfigured':
    'Apple Walletia ei ole määritetty tässä ympäristössä. Lisää EXPYRA_APPLE_PASS_* (katso docs/WALLET.md); voit silti katsoa lippua täällä.',
  'ticket.wallet.googleNotConfigured':
    'Google Walletia ei ole määritetty tässä ympäristössä. Lisää EXPYRA_GOOGLE_WALLET_* (katso docs/WALLET.md); voit silti katsoa lippua täällä.',
  'ticket.guests': 'Vieraat',
  'ticket.amount': 'Yhteensä',
  'ticket.status': 'Tila',
  'ticket.status.valid': 'Voimassa',
  'ticket.status.used': 'Käytetty',
  'ticket.timeZoneNote': 'paikallista aikaa: {sehir}',

  'ticket.pdf.kicker': 'Elämyslippu',
  'ticket.pdf.dateTime': 'Päivämäärä ja aika',
  'ticket.pdf.docTitle': 'Expyra-lippu — {baslik}',
  'ticket.pdf.code': 'Lippukoodi {kod}',
  'ticket.pdf.notice.valid': 'Järjestäjä skannaa koodin sisäänkäynnillä. Kertakäyttöinen.',
  'ticket.pdf.notice.used': 'Tämä lippu on käytetty sisäänkäynnillä.',

  'ticket.error.signedOut': 'Kirjaudu sisään nähdäksesi lipun.',
  'ticket.error.notFound': 'Tällä koodilla ei ole lippua.',

  'auth.meta.title': 'Kirjaudu sisään',
  'auth.title': 'Kirjaudu sisään tai luo tili',
  'auth.back': 'Takaisin',

  'auth.email.lede': 'Kirjoita osoitteesi, niin lähetämme sinulle kertakäyttöisen koodin. Ei salasanaa.',
  'auth.email.label': 'Sähköpostiosoitteesi',
  'auth.email.help': 'Lähetämme koodin tähän osoitteeseen.',
  'auth.email.placeholder': 'nimi@example.com',
  'auth.email.error.invalid': 'Osoite ei näytä oikealta. Esimerkki: nimi@example.com',

  'auth.code.lede': 'Lähetimme 6-numeroisen koodin osoitteeseen:',
  'auth.code.label': 'Koodi sähköpostistasi',
  'auth.code.hint':
    'Koodi on voimassa 10 minuuttia. Jos et löydä viestiä, katso roskapostikansiosta.',
  'auth.code.resend': 'Lähetä uusi koodi',
  'auth.code.changeEmail': 'Käytä toista osoitetta',

  'auth.common.continue': 'Jatka',
  'auth.common.working': 'Lähetetään…',

  'auth.otp.error.invalid': 'Koodi ei täsmännyt. Tarkista viimeisimmän viestin 6 numeroa.',
  'auth.otp.error.locked':
    'Liian monta yritystä. Suljimme koodin tilisi suojaamiseksi — pyydä uusi.',
  'auth.otp.error.resendTooSoon': {
    one: 'Odota vielä {n} sekunti ennen kuin pyydät uuden koodin.',
    other: 'Odota vielä {n} sekuntia ennen kuin pyydät uuden koodin.',
  },

  'auth.error.tooManyRequests': 'Koodeja on pyydetty liian monta. Yritä hetken kuluttua uudelleen.',
  'auth.error.suspended': 'Tämä tili on jäädytetty. destek@expyra.com',
  'auth.error.expiredChallenge': 'Kirjautumisyritys vanheni. Kirjoita osoitteesi uudelleen.',

  'account.title': 'Tilisi',
  'account.lede': 'Täällä voit muuttaa nimesi ja ensisijaisen kielesi.',

  'account.email.label': 'Sähköpostiosoitteesi',
  'account.email.note': 'Sähköpostiosoitetta ei voi vielä muuttaa.',

  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Grillattua kalaa kadulla',
  'wallpaper.kitchen.place': 'Kotikeittiö',
  'wallpaper.kitchen.label': 'Ruoanlaittoa tädin kanssa',
  'wallpaper.cappadocia.place': 'Kappadokia',
  'wallpaper.cappadocia.label': 'Kuumailmapallo',
  'wallpaper.pause': 'Keskeytä taustavideo',
  'wallpaper.play': 'Toista taustavideo',
  'account.avatar.label': 'Profiilikuva',
  'account.avatar.help': 'JPEG, PNG tai WebP · vähintään 800×600 pikseliä · enintään 10 Mt',
  'account.avatar.add': 'Lisää kuva',
  'account.avatar.change': 'Vaihda',
  'account.avatar.remove': 'Poista',
  'account.avatar.uploading': 'Ladataan…',
  'account.name.label': 'Näyttönimesi',
  'account.name.help': 'Tämän nimen muut näkevät. Voit jättää sen tyhjäksi.',
  'account.name.placeholder': 'esim. Aino K.',

  'account.language.label': 'Ensisijainen kielesi',
  'account.language.help':
    'Kieli, jolla kirjoitamme sinulle. Käyttöliittymän kieli tulee osoiteriviltä, ei tästä valinnasta.',
  'account.language.none': 'Ei asetettu',

  'account.save': 'Tallenna',
  'account.saving': 'Tallennetaan…',
  'account.saved': 'Muutokset tallennettu.',

  'account.error.name': {
    one: 'Näyttönimessä voi olla enintään {n} merkki.',
    other: 'Näyttönimessä voi olla enintään {n} merkkiä.',
  },
  'account.error.language': 'Emme vielä tue tätä kieltä. Valitse toinen luettelosta.',
  'account.error.signedOut': 'Istuntosi on päättynyt. Kirjaudu uudelleen sisään.',

  'account.menu.trigger': 'Tilivalikko: {ad}',
  'account.menu.title': 'Tili',
  'account.menu.signedInAs': 'Kirjautuneena: {eposta}',
  'account.menu.account': 'Tilisi',
  'account.menu.signOut': 'Kirjaudu ulos',
  'account.menu.fallbackLabel': 'Tilisi',

  'account.signIn': 'Kirjaudu sisään',
  'account.loading': 'Ladataan istuntoasi',

  'host.meta.title': 'Ryhdy järjestäjäksi',

  'host.invite.title': 'Julkaise oma elämyksesi',
  'host.invite.lede':
    'Näytä ihmisille jotain, minkä tunnet, vie heidät paikkoihin, joissa kuljet muutenkin. Sinä päätät hinnan, ryhmän koon, kalenterin ja peruutusehdot — me emme puutu siihen, mitä tarjoat.',
  'host.invite.noApproval':
    'Ei hyväksyntää, ei hakulomaketta. Heti kun sanot ryhdy järjestäjäksi, paneelisi avautuu.',
  'host.invite.cta': 'Ryhdy järjestäjäksi',
  'host.invite.pending': 'Avataan…',

  'host.signedOut.note':
    'Sinun täytyy kirjautua sisään ennen kuin voit ryhtyä järjestäjäksi. Emme kysy salasanaa — lähetämme kertakäyttöisen koodin osoitteeseesi.',
  'host.signedOut.cta': 'Kirjaudu ja ryhdy järjestäjäksi',

  'host.panel.title': 'Järjestäjän paneeli',
  'host.panel.lede':
    'Täällä hallinnoit elämyksiäsi. Sinä päätät hinnan, ryhmän, kalenterin ja peruutusehdot — me emme puutu siihen, mitä tarjoat.',
  'host.panel.status': 'Tilisi on avattu järjestäjänä.',
  'host.panel.new': 'Uusi elämys',

  'host.listings.heading': 'Omat ilmoitukset · {sayi}',
  'host.listings.headingPage': 'Omat ilmoitukset · tällä sivulla {sayi}',
  'host.listings.pager.label': 'Ilmoitussivut',
  'host.listings.pager.next': 'Lisää ilmoituksia',
  'host.listings.pager.first': 'Takaisin ensimmäiselle sivulle',
  'host.listings.edit': 'Muokkaa',
  'host.listings.view': 'Näytä ilmoitus',
  'host.listings.status.draft': 'Luonnos',
  'host.listings.status.published': 'Julkaistu',
  'host.listings.status.archived': 'Arkistoitu',

  'host.listings.ready': 'Valmis julkaistavaksi',
  'host.listings.missing': { one: '{n} kenttä puuttuu', other: '{n} kenttää puuttuu' },

  'host.listings.empty.heading': 'Omat ilmoitukset',
  'host.listings.empty.title': 'Sinulla ei ole vielä ilmoitusta',
  'host.listings.empty.body':
    'Avaa ensimmäinen luonnoksesi. Voit työstää sitä niin kauan kuin haluat ennen julkaisua — kukaan muu ei näe luonnosta.',
  'host.listings.empty.cta': 'Kirjoita ensimmäinen elämyksesi',

  'host.listings.errorHeading': 'Omat ilmoitukset',
  'host.listings.error':
    'Emme saaneet ladattua ilmoituksiasi juuri nyt. Mitään ei ole poistettu — lataa sivu hetken päästä uudelleen.',

  'host.steps.heading': 'Miten aloitan?',
  'host.steps.describe.title': 'Kuvaile elämyksesi',
  'host.steps.describe.body':
    'Otsikko, kuvaus, kesto ja ryhmän koko. Kirjoita niin monella kielellä kuin haluat — matkailijat lukevat sen omalla kielellään.',
  'host.steps.media.title': 'Lisää kuvasi',
  'host.steps.media.body':
    'Vähintään yksi kansikuva. Näytä, miltä elämys oikeasti näyttää; kuvapankkikuvat eivät toimi täällä.',
  'host.steps.pricing.title': 'Aseta kalenteri ja hinta',
  'host.steps.pricing.body':
    'Mitkä päivät, montako ihmistä, paljonko. Kirjoitat hinnan omassa valuutassasi, ja samassa valuutassa saat myös rahat.',
  'host.steps.publish.title': 'Julkaise',
  'host.steps.publish.body':
    'Mitään ei tarvitse odottaa. Heti kun julkaiset, ilmoituksesi näkyy haussa.',

  'host.contact.title': 'Kirjoita meille, jos jäät jumiin',
  'host.contact.body':
    'Huolehdimme ensimmäisistä järjestäjistä yksi kerrallaan. Jos jokin estää sinua kokoamasta ilmoitusta tai olet epävarma jostain päätöksestä, kirjoita — selvitetään se yhdessä.',
  'host.contact.cta': 'Kirjoita meille',
  'host.contact.howItWorks': 'Näin se toimii',

  'host.error.blocked': 'Tämä tili on jäädytetty, joten siitä ei voi tulla järjestäjää. destek@expyra.com',

  'host.experience.new.meta.title': 'Uusi elämys',
  'host.experience.new.title': 'Aloita uusi elämys',
  'host.experience.new.lede':
    'Kysymme ensin yhden asian: millä kielellä kirjoitat ilmoituksen. Kaiken muun täytät luonnoksessa, haluamassasi järjestyksessä.',
  'host.experience.new.language.label': 'Millä kielellä kirjoitat?',
  'host.experience.new.language.help':
    'Tätä ei voi muuttaa myöhemmin: ilmoituksesi osoite muodostuu siitä, ja matkailijat näkevät tämän tekstin, jos muilla kielillä ei ole kirjoitettu. Voit lisätä muita kieliä jälkeenpäin.',
  'host.experience.new.submit': 'Avaa luonnos',
  'host.experience.new.pending': 'Avataan…',

  'host.experience.new.next.heading': 'Mitä seuraavaksi?',
  'host.experience.new.next.text': 'Otsikko ja kuvaus — niin monella kielellä kuin haluat.',
  'host.experience.new.next.basics': 'Kuinka kauan se kestää ja montako ihmistä otat mukaan.',
  'host.experience.new.next.place': 'Kaupunki, luokka ja kielet, joita puhut sinä päivänä.',
  'host.experience.new.next.publish': 'Julkaise, kun olet valmis. Mitään ei tarvitse odottaa.',

  'host.experience.edit.meta.title': 'Muokkaa elämystä',
  'host.experience.edit.lede':
    'Jokainen osio tallentuu erikseen. Pysähdy missä haluat — luonnoksesi odottaa sinua.',
  'host.experience.untitled': 'Nimetön luonnos',
  'host.experience.back': '← Takaisin järjestäjän paneeliin',

  'host.experience.save': 'Tallenna',
  'host.experience.saving': 'Tallennetaan…',
  'host.experience.saved': 'Tallennettu.',

  'host.experience.section.text': 'Otsikko ja kuvaus',
  'host.experience.section.textHelp':
    'Tämän matkailijat lukevat ennen päätöstään. Kerro, mitä teette, missä tapaatte ja mikä sinut siihen yhdistää.',
  'host.experience.section.basics': 'Kesto ja kapasiteetti',
  'host.experience.section.basicsHelp':
    'Kuinka kauan yksi kerta kestää ja montako ihmistä otat mukaan kerralla. Kalenteri ja hinta tulevat myöhemmin.',
  'host.experience.section.place': 'Kaupunki',
  'host.experience.section.placeHelp':
    'Missä elämys tapahtuu. Aikavyöhyke tulee tästä — kertojen ajat näytetään sen mukaan.',
  'host.experience.section.category': 'Luokka',
  'host.experience.section.categoryHelp':
    'Matkailijat suodattavat haussa tämän mukaan. Valitse lähin; vain yhden voi valita.',
  'host.experience.section.languages': 'Puhutut kielet ja tunnisteet',
  'host.experience.section.languagesHelp':
    'Millä kielillä vedät elämyksen? Se on eri asia kuin kieli, jolla kirjoitit ilmoituksen.',
  'host.experience.section.status': 'Julkaisu',
  'host.experience.section.statusHelp':
    'Julkaisuun tarvittavat asiat on lueteltu alla. Hyväksyntävaihetta ei ole — jos mitään ei puutu, ilmoituksesi näkyy heti haussa.',

  'host.experience.translations.tabsLabel': 'Ilmoitustekstin kielet',
  'host.experience.translations.required': 'pakollinen',
  'host.experience.translations.optional': 'valinnainen',
  'host.experience.translations.add.label': 'Kirjoita toisella kielellä',
  'host.experience.translations.add.submit': 'Avaa',
  'host.experience.translations.machine':
    'Tämä teksti on käännetty automaattisesti. Muokkaa ja tallenna se, niin siitä tulee oma tekstisi.',

  'host.experience.title.label': 'Otsikko',
  'host.experience.title.placeholder': 'Katuruokakävely Kadıköyssä',
  'host.experience.title.help':
    'Lyhyt ja konkreettinen. Sen matkailijat näkevät luettelossa ensimmäisenä, ja ilmoituksesi osoite muodostuu siitä.',
  'host.experience.description.label': 'Kuvaus',
  'host.experience.description.placeholder':
    'Missä tapaatte, mitä teette, mitä syötte, mitä pukea päälle…',
  'host.experience.description.help':
    'Ei pakollinen julkaisuun, mutta tässä matkailijat tekevät päätöksensä. Käy päivä läpi järjestyksessä.',

  'host.experience.duration.label': 'Kesto (tunteina)',
  'host.experience.duration.help':
    'Yhden kerran kokonaispituus. Esimerkiksi 1,5 tuntia tai 3. Enintään seitsemän päivää (168 tuntia).',
  'host.experience.capacity.label': 'Kapasiteetti (henkilöä)',
  'host.experience.capacity.help':
    'Yhden kerran suurin henkilömäärä. Julkaisuun tarvitaan vähintään yksi.',

  'host.experience.city.label': 'Missä kaupungissa se on?',
  'host.experience.city.placeholder': 'Hae kaupunkia',
  'host.experience.place.saved': 'Kaupunki valittu · aikavyöhyke {saat}',
  'host.experience.place.empty': 'Kaupunkia ei ole vielä valittu.',
  'host.experience.place.locked':
    'Kun ilmoitus on julkaistu, kaupunki on lukittu: kertojen ajat ja varausten sijainti riippuvat siitä. Toista kaupunkia varten avaa uusi ilmoitus.',

  'host.experience.category.label': 'Luokka',
  'host.experience.category.none': 'Ei valittu',
  'host.experience.category.help': 'Mistä elämys pääasiassa kertoo.',

  'host.experience.spoken.label': 'Kielet, joita puhut elämyksen aikana',
  'host.experience.spoken.help':
    'Riippumatta kielestä, jolla kirjoitit ilmoituksen: rastita kielet, joilla oikeasti vedät elämyksen. Enintään kymmenen.',
  'host.experience.spoken.search.label': 'Hae kieltä',
  'host.experience.spoken.search.placeholder': 'Saksa, Deutsch, de…',
  'host.experience.spoken.search.results': { one: '{n} kieli näytetään', other: '{n} kieltä näytetään' },
  'host.experience.spoken.search.none': 'Sopivaa kieltä ei löytynyt. Rastitetut kielet säilyvät.',
  'host.experience.tags.label': 'Tunnisteet',
  'host.experience.tags.placeholder': 'katuruoka, kävely, pieni ryhmä',
  'host.experience.tags.help':
    'Erota pilkuilla. Enintään kymmenen. Ne auttavat ilmoitustasi osumaan hakuihin.',

  'host.experience.missing.heading': 'Mitä julkaisuun tarvitaan',
  'host.experience.ready': 'Kaikki valmista. Voit julkaista tämän ilmoituksen.',
  'host.experience.missing.translation': 'otsikko ilmoituksen kirjoituskielellä',
  'host.experience.missing.city': 'kaupunki',
  'host.experience.missing.category': 'luokka',
  'host.experience.missing.capacity': 'kapasiteetti',
  'host.experience.missing.duration': 'kesto',
  'host.experience.missing.cover': 'kansikuva',
  'host.experience.missing.price': 'hinta',
  'host.experience.missing.unknown': 'keskeneräinen kenttä',

  'host.experience.publish': 'Julkaise',
  'host.experience.republish': 'Julkaise uudelleen',
  'host.experience.publishing': 'Julkaistaan…',
  'host.experience.published': 'Ilmoituksesi on julkaistu.',
  'host.experience.unpublish': 'Peru julkaisu',
  'host.experience.unpublishing': 'Perutaan julkaisua…',
  'host.experience.unpublished': 'Ilmoitus on taas luonnos — piilotettu hausta.',
  'host.experience.archive': 'Arkistoi',
  'host.experience.archiving': 'Arkistoidaan…',
  'host.experience.archived': 'Ilmoitus arkistoitu.',

  'host.media.heading': 'Kuvat',
  'host.media.hint': 'JPEG, PNG tai WebP · vähintään 800×600 pikseliä · enintään 10 Mt · enintään 12 kuvaa',
  'host.media.add': 'Lisää kuvia',
  'host.media.drop': 'Pudota tiedostot tähän',
  'host.media.uploading': 'Ladataan…',
  'host.media.empty': 'Ei vielä kuvia. Ensimmäisestä lataamastasi kuvasta tulee kansikuva.',
  'host.media.cover': 'Kansi',
  'host.media.makeCover': 'Aseta kansikuvaksi',
  'host.media.delete': 'Poista',
  'host.media.moveEarlier': 'Siirrä aiemmaksi',
  'host.media.moveLater': 'Siirrä myöhemmäksi',
  'host.media.position': 'Kuva {n}',
  'host.media.error.rejected': 'Kuvaa ei hyväksytty.',
  'host.media.error.unsupported': 'Vain JPEG-, PNG- ja WebP-tiedostoja voi ladata.',
  'host.media.error.notUploaded': 'Lataus ei valmistunut. Yritä uudelleen.',
  'host.media.error.notAnImage': 'Tiedosto ei ole kuva.',
  'host.media.error.mismatch': 'Tiedoston sisältö ei vastaa sen tiedostopäätettä.',
  'host.media.error.tooSmall': 'Kuvien on oltava vähintään 800×600 pikseliä.',
  'host.media.error.tooLarge': 'Tiedostot voivat olla enintään 10 Mt.',
  'host.media.error.limit': 'Ilmoituksessa voi olla enintään 12 kuvaa.',

  'host.experience.status.publishedNote':
    'Ilmoituksesi näkyy haussa. Peru julkaisu palauttaaksesi sen luonnokseksi — muokkaa kuvia ja julkaise sitten uudelleen. Arkistointi piilottaa sen myös poistamatta.',
  'host.experience.status.privateNote': 'Ennen kuin julkaiset, kukaan muu kuin sinä ei näe tätä ilmoitusta.',

  'host.experience.error.notFound': 'Emme löytäneet tätä ilmoitusta. Avaa se uudelleen paneelista.',
  'host.experience.error.invalid': 'Osiota ei voitu tallentaa. Tarkista kentät ja yritä uudelleen.',
  'host.experience.error.language':
    'Tällä kielellä ei voi kirjoittaa ilmoituksia. Valitse toinen luettelosta.',
  'host.experience.error.title': 'Otsikko on pakollinen ja voi olla enintään 120 merkkiä.',
  'host.experience.error.description': 'Kuvaus voi olla enintään 4000 merkkiä.',
  'host.experience.error.duration': 'Kirjoita kesto tunteina: vähintään 0,5, enintään 168.',
  'host.experience.error.capacity': 'Kirjoita kapasiteetti henkilöinä: vähintään 1, enintään 500.',
  'host.experience.error.city': 'Valitse kaupunki luettelosta — pelkkä nimen kirjoittaminen ei riitä.',
  'host.experience.error.category': 'Valitse luokka luettelosta.',
  'host.experience.section.itinerary': 'Mitä teet',
  'host.experience.section.itineraryHelp':
    'Elämyksen vaiheet järjestyksessä. Jokainen vaihe on otsikko ja halutessasi lause tai kaksi. Luettelo kirjoitetaan ilmoituksen kielellä; yllä olevat kielivälilehdet pätevät myös tässä.',
  'host.experience.section.meeting': 'Tapaamispaikka',
  'host.experience.section.meetingHelp':
    'Mistä vieraat löytävät sinut? Osoite on kielestä riippumaton, ohjeet ovat valitulla kielellä. Lisää koordinaatit, niin vieraat voivat avata paikan kartalla.',
  'host.experience.section.details': 'Hyvä tietää',
  'host.experience.section.detailsHelp':
    'Ikäraja, aktiivisuustaso ja se, mitä vieraiden pitää tietää etukäteen. Tyhjiä kenttiä ei näytetä.',
  'host.experience.textLanguage.note': 'Tämän osion tekstien kieli: {dil}. Vaihda kieltä osion 01 välilehdiltä.',

  'host.experience.itinerary.stepTitle.label': 'Vaihe {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Tapaamme Hippodromilla',
  'host.experience.itinerary.stepBody.placeholder': 'Bysantin vaunukilpailujen rata; täällä seisovat obeliski ja Käärmepylväs.',
  'host.experience.itinerary.add': 'Lisää vaihe',
  'host.experience.itinerary.remove': 'Poista vaihe',
  'host.experience.itinerary.help': 'Tyhjiä rivejä ei tallenneta. Enintään 20 vaihetta.',

  'host.experience.meeting.address.label': 'Osoite',
  'host.experience.meeting.address.placeholder': 'Galatan tornin edessä, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Leveysaste',
  'host.experience.meeting.longitude.label': 'Pituusaste',
  'host.experience.meeting.coords.help': 'Molemmat tai ei kumpaakaan. Desimaaleina: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Ohjeet',
  'host.experience.meeting.instructions.placeholder': 'Tornin pohjoisportilla — etsi opas, jolla on keltainen sateenvarjo.',

  'host.experience.details.minimumAge.label': 'Vähimmäisikä',
  'host.experience.details.minimumAge.help': 'Tyhjä = ei ikärajaa. 1–99.',
  'host.experience.details.activityLevel.label': 'Aktiivisuustaso',
  'host.experience.details.activityLevel.none': 'Ei määritetty',
  'host.experience.details.whatToBring.label': 'Mitä ottaa mukaan',
  'host.experience.details.whatToBring.placeholder': 'Vettä, mukavat kengät, huivi (moskeijakäyntejä varten)',
  'host.experience.details.notIncluded.label': 'Ei sisälly hintaan',
  'host.experience.details.notIncluded.placeholder': 'Museoliput, lounas',
  'host.experience.details.accessibility.label': 'Saavutettavuus',
  'host.experience.details.accessibility.placeholder': 'Reitillä on portaita; ei sovellu pyörätuolille.',

  'host.experience.error.translationMissing': 'Kirjoita ensin otsikko tällä kielellä (osio 01) ja täytä sitten nämä kentät.',
  'host.experience.error.minimumAge': 'Vähimmäisiän on oltava kokonaisluku väliltä 1–99.',
  'host.experience.error.coordinates': 'Leveys- ja pituusaste kuuluvat yhteen; leveysaste ±90, pituusaste ±180.',
  'host.experience.error.itinerary': 'Jokaisella vaiheella on oltava otsikko; enintään 20 vaihetta.',

  'experience.activity.light': 'Kevyt',
  'experience.activity.moderate': 'Kohtalainen',
  'experience.activity.strenuous': 'Raskas',

  'host.profile.heading': 'Esittele itsesi',
  'host.profile.lede':
    'Näytetään nimesi alla ilmoituksen sivulla. Kuka olet ja miksi juuri sinun pitäisi kertoa tämä tarina — kaksi lausetta riittää.',
  'host.profile.headline.label': 'Otsikko',
  'host.profile.headline.placeholder': 'Paikallinen opas ja historioitsija İstanbulista',
  'host.profile.bio.label': 'Tietoa minusta',
  'host.profile.bio.placeholder': 'Olen kymmenen vuotta kuljettanut ihmisiä kaupungin sivukaduilla…',
  'host.profile.language.label': 'Tekstin kieli',
  'host.profile.error.invalid': 'Otsikko enintään 80 merkkiä, esittely enintään 2000.',
  'host.experience.error.spokenLanguages': 'Voit rastittaa enintään kymmenen kieltä.',
  'host.experience.error.tags': 'Tunnisteet eivät voi olla tyhjiä; enintään kymmenen, ja jokaisen on oltava lyhyt.',
  'host.experience.error.publishedConflict':
    'Tätä muutosta ei voi tehdä julkaistuun ilmoitukseen. Arkistoi se ensin ja muokkaa sitten.',
  'host.experience.error.publishBlocked': 'Ei julkaistu. Vielä puuttuu: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Ei julkaistu: ilmoitus ei ole vielä valmis. Katso yllä oleva luettelo.',

  'category.food-drink': 'Ruoka ja juoma',
  'category.art-culture': 'Taide ja kulttuuri',
  'category.history-heritage': 'Historia ja perintö',
  'category.nature-outdoors': 'Luonto ja ulkoilu',
  'category.water-sea': 'Vesi ja meri',
  'category.sports-adventure': 'Urheilu ja seikkailu',
  'category.crafts-workshops': 'Käsityö ja työpajat',
  'category.music-nightlife': 'Musiikki ja yöelämä',
  'category.wellness': 'Hyvinvointi',
  'category.photography': 'Valokuvaus',
  'category.tours-walks': 'Kierrokset ja kävelyt',
  'category.local-life': 'Paikallinen elämä',

  'host.experience.section.pricing': 'Hinta',
  'host.experience.section.pricingHelp':
    'Aseta hinta henkilöä kohden omassa valuutassasi. Saat rahat aina tässä valuutassa; jos matkailija valitsee toisen, vain näyttö muunnetaan.',

  'host.pricing.currency.label': 'Maksuvaluutta',
  'host.pricing.currency.help':
    'Valuutta, jossa rahat tulevat sinulle. Sitä ei voi muuttaa ilmoituksen julkaisun jälkeen — arkistoi se ensin.',
  'host.pricing.currency.locked': 'Valuutta on lukittu, koska ilmoitus on julkaistu.',
  'host.pricing.currency.placeholder': 'Valitse',

  'host.pricing.adult.label': 'Aikuinen (henkilöltä)',
  'host.pricing.adult.help': 'Pakollinen. Tämä on ”alkaen”-hinta, joka näkyy korteissa ja haussa.',
  'host.pricing.child.label': 'Lapsi (henkilöltä)',
  'host.pricing.child.help': 'Jätä tyhjäksi, jos et tarjoa lastenhintaa. Kirjoita 0, jos se on ilmainen.',
  'host.pricing.infant.label': 'Vauva (henkilöltä)',
  'host.pricing.infant.help': 'Jätä tyhjäksi, jos et tarjoa vauvahintaa. Kirjoita 0, jos se on ilmainen.',

  'host.pricing.saved': 'Hinta tallennettu.',
  'host.pricing.empty': 'Ei vielä hintaa. Ilmoitusta ilman hintaa ei voi julkaista.',

  'host.pricing.error.currency': 'Valitse kelvollinen valuutta.',
  'host.pricing.error.currencyLocked':
    'Julkaistun ilmoituksen valuuttaa ei voi muuttaa. Arkistoi se ensin.',
  'host.pricing.error.adult': 'Aikuisen hinta on pakollinen, ja sen on oltava kelvollinen summa.',
  'host.pricing.error.child': 'Lapsen hinnan on oltava kelvollinen summa.',
  'host.pricing.error.infant': 'Vauvan hinnan on oltava kelvollinen summa.',
  'host.pricing.error.range':
    'Summa on maksupalvelun hyväksymän alueen ulkopuolella — se on joko liian pieni tai liian suuri.',

  'host.experience.section.schedule': 'Aikataulu',
  'host.experience.section.scheduleHelp':
    'Minä päivinä ja mihin aikaan järjestät tämän? Ajat ovat kaupungin aikavyöhykkeellä — kirjoittamasi kellonaika pysyy samana myös kesäajan vaihtuessa.',

  'host.schedule.blocked':
    'Aikataulu vaatii ensin kaupungin, keston ja kapasiteetin. Viimeistele yllä olevat osiot.',
  'host.schedule.timeZone': 'Aikavyöhyke: {bolge}',
  'host.schedule.generatedThrough': 'Kalenterisi on valmiina {tarih} asti.',

  'host.schedule.rule.heading': 'Viikoittainen sääntö',
  'host.schedule.rule.days': 'Päivät',
  'host.schedule.rule.daysHelp': 'Voit valita useita; jokaisesta päivästä tulee oma sääntönsä.',
  'host.schedule.rule.time': 'Alkamisaika',
  'host.schedule.rule.timeHelp': 'Kaupungin paikallista aikaa.',
  'host.schedule.rule.start': 'Alkaen',
  'host.schedule.rule.startHelp': 'Jätä tyhjäksi aloittaaksesi tänään.',
  'host.schedule.rule.submit': 'Lisää sääntö',
  'host.schedule.rule.pending': 'Lisätään…',
  'host.schedule.rule.stop': 'Poista',
  'host.schedule.rule.stopping': 'Poistetaan…',
  'host.schedule.rule.empty': 'Ei vielä viikoittaisia sääntöjä.',
  'host.schedule.rule.stopped': 'lopetettu',

  'host.schedule.blackout.heading': 'Vapaapäivät',
  'host.schedule.blackout.start': 'Alkaen',
  'host.schedule.blackout.end': 'Asti',
  'host.schedule.blackout.endHelp': 'Jätä tyhjäksi sulkeaksesi yhden päivän. Viimeinen päivä lasketaan mukaan.',
  'host.schedule.blackout.submit': 'Sulje',
  'host.schedule.blackout.pending': 'Suljetaan…',
  'host.schedule.blackout.remove': 'Poista',
  'host.schedule.blackout.removing': 'Poistetaan…',
  'host.schedule.blackout.empty': 'Ei vapaapäiviä.',

  'host.schedule.slots.heading': 'Tulevat kerrat',
  'host.schedule.slots.empty': 'Tällä aikavälillä ei ole kertoja.',
  'host.schedule.slots.remaining': {
    one: '{n} paikka jäljellä',
    other: '{n} paikkaa jäljellä',
  },
  'host.schedule.slots.closed': 'Suljettu',
  'host.schedule.slots.closedByBlackout': 'Vapaapäivä',
  'host.schedule.slots.close': 'Sulje',
  'host.schedule.slots.closing': 'Suljetaan…',
  'host.schedule.slots.open': 'Avaa',
  'host.schedule.slots.opening': 'Avataan…',
  'host.schedule.slots.more': 'ja {n} muuta',

  'host.schedule.day.monday': 'Maanantai',
  'host.schedule.day.tuesday': 'Tiistai',
  'host.schedule.day.wednesday': 'Keskiviikko',
  'host.schedule.day.thursday': 'Torstai',
  'host.schedule.day.friday': 'Perjantai',
  'host.schedule.day.saturday': 'Lauantai',
  'host.schedule.day.sunday': 'Sunnuntai',

  'host.schedule.ruleSaved': 'Sääntö lisätty ja kerrat luotu.',
  'host.schedule.ruleStopped': 'Sääntö lopetettu.',
  'host.schedule.slotOpened': 'Kerta avattu.',
  'host.schedule.slotClosed': 'Kerta suljettu.',
  'host.schedule.blackoutSaved': 'Päivät suljettu.',
  'host.schedule.blackoutRemoved': 'Vapaapäivät poistettu.',

  'host.schedule.error.noDay': 'Valitse vähintään yksi päivä.',
  'host.schedule.error.time': 'Kirjoita aika muodossa TT:MM.',
  'host.schedule.error.date': 'Anna kelvollinen päivämäärä.',
  'host.schedule.error.range': 'Päättymispäivä ei voi olla ennen alkamispäivää.',
  'host.schedule.error.notSchedulable':
    'Aikataulu vaatii ensin kaupungin, keston ja kapasiteetin.',
  'host.schedule.error.duplicateRule': 'Sille päivälle ja kellonajalle on jo sääntö.',
  'host.schedule.error.ruleLimit': 'Tähän elämykseen ei voi lisätä enempää viikoittaisia sääntöjä.',
  'host.schedule.error.dstGap':
    'Tätä kellonaikaa ei ole sinä päivänä kesäaikaan siirtymisen vuoksi. Kokeile tuntia myöhemmin.',
  'host.schedule.error.past': 'Mennyttä kertaa ei voi muuttaa.',
  'host.schedule.error.slotExists': 'Sille ajalle on jo kerta.',
  'host.schedule.error.blackedOut': 'Päivä on merkitty vapaapäiväksi. Poista ensin aikaväli.',
  'host.schedule.error.generated':
    'Viikoittaisen säännön luomaa kertaa ei voi poistaa; voit sulkea sen.',
  'host.schedule.error.hasBookings': 'Kertaa, jolla on varauksia, ei voi muuttaa.',
  'host.schedule.error.blackoutLimit': 'Vapaapäiviä ei voi lisätä enempää.',
  'host.schedule.error.horizon': 'Kalenteria ei voi avata niin pitkälle eteenpäin.',
  'host.schedule.error.generic': 'Se ei onnistunut juuri nyt.',
} as const satisfies Dictionary<'fi'>

/**
 * Tekstiä verrataan myös lähteeseen: jos paikkamerkki putoaa pois tai sen nimi
 * muuttuu, käännös katkeaa ja kertoo, mistä avaimesta on kyse.
 * `export` on tietoinen — käyttämätön tyyppi lasketaan lintissä kuolleeksi koodiksi.
 */
export type FiPlaceholders = Assert<PlaceholdersMatchSource<typeof fi>>
