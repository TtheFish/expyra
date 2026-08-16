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

export async function clearSession(): Promise<void> {
  const store = await cookies()
  const options = clearedCookieOptions(SESSION_COOKIE_PATH)

  store.set(accessCookieName(), '', options)
  store.set(refreshCookieName(), '', options)
}
