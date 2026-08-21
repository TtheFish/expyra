import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { ExperienceCard } from '@/components/experience/experience-card'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { getTranslator } from '@/features/i18n/translator'
import { experiences } from '@/lib/experiences'
import { alternateLinks, path } from '@/lib/routes'

/**
 * GEÇİCİ ANA SAYFA — tasarım sisteminin canlı vitrini.
 * Faz 4'te gerçek ana sayfa ile değişecek.
 */

export function generateMetadata(): Metadata {
  return { alternates: { languages: alternateLinks('home') } }
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = await getTranslator(lang)

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

        <section id="ornek-deneyimler" aria-labelledby="ornek-deneyimler-baslik">
          <h2 id="ornek-deneyimler-baslik" className="sr-only">
            {t('home.samples.heading')}
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((item) => (
              <ExperienceCard key={item.slug} item={item} lang={lang} t={t} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
