'use client'

import type { ComponentPropsWithoutRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type GlassButtonProps = {
  variant?: Variant
  size?: Size
  href?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  type?: ComponentPropsWithoutRef<'button'>['type']
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-[var(--radius-glass-sm)]',
  md: 'h-11 px-5 text-[0.9375rem] rounded-[var(--radius-glass)]',
  lg: 'h-13 px-7 text-base rounded-[var(--radius-glass-lg)]',
}

function classesFor(variant: Variant, size: Size, className: string) {
  if (variant === 'ghost') {
    // Renk BURADA verilmiyor: varyantın yazdığı `text-fg-muted`, çağıranın
    // `className`'iyle aynı özgüllükte olduğu için sıralamaya göre kazanıp
    // kaybediyordu — koyu nav barında linkler gri kalıyor, hover'da büsbütün
    // kayboluyordu. Renk çağıranın kararı; `glass-nav` içinde --fg/--fg-muted
    // zaten bara göre yeniden tanımlı.
    return [
      'inline-flex items-center justify-center font-medium',
      'transition-colors duration-300',
      'focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-3',
      sizeClass[size],
      className,
    ].join(' ')
  }

  return [
    'glass glass-edge glass-interactive inline-flex items-center justify-center gap-2 font-medium',
    'disabled:opacity-50 disabled:pointer-events-none',
    variant === 'primary' ? 'glass-brand' : 'hover:brightness-110',
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * href verilince düz <a> kullanıyoruz. Next <Link> soft-nav hydration
 * bozulunca (ör. eklenti attribute enjekte edince) tıklamayı yutabiliyor;
 * native anchor her zaman gider.
 */
export function GlassButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  href,
  type = 'button',
  ...rest
}: GlassButtonProps) {
  const classNameResolved = classesFor(variant, size, className)

  if (href) {
    return (
      <a href={href} className={classNameResolved}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classNameResolved} {...rest}>
      {children}
    </button>
  )
}
