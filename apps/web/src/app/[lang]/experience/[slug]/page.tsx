import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import {
  experienceCoverStyle,
  formatExperienceDuration,
} from '@/components/experience/experience-card'
import { ExperienceCard } from '@/components/experience/experience-card'
import { GlassButton } from '@/components/ui/glass-button'
import {
  experienceAlternates,
  experiencePath,
  fetchAvailability,
  fetchExperience,
  fetchQuote,
  type GuestAvailability,
  type GuestExperienceDetail,
  type GuestQuote,
  fetchExperiences,
} from '@/features/experiences/api'
import {
  categoryMessageKey,
  fetchCurrencies,
  type CurrencyOption,
} from '@/features/host/experiences-api'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
import { formatMinorMoney, formatWallClock } from '@/features/i18n/format'
import { getTranslator } from '@/features/i18n/translator'
import { cityDisplayName, cityKeyOf } from '@/features/places/api'
import { localNameOf } from '@/lib/languages'
import { path } from '@/lib/routes'

/**
 * Deneyim detayı — `/tr/deneyim/<slug>` · `/en/experience/<slug>`.
 *
 * ## Tek çağrı, iki tüketici
 *
 * `generateMetadata` ve render aynı ilanı istiyor; `fetchExperience` React
 * `cache`'iyle sarmalı olduğu için API'ye TEK tur atılıyor (PLAN Blok 5, kabul
 * kriteri 4: "detay sayfası SSR'da tek sorguda dolar, N+1 yok"). Şehir, metin,
 * konuşulan diller ve etiketler o tek yanıtın içinde — ikinci bir uç yok.
 *
 * ## Slug dile göre değişmiyor — hreflang halkasının şartı bu
 *
 * API slug'ı orijinal dildeki başlıktan BİR KEZ üretiyor ve başlık düzeltilse bile
 * değiştirmiyor. Yani `/tr/deneyim/x` ile `/en/experience/x` gerçekten aynı kaynak
 * ve `alternates.languages` bir halka kurabiliyor. Slug dile göre değişseydi her dil
 * ayrı bir kaynak olur, `hreflang` de yalan söylerdi.
 *
 * ## Yayında olmayan her şey 404
 *
 * Taslak, arşiv, banlı host'un ilanı ve olmayan slug — dördü de API'de aynı 404
 * (403 değil: enumeration). Sayfa da ayrım yapmıyor; `notFound()` dilin kendi 404
 * ekranını çiziyor.
 */

type PageParams = Promise<{ lang: string; slug: string }>

/** Paylaşım önizlemelerinde kırpılan sınır; cümle ortasında kesmemek için kelimeden bölünüyor. */
const META_DESCRIPTION_LENGTH = 160

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, slug } = await params
  const experience = await fetchExperience(slug, lang)

  // Metadata 404 üretmiyor (sayfanın işi); burada boş dönmek layout'un genel
  // başlığını bırakıyor.
  if (!experience) return {}

  const t = await getTranslator(lang)

  return {
    title: `${experience.text.title} · Expyra`,
    description:
      summarize(experience.text.description) ??
      t('experience.detail.meta.fallback', {
        sehir: cityDisplayName(lang, experience.city),
      }),
    alternates: {
      /* Kanonik URL, adres çubuğundakinin değil KAYIT DEFTERİNDEKİ slug'la
         kuruluyor: büyük harfli ya da farklı yazılmış bir bağlantı aynı sayfayı
         açıyor, arama motoru ise tek bir adresi görüyor. */
      canonical: experiencePath(lang, experience.slug),
      languages: experienceAlternates(experience.slug),
    },
  }
}

export default async function ExperienceDetail({
  params,
  searchParams,
}: {
  params: PageParams
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ lang, slug }, query] = await Promise.all([params, searchParams])
  const [t, experience] = await Promise.all([getTranslator(lang), fetchExperience(slug, lang)])

  if (!experience) {
    notFound()
  }

  const party = partyFrom(query)
  const selectedSlotId = slotFrom(query)
  const displayCurrency = currencyFrom(query)

  /*
    Müsaitlik ve teklif AYRI çağrılar ve teklif SEANS SEÇİLİNCE geliyor: seçim
    yokken hesaplanacak bir toplam da yok. İkisini tek uca sıkıştırmak, sayfayı
    her açılışta gereksiz bir hesap yaptırırdı.

    Teklif hatası sayfayı DÜŞÜRMÜYOR: kapasite aşımı ve kapanmış seans normal
    durumlar (409) ve panelin geri kalanı — tarihler, kişi seçimi — çalışmaya
    devam etmeli. Beklenmeyen hata yine de loglanıyor (CLAUDE.md #1).
  */
  const availability = await fetchAvailability({ slug, currency: displayCurrency }).catch(
    (error: unknown) => {
      console.error('experience.availability.failed', error)
      return null
    },
  )

  const quote =
    selectedSlotId === null
      ? null
      : await fetchQuote({
          slug,
          slotId: selectedSlotId,
          ...party,
          currency: displayCurrency,
        }).catch(() => null)

  // Para birimi kayıt defteri: anonim ve bir saat önbellekli, yani seçici bedava.
  const currencies = await fetchCurrencies()

  /*
    "Bu şehirdeki diğer deneyimler": Blok 8'in liste ucu şehir filtresiyle,
    yeni uç yok (#37). Kendisi listeden çıkarılıyor; başka ilan yoksa bölüm
    çizilmiyor. Liste başarısız olursa sayfa DÜŞMÜYOR — ikincil içerik.
  */
  const nearby = await fetchExperiences({ lang, city: cityKeyOf(experience.city) })
    .then((page) => page.items.filter((item) => item.slug !== experience.slug).slice(0, 6))
    .catch((error: unknown) => {
      console.error('experience.nearby.failed', error)
      return []
    })

  const categoryKey = categoryMessageKey(experience.categorySlug)
  const cityName = cityDisplayName(lang, experience.city)
  const textLanguage = localNameOf(experience.text.language, lang) ?? experience.text.language
  const cityHref = `${path(lang, 'explore')}?nerede=${encodeURIComponent(cityKeyOf(experience.city))}`

  const booking = (
    <BookingPanel
      lang={lang}
      experience={experience}
      availability={availability}
      quote={quote}
      party={party}
      selectedSlotId={selectedSlotId}
      displayCurrency={displayCurrency}
      currencies={currencies}
      t={t}
    />
  )

  const knowRows = [
    experience.minimumAge !== null
      ? {
          label: t('experience.detail.know.minimumAge'),
          value: t('experience.detail.know.minimumAgeValue', { n: experience.minimumAge }),
          lang: undefined,
        }
      : null,
    experience.activityLevel !== null
      ? {
          label: t('experience.detail.know.activityLevel'),
          value: t(`experience.activity.${experience.activityLevel}`),
          lang: undefined,
        }
      : null,
    experience.text.whatToBring
      ? {
          label: t('experience.detail.know.whatToBring'),
          value: experience.text.whatToBring,
          lang: experience.text.language,
        }
      : null,
    experience.text.notIncluded
      ? {
          label: t('experience.detail.know.notIncluded'),
          value: experience.text.notIncluded,
          lang: experience.text.language,
        }
      : null,
    experience.text.accessibility
      ? {
          label: t('experience.detail.know.accessibility'),
          value: experience.text.accessibility,
          lang: experience.text.language,
        }
      : null,
  ].filter((row) => row !== null)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 pt-6 pb-16 sm:px-10">
        <a
          href={cityHref}
          className="inline-flex items-center gap-2 rounded-[4px] text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <span aria-hidden="true">←</span>
          {t('experience.detail.cityLink', { sehir: cityName })}
        </a>

        {/*
          Üst blok: solda fotoğraf ızgarası, sağda kimlik. Tek kolonda (mobil)
          ızgara önce geliyor — başlığı okumadan önce görsel karar veriliyor.
        */}
        <section className="mt-5 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <PhotoGrid experience={experience} />

          <div className="lg:pt-2">
            {categoryKey && (
              <p className="text-[0.8125rem] font-bold tracking-[0.12em] text-brand-600 uppercase">
                {t(categoryKey)} · {cityName}
              </p>
            )}

            {/* Başlık host'un dilinde: ekran okuyucu doğru fonetikle okusun
                (WCAG 3.1.2). Sayfanın `<html lang>`i değişmiyor. */}
            <h1
              className="mt-3 text-[2rem] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-[2.75rem]"
              lang={experience.text.language}
            >
              {experience.text.title}
            </h1>

            {experience.text.isFallback && (
              /*
                İstenen dilde çeviri yoktu; zincir (docs/I18N.md §2) başka bir dile
                düştü ve arayüz bunu GİZLEMİYOR. Dil ADI `Intl.DisplayNames`'ten.
              */
              <p className="mt-4 inline-flex rounded-full bg-brand-500/12 px-3 py-1 text-xs font-semibold text-brand-700">
                {t('experience.detail.text.fallback', { dil: textLanguage })}
              </p>
            )}

            {experience.text.description && (
              <p
                className="mt-5 text-[1.0625rem] leading-relaxed text-pretty text-fg-muted"
                lang={experience.text.language}
              >
                {summarize(experience.text.description)}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="pill">{formatExperienceDuration(t, experience.durationMinutes)}</span>
              <span className="pill">
                {t('experience.detail.capacity.value', { n: experience.capacity })}
              </span>
              {experience.spokenLanguages.length > 0 && (
                <span className="pill">
                  {experience.spokenLanguages
                    .map((code) => localNameOf(code, lang) ?? code)
                    .join(' · ')}
                </span>
              )}
            </div>

            {/*
              Host satırı: misafirin "kime güveniyorum" sorusunun ilk cevabı.
              Profil sayfası henüz yok, o yüzden LİNK DEĞİL — tıklanabilir görünüp
              hiçbir yere gitmemek, hiç tıklanabilir olmamaktan kötü.
            */}
            <div className="mt-8 flex items-center gap-4 border-t border-[var(--line)] pt-6">
              <HostAvatar host={experience.host} size={48} />
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-bold">
                  {experience.host.displayName ?? t('experience.detail.host.anonymous')}
                </p>
                {experience.host.headline && (
                  <p
                    className="mt-0.5 text-sm text-fg-muted"
                    lang={experience.host.bioLanguage ?? undefined}
                  >
                    {experience.host.headline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Alt blok: solda hikâye, sağda YAPIŞKAN rezervasyon kartı. */}
        <section className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
          <div className="grid gap-10">
            {experience.itinerary && experience.itinerary.steps.length > 0 && (
              <Section heading={t('experience.detail.itinerary.heading')} first>
                {experience.itinerary.isFallback && (
                  <p className="mb-4 inline-flex rounded-full bg-brand-500/12 px-3 py-1 text-xs font-semibold text-brand-700">
                    {t('experience.detail.text.fallback', {
                      dil:
                        localNameOf(experience.itinerary.language, lang) ??
                        experience.itinerary.language,
                    })}
                  </p>
                )}
                {/* Sıralı liste: adımların sırası içeriğin parçası, ekran okuyucu
                    "1/5" diye duyuruyor. */}
                <ol className="grid" lang={experience.itinerary.language}>
                  {experience.itinerary.steps.map((step, index) => {
                    const last = index === experience.itinerary!.steps.length - 1
                    return (
                      <li
                        key={`${index}-${step.title}`}
                        className="relative grid grid-cols-[2.5rem_1fr] items-start gap-5"
                      >
                        <span className="relative flex justify-center" aria-hidden="true">
                          {!last && (
                            <span className="absolute top-10 bottom-0 w-px bg-[var(--line-strong)]" />
                          )}
                          <span className="flex size-10 items-center justify-center rounded-full bg-[rgb(16_24_40_/_0.05)] font-mono text-sm font-bold">
                            {index + 1}
                          </span>
                        </span>
                        <div className={last ? 'pt-1.5' : 'pt-1.5 pb-8'}>
                          <p className="text-[1.0625rem] font-bold">{step.title}</p>
                          {step.body && (
                            <p className="mt-1 text-[0.9375rem] leading-relaxed whitespace-pre-line text-fg-muted">
                              {step.body}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </Section>
            )}

            <Section heading={t('experience.detail.about')} first={!experience.itinerary}>
              {experience.text.description ? (
                /*
                  Host'un yazdığı düz metin. `whitespace-pre-line` paragraf
                  aralarını koruyor; React zaten kaçırıyor, yani HTML enjekte
                  edilemiyor.
                */
                <p
                  className="max-w-[42rem] text-[1.0625rem] leading-[1.7] text-pretty whitespace-pre-line"
                  lang={experience.text.language}
                >
                  {experience.text.description}
                </p>
              ) : (
                /* Yayın doğrulaması çeviri SATIRINI şart koşuyor, açıklamanın dolu
                   olmasını değil — yani bu boşluk bir hata değil, bir durum. */
                <p className="text-[0.9375rem] text-fg-muted">
                  {t('experience.detail.noDescription')}
                </p>
              )}
            </Section>

            {(experience.meetingPoint || experience.text.meetingInstructions) && (
              <Section heading={t('experience.detail.meeting.heading')}>
                {experience.meetingPoint?.address && (
                  <p className="text-[1.0625rem] font-semibold">
                    {experience.meetingPoint.address}
                  </p>
                )}
                {experience.text.meetingInstructions && (
                  <p
                    className="mt-1 text-[0.9375rem] leading-relaxed whitespace-pre-line text-fg-muted"
                    lang={experience.text.language}
                  >
                    {experience.text.meetingInstructions}
                  </p>
                )}
                {/*
                  Harita BAĞLANTI, gömülü değil: üçüncü taraf iframe/script CSP ve
                  KVKK sorusu açıyor (#34'te karar). OSM bağlantısı herkeste
                  çalışıyor ve telefon onu harita uygulamasına devrediyor.
                */}
                {experience.meetingPoint?.latitude != null &&
                  experience.meetingPoint.longitude != null && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${experience.meetingPoint.latitude}&mlon=${experience.meetingPoint.longitude}#map=17/${experience.meetingPoint.latitude}/${experience.meetingPoint.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-600 underline-offset-4 hover:underline"
                    >
                      {t('experience.detail.meeting.map')}
                      <span aria-hidden="true">→</span>
                    </a>
                  )}
              </Section>
            )}

            {knowRows.length > 0 && (
              <Section heading={t('experience.detail.know.heading')}>
                {/* Tasarımın üç sütunu; satır sayısı içeriğe göre değişiyor. */}
                <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {knowRows.map((row) => (
                    <KnowRow key={row.label} label={row.label} value={row.value} lang={row.lang} />
                  ))}
                </dl>
              </Section>
            )}

            <Section heading={t('experience.detail.host.heading')}>
              <div className="surface grid grid-cols-[auto_1fr] items-start gap-6 p-6">
                <HostAvatar host={experience.host} size={72} />
                <div className="min-w-0">
                  <p className="text-lg font-extrabold">
                    {experience.host.displayName ?? t('experience.detail.host.anonymous')}
                  </p>
                  {experience.host.headline && (
                    <p
                      className="mt-0.5 text-sm text-fg-muted"
                      lang={experience.host.bioLanguage ?? undefined}
                    >
                      {experience.host.headline}
                    </p>
                  )}
                  {experience.host.bio && (
                    <>
                      {/* Biyografi tek dilde (host_profile notu); arayüz diliyle
                          eşleşmiyorsa rozet — metin rozetiyle aynı cümle. */}
                      {experience.host.bioLanguage && experience.host.bioLanguage !== lang && (
                        <p className="mt-3 inline-flex rounded-full bg-brand-500/12 px-3 py-1 text-xs font-semibold text-brand-700">
                          {t('experience.detail.text.fallback', {
                            dil:
                              localNameOf(experience.host.bioLanguage, lang) ??
                              experience.host.bioLanguage,
                          })}
                        </p>
                      )}
                      <p
                        className="mt-3.5 text-[0.9375rem] leading-relaxed whitespace-pre-line"
                        lang={experience.host.bioLanguage ?? undefined}
                      >
                        {experience.host.bio}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Section>

            {experience.tags.length > 0 && (
              <Section heading={t('experience.detail.tags.heading')}>
                <ul className="flex flex-wrap gap-2">
                  {experience.tags.map((tag) => (
                    <li
                      key={tag}
                      className="pill"
                      /* Etiketler host'un yazdığı içerik — ilan metniyle aynı dilde. */
                      lang={experience.text.language}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          {/*
            `top-24`: yapışkan header 5rem; kart onun altına girmesin.
            Mobilde yapışkan DEĞİL — küçük ekranda ekranın yarısını yer.
          */}
          <aside className="lg:sticky lg:top-24">{booking}</aside>
        </section>

        {nearby.length > 0 && (
          <section
            className="mt-16 border-t border-[var(--line)] pt-10"
            aria-labelledby="yakindaki-deneyimler"
          >
            <h2 id="yakindaki-deneyimler" className="section-title">
              {t('experience.detail.nearby.heading', { sehir: cityName })}
            </h2>
            <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-5 gap-y-8">
              {nearby.map((item) => (
                <ExperienceCard key={item.slug} item={item} lang={lang} t={t} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

/**
 * Fotoğraf ızgarası: tasarımın 2×2 karesi.
 *
 * Işık kutusu (lightbox) YOK ve bu bilinçli: açılan bir katman klavye tuzağı ve
 * odak yönetimi demek — yarım yapıldığında erişilebilirliği bozar. Tasarımdaki
 * "N fotoğrafın tümü" düğmesi de bu yüzden yok; dördün üstündeki görseller
 * ızgaranın altındaki şeritte, doğrudan okunabilir boyutta.
 *
 * `alt` BOŞ: host'tan alternatif metin ALINMIYOR (#11), uyduracağımız her metin
 * ekran okuyucuya bilgi değil gürültü taşırdı.
 */
function PhotoGrid({ experience }: { experience: GuestExperienceDetail }) {
  const tiles = experience.images.slice(0, 4)
  const rest = experience.images.slice(4)

  if (tiles.length === 0) {
    /* Kapaksız eski ilanlar. Gradyan kartla AYNI fonksiyondan geliyor — aynı ilan
       listede ve detayda aynı rengi taşıyor. */
    return (
      <div
        className="aspect-[4/3] w-full rounded-[var(--radius-glass-lg)]"
        style={experienceCoverStyle(experience.slug)}
        aria-hidden="true"
      />
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-[var(--radius-glass-lg)]">
        {tiles.map((image, index) => (
          <div
            key={image.url}
            /* Tek görselde iki sütunu kaplıyor. İki `aspect-*` sınıfını AYNI
               dizede yan yana yazmak işe yaramıyor: hangisinin kazandığını
               stylesheet sırası belirliyor, koşul değil. */
            className={
              tiles.length === 1
                ? 'relative col-span-2 aspect-[4/3]'
                : 'relative aspect-square'
            }
          >
            <Image
              src={image.url}
              alt=""
              fill
              /*
                İlk görsel sayfanın LCP öğesi, o yüzden tembel DEĞİL. `priority`
                Next 16'da kaldırılmaya alındı; doküman bu durumda
                `loading="eager"` + `fetchPriority="high"` diyor.
              */
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : undefined}
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <ul className="mt-2 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2">
          {rest.map((image) => (
            <li
              key={image.url}
              className="relative aspect-square w-32 shrink-0 snap-start overflow-hidden rounded-[var(--radius-glass-sm)]"
            >
              <Image src={image.url} alt="" fill sizes="128px" className="object-cover" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Fotoğraf yoksa baş harf: uydurma bir avatar olmayan bir kişiselleştirmeyi
    varmış gibi sunardı. `aria-hidden`: ad hemen yanında zaten yazıyor. */
function HostAvatar({
  host,
  size,
}: {
  host: GuestExperienceDetail['host']
  size: number
}) {
  if (host.avatarUrl === null) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-extrabold text-white"
      >
        {initialOf(host.displayName) ?? '·'}
      </span>
    )
  }

  return (
    <Image
      src={host.avatarUrl}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  )
}

function KnowRow({ label, value, lang }: { label: string; value: string; lang?: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-[0.1em] text-brand-600 uppercase">{label}</dt>
      <dd className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line" lang={lang}>
        {value}
      </dd>
    </div>
  )
}

/**
 * Hikâye bölümü. Bölümler arası ayrım ÇİZGİ (tasarım): beyaz kağıtta kutu
 * yerine ince bir hat. `first` ilk bölümde o çizgiyi kaldırıyor — sayfanın üst
 * bloğuyla arasında zaten boşluk var.
 */
function Section({
  heading,
  help,
  first = false,
  children,
}: {
  heading: string
  help?: string
  first?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={first ? '' : 'border-t border-[var(--line)] pt-10'}>
      <h2 className="section-title">{heading}</h2>
      {help && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{help}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function summarize(description: string | null): string | undefined {
  const text = description?.replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  if (text.length <= META_DESCRIPTION_LENGTH) return text

  const cut = text.slice(0, META_DESCRIPTION_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * Adın ilk harfi, BÜYÜTÜLMÜŞ hâliyle. `toLocaleUpperCase` yerine `tr` kültürü
 * verilmiyor: burada gösterilen host'un adı ve o ad her dilde olabilir — "işçi"
 * adının baş harfini Türkçe kurallarıyla büyütmek doğru, "istanbul" yazan bir
 * İngiliz için "İ" üretmek değil. Ada ait bir dil bilgimiz olmadığından
 * değişmez kültür kullanılıyor.
 *
 * Boşlukla başlayan ya da tamamen boş adlar için `null`; çağıran nötr bir
 * işarete düşüyor.
 */
function initialOf(name: string | null): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null

  // Codepoint bazlı: emoji ya da BMP dışı bir harfle başlayan ad, `[0]` ile
  // yarım bir surrogate üretirdi.
  return [...trimmed][0]?.toUpperCase() ?? null
}


/**
 * Rezervasyon paneli URL parametreleri — TÜRKÇE, kanonik yol İngilizce olsa da.
 *
 * Gerekçe `route-map.json`'daki karar değil: bu parametreler kullanıcının
 * gördüğü ve paylaştığı adresin parçası ve sayfanın dili Türkçe. İngilizce
 * yol segmentiyle Türkçe parametre yan yana tuhaf durmuyor — segment kanonik
 * kimlik, parametre ise bir form alanı (host formlarındaki `sure`, `kapasite`
 * ile aynı aile).
 */
const SLOT_PARAM = 'seans'
const ADULTS_PARAM = 'yetiskin'
const CHILDREN_PARAM = 'cocuk'
const INFANTS_PARAM = 'bebek'

/**
 * Misafirin GÖRÜNTÜLEME para birimi. Tahsilat para birimi DEĞİL — o host'un ve
 * değişmiyor (PLAN Blok 7 kabul kriteri 3).
 *
 * Arayüz diline BAĞLANMIYOR: Türkçe okuyan biri euro ile düşünüyor olabilir,
 * İngilizce okuyan biri Türk lirasıyla. Dilden para birimi türetmek, iki farklı
 * soruyu tek cevaba bağlamak olurdu (docs/I18N.md §3'ün "konuşulan dil ≠ metin
 * dili" ayrımıyla aynı aile).
 */
const CURRENCY_PARAM = 'para'

function currencyFrom(query: Record<string, string | string[] | undefined>): string | null {
  const value = query[CURRENCY_PARAM]
  const single = Array.isArray(value) ? value[0] : value

  // Üç harfli olmayan değer SESSİZCE yok sayılıyor: bozuk bir query için sayfayı
  // düşürmek kullanıcıyı çıkmaza sokardı ve sunucu zaten kendi doğrulamasını
  // yapıyor (tanınmayan kod → 400).
  return single && /^[A-Za-z]{3}$/.test(single) ? single.toUpperCase() : null
}

/** Kademe başına tavan. Sunucunun `MaxPartySize`'ı 500; alan başına o kadar anlamsız. */
const MAX_PARTY_PER_TIER = 20

type PartySelection = { adults: number; children: number; infants: number }

/**
 * Kişi sayısı varsayılanı. **İki yetişkin** çünkü en sık seçim o ve boş bir
 * form misafiri "kaç yazmalıyım" diye düşündürürdü.
 */
const DEFAULT_PARTY: PartySelection = { adults: 2, children: 0, infants: 0 }

function partyFrom(query: Record<string, string | string[] | undefined>): PartySelection {
  return {
    adults: countFrom(query[ADULTS_PARAM], DEFAULT_PARTY.adults),
    children: countFrom(query[CHILDREN_PARAM], DEFAULT_PARTY.children),
    infants: countFrom(query[INFANTS_PARAM], DEFAULT_PARTY.infants),
  }
}

/**
 * Adres çubuğundaki sayı. **Bozuk değer sessizce varsayılana düşüyor** ve bu,
 * "hata yutma yok" kuralının ihlali DEĞİL: burada bir işlem yapılmıyor, bir
 * görünüm çiziliyor ve kullanıcının elle bozduğu bir query için hata sayfası
 * göstermek onu bir çıkmaza sokardı. Yazma yolunda (teklif ucu) sunucu zaten
 * kendi doğrulamasını yapıyor.
 */
function countFrom(raw: string | string[] | undefined, fallback: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === undefined) return fallback

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_PARTY_PER_TIER
    ? parsed
    : fallback
}

function slotFrom(query: Record<string, string | string[] | undefined>): string | null {
  const value = query[SLOT_PARAM]
  const single = Array.isArray(value) ? value[0] : value

  return single && single.length > 0 ? single : null
}

/**
 * Duvar saati dizgesine dakika ekler (`2026-10-13T14:00` → `…T16:30`).
 * Saat dilimi YOK — zaten local duvar saati; DST kayması seans üretirken
 * çözülmüş durumda (API `startsAtLocal`/`durationMinutes` çifti).
 */
function wallClockPlusMinutes(startsAtLocal: string, durationMinutes: number): string {
  const [datePart, timePart = '00:00'] = startsAtLocal.split('T')
  const [hourText = '0', minuteText = '0'] = timePart.split(':')
  const total = Number(hourText) * 60 + Number(minuteText) + durationMinutes
  const hours = Math.floor(total / 60) % 24
  const minutes = ((total % 60) + 60) % 60

  return `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function bookingQuery(
  input: PartySelection & { slotId: string; currency: string | null },
): string {
  const query = new URLSearchParams({
    [SLOT_PARAM]: input.slotId,
    [ADULTS_PARAM]: String(input.adults),
    [CHILDREN_PARAM]: String(input.children),
    [INFANTS_PARAM]: String(input.infants),
  })

  if (input.currency) query.set(CURRENCY_PARAM, input.currency)

  return query.toString()
}

/**
 * Tarih, kişi sayısı ve fiyat özeti.
 *
 * **Durum URL'de, istemci belleğinde DEĞİL** (`?seans=`, `?yetiskin=`,
 * `?cocuk=`, `?bebek=`). Çeviri sekmelerinin kararıyla aynı ve aynı üç kazanç:
 * JS olmadan çalışıyor, geri tuşu beklendiği gibi davranıyor ve her seçim
 * sunucudan TAZE veri getiriyor — bayat bir `remainingCapacity` ile "son
 * koltuk" gösterip rezervasyon adımında hata vermek yerine.
 *
 * **Hesap sunucuda.** Kalemleri istemcide toplasaydık yuvarlama ve kur
 * kuralları iki yerde yaşar, biri bir gün ayrışır ve misafir gördüğünden
 * farklı bir tutar öderdi.
 *
 * **Rezervasyon düğmesi YOK** ve bu dürüstlük: bu blokta rezervasyon uçları
 * yok (Blok 9). Çalışmayan bir düğme koymak, misafire var olmayan bir söz
 * vermek olurdu.
 */
function BookingPanel({
  lang,
  experience,
  availability,
  quote,
  party,
  selectedSlotId,
  displayCurrency,
  currencies,
  t,
}: {
  lang: string
  experience: GuestExperienceDetail
  availability: GuestAvailability | null
  quote: GuestQuote | null
  party: PartySelection
  selectedSlotId: string | null
  displayCurrency: string | null
  currencies: CurrencyOption[]
  t: Translate
}) {
  const here = experiencePath(lang, experience.slug)

  if (!availability || availability.slots.length === 0) {
    return (
      <BookingShell title={t('experience.detail.booking.title')}>
        <p className="text-sm text-fg-muted">{t('experience.detail.booking.noSlots')}</p>
      </BookingShell>
    )
  }

  const pricing = availability.pricing

  return (
    <BookingShell title={t('experience.detail.booking.title')}>
      {pricing ? (
        <p className="text-base">
          <span className="text-xl font-semibold tracking-tight text-fg">
            {formatMinorMoney(lang, pricing.fromAmountMinor, pricing.chargeCurrency, pricing.chargeMinorUnits)}
          </span>{' '}
          <span className="text-sm text-fg-muted">{t('experience.detail.booking.perPerson')}</span>
        </p>
      ) : null}

      <div className="mt-5">
        <p className="text-sm font-semibold text-fg">{t('experience.detail.booking.pickDate')}</p>

        {/*
          Seans seçimi LİNK, form değil: bir seçim URL'yi değiştiriyor ve o URL
          paylaşılabilir. Radyo düğmeli bir form aynı şeyi yapardı ama JS'siz
          her seçimde ayrıca "uygula"ya basmak gerekirdi.

          Yatay şerit: Airbnb dikey satır listesi değil — bilet delikli şerit.
        */}
        <ul className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1">
          {availability.slots.map((slot) => {
            const selected = slot.slotId === selectedSlotId
            const scarce = slot.remainingCapacity > 0 && slot.remainingCapacity <= 2

            return (
              <li key={slot.slotId} className="snap-start">
                <a
                  href={`${here}?${bookingQuery({ ...party, slotId: slot.slotId, currency: displayCurrency })}`}
                  aria-current={selected ? 'true' : undefined}
                  className={[
                    'flex min-w-[9.5rem] flex-col rounded-[1.15rem] border px-3.5 py-3 transition-[border-color,background-color,box-shadow,transform] duration-200',
                    selected
                      ? 'border-brand-500 bg-brand-500 text-white shadow-[0_12px_28px_-12px_oklch(0.55_0.24_25_/_0.65)]'
                      : 'border-[color-mix(in_oklch,var(--fg)_12%,transparent)] bg-[color-mix(in_oklch,white_55%,transparent)] hover:border-brand-500/40',
                  ].join(' ')}
                >
                  <span className={['text-sm font-semibold', selected ? 'text-white' : 'text-fg'].join(' ')}>
                    {formatWallClock(lang, slot.startsAtLocal, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className={['mt-1 text-xs', selected ? 'text-white/85' : 'text-fg-muted'].join(' ')}>
                    {formatWallClock(lang, slot.startsAtLocal, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    –
                    {formatWallClock(lang, wallClockPlusMinutes(slot.startsAtLocal, slot.durationMinutes), {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {/* Kalan yer: "son 2 yer" bir karar bilgisi. Dolu seans listede
                      yok (sunucu eliyor), o yüzden "Doldu" dalı burada değil. */}
                  <span
                    className={[
                      'mt-2 text-[0.6875rem] font-semibold',
                      selected
                        ? 'text-white'
                        : scarce
                          ? 'text-brand-600'
                          : 'text-fg-muted',
                    ].join(' ')}
                  >
                    {t('experience.detail.booking.spotsLeft', { n: slot.remainingCapacity })}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>

        {/*
          Saat dilimi AÇIKÇA yazıyor: saatler deneyimin şehrinin saatinde ve
          misafir başka bir dilimde olabilir. Yazmasaydık, kendi saatiyle
          okuyup uçağı kaçıran biri olurdu.
        */}
        <p className="mt-3 text-xs text-fg-muted">
          {t('experience.detail.booking.timeZone', { bolge: availability.timeZoneId })}
        </p>
      </div>

      {/*
        Kişi sayısı GET formu: gönderim URL'yi güncelliyor, sunucu yeni teklifi
        hesaplıyor. `method` verilmiyor çünkü varsayılan zaten GET.
      */}
      <form action={here} className="mt-5 grid gap-3 sm:grid-cols-4">
        {selectedSlotId ? <input type="hidden" name={SLOT_PARAM} value={selectedSlotId} /> : null}

        <PartyField
          id="yetiskin"
          name={ADULTS_PARAM}
          label={t('experience.detail.booking.adults')}
          value={party.adults}
        />
        <PartyField
          id="cocuk"
          name={CHILDREN_PARAM}
          label={t('experience.detail.booking.children')}
          value={party.children}
        />
        <PartyField
          id="bebek"
          name={INFANTS_PARAM}
          label={t('experience.detail.booking.infants')}
          value={party.infants}
        />

        <div>
          <label className="auth-label" htmlFor="para">
            {t('experience.detail.booking.currency')}
          </label>
          {/*
            Boş seçenek = "çevirme". 1.0 oranlı sahte bir çevrim üretmek yerine
            hiç çevirmemek, "çevrildi mi" sorusunu cevaplanabilir tutuyor.
          */}
          <select
            id="para"
            name={CURRENCY_PARAM}
            className="auth-input"
            defaultValue={displayCurrency ?? ''}
          >
            <option value="">{t('experience.detail.booking.currencyNone')}</option>
            {currencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.symbol ? `${item.code} (${item.symbol})` : item.code}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <GlassButton type="submit" size="sm" variant="primary" className="w-full sm:w-auto">
            {t('experience.detail.booking.update')}
          </GlassButton>
        </div>
      </form>

      {quote ? <QuoteSummary lang={lang} quote={quote} t={t} /> : null}

      {selectedSlotId && !quote ? (
        <p className="mt-4 text-sm text-fg-muted" role="status">
          {t('experience.detail.booking.quoteFailed')}
        </p>
      ) : null}
    </BookingShell>
  )
}

function BookingShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    /* Sayfanın en yüksek yüzeyi: kararın verildiği yer (tasarım). */
    <div className="surface-lifted p-6">
      <p className="text-base font-bold">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function PartyField({
  id,
  name,
  label,
  value,
}: {
  id: string
  name: string
  label: string
  value: number
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
        inputMode="numeric"
        min={0}
        max={MAX_PARTY_PER_TIER}
        className="auth-input"
        defaultValue={value}
      />
    </div>
  )
}

/**
 * Teklif özeti.
 *
 * **Tahsilat ve gösterim AYRI satırlar** (PLAN Blok 7 kabul kriteri 3): misafir
 * kendi para biriminde bir sayı görse bile paranın host'un para biriminde
 * çekileceğini okumak zorunda. Tek bir tutar göstermek, ödeme ekranında sürpriz
 * demek olurdu.
 */
function QuoteSummary({ lang, quote, t }: { lang: string; quote: GuestQuote; t: Translate }) {
  return (
    <div className="mt-5 border-t border-[var(--line)] pt-4">
      <ul className="grid gap-1 text-sm">
        {quote.lines.map((line) => (
          <li key={line.guestType} className="flex justify-between gap-4">
            <span className="text-fg-muted">
              {t(guestTypeMessageKey(line.guestType))} × {line.count}
            </span>
            <span>
              {formatMinorMoney(lang, line.lineTotalMinor, quote.charge.currency, quote.charge.minorUnits)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex justify-between gap-4 text-base font-semibold">
        <span>{t('experience.detail.booking.total')}</span>
        <span>
          {formatMinorMoney(lang, quote.charge.amountMinor, quote.charge.currency, quote.charge.minorUnits)}
        </span>
      </p>

      {quote.display ? (
        <p className="mt-1 text-sm text-fg-muted">
          {t('experience.detail.booking.displayTotal', {
            tutar: formatMinorMoney(
              lang,
              quote.display.amountMinor,
              quote.display.currency,
              quote.display.minorUnits,
            ),
          })}
        </p>
      ) : null}

      {/* Kabul kriteri 3: tahsilat para birimi EKRANDA yazmak zorunda. */}
      <p className="mt-2 text-xs text-fg-muted">
        {t('experience.detail.booking.chargedIn', { paraBirimi: quote.charge.currency })}
      </p>
    </div>
  )
}

function guestTypeMessageKey(guestType: string): SimpleMessageKey {
  switch (guestType) {
    case 'adult':
      return 'experience.detail.booking.adults'
    case 'child':
      return 'experience.detail.booking.children'
    default:
      return 'experience.detail.booking.infants'
  }
}

