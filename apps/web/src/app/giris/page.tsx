import { GlassButton } from '@/components/ui/glass-button'

export const metadata = {
  title: 'Giriş · Expyra',
}

/**
 * Kimlik doğrulama Faz 1'de geliyor. Bu sayfa butonun boş kalmaması için
 * geçici bir hedef; gerçek login akışı eklendiğinde burası değişir.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-10 px-4 pt-4">
        <div className="glass glass-edge glass-thick mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-5">
          <GlassButton variant="ghost" size="sm" href="/" className="!px-0 font-semibold !text-fg">
            Expyra
          </GlassButton>
          <GlassButton variant="ghost" size="sm" href="/">Geri</GlassButton>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <div className="glass glass-edge p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Giriş</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Kimlik doğrulama henüz hazır değil (Faz 1). Bu ekran şimdilik yer tutucu —
            giriş akışı eklendiğinde buradan devam edeceksin.
          </p>
          <div className="mt-8">
            <GlassButton variant="primary" size="md" href="/" className="w-full">
              Ana sayfaya dön
            </GlassButton>
          </div>
        </div>
      </main>
    </div>
  )
}
