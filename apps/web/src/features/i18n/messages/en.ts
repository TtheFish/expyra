import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * İngilizce arayüz.
 *
 * `satisfies Dictionary<'en'>` iki şeyi zorluyor: kaynaktaki her anahtar burada
 * VAR ve çoğul anahtarlar İngilizce'nin CLDR biçimlerini (`one` + `other`)
 * taşıyor. `as const` literalleri koruyor ki aşağıdaki yer tutucu kontrolü
 * metnin içini okuyabilsin.
 *
 * **Ton (VISION §6):** ürün acenteye değil bireye konuşuyor. Türkçe metinler
 * "sen" diliyle yazıldı; İngilizce karşılıkları da doğrudan, kısa ve söz veren
 * cümleler — pazarlama sıfatı yok, "please" yok, ünlem yok. "Bildiğin bir şeyi
 * anlat" bir slogan değil, bir davet; çevirisi de öyle.
 *
 * Çevrilmeyen iki şey var ve ikisi de bilinçli: marka adı (Expyra) ve destek
 * adresi (`destek@expyra.com` — var olan tek kutu bu; İngilizce bir adres
 * uydurmak, gelen postanın hiçbir yere ulaşmaması demekti).
 */
export const en = {
  'meta.description': 'Find local experiences and book them.',

  'nav.primaryLabel': 'Main menu',
  'nav.footerLabel': 'Footer menu',
  'nav.explore': 'Explore',
  'nav.myExperiences': 'My experiences',
  'nav.becomeHost': 'Become a host',
  'nav.howItWorks': 'How it works',

  'language.trigger': 'Language: {dil}. Change.',
  'language.dialogLabel': 'Language selection',
  'language.search.label': 'Search languages',
  'language.search.placeholder': 'Search languages',
  'language.group.ui': 'Interface languages',
  'language.group.content': 'Other languages',
  'language.group.contentHint':
    'No interface translation yet — experiences can still be published in these languages.',
  'language.empty': 'No language matches that search.',

  'theme.toLight': 'Switch to the light theme',
  'theme.toDark': 'Switch to the dark theme',

  // Vurgu Türkçe'de "keşfetmenin yeni yolu"nda, burada ürünün adında. Satırlar
  // birebir karşılık değil — düzen aynı, cümle her dilin kendi cümlesi.
  'home.hero.title': 'A new way to find',
  'home.hero.titleAccent': 'the experiences locals keep',
  'home.hero.lede':
    'From people who actually live there. Small groups, real people, a few hours you won’t forget.',
  'home.samples.heading': 'Sample experiences',

  'search.destination.label': 'Where to?',
  'search.destination.placeholder': 'Search for a city',
  'search.date.label': 'When?',
  'search.submit': 'Search',

  'search.city.listLabel': 'City suggestions',
  'search.city.countriesHeading': 'Countries',
  'search.city.citiesHeading': 'Cities',
  'search.city.allCountries': 'All countries',
  'search.city.tooShort': 'Start typing a city name, or pick a country from the list.',
  'search.city.loading': 'Searching…',
  'search.city.error': 'We couldn’t load the city list. Try again in a moment.',
  'search.city.empty': 'No city matches that search.',
  'search.city.truncated': 'There are more cities — keep typing to narrow it down.',
  'search.city.clear': 'Remove the selected city',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} city found', other: '{n} cities found' },
  'search.city.countryCities': { one: '{n} city', other: '{n} cities' },

  'search.guests.label': 'Guests',
  'search.guests.dialogLabel': 'Number of guests',
  'search.guests.done': 'Done',
  'search.guests.adults': 'Adults',
  'search.guests.adults.hint': '13 and over',
  'search.guests.adults.decrease': 'One fewer adult',
  'search.guests.adults.increase': 'One more adult',
  'search.guests.children': 'Children',
  'search.guests.children.hint': 'Ages 0–12',
  'search.guests.children.decrease': 'One fewer child',
  'search.guests.children.increase': 'One more child',
  'search.guests.summary.adults': { one: '{n} adult', other: '{n} adults' },
  'search.guests.summary.children': { one: '{n} child', other: '{n} children' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.rating': '★ {puan}',
  'experience.perPerson': '/ person',
  'experience.duration': { one: '{n} hour', other: '{n} hours' },
  'experience.meta': {
    one: '{sure} · up to {n} person',
    other: '{sure} · up to {n} people',
  },

  'explore.heading.all': 'All experiences',
  'explore.heading.city': 'Experiences in {sehir}',
  'explore.heading.query': 'Results for “{arama}”',
  'explore.summary': { one: '{n} experience · {misafir}', other: '{n} experiences · {misafir}' },
  'explore.summary.dated': {
    one: '{n} experience · {misafir} · {tarih}',
    other: '{n} experiences · {misafir} · {tarih}',
  },
  'explore.summary.guests': { one: '{n} person', other: '{n} people' },
  'explore.dateNotice':
    'The date you picked doesn’t narrow anything down yet — the experiences’ calendars aren’t in the system. Everything below covers every date.',
  'explore.empty.title': 'No experiences here yet',
  'explore.empty.body':
    'Try widening the search: pick another city from the list, or fewer guests. New cities go up all the time.',
  'explore.empty.cta': 'See every experience',

  'explore.cityMissing.title': 'We don’t know that city',
  'explore.cityMissing.body':
    'The city in the address isn’t in our registry — the link may be out of date. Pick a city from the list in the field above.',
  'explore.cityMissing.cta': 'See every experience',

  'howItWorks.lede': 'Three steps and you’re done.',
  'howItWorks.back': 'Back',
  'howItWorks.step.discover.title': 'Explore',
  'howItWorks.step.discover.body':
    'Look through the local experiences in your city. Small groups, real hosts.',
  'howItWorks.step.book.title': 'Book it',
  'howItWorks.step.book.body':
    'Pick a date and take your spot. The ticket is in your pocket right away.',
  'howItWorks.step.join.title': 'Show up',
  'howItWorks.step.join.body': 'The host scans your QR at the door. Your experience starts.',
  'howItWorks.backToExplore': 'Back to exploring',

  'myExperiences.lede': 'Your tickets live here. The host scans the QR at the door.',
  'myExperiences.upcoming': 'Upcoming · {sayi}',
  'myExperiences.past': 'Past · {sayi}',
  'myExperiences.downloadPdf': 'Download PDF',
  'myExperiences.wallet': 'Add to Apple Wallet',
  'myExperiences.wallet.soon': 'Coming soon',
  'myExperiences.rate': 'Rate it',
  'myExperiences.rate.soon': 'Opens once the experience is over',

  'ticket.demoBadge': 'Demo ticket',
  'ticket.demoNote': 'Sample ticket: the QR isn’t signed yet and can’t be checked at the door.',
  'ticket.guests': 'Guests',
  'ticket.amount': 'Total',
  'ticket.status': 'Status',
  'ticket.status.valid': 'Valid',
  'ticket.status.used': 'Used',
  'ticket.timeZoneNote': 'in {sehir} time',

  'ticket.pdf.kicker': 'Experience ticket',
  'ticket.pdf.dateTime': 'Date and time',
  'ticket.pdf.docTitle': 'Expyra ticket — {baslik}',
  'ticket.pdf.code': 'Ticket code {kod}',
  'ticket.pdf.notice.valid': 'The host scans this code at the door. One use only.',
  'ticket.pdf.notice.used': 'This ticket was used at the door.',

  'ticket.error.signedOut': 'Sign in to see this ticket.',
  'ticket.error.notFound': 'No ticket with that code.',

  'auth.meta.title': 'Sign in',
  'auth.title': 'Sign in or create an account',
  'auth.back': 'Back',

  'auth.email.lede': 'Type your address and we’ll send you a one-time code. No password.',
  'auth.email.label': 'Your email address',
  'auth.email.help': 'We’ll send the code to this address.',
  'auth.email.placeholder': 'you@example.com',
  'auth.email.error.invalid': 'That address doesn’t look right. Example: you@example.com',

  'auth.code.lede': 'We sent a 6-digit code to:',
  'auth.code.label': 'The code from your email',
  'auth.code.hint':
    'The code works for 10 minutes. If you can’t find the email, check your spam folder.',
  'auth.code.resend': 'Send a new code',
  'auth.code.changeEmail': 'Use a different address',

  'auth.common.continue': 'Continue',
  'auth.common.working': 'Sending…',

  'auth.otp.error.invalid': 'That code didn’t match. Check the 6 digits in the latest email.',
  'auth.otp.error.locked':
    'Too many attempts. We closed this code to keep the account safe — ask for a new one.',
  'auth.otp.error.resendTooSoon': {
    one: 'Wait {n} more second before asking for a new code.',
    other: 'Wait {n} more seconds before asking for a new code.',
  },

  'auth.error.tooManyRequests': 'Too many codes requested. Try again in a little while.',
  'auth.error.suspended': 'This account is suspended. destek@expyra.com',
  'auth.error.expiredChallenge': 'This sign-in attempt timed out. Enter your address again.',

  'account.title': 'Your account',
  'account.lede': 'Change your name and preferred language here.',

  'account.email.label': 'Your email address',
  'account.email.note': 'Email addresses can’t be changed yet.',

  'account.name.label': 'Your display name',
  'account.name.help': 'This is the name other people see. You can leave it empty.',
  'account.name.placeholder': 'e.g. Alex M.',

  'account.language.label': 'Your preferred language',
  'account.language.help':
    'The language we write to you in. The language of the interface comes from the address bar, not from this choice.',
  'account.language.none': 'Not set',

  'account.save': 'Save',
  'account.saving': 'Saving…',
  'account.saved': 'Changes saved.',

  'account.error.name': {
    one: 'A display name can be {n} character at most.',
    other: 'A display name can be {n} characters at most.',
  },
  'account.error.language': 'We don’t support that language yet. Pick another one from the list.',
  'account.error.signedOut': 'Your session has ended. Sign in again.',

  'account.menu.trigger': 'Account menu: {ad}',
  'account.menu.title': 'Account',
  'account.menu.signedInAs': 'Signed in as {eposta}',
  'account.menu.account': 'Your account',
  'account.menu.signOut': 'Sign out',
  'account.menu.fallbackLabel': 'Your account',

  'account.signIn': 'Sign in',
  'account.loading': 'Loading your session',

  'host.meta.title': 'Become a host',

  'host.invite.title': 'Publish your own experience',
  'host.invite.lede':
    'Show people something you know, take them somewhere you already walk through. You set the price, the group size, the calendar and the cancellation policy — we stay out of what you offer.',
  'host.invite.noApproval':
    'No approval process, no application form. The moment you say become a host, your panel opens.',
  'host.invite.cta': 'Become a host',
  'host.invite.pending': 'Opening…',

  'host.signedOut.note':
    'You need to sign in before you can host. We don’t ask for a password — we send a one-time code to your address.',
  'host.signedOut.cta': 'Sign in to become a host',

  'host.panel.title': 'Host panel',
  'host.panel.lede':
    'This is where you run your experiences. You set the price, the group, the calendar and the cancellation policy — we stay out of what you offer.',
  'host.panel.status': 'Your account is open as a host.',
  'host.panel.new': 'New experience',

  'host.soon': 'Publishing experiences opens soon',

  'host.listings.heading': 'My listings · {sayi}',
  'host.listings.previewHeading': 'This is how your panel will look',
  'host.listings.note':
    'This list is sample data. Your own listings will show up here once publishing opens.',
  'host.listings.previewNote':
    'This list is sample data — once you become a host, your own listings show up here.',
  'host.listings.summary': {
    one: '{fiyat} · up to {n} person',
    other: '{fiyat} · up to {n} people',
  },
  'host.listings.progress': {
    one: '{tamam} of {n} step done',
    other: '{tamam} of {n} steps done',
  },
  'host.listings.edit': 'Edit',
  'host.listings.status.draft': 'Draft',
  'host.listings.status.published': 'Published',

  'host.steps.heading': 'How do I start?',
  'host.steps.describe.title': 'Describe your experience',
  'host.steps.describe.body':
    'Title, description, length and group size. Write it in as many languages as you like — travelers read it in theirs.',
  'host.steps.media.title': 'Add your photos',
  'host.steps.media.body':
    'One cover photo at least. Show what the experience actually looks like; stock photography doesn’t work here.',
  'host.steps.pricing.title': 'Set your calendar and price',
  'host.steps.pricing.body':
    'Which days, how many people, how much. You write the price in your own currency, and that’s the currency you get paid in.',
  'host.steps.publish.title': 'Publish',
  'host.steps.publish.body':
    'Nothing to wait for. The moment you publish, your listing shows up in search.',

  'host.contact.title': 'Publishing experiences opens soon',
  'host.contact.body':
    'We’re gathering the first hosts one at a time. If you already know what you want to share, write to us — we’ll put your listing together with you when it opens.',
  'host.contact.cta': 'Write to us',
  'host.contact.howItWorks': 'How it works',

  'host.error.blocked': 'This account is suspended, so it can’t become a host. destek@expyra.com',
} as const satisfies Dictionary<'en'>

/**
 * Metnin içi de kaynakla karşılaştırılıyor: bir yer tutucu düşerse ya da adı
 * değişirse derleme, hangi anahtarda olduğunu yazarak kırılır.
 * `export` bilinçli — kullanılmayan tip lint'te ölü kod sayılır.
 */
export type EnPlaceholders = Assert<PlaceholdersMatchSource<typeof en>>
