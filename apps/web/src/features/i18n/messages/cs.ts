import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Çekçe arayüz.
 *
 * `satisfies Dictionary<'cs'>` iki şeyi zorluyor: kaynaktaki (`tr`) her anahtar
 * burada VAR ve çoğul anahtarlar Çekçe'nin CLDR biçimlerini taşıyor. Çekçe bu
 * repodaki ilk **dört biçimli** dil (`one` / `few` / `many` / `other`); `tr` ve
 * `en` ikiyle yetiniyordu.
 *
 * ### Çoğul biçimleri hangi sayıda seçiliyor
 *
 * | Biçim | Sayı | Örnek |
 * |---|---|---|
 * | `one` | 1 | `1 zážitek` |
 * | `few` | 2-4 | `3 zážitky` |
 * | `many` | kesirli | `1,5 hodiny` |
 * | `other` | 0, 5+ | `7 zážitků` |
 *
 * `many` yalnız ondalıklı sayıda seçilir, tam sayıda asla — bu yüzden oradaki
 * biçim genitiv **tekil** ("1,5 hodiny"), çoğul değil. Sözlükteki sayımların
 * çoğu tam sayı; `many` yine de yazılmak zorunda (tip istiyor) ve doğru
 * yazılıyor: ileride bir yerde kesirli bir değer basılırsa cümle bozulmasın.
 *
 * **Ton (VISION §6):** ürün bireye konuşuyor, kuruma değil. Çekçe metinler
 * ikinci tekil ("ty") — `vy` kurumsal mesafe koyardı ve Türkçe kaynağın "sen"
 * dili tam olarak bunun tersini istiyor. Pazarlama sıfatı, "prosím" ve ünlem
 * yok.
 *
 * Çevrilmeyen iki şey var ve ikisi de bilinçli: marka adı (Expyra) ve destek
 * adresi (`destek@expyra.com` — var olan tek kutu bu).
 */
export const cs = {
  'meta.description': 'Najdi místní zážitky a rezervuj si je.',

  'nav.primaryLabel': 'Hlavní nabídka',
  'nav.footerLabel': 'Nabídka v patičce',
  'nav.explore': 'Objevuj',
  'nav.myExperiences': 'Moje zážitky',
  'nav.becomeHost': 'Staň se hostitelem',
  'nav.howItWorks': 'Jak to funguje',

  'language.trigger': 'Jazyk: {dil}. Změnit.',
  'language.dialogLabel': 'Výběr jazyka',
  'language.search.label': 'Hledat jazyky',
  'language.search.placeholder': 'Hledat jazyky',
  'language.group.ui': 'Jazyky rozhraní',
  'language.group.content': 'Ostatní jazyky',
  'language.group.contentHint':
    'Rozhraní zatím přeložené není — zážitky v těchto jazycích ale zveřejnit lze.',
  'language.empty': 'Tomuto hledání neodpovídá žádný jazyk.',

  'theme.toLight': 'Přepnout na světlý vzhled',
  'theme.toDark': 'Přepnout na tmavý vzhled',

  // Důraz je v češtině na tom, co místní znají — jako v angličtině na názvu
  // produktu. Řádky nejsou doslovné: rozvržení je stejné, věta je česká.
  'home.hero.title': 'Nová cesta k zážitkům,',
  'home.hero.titleAccent': 'které znají jen místní',
  'home.hero.lede':
    'Od lidí, kteří tam opravdu žijí. Malé skupiny, skuteční lidé, pár hodin, na které nezapomeneš.',
  'home.showcase.heading': 'Zážitky na Expyře',
  'home.showcase.more': 'Zobrazit všechny zážitky',
  'home.showcase.unavailable':
    'Zážitky se teď nepodařilo načíst. Zkus to za chvíli — nabídky nikam nezmizely.',
  'home.showcase.empty.title': 'Zatím tu nic zveřejněného není',
  'home.showcase.empty.body':
    'Můžeš být první. Ukaž lidem něco, co znáš, v malé skupině.',
  'home.showcase.empty.cta': 'Staň se hostitelem',

  'search.destination.label': 'Kam?',
  'search.destination.placeholder': 'Hledat město',
  'search.date.label': 'Kdy?',
  'search.date.placeholder': 'Vyber datum',
  'search.date.dialogLabel': 'Vyber datum',
  'search.date.day': 'Den',
  'search.date.month': 'Měsíc',
  'search.date.year': 'Rok',
  'search.date.done': 'Hotovo',
  'search.date.clear': 'Vymazat',
  'search.date.stepUp': '{alan} nahoru',
  'search.date.stepDown': '{alan} dolů',
  'search.submit': 'Hledat',

  'search.city.listLabel': 'Návrhy měst',
  'search.city.countriesHeading': 'Země',
  'search.city.citiesHeading': 'Města',
  'search.city.allCountries': 'Všechny země',
  'search.city.tooShort': 'Začni psát název města nebo vyber zemi ze seznamu.',
  'search.city.loading': 'Hledám…',
  'search.city.error': 'Seznam měst se nepodařilo načíst. Zkus to za chvíli.',
  'search.city.empty': 'Tomuto hledání neodpovídá žádné město.',
  'search.city.truncated': 'Měst je víc — piš dál a seznam se zúží.',
  'search.city.clear': 'Zrušit vybrané město',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': {
    one: 'Nalezeno {n} město',
    few: 'Nalezena {n} města',
    many: 'Nalezeno {n} města',
    other: 'Nalezeno {n} měst',
  },
  'search.city.countryCities': {
    one: '{n} město',
    few: '{n} města',
    many: '{n} města',
    other: '{n} měst',
  },

  'search.guests.label': 'Hosté',
  'search.guests.dialogLabel': 'Počet hostů',
  'search.guests.done': 'Hotovo',
  'search.guests.adults': 'Dospělí',
  'search.guests.adults.hint': '13 let a víc',
  'search.guests.adults.decrease': 'O jednoho dospělého míň',
  'search.guests.adults.increase': 'O jednoho dospělého víc',
  'search.guests.children': 'Děti',
  'search.guests.children.hint': '0–12 let',
  'search.guests.children.decrease': 'O jedno dítě míň',
  'search.guests.children.increase': 'O jedno dítě víc',
  'search.guests.summary.adults': {
    one: '{n} dospělý',
    few: '{n} dospělí',
    many: '{n} dospělého',
    other: '{n} dospělých',
  },
  'search.guests.summary.children': {
    one: '{n} dítě',
    few: '{n} děti',
    many: '{n} dítěte',
    other: '{n} dětí',
  },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': {
    one: '{n} hodina',
    few: '{n} hodiny',
    many: '{n} hodiny',
    other: '{n} hodin',
  },
  'experience.duration.minutes': {
    one: '{n} minuta',
    few: '{n} minuty',
    many: '{n} minuty',
    other: '{n} minut',
  },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Délka neuvedena',
  'experience.meta': {
    one: '{sure} · až pro {n} osobu',
    few: '{sure} · až pro {n} osoby',
    many: '{sure} · až pro {n} osoby',
    other: '{sure} · až pro {n} osob',
  },
  'experience.card.language': 'Tato nabídka je napsaná v jazyce {dil}',

  'explore.heading.all': 'Všechny zážitky',
  'explore.heading.city': 'Zážitky ve městě {sehir}',
  'explore.heading.query': 'Výsledky pro „{arama}“',
  'explore.summary': {
    one: '{n} zážitek',
    few: '{n} zážitky',
    many: '{n} zážitku',
    other: '{n} zážitků',
  },
  'explore.summary.page': {
    one: 'Na této stránce {n} zážitek',
    few: 'Na této stránce {n} zážitky',
    many: 'Na této stránce {n} zážitku',
    other: 'Na této stránce {n} zážitků',
  },
  // Sloveso se pojí s „nebereme“, ne s výčtem — seznam filtrů proto zůstává
  // v prvním pádě a věta funguje pro jeden i víc filtrů.
  'explore.filtersNotice':
    'Výsledky zužujeme jen podle města — {filtreler} zatím nebereme v potaz.',
  'explore.filter.date': 'zvolené datum',
  'explore.filter.guests': 'počet hostů',

  'explore.pager.label': 'Stránky výsledků',
  'explore.pager.next': 'Další stránka',
  'explore.pager.first': 'Zpět na první stránku',

  'explore.pageLink.title': 'Odkaz na stránku se nepodařilo přečíst',
  'explore.pageLink.body':
    'Značka stránky v adrese vypadá poškozeně. Spusť hledání znovu — výsledky nikam nezmizely.',

  'explore.empty.title': 'Tady zatím žádné zážitky nejsou',
  'explore.empty.body':
    'Zkus jiné město ze seznamu. Nová města a nové zážitky přibývají průběžně.',
  'explore.empty.cta': 'Zobrazit všechny zážitky',
  'explore.empty.hostCta': 'Buď tu prvním hostitelem',

  'explore.cityMissing.title': 'Toto město neznáme',
  'explore.cityMissing.body':
    'Město z adresy není v našem rejstříku — odkaz může být zastaralý. Vyber město ze seznamu v poli výše.',
  'explore.cityMissing.cta': 'Zobrazit všechny zážitky',

  'experience.detail.meta.fallback': 'Místní zážitek ve městě {sehir}.',
  'experience.detail.text.fallback': 'Tento popis je v jazyce {dil}',
  'experience.detail.duration.label': 'Délka',
  'experience.detail.capacity.label': 'Velikost skupiny',
  'experience.detail.capacity.value': {
    one: 'Až pro {n} osobu',
    few: 'Až pro {n} osoby',
    many: 'Až pro {n} osoby',
    other: 'Až pro {n} osob',
  },
  'experience.detail.about': 'O tomto zážitku',
  'experience.detail.noDescription': 'Hostitel zatím popis nenapsal.',
  'experience.detail.spoken.heading': 'Jazyky, kterými se během zážitku mluví',
  'experience.detail.spoken.help':
    'V těchto jazycích hostitel zážitek vede. Jazyk, ve kterém je napsaná nabídka, je něco jiného.',
  'experience.detail.spoken.none': 'Hostitel zatím neuvedl, jakými jazyky mluví.',
  'experience.detail.tags.heading': 'Štítky',
  'experience.detail.gallery.heading': 'Galerie',
  'experience.detail.host.heading': 'Hostitel',
  'experience.detail.host.anonymous': 'Hostitel na Expyře',
  'experience.detail.booking.title': 'Termíny a cena',
  'experience.detail.booking.noSlots':
    'Zatím nejsou otevřené žádné termíny. Objeví se tu, jakmile hostitel upraví kalendář.',
  'experience.detail.booking.perPerson': 'za osobu',
  'experience.detail.booking.pickDate': 'Vyber datum',
  'experience.detail.booking.timeZone': 'Časy jsou v pásmu {bolge}.',
  'experience.detail.booking.adults': 'Dospělí',
  'experience.detail.booking.children': 'Děti',
  'experience.detail.booking.infants': 'Batolata',
  'experience.detail.booking.currency': 'Měna',
  'experience.detail.booking.currencyNone': 'Měna hostitele',
  'experience.detail.booking.update': 'Spočítat cenu',
  'experience.detail.booking.total': 'Celkem',
  'experience.detail.booking.displayTotal': 'Přibližně {tutar}',
  'experience.detail.booking.chargedIn':
    'Platíš v měně {paraBirimi}. Pokud tvoje karta používá jinou měnu, banka si přepočet udělá po svém.',
  'experience.detail.booking.quoteFailed':
    'Tento výběr se nepodařilo nacenit. Termín možná nemá dost místa, nebo se mezitím uzavřel.',
  'experience.detail.cityLink': 'Všechny zážitky ve městě {sehir}',
  'experience.detail.back': 'Zpět na Objevuj',

  'howItWorks.lede': 'Tři kroky a je hotovo.',
  'howItWorks.back': 'Zpět',
  'howItWorks.step.discover.title': 'Objevuj',
  'howItWorks.step.discover.body':
    'Projdi si místní zážitky ve svém městě. Malé skupiny, skuteční hostitelé.',
  'howItWorks.step.book.title': 'Rezervuj',
  'howItWorks.step.book.body':
    'Vyber datum a počet lidí, uvidíš cenu. Rezervace brzy přibudou.',
  'howItWorks.step.join.title': 'Přijď',
  'howItWorks.step.join.body': 'Hostitel tě přivítá a zážitek začíná.',
  'howItWorks.backToExplore': 'Zpět k objevování',

  'myExperiences.lede': 'Tady najdeš své vstupenky.',
  'myExperiences.upcoming': 'Nadcházející · {sayi}',
  'myExperiences.past': 'Proběhlé · {sayi}',
  'myExperiences.downloadPdf': 'Stáhnout PDF',
  'myExperiences.wallet': 'Přidat do Apple Wallet',
  'myExperiences.wallet.soon': 'Brzy',
  'myExperiences.rate': 'Ohodnotit',
  'myExperiences.rate.soon': 'Otevře se po skončení zážitku',

  'ticket.demoBadge': 'Ukázková vstupenka',
  'ticket.demoNote':
    'Ukázková vstupenka: QR kód zatím není podepsaný a na místě ho nelze ověřit.',
  'ticket.guests': 'Hosté',
  'ticket.amount': 'Celkem',
  'ticket.status': 'Stav',
  'ticket.status.valid': 'Platná',
  'ticket.status.used': 'Použitá',
  'ticket.timeZoneNote': 'místního času ({sehir})',

  'ticket.pdf.kicker': 'Vstupenka na zážitek',
  'ticket.pdf.dateTime': 'Datum a čas',
  'ticket.pdf.docTitle': 'Vstupenka Expyra — {baslik}',
  'ticket.pdf.code': 'Kód vstupenky {kod}',
  'ticket.pdf.notice.valid': 'Hostitel kód na místě naskenuje. Platí jen jednou.',
  'ticket.pdf.notice.used': 'Tato vstupenka už byla na místě použita.',

  'ticket.error.signedOut': 'Pro zobrazení vstupenky se přihlas.',
  'ticket.error.notFound': 'Vstupenka s tímto kódem neexistuje.',

  'auth.meta.title': 'Přihlášení',
  'auth.title': 'Přihlas se nebo si založ účet',
  'auth.back': 'Zpět',

  'auth.email.lede': 'Napiš svou adresu a pošleme ti jednorázový kód. Bez hesla.',
  'auth.email.label': 'Tvoje e-mailová adresa',
  'auth.email.help': 'Na tuto adresu pošleme kód.',
  'auth.email.placeholder': 'ty@example.com',
  'auth.email.error.invalid': 'Tato adresa nevypadá správně. Příklad: ty@example.com',

  'auth.code.lede': 'Šestimístný kód jsme poslali na:',
  'auth.code.label': 'Kód z e-mailu',
  'auth.code.hint':
    'Kód platí 10 minut. Pokud e-mail nemůžeš najít, mrkni do spamu.',
  'auth.code.resend': 'Poslat nový kód',
  'auth.code.changeEmail': 'Použít jinou adresu',

  'auth.common.continue': 'Pokračovat',
  'auth.common.working': 'Odesílám…',

  'auth.otp.error.invalid': 'Kód nesouhlasí. Zkontroluj těch 6 číslic v posledním e-mailu.',
  'auth.otp.error.locked':
    'Příliš mnoho pokusů. Kód jsme kvůli bezpečnosti účtu uzavřeli — vyžádej si nový.',
  'auth.otp.error.resendTooSoon': {
    one: 'Než si řekneš o nový kód, počkej ještě {n} sekundu.',
    few: 'Než si řekneš o nový kód, počkej ještě {n} sekundy.',
    many: 'Než si řekneš o nový kód, počkej ještě {n} sekundy.',
    other: 'Než si řekneš o nový kód, počkej ještě {n} sekund.',
  },

  'auth.error.tooManyRequests': 'Příliš mnoho vyžádaných kódů. Zkus to za chvíli.',
  'auth.error.suspended': 'Tento účet je pozastavený. destek@expyra.com',
  'auth.error.expiredChallenge': 'Tento pokus o přihlášení vypršel. Zadej adresu znovu.',

  'account.title': 'Tvůj účet',
  'account.lede': 'Tady si změníš jméno a preferovaný jazyk.',

  'account.email.label': 'Tvoje e-mailová adresa',
  'account.email.note': 'E-mailovou adresu zatím měnit nelze.',

  // --- Tapeta (sdílené rozvržení — vidět na KAŽDÉ stránce) ------------------
  'wallpaper.istanbul.place': 'Istanbul',
  'wallpaper.istanbul.label': 'Grilovaná ryba na ulici',
  'wallpaper.kitchen.place': 'Domácí kuchyně',
  'wallpaper.kitchen.label': 'Vaření s tetou',
  'wallpaper.cappadocia.place': 'Kappadokie',
  'wallpaper.cappadocia.label': 'Horkovzdušný balon',
  'wallpaper.pause': 'Pozastavit video na pozadí',
  'wallpaper.play': 'Přehrát video na pozadí',
  'account.avatar.label': 'Profilová fotka',
  'account.avatar.help': 'JPEG, PNG nebo WebP · minimálně 800×600 pixelů · do 10 MB',
  'account.avatar.add': 'Přidat fotku',
  'account.avatar.change': 'Změnit',
  'account.avatar.remove': 'Odebrat',
  'account.avatar.uploading': 'Nahrávám…',
  'account.name.label': 'Zobrazované jméno',
  'account.name.help': 'Toto jméno vidí ostatní. Můžeš ho nechat prázdné.',
  'account.name.placeholder': 'např. Alex M.',

  'account.language.label': 'Tvůj preferovaný jazyk',
  'account.language.help':
    'Jazyk, kterým ti píšeme. Jazyk rozhraní se řídí adresou v prohlížeči, ne touto volbou.',
  'account.language.none': 'Nenastaveno',

  'account.save': 'Uložit',
  'account.saving': 'Ukládám…',
  'account.saved': 'Změny uloženy.',

  'account.error.name': {
    one: 'Zobrazované jméno může mít nejvýš {n} znak.',
    few: 'Zobrazované jméno může mít nejvýš {n} znaky.',
    many: 'Zobrazované jméno může mít nejvýš {n} znaku.',
    other: 'Zobrazované jméno může mít nejvýš {n} znaků.',
  },
  'account.error.language': 'Tento jazyk zatím nepodporujeme. Vyber ze seznamu jiný.',
  'account.error.signedOut': 'Tvoje relace skončila. Přihlas se znovu.',

  'account.menu.trigger': 'Nabídka účtu: {ad}',
  'account.menu.title': 'Účet',
  'account.menu.signedInAs': 'Přihlášen jako {eposta}',
  'account.menu.account': 'Tvůj účet',
  'account.menu.signOut': 'Odhlásit se',
  'account.menu.fallbackLabel': 'Tvůj účet',

  'account.signIn': 'Přihlásit se',
  'account.loading': 'Načítám tvou relaci',

  'host.meta.title': 'Staň se hostitelem',

  'host.invite.title': 'Zveřejni svůj vlastní zážitek',
  'host.invite.lede':
    'Ukaž lidem něco, co znáš, vezmi je tam, kudy sám chodíš. Cenu, velikost skupiny, kalendář i storno podmínky si určuješ ty — do toho, co nabízíš, nemluvíme.',
  'host.invite.noApproval':
    'Žádné schvalování, žádná přihláška. Jakmile řekneš, že chceš hostit, panel se ti otevře.',
  'host.invite.cta': 'Staň se hostitelem',
  'host.invite.pending': 'Otevírám…',

  'host.signedOut.note':
    'Než začneš hostit, je potřeba se přihlásit. Heslo po tobě nechceme — na tvou adresu pošleme jednorázový kód.',
  'host.signedOut.cta': 'Přihlas se a staň se hostitelem',

  'host.panel.title': 'Panel hostitele',
  'host.panel.lede':
    'Odsud řídíš své zážitky. Cenu, skupinu, kalendář i storno podmínky si určuješ ty — do toho, co nabízíš, nemluvíme.',
  'host.panel.status': 'Tvůj účet je otevřený jako hostitelský.',
  'host.panel.new': 'Nový zážitek',

  'host.listings.heading': 'Moje nabídky · {sayi}',
  'host.listings.edit': 'Upravit',
  'host.listings.view': 'Zobrazit nabídku',
  'host.listings.status.draft': 'Koncept',
  'host.listings.status.published': 'Zveřejněno',
  'host.listings.status.archived': 'Archivováno',

  'host.listings.ready': 'Připraveno ke zveřejnění',
  'host.listings.missing': {
    one: 'Chybí {n} pole',
    few: 'Chybí {n} pole',
    many: 'Chybí {n} pole',
    other: 'Chybí {n} polí',
  },

  'host.listings.empty.heading': 'Moje nabídky',
  'host.listings.empty.title': 'Zatím nemáš žádnou nabídku',
  'host.listings.empty.body':
    'Otevři si první koncept. Můžeš na něm pracovat, jak dlouho chceš — koncept nikdo jiný nevidí.',
  'host.listings.empty.cta': 'Napiš svůj první zážitek',

  'host.listings.errorHeading': 'Moje nabídky',
  'host.listings.error':
    'Tvoje nabídky se teď nepodařilo načíst. Nic se nesmazalo — za chvíli stránku načti znovu.',

  'host.steps.heading': 'Jak začít?',
  'host.steps.describe.title': 'Popiš svůj zážitek',
  'host.steps.describe.body':
    'Název, popis, délka a velikost skupiny. Napiš to v tolika jazycích, kolik chceš — cestovatelé si to přečtou ve svém.',
  'host.steps.media.title': 'Přidej fotky',
  'host.steps.media.body':
    'Aspoň jednu titulní. Ukaž, jak zážitek doopravdy vypadá; fotky z databank tu nefungují.',
  'host.steps.pricing.title': 'Nastav kalendář a cenu',
  'host.steps.pricing.body':
    'Které dny, kolik lidí, za kolik. Cenu píšeš ve své měně a v té ti taky přijdou peníze.',
  'host.steps.publish.title': 'Zveřejni',
  'host.steps.publish.body':
    'Na nic se nečeká. Jakmile zveřejníš, tvoje nabídka se objeví ve vyhledávání.',

  'host.contact.title': 'Napiš nám, když se zasekneš',
  'host.contact.body':
    'O první hostitele se staráme jednoho po druhém. Pokud tě při skládání nabídky něco blokuje nebo si nejsi jistý nějakým rozhodnutím, napiš — projdeme to s tebou.',
  'host.contact.cta': 'Napiš nám',
  'host.contact.howItWorks': 'Jak to funguje',

  'host.error.blocked':
    'Tento účet je pozastavený, takže se nemůže stát hostitelským. destek@expyra.com',

  // --- Průvodce zážitkem -----------------------------------------------------

  'host.experience.new.meta.title': 'Nový zážitek',
  'host.experience.new.title': 'Založ nový zážitek',
  'host.experience.new.lede':
    'Nejdřív se ptáme na jedinou věc: v jakém jazyce nabídku napíšeš. Všechno ostatní vyplníš uvnitř konceptu, v libovolném pořadí.',
  'host.experience.new.language.label': 'V jakém jazyce budeš psát?',
  'host.experience.new.language.help':
    'Tohle už změnit nepůjde: odvíjí se od toho adresa tvé nabídky a cestovatelé uvidí tento text, když není napsaný žádný jiný jazyk. Další jazyky můžeš přidat později.',
  'host.experience.new.submit': 'Otevřít koncept',
  'host.experience.new.pending': 'Otevírám…',

  'host.experience.new.next.heading': 'Co bude dál?',
  'host.experience.new.next.text': 'Název a popis — v tolika jazycích, kolik chceš.',
  'host.experience.new.next.basics': 'Jak dlouho trvá a kolik lidí bereš.',
  'host.experience.new.next.place': 'Město, kategorie a jazyky, kterými v ten den mluvíš.',
  'host.experience.new.next.publish': 'Zveřejni, až budeš chtít. Na nic se nečeká.',

  'host.experience.edit.meta.title': 'Upravit zážitek',
  'host.experience.edit.lede':
    'Každá část se ukládá zvlášť. Přestaň, kdy chceš — koncept na tebe počká.',
  'host.experience.untitled': 'Koncept bez názvu',
  'host.experience.back': '← Zpět do panelu hostitele',

  'host.experience.save': 'Uložit',
  'host.experience.saving': 'Ukládám…',
  'host.experience.saved': 'Uloženo.',

  'host.experience.section.text': 'Název a popis',
  'host.experience.section.textHelp':
    'Tohle si cestovatelé přečtou, než se rozhodnou. Napiš, co budeš dělat, kde se sejdete a co tě k tomu váže.',
  'host.experience.section.basics': 'Délka a kapacita',
  'host.experience.section.basicsHelp':
    'Jak dlouho trvá jeden termín a kolik lidí najednou bereš. Kalendář a cena přijdou později.',
  'host.experience.section.place': 'Město',
  'host.experience.section.placeHelp':
    'Kde se zážitek odehrává. Od toho se odvíjí časové pásmo — časy termínů se zobrazují v něm.',
  'host.experience.section.category': 'Kategorie',
  'host.experience.section.categoryHelp':
    'Podle toho cestovatelé filtrují ve vyhledávání. Vyber nejbližší; zvolit lze jen jednu.',
  'host.experience.section.languages': 'Mluvené jazyky a štítky',
  'host.experience.section.languagesHelp':
    'V jakých jazycích zážitek vedeš? To je něco jiného než jazyk, ve kterém jsi napsal nabídku.',
  'host.experience.section.status': 'Zveřejnění',
  'host.experience.section.statusHelp':
    'Co je ke zveřejnění potřeba, je vypsané níž. Žádné schvalování tu není — když nic nechybí, nabídka se ve vyhledávání objeví hned.',

  'host.experience.translations.tabsLabel': 'Jazyky textu nabídky',
  'host.experience.translations.required': 'povinné',
  'host.experience.translations.optional': 'nepovinné',
  'host.experience.translations.add.label': 'Napsat v dalším jazyce',
  'host.experience.translations.add.submit': 'Otevřít',
  'host.experience.translations.machine':
    'Tento text byl přeložen automaticky. Uprav ho a ulož a stane se tvým vlastním.',

  'host.experience.title.label': 'Název',
  'host.experience.title.placeholder': 'Procházka za street foodem v Kadıköy',
  'host.experience.title.help':
    'Krátce a konkrétně. Je to první, co cestovatelé v seznamu uvidí, a odvíjí se od toho adresa tvé nabídky.',
  'host.experience.description.label': 'Popis',
  'host.experience.description.placeholder':
    'Kde se sejdete, co budete dělat, co se jí, jak se obléct…',
  'host.experience.description.help':
    'Ke zveřejnění není povinný, ale právě tady se cestovatelé rozhodují. Projdi ten den popořadě.',

  'host.experience.duration.label': 'Délka (minuty)',
  'host.experience.duration.help':
    'Celková délka jednoho termínu. Například 90 minut nebo 180. Nejvýš sedm dní.',
  'host.experience.capacity.label': 'Kapacita (osoby)',
  'host.experience.capacity.help':
    'Kolik lidí nejvýš v jednom termínu. Ke zveřejnění je potřeba aspoň jeden.',

  'host.experience.city.label': 'Ve kterém městě to je?',
  'host.experience.city.placeholder': 'Hledat město',
  'host.experience.place.saved': 'Město vybráno · časové pásmo {saat}',
  'host.experience.place.empty': 'Zatím není vybrané žádné město.',
  'host.experience.place.locked':
    'Jakmile je nabídka zveřejněná, město je dané: závisí na něm časy termínů i místo rezervace. Pro jiné město založ novou nabídku.',

  'host.experience.category.label': 'Kategorie',
  'host.experience.category.none': 'Nevybráno',
  'host.experience.category.help': 'O čem zážitek převážně je.',

  'host.experience.spoken.label': 'Jazyky, kterými během zážitku mluvíš',
  'host.experience.spoken.help':
    'Nezávisí na jazyce, ve kterém jsi napsal nabídku: zaškrtni jazyky, ve kterých ho opravdu vedeš. Nejvýš deset.',
  'host.experience.spoken.search.label': 'Hledat jazyk',
  'host.experience.spoken.search.placeholder': 'němčina, Deutsch, de…',
  'host.experience.spoken.search.results': {
    one: 'V seznamu je {n} jazyk',
    few: 'V seznamu jsou {n} jazyky',
    many: 'V seznamu je {n} jazyka',
    other: 'V seznamu je {n} jazyků',
  },
  'host.experience.spoken.search.none': 'Žádný jazyk neodpovídá. Zaškrtnuté jazyky zůstávají.',
  'host.experience.tags.label': 'Štítky',
  'host.experience.tags.placeholder': 'street food, procházka, malá skupina',
  'host.experience.tags.help':
    'Odděluj čárkami. Nejvýš deset. Pomáhají tvé nabídce trefit se do hledání.',

  'host.experience.missing.heading': 'Co je ke zveřejnění potřeba',
  'host.experience.ready': 'Všechno je hotové. Nabídku můžeš zveřejnit.',
  'host.experience.missing.translation': 'název v jazyce, ve kterém je nabídka napsaná',
  'host.experience.missing.city': 'město',
  'host.experience.missing.category': 'kategorii',
  'host.experience.missing.capacity': 'kapacitu',
  'host.experience.missing.duration': 'délku',
  'host.experience.missing.cover': 'titulní fotku',
  'host.experience.missing.price': 'cenu',
  'host.experience.missing.unknown': 'nedokončené pole',

  'host.experience.publish': 'Zveřejnit',
  'host.experience.republish': 'Zveřejnit znovu',
  'host.experience.publishing': 'Zveřejňuji…',
  'host.experience.published': 'Tvoje nabídka je online.',
  'host.experience.archive': 'Archivovat',
  'host.experience.archiving': 'Archivuji…',
  'host.experience.archived': 'Nabídka archivována.',

  // --- Média (Blok 6) -----------------------------------------------------
  'host.media.heading': 'Fotky',
  'host.media.hint':
    'JPEG, PNG nebo WebP · minimálně 800×600 pixelů · do 10 MB · nejvýš 12 fotek',
  'host.media.add': 'Přidat fotky',
  'host.media.drop': 'Přetáhni sem soubory',
  'host.media.uploading': 'Nahrávám…',
  'host.media.empty': 'Zatím žádné fotky. První nahraná se stane titulní.',
  'host.media.cover': 'Titulní',
  'host.media.makeCover': 'Nastavit jako titulní',
  'host.media.delete': 'Smazat',
  'host.media.moveEarlier': 'Posunout dopředu',
  'host.media.moveLater': 'Posunout dozadu',
  'host.media.position': 'Fotka {n}',
  'host.media.error.rejected': 'Tuto fotku se nepodařilo přijmout.',
  'host.media.error.unsupported': 'Nahrát lze jen JPEG, PNG a WebP.',
  'host.media.error.notUploaded': 'Nahrávání se nedokončilo. Zkus to znovu.',
  'host.media.error.notAnImage': 'Tento soubor není obrázek.',
  'host.media.error.mismatch': 'Obsah souboru neodpovídá jeho příponě.',
  'host.media.error.tooSmall': 'Fotky musí mít aspoň 800×600 pixelů.',
  'host.media.error.tooLarge': 'Soubory mohou mít nejvýš 10 MB.',
  'host.media.error.limit': 'Nabídka může mít nejvýš 12 fotek.',
  'host.media.error.lastOfPublished':
    'Poslední fotku živé nabídky smazat nelze. Přidej nejdřív jinou, nebo nabídku archivuj.',

  'host.experience.status.publishedNote':
    'Tvoje nabídka se objevuje ve vyhledávání. Archivace ji skryje, ale nesmaže — zveřejnit ji můžeš kdykoli znovu.',
  'host.experience.status.privateNote':
    'Dokud ji nezveřejníš, tuto nabídku nevidí nikdo kromě tebe.',

  'host.experience.error.notFound': 'Tuto nabídku se nepodařilo najít. Otevři ji znovu z panelu.',
  'host.experience.error.invalid':
    'Tuto část se nepodařilo uložit. Zkontroluj pole a zkus to znovu.',
  'host.experience.error.language':
    'V tomto jazyce nabídky psát nelze. Vyber ze seznamu jiný.',
  'host.experience.error.title': 'Název je povinný a může mít nejvýš 120 znaků.',
  'host.experience.error.description': 'Popis může mít nejvýš 4000 znaků.',
  'host.experience.error.duration': 'Délku napiš v minutách: nejméně 1, nejvýš 10080.',
  'host.experience.error.capacity': 'Kapacitu napiš v osobách: nejméně 1, nejvýš 500.',
  'host.experience.error.city': 'Vyber město ze seznamu — napsat název samo o sobě nestačí.',
  'host.experience.error.category': 'Vyber kategorii ze seznamu.',
  'host.experience.error.spokenLanguages': 'Zaškrtnout můžeš nejvýš deset jazyků.',
  'host.experience.error.tags': 'Štítky nemohou být prázdné; nejvýš deset a každý krátký.',
  'host.experience.error.publishedConflict':
    'Tuto změnu u živé nabídky provést nelze. Nejdřív ji archivuj, potom uprav.',
  'host.experience.error.publishBlocked': 'Nezveřejněno. Pořád chybí: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Nezveřejněno: nabídka ještě není kompletní. Zkontroluj seznam výše.',

  // --- Kategorie -------------------------------------------------------------
  'category.food-drink': 'Jídlo a pití',
  'category.art-culture': 'Umění a kultura',
  'category.history-heritage': 'Historie a památky',
  'category.nature-outdoors': 'Příroda a outdoor',
  'category.water-sea': 'Voda a moře',
  'category.sports-adventure': 'Sport a dobrodružství',
  'category.crafts-workshops': 'Řemesla a dílny',
  'category.music-nightlife': 'Hudba a noční život',
  'category.wellness': 'Wellness',
  'category.photography': 'Fotografie',
  'category.tours-walks': 'Prohlídky a procházky',
  'category.local-life': 'Život místních',

  // --- Ceny (PLAN Blok 7) ---
  'host.experience.section.pricing': 'Cena',
  'host.experience.section.pricingHelp':
    'Nastav cenu za osobu ve své měně. Peníze ti vždycky chodí v této měně; když si cestovatel zvolí jinou, přepočítá se jen zobrazení.',

  'host.pricing.currency.label': 'Měna výplaty',
  'host.pricing.currency.help':
    'Měna, ve které se k tobě peníze dostanou. Po zveřejnění nabídky ji změnit nelze — nejdřív ji archivuj.',
  'host.pricing.currency.locked': 'Měna je zamčená, protože nabídka je živá.',
  'host.pricing.currency.placeholder': 'Vyber',

  'host.pricing.adult.label': 'Dospělý (za osobu)',
  'host.pricing.adult.help': 'Povinné. Tohle je cena „od“, která se ukazuje na kartách a ve vyhledávání.',
  'host.pricing.child.label': 'Dítě (za osobu)',
  'host.pricing.child.help': 'Nech prázdné, pokud dětskou cenu nenabízíš. Zadej 0, pokud je zdarma.',
  'host.pricing.infant.label': 'Batole (za osobu)',
  'host.pricing.infant.help': 'Nech prázdné, pokud cenu pro batolata nenabízíš. Zadej 0, pokud je zdarma.',

  'host.pricing.saved': 'Cena uložena.',
  'host.pricing.empty': 'Zatím žádná cena. Nabídku bez ceny zveřejnit nelze.',

  'host.pricing.error.currency': 'Vyber platnou měnu.',
  'host.pricing.error.currencyLocked':
    'Měnu živé nabídky změnit nelze. Nejdřív ji archivuj.',
  'host.pricing.error.adult': 'Cena pro dospělé je povinná a musí být platnou částkou.',
  'host.pricing.error.child': 'Cena pro děti musí být platnou částkou.',
  'host.pricing.error.infant': 'Cena pro batolata musí být platnou částkou.',
  'host.pricing.error.range':
    'Tato částka je mimo rozsah, který platební poskytovatel přijímá — je buď příliš malá, nebo příliš velká.',

  // --- Kalendář (PLAN Blok 7) ---
  'host.experience.section.schedule': 'Kalendář',
  'host.experience.section.scheduleHelp':
    'Ve které dny a časy to vedeš? Časy jsou v časovém pásmu města — hodina, kterou napíšeš, zůstává stejná i po změně letního času.',

  'host.schedule.blocked':
    'Kalendář potřebuje nejdřív město, délku a kapacitu. Dokonči části výše.',
  'host.schedule.timeZone': 'Časové pásmo: {bolge}',
  'host.schedule.generatedThrough': 'Kalendář máš připravený do {tarih}.',

  // Týdenní pravidlo
  'host.schedule.rule.heading': 'Týdenní pravidlo',
  'host.schedule.rule.days': 'Dny',
  'host.schedule.rule.daysHelp': 'Můžeš vybrat víc než jeden; z každého dne vznikne vlastní pravidlo.',
  'host.schedule.rule.time': 'Čas začátku',
  'host.schedule.rule.timeHelp': 'V místním čase města.',
  'host.schedule.rule.start': 'Počínaje',
  'host.schedule.rule.startHelp': 'Nech prázdné, ať se začne dneškem.',
  'host.schedule.rule.submit': 'Přidat pravidlo',
  'host.schedule.rule.pending': 'Přidávám…',
  'host.schedule.rule.stop': 'Zastavit',
  'host.schedule.rule.stopping': 'Zastavuji…',
  'host.schedule.rule.empty': 'Zatím žádná týdenní pravidla.',
  'host.schedule.rule.stopped': 'zastaveno',

  // Volné dny
  'host.schedule.blackout.heading': 'Volné dny',
  'host.schedule.blackout.start': 'Od',
  'host.schedule.blackout.end': 'Do',
  'host.schedule.blackout.endHelp': 'Nech prázdné, ať se zavře jediný den. Koncový den se počítá.',
  'host.schedule.blackout.submit': 'Zavřít',
  'host.schedule.blackout.pending': 'Zavírám…',
  'host.schedule.blackout.remove': 'Odebrat',
  'host.schedule.blackout.removing': 'Odebírám…',
  'host.schedule.blackout.empty': 'Žádné volné dny.',

  // Termíny
  'host.schedule.slots.heading': 'Nadcházející termíny',
  'host.schedule.slots.empty': 'V tomto rozmezí žádné termíny nejsou.',
  'host.schedule.slots.remaining': {
    one: 'Zbývá {n} místo',
    few: 'Zbývají {n} místa',
    many: 'Zbývá {n} místa',
    other: 'Zbývá {n} míst',
  },
  'host.schedule.slots.closed': 'Zavřeno',
  'host.schedule.slots.closedByBlackout': 'Volný den',
  'host.schedule.slots.close': 'Zavřít',
  'host.schedule.slots.closing': 'Zavírám…',
  'host.schedule.slots.open': 'Otevřít',
  'host.schedule.slots.opening': 'Otevírám…',
  'host.schedule.slots.more': 'a další {n}',

  // Dny
  'host.schedule.day.monday': 'Pondělí',
  'host.schedule.day.tuesday': 'Úterý',
  'host.schedule.day.wednesday': 'Středa',
  'host.schedule.day.thursday': 'Čtvrtek',
  'host.schedule.day.friday': 'Pátek',
  'host.schedule.day.saturday': 'Sobota',
  'host.schedule.day.sunday': 'Neděle',

  // Potvrzení
  'host.schedule.ruleSaved': 'Pravidlo přidáno a termíny vytvořeny.',
  'host.schedule.ruleStopped': 'Pravidlo zastaveno.',
  'host.schedule.slotOpened': 'Termín otevřen.',
  'host.schedule.slotClosed': 'Termín zavřen.',
  'host.schedule.blackoutSaved': 'Dny zavřeny.',
  'host.schedule.blackoutRemoved': 'Volné dny odebrány.',

  // Chyby — každá odpovídá strojově čitelnému kódu ze serveru
  'host.schedule.error.noDay': 'Vyber aspoň jeden den.',
  'host.schedule.error.time': 'Zadej čas ve tvaru HH:MM.',
  'host.schedule.error.date': 'Zadej platné datum.',
  'host.schedule.error.range': 'Koncové datum nemůže být dřív než počáteční.',
  'host.schedule.error.notSchedulable':
    'Kalendář potřebuje nejdřív město, délku a kapacitu.',
  'host.schedule.error.duplicateRule': 'V tento den a čas už jedno pravidlo je.',
  'host.schedule.error.ruleLimit': 'Tento zážitek už další týdenní pravidla nepobere.',
  'host.schedule.error.dstGap':
    'Tento čas v ten den kvůli změně letního času neexistuje. Zkus to o hodinu později.',
  'host.schedule.error.past': 'Proběhlý termín změnit nelze.',
  'host.schedule.error.slotExists': 'V tento čas už jeden termín je.',
  'host.schedule.error.blackedOut': 'Toto datum je označené jako volný den. Nejdřív rozmezí odeber.',
  'host.schedule.error.generated':
    'Termín vytvořený týdenním pravidlem smazat nelze; můžeš ho zavřít.',
  'host.schedule.error.hasBookings': 'Termín s rezervacemi změnit nelze.',
  'host.schedule.error.blackoutLimit': 'Další volné dny přidat nelze.',
  'host.schedule.error.horizon': 'Tak daleko dopředu kalendář otevřít nelze.',
  'host.schedule.error.generic': 'Tohle se teď nepovedlo.',

} as const satisfies Dictionary<'cs'>

/**
 * Metnin içi de kaynakla karşılaştırılıyor: bir yer tutucu düşerse ya da adı
 * değişirse derleme, hangi anahtarda olduğunu yazarak kırılır.
 * `export` bilinçli — kullanılmayan tip lint'te ölü kod sayılır.
 */
export type CsPlaceholders = Assert<PlaceholdersMatchSource<typeof cs>>
