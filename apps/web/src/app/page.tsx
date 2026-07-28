import { GlassButton } from '@/components/ui/glass-button'
import { GlassSurface } from '@/components/ui/glass-surface'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/**
 * GEÇİCİ ANA SAYFA — tasarım sisteminin canlı vitrini.
 * Faz 4'te gerçek ana sayfa ile değişecek. Şu anki işi: cam malzemesinin
 * açık/koyu temada, hover ve focus durumlarında nasıl davrandığını göstermek.
 */

const experiences = [
  {
    title: 'Boğaz’da Gün Batımı Yelkeni',
    location: 'İstanbul, Türkiye',
    price: '€48',
    rating: '4.9',
    duration: '3 saat',
    hue: 25,
  },
  {
    title: 'Vltava Kıyısında Fotoğraf Turu',
    location: 'Prag, Çekya',
    price: '€35',
    rating: '4.8',
    duration: '2 saat',
    hue: 220,
  },
  {
    title: 'Ev Yapımı Pasta Atölyesi',
    location: 'Lizbon, Portekiz',
    price: '€62',
    rating: '5.0',
    duration: '4 saat',
    hue: 300,
  },
]

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* --- Yüzen nav: iOS'taki gibi içerik altından akar ----------------- */}
      <header className="sticky top-4 z-50 px-4">
        <GlassSurface
          tone="thick"
          className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-5"
        >
          <span className="font-semibold tracking-tight">Expyra</span>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Ana menü">
            <GlassButton variant="ghost" size="sm">Keşfet</GlassButton>
            <GlassButton variant="ghost" size="sm">Deneyimlerim</GlassButton>
            <GlassButton variant="ghost" size="sm">Host ol</GlassButton>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <GlassButton variant="primary" size="sm">Giriş yap</GlassButton>
          </div>
        </GlassSurface>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:py-24">
        {/* --- Hero -------------------------------------------------------- */}
        <section className="mb-16 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs font-medium text-fg-muted">
            <span className="size-1.5 rounded-full bg-brand-500" />
            Faz 0 — iskelet hazır
          </p>

          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Yerel deneyimleri
            <br />
            <span className="text-gradient-brand">
              keşfetmenin yeni yolu
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-fg-muted sm:text-lg">
            Şehri en iyi bilenlerden. Küçük gruplar, gerçek insanlar,
            unutulmayan birkaç saat.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <GlassButton variant="primary" size="lg">Deneyimleri gör</GlassButton>
            <GlassButton size="lg">Nasıl çalışır?</GlassButton>
          </div>
        </section>

        {/* --- Deneyim kartları ---------------------------------------------- */}
        <section aria-labelledby="ornek-deneyimler">
          <h2 id="ornek-deneyimler" className="sr-only">Örnek deneyimler</h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((item) => (
              <GlassSurface
                key={item.title}
                as="article"
                interactive
                sheen
                className="overflow-hidden rounded-[var(--radius-glass-lg)]"
              >
                {/* Görsel yerine renkli alan: camın arkasında renk olmalı ki
                    malzeme kendini göstersin. Faz 2'de gerçek görsel gelecek. */}
                <div
                  className="h-40 w-full"
                  style={{
                    background: `linear-gradient(135deg,
                      oklch(0.74 0.17 ${item.hue} / 0.85),
                      oklch(0.55 0.19 ${item.hue + 40} / 0.85))`,
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
              </GlassSurface>
            ))}
          </div>
        </section>

        {/* --- Malzeme referansı ---------------------------------------------- */}
        <section className="mt-16" aria-labelledby="malzeme">
          <h2 id="malzeme" className="mb-4 text-sm font-medium text-fg-muted">
            Malzeme varyantları
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <GlassSurface className="p-5">
              <p className="text-sm font-medium">glass</p>
              <p className="mt-1 text-xs text-fg-muted">
                Varsayılan yüzey. Kartlar, paneller, listeler.
              </p>
            </GlassSurface>

            <GlassSurface tone="thick" className="p-5">
              <p className="text-sm font-medium">glass-thick</p>
              <p className="mt-1 text-xs text-fg-muted">
                Nav ve modal. İçeriği zeminden net ayırır.
              </p>
            </GlassSurface>

            <GlassSurface tone="brand" className="p-5">
              <p className="text-sm font-medium">glass-brand</p>
              <p className="mt-1 text-xs text-white/75">
                Birincil aksiyon. Sayfada bir tane olur.
              </p>
            </GlassSurface>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8">
        <GlassSurface className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-fg-muted">
          <span>Expyra</span>
          <span className="font-mono">Faz 0 · iskelet</span>
        </GlassSurface>
      </footer>
    </div>
  )
}
