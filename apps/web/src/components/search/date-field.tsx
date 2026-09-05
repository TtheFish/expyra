'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

/**
 * Tarih alanı — iOS / kilit tekerleği tarzı üç sütunlu seçici.
 *
 * Her sütunda yukarı/aşağı ok + kaydırma. Değer değişince mekanik "tik" sesi.
 * Forma giden değer `yyyy-mm-dd` (`name="tarih"`).
 */

const ITEM_H = 40
const VISIBLE = 5
const PAD = Math.floor(VISIBLE / 2)
const YEAR_SPAN = 5

export type DateFieldLabels = {
  field: string
  placeholder: string
  dialog: string
  day: string
  month: string
  year: string
  done: string
  clear: string
  /** `{alan}` = Gün / Ay / Yıl */
  stepUp: string
  stepDown: string
}

type DateFieldProps = {
  lang: string
  labels: DateFieldLabels
  defaultValue?: string
}

type Parts = { year: number; month: number; day: number }

export function DateField({ lang, labels, defaultValue = '' }: DateFieldProps) {
  const initial = parseIso(defaultValue) ?? todayParts()
  const [open, setOpen] = useState(false)
  const [rawParts, setParts] = useState<Parts>(initial)
  const [committed, setCommitted] = useState<string | null>(
    defaultValue && parseIso(defaultValue) ? defaultValue : null,
  )

  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const years = useMemo(() => {
    const y = todayParts().year
    return range(y, y + YEAR_SPAN)
  }, [])

  const daysInMonth = daysIn(rawParts.year, rawParts.month)
  const days = useMemo(() => range(1, daysInMonth), [daysInMonth])
  const months = useMemo(() => range(1, 12), [])

  // 31 Ocak → Şubat: gün ayın sınırına ÇİZİM SIRASINDA kırpılıyor, effect'te
  // setState ile değil (react-hooks/set-state-in-effect; fazladan bir render
  // ve bir kare boyunca geçersiz tarih). Durum ham kalıyor, türetilen değer
  // her yerde `parts`.
  const parts: Parts = rawParts.day > daysInMonth ? { ...rawParts, day: daysInMonth } : rawParts

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
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const columns = useMemo(() => columnOrder(lang), [lang])
  const monthNames = useMemo(() => monthLabels(lang), [lang])

  const display = committed ? formatDisplay(lang, committed) : labels.placeholder

  const commit = () => {
    setCommitted(toIso(parts))
    setOpen(false)
    triggerRef.current?.focus()
  }

  const clear = () => {
    setCommitted(null)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const openPanel = () => {
    void unlockAudio()
    if (committed) {
      const parsed = parseIso(committed)
      if (parsed) setParts(parsed)
    }
    setOpen((v) => !v)
  }

  const stepLabel = (column: string, dir: 'up' | 'down') =>
    (dir === 'up' ? labels.stepUp : labels.stepDown).replace('{alan}', column)

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="tarih" value={committed ?? ''} />

      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        aria-expanded={open}
        aria-controls={panelId}
        className="search-field w-full cursor-pointer text-left"
      >
        <span className="search-field-label">{labels.field}</span>
        <span
          className={`search-field-value ${committed ? '' : 'font-medium text-fg-muted'}`}
        >
          {display}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={labels.dialog}
          className="surface-lifted fixed inset-x-4 top-[4.25rem] z-30 rounded-[var(--radius-glass)] p-3 sm:absolute sm:inset-x-auto sm:start-0 sm:top-full sm:mt-2 sm:w-[22rem]"
        >
          <div className="date-wheel-columns">
            {columns.map((col) => {
              if (col === 'day') {
                return (
                  <Wheel
                    key="day"
                    label={labels.day}
                    stepUpLabel={stepLabel(labels.day, 'up')}
                    stepDownLabel={stepLabel(labels.day, 'down')}
                    values={days}
                    value={Math.min(parts.day, daysInMonth)}
                    format={(n) => formatNum(lang, n)}
                    onChange={(day) => setParts((p) => ({ ...p, day }))}
                  />
                )
              }
              if (col === 'month') {
                return (
                  <Wheel
                    key="month"
                    label={labels.month}
                    stepUpLabel={stepLabel(labels.month, 'up')}
                    stepDownLabel={stepLabel(labels.month, 'down')}
                    values={months}
                    value={parts.month}
                    format={(n) => monthNames[n - 1] ?? String(n)}
                    onChange={(month) => setParts((p) => ({ ...p, month }))}
                  />
                )
              }
              return (
                <Wheel
                  key="year"
                  label={labels.year}
                  stepUpLabel={stepLabel(labels.year, 'up')}
                  stepDownLabel={stepLabel(labels.year, 'down')}
                  values={years}
                  value={clamp(parts.year, years[0]!, years[years.length - 1]!)}
                  format={(n) => formatNum(lang, n)}
                  onChange={(year) => setParts((p) => ({ ...p, year }))}
                />
              )
            })}
          </div>

          <div className="mt-3 flex gap-2">
            {committed ? (
              <button
                type="button"
                onClick={clear}
                className="flex-1 cursor-pointer rounded-[var(--radius-glass-sm)] border border-[var(--line)] px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-[color-mix(in_oklch,var(--fg)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
              >
                {labels.clear}
              </button>
            ) : null}
            <button
              type="button"
              onClick={commit}
              className="glass-brand flex-[1.4] cursor-pointer rounded-[var(--radius-glass-sm)] px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
            >
              {labels.done}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Wheel({
  label,
  stepUpLabel,
  stepDownLabel,
  values,
  value,
  format,
  onChange,
}: {
  label: string
  stepUpLabel: string
  stepDownLabel: string
  values: number[]
  value: number
  format: (n: number) => string
  onChange: (n: number) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const lastIdx = useRef(-1)
  const suppressTick = useRef(true)
  const wheelAcc = useRef(0)
  const labelId = useId()

  const indexOf = useCallback(
    (v: number) => {
      const i = values.indexOf(v)
      return i < 0 ? 0 : i
    },
    [values],
  )

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: index * ITEM_H, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const selectIndex = useCallback(
    (index: number, { tick, smooth }: { tick: boolean; smooth: boolean }) => {
      const next = values[index]
      if (next === undefined) return
      lastIdx.current = index
      if (tick) playTick()
      if (next !== value) onChange(next)
      scrollToIndex(index, smooth)
    },
    [onChange, scrollToIndex, value, values],
  )

  const step = (delta: number) => {
    void unlockAudio()
    const idx = indexOf(value)
    const next = clamp(idx + delta, 0, values.length - 1)
    if (next === idx) return
    selectIndex(next, { tick: true, smooth: true })
  }

  // Dışarıdan değer değişince (ay günü kırpma / ok) sessizce hizala.
  useEffect(() => {
    const idx = indexOf(value)
    suppressTick.current = true
    lastIdx.current = idx
    // Panel yeni açıldığında layout otursun diye rAF.
    const id = requestAnimationFrame(() => {
      scrollToIndex(idx, false)
      window.setTimeout(() => {
        suppressTick.current = false
      }, 120)
    })
    return () => cancelAnimationFrame(id)
  }, [value, values, indexOf, scrollToIndex])

  // Masaüstünde tekerlek: serbest scroll yerine net adım — "aşağı inemiyorum"
  // hissini keser; her adımda tik.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      void unlockAudio()

      wheelAcc.current += event.deltaY
      const threshold = 24
      if (Math.abs(wheelAcc.current) < threshold) return

      const dir = wheelAcc.current > 0 ? 1 : -1
      wheelAcc.current = 0
      const idx = clamp(lastIdx.current + dir, 0, values.length - 1)
      if (idx === lastIdx.current) return
      selectIndex(idx, { tick: true, smooth: true })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [selectIndex, values.length])

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el || suppressTick.current) return
    const idx = clamp(Math.round(el.scrollTop / ITEM_H), 0, values.length - 1)
    if (idx === lastIdx.current) return
    lastIdx.current = idx
    playTick()
    const next = values[idx]
    if (next !== undefined && next !== value) onChange(next)
  }

  const atStart = indexOf(value) <= 0
  const atEnd = indexOf(value) >= values.length - 1

  return (
    <div className="date-wheel-col">
      <span id={labelId} className="date-wheel-col-label">
        {label}
      </span>

      <StepArrow
        direction="up"
        label={stepUpLabel}
        disabled={atStart}
        onClick={() => step(-1)}
      />

      <div className="date-wheel">
        <div className="date-wheel-highlight" aria-hidden="true" />
        <div className="date-wheel-fade date-wheel-fade-top" aria-hidden="true" />
        <div className="date-wheel-fade date-wheel-fade-bottom" aria-hidden="true" />

        <div
          ref={scrollerRef}
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={`${labelId}-${value}`}
          tabIndex={0}
          className="date-wheel-scroller"
          onScroll={onScroll}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              step(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              step(-1)
            }
          }}
        >
          <div style={{ height: PAD * ITEM_H }} aria-hidden="true" />
          {values.map((n) => {
            const selected = n === value
            return (
              <div
                key={n}
                id={`${labelId}-${n}`}
                role="option"
                aria-selected={selected}
                className={`date-wheel-item ${selected ? 'is-selected' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  void unlockAudio()
                  const idx = values.indexOf(n)
                  if (idx < 0) return
                  selectIndex(idx, { tick: n !== value, smooth: true })
                }}
              >
                {format(n)}
              </div>
            )
          })}
          <div style={{ height: PAD * ITEM_H }} aria-hidden="true" />
        </div>
      </div>

      <StepArrow
        direction="down"
        label={stepDownLabel}
        disabled={atEnd}
        onClick={() => step(1)}
      />
    </div>
  )
}

function StepArrow({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: 'up' | 'down'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="date-wheel-arrow"
    >
      <svg viewBox="0 0 20 12" width="14" height="9" aria-hidden="true">
        {direction === 'up' ? (
          <path
            d="M2 10 L10 2 L18 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M2 2 L10 10 L18 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  )
}

/* --- ses ----------------------------------------------------------------- */

let audioCtx: AudioContext | null = null
let audioUnlocking: Promise<void> | null = null

async function unlockAudio() {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return

  audioCtx ??= new Ctx()
  if (audioCtx.state === 'running') return

  audioUnlocking ??= audioCtx.resume().finally(() => {
    audioUnlocking = null
  })
  await audioUnlocking
}

function playTick() {
  if (typeof window === 'undefined') return

  void unlockAudio().then(() => {
    const ctx = audioCtx
    if (!ctx || ctx.state !== 'running') return

    const t0 = ctx.currentTime
    // Sürtünmeli makine tıklığı: tiz bandpass gürültü + çok hafif gövde.
    const noise = ctx.createBufferSource()
    noise.buffer = mechanicalClickBuffer(ctx)

    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.setValueAtTime(2800, t0)
    band.Q.setValueAtTime(2.2, t0)

    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.setValueAtTime(900, t0)

    const tip = ctx.createOscillator()
    tip.type = 'triangle'
    tip.frequency.setValueAtTime(3200, t0)
    tip.frequency.exponentialRampToValueAtTime(1100, t0 + 0.018)

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.0001, t0)
    noiseGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.0012)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022)

    const tipGain = ctx.createGain()
    tipGain.gain.setValueAtTime(0.0001, t0)
    tipGain.gain.exponentialRampToValueAtTime(0.04, t0 + 0.0008)
    tipGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02)

    noise.connect(high)
    high.connect(band)
    band.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    tip.connect(tipGain)
    tipGain.connect(ctx.destination)

    noise.start(t0)
    noise.stop(t0 + 0.028)
    tip.start(t0)
    tip.stop(t0 + 0.025)
  })
}

/** Tek sefer üretilip yeniden kullanılan kısa noise buffer. */
let clickNoise: AudioBuffer | null = null

function mechanicalClickBuffer(ctx: AudioContext): AudioBuffer {
  if (clickNoise && clickNoise.sampleRate === ctx.sampleRate) return clickNoise

  const duration = 0.035
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    // Zarflı beyaz gürültü — başta sert, çabuk sönen mekanik tık.
    const env = Math.pow(1 - i / length, 2.4)
    data[i] = (Math.random() * 2 - 1) * env
  }
  clickNoise = buffer
  return buffer
}

/* --- yardımcılar --------------------------------------------------------- */

function todayParts(): Parts {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

function parseIso(value: string): Parts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [ys, ms, ds] = value.split('-')
  const year = Number(ys)
  const month = Number(ms)
  const day = Number(ds)
  if (!year || !month || !day) return null
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null
  return { year, month, day }
}

function toIso({ year, month, day }: Parts): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let n = from; n <= to; n++) out.push(n)
  return out
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function formatNum(lang: string, n: number): string {
  return new Intl.NumberFormat(lang, { useGrouping: false }).format(n)
}

function formatDisplay(lang: string, iso: string): string {
  const parts = parseIso(iso)
  if (!parts) return iso
  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(parts.year, parts.month - 1, parts.day))
}

function monthLabels(lang: string): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { month: 'short' })
  return Array.from({ length: 12 }, (_, i) =>
    fmt.format(new Date(2024, i, 1)).replace(/\.$/, ''),
  )
}

type Col = 'day' | 'month' | 'year'

function columnOrder(lang: string): Col[] {
  const parts = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(2024, 0, 2))

  const order: Col[] = []
  for (const part of parts) {
    if (part.type === 'day') order.push('day')
    if (part.type === 'month') order.push('month')
    if (part.type === 'year') order.push('year')
  }
  return order.length === 3 ? order : ['day', 'month', 'year']
}
