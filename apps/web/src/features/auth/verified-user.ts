import 'server-only'

import { cache } from 'react'
import { ApiError, fetchCurrentUser, type CurrentUser } from './api'
import { getSession } from './session'

/**
 * Oturumun DOĞRULANMIŞ hali: çerezdeki access token API'ye (`GET /api/auth/me`)
 * gösterilir, kullanıcıyı API tanırsa döner.
 *
 * `getSession()` yalnız çerezin VARLIĞINA bakar — `Cookie: expyra_at=x` gönderen
 * herkes oradan geçer. Kişiye özel veri dönen her yüzey (bilet, PDF, cüzdan
 * kartı) bunu kullanmalı, `getSession()`'ı değil.
 *
 * - Çerez yok / access düşmüş → `null`. Sayfalarda proxy refresh'i zaten denemiş
 *   olur; `/api` yollarında proxy çalışmıyor, orada süresi dolmuş token 401 alır.
 * - API 401 → `null` (sahte ya da ölü token).
 * - Diğer her hata (5xx, ağ) YUTULMUYOR: hata sınırına gider. "API'ye ulaşılamadı"
 *   ile "giriş yapmamışsın" aynı şey değil (CLAUDE.md #1).
 *
 * `cache`: aynı istekte sayfa + metadata çağırsa da `/me` bir kez gider
 * (`fetchCurrentUser` de token anahtarıyla önbellekli).
 */
export const getVerifiedUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession()
  if (!session?.accessToken) return null

  try {
    return await fetchCurrentUser(session.accessToken)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
})
