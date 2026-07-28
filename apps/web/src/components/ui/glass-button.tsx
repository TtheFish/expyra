'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { GlassSurface } from './glass-surface'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type GlassButtonProps = {
  variant?: Variant
  size?: Size
} & ComponentPropsWithoutRef<'button'>

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-[var(--radius-glass-sm)]',
  md: 'h-11 px-5 text-[0.9375rem] rounded-[var(--radius-glass)]',
  lg: 'h-13 px-7 text-base rounded-[var(--radius-glass-lg)]',
}

export function GlassButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: GlassButtonProps) {
  if (variant === 'ghost') {
    return (
      <button
        className={[
          'inline-flex items-center justify-center font-medium',
          'text-fg-muted hover:text-fg transition-colors duration-300',
          'focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-3',
          sizeClass[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {children}
      </button>
    )
  }

  return (
    <GlassSurface
      as="button"
      tone={variant === 'primary' ? 'brand' : 'default'}
      interactive
      sheen
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeClass[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </GlassSurface>
  )
}
