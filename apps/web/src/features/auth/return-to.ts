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

export const RETURN_TO_PARAM = 'donus'

/**
 * Giriş ve çıkış yolları TEK yerde. Üç ayrı yer aynı değere bağlı: challenge
 * çerezinin `path`'i, proxy'nin yönlendirme hedefi ve aşağıdaki kendine-döngü
 * kontrolü. Yol değişirse (ör. `/tr/giris` gibi dil segmenti eklenirse) üçünün
 * birlikte değişmesi şart — biri geride kalırsa çerez hiç gönderilmez ve akış
 * sessizce 1. adıma çakılır.
 */
export const LOGIN_PATH = '/giris'
export const SIGN_OUT_PATH = '/cikis'

/** Hedef güvenilmezse buraya düşülür. */
export const DEFAULT_RETURN_TO = '/'

/** Kendisine dönmesi anlamsız olan yollar. */
const SELF_LOOP_PREFIXES = [LOGIN_PATH, SIGN_OUT_PATH]

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

  const path = value.split(/[?#]/)[0]
  if (SELF_LOOP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return DEFAULT_RETURN_TO
  }

  return value
}
