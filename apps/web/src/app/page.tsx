import { BrandLogo } from '@/components/brand/brand-logo'
import { ExperienceCard } from '@/components/experience/experience-card'
import { LanguagePicker } from '@/components/i18n/language-picker'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { experiences } from '@/lib/experiences'
import { defaultLanguage } from '@/lib/languages'

/**
 * GEÇİCİ ANA SAYFA — tasarım sisteminin canlı vitrini.
 * Faz 4'te gerçek ana sayfa ile değişecek.
 */

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* z-30: nav'daki açılır paneller (dil seçici) main'in üstünde çizilmeli.
          Header ve main aynı z-10'daysa DOM'da sonra gelen main kazanır. */}
      <header className="relative z-30 px-4 pt-4">
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
            <LanguagePicker current={defaultLanguage} />
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

          <ExperienceSearch className="mt-9" />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <GlassButton size="lg" href="/nasil-calisir" className="!bg-[rgb(12_14_20_/_0.55)] !text-white">
              Nasıl çalışır?
            </GlassButton>
          </div>
        </section>

        <section id="ornek-deneyimler" aria-labelledby="ornek-deneyimler-baslik">
          <h2 id="ornek-deneyimler-baslik" className="sr-only">Örnek deneyimler</h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((item) => (
              <ExperienceCard key={item.slug} item={item} />
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
