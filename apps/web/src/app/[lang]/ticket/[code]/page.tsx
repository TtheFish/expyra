import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderShell } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassTicket } from '@/components/ticket/glass-ticket'
import { TicketWalletActions } from '@/components/ticket/ticket-wallet-actions'
import { formatMoney, formatNumber } from '@/features/i18n/format'
import { getTranslator } from '@/features/i18n/translator'
import {
  findTicket,
  formatLocalDateTime,
  qrSvg,
} from '@/lib/ticket'
import { path } from '@/lib/routes'
import {
  applePassHref,
  googlePassHref,
  ticketPath,
  ticketPdfHref,
} from '@/lib/wallet/paths'
import '../../../ticket.css'

type PageParams = Promise<{ lang: string; code: string }>

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, code } = await params
  const t = await getTranslator(lang)
  const ticket = findTicket(code)

  return {
    title: ticket
      ? `${ticket.experienceTitle} · ${t('ticket.view.title')}`
      : t('ticket.view.title'),
    robots: { index: false, follow: false },
  }
}

/**
 * Bilet görüntüleme — cüzdan kartı + Apple/Google ekleme.
 * Blok 12’de aynı sayfa gerçek `ticket` satırına bağlanır.
 */
export default async function TicketDetailPage({ params }: { params: PageParams }) {
  const { lang, code } = await params
  const ticket = findTicket(code)
  if (!ticket) notFound()

  const [t, qrMarkup] = await Promise.all([getTranslator(lang), qrSvg(ticket)])

  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderShell>
        <BrandLogo href={path(lang, 'home')} />
        <span />
        <nav className="justify-self-end" aria-label={t('nav.primaryLabel')}>
          <GlassButton variant="ghost" size="sm" href={path(lang, 'myExperiences')}>
            {t('nav.myExperiences')}
          </GlassButton>
        </nav>
      </HeaderShell>

      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:py-14">
        <a
          href={path(lang, 'myExperiences')}
          className="text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          ← {t('ticket.view.back')}
        </a>

        <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
          {t('ticket.view.title')}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">{t('ticket.view.lede')}</p>

        <div className="mt-8">
          <GlassTicket
            ticket={ticket}
            qrMarkup={qrMarkup}
            labels={{
              demoBadge: t('ticket.demoBadge'),
              demoNote: t('ticket.demoNote'),
              guests: t('ticket.guests'),
              amount: t('ticket.amount'),
              status: t('ticket.status'),
              statusValid: t('ticket.status.valid'),
              statusUsed: t('ticket.status.used'),
              timeZoneNote: t('ticket.timeZoneNote', {
                sehir: ticket.location.split(',')[0] ?? ticket.location,
              }),
            }}
            values={{
              guests: formatNumber(lang, ticket.guests),
              amount: formatMoney(lang, ticket.totalAmount, ticket.currency),
              startsAt: formatLocalDateTime(lang, ticket),
            }}
          />
        </div>

        <div className="mt-6">
          <TicketWalletActions
            viewHref={ticketPath(lang, ticket.code)}
            appleHref={applePassHref(lang, ticket.code)}
            googleHref={googlePassHref(lang, ticket.code)}
            pdfHref={ticketPdfHref(lang, ticket.code)}
            showView={false}
            labels={{
              view: t('ticket.wallet.view'),
              apple: t('ticket.wallet.apple'),
              google: t('ticket.wallet.google'),
              pdf: t('myExperiences.downloadPdf'),
              appleMissing: t('ticket.wallet.appleNotConfigured'),
              googleMissing: t('ticket.wallet.googleNotConfigured'),
              signedOut: t('ticket.error.signedOut'),
              adding: t('ticket.wallet.adding'),
            }}
          />
        </div>
      </main>
    </div>
  )
}
