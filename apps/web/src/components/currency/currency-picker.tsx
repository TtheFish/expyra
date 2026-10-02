'use client'

import { useId, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  writeCurrencyCookie,
  normalizeCurrencyCode,
} from '@/features/currency/preference'
import type { CurrencyOption } from '@/features/host/experiences-api'
import { interpolate } from '@/features/i18n/format'

/**
 * Görüntüleme para birimi seçici — header'da dil/tema yanında.
 *
 * Tercih çerezde; seçimden sonra `router.refresh()` ile sunucu bileşenleri
 * (vitrin, keşfet, detay) yeni `?currency=` ile yeniden çekilir.
 */

export type CurrencyPickerLabels = {
  trigger: string
  dialog: string
  searchLabel: string
  searchPlaceholder: string
  none: string
  empty: string
}

export function CurrencyPicker({
  lang,
  current,
  currencies,
  labels,
}: {
  lang: string
  /** Seçili kod veya `null` (host para birimi). */
  current: string | null
  currencies: readonly CurrencyOption[]
  labels: CurrencyPickerLabels
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const inputId = useId()
  const selected = normalizeCurrencyCode(current)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return currencies

    return currencies.filter((item) => {
      const code = item.code.toLowerCase()
      const name = item.englishName.toLowerCase()
      const symbol = (item.symbol ?? '').toLowerCase()
      return code.includes(needle) || name.includes(needle) || symbol.includes(needle)
    })
  }, [currencies, query])

  const choose = (code: string | null) => {
    writeCurrencyCookie(code)
    startTransition(() => {
      router.refresh()
    })
  }

  const triggerLabel = interpolate(lang, labels.trigger, {
    para: selected ?? labels.none,
  })

  return (
    <details className="relative z-50">
      <summary
        aria-label={triggerLabel}
        className="glass glass-edge glass-interactive inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-glass-sm)] px-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">¤</span>
        <span className="uppercase">{selected ?? '—'}</span>
      </summary>

      <div
        role="dialog"
        aria-label={labels.dialog}
        aria-busy={pending || undefined}
        className="surface-lifted fixed inset-x-4 top-[4.25rem] z-50 flex max-h-[min(26rem,calc(100dvh-5rem))] flex-col overflow-y-auto rounded-[var(--radius-glass)] p-3 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[18rem]"
      >
        <label className="sr-only" htmlFor={inputId}>
          {labels.searchLabel}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          autoComplete="off"
          className="mb-2 w-full rounded-[var(--radius-glass-sm)] border border-[var(--line)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        />

        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              onClick={() => choose(null)}
              aria-current={selected === null ? 'true' : undefined}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-glass-sm)] px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[-2px]"
            >
              <span className="min-w-0 truncate font-medium">{labels.none}</span>
              <span
                aria-hidden="true"
                className={selected === null ? 'text-brand-400' : 'opacity-0'}
              >
                ✓
              </span>
            </button>
          </li>

          {matches.map((currency) => {
            const isSelected = currency.code === selected

            return (
              <li key={currency.code}>
                <button
                  type="button"
                  onClick={() => choose(currency.code)}
                  aria-current={isSelected ? 'true' : undefined}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-glass-sm)] px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[-2px]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {currency.code}
                      {currency.symbol ? ` · ${currency.symbol}` : ''}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">
                      {currency.englishName}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={isSelected ? 'text-brand-400' : 'opacity-0'}
                  >
                    ✓
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {matches.length === 0 && (
          <p className="px-2 py-3 text-sm text-fg-muted">{labels.empty}</p>
        )}
      </div>
    </details>
  )
}
