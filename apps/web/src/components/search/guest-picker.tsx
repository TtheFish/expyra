'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { PluralTemplates } from '@/features/i18n/dictionary'
import { formatPlural, interpolate } from '@/features/i18n/format'

/**
 * Misafir seçici — Booking tarzı açılır panel, artı/eksi sayaçlarla.
 *
 * Otel değil deneyim satıyoruz: "oda" yok. Ayrım yetişkin/çocuk, çünkü
 * deneyimlerde çocuk fiyatı yaygın ve kapasite kişi bazlı sayılıyor
 * (docs/ROADMAP.md 5.1 — fiyat hesabı sunucuda, burası sadece niyet).
 *
 * Değer gizli input'larla forma yazılır: JS kapalıyken bile arama, panelde
 * seçilmemiş varsayılanla (2 yetişkin) çalışmaya devam eder.
 *
 * ## Metin: etiketler hazır, özet ŞABLON
 *
 * Sabit etiketler sunucuda çözülüp `labels` ile iniyor — bu repodaki istemci
 * bileşenlerinin kuralı (bkz. `site-header.tsx`). Tetikleyicideki özet ise
 * ("2 yetişkin, 1 çocuk") istisna: sayıyı +/− düğmeleri değiştiriyor, sayfa
 * yenilenmiyor, dolayısıyla metni sunucu YAZAMIYOR.
 *
 * Bu yüzden özet için çoğul BİÇİM TABLOSU geliyor (`getPluralTemplates`) ve
 * çekimi `formatPlural` istemcide seçiyor. Elle "s" eklemek çözüm değildi:
 * İngilizce'de "1 child" / "2 children", Rusça'da dört biçim var. Tarayıcıya
 * inen şey yine sözlük değil, iki anahtarın birkaç dizgesi.
 */

const MAX_ADULTS = 20
const MAX_CHILDREN = 10

export type GuestPickerLabels = {
  trigger: string
  dialog: string
  done: string
  adults: string
  adultsHint: string
  /** Sayaç düğmelerinin `aria-label`'ı — tam cümle, parçadan kurulmuyor. */
  adultsDecrease: string
  adultsIncrease: string
  children: string
  childrenHint: string
  childrenDecrease: string
  childrenIncrease: string
  /** İki parçayı birleştiren şablon: ayırıcı ve sıra çevirmenin elinde. */
  summaryBoth: string
}

export type GuestPickerSummaryForms = {
  adults: PluralTemplates
  children: PluralTemplates
}

type GuestPickerProps = {
  /** Çoğul biçimini ve sayı yazımını seçen dil. */
  lang: string
  labels: GuestPickerLabels
  summaryForms: GuestPickerSummaryForms
  defaultAdults?: number
  defaultChildren?: number
}

export function GuestPicker({
  lang,
  labels,
  summaryForms,
  defaultAdults = 2,
  defaultChildren = 0,
}: GuestPickerProps) {
  const [adults, setAdults] = useState(defaultAdults)
  const [children, setChildren] = useState(defaultChildren)
  const [open, setOpen] = useState(false)

  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Escape sonrası odak tetikleyiciye döner — panelde kaybolmasın.
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="yetiskin" value={adults} />
      <input type="hidden" name="cocuk" value={children} />

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="search-field w-full text-left"
      >
        <span className="search-field-label">{labels.trigger}</span>
        <span className="search-field-value">
          {summarize(lang, labels, summaryForms, adults, children)}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={labels.dialog}
          /*
            Panelin arkası OPAK. Cam malzeme yüzeyler için doğru ama okunacak bir
            listenin arkasında video akarken "13 yaş ve üzeri" satırı arkadaki
            butonun metniyle karışıyor — kontrast AA'nın altına düşüyor.
            CLAUDE.md'nin kuralı bu: kontrast düşerse örtü artırılır, metin rengi değişmez.
          */
          style={{ backgroundColor: 'color-mix(in oklch, var(--bg) 97%, transparent)' }}
          /* `end-0` (RTL), telefonda viewport'a sabit. `shadow-lg` YOK: .glass'ın
             üç katmanlı gölgesini eziyor ve panel zeminden ayrılamıyor. */
          className="glass glass-edge fixed inset-x-4 top-[4.25rem] z-30 rounded-[var(--radius-glass)] p-4 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[20rem]"
        >
          <Counter
            lang={lang}
            label={labels.adults}
            hint={labels.adultsHint}
            decreaseLabel={labels.adultsDecrease}
            increaseLabel={labels.adultsIncrease}
            value={adults}
            min={1}
            max={MAX_ADULTS}
            onChange={setAdults}
          />

          <div className="my-3 h-px bg-[var(--glass-border)]" />

          <Counter
            lang={lang}
            label={labels.children}
            hint={labels.childrenHint}
            decreaseLabel={labels.childrenDecrease}
            increaseLabel={labels.childrenIncrease}
            value={children}
            min={0}
            max={MAX_CHILDREN}
            onChange={setChildren}
          />

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              triggerRef.current?.focus()
            }}
            className="mt-4 w-full rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-[rgb(var(--glass-tint)_/_0.35)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
          >
            {labels.done}
          </button>
        </div>
      ) : null}
    </div>
  )
}

type CounterProps = {
  lang: string
  label: string
  hint: string
  decreaseLabel: string
  increaseLabel: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}

function Counter({
  lang,
  label,
  hint,
  decreaseLabel,
  increaseLabel,
  value,
  min,
  max,
  onChange,
}: CounterProps) {
  const labelId = useId()

  return (
    <div className="flex items-center justify-between gap-4">
      <span>
        <span id={labelId} className="block text-sm font-medium">
          {label}
        </span>
        <span className="block text-xs text-fg-muted">{hint}</span>
      </span>

      <span className="flex items-center gap-3">
        <StepButton
          label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </StepButton>

        {/*
          Sayı canlı bölge: ekran okuyucu butona basınca yeni değeri duyurur.
          Sadece butonun aria-label'ı okunursa kullanıcı kaçta kaldığını bilemez.
          Rakamlar da dile bağlı — Arapça arayüzde "٥" beklenir.
        */}
        <output
          aria-labelledby={labelId}
          aria-live="polite"
          className="w-6 text-center text-sm font-semibold tabular-nums"
        >
          {new Intl.NumberFormat(lang).format(value)}
        </output>

        <StepButton
          label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </StepButton>
      </span>
    </div>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] text-lg leading-none transition-all duration-200 hover:border-brand-400 hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--glass-border)] disabled:hover:text-inherit focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
    >
      {children}
    </button>
  )
}

/**
 * "2 yetişkin, 1 çocuk" — çocuk yoksa yazılmaz, gürültü olur.
 *
 * İki parçanın birleşimi de bir ŞABLON (`summaryBoth`): burada `join(', ')`
 * yazmak, ayırıcıyı ve sırayı Türkçe'ye sabitlemek olurdu.
 */
function summarize(
  lang: string,
  labels: GuestPickerLabels,
  forms: GuestPickerSummaryForms,
  adults: number,
  children: number,
): string {
  const adultsText = formatPlural(lang, forms.adults, adults)
  if (children === 0) return adultsText

  return interpolate(lang, labels.summaryBoth, {
    yetiskin: adultsText,
    cocuk: formatPlural(lang, forms.children, children),
  })
}
