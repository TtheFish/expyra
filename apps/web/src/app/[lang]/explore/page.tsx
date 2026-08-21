import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { ExperienceCard } from '@/components/experience/experience-card'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { getTranslator } from '@/features/i18n/translator'
import {
  experiences,
  filterExperiences,
  formatSearchDate,
  parseSearchDate,
} from '@/lib/experiences'
import { alternateLinks, path } from '@/lib/routes'

/**
 * PROTOTİP ARAMA SONUCU — Faz 4'te gerçek arama (Postgres full-text + konum
 * hiyerarşisi + sayfalama) ile değişecek. Şu an sabit listeyi filtreliyor.
 *
 * Arama durumu URL'de: /tr/kesfet?nerede=prag&tarih=2026-09-01&yetiskin=2&cocuk=0
 * Böylece sonuç paylaşılabilir ve geri tuşu çalışır.
 */

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''

const toCount = (value: string | string[] | undefined): number => {
  const parsed = Number.parseInt(first(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function generateMetadata(): Metadata {
  return { alternates: { languages: alternateLinks('explore') } }
}

export default async function Explore({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: SearchParams
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams])
  const t = await getTranslator(lang)

  const destination = first(query['nerede'])
  const date = parseSearchDate(first(query['tarih']))
  const adults = toCount(query['yetiskin']) || 2
  const children = toCount(query['cocuk'])

  const { items: results, unapplied } = filterExperiences(experiences, {
    destination,
    guests: adults + children,
    date,
  })

  /*
    Özet satırı TEK anahtardan çıkıyor: "3 deneyim · 2 kişi · 1 Eylül 2026"
    parçalarını burada birleştirmek, sırayı Türkçe'ye çivilemek olurdu.

    Misafir sayısı yer tutucu olarak giriyor çünkü satırda İKİ sayım var
    (deneyim ve kişi) ve bir metin tek çekim taşıyabiliyor — kişi kendi
    anahtarında çekimlenip hazır olarak yerleşiyor.
  */
  const guests = t('explore.summary.guests', { n: adults + children })
  const summary = date
    ? t('explore.summary.dated', {
        n: results.length,
        misafir: guests,
        tarih: formatSearchDate(lang, date),
      })
    : t('explore.summary', { n: results.length, misafir: guests })

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <ExperienceSearch
          lang={lang}
          action={path(lang, 'explore')}
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
            {destination
              ? t('explore.heading.query', { arama: destination })
              : t('explore.heading.all')}
          </h1>

          <p className="text-on-media mt-1 text-sm text-white/85">{summary}</p>

          {/*
            Tarih sonucu daraltmıyor ve bu kullanıcıya SÖYLENİYOR — gerekçe
            `lib/experiences.ts` içindeki karar notunda. Uyarı sonuçların
            ÜSTÜNDE: listeye baktıktan sonra okunan bir dipnot, listeye
            bakarken kurulan yanlış izlenimi geri almıyor.
          */}
          {unapplied.includes('date') && (
            <p className="glass glass-edge mt-4 rounded-[var(--radius-glass-sm)] px-4 py-3 text-sm text-fg-muted">
              {t('explore.dateNotice')}
            </p>
          )}

          {results.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <ExperienceCard key={item.slug} item={item} lang={lang} t={t} />
              ))}
            </div>
          ) : (
            /*
              Boş sonuç ekranı, global bir platformun en büyük ürün riski
              (docs/VISION.md §8). Kullanıcı eli boş dönmemeli — Faz 4.6'da
              "yakındaki şehirler" ve "haber ver" akışı buraya gelecek.
            */
            <div className="glass glass-edge glass-thick mt-6 rounded-[var(--radius-glass-lg)] p-8 text-center">
              <p className="text-base font-semibold">{t('explore.empty.title')}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
                {t('explore.empty.body')}
              </p>
              <div className="mt-5">
                <GlassButton variant="primary" href={path(lang, 'explore')}>
                  {t('explore.empty.cta')}
                </GlassButton>
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
