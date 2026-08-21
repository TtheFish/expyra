import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'

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
  /**
   * Kaynağı API tarafında VERİTABANI, token değil. Arayüz host panelini buna
   * göre açıyor: token'dan okunsaydı rolünü yeni kazanmış kullanıcı, elindeki
   * eski access token bitene kadar (15 dk) panelini göremezdi.
   */
  isHost: boolean
  /**
   * Profil fotoğrafının okuma adresi; yoksa `null` ve arayüz baş harfe düşüyor.
   * Adres HER yanıtta yeniden üretiliyor — veritabanında anahtar duruyor, böylece
   * CDN alan adı değiştiğinde geçmiş satırlar migration istemiyor.
   */
  avatarUrl: string | null
}

/**
 * `POST /api/host/activate` yanıtı. Refresh token DÖNMÜYOR (API kararı) —
 * çerezin yalnız access yarısı tazeleniyor.
 */
export type HostActivation = {
  isHost: boolean
  accessToken: string
  accessTokenExpiresAtUtc: string
}

/**
 * `ValidationProblemDetails.errors` sözlüğü: alan adı → mesajlar.
 *
 * Mesajların KENDİSİ kullanıcıya gösterilmiyor (API'nin dili kullanıcının dili
 * olmak zorunda değil). Değerli olan anahtar: hangi alanın reddedildiğini
 * söylüyor, çağıran da o alanın kendi metnini seçiyor.
 */
export type ProblemErrors = Readonly<Record<string, readonly string[]>>

/** API'nin ProblemDetails yanıtı. `message` kullanıcıya GÖSTERİLMEZ — çağıran eşler. */
export class ApiError extends Error {
  readonly status: number
  readonly retryAfterSeconds: number | null
  readonly errors: ProblemErrors | null

  /**
   * Sunucunun makine-okunur sebep kodu (`media-too-small`), varsa.
   *
   * `message` TÜRKÇE ve arayüz iki dilde — bu yüzden ekrana basılmıyor ve dal
   * seçmek için de kullanılamıyor (cümle düzeltildiği gün sessizce kırılırdı).
   * Kod o boşluğu dolduruyor: çağıran onu arayüz sözlüğünde bir anahtara eşliyor.
   * Sunucu tarafı: `AppException.Code`.
   */
  readonly code: string | null

  constructor(
    status: number,
    message: string,
    retryAfterSeconds: number | null,
    errors: ProblemErrors | null = null,
    code: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
    this.errors = errors
  }

  /**
   * Alan adı karşılaştırması BÜYÜK/KÜÇÜK HARF DUYARSIZ. API `DisplayName`
   * gönderiyor, JSON ayarı değişirse `displayName` gönderir; iki durumda da
   * doğrulama hatası alanına bağlanmalı, yoksa kullanıcı "bir şeyler ters gitti"
   * görür ve hangi alanı düzelteceğini bilemez.
   */
  hasFieldError(field: string): boolean {
    if (!this.errors) return false

    const needle = field.toLowerCase()
    return Object.keys(this.errors).some((key) => key.toLowerCase() === needle)
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
  let errors: ProblemErrors | null = null
  let code: string | null = null

  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object') {
      if ('title' in payload) {
        const value = (payload as { title: unknown }).title
        if (typeof value === 'string') title = value
      }

      if ('errors' in payload) {
        errors = validationErrorsOf((payload as { errors: unknown }).errors)
      }

      // ProblemDetails uzantısı (AppException.Code). Yoksa null kalıyor ve çağıran
      // durum koduna göre genel bir cümleye düşüyor.
      if ('code' in payload) {
        const value = (payload as { code: unknown }).code
        if (typeof value === 'string' && value.length > 0) code = value
      }
    }
  } catch {
    // Gövde ProblemDetails değil (ör. ters proxy'nin HTML hata sayfası). Hata
    // yutulmuyor: zaten ApiError üretiyoruz, yalnız mesaj durum koduna düşüyor.
  }

  return new ApiError(response.status, title || `API ${response.status}`, retryAfterSeconds, errors, code)
}

/** Gövdenin şekli garanti değil; beklenmeyen biçim `null` olur, patlamaz. */
function validationErrorsOf(value: unknown): ProblemErrors | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const result: Record<string, string[]> = {}

  for (const [field, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((item): item is string => typeof item === 'string')
    }
  }

  return Object.keys(result).length > 0 ? result : null
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

/**
 * "Host ol". ONAY SÜRECİ YOK (VISION §9): çağrı başarılıysa kullanıcı o an host.
 *
 * **Gövde YOK ve olmayacak**: kime rol verileceği token'ın `sub`'undan okunuyor
 * (CLAUDE.md #3). Buraya bir kullanıcı kimliği konsaydı uç "başkasını host yap"
 * ucuna dönerdi.
 *
 * İdempotent: ikinci çağrı da 200 döner. Çift tıklama hata ekranı üretmemeli.
 *
 * Yanıttaki **taze access token yazılmak zorunda** (bkz. `activateHostAction`):
 * eldeki token rolsüz ve süresi dolana kadar host uçlarından 403 alır.
 */
export async function activateHost(accessToken: string): Promise<HostActivation> {
  const response = await fetch(`${apiBaseUrl()}/api/host/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, ...(await forwardedHeaders()) },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await problemOf(response)
  }

  return (await response.json()) as HostActivation
}

/**
 * `cache` ile sarılı — token değeri anahtar. Üst çubuk artık her sayfada adı
 * gösterdiği için bu uç render başına birden çok yerden çağrılıyor (header +
 * hesap sayfası); sarmalanmasaydı tek sayfa görüntülemesi iki API turu ederdi.
 *
 * TUZAK: önbellek İSTEK ömürlü ve sunucu eylemi ile onu izleyen yeniden render
 * AYNI istekte çalışıyor. Bir eylem mutasyondan ÖNCE burayı çağırırsa, sonrasında
 * basılan header eski adı gösterir. `updateProfileAction` bu yüzden `/me`
 * çağırmıyor; PATCH yanıtı zaten güncel profili taşıyor.
 */
export const fetchCurrentUser = cache(async (accessToken: string): Promise<CurrentUser> => {
  const response = await fetch(`${apiBaseUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, ...(await forwardedHeaders()) },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await problemOf(response)
  }

  return (await response.json()) as CurrentUser
})

/**
 * `app_user.display_name` sütunuyla AYNI değer olmak zorunda; API tarafındaki
 * validator da aynı sabiti taşıyor. Tek yer değişirse API 400 yerine 500 döner
 * (kalıcı çözüm: sabiti API domain'ine taşımak — docs/PLAN.md Blok 2).
 *
 * Web tarafında yine de gerekli: kullanıcı 200 karakter yazıp gönder'e bastıktan
 * sonra değil, yazarken durdurulmalı.
 */
export const DISPLAY_NAME_MAX_LENGTH = 80

/**
 * Profil güncelleme. **Gövde TAM PROFİLİ taşır, delta değil**: `null` gönderilen
 * alan sunucuda TEMİZLENİR. İki alanın da her çağrıda gönderilmesi zorunlu —
 * yalnız ad gönderilirse kullanıcının dil tercihi sessizce silinir.
 *
 * Yanıt `GET /api/auth/me` ile birebir aynı şekilde (`CurrentUser`) ve zaten
 * güncel: PATCH sonrası ayrıca `/me` çağırmaya gerek yok.
 */
export async function updateProfile(
  accessToken: string,
  input: { displayName: string | null; preferredLanguage: string | null },
): Promise<CurrentUser> {
  const response = await fetch(`${apiBaseUrl()}/api/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(await forwardedHeaders()),
    },
    body: JSON.stringify({
      displayName: input.displayName,
      preferredLanguage: input.preferredLanguage,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await problemOf(response)
  }

  return (await response.json()) as CurrentUser
}

/**
 * İmzalı avatar yükleme adresi. Bayt BU uçtan geçmiyor — tarayıcı dönen adrese
 * doğrudan PUT ediyor (ilan görselleriyle birebir aynı akış).
 */
export async function createAvatarUpload(
  accessToken: string,
  file: { contentType: string; byteSize: number },
): Promise<AvatarUpload> {
  return (await sendProfile(accessToken, 'POST', '/api/users/me/avatar/upload-url', file)) as AvatarUpload
}

/** Yüklemeyi doğrular ve fotoğrafı profile bağlar. Güncel profili döner. */
export async function confirmAvatar(accessToken: string, storageKey: string): Promise<CurrentUser> {
  return (await sendProfile(accessToken, 'POST', '/api/users/me/avatar/confirm', {
    storageKey,
  })) as CurrentUser
}

/** Fotoğrafı kaldırır. İdempotent: fotoğrafı olmayan kullanıcı için de 200. */
export async function deleteAvatar(accessToken: string): Promise<CurrentUser> {
  return (await sendProfile(accessToken, 'DELETE', '/api/users/me/avatar')) as CurrentUser
}

export type AvatarUpload = {
  storageKey: string
  uploadUrl: string
  method: string
  /** PUT isteğinde AYNEN gönderilecek başlıklar; imza onların üzerine kurulu. */
  headers: Record<string, string>
  expiresAtUtc: string
}

async function sendProfile(
  accessToken: string,
  method: 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...(await forwardedHeaders()),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await problemOf(response)
  }

  return response.json()
}
