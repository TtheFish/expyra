/**
 * Kimlik akışının tüm metinleri.
 *
 * Faz 8.1'de bu dosya `messages/tr.json`'a dönüşecek (docs/I18N.md §5). O gün
 * sökülecek borç TEK dosyada kalsın diye bileşenlerin içine hiçbir metin yazılmıyor.
 *
 * İki kural, çeviri geldiğinde onarılamayacak hataları bugünden kesiyor:
 *
 * 1. **Cümle birleştirme yok.** Değişken parça yer tutucuyla gelir (`{saniye}`).
 *    Almanca/Rusça/Arapça'da sözcük sırası farklı; parçaları yan yana eklemek
 *    çeviri anında geri dönüşü olmayan bir tasarım hatasına dönüşür.
 * 2. **Kalan deneme sayısı ASLA yazılmaz.** Saldırgana bütçe göstergesi,
 *    kullanıcıya panik. Hata metninde girilen kod da echo edilmez.
 *
 * Belirsiz kalması gerekenler: hesabın var olup olmadığı, e-postanın teslim edilip
 * edilmediği ("gönderildi" değil "gönderdik"), ve kodun hane/ömür bilgisi dışında
 * hiçbir parametre.
 */

const messages = {
  'auth.title': 'Giriş yap veya kayıt ol',

  'auth.email.lede': 'Adresini yaz, sana tek kullanımlık bir kod gönderelim. Şifre yok.',
  'auth.email.label': 'E-posta adresin',
  'auth.email.help': 'Kodu bu adrese göndereceğiz.',
  'auth.email.placeholder': 'ad@site.com',
  'auth.email.error.invalid': 'Bu adres geçerli görünmüyor. Örnek: ad@site.com',

  'auth.code.lede': 'Şu adrese 6 haneli bir kod gönderdik:',
  'auth.code.label': 'E-postana gelen kod',
  'auth.code.hint': 'Kod 10 dakika geçerli. Postayı göremiyorsan spam klasörüne bak.',
  'auth.code.resend': 'Yeni kod gönder',
  'auth.code.changeEmail': 'Başka bir adres kullan',

  'auth.common.continue': 'Devam et',
  'auth.common.working': 'Gönderiliyor…',

  'auth.otp.error.invalid': 'Kod eşleşmedi. Son gelen e-postadaki 6 rakamı kontrol et.',
  'auth.otp.error.locked':
    'Çok fazla deneme yapıldı. Güvenlik için bu kodu kapattık — yeni kod iste.',
  'auth.otp.error.resendTooSoon': 'Yeni kod için {saniye} saniye daha bekle.',

  'auth.error.tooManyRequests': 'Çok fazla kod istendi. Bir süre sonra tekrar dene.',
  'auth.error.suspended': 'Bu hesap askıya alındı. destek@expyra.com',
  'auth.error.expiredChallenge': 'Bu giriş denemesi zaman aşımına uğradı. Adresini tekrar yaz.',
} as const

export type MessageKey = keyof typeof messages

/**
 * Metni getirir, `{yerTutucu}` alanlarını doldurur. Karşılığı olmayan yer tutucu
 * olduğu gibi bırakılır — sessizce boş string basmak, eksik çeviriyi görünmez yapar.
 */
export function t(key: MessageKey, values?: Readonly<Record<string, string>>): string {
  const template: string = messages[key]
  if (!values) return template

  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match)
}

/**
 * Sayı biçimi daima `Intl` üzerinden: Arapça arayüzde "٥٨" beklenir, elle
 * `String(n)` yazan her yer o dilde yanlış görünür.
 *
 * Yerel ayar şimdilik sabit; Faz 8.1'de aktif dilden gelecek (`<html lang>` ile
 * aynı kaynak olmalı, ayrı bir kaynak eklemenin anlamı yok).
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value)
}
