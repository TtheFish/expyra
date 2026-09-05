import type { Metadata } from 'next'
import Form from 'next/form'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { CityPicker } from '@/components/search/city-picker'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession } from '@/features/auth/session'
import {
  archiveExperienceAction,
  publishExperienceAction,
  createBlackoutAction,
  createRecurrenceAction,
  deleteBlackoutAction,
  setSlotStatusAction,
  setTranslationAction,
  setDetailsAction,
  setMeetingPointAction,
  setItineraryAction,
  stopRecurrenceAction,
  updateExperienceAction,
  updatePricingAction,
} from '@/features/host/experience-actions'
import {
  ADULT_PRICE_FIELD,
  BLACKOUT_END_FIELD,
  BLACKOUT_ID_FIELD,
  BLACKOUT_START_FIELD,
  CAPACITY_FIELD,
  CATEGORY_FIELD,
  CHILD_PRICE_FIELD,
  CURRENCY_FIELD,
  DESCRIPTION_FIELD,
  DURATION_FIELD,
  INFANT_PRICE_FIELD,
  RECURRENCE_DAY_FIELD,
  RECURRENCE_ID_FIELD,
  RECURRENCE_START_FIELD,
  RECURRENCE_TIME_FIELD,
  SLOT_ID_FIELD,
  SLOT_STATUS_FIELD,
  SPOKEN_LANGUAGE_FIELD,
  TAGS_FIELD,
  TEXT_LANGUAGE_PARAM,
  TITLE_FIELD,
  STEP_TITLE_FIELD,
  STEP_BODY_FIELD,
  MEETING_ADDRESS_FIELD,
  MEETING_LATITUDE_FIELD,
  MEETING_LONGITUDE_FIELD,
  MEETING_INSTRUCTIONS_FIELD,
  MINIMUM_AGE_FIELD,
  ACTIVITY_LEVEL_FIELD,
  WHAT_TO_BRING_FIELD,
  NOT_INCLUDED_FIELD,
  ACCESSIBILITY_FIELD,
  WEEKDAYS,
  toMajorAmountInput,
} from '@/features/host/experience-fields'
import { ExperienceForm, ItineraryEditor, SpokenLanguagePicker } from '@/features/host/experience-forms'
import { MediaUploader } from '@/features/host/media-uploader'
import {
  ACTIVITY_LEVELS,
  HostExperienceAccessError,
  categoryMessageKey,
  fetchCategorySlugs,
  fetchCurrencies,
  fetchHostExperience,
  fetchHostSchedule,
  hostExperiencePath,
  requirementMessageKey,
  type CurrencyOption,
  type HostExperience,
  type HostExperienceTranslation,
  type HostPricing,
  type HostSchedule,
  type HostSlot,
} from '@/features/host/experiences-api'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
import { formatWallClock } from '@/features/i18n/format'
import { getPluralTemplates, getTemplate, getTranslator } from '@/features/i18n/translator'
import { MIN_CITY_QUERY_LENGTH, prefersEnglishCityName } from '@/features/places/api'
import { contentLanguages, localNameOf } from '@/lib/languages'
import { path } from '@/lib/routes'

/**
 * Sihirbazın gövdesi ve ilanın kalıcı düzenleme ekranı — **aynı sayfa**.
 *
 * Ayrı yazılmamalarının nedeni tek cümlede: ikisi de aynı altı alanı soruyor.
 * Ayrı yazılsalardı bir gün ayrışır ve "sihirbazda sorulup düzenlemede
 * gösterilmeyen alan" doğardı. Sayfa duruma göre farklı DAVRANIYOR ama tek yerde:
 * taslakta numaralı bölümler ve eksik listesi öne çıkıyor, yayındayken şehir
 * kilitleniyor ve arşivleme öne geçiyor.
 *
 * ## Her bölüm kendi formu
 *
 * `PATCH /api/host/experiences/{id}` gerçek bir delta: verilmeyen alan değişmiyor.
 * Bu yüzden "kapasiteyi düzelt" isteği şehir alanını taşımak zorunda değil — ve
 * taşımamalı, çünkü şehir seçicisi boş bırakılsaydı tek formda şehri sessizce
 * silerdi. Her bölümün kendi kaydet düğmesi, kendi hata kutusu ve kendi "kaydedildi"
 * onayı var; sihirbazın "kaydet ve devam et" akışı budur.
 *
 * ## Çeviri sekmeleri URL'de
 *
 * Hangi dilin metninin düzenlendiği `?metin-dili=` ile taşınıyor, istemci durumuyla
 * değil. Üç kazanç: sekme JS'siz çalışıyor, geri tuşu beklendiği gibi davranıyor ve
 * sekme değişimi sunucudan taze veri getiriyor (bir dilde kaydettikten sonra
 * diğerine geçince bayat metin görünmüyor).
 *
 * ## Yol neden lokalize değil
 *
 * `/tr/host/experience/{id}` — `/tr/host/deneyim/{id}` değil. Gerekçe
 * `hostExperiencePath` üzerinde yazılı: dinamik segmentli lokalize yol,
 * `next.config.ts`'in üretemediği joker karakterli bir rewrite istiyor. Lokalize
 * URL kuralının gerekçesi (`hreflang`, paylaşılabilirlik) bu sayfa için geçerli
 * değil: sayfa oturum arkasında ve `noindex`.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    // Başlık ilanın kendi başlığını TAŞIMIYOR: `generateMetadata` içinde oturum
    // okuyup API'ye gitmek her ziyarette fazladan bir tur eder ve sekme başlığı
    // bunu hak etmiyor. Ayrıca sayfa zaten `noindex`.
    title: `${t('host.experience.edit.meta.title')} · Expyra`,
    robots: { index: false, follow: false },
  }
}

export default async function EditExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ lang, id }, query] = await Promise.all([params, searchParams])
  const t = await getTranslator(lang)
  const session = await getSession()

  // Yetki kararı BURADA, `proxy.ts`'te değil: proxy yalnız "çerez var mı" bakan
  // iyimser bir kestirme. `redirect` NEXT_REDIRECT fırlattığı için hiçbir `try`
  // bloğunun içinde çağrılmıyor.
  if (!session?.accessToken) {
    redirect(signInHref(lang, id))
  }

  const loaded = await loadExperience(session.accessToken, id)

  if (loaded === 'signedOut') {
    redirect(signInHref(lang, id))
  }

  if (loaded === 'notHost') {
    // Rolü olmayan kullanıcı hata değil, eksik bir adım: "Host ol" ekranı hem
    // açıklıyor hem de tek tıkla çözüyor (ve taze token yazıyor).
    redirect(path(lang, 'becomeHost'))
  }

  if (loaded === null) {
    // Olmayan ilan ile BAŞKASININ ilanı aynı cevabı alıyor — API de öyle yapıyor
    // (404, 403 değil): 403 "bu id'de bir ilan var" bilgisini sızdırırdı.
    notFound()
  }

  const experience = loaded

  // Takvim ve para birimi kayıt defteri PARALEL: ikisi de ilan verisine bağlı
  // değil ve seri beklemek sayfayı iki tur geciktirirdi.
  //
  // Fiyat `schedule.pricing` içinden geliyor, ayrı bir uçtan değil: yazma ucu
  // TAM DEĞİŞTİRME yapıyor, yani formun kayıtlı değeri okuyabilmesi şart —
  // okuyamazsa boş gönderilen bir form mevcut kademeleri siler.
  const [categories, currencies, schedule] = await Promise.all([
    fetchCategorySlugs(),
    fetchCurrencies(),
    fetchHostSchedule(session.accessToken, experience.id),
  ])

  const activeLanguage = resolveActiveLanguage(experience, query[TEXT_LANGUAGE_PARAM])
  const activeTranslation =
    experience.translations.find((item) => item.language === activeLanguage) ?? null

  // Şablon olarak iniyor (fonksiyon değil): istemci bileşeni `{n}`'i kendi dolduruyor.
  const stepTitleTemplate = await getTemplate(lang, 'host.experience.itinerary.stepTitle.label')

  const heading = titleOf(experience) ?? t('host.experience.untitled')

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
        <a
          href={path(lang, 'becomeHost')}
          className="text-on-media text-sm text-white/80 underline underline-offset-4 hover:text-white"
        >
          {t('host.experience.back')}
        </a>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/*
              `lang` özniteliği İLANIN dilinde: ekran okuyucu Türkçe bir başlığı
              İngilizce fonetikle okumasın (WCAG 3.1.2). Başlık host'un içeriği,
              sayfanın arayüz dili değil (docs/I18N.md §1).
            */}
            <h1
              lang={experience.originalLanguage}
              className="text-on-media text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              {heading}
            </h1>
            <p className="text-on-media mt-2 max-w-xl text-white/85">
              {t('host.experience.edit.lede')}
            </p>
          </div>

          <StatusPill status={experience.status} t={t} />
        </div>

        <div className="mt-8 grid gap-6">
          <Section
            index={1}
            title={t('host.experience.section.text')}
            help={t('host.experience.section.textHelp')}
          >
            <TranslationTabs
              lang={lang}
              experience={experience}
              activeLanguage={activeLanguage}
              t={t}
            />

            {/*
              `key`: sekme değişince form YENİDEN kuruluyor. Olmasaydı React aynı
              örneği koruyup `defaultValue`'yu yok sayar ve Türkçe metin İngilizce
              sekmesinde görünmeye devam ederdi.
            */}
            <ExperienceForm
              key={activeLanguage}
              action={setTranslationAction}
              lang={lang}
              experienceId={experience.id}
              textLanguage={activeLanguage}
              className="auth-form"
              variant="primary"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <TranslationFields
                activeLanguage={activeLanguage}
                translation={activeTranslation}
                t={t}
              />
            </ExperienceForm>
          </Section>

          <Section
            index={2}
            title={t('host.experience.section.basics')}
            help={t('host.experience.section.basicsHelp')}
          >
            <ExperienceForm
              action={updateExperienceAction}
              lang={lang}
              experienceId={experience.id}
              section="temel"
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <BasicsFields experience={experience} t={t} />
            </ExperienceForm>
          </Section>

          {/*
            `relative z-20`: `.glass` içinde `isolation: isolate` var, yani her
            bölüm kendi yığın bağlamını kuruyor. Bağlam z-auto kalırsa şehir
            seçicinin paneli (bağlam İÇİNDE z-30) DOM'da sonra gelen bölümlerin
            altında çizilir — `experience-search.tsx`'te aynı tuzak yazılı.
          */}
          <Section
            index={3}
            className="relative z-20"
            title={t('host.experience.section.place')}
            help={t('host.experience.section.placeHelp')}
          >
            <PlaceSection lang={lang} experience={experience} t={t} />
          </Section>

          <Section
            index={4}
            title={t('host.experience.section.category')}
            help={t('host.experience.section.categoryHelp')}
          >
            <ExperienceForm
              action={updateExperienceAction}
              lang={lang}
              experienceId={experience.id}
              section="kategori"
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <CategoryField experience={experience} categories={categories} t={t} />
            </ExperienceForm>
          </Section>

          <Section
            index={5}
            title={t('host.experience.section.languages')}
            help={t('host.experience.section.languagesHelp')}
          >
            <ExperienceForm
              action={updateExperienceAction}
              lang={lang}
              experienceId={experience.id}
              section="listeler"
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <SpokenLanguageField lang={lang} experience={experience} t={t} />
              <TagsField experience={experience} t={t} />
            </ExperienceForm>
          </Section>

          {/*
            Üç bölüm (program, buluşma noktası, bilmen gerekenler) 01'deki dil
            sekmesine BAĞLI: metinleri içerik, yani dil başına ayrı satır. Sekme
            değişince `key` formu yeniden kuruyor (01 ile aynı gerekçe).
          */}
          <Section
            index={6}
            title={t('host.experience.section.itinerary')}
            help={t('host.experience.section.itineraryHelp')}
          >
            <TextLanguageNote lang={lang} activeLanguage={activeLanguage} t={t} />
            <ExperienceForm
              key={`program-${activeLanguage}`}
              action={setItineraryAction}
              lang={lang}
              experienceId={experience.id}
              textLanguage={activeLanguage}
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <ItineraryEditor
                lang={activeLanguage}
                uiLang={lang}
                initial={experience.itinerary
                  .filter((step) => step.language === activeLanguage)
                  .map((step) => ({ title: step.title, body: step.body ?? '' }))}
                names={{ title: STEP_TITLE_FIELD, body: STEP_BODY_FIELD }}
                labels={{
                  stepTitle: stepTitleTemplate,
                  titlePlaceholder: t('host.experience.itinerary.stepTitle.placeholder'),
                  bodyPlaceholder: t('host.experience.itinerary.stepBody.placeholder'),
                  add: t('host.experience.itinerary.add'),
                  remove: t('host.experience.itinerary.remove'),
                  help: t('host.experience.itinerary.help'),
                }}
              />
            </ExperienceForm>
          </Section>

          <Section
            index={7}
            title={t('host.experience.section.meeting')}
            help={t('host.experience.section.meetingHelp')}
          >
            <TextLanguageNote lang={lang} activeLanguage={activeLanguage} t={t} />
            <ExperienceForm
              key={`bulusma-${activeLanguage}`}
              action={setMeetingPointAction}
              lang={lang}
              experienceId={experience.id}
              textLanguage={activeLanguage}
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <MeetingPointFields
                experience={experience}
                translation={activeTranslation}
                activeLanguage={activeLanguage}
                t={t}
              />
            </ExperienceForm>
          </Section>

          <Section
            index={8}
            title={t('host.experience.section.details')}
            help={t('host.experience.section.detailsHelp')}
          >
            <TextLanguageNote lang={lang} activeLanguage={activeLanguage} t={t} />
            <ExperienceForm
              key={`bilgi-${activeLanguage}`}
              action={setDetailsAction}
              lang={lang}
              experienceId={experience.id}
              textLanguage={activeLanguage}
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <DetailsFields
                experience={experience}
                translation={activeTranslation}
                activeLanguage={activeLanguage}
                t={t}
              />
            </ExperienceForm>
          </Section>

          {/* Yayından ÖNCE: kapak görseli bir yayın koşulu (PLAN Blok 6 kabul
              kriteri 3) ve sihirbazın sırası koşulların sırasını izliyor. */}
          <Section
            index={9}
            title={t('host.media.heading')}
            help={t('host.media.hint')}
          >
            <MediaUploader
              experienceId={experience.id}
              language={lang}
              media={experience.media}
              /* Metinler SUNUCUDA çözülüp iniyor: sözlük `server-only` ve
                 tarayıcıya yalnız bu ilanın ihtiyacı olan dizgeler gidiyor
                 (experience-forms.tsx ile aynı karar). */
              labels={{
                hint: t('host.media.hint'),
                add: t('host.media.add'),
                drop: t('host.media.drop'),
                uploading: t('host.media.uploading'),
                empty: t('host.media.empty'),
                cover: t('host.media.cover'),
                makeCover: t('host.media.makeCover'),
                delete: t('host.media.delete'),
                moveEarlier: t('host.media.moveEarlier'),
                moveLater: t('host.media.moveLater'),
                positions: experience.media.map((_, index) => t('host.media.position', { n: index + 1 })),
                errorRejected: t('host.media.error.rejected'),
                errorTooLarge: t('host.media.error.tooLarge'),
              }}
            />
          </Section>

          <Section
            index={10}
            title={t('host.experience.section.schedule')}
            help={t('host.experience.section.scheduleHelp')}
          >
            <ScheduleSection
              lang={lang}
              experienceId={experience.id}
              schedule={schedule}
              t={t}
            />
          </Section>

          <Section
            index={11}
            title={t('host.experience.section.pricing')}
            help={t('host.experience.section.pricingHelp')}
          >
            <ExperienceForm
              action={updatePricingAction}
              lang={lang}
              experienceId={experience.id}
              className="auth-form"
              labels={{
                submit: t('host.experience.save'),
                pending: t('host.experience.saving'),
              }}
            >
              <PricingFields pricing={schedule.pricing} currencies={currencies} t={t} />
            </ExperienceForm>
          </Section>

          <Section
            index={12}
            title={t('host.experience.section.status')}
            help={t('host.experience.section.statusHelp')}
          >
            <PublishSection lang={lang} experience={experience} t={t} />
          </Section>
        </div>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

// --- Bölümler ----------------------------------------------------------------

/** Numaralı cam kart. Numara sihirbaz hissini veren tek görsel öge. */
function Section({
  index,
  title,
  help,
  className = '',
  children,
}: {
  index: number
  title: string
  help: string
  /** Yığın bağlamı gereken bölümler için (bkz. şehir bölümü). */
  className?: string
  children: ReactNode
}) {
  const headingId = `bolum-${index}`

  return (
    <section
      aria-labelledby={headingId}
      className={`glass glass-edge rounded-[var(--radius-glass-lg)] p-6 sm:p-8 ${className}`}
    >
      <div className="flex items-baseline gap-3">
        <span aria-hidden="true" className="font-mono text-xs text-fg-muted">
          {String(index).padStart(2, '0')}
        </span>
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{help}</p>

      {children}
    </section>
  )
}

/**
 * Çeviri sekmeleri.
 *
 * **Orijinal dil daima ilk sırada ve "zorunlu" rozetiyle** (docs/I18N.md §2): o
 * satır fallback zincirinin sonu ve yayın kapısının dört koşulundan biri. Diğer
 * diller isteğe bağlı ve rozetleri de öyle diyor — kullanıcı hangi dilin şart
 * olduğunu tahmin etmek zorunda kalmıyor.
 *
 * Sekmeler `<a>`: JS olmadan çalışıyor ve her geçiş sunucudan taze metin getiriyor.
 * `role="tablist"` KULLANILMIYOR — o rol, panelin aynı sayfada JS ile değiştiği
 * durumu anlatır; buradaki her sekme ayrı bir URL, yani bir gezinme bağlantısı.
 */
function TranslationTabs({
  lang,
  experience,
  activeLanguage,
  t,
}: {
  lang: string
  experience: HostExperience
  activeLanguage: string
  t: Translate
}) {
  const written = experience.translations.map((item) => item.language)

  // Orijinal dil + yazılmış diller + (henüz yazılmamışsa) o an açık olan dil.
  const languages = [
    experience.originalLanguage,
    ...written.filter((code) => code !== experience.originalLanguage),
    ...(written.includes(activeLanguage) || activeLanguage === experience.originalLanguage
      ? []
      : [activeLanguage]),
  ]

  const base = hostExperiencePath(lang, experience.id)

  return (
    <div className="mt-5">
      <nav aria-label={t('host.experience.translations.tabsLabel')}>
        <ul className="flex flex-wrap gap-2">
          {languages.map((code) => {
            const isActive = code === activeLanguage
            const isOriginal = code === experience.originalLanguage

            return (
              <li key={code}>
                <a
                  href={`${base}?${TEXT_LANGUAGE_PARAM}=${encodeURIComponent(code)}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 rounded-[var(--radius-glass-sm)] px-3 py-2 text-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-[color-mix(in_oklch,var(--color-brand-500)_18%,transparent)] font-semibold text-fg'
                      : 'text-fg-muted hover:bg-[rgb(var(--glass-tint)_/_0.35)]'
                  }`}
                >
                  <span>{localNameOf(code, lang) ?? code}</span>
                  <span className="text-[0.6875rem] text-fg-muted">
                    {isOriginal
                      ? t('host.experience.translations.required')
                      : t('host.experience.translations.optional')}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/*
        Yeni dil ekleme: düz GET formu. Sunucu eylemi DEĞİL — burada yazılan hiçbir
        şey yok, yalnız hangi metnin düzenleneceği seçiliyor. `next/form` submit'te
        alanı URL'e yazıp istemci tarafında geçiyor; JS kapalıyken de düz form olarak
        çalışıyor (`experience-search.tsx` ile aynı kalıp).
      */}
      <Form action={base} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="auth-label" htmlFor="ceviri-dili-ekle">
            {t('host.experience.translations.add.label')}
          </label>
          <select
            id="ceviri-dili-ekle"
            name={TEXT_LANGUAGE_PARAM}
            className="auth-input"
            defaultValue={activeLanguage}
          >
            {languageOptions(lang).map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="glass glass-edge glass-interactive h-12 rounded-[var(--radius-glass-sm)] px-4 text-sm font-medium">
          {t('host.experience.translations.add.submit')}
        </button>
      </Form>
    </div>
  )
}

function TranslationFields({
  activeLanguage,
  translation,
  t,
}: {
  activeLanguage: string
  translation: HostExperienceTranslation | null
  t: Translate
}) {
  return (
    <>
      <div>
        <label className="auth-label" htmlFor="baslik">
          {t('host.experience.title.label')}
        </label>
        <input
          id="baslik"
          name={TITLE_FIELD}
          className="auth-input"
          type="text"
          required
          /* Sunucudaki sınır (`ExperienceTranslation.MaxTitleLength`); aşan girdi
             zaten 400 alıyor ama kullanıcı gönderdikten sonra değil, yazarken
             durdurulmalı. */
          maxLength={120}
          /* Metin ilanın dilinde yazılıyor: yazım denetimi ve ekran okuyucu
             telaffuzu o dile göre olmalı. */
          lang={activeLanguage}
          defaultValue={translation?.title ?? ''}
          placeholder={t('host.experience.title.placeholder')}
          aria-describedby="baslik-yardim"
        />
        <p id="baslik-yardim" className="auth-help">
          {t('host.experience.title.help')}
        </p>
      </div>

      <div>
        <label className="auth-label" htmlFor="aciklama">
          {t('host.experience.description.label')}
        </label>
        <textarea
          id="aciklama"
          name={DESCRIPTION_FIELD}
          className="auth-input"
          /* Yükseklik `rows` ile: `.auth-input`'un `min-height: 3rem`'i bir taban,
             tavan değil — Tailwind yardımcı sınıfıyla ezmeye gerek yok. */
          rows={8}
          maxLength={4000}
          lang={activeLanguage}
          defaultValue={translation?.description ?? ''}
          placeholder={t('host.experience.description.placeholder')}
          aria-describedby="aciklama-yardim"
        />
        <p id="aciklama-yardim" className="auth-help">
          {t('host.experience.description.help')}
        </p>
      </div>

      {/*
        Makine çevirisi rozeti. Bu blokta hiç görünmüyor (tüm satırlar
        `HostWritten`) ama alan sözleşmede var ve Blok 10 onu dolduracak; rozeti
        şimdi yazmak, o gün "otomatik çeviriyi host yazmış gibi göstermek"
        hatasını imkânsız kılıyor (docs/I18N.md §2).
      */}
      {translation?.source === 'Machine' ? (
        <p className="text-sm text-fg-muted">{t('host.experience.translations.machine')}</p>
      ) : null}
    </>
  )
}

function BasicsFields({ experience, t }: { experience: HostExperience; t: Translate }) {
  return (
    <>
      <div>
        <label className="auth-label" htmlFor="sure">
          {t('host.experience.duration.label')}
        </label>
        <input
          id="sure"
          name={DURATION_FIELD}
          className="auth-input"
          type="number"
          inputMode="numeric"
          /*
            `min` ADIMIN KATI olmak ZORUNDA. HTML5 geçerli değerleri
            `min + k·step` olarak sayıyor, yani `min=1, step=5` iken küme
            1, 6, 11 … 116, 121 oluyordu ve 60, 90, 120 — en yaygın üç süre —
            tarayıcı tarafından reddediliyordu. Hata mesajı da anlaşılmazdı:
            "en yakın geçerli değerler 116 ve 121".

            Alt sınır 5 dakika: sunucu 1'i kabul ediyor ama 1 dakikalık bir
            deneyim gerçek bir girdi değil ve tabanı adıma eşitlemek zaten
            gerekiyordu.
          */
          min={5}
          /* `Experience.MaxDurationMinutes` — 7 gün. 10080 = 5'in katı. */
          max={10080}
          step={5}
          /*
            0 = "henüz girilmedi" ve alan BOŞ açılıyor. Boş gönderim sunucuya
            hiçbir şey yazmıyor ("dokunma"); 0 yazmaya çalışsaydı doğrulama
            reddederdi ve kullanıcı adımı atlayamazdı.
          */
          defaultValue={experience.durationMinutes || ''}
          aria-describedby="sure-yardim"
        />
        <p id="sure-yardim" className="auth-help">
          {t('host.experience.duration.help')}
        </p>
      </div>

      <div>
        <label className="auth-label" htmlFor="kapasite">
          {t('host.experience.capacity.label')}
        </label>
        <input
          id="kapasite"
          name={CAPACITY_FIELD}
          className="auth-input"
          type="number"
          inputMode="numeric"
          min={1}
          /* `Experience.MaxCapacity`. */
          max={500}
          defaultValue={experience.capacity || ''}
          aria-describedby="kapasite-yardim"
        />
        <p id="kapasite-yardim" className="auth-help">
          {t('host.experience.capacity.help')}
        </p>
      </div>
    </>
  )
}

/**
 * Şehir bölümü.
 *
 * **Yayınlanmış ilanın şehri KİLİTLİ** ve seçici hiç çizilmiyor. Sunucu bunu 409
 * ile reddediyor (saat dilimi şehirden türüyor ve Blok 7'den sonra rezervasyonların
 * yeri kayardı); arayüz de aynı kuralı önden söylüyor — kullanıcıya çalışmayacak
 * bir kontrol göstermek, hatayı denemeden önce gizlemek olurdu.
 *
 * **Seçili şehrin ADI gösterilemiyor** ve bu bilinen bir eksik: API'de uuid'den
 * şehre giden bir uç yok (`features/places/api.ts`: "`GET /api/places/cities/{id}`
 * YOK") ve ilan yanıtı yalnız `cityId` ile `timeZoneId` taşıyor. Uydurmak yerine
 * elimizdeki doğru bilgi yazılıyor: şehrin seçili olduğu ve hangi saat diliminde
 * olduğu. Uç eklendiğinde burası şehrin adını basar.
 */
function PlaceSection({
  lang,
  experience,
  t,
}: {
  lang: string
  experience: HostExperience
  t: Translate
}) {
  const locked = experience.publishedAtUtc !== null

  const status = experience.cityId
    ? t('host.experience.place.saved', { saat: experience.timeZoneId ?? '—' })
    : t('host.experience.place.empty')

  if (locked) {
    return (
      <div className="mt-5 grid gap-2">
        <p className="text-sm font-medium">{status}</p>
        <p className="auth-help">{t('host.experience.place.locked')}</p>
      </div>
    )
  }

  return (
    <>
      <p className="mt-5 text-sm font-medium">{status}</p>
      <ExperienceForm
        action={updateExperienceAction}
        lang={lang}
        experienceId={experience.id}
        section="sehir"
        className="auth-form"
        labels={{ submit: t('host.experience.save'), pending: t('host.experience.saving') }}
      >
        <CityFieldSlot lang={lang} t={t} />
      </ExperienceForm>
    </>
  )
}

/**
 * Şehir seçici — `components/search/city-picker.tsx` aynen yeniden kullanılıyor.
 *
 * Bileşen forma yalnız kayıt defterindeki bir şehrin doğal anahtarını (`cz-prague`)
 * yazıyor; kullanıcının yazdığı ham metnin `name` özniteliği yok, yani tarayıcı onu
 * gönderemiyor. "Seçilmeyen metin sessizce yok sayılmaz" kuralı burada da yapısal.
 *
 * `defaultCity` verilemiyor (yukarıdaki uuid→şehir eksiği), yani alan her zaman boş
 * açılıyor. Host'un gördüğü hikâye tutarlı kalıyor çünkü seçili şehrin durumu
 * alanın ÜSTÜNDE yazılı.
 */
async function CityFieldSlot({ lang, t }: { lang: string; t: Translate }) {
  const [cityResults, cityCounts, citySelected] = await Promise.all([
    getPluralTemplates(lang, 'search.city.results'),
    getPluralTemplates(lang, 'search.city.countryCities'),
    getTemplate(lang, 'search.city.selectedValue'),
  ])

  /*
    Sarmalayıcı çerçeve: seçici arama çubuğu için yazıldı ve kendi kenarlığını
    çizmiyor (`.search-field` kenarlıksız). Formda tek başına dururken diğer
    alanlarla aynı kutuyu göstersin diye çerçeve burada, `.auth-input`'un
    değerleriyle.
  */
  return (
    <div className="rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] bg-[rgb(var(--glass-tint)_/_0.35)]">
      <CityPicker
        lang={lang}
        /* Hangi dilin İngilizce exonimi tercih ettiği kararı SUNUCUDA. */
        preferEnglishName={prefersEnglishCityName(lang)}
        minQueryLength={MIN_CITY_QUERY_LENGTH}
        labels={{
          field: t('host.experience.city.label'),
          placeholder: t('host.experience.city.placeholder'),
          // Kalan metinler gerçekten genel: aynı liste, aynı durumlar.
          listLabel: t('search.city.listLabel'),
          countriesHeading: t('search.city.countriesHeading'),
          citiesHeading: t('search.city.citiesHeading'),
          allCountries: t('search.city.allCountries'),
          tooShort: t('search.city.tooShort'),
          loading: t('search.city.loading'),
          error: t('search.city.error'),
          empty: t('search.city.empty'),
          truncated: t('search.city.truncated'),
          clear: t('search.city.clear'),
          selectedValue: citySelected,
        }}
        forms={{ results: cityResults, countryCities: cityCounts }}
      />
    </div>
  )
}

/**
 * Kategori. Ad veritabanında YOK — API yalnız slug dönüyor, karşılığı arayüz
 * sözlüğünde (docs/I18N.md §1). Sıra API'den geliyor (`sort_order`): alfabetik
 * sıra her dilde farklı ve hiçbirinde anlamlı değil.
 *
 * Kategori BOŞALTILAMIYOR (ucun sözleşmesi: skalerlerde "temizle" niyeti yok), o
 * yüzden bir kez seçildikten sonra boş seçenek çizilmiyor — çizilseydi seçmek
 * sessiz bir işlemsizlik olurdu.
 */
function CategoryField({
  experience,
  categories,
  t,
}: {
  experience: HostExperience
  categories: string[]
  t: Translate
}) {
  return (
    <div>
      <label className="auth-label" htmlFor="kategori">
        {t('host.experience.category.label')}
      </label>
      {/*
        `key` ŞART: React, `action` ile gönderilen formu eylem bitince sıfırlıyor ve
        `<select>`'te sonradan değişen `defaultValue`'yu uygulamıyor (input'ta
        uyguluyor). Anahtar olmadan sunucu yeni kategoriyi döndürse de kutu ilk
        yüklenen değere geri dönüyordu — DB doğru, ekran yanlış.
      */}
      <select
        key={experience.categorySlug ?? ''}
        id="kategori"
        name={CATEGORY_FIELD}
        className="auth-input"
        required
        defaultValue={experience.categorySlug ?? ''}
        aria-describedby="kategori-yardim"
      >
        {experience.categorySlug ? null : <option value="">{t('host.experience.category.none')}</option>}
        {categories.map((slug) => {
          const key = categoryMessageKey(slug)
          return (
            <option key={slug} value={slug}>
              {/* Sözlükte karşılığı olmayan slug GİZLENMİYOR: ham hâliyle
                  gösteriliyor, `categoryMessageKey` de konsola yazıyor. */}
              {key ? t(key) : slug}
            </option>
          )
        })}
      </select>
      <p id="kategori-yardim" className="auth-help">
        {t('host.experience.category.help')}
      </p>
    </div>
  )
}

/**
 * Deneyim sırasında KONUŞULAN diller — ilan metninin dili değil (docs/I18N.md §3).
 * Prag'daki host ilanını İngilizce yazıp turu Çekçe anlatabilir; gezgin için
 * kritik olan ikincisi.
 *
 * Onay kutusu, `<select multiple>` değil: çoklu select telefonda ve ekran
 * okuyucuda güvenilmez, onay kutusu her yerde aynı davranıyor. Hiçbiri
 * işaretlenmeden kaydetmek "hepsini kaldır" demek — bölüm işareti (`bolum=listeler`)
 * bu niyeti "bu formda bu alan yok"tan ayırıyor.
 */
async function SpokenLanguageField({
  lang,
  experience,
  t,
}: {
  lang: string
  experience: HostExperience
  t: Translate
}) {
  const results = await getPluralTemplates(lang, 'host.experience.spoken.search.results')

  // Açıklama `fieldset`'e bağlı, içindeki kutuya değil: grup adını `legend`
  // veriyor, `aria-describedby` de o gruba ait olmalı ki ekran okuyucu ilk onay
  // kutusuna girerken kuralı (on dil sınırı) duysun.
  return (
    <fieldset aria-describedby="konusulan-yardim">
      <legend className="auth-label">{t('host.experience.spoken.label')}</legend>
      <p id="konusulan-yardim" className="auth-help">
        {t('host.experience.spoken.help')}
      </p>

      {/* Liste ve süzgeç istemcide (experience-forms.tsx); seçenekler ve metinler
          SUNUCUDA çözülüyor — sözlük `server-only`. */}
      <SpokenLanguagePicker
        lang={lang}
        name={SPOKEN_LANGUAGE_FIELD}
        options={languageOptions(lang)}
        selected={experience.spokenLanguages}
        labels={{
          search: t('host.experience.spoken.search.label'),
          placeholder: t('host.experience.spoken.search.placeholder'),
          none: t('host.experience.spoken.search.none'),
          results,
        }}
      />
    </fieldset>
  )
}

/**
 * "Bu bölümün metinleri Türkçe" notu. Üç bölüm 01'deki sekmeyi paylaşıyor ama
 * sekme ekranın üstünde; host 08'e indiğinde hangi dilde yazdığını görmeli.
 */
function TextLanguageNote({
  lang,
  activeLanguage,
  t,
}: {
  lang: string
  activeLanguage: string
  t: Translate
}) {
  return (
    <p className="mt-3 text-xs text-fg-muted">
      {t('host.experience.textLanguage.note', {
        dil: localNameOf(activeLanguage, lang) ?? activeLanguage,
      })}
    </p>
  )
}

function MeetingPointFields({
  experience,
  translation,
  activeLanguage,
  t,
}: {
  experience: HostExperience
  translation: HostExperienceTranslation | null
  activeLanguage: string
  t: Translate
}) {
  const point = experience.meetingPoint

  return (
    <>
      <div>
        <label className="auth-label" htmlFor="bulusma-adres">
          {t('host.experience.meeting.address.label')}
        </label>
        <input
          id="bulusma-adres"
          name={MEETING_ADDRESS_FIELD}
          className="auth-input"
          type="text"
          maxLength={240}
          defaultValue={point?.address ?? ''}
          placeholder={t('host.experience.meeting.address.placeholder')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="auth-label" htmlFor="bulusma-enlem">
            {t('host.experience.meeting.latitude.label')}
          </label>
          {/* `type="text"` + `inputMode="decimal"`: number alanı bazı tarayıcılarda
              virgülü yutuyor; ayrıştırma sunucu eyleminde (`readCoordinate`). */}
          <input
            id="bulusma-enlem"
            name={MEETING_LATITUDE_FIELD}
            className="auth-input"
            type="text"
            inputMode="decimal"
            defaultValue={point?.latitude ?? ''}
            placeholder="41.0256"
            aria-describedby="bulusma-koordinat-yardim"
          />
        </div>
        <div>
          <label className="auth-label" htmlFor="bulusma-boylam">
            {t('host.experience.meeting.longitude.label')}
          </label>
          <input
            id="bulusma-boylam"
            name={MEETING_LONGITUDE_FIELD}
            className="auth-input"
            type="text"
            inputMode="decimal"
            defaultValue={point?.longitude ?? ''}
            placeholder="28.9744"
            aria-describedby="bulusma-koordinat-yardim"
          />
        </div>
      </div>
      <p id="bulusma-koordinat-yardim" className="auth-help">
        {t('host.experience.meeting.coords.help')}
      </p>

      <div>
        <label className="auth-label" htmlFor="bulusma-yonerge">
          {t('host.experience.meeting.instructions.label')}
        </label>
        <textarea
          id="bulusma-yonerge"
          name={MEETING_INSTRUCTIONS_FIELD}
          className="auth-input"
          rows={3}
          maxLength={1000}
          lang={activeLanguage}
          defaultValue={translation?.meetingInstructions ?? ''}
          placeholder={t('host.experience.meeting.instructions.placeholder')}
        />
      </div>
    </>
  )
}

function DetailsFields({
  experience,
  translation,
  activeLanguage,
  t,
}: {
  experience: HostExperience
  translation: HostExperienceTranslation | null
  activeLanguage: string
  t: Translate
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="auth-label" htmlFor="yas-siniri">
            {t('host.experience.details.minimumAge.label')}
          </label>
          <input
            id="yas-siniri"
            name={MINIMUM_AGE_FIELD}
            className="auth-input"
            type="number"
            min={1}
            max={99}
            step={1}
            defaultValue={experience.minimumAge ?? ''}
            aria-describedby="yas-siniri-yardim"
          />
          <p id="yas-siniri-yardim" className="auth-help">
            {t('host.experience.details.minimumAge.help')}
          </p>
        </div>
        <div>
          <label className="auth-label" htmlFor="aktivite-seviyesi">
            {t('host.experience.details.activityLevel.label')}
          </label>
          {/* `key`: form gönderiminden sonra select sıfırlanıyor (kategori seçicisi notu). */}
          <select
            key={experience.activityLevel ?? ''}
            id="aktivite-seviyesi"
            name={ACTIVITY_LEVEL_FIELD}
            className="auth-input"
            defaultValue={experience.activityLevel ?? ''}
          >
            <option value="">{t('host.experience.details.activityLevel.none')}</option>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`experience.activity.${level}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DetailTextArea
        id="yaninda-getir"
        name={WHAT_TO_BRING_FIELD}
        label={t('host.experience.details.whatToBring.label')}
        placeholder={t('host.experience.details.whatToBring.placeholder')}
        value={translation?.whatToBring}
        lang={activeLanguage}
      />
      <DetailTextArea
        id="dahil-degil"
        name={NOT_INCLUDED_FIELD}
        label={t('host.experience.details.notIncluded.label')}
        placeholder={t('host.experience.details.notIncluded.placeholder')}
        value={translation?.notIncluded}
        lang={activeLanguage}
      />
      <DetailTextArea
        id="erisilebilirlik"
        name={ACCESSIBILITY_FIELD}
        label={t('host.experience.details.accessibility.label')}
        placeholder={t('host.experience.details.accessibility.placeholder')}
        value={translation?.accessibility}
        lang={activeLanguage}
      />
    </>
  )
}

function DetailTextArea({
  id,
  name,
  label,
  placeholder,
  value,
  lang,
}: {
  id: string
  name: string
  label: string
  placeholder: string
  value: string | null | undefined
  lang: string
}) {
  return (
    <div>
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        className="auth-input"
        rows={3}
        maxLength={1000}
        lang={lang}
        defaultValue={value ?? ''}
        placeholder={placeholder}
      />
    </div>
  )
}

function TagsField({ experience, t }: { experience: HostExperience; t: Translate }) {
  return (
    <div>
      <label className="auth-label" htmlFor="etiketler">
        {t('host.experience.tags.label')}
      </label>
      <input
        id="etiketler"
        name={TAGS_FIELD}
        className="auth-input"
        type="text"
        /* Virgülle ayrılmış tek alan; ayrıştırma sunucuda (`readTags`). */
        defaultValue={experience.tags.join(', ')}
        placeholder={t('host.experience.tags.placeholder')}
        aria-describedby="etiket-yardim"
      />
      <p id="etiket-yardim" className="auth-help">
        {t('host.experience.tags.help')}
      </p>
    </div>
  )
}

/**
 * Yayın bölümü.
 *
 * **Eksikler önce liste olarak, sonra hata olarak.** Kontrol listesi her zaman
 * DOM'da (boşken "hazır" satırı) ve sunucunun `missingPublishRequirements`
 * alanından besleniyor — yani ekranda yazan ile 409'un gerekçesi aynı kaynaktan
 * geliyor, ayrışamıyorlar.
 *
 * **Düğme devre dışı BIRAKILMIYOR.** Kapalı bir düğme odak almadığı için ekran
 * okuyucu kullanıcısına neden kapalı olduğunu söyleyemez; ayrıca kuralın iki
 * yerde (arayüz + sunucu) yaşamasına kapı açar. Basıldığında gelen 409, eksikleri
 * `role="alert"` içinde duyuruyor.
 */
/**
 * Takvim bölümü — haftalık kural, kapalı günler ve yaklaşan seanslar.
 *
 * **Ay ızgarası YOK ve bu bilinçli bir eşik.** Bir takvim ızgarası klavye
 * gezinmesi (ok tuşları, `grid` rolü, `aria-selected`) ve odak yönetimi demek;
 * yarım yapılmış bir ızgara, düz bir listeden daha erişilemez olur. Liste
 * host'un ihtiyacı olan iki soruyu zaten cevaplıyor: "hangi seanslar var" ve
 * "hangisini kapatabilirim". Izgara gerçekten gerektiğinde kendi işini hak
 * ediyor.
 *
 * **Saatler `formatWallClock` ile çiziliyor**, `new Date()` ile değil: sunucu
 * saat dilimi eki OLMAYAN bir duvar saati gönderiyor ve `new Date()` onu
 * tarayıcının dilimine göre yorumlardı — host Prag'daki turunu İstanbul'dan
 * açtığında saatler bir saat kayardı.
 */
function ScheduleSection({
  lang,
  experienceId,
  schedule,
  t,
}: {
  lang: string
  experienceId: string
  schedule: HostSchedule
  t: Translate
}) {
  // Ön koşul eksikse form GÖSTERİLMİYOR ama bölüm duruyor: host neyin eksik
  // olduğunu görüp yukarıdaki bölüme dönebilmeli. Sunucu da aynı kararı veriyor
  // (409) — ikisi ayrışırsa ekran "kaydet" der, sunucu reddeder.
  if (schedule.missingScheduleRequirements.length > 0) {
    return <p className="auth-help">{t('host.schedule.blocked')}</p>
  }

  // Saat RENDER SIRASINDA okunmuyor (`Date.now()` bileşeni saf olmaktan çıkarır
  // ve `react-hooks/purity` haklı olarak reddediyor). Gerek de yok: sunucu
  // pencereyi zaten deneyimin saat dilimindeki BUGÜNDEN başlatıyor ve satırlar
  // başlangıca göre sıralı geliyor.
  //
  // Kalan tek pürüz, bugünün saati geçmiş seansları: listede görünüyorlar ve
  // düğmeleri 409 alıyor ("geçmiş seans değiştirilemez"). Bu, saat okuyup onları
  // gizlemekten daha dürüst — host kendi takvimindeki o seansı görüyor, sadece
  // artık değiştiremiyor.
  const upcoming = schedule.slots
  const shown = upcoming.slice(0, SCHEDULE_SLOT_PREVIEW)

  return (
    <div className="grid gap-6">
      <p className="auth-help">
        {t('host.schedule.timeZone', { bolge: schedule.timeZoneId })}
        {schedule.generatedThroughLocalDate
          ? ` · ${t('host.schedule.generatedThrough', { tarih: schedule.generatedThroughLocalDate })}`
          : ''}
      </p>

      <ScheduleBlock heading={t('host.schedule.rule.heading')}>
        {schedule.recurrences.length === 0 ? (
          <p className="auth-help">{t('host.schedule.rule.empty')}</p>
        ) : (
          <ul className="grid gap-2">
            {schedule.recurrences.map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  {t(weekdayMessageKey(rule.dayOfWeek))} · {rule.startTimeLocal}
                  {rule.status === 'stopped' ? ` (${t('host.schedule.rule.stopped')})` : ''}
                </span>

                {rule.status === 'active' ? (
                  <ExperienceForm
                    action={stopRecurrenceAction}
                    lang={lang}
                    experienceId={experienceId}
                    size="sm"
                    labels={{
                      submit: t('host.schedule.rule.stop'),
                      pending: t('host.schedule.rule.stopping'),
                    }}
                  >
                    <input type="hidden" name={RECURRENCE_ID_FIELD} value={rule.id} />
                  </ExperienceForm>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <ExperienceForm
          action={createRecurrenceAction}
          lang={lang}
          experienceId={experienceId}
          className="auth-form"
          labels={{
            submit: t('host.schedule.rule.submit'),
            pending: t('host.schedule.rule.pending'),
          }}
        >
          {/*
            `fieldset`/`legend`: yedi onay kutusu tek bir soruya ait ve ekran
            okuyucu her kutuyu bağlamsız okumamalı (`SpokenLanguageField` ile
            aynı kalıp).
          */}
          <fieldset aria-describedby="gun-yardim">
            <legend className="auth-label">{t('host.schedule.rule.days')}</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={RECURRENCE_DAY_FIELD} value={day} />
                  {t(weekdayMessageKey(day))}
                </label>
              ))}
            </div>
            <p id="gun-yardim" className="auth-help">
              {t('host.schedule.rule.daysHelp')}
            </p>
          </fieldset>

          <div>
            <label className="auth-label" htmlFor="saat">
              {t('host.schedule.rule.time')}
            </label>
            <input
              id="saat"
              name={RECURRENCE_TIME_FIELD}
              type="time"
              className="auth-input"
              required
              aria-describedby="saat-yardim"
            />
            <p id="saat-yardim" className="auth-help">
              {t('host.schedule.rule.timeHelp')}
            </p>
          </div>

          <div>
            <label className="auth-label" htmlFor="kural-baslangic">
              {t('host.schedule.rule.start')}
            </label>
            <input
              id="kural-baslangic"
              name={RECURRENCE_START_FIELD}
              type="date"
              className="auth-input"
              aria-describedby="kural-baslangic-yardim"
            />
            <p id="kural-baslangic-yardim" className="auth-help">
              {t('host.schedule.rule.startHelp')}
            </p>
          </div>
        </ExperienceForm>
      </ScheduleBlock>

      <ScheduleBlock heading={t('host.schedule.blackout.heading')}>
        {schedule.blackouts.length === 0 ? (
          <p className="auth-help">{t('host.schedule.blackout.empty')}</p>
        ) : (
          <ul className="grid gap-2">
            {schedule.blackouts.map((blackout) => (
              <li key={blackout.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  {blackout.startsOnLocal === blackout.endsOnLocal
                    ? blackout.startsOnLocal
                    : `${blackout.startsOnLocal} – ${blackout.endsOnLocal}`}
                </span>

                <ExperienceForm
                  action={deleteBlackoutAction}
                  lang={lang}
                  experienceId={experienceId}
                  size="sm"
                  labels={{
                    submit: t('host.schedule.blackout.remove'),
                    pending: t('host.schedule.blackout.removing'),
                  }}
                >
                  <input type="hidden" name={BLACKOUT_ID_FIELD} value={blackout.id} />
                </ExperienceForm>
              </li>
            ))}
          </ul>
        )}

        <ExperienceForm
          action={createBlackoutAction}
          lang={lang}
          experienceId={experienceId}
          className="auth-form"
          labels={{
            submit: t('host.schedule.blackout.submit'),
            pending: t('host.schedule.blackout.pending'),
          }}
        >
          <div>
            <label className="auth-label" htmlFor="kapali-baslangic">
              {t('host.schedule.blackout.start')}
            </label>
            <input
              id="kapali-baslangic"
              name={BLACKOUT_START_FIELD}
              type="date"
              className="auth-input"
              required
            />
          </div>

          <div>
            <label className="auth-label" htmlFor="kapali-bitis">
              {t('host.schedule.blackout.end')}
            </label>
            <input
              id="kapali-bitis"
              name={BLACKOUT_END_FIELD}
              type="date"
              className="auth-input"
              aria-describedby="kapali-bitis-yardim"
            />
            <p id="kapali-bitis-yardim" className="auth-help">
              {t('host.schedule.blackout.endHelp')}
            </p>
          </div>
        </ExperienceForm>
      </ScheduleBlock>

      <ScheduleBlock heading={t('host.schedule.slots.heading')}>
        {shown.length === 0 ? (
          <p className="auth-help">{t('host.schedule.slots.empty')}</p>
        ) : (
          <ul className="grid gap-2">
            {shown.map((slot) => (
              <SlotRow key={slot.slotId} lang={lang} experienceId={experienceId} slot={slot} t={t} />
            ))}
          </ul>
        )}

        {upcoming.length > shown.length ? (
          <p className="auth-help">
            {t('host.schedule.slots.more', { n: upcoming.length - shown.length })}
          </p>
        ) : null}
      </ScheduleBlock>
    </div>
  )
}

/** Kaç seans gösteriliyor. Liste bir ÖNİZLEME; tamamı ay görünümünün işi olacak. */
const SCHEDULE_SLOT_PREVIEW = 12

function ScheduleBlock({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{heading}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </div>
  )
}

function SlotRow({
  lang,
  experienceId,
  slot,
  t,
}: {
  lang: string
  experienceId: string
  slot: HostSlot
  t: Translate
}) {
  const closed = slot.status === 'closed'

  return (
    <li className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm">
        {/*
          Duvar saati: sunucu deneyimin saat dilimindeki saati gönderdi ve
          gösterilecek şey tam olarak o. `new Date()` bir saat kaydırırdı.
        */}
        <span className="font-medium">
          {formatWallClock(lang, slot.startsAtLocal, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>{' '}
        <span className="text-fg-muted">
          {closed
            ? slot.closedReason === 'blackout'
              ? t('host.schedule.slots.closedByBlackout')
              : t('host.schedule.slots.closed')
            : t('host.schedule.slots.remaining', { n: slot.remainingCapacity })}
        </span>
      </span>

      <ExperienceForm
        action={setSlotStatusAction}
        lang={lang}
        experienceId={experienceId}
        size="sm"
        labels={
          closed
            ? { submit: t('host.schedule.slots.open'), pending: t('host.schedule.slots.opening') }
            : { submit: t('host.schedule.slots.close'), pending: t('host.schedule.slots.closing') }
        }
      >
        <input type="hidden" name={SLOT_ID_FIELD} value={slot.slotId} />
        <input type="hidden" name={SLOT_STATUS_FIELD} value={closed ? 'open' : 'closed'} />
      </ExperienceForm>
    </li>
  )
}

/**
 * Gün adı → sözlük anahtarı. Sunucu `"monday"` gönderiyor (sayı değil, CLAUDE.md
 * #8) ve karşılığı arayüzde — gün adları bizim metnimiz, host'un içeriği değil.
 */
function weekdayMessageKey(day: string): SimpleMessageKey {
  switch (day) {
    case 'monday':
      return 'host.schedule.day.monday'
    case 'tuesday':
      return 'host.schedule.day.tuesday'
    case 'wednesday':
      return 'host.schedule.day.wednesday'
    case 'thursday':
      return 'host.schedule.day.thursday'
    case 'friday':
      return 'host.schedule.day.friday'
    case 'saturday':
      return 'host.schedule.day.saturday'
    default:
      return 'host.schedule.day.sunday'
  }
}

function PricingFields({
  pricing,
  currencies,
  t,
}: {
  pricing: HostPricing | null
  currencies: CurrencyOption[]
  t: Translate
}) {
  const minorUnits = pricing?.minorUnits ?? 2

  // Boş ile SIFIR ayrı: boş = "bu kademeyi sunmuyorum", 0 = "ücretsiz".
  // `|| ''` yazılsaydı ücretsiz bir kademe sunulmuyor gibi görünürdü.
  const amountOf = (guestType: string): string => {
    const rule = pricing?.rules.find((item) => item.guestType === guestType)
    return rule ? toMajorAmountInput(rule.unitAmountMinor, minorUnits) : ''
  }

  const locked = pricing?.currencyLocked ?? false

  return (
    <>
      <div>
        <label className="auth-label" htmlFor="para-birimi">
          {t('host.pricing.currency.label')}
        </label>
        {/*
          Yayındaki ilanda seçici KİLİTLİ ama `disabled` DEĞİL: devre dışı bir
          alan form gövdesine hiç girmez ve sunucu para birimini "boş" görüp
          reddederdi. `readOnly` de `<select>` üzerinde çalışmıyor — bu yüzden
          seçenek listesi tek satıra indiriliyor: değiştirilemiyor ama
          gönderiliyor.
        */}
        <select
          /* `key`: kategori seçicisiyle aynı sebep (form sıfırlama + select). */
          key={pricing?.currency ?? ''}
          id="para-birimi"
          name={CURRENCY_FIELD}
          className="auth-input"
          required
          defaultValue={pricing?.currency ?? ''}
          aria-describedby="para-birimi-yardim"
        >
          {pricing ? null : <option value="">{t('host.pricing.currency.placeholder')}</option>}
          {(locked && pricing
            ? currencies.filter((item) => item.code === pricing.currency)
            : currencies
          ).map((item) => (
            <option key={item.code} value={item.code}>
              {item.symbol
                ? `${item.code} — ${item.englishName} (${item.symbol})`
                : `${item.code} — ${item.englishName}`}
            </option>
          ))}
        </select>
        <p id="para-birimi-yardim" className="auth-help">
          {locked ? t('host.pricing.currency.locked') : t('host.pricing.currency.help')}
        </p>
      </div>

      <PriceField
        id="yetiskin-fiyat"
        name={ADULT_PRICE_FIELD}
        label={t('host.pricing.adult.label')}
        help={t('host.pricing.adult.help')}
        defaultValue={amountOf('adult')}
        required
      />
      <PriceField
        id="cocuk-fiyat"
        name={CHILD_PRICE_FIELD}
        label={t('host.pricing.child.label')}
        help={t('host.pricing.child.help')}
        defaultValue={amountOf('child')}
      />
      <PriceField
        id="bebek-fiyat"
        name={INFANT_PRICE_FIELD}
        label={t('host.pricing.infant.label')}
        help={t('host.pricing.infant.help')}
        defaultValue={amountOf('infant')}
      />
    </>
  )
}

/**
 * Tek kademe tutarı.
 *
 * **Tutar ANA birimde giriliyor** (`45.50`), API'ye MİNÖR birimde gidiyor
 * (`4550`). Çevrimi sunucu eylemi yapıyor (`parseMinorAmount`), form değil:
 * çevrimi yapan taraf para biriminin üssünü bilmek zorunda ve o üs kayıt
 * defterinde — istemcide bir kopya tutmak JPY'yi yüz kat yanlış kaydeden ikinci
 * bir doğruluk kaynağı olurdu.
 *
 * **`step="any"`** ve bu bilinçli: doğru adım seçilen para biriminin üssüne bağlı
 * (JPY 1, EUR 0.01, KWD 0.001) ve seçici değişince adımın da değişmesi gerekirdi
 * — yani istemci durumu. Sabit `step="0.01"` JPY'de tarayıcıyı "geçersiz" demeye
 * zorlardı. Gerçek doğrulama sunucuda ve fazla haneyi o reddediyor.
 */
function PriceField({
  id,
  name,
  label,
  help,
  defaultValue,
  required = false,
}: {
  id: string
  name: string
  label: string
  help: string
  defaultValue: string
  required?: boolean
}) {
  return (
    <div>
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        className="auth-input"
        required={required}
        defaultValue={defaultValue}
        aria-describedby={`${id}-yardim`}
      />
      <p id={`${id}-yardim`} className="auth-help">
        {help}
      </p>
    </div>
  )
}

function PublishSection({
  lang,
  experience,
  t,
}: {
  lang: string
  experience: HostExperience
  t: Translate
}) {
  const missing = experience.missingPublishRequirements
  const canPublish = experience.status !== 'Published'
  const canArchive = experience.status !== 'Archived'

  return (
    <>
      <div className="mt-5">
        <h3 className="text-sm font-medium">{t('host.experience.missing.heading')}</h3>

        {missing.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">{t('host.experience.ready')}</p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm text-fg-muted">
            {missing.map((code) => (
              <li key={code} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{t(requirementMessageKey(code))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        {canPublish ? (
          <ExperienceForm
            action={publishExperienceAction}
            lang={lang}
            experienceId={experience.id}
            variant="primary"
            size="lg"
            labels={{
              submit:
                experience.status === 'Archived'
                  ? t('host.experience.republish')
                  : t('host.experience.publish'),
              pending: t('host.experience.publishing'),
            }}
          />
        ) : null}

        {canArchive ? (
          <ExperienceForm
            action={archiveExperienceAction}
            lang={lang}
            experienceId={experience.id}
            size="lg"
            labels={{
              submit: t('host.experience.archive'),
              pending: t('host.experience.archiving'),
            }}
          />
        ) : null}
      </div>

      <p className="auth-help">
        {experience.status === 'Published'
          ? t('host.experience.status.publishedNote')
          : t('host.experience.status.privateNote')}
      </p>
    </>
  )
}

function StatusPill({ status, t }: { status: HostExperience['status']; t: Translate }) {
  const key: SimpleMessageKey =
    status === 'Published'
      ? 'host.listings.status.published'
      : status === 'Archived'
        ? 'host.listings.status.archived'
        : 'host.listings.status.draft'

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
        status === 'Published'
          ? 'bg-[color-mix(in_oklch,var(--color-brand-500)_18%,transparent)] text-fg'
          : 'glass glass-edge text-fg-muted'
      }`}
    >
      {t(key)}
    </span>
  )
}

// --- Yardımcılar -------------------------------------------------------------

/**
 * Erişim hataları YÖNLENDİRME sebebi, ekran değil; bu yüzden sayfa onları
 * `HostExperienceAccessError`'dan okuyup üç dala ayırıyor. Diğer her hata
 * (5xx, ağ) YUTULMUYOR ve hata sınırına gidiyor (CLAUDE.md #1).
 */
async function loadExperience(
  accessToken: string,
  id: string,
): Promise<HostExperience | null | 'signedOut' | 'notHost'> {
  try {
    return await fetchHostExperience(accessToken, id)
  } catch (error) {
    if (error instanceof HostExperienceAccessError) {
      return error.reason === 'signedOut' ? 'signedOut' : 'notHost'
    }
    throw error
  }
}

/**
 * Hangi dilin metni düzenleniyor.
 *
 * Tanınmayan ya da eksik parametre ORİJİNAL DİLE düşüyor — 404 değil: burada
 * eksik olan bir sayfa değil, bir sekme seçimi. Orijinal dil doğru varsayılan
 * çünkü zorunlu olan o (docs/I18N.md §2); ilanın yazılmamış tek satırı varsa
 * kullanıcıyı doğrudan oraya koyuyor.
 */
function resolveActiveLanguage(
  experience: HostExperience,
  raw: string | string[] | undefined,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return experience.originalLanguage

  const trimmed = value.trim()
  if (!trimmed) return experience.originalLanguage

  // Kayıt defterinde olan bir dil mi? Değilse sunucu zaten 400 döner; kullanıcıyı
  // yazdıktan sonra değil, sekmeyi açarken doğru yere koymak daha dürüst.
  const known = contentLanguages.some(
    (language) => language.code.toLowerCase() === trimmed.toLowerCase(),
  )

  return known ? trimmed : experience.originalLanguage
}

/** Panelde ve başlıkta gösterilecek ad: orijinal dildeki başlık. */
function titleOf(experience: HostExperience): string | null {
  return (
    experience.translations.find((item) => item.language === experience.originalLanguage)?.title ??
    null
  )
}

function signInHref(lang: string, id: string): string {
  const query = new URLSearchParams({ [RETURN_TO_PARAM]: hostExperiencePath(lang, id) })
  return `${path(lang, 'signIn')}?${query.toString()}`
}

/**
 * Dil seçenekleri SUNUCUDA üretiliyor (`Intl.DisplayNames` verisi sayfanın diline
 * bağlı; istemcide üretilseydi ICU sürüm farkı hidrasyon uyuşmazlığı çıkarırdı).
 * Biçim `account/page.tsx` ile aynı: "日本語 — Japonca".
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
