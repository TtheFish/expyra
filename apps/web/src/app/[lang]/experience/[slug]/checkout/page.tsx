import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { experienceCoverStyle } from '@/components/experience/experience-card'
import { CheckoutPaymentForm } from '@/components/checkout/checkout-payment-form'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import {
  bookingQuery,
  currencyFrom,
  partyFrom,
  slotFrom,
} from '@/features/experiences/booking-params'
import {
  experienceCheckoutPath,
  experiencePath,
  fetchExperience,
  fetchQuote,
  type GuestQuote,
} from '@/features/experiences/api'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
import { formatMinorMoney, formatWallClock } from '@/features/i18n/format'
import { getTranslator } from '@/features/i18n/translator'
import { path } from '@/lib/routes'

/**
 * Onay ve ödeme — Airbnb tarzı iki kolon.
 *
 * Blok 9 (rezervasyon) ve Blok 11 (ödeme) henüz yok: sayfa quote API'sinden
 * fiyatı okuyor, yöntem seçimi ve onay SAHTE. Gerçek kart çekimi / booking
 * satırı o bloklarda bağlanacak; UI sözleşmesi şimdiden oturuyor.
 */

type PageParams = Promise<{ lang: string; slug: string }>

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    title: `${t('checkout.title')} · Expyra`,
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ lang, slug }, query] = await Promise.all([params, searchParams])
  const t = await getTranslator(lang)

  const session = await getSession()
  const here = experienceCheckoutPath(lang, slug, new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => {
      const single = Array.isArray(value) ? value[0] : value
      return single === undefined ? [] : [[key, single]]
    }),
  ).toString())

  if (!session?.accessToken) {
    redirect(`${path(lang, 'signIn')}?${RETURN_TO_PARAM}=${encodeURIComponent(here)}`)
  }

  const party = partyFrom(query)
  const slotId = slotFrom(query)
  const displayCurrency = currencyFrom(query)

  if (!slotId || party.adults + party.children + party.infants < 1) {
    redirect(experiencePath(lang, slug))
  }

  const experience = await fetchExperience(slug, lang)
  if (!experience) notFound()

  let quote: GuestQuote
  try {
    quote = await fetchQuote({
      slug: experience.slug,
      slotId,
      ...party,
      currency: displayCurrency,
    })
  } catch {
    redirect(`${experiencePath(lang, experience.slug)}?${bookingQuery({ ...party, slotId, currency: displayCurrency })}`)
  }

  const cover = experience.images[0] ?? experience.cover
  const changeHref = `${experiencePath(lang, experience.slug)}?${bookingQuery({
    ...party,
    slotId,
    currency: displayCurrency,
  })}`

  const endsLocal = wallClockPlusMinutes(quote.startsAtLocal, experience.durationMinutes)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 sm:px-10 sm:py-12">
        <a
          href={changeHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          <span aria-hidden="true">←</span>
          {t('checkout.back')}
        </a>

        <h1 className="mt-4 text-[1.75rem] font-extrabold tracking-[-0.03em] sm:text-[2rem]">
          {t('checkout.title')}
        </h1>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <CheckoutPaymentForm
            homeHref={path(lang, 'myExperiences')}
            labels={{
              heading: t('checkout.payment.heading'),
              card: t('checkout.payment.card'),
              bank: t('checkout.payment.bank'),
              google: t('checkout.payment.google'),
              apple: t('checkout.payment.apple'),
              bankSelect: t('checkout.payment.bankSelect'),
              terms: t('checkout.payment.terms'),
              submit: t('checkout.payment.submit'),
              submitting: t('checkout.payment.submitting'),
              demoNote: t('checkout.payment.demoNote'),
              successTitle: t('checkout.success.title'),
              successBody: t('checkout.success.body'),
              backHome: t('checkout.success.back'),
            }}
          />

          <aside className="surface-lifted order-first p-5 lg:order-none lg:sticky lg:top-24">
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              {cover ? (
                <div className="relative aspect-square overflow-hidden rounded-[0.85rem]">
                  <Image src={cover.url} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ) : (
                <div
                  className="aspect-square rounded-[0.85rem]"
                  style={experienceCoverStyle(experience.slug)}
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-bold" lang={experience.text.language}>
                  {experience.text.title}
                </p>
                <p className="mt-1 text-xs text-fg-muted">★ 4,84</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-fg-muted">{t('checkout.summary.nonRefundable')}</p>

            <dl className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <dt className="font-bold">{t('checkout.summary.date')}</dt>
                  <dd className="mt-1 text-fg-muted">
                    {formatWallClock(lang, quote.startsAtLocal, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {', '}
                    {formatWallClock(lang, quote.startsAtLocal, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    –
                    {formatWallClock(lang, endsLocal, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-[var(--line)] pt-4">
                <div>
                  <dt className="font-bold">{t('checkout.summary.guests')}</dt>
                  <dd className="mt-1 text-fg-muted">{guestSummary(t, party)}</dd>
                </div>
                <a
                  href={changeHref}
                  className="shrink-0 text-sm font-bold underline-offset-4 hover:underline"
                >
                  {t('checkout.summary.change')}
                </a>
              </div>
            </dl>

            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <p className="text-sm font-bold">{t('checkout.summary.priceDetails')}</p>
              <ul className="mt-3 grid gap-2 text-sm">
                {quote.lines.map((line) => (
                  <li key={line.guestType} className="flex justify-between gap-4">
                    <span className="text-fg-muted">
                      {formatMinorMoney(
                        lang,
                        line.unitAmountMinor,
                        quote.charge.currency,
                        quote.charge.minorUnits,
                      )}{' '}
                      × {line.count} {t(guestTypeKey(line.guestType))}
                    </span>
                    <span className="font-semibold">
                      {formatMinorMoney(
                        lang,
                        line.lineTotalMinor,
                        quote.charge.currency,
                        quote.charge.minorUnits,
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 flex justify-between gap-4 border-t border-[var(--line)] pt-4 text-[1.0625rem] font-extrabold">
                <span>
                  {t('checkout.summary.total', { paraBirimi: quote.charge.currency })}
                </span>
                <span>
                  {formatMinorMoney(
                    lang,
                    quote.charge.amountMinor,
                    quote.charge.currency,
                    quote.charge.minorUnits,
                  )}
                </span>
              </p>

              {quote.display ? (
                <p className="mt-2 text-sm text-fg-muted">
                  {t('experience.detail.booking.displayTotal', {
                    tutar: formatMinorMoney(
                      lang,
                      quote.display.amountMinor,
                      quote.display.currency,
                      quote.display.minorUnits,
                    ),
                  })}
                </p>
              ) : null}

              <p className="mt-3 text-xs text-fg-muted">
                {t('experience.detail.booking.chargedIn', { paraBirimi: quote.charge.currency })}
              </p>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

function guestSummary(
  t: Translate,
  party: { adults: number; children: number; infants: number },
): string {
  const parts: string[] = []
  if (party.adults > 0) {
    parts.push(`${party.adults} ${t('experience.detail.booking.adults').toLocaleLowerCase()}`)
  }
  if (party.children > 0) {
    parts.push(`${party.children} ${t('experience.detail.booking.children').toLocaleLowerCase()}`)
  }
  if (party.infants > 0) {
    parts.push(`${party.infants} ${t('experience.detail.booking.infants').toLocaleLowerCase()}`)
  }
  return parts.join(', ')
}

function guestTypeKey(guestType: string): SimpleMessageKey {
  switch (guestType) {
    case 'adult':
      return 'experience.detail.booking.adults'
    case 'child':
      return 'experience.detail.booking.children'
    default:
      return 'experience.detail.booking.infants'
  }
}

function wallClockPlusMinutes(startsAtLocal: string, durationMinutes: number): string {
  const [datePart, timePart = '00:00'] = startsAtLocal.split('T')
  const [hourText = '0', minuteText = '0'] = timePart.split(':')
  const total = Number(hourText) * 60 + Number(minuteText) + durationMinutes
  const hours = Math.floor(total / 60) % 24
  const minutes = ((total % 60) + 60) % 60

  return `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
