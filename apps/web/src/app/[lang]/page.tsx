import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { HeroWallpaper } from '@/components/brand/hero-wallpaper'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { ExperienceCard } from '@/components/experience/experience-card'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { readCurrencyCookie } from '@/features/currency/preference'
import { fetchExperiences, type GuestExperienceSummary } from '@/features/experiences/api'
import { getTranslator } from '@/features/i18n/translator'
import { WALLPAPER_CLIPS } from '@/lib/wallpaper-clips'
import { alternateLinks, path } from '@/lib/routes'

const SHOWCASE_SIZE = 12

export function generateMetadata(): Metadata {
  return { alternates: { languages: alternateLinks('home') } }
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = await getTranslator(lang)
  const showcase = await loadShowcase(lang)

  /*
    Duvar kağıdı metinleri SUNUCUDA çözülüyor: bileşen istemci tarafında ve
    sözlük `server-only`. Layout'tan buraya taşındı — video artık yalnız bu
    sayfada, dolayısıyla bu metinler de yalnız burada indiriliyor.
  */
  const wallpaperLabels = {
    captions: WALLPAPER_CLIPS.map((clip) => ({
      place: t(clip.placeKey),
      label: t(clip.labelKey),
    })),
    pause: t('wallpaper.pause'),
    play: t('wallpaper.play'),
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 pt-6 pb-16 sm:px-10">
        {/*
          Hero KUŞATILMIŞ bir kart. Eskiden video tüm sayfanın arkasındaydı ve her
          ekran onun üstünde okunuyordu; şimdi sayfa beyaz kağıt, video tek bir
          kartın içinde. `isolate`: içerideki z-index'ler sayfaya taşmasın.
        */}
        {/*
          `overflow-hidden` YOK ve `isolate` YOK — ikisi de arama çubuğunun
          açılır panellerini (şehir listesi, tarih tekerleği, misafir sayacı)
          kırpıyordu: panel hero'nun ALTINDAN taşıyor.
            · Videonun köşesini `.hero-wallpaper` kendi `overflow:hidden` +
              `border-radius: inherit` ile kesiyor, bölüme gerek yok.
            · `z-20`: panel, DOM'da sonra gelen kart ızgarasının üstünde
              çizilsin. İzole bir bağlamda içerideki z-index bunu yapamıyordu.
        */}
        <section className="relative z-20 flex min-h-[34rem] flex-col justify-end rounded-[var(--radius-glass-xl)] bg-[oklch(0.22_0.03_40)] p-6 sm:p-12">
          <HeroWallpaper labels={wallpaperLabels} />

          {/* İçerik videonun ÜSTÜNDE: duvar kağıdı z-0, bu katman z-1. */}
          <div className="relative z-[1]">
            {/*
              İki satır, ikincisi vurgulu. Cümlenin satırlara nasıl dağıldığına
              çevirmen karar veriyor — anahtarlar `home.hero.title` ve
              `home.hero.titleAccent`, ikisi de tam birer satır.
            */}
            <h1 className="text-on-media max-w-[18ch] text-4xl leading-[1.02] font-extrabold tracking-[-0.03em] text-balance text-white sm:text-6xl">
              {t('home.hero.title')}
              <br />
              {t('home.hero.titleAccent')}
            </h1>
            <p className="text-on-media mt-4 max-w-[34rem] text-base text-pretty text-white/90 sm:text-lg">
              {t('home.hero.lede')}
            </p>

            <ExperienceSearch
              className="mt-8"
              tone="media"
              lang={lang}
              action={path(lang, 'explore')}
            />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="vitrin-basligi">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Başlık ARTIK GÖRÜNÜR: altındaki kartlar örnek değil, gerçek ilanlar. */}
            <h2 id="vitrin-basligi" className="section-title">
              <a
                href={path(lang, 'explore')}
                className="inline-flex items-center gap-2.5 rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              >
                {t('home.showcase.heading')}
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-[rgb(16_24_40_/_0.06)] text-base"
                >
                  →
                </span>
              </a>
            </h2>
          </div>

          {showcase === null ? (
            <p className="surface mt-6 px-4 py-3 text-sm text-fg-muted">
              {t('home.showcase.unavailable')}
            </p>
          ) : showcase.length === 0 ? (
            /*
              Gerçekten hiç yayında ilan yok. Misafire "burada bir şey yok" demek
              yetmez — VISION §8'e göre projenin en büyük riski ARZ tarafı, yani bu
              ekranı gören kişinin bir kısmı aslında host adayı. Çıkış yolu ona.
            */
            <div className="surface mt-6 p-8 text-center">
              <p className="text-base font-bold">{t('home.showcase.empty.title')}</p>
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
            <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-5 gap-y-8">
              {showcase.map((item) => (
                <ExperienceCard key={item.slug} item={item} lang={lang} t={t} />
              ))}
            </div>
          )}
        </section>

        {/* Arz tarafı çağrısı (VISION §8). Video ses YOK ve döngüde: dekor.
            Zemin `--surface`: sabit açık mercan tint koyu temada kartı patlatıp
            başlığı silikleştiriyordu. */}
        <section className="mt-16 grid items-center gap-8 rounded-[var(--radius-glass-xl)] border border-[var(--line)] bg-[color-mix(in_oklch,var(--surface)_90%,var(--color-brand-500)_10%)] p-8 shadow-[var(--shadow-card)] sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-3xl leading-tight font-extrabold tracking-[-0.03em] text-fg">
              {t('host.invite.title')}
            </h2>
            <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-fg-muted">
              {t('host.invite.lede')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <GlassButton variant="primary" href={path(lang, 'becomeHost')}>
                {t('host.invite.cta')}
              </GlassButton>
              <GlassButton href={path(lang, 'howItWorks')}>{t('nav.howItWorks')}</GlassButton>
            </div>
          </div>

          <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-glass-lg)] bg-[oklch(0.22_0.03_40)]">
            {/*
              `<video>` düz DOM: autoplay/muted/loop öznitelikleri sunucu
              bileşeninde de çalışıyor, istemci bileşeni gerekmiyor.
              `muted` OLMADAN autoplay tarayıcıda sessizce reddedilir.
            */}
            <video
              src="/brand/clips/01-balik.mp4"
              poster="/brand/wallpaper-dusk.jpg"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              className="size-full object-cover"
            />
            <span className="glass absolute bottom-4 left-4 rounded-full px-3 py-1.5 text-xs font-bold text-fg">
              {t('wallpaper.istanbul.place')} · {t('wallpaper.istanbul.label')}
            </span>
          </div>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

async function loadShowcase(lang: string): Promise<GuestExperienceSummary[] | null> {
  try {
    const currency = readCurrencyCookie(await cookies())
    const page = await fetchExperiences({ lang, currency })
    return page.items.slice(0, SHOWCASE_SIZE)
  } catch (error) {
    console.error('experiences.showcase.failed', error)
    return null
  }
}
