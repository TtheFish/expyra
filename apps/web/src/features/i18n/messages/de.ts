import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Deutsche Benutzeroberfläche.
 *
 * Die Texte sprechen einzelne Nutzer direkt mit „du“ an. Markenname und
 * Supportadresse bleiben unverändert.
 */
export const de = {
  'meta.description': 'Finde lokale Erlebnisse und buche sie.',

  'nav.primaryLabel': 'Hauptmenü',
  'nav.footerLabel': 'Fußzeilenmenü',
  'nav.explore': 'Entdecken',
  'nav.myExperiences': 'Meine Erlebnisse',
  'nav.becomeHost': 'Gastgeber werden',
  'nav.howItWorks': 'So funktioniert es',

  'language.trigger': 'Sprache: {dil}. Ändern.',
  'language.dialogLabel': 'Sprachauswahl',
  'language.search.label': 'Sprachen suchen',
  'language.search.placeholder': 'Sprachen suchen',
  'language.group.ui': 'Oberflächensprachen',
  'language.group.content': 'Weitere Sprachen',
  'language.group.contentHint':
    'Die Oberfläche ist noch nicht übersetzt — Erlebnisse können trotzdem in diesen Sprachen veröffentlicht werden.',
  'language.empty': 'Keine Sprache entspricht dieser Suche.',

  'theme.toLight': 'Zum hellen Design wechseln',
  'theme.toDark': 'Zum dunklen Design wechseln',

  'home.hero.title': 'Eine neue Art,',
  'home.hero.titleAccent': 'Erlebnisse von Einheimischen zu finden',
  'home.hero.lede':
    'Von Menschen, die wirklich dort leben. Kleine Gruppen, echte Menschen, ein paar Stunden, die du nicht vergisst.',
  'home.showcase.heading': 'Erlebnisse auf Expyra',
  'home.showcase.more': 'Alle Erlebnisse ansehen',
  'home.showcase.unavailable':
    'Die Erlebnisse konnten gerade nicht geladen werden. Versuch es gleich noch einmal — die Angebote sind noch da.',
  'home.showcase.empty.title': 'Noch nichts veröffentlicht',
  'home.showcase.empty.body':
    'Du könntest der Erste sein. Zeig einer kleinen Gruppe etwas, das du kennst.',
  'home.showcase.empty.cta': 'Gastgeber werden',

  'search.destination.label': 'Wohin?',
  'search.destination.placeholder': 'Stadt suchen',
  'search.date.label': 'Wann?',
  'search.date.placeholder': 'Datum wählen',
  'search.date.dialogLabel': 'Datum wählen',
  'search.date.day': 'Tag',
  'search.date.month': 'Monat',
  'search.date.year': 'Jahr',
  'search.date.done': 'Fertig',
  'search.date.clear': 'Löschen',
  'search.date.stepUp': 'Vorherige {alan}',
  'search.date.stepDown': 'Nächste {alan}',
  'search.submit': 'Suchen',

  'search.city.listLabel': 'Stadtvorschläge',
  'search.city.countriesHeading': 'Länder',
  'search.city.citiesHeading': 'Städte',
  'search.city.allCountries': 'Alle Länder',
  'search.city.tooShort': 'Gib einen Stadtnamen ein oder wähle ein Land aus der Liste.',
  'search.city.loading': 'Suche läuft…',
  'search.city.error': 'Die Städteliste konnte nicht geladen werden. Versuch es gleich noch einmal.',
  'search.city.empty': 'Keine Stadt entspricht dieser Suche.',
  'search.city.truncated': 'Es gibt weitere Städte — gib mehr ein, um die Auswahl einzugrenzen.',
  'search.city.clear': 'Ausgewählte Stadt entfernen',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} Stadt gefunden', other: '{n} Städte gefunden' },
  'search.city.countryCities': { one: '{n} Stadt', other: '{n} Städte' },

  'search.guests.label': 'Gäste',
  'search.guests.dialogLabel': 'Anzahl der Gäste',
  'search.guests.done': 'Fertig',
  'search.guests.adults': 'Erwachsene',
  'search.guests.adults.hint': 'Ab 13 Jahren',
  'search.guests.adults.decrease': 'Ein Erwachsener weniger',
  'search.guests.adults.increase': 'Ein Erwachsener mehr',
  'search.guests.children': 'Kinder',
  'search.guests.children.hint': '0–12 Jahre',
  'search.guests.children.decrease': 'Ein Kind weniger',
  'search.guests.children.increase': 'Ein Kind mehr',
  'search.guests.summary.adults': { one: '{n} Erwachsener', other: '{n} Erwachsene' },
  'search.guests.summary.children': { one: '{n} Kind', other: '{n} Kinder' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} Stunde', other: '{n} Stunden' },
  'experience.duration.minutes': { one: '{n} Minute', other: '{n} Minuten' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Keine Dauer angegeben',
  'experience.meta': {
    one: '{sure} · bis zu {n} Person',
    other: '{sure} · bis zu {n} Personen',
  },
  'experience.card.perPerson': 'pro Person',
  'experience.card.language': 'Dieses Angebot ist auf {dil} verfasst',

  'explore.heading.all': 'Alle Erlebnisse',
  'explore.heading.city': 'Erlebnisse in {sehir}',
  'explore.heading.query': 'Ergebnisse für „{arama}“',
  'explore.summary': { one: '{n} Erlebnis', other: '{n} Erlebnisse' },
  'explore.summary.page': {
    one: '{n} Erlebnis auf dieser Seite',
    other: '{n} Erlebnisse auf dieser Seite',
  },
  'explore.filtersNotice':
    'Wir grenzen Ergebnisse nur nach Stadt ein — {filtreler} berücksichtigen wir noch nicht.',
  'explore.filter.date': 'das gewählte Datum',
  'explore.filter.guests': 'die Anzahl der Gäste',

  'explore.pager.label': 'Ergebnisseiten',
  'explore.pager.next': 'Nächste Seite',
  'explore.pager.first': 'Zur ersten Seite',

  'explore.pageLink.title': 'Dieser Seitenlink konnte nicht gelesen werden',
  'explore.pageLink.body':
    'Die Seitenangabe in der Adresse scheint beschädigt. Starte die Suche neu — die Ergebnisse sind noch da.',

  'explore.empty.title': 'Hier gibt es noch keine Erlebnisse',
  'explore.empty.body':
    'Wähle eine andere Stadt aus der Liste. Neue Städte und Erlebnisse kommen laufend hinzu.',
  'explore.empty.cta': 'Alle Erlebnisse ansehen',
  'explore.empty.hostCta': 'Werde hier der erste Gastgeber',

  'explore.cityMissing.title': 'Diese Stadt kennen wir nicht',
  'explore.cityMissing.body':
    'Die Stadt in der Adresse steht nicht in unserem Verzeichnis — der Link ist vielleicht veraltet. Wähle im Feld oben eine Stadt aus der Liste.',
  'explore.cityMissing.cta': 'Alle Erlebnisse ansehen',

  'experience.detail.meta.fallback': 'Ein lokales Erlebnis in {sehir}.',
  'experience.detail.text.fallback': 'Diese Beschreibung ist auf {dil}',
  'experience.detail.duration.label': 'Dauer',
  'experience.detail.capacity.label': 'Gruppengröße',
  'experience.detail.capacity.value': {
    one: 'Bis zu {n} Person',
    other: 'Bis zu {n} Personen',
  },
  'experience.detail.about': 'Über dieses Erlebnis',
  'experience.detail.noDescription': 'Der Gastgeber hat noch keine Beschreibung verfasst.',
  'experience.detail.spoken.heading': 'Sprachen während des Erlebnisses',
  'experience.detail.spoken.help':
    'Der Gastgeber führt das Erlebnis in diesen Sprachen durch. Die Sprache des Angebotstextes ist davon unabhängig.',
  'experience.detail.spoken.none': 'Der Gastgeber hat noch keine gesprochenen Sprachen angegeben.',
  'experience.detail.tags.heading': 'Tags',
  'experience.detail.gallery.heading': 'Galerie',
  'experience.detail.host.heading': 'Gastgeber',
  'experience.detail.itinerary.heading': 'Was wir machen',
  'experience.detail.meeting.heading': 'Treffpunkt',
  'experience.detail.meeting.map': 'Auf der Karte öffnen',
  'experience.detail.meeting.mapEmbed': 'Karte des Treffpunkts',
  'experience.detail.meeting.pin': 'Treffpunkt',
  'experience.detail.highlights.host': 'Gastgeber: {ad}',
  'experience.detail.highlights.duration': 'Etwa {sure}',
  'experience.detail.highlights.spoken': 'Wird angeboten auf {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Bis zu {n} Person',
    other: 'Bis zu {n} Personen',
  },
  'experience.detail.highlights.bring': 'Mitbringen',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} Bewertung', other: '{n} Bewertungen' },
  'experience.detail.reviews.stars': { one: '{n} Stern', other: '{n} Sterne' },
  'experience.detail.reviews.demoNote':
    'Beispielbewertungen — echte Bewertungen erscheinen hier, sobald Buchungen live sind.',
  'experience.detail.reviews.showAll': 'Alle Bewertungen anzeigen',
  'experience.detail.reviews.about': 'Erfahre, wie Bewertungen funktionieren.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Rumänien',
  'experience.detail.reviews.demo.1.when': 'vor 1 Tag',
  'experience.detail.reviews.demo.1.body':
    'Unser Guide war kenntnisreich und herzlich. Die Stadt mit ihm zu erkunden fühlte sich ganz anders an.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Mailand, Italien',
  'experience.detail.reviews.demo.2.when': 'vor 3 Tagen',
  'experience.detail.reviews.demo.2.body':
    'Kleine Gruppe, viel Gespräch. Fotostopps waren eingeplant — wir waren begeistert.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brünn, Tschechien',
  'experience.detail.reviews.demo.3.when': 'vor 1 Woche',
  'experience.detail.reviews.demo.3.body':
    'Etwas zügig, aber insgesamt wunderbar. Der letzte Stopp war unser Favorit.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berlin, Deutschland',
  'experience.detail.reviews.demo.4.when': 'vor 2 Wochen',
  'experience.detail.reviews.demo.4.body':
    'Persönlicher als erwartet. Der Gastgeber zeigte uns auch lokale Spezialitäten.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'Istanbul, Türkei',
  'experience.detail.reviews.demo.5.when': 'vor 3 Wochen',
  'experience.detail.reviews.demo.5.body':
    'Organisation einwandfrei. Treffpunkt klar und das Timing passte genau.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Spanien',
  'experience.detail.reviews.demo.6.when': 'vor 1 Monat',
  'experience.detail.reviews.demo.6.body': 'Unser Guide war toll 💕💕',
  'experience.detail.know.heading': 'Gut zu wissen',
  'experience.detail.know.minimumAge': 'Altersgrenze',
  'experience.detail.know.minimumAgeValue': 'Ab {n} Jahren',
  'experience.detail.know.activityLevel': 'Anstrengung',
  'experience.detail.know.whatToBring': 'Mitbringen',
  'experience.detail.know.notIncluded': 'Nicht inbegriffen',
  'experience.detail.know.accessibility': 'Barrierefreiheit',
  'experience.detail.nearby.heading': 'Weitere Erlebnisse in {sehir}',
  'experience.detail.host.anonymous': 'Ein Gastgeber auf Expyra',
  'experience.detail.booking.title': 'Termine und Preis',
  'experience.detail.booking.noSlots':
    'Zurzeit gibt es keine offenen Termine. Sie erscheinen hier, sobald der Gastgeber den Kalender aktualisiert.',
  'experience.detail.booking.perPerson': 'pro Person',
  'experience.detail.booking.pickDate': 'Datum wählen',
  'experience.detail.booking.timeZone': 'Zeiten in {bolge}.',
  'experience.detail.booking.spotsLeft': { one: '{n} Platz frei', other: '{n} Plätze frei' },
  'experience.detail.booking.adults': 'Erwachsene',
  'experience.detail.booking.children': 'Kinder',
  'experience.detail.booking.infants': 'Kleinkinder',
  'experience.detail.booking.currency': 'Währung',
  'experience.detail.booking.currencyNone': 'Währung des Gastgebers',
  'experience.detail.booking.update': 'Preis berechnen',
  'experience.detail.booking.continue': 'Weiter zur Zahlung',
  'experience.detail.booking.pickDateFirst': 'Zuerst Datum wählen',
  'experience.detail.booking.pickDateHint': 'Wähle oben ein Datum, um fortzufahren.',
  'experience.detail.booking.total': 'Gesamt',
  'experience.detail.booking.displayTotal': 'Etwa {tutar}',
  'experience.detail.booking.chargedIn':
    'Du zahlst in {paraBirimi}. Verwendet deine Karte eine andere Währung, rechnet deine Bank zu ihrem eigenen Kurs um.',
  'experience.detail.booking.quoteFailed':
    'Der Preis für diese Auswahl konnte nicht berechnet werden. Vielleicht sind nicht genug Plätze frei oder der Termin wurde geschlossen.',
  'experience.detail.cityLink': 'Alle Erlebnisse in {sehir}',
  'experience.detail.back': 'Zurück zu Entdecken',

  'checkout.title': 'Bestätigen und zahlen',
  'checkout.back': 'Zurück zum Erlebnis',
  'checkout.payment.heading': 'Zahlungsart',
  'checkout.payment.bank': 'Online-Banking',
  'checkout.payment.bankSelect': 'Bank auswählen',
  'checkout.payment.card': 'Kredit- oder Debitkarte',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Mit Bestätigen und Zahlen akzeptierst du Nutzungsbedingungen, Stornierungsrichtlinie und Datenschutzhinweis. Echte Zahlung ist noch nicht angebunden — dieser Schritt zeigt die Oberfläche.',
  'checkout.payment.submit': 'Bestätigen und zahlen',
  'checkout.payment.submitting': 'Wird verarbeitet…',
  'checkout.payment.demoNote': 'Demo: Deine Karte wird nicht belastet und es entsteht keine Buchung.',
  'checkout.success.title': 'Fertig — Demo-Bestätigung',
  'checkout.success.body':
    'Wenn Zahlungsanbieter und Buchungs-API da sind, erscheint hier ein echtes Ticket. Der Ablauf ist vorerst abgeschlossen.',
  'checkout.success.back': 'Zu meinen Erlebnissen',
  'checkout.summary.nonRefundable': 'Diese Reservierung ist nicht erstattungsfähig.',
  'checkout.summary.date': 'Datum',
  'checkout.summary.guests': 'Gäste',
  'checkout.summary.change': 'Ändern',
  'checkout.summary.priceDetails': 'Preisdetails',
  'checkout.summary.total': 'Gesamt {paraBirimi}',

  'howItWorks.lede': 'Drei Schritte, dann bist du fertig.',
  'howItWorks.back': 'Zurück',
  'howItWorks.step.discover.title': 'Entdecken',
  'howItWorks.step.discover.body':
    'Sieh dir lokale Erlebnisse in deiner Stadt an. Kleine Gruppen, echte Gastgeber.',
  'howItWorks.step.book.title': 'Buchen',
  'howItWorks.step.book.body':
    'Wähle Datum und Gruppengröße und sieh den Preis. Buchungen kommen bald.',
  'howItWorks.step.join.title': 'Hingehen',
  'howItWorks.step.join.body': 'Dein Gastgeber begrüßt dich und das Erlebnis beginnt.',
  'howItWorks.backToExplore': 'Zurück zum Entdecken',

  'myExperiences.lede': 'Hier findest du deine Tickets.',
  'myExperiences.upcoming': 'Bevorstehend · {sayi}',
  'myExperiences.past': 'Vergangen · {sayi}',
  'myExperiences.downloadPdf': 'PDF herunterladen',
  'myExperiences.wallet': 'Zu Apple Wallet hinzufügen',
  'myExperiences.wallet.soon': 'Demnächst',
  'myExperiences.rate': 'Bewerten',
  'myExperiences.rate.soon': 'Nach Ende des Erlebnisses verfügbar',

  'ticket.demoBadge': 'Demo-Ticket',
  'ticket.demoNote':
    'Beispielticket: Der QR-Code ist noch nicht signiert und kann am Eingang nicht geprüft werden.',
  'ticket.view.title': 'Dein Ticket',
  'ticket.view.lede': 'Zeig den QR an der Tür oder füge ihn deiner Wallet hinzu.',
  'ticket.view.back': 'Zurück zu meinen Erlebnissen',
  'ticket.wallet.view': 'Ticket anzeigen',
  'ticket.wallet.apple': 'Zu Apple Wallet hinzufügen',
  'ticket.wallet.google': 'Zu Google Wallet hinzufügen',
  'ticket.wallet.adding': 'Wird vorbereitet…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet ist in dieser Umgebung noch nicht eingerichtet. Setze EXPYRA_APPLE_PASS_* (docs/WALLET.md); das Ticket kannst du hier trotzdem ansehen.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet ist in dieser Umgebung noch nicht eingerichtet. Setze EXPYRA_GOOGLE_WALLET_* (docs/WALLET.md); das Ticket kannst du hier trotzdem ansehen.',
  'ticket.guests': 'Gäste',
  'ticket.amount': 'Gesamt',
  'ticket.status': 'Status',
  'ticket.status.valid': 'Gültig',
  'ticket.status.used': 'Verwendet',
  'ticket.timeZoneNote': 'Ortszeit in {sehir}',

  'ticket.pdf.kicker': 'Erlebnisticket',
  'ticket.pdf.dateTime': 'Datum und Uhrzeit',
  'ticket.pdf.docTitle': 'Expyra-Ticket — {baslik}',
  'ticket.pdf.code': 'Ticketcode {kod}',
  'ticket.pdf.notice.valid': 'Der Gastgeber scannt diesen Code am Eingang. Er gilt einmal.',
  'ticket.pdf.notice.used': 'Dieses Ticket wurde am Eingang verwendet.',

  'ticket.error.signedOut': 'Melde dich an, um dieses Ticket anzusehen.',
  'ticket.error.notFound': 'Kein Ticket mit diesem Code gefunden.',

  'auth.meta.title': 'Anmelden',
  'auth.title': 'Anmelden oder Konto erstellen',
  'auth.back': 'Zurück',

  'auth.email.lede': 'Gib deine Adresse ein. Wir senden dir einen einmaligen Code. Kein Passwort.',
  'auth.email.label': 'Deine E-Mail-Adresse',
  'auth.email.help': 'Wir senden den Code an diese Adresse.',
  'auth.email.placeholder': 'du@example.com',
  'auth.email.error.invalid': 'Diese Adresse scheint nicht zu stimmen. Beispiel: du@example.com',

  'auth.code.lede': 'Wir haben einen sechsstelligen Code gesendet an:',
  'auth.code.label': 'Code aus deiner E-Mail',
  'auth.code.hint':
    'Der Code gilt 10 Minuten. Wenn du die E-Mail nicht findest, sieh im Spamordner nach.',
  'auth.code.resend': 'Neuen Code senden',
  'auth.code.changeEmail': 'Andere Adresse verwenden',

  'auth.common.continue': 'Weiter',
  'auth.common.working': 'Wird gesendet…',

  'auth.otp.error.invalid': 'Der Code stimmt nicht. Prüfe die 6 Ziffern in der neuesten E-Mail.',
  'auth.otp.error.locked':
    'Zu viele Versuche. Zum Schutz des Kontos haben wir diesen Code gesperrt — fordere einen neuen an.',
  'auth.otp.error.resendTooSoon': {
    one: 'Warte noch {n} Sekunde, bevor du einen neuen Code anforderst.',
    other: 'Warte noch {n} Sekunden, bevor du einen neuen Code anforderst.',
  },

  'auth.error.tooManyRequests': 'Zu viele Codes angefordert. Versuch es später noch einmal.',
  'auth.error.suspended': 'Dieses Konto ist gesperrt. destek@expyra.com',
  'auth.error.expiredChallenge': 'Dieser Anmeldeversuch ist abgelaufen. Gib deine Adresse erneut ein.',

  'account.title': 'Dein Konto',
  'account.lede': 'Hier änderst du deinen Namen und deine bevorzugte Sprache.',

  'account.email.label': 'Deine E-Mail-Adresse',
  'account.email.note': 'E-Mail-Adressen können noch nicht geändert werden.',

  'wallpaper.istanbul.place': 'Istanbul',
  'wallpaper.istanbul.label': 'Gegrillter Fisch auf der Straße',
  'wallpaper.kitchen.place': 'Eine private Küche',
  'wallpaper.kitchen.label': 'Kochen mit Tante',
  'wallpaper.cappadocia.place': 'Kappadokien',
  'wallpaper.cappadocia.label': 'Heißluftballon',
  'wallpaper.pause': 'Hintergrundvideo pausieren',
  'wallpaper.play': 'Hintergrundvideo abspielen',
  'account.avatar.label': 'Profilfoto',
  'account.avatar.help': 'JPEG, PNG oder WebP · mindestens 800×600 Pixel · bis zu 10 MB',
  'account.avatar.add': 'Foto hinzufügen',
  'account.avatar.change': 'Ändern',
  'account.avatar.remove': 'Entfernen',
  'account.avatar.uploading': 'Wird hochgeladen…',
  'account.name.label': 'Anzeigename',
  'account.name.help': 'Diesen Namen sehen andere. Du kannst das Feld leer lassen.',
  'account.name.placeholder': 'z. B. Alex M.',

  'account.language.label': 'Deine bevorzugte Sprache',
  'account.language.help':
    'Die Sprache, in der wir dir schreiben. Die Sprache der Oberfläche richtet sich nach der Adresse, nicht nach dieser Auswahl.',
  'account.language.none': 'Nicht festgelegt',

  'account.save': 'Speichern',
  'account.saving': 'Wird gespeichert…',
  'account.saved': 'Änderungen gespeichert.',

  'account.error.name': {
    one: 'Ein Anzeigename darf höchstens {n} Zeichen lang sein.',
    other: 'Ein Anzeigename darf höchstens {n} Zeichen lang sein.',
  },
  'account.error.language': 'Diese Sprache unterstützen wir noch nicht. Wähle eine andere aus der Liste.',
  'account.error.signedOut': 'Deine Sitzung ist abgelaufen. Melde dich erneut an.',

  'account.menu.trigger': 'Kontomenü: {ad}',
  'account.menu.title': 'Konto',
  'account.menu.signedInAs': 'Angemeldet als {eposta}',
  'account.menu.account': 'Dein Konto',
  'account.menu.signOut': 'Abmelden',
  'account.menu.fallbackLabel': 'Dein Konto',

  'account.signIn': 'Anmelden',
  'account.loading': 'Deine Sitzung wird geladen',

  'host.meta.title': 'Gastgeber werden',

  'host.invite.title': 'Veröffentliche dein eigenes Erlebnis',
  'host.invite.lede':
    'Zeig anderen etwas, das du kennst, und nimm sie mit an einen vertrauten Ort. Preis, Gruppengröße, Kalender und Stornobedingungen bestimmst du — dein Angebot bleibt deine Sache.',
  'host.invite.noApproval':
    'Kein Prüfverfahren, kein Bewerbungsformular. Sobald du Gastgeber werden willst, öffnet sich dein Bereich.',
  'host.invite.cta': 'Gastgeber werden',
  'host.invite.pending': 'Wird geöffnet…',

  'host.signedOut.note':
    'Melde dich an, bevor du Gastgeber wirst. Wir verlangen kein Passwort — du erhältst einen einmaligen Code per E-Mail.',
  'host.signedOut.cta': 'Anmelden und Gastgeber werden',

  'host.panel.title': 'Gastgeberbereich',
  'host.panel.lede':
    'Hier verwaltest du deine Erlebnisse. Preis, Gruppe, Kalender und Stornobedingungen bestimmst du — dein Angebot bleibt deine Sache.',
  'host.panel.status': 'Dein Konto ist als Gastgeber freigeschaltet.',
  'host.panel.new': 'Neues Erlebnis',

  'host.listings.heading': 'Meine Angebote · {sayi}',
  'host.listings.edit': 'Bearbeiten',
  'host.listings.view': 'Angebot ansehen',
  'host.listings.status.draft': 'Entwurf',
  'host.listings.status.published': 'Veröffentlicht',
  'host.listings.status.archived': 'Archiviert',

  'host.listings.ready': 'Bereit zur Veröffentlichung',
  'host.listings.missing': { one: '{n} Feld fehlt', other: '{n} Felder fehlen' },

  'host.listings.empty.heading': 'Meine Angebote',
  'host.listings.empty.title': 'Du hast noch kein Angebot',
  'host.listings.empty.body':
    'Öffne deinen ersten Entwurf. Du kannst ihn vor der Veröffentlichung beliebig lange bearbeiten — niemand sonst sieht ihn.',
  'host.listings.empty.cta': 'Erstes Erlebnis beschreiben',

  'host.listings.errorHeading': 'Meine Angebote',
  'host.listings.error':
    'Deine Angebote konnten gerade nicht geladen werden. Nichts wurde gelöscht — lade die Seite gleich neu.',

  'host.steps.heading': 'Wie fange ich an?',
  'host.steps.describe.title': 'Beschreibe dein Erlebnis',
  'host.steps.describe.body':
    'Titel, Beschreibung, Dauer und Gruppengröße. Schreib in so vielen Sprachen, wie du willst — Reisende lesen es in ihrer Sprache.',
  'host.steps.media.title': 'Füge Fotos hinzu',
  'host.steps.media.body':
    'Mindestens ein Titelbild. Zeig, wie das Erlebnis wirklich aussieht; Stockfotos passen hier nicht.',
  'host.steps.pricing.title': 'Lege Kalender und Preis fest',
  'host.steps.pricing.body':
    'An welchen Tagen, mit wie vielen Menschen, zu welchem Preis. Du gibst den Preis in deiner Währung an und wirst darin ausgezahlt.',
  'host.steps.publish.title': 'Veröffentlichen',
  'host.steps.publish.body':
    'Keine Wartezeit. Sobald du veröffentlichst, erscheint dein Angebot in der Suche.',

  'host.contact.title': 'Schreib uns, wenn du nicht weiterkommst',
  'host.contact.body':
    'Wir betreuen die ersten Gastgeber einzeln. Wenn dich beim Erstellen deines Angebots etwas aufhält oder du bei einer Entscheidung unsicher bist, schreib uns — wir klären es gemeinsam.',
  'host.contact.cta': 'Uns schreiben',
  'host.contact.howItWorks': 'So funktioniert es',

  'host.error.blocked':
    'Dieses Konto ist gesperrt und kann kein Gastgeberkonto werden. destek@expyra.com',

  'host.experience.new.meta.title': 'Neues Erlebnis',
  'host.experience.new.title': 'Neues Erlebnis anlegen',
  'host.experience.new.lede':
    'Zuerst brauchen wir nur die Sprache, in der du das Angebot schreibst. Alles Weitere trägst du im Entwurf in beliebiger Reihenfolge ein.',
  'host.experience.new.language.label': 'In welcher Sprache schreibst du?',
  'host.experience.new.language.help':
    'Diese Auswahl kannst du später nicht ändern: Sie bestimmt die Adresse deines Angebots und diesen Text sehen Reisende, wenn keine andere Sprache vorhanden ist. Weitere Sprachen kannst du später hinzufügen.',
  'host.experience.new.submit': 'Entwurf öffnen',
  'host.experience.new.pending': 'Wird geöffnet…',

  'host.experience.new.next.heading': 'Wie geht es weiter?',
  'host.experience.new.next.text': 'Titel und Beschreibung — in so vielen Sprachen, wie du willst.',
  'host.experience.new.next.basics': 'Dauer und maximale Teilnehmerzahl.',
  'host.experience.new.next.place': 'Stadt, Kategorie und die Sprachen, die du vor Ort sprichst.',
  'host.experience.new.next.publish': 'Veröffentliche, sobald du fertig bist. Es gibt keine Wartezeit.',

  'host.experience.edit.meta.title': 'Erlebnis bearbeiten',
  'host.experience.edit.lede':
    'Jeder Abschnitt wird einzeln gespeichert. Hör auf, wann du willst — dein Entwurf wartet auf dich.',
  'host.experience.untitled': 'Entwurf ohne Titel',
  'host.experience.back': '← Zurück zum Gastgeberbereich',

  'host.experience.save': 'Speichern',
  'host.experience.saving': 'Wird gespeichert…',
  'host.experience.saved': 'Gespeichert.',

  'host.experience.section.text': 'Titel und Beschreibung',
  'host.experience.section.textHelp':
    'Das lesen Reisende, bevor sie sich entscheiden. Beschreibe, was ihr macht, wo ihr euch trefft und was dich damit verbindet.',
  'host.experience.section.basics': 'Dauer und Kapazität',
  'host.experience.section.basicsHelp':
    'Wie lange ein Termin dauert und wie viele Menschen gleichzeitig teilnehmen können. Kalender und Preis kommen später.',
  'host.experience.section.place': 'Stadt',
  'host.experience.section.placeHelp':
    'Wo das Erlebnis stattfindet. Daraus ergibt sich die Zeitzone, in der Termine angezeigt werden.',
  'host.experience.section.category': 'Kategorie',
  'host.experience.section.categoryHelp':
    'Danach filtern Reisende in der Suche. Wähle die passendste Kategorie; nur eine ist möglich.',
  'host.experience.section.languages': 'Gesprochene Sprachen und Tags',
  'host.experience.section.languagesHelp':
    'In welchen Sprachen führst du das Erlebnis durch? Das ist unabhängig von der Sprache des Angebotstextes.',
  'host.experience.section.status': 'Veröffentlichung',
  'host.experience.section.statusHelp':
    'Was zur Veröffentlichung fehlt, steht unten. Es gibt keine Prüfung — sobald alles vollständig ist, erscheint dein Angebot direkt in der Suche.',

  'host.experience.translations.tabsLabel': 'Sprachen des Angebotstextes',
  'host.experience.translations.required': 'erforderlich',
  'host.experience.translations.optional': 'optional',
  'host.experience.translations.add.label': 'In einer weiteren Sprache schreiben',
  'host.experience.translations.add.submit': 'Öffnen',
  'host.experience.translations.machine':
    'Dieser Text wurde automatisch übersetzt. Wenn du ihn bearbeitest und speicherst, wird er zu deinem eigenen Text.',

  'host.experience.title.label': 'Titel',
  'host.experience.title.placeholder': 'Streetfood-Rundgang in Kadıköy',
  'host.experience.title.help':
    'Kurz und konkret. Reisende sehen ihn zuerst in der Liste, und daraus entsteht die Adresse deines Angebots.',
  'host.experience.description.label': 'Beschreibung',
  'host.experience.description.placeholder':
    'Wo ihr euch trefft, was ihr macht, was ihr esst, was ihr anzieht…',
  'host.experience.description.help':
    'Für die Veröffentlichung nicht erforderlich, aber hier entscheiden sich Reisende. Beschreibe den Ablauf der Reihe nach.',

  'host.experience.duration.label': 'Dauer (Stunden)',
  'host.experience.duration.help':
    'Gesamtdauer eines Termins. Zum Beispiel 1,5 oder 3 Stunden. Höchstens sieben Tage (168 Stunden).',
  'host.experience.capacity.label': 'Kapazität (Personen)',
  'host.experience.capacity.help':
    'Maximale Teilnehmerzahl pro Termin. Für die Veröffentlichung ist mindestens ein Platz nötig.',

  'host.experience.city.label': 'In welcher Stadt findet es statt?',
  'host.experience.city.placeholder': 'Stadt suchen',
  'host.experience.place.saved': 'Stadt ausgewählt · Zeitzone {saat}',
  'host.experience.place.empty': 'Noch keine Stadt ausgewählt.',
  'host.experience.place.locked':
    'Nach der Veröffentlichung ist die Stadt festgelegt: Terminzeiten und Buchungsorte hängen davon ab. Lege für eine andere Stadt ein neues Angebot an.',

  'host.experience.category.label': 'Kategorie',
  'host.experience.category.none': 'Nicht ausgewählt',
  'host.experience.category.help': 'Worum es bei dem Erlebnis hauptsächlich geht.',

  'host.experience.spoken.label': 'Sprachen, die du während des Erlebnisses sprichst',
  'host.experience.spoken.help':
    'Unabhängig von der Sprache des Angebotstextes: Wähle die Sprachen, in denen du es tatsächlich durchführst. Höchstens zehn.',
  'host.experience.spoken.search.label': 'Sprache suchen',
  'host.experience.spoken.search.placeholder': 'Deutsch, German, de…',
  'host.experience.spoken.search.results': { one: '{n} Sprache in der Liste', other: '{n} Sprachen in der Liste' },
  'host.experience.spoken.search.none': 'Keine passende Sprache. Angekreuzte Sprachen bleiben erhalten.',
  'host.experience.tags.label': 'Tags',
  'host.experience.tags.placeholder': 'Streetfood, Rundgang, kleine Gruppe',
  'host.experience.tags.help':
    'Mit Kommas trennen. Höchstens zehn. Sie helfen, dein Angebot passenden Suchen zuzuordnen.',

  'host.experience.missing.heading': 'Für die Veröffentlichung erforderlich',
  'host.experience.ready': 'Alles fertig. Du kannst dieses Angebot veröffentlichen.',
  'host.experience.missing.translation': 'ein Titel in der Sprache des Angebots',
  'host.experience.missing.city': 'eine Stadt',
  'host.experience.missing.category': 'eine Kategorie',
  'host.experience.missing.capacity': 'eine Kapazität',
  'host.experience.missing.duration': 'eine Dauer',
  'host.experience.missing.cover': 'ein Titelbild',
  'host.experience.missing.price': 'ein Preis',
  'host.experience.missing.unknown': 'ein unvollständiges Feld',

  'host.experience.publish': 'Veröffentlichen',
  'host.experience.republish': 'Erneut veröffentlichen',
  'host.experience.publishing': 'Wird veröffentlicht…',
  'host.experience.published': 'Dein Angebot ist online.',
  'host.experience.unpublish': 'Zurückziehen',
  'host.experience.unpublishing': 'Wird zurückgezogen…',
  'host.experience.unpublished': 'Angebot ist wieder Entwurf — in der Suche unsichtbar.',
  'host.experience.archive': 'Archivieren',
  'host.experience.archiving': 'Wird archiviert…',
  'host.experience.archived': 'Angebot archiviert.',

  'host.media.heading': 'Fotos',
  'host.media.hint':
    'JPEG, PNG oder WebP · mindestens 800×600 Pixel · bis zu 10 MB · höchstens 12 Fotos',
  'host.media.add': 'Fotos hinzufügen',
  'host.media.drop': 'Dateien hier ablegen',
  'host.media.uploading': 'Wird hochgeladen…',
  'host.media.empty': 'Noch keine Fotos. Das erste hochgeladene Foto wird zum Titelbild.',
  'host.media.cover': 'Titelbild',
  'host.media.makeCover': 'Als Titelbild festlegen',
  'host.media.delete': 'Löschen',
  'host.media.moveEarlier': 'Nach vorn verschieben',
  'host.media.moveLater': 'Nach hinten verschieben',
  'host.media.position': 'Foto {n}',
  'host.media.error.rejected': 'Dieses Foto wurde nicht angenommen.',
  'host.media.error.unsupported': 'Nur JPEG, PNG und WebP können hochgeladen werden.',
  'host.media.error.notUploaded': 'Der Upload wurde nicht abgeschlossen. Versuch es erneut.',
  'host.media.error.notAnImage': 'Diese Datei ist kein Bild.',
  'host.media.error.mismatch': 'Der Dateiinhalt passt nicht zur Dateiendung.',
  'host.media.error.tooSmall': 'Fotos müssen mindestens 800×600 Pixel groß sein.',
  'host.media.error.tooLarge': 'Dateien dürfen höchstens 10 MB groß sein.',
  'host.media.error.limit': 'Ein Angebot darf höchstens 12 Fotos enthalten.',

  'host.experience.status.publishedNote':
    'Dein Angebot erscheint in der Suche. Mit „Zurückziehen“ wird es wieder Entwurf — Fotos ändern, dann erneut veröffentlichen. Archivieren blendet es ebenfalls aus, ohne zu löschen.',
  'host.experience.status.privateNote':
    'Bis zur Veröffentlichung kannst nur du dieses Angebot sehen.',

  'host.experience.error.notFound':
    'Dieses Angebot wurde nicht gefunden. Öffne es erneut im Gastgeberbereich.',
  'host.experience.error.invalid':
    'Dieser Abschnitt konnte nicht gespeichert werden. Prüfe die Felder und versuch es erneut.',
  'host.experience.error.language':
    'Angebote können nicht in dieser Sprache verfasst werden. Wähle eine andere aus der Liste.',
  'host.experience.error.title': 'Ein Titel ist erforderlich und darf höchstens 120 Zeichen lang sein.',
  'host.experience.error.description': 'Die Beschreibung darf höchstens 4000 Zeichen lang sein.',
  'host.experience.error.duration': 'Gib die Dauer in Stunden an: mindestens 0,5, höchstens 168.',
  'host.experience.error.capacity': 'Gib die Kapazität in Personen an: mindestens 1, höchstens 500.',
  'host.experience.error.city':
    'Wähle die Stadt aus der Liste — nur den Namen einzugeben reicht nicht.',
  'host.experience.error.category': 'Wähle eine Kategorie aus der Liste.',
  'host.experience.section.itinerary': 'Was wir machen',
  'host.experience.section.itineraryHelp':
    'Die Schritte des Erlebnisses, der Reihe nach. Jeder Schritt hat einen Titel und optional ein, zwei Sätze. Die Liste wird in der Sprache des Angebots geschrieben; die Sprachreiter oben gelten auch hier.',
  'host.experience.section.meeting': 'Treffpunkt',
  'host.experience.section.meetingHelp':
    'Wo finden dich die Gäste? Die Adresse ist sprachunabhängig, die Hinweise sind in der gewählten Sprache. Mit Koordinaten können Gäste den Ort auf der Karte öffnen.',
  'host.experience.section.details': 'Gut zu wissen',
  'host.experience.section.detailsHelp':
    'Altersgrenze, Anstrengung und was Gäste vorher wissen sollten. Leere Felder werden nicht angezeigt.',
  'host.experience.textLanguage.note': 'Die Texte in diesem Abschnitt sind auf {dil}. Die Sprache wechselst du über die Reiter in 01.',

  'host.experience.itinerary.stepTitle.label': 'Schritt {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Wir treffen uns am Hippodrom',
  'host.experience.itinerary.stepBody.placeholder': 'Die byzantinische Wagenrennbahn; hier stehen der Obelisk und die Schlangensäule.',
  'host.experience.itinerary.add': 'Schritt hinzufügen',
  'host.experience.itinerary.remove': 'Schritt entfernen',
  'host.experience.itinerary.help': 'Leere Zeilen werden nicht gespeichert. Höchstens 20 Schritte.',

  'host.experience.meeting.address.label': 'Adresse',
  'host.experience.meeting.address.placeholder': 'Vor dem Galata-Turm, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Breitengrad',
  'host.experience.meeting.longitude.label': 'Längengrad',
  'host.experience.meeting.coords.help': 'Beide oder keins. Dezimal: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Hinweise',
  'host.experience.meeting.instructions.placeholder': 'Nordtor des Turms, halte nach dem Guide mit dem gelben Schirm Ausschau.',

  'host.experience.details.minimumAge.label': 'Mindestalter',
  'host.experience.details.minimumAge.help': 'Leer = keine Grenze. 1–99.',
  'host.experience.details.activityLevel.label': 'Anstrengung',
  'host.experience.details.activityLevel.none': 'Nicht angegeben',
  'host.experience.details.whatToBring.label': 'Mitbringen',
  'host.experience.details.whatToBring.placeholder': 'Wasser, bequeme Schuhe, ein Tuch (für Moscheebesuche)',
  'host.experience.details.notIncluded.label': 'Nicht inbegriffen',
  'host.experience.details.notIncluded.placeholder': 'Museumstickets, Mittagessen',
  'host.experience.details.accessibility.label': 'Barrierefreiheit',
  'host.experience.details.accessibility.placeholder': 'Die Route hat Treppen; nicht für Rollstühle geeignet.',

  'host.experience.error.translationMissing': 'Schreib zuerst den Titel in dieser Sprache (Abschnitt 01), dann diese Felder.',
  'host.experience.error.minimumAge': 'Das Mindestalter muss eine ganze Zahl zwischen 1 und 99 sein.',
  'host.experience.error.coordinates': 'Breiten- und Längengrad gehören zusammen; Breite ±90, Länge ±180.',
  'host.experience.error.itinerary': 'Jeder Schritt braucht einen Titel; höchstens 20 Schritte.',

  'experience.activity.light': 'Leicht',
  'experience.activity.moderate': 'Mittel',
  'experience.activity.strenuous': 'Anstrengend',

  'host.profile.heading': 'Stell dich vor',
  'host.profile.lede':
    'Erscheint unter deinem Namen auf der Angebotsseite. Wer du bist und warum gerade du diese Geschichte erzählen solltest — zwei Sätze reichen.',
  'host.profile.headline.label': 'Kurzbeschreibung',
  'host.profile.headline.placeholder': 'Lokaler Guide und Historiker in Istanbul',
  'host.profile.bio.label': 'Über mich',
  'host.profile.bio.placeholder': 'Seit zehn Jahren führe ich Menschen durch die Gassen der Stadt…',
  'host.profile.language.label': 'Sprache des Textes',
  'host.profile.error.invalid': 'Kurzbeschreibung höchstens 80 Zeichen, Vorstellung höchstens 2000.',
  'host.experience.error.spokenLanguages': 'Du kannst höchstens zehn Sprachen auswählen.',
  'host.experience.error.tags': 'Tags dürfen nicht leer sein; höchstens zehn und alle kurz.',
  'host.experience.error.publishedConflict':
    'Diese Änderung ist bei einem veröffentlichten Angebot nicht möglich. Archiviere es zuerst und bearbeite es dann.',
  'host.experience.error.publishBlocked': 'Nicht veröffentlicht. Es fehlt noch: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Nicht veröffentlicht: Das Angebot ist noch unvollständig. Prüfe die Liste oben.',

  'category.food-drink': 'Essen und Trinken',
  'category.art-culture': 'Kunst und Kultur',
  'category.history-heritage': 'Geschichte und Kulturerbe',
  'category.nature-outdoors': 'Natur und Outdoor',
  'category.water-sea': 'Wasser und Meer',
  'category.sports-adventure': 'Sport und Abenteuer',
  'category.crafts-workshops': 'Handwerk und Workshops',
  'category.music-nightlife': 'Musik und Nachtleben',
  'category.wellness': 'Wellness',
  'category.photography': 'Fotografie',
  'category.tours-walks': 'Touren und Rundgänge',
  'category.local-life': 'Lokales Leben',

  'host.experience.section.pricing': 'Preis',
  'host.experience.section.pricingHelp':
    'Lege deinen Preis pro Person in deiner eigenen Währung fest. Du wirst immer in dieser Währung ausgezahlt; wählt ein Reisender eine andere, wird nur die Anzeige umgerechnet.',

  'host.pricing.currency.label': 'Auszahlungswährung',
  'host.pricing.currency.help':
    'Die Währung, in der du dein Geld erhältst. Nach der Veröffentlichung kannst du sie nicht ändern — archiviere das Angebot zuerst.',
  'host.pricing.currency.locked': 'Die Währung ist gesperrt, weil das Angebot veröffentlicht ist.',
  'host.pricing.currency.placeholder': 'Auswählen',

  'host.pricing.adult.label': 'Erwachsener (pro Person)',
  'host.pricing.adult.help': 'Erforderlich. Das ist der Preis „ab“, der auf Karten und in der Suche steht.',
  'host.pricing.child.label': 'Kind (pro Person)',
  'host.pricing.child.help': 'Leer lassen, wenn du keinen Kinderpreis anbietest. 0 eingeben, wenn es kostenlos ist.',
  'host.pricing.infant.label': 'Kleinkind (pro Person)',
  'host.pricing.infant.help':
    'Leer lassen, wenn du keinen Preis für Kleinkinder anbietest. 0 eingeben, wenn es kostenlos ist.',

  'host.pricing.saved': 'Preis gespeichert.',
  'host.pricing.empty': 'Noch kein Preis. Ein Angebot ohne Preis kann nicht veröffentlicht werden.',

  'host.pricing.error.currency': 'Wähle eine gültige Währung.',
  'host.pricing.error.currencyLocked':
    'Die Währung eines veröffentlichten Angebots kann nicht geändert werden. Archiviere es zuerst.',
  'host.pricing.error.adult': 'Der Erwachsenenpreis ist erforderlich und muss ein gültiger Betrag sein.',
  'host.pricing.error.child': 'Der Kinderpreis muss ein gültiger Betrag sein.',
  'host.pricing.error.infant': 'Der Preis für Kleinkinder muss ein gültiger Betrag sein.',
  'host.pricing.error.range':
    'Dieser Betrag liegt außerhalb des zulässigen Bereichs des Zahlungsanbieters — er ist zu niedrig oder zu hoch.',

  'host.experience.section.schedule': 'Zeitplan',
  'host.experience.section.scheduleHelp':
    'An welchen Tagen und zu welchen Zeiten findet es statt? Die Zeiten richten sich nach der Zeitzone der Stadt — die eingegebene Uhrzeit bleibt bei Zeitumstellungen gleich.',

  'host.schedule.blocked':
    'Für einen Zeitplan brauchst du zuerst eine Stadt, eine Dauer und eine Kapazität. Schließe die Abschnitte oben ab.',
  'host.schedule.timeZone': 'Zeitzone: {bolge}',
  'host.schedule.generatedThrough': 'Dein Kalender ist bis {tarih} vorbereitet.',

  'host.schedule.rule.heading': 'Wöchentliche Regel',
  'host.schedule.rule.days': 'Tage',
  'host.schedule.rule.daysHelp': 'Du kannst mehrere wählen; jeder Tag wird zu einer eigenen Regel.',
  'host.schedule.rule.time': 'Startzeit',
  'host.schedule.rule.timeHelp': 'In der Ortszeit der Stadt.',
  'host.schedule.rule.start': 'Beginn',
  'host.schedule.rule.startHelp': 'Leer lassen, um heute zu beginnen.',
  'host.schedule.rule.submit': 'Regel hinzufügen',
  'host.schedule.rule.pending': 'Wird hinzugefügt…',
  'host.schedule.rule.stop': 'Entfernen',
  'host.schedule.rule.stopping': 'Wird entfernt…',
  'host.schedule.rule.empty': 'Noch keine wöchentlichen Regeln.',
  'host.schedule.rule.stopped': 'beendet',

  'host.schedule.blackout.heading': 'Freie Tage',
  'host.schedule.blackout.start': 'Von',
  'host.schedule.blackout.end': 'Bis',
  'host.schedule.blackout.endHelp':
    'Leer lassen, um nur einen Tag zu schließen. Der Endtag ist eingeschlossen.',
  'host.schedule.blackout.submit': 'Schließen',
  'host.schedule.blackout.pending': 'Wird geschlossen…',
  'host.schedule.blackout.remove': 'Entfernen',
  'host.schedule.blackout.removing': 'Wird entfernt…',
  'host.schedule.blackout.empty': 'Keine freien Tage.',

  'host.schedule.slots.heading': 'Bevorstehende Termine',
  'host.schedule.slots.empty': 'Keine Termine in diesem Zeitraum.',
  'host.schedule.slots.remaining': {
    one: '{n} Platz frei',
    other: '{n} Plätze frei',
  },
  'host.schedule.slots.closed': 'Geschlossen',
  'host.schedule.slots.closedByBlackout': 'Freier Tag',
  'host.schedule.slots.close': 'Schließen',
  'host.schedule.slots.closing': 'Wird geschlossen…',
  'host.schedule.slots.open': 'Öffnen',
  'host.schedule.slots.opening': 'Wird geöffnet…',
  'host.schedule.slots.more': 'und {n} weitere',

  'host.schedule.day.monday': 'Montag',
  'host.schedule.day.tuesday': 'Dienstag',
  'host.schedule.day.wednesday': 'Mittwoch',
  'host.schedule.day.thursday': 'Donnerstag',
  'host.schedule.day.friday': 'Freitag',
  'host.schedule.day.saturday': 'Samstag',
  'host.schedule.day.sunday': 'Sonntag',

  'host.schedule.ruleSaved': 'Regel hinzugefügt und Termine erstellt.',
  'host.schedule.ruleStopped': 'Regel beendet.',
  'host.schedule.slotOpened': 'Termin geöffnet.',
  'host.schedule.slotClosed': 'Termin geschlossen.',
  'host.schedule.blackoutSaved': 'Tage geschlossen.',
  'host.schedule.blackoutRemoved': 'Freie Tage entfernt.',

  'host.schedule.error.noDay': 'Wähle mindestens einen Tag.',
  'host.schedule.error.time': 'Gib die Zeit als HH:MM ein.',
  'host.schedule.error.date': 'Gib ein gültiges Datum ein.',
  'host.schedule.error.range': 'Das Enddatum darf nicht vor dem Startdatum liegen.',
  'host.schedule.error.notSchedulable':
    'Für einen Zeitplan brauchst du zuerst eine Stadt, eine Dauer und eine Kapazität.',
  'host.schedule.error.duplicateRule': 'Für diesen Tag und diese Uhrzeit gibt es bereits eine Regel.',
  'host.schedule.error.ruleLimit': 'Für dieses Erlebnis können keine weiteren Wochenregeln angelegt werden.',
  'host.schedule.error.dstGap':
    'Diese Uhrzeit gibt es an diesem Tag wegen der Zeitumstellung nicht. Versuch es eine Stunde später.',
  'host.schedule.error.past': 'Ein vergangener Termin kann nicht geändert werden.',
  'host.schedule.error.slotExists': 'Zu dieser Uhrzeit gibt es bereits einen Termin.',
  'host.schedule.error.blackedOut': 'Dieses Datum ist als freier Tag markiert. Entferne zuerst den Zeitraum.',
  'host.schedule.error.generated':
    'Ein durch eine Wochenregel erstellter Termin kann nicht gelöscht werden; du kannst ihn schließen.',
  'host.schedule.error.hasBookings': 'Ein Termin mit Buchungen kann nicht geändert werden.',
  'host.schedule.error.blackoutLimit': 'Es können keine weiteren freien Tage hinzugefügt werden.',
  'host.schedule.error.horizon': 'Der Kalender kann nicht so weit im Voraus geöffnet werden.',
  'host.schedule.error.generic': 'Das hat gerade nicht funktioniert.',
} as const satisfies Dictionary<'de'>

export type DePlaceholders = Assert<PlaceholdersMatchSource<typeof de>>
