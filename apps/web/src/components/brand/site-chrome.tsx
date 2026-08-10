'use client'

import type { ReactNode } from 'react'
import { HeroWallpaper } from '@/components/brand/hero-wallpaper'

/**
 * Tüm sayfalarda ortak video wallpaper + içerik katmanı.
 * Wallpaper layout'ta yaşar; tab değişince unmount olmaz.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <HeroWallpaper />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
    </>
  )
}
