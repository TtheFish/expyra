import type { Metadata } from 'next'
import { SiteFooter } from '@/components/brand/site-footer'
import { SiteHeader } from '@/components/brand/site-header'
import { ExperienceCard } from '@/components/experience/experience-card'
import { ExperienceSearch } from '@/components/search/experience-search'
import { GlassButton } from '@/components/ui/glass-button'
import { fetchExperiences, isExperienceCursor } from '@/features/experiences/api'
import { getTranslator } from '@/features/i18n/translator'
import { cityDisplayName, cityKeyOf, resolveCity } from '@/features/places/api'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Arama sonucu — artık GERÇEK veriden (`lib/experiences.ts` prototipi bu blokta
 * silindi). Değişen üç şey:
 *
 * 1. Liste `GET /api/experiences?city=&cursor=&lang=` ile geliyor.
 * 2. Sayfalama CURSOR tabanlı: "Sonraki sayfa" bir sayı değil, önceki yanıtın
 *    `nextCursor` değerini taşıyan opak bir bağlantı.
 * 3. **Misafir sayısı artık sonucu daraltmıyor.** Prototipte `maxGuests >= n`
 *    süzmesi vardı; sunucuda böyle bir filtre yok (kapasite filtresi Blok 8) ve
 *    gelen sayfayı burada süzmek sayfalamayı bozardı — 24 satırlık sayfadan 9'unu
 *    göstermek, "sonraki" bağlantısını 24. satıra göre kurmak demek. Sessizce
 *    süzmek yerine SÖYLÜYORUZ; tarih uyarısının gerekçesiyle aynı gerekçe.
 *
 * Arama durumu URL'de: /tr/kesfet?nerede=cz-prague&tarih=2026-09-01&yetiskin=2&devam=...
 * `nerede` bir DOĞAL ANAHTAR (`<ülke>-<slug>`), kullanıcının yazdığı metin değil.
 *
 * ## Bilinmeyen şehirde ne oluyor — ve neden 400/404 değil
 *
 * PLAN Blok 4 kabul kriteri 3 iki seçenek bırakıyor: "400 ya da 'şehir bulunamadı'
 * akışı". İkincisi seçildi:
 *
 * - Bu URL'i çoğunlukla BİZ ürettik. Bugün kırık olmasının en olası sebebi eski bir
 *   bağlantı (`?nerede=prag`, serbest metin dönemi) ya da elle düzenlenmiş bir adres.
 *   İkisi de kullanıcının hatası değil ve ikisinin de doğal devamı "doğru şehri seç".
 * - `notFound()` sayfayı komple değiştirirdi: arama çubuğu, tarih ve misafir sayısı
 *   giderdi. Kullanıcı bir tıkla düzeltebileceği bir durumdan çıkıp en baştan
 *   başlamak zorunda kalırdı.
 * - Boş sonuç ekranı göstermek ise YALAN olurdu — "aradık, bulamadık" der. Oysa
 *   arama hiç yapılmadı.
 *
 * Sonuç: 200 dönüyor ama SONUÇ LİSTESİ HİÇ BASILMIYOR ve ekranda ne olduğunu
 * söyleyen bir panel var. Aynı kalıp bozuk sayfa bağlantısı için de geçerli.
 *
 * ## API kesintisinde bu sayfa PATLIYOR (bilinçli)
 *
 * Ana sayfanın vitrini kesintiyi tolere ediyor çünkü orada hero ve arama çubuğu
 * ayakta kalıyor. Burada tolere edecek bir şey yok: sayfanın tek işi "bu şehirde ne
 * var" sorusuna cevap vermek. Boş liste göstermek o soruya YANLIŞ cevap vermek
 * olurdu (CLAUDE.md #1), o yüzden hata `error.tsx` sınırına gidiyor.
 */

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

/** Ham metin ekrana basılıyor; uzunluk sınırı sayfayı bozan bir yükü engelliyor. */
const MAX_QUERY_ECHO = 60

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''

const toCount = (value: string | string[] | undefined): number => {
  const parsed = Number.parseInt(first(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function generateMetadata(): Metadata {
  return { alternates: { languages: alternateLinks('explore') } }
}

export default async function Explore({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: SearchParams
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams])
  const t = await getTranslator(lang)

  const requestedCity = first(query['nerede']).trim()
  // API ulaşılamazsa BU SAYFA PATLAR ve bu bilinçli (yukarıdaki not).
  const city = requestedCity ? await resolveCity(requestedCity) : null
  const cityMissing = requestedCity !== '' && city === null

  const date = parseSearchDate(first(query['tarih']))

  /*
    Misafir sayısı formda HER ZAMAN var (gizli input'lar, bkz. `guest-picker.tsx`),
    yani "kullanıcı bunu istedi mi" sorusunun cevabı değerin kendisi değil URL'de
    GÖRÜNÜP görünmediği. Bare `/tr/kesfet` uyarı göstermiyor; aramadan gelen URL
    gösteriyor.
  */
  const guestsGiven = first(query['yetiskin']) !== '' || first(query['cocuk']) !== ''
  const adults = toCount(query['yetiskin']) || 2
  const children = toCount(query['cocuk'])

  const requestedCursor = first(query['devam'])
  const cursor = isExperienceCursor(requestedCursor) ? requestedCursor : null
  const cursorBroken = requestedCursor !== '' && cursor === null

  const cityKey = city ? cityKeyOf(city) : null
  const blocked = cityMissing || cursorBroken

  const page = blocked
    ? { items: [], nextCursor: null }
    : await fetchExperiences({ lang, city: cityKey, cursor })

  /*
    Sayfa sınırı: sonraki/ilk sayfa bağlantıları DOĞRULANMIŞ değerlerden kuruluyor,
    gelen query'den değil. Ham query'yi kopyalamak, adres çubuğuna yazılmış her
    parametreyi bağlantılara taşımak olurdu.
  */
  const pageHref = (nextCursor: string | null): string => {
    const next = new URLSearchParams()
    if (cityKey) next.set('nerede', cityKey)
    if (date) next.set('tarih', date)
    if (guestsGiven) {
      next.set('yetiskin', String(adults))
      next.set('cocuk', String(children))
    }
    if (nextCursor) next.set('devam', nextCursor)

    const suffix = next.toString()
    return suffix ? `${path(lang, 'explore')}?${suffix}` : path(lang, 'explore')
  }

  /*
    Toplam sayı YOK ve olmayacak (API kararı: her sayfada bir COUNT(*), cursor
    sayfalamanın kaçındığı tam taramayı geri getirir). Bu yüzden sayım iki ayrı
    cümle: sonuçların tamamı ekrandaysa "12 deneyim" DOĞRU, sayfalama varsa
    yalnızca "bu sayfada 24 deneyim" doğru.
  */
  const paging = cursor !== null || page.nextCursor !== null
  const summary = paging
    ? t('explore.summary.page', { n: page.items.length })
    : t('explore.summary', { n: page.items.length })

  /*
    Sonucu DARALTMAYAN seçimler tek cümlede toplanıyor. Parçalar `Intl.ListFormat`
    ile birleşiyor, elle `", "` ile değil: "a ve b" (tr) / "a and b" (en) ayrımı
    dilin işi. Blok 8 filtreleri açtıkça bu liste kısalacak.
  */
  const inertFilters: string[] = []
  if (date) inertFilters.push(t('explore.filter.date'))
  if (guestsGiven) inertFilters.push(t('explore.filter.guests'))

  const inertNotice =
    inertFilters.length > 0
      ? t('explore.filtersNotice', {
          filtreler: new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(
            inertFilters,
          ),
        })
      : null

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader lang={lang} />

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <ExperienceSearch
          lang={lang}
          action={path(lang, 'explore')}
          defaultCity={
            city
              ? {
                  key: cityKeyOf(city),
                  name: city.name,
                  englishName: city.englishName,
                  countryCode: city.countryCode,
                }
              : null
          }
          /* Çözülemeyen metin kutuya geri yazılıyor: kullanıcı "prag" yazmıştı,
             listede "Praha"yı tek tıkla bulsun. */
          defaultCityQuery={cityMissing ? requestedCity.slice(0, MAX_QUERY_ECHO) : ''}
          defaultDate={date}
          defaultAdults={adults}
          defaultChildren={children}
        />

        <section className="mt-10" aria-labelledby="sonuc-basligi">
          <h1
            id="sonuc-basligi"
            className="text-on-media text-xl font-semibold text-white sm:text-2xl"
          >
            {cityMissing
              ? t('explore.heading.query', { arama: requestedCity.slice(0, MAX_QUERY_ECHO) })
              : city
                ? t('explore.heading.city', { sehir: cityDisplayName(lang, city) })
                : t('explore.heading.all')}
          </h1>

          {cityMissing ? (
            /*
              Sonuç listesi YOK. Panel "aradık, bulamadık" demiyor — "bu şehri
              tanımıyoruz, listeden seç" diyor. İkisi farklı cümleler ve
              kullanıcıyı farklı yerlere götürüyor.
            */
            <Panel
              title={t('explore.cityMissing.title')}
              body={t('explore.cityMissing.body')}
              cta={{ href: path(lang, 'explore'), label: t('explore.cityMissing.cta') }}
            />
          ) : cursorBroken ? (
            /*
              Sayfa bağlantısı sunucunun ürettiği opak bir değer; elle bozulmuş ya
              da kırpılmış hâlini SESSİZCE ilk sayfaya çevirmek, sayfalayan bir
              istemciyi sonsuz döngüye sokan davranış (API'nin de kararı bu).
            */
            <Panel
              title={t('explore.pageLink.title')}
              body={t('explore.pageLink.body')}
              cta={{ href: pageHref(null), label: t('explore.pager.first') }}
            />
          ) : (
            <>
              <p className="text-on-media mt-1 text-sm text-white/85">{summary}</p>

              {/*
                Uyarı sonuçların ÜSTÜNDE: listeye baktıktan sonra okunan bir
                dipnot, listeye bakarken kurulan yanlış izlenimi geri almıyor.
              */}
              {inertNotice && (
                <p className="glass glass-edge mt-4 rounded-[var(--radius-glass-sm)] px-4 py-3 text-sm text-fg-muted">
                  {inertNotice}
                </p>
              )}

              {page.items.length > 0 ? (
                <>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {page.items.map((item) => (
                      <ExperienceCard key={item.slug} item={item} lang={lang} t={t} />
                    ))}
                  </div>

                  {/*
                    "Daha fazla yükle" DEĞİL "sonraki sayfa": bu bir sunucu
                    gezinmesi, liste eklenmiyor değişiyor — düğmenin adı da bunu
                    söylemeli. Geri dönüş için tarayıcının geri tuşu çalışıyor;
                    cursor tek yönlü olduğu için "önceki sayfa" üretilemiyor,
                    onun yerine başa dönüş var.
                  */}
                  {(page.nextCursor || cursor) && (
                    <nav
                      className="mt-8 flex flex-wrap items-center justify-center gap-3"
                      aria-label={t('explore.pager.label')}
                    >
                      {cursor && (
                        <GlassButton href={pageHref(null)}>{t('explore.pager.first')}</GlassButton>
                      )}
                      {page.nextCursor && (
                        <GlassButton variant="primary" href={pageHref(page.nextCursor)}>
                          {t('explore.pager.next')}
                        </GlassButton>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                /*
                  Boş sonuç ekranı, global bir platformun en büyük ürün riski
                  (docs/VISION.md §8). Kullanıcı eli boş dönmemeli: bir çıkış
                  yolu misafir tarafında (başka şehir), biri ARZ tarafında —
                  bu şehirde ilan olmamasının çözümü oradaki ilk host. Blok 8'de
                  "yakındaki şehirler" ve "haber ver" akışı buraya gelecek.
                */
                <Panel
                  title={t('explore.empty.title')}
                  body={t('explore.empty.body')}
                  cta={{ href: path(lang, 'explore'), label: t('explore.empty.cta') }}
                  secondary={{
                    href: path(lang, 'becomeHost'),
                    label: t('explore.empty.hostCta'),
                  }}
                />
              )}
            </>
          )}
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

type PanelLink = { href: string; label: string }

/**
 * Üç durumun (bilinmeyen şehir, bozuk sayfa bağlantısı, boş sonuç) ortak kabuğu.
 * Kalıp Blok 4'ten geliyor ve KORUNUYOR — değişen yalnız içine giren cümleler.
 */
function Panel({
  title,
  body,
  cta,
  secondary,
}: {
  title: string
  body: string
  cta: PanelLink
  secondary?: PanelLink
}) {
  return (
    <div className="glass glass-edge glass-thick mt-6 rounded-[var(--radius-glass-lg)] p-8 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <GlassButton variant="primary" href={cta.href}>
          {cta.label}
        </GlassButton>
        {secondary && <GlassButton href={secondary.href}>{secondary.label}</GlassButton>}
      </div>
    </div>
  )
}

/** Arama çubuğundaki `<input type="date">` bu biçimi üretiyor. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sorgudaki tarihi doğrular. Geçersizse `undefined` — `?tarih=abc` ile gelen
 * serbest metin özet satırına ve bağlantılara yansımasın diye: URL'den gelen
 * değeri doğrulamadan ekrana basmak, kullanıcının kendi sayfasına metin
 * yazdırabildiği bir yüzey açar.
 *
 * `lib/experiences.ts` ile birlikte silinmedi, BURAYA taşındı: tek tüketicisi bu
 * sayfa ve tarih hâlâ URL'de yaşıyor.
 */
function parseSearchDate(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined

  // `2026-02-31` desenden geçiyor ama takvimde yok; JS onu sessizce 3 Mart'a
  // kaydırır. Geri yazdırıp karşılaştırmak taşan günü yakalıyor.
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed.toISOString().slice(0, 10) === value ? value : undefined
}
