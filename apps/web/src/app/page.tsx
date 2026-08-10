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
  },
  {
    title: 'Vltava Kıyısında Fotoğraf Turu',
    location: 'Prag, Çekya',
    price: '€35',
    rating: '4.8',
    duration: '2 saat',
  },
  {
    title: 'Ev Yapımı Pasta Atölyesi',
    location: 'Lizbon, Portekiz',
    price: '€62',
    rating: '5.0',
    duration: '4 saat',
  },
]

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-10 px-4 pt-4">
        <div className="glass glass-edge glass-thick mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-5">
          <span className="font-semibold tracking-tight">Expyra</span>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Ana menü">
            <GlassButton variant="ghost" size="sm" href="/">Keşfet</GlassButton>
            <GlassButton variant="ghost" size="sm" href="/deneyimlerim">Deneyimlerim</GlassButton>
            <GlassButton variant="ghost" size="sm" href="/host">Host ol</GlassButton>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <GlassButton variant="primary" size="sm" href="/giris">Giriş yap</GlassButton>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:py-24">
        <section className="mb-16 text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Yerel deneyimleri
            <br />
            keşfetmenin yeni yolu
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-fg-muted sm:text-lg">
            Şehri en iyi bilenlerden. Küçük gruplar, gerçek insanlar,
            unutulmayan birkaç saat.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <GlassButton variant="primary" size="lg" href="/#ornek-deneyimler">
              Deneyimleri gör
            </GlassButton>
            <GlassButton size="lg" href="/nasil-calisir">Nasıl çalışır?</GlassButton>
          </div>
        </section>

        <section id="ornek-deneyimler" aria-labelledby="ornek-deneyimler-baslik">
          <h2 id="ornek-deneyimler-baslik" className="sr-only">Örnek deneyimler</h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((item) => (
              <article
                key={item.title}
                className="glass glass-edge overflow-hidden rounded-[var(--radius-glass-lg)]"
              >
                <div
                  className="h-40 w-full bg-[linear-gradient(160deg,oklch(0.55_0.02_260_/_0.35),oklch(0.35_0.02_260_/_0.45))]"
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

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--glass-border)] px-1 py-4 text-xs text-fg-muted">
          <span>Expyra</span>
          <span className="font-mono">Faz 0 · iskelet</span>
        </div>
      </footer>
    </div>
  )
}
