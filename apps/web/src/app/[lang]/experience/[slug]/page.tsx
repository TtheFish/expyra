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
import { GlassButton } from '@/components/ui/glass-button'
import {
  countryDisplayName,
  experienceAlternates,
  experiencePath,
  fetchAvailability,
  fetchExperience,
  fetchQuote,
  type GuestAvailability,
  type GuestExperienceDetail,
  type GuestQuote,
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

  const categoryKey = categoryMessageKey(experience.categorySlug)
  const cityName = cityDisplayName(lang, experience.city)
  const textLanguage = localNameOf(experience.text.language, lang) ?? experience.text.language
  const cityHref = `${path(lang, 'explore')}?nerede=${encodeURIComponent(cityKeyOf(experience.city))}`

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <article className="glass glass-edge glass-thick overflow-hidden rounded-[var(--radius-glass-xl)]">
          <div className="relative h-56 w-full sm:h-72">
            {experience.images.length > 0 ? (
              /*
                Kapak API'de zaten ilk sırada (GuestExperienceQuery.LoadImagesAsync),
                yani kartta görülen görsel ile burada görülen aynı.

                Bu görsel sayfanın LCP öğesi, o yüzden tembel DEĞİL.

                `priority` KULLANILMIYOR: Next 16'da kaldırılmaya alındı
                (node_modules/next/dist/docs/.../image.md — "deprecated in favor of
                preload"). `preload` de doğru araç değil; o, `<head>`'e bir
                `<link rel=preload>` koyuyor ve geç KEŞFEDİLEN görseller için var.
                Bu görsel ilk HTML'de zaten duruyor, yani tarayıcı onu görüyor —
                gereken tek şey sıraya öncelikli girmesi. Doküman da bu durumda
                `loading="eager"` + `fetchPriority="high"` diyor.
              */
              <Image
                src={experience.images[0].url}
                alt=""
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            ) : (
              /* Kapaksız eski ilanlar. Gradyan kartla AYNI fonksiyondan geliyor —
                 aynı ilan listede ve detayda aynı rengi taşıyor. */
              <div
                className="h-full w-full"
                style={experienceCoverStyle(experience.slug)}
                aria-hidden="true"
              />
            )}

            {categoryKey && (
              <span className="glass glass-edge absolute bottom-4 left-4 rounded-[var(--radius-glass-sm)] px-3 py-1.5 text-xs font-medium">
                {t(categoryKey)}
              </span>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-sm font-medium text-fg-muted">
              <a href={cityHref} className="underline-offset-4 hover:underline">
                {t('experience.place', {
                  sehir: cityName,
                  ulke: countryDisplayName(lang, experience.city.countryCode),
                })}
              </a>
            </p>

            {/* Başlık host'un dilinde: ekran okuyucu doğru fonetikle okusun
                (WCAG 3.1.2). Sayfanın `<html lang>`i değişmiyor — arayüz hâlâ
                kullanıcının dilinde. */}
            <h1
              className="mt-2 text-pretty text-3xl font-semibold tracking-tight sm:text-4xl"
              lang={experience.text.language}
            >
              {experience.text.title}
            </h1>

            {experience.text.isFallback && (
              /*
                İstenen dilde çeviri yoktu; zincir (docs/I18N.md §2) başka bir dile
                düştü ve arayüz bunu GİZLEMİYOR. Dil ADI `Intl.DisplayNames`'ten:
                kendi çeviri tablomuzu tutmuyoruz.
              */
              <p className="glass glass-edge mt-3 inline-block rounded-[var(--radius-glass-sm)] px-3 py-1.5 text-xs text-fg-muted">
                {t('experience.detail.text.fallback', { dil: textLanguage })}
              </p>
            )}

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Fact
                label={t('experience.detail.duration.label')}
                value={formatExperienceDuration(t, experience.durationMinutes)}
              />
              <Fact
                label={t('experience.detail.capacity.label')}
                value={t('experience.detail.capacity.value', { n: experience.capacity })}
              />
            </dl>

            <Section heading={t('experience.detail.about')}>
              {experience.text.description ? (
                /*
                  Host'un yazdığı düz metin. `whitespace-pre-line` paragraf
                  aralarını koruyor; React zaten kaçırıyor, yani HTML enjekte
                  edilemiyor.
                */
                <p
                  className="whitespace-pre-line text-pretty text-sm leading-relaxed text-fg-muted"
                  lang={experience.text.language}
                >
                  {experience.text.description}
                </p>
              ) : (
                /* Yayın doğrulaması çeviri SATIRINI şart koşuyor, açıklamanın dolu
                   olmasını değil — yani bu boşluk bir hata değil, bir durum. */
                <p className="text-sm text-fg-muted">{t('experience.detail.noDescription')}</p>
              )}
            </Section>

            <Section
              heading={t('experience.detail.spoken.heading')}
              help={t('experience.detail.spoken.help')}
            >
              {experience.spokenLanguages.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {experience.spokenLanguages.map((code) => (
                    <li
                      key={code}
                      className="glass glass-edge rounded-[var(--radius-glass-sm)] px-3 py-1.5 text-xs"
                    >
                      {localNameOf(code, lang) ?? code}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-muted">{t('experience.detail.spoken.none')}</p>
              )}
            </Section>

            {experience.tags.length > 0 && (
              <Section heading={t('experience.detail.tags.heading')}>
                <ul className="flex flex-wrap gap-2">
                  {experience.tags.map((tag) => (
                    <li
                      key={tag}
                      className="glass glass-edge rounded-[var(--radius-glass-sm)] px-3 py-1.5 text-xs"
                      /* Etiketler host'un yazdığı içerik — ilan metniyle aynı dilde. */
                      lang={experience.text.language}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/*
              Host kartı: misafirin "kime güveniyorum" sorusunun cevabı ve VISION §8'in
              arz tarafı vurgusunun görünen yüzü. Profil sayfası henüz yok, o yüzden
              kart bir bağlantı DEĞİL — tıklanabilir görünüp hiçbir yere gitmemek,
              hiç tıklanabilir olmamaktan kötü.
            */}
            <Section heading={t('experience.detail.host.heading')}>
              <div className="flex items-center gap-3">
                {experience.host.avatarUrl === null ? (
                  /* Fotoğraf yok: baş harf. Uydurma bir avatar (gravatar, harf
                     üreteci) göstermek, olmayan bir kişiselleştirmeyi varmış gibi
                     sunardı. `aria-hidden`: ad hemen yanında zaten yazıyor. */
                  <span
                    aria-hidden="true"
                    className="glass glass-edge flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  >
                    {initialOf(experience.host.displayName) ?? '·'}
                  </span>
                ) : (
                  <Image
                    src={experience.host.avatarUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-full object-cover"
                  />
                )}

                <p className="text-sm font-medium">
                  {experience.host.displayName ?? t('experience.detail.host.anonymous')}
                </p>
              </div>
            </Section>

            {experience.images.length > 1 && (
              <Section heading={t('experience.detail.gallery.heading')}>
                {/*
                  Işık kutusu (lightbox) YOK ve bu bilinçli: küçük resimler tıklanınca
                  açılan bir katman, klavye tuzağı ve odak yönetimi demek — doğru
                  yapılmadığında erişilebilirliği bozar, doğru yapmak da bu bloğun işi
                  değil. Görseller doğrudan okunabilir boyutta çiziliyor.

                  `alt` BOŞ: host'tan alternatif metin ALINMIYOR, dolayısıyla
                  uyduracağımız her metin ("deneyimden bir kare") ekran okuyucuya
                  bilgi değil gürültü taşırdı. Açıklama metni ilanı zaten anlatıyor.
                  Host'tan görsel başına alt metin istemek gerçek bir eksik ve kendi
                  işini hak ediyor.
                */}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {experience.images.slice(1).map((image) => (
                    <li
                      key={image.url}
                      className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-glass-sm)]"
                    >
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 240px, 45vw"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

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
          </div>
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <GlassButton href={cityHref}>
            {t('experience.detail.cityLink', { sehir: cityName })}
          </GlassButton>
          <GlassButton href={path(lang, 'explore')}>{t('experience.detail.back')}</GlassButton>
        </div>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass glass-edge rounded-[var(--radius-glass-sm)] px-4 py-3">
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  )
}

function Section({
  heading,
  help,
  children,
}: {
  heading: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">{heading}</h2>
      {help && <p className="mt-1 text-xs text-fg-muted">{help}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/**
 * Açıklamanın paylaşım önizlemesine giren kısmı. Satır sonları boşluğa iniyor
 * (`meta` içeriği tek satır) ve kırpma KELİMEDEN yapılıyor — cümle ortasında
 * kesilmiş bir önizleme, olmayan bir önizlemeden daha kötü görünür.
 */
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
        <p className="text-sm">
          <span className="font-semibold">
            {formatMinorMoney(lang, pricing.fromAmountMinor, pricing.chargeCurrency, pricing.chargeMinorUnits)}
          </span>{' '}
          <span className="text-fg-muted">{t('experience.detail.booking.perPerson')}</span>
        </p>
      ) : null}

      <div className="mt-4">
        <p className="text-sm font-medium">{t('experience.detail.booking.pickDate')}</p>

        {/*
          Seans seçimi LİNK, form değil: bir seçim URL'yi değiştiriyor ve o URL
          paylaşılabilir. Radyo düğmeli bir form aynı şeyi yapardı ama JS'siz
          her seçimde ayrıca "uygula"ya basmak gerekirdi.
        */}
        <ul className="mt-2 flex flex-wrap gap-2">
          {availability.slots.map((slot) => {
            const selected = slot.slotId === selectedSlotId

            return (
              <li key={slot.slotId}>
                <a
                  href={`${here}?${bookingQuery({ ...party, slotId: slot.slotId, currency: displayCurrency })}`}
                  aria-current={selected ? 'true' : undefined}
                  className={`inline-flex flex-col rounded-[var(--radius-glass-sm)] border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-[var(--focus-ring)] bg-[rgb(var(--glass-tint)_/_0.35)] font-semibold'
                      : 'border-[var(--glass-border)] hover:bg-[rgb(var(--glass-tint)_/_0.22)]'
                  }`}
                >
                  <span>
                    {formatWallClock(lang, slot.startsAtLocal, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="text-fg-muted">
                    {formatWallClock(lang, slot.startsAtLocal, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {/* Kalan yer: "son 2 yer" bir karar bilgisi. Dolu seans listede
                      yok (sunucu eliyor), o yüzden "Doldu" dalı burada değil. */}
                  <span className="text-xs text-fg-muted">
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
        <p className="mt-2 text-xs text-fg-muted">
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
          <GlassButton type="submit" size="sm">
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
    <div className="mt-8 rounded-[var(--radius-glass)] border border-[rgb(var(--glass-tint)_/_0.18)] p-5">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3">{children}</div>
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
    <div className="mt-5 border-t border-[rgb(var(--glass-tint)_/_0.18)] pt-4">
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

