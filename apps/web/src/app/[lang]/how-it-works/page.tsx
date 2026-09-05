import type { Metadata } from 'next'
import { BrandLogo } from '@/components/brand/brand-logo'
import { HeaderShell } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
import { getTranslator } from '@/features/i18n/translator'
import { alternateLinks, path } from '@/lib/routes'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    // Sayfanın adı üst menüdekiyle AYNI anahtardan: aynı sayfa iki yerde farklı
    // adla görünürse, çeviri eklendiğinde kimsenin fark etmediği bir
    // tutarsızlık olur (aynı gerekçe `site-footer.tsx` içinde de yazılı).
    title: `${t('nav.howItWorks')} · Expyra`,
    alternates: { languages: alternateLinks('howItWorks') },
  }
}

/**
 * Adımlar metin DEĞİL anahtar tutuyor: metin sözlükte, sıra burada. Anahtarlar
 * `SimpleMessageKey` — yer tutucusuz ve çoğulsuz küme, yani `t(key)` tek
 * parametreyle çağrılabiliyor ve yanlış anahtar derlemede kırılıyor.
 */
const steps: ReadonlyArray<{ title: SimpleMessageKey; body: SimpleMessageKey }> = [
  { title: 'howItWorks.step.discover.title', body: 'howItWorks.step.discover.body' },
  { title: 'howItWorks.step.book.title', body: 'howItWorks.step.book.body' },
  { title: 'howItWorks.step.join.title', body: 'howItWorks.step.join.body' },
]

export default async function HowItWorksPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = await getTranslator(lang)

  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderShell>
          <BrandLogo href={path(lang, 'home')} />
          {/* Orta sütun boş: bu sayfada arama bağlamı yok. Izgara yine üç
              sütunlu ki logo solda, çıkış sağda kalsın. */}
          <span />
          <GlassButton
            variant="ghost"
            size="sm"
            href={path(lang, 'home')}
            className="justify-self-end"
          >
            {t('howItWorks.back')}
          </GlassButton>
      </HeaderShell>

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
          {t('nav.howItWorks')}
        </h1>
        <p className="mt-3 max-w-lg text-fg-muted">{t('howItWorks.lede')}</p>

        <ol className="mt-12 space-y-4">
          {steps.map((step, index) => (
            <Step key={step.title} number={index + 1} step={step} lang={lang} t={t} />
          ))}
        </ol>

        <div className="mt-10">
          <GlassButton variant="primary" size="md" href={path(lang, 'explore')}>
            {t('howItWorks.backToExplore')}
          </GlassButton>
        </div>
      </main>
    </div>
  )
}

function Step({
  number,
  step,
  lang,
  t,
}: {
  number: number
  step: { title: SimpleMessageKey; body: SimpleMessageKey }
  lang: string
  t: Translate
}) {
  return (
    <li>
      <div className="glass glass-edge flex gap-5 p-6">
        {/*
          Sıra numarası `Intl` ile biçimleniyor, `String(n).padStart(2, '0')`
          ile değil: rakamların kendisi dile bağlı (Arapça arayüzde "٠١"
          beklenir) ve `minimumIntegerDigits` sıfır dolgusunu o dilin
          rakamlarıyla yapıyor. Sunum amaçlı olduğu için ekran okuyucudan
          gizli — sıra zaten <ol> ile taşınıyor.
        */}
        <span className="font-mono text-sm text-fg-muted" aria-hidden="true">
          {new Intl.NumberFormat(lang, { minimumIntegerDigits: 2 }).format(number)}
        </span>
        <div>
          <h2 className="font-semibold">{t(step.title)}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t(step.body)}</p>
        </div>
      </div>
    </li>
  )
}
