import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { GlassButton } from '@/components/ui/glass-button'
import { ApiError, fetchCurrentUser } from '@/features/auth/api'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import { ActivateHostForm } from '@/features/host/activate-host-form'
import {
  HostExperienceAccessError,
  fetchHostExperiences,
  hostExperiencePath,
  type HostExperience,
} from '@/features/host/experiences-api'
import type { MessageKey, Translate } from '@/features/i18n/dictionary'
import { getTranslator } from '@/features/i18n/translator'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Host sayfası — üç görünüm, tek yol.
 *
 * | Kim | Ne görür |
 * |---|---|
 * | Oturumsuz | Vaat + "Host olmak için giriş yap" (dönüş adresiyle) |
 * | Oturum var, rol yok | Vaat + gerçek "Host ol" düğmesi |
 * | Host | Panel: GERÇEK ilanlar + "Yeni deneyim" + "Düzenle" |
 *
 * **Sayfa oturumsuz da açılıyor** ve bu bilinçli (`proxy.ts`'te de yazılı):
 * VISION §8'e göre projenin en büyük riski arz tarafı, yani tam olarak bu
 * ziyaretçi. Onu görmeden giriş ekranına atmak, ne vaat ettiğimizi anlatmadan
 * kapıyı kapatmak olurdu.
 *
 * **Onay süreci yok** (VISION §9): "Host ol" bir başvuru değil, anahtar teslimi.
 *
 * ## Blok 5: örnek veri öldü
 *
 * Buradaki liste `sampleExperiences` sabitinden geliyordu; artık
 * `GET /api/host/experiences`'ten geliyor ve "Düzenle" gerçek bir sayfaya gidiyor.
 * Bunun bir yan etkisi var ve bilinçli: **host olmayan kullanıcıya artık liste
 * gösterilmiyor.** Önceden aynı örnek satırlar "panelin böyle görünecek" başlığıyla
 * ona da çiziliyordu; sahte veri gidince o vitrinin dürüst karşılığı sahte bir
 * liste değil, aşağıdaki "nasıl başlarım" adımları.
 *
 * `t` alt bileşenlere PROP olarak iniyor; hepsi sunucu bileşeni.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    // Başlık oturumdan BAĞIMSIZ: `generateMetadata` içinde oturum okumak her
    // ziyarette fazladan bir API turu ederdi ve sekme başlığı bunu hak etmiyor.
    title: `${t('host.meta.title')} · Expyra`,
    alternates: { languages: alternateLinks('becomeHost') },
  }
}

const setupSteps = [
  { title: 'host.steps.describe.title', body: 'host.steps.describe.body' },
  { title: 'host.steps.media.title', body: 'host.steps.media.body' },
  { title: 'host.steps.pricing.title', body: 'host.steps.pricing.body' },
  { title: 'host.steps.publish.title', body: 'host.steps.publish.body' },
] as const satisfies readonly { title: MessageKey; body: MessageKey }[]

/**
 * `traveler` = giriş yapmış ama henüz host değil. Bir rol adı değil, bu ekranın
 * üç durumundan biri — sistemde "Traveler" diye bir rol yok, taban budur.
 */
type Viewer = 'anonymous' | 'traveler' | 'host'

type Panel = {
  viewer: Viewer
  /**
   * Host'un ilanları. `null` = liste OKUNAMADI (host olmayan için de `null`).
   *
   * Boş dizi ile `null` ayrımı kritik: biri "henüz ilanın yok", diğeri "şu an
   * gösteremiyoruz". İkisini birleştirmek, bir API kesintisinde host'a ilanlarının
   * silindiğini düşündürürdü (CLAUDE.md #1).
   */
  experiences: HostExperience[] | null
}

export default async function BecomeHostPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = await getTranslator(lang)
  const panel = await resolvePanel()

  const isHost = panel.viewer === 'host'
  const hasListings = (panel.experiences?.length ?? 0) > 0

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

          {isHost ? (
            <GlassButton variant="primary" size="md" href={path(lang, 'hostExperienceNew')}>
              {t('host.panel.new')}
            </GlassButton>
          ) : null}
        </div>

        {isHost ? (
          <HostStatus t={t} />
        ) : (
          <ActivateCard viewer={panel.viewer} lang={lang} t={t} />
        )}

        {isHost ? <ListingsSection experiences={panel.experiences} lang={lang} t={t} /> : null}

        {/*
          "Nasıl başlarım" ilanı olan host'a gösterilmiyor: o adımları çoktan
          geçmiş biri için bu bölüm gürültü. Oturumsuz ziyaretçi ve henüz tek
          satırı olmayan host için ise ekranın en işe yarar parçası.
        */}
        {hasListings ? null : (
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
        )}

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
 * Hangi ekranı çizeceğimizin ve listenin nereden geleceğinin kararı.
 * `site-header.tsx`'teki `AccountSlot` ile AYNI üç durum ayrımı:
 *
 * - Çerez yok → oturumsuz.
 * - Çerez var, profil 401 → çerez bayat → oturumsuz.
 * - Çerez var, profil başka nedenle okunamadı (5xx, ağ) → `traveler`. Host olan
 *   biri API kesintisinde davet ekranını görebilir; katlanılabilir çünkü
 *   "Host ol" İDEMPOTENT — basarsa zararsız, üstüne taze token alır. Ters yön
 *   (rol yokken paneli göstermek) kullanıcıyı çalışmayan düğmelerle bırakırdı.
 */
async function resolvePanel(): Promise<Panel> {
  const session = await getSession()
  if (!session) return { viewer: 'anonymous', experiences: null }

  // Access çerezi düşmüş ama refresh duruyor: proxy yenilemeyi denemiş ve API'ye
  // ulaşamamış olabilir. Oturumu ölü SAYMIYORUZ.
  if (!session.accessToken) return { viewer: 'traveler', experiences: null }

  const accessToken = session.accessToken

  let viewer: Viewer
  try {
    const user = await fetchCurrentUser(accessToken)
    viewer = user.isHost ? 'host' : 'traveler'
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { viewer: 'anonymous', experiences: null }
    }

    console.error('host.viewer.failed', error)
    return { viewer: 'traveler', experiences: null }
  }

  if (viewer !== 'host') {
    return { viewer, experiences: null }
  }

  try {
    return { viewer: 'host', experiences: await fetchHostExperiences(accessToken) }
  } catch (error) {
    /*
      403 burada BEKLENEN bir durum: `/me` veritabanına bakıyor ve "host" diyor
      ama elimizdeki access token rol claim'i eklenmeden ÖNCE üretilmiş olabilir
      (token ömrü 15 dk). Doğru cevap hata ekranı değil, davet ekranı — "Host ol"
      idempotent ve basıldığında taze token yazıyor, yani kullanıcı tek tıkla
      paneline geçiyor. Bu, Blok 2'nin "host oldum ama kullanamıyorum" riskinin
      kalan yarısının kapandığı yer.
    */
    if (error instanceof HostExperienceAccessError) {
      return { viewer: error.reason === 'notHost' ? 'traveler' : 'anonymous', experiences: null }
    }

    // 5xx / ağ: liste YOK değil, OKUNAMADI. Ekranda ikisi ayrı cümle.
    console.error('host.listings.failed', error)
    return { viewer: 'host', experiences: null }
  }
}

/** Host olduktan sonra "Host ol" düğmesinin yerini alan bilgi. */
function HostStatus({ t }: { t: Translate }) {
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
function ActivateCard({ viewer, lang, t }: { viewer: Viewer; lang: string; t: Translate }) {
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
          <ActivateHostForm
            lang={lang}
            labels={{ cta: t('host.invite.cta'), pending: t('host.invite.pending') }}
          />
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
 * İlan listesi — artık gerçek veri.
 *
 * Üç ayrı durum ve üçü de ayrı cümle:
 * - `null` → liste okunamadı. "İlanın yok" DEMİYORUZ.
 * - boş dizi → gerçekten hiç ilan yok. Boş durum bir hata değil, bir davet:
 *   host paneli ilk kez açan biri burada ne yapacağını okuyor ve tek tıkla
 *   sihirbaza giriyor.
 * - dolu → satırlar.
 */
function ListingsSection({
  experiences,
  lang,
  t,
}: {
  experiences: HostExperience[] | null
  lang: string
  t: Translate
}) {
  if (experiences === null) {
    return (
      <section className="mt-10" aria-labelledby="host-ilanlar">
        <h2 id="host-ilanlar" className="text-on-media mb-4 text-sm font-medium text-white/75">
          {t('host.listings.errorHeading')}
        </h2>
        <div className="glass glass-edge rounded-[var(--radius-glass)] p-5 text-sm text-fg-muted">
          {t('host.listings.error')}
        </div>
      </section>
    )
  }

  if (experiences.length === 0) {
    return (
      <section className="mt-10" aria-labelledby="host-ilanlar">
        <h2 id="host-ilanlar" className="text-on-media mb-4 text-sm font-medium text-white/75">
          {t('host.listings.empty.heading')}
        </h2>

        <div className="glass glass-edge glass-thick rounded-[var(--radius-glass-lg)] p-6 sm:p-8">
          <p className="text-base font-semibold">{t('host.listings.empty.title')}</p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-fg-muted">
            {t('host.listings.empty.body')}
          </p>
          <div className="mt-5">
            <GlassButton variant="primary" size="lg" href={path(lang, 'hostExperienceNew')}>
              {t('host.listings.empty.cta')}
            </GlassButton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-10" aria-labelledby="host-ilanlar">
      <h2 id="host-ilanlar" className="text-on-media mb-4 text-sm font-medium text-white/75">
        {t('host.listings.heading', { sayi: experiences.length })}
      </h2>

      <ul className="grid gap-4">
        {experiences.map((experience) => (
          <li key={experience.id}>
            <article className="glass glass-edge flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-glass)] p-5">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <StatusPill status={experience.status} t={t} />
                  <span className="text-xs text-fg-muted">
                    {experience.missingPublishRequirements.length === 0
                      ? t('host.listings.ready')
                      : t('host.listings.missing', {
                          n: experience.missingPublishRequirements.length,
                        })}
                  </span>
                </div>

                {/*
                  Başlık host'un İÇERİĞİ, arayüz metni değil: `lang` özniteliği
                  ilanın dilinde olmalı ki ekran okuyucu Türkçe bir başlığı
                  İngilizce fonetikle okumasın (WCAG 3.1.2).
                */}
                <h3 lang={experience.originalLanguage} className="truncate font-semibold">
                  {titleOf(experience) ?? t('host.experience.untitled')}
                </h3>
              </div>

              <GlassButton size="sm" href={hostExperiencePath(lang, experience.id)}>
                {t('host.listings.edit')}
              </GlassButton>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatusPill({ status, t }: { status: HostExperience['status']; t: Translate }) {
  const published = status === 'Published'

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
        published
          ? 'bg-[color-mix(in_oklch,var(--color-brand-500)_18%,transparent)] text-fg'
          : 'bg-[rgb(var(--glass-tint)_/_0.25)] text-fg-muted'
      }`}
    >
      {published
        ? t('host.listings.status.published')
        : status === 'Archived'
          ? t('host.listings.status.archived')
          : t('host.listings.status.draft')}
    </span>
  )
}

/**
 * Panelde gösterilecek ad: ORİJİNAL dildeki başlık. Fallback zinciri burada
 * çalışmıyor ve çalışmamalı — bu ekran host'un kendi ilanı, gezginin gördüğü
 * çeviri değil (docs/I18N.md §2 zincirinin muhatabı misafir tarafı).
 */
function titleOf(experience: HostExperience): string | null {
  return (
    experience.translations.find((item) => item.language === experience.originalLanguage)?.title ??
    null
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
