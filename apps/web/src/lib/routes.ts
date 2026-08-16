import routeMap from '@/lib/route-map.json'

/**
 * Lokalize URL'ler: `/tr/kesfet`, `/en/explore`.
 *
 * Kararlar (docs/I18N.md §5):
 *
 * 1. **Dil segmenti her zaman var.** Segmentsiz bir kök de bir dile aittir;
 *    yazmazsak hangi dil olduğu belirsiz kalır ve `hreflang` tutarsızlaşır.
 *    Eski segmentsiz yollar kalıcı olarak dilli karşılığına yönlendirilir.
 *
 * 2. **Slug yalnızca arayüz çevirisi olan diller için.** `/ja/keiken` sayfası
 *    Türkçe arayüz gösterecekse o URL yalan söyler. Dil seçicideki 49 dil
 *    içerik dilidir (docs/I18N.md §1) — URL'e giren küme arayüz dilleridir.
 *
 * 3. **Fiziksel route kanonik İngilizce adla durur** (`app/[lang]/explore`).
 *    Lokalize slug rewrite ile ona bağlanır: dosya ağacı her dilde aynı kalır,
 *    yeni dil eklemek `route-map.json`'a bir blok eklemektir.
 *
 * Tablo `route-map.json`'da çünkü `next.config.ts` de aynı veriyi okuyor —
 * rewrite'lar ile linkler ayrı tablolardan beslenirse sessizce uyuşmazlar.
 */

export type PageId = keyof typeof routeMap.canonical

const canonical: Record<PageId, string> = routeMap.canonical
const localized: Record<string, Record<PageId, string>> = routeMap.localized

/** URL'de görünebilecek diller — dil seçicideki 49'un alt kümesi. */
export const routableLanguages: string[] = Object.keys(localized)

export const defaultRouteLanguage: string = routeMap.defaultLanguage

export function isRoutableLanguage(value: string | undefined): value is string {
  return value !== undefined && routableLanguages.includes(value)
}

/** Kullanıcıya gösterilecek yol: `path('tr', 'explore')` → `/tr/kesfet`. */
export function path(language: string, page: PageId): string {
  const table = localized[language] ?? localized[defaultRouteLanguage]
  const segment = table[page]
  return segment ? `/${language}/${segment}` : `/${language}`
}

/** Rewrite hedefi: `/tr/kesfet` → `/tr/explore`. */
export function canonicalPath(language: string, page: PageId): string {
  const segment = canonical[page]
  return segment ? `/${language}/${segment}` : `/${language}`
}

/**
 * Yoldan sayfa kimliğini çözer. Dil değiştirirken gerekiyor: kullanıcı
 * `/tr/kesfet`'te dili İngilizce yaparsa `/en/explore`'a gitmeli — ana sayfaya
 * atılmamalı. Bunun için önce "hangi sayfadayız" sorusunu cevaplamak lazım.
 */
export function resolvePage(pathname: string): { language: string; page: PageId } | undefined {
  const [, maybeLanguage = '', maybeSegment = ''] = pathname.split('/')

  if (!isRoutableLanguage(maybeLanguage)) return undefined

  if (maybeSegment === '') {
    return { language: maybeLanguage, page: 'home' }
  }

  const table = localized[maybeLanguage]
  const hit = entriesOf(table).find(([, segment]) => segment === maybeSegment)
  if (hit) {
    return { language: maybeLanguage, page: hit[0] }
  }

  // Kanonik segmentle de gelinebilir: rewrite sonrası iç yol, ya da elle yazılmış
  // `/tr/explore`. Sayfayı bulabiliyorsak 404 vermek için sebep yok.
  const canonicalHit = entriesOf(canonical).find(([, segment]) => segment === maybeSegment)
  return canonicalHit ? { language: maybeLanguage, page: canonicalHit[0] } : undefined
}

/** Aynı sayfanın başka dildeki karşılığı. Bulunamazsa o dilin ana sayfası. */
export function switchLanguage(pathname: string, target: string): string {
  const resolved = resolvePage(pathname)
  return resolved ? path(target, resolved.page) : path(target, 'home')
}

/**
 * `hreflang` için: bu sayfanın tüm arayüz dillerindeki karşılıkları.
 *
 * `x-default` şart — hangi dilin "eşleşme yoksa buraya gel" olduğunu söylemezsek
 * arama motoru kendi tahmin eder ve Türkçe olmayan aramalarda rastgele bir dil
 * gösterir.
 */
export function alternateLinks(page: PageId): Record<string, string> {
  return {
    ...Object.fromEntries(routableLanguages.map((code) => [code, path(code, page)])),
    'x-default': path(defaultRouteLanguage, page),
  }
}

/** `Object.entries` anahtarı `string`'e düşürüyor; PageId'yi korumak için. */
function entriesOf<T>(record: Record<PageId, T>): [PageId, T][] {
  return Object.entries(record) as [PageId, T][]
}
