import 'server-only'

import { getVerifiedUser } from '@/features/auth/verified-user'
import type { Translate } from '@/features/i18n/dictionary'
import { isDemoContentEnabled } from './demo-content'
import type { Ticket } from './ticket'
import { resolveTicketAccess, visibleDemoTickets, type TicketAccess } from './ticket-lookup'

export type { TicketAccess } from './ticket-lookup'

/**
 * Bileti isteyen kullanıcıya göre çözer — bilet sayfası, PDF ve cüzdan uçlarının
 * TEK girişi. Hiçbiri bileti başka yoldan okumaz.
 *
 * Bugün: oturum API'ye doğrulatılır (`getVerifiedUser`); bilet yalnız demo
 * bayrağı açıksa (`EXPYRA_DEMO_CONTENT=1`) demo veriden gelir. Gerçek bilet
 * yok — rezervasyon Blok 9/12.
 *
 * Blok 12'de değişecek yer YALNIZ bu fonksiyon: demo dalı yerine bilet API'den
 * bearer token ile istenir ve sahiplik API'de denetlenir
 * (`booking.UserId == CurrentUser`; başkasının bileti 404). Çağıranların sözleşmesi
 * (`unauthenticated` → 401, `notFound` → 404) aynı kalır.
 */
export async function getTicketForCurrentUser(code: string): Promise<TicketAccess> {
  const user = await getVerifiedUser()

  return resolveTicketAccess({
    signedIn: user !== null,
    demoEnabled: isDemoContentEnabled(),
    code,
  })
}

/**
 * Bilet uçlarının (`/api/bilet/[code]/*`) ortak ret yanıtı. Üç uç aynı
 * gövdeyi dönmeli — biri farklı dönerse yanıt farkı yine bir sinyal olur.
 */
export function ticketDeniedResponse(
  access: Exclude<TicketAccess, { kind: 'found' }>,
  t: Translate,
): Response {
  const status = access.kind === 'unauthenticated' ? 401 : 404
  const title = access.kind === 'unauthenticated' ? t('ticket.error.signedOut') : t('ticket.error.notFound')

  return Response.json(
    { title, status },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

/**
 * "Deneyimlerim" listesi — `getTicketForCurrentUser` ile aynı kapı. Blok 12'de
 * "kullanıcının biletleri" API çağrısıyla yer değiştirir.
 */
export async function listTicketsForCurrentUser(): Promise<
  { kind: 'unauthenticated' } | { kind: 'ok'; tickets: readonly Ticket[] }
> {
  const user = await getVerifiedUser()
  if (!user) return { kind: 'unauthenticated' }

  return { kind: 'ok', tickets: visibleDemoTickets(isDemoContentEnabled()) }
}
