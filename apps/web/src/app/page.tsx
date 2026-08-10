import { BrandLogo } from '@/components/brand/brand-logo'
import { GlassButton } from '@/components/ui/glass-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/**
 * GEÇİCİ ANA SAYFA — tasarım sisteminin canlı vitrini.
 * Faz 4'te gerçek ana sayfa ile değişecek.
 */

const experiences = [
  {
    title: 'Boğaz’da Gün Batımı Yelkeni',
    location: 'İstanbul, Türkiye',
    price: '€48',
    rating: '4.9',
    duration: '3 saat',
    tone: 'oklch(0.62 0.14 40)',
  },
  {
    title: 'Vltava Kıyısında Fotoğraf Turu',
    location: 'Prag, Çekya',
    price: '€35',
    rating: '4.8',
    duration: '2 saat',
    tone: 'oklch(0.55 0.10 230)',
  },
  {
    title: 'Ev Yapımı Pasta Atölyesi',
    location: 'Lizbon, Portekiz',
    price: '€62',
    rating: '5.0',
    duration: '4 saat',
    tone: 'oklch(0.58 0.12 20)',
  },
]

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-10 px-4 pt-4">
        <div className="glass glass-edge glass-nav mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-4">
          <BrandLogo className="text-white text-on-media" />

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Ana menü">
            <GlassButton variant="ghost" size="sm" href="/" className="text-nav-link">
              Keşfet
            </GlassButton>
            <GlassButton variant="ghost" size="sm" href="/deneyimlerim" className="text-nav-link">
              Deneyimlerim
            </GlassButton>
            <GlassButton variant="ghost" size="sm" href="/host" className="text-nav-link">
              Host ol
            </GlassButton>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <GlassButton variant="primary" size="sm" href="/giris">Giriş yap</GlassButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:py-24">
        <section className="mb-16 text-center">
          <h1 className="text-on-media text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Yerel deneyimleri
            <br />
            <span className="text-gradient-brand">keşfetmenin yeni yolu</span>
          </h1>

          <p className="text-on-media mx-auto mt-5 max-w-xl text-pretty text-base text-white/90 sm:text-lg">
            Şehri en iyi bilenlerden. Küçük gruplar, gerçek insanlar,
            unutulmayan birkaç saat.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <GlassButton variant="primary" size="lg" href="/#ornek-deneyimler">
              Deneyimleri gör
            </GlassButton>
            <GlassButton size="lg" href="/nasil-calisir" className="!bg-[rgb(12_14_20_/_0.55)] !text-white">
              Nasıl çalışır?
            </GlassButton>
          </div>
        </section>

        <section id="ornek-deneyimler" aria-labelledby="ornek-deneyimler-baslik">
          <h2 id="ornek-deneyimler-baslik" className="sr-only">Örnek deneyimler</h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((item) => (
              <article
                key={item.title}
                className="glass glass-edge glass-interactive overflow-hidden rounded-[var(--radius-glass-lg)]"
              >
                <div
                  className="h-40 w-full"
                  style={{
                    background: `linear-gradient(145deg, ${item.tone}, color-mix(in oklch, ${item.tone} 40%, black))`,
                  }}
                  aria-hidden="true"
                />

                <div className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-fg-muted">{item.location}</span>
                    <span className="text-xs font-medium text-fg-muted">★ {item.rating}</span>
                  </div>

                  <h3 className="text-base font-semibold leading-snug">{item.title}</h3>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-lg font-semibold">
                      {item.price}
                      <span className="ml-1 text-xs font-normal text-fg-muted">/ kişi</span>
                    </span>
                    <span className="text-xs text-fg-muted">{item.duration}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--glass-border)] px-1 py-4 text-xs text-fg-muted">
          <span className="font-semibold tracking-tight text-fg">Expyra</span>
          <span className="font-mono">Faz 0 · iskelet</span>
        </div>
      </footer>
    </div>
  )
}
