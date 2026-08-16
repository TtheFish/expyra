import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/brand-logo'
import { GlassButton } from '@/components/ui/glass-button'
import { alternateLinks, path } from '@/lib/routes'

export function generateMetadata(): Metadata {
  return {
    title: 'Giriş · Expyra',
    alternates: { languages: alternateLinks('signIn') },
  }
}

export default async function SignInPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-30 px-4 pt-4">
        <div className="glass glass-edge glass-nav mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-4">
          <BrandLogo className="text-white text-on-media" href={path(lang, 'home')} />
          <GlassButton variant="ghost" size="sm" href={path(lang, 'home')} className="text-nav-link">
            Geri
          </GlassButton>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <div className="glass glass-edge p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Giriş</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Kimlik doğrulama henüz hazır değil (Faz 1). Bu ekran şimdilik yer tutucu —
            giriş akışı eklendiğinde buradan devam edeceksin.
          </p>
          <div className="mt-8">
            <GlassButton variant="primary" size="md" href={path(lang, 'home')} className="w-full">
              Ana sayfaya dön
            </GlassButton>
          </div>
        </div>
      </main>
    </div>
  )
}
