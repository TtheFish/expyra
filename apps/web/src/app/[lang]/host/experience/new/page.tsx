import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { GlassSurface } from '@/components/ui/glass-surface'
import { ApiError, fetchCurrentUser } from '@/features/auth/api'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import { createExperienceAction } from '@/features/host/experience-actions'
import { TEXT_LANGUAGE_FIELD } from '@/features/host/experience-fields'
import { ExperienceForm } from '@/features/host/experience-forms'
import type { MessageKey } from '@/features/i18n/dictionary'
import { getTranslator } from '@/features/i18n/translator'
import { contentLanguages, localNameOf } from '@/lib/languages'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Sihirbazın girişi: `/tr/host/deneyim/yeni` · `/en/host/experience/new`.
 *
 * ## Neden bu ekran TEK SORU soruyor
 *
 * "Sihirbaz uzun bir form — tek sayfada mı, adım adım mı?" sorusunun cevabı bu
 * ürün için üçüncü bir şık: **taslak sunucuda yaşıyor, adımlar bir sayfada ama
 * bölüm bölüm kaydediliyor.** Gerekçeler sırayla:
 *
 * 1. **API zaten bu şekle göre yazılmış.** `POST /api/host/experiences` yalnız
 *    `originalLanguage` alıyor; şehir, kategori, süre, kapasite ve metin ayrı
 *    uçlarda. `PATCH` de gerçek bir delta ("altı alanlık bir sihirbazda adım 2'yi
 *    kaydeden istemci adım 1'i sessizce silerdi" — ucun kendi notu). Tek sayfalık
 *    dev bir form bu sözleşmeyi boşa çıkarırdı.
 * 2. **Yarıda bırakılan iş kaybolmuyor.** Sekmesini kapatan host geri geldiğinde
 *    taslağını panelde bulur. Tek sayfalık form, tarayıcı belleğinden başka bir
 *    yere yaslanamazdı.
 * 3. **Adım adım ekranlar İKİ arayüz üretirdi.** Sihirbaz ile düzenleme ekranı
 *    aynı altı alanı soruyor; ayrı yazılsalardı ikisi bir gün ayrışırdı. Bugün
 *    ikisi de `[id]/page.tsx` — taslakken sihirbaz gibi (numaralı bölümler, eksik
 *    listesi), yayındayken düzenleyici gibi davranıyor.
 *
 * Geriye tek bir soru kalıyor ve o soru burada: **ilanın hangi dilde yazılacağı**.
 * Kendi ekranını hak ediyor çünkü sihirbazın **geri alınamayan tek kararı** o —
 * `OriginalLanguage` fallback zincirinin sonu ve slug'ın kaynağı, sonradan
 * değiştirilemiyor (docs/I18N.md §2). Diğer her alan istendiği kadar düzeltilebilir.
 *
 * ## Yetki
 *
 * Karar BURADA, `proxy.ts`'te değil: proxy yalnız "çerez var mı" bakan iyimser
 * bir kestirme ve bu sayfa onun `PROTECTED_PAGES` listesinde bile değil (liste
 * sayfa kimliğiyle çalışıyor ve bu blok o dosyaya dokunmuyor). Rol kararının
 * kaynağı `GET /api/auth/me`'nin `isHost` alanı, yani VERİTABANI — token'dan
 * okunsaydı rolünü yeni kazanmış kullanıcı 15 dakika boyunca kapıda kalırdı.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    title: `${t('host.experience.new.meta.title')} · Expyra`,
    alternates: { languages: alternateLinks('hostExperienceNew') },
    // Kişisel çalışma alanı; arama motoru indekslemesin (`account` sayfasıyla aynı).
    robots: { index: false, follow: false },
  }
}

/** Ekranın altındaki "sırada ne var" listesi — sihirbazın haritası. */
const nextSteps = [
  'host.experience.new.next.text',
  'host.experience.new.next.basics',
  'host.experience.new.next.place',
  'host.experience.new.next.publish',
] as const satisfies readonly MessageKey[]

export default async function NewExperiencePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const t = await getTranslator(lang)
  const session = await getSession()

  // `redirect` NEXT_REDIRECT fırlatıyor; hiçbir `try` bloğunun içinde çağrılmıyor.
  if (!session?.accessToken) {
    redirect(signInHref(lang))
  }

  const isHost = await resolveIsHost(session.accessToken)

  if (isHost === null) {
    redirect(signInHref(lang))
  }

  if (!isHost) {
    // Rolü olmayan kullanıcıya hata göstermek yerine rolü kazanacağı yere
    // gönderiyoruz: "Host ol" tek tık ve idempotent.
    redirect(path(lang, 'becomeHost'))
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
        <a
          href={path(lang, 'becomeHost')}
          className="text-on-media text-sm text-white/80 underline underline-offset-4 hover:text-white"
        >
          {t('host.experience.back')}
        </a>

        <GlassSurface tone="thick" className="auth-card mt-4">
          <h1 className="auth-title">{t('host.experience.new.title')}</h1>
          <p className="auth-lede">{t('host.experience.new.lede')}</p>

          <ExperienceForm
            action={createExperienceAction}
            lang={lang}
            className="auth-form"
            labels={{
              submit: t('host.experience.new.submit'),
              pending: t('host.experience.new.pending'),
            }}
          >
            <div>
              {/* Görünür etiket: placeholder etiket yerine geçmez, odakta kaybolur. */}
              <label className="auth-label" htmlFor="metin-dili">
                {t('host.experience.new.language.label')}
              </label>

              {/*
                Native `<select>`: 49 satırlık liste için tarayıcının kendi kontrolü
                klavye, ekran okuyucu ve telefon tekerleği açısından elle yazılmış
                hiçbir panelin ulaşamayacağı yerde (`profile-form.tsx` ile aynı karar).

                Liste `contentLanguages` (49), `uiLanguages` (2) DEĞİL: host Korece
                deneyim yazabilmeli, arayüzü Korece'ye çevirmek ayrı bir iş
                (docs/I18N.md §1). Arayüz dilini URL taşıyor.
              */}
              <select
                id="metin-dili"
                name={TEXT_LANGUAGE_FIELD}
                className="auth-input"
                defaultValue={lang}
                required
                aria-describedby="metin-dili-yardim"
              >
                {languageOptions(lang).map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Geri alınamazlık AÇIKÇA yazılı: kullanıcı sonradan öğrenmemeli. */}
              <p id="metin-dili-yardim" className="auth-help">
                {t('host.experience.new.language.help')}
              </p>
            </div>
          </ExperienceForm>

          <section className="mt-8 border-t border-[var(--glass-border)] pt-6">
            <h2 className="text-sm font-medium text-fg-muted">
              {t('host.experience.new.next.heading')}
            </h2>
            <ol className="mt-3 grid gap-2 text-sm text-fg-muted">
              {nextSteps.map((key, index) => (
                <li key={key} className="flex gap-3">
                  <span className="font-mono text-xs text-fg-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ol>
          </section>
        </GlassSurface>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

/**
 * `null` = oturum gerçekten ölü (401) → giriş ekranı.
 *
 * Diğer her şey — 5xx, ağ hatası — YUTULMUYOR, hata sınırına gidiyor
 * (`account/page.tsx` ile aynı karar). "Bir şeyler oldu, seni giriş ekranına
 * atalım" demek gerçek arızayı kullanıcı hatası gibi gösterir.
 */
async function resolveIsHost(accessToken: string): Promise<boolean | null> {
  try {
    const user = await fetchCurrentUser(accessToken)
    return user.isHost
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

function signInHref(lang: string): string {
  const query = new URLSearchParams({ [RETURN_TO_PARAM]: path(lang, 'hostExperienceNew') })
  return `${path(lang, 'signIn')}?${query.toString()}`
}

/**
 * Dil seçenekleri SUNUCUDA üretiliyor: `Intl.DisplayNames` verisi sayfanın diline
 * bağlı ve Node ile tarayıcının ICU sürümleri ayrışırsa hidrasyon uyuşmazlığı
 * çıkar (`account/page.tsx` ile aynı gerekçe ve aynı biçim: "日本語 — Japonca").
 */
function languageOptions(lang: string): { code: string; label: string }[] {
  const collator = new Intl.Collator(lang)

  return contentLanguages
    .map((language) => {
      const local = localNameOf(language.code, lang) ?? language.englishName
      return {
        code: language.code,
        label:
          local === language.nativeName
            ? language.nativeName
            : `${language.nativeName} — ${local}`,
      }
    })
    .sort((a, b) => collator.compare(a.label, b.label))
}
