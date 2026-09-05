import { useId } from 'react'

/**
 * Expyra mark — kırmızı squircle, beyaz E barları, üstte 3D gloss.
 * E barları her zaman solid `#fff` (currentColor / shadow ile ezilmesin).
 */
export function ExpyraMark({ className = 'size-8' }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  const clip = `expyra-clip-${uid}`
  const gloss = `expyra-gloss-${uid}`

  return (
    <svg
      className={['shrink-0 overflow-visible', className].join(' ')}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      // currentColor miras almasın — barlar her temada beyaz kalsın
      color="#ffffff"
    >
      <defs>
        <clipPath id={clip}>
          <rect width="512" height="512" rx="128" />
        </clipPath>
        <linearGradient id={gloss} x1="256" y1="8" x2="256" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffb0a4" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#ff6b5a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fb3324" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <rect width="512" height="512" fill="#fb3324" />
        <ellipse cx="256" cy="8" rx="240" ry="88" fill={`url(#${gloss})`} />
        <path
          d="M128 14c40-10 216-10 256 0 18 4 34 14 46 28H82c12-14 28-24 46-28Z"
          fill="#ffffff"
          opacity="0.35"
        />

        {/*
          Beyaz E (orijinal):
          - ust: sol-alt keskin, sol-ust yuvarlak; sag yuvarlak
          - orta: tam capsule
          - alt: sol-ust keskin, sol-alt yuvarlak; sag yuvarlak
        */}
        <path
          fill="#ffffff"
          style={{ fill: '#ffffff' }}
          d="M108 176h267a29 29 0 0 0 0-58h-238a29 29 0 0 0-29 29V176Z"
        />
        <path
          fill="#ffffff"
          style={{ fill: '#ffffff' }}
          d="M137 227h142a29 29 0 0 1 0 58h-142a29 29 0 0 1 0-58Z"
        />
        <path
          fill="#ffffff"
          style={{ fill: '#ffffff' }}
          d="M108 336h267a29 29 0 0 1 0 58h-238a29 29 0 0 1-29-29V336Z"
        />
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
      {/* text-on-media gölgesi SVG barlarını karartmasın */}
      <span className="inline-flex [filter:none] [text-shadow:none]">
        <ExpyraMark className="size-[2.125rem]" />
      </span>
      {!markOnly && (
        <span className="text-[1.25rem] font-extrabold tracking-[-0.03em]">Expyra</span>
      )}
    </>
  )

  const classes = [
    'inline-flex items-center gap-2.5 whitespace-nowrap transition-opacity duration-300 hover:opacity-90',
    /* Varsayılan kelime markası MARKA RENGİNDE (tasarım): kağıt üstünde mürekkep
       renginde bir "Expyra" logo değil başlık gibi okunuyordu. `--brand-ink`
       koyu temada açılıyor. */
    className || 'text-[var(--brand-ink)]',
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
