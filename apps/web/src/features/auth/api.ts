import 'server-only'

import { headers } from 'next/headers'

/**
 * .NET API'ye giden tek kapı (BFF). Tarayıcı JS'i API'yi hiç görmüyor:
 * token'lar `httpOnly` çerezde durur, `Authorization` başlığını burası ekler.
 *
 * API cookie bilmiyor — bu bilinçli. Aynı sözleşmeyi Faz 9'daki Expo istemcisi
 * de kullanacak; ambient credential olmadığı için API yapısal olarak CSRF'e kapalı.
 */

export type RequestLoginCodeResponse = {
  challengeId: string
  expiresAtUtc: string
  resendAvailableAtUtc: string
  codeLength: number
}

export type AuthTokens = {
  accessToken: string
  accessTokenExpiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  isNewAccount: boolean
}

export type CurrentUser = {
  id: string
  email: string
  displayName: string | null
  preferredLanguage: string | null
  createdAtUtc: string
}

/** API'nin ProblemDetails yanıtı. `message` kullanıcıya GÖSTERİLMEZ — çağıran eşler. */
export class ApiError extends Error {
  readonly status: number
  readonly retryAfterSeconds: number | null

  constructor(status: number, message: string, retryAfterSeconds: number | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * `EXPYRA_API_URL` FONKSİYON İÇİNDE okunuyor. Modül seviyesinde okunursa
 * `next build` ortam değişkeni tanımlı olmayan CI makinesinde patlar — derleme
 * anında bilinmesi gereken bir değer değil, istek anında.
 *
 * `NEXT_PUBLIC_` öneki YOK: bu adres tarayıcıya sızmamalı.
 */
function apiBaseUrl(): string {
  const value = process.env.EXPYRA_API_URL?.trim()

  if (!value) {
    throw new Error('EXPYRA_API_URL tanımlı değil. Örnek için apps/web/.env.example dosyasına bak.')
  }

  return value.replace(/\/+$/, '')
}

/**
 * BFF mimarisinde API'ye gelen her web isteği Next sunucusunun IP'sinden görünür.
 * Gerçek istemciyi biz taşımazsak IP bazlı hız sınırının değeri tam olarak sıfır.
 * API bu başlığa yalnız çağıran peer `Network:TrustedProxies` içindeyse güvenir.
 *
 * `Accept-Language` da iletiliyor: kod postasının dili, kullanıcı satırı henüz
 * yokken bu zincirden çözülüyor (docs/I18N.md §2).
 */
async function forwardedHeaders(): Promise<Record<string, string>> {
  const incoming = await headers()
  const result: Record<string, string> = {}

  const clientIp = clientIpOf(incoming)
  if (clientIp) {
    result['X-Expyra-Client-Ip'] = clientIp
  }

  const acceptLanguage = incoming.get('accept-language')
  if (acceptLanguage) {
    result['Accept-Language'] = acceptLanguage
  }

  return result
}

function clientIpOf(incoming: Headers): string | null {
  const forwarded = incoming.get('x-forwarded-for')
  if (forwarded) {
    // Zincirin İLK girdisi istemci; sonrakiler ara katmanlar.
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return incoming.get('x-real-ip')?.trim() ?? null
}

async function post(path: string, body: unknown): Promise<Response> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await forwardedHeaders()) },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await problemOf(response)
  }

  return response
}

async function problemOf(response: Response): Promise<ApiError> {
  const retryAfterSeconds = parseRetryAfter(response.headers.get('retry-after'))
  let title = ''

  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object' && 'title' in payload) {
      const value = (payload as { title: unknown }).title
      if (typeof value === 'string') title = value
    }
  } catch {
    // Gövde ProblemDetails değil (ör. ters proxy'nin HTML hata sayfası). Hata
    // yutulmuyor: zaten ApiError üretiyoruz, yalnız mesaj durum koduna düşüyor.
  }

  return new ApiError(response.status, title || `API ${response.status}`, retryAfterSeconds)
}

/** `Retry-After` yalnız saniye biçiminde bekleniyor; HTTP-date biçimi kullanılmıyor. */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null

  const seconds = Number.parseInt(value, 10)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}

/**
 * Yanıt HER DURUMDA aynı şekilde döner — kayıtlı ve kayıtsız e-posta ayırt edilemez.
 * Kod yanıtta taşınmaz; yalnız `challengeId` döner ve o da tarayıcı JS'ine verilmez.
 */
export async function requestLoginCode(input: {
  email: string
  preferredLanguage?: string | null
}): Promise<RequestLoginCodeResponse> {
  const response = await post('/api/auth/request-code', {
    email: input.email,
    preferredLanguage: input.preferredLanguage ?? null,
  })

  return (await response.json()) as RequestLoginCodeResponse
}

/**
 * İstek gövdesinde E-POSTA ALANI YOK (CLAUDE.md #3): adres sunucudaki challenge
 * satırından okunur, istemci "hangi hesaba giriyorum" diyemez.
 */
export async function verifyLoginCode(input: {
  challengeId: string
  code: string
}): Promise<AuthTokens> {
  const response = await post('/api/auth/verify-code', input)
  return (await response.json()) as AuthTokens
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  const response = await post('/api/auth/refresh', { refreshToken })
  return (await response.json()) as AuthTokens
}

/** Bilinmeyen/expired token da 204 döner — idempotent, oracle üretmiyor. */
export async function signOut(refreshToken: string): Promise<void> {
  await post('/api/auth/sign-out', { refreshToken })
}

export async function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  const response = await fetch(`${apiBaseUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, ...(await forwardedHeaders()) },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await problemOf(response)
  }

  return (await response.json()) as CurrentUser
}
