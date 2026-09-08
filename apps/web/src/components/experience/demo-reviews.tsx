import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'

/**
 * Blok 14 gelene kadar detay sayfasındaki demo yorumlar.
 *
 * Gerçek `GET /api/experiences/{slug}/reviews` yok; metinler sözlükten geliyor
 * ki arayüz diliyle uyumlu kalsın (docs/I18N.md §5). Ortalama/sayı da sabit —
 * canlı veriye geçince bu bileşen API yanıtına bağlanır.
 */

const DEMO_REVIEWS: {
  name: SimpleMessageKey
  place: SimpleMessageKey
  when: SimpleMessageKey
  body: SimpleMessageKey
  stars: 4 | 5
}[] = [
  {
    name: 'experience.detail.reviews.demo.1.name',
    place: 'experience.detail.reviews.demo.1.place',
    when: 'experience.detail.reviews.demo.1.when',
    body: 'experience.detail.reviews.demo.1.body',
    stars: 5,
  },
  {
    name: 'experience.detail.reviews.demo.2.name',
    place: 'experience.detail.reviews.demo.2.place',
    when: 'experience.detail.reviews.demo.2.when',
    body: 'experience.detail.reviews.demo.2.body',
    stars: 5,
  },
  {
    name: 'experience.detail.reviews.demo.3.name',
    place: 'experience.detail.reviews.demo.3.place',
    when: 'experience.detail.reviews.demo.3.when',
    body: 'experience.detail.reviews.demo.3.body',
    stars: 4,
  },
  {
    name: 'experience.detail.reviews.demo.4.name',
    place: 'experience.detail.reviews.demo.4.place',
    when: 'experience.detail.reviews.demo.4.when',
    body: 'experience.detail.reviews.demo.4.body',
    stars: 5,
  },
  {
    name: 'experience.detail.reviews.demo.5.name',
    place: 'experience.detail.reviews.demo.5.place',
    when: 'experience.detail.reviews.demo.5.when',
    body: 'experience.detail.reviews.demo.5.body',
    stars: 5,
  },
  {
    name: 'experience.detail.reviews.demo.6.name',
    place: 'experience.detail.reviews.demo.6.place',
    when: 'experience.detail.reviews.demo.6.when',
    body: 'experience.detail.reviews.demo.6.body',
    stars: 5,
  },
]

export function DemoReviews({ t }: { t: Translate }) {
  return (
    <section className="mt-12 border-t border-[var(--line)] pt-10" aria-labelledby="yorumlar">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="yorumlar" className="section-title flex items-center gap-2">
          <span aria-hidden="true">★</span>
          {t('experience.detail.reviews.rating', { puan: '4,84' })}
        </h2>
        <span className="text-fg-muted" aria-hidden="true">
          ·
        </span>
        <p className="text-[1.0625rem] font-semibold text-fg-muted">
          {t('experience.detail.reviews.count', { n: 129 })}
        </p>
      </div>

      <p className="mt-2 text-sm text-fg-muted">{t('experience.detail.reviews.demoNote')}</p>

      <ul className="mt-8 grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {DEMO_REVIEWS.map((item) => {
          const name = t(item.name)
          return (
            <li key={item.name}>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--fg)_10%,transparent)] text-sm font-bold"
                >
                  {Array.from(name.trim())[0] ?? '·'}
                </span>
                <div className="min-w-0">
                  <p className="font-bold">{name}</p>
                  <p className="text-sm text-fg-muted">{t(item.place)}</p>
                </div>
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span aria-label={t('experience.detail.reviews.stars', { n: item.stars })}>
                  <span aria-hidden="true">
                    {'★'.repeat(item.stars)}
                    <span className="text-fg-muted">{'★'.repeat(5 - item.stars)}</span>
                  </span>
                </span>
                <span className="text-fg-muted" aria-hidden="true">
                  ·
                </span>
                <span className="text-fg-muted">{t(item.when)}</span>
              </p>

              <p className="mt-2 text-[0.9375rem] leading-relaxed text-pretty">{t(item.body)}</p>
            </li>
          )
        })}
      </ul>

      <p className="mt-8 inline-flex h-11 items-center justify-center rounded-[var(--radius-glass)] border border-[var(--line-strong)] bg-[var(--surface-sunken)] px-6 text-sm font-bold text-fg">
        {t('experience.detail.reviews.showAll')}
      </p>

      <p className="mt-3 text-sm text-fg-muted">{t('experience.detail.reviews.about')}</p>
    </section>
  )
}
