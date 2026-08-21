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
  setTranslationAction,
  updateExperienceAction,
} from '@/features/host/experience-actions'
import {
  CAPACITY_FIELD,
  CATEGORY_FIELD,
  DESCRIPTION_FIELD,
  DURATION_FIELD,
  SPOKEN_LANGUAGE_FIELD,
  TAGS_FIELD,
  TEXT_LANGUAGE_PARAM,
  TITLE_FIELD,
} from '@/features/host/experience-fields'
import { ExperienceForm } from '@/features/host/experience-forms'
import {
  HostExperienceAccessError,
  categoryMessageKey,
  fetchCategorySlugs,
  fetchHostExperience,
  hostExperiencePath,
  requirementMessageKey,
  type HostExperience,
  type HostExperienceTranslation,
} from '@/features/host/experiences-api'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
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
  const categories = await fetchCategorySlugs()

  const activeLanguage = resolveActiveLanguage(experience, query[TEXT_LANGUAGE_PARAM])
  const activeTranslation =
    experience.translations.find((item) => item.language === activeLanguage) ?? null

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

          <Section
            index={6}
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
          min={1}
          /* `Experience.MaxDurationMinutes` — 7 gün. */
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
      <select
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
function SpokenLanguageField({
  lang,
  experience,
  t,
}: {
  lang: string
  experience: HostExperience
  t: Translate
}) {
  const selected = new Set(experience.spokenLanguages)

  // Açıklama `fieldset`'e bağlı, içindeki kutuya değil: grup adını `legend`
  // veriyor, `aria-describedby` de o gruba ait olmalı ki ekran okuyucu ilk onay
  // kutusuna girerken kuralı (on dil sınırı) duysun.
  return (
    <fieldset aria-describedby="konusulan-yardim">
      <legend className="auth-label">{t('host.experience.spoken.label')}</legend>
      <p id="konusulan-yardim" className="auth-help">
        {t('host.experience.spoken.help')}
      </p>

      <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] p-3 sm:grid-cols-2">
        {languageOptions(lang).map((option) => (
          <label key={option.code} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              name={SPOKEN_LANGUAGE_FIELD}
              value={option.code}
              defaultChecked={selected.has(option.code)}
              className="h-4 w-4"
            />
            <span className="min-w-0 truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
