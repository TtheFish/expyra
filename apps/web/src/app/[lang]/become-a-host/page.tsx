import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { formatPrice } from '@/lib/experiences'
import { alternateLinks, path } from '@/lib/routes'

/**
 * HOST PANELİ — PROTOTİP.
 *
 * Gerçek veri Faz 2'de geliyor (deneyim oluşturma, görsel yükleme, yayınlama).
 * Bu ekran o akışın iskeletini gösteriyor: host ne göreceğini biliyor, hangi
 * adımın kendisinden ne istediğini okuyabiliyor.
 *
 * Yalnızca "henüz hazır değil" yazan bir sayfa, host adayını geri gönderiyordu —
 * VISION.md §8'e göre projenin en büyük riski arz tarafı, yani tam olarak bu
 * kullanıcı. Prototip de olsa ne vaat ettiğimizi göstermek gerekiyor.
 */

export function generateMetadata(): Metadata {
  return {
    title: 'Host paneli · Expyra',
    alternates: { languages: alternateLinks('becomeHost') },
  }
}

/** Faz 2'de `GET /api/host/experiences` bunu dolduracak. */
const draftExperiences = [
  {
    title: 'Kadıköy’de Sokak Lezzetleri Turu',
    status: 'Taslak',
    price: 38,
    currency: 'EUR',
    capacity: 8,
    completeness: 3,
  },
  {
    title: 'Boğaz’da Gün Batımı Yelkeni',
    status: 'Yayında',
    price: 48,
    currency: 'EUR',
    capacity: 8,
    completeness: 5,
  },
]

const setupSteps = [
  {
    title: 'Deneyimini anlat',
    body: 'Başlık, açıklama, süre ve kapasite. İstediğin kadar dilde yazabilirsin — gezgin kendi dilinde görür.',
  },
  {
    title: 'Görsellerini ekle',
    body: 'En az bir kapak görseli. Deneyimin gerçekte nasıl göründüğünü göster; stok fotoğraf işe yaramıyor.',
  },
  {
    title: 'Takvimini ve fiyatını belirle',
    body: 'Hangi günler, kaç kişi, ne kadar. Fiyatı kendi para biriminde yazarsın; tahsilat da onunla yapılır.',
  },
  {
    title: 'Yayınla',
    body: 'Onay beklemiyorsun. Yayınla dediğinde ilanın aramada çıkar.',
  },
]

export default async function BecomeHostPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-on-media text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Host paneli
            </h1>
            <p className="text-on-media mt-2 max-w-xl text-white/85">
              Deneyimlerini buradan yönetirsin. Fiyatı, grubu, takvimi ve iptal
              politikasını sen belirlersin — platform ürüne karışmaz.
            </p>
          </div>

          {/* Faz 2.2'de `/host/deneyim/yeni` akışına bağlanacak. */}
          <GlassButton variant="primary" size="md" disabled title="Faz 2'de açılıyor">
            Yeni deneyim
          </GlassButton>
        </div>

        <section className="mt-10" aria-labelledby="ilanlarim">
          <h2 id="ilanlarim" className="text-on-media mb-4 text-sm font-medium text-white/75">
            İlanlarım · {draftExperiences.length}
          </h2>

          <ul className="grid gap-4">
            {draftExperiences.map((item) => (
              <li key={item.title}>
                <article className="glass glass-edge flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-glass)] p-5">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <StatusPill status={item.status} />
                      <span className="text-xs text-fg-muted">
                        {item.completeness}/5 adım tamam
                      </span>
                    </div>
                    <h3 className="truncate font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-fg-muted">
                      {formatPrice(item.price, item.currency)} · en fazla {item.capacity} kişi
                    </p>
                  </div>

                  <GlassButton size="sm" disabled title="Faz 2'de açılıyor">
                    Düzenle
                  </GlassButton>
                </article>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-fg-muted">
            Bu liste örnek veriyle gösteriliyor. Kendi ilanların, deneyim
            yayınlama açıldığında burada listelenecek.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="nasil-baslarim">
          <h2
            id="nasil-baslarim"
            className="text-on-media mb-4 text-sm font-medium text-white/75"
          >
            Nasıl başlarım?
          </h2>

          <ol className="grid gap-4 sm:grid-cols-2">
            {setupSteps.map((step, index) => (
              <li key={step.title}>
                <div className="glass glass-edge h-full rounded-[var(--radius-glass)] p-5">
                  <span className="font-mono text-xs text-fg-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <div className="glass glass-edge glass-thick rounded-[var(--radius-glass-lg)] p-8 text-center">
            <p className="text-base font-semibold">Deneyim yayınlama yakında açılıyor</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">
              Şu an ilk hostları tek tek topluyoruz. Ne anlatmak istediğini
              biliyorsan bize yaz — açıldığında ilanını birlikte hazırlarız.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <GlassButton variant="primary" href="mailto:host@expyra.com">
                Bize yaz
              </GlassButton>
              <GlassButton href={path(lang, 'howItWorks')}>Nasıl çalışır?</GlassButton>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const published = status === 'Yayında'

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
        published
          ? 'bg-[color-mix(in_oklch,var(--color-brand-500)_18%,transparent)] text-fg'
          : 'bg-[rgb(var(--glass-tint)_/_0.25)] text-fg-muted'
      }`}
    >
      {status}
    </span>
  )
}
