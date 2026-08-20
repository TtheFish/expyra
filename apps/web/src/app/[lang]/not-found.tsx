'use client'

import { usePathname } from 'next/navigation'
import { ExpyraMark } from '@/components/brand/brand-logo'
import { GlassButton } from '@/components/ui/glass-button'
import { defaultRouteLanguage, isRoutableLanguage, path } from '@/lib/routes'

/**
 * 404 — bu dil segmentinin altında eşleşmeyen her yol buraya düşer.
 *
 * **Neden Client Component:** `not-found.tsx` prop almıyor (Next 16 API'si), yani
 * `params.lang`'a erişemiyor. Next 16 `unstable_rootParams`'ı da kaldırdı. Dili
 * bilmeden link üretilemez — `/en/...`'den gelen kullanıcıyı Türkçe sayfaya atmak
 * 404'ün üstüne bir de dilini kaybettirmek olur. Kalan tek kaynak yol; onu yalnız
 * `usePathname` veriyor.
 *
 * `SiteHeader`/`SiteFooter` bilinçli olarak yok: 404 sayfasının işi kullanıcıyı
 * bir yere göndermek, tam bir sayfa iskeleti kurmak değil. Header oturum okuduğu
 * için burada ayrıca gereksiz bir dinamik sınır açardı.
 */

const messages = {
  title: 'Bu sayfa yok',
  lede: 'Bağlantı eskimiş olabilir ya da adres yanlış yazılmış olabilir. Aradığın deneyim hâlâ burada olabilir — keşfetmeyi dene.',
  explore: 'Deneyimleri keşfet',
  home: 'Ana sayfaya dön',
  /** Ekran okuyucu için: rakam yığını değil, ne olduğunun adı. */
  code: 'Hata 404 · sayfa bulunamadı',
} as const

export default function NotFound() {
  const pathname = usePathname()

  // Yol `/tr/...` biçiminde. Tanımadığımız bir segment gelirse (ör. `/xx/...`)
  // varsayılan dile düşüyoruz: 404 ekranında ikinci bir 404 üretmenin anlamı yok.
  const segment = pathname.split('/')[1] ?? ''
  const lang = isRoutableLanguage(segment) ? segment : defaultRouteLanguage

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <div className="glass glass-edge glass-thick rounded-[var(--radius-glass-lg)] p-8 text-center sm:p-10">
        <ExpyraMark className="mx-auto size-10" />

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-fg-muted">
          <span className="sr-only">{messages.code}</span>
          <span aria-hidden="true">404</span>
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{messages.title}</h1>

        <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-fg-muted">
          {messages.lede}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <GlassButton variant="primary" href={path(lang, 'explore')}>
            {messages.explore}
          </GlassButton>
          <GlassButton href={path(lang, 'home')}>{messages.home}</GlassButton>
        </div>
      </div>
    </main>
  )
}
