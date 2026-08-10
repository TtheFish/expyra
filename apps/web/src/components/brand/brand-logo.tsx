/**
 * Expyra mark — keşif / konum hissi: yumuşak pin + ufuk yayı.
 * Nav için SVG; PNG seçenekleri /public/brand altında.
 */
export function ExpyraMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" fill="#FF3B2F" />
      <path
        d="M24 10.5c-6.2 0-11.2 4.9-11.2 11 0 7.4 8.4 15.2 10.5 17a1 1 0 0 0 1.4 0c2.1-1.8 10.5-9.6 10.5-17 0-6.1-5-11-11.2-11Z"
        fill="white"
        fillOpacity="0.96"
      />
      <circle cx="24" cy="21" r="4.2" fill="#FF3B2F" />
      <path
        d="M15 34.5c2.8 1.6 6.1 2.5 9 2.5s6.2-.9 9-2.5"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
    'inline-flex items-center gap-2.5 text-fg transition-opacity duration-300 hover:opacity-90',
    className,
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
