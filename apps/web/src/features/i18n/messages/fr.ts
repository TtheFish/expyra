import 'server-only'

import type { Assert, Dictionary, PlaceholdersMatchSource } from '../dictionary'

/**
 * Fransızca arayüz.
 *
 * **Hitap "vous".** Öbür diller "sen" diliyle yazıldı; Fransızca'da tüketici
 * ürünlerinin (Airbnb, SNCF Connect, Doctolib) standardı "vous" ve "tu" bir
 * yabancıya karşı laubali okunuyor. Ton yine aynı: kısa, doğrudan, ünlemsiz.
 *
 * **Çoğul üç biçim** (`one`, `many`, `other`): `one` 0 ve 1'de, ayrıca 2'nin
 * altındaki ondalıkta ("1,5 heure") seçiliyor; `many` yalnız milyonun katlarında
 * ("1 000 000 d’heures" — CLDR'ın "de" yapısı). Tam sayıda 2–999 999 hep `other`.
 *
 * **Tipografi:** `?`, `:`, `;` ve `»` önünde, `«` arkasında BÖLÜNMEZ boşluk (U+00A0) —
 * düz boşluk satır sonunda soru işaretini tek başına alt satıra düşürür.
 *
 * Çevrilmeyenler en.ts ile aynı: marka (Expyra) ve destek adresi.
 */
export const fr = {
  'meta.description': 'Trouvez des expériences locales et réservez-les.',

  'nav.primaryLabel': 'Menu principal',
  'nav.footerLabel': 'Menu de pied de page',
  'nav.explore': 'Explorer',
  'nav.myExperiences': 'Mes expériences',
  'nav.becomeHost': 'Devenir hôte',
  'nav.howItWorks': 'Comment ça marche',

  'language.trigger': 'Langue  {dil}. Modifier.',
  'language.dialogLabel': 'Choix de la langue',
  'language.search.label': 'Rechercher une langue',
  'language.search.placeholder': 'Rechercher une langue',
  'language.group.ui': 'Langues de l’interface',
  'language.group.content': 'Autres langues',
  'language.group.contentHint':
    'Pas encore de traduction de l’interface — les expériences peuvent tout de même être publiées dans ces langues.',
  'language.empty': 'Aucune langue ne correspond à cette recherche.',

  'theme.toLight': 'Passer au thème clair',
  'theme.toDark': 'Passer au thème sombre',

  'currency.trigger': 'Devise  {para}. Modifier.',
  'currency.dialogLabel': 'Choix de la devise',
  'currency.search.label': 'Rechercher une devise',
  'currency.search.placeholder': 'EUR, dollar, livre…',
  'currency.none': 'Devise de l’hôte',
  'currency.empty': 'Aucune devise ne correspond à cette recherche.',

  'home.hero.title': 'Une nouvelle façon de découvrir',
  'home.hero.titleAccent': 'les expériences que seuls les locaux connaissent',
  'home.hero.lede':
    'Proposées par des gens qui vivent vraiment là. Petits groupes, vraies personnes, quelques heures inoubliables.',
  'home.showcase.heading': 'Expériences sur Expyra',
  'home.showcase.more': 'Voir toutes les expériences',
  'home.showcase.unavailable':
    'Impossible d’afficher les expériences pour le moment. Réessayez un peu plus tard — les annonces sont toujours là.',
  'home.showcase.empty.title': 'Rien n’est encore publié',
  'home.showcase.empty.body':
    'Vous pourriez être le premier. Faites découvrir ce que vous connaissez, en petit groupe.',
  'home.showcase.empty.cta': 'Devenir hôte',

  'search.destination.label': 'Où ',
  'search.destination.placeholder': 'Rechercher une ville',
  'search.date.label': 'Quand ',
  'search.date.placeholder': 'Choisir une date',
  'search.date.dialogLabel': 'Choisir une date',
  'search.date.day': 'Jour',
  'search.date.month': 'Mois',
  'search.date.year': 'Année',
  'search.date.done': 'OK',
  'search.date.clear': 'Effacer',
  'search.date.stepUp': 'Précédent  {alan}',
  'search.date.stepDown': 'Suivant  {alan}',
  'search.submit': 'Rechercher',

  'search.city.listLabel': 'Suggestions de villes',
  'search.city.countriesHeading': 'Pays',
  'search.city.citiesHeading': 'Villes',
  'search.city.allCountries': 'Tous les pays',
  'search.city.tooShort': 'Commencez à taper un nom de ville ou choisissez un pays dans la liste.',
  'search.city.loading': 'Recherche…',
  'search.city.error': 'Impossible de charger la liste des villes. Réessayez dans un instant.',
  'search.city.empty': 'Aucune ville ne correspond à cette recherche.',
  'search.city.truncated': 'Il y a d’autres villes — continuez à taper pour affiner.',
  'search.city.clear': 'Retirer la ville sélectionnée',
  'search.city.selectedValue': '{sehir}, {ulke}',
  'search.city.results': {
    one: '{n} ville trouvée',
    many: '{n} de villes trouvées',
    other: '{n} villes trouvées',
  },
  'search.city.countryCities': { one: '{n} ville', many: '{n} de villes', other: '{n} villes' },

  'search.guests.label': 'Voyageurs',
  'search.guests.dialogLabel': 'Nombre de voyageurs',
  'search.guests.done': 'OK',
  'search.guests.adults': 'Adultes',
  'search.guests.adults.hint': '13 ans et plus',
  'search.guests.adults.decrease': 'Un adulte de moins',
  'search.guests.adults.increase': 'Un adulte de plus',
  'search.guests.children': 'Enfants',
  'search.guests.children.hint': 'De 0 à 12 ans',
  'search.guests.children.decrease': 'Un enfant de moins',
  'search.guests.children.increase': 'Un enfant de plus',
  'search.guests.summary.adults': { one: '{n} adulte', many: '{n} d’adultes', other: '{n} adultes' },
  'search.guests.summary.children': {
    one: '{n} enfant',
    many: '{n} d’enfants',
    other: '{n} enfants',
  },
  'search.guests.summary.both': '{yetiskin}, {cocuk}',

  'experience.place': '{sehir}, {ulke}',
  'experience.duration.hours': { one: '{n} heure', many: '{n} d’heures', other: '{n} heures' },
  'experience.duration.minutes': {
    one: '{n} minute',
    many: '{n} de minutes',
    other: '{n} minutes',
  },
  'experience.duration.full': '{saat} {dakika}',
  'experience.duration.unknown': 'Durée non précisée',
  'experience.meta': {
    one: '{sure} · jusqu’à {n} personne',
    many: '{sure} · jusqu’à {n} de personnes',
    other: '{sure} · jusqu’à {n} personnes',
  },
  'experience.card.perPerson': 'par voyageur',
  'experience.card.language': 'Cette annonce est rédigée en {dil}',

  'explore.heading.all': 'Toutes les expériences',
  'explore.heading.city': 'Expériences à {sehir}',
  'explore.heading.query': 'Résultats pour « {arama} ',
  'explore.summary': { one: '{n} expérience', many: '{n} d’expériences', other: '{n} expériences' },
  'explore.summary.page': {
    one: '{n} expérience sur cette page',
    many: '{n} d’expériences sur cette page',
    other: '{n} expériences sur cette page',
  },
  // "ne tenons pas compte de {filtreler}" filtre adının artikeliyle çarpışıyor
  // ("de le nombre" → "du nombre"); iki noktalı kuruluş artikeli olduğu gibi bırakıyor.
  'explore.filtersNotice':
    'Pour l’instant, seule la ville filtre les résultats. Pas encore pris en compte  {filtreler}.',
  'explore.filter.date': 'la date choisie',
  'explore.filter.guests': 'le nombre de voyageurs',

  'explore.pager.label': 'Pages de résultats',
  'explore.pager.next': 'Page suivante',
  'explore.pager.first': 'Retour à la première page',

  'explore.pageLink.title': 'Impossible de lire ce lien de page',
  'explore.pageLink.body':
    'Le repère de page dans l’adresse semble abîmé. Relancez la recherche — les résultats sont toujours là.',

  'explore.empty.title': 'Pas encore d’expériences ici',
  'explore.empty.body':
    'Essayez une autre ville de la liste. De nouvelles villes et de nouvelles expériences arrivent sans cesse.',
  'explore.empty.cta': 'Voir toutes les expériences',
  'explore.empty.hostCta': 'Soyez le premier hôte ici',

  'explore.cityMissing.title': 'Nous ne connaissons pas cette ville',
  'explore.cityMissing.body':
    'La ville indiquée dans l’adresse ne figure pas dans notre registre — le lien est peut-être obsolète. Choisissez une ville dans la liste du champ ci-dessus.',
  'explore.cityMissing.cta': 'Voir toutes les expériences',

  'experience.detail.meta.fallback': 'Une expérience locale à {sehir}.',
  'experience.detail.text.fallback': 'Cette description est en {dil}',
  'experience.detail.duration.label': 'Durée',
  'experience.detail.capacity.label': 'Taille du groupe',
  'experience.detail.capacity.value': {
    one: 'Jusqu’à {n} personne',
    many: 'Jusqu’à {n} de personnes',
    other: 'Jusqu’à {n} personnes',
  },
  'experience.detail.about': 'À propos de cette expérience',
  'experience.detail.noDescription': 'L’hôte n’a pas encore rédigé de description.',
  'experience.detail.spoken.heading': 'Langues parlées pendant l’expérience',
  'experience.detail.spoken.help':
    'L’hôte anime l’expérience dans ces langues. La langue de rédaction de l’annonce est une autre chose.',
  'experience.detail.spoken.none': 'L’hôte n’a pas encore indiqué les langues qu’il parle.',
  'experience.detail.tags.heading': 'Mots-clés',
  'experience.detail.gallery.heading': 'Galerie',
  'experience.detail.host.heading': 'Votre hôte',
  'experience.detail.itinerary.heading': 'Au programme',
  'experience.detail.meeting.heading': 'Point de rendez-vous',
  'experience.detail.meeting.map': 'Ouvrir la carte',
  'experience.detail.meeting.mapEmbed': 'Carte du point de rendez-vous',
  'experience.detail.meeting.pin': 'Point de rendez-vous',
  'experience.detail.highlights.host': 'Avec {ad}',
  'experience.detail.highlights.duration': 'Environ {sure}',
  'experience.detail.highlights.spoken': 'Proposée en {diller}',
  'experience.detail.highlights.capacity': {
    one: 'Jusqu’à {n} personne',
    many: 'Jusqu’à {n} de personnes',
    other: 'Jusqu’à {n} personnes',
  },
  'experience.detail.highlights.bring': 'À apporter',
  'experience.detail.reviews.rating': '{puan}',
  'experience.detail.reviews.count': { one: '{n} avis', many: '{n} d’avis', other: '{n} avis' },
  'experience.detail.reviews.stars': {
    one: '{n} étoile',
    many: '{n} d’étoiles',
    other: '{n} étoiles',
  },
  'experience.detail.reviews.demoNote':
    'Avis d’exemple — les vraies notes apparaîtront ici dès que les réservations seront ouvertes.',
  'experience.detail.reviews.showAll': 'Afficher tous les avis',
  'experience.detail.reviews.about': 'Comprendre le fonctionnement des notes et des avis.',
  'experience.detail.reviews.demo.1.name': 'Andreea',
  'experience.detail.reviews.demo.1.place': 'Târgu Mureș, Roumanie',
  'experience.detail.reviews.demo.1.when': 'Il y a 1 jour',
  'experience.detail.reviews.demo.1.body':
    'Notre guide était à la fois savant et chaleureux. Découvrir la ville avec lui, c’était tout autre chose.',
  'experience.detail.reviews.demo.2.name': 'Marco',
  'experience.detail.reviews.demo.2.place': 'Milan, Italie',
  'experience.detail.reviews.demo.2.when': 'Il y a 3 jours',
  'experience.detail.reviews.demo.2.body':
    'Petit groupe, beaucoup d’échanges. Même les arrêts photo étaient prévus — on a adoré.',
  'experience.detail.reviews.demo.3.name': 'Eliška',
  'experience.detail.reviews.demo.3.place': 'Brno, Tchéquie',
  'experience.detail.reviews.demo.3.when': 'Il y a 1 semaine',
  'experience.detail.reviews.demo.3.body':
    'Un rythme un peu rapide, mais dans l’ensemble merveilleux. Le dernier arrêt a été notre préféré.',
  'experience.detail.reviews.demo.4.name': 'Jonas',
  'experience.detail.reviews.demo.4.place': 'Berlin, Allemagne',
  'experience.detail.reviews.demo.4.when': 'Il y a 2 semaines',
  'experience.detail.reviews.demo.4.body':
    'Plus personnel que prévu. L’hôte nous a aussi conseillé des saveurs locales.',
  'experience.detail.reviews.demo.5.name': 'Leyla',
  'experience.detail.reviews.demo.5.place': 'Istanbul, Turquie',
  'experience.detail.reviews.demo.5.when': 'Il y a 3 semaines',
  'experience.detail.reviews.demo.5.body':
    'Organisation impeccable. Point de rendez-vous clair et horaires parfaitement respectés.',
  'experience.detail.reviews.demo.6.name': 'Sara',
  'experience.detail.reviews.demo.6.place': 'Madrid, Espagne',
  'experience.detail.reviews.demo.6.when': 'Il y a 1 mois',
  'experience.detail.reviews.demo.6.body': 'Notre guide était adorable 💕💕',
  'experience.detail.know.heading': 'Bon à savoir',
  'experience.detail.know.minimumAge': 'Âge minimum',
  'experience.detail.know.minimumAgeValue': 'À partir de {n} ans',
  'experience.detail.know.activityLevel': 'Niveau d’activité',
  'experience.detail.know.whatToBring': 'À apporter',
  'experience.detail.know.notIncluded': 'Non inclus',
  'experience.detail.know.accessibility': 'Accessibilité',
  'experience.detail.nearby.heading': 'Autres expériences à {sehir}',
  'experience.detail.host.anonymous': 'Un hôte Expyra',
  'experience.detail.booking.title': 'Dates et prix',
  'experience.detail.booking.noSlots':
    'Aucune date disponible pour le moment. Elles apparaîtront ici dès que l’hôte mettra à jour son calendrier.',
  'experience.detail.booking.perPerson': 'par personne',
  'experience.detail.booking.pickDate': 'Choisir une date',
  'experience.detail.booking.timeZone': 'Horaires  {bolge}.',
  'experience.detail.booking.spotsLeft': {
    one: 'Plus que {n} place',
    many: 'Plus que {n} de places',
    other: 'Plus que {n} places',
  },
  'experience.detail.booking.adults': 'Adultes',
  'experience.detail.booking.children': 'Enfants',
  'experience.detail.booking.infants': 'Bébés',
  'experience.detail.booking.currency': 'Devise',
  'experience.detail.booking.currencyNone': 'Devise de l’hôte',
  'experience.detail.booking.update': 'Calculer le prix',
  'experience.detail.booking.continue': 'Continuer vers le paiement',
  'experience.detail.booking.pickDateFirst': 'Choisissez d’abord une date',
  'experience.detail.booking.pickDateHint': 'Choisissez une date ci-dessus pour continuer.',
  'experience.detail.booking.total': 'Total',
  'experience.detail.booking.displayTotal': 'Environ {tutar}',
  'experience.detail.booking.chargedIn':
    'Vous êtes débité en {paraBirimi}. Si votre carte utilise une autre devise, votre banque applique son propre taux.',
  'experience.detail.booking.quoteFailed':
    'Impossible de calculer le prix de cette sélection. La séance n’a peut-être plus assez de places, ou elle a été fermée.',
  'experience.detail.cityLink': 'Toutes les expériences à {sehir}',
  'experience.detail.back': 'Retour à Explorer',

  'checkout.title': 'Confirmer et payer',
  'checkout.back': 'Retour à l’expérience',
  'checkout.payment.heading': 'Moyen de paiement',
  'checkout.payment.bank': 'Virement bancaire en ligne',
  'checkout.payment.bankSelect': 'Choisissez votre banque',
  'checkout.payment.card': 'Carte de crédit ou de débit',
  'checkout.payment.google': 'Google Pay',
  'checkout.payment.apple': 'Apple Pay',
  'checkout.payment.terms':
    'En confirmant et en payant, vous acceptez les conditions d’utilisation, la politique d’annulation et la politique de confidentialité. Le vrai paiement n’est pas encore branché — cette étape montre l’interface.',
  'checkout.payment.submit': 'Confirmer et payer',
  'checkout.payment.submitting': 'Traitement…',
  'checkout.payment.demoNote':
    'Démo  votre carte n’est pas débitée et aucune réservation n’est créée.',
  'checkout.payment.unavailable':
    'Les paiements ne sont pas encore disponibles  ce bouton sera activé dès que notre prestataire de paiement sera connecté. Votre carte ne sera pas débitée et aucune réservation ne sera créée.',
  'checkout.success.title': 'C’est fait — confirmation de démo',
  'checkout.success.body':
    'Quand le prestataire de paiement et l’API de réservation seront en place, un vrai billet apparaîtra ici. Pour l’instant, le parcours est terminé.',
  'checkout.success.back': 'Aller à mes expériences',
  'checkout.summary.nonRefundable': 'Cette réservation n’est pas remboursable.',
  'checkout.summary.date': 'Date',
  'checkout.summary.guests': 'Voyageurs',
  'checkout.summary.change': 'Modifier',
  'checkout.summary.priceDetails': 'Détail du prix',
  'checkout.summary.total': 'Total {paraBirimi}',

  'howItWorks.lede': 'Trois étapes, et c’est tout.',
  'howItWorks.back': 'Retour',
  'howItWorks.step.discover.title': 'Explorez',
  'howItWorks.step.discover.body':
    'Parcourez les expériences locales de votre ville. Petits groupes, vrais hôtes.',
  'howItWorks.step.book.title': 'Réservez',
  'howItWorks.step.book.body':
    'Choisissez une date et le nombre de personnes, voyez le prix. La réservation arrive bientôt.',
  'howItWorks.step.join.title': 'Venez',
  'howItWorks.step.join.body': 'Votre hôte vous accueille et l’expérience commence.',
  'howItWorks.backToExplore': 'Retour à l’exploration',

  'myExperiences.lede': 'Vos billets sont ici.',
  'myExperiences.upcoming': 'À venir · {sayi}',
  'myExperiences.past': 'Passées · {sayi}',
  'myExperiences.downloadPdf': 'Télécharger le PDF',
  'myExperiences.wallet': 'Ajouter à Apple Wallet',
  'myExperiences.wallet.soon': 'Bientôt disponible',
  'myExperiences.rate': 'Donner une note',
  'myExperiences.rate.soon': 'Disponible une fois l’expérience terminée',
  'myExperiences.empty.title': 'Pas encore de billets',
  'myExperiences.empty.body': 'Quand vous réserverez une expérience, votre billet apparaîtra ici.',
  'myExperiences.empty.cta': 'Explorer les expériences',

  'ticket.demoBadge': 'Billet de démo',
  'ticket.demoNote':
    'Billet d’exemple  le QR n’est pas encore signé et ne peut pas être contrôlé à l’entrée.',
  'ticket.view.title': 'Votre billet',
  'ticket.view.lede': 'Présentez le QR à l’entrée ou ajoutez-le à votre portefeuille.',
  'ticket.view.back': 'Retour à mes expériences',
  'ticket.wallet.view': 'Voir le billet',
  'ticket.wallet.apple': 'Ajouter à Apple Wallet',
  'ticket.wallet.google': 'Ajouter à Google Wallet',
  'ticket.wallet.adding': 'Préparation…',
  'ticket.wallet.appleNotConfigured':
    'Apple Wallet n’est pas configuré dans cet environnement. Ajoutez EXPYRA_APPLE_PASS_* (voir docs/WALLET.md)  vous pouvez toujours consulter le billet ici.',
  'ticket.wallet.googleNotConfigured':
    'Google Wallet n’est pas configuré dans cet environnement. Ajoutez EXPYRA_GOOGLE_WALLET_* (voir docs/WALLET.md)  vous pouvez toujours consulter le billet ici.',
  'ticket.guests': 'Voyageurs',
  'ticket.amount': 'Total',
  'ticket.status': 'Statut',
  'ticket.status.valid': 'Valide',
  'ticket.status.used': 'Utilisé',
  'ticket.timeZoneNote': 'heure de {sehir}',

  'ticket.pdf.kicker': 'Billet d’expérience',
  'ticket.pdf.dateTime': 'Date et heure',
  'ticket.pdf.docTitle': 'Billet Expyra — {baslik}',
  'ticket.pdf.code': 'Code du billet {kod}',
  'ticket.pdf.notice.valid': 'L’hôte scanne ce code à l’entrée. Usage unique.',
  'ticket.pdf.notice.used': 'Ce billet a été utilisé à l’entrée.',

  'ticket.error.signedOut': 'Connectez-vous pour voir ce billet.',
  'ticket.error.notFound': 'Aucun billet avec ce code.',

  'auth.meta.title': 'Connexion',
  'auth.title': 'Se connecter ou créer un compte',
  'auth.back': 'Retour',

  'auth.email.lede':
    'Saisissez votre adresse et nous vous enverrons un code à usage unique. Pas de mot de passe.',
  'auth.email.label': 'Votre adresse e-mail',
  'auth.email.help': 'Nous enverrons le code à cette adresse.',
  'auth.email.placeholder': 'vous@example.com',
  'auth.email.error.invalid': 'Cette adresse ne semble pas correcte. Exemple  vous@example.com',

  'auth.code.lede': 'Nous avons envoyé un code à 6 chiffres à ',
  'auth.code.label': 'Le code reçu par e-mail',
  'auth.code.hint':
    'Le code est valable 10 minutes. Si vous ne trouvez pas l’e-mail, vérifiez vos spams.',
  'auth.code.resend': 'Envoyer un nouveau code',
  'auth.code.changeEmail': 'Utiliser une autre adresse',

  'auth.common.continue': 'Continuer',
  'auth.common.working': 'Envoi…',

  'auth.otp.error.invalid': 'Ce code ne correspond pas. Vérifiez les 6 chiffres du dernier e-mail.',
  'auth.otp.error.locked':
    'Trop de tentatives. Nous avons désactivé ce code pour protéger le compte — demandez-en un nouveau.',
  'auth.otp.error.resendTooSoon': {
    one: 'Patientez encore {n} seconde avant de demander un nouveau code.',
    many: 'Patientez encore {n} de secondes avant de demander un nouveau code.',
    other: 'Patientez encore {n} secondes avant de demander un nouveau code.',
  },

  'auth.error.tooManyRequests': 'Trop de codes demandés. Réessayez un peu plus tard.',
  'auth.error.suspended': 'Ce compte est suspendu. destek@expyra.com',
  'auth.error.expiredChallenge':
    'Cette tentative de connexion a expiré. Saisissez à nouveau votre adresse.',

  'account.title': 'Votre compte',
  'account.lede': 'Modifiez ici votre nom et votre langue préférée.',

  'account.email.label': 'Votre adresse e-mail',
  'account.email.note': 'L’adresse e-mail ne peut pas encore être modifiée.',

  // --- Wallpaper (ortak layout — HER sayfada görünür) ------------------------
  'wallpaper.istanbul.place': 'İstanbul',
  'wallpaper.istanbul.label': 'Poisson grillé dans la rue',
  'wallpaper.kitchen.place': 'Une cuisine familiale',
  'wallpaper.kitchen.label': 'En cuisine avec tantine',
  'wallpaper.cappadocia.place': 'Cappadoce',
  'wallpaper.cappadocia.label': 'Montgolfière',
  'wallpaper.pause': 'Mettre la vidéo d’arrière-plan en pause',
  'wallpaper.play': 'Lire la vidéo d’arrière-plan',
  'account.avatar.label': 'Photo de profil',
  'account.avatar.help': 'JPEG, PNG ou WebP · au moins 800×600 pixels · 10 Mo maximum',
  'account.avatar.add': 'Ajouter une photo',
  'account.avatar.change': 'Modifier',
  'account.avatar.remove': 'Supprimer',
  'account.avatar.uploading': 'Envoi…',
  'account.name.label': 'Votre nom affiché',
  'account.name.help': 'C’est le nom que les autres voient. Vous pouvez le laisser vide.',
  'account.name.placeholder': 'ex. Camille M.',

  'account.language.label': 'Votre langue préférée',
  'account.language.help':
    'La langue dans laquelle nous vous écrivons. La langue de l’interface vient de la barre d’adresse, pas de ce choix.',
  'account.language.none': 'Non défini',

  'account.save': 'Enregistrer',
  'account.saving': 'Enregistrement…',
  'account.saved': 'Modifications enregistrées.',

  'account.error.name': {
    one: 'Le nom affiché peut compter {n} caractère au maximum.',
    many: 'Le nom affiché peut compter {n} de caractères au maximum.',
    other: 'Le nom affiché peut compter {n} caractères au maximum.',
  },
  'account.error.language':
    'Nous ne prenons pas encore cette langue en charge. Choisissez-en une autre dans la liste.',
  'account.error.signedOut': 'Votre session a expiré. Reconnectez-vous.',

  'account.menu.trigger': 'Menu du compte  {ad}',
  'account.menu.title': 'Compte',
  'account.menu.signedInAs': 'Connecté en tant que {eposta}',
  'account.menu.account': 'Votre compte',
  'account.menu.signOut': 'Se déconnecter',
  'account.menu.fallbackLabel': 'Votre compte',

  'account.signIn': 'Se connecter',
  'account.loading': 'Chargement de votre session',

  'host.meta.title': 'Devenir hôte',

  'host.invite.title': 'Publiez votre propre expérience',
  'host.invite.lede':
    'Faites découvrir ce que vous connaissez, emmenez les gens là où vous passez déjà. Vous fixez le prix, la taille du groupe, le calendrier et la politique d’annulation — nous n’intervenons pas dans ce que vous proposez.',
  'host.invite.noApproval':
    'Pas de validation, pas de formulaire de candidature. Dès que vous choisissez de devenir hôte, votre espace s’ouvre.',
  'host.invite.cta': 'Devenir hôte',
  'host.invite.pending': 'Ouverture…',

  'host.signedOut.note':
    'Vous devez vous connecter pour devenir hôte. Nous ne demandons pas de mot de passe — nous envoyons un code à usage unique à votre adresse.',
  'host.signedOut.cta': 'Se connecter pour devenir hôte',

  'host.panel.title': 'Espace hôte',
  'host.panel.lede':
    'C’est ici que vous gérez vos expériences. Vous fixez le prix, le groupe, le calendrier et la politique d’annulation — nous n’intervenons pas dans ce que vous proposez.',
  'host.panel.status': 'Votre compte est ouvert en tant qu’hôte.',
  'host.panel.new': 'Nouvelle expérience',

  'host.listings.heading': 'Mes annonces · {sayi}',
  'host.listings.headingPage': 'Mes annonces · {sayi} sur cette page',
  'host.listings.pager.label': 'Pages d’annonces',
  'host.listings.pager.next': 'Plus d’annonces',
  'host.listings.pager.first': 'Retour à la première page',
  'host.listings.edit': 'Modifier',
  'host.listings.view': 'Voir l’annonce',
  'host.listings.status.draft': 'Brouillon',
  'host.listings.status.published': 'Publiée',
  'host.listings.status.archived': 'Archivée',

  'host.listings.ready': 'Prête à être publiée',
  'host.listings.missing': {
    one: '{n} champ manquant',
    many: '{n} de champs manquants',
    other: '{n} champs manquants',
  },

  'host.listings.empty.heading': 'Mes annonces',
  'host.listings.empty.title': 'Vous n’avez pas encore d’annonce',
  'host.listings.empty.body':
    'Ouvrez votre premier brouillon. Vous pouvez y travailler aussi longtemps que vous voulez avant de publier — personne d’autre ne voit un brouillon.',
  'host.listings.empty.cta': 'Rédiger votre première expérience',

  'host.listings.errorHeading': 'Mes annonces',
  'host.listings.error':
    'Impossible de charger vos annonces pour le moment. Rien n’a été supprimé — rechargez la page dans un instant.',

  'host.steps.heading': 'Par où commencer ',
  'host.steps.describe.title': 'Décrivez votre expérience',
  'host.steps.describe.body':
    'Titre, description, durée et taille du groupe. Rédigez-la dans autant de langues que vous voulez — les voyageurs la lisent dans la leur.',
  'host.steps.media.title': 'Ajoutez vos photos',
  'host.steps.media.body':
    'Au moins une photo de couverture. Montrez à quoi ressemble vraiment l’expérience  les photos de banque d’images n’ont pas leur place ici.',
  'host.steps.pricing.title': 'Fixez votre calendrier et votre prix',
  'host.steps.pricing.body':
    'Quels jours, combien de personnes, à quel prix. Vous indiquez le prix dans votre propre devise, et c’est dans cette devise que vous êtes payé.',
  'host.steps.publish.title': 'Publiez',
  'host.steps.publish.body':
    'Rien à attendre. Dès que vous publiez, votre annonce apparaît dans les recherches.',

  'host.contact.title': 'Écrivez-nous si vous êtes bloqué',
  'host.contact.body':
    'Nous accompagnons les premiers hôtes un par un. Si quelque chose vous bloque pendant que vous préparez votre annonce, ou si vous hésitez sur une décision, écrivez-nous — nous trouverons une solution ensemble.',
  'host.contact.cta': 'Nous écrire',
  'host.contact.howItWorks': 'Comment ça marche',

  'host.error.blocked': 'Ce compte est suspendu, il ne peut donc pas devenir hôte. destek@expyra.com',

  // --- Deneyim sihirbazı -----------------------------------------------------

  'host.experience.new.meta.title': 'Nouvelle expérience',
  'host.experience.new.title': 'Commencer une nouvelle expérience',
  'host.experience.new.lede':
    'Une seule question d’abord  dans quelle langue allez-vous rédiger l’annonce  Tout le reste se remplit dans le brouillon, dans l’ordre qui vous convient.',
  'host.experience.new.language.label': 'Dans quelle langue allez-vous écrire ',
  'host.experience.new.language.help':
    'Ce choix est définitif  l’adresse de votre annonce en découle, et les voyageurs voient ce texte quand aucune autre langue n’est rédigée. Vous pourrez ajouter d’autres langues ensuite.',
  'host.experience.new.submit': 'Ouvrir le brouillon',
  'host.experience.new.pending': 'Ouverture…',

  'host.experience.new.next.heading': 'Et ensuite ',
  'host.experience.new.next.text': 'Titre et description — dans autant de langues que vous voulez.',
  'host.experience.new.next.basics': 'La durée et le nombre de personnes que vous accueillez.',
  'host.experience.new.next.place': 'La ville, la catégorie et les langues que vous parlez le jour J.',
  'host.experience.new.next.publish': 'Publiez quand vous êtes prêt. Rien à attendre.',

  'host.experience.edit.meta.title': 'Modifier l’expérience',
  'host.experience.edit.lede':
    'Chaque section s’enregistre séparément. Arrêtez-vous où vous voulez — votre brouillon vous attend.',
  'host.experience.untitled': 'Brouillon sans titre',
  'host.experience.back': '← Retour à l’espace hôte',

  'host.experience.save': 'Enregistrer',
  'host.experience.saving': 'Enregistrement…',
  'host.experience.saved': 'Enregistré.',

  'host.experience.section.text': 'Titre et description',
  'host.experience.section.textHelp':
    'C’est ce que les voyageurs lisent avant de se décider. Dites ce que vous ferez, où vous vous retrouvez et ce qui vous lie à cette expérience.',
  'host.experience.section.basics': 'Durée et capacité',
  'host.experience.section.basicsHelp':
    'Combien de temps dure une séance et combien de personnes vous accueillez à la fois. Le calendrier et le prix viennent plus tard.',
  'host.experience.section.place': 'Ville',
  'host.experience.section.placeHelp':
    'Le lieu de l’expérience. Le fuseau horaire en découle — les horaires des séances y sont affichés.',
  'host.experience.section.category': 'Catégorie',
  'host.experience.section.categoryHelp':
    'Les voyageurs filtrent par catégorie dans la recherche. Choisissez la plus proche  une seule possible.',
  'host.experience.section.languages': 'Langues parlées et mots-clés',
  'host.experience.section.languagesHelp':
    'Dans quelles langues animez-vous l’expérience  C’est indépendant de la langue de rédaction de l’annonce.',
  'host.experience.section.status': 'Publication',
  'host.experience.section.statusHelp':
    'Ce qu’il faut pour publier est listé ci-dessous. Aucune validation — s’il ne manque rien, votre annonce apparaît aussitôt dans les recherches.',

  'host.experience.translations.tabsLabel': 'Langues du texte de l’annonce',
  'host.experience.translations.required': 'obligatoire',
  'host.experience.translations.optional': 'facultatif',
  'host.experience.translations.add.label': 'Écrire dans une autre langue',
  'host.experience.translations.add.submit': 'Ouvrir',
  'host.experience.translations.machine':
    'Ce texte a été traduit automatiquement. Modifiez-le et enregistrez-le  il devient alors votre propre texte.',

  'host.experience.title.label': 'Titre',
  'host.experience.title.placeholder': 'Balade street food à Kadıköy',
  'host.experience.title.help':
    'Court et concret. C’est la première chose que les voyageurs voient dans la liste, et l’adresse de votre annonce en découle.',
  'host.experience.description.label': 'Description',
  'host.experience.description.placeholder':
    'Où vous vous retrouvez, ce que vous faites, ce qu’on mange, comment s’habiller…',
  'host.experience.description.help':
    'Pas obligatoire pour publier, mais c’est là que les voyageurs se décident. Racontez la journée dans l’ordre.',

  'host.experience.duration.label': 'Durée (heures)',
  'host.experience.duration.help':
    'Durée totale d’une séance. Par exemple 1,5 heure, ou 3. Sept jours (168 heures) au maximum.',
  'host.experience.capacity.label': 'Capacité (personnes)',
  'host.experience.capacity.help':
    'Nombre maximal de personnes par séance. Il en faut au moins une pour publier.',

  'host.experience.city.label': 'Dans quelle ville ',
  'host.experience.city.placeholder': 'Rechercher une ville',
  'host.experience.place.saved': 'Ville choisie · fuseau horaire {saat}',
  'host.experience.place.empty': 'Aucune ville choisie pour l’instant.',
  'host.experience.place.locked':
    'Une fois l’annonce publiée, sa ville est figée  les horaires des séances et les réservations en dépendent. Pour une autre ville, ouvrez une nouvelle annonce.',

  'host.experience.category.label': 'Catégorie',
  'host.experience.category.none': 'Non choisie',
  'host.experience.category.help': 'Le thème principal de l’expérience.',

  'host.experience.spoken.label': 'Langues que vous parlez pendant l’expérience',
  'host.experience.spoken.help':
    'Indépendant de la langue de rédaction  cochez les langues dans lesquelles vous animez vraiment l’expérience. Dix au maximum.',
  'host.experience.spoken.search.label': 'Rechercher une langue',
  'host.experience.spoken.search.placeholder': 'Allemand, Deutsch, de…',
  'host.experience.spoken.search.results': {
    one: '{n} langue affichée',
    many: '{n} de langues affichées',
    other: '{n} langues affichées',
  },
  'host.experience.spoken.search.none':
    'Aucune langue correspondante. Les langues cochées sont conservées.',
  'host.experience.tags.label': 'Mots-clés',
  'host.experience.tags.placeholder': 'street food, balade, petit groupe',
  'host.experience.tags.help':
    'Séparez-les par des virgules. Dix au maximum. Ils aident votre annonce à apparaître dans les recherches.',

  'host.experience.missing.heading': 'Ce qu’il faut pour publier',
  'host.experience.ready': 'Tout est prêt. Vous pouvez publier cette annonce.',
  'host.experience.missing.translation': 'un titre dans la langue de rédaction de l’annonce',
  'host.experience.missing.city': 'une ville',
  'host.experience.missing.category': 'une catégorie',
  'host.experience.missing.capacity': 'une capacité',
  'host.experience.missing.duration': 'une durée',
  'host.experience.missing.cover': 'une photo de couverture',
  'host.experience.missing.price': 'un prix',
  'host.experience.missing.unknown': 'un champ non rempli',

  'host.experience.publish': 'Publier',
  'host.experience.republish': 'Republier',
  'host.experience.publishing': 'Publication…',
  'host.experience.published': 'Votre annonce est en ligne.',
  'host.experience.unpublish': 'Retirer de la publication',
  'host.experience.unpublishing': 'Retrait…',
  'host.experience.unpublished': 'Annonce repassée en brouillon — masquée des recherches.',
  'host.experience.archive': 'Archiver',
  'host.experience.archiving': 'Archivage…',
  'host.experience.archived': 'Annonce archivée.',

  // --- Medya (Blok 6) ----------------------------------------------------------
  'host.media.heading': 'Photos',
  'host.media.hint':
    'JPEG, PNG ou WebP · au moins 800×600 pixels · 10 Mo maximum · 12 photos au plus',
  'host.media.add': 'Ajouter des photos',
  'host.media.drop': 'Déposez les fichiers ici',
  'host.media.uploading': 'Envoi…',
  'host.media.empty': 'Pas encore de photos. La première que vous envoyez devient la couverture.',
  'host.media.cover': 'Couverture',
  'host.media.makeCover': 'Définir comme couverture',
  'host.media.delete': 'Supprimer',
  'host.media.moveEarlier': 'Déplacer vers l’avant',
  'host.media.moveLater': 'Déplacer vers l’arrière',
  'host.media.position': 'Photo {n}',
  'host.media.error.rejected': 'Cette photo n’a pas été acceptée.',
  'host.media.error.unsupported': 'Seuls les formats JPEG, PNG et WebP sont acceptés.',
  'host.media.error.notUploaded': 'L’envoi n’a pas abouti. Réessayez.',
  'host.media.error.notAnImage': 'Ce fichier n’est pas une image.',
  'host.media.error.mismatch': 'Le contenu du fichier ne correspond pas à son extension.',
  'host.media.error.tooSmall': 'Les photos doivent faire au moins 800×600 pixels.',
  'host.media.error.tooLarge': 'Les fichiers ne doivent pas dépasser 10 Mo.',
  'host.media.error.limit': 'Une annonce peut contenir 12 photos au maximum.',

  'host.experience.status.publishedNote':
    'Votre annonce apparaît dans les recherches. Retirez-la de la publication pour la repasser en brouillon — modifiez les photos, puis republiez. L’archivage la masque aussi, sans la supprimer.',
  'host.experience.status.privateNote':
    'Tant que vous ne la publiez pas, personne d’autre que vous ne voit cette annonce.',

  'host.experience.error.notFound':
    'Impossible de trouver cette annonce. Rouvrez-la depuis votre espace hôte.',
  'host.experience.error.invalid':
    'Cette section n’a pas pu être enregistrée. Vérifiez les champs et réessayez.',
  'host.experience.error.language':
    'Les annonces ne peuvent pas être rédigées dans cette langue. Choisissez-en une autre dans la liste.',
  'host.experience.error.title':
    'Le titre est obligatoire et ne doit pas dépasser 120 caractères.',
  'host.experience.error.description': 'La description ne doit pas dépasser 4000 caractères.',
  'host.experience.error.duration':
    'Indiquez la durée en heures  au moins 0,5, au plus 168.',
  'host.experience.error.capacity':
    'Indiquez la capacité en personnes  au moins 1, au plus 500.',
  'host.experience.error.city':
    'Choisissez la ville dans la liste — taper son nom ne suffit pas.',
  'host.experience.error.category': 'Choisissez une catégorie dans la liste.',
  'host.experience.section.itinerary': 'Au programme',
  'host.experience.section.itineraryHelp':
    'Les étapes de l’expérience, dans l’ordre. Chaque étape a un titre et, si vous voulez, une ou deux phrases. La liste est rédigée dans la langue de l’annonce  les onglets de langue ci-dessus s’appliquent ici aussi.',
  'host.experience.section.meeting': 'Point de rendez-vous',
  'host.experience.section.meetingHelp':
    'Où les voyageurs vous trouveront-ils  L’adresse ne dépend pas de la langue, les indications sont dans la langue sélectionnée. Ajoutez des coordonnées pour qu’ils puissent l’ouvrir sur une carte.',
  'host.experience.section.details': 'Bon à savoir',
  'host.experience.section.detailsHelp':
    'Âge minimum, niveau d’activité et ce que les voyageurs doivent savoir à l’avance. Les champs laissés vides ne sont pas affichés.',
  'host.experience.textLanguage.note':
    'Les textes de cette section sont en {dil}. Utilisez les onglets de la section 01 pour changer de langue.',

  'host.experience.itinerary.stepTitle.label': 'Étape {n}',
  'host.experience.itinerary.stepTitle.placeholder': 'Rendez-vous à l’Hippodrome',
  'host.experience.itinerary.stepBody.placeholder':
    'La piste de courses de chars de Byzance  l’Obélisque et la Colonne serpentine s’y dressent.',
  'host.experience.itinerary.add': 'Ajouter une étape',
  'host.experience.itinerary.remove': 'Supprimer l’étape',
  'host.experience.itinerary.help':
    'Les lignes vides ne sont pas enregistrées. 20 étapes au maximum.',

  'host.experience.meeting.address.label': 'Adresse',
  'host.experience.meeting.address.placeholder': 'Devant la tour de Galata, Bereketzade, Beyoğlu',
  'host.experience.meeting.latitude.label': 'Latitude',
  'host.experience.meeting.longitude.label': 'Longitude',
  'host.experience.meeting.coords.help': 'Les deux ou aucune. En décimal  41.0256 / 28.9744.',
  'host.experience.meeting.instructions.label': 'Indications',
  'host.experience.meeting.instructions.placeholder':
    'Porte nord de la tour, cherchez le guide au parapluie jaune.',

  'host.experience.details.minimumAge.label': 'Âge minimum',
  'host.experience.details.minimumAge.help': 'Vide = pas de limite. 1–99.',
  'host.experience.details.activityLevel.label': 'Niveau d’activité',
  'host.experience.details.activityLevel.none': 'Non précisé',
  'host.experience.details.whatToBring.label': 'À apporter',
  'host.experience.details.whatToBring.placeholder':
    'De l’eau, des chaussures confortables, un foulard (pour les visites de mosquées)',
  'host.experience.details.notIncluded.label': 'Non inclus',
  'host.experience.details.notIncluded.placeholder': 'Billets de musée, déjeuner',
  'host.experience.details.accessibility.label': 'Accessibilité',
  'host.experience.details.accessibility.placeholder':
    'Le parcours comporte des escaliers  il n’est pas adapté aux fauteuils roulants.',

  'host.experience.error.translationMissing':
    'Rédigez d’abord le titre dans cette langue (section 01), puis remplissez ces champs.',
  'host.experience.error.minimumAge':
    'L’âge minimum doit être un nombre entier entre 1 et 99.',
  'host.experience.error.coordinates':
    'La latitude et la longitude vont ensemble  latitude ±90, longitude ±180.',
  'host.experience.error.itinerary': 'Chaque étape doit avoir un titre  20 étapes au maximum.',

  'experience.activity.light': 'Facile',
  'experience.activity.moderate': 'Modéré',
  'experience.activity.strenuous': 'Soutenu',

  'host.profile.heading': 'Présentez-vous',
  'host.profile.lede':
    'Affiché sous votre nom sur la page de l’annonce. Qui vous êtes et pourquoi c’est à vous de raconter cette histoire — deux phrases suffisent.',
  'host.profile.headline.label': 'Accroche',
  'host.profile.headline.placeholder': 'Guide local et historien à Istanbul',
  'host.profile.bio.label': 'À propos de moi',
  'host.profile.bio.placeholder': 'Depuis dix ans, je fais découvrir les ruelles de la ville…',
  'host.profile.language.label': 'Langue du texte',
  'host.profile.error.invalid':
    'Accroche  80 caractères au maximum  présentation  2000 au maximum.',
  'host.experience.error.spokenLanguages': 'Vous pouvez cocher dix langues au maximum.',
  'host.experience.error.tags':
    'Les mots-clés ne peuvent pas être vides  dix au maximum, et chacun court.',
  'host.experience.error.publishedConflict':
    'Cette modification n’est pas possible sur une annonce en ligne. Archivez-la d’abord, puis modifiez-la.',
  'host.experience.error.publishBlocked': 'Non publiée. Il manque encore  {eksikler}.',
  'host.experience.error.publishBlockedUnknown':
    'Non publiée  l’annonce n’est pas encore complète. Vérifiez la liste ci-dessus.',

  // --- Kategoriler -------------------------------------------------------------
  'category.food-drink': 'Gastronomie et boissons',
  'category.art-culture': 'Art et culture',
  'category.history-heritage': 'Histoire et patrimoine',
  'category.nature-outdoors': 'Nature et plein air',
  'category.water-sea': 'Eau et mer',
  'category.sports-adventure': 'Sport et aventure',
  'category.crafts-workshops': 'Artisanat et ateliers',
  'category.music-nightlife': 'Musique et vie nocturne',
  'category.wellness': 'Bien-être',
  'category.photography': 'Photographie',
  'category.tours-walks': 'Visites et balades',
  'category.local-life': 'Vie locale',
  // --- Fiyat (PLAN Blok 7) ---
  'host.experience.section.pricing': 'Prix',
  'host.experience.section.pricingHelp':
    'Fixez votre prix par personne dans votre propre devise. Vous êtes toujours payé dans cette devise  si un voyageur en choisit une autre, seul l’affichage est converti.',

  'host.pricing.currency.label': 'Devise de versement',
  'host.pricing.currency.help':
    'La devise dans laquelle l’argent vous parvient. Elle ne peut plus être modifiée une fois l’annonce publiée — archivez-la d’abord.',
  'host.pricing.currency.locked': 'La devise est verrouillée car l’annonce est en ligne.',
  'host.pricing.currency.placeholder': 'Choisir',

  'host.pricing.adult.label': 'Adulte (par personne)',
  'host.pricing.adult.help':
    'Obligatoire. C’est le prix « à partir de  affiché sur les cartes et dans la recherche.',
  'host.pricing.child.label': 'Enfant (par personne)',
  'host.pricing.child.help':
    'Laissez vide si vous ne proposez pas de tarif enfant. Indiquez 0 si c’est gratuit.',
  'host.pricing.infant.label': 'Bébé (par personne)',
  'host.pricing.infant.help':
    'Laissez vide si vous ne proposez pas de tarif bébé. Indiquez 0 si c’est gratuit.',

  'host.pricing.saved': 'Prix enregistré.',
  'host.pricing.empty': 'Pas encore de prix. Une annonce sans prix ne peut pas être publiée.',

  'host.pricing.error.currency': 'Choisissez une devise valide.',
  'host.pricing.error.currencyLocked':
    'La devise d’une annonce en ligne ne peut pas être modifiée. Archivez-la d’abord.',
  'host.pricing.error.adult': 'Le prix adulte est obligatoire et doit être un montant valide.',
  'host.pricing.error.child': 'Le prix enfant doit être un montant valide.',
  'host.pricing.error.infant': 'Le prix bébé doit être un montant valide.',
  'host.pricing.error.range':
    'Ce montant est hors de la plage acceptée par le prestataire de paiement — il est soit trop petit, soit trop grand.',

  // --- Takvim (PLAN Blok 7) ---
  'host.experience.section.schedule': 'Calendrier',
  'host.experience.section.scheduleHelp':
    'Quels jours et à quelles heures l’animez-vous  Les horaires sont dans le fuseau horaire de la ville — l’heure que vous indiquez reste la même lors des changements d’heure.',

  'host.schedule.blocked':
    'Un calendrier nécessite d’abord une ville, une durée et une capacité. Terminez les sections ci-dessus.',
  'host.schedule.timeZone': 'Fuseau horaire  {bolge}',
  'host.schedule.generatedThrough': 'Votre calendrier est prêt jusqu’au {tarih}.',

  // Haftalık kural
  'host.schedule.rule.heading': 'Règle hebdomadaire',
  'host.schedule.rule.days': 'Jours',
  'host.schedule.rule.daysHelp':
    'Vous pouvez en choisir plusieurs  chaque jour devient une règle à part.',
  'host.schedule.rule.time': 'Heure de début',
  'host.schedule.rule.timeHelp': 'À l’heure locale de la ville.',
  'host.schedule.rule.start': 'À partir du',
  'host.schedule.rule.startHelp': 'Laissez vide pour commencer aujourd’hui.',
  'host.schedule.rule.submit': 'Ajouter la règle',
  'host.schedule.rule.pending': 'Ajout…',
  'host.schedule.rule.stop': 'Supprimer',
  'host.schedule.rule.stopping': 'Suppression…',
  'host.schedule.rule.empty': 'Pas encore de règle hebdomadaire.',
  'host.schedule.rule.stopped': 'arrêtée',

  // Kapalı günler
  'host.schedule.blackout.heading': 'Jours de fermeture',
  'host.schedule.blackout.start': 'Du',
  'host.schedule.blackout.end': 'Au',
  'host.schedule.blackout.endHelp':
    'Laissez vide pour fermer un seul jour. Le dernier jour est inclus.',
  'host.schedule.blackout.submit': 'Fermer',
  'host.schedule.blackout.pending': 'Fermeture…',
  'host.schedule.blackout.remove': 'Supprimer',
  'host.schedule.blackout.removing': 'Suppression…',
  'host.schedule.blackout.empty': 'Aucun jour de fermeture.',

  // Seanslar
  'host.schedule.slots.heading': 'Prochaines séances',
  'host.schedule.slots.empty': 'Aucune séance sur cette période.',
  'host.schedule.slots.remaining': {
    one: 'Plus que {n} place',
    many: 'Plus que {n} de places',
    other: 'Plus que {n} places',
  },
  'host.schedule.slots.closed': 'Fermée',
  'host.schedule.slots.closedByBlackout': 'Jour de fermeture',
  'host.schedule.slots.close': 'Fermer',
  'host.schedule.slots.closing': 'Fermeture…',
  'host.schedule.slots.open': 'Ouvrir',
  'host.schedule.slots.opening': 'Ouverture…',
  'host.schedule.slots.more': 'et {n} de plus',

  // Günler
  'host.schedule.day.monday': 'Lundi',
  'host.schedule.day.tuesday': 'Mardi',
  'host.schedule.day.wednesday': 'Mercredi',
  'host.schedule.day.thursday': 'Jeudi',
  'host.schedule.day.friday': 'Vendredi',
  'host.schedule.day.saturday': 'Samedi',
  'host.schedule.day.sunday': 'Dimanche',

  // Onaylar
  'host.schedule.ruleSaved': 'Règle ajoutée et séances créées.',
  'host.schedule.ruleStopped': 'Règle arrêtée.',
  'host.schedule.slotOpened': 'Séance ouverte.',
  'host.schedule.slotClosed': 'Séance fermée.',
  'host.schedule.blackoutSaved': 'Jours fermés.',
  'host.schedule.blackoutRemoved': 'Jours de fermeture supprimés.',

  // Hatalar — her biri sunucunun makine-okur koduna karşılık
  'host.schedule.error.noDay': 'Choisissez au moins un jour.',
  'host.schedule.error.time': 'Saisissez l’heure au format HH:MM.',
  'host.schedule.error.date': 'Saisissez une date valide.',
  'host.schedule.error.range': 'La date de fin ne peut pas précéder la date de début.',
  'host.schedule.error.notSchedulable':
    'Un calendrier nécessite d’abord une ville, une durée et une capacité.',
  'host.schedule.error.duplicateRule': 'Il existe déjà une règle pour ce jour et cette heure.',
  'host.schedule.error.ruleLimit':
    'Cette expérience ne peut pas recevoir plus de règles hebdomadaires.',
  'host.schedule.error.dstGap':
    'Cette heure n’existe pas ce jour-là à cause du changement d’heure. Essayez une heure plus tard.',
  'host.schedule.error.past': 'Une séance passée ne peut pas être modifiée.',
  'host.schedule.error.slotExists': 'Il existe déjà une séance à cette heure.',
  'host.schedule.error.blackedOut':
    'Cette date est marquée comme jour de fermeture. Supprimez d’abord la période.',
  'host.schedule.error.generated':
    'Une séance créée par une règle hebdomadaire ne peut pas être supprimée  vous pouvez la fermer.',
  'host.schedule.error.hasBookings': 'Une séance avec des réservations ne peut pas être modifiée.',
  'host.schedule.error.blackoutLimit': 'Impossible d’ajouter d’autres jours de fermeture.',
  'host.schedule.error.horizon': 'Le calendrier ne peut pas être ouvert aussi loin à l’avance.',
  'host.schedule.error.generic': 'Cela n’a pas fonctionné pour le moment.',
} as const satisfies Dictionary<'fr'>

/**
 * Metnin içi de kaynakla karşılaştırılıyor: bir yer tutucu düşerse ya da adı
 * değişirse derleme, hangi anahtarda olduğunu yazarak kırılır.
 * `export` bilinçli — kullanılmayan tip lint'te ölü kod sayılır.
 */
export type FrPlaceholders = Assert<PlaceholdersMatchSource<typeof fr>>
