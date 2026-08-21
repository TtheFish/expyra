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
  'home.showcase.heading': 'Experiences on Expyra',
  'home.showcase.more': 'See every experience',
  'home.showcase.unavailable':
    'We couldn’t list the experiences just now. Try again in a bit — the listings are still there.',
  'home.showcase.empty.title': 'Nothing is published yet',
  'home.showcase.empty.body':
    'You could be the first. Show people something you know, with a small group.',
  'home.showcase.empty.cta': 'Become a host',

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
  'experience.duration.hours': { one: '{n} hour', other: '{n} hours' },
  'experience.duration.minutes': { one: '{n} minute', other: '{n} minutes' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Duration not given',
  'experience.meta': {
    one: '{sure} · up to {n} person',
    other: '{sure} · up to {n} people',
  },
  'experience.card.language': 'This listing is written in {dil}',

  'explore.heading.all': 'All experiences',
  'explore.heading.city': 'Experiences in {sehir}',
  'explore.heading.query': 'Results for “{arama}”',
  'explore.summary': { one: '{n} experience', other: '{n} experiences' },
  'explore.summary.page': {
    one: '{n} experience on this page',
    other: '{n} experiences on this page',
  },
  // "we don’t take X into account" tek ve çoğul listede aynı çalışıyor; fiil
  // özneyle değil "we" ile uyuşuyor. Türkçe'deki belirtme hâlinin karşılığı
  // burada gerekmiyor, o yüzden filtre adları yalın.
  'explore.filtersNotice':
    'We narrow results by city only — we don’t take {filtreler} into account yet.',
  'explore.filter.date': 'the date you picked',
  'explore.filter.guests': 'the number of guests',

  'explore.pager.label': 'Result pages',
  'explore.pager.next': 'Next page',
  'explore.pager.first': 'Back to the first page',

  'explore.pageLink.title': 'We couldn’t read that page link',
  'explore.pageLink.body':
    'The page marker in the address looks broken. Start the search again — the results are still there.',

  'explore.empty.title': 'No experiences here yet',
  'explore.empty.body':
    'Try another city from the list. New cities and new experiences go up all the time.',
  'explore.empty.cta': 'See every experience',
  'explore.empty.hostCta': 'Be the first host here',

  'explore.cityMissing.title': 'We don’t know that city',
  'explore.cityMissing.body':
    'The city in the address isn’t in our registry — the link may be out of date. Pick a city from the list in the field above.',
  'explore.cityMissing.cta': 'See every experience',

  'experience.detail.meta.fallback': 'A local experience in {sehir}.',
  'experience.detail.text.fallback': 'This description is in {dil}',
  'experience.detail.duration.label': 'Duration',
  'experience.detail.capacity.label': 'Group size',
  'experience.detail.capacity.value': { one: 'Up to {n} person', other: 'Up to {n} people' },
  'experience.detail.about': 'About this experience',
  'experience.detail.noDescription': 'The host hasn’t written a description yet.',
  'experience.detail.spoken.heading': 'Languages spoken during the experience',
  'experience.detail.spoken.help':
    'The host runs the experience in these languages. The language the listing is written in is a separate thing.',
  'experience.detail.spoken.none': 'The host hasn’t listed the languages they speak yet.',
  'experience.detail.tags.heading': 'Tags',
  'experience.detail.gallery.heading': 'Gallery',
  'experience.detail.host.heading': 'Hosted by',
  'experience.detail.host.anonymous': 'An Expyra host',
  'experience.detail.booking.title': 'No dates or price yet',
  'experience.detail.booking.body':
    'Once this experience has a calendar and a price, booking opens right here.',
  'experience.detail.cityLink': 'All experiences in {sehir}',
  'experience.detail.back': 'Back to Explore',

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

  'account.avatar.label': 'Profile photo',
  'account.avatar.help': 'JPEG, PNG or WebP · at least 800×600 pixels · up to 10 MB',
  'account.avatar.add': 'Add a photo',
  'account.avatar.change': 'Change',
  'account.avatar.remove': 'Remove',
  'account.avatar.uploading': 'Uploading…',
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

  'host.listings.heading': 'My listings · {sayi}',
  'host.listings.edit': 'Edit',
  'host.listings.status.draft': 'Draft',
  'host.listings.status.published': 'Published',
  'host.listings.status.archived': 'Archived',

  'host.listings.ready': 'Ready to publish',
  'host.listings.missing': { one: '{n} field missing', other: '{n} fields missing' },

  'host.listings.empty.heading': 'My listings',
  'host.listings.empty.title': 'You don’t have a listing yet',
  'host.listings.empty.body':
    'Open your first draft. You can work on it as long as you like before publishing — nobody else can see a draft.',
  'host.listings.empty.cta': 'Write your first experience',

  'host.listings.errorHeading': 'My listings',
  'host.listings.error':
    'We couldn’t load your listings right now. Nothing was deleted — reload the page in a moment.',

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

  'host.contact.title': 'Write to us if you get stuck',
  'host.contact.body':
    'We look after the first hosts one at a time. If something blocks you while you put your listing together, or you’re unsure about a decision, write — we’ll work through it with you.',
  'host.contact.cta': 'Write to us',
  'host.contact.howItWorks': 'How it works',

  'host.error.blocked': 'This account is suspended, so it can’t become a host. destek@expyra.com',

  // --- Experience wizard -----------------------------------------------------

  'host.experience.new.meta.title': 'New experience',
  'host.experience.new.title': 'Start a new experience',
  'host.experience.new.lede':
    'We ask one thing first: which language you’ll write the listing in. Everything else you fill in inside the draft, in whatever order you like.',
  'host.experience.new.language.label': 'Which language will you write in?',
  'host.experience.new.language.help':
    'This one can’t be changed later: your listing’s address comes from it, and travellers see this text when no other language is written. You can add other languages afterwards.',
  'host.experience.new.submit': 'Open the draft',
  'host.experience.new.pending': 'Opening…',

  'host.experience.new.next.heading': 'What comes next?',
  'host.experience.new.next.text': 'Title and description — in as many languages as you like.',
  'host.experience.new.next.basics': 'How long it runs and how many people you take.',
  'host.experience.new.next.place': 'City, category, and the languages you speak on the day.',
  'host.experience.new.next.publish': 'Publish when you’re ready. Nothing to wait for.',

  'host.experience.edit.meta.title': 'Edit experience',
  'host.experience.edit.lede':
    'Each section saves on its own. Stop wherever you like — your draft waits for you.',
  'host.experience.untitled': 'Untitled draft',
  'host.experience.back': '← Back to the host panel',

  'host.experience.save': 'Save',
  'host.experience.saving': 'Saving…',
  'host.experience.saved': 'Saved.',

  'host.experience.section.text': 'Title and description',
  'host.experience.section.textHelp':
    'This is what travellers read before deciding. Say what you’ll do, where you meet, and what ties you to it.',
  'host.experience.section.basics': 'Duration and capacity',
  'host.experience.section.basicsHelp':
    'How long one session runs and how many people you take at once. Calendar and price come later.',
  'host.experience.section.place': 'City',
  'host.experience.section.placeHelp':
    'Where the experience happens. The time zone comes from this — session times are shown in it.',
  'host.experience.section.category': 'Category',
  'host.experience.section.categoryHelp':
    'Travellers filter by this in search. Pick the closest one; only one can be chosen.',
  'host.experience.section.languages': 'Spoken languages and tags',
  'host.experience.section.languagesHelp':
    'Which languages do you run the experience in? That’s a separate thing from the language you wrote the listing in.',
  'host.experience.section.status': 'Publishing',
  'host.experience.section.statusHelp':
    'What publishing needs is listed below. There’s no approval step — with nothing missing, your listing shows up in search right away.',

  'host.experience.translations.tabsLabel': 'Languages of the listing text',
  'host.experience.translations.required': 'required',
  'host.experience.translations.optional': 'optional',
  'host.experience.translations.add.label': 'Write in another language',
  'host.experience.translations.add.submit': 'Open',
  'host.experience.translations.machine':
    'This text was translated automatically. Edit and save it and it becomes your own text.',

  'host.experience.title.label': 'Title',
  'host.experience.title.placeholder': 'Street food walk in Kadıköy',
  'host.experience.title.help':
    'Short and concrete. It’s the first thing travellers see in the list, and your listing’s address comes from it.',
  'host.experience.description.label': 'Description',
  'host.experience.description.placeholder':
    'Where you meet, what you do, what to eat, what to wear…',
  'host.experience.description.help':
    'Not required to publish, but this is where travellers decide. Walk through the day in order.',

  'host.experience.duration.label': 'Duration (minutes)',
  'host.experience.duration.help':
    'Total length of one session. For example 90 minutes, or 180. Seven days at most.',
  'host.experience.capacity.label': 'Capacity (people)',
  'host.experience.capacity.help':
    'How many people at most in one session. Publishing needs at least one.',

  'host.experience.city.label': 'Which city is it in?',
  'host.experience.city.placeholder': 'Search for a city',
  'host.experience.place.saved': 'City selected · time zone {saat}',
  'host.experience.place.empty': 'No city chosen yet.',
  'host.experience.place.locked':
    'Once a listing has been published its city is fixed: session times and booking locations depend on it. For another city, open a new listing.',

  'host.experience.category.label': 'Category',
  'host.experience.category.none': 'Not chosen',
  'host.experience.category.help': 'What the experience is mostly about.',

  'host.experience.spoken.label': 'Languages you speak during the experience',
  'host.experience.spoken.help':
    'Independent of the language you wrote the listing in: tick the languages you actually run it in. Ten at most.',
  'host.experience.tags.label': 'Tags',
  'host.experience.tags.placeholder': 'street food, walking, small group',
  'host.experience.tags.help':
    'Separate with commas. Ten at most. They help your listing match searches.',

  'host.experience.missing.heading': 'What publishing needs',
  'host.experience.ready': 'All set. You can publish this listing.',
  'host.experience.missing.translation': 'a title in the language the listing is written in',
  'host.experience.missing.city': 'a city',
  'host.experience.missing.category': 'a category',
  'host.experience.missing.capacity': 'a capacity',
  'host.experience.missing.cover': 'a cover photo',
  'host.experience.missing.unknown': 'an unfinished field',

  'host.experience.publish': 'Publish',
  'host.experience.republish': 'Publish again',
  'host.experience.publishing': 'Publishing…',
  'host.experience.published': 'Your listing is live.',
  'host.experience.archive': 'Archive',
  'host.experience.archiving': 'Archiving…',
  'host.experience.archived': 'Listing archived.',

  // --- Media (Block 6) ----------------------------------------------------
  'host.media.heading': 'Photos',
  'host.media.hint': 'JPEG, PNG or WebP · at least 800×600 pixels · up to 10 MB · 12 photos max',
  'host.media.add': 'Add photos',
  'host.media.drop': 'Drop files here',
  'host.media.uploading': 'Uploading…',
  'host.media.empty': 'No photos yet. The first one you upload becomes the cover.',
  'host.media.cover': 'Cover',
  'host.media.makeCover': 'Make cover',
  'host.media.delete': 'Delete',
  'host.media.moveEarlier': 'Move earlier',
  'host.media.moveLater': 'Move later',
  'host.media.position': 'Photo {n}',
  'host.media.error.rejected': "That photo wasn't accepted.",
  'host.media.error.unsupported': 'Only JPEG, PNG and WebP can be uploaded.',
  'host.media.error.notUploaded': "The upload didn't finish. Try again.",
  'host.media.error.notAnImage': "That file isn't an image.",
  'host.media.error.mismatch': "The file's contents don't match its extension.",
  'host.media.error.tooSmall': 'Photos must be at least 800×600 pixels.',
  'host.media.error.tooLarge': 'Files can be at most 10 MB.',
  'host.media.error.limit': 'A listing can have at most 12 photos.',
  'host.media.error.lastOfPublished':
    "You can't delete the last photo of a live listing. Add another photo first, or archive the listing.",

  'host.experience.status.publishedNote':
    'Your listing shows up in search. Archiving hides it without deleting it — you can publish it again whenever you want.',
  'host.experience.status.privateNote': 'Until you publish it, nobody but you can see this listing.',

  'host.experience.error.notFound': 'We couldn’t find this listing. Open it again from the panel.',
  'host.experience.error.invalid': 'This section couldn’t be saved. Check the fields and try again.',
  'host.experience.error.language':
    'Listings can’t be written in that language. Pick another one from the list.',
  'host.experience.error.title': 'A title is required, and it can be 120 characters at most.',
  'host.experience.error.description': 'The description can be 4000 characters at most.',
  'host.experience.error.duration': 'Write the duration in minutes: at least 1, at most 10080.',
  'host.experience.error.capacity': 'Write the capacity in people: at least 1, at most 500.',
  'host.experience.error.city': 'Pick the city from the list — typing the name isn’t enough on its own.',
  'host.experience.error.category': 'Pick a category from the list.',
  'host.experience.error.spokenLanguages': 'You can tick ten languages at most.',
  'host.experience.error.tags': 'Tags can’t be empty; ten at most, and each one short.',
  'host.experience.error.publishedConflict':
    'That change can’t be made on a live listing. Archive it first, then edit.',
  'host.experience.error.publishBlocked': 'Not published. Still missing: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Not published: the listing isn’t complete yet. Check the list above.',

  // --- Categories ------------------------------------------------------------
  'category.food-drink': 'Food and drink',
  'category.art-culture': 'Art and culture',
  'category.history-heritage': 'History and heritage',
  'category.nature-outdoors': 'Nature and outdoors',
  'category.water-sea': 'Water and sea',
  'category.sports-adventure': 'Sport and adventure',
  'category.crafts-workshops': 'Crafts and workshops',
  'category.music-nightlife': 'Music and nightlife',
  'category.wellness': 'Wellness',
  'category.photography': 'Photography',
  'category.tours-walks': 'Tours and walks',
  'category.local-life': 'Local life',
} as const satisfies Dictionary<'en'>

/**
 * Metnin içi de kaynakla karşılaştırılıyor: bir yer tutucu düşerse ya da adı
 * değişirse derleme, hangi anahtarda olduğunu yazarak kırılır.
 * `export` bilinçli — kullanılmayan tip lint'te ölü kod sayılır.
 */
export type EnPlaceholders = Assert<PlaceholdersMatchSource<typeof en>>
