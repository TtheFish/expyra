import { DEMO_TICKETS, type Ticket } from './ticket'

/**
 * Bilet erişim kararının SAF hali — `ticket-access.ts`'in iç kuralı.
 *
 * Ayrı dosyada çünkü `ticket-access.ts` `server-only` taşıyor (API'ye gidiyor)
 * ve vitest onu ithal edemez; kural ise test edilmesi gereken kısım.
 */

export type TicketAccess =
  /** Oturum yok ya da API token'ı tanımıyor → 401 / giriş ekranı. */
  | { kind: 'unauthenticated' }
  /** Oturum geçerli ama bilet yok, demo kapalı ya da bilet bu kullanıcının değil → 404. */
  | { kind: 'notFound' }
  | { kind: 'found'; ticket: Ticket }

/**
 * Sıra önemli: oturum kontrolü biletten ÖNCE. Tersi olsaydı anonim istek geçerli
 * kodda 401, geçersiz kodda 404 alır ve yanıt farkı kod denemeye (enumeration)
 * yarayan bir kanal olurdu.
 *
 * Demo kapalıyken her kod `notFound`: bugün gerçek bilet yok (rezervasyon Blok
 * 9/12), dolayısıyla "bu kullanıcının bileti" kümesi boş.
 */
export function resolveTicketAccess(input: {
  signedIn: boolean
  demoEnabled: boolean
  code: string
}): TicketAccess {
  if (!input.signedIn) return { kind: 'unauthenticated' }
  if (!input.demoEnabled) return { kind: 'notFound' }

  const ticket = DEMO_TICKETS.find((item) => item.code === input.code)
  return ticket ? { kind: 'found', ticket } : { kind: 'notFound' }
}

/** "Deneyimlerim" listesi için aynı kural: demo kapalıyken liste boş. */
export function visibleDemoTickets(demoEnabled: boolean): readonly Ticket[] {
  return demoEnabled ? DEMO_TICKETS : []
}
