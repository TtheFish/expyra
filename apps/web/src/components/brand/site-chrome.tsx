import type { ReactNode } from 'react'

/**
 * Sayfa kabuğu. **Duvar kağıdı ARTIK BURADA DEĞİL**: eskiden tüm sayfanın
 * arkasında sabit bir video vardı ve her ekran onun üstünde okunuyordu. Yeni
 * tasarımda sayfa düz beyaz kağıt; video yalnız ana sayfanın hero kartında
 * (`HeroWallpaper`, `app/[lang]/page.tsx`).
 *
 * Bileşen bir sarmalayıcıya indi ama SİLİNMEDİ: layout'un tek çocuğu olması
 * `min-h-dvh` + `flex-col` düzenini tek yerde tutuyor ve sayfa başına
 * kopyalanmasını engelliyor. İstemci bileşeni olması da gerekmiyor artık.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return <div className="relative flex min-h-dvh flex-col">{children}</div>
}
