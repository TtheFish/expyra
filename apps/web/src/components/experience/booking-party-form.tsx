'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import {
  ADULTS_PARAM,
  CHILDREN_PARAM,
  CURRENCY_PARAM,
  INFANTS_PARAM,
  MAX_PARTY_PER_TIER,
  SLOT_PARAM,
  type PartySelection,
} from '@/features/experiences/booking-params'
import type { GuestQuote } from '@/features/experiences/guest-quote'
import { formatMinorMoney } from '@/features/i18n/format'

export type BookingQuoteLabels = {
  adults: string
  children: string
  infants: string
  currency: string
  currencyNone: string
  continue: string
  pickDateFirst: string
  pickDateHint: string
  total: string
  displayTotal: string
  chargedIn: string
  quoteFailed: string
}

type CurrencyOption = { code: string; symbol: string | null }

/**
 * Kişi / para birimi + canlı teklif. Sayfa yenilenmez: her değişimde BFF
 * üzerinden sunucu teklifi çekilir. "Ödemeye geç" checkout'a GET eder.
 */
export function BookingPartyForm({
  lang,
  slug,
  checkoutAction,
  slotId,
  initialParty,
  initialCurrency,
  initialQuote,
  currencies,
  labels,
}: {
  lang: string
  slug: string
  checkoutAction: string
  slotId: string | null
  initialParty: PartySelection
  initialCurrency: string | null
  initialQuote: GuestQuote | null
  currencies: CurrencyOption[]
  labels: BookingQuoteLabels
}) {
  const [party, setParty] = useState(initialParty)
  const [currency, setCurrency] = useState(initialCurrency ?? '')
  const [quote, setQuote] = useState<GuestQuote | null>(initialQuote)
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const skipInitialFetch = useRef(true)

  const loadQuote = useEffectEvent(async (next: PartySelection, nextCurrency: string) => {
    abortRef.current?.abort()

    if (!slotId) {
      setQuote(null)
      setFailed(false)
      setPending(false)
      return
    }

    if (next.adults + next.children + next.infants < 1) {
      setQuote(null)
      setFailed(false)
      setPending(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setPending(true)

    const params = new URLSearchParams({
      [SLOT_PARAM]: slotId,
      [ADULTS_PARAM]: String(next.adults),
      [CHILDREN_PARAM]: String(next.children),
      [INFANTS_PARAM]: String(next.infants),
    })
    if (nextCurrency) params.set(CURRENCY_PARAM, nextCurrency)

    try {
      const response = await fetch(
        `/api/deneyimler/${encodeURIComponent(slug)}/teklif?${params.toString()}`,
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        },
      )

      if (controller.signal.aborted) return

      if (!response.ok) {
        // Önceki özeti yerinde bırak — blok kaybolmasın.
        setFailed(true)
        return
      }

      const body = (await response.json()) as GuestQuote
      if (controller.signal.aborted) return

      // Bayat yanıtı yazma: istek sırasında kişi değişmiş olabilir.
      if (!quoteMatchesParty(body, next)) return

      setQuote(body)
      setFailed(false)
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      setFailed(true)
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  })

  // Seans değişince üst bileşen `key={slotId}` ile remount eder; ilk mount'ta
  // SSR teklifi zaten state'te. Sonraki kişi/para değişiminde canlı çek.
  useEffect(() => {
    if (!slotId) return

    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }

    const timer = window.setTimeout(() => {
      void loadQuote(party, currency)
    }, 200)

    return () => {
      window.clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [party, currency, slotId])

  function setTier(key: keyof PartySelection, raw: string) {
    const parsed = Number(raw)
    const value =
      Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_PARTY_PER_TIER ? parsed : 0
    setParty((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="mt-5">
      <form action={checkoutAction} className="grid gap-3 sm:grid-cols-4">
        {slotId ? <input type="hidden" name={SLOT_PARAM} value={slotId} /> : null}

        <PartyField
          id="yetiskin"
          name={ADULTS_PARAM}
          label={labels.adults}
          value={party.adults}
          onChange={(value) => setTier('adults', value)}
        />
        <PartyField
          id="cocuk"
          name={CHILDREN_PARAM}
          label={labels.children}
          value={party.children}
          onChange={(value) => setTier('children', value)}
        />
        <PartyField
          id="bebek"
          name={INFANTS_PARAM}
          label={labels.infants}
          value={party.infants}
          onChange={(value) => setTier('infants', value)}
        />

        <div>
          <label className="auth-label" htmlFor="para">
            {labels.currency}
          </label>
          <select
            id="para"
            name={CURRENCY_PARAM}
            className="auth-input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            <option value="">{labels.currencyNone}</option>
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.symbol ? `${item.code} (${item.symbol})` : item.code}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <GlassButton
            type="submit"
            size="sm"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={!slotId}
          >
            {slotId ? labels.continue : labels.pickDateFirst}
          </GlassButton>
        </div>
      </form>

      {!slotId ? <p className="mt-3 text-sm text-fg-muted">{labels.pickDateHint}</p> : null}

      {/*
        Özet blokta kalır: kişi değişince unmount yok, yalnız rakamlar
        yeni teklifle değişir. opacity ile flash da yok.
      */}
      {quote ? <QuoteSummary lang={lang} quote={quote} labels={labels} /> : null}

      {slotId && !quote && failed && !pending ? (
        <p className="mt-4 text-sm text-fg-muted" role="status">
          {labels.quoteFailed}
        </p>
      ) : null}
    </div>
  )
}

function quoteMatchesParty(quote: GuestQuote, party: PartySelection): boolean {
  return (
    lineCount(quote, 'adult') === party.adults &&
    lineCount(quote, 'child') === party.children &&
    lineCount(quote, 'infant') === party.infants
  )
}

function lineCount(quote: GuestQuote, guestType: string): number {
  return quote.lines.find((line) => line.guestType === guestType)?.count ?? 0
}

function PartyField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_PARTY_PER_TIER}
        className="auth-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // Odakliyken tekerlek sayıyı kaydırıyordu; özet bir adım geride kalıyordu.
        onWheel={(event) => event.currentTarget.blur()}
      />
    </div>
  )
}

function QuoteSummary({
  lang,
  quote,
  labels,
}: {
  lang: string
  quote: GuestQuote
  labels: BookingQuoteLabels
}) {
  return (
    <div className="mt-5 border-t border-[var(--line)] pt-4">
      <ul className="grid gap-1 text-sm">
        {quote.lines.map((line) => (
          <li key={line.guestType} className="flex justify-between gap-4">
            <span className="text-fg-muted">
              {guestLabel(labels, line.guestType)} × {line.count}
            </span>
            <span>
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

      <p className="mt-3 flex justify-between gap-4 text-base font-semibold">
        <span>{labels.total}</span>
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
        <p className="mt-1 text-sm text-fg-muted">
          {labels.displayTotal.replace(
            '{tutar}',
            formatMinorMoney(
              lang,
              quote.display.amountMinor,
              quote.display.currency,
              quote.display.minorUnits,
            ),
          )}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-fg-muted">
        {labels.chargedIn.replace('{paraBirimi}', quote.charge.currency)}
      </p>
    </div>
  )
}

function guestLabel(labels: BookingQuoteLabels, guestType: string): string {
  switch (guestType) {
    case 'adult':
      return labels.adults
    case 'child':
      return labels.children
    default:
      return labels.infants
  }
}
