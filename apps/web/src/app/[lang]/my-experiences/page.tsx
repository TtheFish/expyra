import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderShell } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassTicket } from '@/components/ticket/glass-ticket'
import { TicketWalletActions } from '@/components/ticket/ticket-wallet-actions'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import type { Translate } from '@/features/i18n/dictionary'
import { formatMinorMoney, formatNumber } from '@/features/i18n/format'
import { getTranslator } from '@/features/i18n/translator'
import { formatLocalDateTime, qrSvg, type Ticket } from '@/lib/ticket'
import { listTicketsForCurrentUser } from '@/lib/ticket-access'
import { alternateLinks, path } from '@/lib/routes'
import {
  applePassHref,
  googlePassHref,
  ticketPath,
  ticketPdfHref,
} from '@/lib/wallet/paths'
import '../../ticket.css'

/**
 * "Deneyimlerim" — gezginin biletleri.
 *
 * İki bölüm: yaklaşan (bilet canlı) ve geçmiş (bilet kullanılmış).
 * Biletler `listTicketsForCurrentUser`'dan: oturum API'ye doğrulatılır, demo
 * biletler yalnız `EXPYRA_DEMO_CONTENT=1` iken görünür. Kapalıyken liste boş ve
 * sayfa boş durum metnini gösterir — rezervasyon (Blok 9/12) gelene kadar gerçek
 * bilet yok.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    // Sayfa adı üst menüyle aynı anahtardan (bkz. `how-it-works/page.tsx`).
    title: `${t('nav.myExperiences')} · Expyra`,
    alternates: { languages: alternateLinks('myExperiences') },
  }
}

export default async function MyExperiencesPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const [{ lang }, listing] = await Promise.all([params, listTicketsForCurrentUser()])

  if (listing.kind === 'unauthenticated') {
    const query = new URLSearchParams({ [RETURN_TO_PARAM]: path(lang, 'myExperiences') })
    redirect(`${path(lang, 'signIn')}?${query.toString()}`)
  }

  const [t, tickets] = await Promise.all([
    getTranslator(lang),
    Promise.all(
      listing.tickets.map(async (ticket) => ({ ticket, qrMarkup: await qrSvg(ticket) })),
    ),
  ])

  // `t` çevirmene ayrıldı; eleme değişkeni `entry` (gölgeleme okunurluğu bozar).
  const upcoming = tickets.filter((entry) => entry.ticket.status === 'valid')
  const past = tickets.filter((entry) => entry.ticket.status !== 'valid')

  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderShell>
          <BrandLogo href={path(lang, 'home')} />
          {/* Orta sütun (arama hapı) bu sayfada boş: bilet listesinde arama
              bağlamı yok. Izgara üç sütunlu kalıyor ki logo ve nav kaymasın. */}
          <span />
          <nav
            className="flex items-center justify-self-end gap-1"
            aria-label={t('nav.primaryLabel')}
          >
            <GlassButton variant="ghost" size="sm" href={path(lang, 'explore')}>
              {t('nav.explore')}
            </GlassButton>
            <GlassButton variant="ghost" size="sm" href={path(lang, 'myExperiences')}>
              {t('nav.myExperiences')}
            </GlassButton>
          </nav>
      </HeaderShell>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
          {t('nav.myExperiences')}
        </h1>
        <p className="mt-2 text-fg-muted">{t('myExperiences.lede')}</p>

        {tickets.length === 0 ? (
          <div className="surface mt-10 rounded-[var(--radius-glass-lg)] p-6">
            <p className="font-bold">{t('myExperiences.empty.title')}</p>
            <p className="mt-2 text-sm text-fg-muted">{t('myExperiences.empty.body')}</p>
            <GlassButton href={path(lang, 'explore')} variant="primary" size="md" className="mt-5">
              {t('myExperiences.empty.cta')}
            </GlassButton>
          </div>
        ) : (
          <>
            <section className="mt-10" aria-labelledby="yaklasan">
              <h2 id="yaklasan" className="mb-5 text-sm font-semibold text-fg-muted">
                {t('myExperiences.upcoming', { sayi: upcoming.length })}
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                {upcoming.map(({ ticket, qrMarkup }) => (
                  <div key={ticket.code} className="grid gap-3">
                    <TicketCard ticket={ticket} qrMarkup={qrMarkup} lang={lang} t={t} />
                    <TicketWalletActions
                      viewHref={ticketPath(lang, ticket.code)}
                      appleHref={applePassHref(lang, ticket.code)}
                      googleHref={googlePassHref(lang, ticket.code)}
                      pdfHref={ticketPdfHref(lang, ticket.code)}
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
                ))}
              </div>
            </section>

            <section className="mt-14" aria-labelledby="gecmis">
              <h2 id="gecmis" className="mb-5 text-sm font-semibold text-fg-muted">
                {t('myExperiences.past', { sayi: past.length })}
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                {past.map(({ ticket, qrMarkup }) => (
                  <div key={ticket.code}>
                    <TicketCard ticket={ticket} qrMarkup={qrMarkup} lang={lang} t={t} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <GlassButton size="sm" href={ticketPath(lang, ticket.code)}>
                        {t('ticket.wallet.view')}
                      </GlassButton>
                      <GlassButton size="sm" href={ticketPdfHref(lang, ticket.code)}>
                        {t('myExperiences.downloadPdf')}
                      </GlassButton>
                      <GlassButton size="sm" disabled title={t('myExperiences.rate.soon')}>
                        {t('myExperiences.rate')}
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

/**
 * PDF ucu `/api/...` altında, yani yolda dil segmenti YOK — belge hangi dilde
 * yazılacağını sorgudan öğreniyor. Alan adı forma yazılanla aynı sabit
 * (`arayuz-dili`): ikisi de "bu cevabı hangi dilde yaz" sorusuna cevap veriyor,
 * ikisi de kullanıcının içerik dili tercihinden (`expyra_lang`) ayrı.
 */
function TicketCard({
  ticket,
  qrMarkup,
  lang,
  t,
}: {
  ticket: Ticket
  qrMarkup: string
  lang: string
  t: Translate
}) {
  return (
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
        // Şehir, IANA kimliğinin ("Europe/Prague") okunabilir karşılığı.
        timeZoneNote: t('ticket.timeZoneNote', { sehir: cityOf(ticket) }),
      }}
      values={{
        guests: formatNumber(lang, ticket.guests),
        amount: formatMinorMoney(lang, ticket.amountMinor, ticket.currencyCode, ticket.minorUnits),
        startsAt: formatLocalDateTime(lang, ticket),
      }}
    />
  )
}

/** "Prag, Çekya" → "Prag". Konum host'un yazdığı İÇERİK, çevrilmiyor. */
function cityOf(ticket: Ticket): string {
  return ticket.location.split(',')[0] ?? ticket.location
}
