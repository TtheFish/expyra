import { getSession } from '@/features/auth/session'
import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { findTicket } from '@/lib/ticket'
import { AppleWalletNotConfiguredError, buildApplePass } from '@/lib/wallet/apple-pass'

export const runtime = 'nodejs'

/**
 * Apple Wallet `.pkpass`.
 *
 * Sertifikalar `EXPYRA_APPLE_PASS_*` ortam değişkenlerinde (sır repoda yok).
 * Tanımsızsa 503 — istemci bilet görüntüleme sayfasına düşer.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const locale = uiLocaleOf(new URL(request.url).searchParams.get(UI_LANGUAGE_FIELD))
  const t = await getTranslator(locale)
  const session = await getSession()

  if (!session) {
    return Response.json(
      { title: t('ticket.error.signedOut'), status: 401 },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const { code } = await params
  const ticket = findTicket(code)

  if (!ticket) {
    return Response.json(
      { title: t('ticket.error.notFound'), status: 404 },
      { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

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
