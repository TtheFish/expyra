import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'
import type { AuthTokens } from './api'
import {
  SESSION_COOKIE_PATH,
  accessCookieName,
  clearedCookieOptions,
  refreshCookieName,
  sessionCookieOptions,
} from './cookies'

/**
 * Oturumun sunucu tarafı görünümü.
 *
 * Access çerezi tarayıcı tarafından süresi dolduğunda DÜŞÜRÜLÜR; "access yok ama
 * refresh var" durumu bu yüzden temiz bir sinyal: `proxy.ts` yenilemeyi tam olarak
 * o duruma bakarak tetikliyor.
 */

export type Session = {
  accessToken: string | null
  refreshToken: string | null
}

/**
 * `cache` ile sarılı: aynı render'da birden çok bileşen çağırsa da çerez deposu
 * bir kez okunur ve hepsi aynı görüntüyü görür.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies()

  const accessToken = store.get(accessCookieName())?.value ?? null
  const refreshToken = store.get(refreshCookieName())?.value ?? null

  if (!accessToken && !refreshToken) return null

  return { accessToken, refreshToken }
})

/** Yalnız Server Action / Route Handler içinden çağrılabilir — render sırasında çerez yazılamaz. */
export async function setSession(tokens: AuthTokens): Promise<void> {
  const store = await cookies()

  store.set(
    accessCookieName(),
    tokens.accessToken,
    sessionCookieOptions(tokens.accessTokenExpiresAtUtc),
  )
  store.set(
    refreshCookieName(),
    tokens.refreshToken,
    sessionCookieOptions(tokens.refreshTokenExpiresAtUtc),
  )
}

/**
 * Yalnız access çerezini tazeler; refresh çerezine DOKUNMAZ.
 *
 * `POST /api/host/activate` için var: o uç rol claim'i eklenmiş yeni bir access
 * token döndürüyor ama refresh token döndürmüyor (API kararı — döndürseydi
 * yazmayı atlayan istemci kendi oturumunu düşürürdü). `setSession` burada
 * kullanılamaz: `AuthTokens` refresh ömrünü de istiyor ve elimizde o damga yok;
 * uydurulan bir tarih oturumu ya erken keser ya da ölü token'ı çerezde bırakır.
 *
 * Çerez yazma mantığı yine BU dosyada: `cookies.ts` "tek tanım" diyor, ikinci
 * bir yerde `accessCookieName()` çağırmak o kuralı sessizce deler.
 */
export async function setAccessToken(accessToken: string, expiresAtUtc: string): Promise<void> {
  const store = await cookies()
  store.set(accessCookieName(), accessToken, sessionCookieOptions(expiresAtUtc))
}

export async function clearSession(): Promise<void> {
  const store = await cookies()
  const options = clearedCookieOptions(SESSION_COOKIE_PATH)

  store.set(accessCookieName(), '', options)
  store.set(refreshCookieName(), '', options)
}
