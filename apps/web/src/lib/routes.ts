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

/**
 * Kullanıcıya gösterilecek yol: `path('tr', 'explore')` → `/tr/kesfet`.
 *
 * Parametreli sayfalarda (`deneyim/:slug`) <b>yer tutucu OLDUĞU GİBİ döner</b>
 * — çağıran ya `params` verir ya da kalıbı kendisi doldurur
 * (`experiencePath` → `fillSlug`). Sessizce boş bırakmak her karta aynı
 * bağlantıyı verirdi.
 */
export function path(language: string, page: PageId, params: readonly string[] = []): string {
  const table = localized[language] ?? localized[defaultRouteLanguage]
  const segment = table[page]

  if (!segment) return `/${language}`

  return `/${language}/${params.length > 0 ? fillParams(segment, params) : segment}`
}

/**
 * Kalıptaki `:ad` yer tutucularını SIRAYLA doldurur. Ada göre değil sıraya göre:
 * aynı sayfanın Türkçe ve İngilizce kalıbında yer tutucu adları farklı olabilir
 * (`:slug` / `:id`) ama sırası aynı — dil değiştirirken eşleştirmenin tek
 * güvenilir yolu konum.
 */
function fillParams(pattern: string, params: readonly string[]): string {
  let index = 0

  return pattern
    .split('/')
    .map((part) => (part.startsWith(':') ? encodeURIComponent(params[index++] ?? '') : part))
    .join('/')
}

/** Rewrite hedefi: `/tr/kesfet` → `/tr/explore`. */
export function canonicalPath(language: string, page: PageId): string {
  const segment = canonical[page]
  return segment ? `/${language}/${segment}` : `/${language}`
}

/**
 * Yoldan sayfa kimliğini çözer. Dil değiştirirken gerekiyor: kullanıcı
 * `/tr/kesfet`'te dili İngilizce yaparsa `/en/explore`'a gitmeli — ana sayfaya
 * atılmamalı.
 *
 * <b>Yolun TAMAMI eşleştiriliyor, ilk segmenti değil.</b> Önceki hâli yalnız dilden
 * sonraki tek segmente bakıp tam eşitlik arıyordu; tablodaki çok segmentli kayıtlar
 * (`deneyim/:slug`, `host/deneyim/yeni`) hiçbir zaman tutmuyor ve deneyim detayında
 * dil değiştiren kullanıcı ana sayfaya düşüyordu — Blok 5'in vitrin sayfası dahil.
 *
 * Yakalanan parametreler geri veriliyor ki hedef dilde AYNI kaynağa gidilebilsin:
 * `/tr/deneyim/x` → `/en/experience/x`, slug'ı kaybetmeden.
 */
export function resolvePage(
  pathname: string,
): { language: string; page: PageId; params: string[] } | undefined {
  const [maybeLanguage = '', ...rest] = pathname.split('/').filter(Boolean)

  if (!isRoutableLanguage(maybeLanguage)) return undefined

  if (rest.length === 0) {
    return { language: maybeLanguage, page: 'home', params: [] }
  }

  // Önce lokalize tablo, sonra kanonik: kanonik segmentle de gelinebilir (rewrite
  // sonrası iç yol, ya da elle yazılmış `/tr/explore`). Sayfayı bulabiliyorsak
  // 404 vermek için sebep yok.
  const hit = matchTable(localized[maybeLanguage], rest) ?? matchTable(canonical, rest)

  return hit ? { language: maybeLanguage, page: hit.page, params: hit.params } : undefined
}

/**
 * Tablodaki kalıpları segmentlere karşı dener. <b>Değişmezi az olan önce</b>:
 * `host/deneyim/yeni` ile `host/deneyim/:id` ikisi de üç segmentli ve aynı yolu
 * tutabilir; sabit olanı önce denemezsek "yeni" bir kimlik sanılır.
 */
function matchTable(
  table: Record<PageId, string> | undefined,
  segments: readonly string[],
): { page: PageId; params: string[] } | undefined {
  if (!table) return undefined

  const candidates = entriesOf(table)
    .filter(([, pattern]) => pattern !== '')
    .sort(([, a], [, b]) => countParams(a) - countParams(b))

  for (const [page, pattern] of candidates) {
    const params = matchPattern(pattern, segments)
    if (params) return { page, params }
  }

  return undefined
}

function countParams(pattern: string): number {
  return pattern.split('/').filter((part) => part.startsWith(':')).length
}

/** Kalıp segmentleri tutuyorsa yakalanan parametreler, tutmuyorsa `undefined`. */
function matchPattern(pattern: string, segments: readonly string[]): string[] | undefined {
  const parts = pattern.split('/')
  if (parts.length !== segments.length) return undefined

  const params: string[] = []

  for (const [index, part] of parts.entries()) {
    if (part.startsWith(':')) {
      // Boş segment yakalanmıyor: `/tr/deneyim/` bir ilan değil.
      if (!segments[index]) return undefined
      params.push(decodeURIComponent(segments[index]))
      continue
    }

    if (part !== segments[index]) return undefined
  }

  return params
}

/** Aynı sayfanın başka dildeki karşılığı. Bulunamazsa o dilin ana sayfası. */
export function switchLanguage(pathname: string, target: string): string {
  const resolved = resolvePage(pathname)
  return resolved ? path(target, resolved.page, resolved.params) : path(target, 'home')
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
