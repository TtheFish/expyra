import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderShell } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassTicket } from '@/components/ticket/glass-ticket'
import type { Translate } from '@/features/i18n/dictionary'
import { formatNumber, formatMoney } from '@/features/i18n/format'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { DEMO_TICKETS, formatLocalDateTime, qrSvg, type Ticket } from '@/lib/ticket'
import { alternateLinks, path } from '@/lib/routes'
import '../../ticket.css'

/**
 * "Deneyimlerim" — gezginin biletleri.
 *
 * İki bölüm: yaklaşan (bilet canlı) ve geçmiş (bilet kullanılmış).
 * Faz 5'te gerçek rezervasyon verisine bağlanacak; şu an demo veri.
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
  const [{ lang }, tickets] = await Promise.all([
    params,
    Promise.all(
      DEMO_TICKETS.map(async (ticket) => ({ ticket, qrMarkup: await qrSvg(ticket) })),
    ),
  ])
  const t = await getTranslator(lang)

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

        <section className="mt-10" aria-labelledby="yaklasan">
          <h2 id="yaklasan" className="mb-5 text-sm font-semibold text-fg-muted">
            {t('myExperiences.upcoming', { sayi: upcoming.length })}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {upcoming.map(({ ticket, qrMarkup }) => (
              <div key={ticket.code}>
                <TicketCard ticket={ticket} qrMarkup={qrMarkup} lang={lang} t={t} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <GlassButton variant="primary" size="sm" href={pdfHref(lang, ticket.code)}>
                    {t('myExperiences.downloadPdf')}
                  </GlassButton>
                  {/* disabled: hiçbir şey yapmayan ama basma geri bildirimi veren
                      buton, yanındaki gerçek butondan ayırt edilemiyordu. Bilet
                      ekranı ödeme yapmış kullanıcının güven sınadığı yer. */}
                  <GlassButton size="sm" disabled title={t('myExperiences.wallet.soon')}>
                    {t('myExperiences.wallet')}
                  </GlassButton>
                </div>
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
                  <GlassButton size="sm" href={pdfHref(lang, ticket.code)}>
                    {t('myExperiences.downloadPdf')}
                  </GlassButton>
                  {/* "Değerlendir" sistemin fiili; kullanıcı puan verir. */}
                  <GlassButton size="sm" disabled title={t('myExperiences.rate.soon')}>
                    {t('myExperiences.rate')}
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        </section>
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
function pdfHref(lang: string, code: string): string {
  return `/api/bilet/${code}/pdf?${UI_LANGUAGE_FIELD}=${encodeURIComponent(lang)}`
}

/**
 * Bilet istemci bileşeni (eğim efekti için); metin ve biçimlenmiş değerler
 * SUNUCUDA hazırlanıp prop olarak iniyor. Değerlerin hiçbiri istemcide
 * değişmiyor, dolayısıyla şablon taşımaya gerek yok.
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
        amount: formatMoney(lang, ticket.totalAmount, ticket.currency),
        startsAt: formatLocalDateTime(lang, ticket),
      }}
    />
  )
}

/** "Prag, Çekya" → "Prag". Konum host'un yazdığı İÇERİK, çevrilmiyor. */
function cityOf(ticket: Ticket): string {
  return ticket.location.split(',')[0] ?? ticket.location
}
