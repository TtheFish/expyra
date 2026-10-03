import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { getTicketForCurrentUser, ticketDeniedResponse } from '@/lib/ticket-access'
import { AppleWalletNotConfiguredError, buildApplePass } from '@/lib/wallet/apple-pass'

export const runtime = 'nodejs'

/**
 * Apple Wallet `.pkpass`.
 *
 * Erişim `getTicketForCurrentUser`'da: oturum API'ye doğrulatılır (çerezin
 * varlığı yetmez), bilet yalnız o kullanıcıya çözülürse döner.
 *
 * Sertifikalar `EXPYRA_APPLE_PASS_*` ortam değişkenlerinde (sır repoda yok).
 * Tanımsızsa 503 — istemci bilet görüntüleme sayfasına düşer.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const locale = uiLocaleOf(new URL(request.url).searchParams.get(UI_LANGUAGE_FIELD))
  const [t, { code }] = await Promise.all([getTranslator(locale), params])

  const access = await getTicketForCurrentUser(code)
  if (access.kind !== 'found') return ticketDeniedResponse(access, t)
  const { ticket } = access

  try {
    const pass = await buildApplePass(ticket, locale)
    return new Response(new Uint8Array(pass), {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="expyra-${ticket.code}.pkpass"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    if (error instanceof AppleWalletNotConfiguredError) {
      return Response.json(
        { title: t('ticket.wallet.appleNotConfigured'), status: 503, code: 'apple-wallet-unconfigured' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    throw error
  }
}
