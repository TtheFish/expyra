'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { GlassButton } from '@/components/ui/glass-button'
import { boundaryLocaleOf, boundaryMessages } from '@/features/i18n/boundary'
import { path } from '@/lib/routes'

/**
 * Beklenmeyen hata sınırı — bu dil segmentinin altındaki her sayfayı sarar.
 * (Layout'un kendisi patlarsa buraya gelmez; onun karşılığı `app/global-error.tsx`.)
 *
 * **Kullanıcıya teknik detay gösterilmiyor.** Sunucu hataları React tarafından
 * zaten maskeleniyor (`error.message` üretimde jenerik); onu ekrana basmak
 * kullanıcıya hiçbir şey anlatmaz, istemci hatalarında ise iç ayrıntı sızdırır.
 * Ekrana çıkan tek teknik alan `digest`: kullanıcının bize söyleyebileceği,
 * sunucu logundaki satırla eşleşen bir referans. Onsuz "bir şeyler ters gitti"
 * raporunun karşılığı bulunamıyor.
 *
 * Hata YUTULMUYOR (CLAUDE.md #1): `console.error` ile görünür kalıyor. Faz 20'de
 * burası hata takip servisine bağlanacak.
 *
 * Metin `features/i18n/boundary`'den: hata sınırları Client Component olmak
 * ZORUNDA (Next 16 sözleşmesi) ve sunucu ebeveynleri yok, yani sözlük buraya
 * prop olarak inemiyor. Gerekçe ve bedeli o dosyada.
 */

type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  /**
   * `unstable_retry` (Next 16.2) içeriği yeniden ÇEKİP render ediyor; `reset`
   * yalnız hata durumunu temizliyor. Sunucuda kaynaklanan bir hatada aynı veriyle
   * yeniden render etmek aynı hatayı verir — bu yüzden varsa retry tercih ediliyor.
   * Prop hâlâ `unstable_` öneki taşıdığı için opsiyonel: kaybolursa derleme kırılmaz,
   * davranış `reset`e düşer.
   */
  reset: () => void
  unstable_retry?: () => void
}

export default function ErrorBoundary({ error, reset, unstable_retry }: ErrorBoundaryProps) {
  const lang = boundaryLocaleOf(usePathname())
  const messages = boundaryMessages[lang].error

  useEffect(() => {
    console.error('page.render.failed', error)
  }, [error])

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <div className="glass glass-edge glass-thick rounded-[var(--radius-glass-lg)] p-8 text-center sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">{messages.title}</h1>

        <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-fg-muted">
          {messages.lede}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <GlassButton variant="primary" onClick={() => (unstable_retry ?? reset)()}>
            {messages.retry}
          </GlassButton>
          <GlassButton href={path(lang, 'home')}>{messages.home}</GlassButton>
        </div>

        {error.digest && (
          <p className="mt-6 text-[0.6875rem] text-fg-muted">
            {messages.reference}{' '}
            <span className="font-mono tracking-[0.08em]">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  )
}
