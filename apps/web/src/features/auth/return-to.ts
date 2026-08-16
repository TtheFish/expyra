/**
 * Açık yönlendirme (open redirect) koruması.
 *
 * `donus` parametresi URL'de taşınır (hedef yol hassas değil) ve adımlar arasında
 * gizli input ile geçer — challenge çerezine KONMAZ: terk edilmiş eski bir
 * denemenin çerezi, sonraki girişin hedefini ele geçirebilirdi.
 *
 * Naif `startsWith('/')` kontrolünün atladıkları burada kapanıyor; her satırın
 * karşılığı gerçek bir saldırı:
 *
 *   `//evil.com`     → tarayıcı bunu `https://evil.com` olarak çözer
 *   `/\evil.com`     → ters bölü tarayıcıda `/` gibi davranır, yine dış alan adı
 *   `/x%0d%0a...`    → başlık enjeksiyonu
 *   `/giris`         → kendi kendine döngü; kullanıcı giriş ekranından çıkamaz
 *   `javascript:...` → `/` ile başlamadığı için ilk kapıda düşer
 */

import { resolvePage } from '@/lib/routes'

export const RETURN_TO_PARAM = 'donus'

/**
 * Giriş yolu artık dile bağlı: `/tr/giris`, `/en/sign-in`. Sabit bir dize
 * tutulamıyor, çünkü `route-map.json`'a yeni dil eklendiğinde burası sessizce
 * geride kalırdı — ve geride kalması akışı 1. adıma çakar.
 *
 * Bu yüzden yol karşılaştırması `resolvePage` üzerinden yapılıyor: hangi dilde
 * olursa olsun "bu sayfa giriş sayfası mı" sorusunun tek cevabı orada.
 */
export const SIGN_OUT_PATH = '/cikis'

/** Hedef güvenilmezse buraya düşülür. */
export const DEFAULT_RETURN_TO = '/'

function isSelfLoop(pathname: string): boolean {
  if (pathname === SIGN_OUT_PATH || pathname.startsWith(`${SIGN_OUT_PATH}/`)) {
    return true
  }

  // Giriş sayfasının kendisi: kullanıcı girişten girişe dönerse ekrandan çıkamaz.
  return resolvePage(pathname)?.page === 'signIn'
}

/** Makul bir üst sınır: bundan uzun bir `donus` yalnız zorlama denemesinden gelir. */
const MAX_LENGTH = 512

export function safeReturnTo(candidate: string | string[] | null | undefined): string {
  if (typeof candidate !== 'string') return DEFAULT_RETURN_TO

  const value = candidate.trim()

  if (value.length === 0 || value.length > MAX_LENGTH) return DEFAULT_RETURN_TO
  if (!value.startsWith('/')) return DEFAULT_RETURN_TO
  if (value.startsWith('//')) return DEFAULT_RETURN_TO

  // Ters bölü değerin HERHANGİ bir yerinde reddediliyor: tarayıcılar onu '/' gibi
  // çözdüğü için `/a/\evil.com` da alan adını değiştirebiliyor.
  if (value.includes('\\')) return DEFAULT_RETURN_TO

  // Ham kontrol karakteri: CR/LF başlık enjeksiyonunun kodlanmamış hâli.
  // Regex yerine döngü — `no-control-regex` kuralını bastırmaya gerek kalmıyor.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) return DEFAULT_RETURN_TO
  }

  // Yüzde-kodlanmış CR / LF / NUL: aynı saldırının çözülmemiş hâli.
  if (/%0[0ad]/i.test(value)) return DEFAULT_RETURN_TO

  if (isSelfLoop(value.split(/[?#]/)[0])) {
    return DEFAULT_RETURN_TO
  }

  return value
}
