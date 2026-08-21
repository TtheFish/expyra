import 'server-only'

import { ApiError, type ProblemErrors } from '@/features/auth/api'
import type { SimpleMessageKey } from '@/features/i18n/dictionary'

/**
 * Host ilan uçlarına giden BFF kapısı (`/api/host/experiences`).
 *
 * `features/auth/api.ts` ile aynı mimari: tarayıcı .NET API'yi hiç görmüyor,
 * `EXPYRA_API_URL` sunucuda kalıyor, token `Authorization` başlığına burada
 * yazılıyor. Fark, buradaki her ucun **rol kapısının arkasında** olması: host
 * olmayan bir token 403 alıyor ve o 403 bir arıza değil, ekranın bir durumu
 * (bkz. `HostExperienceAccessError`).
 *
 * ## Önbellek YOK
 *
 * `features/places/api.ts` yanıtlarını Next Data Cache'ine yazıyor çünkü şehir
 * kayıt defteri günlerce aynı ve herkese aynı. Burası tam tersi: yanıt tek bir
 * host'a ait ve host onu saniyeler içinde değiştiriyor. `cache: 'no-store'`
 * bilinçli — bir taslağı kaydettikten sonra bayat liste görmek, "kaydedildi mi"
 * sorusunu her kayıtta yeniden sordururdu.
 *
 * ## Kullanıcı kimliği burada YOK (CLAUDE.md #3)
 *
 * Hiçbir imzada `hostId` yok ve URL'de de yok (`/api/host/experiences`,
 * `/api/hosts/{id}/experiences` değil). Kimlik token'ın `sub`'undan okunuyor.
 * `experienceId` ise bir KAYNAK kimliği, kimlik değil: başkasının ilanı için API
 * 404 dönüyor (403 değil — enumeration), yani istemcinin id taşıması bir kapı
 * açmıyor.
 */

/** Sunucudaki `ExperienceStatus` — metin olarak taşınıyor, sayı olarak değil. */
export type HostExperienceStatus = 'Draft' | 'Published' | 'Archived'

/** `ExperienceTranslation.Source` — bu blokta daima `HostWritten` (makine çevirisi Blok 10). */
export type TranslationSource = 'HostWritten' | 'Machine'

export type HostExperienceTranslation = {
  /** İlan METNİNİN dili — host'un konuştuğu dil değil (docs/I18N.md §3). */
  language: string
  title: string
  description: string | null
  source: TranslationSource
  updatedAtUtc: string
}

/**
 * `HostExperienceResponse` ile birebir. **Beş yazma ucu ve liste ucu aynı şekli
 * dönüyor**, yani tek bir ayrıştırıcı yetiyor.
 *
 * Misafirin göreceği şekil bu DEĞİL (Blok 5b): orada tüm çeviriler değil, fallback
 * zincirinden geçmiş tek bir çeviri var.
 */
export type HostExperience = {
  id: string
  /** Orijinal dildeki başlık ilk yazılana kadar `null`. */
  slug: string | null
  status: HostExperienceStatus
  cityId: string | null
  categorySlug: string | null
  /** 0 = "henüz girilmedi" (sunucu 0'ı yazmaya izin vermiyor, yalnız başlangıç değeri). */
  durationMinutes: number
  capacity: number
  /** Şehirden TÜREYEN alan; istemci asla göndermiyor. */
  timeZoneId: string | null
  originalLanguage: string
  /** Deneyim sırasında KONUŞULAN diller (docs/I18N.md §3). */
  spokenLanguages: string[]
  tags: string[]
  translations: HostExperienceTranslation[]
  /**
   * Galeri, host'un verdiği sırada. **Yalnız doğrulanmış görseller**: imzalı adresi
   * alınmış ama yüklenmemiş satırlar burada çıkmıyor, aksi halde panelde kırık
   * küçük resim olurdu.
   */
  media: HostExperienceMedia[]
  /** Yayına engel olan koşulların kodları; boşsa ilan yayınlanabilir. */
  missingPublishRequirements: string[]
  createdAtUtc: string
  updatedAtUtc: string | null
  /** İLK yayın anı. Doluysa şehir kilitli — arşivlense bile temizlenmiyor. */
  publishedAtUtc: string | null
}

/**
 * `PATCH` gövdesi. **Gerçek delta**: verilmeyen alan sunucuda `null` olarak
 * görünüyor ve "dokunma" demek — `PATCH /api/users/me`'nin (tam gövde) TERSİ.
 *
 * Ayrım sunucunun kararı ve gerekçesi orada yazılı: altı alanlık bir sihirbazda
 * "hepsini gönder" sözleşmesi, adım 2'yi kaydeden istemciye adım 1'i sessizce
 * sildirirdi. `JSON.stringify` `undefined` alanları atladığı için tip sistemi bu
 * sözleşmeyi kendiliğinden koruyor: alanı yazmamak = dokunmamak.
 *
 * Koleksiyonlarda "boşalt" niyeti **boş dizi** ile anlatılıyor (`[]` ≠ `undefined`).
 */
export type HostExperienceMedia = {
  id: string
  url: string
  /** GERÇEK piksel ölçüsü — baytlardan okundu, istemcinin beyanı değil. */
  width: number
  height: number
  sortOrder: number
  /** Kartta ve paylaşım önizlemesinde çıkan görsel. İlan başına en fazla bir tane. */
  isCover: boolean
}

/**
 * İmzalı yükleme izni. `uploadUrl` API'nin değil DEPONUN adresi — tarayıcı oraya
 * doğrudan PUT ediyor ve yetki `Authorization` başlığında değil imzada.
 *
 * `headers` AYNEN gönderilmek zorunda: imza onların üzerine kurulu.
 */
export type MediaUpload = {
  mediaId: string
  uploadUrl: string
  method: string
  headers: Record<string, string>
  expiresAtUtc: string
}

export type HostExperiencePatch = {
  cityId?: string
  categorySlug?: string
  durationMinutes?: number
  capacity?: number
  spokenLanguages?: string[]
  tags?: string[]
}

/**
 * Sayfanın çizemeyeceği durumlar. Bir arıza değil, ekranın YÖNLENDİRME sebebi:
 * çağıran bunu yakalayıp giriş ekranına ya da "host ol" ekranına gönderiyor.
 *
 * Neden ayrı tip: `ApiError`'ı sayfada durum koduyla ayıklamak, aynı üç dalın
 * (401 / 403 / 404) her sayfada yeniden yazılması demekti ve biri unutulduğunda
 * kullanıcı hata ekranı görürdü.
 */
export type HostExperienceAccessReason =
  /** Token yok ya da API tanımıyor. */
  | 'signedOut'
  /** Token geçerli ama rol claim'i yok (ya da hesap askıya alınmış). */
  | 'notHost'
  /** Böyle bir ilan yok — ya da başkasının. API ikisini ayırmıyor, biz de ayırmıyoruz. */
  | 'notFound'

export class HostExperienceAccessError extends Error {
  readonly reason: HostExperienceAccessReason

  constructor(reason: HostExperienceAccessReason) {
    super(`host deneyim erisimi: ${reason}`)
    this.name = 'HostExperienceAccessError'
    this.reason = reason
  }
}

/**
 * Yayın koşulu kodu → arayüz sözlüğü anahtarı.
 *
 * Sunucu KOD gönderiyor, cümle değil (`ExperiencePublishRequirement`) ve gerekçesi
 * orada yazılı: gösterilecek metin arayüz sözlüğünde (docs/I18N.md §1), API'nin
 * ProblemDetails başlığında değil — o başlığın dili kullanıcının dili olmak zorunda
 * değil.
 *
 * Tablo `Record<string, …>`: sunucu bir gün beşinci bir kural eklerse burada
 * karşılığı olmayan bir kod gelir. O kod SESSİZCE DÜŞÜRÜLMÜYOR — çağıran
 * `unknown` anahtarına düşüp "bir eksik daha var" diyor (CLAUDE.md #1).
 */
const REQUIREMENT_MESSAGE_KEYS: Record<string, SimpleMessageKey> = {
  translation: 'host.experience.missing.translation',
  city: 'host.experience.missing.city',
  category: 'host.experience.missing.category',
  capacity: 'host.experience.missing.capacity',
  cover: 'host.experience.missing.cover',
}

export function requirementMessageKey(code: string): SimpleMessageKey {
  return REQUIREMENT_MESSAGE_KEYS[code] ?? 'host.experience.missing.unknown'
}

/**
 * Kategori slug'ı → arayüz sözlüğü anahtarı.
 *
 * Kategori ADI veritabanında YOK, bilinçli (`GetCategoriesQuery`, docs/categories.json):
 * ad bizim yazdığımız arayüz metni, host'un içeriği değil. API yalnız slug dönüyor,
 * karşılığı burada çiziliyor.
 *
 * `docs/categories.json`'a yeni bir satır eklemek bu tabloya ve İKİ sözlüğe de satır
 * eklemeyi gerektiriyor. Eksikliği derlemede yakalanamıyor (slug listesi çalışma
 * anında veritabanından geliyor); bu yüzden bilinmeyen slug gizlenmiyor, ham hâliyle
 * gösteriliyor ve `console.error` düşüyor.
 */
const CATEGORY_MESSAGE_KEYS: Record<string, SimpleMessageKey> = {
  'food-drink': 'category.food-drink',
  'art-culture': 'category.art-culture',
  'history-heritage': 'category.history-heritage',
  'nature-outdoors': 'category.nature-outdoors',
  'water-sea': 'category.water-sea',
  'sports-adventure': 'category.sports-adventure',
  'crafts-workshops': 'category.crafts-workshops',
  'music-nightlife': 'category.music-nightlife',
  wellness: 'category.wellness',
  photography: 'category.photography',
  'tours-walks': 'category.tours-walks',
  'local-life': 'category.local-life',
}

export function categoryMessageKey(slug: string): SimpleMessageKey | null {
  const key = CATEGORY_MESSAGE_KEYS[slug]
  if (key) return key

  console.error('host.category.unknownSlug', slug)
  return null
}

/**
 * `EXPYRA_API_URL` FONKSİYON İÇİNDE okunuyor: modül seviyesinde okunursa
 * `next build` değişkeni tanımlı olmayan CI makinesinde patlar.
 *
 * **Bu, aynı kuralın ÜÇÜNCÜ kopyası** (`features/auth/api.ts`, `features/places/api.ts`).
 * Yer kayıt defteri dosyası "üçüncü tüketici çıktığında (Blok 5) `lib/` altına
 * taşınacak" diye not düşmüştü; üçüncü tüketici bu dosya. Taşıma burada YAPILMADI
 * çünkü üç dosyayı birden değiştirmek gerekiyor ve bu PR host ekranlarını taşıyor —
 * yarım taşıma, aynı kuralın iki farklı şekilde yaşadığı bir ara durum bırakırdı.
 */
function apiBaseUrl(): string {
  const value = process.env.EXPYRA_API_URL?.trim()

  if (!value) {
    throw new Error('EXPYRA_API_URL tanımlı değil. Örnek için apps/web/.env.example dosyasına bak.')
  }

  return value.replace(/\/+$/, '')
}

/**
 * ProblemDetails → `ApiError`. `features/auth/api.ts`'teki eşinin kopyası; orada
 * `private` olduğu için paylaşılamıyor (yukarıdaki taşıma notu bunu da kapsıyor).
 *
 * Gövdedeki `title` kullanıcıya GÖSTERİLMİYOR, yalnız log ve ayıklama için
 * taşınıyor: API'nin dili kullanıcının dili olmak zorunda değil.
 */
async function problemOf(response: Response): Promise<ApiError> {
  let title = ''
  let errors: ProblemErrors | null = null

  try {
    const payload: unknown = await response.json()

    if (payload && typeof payload === 'object') {
      if ('title' in payload && typeof (payload as { title: unknown }).title === 'string') {
        title = (payload as { title: string }).title
      }

      if ('errors' in payload) {
        errors = validationErrorsOf((payload as { errors: unknown }).errors)
      }
    }
  } catch {
    // Gövde ProblemDetails değil (ör. ters proxy'nin HTML hata sayfası). Hata
    // yutulmuyor: zaten `ApiError` üretiyoruz, yalnız mesaj durum koduna düşüyor.
  }

  return new ApiError(response.status, title || `API ${response.status}`, null, errors)
}

function validationErrorsOf(value: unknown): ProblemErrors | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const result: Record<string, string[]> = {}

  for (const [field, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((item): item is string => typeof item === 'string')
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

type RequestInput = {
  accessToken: string
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
}

/**
 * Tek giriş noktası. **401 ve 403 burada `HostExperienceAccessError`'a çevriliyor**,
 * geri kalan her durum `ApiError` olarak yukarı gidiyor: 400 (doğrulama), 404
 * (bulunamadı — çağıran ayırt etmek isteyebilir), 409 (iş kuralı) ve 5xx.
 *
 * 404'ün burada çevrilmemesinin sebebi: liste ucu 404 üretmiyor, yalnız tekil
 * yollar üretiyor ve orada "bu id'yi kim istedi" bilgisi çağıranda. Sayfa
 * `notFound()` diyor, eylem ise kullanıcıya bir cümle gösteriyor — ikisi aynı
 * dala giremez.
 */
async function send({ accessToken, method, path, body }: RequestInput): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Host'un kendi verisi; ne paylaşılabilir ne de bayatlayabilir.
    cache: 'no-store',
  })

  if (response.ok) {
    return response
  }

  if (response.status === 401) {
    throw new HostExperienceAccessError('signedOut')
  }

  if (response.status === 403) {
    throw new HostExperienceAccessError('notHost')
  }

  throw await problemOf(response)
}

/**
 * Host'un ilanları. Taslak, yayında ve arşiv HEPSİ burada — bu liste misafirin
 * gördüğü listenin bir alt kümesi değil, panelin kendisi.
 *
 * `status` verilmezse hepsi gelir. Tanınmayan değer API'de 400; arayüz kapalı bir
 * kümeden seçtiği için oraya düşmüyor.
 */
export async function fetchHostExperiences(
  accessToken: string,
  status?: HostExperienceStatus,
): Promise<HostExperience[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await send({ accessToken, method: 'GET', path: `/api/host/experiences${query}` })

  return (await response.json()) as HostExperience[]
}

/**
 * Tek ilan. **API'de tekil bir GET ucu YOK** (`HostExperiencesController`: liste ucu
 * var, `GET /{id}` yok), bu yüzden liste çekilip içinden seçiliyor.
 *
 * Bedeli görünür olsun diye burada yazılı: ilan sayısı büyüdükçe düzenleme sayfası
 * gereksiz satır taşıyor. Bugün bir host'un ilan sayısı tek haneli; `GET
 * /api/host/experiences/{id}` eklendiği gün bu fonksiyonun gövdesi tek satıra iner
 * ve çağıranların hiçbiri değişmez.
 *
 * Bulunamayan id `null` — 404 fırlatmıyor, çünkü "yok" ile "başkasının" ayrımı zaten
 * API tarafında bilinçli olarak yapılmıyor ve çağıran ikisine de aynı cevabı veriyor.
 */
export async function fetchHostExperience(
  accessToken: string,
  id: string,
): Promise<HostExperience | null> {
  const all = await fetchHostExperiences(accessToken)
  return all.find((experience) => experience.id === id) ?? null
}

/**
 * Boş taslak açar. **Tek alanı `originalLanguage`** ve o alan bir daha değişmiyor:
 * fallback zincirinin sonu ve slug'ın kaynağı o (docs/I18N.md §2).
 */
export async function createExperience(
  accessToken: string,
  originalLanguage: string,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'POST',
    path: '/api/host/experiences',
    body: { originalLanguage },
  })

  return (await response.json()) as HostExperience
}

export async function updateExperience(
  accessToken: string,
  id: string,
  patch: HostExperiencePatch,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'PATCH',
    path: `/api/host/experiences/${encodeURIComponent(id)}`,
    body: patch,
  })

  return (await response.json()) as HostExperience
}

/**
 * Bir dildeki başlık ve açıklama. **Upsert**: satır yoksa açılır, varsa üzerine
 * yazılır — istemcinin "bu dilde çeviri var mıydı" sorusunu sorması gerekmiyor.
 *
 * Dil kodu sunucuda kanonikleşiyor (`en_us` → `en-US`), bu yüzden burada
 * normalize edilmiyor: iki yerde normalize etmek, iki kuralın ayrışmasına açık
 * kapı bırakırdı.
 */
export async function setExperienceTranslation(
  accessToken: string,
  id: string,
  language: string,
  text: { title: string; description: string | null },
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'PUT',
    path: `/api/host/experiences/${encodeURIComponent(id)}/translations/${encodeURIComponent(language)}`,
    body: text,
  })

  return (await response.json()) as HostExperience
}

/** Eksik ilan **409** alır ve taslak DEĞİŞMEDEN kalır. İdempotent: yayındaki ilan 200. */
export async function publishExperience(
  accessToken: string,
  id: string,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'POST',
    path: `/api/host/experiences/${encodeURIComponent(id)}/publish`,
  })

  return (await response.json()) as HostExperience
}

/** Raftan indirir. Doğrulama istemez, idempotenttir, geri dönüşü var (yeniden yayınla). */
export async function archiveExperience(
  accessToken: string,
  id: string,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'POST',
    path: `/api/host/experiences/${encodeURIComponent(id)}/archive`,
  })

  return (await response.json()) as HostExperience
}

/** API'nin `PublicCacheAttribute` süresiyle aynı: kategori kayıt defteri 1 saat. */
const CATEGORY_REVALIDATE_SECONDS = 60 * 60

/**
 * Kategori slug'ları — sıralı (`sort_order`), yalnız aktif olanlar.
 *
 * **Neden burada, `features/places/api.ts`'te değil:** o dosya YER kayıt defterinin
 * kapısı ("Blok 4'e giden BFF") ve kategori bir yer değil. Doğru evi kendi
 * `features/catalog/` modülü; bu PR'da açılmadı çünkü ikinci tüketicisi (misafir
 * filtreleri, Blok 8) henüz yok ve tek tüketicili bir modül, taşınması gereken
 * ikinci bir yer demek. Taşındığında imza değişmiyor.
 *
 * Anonim uç: token GÖNDERİLMİYOR ve `send` kullanılmıyor — yanıt kullanıcıya bağlı
 * değil, Next Data Cache'inde paylaşılabiliyor.
 */
export async function fetchCategorySlugs(): Promise<string[]> {
  const response = await fetch(`${apiBaseUrl()}/api/categories`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: CATEGORY_REVALIDATE_SECONDS },
  })

  if (!response.ok) {
    // Hata YUTULMUYOR: boş liste dönmek "hiç kategori yok" derdi ve host,
    // yayınlamasını engelleyen alanı hiç göremeden bırakırdı (CLAUDE.md #1).
    throw await problemOf(response)
  }

  const payload = (await response.json()) as { slug: string }[]
  return payload.map((item) => item.slug)
}

/**
 * Düzenleme ekranının yolu.
 *
 * **Neden lokalize slug YOK** (`/tr/host/deneyim/{id}` değil): dinamik segmentli bir
 * yolu lokalize etmek `next.config.ts`'te joker karakterli bir rewrite ister
 * (`/tr/host/deneyim/:id*`), oysa oradaki üretici `route-map.json`'dan yalnız TAM
 * yol üretiyor — ve tabloya joker yazmak `path()` ile `alternateLinks()`'i bozardı.
 *
 * Bedeli sıfıra yakın ve ölçülebilir: lokalize URL kuralının gerekçesi `hreflang`
 * tutarlılığı ve paylaşılabilirlik (`lib/routes.ts` §1). Bu sayfa oturum arkasında
 * ve `noindex`; kimse kendi taslak düzenleyicisinin bağlantısını paylaşmıyor, arama
 * motoru da onu hiç görmüyor. Sihirbazın GİRİŞİ (`/tr/host/deneyim/yeni`) lokalize
 * çünkü o yol paylaşılabilir bir davet.
 */
export function hostExperiencePath(lang: string, id: string): string {
  return `/${lang}/host/experience/${encodeURIComponent(id)}`
}

// ---------------------------------------------------------------------------
// Görseller
//
// Akış İKİ adımlı ve arada tarayıcı var: (1) sunucu imzalı adres üretiyor,
// (2) TARAYICI dosyayı doğrudan depoya PUT ediyor, (3) sunucu onaylıyor.
//
// Ortadaki adım bu dosyadan geçMİYOR ve geçemez: bayt Next sunucusuna uğrasaydı
// PLAN Blok 6 kabul kriteri 1 ("API bayt taşımaz") BFF katmanında delinirdi —
// dosya yine bir sunucudan geçmiş olurdu, sadece başka bir sunucudan.
// ---------------------------------------------------------------------------

/** İmzalı yükleme adresi ister. Bayt henüz yok; yalnız tip ve boyut beyan ediliyor. */
export async function createMediaUpload(
  accessToken: string,
  id: string,
  file: { contentType: string; byteSize: number },
): Promise<MediaUpload> {
  const response = await send({
    accessToken,
    method: 'POST',
    path: `/api/host/experiences/${encodeURIComponent(id)}/media/upload-url`,
    body: file,
  })

  return (await response.json()) as MediaUpload
}

/**
 * Yüklemeyi doğrular ve görseli yayına açar. Sunucu burada BAYTLARA bakıyor —
 * "image/png" diye bildirilmiş bir SVG bu adımda 409 alıyor.
 */
export async function confirmMedia(
  accessToken: string,
  id: string,
  mediaId: string,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'POST',
    path: `/api/host/experiences/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}/confirm`,
  })

  return (await response.json()) as HostExperience
}

/** Sırayı TOPTAN yazar: gelen dizinin sırası yeni sıra. Eksik kimlik 409. */
export async function reorderMedia(
  accessToken: string,
  id: string,
  mediaIds: string[],
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'PUT',
    path: `/api/host/experiences/${encodeURIComponent(id)}/media/order`,
    body: { mediaIds },
  })

  return (await response.json()) as HostExperience
}

/** Kapağı bu görsele taşır. Kapağı BOŞALTAN bir uç yok — daima tam bir tane var. */
export async function setMediaCover(
  accessToken: string,
  id: string,
  mediaId: string,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'PUT',
    path: `/api/host/experiences/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}/cover`,
  })

  return (await response.json()) as HostExperience
}

/** Görseli siler; depodaki nesne de gider. Yayındaki ilanın SON görseli 409. */
export async function deleteMedia(
  accessToken: string,
  id: string,
  mediaId: string,
): Promise<HostExperience> {
  const response = await send({
    accessToken,
    method: 'DELETE',
    path: `/api/host/experiences/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`,
  })

  return (await response.json()) as HostExperience
}
