/**
 * Misafirin görüntüleme para birimi tercihi.
 *
 * Dil gibi URL'de değil: para birimi `hreflang` / lokalize slug üretmez, sayfa
 * kimliğini değiştirmez. Çerez + yenileme yeter; hesap alanına yazmak Blok 8.4
 * (oturumlu tercih) işi.
 *
 * `expyra_lang` İÇERİK dili — karıştırma.
 */

export const CURRENCY_COOKIE = 'expyra_currency'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** ISO 4217: üç harf. Sunucu da `CurrencyCode` ile aynı biçimi istiyor. */
const CODE_PATTERN = /^[A-Za-z]{3}$/

export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!CODE_PATTERN.test(trimmed)) return null
  return trimmed.toUpperCase()
}

export function readCurrencyCookie(
  store: { get(name: string): { value: string } | undefined },
): string | null {
  return normalizeCurrencyCode(store.get(CURRENCY_COOKIE)?.value)
}

/** İstemci: tercih yaz (veya `null` ile sil) — ardından `router.refresh()`. */
export function writeCurrencyCookie(code: string | null): void {
  if (typeof document === 'undefined') return

  if (code === null) {
    document.cookie = `${CURRENCY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    return
  }

  const normalized = normalizeCurrencyCode(code)
  if (!normalized) return

  document.cookie =
    `${CURRENCY_COOKIE}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
}
