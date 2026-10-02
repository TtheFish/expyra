import { LanguageContentPicker } from '@/components/i18n/language-content-picker'
import { interpolate } from '@/features/i18n/format'
import {
  findLanguage,
  localNameOf,
  uiLanguages,
} from '@/lib/languages'
import { switchLanguage } from '@/lib/routes'

/**
 * Dil seçici — sunucu HTML + native `<details>` + gerçek `<a>`.
 *
 * Arayüz dili değiştirmek JS/hidrasyon BEKLEMEZ: tıklanınca tarayıcı gider.
 * İçerik dili araması ayrı küçük istemci adası (`LanguageContentPicker`).
 */

export type LanguagePickerLabels = {
  trigger: string
  dialog: string
  searchLabel: string
  searchPlaceholder: string
  uiGroup: string
  contentGroup: string
  contentHint: string
  empty: string
}

export function LanguagePicker({
  current,
  pathname,
  labels,
}: {
  current: string
  /** `pathname + search` — dil değişince sorgu korunsun. */
  pathname: string
  labels: LanguagePickerLabels
}) {
  const pathOnly = pathname.split('?')[0] || `/${current}`
  const search = pathname.includes('?') ? pathname.slice(pathname.indexOf('?')) : ''
  const currentLanguage = findLanguage(current)

  return (
    <details className="relative z-50">
      <summary
        aria-label={interpolate(current, labels.trigger, {
          dil: currentLanguage?.nativeName ?? current,
        })}
        className="glass glass-edge glass-interactive inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-glass-sm)] px-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">🌐</span>
        <span className="uppercase">{current}</span>
      </summary>

      <div
        role="dialog"
        aria-label={labels.dialog}
        className="surface-lifted fixed inset-x-4 top-[4.25rem] z-50 flex max-h-[min(26rem,calc(100dvh-5rem))] flex-col overflow-y-auto rounded-[var(--radius-glass)] p-3 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[22rem]"
      >
        <section className="mb-2">
          <h3 className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {labels.uiGroup}
          </h3>
          <ul className="space-y-0.5">
            {uiLanguages.map((language) => {
              const href = switchLanguage(pathOnly, language.code) + search
              const selected = language.code === current
              const localName =
                localNameOf(language.code, current) ?? language.englishName

              return (
                <li key={language.code}>
                  <a
                    href={href}
                    hrefLang={language.code}
                    aria-current={selected ? 'true' : undefined}
                    className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-glass-sm)] px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-[-2px]"
                  >
                    <span className="min-w-0">
                      <span lang={language.code} className="block truncate font-medium">
                        {language.nativeName}
                      </span>
                      <span className="block truncate text-xs text-fg-muted">{localName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs uppercase text-fg-muted">
                        {language.code}
                      </span>
                      <span
                        aria-hidden="true"
                        className={selected ? 'text-brand-400' : 'opacity-0'}
                      >
                        ✓
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>

        <LanguageContentPicker
          current={current}
          labels={{
            searchLabel: labels.searchLabel,
            searchPlaceholder: labels.searchPlaceholder,
            contentGroup: labels.contentGroup,
            contentHint: labels.contentHint,
            empty: labels.empty,
          }}
        />
      </div>
    </details>
  )
}
