import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
  fetchExperience,
} from '@/features/experiences/api'
import { categoryMessageKey } from '@/features/host/experiences-api'
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

export default async function ExperienceDetail({ params }: { params: PageParams }) {
  const { lang, slug } = await params
  const [t, experience] = await Promise.all([getTranslator(lang), fetchExperience(slug, lang)])

  if (!experience) {
    notFound()
  }

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

            {/*
              Rezervasyon Blok 7 (takvim/fiyat) ve Blok 9 (rezervasyon) ile geliyor.
              Sessiz bir boşluk bırakmak, misafire "bu sayfa yarım" dedirtirdi;
              İÇ TERİM de kullanılmıyor ("Blok 7'de açılıyor" kimseye bir şey
              anlatmaz, tr.ts yazım kuralı 4).
            */}
            <div className="mt-8 rounded-[var(--radius-glass)] border border-[rgb(var(--glass-tint)_/_0.18)] p-5">
              <p className="text-sm font-semibold">{t('experience.detail.booking.title')}</p>
              <p className="mt-1 text-sm text-fg-muted">{t('experience.detail.booking.body')}</p>
            </div>
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
