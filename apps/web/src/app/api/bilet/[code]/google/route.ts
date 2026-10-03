import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { getTicketForCurrentUser, ticketDeniedResponse } from '@/lib/ticket-access'
import { GoogleWalletNotConfiguredError, buildGoogleWalletSaveUrl } from '@/lib/wallet/google-pass'

export const runtime = 'nodejs'

/**
 * Google Wallet kaydetme bağlantısı — 302 ile Google’ın save URL’sine.
 *
 * Erişim `getTicketForCurrentUser`'da: oturum API'ye doğrulatılır (çerezin
 * varlığı yetmez), bilet yalnız o kullanıcıya çözülürse döner.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const locale = uiLocaleOf(new URL(request.url).searchParams.get(UI_LANGUAGE_FIELD))
  const [t, { code }] = await Promise.all([getTranslator(locale), params])

  const access = await getTicketForCurrentUser(code)
  if (access.kind !== 'found') return ticketDeniedResponse(access, t)

  try {
    const url = await buildGoogleWalletSaveUrl(access.ticket, locale)
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
