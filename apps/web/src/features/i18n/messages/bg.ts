import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Български интерфейс.
 *
 * `satisfies Dictionary<'bg'>` налага две неща: всеки ключ от източника е
 * ТУК и ключовете за множествено число носят CLDR формите на българския
 * (`one` + `other`, както в английския). `as const` запазва литералите, за да
 * може проверката на заместителите по-долу да чете вътрешността на текста.
 *
 * **Тон (VISION §6):** продуктът говори на човека, не на агенцията. Текстът е
 * на „ти“ — кратки, преки изречения, които обещават нещо: без маркетингови
 * прилагателни, без „моля“, без удивителни. „Разкажи нещо, което знаеш“ не е
 * лозунг, а покана; преводът трябва да звучи като покана.
 *
 * Две неща не се превеждат и това е съзнателно: името на марката (Expyra) и
 * адресът за поддръжка (`destek@expyra.com` — това е единствената налична
 * пощенска кутия; измислен български адрес би означавал, че пощата не стига
 * доникъде).
 */
export const bg = {
  'meta.description': 'Намери местни преживявания и ги резервирай.',

  'nav.primaryLabel': 'Основно меню',
  'nav.footerLabel': 'Меню в долния колонтитул',
  'nav.explore': 'Разгледай',
  'nav.myExperiences': 'Моите преживявания',
  'nav.becomeHost': 'Стани домакин',
  'nav.howItWorks': 'Как работи',

  'language.trigger': 'Език: {dil}. Промени.',
  'language.dialogLabel': 'Избор на език',
  'language.search.label': 'Търсене на езици',
  'language.search.placeholder': 'Търсене на езици',
  'language.group.ui': 'Езици на интерфейса',
  'language.group.content': 'Други езици',
  'language.group.contentHint':
    'Още няма превод на интерфейса — преживяванията пак могат да се публикуват на тези езици.',
  'language.empty': 'Няма език, който отговаря на търсенето.',

  'theme.toLight': 'Премини към светлата тема',
  'theme.toDark': 'Премини към тъмната тема',

  'currency.trigger': 'Валута: {para}. Промени.',
  'currency.dialogLabel': 'Избор на валута',
  'currency.search.label': 'Търсене на валути',
  'currency.search.placeholder': 'EUR, долар, лира…',
  'currency.none': 'Валутата на домакина',
  'currency.empty': 'Няма валута, която да отговаря на това търсене.',

  // Акцентът в турския е върху „новия начин за откриване“, тук е върху името
  // на продукта. Редовете не са буквален превод — подредбата е същата, а
  // изречението е собствено за всеки език.
  'home.hero.title': 'Нов начин да откриеш',
  'home.hero.titleAccent': 'преживяванията, които местните пазят',
  'home.hero.lede':
    'От хора, които наистина живеят там. Малки групи, истински хора, няколко часа, които няма да забравиш.',
  'home.showcase.heading': 'Преживявания в Expyra',
  'home.showcase.more': 'Виж всички преживявания',
  'home.showcase.unavailable':
    'Не успяхме да изброим преживяванията в момента. Опитай отново след малко — обявите са си на мястото.',
  'home.showcase.empty.title': 'Още нищо не е публикувано',
  'home.showcase.empty.body':
    'Можеш да си първият. Покажи на хората нещо, което знаеш, с малка група.',
  'home.showcase.empty.cta': 'Стани домакин',

  'search.destination.label': 'Накъде?',
  'search.destination.placeholder': 'Потърси град',
  'search.date.label': 'Кога?',
  'search.date.placeholder': 'Избери дата',
  'search.date.dialogLabel': 'Избери дата',
  'search.date.day': 'Ден',
  'search.date.month': 'Месец',
  'search.date.year': 'Година',
  'search.date.done': 'Готово',
  'search.date.clear': 'Изчисти',
  'search.date.stepUp': 'Назад: {alan}',
  'search.date.stepDown': 'Напред: {alan}',
  'search.submit': 'Търси',

  'search.city.listLabel': 'Предложения за градове',
  'search.city.countriesHeading': 'Държави',
  'search.city.citiesHeading': 'Градове',
  'search.city.allCountries': 'Всички държави',
  'search.city.tooShort': 'Започни да пишеш име на град или избери държава от списъка.',
  'search.city.loading': 'Търсене…',
  'search.city.error': 'Не успяхме да заредим списъка с градове. Опитай отново след малко.',
  'search.city.empty': 'Няма град, който отговаря на търсенето.',
  'search.city.truncated': 'Има още градове — продължи да пишеш, за да стесниш избора.',
  'search.city.clear': 'Премахни избрания град',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: '{n} намерен град', other: '{n} намерени града' },
  'search.city.countryCities': { one: '{n} град', other: '{n} града' },

  'search.guests.label': 'Гости',
  'search.guests.dialogLabel': 'Брой гости',
  'search.guests.done': 'Готово',
  'search.guests.adults': 'Възрастни',
  'search.guests.adults.hint': 'на 13 и повече години',
  'search.guests.adults.decrease': 'Един възрастен по-малко',
  'search.guests.adults.increase': 'Още един възрастен',
  'search.guests.children': 'Деца',
  'search.guests.children.hint': 'на възраст 0–12 години',
  'search.guests.children.decrease': 'Едно дете по-малко',
  'search.guests.children.increase': 'Още едно дете',
  'search.guests.summary.adults': { one: '{n} възрастен', other: '{n} възрастни' },
  'search.guests.summary.children': { one: '{n} дете', other: '{n} деца' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} час', other: '{n} часа' },
  'experience.duration.minutes': { one: '{n} минута', other: '{n} минути' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Продължителността не е посочена',
  'experience.meta': {
    one: '{sure} · до {n} човек',
    other: '{sure} · до {n} души',
  },
  'experience.card.perPerson': 'на гост',
  'experience.card.language': 'Тази обява е написана на {dil}',

  'explore.heading.all': 'Всички преживявания',
  'explore.heading.city': 'Преживявания в {sehir}',
  'explore.heading.query': 'Резултати за „{arama}“',
  'explore.summary': { one: '{n} преживяване', other: '{n} преживявания' },
  'explore.summary.page': {
    one: '{n} преживяване на тази страница',
    other: '{n} преживявания на тази страница',
  },
  // Филтрите тук са изброени като обикновени имена, без падежи — българският
  // няма нужда от форма като турския определителен падеж.
  'explore.filtersNotice':
    'Стесняваме резултатите само по град — все още не вземаме предвид {filtreler}.',
  'explore.filter.date': 'избраната дата',
  'explore.filter.guests': 'броя на гостите',

  'explore.pager.label': 'Страници с резултати',
  'explore.pager.next': 'Следваща страница',
  'explore.pager.first': 'Обратно към първата страница',

  'explore.pageLink.title': 'Не успяхме да прочетем връзката към страницата',
  'explore.pageLink.body':
    'Маркерът за страницата в адреса изглежда повреден. Започни търсенето отново — резултатите са си на мястото.',

  'explore.empty.title': 'Тук още няма преживявания',
  'explore.empty.body':
    'Опитай друг град от списъка. Нови градове и нови преживявания се появяват непрекъснато.',
  'explore.empty.cta': 'Виж всички преживявания',
  'explore.empty.hostCta': 'Бъди първият домакин тук',

  'explore.cityMissing.title': 'Не познаваме този град',
  'explore.cityMissing.body':
    'Градът от адреса го няма в нашия регистър — връзката може да е остаряла. Избери град от списъка в полето по-горе.',
  'explore.cityMissing.cta': 'Виж всички преживявания',

  'experience.detail.meta.fallback': 'Местно преживяване в {sehir}.',
  'experience.detail.text.fallback': 'Това описание е на {dil}',
  'experience.detail.duration.label': 'Продължителност',
  'experience.detail.capacity.label': 'Размер на групата',
  'experience.detail.capacity.value': { one: 'До {n} човек', other: 'До {n} души' },
  'experience.detail.about': 'За това преживяване',
  'experience.detail.noDescription': 'Домакинът още не е написал описание.',
  'experience.detail.spoken.heading': 'Езици, на които се води преживяването',
  'experience.detail.spoken.help':
    'Домакинът води преживяването на тези езици. Езикът, на който е написана обявата, е отделно нещо.',
  'experience.detail.spoken.none': 'Домакинът още не е посочил езиците, на които говори.',
  'experience.detail.tags.heading': 'Етикети',
  'experience.detail.gallery.heading': 'Галерия',
  'experience.detail.host.heading': 'Домакин',
  'experience.detail.itinerary.heading': 'Какво ще правиш',
  'experience.detail.meeting.heading': 'Къде ще се срещнем',
  'experience.detail.meeting.map': 'Отвори в карта',
  'experience.detail.meeting.mapEmbed': 'Карта на мястото за среща',
  'experience.detail.meeting.pin': 'Място за среща',
  'experience.detail.highlights.host': 'Домакин: {ad}',
  'experience.detail.highlights.duration': 'Около {sure}',
  'experience.detail.highlights.spoken': 'Води се на {diller}',
  'experience.detail.highlights.capacity': {
    one: 'До {n} човек',
    other: 'До {n} души',
  },
  'experience.detail.highlights.bring': 'Какво да носиш',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} отзив', other: '{n} отзива' },
  'experience.detail.reviews.stars': { one: '{n} звезда', other: '{n} звезди' },
  'experience.detail.reviews.demoNote':
    'Примерни отзиви — истинските оценки ще се появят тук, щом резервациите заработят.',
  'experience.detail.reviews.showAll': 'Покажи всички отзиви',
  'experience.detail.reviews.about': 'Научи как работят оценките и отзивите.',
  'experience.detail.reviews.demo.1.name': 'Андреа',
  'experience.detail.reviews.demo.1.place': 'Търгу Муреш, Румъния',
  'experience.detail.reviews.demo.1.when': 'преди 1 ден',
  'experience.detail.reviews.demo.1.body':
    'Водачът ни беше знаещ и сърдечен. С него градът изглеждаше съвсем различен.',
  'experience.detail.reviews.demo.2.name': 'Марко',
  'experience.detail.reviews.demo.2.place': 'Милано, Италия',
  'experience.detail.reviews.demo.2.when': 'преди 3 дни',
  'experience.detail.reviews.demo.2.body':
    'Малка група и много разговори. Бяха планирани и спирки за снимки — страхотно беше.',
  'experience.detail.reviews.demo.3.name': 'Елишка',
  'experience.detail.reviews.demo.3.place': 'Бърно, Чехия',
  'experience.detail.reviews.demo.3.when': 'преди 1 седмица',
  'experience.detail.reviews.demo.3.body':
    'Малко забързано, но като цяло прекрасно. Последната спирка ни хареса най-много.',
  'experience.detail.reviews.demo.4.name': 'Йонас',
  'experience.detail.reviews.demo.4.place': 'Берлин, Германия',
  'experience.detail.reviews.demo.4.when': 'преди 2 седмици',
  'experience.detail.reviews.demo.4.body':
    'По-лично, отколкото очаквахме. Домакинът ни насочи и към местни вкусове.',
  'experience.detail.reviews.demo.5.name': 'Лейла',
  'experience.detail.reviews.demo.5.place': 'Истанбул, Турция',
  'experience.detail.reviews.demo.5.when': 'преди 3 седмици',
  'experience.detail.reviews.demo.5.body':
    'Безупречна организация. Ясно място за среща и точно навреме.',
  'experience.detail.reviews.demo.6.name': 'Сара',
  'experience.detail.reviews.demo.6.place': 'Мадрид, Испания',
  'experience.detail.reviews.demo.6.when': 'преди 1 месец',
  'experience.detail.reviews.demo.6.body': 'Водачът ни беше възхитителен 💕💕',
  'experience.detail.know.heading': 'Добре е да знаеш',
  'experience.detail.know.minimumAge': 'Възрастово ограничение',
  'experience.detail.know.minimumAgeValue': 'От {n} години',
  'experience.detail.know.activityLevel': 'Ниво на активност',
  'experience.detail.know.whatToBring': 'Какво да носиш',
  'experience.detail.know.notIncluded': 'Не е включено',
  'experience.detail.know.accessibility': 'Достъпност',
  'experience.detail.nearby.heading': 'Още преживявания в {sehir}',
  'experience.detail.host.anonymous': 'Домакин в Expyra',
  'experience.detail.booking.title': 'Дати и цена',
  'experience.detail.booking.noSlots':
    'В момента няма свободни дати. Ще се появят тук, щом домакинът обнови календара.',
  'experience.detail.booking.perPerson': 'на човек',
  'experience.detail.booking.pickDate': 'Избери дата',
  'experience.detail.booking.timeZone': 'Часовете са по {bolge}.',
  'experience.detail.booking.spotsLeft': { one: 'остава {n} място', other: 'остават {n} места' },
  'experience.detail.booking.adults': 'Възрастни',
  'experience.detail.booking.children': 'Деца',
  'experience.detail.booking.infants': 'Бебета',
  'experience.detail.booking.currency': 'Валута',
  'experience.detail.booking.currencyNone': 'Валутата на домакина',
  'experience.detail.booking.update': 'Изчисли цената',
  'experience.detail.booking.continue': 'Продължи към плащане',
  'experience.detail.booking.pickDateFirst': 'Първо избери дата',
  'experience.detail.booking.pickDateHint': 'Избери дата по-горе, за да продължиш.',
  'experience.detail.booking.total': 'Общо',
  'experience.detail.booking.displayTotal': 'Около {tutar}',
  'experience.detail.booking.chargedIn':
    'Таксуваш се в {paraBirimi}. Ако картата ти е в друга валута, банката ти прилага собствения си курс.',
  'experience.detail.booking.quoteFailed':
    'Не успяхме да изчислим цената за този избор. Може сесията да няма достатъчно места или да е затворена.',
  'experience.detail.cityLink': 'Всички преживявания в {sehir}',
  'experience.detail.back': 'Обратно към Разгледай',

  'checkout.title': 'Потвърди и плати',
  'checkout.back': 'Обратно към преживяването',
  'checkout.payment.heading': 'Начин на плащане',
  'checkout.payment.bank': 'Онлайн банкиране',
  'checkout.payment.bankSelect': 'Избери банката си',
  'checkout.payment.card': 'Кредитна или дебитна карта',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'С потвърждаването и плащането приемаш условията за ползване, политиката за отмяна и известието за поверителност. Истинско плащане още не е свързано — тази стъпка показва само интерфейса.',
  'checkout.payment.submit': 'Потвърди и плати',
  'checkout.payment.submitting': 'Обработва се…',
  'checkout.payment.demoNote': 'Демо: от картата ти не се таксува и не се създава резервация.',
  'checkout.success.title': 'Готово — демо потвърждение',
  'checkout.success.body':
    'Когато платежният доставчик и API-то за резервации заработят, тук ще се появи истински билет. Засега потокът е завършен.',
  'checkout.success.back': 'Към моите преживявания',
  'checkout.summary.nonRefundable': 'Тази резервация не подлежи на възстановяване.',
  'checkout.summary.date': 'Дата',
  'checkout.summary.guests': 'Гости',
  'checkout.summary.change': 'Промени',
  'checkout.summary.priceDetails': 'Подробности за цената',
  'checkout.summary.total': 'Общо {paraBirimi}',

  'howItWorks.lede': 'Три стъпки и готово.',
  'howItWorks.back': 'Назад',
  'howItWorks.step.discover.title': 'Разгледай',
  'howItWorks.step.discover.body':
    'Прегледай местните преживявания в твоя град. Малки групи, истински домакини.',
  'howItWorks.step.book.title': 'Резервирай',
  'howItWorks.step.book.body':
    'Избери дата и брой хора и виж цената. Резервациите скоро идват.',
  'howItWorks.step.join.title': 'Дойди',
  'howItWorks.step.join.body': 'Домакинът те посреща и преживяването започва.',
  'howItWorks.backToExplore': 'Обратно към разглеждането',

  'myExperiences.lede': 'Тук са твоите билети.',
  'myExperiences.upcoming': 'Предстоящи · {sayi}',
  'myExperiences.past': 'Минали · {sayi}',
  'myExperiences.downloadPdf': 'Изтегли PDF',
  'myExperiences.wallet': 'Добави в Apple Wallet',
  'myExperiences.wallet.soon': 'Скоро',
  'myExperiences.rate': 'Оцени',
  'myExperiences.rate.soon': 'Отваря се, след като преживяването приключи',

  'ticket.demoBadge': 'Демо билет',
  'ticket.demoNote': 'Примерен билет: QR кодът още не е подписан и не може да се провери на входа.',
  'ticket.view.title': 'Твоят билет',
  'ticket.view.lede': 'Покажи QR кода на входа или го добави в портфейла си.',
  'ticket.view.back': 'Обратно към моите преживявания',
  'ticket.wallet.view': 'Виж билета',
  'ticket.wallet.apple': 'Добави в Apple Wallet',
  'ticket.wallet.google': 'Добави в Google Wallet',
  'ticket.wallet.adding': 'Подготвя се…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet не е настроен в тази среда. Добави EXPYRA_APPLE_PASS_* (виж docs/WALLET.md); билета пак можеш да видиш тук.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet не е настроен в тази среда. Добави EXPYRA_GOOGLE_WALLET_* (виж docs/WALLET.md); билета пак можеш да видиш тук.',
  'ticket.guests': 'Гости',
  'ticket.amount': 'Общо',
  'ticket.status': 'Статус',
  'ticket.status.valid': 'Валиден',
  'ticket.status.used': 'Използван',
  'ticket.timeZoneNote': 'по часа на {sehir}',

  'ticket.pdf.kicker': 'Билет за преживяване',
  'ticket.pdf.dateTime': 'Дата и час',
  'ticket.pdf.docTitle': 'Билет Expyra — {baslik}',
  'ticket.pdf.code': 'Код на билета {kod}',
  'ticket.pdf.notice.valid': 'Домакинът сканира този код на входа. Важи само веднъж.',
  'ticket.pdf.notice.used': 'Този билет е използван на входа.',

  'ticket.error.signedOut': 'Влез, за да видиш този билет.',
  'ticket.error.notFound': 'Няма билет с този код.',

  'auth.meta.title': 'Вход',
  'auth.title': 'Влез или създай профил',
  'auth.back': 'Назад',

  'auth.email.lede': 'Напиши адреса си и ще ти изпратим еднократен код. Без парола.',
  'auth.email.label': 'Твоят имейл адрес',
  'auth.email.help': 'Ще изпратим кода на този адрес.',
  'auth.email.placeholder': 'ti@example.com',
  'auth.email.error.invalid': 'Този адрес не изглежда правилен. Пример: ti@example.com',

  'auth.code.lede': 'Изпратихме 6-цифрен код на:',
  'auth.code.label': 'Кодът от имейла ти',
  'auth.code.hint':
    'Кодът важи 10 минути. Ако не намираш имейла, провери папката за спам.',
  'auth.code.resend': 'Изпрати нов код',
  'auth.code.changeEmail': 'Използвай друг адрес',

  'auth.common.continue': 'Продължи',
  'auth.common.working': 'Изпраща се…',

  'auth.otp.error.invalid': 'Кодът не съвпада. Провери 6-те цифри в последния имейл.',
  'auth.otp.error.locked':
    'Твърде много опити. Затворихме този код, за да е сигурен профилът — поискай нов.',
  'auth.otp.error.resendTooSoon': {
    one: 'Изчакай още {n} секунда, преди да поискаш нов код.',
    other: 'Изчакай още {n} секунди, преди да поискаш нов код.',
  },

  'auth.error.tooManyRequests': 'Поискани са твърде много кодове. Опитай отново след малко.',
  'auth.error.suspended': 'Този профил е спрян. destek@expyra.com',
  'auth.error.expiredChallenge': 'Опитът за вход изтече. Въведи адреса си отново.',

  'account.title': 'Твоят профил',
  'account.lede': 'Тук можеш да промениш името си и предпочитания език.',

  'account.email.label': 'Твоят имейл адрес',
  'account.email.note': 'Имейл адресите още не могат да се променят.',

  // --- Фон (общ шаблон — вижда се на ВСЯКА страница) -------------------------
  'wallpaper.istanbul.place': 'Истанбул',
  'wallpaper.istanbul.label': 'Печена риба на улицата',
  'wallpaper.kitchen.place': 'Домашна кухня',
  'wallpaper.kitchen.label': 'Готвене с леличка',
  'wallpaper.cappadocia.place': 'Кападокия',
  'wallpaper.cappadocia.label': 'Балон с горещ въздух',
  'wallpaper.pause': 'Спри фоновото видео',
  'wallpaper.play': 'Пусни фоновото видео',
  'account.avatar.label': 'Профилна снимка',
  'account.avatar.help': 'JPEG, PNG или WebP · поне 800×600 пиксела · до 10 MB',
  'account.avatar.add': 'Добави снимка',
  'account.avatar.change': 'Промени',
  'account.avatar.remove': 'Премахни',
  'account.avatar.uploading': 'Качва се…',
  'account.name.label': 'Показвано име',
  'account.name.help': 'Това е името, което виждат другите. Можеш да го оставиш празно.',
  'account.name.placeholder': 'напр. Алекс М.',

  'account.language.label': 'Предпочитан език',
  'account.language.help':
    'Езикът, на който ти пишем. Езикът на интерфейса идва от адреса в адресната лента, не от този избор.',
  'account.language.none': 'Не е зададен',

  'account.save': 'Запази',
  'account.saving': 'Запазва се…',
  'account.saved': 'Промените са запазени.',

  'account.error.name': {
    one: 'Показваното име може да е най-много {n} символ.',
    other: 'Показваното име може да е най-много {n} символа.',
  },
  'account.error.language': 'Този език още не се поддържа. Избери друг от списъка.',
  'account.error.signedOut': 'Сесията ти приключи. Влез отново.',

  'account.menu.trigger': 'Меню на профила: {ad}',
  'account.menu.title': 'Профил',
  'account.menu.signedInAs': 'Влязъл като {eposta}',
  'account.menu.account': 'Твоят профил',
  'account.menu.signOut': 'Изход',
  'account.menu.fallbackLabel': 'Твоят профил',

  'account.signIn': 'Вход',
  'account.loading': 'Сесията ти се зарежда',

  'host.meta.title': 'Стани домакин',

  'host.invite.title': 'Публикувай собствено преживяване',
  'host.invite.lede':
    'Покажи на хората нещо, което знаеш, заведи ги там, през което и сам минаваш. Ти определяш цената, размера на групата, календара и политиката за отмяна — ние не се месим в това, което предлагаш.',
  'host.invite.noApproval':
    'Без одобрение, без формуляр за кандидатстване. В мига, в който кажеш „стани домакин“, панелът ти се отваря.',
  'host.invite.cta': 'Стани домакин',
  'host.invite.pending': 'Отваря се…',

  'host.signedOut.note':
    'Трябва да влезеш, преди да станеш домакин. Не искаме парола — изпращаме еднократен код на твоя адрес.',
  'host.signedOut.cta': 'Влез, за да станеш домакин',

  'host.panel.title': 'Панел на домакина',
  'host.panel.lede':
    'Оттук водиш преживяванията си. Ти определяш цената, групата, календара и политиката за отмяна — ние не се месим в това, което предлагаш.',
  'host.panel.status': 'Профилът ти е отворен като домакин.',
  'host.panel.new': 'Ново преживяване',

  'host.listings.heading': 'Моите обяви · {sayi}',
  'host.listings.headingPage': 'Моите обяви · {sayi} на тази страница',
  'host.listings.pager.label': 'Страници с обяви',
  'host.listings.pager.next': 'Още обяви',
  'host.listings.pager.first': 'Обратно към първата страница',
  'host.listings.edit': 'Редактирай',
  'host.listings.view': 'Виж обявата',
  'host.listings.status.draft': 'Чернова',
  'host.listings.status.published': 'Публикувана',
  'host.listings.status.archived': 'Архивирана',

  'host.listings.ready': 'Готова за публикуване',
  'host.listings.missing': { one: 'липсва {n} поле', other: 'липсват {n} полета' },

  'host.listings.empty.heading': 'Моите обяви',
  'host.listings.empty.title': 'Още нямаш обява',
  'host.listings.empty.body':
    'Отвори първата си чернова. Можеш да работиш по нея колкото искаш, преди да публикуваш — никой друг не вижда черновата.',
  'host.listings.empty.cta': 'Напиши първото си преживяване',

  'host.listings.errorHeading': 'Моите обяви',
  'host.listings.error':
    'Не успяхме да заредим обявите ти в момента. Нищо не е изтрито — презареди страницата след малко.',

  'host.steps.heading': 'Как да започна?',
  'host.steps.describe.title': 'Опиши преживяването си',
  'host.steps.describe.body':
    'Заглавие, описание, продължителност и размер на групата. Напиши го на колкото езика искаш — пътуващите го четат на своя.',
  'host.steps.media.title': 'Добави снимките си',
  'host.steps.media.body':
    'Поне една корична снимка. Покажи как наистина изглежда преживяването; стоковите снимки тук не вършат работа.',
  'host.steps.pricing.title': 'Определи календара и цената',
  'host.steps.pricing.body':
    'Кои дни, колко души, колко струва. Цената я пишеш в собствената си валута и в нея получаваш парите.',
  'host.steps.publish.title': 'Публикувай',
  'host.steps.publish.body':
    'Няма какво да чакаш. В мига, в който публикуваш, обявата ти се появява в търсенето.',

  'host.contact.title': 'Пиши ни, ако се затрудниш',
  'host.contact.body':
    'Грижим се за първите домакини един по един. Ако нещо те блокира, докато подготвяш обявата си, или не си сигурен в някое решение, пиши — ще го разплетем заедно.',
  'host.contact.cta': 'Пиши ни',
  'host.contact.howItWorks': 'Как работи',

  'host.error.blocked': 'Този профил е спрян, затова не може да стане домакин. destek@expyra.com',

  // --- Съветник за преживяване -----------------------------------------------

  'host.experience.new.meta.title': 'Ново преживяване',
  'host.experience.new.title': 'Започни ново преживяване',
  'host.experience.new.lede':
    'Първо те питаме само едно: на кой език ще напишеш обявата. Всичко останало попълваш в черновата, в какъвто ред искаш.',
  'host.experience.new.language.label': 'На кой език ще пишеш?',
  'host.experience.new.language.help':
    'Този избор не може да се промени по-късно: адресът на обявата ти идва от него, а пътуващите виждат този текст, когато няма написан друг език. Другите езици можеш да добавиш след това.',
  'host.experience.new.submit': 'Отвори черновата',
  'host.experience.new.pending': 'Отваря се…',

  'host.experience.new.next.heading': 'Какво следва?',
  'host.experience.new.next.text': 'Заглавие и описание — на колкото езика искаш.',
  'host.experience.new.next.basics': 'Колко трае и колко души приемаш.',
  'host.experience.new.next.place': 'Град, категория и езиците, на които говориш в деня на преживяването.',
  'host.experience.new.next.publish': 'Публикувай, когато си готов. Няма какво да чакаш.',

  'host.experience.edit.meta.title': 'Редактирай преживяването',
  'host.experience.edit.lede':
    'Всеки раздел се запазва сам. Спри където искаш — черновата те чака.',
  'host.experience.untitled': 'Чернова без заглавие',
  'host.experience.back': '← Обратно към панела на домакина',

  'host.experience.save': 'Запази',
  'host.experience.saving': 'Запазва се…',
  'host.experience.saved': 'Запазено.',

  'host.experience.section.text': 'Заглавие и описание',
  'host.experience.section.textHelp':
    'Това четат пътуващите, преди да решат. Кажи какво ще правите, къде се срещате и какво те свързва с него.',
  'host.experience.section.basics': 'Продължителност и капацитет',
  'host.experience.section.basicsHelp':
    'Колко трае една сесия и колко души приемаш наведнъж. Календарът и цената идват по-късно.',
  'host.experience.section.place': 'Град',
  'host.experience.section.placeHelp':
    'Къде се провежда преживяването. Часовата зона идва от него — часовете на сесиите се показват по нея.',
  'host.experience.section.category': 'Категория',
  'host.experience.section.categoryHelp':
    'Пътуващите филтрират по нея в търсенето. Избери най-близката; може да се избере само една.',
  'host.experience.section.languages': 'Говорими езици и етикети',
  'host.experience.section.languagesHelp':
    'На кои езици водиш преживяването? Това е отделно нещо от езика, на който си написал обявата.',
  'host.experience.section.status': 'Публикуване',
  'host.experience.section.statusHelp':
    'Какво е нужно за публикуване е изброено по-долу. Няма стъпка на одобрение — когато нищо не липсва, обявата ти се появява в търсенето веднага.',

  'host.experience.translations.tabsLabel': 'Езици на текста на обявата',
  'host.experience.translations.required': 'задължителен',
  'host.experience.translations.optional': 'по избор',
  'host.experience.translations.add.label': 'Напиши на друг език',
  'host.experience.translations.add.submit': 'Отвори',
  'host.experience.translations.machine':
    'Този текст е преведен автоматично. Редактирай го и го запази и той става твой собствен текст.',

  'host.experience.title.label': 'Заглавие',
  'host.experience.title.placeholder': 'Разходка из уличната храна в Кадъкьой',
  'host.experience.title.help':
    'Кратко и конкретно. Това е първото, което пътуващите виждат в списъка, и адресът на обявата ти идва от него.',
  'host.experience.description.label': 'Описание',
  'host.experience.description.placeholder':
    'Къде се срещате, какво правите, какво да хапнете, какво да облечете…',
  'host.experience.description.help':
    'Не е задължително за публикуване, но тук пътуващите вземат решение. Мини през деня по ред.',

  'host.experience.duration.label': 'Продължителност (часове)',
  'host.experience.duration.help':
    'Общата дължина на една сесия. Например 1,5 часа или 3. Най-много седем дни (168 часа).',
  'host.experience.capacity.label': 'Капацитет (души)',
  'host.experience.capacity.help':
    'Колко души най-много в една сесия. За публикуване е нужен поне един.',

  'host.experience.city.label': 'В кой град е?',
  'host.experience.city.placeholder': 'Потърси град',
  'host.experience.place.saved': 'Градът е избран · часова зона {saat}',
  'host.experience.place.empty': 'Още не е избран град.',
  'host.experience.place.locked':
    'След като обявата е публикувана, градът ѝ е фиксиран: часовете на сесиите и местата за резервации зависят от него. За друг град отвори нова обява.',

  'host.experience.category.label': 'Категория',
  'host.experience.category.none': 'Не е избрана',
  'host.experience.category.help': 'За какво е най-вече преживяването.',

  'host.experience.spoken.label': 'Езици, на които говориш по време на преживяването',
  'host.experience.spoken.help':
    'Независимо от езика, на който си написал обявата: отметни езиците, на които наистина го водиш. Най-много десет.',
  'host.experience.spoken.search.label': 'Търсене на езици',
  'host.experience.spoken.search.placeholder': 'немски, Deutsch, de…',
  'host.experience.spoken.search.results': { one: '{n} език в списъка', other: '{n} езика в списъка' },
  'host.experience.spoken.search.none': 'Няма подходящ език. Отметнатите езици се запазват.',
  'host.experience.tags.label': 'Етикети',
  'host.experience.tags.placeholder': 'уличната храна, разходка, малка група',
  'host.experience.tags.help':
    'Раздели със запетаи. Най-много десет. Помагат на обявата ти да се появява в търсенията.',

  'host.experience.missing.heading': 'Какво е нужно за публикуване',
  'host.experience.ready': 'Всичко е готово. Можеш да публикуваш тази обява.',
  'host.experience.missing.translation': 'заглавие на езика, на който е написана обявата',
  'host.experience.missing.city': 'град',
  'host.experience.missing.category': 'категория',
  'host.experience.missing.capacity': 'капацитет',
  'host.experience.missing.duration': 'продължителност',
  'host.experience.missing.cover': 'корична снимка',
  'host.experience.missing.price': 'цена',
  'host.experience.missing.unknown': 'недовършено поле',

  'host.experience.publish': 'Публикувай',
  'host.experience.republish': 'Публикувай отново',
  'host.experience.publishing': 'Публикува се…',
  'host.experience.published': 'Обявата ти е на живо.',
  'host.experience.unpublish': 'Спри публикуването',
  'host.experience.unpublishing': 'Спира се публикуването…',
  'host.experience.unpublished': 'Обявата е върната в чернова — скрита е от търсенето.',
  'host.experience.archive': 'Архивирай',
  'host.experience.archiving': 'Архивира се…',
  'host.experience.archived': 'Обявата е архивирана.',

  // --- Медия (Блок 6) -----------------------------------------------------
  'host.media.heading': 'Снимки',
  'host.media.hint': 'JPEG, PNG или WebP · поне 800×600 пиксела · до 10 MB · най-много 12 снимки',
  'host.media.add': 'Добави снимки',
  'host.media.drop': 'Пусни файловете тук',
  'host.media.uploading': 'Качва се…',
  'host.media.empty': 'Още няма снимки. Първата, която качиш, става коричната.',
  'host.media.cover': 'Корична',
  'host.media.makeCover': 'Направи корична',
  'host.media.delete': 'Изтрий',
  'host.media.moveEarlier': 'Премести по-напред',
  'host.media.moveLater': 'Премести по-назад',
  'host.media.position': 'Снимка {n}',
  'host.media.error.rejected': 'Тази снимка не беше приета.',
  'host.media.error.unsupported': 'Могат да се качват само JPEG, PNG и WebP.',
  'host.media.error.notUploaded': 'Качването не завърши. Опитай отново.',
  'host.media.error.notAnImage': 'Този файл не е изображение.',
  'host.media.error.mismatch': 'Съдържанието на файла не съвпада с разширението му.',
  'host.media.error.tooSmall': 'Снимките трябва да са поне 800×600 пиксела.',
  'host.media.error.tooLarge': 'Файловете могат да са най-много 10 MB.',
  'host.media.error.limit': 'Една обява може да има най-много 12 снимки.',

  'host.experience.status.publishedNote':
    'Обявата ти се появява в търсенето. Спри публикуването, за да я върнеш в чернова — редактирай снимките и публикувай отново. Архивирането също я скрива, без да я изтрива.',
  'host.experience.status.privateNote': 'Докато не я публикуваш, никой освен теб не вижда тази обява.',

  'host.experience.error.notFound': 'Не намерихме тази обява. Отвори я отново от панела.',
  'host.experience.error.invalid': 'Този раздел не можа да се запази. Провери полетата и опитай отново.',
  'host.experience.error.language':
    'Обяви не могат да се пишат на този език. Избери друг от списъка.',
  'host.experience.error.title': 'Заглавието е задължително и може да е най-много 120 символа.',
  'host.experience.error.description': 'Описанието може да е най-много 4000 символа.',
  'host.experience.error.duration': 'Напиши продължителността в часове: най-малко 0,5, най-много 168.',
  'host.experience.error.capacity': 'Напиши капацитета в души: най-малко 1, най-много 500.',
  'host.experience.error.city': 'Избери града от списъка — самото изписване на името не е достатъчно.',
  'host.experience.error.category': 'Избери категория от списъка.',
  'host.experience.section.itinerary': 'Какво ще правиш',
  'host.experience.section.itineraryHelp':
    'Стъпките на преживяването по ред. Всяка стъпка е заглавие и по желание едно-две изречения. Списъкът е на езика на обявата; езиковите раздели по-горе важат и тук.',
  'host.experience.section.meeting': 'Място за среща',
  'host.experience.section.meetingHelp':
    'Къде ще те намерят гостите? Адресът не зависи от езика, указанията са на избрания език. Добави координати и гостите ще могат да го отворят в карта.',
  'host.experience.section.details': 'Добре е да знаеш',
  'host.experience.section.detailsHelp':
    'Възрастово ограничение, ниво на активност и какво е добре да знаят гостите предварително. Полетата, които оставиш празни, не се показват.',
  'host.experience.textLanguage.note': 'Текстовете в този раздел са на {dil}. Използвай разделите в 01, за да смениш езика.',

  'host.experience.itinerary.stepTitle.label': 'Стъпка {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Срещаме се на Хиподрума',
  'host.experience.itinerary.stepBody.placeholder': 'Състезателната писта за колесници на Византия; тук стоят Обелискът и Змийската колона.',
  'host.experience.itinerary.add': 'Добави стъпка',
  'host.experience.itinerary.remove': 'Премахни стъпката',
  'host.experience.itinerary.help': 'Празните редове не се запазват. До 20 стъпки.',

  'host.experience.meeting.address.label': 'Адрес',
  'host.experience.meeting.address.placeholder': 'Пред Галатската кула, Берекетзаде, Бейоглу',
  'host.experience.meeting.latitude.label': 'Географска ширина',
  'host.experience.meeting.longitude.label': 'Географска дължина',
  'host.experience.meeting.coords.help': 'И двете, или никоя. Десетични: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Указания',
  'host.experience.meeting.instructions.placeholder': 'Северната порта на кулата, търси водача с жълтия чадър.',

  'host.experience.details.minimumAge.label': 'Минимална възраст',
  'host.experience.details.minimumAge.help': 'Празно = без ограничение. 1–99.',
  'host.experience.details.activityLevel.label': 'Ниво на активност',
  'host.experience.details.activityLevel.none': 'Не е посочено',
  'host.experience.details.whatToBring.label': 'Какво да носиш',
  'host.experience.details.whatToBring.placeholder': 'Вода, удобни обувки, шал (за посещения в джамии)',
  'host.experience.details.notIncluded.label': 'Не е включено',
  'host.experience.details.notIncluded.placeholder': 'Билети за музеи, обяд',
  'host.experience.details.accessibility.label': 'Достъпност',
  'host.experience.details.accessibility.placeholder': 'Маршрутът има стълби; не е подходящ за инвалидни колички.',

  'host.experience.error.translationMissing': 'Първо напиши заглавието на този език (раздел 01), после попълни тези полета.',
  'host.experience.error.minimumAge': 'Минималната възраст трябва да е цяло число между 1 и 99.',
  'host.experience.error.coordinates': 'Ширината и дължината вървят заедно; ширина ±90, дължина ±180.',
  'host.experience.error.itinerary': 'Всяка стъпка има нужда от заглавие; до 20 стъпки.',

  'experience.activity.light': 'Лека',
  'experience.activity.moderate': 'Умерена',
  'experience.activity.strenuous': 'Напрегната',

  'host.profile.heading': 'Представи се',
  'host.profile.lede':
    'Показва се под името ти на страницата на обявата. Кой си и защо точно ти трябва да разказваш тази история — две изречения стигат.',
  'host.profile.headline.label': 'Кратко заглавие',
  'host.profile.headline.placeholder': 'Местен водач и историк в Истанбул',
  'host.profile.bio.label': 'За мен',
  'host.profile.bio.placeholder': 'Вече десет години развеждам хора по задните улички на града…',
  'host.profile.language.label': 'Език на текста',
  'host.profile.error.invalid': 'Заглавие до 80 символа, биография до 2000.',
  'host.experience.error.spokenLanguages': 'Можеш да отметнеш най-много десет езика.',
  'host.experience.error.tags': 'Етикетите не могат да са празни; най-много десет и всеки кратък.',
  'host.experience.error.publishedConflict':
    'Тази промяна не може да се направи на обява на живо. Първо я архивирай, после редактирай.',
  'host.experience.error.publishBlocked': 'Не е публикувана. Все още липсва: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Не е публикувана: обявата още не е завършена. Провери списъка по-горе.',

  // --- Категории -------------------------------------------------------------
  'category.food-drink': 'Храна и напитки',
  'category.art-culture': 'Изкуство и култура',
  'category.history-heritage': 'История и наследство',
  'category.nature-outdoors': 'Природа и открито',
  'category.water-sea': 'Вода и море',
  'category.sports-adventure': 'Спорт и приключения',
  'category.crafts-workshops': 'Занаяти и работилници',
  'category.music-nightlife': 'Музика и нощен живот',
  'category.wellness': 'Уелнес',
  'category.photography': 'Фотография',
  'category.tours-walks': 'Обиколки и разходки',
  'category.local-life': 'Местен живот',
  // --- Цени (PLAN Блок 7) ---
  'host.experience.section.pricing': 'Цена',
  'host.experience.section.pricingHelp':
    'Определи цената на човек в собствената си валута. Винаги получаваш парите в тази валута; ако пътуващ избере друга, превръща се само показваното.',

  'host.pricing.currency.label': 'Валута на изплащане',
  'host.pricing.currency.help':
    'Валутата, в която парите стигат до теб. Не може да се променя, след като обявата е публикувана — първо я архивирай.',
  'host.pricing.currency.locked': 'Валутата е заключена, защото обявата е на живо.',
  'host.pricing.currency.placeholder': 'Избери',

  'host.pricing.adult.label': 'Възрастен (на човек)',
  'host.pricing.adult.help': 'Задължително. Това е цената „от“, показвана в картите и в търсенето.',
  'host.pricing.child.label': 'Дете (на човек)',
  'host.pricing.child.help': 'Остави празно, ако не предлагаш детска цена. Въведи 0, ако е безплатно.',
  'host.pricing.infant.label': 'Бебе (на човек)',
  'host.pricing.infant.help': 'Остави празно, ако не предлагаш цена за бебета. Въведи 0, ако е безплатно.',

  'host.pricing.saved': 'Цената е запазена.',
  'host.pricing.empty': 'Още няма цена. Обява без цена не може да се публикува.',

  'host.pricing.error.currency': 'Избери валидна валута.',
  'host.pricing.error.currencyLocked':
    'Валутата на обява на живо не може да се променя. Първо я архивирай.',
  'host.pricing.error.adult': 'Цената за възрастен е задължителна и трябва да е валидна сума.',
  'host.pricing.error.child': 'Цената за дете трябва да е валидна сума.',
  'host.pricing.error.infant': 'Цената за бебе трябва да е валидна сума.',
  'host.pricing.error.range':
    'Тази сума е извън диапазона, който платежният доставчик приема — или е твърде малка, или твърде голяма.',

  // --- График (PLAN Блок 7) ---
  'host.experience.section.schedule': 'График',
  'host.experience.section.scheduleHelp':
    'В кои дни и часове го водиш? Часовете са по часовата зона на града — часът, който напишеш, остава същият и при смяна на лятно/зимно часово време.',

  'host.schedule.blocked':
    'Графикът първо изисква град, продължителност и капацитет. Довърши разделите по-горе.',
  'host.schedule.timeZone': 'Часова зона: {bolge}',
  'host.schedule.generatedThrough': 'Календарът ти е готов до {tarih}.',

  // Седмично правило
  'host.schedule.rule.heading': 'Седмично правило',
  'host.schedule.rule.days': 'Дни',
  'host.schedule.rule.daysHelp': 'Можеш да избереш повече от един; всеки ден става отделно правило.',
  'host.schedule.rule.time': 'Начален час',
  'host.schedule.rule.timeHelp': 'По местното време на града.',
  'host.schedule.rule.start': 'Започва от',
  'host.schedule.rule.startHelp': 'Остави празно, за да започне днес.',
  'host.schedule.rule.submit': 'Добави правило',
  'host.schedule.rule.pending': 'Добавя се…',
  'host.schedule.rule.stop': 'Премахни',
  'host.schedule.rule.stopping': 'Премахва се…',
  'host.schedule.rule.empty': 'Още няма седмични правила.',
  'host.schedule.rule.stopped': 'спряно',

  // Почивни дни
  'host.schedule.blackout.heading': 'Почивни дни',
  'host.schedule.blackout.start': 'От',
  'host.schedule.blackout.end': 'До',
  'host.schedule.blackout.endHelp': 'Остави празно, за да затвориш един ден. Крайният ден е включен.',
  'host.schedule.blackout.submit': 'Затвори',
  'host.schedule.blackout.pending': 'Затваря се…',
  'host.schedule.blackout.remove': 'Премахни',
  'host.schedule.blackout.removing': 'Премахва се…',
  'host.schedule.blackout.empty': 'Няма почивни дни.',

  // Сесии
  'host.schedule.slots.heading': 'Предстоящи сесии',
  'host.schedule.slots.empty': 'Няма сесии в този период.',
  'host.schedule.slots.remaining': {
    one: 'остава {n} място',
    other: 'остават {n} места',
  },
  'host.schedule.slots.closed': 'Затворена',
  'host.schedule.slots.closedByBlackout': 'Почивен ден',
  'host.schedule.slots.close': 'Затвори',
  'host.schedule.slots.closing': 'Затваря се…',
  'host.schedule.slots.open': 'Отвори',
  'host.schedule.slots.opening': 'Отваря се…',
  'host.schedule.slots.more': 'и още {n}',

  // Дни
  'host.schedule.day.monday': 'Понеделник',
  'host.schedule.day.tuesday': 'Вторник',
  'host.schedule.day.wednesday': 'Сряда',
  'host.schedule.day.thursday': 'Четвъртък',
  'host.schedule.day.friday': 'Петък',
  'host.schedule.day.saturday': 'Събота',
  'host.schedule.day.sunday': 'Неделя',

  // Потвърждения
  'host.schedule.ruleSaved': 'Правилото е добавено и сесиите са създадени.',
  'host.schedule.ruleStopped': 'Правилото е спряно.',
  'host.schedule.slotOpened': 'Сесията е отворена.',
  'host.schedule.slotClosed': 'Сесията е затворена.',
  'host.schedule.blackoutSaved': 'Дните са затворени.',
  'host.schedule.blackoutRemoved': 'Почивните дни са премахнати.',

  // Грешки — всяка съответства на машинночетим код от сървъра
  'host.schedule.error.noDay': 'Избери поне един ден.',
  'host.schedule.error.time': 'Въведи часа като ЧЧ:ММ.',
  'host.schedule.error.date': 'Въведи валидна дата.',
  'host.schedule.error.range': 'Крайната дата не може да е преди началната.',
  'host.schedule.error.notSchedulable':
    'Графикът първо изисква град, продължителност и капацитет.',
  'host.schedule.error.duplicateRule': 'Вече има правило за този ден и час.',
  'host.schedule.error.ruleLimit': 'Това преживяване не може да приеме повече седмични правила.',
  'host.schedule.error.dstGap':
    'Този час не съществува в този ден заради смяната на лятното/зимното часово време. Опитай един час по-късно.',
  'host.schedule.error.past': 'Минала сесия не може да се променя.',
  'host.schedule.error.slotExists': 'Вече има сесия в този час.',
  'host.schedule.error.blackedOut': 'Тази дата е отбелязана като почивен ден. Първо премахни периода.',
  'host.schedule.error.generated':
    'Сесия, създадена от седмично правило, не може да се изтрие; можеш да я затвориш.',
  'host.schedule.error.hasBookings': 'Сесия с резервации не може да се променя.',
  'host.schedule.error.blackoutLimit': 'Не могат да се добавят още почивни дни.',
  'host.schedule.error.horizon': 'Календарът не може да се отвори толкова напред.',
  'host.schedule.error.generic': 'Това не се получи в момента.',

} as const satisfies Dictionary<'bg'>

/**
 * Вътрешността на текста също се сравнява с източника: ако отпадне заместител
 * или името му се промени, компилацията се чупи с името на ключа.
 * `export` е съзнателен — неизползваният тип в lint се брои за мъртъв код.
 */
export type BgPlaceholders = Assert<PlaceholdersMatchSource<typeof bg>>
