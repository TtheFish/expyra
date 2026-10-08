import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Dansk brugerflade.
 *
 * `satisfies Dictionary<'da'>` håndhæver to ting: hver nøgle fra kilden FINDES
 * også her, og flertalsnøglerne bærer dansk CLDR-form: `one` + `other`. Dansk
 * vælger `one` for 1 (og for decimaltal under 2, fx "1,5 time"), ellers `other`.
 * `as const` bevarer literalerne, så pladsholder-tjekket nederst kan læse
 * teksten.
 *
 * **Tone (VISION §6):** produktet taler til den enkelte, ikke til et bureau. Vi
 * skriver med "du", direkte og kort — ingen salgsadjektiver, intet "venligst",
 * ingen udråbstegn.
 *
 * To ting oversættes bevidst ikke: brandnavnet (Expyra) og supportadressen
 * (`destek@expyra.com` — det er den eneste postkasse, der findes).
 */
export const da = {
  'meta.description': 'Find lokale oplevelser og book dem.',

  'nav.primaryLabel': 'Hovedmenu',
  'nav.footerLabel': 'Sidefodsmenu',
  'nav.explore': 'Udforsk',
  'nav.myExperiences': 'Mine oplevelser',
  'nav.becomeHost': 'Bliv vært',
  'nav.howItWorks': 'Sådan virker det',

  'language.trigger': 'Sprog: {dil}. Skift.',
  'language.dialogLabel': 'Valg af sprog',
  'language.search.label': 'Søg efter sprog',
  'language.search.placeholder': 'Søg efter sprog',
  'language.group.ui': 'Sprog i brugerfladen',
  'language.group.content': 'Andre sprog',
  'language.group.contentHint':
    'Brugerfladen er ikke oversat endnu — oplevelser kan stadig udgives på disse sprog.',
  'language.empty': 'Intet sprog matcher søgningen.',

  'theme.toLight': 'Skift til lyst tema',
  'theme.toDark': 'Skift til mørkt tema',

  'currency.trigger': 'Valuta: {para}. Skift.',
  'currency.dialogLabel': 'Valg af valuta',
  'currency.search.label': 'Søg efter valuta',
  'currency.search.placeholder': 'EUR, dollar, kroner…',
  'currency.none': 'Værtens valuta',
  'currency.empty': 'Ingen valuta matcher søgningen.',

  'home.hero.title': 'En ny måde at finde',
  'home.hero.titleAccent': 'de oplevelser, de lokale holder for sig selv',
  'home.hero.lede':
    'Fra folk, der faktisk bor der. Små grupper, rigtige mennesker, et par timer, du ikke glemmer.',
  'home.showcase.heading': 'Oplevelser på Expyra',
  'home.showcase.more': 'Se alle oplevelser',
  'home.showcase.unavailable':
    'Vi kunne ikke vise oplevelserne lige nu. Prøv igen om lidt — opslagene er der stadig.',
  'home.showcase.empty.title': 'Intet er udgivet endnu',
  'home.showcase.empty.body':
    'Du kan blive den første. Vis folk noget, du kender til, i en lille gruppe.',
  'home.showcase.empty.cta': 'Bliv vært',

  'search.destination.label': 'Hvor skal du hen?',
  'search.destination.placeholder': 'Søg efter en by',
  'search.date.label': 'Hvornår?',
  'search.date.placeholder': 'Vælg en dato',
  'search.date.dialogLabel': 'Vælg en dato',
  'search.date.day': 'Dag',
  'search.date.month': 'Måned',
  'search.date.year': 'År',
  'search.date.done': 'Færdig',
  'search.date.clear': 'Ryd',
  'search.date.stepUp': 'Forrige {alan}',
  'search.date.stepDown': 'Næste {alan}',
  'search.submit': 'Søg',

  'search.city.listLabel': 'Forslag til byer',
  'search.city.countriesHeading': 'Lande',
  'search.city.citiesHeading': 'Byer',
  'search.city.allCountries': 'Alle lande',
  'search.city.tooShort': 'Begynd at skrive et bynavn, eller vælg et land på listen.',
  'search.city.loading': 'Søger…',
  'search.city.error': 'Vi kunne ikke hente listen over byer. Prøv igen om et øjeblik.',
  'search.city.empty': 'Ingen by matcher søgningen.',
  'search.city.truncated': 'Der er flere byer — skriv videre for at indsnævre søgningen.',
  'search.city.clear': 'Fjern den valgte by',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} by fundet', other: '{n} byer fundet' },
  'search.city.countryCities': { one: '{n} by', other: '{n} byer' },

  'search.guests.label': 'Gæster',
  'search.guests.dialogLabel': 'Antal gæster',
  'search.guests.done': 'Færdig',
  'search.guests.adults': 'Voksne',
  'search.guests.adults.hint': '13 år og derover',
  'search.guests.adults.decrease': 'En voksen færre',
  'search.guests.adults.increase': 'En voksen mere',
  'search.guests.children': 'Børn',
  'search.guests.children.hint': '0–12 år',
  'search.guests.children.decrease': 'Et barn færre',
  'search.guests.children.increase': 'Et barn mere',
  'search.guests.summary.adults': { one: '{n} voksen', other: '{n} voksne' },
  'search.guests.summary.children': { one: '{n} barn', other: '{n} børn' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} time', other: '{n} timer' },
  'experience.duration.minutes': { one: '{n} minut', other: '{n} minutter' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Varighed ikke angivet',
  'experience.meta': {
    one: '{sure} · op til {n} person',
    other: '{sure} · op til {n} personer',
  },
  'experience.card.perPerson': 'pr. gæst',
  'experience.card.language': 'Opslaget er skrevet på {dil}',

  'explore.heading.all': 'Alle oplevelser',
  'explore.heading.city': 'Oplevelser i {sehir}',
  'explore.heading.query': 'Resultater for “{arama}”',
  'explore.summary': { one: '{n} oplevelse', other: '{n} oplevelser' },
  'explore.summary.page': {
    one: '{n} oplevelse på denne side',
    other: '{n} oplevelser på denne side',
  },
  'explore.filtersNotice':
    'Vi indsnævrer kun resultaterne efter by — vi tager endnu ikke højde for {filtreler}.',
  'explore.filter.date': 'den valgte dato',
  'explore.filter.guests': 'antallet af gæster',

  'explore.pager.label': 'Resultatsider',
  'explore.pager.next': 'Næste side',
  'explore.pager.first': 'Tilbage til første side',

  'explore.pageLink.title': 'Vi kunne ikke læse sidelinket',
  'explore.pageLink.body':
    'Sidemarkøren i adressen ser ud til at være i stykker. Start søgningen forfra — resultaterne er der stadig.',

  'explore.empty.title': 'Ingen oplevelser her endnu',
  'explore.empty.body':
    'Prøv en anden by fra listen. Der kommer hele tiden nye byer og nye oplevelser til.',
  'explore.empty.cta': 'Se alle oplevelser',
  'explore.empty.hostCta': 'Bliv den første vært her',

  'explore.cityMissing.title': 'Den by kender vi ikke',
  'explore.cityMissing.body':
    'Byen i adressen findes ikke i vores register — linket kan være forældet. Vælg en by fra listen i feltet ovenfor.',
  'explore.cityMissing.cta': 'Se alle oplevelser',

  'experience.detail.meta.fallback': 'En lokal oplevelse i {sehir}.',
  'experience.detail.text.fallback': 'Beskrivelsen er på {dil}',
  'experience.detail.duration.label': 'Varighed',
  'experience.detail.capacity.label': 'Gruppestørrelse',
  'experience.detail.capacity.value': { one: 'Op til {n} person', other: 'Op til {n} personer' },
  'experience.detail.about': 'Om oplevelsen',
  'experience.detail.noDescription': 'Værten har ikke skrevet en beskrivelse endnu.',
  'experience.detail.spoken.heading': 'Sprog under oplevelsen',
  'experience.detail.spoken.help':
    'Værten afholder oplevelsen på disse sprog. Det sprog, opslaget er skrevet på, er noget andet.',
  'experience.detail.spoken.none': 'Værten har ikke angivet sine sprog endnu.',
  'experience.detail.tags.heading': 'Tags',
  'experience.detail.gallery.heading': 'Galleri',
  'experience.detail.host.heading': 'Din vært',
  'experience.detail.itinerary.heading': 'Det skal du lave',
  'experience.detail.meeting.heading': 'Her mødes vi',
  'experience.detail.meeting.map': 'Åbn på kort',
  'experience.detail.meeting.mapEmbed': 'Kort over mødestedet',
  'experience.detail.meeting.pin': 'Mødested',
  'experience.detail.highlights.host': 'Vært: {ad}',
  'experience.detail.highlights.duration': 'Cirka {sure}',
  'experience.detail.highlights.spoken': 'Foregår på {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Op til {n} person',
    other: 'Op til {n} personer',
  },
  'experience.detail.highlights.bring': 'Det skal du have med',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} anmeldelse', other: '{n} anmeldelser' },
  'experience.detail.reviews.stars': { one: '{n} stjerne', other: '{n} stjerner' },
  'experience.detail.reviews.demoNote':
    'Eksempler på anmeldelser — rigtige bedømmelser vises her, når bookingerne går i gang.',
  'experience.detail.reviews.showAll': 'Vis alle anmeldelser',
  'experience.detail.reviews.about': 'Sådan fungerer bedømmelser og anmeldelser.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Rumænien',
  'experience.detail.reviews.demo.1.when': 'For 1 dag siden',
  'experience.detail.reviews.demo.1.body':
    'Vores guide var vidende og varm. Det føltes helt anderledes at udforske byen sammen med hende.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milano, Italien',
  'experience.detail.reviews.demo.2.when': 'For 3 dage siden',
  'experience.detail.reviews.demo.2.body':
    'Lille gruppe, masser af snak. Der var også planlagt fotostop — vi elskede det.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Tjekkiet',
  'experience.detail.reviews.demo.3.when': 'For 1 uge siden',
  'experience.detail.reviews.demo.3.body':
    'Lidt højt tempo, men alt i alt skønt. Det sidste stop var vores favorit.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berlin, Tyskland',
  'experience.detail.reviews.demo.4.when': 'For 2 uger siden',
  'experience.detail.reviews.demo.4.body':
    'Mere personligt, end vi havde forventet. Værten viste os også lokale smagsoplevelser.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'Istanbul, Tyrkiet',
  'experience.detail.reviews.demo.5.when': 'For 3 uger siden',
  'experience.detail.reviews.demo.5.body':
    'Fejlfri organisering. Tydeligt mødested, og tidsplanen holdt præcist.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Spanien',
  'experience.detail.reviews.demo.6.when': 'For 1 måned siden',
  'experience.detail.reviews.demo.6.body': 'Vores guide var skøn 💕💕',
  'experience.detail.know.heading': 'Godt at vide',
  'experience.detail.know.minimumAge': 'Aldersgrænse',
  'experience.detail.know.minimumAgeValue': 'Fra {n} år',
  'experience.detail.know.activityLevel': 'Aktivitetsniveau',
  'experience.detail.know.whatToBring': 'Det skal du have med',
  'experience.detail.know.notIncluded': 'Ikke inkluderet',
  'experience.detail.know.accessibility': 'Tilgængelighed',
  'experience.detail.nearby.heading': 'Flere oplevelser i {sehir}',
  'experience.detail.host.anonymous': 'En Expyra-vært',
  'experience.detail.booking.title': 'Datoer og pris',
  'experience.detail.booking.noSlots':
    'Der er ingen ledige datoer lige nu. De dukker op her, når værten opdaterer kalenderen.',
  'experience.detail.booking.perPerson': 'pr. person',
  'experience.detail.booking.pickDate': 'Vælg en dato',
  'experience.detail.booking.timeZone': 'Tiderne er angivet i {bolge}.',
  'experience.detail.booking.spotsLeft': { one: '{n} plads tilbage', other: '{n} pladser tilbage' },
  'experience.detail.booking.adults': 'Voksne',
  'experience.detail.booking.children': 'Børn',
  'experience.detail.booking.infants': 'Spædbørn',
  'experience.detail.booking.currency': 'Valuta',
  'experience.detail.booking.currencyNone': 'Værtens valuta',
  'experience.detail.booking.update': 'Beregn pris',
  'experience.detail.booking.continue': 'Fortsæt til betaling',
  'experience.detail.booking.pickDateFirst': 'Vælg først en dato',
  'experience.detail.booking.pickDateHint': 'Vælg en dato ovenfor for at fortsætte.',
  'experience.detail.booking.total': 'I alt',
  'experience.detail.booking.displayTotal': 'Cirka {tutar}',
  'experience.detail.booking.chargedIn':
    'Du betaler i {paraBirimi}. Bruger dit kort en anden valuta, anvender din bank sin egen kurs.',
  'experience.detail.booking.quoteFailed':
    'Vi kunne ikke beregne prisen for dette valg. Der er måske ikke plads nok, eller tidspunktet er lukket.',
  'experience.detail.cityLink': 'Alle oplevelser i {sehir}',
  'experience.detail.back': 'Tilbage til Udforsk',

  'checkout.title': 'Bekræft og betal',
  'checkout.back': 'Tilbage til oplevelsen',
  'checkout.payment.heading': 'Betalingsmetode',
  'checkout.payment.bank': 'Netbank',
  'checkout.payment.bankSelect': 'Vælg din bank',
  'checkout.payment.card': 'Kredit- eller betalingskort',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Når du bekræfter og betaler, accepterer du brugsvilkårene, afbestillingsreglerne og privatlivspolitikken. Rigtig betaling er ikke koblet på endnu — dette trin viser brugerfladen.',
  'checkout.payment.submit': 'Bekræft og betal',
  'checkout.payment.submitting': 'Behandler…',
  'checkout.payment.demoNote': 'Demo: dit kort bliver ikke trukket, og der oprettes ingen booking.',
  'checkout.payment.unavailable':
    'Betaling er ikke tilgængelig endnu: knappen aktiveres, når vores betalingsudbyder er koblet på. Dit kort bliver ikke trukket, og der oprettes ingen booking.',
  'checkout.success.title': 'Færdig — demobekræftelse',
  'checkout.success.body':
    'Når betalingsudbyderen og booking-API’et er på plads, vises en rigtig billet her. Indtil videre er forløbet slut.',
  'checkout.success.back': 'Gå til mine oplevelser',
  'checkout.summary.nonRefundable': 'Denne reservation refunderes ikke.',
  'checkout.summary.date': 'Dato',
  'checkout.summary.guests': 'Gæster',
  'checkout.summary.change': 'Ændr',
  'checkout.summary.priceDetails': 'Prisdetaljer',
  'checkout.summary.total': 'I alt {paraBirimi}',

  'howItWorks.lede': 'Tre trin, og så er du klar.',
  'howItWorks.back': 'Tilbage',
  'howItWorks.step.discover.title': 'Udforsk',
  'howItWorks.step.discover.body':
    'Kig de lokale oplevelser i din by igennem. Små grupper, rigtige værter.',
  'howItWorks.step.book.title': 'Book',
  'howItWorks.step.book.body':
    'Vælg dato og antal personer, og se prisen. Booking kommer snart.',
  'howItWorks.step.join.title': 'Mød op',
  'howItWorks.step.join.body': 'Din vært tager imod dig, og oplevelsen begynder.',
  'howItWorks.backToExplore': 'Tilbage til Udforsk',

  'myExperiences.lede': 'Her finder du dine billetter.',
  'myExperiences.upcoming': 'Kommende · {sayi}',
  'myExperiences.past': 'Tidligere · {sayi}',
  'myExperiences.downloadPdf': 'Hent PDF',
  'myExperiences.wallet': 'Føj til Apple Wallet',
  'myExperiences.wallet.soon': 'Kommer snart',
  'myExperiences.rate': 'Giv en bedømmelse',
  'myExperiences.rate.soon': 'Åbner, når oplevelsen er slut',
  'myExperiences.empty.title': 'Ingen billetter endnu',
  'myExperiences.empty.body': 'Når du booker en oplevelse, vises din billet her.',
  'myExperiences.empty.cta': 'Udforsk oplevelser',

  'ticket.demoBadge': 'Demobillet',
  'ticket.demoNote': 'Eksempel på en billet: QR-koden er ikke signeret endnu og kan ikke tjekkes ved indgangen.',
  'ticket.view.title': 'Din billet',
  'ticket.view.lede': 'Vis QR-koden ved indgangen, eller føj den til din wallet.',
  'ticket.view.back': 'Tilbage til mine oplevelser',
  'ticket.wallet.view': 'Se billet',
  'ticket.wallet.apple': 'Føj til Apple Wallet',
  'ticket.wallet.google': 'Føj til Google Wallet',
  'ticket.wallet.adding': 'Gør klar…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet er ikke sat op i dette miljø. Tilføj EXPYRA_APPLE_PASS_* (se docs/WALLET.md); du kan stadig se billetten her.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet er ikke sat op i dette miljø. Tilføj EXPYRA_GOOGLE_WALLET_* (se docs/WALLET.md); du kan stadig se billetten her.',
  'ticket.guests': 'Gæster',
  'ticket.amount': 'I alt',
  'ticket.status': 'Status',
  'ticket.status.valid': 'Gyldig',
  'ticket.status.used': 'Brugt',
  'ticket.timeZoneNote': 'lokal tid i {sehir}',

  'ticket.pdf.kicker': 'Billet til oplevelse',
  'ticket.pdf.dateTime': 'Dato og tid',
  'ticket.pdf.docTitle': 'Expyra-billet — {baslik}',
  'ticket.pdf.code': 'Billetkode {kod}',
  'ticket.pdf.notice.valid': 'Værten scanner koden ved indgangen. Kan kun bruges én gang.',
  'ticket.pdf.notice.used': 'Billetten er brugt ved indgangen.',

  'ticket.error.signedOut': 'Log ind for at se billetten.',
  'ticket.error.notFound': 'Der findes ingen billet med den kode.',

  'auth.meta.title': 'Log ind',
  'auth.title': 'Log ind eller opret en konto',
  'auth.back': 'Tilbage',

  'auth.email.lede': 'Skriv din adresse, så sender vi dig en engangskode. Ingen adgangskode.',
  'auth.email.label': 'Din e-mailadresse',
  'auth.email.help': 'Vi sender koden til denne adresse.',
  'auth.email.placeholder': 'dig@example.com',
  'auth.email.error.invalid': 'Adressen ser ikke rigtig ud. Eksempel: dig@example.com',

  'auth.code.lede': 'Vi har sendt en 6-cifret kode til:',
  'auth.code.label': 'Koden fra din e-mail',
  'auth.code.hint':
    'Koden virker i 10 minutter. Kan du ikke finde mailen, så kig i din spammappe.',
  'auth.code.resend': 'Send en ny kode',
  'auth.code.changeEmail': 'Brug en anden adresse',

  'auth.common.continue': 'Fortsæt',
  'auth.common.working': 'Sender…',

  'auth.otp.error.invalid': 'Koden passede ikke. Tjek de 6 cifre i den seneste mail.',
  'auth.otp.error.locked':
    'For mange forsøg. Vi har lukket koden for at beskytte kontoen — bed om en ny.',
  'auth.otp.error.resendTooSoon': {
    one: 'Vent {n} sekund mere, før du beder om en ny kode.',
    other: 'Vent {n} sekunder mere, før du beder om en ny kode.',
  },

  'auth.error.tooManyRequests': 'Du har bedt om for mange koder. Prøv igen om lidt.',
  'auth.error.suspended': 'Kontoen er suspenderet. destek@expyra.com',
  'auth.error.expiredChallenge': 'Login-forsøget er udløbet. Skriv din adresse igen.',

  'account.title': 'Din konto',
  'account.lede': 'Her kan du ændre dit navn og dit foretrukne sprog.',

  'account.email.label': 'Din e-mailadresse',
  'account.email.note': 'E-mailadressen kan ikke ændres endnu.',

  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Grillet fisk på gaden',
  'wallpaper.kitchen.place': 'Et hjemmekøkken',
  'wallpaper.kitchen.label': 'Madlavning med tante',
  'wallpaper.cappadocia.place': 'Kappadokien',
  'wallpaper.cappadocia.label': 'Varmluftballon',
  'wallpaper.pause': 'Sæt baggrundsvideoen på pause',
  'wallpaper.play': 'Afspil baggrundsvideoen',
  'account.avatar.label': 'Profilbillede',
  'account.avatar.help': 'JPEG, PNG eller WebP · mindst 800×600 pixel · højst 10 MB',
  'account.avatar.add': 'Tilføj et billede',
  'account.avatar.change': 'Skift',
  'account.avatar.remove': 'Fjern',
  'account.avatar.uploading': 'Uploader…',
  'account.name.label': 'Dit visningsnavn',
  'account.name.help': 'Det er det navn, andre ser. Du kan lade feltet stå tomt.',
  'account.name.placeholder': 'fx Mette K.',

  'account.language.label': 'Dit foretrukne sprog',
  'account.language.help':
    'Det sprog, vi skriver til dig på. Brugerfladens sprog kommer fra adresselinjen, ikke fra dette valg.',
  'account.language.none': 'Ikke valgt',

  'account.save': 'Gem',
  'account.saving': 'Gemmer…',
  'account.saved': 'Ændringerne er gemt.',

  'account.error.name': {
    one: 'Et visningsnavn må højst være på {n} tegn.',
    other: 'Et visningsnavn må højst være på {n} tegn.',
  },
  'account.error.language': 'Det sprog understøtter vi ikke endnu. Vælg et andet fra listen.',
  'account.error.signedOut': 'Din session er udløbet. Log ind igen.',

  'account.menu.trigger': 'Kontomenu: {ad}',
  'account.menu.title': 'Konto',
  'account.menu.signedInAs': 'Logget ind som {eposta}',
  'account.menu.account': 'Din konto',
  'account.menu.signOut': 'Log ud',
  'account.menu.fallbackLabel': 'Din konto',

  'account.signIn': 'Log ind',
  'account.loading': 'Henter din session',

  'host.meta.title': 'Bliv vært',

  'host.invite.title': 'Udgiv din egen oplevelse',
  'host.invite.lede':
    'Vis folk noget, du kender til, tag dem med steder, hvor du alligevel kommer. Du bestemmer prisen, gruppestørrelsen, kalenderen og afbestillingsreglerne — vi blander os ikke i, hvad du tilbyder.',
  'host.invite.noApproval':
    'Ingen godkendelse, ingen ansøgningsskema. Så snart du siger bliv vært, åbner dit panel.',
  'host.invite.cta': 'Bliv vært',
  'host.invite.pending': 'Åbner…',

  'host.signedOut.note':
    'Du skal logge ind, før du kan blive vært. Vi beder ikke om en adgangskode — vi sender en engangskode til din adresse.',
  'host.signedOut.cta': 'Log ind for at blive vært',

  'host.panel.title': 'Værtspanel',
  'host.panel.lede':
    'Her styrer du dine oplevelser. Du bestemmer prisen, gruppen, kalenderen og afbestillingsreglerne — vi blander os ikke i, hvad du tilbyder.',
  'host.panel.status': 'Din konto er åben som vært.',
  'host.panel.new': 'Ny oplevelse',

  'host.listings.heading': 'Mine opslag · {sayi}',
  'host.listings.headingPage': 'Mine opslag · {sayi} på denne side',
  'host.listings.pager.label': 'Sider med opslag',
  'host.listings.pager.next': 'Flere opslag',
  'host.listings.pager.first': 'Tilbage til første side',
  'host.listings.edit': 'Rediger',
  'host.listings.view': 'Se opslaget',
  'host.listings.status.draft': 'Kladde',
  'host.listings.status.published': 'Udgivet',
  'host.listings.status.archived': 'Arkiveret',

  'host.listings.ready': 'Klar til udgivelse',
  'host.listings.missing': { one: '{n} felt mangler', other: '{n} felter mangler' },

  'host.listings.empty.heading': 'Mine opslag',
  'host.listings.empty.title': 'Du har ikke noget opslag endnu',
  'host.listings.empty.body':
    'Åbn din første kladde. Du kan arbejde på den, så længe du vil, før du udgiver — ingen andre kan se en kladde.',
  'host.listings.empty.cta': 'Skriv din første oplevelse',

  'host.listings.errorHeading': 'Mine opslag',
  'host.listings.error':
    'Vi kunne ikke hente dine opslag lige nu. Intet er slettet — genindlæs siden om et øjeblik.',

  'host.steps.heading': 'Hvordan kommer jeg i gang?',
  'host.steps.describe.title': 'Beskriv din oplevelse',
  'host.steps.describe.body':
    'Titel, beskrivelse, varighed og gruppestørrelse. Skriv på så mange sprog, du vil — de rejsende læser på deres eget.',
  'host.steps.media.title': 'Tilføj dine billeder',
  'host.steps.media.body':
    'Mindst ét forsidebillede. Vis, hvordan oplevelsen faktisk ser ud; stockfotos dur ikke her.',
  'host.steps.pricing.title': 'Sæt kalender og pris',
  'host.steps.pricing.body':
    'Hvilke dage, hvor mange personer, hvor meget. Du skriver prisen i din egen valuta, og det er den valuta, du får udbetalt i.',
  'host.steps.publish.title': 'Udgiv',
  'host.steps.publish.body':
    'Du skal ikke vente på noget. Så snart du udgiver, vises dit opslag i søgningen.',

  'host.contact.title': 'Skriv til os, hvis du går i stå',
  'host.contact.body':
    'Vi tager os af de første værter én ad gangen. Hvis noget blokerer dig, mens du laver dit opslag, eller du er i tvivl om en beslutning, så skriv — vi finder ud af det sammen med dig.',
  'host.contact.cta': 'Skriv til os',
  'host.contact.howItWorks': 'Sådan virker det',

  'host.error.blocked': 'Kontoen er suspenderet og kan derfor ikke blive vært. destek@expyra.com',

  'host.experience.new.meta.title': 'Ny oplevelse',
  'host.experience.new.title': 'Start en ny oplevelse',
  'host.experience.new.lede':
    'Vi spørger først om én ting: hvilket sprog du skriver opslaget på. Resten udfylder du i kladden, i den rækkefølge du vil.',
  'host.experience.new.language.label': 'Hvilket sprog skriver du på?',
  'host.experience.new.language.help':
    'Det kan ikke ændres senere: dit opslags adresse kommer herfra, og de rejsende ser denne tekst, når der ikke er skrevet på andre sprog. Du kan tilføje flere sprog bagefter.',
  'host.experience.new.submit': 'Åbn kladden',
  'host.experience.new.pending': 'Åbner…',

  'host.experience.new.next.heading': 'Hvad sker der nu?',
  'host.experience.new.next.text': 'Titel og beskrivelse — på så mange sprog, du vil.',
  'host.experience.new.next.basics': 'Hvor længe det varer, og hvor mange personer du tager med.',
  'host.experience.new.next.place': 'By, kategori og de sprog, du taler på dagen.',
  'host.experience.new.next.publish': 'Udgiv, når du er klar. Du skal ikke vente på noget.',

  'host.experience.edit.meta.title': 'Rediger oplevelse',
  'host.experience.edit.lede':
    'Hver sektion gemmes for sig. Stop, hvor du vil — din kladde venter på dig.',
  'host.experience.untitled': 'Kladde uden titel',
  'host.experience.back': '← Tilbage til værtspanelet',

  'host.experience.save': 'Gem',
  'host.experience.saving': 'Gemmer…',
  'host.experience.saved': 'Gemt.',

  'host.experience.section.text': 'Titel og beskrivelse',
  'host.experience.section.textHelp':
    'Det er det, de rejsende læser, før de beslutter sig. Fortæl, hvad I skal, hvor I mødes, og hvad der knytter dig til det.',
  'host.experience.section.basics': 'Varighed og kapacitet',
  'host.experience.section.basicsHelp':
    'Hvor længe én session varer, og hvor mange personer du tager med ad gangen. Kalender og pris kommer senere.',
  'host.experience.section.place': 'By',
  'host.experience.section.placeHelp':
    'Hvor oplevelsen foregår. Tidszonen kommer herfra — tiderne for sessionerne vises i den.',
  'host.experience.section.category': 'Kategori',
  'host.experience.section.categoryHelp':
    'De rejsende filtrerer efter den i søgningen. Vælg den nærmeste; der kan kun vælges én.',
  'host.experience.section.languages': 'Talte sprog og tags',
  'host.experience.section.languagesHelp':
    'Hvilke sprog afholder du oplevelsen på? Det er noget andet end det sprog, du har skrevet opslaget på.',
  'host.experience.section.status': 'Udgivelse',
  'host.experience.section.statusHelp':
    'Det, der skal til for at udgive, står nedenfor. Der er ingen godkendelse — mangler der intet, vises dit opslag med det samme i søgningen.',

  'host.experience.translations.tabsLabel': 'Sprog i opslagets tekst',
  'host.experience.translations.required': 'påkrævet',
  'host.experience.translations.optional': 'valgfrit',
  'host.experience.translations.add.label': 'Skriv på et andet sprog',
  'host.experience.translations.add.submit': 'Åbn',
  'host.experience.translations.machine':
    'Teksten er oversat automatisk. Ret og gem den, så bliver den din egen tekst.',

  'host.experience.title.label': 'Titel',
  'host.experience.title.placeholder': 'Street food-tur i Kadıköy',
  'host.experience.title.help':
    'Kort og konkret. Det er det første, de rejsende ser på listen, og dit opslags adresse kommer herfra.',
  'host.experience.description.label': 'Beskrivelse',
  'host.experience.description.placeholder':
    'Hvor I mødes, hvad I laver, hvad I spiser, hvad man skal have på…',
  'host.experience.description.help':
    'Ikke påkrævet for at udgive, men det er her, de rejsende beslutter sig. Gå dagen igennem i rækkefølge.',

  'host.experience.duration.label': 'Varighed (timer)',
  'host.experience.duration.help':
    'Den samlede længde af én session. Fx 1,5 timer eller 3. Højst syv dage (168 timer).',
  'host.experience.capacity.label': 'Kapacitet (personer)',
  'host.experience.capacity.help':
    'Det højeste antal personer i én session. For at udgive skal der være mindst én.',

  'host.experience.city.label': 'Hvilken by foregår det i?',
  'host.experience.city.placeholder': 'Søg efter en by',
  'host.experience.place.saved': 'By valgt · tidszone {saat}',
  'host.experience.place.empty': 'Der er ikke valgt en by endnu.',
  'host.experience.place.locked':
    'Når et opslag er udgivet, ligger byen fast: tiderne for sessionerne og bookingernes sted afhænger af den. Vil du bruge en anden by, så opret et nyt opslag.',

  'host.experience.category.label': 'Kategori',
  'host.experience.category.none': 'Ikke valgt',
  'host.experience.category.help': 'Det, oplevelsen mest handler om.',

  'host.experience.spoken.label': 'Sprog, du taler under oplevelsen',
  'host.experience.spoken.help':
    'Uafhængigt af det sprog, du har skrevet opslaget på: sæt kryds ved de sprog, du faktisk afholder den på. Højst ti.',
  'host.experience.spoken.search.label': 'Søg efter sprog',
  'host.experience.spoken.search.placeholder': 'Tysk, Deutsch, de…',
  'host.experience.spoken.search.results': { one: '{n} sprog vist', other: '{n} sprog vist' },
  'host.experience.spoken.search.none': 'Intet sprog matcher. Valgte sprog bliver bevaret.',
  'host.experience.tags.label': 'Tags',
  'host.experience.tags.placeholder': 'street food, gåtur, lille gruppe',
  'host.experience.tags.help':
    'Adskil med kommaer. Højst ti. De hjælper dit opslag med at matche søgninger.',

  'host.experience.missing.heading': 'Det skal der til for at udgive',
  'host.experience.ready': 'Alt er klar. Du kan udgive opslaget.',
  'host.experience.missing.translation': 'en titel på det sprog, opslaget er skrevet på',
  'host.experience.missing.city': 'en by',
  'host.experience.missing.category': 'en kategori',
  'host.experience.missing.capacity': 'en kapacitet',
  'host.experience.missing.duration': 'en varighed',
  'host.experience.missing.cover': 'et forsidebillede',
  'host.experience.missing.price': 'en pris',
  'host.experience.missing.unknown': 'et ufærdigt felt',

  'host.experience.publish': 'Udgiv',
  'host.experience.republish': 'Udgiv igen',
  'host.experience.publishing': 'Udgiver…',
  'host.experience.published': 'Dit opslag er live.',
  'host.experience.unpublish': 'Fjern udgivelse',
  'host.experience.unpublishing': 'Fjerner udgivelse…',
  'host.experience.unpublished': 'Opslaget er tilbage som kladde — skjult i søgningen.',
  'host.experience.archive': 'Arkiver',
  'host.experience.archiving': 'Arkiverer…',
  'host.experience.archived': 'Opslaget er arkiveret.',

  'host.media.heading': 'Billeder',
  'host.media.hint': 'JPEG, PNG eller WebP · mindst 800×600 pixel · højst 10 MB · højst 12 billeder',
  'host.media.add': 'Tilføj billeder',
  'host.media.drop': 'Slip filerne her',
  'host.media.uploading': 'Uploader…',
  'host.media.empty': 'Ingen billeder endnu. Det første, du uploader, bliver forsidebillede.',
  'host.media.cover': 'Forside',
  'host.media.makeCover': 'Brug som forside',
  'host.media.delete': 'Slet',
  'host.media.moveEarlier': 'Flyt frem',
  'host.media.moveLater': 'Flyt tilbage',
  'host.media.position': 'Billede {n}',
  'host.media.error.rejected': 'Billedet blev ikke godkendt.',
  'host.media.error.unsupported': 'Der kan kun uploades JPEG, PNG og WebP.',
  'host.media.error.notUploaded': 'Uploaden blev ikke færdig. Prøv igen.',
  'host.media.error.notAnImage': 'Filen er ikke et billede.',
  'host.media.error.mismatch': 'Filens indhold passer ikke til filtypen.',
  'host.media.error.tooSmall': 'Billeder skal være mindst 800×600 pixel.',
  'host.media.error.tooLarge': 'Filer må højst være 10 MB.',
  'host.media.error.limit': 'Et opslag kan højst have 12 billeder.',

  'host.experience.status.publishedNote':
    'Dit opslag vises i søgningen. Fjern udgivelsen for at gøre det til kladde igen — ret billederne, og udgiv så igen. Arkivering skjuler det også uden at slette det.',
  'host.experience.status.privateNote': 'Indtil du udgiver opslaget, kan ingen andre end dig se det.',

  'host.experience.error.notFound': 'Vi kunne ikke finde opslaget. Åbn det igen fra panelet.',
  'host.experience.error.invalid': 'Sektionen kunne ikke gemmes. Tjek felterne, og prøv igen.',
  'host.experience.error.language':
    'Opslag kan ikke skrives på det sprog. Vælg et andet fra listen.',
  'host.experience.error.title': 'En titel er påkrævet og må højst være på 120 tegn.',
  'host.experience.error.description': 'Beskrivelsen må højst være på 4000 tegn.',
  'host.experience.error.duration': 'Skriv varigheden i timer: mindst 0,5, højst 168.',
  'host.experience.error.capacity': 'Skriv kapaciteten i personer: mindst 1, højst 500.',
  'host.experience.error.city': 'Vælg byen fra listen — det er ikke nok at skrive navnet.',
  'host.experience.error.category': 'Vælg en kategori fra listen.',
  'host.experience.section.itinerary': 'Det skal I lave',
  'host.experience.section.itineraryHelp':
    'Oplevelsens trin i rækkefølge. Hvert trin er en titel og eventuelt en sætning eller to. Listen skrives på opslagets sprog; sprogfanerne ovenfor gælder også her.',
  'host.experience.section.meeting': 'Mødested',
  'host.experience.section.meetingHelp':
    'Hvor finder gæsterne dig? Adressen er uafhængig af sprog, instruktionerne er på det valgte sprog. Tilføjer du koordinater, kan gæsterne åbne stedet på et kort.',
  'host.experience.section.details': 'Godt at vide',
  'host.experience.section.detailsHelp':
    'Aldersgrænse, aktivitetsniveau og det, gæsterne bør vide på forhånd. Tomme felter vises ikke.',
  'host.experience.textLanguage.note': 'Teksterne i denne sektion er på {dil}. Brug fanerne i 01 for at skifte sprog.',

  'host.experience.itinerary.stepTitle.label': 'Trin {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Vi mødes ved Hippodromen',
  'host.experience.itinerary.stepBody.placeholder': 'Byzans’ væddeløbsbane for stridsvogne; obelisken og slangesøjlen står her.',
  'host.experience.itinerary.add': 'Tilføj trin',
  'host.experience.itinerary.remove': 'Fjern trin',
  'host.experience.itinerary.help': 'Tomme rækker gemmes ikke. Højst 20 trin.',

  'host.experience.meeting.address.label': 'Adresse',
  'host.experience.meeting.address.placeholder': 'Foran Galata-tårnet, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Breddegrad',
  'host.experience.meeting.longitude.label': 'Længdegrad',
  'host.experience.meeting.coords.help': 'Begge eller ingen. Decimaltal: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Instruktioner',
  'host.experience.meeting.instructions.placeholder': 'Ved tårnets nordlige indgang — kig efter guiden med den gule paraply.',

  'host.experience.details.minimumAge.label': 'Minimumsalder',
  'host.experience.details.minimumAge.help': 'Tomt = ingen grænse. 1–99.',
  'host.experience.details.activityLevel.label': 'Aktivitetsniveau',
  'host.experience.details.activityLevel.none': 'Ikke angivet',
  'host.experience.details.whatToBring.label': 'Det skal du have med',
  'host.experience.details.whatToBring.placeholder': 'Vand, gode sko, et tørklæde (til moskébesøg)',
  'host.experience.details.notIncluded.label': 'Ikke inkluderet',
  'host.experience.details.notIncluded.placeholder': 'Museumsbilletter, frokost',
  'host.experience.details.accessibility.label': 'Tilgængelighed',
  'host.experience.details.accessibility.placeholder': 'Ruten har trapper; ikke egnet til kørestol.',

  'host.experience.error.translationMissing': 'Skriv først titlen på dette sprog (sektion 01), og udfyld så disse felter.',
  'host.experience.error.minimumAge': 'Minimumsalderen skal være et helt tal mellem 1 og 99.',
  'host.experience.error.coordinates': 'Bredde- og længdegrad hører sammen; breddegrad ±90, længdegrad ±180.',
  'host.experience.error.itinerary': 'Hvert trin skal have en titel; højst 20 trin.',

  'experience.activity.light': 'Let',
  'experience.activity.moderate': 'Moderat',
  'experience.activity.strenuous': 'Krævende',

  'host.profile.heading': 'Præsenter dig selv',
  'host.profile.lede':
    'Vises under dit navn på opslagets side. Hvem du er, og hvorfor det skal være dig, der fortæller historien — to sætninger er nok.',
  'host.profile.headline.label': 'Overskrift',
  'host.profile.headline.placeholder': 'Lokal guide og historiker i Istanbul',
  'host.profile.bio.label': 'Om mig',
  'host.profile.bio.placeholder': 'Jeg har vist folk rundt i byens baggader i ti år…',
  'host.profile.language.label': 'Tekstens sprog',
  'host.profile.error.invalid': 'Overskrift højst 80 tegn, præsentation højst 2000.',
  'host.experience.error.spokenLanguages': 'Du kan højst vælge ti sprog.',
  'host.experience.error.tags': 'Tags må ikke være tomme; højst ti, og hvert skal være kort.',
  'host.experience.error.publishedConflict':
    'Den ændring kan ikke laves på et udgivet opslag. Arkiver det først, og rediger så.',
  'host.experience.error.publishBlocked': 'Ikke udgivet. Mangler stadig: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Ikke udgivet: opslaget er ikke færdigt endnu. Tjek listen ovenfor.',

  'category.food-drink': 'Mad og drikke',
  'category.art-culture': 'Kunst og kultur',
  'category.history-heritage': 'Historie og kulturarv',
  'category.nature-outdoors': 'Natur og friluftsliv',
  'category.water-sea': 'Vand og hav',
  'category.sports-adventure': 'Sport og eventyr',
  'category.crafts-workshops': 'Håndværk og workshops',
  'category.music-nightlife': 'Musik og natteliv',
  'category.wellness': 'Velvære',
  'category.photography': 'Fotografi',
  'category.tours-walks': 'Ture og gåture',
  'category.local-life': 'Lokalt liv',

  'host.experience.section.pricing': 'Pris',
  'host.experience.section.pricingHelp':
    'Sæt din pris pr. person i din egen valuta. Du får altid udbetalt i denne valuta; vælger en rejsende en anden, omregnes kun visningen.',

  'host.pricing.currency.label': 'Udbetalingsvaluta',
  'host.pricing.currency.help':
    'Den valuta, pengene når dig i. Den kan ikke ændres, når opslaget er udgivet — arkiver det først.',
  'host.pricing.currency.locked': 'Valutaen er låst, fordi opslaget er live.',
  'host.pricing.currency.placeholder': 'Vælg',

  'host.pricing.adult.label': 'Voksen (pr. person)',
  'host.pricing.adult.help': 'Påkrævet. Det er “fra”-prisen, der vises på kort og i søgningen.',
  'host.pricing.child.label': 'Barn (pr. person)',
  'host.pricing.child.help': 'Lad feltet stå tomt, hvis du ikke har en børnepris. Skriv 0, hvis det er gratis.',
  'host.pricing.infant.label': 'Spædbarn (pr. person)',
  'host.pricing.infant.help': 'Lad feltet stå tomt, hvis du ikke har en pris for spædbørn. Skriv 0, hvis det er gratis.',

  'host.pricing.saved': 'Prisen er gemt.',
  'host.pricing.empty': 'Ingen pris endnu. Et opslag uden pris kan ikke udgives.',

  'host.pricing.error.currency': 'Vælg en gyldig valuta.',
  'host.pricing.error.currencyLocked':
    'Valutaen på et udgivet opslag kan ikke ændres. Arkiver det først.',
  'host.pricing.error.adult': 'Prisen for voksne er påkrævet og skal være et gyldigt beløb.',
  'host.pricing.error.child': 'Prisen for børn skal være et gyldigt beløb.',
  'host.pricing.error.infant': 'Prisen for spædbørn skal være et gyldigt beløb.',
  'host.pricing.error.range':
    'Beløbet ligger uden for det, betalingsudbyderen accepterer — det er enten for lille eller for stort.',

  'host.experience.section.schedule': 'Tidsplan',
  'host.experience.section.scheduleHelp':
    'Hvilke dage og tidspunkter afholder du det? Tiderne er i byens tidszone — det klokkeslæt, du skriver, ligger fast, også når der skiftes til og fra sommertid.',

  'host.schedule.blocked':
    'En tidsplan kræver først en by, en varighed og en kapacitet. Gør sektionerne ovenfor færdige.',
  'host.schedule.timeZone': 'Tidszone: {bolge}',
  'host.schedule.generatedThrough': 'Din kalender er klar til og med {tarih}.',

  'host.schedule.rule.heading': 'Ugentlig regel',
  'host.schedule.rule.days': 'Dage',
  'host.schedule.rule.daysHelp': 'Du kan vælge flere; hver dag bliver sin egen regel.',
  'host.schedule.rule.time': 'Starttidspunkt',
  'host.schedule.rule.timeHelp': 'I byens lokale tid.',
  'host.schedule.rule.start': 'Fra og med',
  'host.schedule.rule.startHelp': 'Lad feltet stå tomt for at starte i dag.',
  'host.schedule.rule.submit': 'Tilføj regel',
  'host.schedule.rule.pending': 'Tilføjer…',
  'host.schedule.rule.stop': 'Fjern',
  'host.schedule.rule.stopping': 'Fjerner…',
  'host.schedule.rule.empty': 'Ingen ugentlige regler endnu.',
  'host.schedule.rule.stopped': 'stoppet',

  'host.schedule.blackout.heading': 'Fridage',
  'host.schedule.blackout.start': 'Fra',
  'host.schedule.blackout.end': 'Til',
  'host.schedule.blackout.endHelp': 'Lad feltet stå tomt for at lukke en enkelt dag. Slutdagen er medregnet.',
  'host.schedule.blackout.submit': 'Luk',
  'host.schedule.blackout.pending': 'Lukker…',
  'host.schedule.blackout.remove': 'Fjern',
  'host.schedule.blackout.removing': 'Fjerner…',
  'host.schedule.blackout.empty': 'Ingen fridage.',

  'host.schedule.slots.heading': 'Kommende sessioner',
  'host.schedule.slots.empty': 'Ingen sessioner i denne periode.',
  'host.schedule.slots.remaining': {
    one: '{n} plads tilbage',
    other: '{n} pladser tilbage',
  },
  'host.schedule.slots.closed': 'Lukket',
  'host.schedule.slots.closedByBlackout': 'Fridag',
  'host.schedule.slots.close': 'Luk',
  'host.schedule.slots.closing': 'Lukker…',
  'host.schedule.slots.open': 'Åbn',
  'host.schedule.slots.opening': 'Åbner…',
  'host.schedule.slots.more': 'og {n} mere',

  'host.schedule.day.monday': 'Mandag',
  'host.schedule.day.tuesday': 'Tirsdag',
  'host.schedule.day.wednesday': 'Onsdag',
  'host.schedule.day.thursday': 'Torsdag',
  'host.schedule.day.friday': 'Fredag',
  'host.schedule.day.saturday': 'Lørdag',
  'host.schedule.day.sunday': 'Søndag',

  'host.schedule.ruleSaved': 'Reglen er tilføjet, og sessionerne er oprettet.',
  'host.schedule.ruleStopped': 'Reglen er stoppet.',
  'host.schedule.slotOpened': 'Sessionen er åbnet.',
  'host.schedule.slotClosed': 'Sessionen er lukket.',
  'host.schedule.blackoutSaved': 'Dagene er lukket.',
  'host.schedule.blackoutRemoved': 'Fridagene er fjernet.',

  'host.schedule.error.noDay': 'Vælg mindst én dag.',
  'host.schedule.error.time': 'Skriv tidspunktet som TT:MM.',
  'host.schedule.error.date': 'Skriv en gyldig dato.',
  'host.schedule.error.range': 'Slutdatoen kan ikke ligge før startdatoen.',
  'host.schedule.error.notSchedulable':
    'En tidsplan kræver først en by, en varighed og en kapacitet.',
  'host.schedule.error.duplicateRule': 'Der findes allerede en regel på den dag og det tidspunkt.',
  'host.schedule.error.ruleLimit': 'Denne oplevelse kan ikke have flere ugentlige regler.',
  'host.schedule.error.dstGap':
    'Det tidspunkt findes ikke den dag på grund af skiftet til sommertid. Prøv en time senere.',
  'host.schedule.error.past': 'En session, der er overstået, kan ikke ændres.',
  'host.schedule.error.slotExists': 'Der findes allerede en session på det tidspunkt.',
  'host.schedule.error.blackedOut': 'Datoen er markeret som fridag. Fjern perioden først.',
  'host.schedule.error.generated':
    'En session, som en ugentlig regel har oprettet, kan ikke slettes; du kan lukke den.',
  'host.schedule.error.hasBookings': 'En session med bookinger kan ikke ændres.',
  'host.schedule.error.blackoutLimit': 'Der kan ikke tilføjes flere fridage.',
  'host.schedule.error.horizon': 'Kalenderen kan ikke åbnes så langt frem.',
  'host.schedule.error.generic': 'Det lykkedes ikke lige nu.',
} as const satisfies Dictionary<'da'>

/**
 * Teksten sammenlignes også med kilden: falder en pladsholder ud eller skifter
 * navn, går kompileringen i stykker og skriver, hvilken nøgle det drejer sig om.
 * `export` er bevidst — en ubrugt type tælles som død kode i lint.
 */
export type DaPlaceholders = Assert<PlaceholdersMatchSource<typeof da>>
