/**
 * Oturum görünürlüğü ve hesap sayfasının tüm metinleri.
 *
 * `messages.ts` ile AYNI kalıp, ayrı tablo: o dosya giriş akışının metinlerini
 * taşıyor ve dokunulmadı. Faz 8.1'de ikisi de `messages/tr.json`'a giderken
 * anahtar isimleri feature bazlı olduğu için birleştirme mekanik olacak
 * (docs/I18N.md §5, docs/PLAN.md Blok 3).
 *
 * `messages.ts`'teki iki kural burada da geçerli:
 *
 * 1. **Cümle birleştirme yok.** Değişken parça yer tutucuyla gelir (`{eposta}`).
 * 2. Kullanıcının kendi verisi dışında hiçbir şey metne gömülmez.
 */

const messages = {
  'account.title': 'Hesabım',
  'account.lede': 'Adını ve tercih ettiğin dili buradan güncelleyebilirsin.',

  'account.email.label': 'E-posta adresin',
  // Adres değiştirme step-up doğrulama ister (docs/PLAN.md Blok 1 kapsam dışı).
  // Alanı "düzenlenebilir gibi" göstermek yerine neden olmadığını yazıyoruz.
  'account.email.note': 'E-posta adresi şimdilik değiştirilemiyor.',

  'account.name.label': 'Görünen adın',
  'account.name.help': 'Diğer kullanıcılar seni bu adla görür. Boş bırakabilirsin.',
  'account.name.placeholder': 'Örn. Deniz K.',

  'account.language.label': 'Tercih ettiğin dil',
  'account.language.help':
    'Sana yazdığımız e-postaların dili. Arayüzün dili adres çubuğundaki dil segmentinden gelir, bu seçimden değil.',
  'account.language.none': 'Belirtilmedi',

  'account.save': 'Kaydet',
  'account.saving': 'Kaydediliyor…',
  'account.saved': 'Değişiklikler kaydedildi.',

  'account.error.name': 'Görünen ad en fazla {karakter} karakter olabilir.',
  'account.error.language': 'Bu dili şu an desteklemiyoruz. Listeden başka bir dil seç.',
  'account.error.signedOut': 'Oturumun sona ermiş. Tekrar giriş yap.',

  'account.menu.trigger': 'Hesap menüsü: {ad}',
  'account.menu.title': 'Hesap',
  'account.menu.signedInAs': '{eposta} olarak giriş yaptın',
  'account.menu.account': 'Hesabım',
  'account.menu.signOut': 'Çıkış yap',
  /** Profil okunamadığında tetikleyicide görünen ad — "Giriş yap" YAZMIYORUZ (bkz. site-header.tsx). */
  'account.menu.fallbackLabel': 'Hesabım',

  'account.signIn': 'Giriş yap',
  'account.loading': 'Oturum durumu yükleniyor',
} as const

export type AccountMessageKey = keyof typeof messages

/**
 * `messages.ts`'teki `t` ile aynı gövde. Kopya bilinçli: o dosya bu blokta
 * değiştirilmedi ve iki tablo Faz 8.1'de zaten tek `t`'ye bağlanacak. Ortak bir
 * yardımcı çıkarmak, bir hafta sonra silinecek üçüncü bir dosya demekti.
 */
export function t(key: AccountMessageKey, values?: Readonly<Record<string, string>>): string {
  const template: string = messages[key]
  if (!values) return template

  // Karşılığı olmayan yer tutucu OLDUĞU GİBİ bırakılır: sessizce boş string
  // basmak eksik çeviriyi görünmez yapar.
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match)
}
