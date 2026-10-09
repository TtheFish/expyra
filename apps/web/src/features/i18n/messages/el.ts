import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Yunanca arayüz.
 *
 * **Hitap "εσείς" (çoğul nezaket).** Yunan tüketici ürünlerinin (Airbnb, Skroutz,
 * e-shop) standardı bu; tekil "εσύ" yabancıya karşı laubali okunuyor (fr.ts ile
 * aynı gerekçe). Ton yine aynı: kısa, doğrudan, ünlemsiz. "Host" = οικοδεσπότης.
 *
 * **Noktalama:** Yunanca soru işareti `;` (U+037E, kanonik olarak `;`'ye eşit);
 * noktalı virgülün yerini ano teleia `·` alıyor. `?` Yunanca metinde yanlış.
 *
 * **Dil ve şehir adları cümleye çekimsiz giriyor.** `Intl.DisplayNames('el')`
 * büyük harfli yalın hâl veriyor ("Τουρκικά") ve şehir adı kayıt defterinden
 * çekimsiz geliyor. "στα τουρκικά", "στην Πράγα" gibi artikel + hâl isteyen
 * yapılar yerine iki noktalı kuruluş: "Γλώσσα περιγραφής: {dil}",
 * "Εμπειρίες: {sehir}".
 *
 * Çevrilmeyenler en.ts ile aynı: marka (Expyra) ve destek adresi.
 */
export const el = {
  'meta.description': 'Βρείτε τοπικές εμπειρίες και κάντε κράτηση.',

  'nav.primaryLabel': 'Κύριο μενού',
  'nav.footerLabel': 'Μενού υποσέλιδου',
  'nav.explore': 'Εξερεύνηση',
  'nav.myExperiences': 'Οι εμπειρίες μου',
  'nav.becomeHost': 'Γίνετε οικοδεσπότης',
  'nav.howItWorks': 'Πώς λειτουργεί',

  'language.trigger': 'Γλώσσα: {dil}. Αλλαγή.',
  'language.dialogLabel': 'Επιλογή γλώσσας',
  'language.search.label': 'Αναζήτηση γλώσσας',
  'language.search.placeholder': 'Αναζήτηση γλώσσας',
  'language.group.ui': 'Γλώσσες διεπαφής',
  'language.group.content': 'Άλλες γλώσσες',
  'language.group.contentHint':
    'Δεν υπάρχει ακόμα μετάφραση της διεπαφής — οι εμπειρίες μπορούν όμως να δημοσιευτούν σε αυτές τις γλώσσες.',
  'language.empty': 'Καμία γλώσσα δεν ταιριάζει με την αναζήτηση.',

  'theme.toLight': 'Μετάβαση στο φωτεινό θέμα',
  'theme.toDark': 'Μετάβαση στο σκοτεινό θέμα',

  'currency.trigger': 'Νόμισμα: {para}. Αλλαγή.',
  'currency.dialogLabel': 'Επιλογή νομίσματος',
  'currency.search.label': 'Αναζήτηση νομίσματος',
  'currency.search.placeholder': 'EUR, δολάριο, λίρα…',
  'currency.none': 'Νόμισμα του οικοδεσπότη',
  'currency.empty': 'Κανένα νόμισμα δεν ταιριάζει με την αναζήτηση.',

  'home.hero.title': 'Ένας νέος τρόπος να ανακαλύψετε',
  'home.hero.titleAccent': 'τις εμπειρίες που ξέρουν μόνο οι ντόπιοι',
  'home.hero.lede':
    'Από ανθρώπους που ζουν πραγματικά εκεί. Μικρές ομάδες, αληθινοί άνθρωποι, λίγες ώρες που δεν θα ξεχάσετε.',
  'home.showcase.heading': 'Εμπειρίες στο Expyra',
  'home.showcase.more': 'Δείτε όλες τις εμπειρίες',
  'home.showcase.unavailable':
    'Δεν μπορέσαμε να εμφανίσουμε τις εμπειρίες αυτή τη στιγμή. Δοκιμάστε ξανά σε λίγο — οι αγγελίες είναι ακόμα εκεί.',
  'home.showcase.empty.title': 'Δεν έχει δημοσιευτεί τίποτα ακόμα',
  'home.showcase.empty.body':
    'Μπορείτε να είστε οι πρώτοι. Δείξτε σε μια μικρή ομάδα κάτι που ξέρετε.',
  'home.showcase.empty.cta': 'Γίνετε οικοδεσπότης',

  'search.destination.label': 'Πού;',
  'search.destination.placeholder': 'Αναζήτηση πόλης',
  'search.date.label': 'Πότε;',
  'search.date.placeholder': 'Επιλέξτε ημερομηνία',
  'search.date.dialogLabel': 'Επιλέξτε ημερομηνία',
  'search.date.day': 'Ημέρα',
  'search.date.month': 'Μήνας',
  'search.date.year': 'Έτος',
  'search.date.done': 'Τέλος',
  'search.date.clear': 'Καθαρισμός',
  'search.date.stepUp': 'Προηγούμενο: {alan}',
  'search.date.stepDown': 'Επόμενο: {alan}',
  'search.submit': 'Αναζήτηση',

  'search.city.listLabel': 'Προτάσεις πόλεων',
  'search.city.countriesHeading': 'Χώρες',
  'search.city.citiesHeading': 'Πόλεις',
  'search.city.allCountries': 'Όλες οι χώρες',
  'search.city.tooShort':
    'Αρχίστε να πληκτρολογείτε ένα όνομα πόλης ή επιλέξτε χώρα από τη λίστα.',
  'search.city.loading': 'Αναζήτηση…',
  'search.city.error': 'Δεν μπορέσαμε να φορτώσουμε τη λίστα πόλεων. Δοκιμάστε ξανά σε λίγο.',
  'search.city.empty': 'Καμία πόλη δεν ταιριάζει με την αναζήτηση.',
  'search.city.truncated':
    'Υπάρχουν κι άλλες πόλεις — συνεχίστε να πληκτρολογείτε για να περιορίσετε τα αποτελέσματα.',
  'search.city.clear': 'Αφαίρεση της επιλεγμένης πόλης',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': { one: 'Βρέθηκε {n} πόλη', other: 'Βρέθηκαν {n} πόλεις' },
  'search.city.countryCities': { one: '{n} πόλη', other: '{n} πόλεις' },

  'search.guests.label': 'Επισκέπτες',
  'search.guests.dialogLabel': 'Αριθμός επισκεπτών',
  'search.guests.done': 'Τέλος',
  'search.guests.adults': 'Ενήλικες',
  'search.guests.adults.hint': '13 ετών και άνω',
  'search.guests.adults.decrease': 'Ένας ενήλικας λιγότερος',
  'search.guests.adults.increase': 'Ένας ενήλικας ακόμα',
  'search.guests.children': 'Παιδιά',
  'search.guests.children.hint': 'Ηλικίες 0–12',
  'search.guests.children.decrease': 'Ένα παιδί λιγότερο',
  'search.guests.children.increase': 'Ένα παιδί ακόμα',
  'search.guests.summary.adults': { one: '{n} ενήλικας', other: '{n} ενήλικες' },
  'search.guests.summary.children': { one: '{n} παιδί', other: '{n} παιδιά' },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} ώρα', other: '{n} ώρες' },
  'experience.duration.minutes': { one: '{n} λεπτό', other: '{n} λεπτά' },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Η διάρκεια δεν έχει οριστεί',
  'experience.meta': {
    one: '{sure} · έως {n} άτομο',
    other: '{sure} · έως {n} άτομα',
  },
  'experience.card.perPerson': 'ανά επισκέπτη',
  'experience.card.language': 'Γλώσσα αγγελίας: {dil}',

  'explore.heading.all': 'Όλες οι εμπειρίες',
  'explore.heading.city': 'Εμπειρίες: {sehir}',
  'explore.heading.query': 'Αποτελέσματα για «{arama}»',
  'explore.summary': { one: '{n} εμπειρία', other: '{n} εμπειρίες' },
  'explore.summary.page': {
    one: '{n} εμπειρία σε αυτή τη σελίδα',
    other: '{n} εμπειρίες σε αυτή τη σελίδα',
  },
  'explore.filtersNotice':
    'Προς το παρόν φιλτράρουμε μόνο ανά πόλη. Δεν λαμβάνονται ακόμα υπόψη: {filtreler}.',
  'explore.filter.date': 'η ημερομηνία που επιλέξατε',
  'explore.filter.guests': 'ο αριθμός επισκεπτών',

  'explore.pager.label': 'Σελίδες αποτελεσμάτων',
  'explore.pager.next': 'Επόμενη σελίδα',
  'explore.pager.first': 'Επιστροφή στην πρώτη σελίδα',

  'explore.pageLink.title': 'Δεν μπορέσαμε να διαβάσουμε αυτόν τον σύνδεσμο σελίδας',
  'explore.pageLink.body':
    'Ο δείκτης σελίδας στη διεύθυνση φαίνεται χαλασμένος. Ξεκινήστε ξανά την αναζήτηση — τα αποτελέσματα είναι ακόμα εκεί.',

  'explore.empty.title': 'Δεν υπάρχουν ακόμα εμπειρίες εδώ',
  'explore.empty.body':
    'Δοκιμάστε άλλη πόλη από τη λίστα. Νέες πόλεις και νέες εμπειρίες προστίθενται συνεχώς.',
  'explore.empty.cta': 'Δείτε όλες τις εμπειρίες',
  'explore.empty.hostCta': 'Γίνετε ο πρώτος οικοδεσπότης εδώ',

  'explore.cityMissing.title': 'Δεν γνωρίζουμε αυτή την πόλη',
  'explore.cityMissing.body':
    'Η πόλη στη διεύθυνση δεν υπάρχει στο μητρώο μας — ο σύνδεσμος ίσως είναι παλιός. Επιλέξτε πόλη από τη λίστα στο παραπάνω πεδίο.',
  'explore.cityMissing.cta': 'Δείτε όλες τις εμπειρίες',

  'experience.detail.meta.fallback': 'Τοπική εμπειρία · {sehir}.',
  'experience.detail.text.fallback': 'Γλώσσα περιγραφής: {dil}',
  'experience.detail.duration.label': 'Διάρκεια',
  'experience.detail.capacity.label': 'Μέγεθος ομάδας',
  'experience.detail.capacity.value': { one: 'Έως {n} άτομο', other: 'Έως {n} άτομα' },
  'experience.detail.about': 'Σχετικά με αυτή την εμπειρία',
  'experience.detail.noDescription': 'Ο οικοδεσπότης δεν έχει γράψει ακόμα περιγραφή.',
  'experience.detail.spoken.heading': 'Γλώσσες κατά την εμπειρία',
  'experience.detail.spoken.help':
    'Ο οικοδεσπότης πραγματοποιεί την εμπειρία σε αυτές τις γλώσσες. Η γλώσσα στην οποία είναι γραμμένη η αγγελία είναι άλλο θέμα.',
  'experience.detail.spoken.none': 'Ο οικοδεσπότης δεν έχει δηλώσει ακόμα ποιες γλώσσες μιλά.',
  'experience.detail.tags.heading': 'Ετικέτες',
  'experience.detail.gallery.heading': 'Φωτογραφίες',
  'experience.detail.host.heading': 'Ο οικοδεσπότης σας',
  'experience.detail.itinerary.heading': 'Τι θα κάνετε',
  'experience.detail.meeting.heading': 'Σημείο συνάντησης',
  'experience.detail.meeting.map': 'Άνοιγμα στον χάρτη',
  'experience.detail.meeting.mapEmbed': 'Χάρτης σημείου συνάντησης',
  'experience.detail.meeting.pin': 'Σημείο συνάντησης',
  'experience.detail.highlights.host': 'Οικοδεσπότης: {ad}',
  'experience.detail.highlights.duration': 'Περίπου {sure}',
  'experience.detail.highlights.spoken': 'Γλώσσες: {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Έως {n} άτομο',
    other: 'Έως {n} άτομα',
  },
  'experience.detail.highlights.bring': 'Τι να φέρετε',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} κριτική', other: '{n} κριτικές' },
  'experience.detail.reviews.stars': { one: '{n} αστέρι', other: '{n} αστέρια' },
  'experience.detail.reviews.demoNote':
    'Ενδεικτικές κριτικές — οι πραγματικές βαθμολογίες θα εμφανιστούν εδώ μόλις ενεργοποιηθούν οι κρατήσεις.',
  'experience.detail.reviews.showAll': 'Εμφάνιση όλων των κριτικών',
  'experience.detail.reviews.about': 'Μάθετε πώς λειτουργούν οι βαθμολογίες και οι κριτικές.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Τίργκου Μούρες, Ρουμανία',
  'experience.detail.reviews.demo.1.when': 'Πριν από 1 ημέρα',
  'experience.detail.reviews.demo.1.body':
    'Ο ξεναγός μας ήξερε πολλά και ήταν πολύ ζεστός. Η πόλη μαζί του ήταν κάτι εντελώς διαφορετικό.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Μιλάνο, Ιταλία',
  'experience.detail.reviews.demo.2.when': 'Πριν από 3 ημέρες',
  'experience.detail.reviews.demo.2.body':
    'Μικρή ομάδα, πολλή κουβέντα. Είχαν προβλεφθεί και στάσεις για φωτογραφίες — μας άρεσε πολύ.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Μπρνο, Τσεχία',
  'experience.detail.reviews.demo.3.when': 'Πριν από 1 εβδομάδα',
  'experience.detail.reviews.demo.3.body':
    'Λίγο γρήγορος ρυθμός, αλλά συνολικά υπέροχο. Η τελευταία στάση ήταν η αγαπημένη μας.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Βερολίνο, Γερμανία',
  'experience.detail.reviews.demo.4.when': 'Πριν από 2 εβδομάδες',
  'experience.detail.reviews.demo.4.body':
    'Πιο προσωπικό απ’ ό,τι περιμέναμε. Ο οικοδεσπότης μάς πρότεινε και τοπικές γεύσεις.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'Κωνσταντινούπολη, Τουρκία',
  'experience.detail.reviews.demo.5.when': 'Πριν από 3 εβδομάδες',
  'experience.detail.reviews.demo.5.body':
    'Άψογη οργάνωση. Σαφές σημείο συνάντησης και τέλεια τήρηση του χρόνου.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Μαδρίτη, Ισπανία',
  'experience.detail.reviews.demo.6.when': 'Πριν από 1 μήνα',
  'experience.detail.reviews.demo.6.body': 'Ο ξεναγός μας ήταν υπέροχος 💕💕',
  'experience.detail.know.heading': 'Καλό να ξέρετε',
  'experience.detail.know.minimumAge': 'Όριο ηλικίας',
  'experience.detail.know.minimumAgeValue': 'Από {n} ετών',
  'experience.detail.know.activityLevel': 'Επίπεδο δραστηριότητας',
  'experience.detail.know.whatToBring': 'Τι να φέρετε',
  'experience.detail.know.notIncluded': 'Δεν περιλαμβάνονται',
  'experience.detail.know.accessibility': 'Προσβασιμότητα',
  'experience.detail.nearby.heading': 'Περισσότερες εμπειρίες: {sehir}',
  'experience.detail.host.anonymous': 'Οικοδεσπότης του Expyra',
  'experience.detail.booking.title': 'Ημερομηνίες και τιμή',
  'experience.detail.booking.noSlots':
    'Δεν υπάρχουν διαθέσιμες ημερομηνίες αυτή τη στιγμή. Θα εμφανιστούν εδώ μόλις ο οικοδεσπότης ενημερώσει το ημερολόγιο.',
  'experience.detail.booking.perPerson': 'ανά άτομο',
  'experience.detail.booking.pickDate': 'Επιλέξτε ημερομηνία',
  'experience.detail.booking.timeZone': 'Ώρες: {bolge}.',
  'experience.detail.booking.spotsLeft': {
    one: 'Απομένει {n} θέση',
    other: 'Απομένουν {n} θέσεις',
  },
  'experience.detail.booking.adults': 'Ενήλικες',
  'experience.detail.booking.children': 'Παιδιά',
  'experience.detail.booking.infants': 'Βρέφη',
  'experience.detail.booking.currency': 'Νόμισμα',
  'experience.detail.booking.currencyNone': 'Νόμισμα του οικοδεσπότη',
  'experience.detail.booking.update': 'Υπολογισμός τιμής',
  'experience.detail.booking.continue': 'Συνέχεια στην πληρωμή',
  'experience.detail.booking.pickDateFirst': 'Επιλέξτε πρώτα ημερομηνία',
  'experience.detail.booking.pickDateHint':
    'Επιλέξτε μια ημερομηνία παραπάνω για να συνεχίσετε.',
  'experience.detail.booking.total': 'Σύνολο',
  'experience.detail.booking.displayTotal': 'Περίπου {tutar}',
  'experience.detail.booking.chargedIn':
    'Η χρέωση γίνεται σε {paraBirimi}. Αν η κάρτα σας χρησιμοποιεί άλλο νόμισμα, η τράπεζά σας εφαρμόζει τη δική της ισοτιμία.',
  'experience.detail.booking.quoteFailed':
    'Δεν μπορέσαμε να υπολογίσουμε την τιμή για αυτή την επιλογή. Η ημερομηνία ίσως δεν έχει αρκετές θέσεις ή έχει κλείσει.',
  'experience.detail.cityLink': 'Όλες οι εμπειρίες: {sehir}',
  'experience.detail.back': 'Επιστροφή στην εξερεύνηση',

  'checkout.title': 'Επιβεβαίωση και πληρωμή',
  'checkout.back': 'Επιστροφή στην εμπειρία',
  'checkout.payment.heading': 'Τρόπος πληρωμής',
  'checkout.payment.bank': 'Ηλεκτρονική τραπεζική',
  'checkout.payment.bankSelect': 'Επιλέξτε την τράπεζά σας',
  'checkout.payment.card': 'Πιστωτική ή χρεωστική κάρτα',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'Με την επιβεβαίωση και την πληρωμή αποδέχεστε τους όρους χρήσης, την πολιτική ακύρωσης και τη δήλωση απορρήτου. Η πραγματική πληρωμή δεν έχει συνδεθεί ακόμα — αυτό το βήμα δείχνει τη διεπαφή.',
  'checkout.payment.submit': 'Επιβεβαίωση και πληρωμή',
  'checkout.payment.submitting': 'Επεξεργασία…',
  'checkout.payment.demoNote':
    'Επίδειξη: η κάρτα σας δεν χρεώνεται και δεν δημιουργείται κράτηση.',
  'checkout.payment.unavailable':
    'Οι πληρωμές δεν είναι ακόμα διαθέσιμες: το κουμπί θα ενεργοποιηθεί μόλις συνδεθεί ο πάροχος πληρωμών μας. Η κάρτα σας δεν θα χρεωθεί και δεν θα δημιουργηθεί κράτηση.',
  'checkout.success.title': 'Έγινε — επιβεβαίωση επίδειξης',
  'checkout.success.body':
    'Όταν ενεργοποιηθούν ο πάροχος πληρωμών και το API κρατήσεων, εδώ θα εμφανίζεται πραγματικό εισιτήριο. Προς το παρόν η διαδικασία ολοκληρώθηκε.',
  'checkout.success.back': 'Μετάβαση στις εμπειρίες μου',
  'checkout.summary.nonRefundable': 'Αυτή η κράτηση δεν επιστρέφεται.',
  'checkout.summary.date': 'Ημερομηνία',
  'checkout.summary.guests': 'Επισκέπτες',
  'checkout.summary.change': 'Αλλαγή',
  'checkout.summary.priceDetails': 'Ανάλυση τιμής',
  'checkout.summary.total': 'Σύνολο {paraBirimi}',

  'howItWorks.lede': 'Τρία βήματα και τελειώσατε.',
  'howItWorks.back': 'Πίσω',
  'howItWorks.step.discover.title': 'Εξερευνήστε',
  'howItWorks.step.discover.body':
    'Δείτε τις τοπικές εμπειρίες της πόλης σας. Μικρές ομάδες, αληθινοί οικοδεσπότες.',
  'howItWorks.step.book.title': 'Κάντε κράτηση',
  'howItWorks.step.book.body':
    'Επιλέξτε ημερομηνία και αριθμό ατόμων, δείτε την τιμή. Οι κρατήσεις έρχονται σύντομα.',
  'howItWorks.step.join.title': 'Ελάτε',
  'howItWorks.step.join.body': 'Ο οικοδεσπότης σας σάς υποδέχεται και η εμπειρία ξεκινά.',
  'howItWorks.backToExplore': 'Επιστροφή στην εξερεύνηση',

  'myExperiences.lede': 'Εδώ βρίσκονται τα εισιτήριά σας.',
  'myExperiences.upcoming': 'Επερχόμενες · {sayi}',
  'myExperiences.past': 'Παλαιότερες · {sayi}',
  'myExperiences.downloadPdf': 'Λήψη PDF',
  'myExperiences.wallet': 'Προσθήκη στο Apple Wallet',
  'myExperiences.wallet.soon': 'Έρχεται σύντομα',
  'myExperiences.rate': 'Βαθμολογήστε',
  'myExperiences.rate.soon': 'Ανοίγει μόλις ολοκληρωθεί η εμπειρία',
  'myExperiences.empty.title': 'Δεν υπάρχουν ακόμα εισιτήρια',
  'myExperiences.empty.body':
    'Όταν κάνετε κράτηση σε μια εμπειρία, το εισιτήριό σας θα εμφανιστεί εδώ.',
  'myExperiences.empty.cta': 'Εξερευνήστε εμπειρίες',

  'ticket.demoBadge': 'Εισιτήριο επίδειξης',
  'ticket.demoNote':
    'Ενδεικτικό εισιτήριο: ο κωδικός QR δεν είναι ακόμα υπογεγραμμένος και δεν μπορεί να ελεγχθεί στην είσοδο.',
  'ticket.view.title': 'Το εισιτήριό σας',
  'ticket.view.lede': 'Δείξτε τον κωδικό QR στην είσοδο ή προσθέστε τον στο πορτοφόλι σας.',
  'ticket.view.back': 'Επιστροφή στις εμπειρίες μου',
  'ticket.wallet.view': 'Προβολή εισιτηρίου',
  'ticket.wallet.apple': 'Προσθήκη στο Apple Wallet',
  'ticket.wallet.google': 'Προσθήκη στο Google Wallet',
  'ticket.wallet.adding': 'Προετοιμασία…',
  'ticket.wallet.appleNotConfigured':
    'Το Apple Wallet δεν έχει ρυθμιστεί σε αυτό το περιβάλλον. Προσθέστε τα EXPYRA_APPLE_PASS_* (βλ. docs/WALLET.md)· μπορείτε ακόμα να δείτε το εισιτήριο εδώ.',
  'ticket.wallet.googleNotConfigured':
    'Το Google Wallet δεν έχει ρυθμιστεί σε αυτό το περιβάλλον. Προσθέστε τα EXPYRA_GOOGLE_WALLET_* (βλ. docs/WALLET.md)· μπορείτε ακόμα να δείτε το εισιτήριο εδώ.',
  'ticket.guests': 'Επισκέπτες',
  'ticket.amount': 'Σύνολο',
  'ticket.status': 'Κατάσταση',
  'ticket.status.valid': 'Έγκυρο',
  'ticket.status.used': 'Χρησιμοποιήθηκε',
  'ticket.timeZoneNote': 'τοπική ώρα: {sehir}',

  'ticket.pdf.kicker': 'Εισιτήριο εμπειρίας',
  'ticket.pdf.dateTime': 'Ημερομηνία και ώρα',
  'ticket.pdf.docTitle': 'Εισιτήριο Expyra — {baslik}',
  'ticket.pdf.code': 'Κωδικός εισιτηρίου {kod}',
  'ticket.pdf.notice.valid':
    'Ο οικοδεσπότης σαρώνει αυτόν τον κωδικό στην είσοδο. Μία χρήση μόνο.',
  'ticket.pdf.notice.used': 'Αυτό το εισιτήριο χρησιμοποιήθηκε στην είσοδο.',

  'ticket.error.signedOut': 'Συνδεθείτε για να δείτε αυτό το εισιτήριο.',
  'ticket.error.notFound': 'Δεν υπάρχει εισιτήριο με αυτόν τον κωδικό.',

  'auth.meta.title': 'Σύνδεση',
  'auth.title': 'Συνδεθείτε ή δημιουργήστε λογαριασμό',
  'auth.back': 'Πίσω',

  'auth.email.lede':
    'Πληκτρολογήστε τη διεύθυνσή σας και θα σας στείλουμε κωδικό μίας χρήσης. Χωρίς κωδικό πρόσβασης.',
  'auth.email.label': 'Η διεύθυνση email σας',
  'auth.email.help': 'Θα στείλουμε τον κωδικό σε αυτή τη διεύθυνση.',
  'auth.email.placeholder': 'onoma@example.com',
  'auth.email.error.invalid':
    'Η διεύθυνση δεν φαίνεται σωστή. Παράδειγμα: onoma@example.com',

  'auth.code.lede': 'Στείλαμε έναν εξαψήφιο κωδικό στη διεύθυνση:',
  'auth.code.label': 'Ο κωδικός από το email σας',
  'auth.code.hint':
    'Ο κωδικός ισχύει για 10 λεπτά. Αν δεν βρίσκετε το email, ελέγξτε τα ανεπιθύμητα.',
  'auth.code.resend': 'Αποστολή νέου κωδικού',
  'auth.code.changeEmail': 'Χρήση άλλης διεύθυνσης',

  'auth.common.continue': 'Συνέχεια',
  'auth.common.working': 'Αποστολή…',

  'auth.otp.error.invalid':
    'Ο κωδικός δεν ταιριάζει. Ελέγξτε τα 6 ψηφία στο πιο πρόσφατο email.',
  'auth.otp.error.locked':
    'Πάρα πολλές προσπάθειες. Κλείσαμε αυτόν τον κωδικό για την ασφάλεια του λογαριασμού — ζητήστε νέο.',
  'auth.otp.error.resendTooSoon': {
    one: 'Περιμένετε ακόμα {n} δευτερόλεπτο πριν ζητήσετε νέο κωδικό.',
    other: 'Περιμένετε ακόμα {n} δευτερόλεπτα πριν ζητήσετε νέο κωδικό.',
  },

  'auth.error.tooManyRequests': 'Ζητήθηκαν πάρα πολλοί κωδικοί. Δοκιμάστε ξανά σε λίγο.',
  'auth.error.suspended': 'Αυτός ο λογαριασμός έχει ανασταλεί. destek@expyra.com',
  'auth.error.expiredChallenge':
    'Η προσπάθεια σύνδεσης έληξε. Πληκτρολογήστε ξανά τη διεύθυνσή σας.',

  'account.title': 'Ο λογαριασμός σας',
  'account.lede': 'Εδώ αλλάζετε το όνομά σας και την προτιμώμενη γλώσσα.',

  'account.email.label': 'Η διεύθυνση email σας',
  'account.email.note': 'Η διεύθυνση email δεν μπορεί ακόμα να αλλάξει.',

  // --- Wallpaper (ortak layout — HER sayfada görünür) ------------------------
  'wallpaper.istanbul.place': 'Κωνσταντινούπολη',
  'wallpaper.istanbul.label': 'Ψητό ψάρι στον δρόμο',
  'wallpaper.kitchen.place': 'Μια σπιτική κουζίνα',
  'wallpaper.kitchen.label': 'Μαγειρεύοντας με τη θεία',
  'wallpaper.cappadocia.place': 'Καππαδοκία',
  'wallpaper.cappadocia.label': 'Αερόστατο',
  'wallpaper.pause': 'Παύση βίντεο φόντου',
  'wallpaper.play': 'Αναπαραγωγή βίντεο φόντου',
  'account.avatar.label': 'Φωτογραφία προφίλ',
  'account.avatar.help': 'JPEG, PNG ή WebP · τουλάχιστον 800×600 pixel · έως 10 MB',
  'account.avatar.add': 'Προσθήκη φωτογραφίας',
  'account.avatar.change': 'Αλλαγή',
  'account.avatar.remove': 'Αφαίρεση',
  'account.avatar.uploading': 'Μεταφόρτωση…',
  'account.name.label': 'Το εμφανιζόμενο όνομά σας',
  'account.name.help': 'Αυτό είναι το όνομα που βλέπουν οι άλλοι. Μπορείτε να το αφήσετε κενό.',
  'account.name.placeholder': 'π.χ. Μαρία Κ.',

  'account.language.label': 'Η προτιμώμενη γλώσσα σας',
  'account.language.help':
    'Η γλώσσα στην οποία σας γράφουμε. Η γλώσσα της διεπαφής προκύπτει από τη γραμμή διευθύνσεων, όχι από αυτή την επιλογή.',
  'account.language.none': 'Δεν έχει οριστεί',

  'account.save': 'Αποθήκευση',
  'account.saving': 'Αποθήκευση…',
  'account.saved': 'Οι αλλαγές αποθηκεύτηκαν.',

  'account.error.name': {
    one: 'Το εμφανιζόμενο όνομα μπορεί να έχει έως {n} χαρακτήρα.',
    other: 'Το εμφανιζόμενο όνομα μπορεί να έχει έως {n} χαρακτήρες.',
  },
  'account.error.language': 'Δεν υποστηρίζουμε ακόμα αυτή τη γλώσσα. Επιλέξτε άλλη από τη λίστα.',
  'account.error.signedOut': 'Η συνεδρία σας έληξε. Συνδεθείτε ξανά.',

  'account.menu.trigger': 'Μενού λογαριασμού: {ad}',
  'account.menu.title': 'Λογαριασμός',
  'account.menu.signedInAs': 'Συνδεδεμένοι ως {eposta}',
  'account.menu.account': 'Ο λογαριασμός σας',
  'account.menu.signOut': 'Αποσύνδεση',
  'account.menu.fallbackLabel': 'Ο λογαριασμός σας',

  'account.signIn': 'Σύνδεση',
  'account.loading': 'Φόρτωση της συνεδρίας σας',

  'host.meta.title': 'Γίνετε οικοδεσπότης',

  'host.invite.title': 'Δημοσιεύστε τη δική σας εμπειρία',
  'host.invite.lede':
    'Δείξτε στους άλλους κάτι που ξέρετε, πηγαίνετέ τους εκεί που ήδη περπατάτε. Εσείς ορίζετε την τιμή, το μέγεθος της ομάδας, το ημερολόγιο και την πολιτική ακύρωσης — εμείς δεν παρεμβαίνουμε σε αυτό που προσφέρετε.',
  'host.invite.noApproval':
    'Χωρίς έγκριση, χωρίς αίτηση. Μόλις επιλέξετε να γίνετε οικοδεσπότης, ο πίνακάς σας ανοίγει.',
  'host.invite.cta': 'Γίνετε οικοδεσπότης',
  'host.invite.pending': 'Άνοιγμα…',

  'host.signedOut.note':
    'Για να γίνετε οικοδεσπότης πρέπει πρώτα να συνδεθείτε. Δεν ζητάμε κωδικό πρόσβασης — στέλνουμε κωδικό μίας χρήσης στη διεύθυνσή σας.',
  'host.signedOut.cta': 'Συνδεθείτε για να γίνετε οικοδεσπότης',

  'host.panel.title': 'Πίνακας οικοδεσπότη',
  'host.panel.lede':
    'Εδώ διαχειρίζεστε τις εμπειρίες σας. Εσείς ορίζετε την τιμή, την ομάδα, το ημερολόγιο και την πολιτική ακύρωσης — εμείς δεν παρεμβαίνουμε σε αυτό που προσφέρετε.',
  'host.panel.status': 'Ο λογαριασμός σας είναι ανοιχτός ως οικοδεσπότης.',
  'host.panel.new': 'Νέα εμπειρία',

  'host.listings.heading': 'Οι αγγελίες μου · {sayi}',
  'host.listings.headingPage': 'Οι αγγελίες μου · {sayi} σε αυτή τη σελίδα',
  'host.listings.pager.label': 'Σελίδες αγγελιών',
  'host.listings.pager.next': 'Περισσότερες αγγελίες',
  'host.listings.pager.first': 'Επιστροφή στην πρώτη σελίδα',
  'host.listings.edit': 'Επεξεργασία',
  'host.listings.view': 'Προβολή αγγελίας',
  'host.listings.status.draft': 'Πρόχειρο',
  'host.listings.status.published': 'Δημοσιευμένη',
  'host.listings.status.archived': 'Αρχειοθετημένη',

  'host.listings.ready': 'Έτοιμη για δημοσίευση',
  'host.listings.missing': { one: 'Λείπει {n} πεδίο', other: 'Λείπουν {n} πεδία' },

  'host.listings.empty.heading': 'Οι αγγελίες μου',
  'host.listings.empty.title': 'Δεν έχετε ακόμα αγγελία',
  'host.listings.empty.body':
    'Ανοίξτε το πρώτο σας πρόχειρο. Μπορείτε να δουλεύετε πάνω του όσο θέλετε πριν το δημοσιεύσετε — κανείς άλλος δεν βλέπει ένα πρόχειρο.',
  'host.listings.empty.cta': 'Γράψτε την πρώτη σας εμπειρία',

  'host.listings.errorHeading': 'Οι αγγελίες μου',
  'host.listings.error':
    'Δεν μπορέσαμε να φορτώσουμε τις αγγελίες σας αυτή τη στιγμή. Δεν διαγράφηκε τίποτα — φορτώστε ξανά τη σελίδα σε λίγο.',

  'host.steps.heading': 'Από πού να ξεκινήσω;',
  'host.steps.describe.title': 'Περιγράψτε την εμπειρία σας',
  'host.steps.describe.body':
    'Τίτλος, περιγραφή, διάρκεια και μέγεθος ομάδας. Γράψτε τη σε όσες γλώσσες θέλετε — οι ταξιδιώτες τη διαβάζουν στη δική τους.',
  'host.steps.media.title': 'Προσθέστε τις φωτογραφίες σας',
  'host.steps.media.body':
    'Τουλάχιστον μία φωτογραφία εξωφύλλου. Δείξτε πώς είναι πραγματικά η εμπειρία· οι φωτογραφίες από τράπεζες εικόνων δεν ταιριάζουν εδώ.',
  'host.steps.pricing.title': 'Ορίστε ημερολόγιο και τιμή',
  'host.steps.pricing.body':
    'Ποιες ημέρες, πόσα άτομα, πόσο κοστίζει. Γράφετε την τιμή στο δικό σας νόμισμα και σε αυτό το νόμισμα πληρώνεστε.',
  'host.steps.publish.title': 'Δημοσιεύστε',
  'host.steps.publish.body':
    'Δεν χρειάζεται αναμονή. Μόλις δημοσιεύσετε, η αγγελία σας εμφανίζεται στην αναζήτηση.',

  'host.contact.title': 'Γράψτε μας αν κολλήσετε',
  'host.contact.body':
    'Φροντίζουμε τους πρώτους οικοδεσπότες έναν έναν. Αν κάτι σας μπλοκάρει όσο ετοιμάζετε την αγγελία ή δεν είστε σίγουροι για μια απόφαση, γράψτε μας — θα το λύσουμε μαζί.',
  'host.contact.cta': 'Γράψτε μας',
  'host.contact.howItWorks': 'Πώς λειτουργεί',

  'host.error.blocked':
    'Αυτός ο λογαριασμός έχει ανασταλεί, οπότε δεν μπορεί να γίνει οικοδεσπότης. destek@expyra.com',

  // --- Deneyim sihirbazı -----------------------------------------------------

  'host.experience.new.meta.title': 'Νέα εμπειρία',
  'host.experience.new.title': 'Ξεκινήστε μια νέα εμπειρία',
  'host.experience.new.lede':
    'Πρώτα ρωτάμε ένα μόνο πράγμα: σε ποια γλώσσα θα γράψετε την αγγελία. Όλα τα υπόλοιπα τα συμπληρώνετε μέσα στο πρόχειρο, με όποια σειρά θέλετε.',
  'host.experience.new.language.label': 'Σε ποια γλώσσα θα γράψετε;',
  'host.experience.new.language.help':
    'Αυτό δεν αλλάζει αργότερα: από αυτό προκύπτει η διεύθυνση της αγγελίας σας, και οι ταξιδιώτες βλέπουν αυτό το κείμενο όταν δεν υπάρχει άλλη γλώσσα. Μπορείτε να προσθέσετε άλλες γλώσσες μετά.',
  'host.experience.new.submit': 'Άνοιγμα πρόχειρου',
  'host.experience.new.pending': 'Άνοιγμα…',

  'host.experience.new.next.heading': 'Τι ακολουθεί;',
  'host.experience.new.next.text': 'Τίτλος και περιγραφή — σε όσες γλώσσες θέλετε.',
  'host.experience.new.next.basics': 'Πόσο διαρκεί και πόσα άτομα δέχεστε.',
  'host.experience.new.next.place':
    'Πόλη, κατηγορία και οι γλώσσες που μιλάτε τη μέρα της εμπειρίας.',
  'host.experience.new.next.publish': 'Δημοσιεύστε όταν είστε έτοιμοι. Δεν χρειάζεται αναμονή.',

  'host.experience.edit.meta.title': 'Επεξεργασία εμπειρίας',
  'host.experience.edit.lede':
    'Κάθε ενότητα αποθηκεύεται χωριστά. Σταματήστε όπου θέλετε — το πρόχειρό σας σάς περιμένει.',
  'host.experience.untitled': 'Πρόχειρο χωρίς τίτλο',
  'host.experience.back': '← Επιστροφή στον πίνακα οικοδεσπότη',

  'host.experience.save': 'Αποθήκευση',
  'host.experience.saving': 'Αποθήκευση…',
  'host.experience.saved': 'Αποθηκεύτηκε.',

  'host.experience.section.text': 'Τίτλος και περιγραφή',
  'host.experience.section.textHelp':
    'Αυτό διαβάζουν οι ταξιδιώτες πριν αποφασίσουν. Πείτε τι θα κάνετε, πού θα συναντηθείτε και τι σας συνδέει με αυτό.',
  'host.experience.section.basics': 'Διάρκεια και χωρητικότητα',
  'host.experience.section.basicsHelp':
    'Πόσο διαρκεί μία διοργάνωση και πόσα άτομα δέχεστε κάθε φορά. Το ημερολόγιο και η τιμή έρχονται αργότερα.',
  'host.experience.section.place': 'Πόλη',
  'host.experience.section.placeHelp':
    'Πού γίνεται η εμπειρία. Από αυτό προκύπτει η ζώνη ώρας — οι ώρες των διοργανώσεων εμφανίζονται σε αυτήν.',
  'host.experience.section.category': 'Κατηγορία',
  'host.experience.section.categoryHelp':
    'Οι ταξιδιώτες φιλτράρουν με βάση αυτό στην αναζήτηση. Διαλέξτε την πιο κοντινή· μόνο μία επιτρέπεται.',
  'host.experience.section.languages': 'Ομιλούμενες γλώσσες και ετικέτες',
  'host.experience.section.languagesHelp':
    'Σε ποιες γλώσσες πραγματοποιείτε την εμπειρία; Αυτό είναι ξεχωριστό από τη γλώσσα στην οποία γράψατε την αγγελία.',
  'host.experience.section.status': 'Δημοσίευση',
  'host.experience.section.statusHelp':
    'Όσα χρειάζονται για τη δημοσίευση αναφέρονται παρακάτω. Δεν υπάρχει έγκριση — αν δεν λείπει τίποτα, η αγγελία σας εμφανίζεται αμέσως στην αναζήτηση.',

  'host.experience.translations.tabsLabel': 'Γλώσσες του κειμένου της αγγελίας',
  'host.experience.translations.required': 'υποχρεωτικό',
  'host.experience.translations.optional': 'προαιρετικό',
  'host.experience.translations.add.label': 'Γράψτε σε άλλη γλώσσα',
  'host.experience.translations.add.submit': 'Άνοιγμα',
  'host.experience.translations.machine':
    'Αυτό το κείμενο μεταφράστηκε αυτόματα. Επεξεργαστείτε το και αποθηκεύστε το για να γίνει δικό σας κείμενο.',

  'host.experience.title.label': 'Τίτλος',
  'host.experience.title.placeholder': 'Γευστική βόλτα στο Καντίκιοϊ',
  'host.experience.title.help':
    'Σύντομος και συγκεκριμένος. Είναι το πρώτο που βλέπουν οι ταξιδιώτες στη λίστα, και από αυτόν προκύπτει η διεύθυνση της αγγελίας σας.',
  'host.experience.description.label': 'Περιγραφή',
  'host.experience.description.placeholder':
    'Πού συναντιέστε, τι κάνετε, τι τρώτε, τι να φορέσουν…',
  'host.experience.description.help':
    'Δεν είναι υποχρεωτική για τη δημοσίευση, αλλά εδώ αποφασίζουν οι ταξιδιώτες. Περιγράψτε τη μέρα με τη σειρά.',

  'host.experience.duration.label': 'Διάρκεια (ώρες)',
  'host.experience.duration.help':
    'Συνολική διάρκεια μίας διοργάνωσης. Για παράδειγμα 1,5 ώρα ή 3. Έως επτά ημέρες (168 ώρες).',
  'host.experience.capacity.label': 'Χωρητικότητα (άτομα)',
  'host.experience.capacity.help':
    'Μέγιστος αριθμός ατόμων ανά διοργάνωση. Για τη δημοσίευση χρειάζεται τουλάχιστον ένα.',

  'host.experience.city.label': 'Σε ποια πόλη γίνεται;',
  'host.experience.city.placeholder': 'Αναζήτηση πόλης',
  'host.experience.place.saved': 'Επιλέχθηκε πόλη · ζώνη ώρας {saat}',
  'host.experience.place.empty': 'Δεν έχει επιλεγεί ακόμα πόλη.',
  'host.experience.place.locked':
    'Μόλις δημοσιευτεί μια αγγελία, η πόλη της κλειδώνει: από αυτήν εξαρτώνται οι ώρες των διοργανώσεων και οι κρατήσεις. Για άλλη πόλη, ανοίξτε νέα αγγελία.',

  'host.experience.category.label': 'Κατηγορία',
  'host.experience.category.none': 'Δεν επιλέχθηκε',
  'host.experience.category.help': 'Το κύριο θέμα της εμπειρίας.',

  'host.experience.spoken.label': 'Γλώσσες που μιλάτε κατά την εμπειρία',
  'host.experience.spoken.help':
    'Ανεξάρτητα από τη γλώσσα της αγγελίας: σημειώστε τις γλώσσες στις οποίες πραγματικά πραγματοποιείτε την εμπειρία. Έως δέκα.',
  'host.experience.spoken.search.label': 'Αναζήτηση γλώσσας',
  'host.experience.spoken.search.placeholder': 'Γερμανικά, Deutsch, de…',
  'host.experience.spoken.search.results': {
    one: '{n} γλώσσα στη λίστα',
    other: '{n} γλώσσες στη λίστα',
  },
  'host.experience.spoken.search.none':
    'Καμία γλώσσα δεν ταιριάζει. Οι σημειωμένες γλώσσες διατηρούνται.',
  'host.experience.tags.label': 'Ετικέτες',
  'host.experience.tags.placeholder': 'φαγητό δρόμου, περπάτημα, μικρή ομάδα',
  'host.experience.tags.help':
    'Χωρίστε τις με κόμματα. Έως δέκα. Βοηθούν την αγγελία σας να εμφανίζεται στις αναζητήσεις.',

  'host.experience.missing.heading': 'Τι χρειάζεται για τη δημοσίευση',
  'host.experience.ready': 'Όλα έτοιμα. Μπορείτε να δημοσιεύσετε αυτή την αγγελία.',
  'host.experience.missing.translation': 'τίτλος στη γλώσσα της αγγελίας',
  'host.experience.missing.city': 'πόλη',
  'host.experience.missing.category': 'κατηγορία',
  'host.experience.missing.capacity': 'χωρητικότητα',
  'host.experience.missing.duration': 'διάρκεια',
  'host.experience.missing.cover': 'φωτογραφία εξωφύλλου',
  'host.experience.missing.price': 'τιμή',
  'host.experience.missing.unknown': 'ένα ημιτελές πεδίο',

  'host.experience.publish': 'Δημοσίευση',
  'host.experience.republish': 'Νέα δημοσίευση',
  'host.experience.publishing': 'Δημοσίευση…',
  'host.experience.published': 'Η αγγελία σας δημοσιεύτηκε.',
  'host.experience.unpublish': 'Απόσυρση',
  'host.experience.unpublishing': 'Απόσυρση…',
  'host.experience.unpublished':
    'Η αγγελία επέστρεψε σε πρόχειρο — δεν εμφανίζεται στην αναζήτηση.',
  'host.experience.archive': 'Αρχειοθέτηση',
  'host.experience.archiving': 'Αρχειοθέτηση…',
  'host.experience.archived': 'Η αγγελία αρχειοθετήθηκε.',

  // --- Medya (Blok 6) ----------------------------------------------------------
  'host.media.heading': 'Φωτογραφίες',
  'host.media.hint':
    'JPEG, PNG ή WebP · τουλάχιστον 800×600 pixel · έως 10 MB · έως 12 φωτογραφίες',
  'host.media.add': 'Προσθήκη φωτογραφιών',
  'host.media.drop': 'Αφήστε τα αρχεία εδώ',
  'host.media.uploading': 'Μεταφόρτωση…',
  'host.media.empty':
    'Δεν υπάρχουν ακόμα φωτογραφίες. Η πρώτη που θα ανεβάσετε γίνεται εξώφυλλο.',
  'host.media.cover': 'Εξώφυλλο',
  'host.media.makeCover': 'Ορισμός ως εξώφυλλο',
  'host.media.delete': 'Διαγραφή',
  'host.media.moveEarlier': 'Μετακίνηση νωρίτερα',
  'host.media.moveLater': 'Μετακίνηση αργότερα',
  'host.media.position': 'Φωτογραφία {n}',
  'host.media.error.rejected': 'Η φωτογραφία δεν έγινε δεκτή.',
  'host.media.error.unsupported': 'Μπορείτε να ανεβάσετε μόνο JPEG, PNG και WebP.',
  'host.media.error.notUploaded': 'Η μεταφόρτωση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.',
  'host.media.error.notAnImage': 'Αυτό το αρχείο δεν είναι εικόνα.',
  'host.media.error.mismatch': 'Το περιεχόμενο του αρχείου δεν ταιριάζει με την κατάληξή του.',
  'host.media.error.tooSmall': 'Οι φωτογραφίες πρέπει να είναι τουλάχιστον 800×600 pixel.',
  'host.media.error.tooLarge': 'Τα αρχεία μπορούν να είναι έως 10 MB.',
  'host.media.error.limit': 'Μια αγγελία μπορεί να έχει έως 12 φωτογραφίες.',

  'host.experience.status.publishedNote':
    'Η αγγελία σας εμφανίζεται στην αναζήτηση. Αποσύρετέ τη για να επιστρέψει σε πρόχειρο — αλλάξτε τις φωτογραφίες και δημοσιεύστε ξανά. Η αρχειοθέτηση επίσης την κρύβει, χωρίς να τη διαγράφει.',
  'host.experience.status.privateNote':
    'Μέχρι να τη δημοσιεύσετε, κανείς εκτός από εσάς δεν βλέπει αυτή την αγγελία.',

  'host.experience.error.notFound':
    'Δεν βρήκαμε αυτή την αγγελία. Ανοίξτε τη ξανά από τον πίνακα.',
  'host.experience.error.invalid':
    'Αυτή η ενότητα δεν αποθηκεύτηκε. Ελέγξτε τα πεδία και δοκιμάστε ξανά.',
  'host.experience.error.language':
    'Δεν μπορούν να γραφτούν αγγελίες σε αυτή τη γλώσσα. Επιλέξτε άλλη από τη λίστα.',
  'host.experience.error.title':
    'Ο τίτλος είναι υποχρεωτικός και μπορεί να έχει έως 120 χαρακτήρες.',
  'host.experience.error.description': 'Η περιγραφή μπορεί να έχει έως 4000 χαρακτήρες.',
  'host.experience.error.duration':
    'Γράψτε τη διάρκεια σε ώρες: τουλάχιστον 0,5, το πολύ 168.',
  'host.experience.error.capacity':
    'Γράψτε τη χωρητικότητα σε άτομα: τουλάχιστον 1, το πολύ 500.',
  'host.experience.error.city':
    'Επιλέξτε την πόλη από τη λίστα — δεν αρκεί να πληκτρολογήσετε το όνομα.',
  'host.experience.error.category': 'Επιλέξτε κατηγορία από τη λίστα.',
  'host.experience.section.itinerary': 'Τι θα κάνετε',
  'host.experience.section.itineraryHelp':
    'Τα βήματα της εμπειρίας με τη σειρά. Κάθε βήμα έχει τίτλο και, αν θέλετε, μία-δύο προτάσεις. Η λίστα γράφεται στη γλώσσα της αγγελίας· οι καρτέλες γλώσσας παραπάνω ισχύουν και εδώ.',
  'host.experience.section.meeting': 'Σημείο συνάντησης',
  'host.experience.section.meetingHelp':
    'Πού θα σας βρουν οι επισκέπτες; Η διεύθυνση δεν εξαρτάται από τη γλώσσα, οι οδηγίες γράφονται στην επιλεγμένη γλώσσα. Προσθέστε συντεταγμένες για να την ανοίγουν σε χάρτη.',
  'host.experience.section.details': 'Καλό να ξέρετε',
  'host.experience.section.detailsHelp':
    'Όριο ηλικίας, επίπεδο δραστηριότητας και ό,τι πρέπει να ξέρουν οι επισκέπτες από πριν. Τα κενά πεδία δεν εμφανίζονται.',
  'host.experience.textLanguage.note':
    'Γλώσσα κειμένων αυτής της ενότητας: {dil}. Για αλλαγή γλώσσας χρησιμοποιήστε τις καρτέλες στο 01.',

  'host.experience.itinerary.stepTitle.label': 'Βήμα {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Συνάντηση στον Ιππόδρομο',
  'host.experience.itinerary.stepBody.placeholder':
    'Ο ιππόδρομος των αρματοδρομιών του Βυζαντίου· εδώ στέκονται ο Οβελίσκος και ο Όφις των Δελφών.',
  'host.experience.itinerary.add': 'Προσθήκη βήματος',
  'host.experience.itinerary.remove': 'Αφαίρεση βήματος',
  'host.experience.itinerary.help': 'Οι κενές γραμμές δεν αποθηκεύονται. Έως 20 βήματα.',

  'host.experience.meeting.address.label': 'Διεύθυνση',
  'host.experience.meeting.address.placeholder':
    'Μπροστά στον Πύργο του Γαλατά, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Γεωγραφικό πλάτος',
  'host.experience.meeting.longitude.label': 'Γεωγραφικό μήκος',
  'host.experience.meeting.coords.help': 'Και τα δύο ή κανένα. Δεκαδικά: 41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Οδηγίες',
  'host.experience.meeting.instructions.placeholder':
    'Βόρεια πύλη του πύργου, αναζητήστε τον ξεναγό με την κίτρινη ομπρέλα.',

  'host.experience.details.minimumAge.label': 'Ελάχιστη ηλικία',
  'host.experience.details.minimumAge.help': 'Κενό = χωρίς όριο. 1–99.',
  'host.experience.details.activityLevel.label': 'Επίπεδο δραστηριότητας',
  'host.experience.details.activityLevel.none': 'Δεν ορίστηκε',
  'host.experience.details.whatToBring.label': 'Τι να φέρετε',
  'host.experience.details.whatToBring.placeholder':
    'Νερό, άνετα παπούτσια, μαντίλι (για επίσκεψη σε τζαμιά)',
  'host.experience.details.notIncluded.label': 'Δεν περιλαμβάνονται',
  'host.experience.details.notIncluded.placeholder': 'Εισιτήρια μουσείων, μεσημεριανό',
  'host.experience.details.accessibility.label': 'Προσβασιμότητα',
  'host.experience.details.accessibility.placeholder':
    'Η διαδρομή έχει σκάλες· δεν είναι κατάλληλη για αναπηρικά αμαξίδια.',

  'host.experience.error.translationMissing':
    'Γράψτε πρώτα τον τίτλο σε αυτή τη γλώσσα (ενότητα 01) και μετά συμπληρώστε αυτά τα πεδία.',
  'host.experience.error.minimumAge':
    'Η ελάχιστη ηλικία πρέπει να είναι ακέραιος αριθμός από 1 έως 99.',
  'host.experience.error.coordinates':
    'Το γεωγραφικό πλάτος και μήκος πάνε μαζί· πλάτος ±90, μήκος ±180.',
  'host.experience.error.itinerary': 'Κάθε βήμα χρειάζεται τίτλο· έως 20 βήματα.',

  'experience.activity.light': 'Ήπιο',
  'experience.activity.moderate': 'Μέτριο',
  'experience.activity.strenuous': 'Απαιτητικό',

  'host.profile.heading': 'Συστηθείτε',
  'host.profile.lede':
    'Εμφανίζεται κάτω από το όνομά σας στη σελίδα της αγγελίας. Ποιος είστε και γιατί εσείς πρέπει να πείτε αυτή την ιστορία — δύο προτάσεις αρκούν.',
  'host.profile.headline.label': 'Τίτλος προφίλ',
  'host.profile.headline.placeholder': 'Τοπικός ξεναγός και ιστορικός στην Κωνσταντινούπολη',
  'host.profile.bio.label': 'Λίγα λόγια για μένα',
  'host.profile.bio.placeholder':
    'Εδώ και δέκα χρόνια γυρίζω τους ανθρώπους στα στενά της πόλης…',
  'host.profile.language.label': 'Γλώσσα του κειμένου',
  'host.profile.error.invalid': 'Τίτλος προφίλ έως 80 χαρακτήρες, βιογραφικό έως 2000.',
  'host.experience.error.spokenLanguages': 'Μπορείτε να σημειώσετε έως δέκα γλώσσες.',
  'host.experience.error.tags':
    'Οι ετικέτες δεν μπορούν να είναι κενές· έως δέκα, και η καθεμία σύντομη.',
  'host.experience.error.publishedConflict':
    'Αυτή η αλλαγή δεν γίνεται σε δημοσιευμένη αγγελία. Αρχειοθετήστε τη πρώτα και μετά επεξεργαστείτε τη.',
  'host.experience.error.publishBlocked': 'Δεν δημοσιεύτηκε. Λείπουν ακόμα: {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Δεν δημοσιεύτηκε: η αγγελία δεν είναι ακόμα πλήρης. Ελέγξτε τη λίστα παραπάνω.',

  // --- Kategoriler -------------------------------------------------------------
  'category.food-drink': 'Φαγητό και ποτό',
  'category.art-culture': 'Τέχνη και πολιτισμός',
  'category.history-heritage': 'Ιστορία και κληρονομιά',
  'category.nature-outdoors': 'Φύση και ύπαιθρος',
  'category.water-sea': 'Νερό και θάλασσα',
  'category.sports-adventure': 'Αθλητισμός και περιπέτεια',
  'category.crafts-workshops': 'Χειροτεχνία και εργαστήρια',
  'category.music-nightlife': 'Μουσική και νυχτερινή ζωή',
  'category.wellness': 'Ευεξία',
  'category.photography': 'Φωτογραφία',
  'category.tours-walks': 'Ξεναγήσεις και περίπατοι',
  'category.local-life': 'Τοπική ζωή',
  // --- Fiyat (PLAN Blok 7) ---
  'host.experience.section.pricing': 'Τιμή',
  'host.experience.section.pricingHelp':
    'Ορίστε την τιμή ανά άτομο στο δικό σας νόμισμα. Πληρώνεστε πάντα σε αυτό το νόμισμα· αν ένας ταξιδιώτης επιλέξει άλλο, μετατρέπεται μόνο η εμφάνιση.',

  'host.pricing.currency.label': 'Νόμισμα πληρωμής',
  'host.pricing.currency.help':
    'Το νόμισμα στο οποίο σας φτάνουν τα χρήματα. Δεν αλλάζει μετά τη δημοσίευση της αγγελίας — αρχειοθετήστε τη πρώτα.',
  'host.pricing.currency.locked':
    'Το νόμισμα είναι κλειδωμένο επειδή η αγγελία είναι δημοσιευμένη.',
  'host.pricing.currency.placeholder': 'Επιλέξτε',

  'host.pricing.adult.label': 'Ενήλικας (ανά άτομο)',
  'host.pricing.adult.help':
    'Υποχρεωτικό. Αυτή είναι η τιμή «από» που εμφανίζεται στις κάρτες και στην αναζήτηση.',
  'host.pricing.child.label': 'Παιδί (ανά άτομο)',
  'host.pricing.child.help': 'Αφήστε κενό αν δεν έχετε παιδική τιμή. Γράψτε 0 αν είναι δωρεάν.',
  'host.pricing.infant.label': 'Βρέφος (ανά άτομο)',
  'host.pricing.infant.help':
    'Αφήστε κενό αν δεν έχετε τιμή για βρέφη. Γράψτε 0 αν είναι δωρεάν.',

  'host.pricing.saved': 'Η τιμή αποθηκεύτηκε.',
  'host.pricing.empty': 'Δεν υπάρχει ακόμα τιμή. Αγγελία χωρίς τιμή δεν μπορεί να δημοσιευτεί.',

  'host.pricing.error.currency': 'Επιλέξτε έγκυρο νόμισμα.',
  'host.pricing.error.currencyLocked':
    'Το νόμισμα δημοσιευμένης αγγελίας δεν μπορεί να αλλάξει. Αρχειοθετήστε τη πρώτα.',
  'host.pricing.error.adult':
    'Η τιμή ενήλικα είναι υποχρεωτική και πρέπει να είναι έγκυρο ποσό.',
  'host.pricing.error.child': 'Η παιδική τιμή πρέπει να είναι έγκυρο ποσό.',
  'host.pricing.error.infant': 'Η τιμή βρέφους πρέπει να είναι έγκυρο ποσό.',
  'host.pricing.error.range':
    'Αυτό το ποσό είναι εκτός του εύρους που δέχεται ο πάροχος πληρωμών — είναι είτε πολύ μικρό είτε πολύ μεγάλο.',

  // --- Takvim (PLAN Blok 7) ---
  'host.experience.section.schedule': 'Πρόγραμμα',
  'host.experience.section.scheduleHelp':
    'Ποιες ημέρες και ώρες την πραγματοποιείτε; Οι ώρες είναι στη ζώνη ώρας της πόλης — η ώρα που γράφετε δεν μετακινείται με την αλλαγή θερινής ώρας.',

  'host.schedule.blocked':
    'Για πρόγραμμα χρειάζονται πρώτα πόλη, διάρκεια και χωρητικότητα. Ολοκληρώστε τις παραπάνω ενότητες.',
  'host.schedule.timeZone': 'Ζώνη ώρας: {bolge}',
  'host.schedule.generatedThrough': 'Το ημερολόγιό σας είναι έτοιμο έως {tarih}.',

  // Haftalık kural
  'host.schedule.rule.heading': 'Εβδομαδιαίος κανόνας',
  'host.schedule.rule.days': 'Ημέρες',
  'host.schedule.rule.daysHelp':
    'Μπορείτε να επιλέξετε περισσότερες από μία· κάθε ημέρα γίνεται ξεχωριστός κανόνας.',
  'host.schedule.rule.time': 'Ώρα έναρξης',
  'host.schedule.rule.timeHelp': 'Σε τοπική ώρα της πόλης.',
  'host.schedule.rule.start': 'Από',
  'host.schedule.rule.startHelp': 'Αφήστε κενό για να ξεκινήσει σήμερα.',
  'host.schedule.rule.submit': 'Προσθήκη κανόνα',
  'host.schedule.rule.pending': 'Προσθήκη…',
  'host.schedule.rule.stop': 'Αφαίρεση',
  'host.schedule.rule.stopping': 'Αφαίρεση…',
  'host.schedule.rule.empty': 'Δεν υπάρχουν ακόμα εβδομαδιαίοι κανόνες.',
  'host.schedule.rule.stopped': 'διακόπηκε',

  // Kapalı günler
  'host.schedule.blackout.heading': 'Ημέρες εκτός λειτουργίας',
  'host.schedule.blackout.start': 'Από',
  'host.schedule.blackout.end': 'Έως',
  'host.schedule.blackout.endHelp':
    'Αφήστε κενό για να κλείσετε μία μόνο ημέρα. Η τελευταία ημέρα περιλαμβάνεται.',
  'host.schedule.blackout.submit': 'Κλείσιμο',
  'host.schedule.blackout.pending': 'Κλείσιμο…',
  'host.schedule.blackout.remove': 'Αφαίρεση',
  'host.schedule.blackout.removing': 'Αφαίρεση…',
  'host.schedule.blackout.empty': 'Καμία ημέρα εκτός λειτουργίας.',

  // Seanslar
  'host.schedule.slots.heading': 'Επερχόμενες διοργανώσεις',
  'host.schedule.slots.empty': 'Καμία διοργάνωση σε αυτό το διάστημα.',
  'host.schedule.slots.remaining': {
    one: 'Απομένει {n} θέση',
    other: 'Απομένουν {n} θέσεις',
  },
  'host.schedule.slots.closed': 'Κλειστή',
  'host.schedule.slots.closedByBlackout': 'Ημέρα εκτός λειτουργίας',
  'host.schedule.slots.close': 'Κλείσιμο',
  'host.schedule.slots.closing': 'Κλείσιμο…',
  'host.schedule.slots.open': 'Άνοιγμα',
  'host.schedule.slots.opening': 'Άνοιγμα…',
  'host.schedule.slots.more': 'και {n} ακόμα',

  // Günler
  'host.schedule.day.monday': 'Δευτέρα',
  'host.schedule.day.tuesday': 'Τρίτη',
  'host.schedule.day.wednesday': 'Τετάρτη',
  'host.schedule.day.thursday': 'Πέμπτη',
  'host.schedule.day.friday': 'Παρασκευή',
  'host.schedule.day.saturday': 'Σάββατο',
  'host.schedule.day.sunday': 'Κυριακή',

  // Onaylar
  'host.schedule.ruleSaved': 'Ο κανόνας προστέθηκε και δημιουργήθηκαν διοργανώσεις.',
  'host.schedule.ruleStopped': 'Ο κανόνας διακόπηκε.',
  'host.schedule.slotOpened': 'Η διοργάνωση άνοιξε.',
  'host.schedule.slotClosed': 'Η διοργάνωση έκλεισε.',
  'host.schedule.blackoutSaved': 'Οι ημέρες έκλεισαν.',
  'host.schedule.blackoutRemoved': 'Οι ημέρες εκτός λειτουργίας αφαιρέθηκαν.',

  // Hatalar — her biri sunucunun makine-okur koduna karşılık
  'host.schedule.error.noDay': 'Επιλέξτε τουλάχιστον μία ημέρα.',
  'host.schedule.error.time': 'Γράψτε την ώρα σε μορφή ΩΩ:ΛΛ.',
  'host.schedule.error.date': 'Γράψτε έγκυρη ημερομηνία.',
  'host.schedule.error.range': 'Η ημερομηνία λήξης δεν μπορεί να είναι πριν από την έναρξη.',
  'host.schedule.error.notSchedulable':
    'Για πρόγραμμα χρειάζονται πρώτα πόλη, διάρκεια και χωρητικότητα.',
  'host.schedule.error.duplicateRule': 'Υπάρχει ήδη κανόνας για αυτή την ημέρα και ώρα.',
  'host.schedule.error.ruleLimit':
    'Αυτή η εμπειρία δεν μπορεί να έχει περισσότερους εβδομαδιαίους κανόνες.',
  'host.schedule.error.dstGap':
    'Αυτή η ώρα δεν υπάρχει εκείνη την ημέρα λόγω αλλαγής θερινής ώρας. Δοκιμάστε μία ώρα αργότερα.',
  'host.schedule.error.past': 'Μια διοργάνωση που πέρασε δεν μπορεί να αλλάξει.',
  'host.schedule.error.slotExists': 'Υπάρχει ήδη διοργάνωση σε αυτή την ώρα.',
  'host.schedule.error.blackedOut':
    'Αυτή η ημερομηνία είναι ημέρα εκτός λειτουργίας. Αφαιρέστε πρώτα το διάστημα.',
  'host.schedule.error.generated':
    'Μια διοργάνωση που δημιουργήθηκε από εβδομαδιαίο κανόνα δεν διαγράφεται· μπορείτε να την κλείσετε.',
  'host.schedule.error.hasBookings': 'Μια διοργάνωση με κρατήσεις δεν μπορεί να αλλάξει.',
  'host.schedule.error.blackoutLimit':
    'Δεν μπορούν να προστεθούν άλλες ημέρες εκτός λειτουργίας.',
  'host.schedule.error.horizon': 'Το ημερολόγιο δεν μπορεί να ανοίξει τόσο μακριά στο μέλλον.',
  'host.schedule.error.generic': 'Αυτό δεν λειτούργησε αυτή τη στιγμή.',
} as const satisfies Dictionary<'el'>

/**
 * Metnin içi de kaynakla karşılaştırılıyor: bir yer tutucu düşerse ya da adı
 * değişirse derleme, hangi anahtarda olduğunu yazarak kırılır.
 * `export` bilinçli — kullanılmayan tip lint'te ölü kod sayılır.
 */
export type ElPlaceholders = Assert<PlaceholdersMatchSource<typeof el>>
