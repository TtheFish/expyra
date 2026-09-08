import { getSession } from '@/features/auth/session'
import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { findTicket } from '@/lib/ticket'
import { GoogleWalletNotConfiguredError, buildGoogleWalletSaveUrl } from '@/lib/wallet/google-pass'

export const runtime = 'nodejs'

/**
 * Google Wallet kaydetme bağlantısı — 302 ile Google’ın save URL’sine.
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
    const url = await buildGoogleWalletSaveUrl(ticket, locale)
    return Response.redirect(url, 302)
  } catch (error) {
    if (error instanceof GoogleWalletNotConfiguredError) {
      return Response.json(
        {
          title: t('ticket.wallet.googleNotConfigured'),
          status: 503,
          code: 'google-wallet-unconfigured',
        },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    throw error
  }
}
