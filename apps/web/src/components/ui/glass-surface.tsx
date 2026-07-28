'use client'

import { useRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react'

/**
 * Cam malzemenin temel yüzeyi. Panel, kart, nav — hepsi bunun üzerine kurulur.
 *
 * `sheen` açıkken imleç konumunu CSS değişkenine yazar; parlama imleci takip eder.
 * Bunu JS'siz yapmanın yolu yok — ama tek iş bir CSS custom property güncellemek,
 * React state'i yok, bu yüzden yeniden render tetiklemiyor.
 */

type GlassTone = 'default' | 'thick' | 'brand'

type GlassSurfaceProps<T extends ElementType> = {
  as?: T
  tone?: GlassTone
  interactive?: boolean
  sheen?: boolean
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

const toneClass: Record<GlassTone, string> = {
  default: '',
  thick: 'glass-thick',
  brand: 'glass-brand',
}

export function GlassSurface<T extends ElementType = 'div'>({
  as,
  tone = 'default',
  interactive = false,
  sheen = false,
  className = '',
  children,
  ...rest
}: GlassSurfaceProps<T>) {
  const Component = (as ?? 'div') as ElementType
  const ref = useRef<HTMLElement>(null)

  const handlePointerMove = sheen
    ? (event: React.PointerEvent<HTMLElement>) => {
        const node = ref.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        node.style.setProperty('--mx', `${event.clientX - rect.left}px`)
        node.style.setProperty('--my', `${event.clientY - rect.top}px`)
      }
    : undefined

  const classes = [
    'glass glass-edge',
    toneClass[tone],
    interactive ? 'glass-interactive' : '',
    sheen ? 'glass-sheen' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component ref={ref} className={classes} onPointerMove={handlePointerMove} {...rest}>
      {children}
    </Component>
  )
}
