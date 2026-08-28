import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { ExperienceCard } from '@/components/experience/experience-card'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { fetchExperiences, type GuestExperienceSummary } from '@/features/experiences/api'
import { getTranslator } from '@/features/i18n/translator'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Ana sayfa. Vitrin artık GERÇEK VERİ — `lib/experiences.ts`'teki üç sabit satır
 * (İstanbul/Prag/Lizbon) bu blokta öldü.
 *
 * ## Vitrin kesintide sayfayı düşürmüyor — ve bu bir hata yutma değil
 *
 * `/kesfet` API'ye ulaşamazsa patlıyor, çünkü orada sorgunun cevabı SAYFANIN
 * KENDİSİ. Burada değil: ana sayfanın işi başlık, arama çubuğu ve "nasıl çalışır"
 * yolu; vitrin bir tat. Kesintide bütün sayfayı 500'e düşürmek, çalışmaya devam
 * eden bir aramayı da kullanıcının elinden alırdı (aynı gerekçe `site-header.tsx`
 * içindeki `loadViewer` üzerinde yazılı).
 *
 * Yutma OLMAMASININ şartı ikisi birden: hata `console.error` ile görünür kalıyor
 * VE ekranda "okunamadı" ile "hiç yok" AYRI cümleler. Boş liste dönüp susmak,
 * kesintiyi sessizce bir ürün durumuna ("henüz deneyim yok") çevirirdi — CLAUDE.md
 * #1'in yasakladığı şey tam olarak bu.
 */

/** Vitrinde kaç kart: 3 sütunlu ızgarada iki tam sıra. */
const SHOWCASE_SIZE = 6

export function generateMetadata(): Metadata {
  return { alternates: { languages: alternateLinks('home') } }
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = await getTranslator(lang)
  const showcase = await loadShowcase(lang)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:py-24">
        <section className="mb-16 text-center">
          {/*
            İki satır, ikincisi vurgulu. Cümlenin satırlara nasıl dağıldığına
            çevirmen karar veriyor — anahtarlar `home.hero.title` ve
            `home.hero.titleAccent`, ikisi de tam birer satır.
          */}
          <h1 className="text-on-media text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            {t('home.hero.title')}
            <br />
            <span className="text-gradient-brand">{t('home.hero.titleAccent')}</span>
          </h1>

          <p className="text-on-media mx-auto mt-5 max-w-xl text-pretty text-base text-white/90 sm:text-lg">
            {t('home.hero.lede')}
          </p>

          <ExperienceSearch className="mt-9" lang={lang} action={path(lang, 'explore')} />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <GlassButton
              size="lg"
              href={path(lang, 'howItWorks')}
              className="!bg-[rgb(12_14_20_/_0.55)] !text-white"
            >
              {t('nav.howItWorks')}
            </GlassButton>
          </div>
        </section>

        <section aria-labelledby="vitrin-basligi">
          {/* Başlık ARTIK GÖRÜNÜR: altındaki kartlar örnek değil, gerçek ilanlar. */}
          <h2
            id="vitrin-basligi"
            className="text-on-media text-lg font-semibold text-white sm:text-xl"
          >
            {t('home.showcase.heading')}
          </h2>

          {showcase === null ? (
            /* Okunamadı ≠ yok. Cümle bunu söylüyor ve hata konsolda duruyor. */
            <p className="glass glass-edge mt-4 rounded-[var(--radius-glass-sm)] px-4 py-3 text-sm text-fg-muted">
              {t('home.showcase.unavailable')}
            </p>
          ) : showcase.length === 0 ? (
            /*
              Gerçekten hiç yayında ilan yok. Misafire "burada bir şey yok" demek
              yetmez — VISION §8'e göre projenin en büyük riski ARZ tarafı, yani bu
              ekranı gören kişinin bir kısmı aslında host adayı. Çıkış yolu ona.
            */
            <div className="glass glass-edge glass-thick mt-4 rounded-[var(--radius-glass-lg)] p-8 text-center">
              <p className="text-base font-semibold">{t('home.showcase.empty.title')}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
                {t('home.showcase.empty.body')}
              </p>
              <div className="mt-5">
                <GlassButton variant="primary" href={path(lang, 'becomeHost')}>
                  {t('home.showcase.empty.cta')}
                </GlassButton>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {showcase.map((item) => (
                  <ExperienceCard key={item.slug} item={item} lang={lang} t={t} />
                ))}
              </div>

              <div className="mt-6 text-center">
                <GlassButton href={path(lang, 'explore')}>{t('home.showcase.more')}</GlassButton>
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

/** `null` = okunamadı, `[]` = gerçekten yok. İkisi ekranda ayrı cümleler. */
async function loadShowcase(lang: string): Promise<GuestExperienceSummary[] | null> {
  try {
    const page = await fetchExperiences({ lang })
    return page.items.slice(0, SHOWCASE_SIZE)
  } catch (error) {
    console.error('experiences.showcase.failed', error)
    return null
  }
}
