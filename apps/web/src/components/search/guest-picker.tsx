'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * Misafir seçici — Booking tarzı açılır panel, artı/eksi sayaçlarla.
 *
 * Otel değil deneyim satıyoruz: "oda" yok. Ayrım yetişkin/çocuk, çünkü
 * deneyimlerde çocuk fiyatı yaygın ve kapasite kişi bazlı sayılıyor
 * (docs/ROADMAP.md 5.1 — fiyat hesabı sunucuda, burası sadece niyet).
 *
 * Değer gizli input'larla forma yazılır: JS kapalıyken bile arama, panelde
 * seçilmemiş varsayılanla (2 yetişkin) çalışmaya devam eder.
 */

const MAX_ADULTS = 20
const MAX_CHILDREN = 10

type GuestPickerProps = {
  defaultAdults?: number
  defaultChildren?: number
}

export function GuestPicker({ defaultAdults = 2, defaultChildren = 0 }: GuestPickerProps) {
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
        <span className="search-field-label">Misafirler</span>
        <span className="search-field-value">{summarize(adults, children)}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Misafir sayısı"
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
            label="Yetişkin"
            hint="13 yaş ve üzeri"
            value={adults}
            min={1}
            max={MAX_ADULTS}
            onChange={setAdults}
          />

          <div className="my-3 h-px bg-[var(--glass-border)]" />

          <Counter
            label="Çocuk"
            hint="0-12 yaş"
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
            className="mt-4 w-full rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-[rgb(var(--glass-tint)_/_0.35)] focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-2"
          >
            Tamam
          </button>
        </div>
      ) : null}
    </div>
  )
}

type CounterProps = {
  label: string
  hint: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}

function Counter({ label, hint, value, min, max, onChange }: CounterProps) {
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
          label={`${label} sayısını azalt`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </StepButton>

        {/*
          Sayı canlı bölge: ekran okuyucu butona basınca yeni değeri duyurur.
          Sadece butonun aria-label'ı okunursa kullanıcı kaçta kaldığını bilemez.
        */}
        <output aria-labelledby={labelId} aria-live="polite" className="w-6 text-center text-sm font-semibold tabular-nums">
          {value}
        </output>

        <StepButton
          label={`${label} sayısını artır`}
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] text-lg leading-none transition-all duration-200 hover:border-brand-400 hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[var(--glass-border)] disabled:hover:text-inherit focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  )
}

/** "2 yetişkin, 1 çocuk" — çocuk yoksa yazılmaz, gürültü olur. */
function summarize(adults: number, children: number): string {
  const parts = [`${adults} yetişkin`]
  if (children > 0) {
    parts.push(`${children} çocuk`)
  }
  return parts.join(', ')
}
