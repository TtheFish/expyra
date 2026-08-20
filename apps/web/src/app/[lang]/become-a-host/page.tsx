import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { ApiError, fetchCurrentUser } from '@/features/auth/api'
import { formatNumber } from '@/features/auth/messages'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import { ActivateHostForm } from '@/features/host/activate-host-form'
import { t, type HostMessageKey } from '@/features/host/messages'
import { formatPrice } from '@/lib/experiences'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Host sayfası — üç görünüm, tek yol.
 *
 * | Kim | Ne görür |
 * |---|---|
 * | Oturumsuz | Vaat + "Host olmak için giriş yap" (dönüş adresiyle) |
 * | Oturum var, rol yok | Vaat + gerçek "Host ol" düğmesi |
 * | Host | Panel: ilanlar + adımlar + durum bilgisi |
 *
 * **Sayfa oturumsuz da açılıyor** ve bu bilinçli (`proxy.ts`'te de yazılı):
 * VISION §8'e göre projenin en büyük riski arz tarafı, yani tam olarak bu
 * ziyaretçi. Onu görmeden giriş ekranına atmak, ne vaat ettiğimizi anlatmadan
 * kapıyı kapatmak olurdu.
 *
 * **Onay süreci yok** (VISION §9): "Host ol" bir başvuru değil, anahtar teslimi.
 * Ekranda "başvurun alındı" gibi bir ara durum bu yüzden HİÇ yok.
 *
 * Yetki kararı burada değil API'de: bu sayfa yalnız hangi ekranı çizeceğine
 * karar veriyor. `isHost` istemciden gelen bir şey olsaydı bile açılacak bir
 * kapı yok — host uçları JWT rol claim'ine bakıyor.
 */

export function generateMetadata(): Metadata {
  return {
    // Başlık oturumdan BAĞIMSIZ: `generateMetadata` içinde oturum okumak her
    // ziyarette fazladan bir API turu ederdi ve sekme başlığı bunu hak etmiyor.
    // Arama motorunun gördüğü de zaten oturumsuz görünüm.
    title: `${t('host.meta.title')} · Expyra`,
    alternates: { languages: alternateLinks('becomeHost') },
  }
}

type ExperiencePreview = {
  title: string
  status: 'draft' | 'published'
  price: number
  currency: string
  capacity: number
  completeness: number
}

/** Blok 5'te `GET /api/host/experiences` bunu dolduracak (docs/PLAN.md). */
const sampleExperiences = [
  {
    title: 'Kadıköy’de Sokak Lezzetleri Turu',
    status: 'draft',
    price: 38,
    currency: 'EUR',
    capacity: 8,
    completeness: 3,
  },
  {
    title: 'Boğaz’da Gün Batımı Yelkeni',
    status: 'published',
    price: 48,
    currency: 'EUR',
    capacity: 8,
    completeness: 5,
  },
] as const satisfies readonly ExperiencePreview[]

/** Örnek verinin payda değeri; gerçek ilerleme Blok 5'te sunucudan gelecek. */
const SAMPLE_TOTAL_STEPS = 5

const setupSteps = [
  { title: 'host.steps.describe.title', body: 'host.steps.describe.body' },
  { title: 'host.steps.media.title', body: 'host.steps.media.body' },
  { title: 'host.steps.pricing.title', body: 'host.steps.pricing.body' },
  { title: 'host.steps.publish.title', body: 'host.steps.publish.body' },
] as const satisfies readonly { title: HostMessageKey; body: HostMessageKey }[]

/**
 * `traveler` = giriş yapmış ama henüz host değil. Bir rol adı değil, bu ekranın
 * üç durumundan biri — sistemde "Traveler" diye bir rol yok, taban budur.
 */
type Viewer = 'anonymous' | 'traveler' | 'host'

export default async function BecomeHostPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const viewer = await resolveViewer()

  const isHost = viewer === 'host'

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-on-media text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {isHost ? t('host.panel.title') : t('host.invite.title')}
            </h1>
            <p className="text-on-media mt-2 max-w-xl text-white/85">
              {isHost ? t('host.panel.lede') : t('host.invite.lede')}
            </p>
          </div>

          {/* Blok 5'te `/host/deneyim/yeni` sihirbazına bağlanacak. */}
          {isHost ? (
            <GlassButton variant="primary" size="md" disabled title={t('host.soon')}>
              {t('host.panel.new')}
            </GlassButton>
          ) : null}
        </div>

        {isHost ? <HostStatus /> : <ActivateCard viewer={viewer} lang={lang} />}

        <ListingsSection isHost={isHost} />

        <section className="mt-14" aria-labelledby="host-adimlar">
          <h2 id="host-adimlar" className="text-on-media mb-4 text-sm font-medium text-white/75">
            {t('host.steps.heading')}
          </h2>

          <ol className="grid gap-4 sm:grid-cols-2">
            {setupSteps.map((step, index) => (
              <li key={step.title}>
                <div className="glass glass-edge h-full rounded-[var(--radius-glass)] p-5">
                  <span className="font-mono text-xs text-fg-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-semibold">{t(step.title)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t(step.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <div className="glass glass-edge glass-thick rounded-[var(--radius-glass-lg)] p-8 text-center">
            <p className="text-base font-semibold">{t('host.contact.title')}</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">{t('host.contact.body')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <GlassButton variant="primary" href="mailto:host@expyra.com">
                {t('host.contact.cta')}
              </GlassButton>
              <GlassButton href={path(lang, 'howItWorks')}>
                {t('host.contact.howItWorks')}
              </GlassButton>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

/**
 * Hangi ekranı çizeceğimizin kararı. `site-header.tsx`'teki `AccountSlot` ile
 * AYNI üç durum ayrımı — ve aynı gerekçeyle:
 *
 * - Çerez yok → oturumsuz.
 * - Çerez var, profil 401 → çerez bayat, gerçekten çıkış yapılmış → oturumsuz.
 * - Çerez var, profil başka nedenle okunamadı (5xx, ağ) → `traveler`. Yani host
 *   olan biri API kesintisinde davet ekranını görebilir; katlanılabilir çünkü
 *   "Host ol" İDEMPOTENT (ikinci çağrı da 200) — basarsa zararsız, üstüne taze
 *   token alır. Ters yön (rol yokken paneli göstermek) ise kullanıcıyı
 *   çalışmayan düğmelerle baş başa bırakırdı. Hata `console.error` ile görünür
 *   kalıyor (CLAUDE.md #1).
 */
async function resolveViewer(): Promise<Viewer> {
  const session = await getSession()
  if (!session) return 'anonymous'

  // Access çerezi düşmüş ama refresh duruyor: proxy yenilemeyi denemiş ve API'ye
  // ulaşamamış olabilir. Oturumu ölü SAYMIYORUZ.
  if (!session.accessToken) return 'traveler'

  try {
    const user = await fetchCurrentUser(session.accessToken)
    return user.isHost ? 'host' : 'traveler'
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return 'anonymous'

    console.error('host.viewer.failed', error)
    return 'traveler'
  }
}

/** Host olduktan sonra "Host ol" düğmesinin yerini alan bilgi. */
function HostStatus() {
  return (
    <p className="glass glass-edge mt-8 inline-flex items-center rounded-[var(--radius-glass-sm)] px-4 py-2 text-sm font-medium">
      {t('host.panel.status')}
    </p>
  )
}

/**
 * Rol kazanma kartı. İki durumu var ve ikisi de AYNI vaadi gösteriyor
 * (`host.invite.noApproval`) — oturumsuz kullanıcıya "önce giriş yap, sonra
 * anlatırız" demek, arz tarafını kapıda kaybetmenin en kısa yolu.
 */
function ActivateCard({ viewer, lang }: { viewer: Viewer; lang: string }) {
  return (
    <section className="mt-8">
      <div className="glass glass-edge glass-thick rounded-[var(--radius-glass-lg)] p-6 sm:p-8">
        <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
          {t('host.invite.noApproval')}
        </p>

        {/* Formun kendi boşluğu var: boş hata kutusu 3rem yer tutuyor (yükseklik
            hata çıkınca kartın zıplamasını önlüyor), üstüne bir de `mt-*` koymak
            metinle düğme arasını uçurumlaştırırdı. */}
        {viewer === 'traveler' ? (
          <ActivateHostForm lang={lang} />
        ) : (
          <>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
              {t('host.signedOut.note')}
            </p>
            <div className="mt-5">
              <GlassButton variant="primary" size="lg" href={signInHref(lang)}>
                {t('host.signedOut.cta')}
              </GlassButton>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/**
 * İlan listesi — Blok 5'e kadar ÖRNEK VERİ, her iki başlıkta da yazılı.
 *
 * Host olmayan kullanıcıya da gösteriliyor ama başlığı farklı: "İlanlarım"
 * demek, henüz tek satırı olmayan birine sahip olmadığı bir şeyi göstermek
 * olurdu. Aynı liste, dürüst çerçeve.
 */
function ListingsSection({ isHost }: { isHost: boolean }) {
  return (
    <section className="mt-10" aria-labelledby="host-ilanlar">
      <h2 id="host-ilanlar" className="text-on-media mb-4 text-sm font-medium text-white/75">
        {isHost
          ? t('host.listings.heading', { sayi: formatNumber(sampleExperiences.length) })
          : t('host.listings.previewHeading')}
      </h2>

      <ul className="grid gap-4">
        {sampleExperiences.map((item) => (
          <li key={item.title}>
            <article className="glass glass-edge flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-glass)] p-5">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <StatusPill status={item.status} />
                  <span className="text-xs text-fg-muted">
                    {t('host.listings.progress', {
                      tamam: formatNumber(item.completeness),
                      toplam: formatNumber(SAMPLE_TOTAL_STEPS),
                    })}
                  </span>
                </div>
                <h3 className="truncate font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-fg-muted">
                  {t('host.listings.summary', {
                    fiyat: formatPrice(item.price, item.currency),
                    kisi: formatNumber(item.capacity),
                  })}
                </p>
              </div>

              <GlassButton size="sm" disabled title={t('host.soon')}>
                {t('host.listings.edit')}
              </GlassButton>
            </article>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-fg-muted">
        {isHost ? t('host.listings.note') : t('host.listings.previewNote')}
      </p>
    </section>
  )
}

function StatusPill({ status }: { status: ExperiencePreview['status'] }) {
  const published = status === 'published'

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
        published
          ? 'bg-[color-mix(in_oklch,var(--color-brand-500)_18%,transparent)] text-fg'
          : 'bg-[rgb(var(--glass-tint)_/_0.25)] text-fg-muted'
      }`}
    >
      {published ? t('host.listings.status.published') : t('host.listings.status.draft')}
    </span>
  )
}

/**
 * `actions.ts`'teki eşinin kopyası ve öyle kalmak zorunda: `'use server'` dosyası
 * yalnız async fonksiyon export edebilir, bu yardımcı oradan paylaşılamaz.
 */
function signInHref(lang: string): string {
  const query = new URLSearchParams({ [RETURN_TO_PARAM]: path(lang, 'becomeHost') })
  return `${path(lang, 'signIn')}?${query.toString()}`
}
