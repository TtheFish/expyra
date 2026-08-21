import 'server-only'

import { cache } from 'react'
import { ApiError } from '@/features/auth/api'
import { alternateLinks, path } from '@/lib/routes'

/**
 * Misafirin gördüğü deneyim uçlarına (`/api/experiences`) giden BFF kapısı.
 *
 * `features/places/api.ts` ve `features/host/experiences-api.ts` ile aynı mimari:
 * tarayıcı .NET API'yi hiç görmüyor, `EXPYRA_API_URL` sunucuda kalıyor. Farklar:
 *
 * - **Anonim.** Token gönderilmiyor; yanıt kullanıcıya göre değişmiyor. Keşif,
 *   giriş yapmamış misafirin gördüğü ilk şey.
 * - **Liste ISR ile 60 sn önbellekli** (`no-store` route'u statik üretimden düşürüp
 *   vitrini boş bırakıyordu). Yer kayıt defteri günlerce aynı, ilan
 *   verisi değil: host "Arşivle"ye bastığında ilan listeden düşmeli. API'nin kendi
 *   kararı da bu (`ExperiencesController`: `Cache-Control` bilinçli olarak yok) —
 *   iki katman farklı süre tutarsa hangi verinin ne kadar bayat olduğu
 *   cevaplanamaz bir soruya döner.
 *
 * ## Metnin dili SUNUCUDA seçiliyor
 *
 * `?lang=` sayfanın arayüz dili. Fallback zinciri (`de-AT` → `de` →
 * `OriginalLanguage` → `en`, docs/I18N.md §2) API tarafında çözülüyor ve buraya TEK
 * çeviri iniyor — hangi dilde döndüğü (`text.language`) ve yedeğe düşülüp
 * düşülmediği (`text.isFallback`) yanıtın içinde. Arayüz "Bu açıklama Türkçe"
 * rozetini o iki alandan basıyor, `istenen === dönen` karşılaştırmasını kendi
 * yapmıyor: aynı kural iki yerde yaşarsa ayrışır.
 */

/** `ExperienceTranslation.Source` — Blok 5'te daima `HostWritten`. */
export type TranslationSource = 'HostWritten' | 'Machine'

/**
 * Şehrin misafire dönen yüzü. **Yerelleştirilmiş ad yok** ve uydurulmuyor: kayıt
 * defterinde adın tam olarak iki yazımı var (endonim `Praha`, İngilizce exonim
 * `Prague`). Hangisinin gösterileceği arayüzün kararı (`cityDisplayName`).
 */
export type GuestExperienceCity = {
  slug: string
  countryCode: string
  name: string
  englishName: string
}

/** Fallback zincirinin kazananı — kart bu kadarını çiziyor. */
export type GuestExperienceText = {
  /** Metnin GERÇEKTEN döndüğü dil; istenen dil değil. */
  language: string
  title: string
  /** İstenen dil ile dönen dil ayrıştı mı. `lang` verilmediyse `false`. */
  isFallback: boolean
  source: TranslationSource
}

/** Detayın metni: yukarıdakinin üstüne açıklama. `null` = host yazmamış. */
export type GuestExperienceDetailText = GuestExperienceText & {
  description: string | null
}

/**
 * `GuestExperienceSummaryResponse` ile birebir.
 *
 * **Yanıtta hiç uuid yok** (API kararı): dışarıya açık kimlik deneyim için `slug`,
 * şehir için `<ülke>-<slug>`. Uuid'ler seed sırasında üretiliyor ve ortamlar
 * arasında değişiyor — aynı gerekçe `features/places/api.ts`'te üç maddeyle yazılı.
 *
 * **Fiyat ve puan alanı YOK** çünkü veri yok: fiyat Blok 7, puan Blok 14. Kart
 * bugüne kadar `'4.9'` sabitini gösteriyordu; gerçek veriye bağlanırken o sabit
 * gitti — uydurma bir puan, olmayan bir fiyattan daha zararlı.
 */
export type GuestExperienceSummary = {
  slug: string
  city: GuestExperienceCity
  categorySlug: string
  durationMinutes: number
  capacity: number
  text: GuestExperienceText
  publishedAtUtc: string
}

/**
 * `GuestExperienceDetailResponse` ile birebir. Detay sayfası **tek çağrıyla**
 * doluyor: şehir, metin, konuşulan diller ve etiketler aynı yanıtta.
 */
export type GuestExperienceDetail = Omit<GuestExperienceSummary, 'text'> & {
  /** Deneyim SIRASINDA konuşulan diller — metnin diliyle karıştırılmaz (I18N §3). */
  spokenLanguages: string[]
  /** Host'un yazdığı serbest etiketler, yazdığı hâliyle. Kategori değil. */
  tags: string[]
  text: GuestExperienceDetailText
}

export type GuestExperiencePage = {
  items: GuestExperienceSummary[]
  /** Sonraki sayfanın opak anahtarı; son sayfada `null`. */
  nextCursor: string | null
}

/**
 * Cursor'ın BİÇİMİ — `ExperienceCursor.EncodedLength` (24 bayt → dolgusuz
 * base64url, tam 32 karakter). Süreç sınırının iki yakasında duran bir sabit,
 * `MIN_CITY_QUERY_LENGTH` ile aynı durumda: kural yine sunucuda ve bozuk cursor
 * orada 400 alıyor.
 *
 * Buradaki kopyanın işi, adres çubuğunda elle bozulmuş bir bağlantıyı API'ye hiç
 * sormadan tanımak. Sessizce ilk sayfaya sarmıyoruz — o, sayfalayan bir istemciyi
 * sonsuz döngüye sokan davranış; çağıran bunu ekranda SÖYLÜYOR.
 */
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{32}$/

export function isExperienceCursor(value: string | undefined | null): value is string {
  return typeof value === 'string' && CURSOR_PATTERN.test(value)
}

/**
 * Ülke kodunun kullanıcının dilindeki adı: `CZ` → "Çekya" (tr), "Czechia" (en).
 *
 * **Neden burada:** API şehir satırında ülke KODU dönüyor, ad dönmüyor
 * (`GuestExperienceCityResponse`) — kodu ada çevirmek, bu yanıtı okumanın bir
 * parçası. Kendi çeviri tablomuzu tutmuyoruz; ICU 249 ülkeyi her dilde zaten
 * taşıyor (aynı gerekçe `lib/languages.ts:localNameOf` üzerinde yazılı).
 *
 * Çözülemezse kodun büyük harfli hâli dönüyor: gösterilecek bir şey her zaman var,
 * ama uydurulmuş bir ad yok.
 */
export function countryDisplayName(lang: string, countryCode: string): string {
  const code = countryCode.toUpperCase()

  try {
    return new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' }).of(code) ?? code
  } catch {
    // Geçersiz locale etiketi. Yutulmuyor: dönen değer kodun kendisi, yani ekranda
    // "CZ" görünür ve eksiklik gizlenmez.
    return code
  }
}

/**
 * Detay sayfasının yolu: `/tr/deneyim/<slug>`, `/en/experience/<slug>`.
 *
 * **Yol şablonu `route-map.json`'da** ve içinde `:slug` yer tutucusu var. Şablon
 * aynı anda üç şeyi besliyor: `next.config.ts`'in rewrite/redirect üreticisi (o
 * `:slug`'ı zaten path-to-regexp parametresi olarak anlıyor), buradaki link
 * üreticisi ve `experienceAlternates`. Tek tablo olması şart — linkler ile
 * rewrite'lar ayrı tablolardan beslenirse sessizce uyuşmaz ve 404 üretirler.
 */
export function experiencePath(lang: string, slug: string): string {
  return fillSlug(path(lang, 'experienceDetail'), slug)
}

/**
 * `hreflang` halkası (PLAN Blok 5, kabul kriteri 4).
 *
 * Slug DİLE GÖRE DEĞİŞMİYOR (API kararı: slug orijinal dildeki başlıktan bir kez
 * üretiliyor), yani `/tr/deneyim/x` ile `/en/experience/x` gerçekten aynı kaynak —
 * halkanın kurulabilmesinin şartı bu. `x-default` da `alternateLinks`'ten geliyor.
 */
export function experienceAlternates(slug: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(alternateLinks('experienceDetail')).map(([code, template]) => [
      code,
      fillSlug(template, slug),
    ]),
  )
}

const SLUG_PARAM = ':slug'

function fillSlug(template: string, slug: string): string {
  if (!template.includes(SLUG_PARAM)) {
    // Tabloda yer tutucu kalmamış: rewrite'lar da bozulmuş demektir. Sessizce
    // slug'sız bir yol döndürmek, her karta aynı bağlantıyı verirdi.
    throw new Error(`route-map: 'experienceDetail' yolunda ${SLUG_PARAM} yer tutucusu yok.`)
  }

  return template.replace(SLUG_PARAM, encodeURIComponent(slug))
}

/**
 * `EXPYRA_API_URL` FONKSİYON İÇİNDE okunuyor: modül seviyesinde okunursa
 * `next build`, değişkeni tanımlı olmayan CI makinesinde patlar.
 *
 * **Aynı kuralın DÖRDÜNCÜ kopyası** (`features/auth/api.ts`, `features/places/api.ts`,
 * `features/host/experiences-api.ts`). Üçüncü kopya "atomik bir taşıma PR'ı" diye
 * not düşmüştü; bu dosya o notu güçlendiriyor ama taşımayı yapmıyor — dört dosyayı
 * birden değiştirmek bu PR'ın işi değil ve yarım taşıma, aynı kuralın iki farklı
 * şekilde yaşadığı bir ara durum bırakır.
 */
function apiBaseUrl(): string {
  const value = process.env.EXPYRA_API_URL?.trim()

  if (!value) {
    throw new Error('EXPYRA_API_URL tanımlı değil. Örnek için apps/web/.env.example dosyasına bak.')
  }

  return value.replace(/\/+$/, '')
}

/**
 * Yayındaki ilanların bir sayfası.
 *
 * `city` kayıt defterinden ÇÖZÜLMÜŞ anahtar (`cz-prague`) — kullanıcının yazdığı
 * metin buraya hiç ulaşmıyor (`resolveCity`). Kayıt defterinde olmayan bir anahtar
 * API'de 400; çağıran şehri zaten çözdüğü için o dala düşmüyor ve düşerse gürültülü
 * düşüyor.
 *
 * Hata YUTULMUYOR: boş sayfa dönmek "bu şehirde deneyim yok" derdi ve kesinti
 * sessizce bir ürün durumuna dönüşürdü (CLAUDE.md #1). Çağıran `ApiError`'ı
 * yakalayıp ekranda ne olduğunu söylüyor.
 */
export async function fetchExperiences(input: {
  lang: string
  city?: string | null
  cursor?: string | null
}): Promise<GuestExperiencePage> {
  const params = new URLSearchParams({ lang: input.lang })

  if (input.city) params.set('city', input.city)
  if (input.cursor) params.set('cursor', input.cursor)

  const response = await fetch(`${apiBaseUrl()}/api/experiences?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    // ISR, `no-store` DEĞİL. `no-store` bu route'u statik üretimden düşürüyor ve
    // ana sayfa vitrini derleme sırasında BOŞ basılıyordu (hata loglanıyor ama
    // sayfa yine de üretiliyor) — yani ziyaretçi boş bir vitrin görürdü.
    // İlan listesi saniyelik tazelik istemiyor; 60 sn hem vitrini dolu tutuyor
    // hem yeni yayınlanan ilanı makul sürede gösteriyor.
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw problemOf(response)
  }

  return (await response.json()) as GuestExperiencePage
}

/**
 * Tek ilan. **404 → `null`**, istisna değil: taslak, arşiv, banlı host'un yayını ve
 * olmayan slug — dördü de API'de aynı 404 (enumeration'a kapalı) ve sayfanın hepsine
 * verdiği cevap aynı: `notFound()`.
 *
 * `cache`: `generateMetadata` ve render aynı ilanı soruyor; sarmalanmasaydı tek
 * görüntüleme iki API turu ederdi (`resolveCity` ve `fetchCurrentUser` kalıbı).
 * Anahtara `lang` de giriyor — metnin dili ona bağlı.
 */
export const fetchExperience = cache(
  async (slug: string, lang: string): Promise<GuestExperienceDetail | null> => {
    const params = new URLSearchParams({ lang })

    const response = await fetch(
      `${apiBaseUrl()}/api/experiences/${encodeURIComponent(slug)}?${params.toString()}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
    )

    if (response.status === 404) return null

    if (!response.ok) {
      throw problemOf(response)
    }

    return (await response.json()) as GuestExperienceDetail
  },
)

/**
 * Durum kodunu taşıyan `ApiError`. Gövde OKUNMUYOR: API'nin `ProblemDetails`
 * metni kullanıcının dili olmak zorunda değil ve arayüz zaten kendi metnini
 * gösteriyor (`features/places/api.ts` ile aynı karar). Bu yüzden buradaki tek
 * satır, üç dosyadaki `problemOf` kopyalarının aksine, gövde ayrıştırmıyor.
 */
function problemOf(response: Response): ApiError {
  return new ApiError(response.status, `Deneyim ucu ${response.status} döndü.`, null)
}
