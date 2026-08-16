import { BrandLogo } from '@/components/brand/brand-logo'
import { ExperienceCard } from '@/components/experience/experience-card'
import { LanguagePicker } from '@/components/i18n/language-picker'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { experiences, filterExperiences } from '@/lib/experiences'
import { defaultLanguage } from '@/lib/languages'

/**
 * PROTOTİP ARAMA SONUCU — Faz 4'te gerçek arama (Postgres full-text + konum
 * hiyerarşisi + sayfalama) ile değişecek. Şu an sabit listeyi filtreliyor.
 *
 * Arama durumu URL'de: /kesfet?nerede=prag&tarih=2026-09-01&yetiskin=2&cocuk=0
 * Böylece sonuç paylaşılabilir ve geri tuşu çalışır.
 */

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''

const toCount = (value: string | string[] | undefined): number => {
  const parsed = Number.parseInt(first(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export default async function Kesfet({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const destination = first(params['nerede'])
  const date = first(params['tarih'])
  const adults = toCount(params['yetiskin']) || 2
  const children = toCount(params['cocuk'])

  const results = filterExperiences(experiences, {
    destination,
    guests: adults + children,
  })

  return (
    <div className="flex min-h-dvh flex-col">
      {/* z-30: nav'daki açılır paneller (dil seçici) main'in üstünde çizilmeli. */}
      <header className="relative z-30 px-4 pt-4">
        <div className="glass glass-edge glass-nav mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-3 pl-4">
          <BrandLogo className="text-white text-on-media" />

          <div className="flex items-center gap-2">
            <LanguagePicker current={defaultLanguage} />
            <ThemeToggle />
            <GlassButton variant="primary" size="sm" href="/giris">Giriş yap</GlassButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <ExperienceSearch
          defaultDestination={destination}
          defaultDate={date}
          defaultAdults={adults}
          defaultChildren={children}
        />

        <section className="mt-10" aria-labelledby="sonuc-basligi">
          <h1
            id="sonuc-basligi"
            className="text-on-media text-xl font-semibold text-white sm:text-2xl"
          >
            {destination ? `“${destination}” için sonuçlar` : 'Tüm deneyimler'}
          </h1>

          <p className="text-on-media mt-1 text-sm text-white/85">
            {results.length} deneyim · {adults + children} kişi
            {date ? ` · ${date}` : ''}
          </p>

          {results.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <ExperienceCard key={item.slug} item={item} />
              ))}
            </div>
          ) : (
            /*
              Boş sonuç ekranı, global bir platformun en büyük ürün riski
              (docs/VISION.md §8). Kullanıcı eli boş dönmemeli — Faz 4.6'da
              "yakındaki şehirler" ve "haber ver" akışı buraya gelecek.
            */
            <div className="glass glass-edge glass-thick mt-6 rounded-[var(--radius-glass-lg)] p-8 text-center">
              <p className="text-base font-semibold">Burada henüz deneyim yok</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
                Aramanı genişletmeyi dene: farklı bir şehir yaz ya da misafir
                sayısını azalt. Yeni şehirler ekleniyor.
              </p>
              <div className="mt-5">
                <GlassButton variant="primary" href="/kesfet">Tüm deneyimleri gör</GlassButton>
              </div>
            </div>
          )}
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
