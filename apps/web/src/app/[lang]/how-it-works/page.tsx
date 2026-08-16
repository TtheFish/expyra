import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/brand-logo'
import { GlassButton } from '@/components/ui/glass-button'
import { alternateLinks, path } from '@/lib/routes'

export function generateMetadata(): Metadata {
  return {
    title: 'Nasıl çalışır? · Expyra',
    alternates: { languages: alternateLinks('howItWorks') },
  }
}

const steps = [
  {
    title: 'Keşfet',
    body: 'Şehrindeki yerel deneyimlere göz at. Küçük gruplar, gerçek hostlar.',
  },
  {
    title: 'Rezerve et',
    body: 'Tarih seç, yerini ayırt. Biletin anında cebinde.',
  },
  {
    title: 'Katıl',
    body: 'Girişte host QR kodunu okutur. Deneyimin başlar.',
  },
]

export default async function HowItWorksPage({ params }: { params: Promise<{ lang: string }> }) {
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

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <h1 className="text-on-media text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Nasıl çalışır?
        </h1>
        <p className="text-on-media mt-3 max-w-lg text-white/85">
          Üç adım. Faz 0 iskelet — akışın özeti burada.
        </p>

        <ol className="mt-12 space-y-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="glass glass-edge flex gap-5 p-6">
                <span className="font-mono text-sm text-fg-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="font-semibold">{step.title}</h2>
                  <p className="mt-1 text-sm text-fg-muted">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <GlassButton variant="primary" size="md" href={path(lang, 'explore')}>
            Keşfe dön
          </GlassButton>
        </div>
      </main>
    </div>
  )
}
