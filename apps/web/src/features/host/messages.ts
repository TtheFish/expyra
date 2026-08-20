/**
 * Host tarafının tüm metinleri.
 *
 * `account-messages.ts` ile AYNI kalıp, ayrı tablo. Faz 8.1'de (docs/PLAN.md
 * Blok 3) üçü de `messages/tr.json`'a gidecek; anahtarlar bugünden feature
 * bazlı yazıldığı için o taşıma mekanik olacak.
 *
 * İki kural burada da geçerli:
 *
 * 1. **Cümle birleştirme yok.** Değişken parça yer tutucuyla gelir (`{fiyat}`).
 * 2. Faz adı gibi İÇ terimler kullanıcıya gösterilmez. Bugünkü sayfada
 *    `title="Faz 2'de açılıyor"` yazıyordu — kullanıcı "Faz 2"nin ne olduğunu
 *    bilmiyor; metin ne olacağını söylüyor, ne zaman olacağını değil.
 */

const messages = {
  /** Sayfa başlığı oturumdan BAĞIMSIZ: `generateMetadata` oturum okumuyor (bkz. page.tsx). */
  'host.meta.title': 'Host ol',

  // --- Davet: oturum var ama rol yok, ya da oturum hiç yok -------------------
  'host.invite.title': 'Kendi deneyimini yayınla',
  'host.invite.lede':
    'Bildiğin bir şeyi anlat, gezdirdiğin bir yeri göster. Fiyatı, grup büyüklüğünü, takvimi ve iptal politikasını sen belirlersin — platform ürüne karışmaz.',
  /** VISION §9'daki bağlayıcı karar: onay süreci YOK. Vaadi yazıyoruz ki kullanıcı beklemesin. */
  'host.invite.noApproval':
    'Onay süreci yok, başvuru formu yok. Host ol dediğin an panelin açılır.',
  'host.invite.cta': 'Host ol',
  'host.invite.pending': 'Açılıyor…',

  // --- Oturum yok ------------------------------------------------------------
  'host.signedOut.note':
    'Host olmak için önce giriş yapman gerekiyor. Şifre istemiyoruz — adresine tek kullanımlık bir kod gönderiyoruz.',
  'host.signedOut.cta': 'Host olmak için giriş yap',

  // --- Panel: kullanıcı host -------------------------------------------------
  'host.panel.title': 'Host paneli',
  'host.panel.lede':
    'Deneyimlerini buradan yönetirsin. Fiyatı, grubu, takvimi ve iptal politikasını sen belirlersin — platform ürüne karışmaz.',
  'host.panel.status': 'Hesabın host olarak açık.',
  'host.panel.new': 'Yeni deneyim',

  /** Devre dışı düğmelerin `title`'ı. Neden kapalı olduğunu söylüyor, faz numarası vermiyor. */
  'host.soon': 'Deneyim yayınlama yakında açılıyor',

  // --- İlan listesi (Blok 5'e kadar örnek veri) ------------------------------
  'host.listings.heading': 'İlanlarım · {sayi}',
  /** Host OLMAYAN kullanıcıya "İlanlarım" yazmak yalan olurdu; aynı liste, dürüst başlık. */
  'host.listings.previewHeading': 'Panelin böyle görünecek',
  'host.listings.note':
    'Bu liste örnek veriyle gösteriliyor. Kendi ilanların, deneyim yayınlama açıldığında burada listelenecek.',
  'host.listings.previewNote':
    'Bu liste örnek veriyle gösteriliyor — host olduğunda kendi ilanların burada listelenir.',
  'host.listings.summary': '{fiyat} · en fazla {kisi} kişi',
  'host.listings.progress': '{tamam}/{toplam} adım tamam',
  'host.listings.edit': 'Düzenle',
  'host.listings.status.draft': 'Taslak',
  'host.listings.status.published': 'Yayında',

  // --- Kurulum adımları ------------------------------------------------------
  'host.steps.heading': 'Nasıl başlarım?',
  'host.steps.describe.title': 'Deneyimini anlat',
  'host.steps.describe.body':
    'Başlık, açıklama, süre ve kapasite. İstediğin kadar dilde yazabilirsin — gezgin kendi dilinde görür.',
  'host.steps.media.title': 'Görsellerini ekle',
  'host.steps.media.body':
    'En az bir kapak görseli. Deneyimin gerçekte nasıl göründüğünü göster; stok fotoğraf işe yaramıyor.',
  'host.steps.pricing.title': 'Takvimini ve fiyatını belirle',
  'host.steps.pricing.body':
    'Hangi günler, kaç kişi, ne kadar. Fiyatı kendi para biriminde yazarsın; tahsilat da onunla yapılır.',
  'host.steps.publish.title': 'Yayınla',
  'host.steps.publish.body': 'Onay beklemiyorsun. Yayınla dediğinde ilanın aramada çıkar.',

  // --- Alt kart --------------------------------------------------------------
  'host.contact.title': 'Deneyim yayınlama yakında açılıyor',
  'host.contact.body':
    'Şu an ilk hostları tek tek topluyoruz. Ne anlatmak istediğini biliyorsan bize yaz — açıldığında ilanını birlikte hazırlarız.',
  'host.contact.cta': 'Bize yaz',
  'host.contact.howItWorks': 'Nasıl çalışır?',

  // --- Hatalar ---------------------------------------------------------------
  /**
   * 403'ün tek kaynağı: hesap Active değil (Suspended/Banned). Onay kapısı yok
   * ama ban var (VISION §9) — kullanıcıya "reddedildin" değil, hesabının durumu
   * söyleniyor; ikisi farklı şeyler.
   */
  'host.error.blocked': 'Bu hesap askıya alındı, host olamazsın. destek@expyra.com',
} as const

export type HostMessageKey = keyof typeof messages

/**
 * `account-messages.ts`'teki `t` ile aynı gövde. Kopya bilinçli: üç tablo da
 * Blok 3'te tek `t`'ye bağlanacak, ortak yardımcı çıkarmak o gün silinecek
 * dördüncü bir dosya demekti.
 */
export function t(key: HostMessageKey, values?: Readonly<Record<string, string>>): string {
  const template: string = messages[key]
  if (!values) return template

  // Karşılığı olmayan yer tutucu OLDUĞU GİBİ bırakılır: sessizce boş string
  // basmak eksik çeviriyi görünmez yapar.
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match)
}
