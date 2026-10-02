'use client'

import { useId, useMemo, useState } from 'react'
import {
  contentLanguages,
  localNameOf,
  searchLanguages,
  type Language,
} from '@/lib/languages'

/**
 * Arayüz çevirisi olmayan içerik dilleri — arama + çerez.
 * UI dilleri sunucu `<a>` ile çalışır; bu ada geç yüklenirse bile dil değişimi bozulmaz.
 */

const COOKIE_NAME = 'expyra_lang'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function LanguageContentPicker({
  current,
  labels,
}: {
  current: string
  labels: {
    searchLabel: string
    searchPlaceholder: string
    contentGroup: string
    contentHint: string
    empty: string
  }
}) {
  const [selected, setSelected] = useState(current)
  const [query, setQuery] = useState('')
  const inputId = useId()

  const matches = useMemo(
    () =>
      searchLanguages(contentLanguages, query, selected).filter((item) => !item.uiAvailable),
    [query, selected],
  )

  const choose = (language: Language) => {
    setSelected(language.code)
    writeLanguageCookie(language.code)
  }

  return (
    <section className="mb-0 border-t border-[var(--line)] pt-2">
      <h3 className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {labels.contentGroup}
      </h3>
      <p className="px-2 pb-2 text-xs text-fg-muted">{labels.contentHint}</p>

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

      {/*
        Nested overflow-y YOK: max-h + scroll satırı ortasından kesince koyu
        hover/zemin "uçan kutu" gibi duruyordu (Yunanca satırı). Panel tek
        scroll; satırlar tam kalsın.
      */}
      <ul className="space-y-0.5">
        {matches.map((language) => {
          const localName = localNameOf(language.code, selected) ?? language.englishName
          const isSelected = language.code === selected

          return (
            <li key={language.code}>
              <button
                type="button"
                onClick={() => choose(language)}
                aria-current={isSelected ? 'true' : undefined}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-glass-sm)] px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[-2px]"
              >
                <span className="min-w-0">
                  <span lang={language.code} className="block truncate font-medium">
                    {language.nativeName}
                  </span>
                  <span className="block truncate text-xs text-fg-muted">{localName}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs uppercase text-fg-muted">{language.code}</span>
                  <span aria-hidden="true" className={isSelected ? 'text-brand-400' : 'opacity-0'}>
                    ✓
                  </span>
                </span>
              </button>
            </li>
          )
        })}

        {matches.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-fg-muted">{labels.empty}</li>
        ) : null}
      </ul>
    </section>
  )
}

function writeLanguageCookie(code: string) {
  globalThis.document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}
