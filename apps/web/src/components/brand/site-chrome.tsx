'use client'

import type { ReactNode } from 'react'
import { HeroWallpaper, type WallpaperLabels } from '@/components/brand/hero-wallpaper'

/**
 * Tüm sayfalarda ortak video duvar kağıdı + içerik katmanı.
 * Duvar kağıdı layout'ta yaşar; sekme değişince unmount olmaz.
 *
 * `labels` buradan GEÇİYOR ama burada üretilmiyor: bu bir istemci bileşeni ve
 * sözlük `server-only`. Metinleri layout çözüp veriyor (docs/I18N.md §5).
 */
export function SiteChrome({
  children,
  wallpaperLabels,
}: {
  children: ReactNode
  wallpaperLabels: WallpaperLabels
}) {
  return (
    <>
      <HeroWallpaper labels={wallpaperLabels} />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
    </>
  )
}
