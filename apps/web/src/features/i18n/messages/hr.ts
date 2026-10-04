import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Hrvatsko sučelje.
 *
 * `satisfies Dictionary<'hr'>` nameće dvije stvari: svaki ključ iz izvora
 * POSTOJI i ovdje, a višeznačni ključevi nose CLDR oblike hrvatskoga. Taj je
 * skup `one` + `few` + `other` — TRI kategorije i NEMA `many`. To se razlikuje
 * od češkoga (`one`, `few`, `many`, `other`): u hrvatskome `many` ne postoji,
 * pa ga nemoj dodavati čak ni kopirajući iz `cs.ts` (kompilacija bi puknula,
 * `locale.ts` za `hr` zna samo tri oblika).
 *
 * Kako se oblici biraju (cijeli brojevi): `one` za 1, 21, 31… (ne 11);
 * `few` za 2–4, 22–24… (ne 12–14); `other` za sve ostalo (0, 5–20, 25…).
 * Decimalni brojevi ("1,5 sata") uvijek idu u `other`.
 *
 * `as const` čuva literale kako bi provjera rezerviranih mjesta na dnu
 * datoteke mogla čitati unutrašnjost teksta.
 *
 * **Ton (VISION §6):** proizvod govori pojedincu, ne agenciji. Obraćamo se
 * neformalno, s "ti" (odaberi, pričekaj, vidi). Rečenice su izravne, kratke i
 * obećavaju nešto — bez marketinških pridjeva, bez "molimo", bez uskličnika.
 * Rodno obilježene tvorbe ("spreman/a", "prijavljen/a") izbjegavamo.
 *
 * Imena gradova i jezika ubacuju se kao gotove vrijednosti (nominativ), pa
 * rečenice su složene tako da ne traže padeže ("Iskustva: {sehir}", a ne
 * "Iskustva u {sehir}").
 *
 * Dvije stvari se namjerno NE prevode: naziv marke (Expyra) i adresa podrške
 * (`destek@expyra.com` — to je jedini postojeći sandučić).
 */
export const hr = {
  'meta.description': 'Pronađi lokalna iskustva i rezerviraj ih.',

  'nav.primaryLabel': 'Glavni izbornik',
  'nav.footerLabel': 'Izbornik podnožja',
  'nav.explore': 'Istraži',
  'nav.myExperiences': 'Moja iskustva',
  'nav.becomeHost': 'Postani domaćin',
  'nav.howItWorks': 'Kako funkcionira',

  'language.trigger': 'Jezik: {dil}. Promijeni.',
  'language.dialogLabel': 'Odabir jezika',
  'language.search.label': 'Pretraži jezike',
  'language.search.placeholder': 'Pretraži jezike',
  'language.group.ui': 'Jezici sučelja',
  'language.group.content': 'Ostali jezici',
  'language.group.contentHint':
    'Sučelje još nije prevedeno na ove jezike — iskustva se ipak mogu objaviti na njima.',
  'language.empty': 'Nijedan jezik ne odgovara toj pretrazi.',

  'theme.toLight': 'Prebaci na svijetlu temu',
  'theme.toDark': 'Prebaci na tamnu temu',

  'currency.trigger': 'Valuta: {para}. Promijeni.',
  'currency.dialogLabel': 'Odabir valute',
  'currency.search.label': 'Pretraži valute',
  'currency.search.placeholder': 'EUR, dolar, lira…',
  'currency.none': 'Valuta domaćina',
  'currency.empty': 'Nijedna valuta ne odgovara ovoj pretrazi.',

  // Naglasak je u turskome na "novom načinu otkrivanja", ovdje na onome što
  // mještani čuvaju. Redovi nisu doslovan prijevod — raspored je isti, rečenica
  // je svakog jezika vlastita.
  'home.hero.title': 'Novi način da pronađeš',
  'home.hero.titleAccent': 'iskustva koja mještani čuvaju za sebe',
  'home.hero.lede':
    'Od ljudi koji tamo stvarno žive. Male grupe, pravi ljudi, nekoliko sati koje nećeš zaboraviti.',
  'home.showcase.heading': 'Iskustva na Expyri',
  'home.showcase.more': 'Pogledaj sva iskustva',
  'home.showcase.unavailable':
    'Trenutačno nismo mogli prikazati iskustva. Pokušaj ponovno za malo — oglasi su i dalje tu.',
  'home.showcase.empty.title': 'Još ništa nije objavljeno',
  'home.showcase.empty.body':
    'Možeš biti prvi. Pokaži ljudima nešto što znaš, u maloj grupi.',
  'home.showcase.empty.cta': 'Postani domaćin',

  'search.destination.label': 'Kamo?',
  'search.destination.placeholder': 'Potraži grad',
  'search.date.label': 'Kada?',
  'search.date.placeholder': 'Odaberi datum',
  'search.date.dialogLabel': 'Odaberi datum',
  'search.date.day': 'Dan',
  'search.date.month': 'Mjesec',
  'search.date.year': 'Godina',
  'search.date.done': 'Gotovo',
  'search.date.clear': 'Očisti',
  'search.date.stepUp': 'Prethodno: {alan}',
  'search.date.stepDown': 'Sljedeće: {alan}',
  'search.submit': 'Traži',

  'search.city.listLabel': 'Prijedlozi gradova',
  'search.city.countriesHeading': 'Države',
  'search.city.citiesHeading': 'Gradovi',
  'search.city.allCountries': 'Sve države',
  'search.city.tooShort': 'Počni upisivati naziv grada ili odaberi državu s popisa.',
  'search.city.loading': 'Tražim…',
  'search.city.error': 'Nismo mogli učitati popis gradova. Pokušaj ponovno za trenutak.',
  'search.city.empty': 'Nijedan grad ne odgovara toj pretrazi.',
  'search.city.truncated': 'Ima još gradova — nastavi upisivati da suziš izbor.',
  'search.city.clear': 'Ukloni odabrani grad',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': {
    one: 'Pronađen {n} grad',
    few: 'Pronađena {n} grada',
    other: 'Pronađeno {n} gradova',
  },
  'search.city.countryCities': {
    one: '{n} grad',
    few: '{n} grada',
    other: '{n} gradova',
  },

  'search.guests.label': 'Gosti',
  'search.guests.dialogLabel': 'Broj gostiju',
  'search.guests.done': 'Gotovo',
  'search.guests.adults': 'Odrasli',
  'search.guests.adults.hint': '13 godina i više',
  'search.guests.adults.decrease': 'Jedna odrasla osoba manje',
  'search.guests.adults.increase': 'Jedna odrasla osoba više',
  'search.guests.children': 'Djeca',
  'search.guests.children.hint': 'Od 0 do 12 godina',
  'search.guests.children.decrease': 'Jedno dijete manje',
  'search.guests.children.increase': 'Jedno dijete više',
  'search.guests.summary.adults': {
    one: '{n} odrasla osoba',
    few: '{n} odrasle osobe',
    other: '{n} odraslih osoba',
  },
  'search.guests.summary.children': {
    one: '{n} dijete',
    few: '{n} djece',
    other: '{n} djece',
  },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': {
    one: '{n} sat',
    few: '{n} sata',
    other: '{n} sati',
  },
  'experience.duration.minutes': {
    one: '{n} minuta',
    few: '{n} minute',
    other: '{n} minuta',
  },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Trajanje nije navedeno',
  'experience.meta': {
    one: '{sure} · do {n} osobe',
    few: '{sure} · do {n} osobe',
    other: '{sure} · do {n} osoba',
  },
  'experience.card.perPerson': 'po gostu',
  'experience.card.language': 'Jezik oglasa: {dil}',

  'explore.heading.all': 'Sva iskustva',
  'explore.heading.city': 'Iskustva: {sehir}',
  'explore.heading.query': 'Rezultati za „{arama}“',
  'explore.summary': {
    one: '{n} iskustvo',
    few: '{n} iskustva',
    other: '{n} iskustava',
  },
  'explore.summary.page': {
    one: '{n} iskustvo na ovoj stranici',
    few: '{n} iskustva na ovoj stranici',
    other: '{n} iskustava na ovoj stranici',
  },
  // Popis filtera stoji u akuzativu, a muški neživi i neutrum imaju isti oblik
  // kao nominativ, pa nazivi filtera ostaju u osnovnom obliku.
  'explore.filtersNotice':
    'Rezultate sužavamo samo prema gradu — za sada ne uzimamo u obzir: {filtreler}.',
  'explore.filter.date': 'odabrani datum',
  'explore.filter.guests': 'broj gostiju',

  'explore.pager.label': 'Stranice rezultata',
  'explore.pager.next': 'Sljedeća stranica',
  'explore.pager.first': 'Natrag na prvu stranicu',

  'explore.pageLink.title': 'Nismo mogli pročitati vezu na tu stranicu',
  'explore.pageLink.body':
    'Oznaka stranice u adresi izgleda oštećeno. Pokreni pretragu ponovno — rezultati su i dalje tu.',

  'explore.empty.title': 'Ovdje još nema iskustava',
  'explore.empty.body':
    'Probaj neki drugi grad s popisa. Novi gradovi i nova iskustva dodaju se stalno.',
  'explore.empty.cta': 'Pogledaj sva iskustva',
  'explore.empty.hostCta': 'Budi prvi domaćin ovdje',

  'explore.cityMissing.title': 'Ne poznajemo taj grad',
  'explore.cityMissing.body':
    'Grada iz adrese nema u našem registru — veza je možda zastarjela. Odaberi grad s popisa u polju iznad.',
  'explore.cityMissing.cta': 'Pogledaj sva iskustva',

  'experience.detail.meta.fallback': 'Lokalno iskustvo: {sehir}.',
  'experience.detail.text.fallback': 'Jezik opisa: {dil}',
  'experience.detail.duration.label': 'Trajanje',
  'experience.detail.capacity.label': 'Veličina grupe',
  'experience.detail.capacity.value': {
    one: 'Do {n} osobe',
    few: 'Do {n} osobe',
    other: 'Do {n} osoba',
  },
  'experience.detail.about': 'O ovom iskustvu',
  'experience.detail.noDescription': 'Domaćin još nije napisao opis.',
  'experience.detail.spoken.heading': 'Jezici na kojima se iskustvo održava',
  'experience.detail.spoken.help':
    'Domaćin vodi iskustvo na ovim jezicima. Jezik na kojem je oglas napisan zasebna je stvar.',
  'experience.detail.spoken.none': 'Domaćin još nije naveo jezike kojima govori.',
  'experience.detail.tags.heading': 'Oznake',
  'experience.detail.gallery.heading': 'Galerija',
  'experience.detail.host.heading': 'Domaćin',
  'experience.detail.itinerary.heading': 'Što ćeš raditi',
  'experience.detail.meeting.heading': 'Gdje se nalazimo',
  'experience.detail.meeting.map': 'Otvori na karti',
  'experience.detail.meeting.mapEmbed': 'Karta mjesta okupljanja',
  'experience.detail.meeting.pin': 'Mjesto okupljanja',
  'experience.detail.highlights.host': 'Domaćin: {ad}',
  'experience.detail.highlights.duration': 'Otprilike {sure}',
  'experience.detail.highlights.spoken': 'Jezici: {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Do {n} osobe',
    few: 'Do {n} osobe',
    other: 'Do {n} osoba',
  },
  'experience.detail.highlights.bring': 'Što ponijeti',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': {
    one: '{n} recenzija',
    few: '{n} recenzije',
    other: '{n} recenzija',
  },
  'experience.detail.reviews.stars': {
    one: '{n} zvjezdica',
    few: '{n} zvjezdice',
    other: '{n} zvjezdica',
  },
  'experience.detail.reviews.demoNote':
    'Primjeri recenzija — prave ocjene pojavit će se ovdje kad rezervacije zažive.',
  'experience.detail.reviews.showAll': 'Prikaži sve recenzije',
  'experience.detail.reviews.about': 'Saznaj kako rade ocjene i recenzije.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Rumunjska',
  'experience.detail.reviews.demo.1.when': 'prije 1 dan',
  'experience.detail.reviews.demo.1.body':
    'Naš vodič bio je stručan i topao. Razgledavanje grada s njim bilo je potpuno drukčije.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milano, Italija',
  'experience.detail.reviews.demo.2.when': 'prije 3 dana',
  'experience.detail.reviews.demo.2.body':
    'Mala grupa, puno razgovora. Planirane su bile i stanke za fotografiranje — oduševilo nas je.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Češka',
  'experience.detail.reviews.demo.3.when': 'prije 1 tjedan',
  'experience.detail.reviews.demo.3.body':
    'Malo brzog tempa, ali sve u svemu divno. Zadnja stanica bila nam je najdraža.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berlin, Njemačka',
  'experience.detail.reviews.demo.4.when': 'prije 2 tjedna',
  'experience.detail.reviews.demo.4.body':
    'Osobnije nego što smo očekivali. Domaćin nas je uputio i na lokalne okuse.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'İstanbul, Turska',
  'experience.detail.reviews.demo.5.when': 'prije 3 tjedna',
  'experience.detail.reviews.demo.5.body':
    'Besprijekorna organizacija. Mjesto okupljanja bilo je jasno, a vrijeme točno.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Španjolska',
  'experience.detail.reviews.demo.6.when': 'prije 1 mjesec',
  'experience.detail.reviews.demo.6.body': 'Naš vodič bio je divan 💕💕',
  'experience.detail.know.heading': 'Dobro je znati',
  'experience.detail.know.minimumAge': 'Dobna granica',
  'experience.detail.know.minimumAgeValue': 'Od {n} godina',
  'experience.detail.know.activityLevel': 'Razina aktivnosti',
  'experience.detail.know.whatToBring': 'Što ponijeti',
  'experience.detail.know.notIncluded': 'Nije uključeno',
  'experience.detail.know.accessibility': 'Pristupačnost',
  'experience.detail.nearby.heading': 'Još iskustava: {sehir}',
  'experience.detail.host.anonymous': 'Expyra domaćin',
  'experience.detail.booking.title': 'Termini i cijena',
  'experience.detail.booking.noSlots':
    'Trenutačno nema slobodnih termina. Pojavit će se ovdje čim domaćin ažurira kalendar.',
  'experience.detail.booking.perPerson': 'po osobi',
  'experience.detail.booking.pickDate': 'Odaberi datum',
  'experience.detail.booking.timeZone': 'Vremena su prikazana u zoni: {bolge}.',
  'experience.detail.booking.spotsLeft': {
    one: 'Preostalo je {n} mjesto',
    few: 'Preostala su {n} mjesta',
    other: 'Preostalo je {n} mjesta',
  },
  'experience.detail.booking.adults': 'Odrasli',
  'experience.detail.booking.children': 'Djeca',
  'experience.detail.booking.infants': 'Bebe',
  'experience.detail.booking.currency': 'Valuta',
  'experience.detail.booking.currencyNone': 'Valuta domaćina',
  'experience.detail.booking.update': 'Izračunaj cijenu',
  'experience.detail.booking.continue': 'Nastavi na plaćanje',
  'experience.detail.booking.pickDateFirst': 'Prvo odaberi datum',
  'experience.detail.booking.pickDateHint': 'Odaberi datum iznad da nastaviš.',
  'experience.detail.booking.total': 'Ukupno',
  'experience.detail.booking.displayTotal': 'Otprilike {tutar}',
  'experience.detail.booking.chargedIn':
    'Naplata se vrši u valuti {paraBirimi}. Ako tvoja kartica koristi drugu valutu, banka primjenjuje vlastiti tečaj.',
  'experience.detail.booking.quoteFailed':
    'Nismo mogli izračunati cijenu za taj odabir. Termin možda nema dovoljno mjesta ili je zatvoren.',
  'experience.detail.cityLink': 'Sva iskustva: {sehir}',
  'experience.detail.back': 'Natrag na istraživanje',

  'checkout.title': 'Potvrdi i plati',
  'checkout.back': 'Natrag na iskustvo',
  'checkout.payment.heading': 'Način plaćanja',
  'checkout.payment.bank': 'Internetsko bankarstvo',
  'checkout.payment.bankSelect': 'Odaberi svoju banku',
  'checkout.payment.card': 'Kreditna ili debitna kartica',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Potvrdom i plaćanjem prihvaćaš uvjete korištenja, pravila otkazivanja i obavijest o privatnosti. Stvarno plaćanje još nije povezano — ovaj korak prikazuje samo sučelje.',
  'checkout.payment.submit': 'Potvrdi i plati',
  'checkout.payment.submitting': 'Obrađujem…',
  'checkout.payment.demoNote': 'Demo: kartica se ne tereti i rezervacija se ne stvara.',
  'checkout.payment.unavailable':
    'Plaćanje još nije dostupno: ovaj će se gumb omogućiti kad povežemo pružatelja plaćanja. Kartica se neće teretiti i rezervacija se ne stvara.',
  'checkout.success.title': 'Gotovo — demo potvrda',
  'checkout.success.body':
    'Kad pružatelj plaćanja i API za rezervacije krenu u rad, ovdje će se pojaviti prava ulaznica. Za sada je tok završen.',
  'checkout.success.back': 'Idi na moja iskustva',
  'checkout.summary.nonRefundable': 'Ova rezervacija nije povratna.',
  'checkout.summary.date': 'Datum',
  'checkout.summary.guests': 'Gosti',
  'checkout.summary.change': 'Promijeni',
  'checkout.summary.priceDetails': 'Pojedinosti o cijeni',
  'checkout.summary.total': 'Ukupno {paraBirimi}',

  'howItWorks.lede': 'Tri koraka i gotovo.',
  'howItWorks.back': 'Natrag',
  'howItWorks.step.discover.title': 'Istraži',
  'howItWorks.step.discover.body':
    'Pregledaj lokalna iskustva u svom gradu. Male grupe, pravi domaćini.',
  'howItWorks.step.book.title': 'Rezerviraj',
  'howItWorks.step.book.body':
    'Odaberi datum i broj osoba, pogledaj cijenu. Rezervacije stižu uskoro.',
  'howItWorks.step.join.title': 'Dođi',
  'howItWorks.step.join.body': 'Domaćin te dočeka i iskustvo počinje.',
  'howItWorks.backToExplore': 'Natrag na istraživanje',

  'myExperiences.lede': 'Ovdje su tvoje ulaznice.',
  'myExperiences.upcoming': 'Nadolazeća · {sayi}',
  'myExperiences.past': 'Prošla · {sayi}',
  'myExperiences.downloadPdf': 'Preuzmi PDF',
  'myExperiences.wallet': 'Dodaj u Apple Wallet',
  'myExperiences.wallet.soon': 'Uskoro',
  'myExperiences.rate': 'Ocijeni',
  'myExperiences.rate.soon': 'Otvara se nakon završetka iskustva',
  'myExperiences.empty.title': 'Još nema ulaznica',
  'myExperiences.empty.body': 'Kad rezerviraš iskustvo, tvoja će se ulaznica pojaviti ovdje.',
  'myExperiences.empty.cta': 'Istraži iskustva',

  'ticket.demoBadge': 'Demo ulaznica',
  'ticket.demoNote':
    'Primjer ulaznice: QR kod još nije potpisan i ne može se provjeriti na ulazu.',
  'ticket.view.title': 'Tvoja ulaznica',
  'ticket.view.lede': 'Pokaži QR kod na ulazu ili ga dodaj u novčanik.',
  'ticket.view.back': 'Natrag na moja iskustva',
  'ticket.wallet.view': 'Pogledaj ulaznicu',
  'ticket.wallet.apple': 'Dodaj u Apple Wallet',
  'ticket.wallet.google': 'Dodaj u Google Wallet',
  'ticket.wallet.adding': 'Pripremam…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet nije konfiguriran u ovom okruženju. Dodaj EXPYRA_APPLE_PASS_* (vidi docs/WALLET.md); ulaznicu i dalje možeš pogledati ovdje.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet nije konfiguriran u ovom okruženju. Dodaj EXPYRA_GOOGLE_WALLET_* (vidi docs/WALLET.md); ulaznicu i dalje možeš pogledati ovdje.',
  'ticket.guests': 'Gosti',
  'ticket.amount': 'Ukupno',
  'ticket.status': 'Status',
  'ticket.status.valid': 'Vrijedi',
  'ticket.status.used': 'Iskorištena',
  'ticket.timeZoneNote': 'lokalno vrijeme, {sehir}',

  'ticket.pdf.kicker': 'Ulaznica za iskustvo',
  'ticket.pdf.dateTime': 'Datum i vrijeme',
  'ticket.pdf.docTitle': 'Expyra ulaznica — {baslik}',
  'ticket.pdf.code': 'Šifra ulaznice {kod}',
  'ticket.pdf.notice.valid': 'Domaćin skenira ovaj kod na ulazu. Vrijedi samo jednom.',
  'ticket.pdf.notice.used': 'Ova je ulaznica iskorištena na ulazu.',

  'ticket.error.signedOut': 'Prijavi se da vidiš ovu ulaznicu.',
  'ticket.error.notFound': 'Nema ulaznice s tom šifrom.',

  'auth.meta.title': 'Prijava',
  'auth.title': 'Prijavi se ili otvori račun',
  'auth.back': 'Natrag',

  'auth.email.lede': 'Upiši svoju adresu i poslat ćemo ti jednokratni kod. Bez lozinke.',
  'auth.email.label': 'Tvoja adresa e-pošte',
  'auth.email.help': 'Kod šaljemo na ovu adresu.',
  'auth.email.placeholder': 'ti@primjer.com',
  'auth.email.error.invalid': 'Ta adresa ne izgleda ispravno. Primjer: ti@primjer.com',

  'auth.code.lede': 'Poslali smo 6-znamenkasti kod na:',
  'auth.code.label': 'Kod iz tvoje e-pošte',
  'auth.code.hint':
    'Kod vrijedi 10 minuta. Ako ne možeš pronaći poruku, provjeri mapu neželjene pošte.',
  'auth.code.resend': 'Pošalji novi kod',
  'auth.code.changeEmail': 'Koristi drugu adresu',

  'auth.common.continue': 'Nastavi',
  'auth.common.working': 'Šaljem…',

  'auth.otp.error.invalid': 'Kod se ne podudara. Provjeri 6 znamenki u najnovijoj poruci.',
  'auth.otp.error.locked':
    'Previše pokušaja. Zatvorili smo ovaj kod radi sigurnosti računa — zatraži novi.',
  'auth.otp.error.resendTooSoon': {
    one: 'Pričekaj još {n} sekundu prije nego zatražiš novi kod.',
    few: 'Pričekaj još {n} sekunde prije nego zatražiš novi kod.',
    other: 'Pričekaj još {n} sekundi prije nego zatražiš novi kod.',
  },

  'auth.error.tooManyRequests': 'Zatraženo je previše kodova. Pokušaj ponovno za malo.',
  'auth.error.suspended': 'Ovaj je račun suspendiran. destek@expyra.com',
  'auth.error.expiredChallenge': 'Ovaj pokušaj prijave istekao je. Ponovno upiši svoju adresu.',

  'account.title': 'Tvoj račun',
  'account.lede': 'Ovdje možeš promijeniti ime i željeni jezik.',

  'account.email.label': 'Tvoja adresa e-pošte',
  'account.email.note': 'Adrese e-pošte za sada se ne mogu mijenjati.',

  // --- Pozadina (zajednički raspored — vidljiva na SVAKOJ stranici) ----------
  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Riba s roštilja na ulici',
  'wallpaper.kitchen.place': 'Domaća kuhinja',
  'wallpaper.kitchen.label': 'Kuhanje s tetom',
  'wallpaper.cappadocia.place': 'Kapadokija',
  'wallpaper.cappadocia.label': 'Let balonom',
  'wallpaper.pause': 'Zaustavi video u pozadini',
  'wallpaper.play': 'Pokreni video u pozadini',
  'account.avatar.label': 'Profilna fotografija',
  'account.avatar.help': 'JPEG, PNG ili WebP · najmanje 800×600 piksela · do 10 MB',
  'account.avatar.add': 'Dodaj fotografiju',
  'account.avatar.change': 'Promijeni',
  'account.avatar.remove': 'Ukloni',
  'account.avatar.uploading': 'Učitavam…',
  'account.name.label': 'Tvoje prikazno ime',
  'account.name.help': 'To je ime koje vide drugi ljudi. Možeš ga ostaviti praznim.',
  'account.name.placeholder': 'npr. Ana M.',

  'account.language.label': 'Tvoj željeni jezik',
  'account.language.help':
    'Jezik na kojem ti pišemo. Jezik sučelja određuje adresna traka, a ne ovaj odabir.',
  'account.language.none': 'Nije postavljeno',

  'account.save': 'Spremi',
  'account.saving': 'Spremam…',
  'account.saved': 'Promjene su spremljene.',

  'account.error.name': {
    one: 'Prikazno ime može imati najviše {n} znak.',
    few: 'Prikazno ime može imati najviše {n} znaka.',
    other: 'Prikazno ime može imati najviše {n} znakova.',
  },
  'account.error.language': 'Taj jezik još ne podržavamo. Odaberi drugi s popisa.',
  'account.error.signedOut': 'Tvoja je sesija završila. Prijavi se ponovno.',

  'account.menu.trigger': 'Izbornik računa: {ad}',
  'account.menu.title': 'Račun',
  'account.menu.signedInAs': 'Prijavljeni račun: {eposta}',
  'account.menu.account': 'Tvoj račun',
  'account.menu.signOut': 'Odjava',
  'account.menu.fallbackLabel': 'Tvoj račun',

  'account.signIn': 'Prijava',
  'account.loading': 'Učitavam tvoju sesiju',

  'host.meta.title': 'Postani domaćin',

  'host.invite.title': 'Objavi vlastito iskustvo',
  'host.invite.lede':
    'Pokaži ljudima nešto što znaš, odvedi ih negdje kroz što ionako hodaš. Sam određuješ cijenu, veličinu grupe, kalendar i pravila otkazivanja — mi se ne miješamo u ono što nudiš.',
  'host.invite.noApproval':
    'Bez postupka odobravanja, bez obrasca za prijavu. Čim kažeš da postaješ domaćin, otvara ti se panel.',
  'host.invite.cta': 'Postani domaćin',
  'host.invite.pending': 'Otvaram…',

  'host.signedOut.note':
    'Moraš se prijaviti prije nego postaneš domaćin. Ne tražimo lozinku — na tvoju adresu šaljemo jednokratni kod.',
  'host.signedOut.cta': 'Prijavi se da postaneš domaćin',

  'host.panel.title': 'Panel domaćina',
  'host.panel.lede':
    'Ovdje vodiš svoja iskustva. Sam određuješ cijenu, grupu, kalendar i pravila otkazivanja — mi se ne miješamo u ono što nudiš.',
  'host.panel.status': 'Tvoj je račun otvoren kao domaćinski.',
  'host.panel.new': 'Novo iskustvo',

  'host.listings.heading': 'Moji oglasi · {sayi}',
  'host.listings.headingPage': 'Moji oglasi · {sayi} na ovoj stranici',
  'host.listings.pager.label': 'Stranice oglasa',
  'host.listings.pager.next': 'Više oglasa',
  'host.listings.pager.first': 'Natrag na prvu stranicu',
  'host.listings.edit': 'Uredi',
  'host.listings.view': 'Pogledaj oglas',
  'host.listings.status.draft': 'Skica',
  'host.listings.status.published': 'Objavljeno',
  'host.listings.status.archived': 'Arhivirano',

  'host.listings.ready': 'Spremno za objavu',
  'host.listings.missing': {
    one: 'Nedostaje {n} polje',
    few: 'Nedostaju {n} polja',
    other: 'Nedostaje {n} polja',
  },

  'host.listings.empty.heading': 'Moji oglasi',
  'host.listings.empty.title': 'Još nemaš nijedan oglas',
  'host.listings.empty.body':
    'Otvori svoju prvu skicu. Na njoj možeš raditi koliko god želiš prije objave — skicu nitko drugi ne vidi.',
  'host.listings.empty.cta': 'Napiši svoje prvo iskustvo',

  'host.listings.errorHeading': 'Moji oglasi',
  'host.listings.error':
    'Trenutačno nismo mogli učitati tvoje oglase. Ništa nije obrisano — osvježi stranicu za trenutak.',

  'host.steps.heading': 'Kako započeti?',
  'host.steps.describe.title': 'Opiši svoje iskustvo',
  'host.steps.describe.body':
    'Naslov, opis, trajanje i veličina grupe. Napiši ga na koliko god jezika želiš — putnici ga čitaju na svome.',
  'host.steps.media.title': 'Dodaj fotografije',
  'host.steps.media.body':
    'Najmanje jedna naslovna fotografija. Pokaži kako iskustvo stvarno izgleda; stock fotografije ovdje ne pale.',
  'host.steps.pricing.title': 'Postavi kalendar i cijenu',
  'host.steps.pricing.body':
    'Koji dani, koliko ljudi, koliko košta. Cijenu pišeš u svojoj valuti, i u toj valuti dobivaš isplatu.',
  'host.steps.publish.title': 'Objavi',
  'host.steps.publish.body':
    'Ne čeka se ništa. Čim objaviš, tvoj se oglas pojavljuje u pretrazi.',

  'host.contact.title': 'Javi nam se ako zapneš',
  'host.contact.body':
    'Prve domaćine pratimo jednog po jednog. Ako te nešto koči dok slažeš oglas ili nisi siguran u neku odluku, javi se — proći ćemo kroz to zajedno.',
  'host.contact.cta': 'Piši nam',
  'host.contact.howItWorks': 'Kako funkcionira',

  'host.error.blocked':
    'Ovaj je račun suspendiran pa ne može postati domaćin. destek@expyra.com',

  // --- Čarobnjak za iskustvo -------------------------------------------------

  'host.experience.new.meta.title': 'Novo iskustvo',
  'host.experience.new.title': 'Započni novo iskustvo',
  'host.experience.new.lede':
    'Prvo pitamo samo jedno: na kojem jeziku ćeš pisati oglas. Sve ostalo popunjavaš unutar skice, kojim god redom želiš.',
  'host.experience.new.language.label': 'Na kojem jeziku ćeš pisati?',
  'host.experience.new.language.help':
    'Ovo se poslije ne može promijeniti: adresa tvog oglasa izvodi se iz njega, a putnici vide taj tekst kad nije napisan nijedan drugi jezik. Druge jezike možeš dodati poslije.',
  'host.experience.new.submit': 'Otvori skicu',
  'host.experience.new.pending': 'Otvaram…',

  'host.experience.new.next.heading': 'Što slijedi?',
  'host.experience.new.next.text': 'Naslov i opis — na koliko god jezika želiš.',
  'host.experience.new.next.basics': 'Koliko traje i koliko ljudi primaš.',
  'host.experience.new.next.place': 'Grad, kategorija i jezici kojima govoriš na dan iskustva.',
  'host.experience.new.next.publish': 'Objavi kad budeš želio. Ne čeka se ništa.',

  'host.experience.edit.meta.title': 'Uredi iskustvo',
  'host.experience.edit.lede':
    'Svaki odjeljak sprema se zasebno. Stani gdje god želiš — tvoja skica čeka.',
  'host.experience.untitled': 'Skica bez naslova',
  'host.experience.back': '← Natrag na panel domaćina',

  'host.experience.save': 'Spremi',
  'host.experience.saving': 'Spremam…',
  'host.experience.saved': 'Spremljeno.',

  'host.experience.section.text': 'Naslov i opis',
  'host.experience.section.textHelp':
    'Ovo putnici čitaju prije nego odluče. Reci što ćete raditi, gdje se nalazite i što te veže uz to.',
  'host.experience.section.basics': 'Trajanje i kapacitet',
  'host.experience.section.basicsHelp':
    'Koliko traje jedan termin i koliko ljudi primaš odjednom. Kalendar i cijena dolaze poslije.',
  'host.experience.section.place': 'Grad',
  'host.experience.section.placeHelp':
    'Gdje se iskustvo odvija. Vremenska zona izvodi se iz toga — vremena termina prikazuju se u njoj.',
  'host.experience.section.category': 'Kategorija',
  'host.experience.section.categoryHelp':
    'Putnici po njoj filtriraju pretragu. Odaberi najbližu; može se odabrati samo jedna.',
  'host.experience.section.languages': 'Jezici i oznake',
  'host.experience.section.languagesHelp':
    'Na kojim jezicima vodiš iskustvo? To je nešto drugo od jezika na kojem si napisao oglas.',
  'host.experience.section.status': 'Objava',
  'host.experience.section.statusHelp':
    'Što je potrebno za objavu navedeno je ispod. Nema koraka odobravanja — kad ništa ne nedostaje, tvoj se oglas odmah pojavljuje u pretrazi.',

  'host.experience.translations.tabsLabel': 'Jezici teksta oglasa',
  'host.experience.translations.required': 'obavezno',
  'host.experience.translations.optional': 'neobavezno',
  'host.experience.translations.add.label': 'Napiši na drugom jeziku',
  'host.experience.translations.add.submit': 'Otvori',
  'host.experience.translations.machine':
    'Ovaj je tekst preveden automatski. Uredi ga i spremi i postaje tvoj vlastiti tekst.',

  'host.experience.title.label': 'Naslov',
  'host.experience.title.placeholder': 'Šetnja uličnom hranom po Kadıköyu',
  'host.experience.title.help':
    'Kratko i konkretno. To je prvo što putnici vide na popisu, i iz toga se izvodi adresa tvog oglasa.',
  'host.experience.description.label': 'Opis',
  'host.experience.description.placeholder':
    'Gdje se nalazite, što radite, što jedete, što obući…',
  'host.experience.description.help':
    'Nije obavezan za objavu, ali ovdje putnici donose odluku. Provedi ih kroz dan redom.',

  'host.experience.duration.label': 'Trajanje (sati)',
  'host.experience.duration.help':
    'Ukupno trajanje jednog termina. Na primjer 1,5 sata ili 3. Najviše sedam dana (168 sati).',
  'host.experience.capacity.label': 'Kapacitet (osobe)',
  'host.experience.capacity.help':
    'Koliko je najviše osoba u jednom terminu. Za objavu je potrebna barem jedna.',

  'host.experience.city.label': 'U kojem je gradu?',
  'host.experience.city.placeholder': 'Potraži grad',
  'host.experience.place.saved': 'Grad odabran · vremenska zona {saat}',
  'host.experience.place.empty': 'Grad još nije odabran.',
  'host.experience.place.locked':
    'Kad se oglas objavi, njegov je grad zaključan: vremena termina i mjesta rezervacija ovise o njemu. Za drugi grad otvori novi oglas.',

  'host.experience.category.label': 'Kategorija',
  'host.experience.category.none': 'Nije odabrano',
  'host.experience.category.help': 'Čemu je iskustvo uglavnom posvećeno.',

  'host.experience.spoken.label': 'Jezici kojima govoriš tijekom iskustva',
  'host.experience.spoken.help':
    'Neovisno o jeziku na kojem si napisao oglas: označi jezike na kojima ga stvarno vodiš. Najviše deset.',
  'host.experience.spoken.search.label': 'Pretraži jezike',
  'host.experience.spoken.search.placeholder': 'njemački, Deutsch, de…',
  'host.experience.spoken.search.results': {
    one: '{n} jezik na popisu',
    few: '{n} jezika na popisu',
    other: '{n} jezika na popisu',
  },
  'host.experience.spoken.search.none': 'Nema odgovarajućeg jezika. Označeni jezici se zadržavaju.',
  'host.experience.tags.label': 'Oznake',
  'host.experience.tags.placeholder': 'ulična hrana, šetnja, mala grupa',
  'host.experience.tags.help':
    'Odvoji zarezima. Najviše deset. Pomažu da se tvoj oglas podudari s pretragama.',

  'host.experience.missing.heading': 'Što je potrebno za objavu',
  'host.experience.ready': 'Sve je spremno. Možeš objaviti ovaj oglas.',
  'host.experience.missing.translation': 'naslov na jeziku na kojem je oglas napisan',
  'host.experience.missing.city': 'grad',
  'host.experience.missing.category': 'kategorija',
  'host.experience.missing.capacity': 'kapacitet',
  'host.experience.missing.duration': 'trajanje',
  'host.experience.missing.cover': 'naslovna fotografija',
  'host.experience.missing.price': 'cijena',
  'host.experience.missing.unknown': 'nedovršeno polje',

  'host.experience.publish': 'Objavi',
  'host.experience.republish': 'Objavi ponovno',
  'host.experience.publishing': 'Objavljujem…',
  'host.experience.published': 'Tvoj je oglas objavljen.',
  'host.experience.unpublish': 'Povuci objavu',
  'host.experience.unpublishing': 'Povlačim objavu…',
  'host.experience.unpublished': 'Oglas je vraćen u skicu — skriven je iz pretrage.',
  'host.experience.archive': 'Arhiviraj',
  'host.experience.archiving': 'Arhiviram…',
  'host.experience.archived': 'Oglas je arhiviran.',

  // --- Mediji (Blok 6) -------------------------------------------------------
  'host.media.heading': 'Fotografije',
  'host.media.hint':
    'JPEG, PNG ili WebP · najmanje 800×600 piksela · do 10 MB · najviše 12 fotografija',
  'host.media.add': 'Dodaj fotografije',
  'host.media.drop': 'Ispusti datoteke ovdje',
  'host.media.uploading': 'Učitavam…',
  'host.media.empty': 'Još nema fotografija. Prva koju učitaš postaje naslovna.',
  'host.media.cover': 'Naslovna',
  'host.media.makeCover': 'Postavi kao naslovnu',
  'host.media.delete': 'Obriši',
  'host.media.moveEarlier': 'Pomakni naprijed',
  'host.media.moveLater': 'Pomakni natrag',
  'host.media.position': 'Fotografija {n}',
  'host.media.error.rejected': 'Ta fotografija nije prihvaćena.',
  'host.media.error.unsupported': 'Mogu se učitati samo JPEG, PNG i WebP.',
  'host.media.error.notUploaded': 'Učitavanje nije dovršeno. Pokušaj ponovno.',
  'host.media.error.notAnImage': 'Ta datoteka nije slika.',
  'host.media.error.mismatch': 'Sadržaj datoteke ne odgovara njezinoj ekstenziji.',
  'host.media.error.tooSmall': 'Fotografije moraju imati najmanje 800×600 piksela.',
  'host.media.error.tooLarge': 'Datoteke mogu imati najviše 10 MB.',
  'host.media.error.limit': 'Oglas može imati najviše 12 fotografija.',

  'host.experience.status.publishedNote':
    'Tvoj se oglas pojavljuje u pretrazi. Povuci objavu da ga vratiš u skicu — urediš fotografije, pa objaviš ponovno. Arhiviranje ga također skriva, bez brisanja.',
  'host.experience.status.privateNote': 'Dok ga ne objaviš, nitko osim tebe ne vidi ovaj oglas.',

  'host.experience.error.notFound': 'Nismo pronašli ovaj oglas. Otvori ga ponovno iz panela.',
  'host.experience.error.invalid':
    'Ovaj odjeljak nije mogao biti spremljen. Provjeri polja i pokušaj ponovno.',
  'host.experience.error.language':
    'Oglasi se ne mogu pisati na tom jeziku. Odaberi drugi s popisa.',
  'host.experience.error.title': 'Naslov je obavezan i može imati najviše 120 znakova.',
  'host.experience.error.description': 'Opis može imati najviše 4000 znakova.',
  'host.experience.error.duration': 'Trajanje upiši u satima: najmanje 0,5, najviše 168.',
  'host.experience.error.capacity': 'Kapacitet upiši u osobama: najmanje 1, najviše 500.',
  'host.experience.error.city': 'Odaberi grad s popisa — samo upisivanje naziva nije dovoljno.',
  'host.experience.error.category': 'Odaberi kategoriju s popisa.',
  'host.experience.section.itinerary': 'Što ćeš raditi',
  'host.experience.section.itineraryHelp':
    'Koraci iskustva, redom. Svaki je korak naslov i po želji rečenica ili dvije. Popis je napisan na jeziku oglasa; jezične kartice iznad vrijede i ovdje.',
  'host.experience.section.meeting': 'Mjesto okupljanja',
  'host.experience.section.meetingHelp':
    'Gdje će te gosti pronaći? Adresa ne ovisi o jeziku, upute su na odabranom jeziku. Dodaj koordinate i gosti će je moći otvoriti na karti.',
  'host.experience.section.details': 'Dobro je znati',
  'host.experience.section.detailsHelp':
    'Dobna granica, razina aktivnosti i ono što gosti trebaju znati unaprijed. Polja koja ostaviš praznima ne prikazuju se.',
  'host.experience.textLanguage.note':
    'Tekstovi u ovom odjeljku su na jeziku: {dil}. Jezik promijeni karticama u odjeljku 01.',

  'host.experience.itinerary.stepTitle.label': 'Korak {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Nalazimo se na Hipodromu',
  'host.experience.itinerary.stepBody.placeholder':
    'Bizantska staza za utrke kola; ovdje stoje Obelisk i Zmijski stup.',
  'host.experience.itinerary.add': 'Dodaj korak',
  'host.experience.itinerary.remove': 'Ukloni korak',
  'host.experience.itinerary.help': 'Prazni redovi se ne spremaju. Najviše 20 koraka.',

  'host.experience.meeting.address.label': 'Adresa',
  'host.experience.meeting.address.placeholder': 'Ispred tornja Galata, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Zemljopisna širina',
  'host.experience.meeting.longitude.label': 'Zemljopisna dužina',
  'host.experience.meeting.coords.help': 'Obje ili nijedna. Decimalno: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Upute',
  'host.experience.meeting.instructions.placeholder':
    'Sjeverna vrata tornja, potraži vodiča sa žutim kišobranom.',

  'host.experience.details.minimumAge.label': 'Najmanja dob',
  'host.experience.details.minimumAge.help': 'Prazno = bez ograničenja. 1–99.',
  'host.experience.details.activityLevel.label': 'Razina aktivnosti',
  'host.experience.details.activityLevel.none': 'Nije navedeno',
  'host.experience.details.whatToBring.label': 'Što ponijeti',
  'host.experience.details.whatToBring.placeholder':
    'Vodu, udobne cipele, šal (za posjete džamijama)',
  'host.experience.details.notIncluded.label': 'Nije uključeno',
  'host.experience.details.notIncluded.placeholder': 'Ulaznice za muzeje, ručak',
  'host.experience.details.accessibility.label': 'Pristupačnost',
  'host.experience.details.accessibility.placeholder':
    'Na ruti ima stuba; nije prikladno za invalidska kolica.',

  'host.experience.error.translationMissing':
    'Prvo napiši naslov na ovom jeziku (odjeljak 01), zatim popuni ova polja.',
  'host.experience.error.minimumAge': 'Najmanja dob mora biti cijeli broj između 1 i 99.',
  'host.experience.error.coordinates':
    'Zemljopisna širina i dužina idu zajedno; širina ±90, dužina ±180.',
  'host.experience.error.itinerary': 'Svaki korak treba naslov; najviše 20 koraka.',

  'experience.activity.light': 'Lagana',
  'experience.activity.moderate': 'Umjerena',
  'experience.activity.strenuous': 'Naporna',

  'host.profile.heading': 'Predstavi se',
  'host.profile.lede':
    'Prikazuje se ispod tvog imena na stranici oglasa. Tko si i zašto baš ti trebaš ispričati ovu priču — dvije rečenice su dovoljne.',
  'host.profile.headline.label': 'Naslov',
  'host.profile.headline.placeholder': 'Lokalni vodič i povjesničar u Istanbulu',
  'host.profile.bio.label': 'O meni',
  'host.profile.bio.placeholder':
    'Deset godina ljude vodim sporednim ulicama grada…',
  'host.profile.language.label': 'Jezik teksta',
  'host.profile.error.invalid': 'Naslov do 80 znakova, biografija do 2000.',
  'host.experience.error.spokenLanguages': 'Možeš označiti najviše deset jezika.',
  'host.experience.error.tags': 'Oznake ne smiju biti prazne; najviše deset, i svaka kratka.',
  'host.experience.error.publishedConflict':
    'Ta se promjena ne može napraviti na objavljenom oglasu. Prvo ga arhiviraj, zatim uredi.',
  'host.experience.error.publishBlocked': 'Nije objavljeno. Još nedostaje: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Nije objavljeno: oglas još nije potpun. Provjeri popis iznad.',

  // --- Kategorije ------------------------------------------------------------
  'category.food-drink': 'Hrana i piće',
  'category.art-culture': 'Umjetnost i kultura',
  'category.history-heritage': 'Povijest i baština',
  'category.nature-outdoors': 'Priroda i aktivnosti na otvorenom',
  'category.water-sea': 'Voda i more',
  'category.sports-adventure': 'Sport i avantura',
  'category.crafts-workshops': 'Obrti i radionice',
  'category.music-nightlife': 'Glazba i noćni život',
  'category.wellness': 'Wellness',
  'category.photography': 'Fotografija',
  'category.tours-walks': 'Obilasci i šetnje',
  'category.local-life': 'Lokalni život',
  // --- Cijena (PLAN Blok 7) ---
  'host.experience.section.pricing': 'Cijena',
  'host.experience.section.pricingHelp':
    'Postavi cijenu po osobi u svojoj valuti. Isplata je uvijek u toj valuti; ako putnik odabere drugu, pretvara se samo prikaz.',

  'host.pricing.currency.label': 'Valuta isplate',
  'host.pricing.currency.help':
    'Valuta u kojoj novac stiže tebi. Ne može se promijeniti nakon objave oglasa — prvo ga arhiviraj.',
  'host.pricing.currency.locked': 'Valuta je zaključana jer je oglas objavljen.',
  'host.pricing.currency.placeholder': 'Odaberi',

  'host.pricing.adult.label': 'Odrasla osoba (po osobi)',
  'host.pricing.adult.help':
    'Obavezno. To je cijena „od“ prikazana na karticama i u pretrazi.',
  'host.pricing.child.label': 'Dijete (po osobi)',
  'host.pricing.child.help':
    'Ostavi prazno ako ne nudiš dječju cijenu. Upiši 0 ako je besplatno.',
  'host.pricing.infant.label': 'Beba (po osobi)',
  'host.pricing.infant.help':
    'Ostavi prazno ako ne nudiš cijenu za bebe. Upiši 0 ako je besplatno.',

  'host.pricing.saved': 'Cijena je spremljena.',
  'host.pricing.empty': 'Još nema cijene. Oglas bez cijene ne može se objaviti.',

  'host.pricing.error.currency': 'Odaberi ispravnu valutu.',
  'host.pricing.error.currencyLocked':
    'Valuta objavljenog oglasa ne može se promijeniti. Prvo ga arhiviraj.',
  'host.pricing.error.adult': 'Cijena za odrasle je obavezna i mora biti ispravan iznos.',
  'host.pricing.error.child': 'Cijena za djecu mora biti ispravan iznos.',
  'host.pricing.error.infant': 'Cijena za bebe mora biti ispravan iznos.',
  'host.pricing.error.range':
    'Taj iznos je izvan raspona koji pružatelj plaćanja prihvaća — ili je premalen ili prevelik.',

  // --- Raspored (PLAN Blok 7) ---
  'host.experience.section.schedule': 'Raspored',
  'host.experience.section.scheduleHelp':
    'Kojim danima i u koje vrijeme ovo održavaš? Vremena su u vremenskoj zoni grada — sat koji upišeš ostaje isti i pri promjeni ljetnog računanja vremena.',

  'host.schedule.blocked':
    'Za raspored su prvo potrebni grad, trajanje i kapacitet. Dovrši odjeljke iznad.',
  'host.schedule.timeZone': 'Vremenska zona: {bolge}',
  'host.schedule.generatedThrough': 'Tvoj je kalendar spreman do {tarih}.',

  // Tjedno pravilo
  'host.schedule.rule.heading': 'Tjedno pravilo',
  'host.schedule.rule.days': 'Dani',
  'host.schedule.rule.daysHelp': 'Možeš odabrati više dana; svaki dan postaje zasebno pravilo.',
  'host.schedule.rule.time': 'Vrijeme početka',
  'host.schedule.rule.timeHelp': 'U lokalnom vremenu grada.',
  'host.schedule.rule.start': 'Počevši od',
  'host.schedule.rule.startHelp': 'Ostavi prazno da počneš danas.',
  'host.schedule.rule.submit': 'Dodaj pravilo',
  'host.schedule.rule.pending': 'Dodajem…',
  'host.schedule.rule.stop': 'Ukloni',
  'host.schedule.rule.stopping': 'Uklanjam…',
  'host.schedule.rule.empty': 'Još nema tjednih pravila.',
  'host.schedule.rule.stopped': 'zaustavljeno',

  // Neradni dani
  'host.schedule.blackout.heading': 'Neradni dani',
  'host.schedule.blackout.start': 'Od',
  'host.schedule.blackout.end': 'Do',
  'host.schedule.blackout.endHelp':
    'Ostavi prazno da zatvoriš samo jedan dan. Završni dan je uključen.',
  'host.schedule.blackout.submit': 'Zatvori',
  'host.schedule.blackout.pending': 'Zatvaram…',
  'host.schedule.blackout.remove': 'Ukloni',
  'host.schedule.blackout.removing': 'Uklanjam…',
  'host.schedule.blackout.empty': 'Nema neradnih dana.',

  // Termini
  'host.schedule.slots.heading': 'Nadolazeći termini',
  'host.schedule.slots.empty': 'Nema termina u ovom razdoblju.',
  'host.schedule.slots.remaining': {
    one: 'Preostalo je {n} mjesto',
    few: 'Preostala su {n} mjesta',
    other: 'Preostalo je {n} mjesta',
  },
  'host.schedule.slots.closed': 'Zatvoreno',
  'host.schedule.slots.closedByBlackout': 'Neradni dan',
  'host.schedule.slots.close': 'Zatvori',
  'host.schedule.slots.closing': 'Zatvaram…',
  'host.schedule.slots.open': 'Otvori',
  'host.schedule.slots.opening': 'Otvaram…',
  'host.schedule.slots.more': 'i još {n}',

  // Dani
  'host.schedule.day.monday': 'Ponedjeljak',
  'host.schedule.day.tuesday': 'Utorak',
  'host.schedule.day.wednesday': 'Srijeda',
  'host.schedule.day.thursday': 'Četvrtak',
  'host.schedule.day.friday': 'Petak',
  'host.schedule.day.saturday': 'Subota',
  'host.schedule.day.sunday': 'Nedjelja',

  // Potvrde
  'host.schedule.ruleSaved': 'Pravilo je dodano i termini su stvoreni.',
  'host.schedule.ruleStopped': 'Pravilo je zaustavljeno.',
  'host.schedule.slotOpened': 'Termin je otvoren.',
  'host.schedule.slotClosed': 'Termin je zatvoren.',
  'host.schedule.blackoutSaved': 'Dani su zatvoreni.',
  'host.schedule.blackoutRemoved': 'Neradni dani su uklonjeni.',

  // Pogreške — svaka se mapira na strojno čitljiv kod s poslužitelja
  'host.schedule.error.noDay': 'Odaberi barem jedan dan.',
  'host.schedule.error.time': 'Upiši vrijeme kao HH:MM.',
  'host.schedule.error.date': 'Upiši ispravan datum.',
  'host.schedule.error.range': 'Završni datum ne može biti prije početnog.',
  'host.schedule.error.notSchedulable':
    'Za raspored su prvo potrebni grad, trajanje i kapacitet.',
  'host.schedule.error.duplicateRule': 'Za taj dan i vrijeme već postoji pravilo.',
  'host.schedule.error.ruleLimit': 'Ovo iskustvo ne može primiti više tjednih pravila.',
  'host.schedule.error.dstGap':
    'To vrijeme ne postoji tog dana zbog prelaska na ljetno računanje vremena. Pokušaj sat kasnije.',
  'host.schedule.error.past': 'Prošli termin ne može se mijenjati.',
  'host.schedule.error.slotExists': 'U to vrijeme već postoji termin.',
  'host.schedule.error.blackedOut':
    'Taj je datum označen kao neradni dan. Prvo ukloni raspon.',
  'host.schedule.error.generated':
    'Termin stvoren tjednim pravilom ne može se obrisati; možeš ga zatvoriti.',
  'host.schedule.error.hasBookings': 'Termin s rezervacijama ne može se mijenjati.',
  'host.schedule.error.blackoutLimit': 'Više se neradnih dana ne može dodati.',
  'host.schedule.error.horizon': 'Kalendar se ne može otvoriti toliko unaprijed.',
  'host.schedule.error.generic': 'To sada nije uspjelo.',
} as const satisfies Dictionary<'hr'>

/**
 * Unutrašnjost teksta također se uspoređuje s izvorom: ako se rezervirano mjesto
 * izgubi ili mu se promijeni ime, kompilacija puca i navodi o kojem je ključu riječ.
 * `export` je namjeran — neiskorišten tip u lintu se računa kao mrtav kod.
 */
export type HrPlaceholders = Assert<PlaceholdersMatchSource<typeof hr>>
