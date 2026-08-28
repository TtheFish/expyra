import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'
import { CHALLENGE_COOKIE, CHALLENGE_COOKIE_PATH, challengeCookieOptions, clearedCookieOptions } from './cookies'

/**
 * Akışın hangi adımda olduğunu ÇEREZ söylüyor, URL değil.
 *
 * E-posta URL'e ASLA yazılmaz: tarayıcı geçmişine düşer ve hesaplar arası
 * senkronlanır, `Referer` ile dışarı sızar, sunucu logları PII taşımaya başlar
 * (GDPR / Faz 10.3) ve `/giris?eposta=x@y.com` ücretsiz bir enumeration hedefi olur.
 *
 * İstemci state'i (`useState`) de olmaz: kullanıcı postayı açmak için sekme
 * değiştirip F5'e bastığında akış sıfırlanır — bu adımda en sık olan şey bu.
 *
 * `challengeId` çerezde `httpOnly` duruyor, yani tarayıcı JS'i onu okuyamaz.
 */

export type Challenge = {
  id: string
  /** Kullanıcının yazdığı hâl — 2. adımda ekranda gösteriliyor. */
  email: string
  expiresAtUtc: string
  resendAvailableAtUtc: string
  codeLength: number
}

/** Çerez ömrünün üst sınırı: kod 10 dk yaşıyor, çerezin daha uzun yaşaması anlamsız. */
const MAX_AGE_SECONDS = 600

export const getChallenge = cache(async (): Promise<Challenge | null> => {
  const raw = (await cookies()).get(CHALLENGE_COOKIE)?.value
  if (!raw) return null

  const parsed = decode(raw)
  if (!parsed) return null

  // Süresi geçmiş challenge, çerez henüz düşmemiş olsa bile 1. adıma dönmeli:
  // aksi halde kullanıcı ölü bir koda kod girmeye çalışır.
  return Date.parse(parsed.expiresAtUtc) > Date.now() ? parsed : null
})

export async function setChallenge(challenge: Challenge): Promise<void> {
  const store = await cookies()
  const remaining = secondsUntil(challenge.expiresAtUtc)

  store.set(CHALLENGE_COOKIE, encode(challenge), challengeCookieOptions(Math.min(remaining, MAX_AGE_SECONDS)))
}

export async function clearChallenge(): Promise<void> {
  const store = await cookies()
  store.set(CHALLENGE_COOKIE, '', clearedCookieOptions(CHALLENGE_COOKIE_PATH))
}

/** Verilen ISO damgasına kalan saniye; geçmişse 0. Geri sayımın tek kaynağı bu. */
export function secondsUntil(isoUtc: string): number {
  const target = Date.parse(isoUtc)
  if (Number.isNaN(target)) return 0

  return Math.max(0, Math.ceil((target - Date.now()) / 1000))
}

/**
 * base64url — şifreleme DEĞİL, yalnız taşıma biçimi. Gizlilik `httpOnly`'den
 * geliyor; burada saklanan tek şey zaten kullanıcının kendi adresi ve challenge id'si.
 */
function encode(challenge: Challenge): string {
  return Buffer.from(JSON.stringify(challenge), 'utf8').toString('base64url')
}

function decode(raw: string): Challenge | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    return isChallenge(parsed) ? parsed : null
  } catch {
    // Bozuk/elle kurcalanmış çerez. Hata yutma değil: sözleşme "çerez yoksa 1. adım",
    // okunamayan çerez de yok sayılır ve kullanıcı temiz bir başlangıç görür.
    return null
  }
}

function isChallenge(value: unknown): value is Challenge {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<Challenge>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.expiresAtUtc === 'string' &&
    typeof candidate.resendAvailableAtUtc === 'string' &&
    typeof candidate.codeLength === 'number'
  )
}
