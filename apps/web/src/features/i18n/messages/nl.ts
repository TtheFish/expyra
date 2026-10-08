import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Nederlandse interface.
 *
 * `satisfies Dictionary<'nl'>` dwingt twee dingen af: elke sleutel uit de bron
 * BESTAAT ook hier, en meervoudssleutels dragen de Nederlandse CLDR-vormen:
 * `one` + `other`. `one` geldt alleen voor precies 1 (zonder decimalen); al het
 * andere, ook "1,5 uur", is `other`. `as const` bewaart de literals, zodat de
 * controle op plaatshouders onderaan de tekst kan lezen.
 *
 * **Toon (VISION §6):** het product spreekt een persoon aan, geen bureau. We
 * schrijven met "je", direct en kort — geen marketingbijvoeglijke naamwoorden,
 * geen "alsjeblieft", geen uitroeptekens.
 *
 * Twee dingen worden bewust niet vertaald: de merknaam (Expyra) en het
 * supportadres (`destek@expyra.com` — de enige mailbox die bestaat).
 */
export const nl = {
  'meta.description': 'Vind lokale belevenissen en boek ze.',

  'nav.primaryLabel': 'Hoofdmenu',
  'nav.footerLabel': 'Voettekstmenu',
  'nav.explore': 'Ontdekken',
  'nav.myExperiences': 'Mijn belevenissen',
  'nav.becomeHost': 'Word host',
  'nav.howItWorks': 'Hoe het werkt',

  'language.trigger': 'Taal: {dil}. Wijzigen.',
  'language.dialogLabel': 'Taalkeuze',
  'language.search.label': 'Talen zoeken',
  'language.search.placeholder': 'Talen zoeken',
  'language.group.ui': 'Interfacetalen',
  'language.group.content': 'Andere talen',
  'language.group.contentHint':
    'Nog geen vertaling van de interface — belevenissen kunnen wel in deze talen worden gepubliceerd.',
  'language.empty': 'Geen taal gevonden voor deze zoekopdracht.',

  'theme.toLight': 'Overschakelen naar het lichte thema',
  'theme.toDark': 'Overschakelen naar het donkere thema',

  'currency.trigger': 'Valuta: {para}. Wijzigen.',
  'currency.dialogLabel': 'Valutakeuze',
  'currency.search.label': 'Valuta zoeken',
  'currency.search.placeholder': 'EUR, dollar, lira…',
  'currency.none': 'Valuta van de host',
  'currency.empty': 'Geen valuta gevonden voor deze zoekopdracht.',

  'home.hero.title': 'Een nieuwe manier om',
  'home.hero.titleAccent': 'de belevenissen van de locals te vinden',
  'home.hero.lede':
    'Van mensen die er echt wonen. Kleine groepen, echte mensen, een paar uur die je niet vergeet.',
  'home.showcase.heading': 'Belevenissen op Expyra',
  'home.showcase.more': 'Alle belevenissen bekijken',
  'home.showcase.unavailable':
    'We konden de belevenissen nu niet tonen. Probeer het zo opnieuw — de aanbiedingen staan er nog.',
  'home.showcase.empty.title': 'Er is nog niets gepubliceerd',
  'home.showcase.empty.body':
    'Jij kunt de eerste zijn. Laat mensen iets zien waar je verstand van hebt, in een kleine groep.',
  'home.showcase.empty.cta': 'Word host',

  'search.destination.label': 'Waarheen?',
  'search.destination.placeholder': 'Zoek een stad',
  'search.date.label': 'Wanneer?',
  'search.date.placeholder': 'Kies een datum',
  'search.date.dialogLabel': 'Kies een datum',
  'search.date.day': 'Dag',
  'search.date.month': 'Maand',
  'search.date.year': 'Jaar',
  'search.date.done': 'Klaar',
  'search.date.clear': 'Wissen',
  'search.date.stepUp': 'Vorige {alan}',
  'search.date.stepDown': 'Volgende {alan}',
  'search.submit': 'Zoeken',

  'search.city.listLabel': 'Suggesties voor steden',
  'search.city.countriesHeading': 'Landen',
  'search.city.citiesHeading': 'Steden',
  'search.city.allCountries': 'Alle landen',
  'search.city.tooShort': 'Begin met het typen van een stad, of kies een land uit de lijst.',
  'search.city.loading': 'Zoeken…',
  'search.city.error': 'We konden de lijst met steden niet laden. Probeer het zo opnieuw.',
  'search.city.empty': 'Geen stad gevonden voor deze zoekopdracht.',
  'search.city.truncated': 'Er zijn meer steden — typ verder om te verfijnen.',
  'search.city.clear': 'Geselecteerde stad verwijderen',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} stad gevonden', other: '{n} steden gevonden' },
  'search.city.countryCities': { one: '{n} stad', other: '{n} steden' },

  'search.guests.label': 'Gasten',
  'search.guests.dialogLabel': 'Aantal gasten',
  'search.guests.done': 'Klaar',
  'search.guests.adults': 'Volwassenen',
  'search.guests.adults.hint': '13 jaar en ouder',
  'search.guests.adults.decrease': 'Eén volwassene minder',
  'search.guests.adults.increase': 'Eén volwassene meer',
  'search.guests.children': 'Kinderen',
  'search.guests.children.hint': '0–12 jaar',
  'search.guests.children.decrease': 'Eén kind minder',
  'search.guests.children.increase': 'Eén kind meer',
  'search.guests.summary.adults': { one: '{n} volwassene', other: '{n} volwassenen' },
  'search.guests.summary.children': { one: '{n} kind', other: '{n} kinderen' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} uur', other: '{n} uur' },
  'experience.duration.minutes': { one: '{n} minuut', other: '{n} minuten' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Duur niet opgegeven',
  'experience.meta': {
    one: '{sure} · tot {n} persoon',
    other: '{sure} · tot {n} personen',
  },
  'experience.card.perPerson': 'per gast',
  'experience.card.language': 'Deze aanbieding is geschreven in het {dil}',

  'explore.heading.all': 'Alle belevenissen',
  'explore.heading.city': 'Belevenissen in {sehir}',
  'explore.heading.query': 'Resultaten voor ‘{arama}’',
  'explore.summary': { one: '{n} belevenis', other: '{n} belevenissen' },
  'explore.summary.page': {
    one: '{n} belevenis op deze pagina',
    other: '{n} belevenissen op deze pagina',
  },
  'explore.filtersNotice':
    'We filteren de resultaten alleen op stad — met {filtreler} houden we nog geen rekening.',
  'explore.filter.date': 'de gekozen datum',
  'explore.filter.guests': 'het aantal gasten',

  'explore.pager.label': 'Resultaatpagina’s',
  'explore.pager.next': 'Volgende pagina',
  'explore.pager.first': 'Terug naar de eerste pagina',

  'explore.pageLink.title': 'We konden die paginalink niet lezen',
  'explore.pageLink.body':
    'De paginamarkering in het adres lijkt beschadigd. Begin de zoekopdracht opnieuw — de resultaten staan er nog.',

  'explore.empty.title': 'Hier nog geen belevenissen',
  'explore.empty.body':
    'Probeer een andere stad uit de lijst. Er komen voortdurend nieuwe steden en belevenissen bij.',
  'explore.empty.cta': 'Alle belevenissen bekijken',
  'explore.empty.hostCta': 'Word hier de eerste host',

  'explore.cityMissing.title': 'Die stad kennen we niet',
  'explore.cityMissing.body':
    'De stad in het adres staat niet in ons register — de link is misschien verouderd. Kies een stad uit de lijst in het veld hierboven.',
  'explore.cityMissing.cta': 'Alle belevenissen bekijken',

  'experience.detail.meta.fallback': 'Een lokale belevenis in {sehir}.',
  'experience.detail.text.fallback': 'Deze beschrijving is in het {dil}',
  'experience.detail.duration.label': 'Duur',
  'experience.detail.capacity.label': 'Groepsgrootte',
  'experience.detail.capacity.value': { one: 'Tot {n} persoon', other: 'Tot {n} personen' },
  'experience.detail.about': 'Over deze belevenis',
  'experience.detail.noDescription': 'De host heeft nog geen beschrijving geschreven.',
  'experience.detail.spoken.heading': 'Talen tijdens de belevenis',
  'experience.detail.spoken.help':
    'De host begeleidt de belevenis in deze talen. De taal waarin de aanbieding is geschreven, is iets anders.',
  'experience.detail.spoken.none': 'De host heeft nog niet aangegeven welke talen hij of zij spreekt.',
  'experience.detail.tags.heading': 'Tags',
  'experience.detail.gallery.heading': 'Galerij',
  'experience.detail.host.heading': 'Je host',
  'experience.detail.itinerary.heading': 'Wat je gaat doen',
  'experience.detail.meeting.heading': 'Waar we afspreken',
  'experience.detail.meeting.map': 'Openen in kaart',
  'experience.detail.meeting.mapEmbed': 'Kaart van het ontmoetingspunt',
  'experience.detail.meeting.pin': 'Ontmoetingspunt',
  'experience.detail.highlights.host': 'Host: {ad}',
  'experience.detail.highlights.duration': 'Ongeveer {sure}',
  'experience.detail.highlights.spoken': 'Aangeboden in {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Tot {n} persoon',
    other: 'Tot {n} personen',
  },
  'experience.detail.highlights.bring': 'Wat je meeneemt',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} beoordeling', other: '{n} beoordelingen' },
  'experience.detail.reviews.stars': { one: '{n} ster', other: '{n} sterren' },
  'experience.detail.reviews.demoNote':
    'Voorbeeldbeoordelingen — echte beoordelingen verschijnen hier zodra boekingen live zijn.',
  'experience.detail.reviews.showAll': 'Alle beoordelingen tonen',
  'experience.detail.reviews.about': 'Zo werken beoordelingen en reviews.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Roemenië',
  'experience.detail.reviews.demo.1.when': '1 dag geleden',
  'experience.detail.reviews.demo.1.body':
    'Onze gids wist veel en was hartelijk. De stad met haar verkennen voelde heel anders.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milaan, Italië',
  'experience.detail.reviews.demo.2.when': '3 dagen geleden',
  'experience.detail.reviews.demo.2.body':
    'Kleine groep, veel gesprekken. Er waren ook fotostops gepland — we vonden het geweldig.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Tsjechië',
  'experience.detail.reviews.demo.3.when': '1 week geleden',
  'experience.detail.reviews.demo.3.body':
    'Een beetje snel tempo, maar al met al heerlijk. De laatste stop was onze favoriet.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berlijn, Duitsland',
  'experience.detail.reviews.demo.4.when': '2 weken geleden',
  'experience.detail.reviews.demo.4.body':
    'Persoonlijker dan we hadden verwacht. De host wees ons ook op lokale smaken.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'Istanbul, Turkije',
  'experience.detail.reviews.demo.5.when': '3 weken geleden',
  'experience.detail.reviews.demo.5.body':
    'Vlekkeloos georganiseerd. Duidelijk ontmoetingspunt en de timing klopte precies.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Spanje',
  'experience.detail.reviews.demo.6.when': '1 maand geleden',
  'experience.detail.reviews.demo.6.body': 'Onze gids was een schat 💕💕',
  'experience.detail.know.heading': 'Goed om te weten',
  'experience.detail.know.minimumAge': 'Leeftijdsgrens',
  'experience.detail.know.minimumAgeValue': 'Vanaf {n} jaar',
  'experience.detail.know.activityLevel': 'Activiteitsniveau',
  'experience.detail.know.whatToBring': 'Wat je meeneemt',
  'experience.detail.know.notIncluded': 'Niet inbegrepen',
  'experience.detail.know.accessibility': 'Toegankelijkheid',
  'experience.detail.nearby.heading': 'Meer belevenissen in {sehir}',
  'experience.detail.host.anonymous': 'Een Expyra-host',
  'experience.detail.booking.title': 'Data en prijs',
  'experience.detail.booking.noSlots':
    'Er zijn nu geen beschikbare data. Ze verschijnen hier zodra de host de kalender bijwerkt.',
  'experience.detail.booking.perPerson': 'per persoon',
  'experience.detail.booking.pickDate': 'Kies een datum',
  'experience.detail.booking.timeZone': 'Tijden zijn in {bolge}.',
  'experience.detail.booking.spotsLeft': { one: 'Nog {n} plek', other: 'Nog {n} plekken' },
  'experience.detail.booking.adults': 'Volwassenen',
  'experience.detail.booking.children': 'Kinderen',
  'experience.detail.booking.infants': 'Baby’s',
  'experience.detail.booking.currency': 'Valuta',
  'experience.detail.booking.currencyNone': 'Valuta van de host',
  'experience.detail.booking.update': 'Prijs berekenen',
  'experience.detail.booking.continue': 'Doorgaan naar betalen',
  'experience.detail.booking.pickDateFirst': 'Kies eerst een datum',
  'experience.detail.booking.pickDateHint': 'Kies hierboven een datum om door te gaan.',
  'experience.detail.booking.total': 'Totaal',
  'experience.detail.booking.displayTotal': 'Ongeveer {tutar}',
  'experience.detail.booking.chargedIn':
    'Je betaalt in {paraBirimi}. Gebruikt je kaart een andere valuta, dan past je bank een eigen koers toe.',
  'experience.detail.booking.quoteFailed':
    'We konden geen prijs berekenen voor deze keuze. Misschien is er niet genoeg plek, of is het tijdslot gesloten.',
  'experience.detail.cityLink': 'Alle belevenissen in {sehir}',
  'experience.detail.back': 'Terug naar Ontdekken',

  'checkout.title': 'Bevestigen en betalen',
  'checkout.back': 'Terug naar de belevenis',
  'checkout.payment.heading': 'Betaalmethode',
  'checkout.payment.bank': 'Internetbankieren',
  'checkout.payment.bankSelect': 'Kies je bank',
  'checkout.payment.card': 'Creditcard of betaalpas',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Door te bevestigen en te betalen ga je akkoord met de gebruiksvoorwaarden, het annuleringsbeleid en de privacyverklaring. Echt betalen is nog niet gekoppeld — deze stap laat de interface zien.',
  'checkout.payment.submit': 'Bevestigen en betalen',
  'checkout.payment.submitting': 'Bezig…',
  'checkout.payment.demoNote': 'Demo: je kaart wordt niet belast en er wordt geen boeking gemaakt.',
  'checkout.payment.unavailable':
    'Betalen is nog niet beschikbaar: deze knop wordt actief zodra onze betaalprovider is gekoppeld. Je kaart wordt niet belast en er wordt geen boeking gemaakt.',
  'checkout.success.title': 'Klaar — demobevestiging',
  'checkout.success.body':
    'Zodra de betaalprovider en de boekings-API er zijn, verschijnt hier een echt ticket. Voor nu is de flow compleet.',
  'checkout.success.back': 'Naar mijn belevenissen',
  'checkout.summary.nonRefundable': 'Deze reservering wordt niet terugbetaald.',
  'checkout.summary.date': 'Datum',
  'checkout.summary.guests': 'Gasten',
  'checkout.summary.change': 'Wijzigen',
  'checkout.summary.priceDetails': 'Prijsdetails',
  'checkout.summary.total': 'Totaal {paraBirimi}',

  'howItWorks.lede': 'Drie stappen en je bent klaar.',
  'howItWorks.back': 'Terug',
  'howItWorks.step.discover.title': 'Ontdek',
  'howItWorks.step.discover.body':
    'Bekijk de lokale belevenissen in je stad. Kleine groepen, echte hosts.',
  'howItWorks.step.book.title': 'Boek',
  'howItWorks.step.book.body':
    'Kies een datum en het aantal personen en zie de prijs. Boeken komt binnenkort.',
  'howItWorks.step.join.title': 'Kom langs',
  'howItWorks.step.join.body': 'Je host ontvangt je en de belevenis begint.',
  'howItWorks.backToExplore': 'Terug naar Ontdekken',

  'myExperiences.lede': 'Hier vind je je tickets.',
  'myExperiences.upcoming': 'Gepland · {sayi}',
  'myExperiences.past': 'Voorbij · {sayi}',
  'myExperiences.downloadPdf': 'PDF downloaden',
  'myExperiences.wallet': 'Toevoegen aan Apple Wallet',
  'myExperiences.wallet.soon': 'Binnenkort',
  'myExperiences.rate': 'Beoordelen',
  'myExperiences.rate.soon': 'Beschikbaar zodra de belevenis voorbij is',
  'myExperiences.empty.title': 'Nog geen tickets',
  'myExperiences.empty.body': 'Als je een belevenis boekt, verschijnt je ticket hier.',
  'myExperiences.empty.cta': 'Belevenissen ontdekken',

  'ticket.demoBadge': 'Demoticket',
  'ticket.demoNote': 'Voorbeeldticket: de QR-code is nog niet ondertekend en kan bij de ingang niet worden gecontroleerd.',
  'ticket.view.title': 'Je ticket',
  'ticket.view.lede': 'Laat de QR-code bij de ingang zien of voeg hem toe aan je wallet.',
  'ticket.view.back': 'Terug naar mijn belevenissen',
  'ticket.wallet.view': 'Ticket bekijken',
  'ticket.wallet.apple': 'Toevoegen aan Apple Wallet',
  'ticket.wallet.google': 'Toevoegen aan Google Wallet',
  'ticket.wallet.adding': 'Voorbereiden…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet is in deze omgeving niet ingesteld. Voeg EXPYRA_APPLE_PASS_* toe (zie docs/WALLET.md); je kunt het ticket hier nog steeds bekijken.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet is in deze omgeving niet ingesteld. Voeg EXPYRA_GOOGLE_WALLET_* toe (zie docs/WALLET.md); je kunt het ticket hier nog steeds bekijken.',
  'ticket.guests': 'Gasten',
  'ticket.amount': 'Totaal',
  'ticket.status': 'Status',
  'ticket.status.valid': 'Geldig',
  'ticket.status.used': 'Gebruikt',
  'ticket.timeZoneNote': 'lokale tijd in {sehir}',

  'ticket.pdf.kicker': 'Ticket voor een belevenis',
  'ticket.pdf.dateTime': 'Datum en tijd',
  'ticket.pdf.docTitle': 'Expyra-ticket — {baslik}',
  'ticket.pdf.code': 'Ticketcode {kod}',
  'ticket.pdf.notice.valid': 'De host scant deze code bij de ingang. Eenmalig te gebruiken.',
  'ticket.pdf.notice.used': 'Dit ticket is bij de ingang gebruikt.',

  'ticket.error.signedOut': 'Log in om dit ticket te bekijken.',
  'ticket.error.notFound': 'Er bestaat geen ticket met die code.',

  'auth.meta.title': 'Inloggen',
  'auth.title': 'Inloggen of een account aanmaken',
  'auth.back': 'Terug',

  'auth.email.lede': 'Vul je adres in en we sturen je een eenmalige code. Geen wachtwoord.',
  'auth.email.label': 'Je e-mailadres',
  'auth.email.help': 'We sturen de code naar dit adres.',
  'auth.email.placeholder': 'jij@example.com',
  'auth.email.error.invalid': 'Dat adres lijkt niet te kloppen. Voorbeeld: jij@example.com',

  'auth.code.lede': 'We hebben een code van 6 cijfers gestuurd naar:',
  'auth.code.label': 'De code uit je e-mail',
  'auth.code.hint':
    'De code is 10 minuten geldig. Kun je de mail niet vinden, kijk dan in je spammap.',
  'auth.code.resend': 'Nieuwe code sturen',
  'auth.code.changeEmail': 'Een ander adres gebruiken',

  'auth.common.continue': 'Doorgaan',
  'auth.common.working': 'Versturen…',

  'auth.otp.error.invalid': 'Die code klopt niet. Controleer de 6 cijfers in de laatste mail.',
  'auth.otp.error.locked':
    'Te veel pogingen. We hebben deze code geblokkeerd om je account te beschermen — vraag een nieuwe aan.',
  'auth.otp.error.resendTooSoon': {
    one: 'Wacht nog {n} seconde voordat je een nieuwe code aanvraagt.',
    other: 'Wacht nog {n} seconden voordat je een nieuwe code aanvraagt.',
  },

  'auth.error.tooManyRequests': 'Te veel codes aangevraagd. Probeer het over een tijdje opnieuw.',
  'auth.error.suspended': 'Dit account is geschorst. destek@expyra.com',
  'auth.error.expiredChallenge': 'Deze inlogpoging is verlopen. Vul je adres opnieuw in.',

  'account.title': 'Je account',
  'account.lede': 'Wijzig hier je naam en je voorkeurstaal.',

  'account.email.label': 'Je e-mailadres',
  'account.email.note': 'E-mailadressen kunnen nog niet worden gewijzigd.',

  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Gegrilde vis op straat',
  'wallpaper.kitchen.place': 'Een thuiskeuken',
  'wallpaper.kitchen.label': 'Koken met tante',
  'wallpaper.cappadocia.place': 'Cappadocië',
  'wallpaper.cappadocia.label': 'Heteluchtballon',
  'wallpaper.pause': 'Achtergrondvideo pauzeren',
  'wallpaper.play': 'Achtergrondvideo afspelen',
  'account.avatar.label': 'Profielfoto',
  'account.avatar.help': 'JPEG, PNG of WebP · minstens 800×600 pixels · maximaal 10 MB',
  'account.avatar.add': 'Foto toevoegen',
  'account.avatar.change': 'Wijzigen',
  'account.avatar.remove': 'Verwijderen',
  'account.avatar.uploading': 'Uploaden…',
  'account.name.label': 'Je weergavenaam',
  'account.name.help': 'Dit is de naam die anderen zien. Je mag het leeg laten.',
  'account.name.placeholder': 'bijv. Sanne V.',

  'account.language.label': 'Je voorkeurstaal',
  'account.language.help':
    'De taal waarin we je schrijven. De taal van de interface komt uit de adresbalk, niet uit deze keuze.',
  'account.language.none': 'Niet ingesteld',

  'account.save': 'Opslaan',
  'account.saving': 'Opslaan…',
  'account.saved': 'Wijzigingen opgeslagen.',

  'account.error.name': {
    one: 'Een weergavenaam mag maximaal {n} teken lang zijn.',
    other: 'Een weergavenaam mag maximaal {n} tekens lang zijn.',
  },
  'account.error.language': 'Die taal ondersteunen we nog niet. Kies een andere uit de lijst.',
  'account.error.signedOut': 'Je sessie is verlopen. Log opnieuw in.',

  'account.menu.trigger': 'Accountmenu: {ad}',
  'account.menu.title': 'Account',
  'account.menu.signedInAs': 'Ingelogd als {eposta}',
  'account.menu.account': 'Je account',
  'account.menu.signOut': 'Uitloggen',
  'account.menu.fallbackLabel': 'Je account',

  'account.signIn': 'Inloggen',
  'account.loading': 'Je sessie wordt geladen',

  'host.meta.title': 'Word host',

  'host.invite.title': 'Publiceer je eigen belevenis',
  'host.invite.lede':
    'Laat mensen iets zien waar je verstand van hebt, neem ze mee naar plekken waar je toch al komt. Jij bepaalt de prijs, de groepsgrootte, de kalender en het annuleringsbeleid — wij bemoeien ons niet met wat je aanbiedt.',
  'host.invite.noApproval':
    'Geen goedkeuring, geen aanvraagformulier. Zodra je zegt word host, gaat je paneel open.',
  'host.invite.cta': 'Word host',
  'host.invite.pending': 'Openen…',

  'host.signedOut.note':
    'Je moet inloggen voordat je host kunt worden. We vragen geen wachtwoord — we sturen een eenmalige code naar je adres.',
  'host.signedOut.cta': 'Log in om host te worden',

  'host.panel.title': 'Hostpaneel',
  'host.panel.lede':
    'Hier beheer je je belevenissen. Jij bepaalt de prijs, de groep, de kalender en het annuleringsbeleid — wij bemoeien ons niet met wat je aanbiedt.',
  'host.panel.status': 'Je account staat open als host.',
  'host.panel.new': 'Nieuwe belevenis',

  'host.listings.heading': 'Mijn aanbiedingen · {sayi}',
  'host.listings.headingPage': 'Mijn aanbiedingen · {sayi} op deze pagina',
  'host.listings.pager.label': 'Pagina’s met aanbiedingen',
  'host.listings.pager.next': 'Meer aanbiedingen',
  'host.listings.pager.first': 'Terug naar de eerste pagina',
  'host.listings.edit': 'Bewerken',
  'host.listings.view': 'Aanbieding bekijken',
  'host.listings.status.draft': 'Concept',
  'host.listings.status.published': 'Gepubliceerd',
  'host.listings.status.archived': 'Gearchiveerd',

  'host.listings.ready': 'Klaar om te publiceren',
  'host.listings.missing': { one: '{n} veld ontbreekt', other: '{n} velden ontbreken' },

  'host.listings.empty.heading': 'Mijn aanbiedingen',
  'host.listings.empty.title': 'Je hebt nog geen aanbieding',
  'host.listings.empty.body':
    'Open je eerste concept. Je kunt eraan werken zo lang je wilt voordat je publiceert — niemand anders kan een concept zien.',
  'host.listings.empty.cta': 'Schrijf je eerste belevenis',

  'host.listings.errorHeading': 'Mijn aanbiedingen',
  'host.listings.error':
    'We konden je aanbiedingen nu niet laden. Er is niets verwijderd — laad de pagina zo opnieuw.',

  'host.steps.heading': 'Hoe begin ik?',
  'host.steps.describe.title': 'Beschrijf je belevenis',
  'host.steps.describe.body':
    'Titel, beschrijving, duur en groepsgrootte. Schrijf in zoveel talen als je wilt — reizigers lezen het in hun eigen taal.',
  'host.steps.media.title': 'Voeg je foto’s toe',
  'host.steps.media.body':
    'Minstens één omslagfoto. Laat zien hoe de belevenis er echt uitziet; stockfoto’s werken hier niet.',
  'host.steps.pricing.title': 'Stel je kalender en prijs in',
  'host.steps.pricing.body':
    'Welke dagen, hoeveel mensen, hoeveel geld. Je vult de prijs in je eigen valuta in, en in die valuta word je ook uitbetaald.',
  'host.steps.publish.title': 'Publiceer',
  'host.steps.publish.body':
    'Je hoeft nergens op te wachten. Zodra je publiceert, verschijnt je aanbieding in de zoekresultaten.',

  'host.contact.title': 'Schrijf ons als je vastloopt',
  'host.contact.body':
    'We begeleiden de eerste hosts één voor één. Als iets je tegenhoudt terwijl je je aanbieding opzet, of je twijfelt over een keuze, schrijf ons — we zoeken het samen met je uit.',
  'host.contact.cta': 'Schrijf ons',
  'host.contact.howItWorks': 'Hoe het werkt',

  'host.error.blocked': 'Dit account is geschorst en kan daarom geen host worden. destek@expyra.com',

  'host.experience.new.meta.title': 'Nieuwe belevenis',
  'host.experience.new.title': 'Begin een nieuwe belevenis',
  'host.experience.new.lede':
    'We vragen eerst één ding: in welke taal je de aanbieding schrijft. Al het andere vul je in het concept in, in de volgorde die jij wilt.',
  'host.experience.new.language.label': 'In welke taal schrijf je?',
  'host.experience.new.language.help':
    'Dit kan later niet worden gewijzigd: het adres van je aanbieding komt hiervan, en reizigers zien deze tekst als er geen andere taal is geschreven. Je kunt daarna andere talen toevoegen.',
  'host.experience.new.submit': 'Concept openen',
  'host.experience.new.pending': 'Openen…',

  'host.experience.new.next.heading': 'Wat komt er hierna?',
  'host.experience.new.next.text': 'Titel en beschrijving — in zoveel talen als je wilt.',
  'host.experience.new.next.basics': 'Hoe lang het duurt en hoeveel mensen je meeneemt.',
  'host.experience.new.next.place': 'Stad, categorie en de talen die je op de dag spreekt.',
  'host.experience.new.next.publish': 'Publiceer als je klaar bent. Je hoeft nergens op te wachten.',

  'host.experience.edit.meta.title': 'Belevenis bewerken',
  'host.experience.edit.lede':
    'Elk onderdeel wordt apart opgeslagen. Stop waar je wilt — je concept wacht op je.',
  'host.experience.untitled': 'Concept zonder titel',
  'host.experience.back': '← Terug naar het hostpaneel',

  'host.experience.save': 'Opslaan',
  'host.experience.saving': 'Opslaan…',
  'host.experience.saved': 'Opgeslagen.',

  'host.experience.section.text': 'Titel en beschrijving',
  'host.experience.section.textHelp':
    'Dit lezen reizigers voordat ze beslissen. Vertel wat jullie gaan doen, waar jullie afspreken en wat jou ermee verbindt.',
  'host.experience.section.basics': 'Duur en capaciteit',
  'host.experience.section.basicsHelp':
    'Hoe lang één sessie duurt en hoeveel mensen je tegelijk meeneemt. Kalender en prijs komen later.',
  'host.experience.section.place': 'Stad',
  'host.experience.section.placeHelp':
    'Waar de belevenis plaatsvindt. De tijdzone komt hiervan — de tijden van de sessies worden daarin getoond.',
  'host.experience.section.category': 'Categorie',
  'host.experience.section.categoryHelp':
    'Reizigers filteren hierop bij het zoeken. Kies de categorie die het best past; je kunt er maar één kiezen.',
  'host.experience.section.languages': 'Gesproken talen en tags',
  'host.experience.section.languagesHelp':
    'In welke talen begeleid je de belevenis? Dat staat los van de taal waarin je de aanbieding hebt geschreven.',
  'host.experience.section.status': 'Publiceren',
  'host.experience.section.statusHelp':
    'Wat er nodig is om te publiceren, staat hieronder. Er is geen goedkeuringsstap — ontbreekt er niets, dan verschijnt je aanbieding meteen in de zoekresultaten.',

  'host.experience.translations.tabsLabel': 'Talen van de tekst',
  'host.experience.translations.required': 'verplicht',
  'host.experience.translations.optional': 'optioneel',
  'host.experience.translations.add.label': 'In een andere taal schrijven',
  'host.experience.translations.add.submit': 'Openen',
  'host.experience.translations.machine':
    'Deze tekst is automatisch vertaald. Bewerk en sla hem op, dan wordt het je eigen tekst.',

  'host.experience.title.label': 'Titel',
  'host.experience.title.placeholder': 'Streetfoodwandeling in Kadıköy',
  'host.experience.title.help':
    'Kort en concreet. Het is het eerste wat reizigers in de lijst zien, en het adres van je aanbieding komt hiervan.',
  'host.experience.description.label': 'Beschrijving',
  'host.experience.description.placeholder':
    'Waar jullie afspreken, wat jullie doen, wat jullie eten, wat je aantrekt…',
  'host.experience.description.help':
    'Niet verplicht om te publiceren, maar hier beslissen reizigers. Loop de dag op volgorde door.',

  'host.experience.duration.label': 'Duur (uren)',
  'host.experience.duration.help':
    'Totale lengte van één sessie. Bijvoorbeeld 1,5 uur, of 3. Maximaal zeven dagen (168 uur).',
  'host.experience.capacity.label': 'Capaciteit (personen)',
  'host.experience.capacity.help':
    'Het maximale aantal mensen in één sessie. Om te publiceren is minstens één nodig.',

  'host.experience.city.label': 'In welke stad is het?',
  'host.experience.city.placeholder': 'Zoek een stad',
  'host.experience.place.saved': 'Stad gekozen · tijdzone {saat}',
  'host.experience.place.empty': 'Er is nog geen stad gekozen.',
  'host.experience.place.locked':
    'Zodra een aanbieding is gepubliceerd, ligt de stad vast: de tijden van de sessies en de locatie van boekingen hangen ervan af. Voor een andere stad open je een nieuwe aanbieding.',

  'host.experience.category.label': 'Categorie',
  'host.experience.category.none': 'Niet gekozen',
  'host.experience.category.help': 'Waar de belevenis vooral over gaat.',

  'host.experience.spoken.label': 'Talen die je tijdens de belevenis spreekt',
  'host.experience.spoken.help':
    'Los van de taal waarin je de aanbieding schreef: vink de talen aan waarin je de belevenis echt begeleidt. Maximaal tien.',
  'host.experience.spoken.search.label': 'Talen zoeken',
  'host.experience.spoken.search.placeholder': 'Duits, Deutsch, de…',
  'host.experience.spoken.search.results': { one: '{n} taal getoond', other: '{n} talen getoond' },
  'host.experience.spoken.search.none': 'Geen taal gevonden. Aangevinkte talen blijven bewaard.',
  'host.experience.tags.label': 'Tags',
  'host.experience.tags.placeholder': 'streetfood, wandelen, kleine groep',
  'host.experience.tags.help':
    'Scheid met komma’s. Maximaal tien. Ze helpen je aanbieding om bij zoekopdrachten te passen.',

  'host.experience.missing.heading': 'Wat er nodig is om te publiceren',
  'host.experience.ready': 'Alles is klaar. Je kunt deze aanbieding publiceren.',
  'host.experience.missing.translation': 'een titel in de taal waarin de aanbieding is geschreven',
  'host.experience.missing.city': 'een stad',
  'host.experience.missing.category': 'een categorie',
  'host.experience.missing.capacity': 'een capaciteit',
  'host.experience.missing.duration': 'een duur',
  'host.experience.missing.cover': 'een omslagfoto',
  'host.experience.missing.price': 'een prijs',
  'host.experience.missing.unknown': 'een onvolledig veld',

  'host.experience.publish': 'Publiceren',
  'host.experience.republish': 'Opnieuw publiceren',
  'host.experience.publishing': 'Publiceren…',
  'host.experience.published': 'Je aanbieding staat online.',
  'host.experience.unpublish': 'Publicatie intrekken',
  'host.experience.unpublishing': 'Publicatie intrekken…',
  'host.experience.unpublished': 'Aanbieding is weer een concept — verborgen in de zoekresultaten.',
  'host.experience.archive': 'Archiveren',
  'host.experience.archiving': 'Archiveren…',
  'host.experience.archived': 'Aanbieding gearchiveerd.',

  'host.media.heading': 'Foto’s',
  'host.media.hint': 'JPEG, PNG of WebP · minstens 800×600 pixels · maximaal 10 MB · maximaal 12 foto’s',
  'host.media.add': 'Foto’s toevoegen',
  'host.media.drop': 'Sleep bestanden hierheen',
  'host.media.uploading': 'Uploaden…',
  'host.media.empty': 'Nog geen foto’s. De eerste die je uploadt, wordt de omslagfoto.',
  'host.media.cover': 'Omslag',
  'host.media.makeCover': 'Als omslag instellen',
  'host.media.delete': 'Verwijderen',
  'host.media.moveEarlier': 'Naar voren',
  'host.media.moveLater': 'Naar achteren',
  'host.media.position': 'Foto {n}',
  'host.media.error.rejected': 'Die foto is niet geaccepteerd.',
  'host.media.error.unsupported': 'Alleen JPEG, PNG en WebP kunnen worden geüpload.',
  'host.media.error.notUploaded': 'Het uploaden is niet voltooid. Probeer het opnieuw.',
  'host.media.error.notAnImage': 'Dat bestand is geen afbeelding.',
  'host.media.error.mismatch': 'De inhoud van het bestand past niet bij de extensie.',
  'host.media.error.tooSmall': 'Foto’s moeten minstens 800×600 pixels zijn.',
  'host.media.error.tooLarge': 'Bestanden mogen maximaal 10 MB zijn.',
  'host.media.error.limit': 'Een aanbieding kan maximaal 12 foto’s hebben.',

  'host.experience.status.publishedNote':
    'Je aanbieding verschijnt in de zoekresultaten. Trek de publicatie in om er weer een concept van te maken — pas de foto’s aan en publiceer opnieuw. Archiveren verbergt hem ook, zonder te verwijderen.',
  'host.experience.status.privateNote': 'Tot je publiceert, kan niemand behalve jij deze aanbieding zien.',

  'host.experience.error.notFound': 'We konden deze aanbieding niet vinden. Open hem opnieuw vanuit het paneel.',
  'host.experience.error.invalid': 'Dit onderdeel kon niet worden opgeslagen. Controleer de velden en probeer het opnieuw.',
  'host.experience.error.language':
    'Aanbiedingen kunnen niet in die taal worden geschreven. Kies een andere uit de lijst.',
  'host.experience.error.title': 'Een titel is verplicht en mag maximaal 120 tekens lang zijn.',
  'host.experience.error.description': 'De beschrijving mag maximaal 4000 tekens lang zijn.',
  'host.experience.error.duration': 'Vul de duur in uren in: minstens 0,5, maximaal 168.',
  'host.experience.error.capacity': 'Vul de capaciteit in personen in: minstens 1, maximaal 500.',
  'host.experience.error.city': 'Kies de stad uit de lijst — alleen de naam typen is niet genoeg.',
  'host.experience.error.category': 'Kies een categorie uit de lijst.',
  'host.experience.section.itinerary': 'Wat je gaat doen',
  'host.experience.section.itineraryHelp':
    'De stappen van de belevenis, op volgorde. Elke stap is een titel en eventueel een zin of twee. De lijst wordt in de taal van de aanbieding geschreven; de taaltabbladen hierboven gelden hier ook.',
  'host.experience.section.meeting': 'Ontmoetingspunt',
  'host.experience.section.meetingHelp':
    'Waar vinden de gasten je? Het adres is taalonafhankelijk, de instructies zijn in de gekozen taal. Voeg coördinaten toe, dan kunnen gasten de plek op een kaart openen.',
  'host.experience.section.details': 'Goed om te weten',
  'host.experience.section.detailsHelp':
    'Leeftijdsgrens, activiteitsniveau en wat gasten vooraf moeten weten. Lege velden worden niet getoond.',
  'host.experience.textLanguage.note': 'De teksten in dit onderdeel zijn in het {dil}. Gebruik de tabbladen in 01 om van taal te wisselen.',

  'host.experience.itinerary.stepTitle.label': 'Stap {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'We verzamelen bij de Hippodroom',
  'host.experience.itinerary.stepBody.placeholder': 'De wagenrenbaan van Byzantium; hier staan de obelisk en de Slangenzuil.',
  'host.experience.itinerary.add': 'Stap toevoegen',
  'host.experience.itinerary.remove': 'Stap verwijderen',
  'host.experience.itinerary.help': 'Lege regels worden niet opgeslagen. Maximaal 20 stappen.',

  'host.experience.meeting.address.label': 'Adres',
  'host.experience.meeting.address.placeholder': 'Voor de Galatatoren, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Breedtegraad',
  'host.experience.meeting.longitude.label': 'Lengtegraad',
  'host.experience.meeting.coords.help': 'Allebei of geen van beide. Decimaal: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Instructies',
  'host.experience.meeting.instructions.placeholder': 'Bij de noordingang van de toren — zoek de gids met de gele paraplu.',

  'host.experience.details.minimumAge.label': 'Minimumleeftijd',
  'host.experience.details.minimumAge.help': 'Leeg = geen grens. 1–99.',
  'host.experience.details.activityLevel.label': 'Activiteitsniveau',
  'host.experience.details.activityLevel.none': 'Niet opgegeven',
  'host.experience.details.whatToBring.label': 'Wat je meeneemt',
  'host.experience.details.whatToBring.placeholder': 'Water, comfortabele schoenen, een sjaal (voor moskeebezoek)',
  'host.experience.details.notIncluded.label': 'Niet inbegrepen',
  'host.experience.details.notIncluded.placeholder': 'Museumkaartjes, lunch',
  'host.experience.details.accessibility.label': 'Toegankelijkheid',
  'host.experience.details.accessibility.placeholder': 'De route heeft trappen; niet geschikt voor rolstoelen.',

  'host.experience.error.translationMissing': 'Schrijf eerst de titel in deze taal (onderdeel 01) en vul daarna deze velden in.',
  'host.experience.error.minimumAge': 'De minimumleeftijd moet een heel getal tussen 1 en 99 zijn.',
  'host.experience.error.coordinates': 'Breedte- en lengtegraad horen bij elkaar; breedtegraad ±90, lengtegraad ±180.',
  'host.experience.error.itinerary': 'Elke stap heeft een titel nodig; maximaal 20 stappen.',

  'experience.activity.light': 'Licht',
  'experience.activity.moderate': 'Gemiddeld',
  'experience.activity.strenuous': 'Zwaar',

  'host.profile.heading': 'Stel jezelf voor',
  'host.profile.lede':
    'Wordt onder je naam op de pagina van de aanbieding getoond. Wie je bent en waarom jij dit verhaal moet vertellen — twee zinnen zijn genoeg.',
  'host.profile.headline.label': 'Kopregel',
  'host.profile.headline.placeholder': 'Lokale gids en historicus in Istanbul',
  'host.profile.bio.label': 'Over mij',
  'host.profile.bio.placeholder': 'Al tien jaar neem ik mensen mee door de achterstraatjes van de stad…',
  'host.profile.language.label': 'Taal van de tekst',
  'host.profile.error.invalid': 'Kopregel maximaal 80 tekens, bio maximaal 2000.',
  'host.experience.error.spokenLanguages': 'Je kunt maximaal tien talen aanvinken.',
  'host.experience.error.tags': 'Tags mogen niet leeg zijn; maximaal tien, en elk kort.',
  'host.experience.error.publishedConflict':
    'Die wijziging kan niet op een gepubliceerde aanbieding. Archiveer hem eerst en bewerk hem dan.',
  'host.experience.error.publishBlocked': 'Niet gepubliceerd. Ontbreekt nog: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Niet gepubliceerd: de aanbieding is nog niet compleet. Bekijk de lijst hierboven.',

  'category.food-drink': 'Eten en drinken',
  'category.art-culture': 'Kunst en cultuur',
  'category.history-heritage': 'Geschiedenis en erfgoed',
  'category.nature-outdoors': 'Natuur en buitenleven',
  'category.water-sea': 'Water en zee',
  'category.sports-adventure': 'Sport en avontuur',
  'category.crafts-workshops': 'Ambacht en workshops',
  'category.music-nightlife': 'Muziek en nachtleven',
  'category.wellness': 'Wellness',
  'category.photography': 'Fotografie',
  'category.tours-walks': 'Tours en wandelingen',
  'category.local-life': 'Lokaal leven',

  'host.experience.section.pricing': 'Prijs',
  'host.experience.section.pricingHelp':
    'Stel je prijs per persoon in je eigen valuta in. Je wordt altijd in deze valuta uitbetaald; kiest een reiziger een andere, dan wordt alleen de weergave omgerekend.',

  'host.pricing.currency.label': 'Uitbetalingsvaluta',
  'host.pricing.currency.help':
    'De valuta waarin het geld bij je aankomt. Die kan niet meer worden gewijzigd zodra de aanbieding is gepubliceerd — archiveer hem eerst.',
  'host.pricing.currency.locked': 'De valuta is vergrendeld omdat de aanbieding online staat.',
  'host.pricing.currency.placeholder': 'Kiezen',

  'host.pricing.adult.label': 'Volwassene (per persoon)',
  'host.pricing.adult.help': 'Verplicht. Dit is de ‘vanaf’-prijs op kaarten en in de zoekresultaten.',
  'host.pricing.child.label': 'Kind (per persoon)',
  'host.pricing.child.help': 'Laat leeg als je geen kinderprijs aanbiedt. Vul 0 in als het gratis is.',
  'host.pricing.infant.label': 'Baby (per persoon)',
  'host.pricing.infant.help': 'Laat leeg als je geen babyprijs aanbiedt. Vul 0 in als het gratis is.',

  'host.pricing.saved': 'Prijs opgeslagen.',
  'host.pricing.empty': 'Nog geen prijs. Een aanbieding zonder prijs kan niet worden gepubliceerd.',

  'host.pricing.error.currency': 'Kies een geldige valuta.',
  'host.pricing.error.currencyLocked':
    'De valuta van een gepubliceerde aanbieding kan niet worden gewijzigd. Archiveer hem eerst.',
  'host.pricing.error.adult': 'De prijs voor volwassenen is verplicht en moet een geldig bedrag zijn.',
  'host.pricing.error.child': 'De prijs voor kinderen moet een geldig bedrag zijn.',
  'host.pricing.error.infant': 'De prijs voor baby’s moet een geldig bedrag zijn.',
  'host.pricing.error.range':
    'Dat bedrag valt buiten wat de betaalprovider accepteert — het is te klein of te groot.',

  'host.experience.section.schedule': 'Planning',
  'host.experience.section.scheduleHelp':
    'Op welke dagen en tijden bied je dit aan? Tijden zijn in de tijdzone van de stad — het uur dat je invult, blijft staan bij de overgang naar zomer- of wintertijd.',

  'host.schedule.blocked':
    'Voor een planning zijn eerst een stad, een duur en een capaciteit nodig. Maak de onderdelen hierboven af.',
  'host.schedule.timeZone': 'Tijdzone: {bolge}',
  'host.schedule.generatedThrough': 'Je kalender staat klaar tot en met {tarih}.',

  'host.schedule.rule.heading': 'Wekelijkse regel',
  'host.schedule.rule.days': 'Dagen',
  'host.schedule.rule.daysHelp': 'Je kunt er meer kiezen; elke dag wordt een eigen regel.',
  'host.schedule.rule.time': 'Begintijd',
  'host.schedule.rule.timeHelp': 'In de lokale tijd van de stad.',
  'host.schedule.rule.start': 'Vanaf',
  'host.schedule.rule.startHelp': 'Laat leeg om vandaag te beginnen.',
  'host.schedule.rule.submit': 'Regel toevoegen',
  'host.schedule.rule.pending': 'Toevoegen…',
  'host.schedule.rule.stop': 'Verwijderen',
  'host.schedule.rule.stopping': 'Verwijderen…',
  'host.schedule.rule.empty': 'Nog geen wekelijkse regels.',
  'host.schedule.rule.stopped': 'gestopt',

  'host.schedule.blackout.heading': 'Vrije dagen',
  'host.schedule.blackout.start': 'Van',
  'host.schedule.blackout.end': 'Tot',
  'host.schedule.blackout.endHelp': 'Laat leeg om één dag te sluiten. De einddag telt mee.',
  'host.schedule.blackout.submit': 'Sluiten',
  'host.schedule.blackout.pending': 'Sluiten…',
  'host.schedule.blackout.remove': 'Verwijderen',
  'host.schedule.blackout.removing': 'Verwijderen…',
  'host.schedule.blackout.empty': 'Geen vrije dagen.',

  'host.schedule.slots.heading': 'Komende sessies',
  'host.schedule.slots.empty': 'Geen sessies in deze periode.',
  'host.schedule.slots.remaining': {
    one: 'Nog {n} plek',
    other: 'Nog {n} plekken',
  },
  'host.schedule.slots.closed': 'Gesloten',
  'host.schedule.slots.closedByBlackout': 'Vrije dag',
  'host.schedule.slots.close': 'Sluiten',
  'host.schedule.slots.closing': 'Sluiten…',
  'host.schedule.slots.open': 'Openen',
  'host.schedule.slots.opening': 'Openen…',
  'host.schedule.slots.more': 'en nog {n}',

  'host.schedule.day.monday': 'Maandag',
  'host.schedule.day.tuesday': 'Dinsdag',
  'host.schedule.day.wednesday': 'Woensdag',
  'host.schedule.day.thursday': 'Donderdag',
  'host.schedule.day.friday': 'Vrijdag',
  'host.schedule.day.saturday': 'Zaterdag',
  'host.schedule.day.sunday': 'Zondag',

  'host.schedule.ruleSaved': 'Regel toegevoegd en sessies aangemaakt.',
  'host.schedule.ruleStopped': 'Regel gestopt.',
  'host.schedule.slotOpened': 'Sessie geopend.',
  'host.schedule.slotClosed': 'Sessie gesloten.',
  'host.schedule.blackoutSaved': 'Dagen gesloten.',
  'host.schedule.blackoutRemoved': 'Vrije dagen verwijderd.',

  'host.schedule.error.noDay': 'Kies minstens één dag.',
  'host.schedule.error.time': 'Vul de tijd in als UU:MM.',
  'host.schedule.error.date': 'Vul een geldige datum in.',
  'host.schedule.error.range': 'De einddatum kan niet vóór de begindatum liggen.',
  'host.schedule.error.notSchedulable':
    'Voor een planning zijn eerst een stad, een duur en een capaciteit nodig.',
  'host.schedule.error.duplicateRule': 'Er is al een regel op die dag en dat tijdstip.',
  'host.schedule.error.ruleLimit': 'Deze belevenis kan geen extra wekelijkse regels meer krijgen.',
  'host.schedule.error.dstGap':
    'Dat tijdstip bestaat op die dag niet door de overgang naar zomertijd. Probeer een uur later.',
  'host.schedule.error.past': 'Een sessie in het verleden kan niet worden gewijzigd.',
  'host.schedule.error.slotExists': 'Er is al een sessie op dat tijdstip.',
  'host.schedule.error.blackedOut': 'Die datum is gemarkeerd als vrije dag. Verwijder eerst de periode.',
  'host.schedule.error.generated':
    'Een sessie die door een wekelijkse regel is aangemaakt, kan niet worden verwijderd; je kunt hem wel sluiten.',
  'host.schedule.error.hasBookings': 'Een sessie met boekingen kan niet worden gewijzigd.',
  'host.schedule.error.blackoutLimit': 'Er kunnen geen vrije dagen meer worden toegevoegd.',
  'host.schedule.error.horizon': 'De kalender kan niet zo ver vooruit worden geopend.',
  'host.schedule.error.generic': 'Dat lukte nu niet.',
} as const satisfies Dictionary<'nl'>

/**
 * De tekst wordt ook met de bron vergeleken: valt een plaatshouder weg of
 * verandert de naam, dan breekt de compilatie met de naam van de sleutel.
 * `export` is bewust — een ongebruikt type telt in lint als dode code.
 */
export type NlPlaceholders = Assert<PlaceholdersMatchSource<typeof nl>>
