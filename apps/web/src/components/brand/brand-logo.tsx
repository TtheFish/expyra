import { useId } from 'react'

/**
 * Expyra mark — kırmızı squircle içinde üç bar (E).
 *
 * Renkler marka rampasından geliyor, ham hex değil: logo ile birincil butonlar
 * farklı kırmızılara kaymasın. Rampa `globals.css` `@theme` içinde tanımlı ve
 * temadan bağımsız, yani mark her iki temada aynı.
 *
 * `id`ler `useId` ile üretiliyor — aynı sayfada iki mark varsa (nav + footer)
 * sabit bir id ikinci gradyanı birincinin tanımına bağlar.
 */
export function ExpyraMark({ className = 'size-7' }: { className?: string }) {
  const gradientId = `expyra-mark-${useId()}`

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-brand-400)" />
          <stop offset="1" stopColor="var(--color-brand-600)" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />

      {/*
        Oranlar referans mark'tan ölçüldü: bar kalınlığı ≈ aralık (5.4'e 4.9).
        Aralığı daraltmak kutuyu doldurup markı hamburger menüsüne çeviriyor —
        aradaki boşluk bu logoda barlar kadar taşıyıcı. Üstte ve altta 11 birim
        boşluk kalıyor, yani mark kutuya sıkışmıyor.
      */}
      <g fill="white">
        <rect x="11" y="11" width="26" height="5.4" rx="2.7" />
        <rect x="11" y="21.3" width="26" height="5.4" rx="2.7" />
        <rect x="11" y="31.6" width="26" height="5.4" rx="2.7" />
      </g>
    </svg>
  )
}

type BrandLogoProps = {
  className?: string
  href?: string
  markOnly?: boolean
}

export function BrandLogo({ className = '', href = '/', markOnly = false }: BrandLogoProps) {
  const inner = (
    <>
      <ExpyraMark className="size-7 shrink-0" />
      {!markOnly && (
        <span className="text-[1.05rem] font-semibold tracking-tight">Expyra</span>
      )}
    </>
  )

  const classes = [
    'inline-flex items-center gap-2.5 transition-opacity duration-300 hover:opacity-90',
    className || 'text-fg',
  ].join(' ')

  if (href) {
    return (
      <a href={href} className={classes} aria-label="Expyra ana sayfa">
        {inner}
      </a>
    )
  }

  return <span className={classes}>{inner}</span>
}
