import 'server-only'

import { cache } from 'react'

/**
 * Yer kayıt defterine (Blok 4) giden BFF kapısı.
 *
 * `features/auth/api.ts` ile aynı mimari: tarayıcı .NET API'yi hiç görmüyor,
 * `EXPYRA_API_URL` sunucuda kalıyor. Fark, bu uçların ANONİM ve kullanıcıdan
 * bağımsız olması — token da, `Accept-Language` da iletilmiyor:
 *
 * - Yanıtlar yerelleştirilmiş metin taşımıyor (ülke/şehir adı `Intl.DisplayNames`
 *   ile istemcide çiziliyor, docs/I18N.md §1). Dil iletmek tek bir önbellek
 *   girdisiyle her dile hizmet etme imkânını boşa harcardı.
 * - `headers()` okumak render'ı dinamiğe düşürür; bu veri günlerce aynı.
 *
 * Bu yüzden `fetch` Next'in Data Cache'ine yazıyor ve süreler API'nin kendi
 * `Cache-Control` başlıklarıyla AYNI (`PublicCacheAttribute`): iki katman farklı
 * süre tutarsa hangi verinin ne kadar bayat olduğu kimsenin cevaplayamadığı bir
 * soruya döner.
 */

/** `GET /api/places/cities` satırı. Alan adları API sözleşmesiyle birebir. */
export type City = {
  id: string
  slug: string
  countryCode: string
  name: string
  englishName: string
  timeZoneId: string
  latitude: number
  longitude: number
}

/** `GET /api/places/countries` satırı. */
export type Country = {
  code: string
  englishName: string
  cityCount: number
}

/**
 * Arama metninin en az kaç harf içermesi gerektiği.
 *
 * Kaynak `SearchCitiesQuery.MinQueryLength` (API) — süreç sınırının iki yakasında
 * duran bir sabit, tek dosyada tutulamıyor. Buradaki kopya, istemcinin "sormaya
 * değer mi" kararını sunucuya sormadan verebilmesi için var; kural yine sunucuda
 * ve tek harflik istek 400 alıyor.
 */
export const MIN_CITY_QUERY_LENGTH = 2

/** `SearchText.MaxLength` (API) — daha uzun metin doğrulamadan 400 ile döner. */
const MAX_CITY_QUERY_LENGTH = 200

/** API'nin `PublicCacheAttribute` süreleriyle aynı: şehir araması 10 dk. */
const CITY_REVALIDATE_SECONDS = 10 * 60

/** Ülke kayıt defteri 1 gün. */
const COUNTRY_REVALIDATE_SECONDS = 24 * 60 * 60

/**
 * URL'de ve gizli form alanında taşınan şehir kimliği: `cz-prague`, `tr-istanbul`.
 *
 * **Neden `city.id` (uuid) DEĞİL** — üç ayrı sebep, üçü de tek başına yeterli:
 *
 * 1. Kimlik seed'de üretiliyor ve *yeniden üretilmiyor* (`City.cs`: doğal anahtar
 *    `(CountryCode, Slug)`). Yani aynı şehrin uuid'i her veritabanında farklı;
 *    paylaşılan bir bağlantı ikinci ortamda başka bir şehri gösterir ya da hiçbir
 *    şeyi göstermez. Demo deneyimlerin şehre bağlanması da (bkz. `lib/experiences.ts`)
 *    ancak sabit bir anahtarla mümkün.
 * 2. API'de `GET /api/places/cities/{id}` YOK. Elde yalnız arama ucu var; uuid'i
 *    geri şehre çevirecek bir yol olmadan sunucu, kullanıcının seçtiği şehrin adını
 *    ekrana yazamazdı.
 * 3. `?nerede=cz-prague` okunabilir ve paylaşılabilir; uuid opak.
 */
export type CityKey = string

/**
 * Anahtar iki harfli ülke kodu + tire + slug. Slug'ın kendisi tire içerebiliyor
 * (`cesky-krumlov`), bu yüzden ayrım İLK tireden yapılıyor — ülke kodunun uzunluğu
 * sabit olduğu için belirsizlik yok.
 */
const CITY_KEY_PATTERN = /^([a-z]{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/

export function cityKeyOf(city: Pick<City, 'countryCode' | 'slug'>): CityKey {
  return `${city.countryCode.toLowerCase()}-${city.slug}`
}

/**
 * Anahtarı parçalar. Biçimi tutmayan değer `null` — çağıran bunu "bilinmeyen şehir"
 * akışına çeviriyor, sessizce yok saymıyor (PLAN Blok 4, kabul kriteri 3).
 *
 * Küçük harfe indirme `toLowerCase()` ile ve BİLİNÇLİ olarak invariant: Türkçe
 * kuralda `"TR-ISTANBUL"` → `"tr-ıstanbul"` olur ve slug eşleşmezdi (aynı tuzak
 * `LanguageCode.cs` ve `SearchText.cs` içinde de yazılı).
 */
export function parseCityKey(value: string | undefined): { country: string; slug: string } | null {
  if (!value) return null

  const match = CITY_KEY_PATTERN.exec(value.trim().toLowerCase())
  if (!match) return null

  const [, country, slug] = match
  return country && slug ? { country, slug } : null
}

/**
 * Şehrin ekranda görünecek adı.
 *
 * Kayıt defterinde şehir adının TAM OLARAK iki yazımı var: endonim (`Praha`) ve
 * İngilizce exonim (`Prague`) — `City.cs`'in kendi notu ikincisi için "en arayüzünün
 * gösterdiği ad" diyor. Üçüncü bir dil için çeviri yok ve uydurulmuyor: o dilde
 * endonim gösterilir, ki I18N §1'in kuralı da bu (yerinde doğru olan ad).
 *
 * Politika TEK YERDE, burada. İstemci bileşeni sözlüğü göremediği gibi bu dosyayı
 * da göremiyor (`server-only`); ona kararın sonucu `preferEnglishName` boolean'ı
 * olarak iniyor (bkz. `experience-search.tsx`).
 */
export function prefersEnglishCityName(lang: string): boolean {
  return lang === 'en'
}

export function cityDisplayName(lang: string, city: Pick<City, 'name' | 'englishName'>): string {
  return prefersEnglishCityName(lang) ? city.englishName : city.name
}

/** API ProblemDetails'ini durum koduyla taşır; route handler durum kodunu geri yansıtıyor. */
export class PlacesApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PlacesApiError'
    this.status = status
  }
}

/**
 * `EXPYRA_API_URL` FONKSİYON İÇİNDE okunuyor: modül seviyesinde okunursa
 * `next build`, değişkeni tanımlı olmayan CI makinesinde patlar.
 *
 * `features/auth/api.ts` içinde aynı kural var ve orada `private`. İki satırlık
 * bir okuyucu için ortak modül açmak yerine kopyalandı — üçüncü tüketici çıktığında
 * (Blok 5) `lib/` altına taşınacak. Kopyanın bedeli sıfır değil ama küçük: kural
 * değişirse iki yer var, ikisi de aynı hatayı fırlatıyor.
 */
function apiBaseUrl(): string {
  const value = process.env.EXPYRA_API_URL?.trim()

  if (!value) {
    throw new Error('EXPYRA_API_URL tanımlı değil. Örnek için apps/web/.env.example dosyasına bak.')
  }

  return value.replace(/\/+$/, '')
}

async function getJson<T>(path: string, revalidateSeconds: number): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { Accept: 'application/json' },
    // Data Cache: aynı önek için ikinci istek API'ye hiç gitmiyor.
    next: { revalidate: revalidateSeconds },
  })

  if (!response.ok) {
    // Gövde okunmuyor: API'nin ProblemDetails metni kullanıcının dili olmak zorunda
    // değil ve arayüz zaten kendi metnini gösteriyor (`features/auth/api.ts` kararı).
    throw new PlacesApiError(response.status, `Yer kayıt defteri ${response.status} döndü.`)
  }

  return (await response.json()) as T
}

/**
 * Şehir autocomplete'i. En az bir ölçüt zorunlu; ikisi de boşsa API 400 döner ve
 * bu doğru davranış — "ölçütsüz arama" istemcide sessizce tüm dünyanın ilk 20
 * şehrine dönüşmemeli.
 */
export async function searchCities(input: {
  query?: string | null
  country?: string | null
}): Promise<City[]> {
  const params = new URLSearchParams()

  if (input.query?.trim()) params.set('q', input.query.trim())
  if (input.country?.trim()) params.set('country', input.country.trim())

  return await getJson<City[]>(`/api/places/cities?${params.toString()}`, CITY_REVALIDATE_SECONDS)
}

/**
 * Kayıt defterinde ŞEHRİ OLAN ülkeler. `onlyWithCities=false` seçeneği bilerek
 * dışarı açılmadı: 249 ülkeyi listeleyip 39'unda sonuç vermek, kullanıcıya arzın
 * nerede olduğunu değil nerede olmadığını gösterir. (Host onboarding'in tam listeye
 * ihtiyacı olduğunda parametre eklenir — API tarafı hazır.)
 */
export async function fetchCountries(): Promise<Country[]> {
  return await getJson<Country[]>(
    '/api/places/countries?onlyWithCities=true',
    COUNTRY_REVALIDATE_SECONDS,
  )
}

/**
 * URL'den gelen anahtarı gerçek bir şehir satırına çevirir. Bulunamazsa `null` —
 * ve çağıran bunu EKRANDA söylemek zorunda (PLAN Blok 4, kabul kriteri 3).
 *
 * **Neden arama ucu üzerinden:** API'de kimlikle şehir getiren bir uç yok, doğal
 * anahtarla getiren de. Elde olan tek okuma yüzeyi autocomplete; onu doğru
 * kullanmak, uydurma bir uç beklemekten iyi.
 *
 * **Neden `slug`'ın tireleri boşluğa çevriliyor:** `city_alias.normalized_name`
 * `SearchText.Fold` çıktısı ve o fonksiyon tireyi BOŞLUĞA indiriyor
 * ("Český Krumlov" → `cesky krumlov`). Slug ise aynı metnin tireli hâli. Tireli
 * gönderilseydi katlama tireyi atar, `ceskykrumlov` olur ve hiçbir alias'a önek
 * olmazdı. (156 şehrin tamamı için doğrulandı: slug'ın boşluklu hâli her zaman bir
 * alias öneki.)
 *
 * Dönüş, önek eşleşmesinin ilk satırı DEĞİL, slug'ı birebir tutan satır: "prag"
 * öneki hem `prague` hem de bir gün eklenecek `prague-castle` ile eşleşebilir.
 *
 * `cache`: sayfa hem `generateMetadata` hem render sırasında aynı şehri sorabilir;
 * sarmalanmasaydı tek görüntüleme iki API turu ederdi (`fetchCurrentUser` kalıbı).
 */
export const resolveCity = cache(async (key: string | undefined): Promise<City | null> => {
  const parsed = parseCityKey(key)
  if (!parsed) return null

  const query = parsed.slug.replace(/-/g, ' ')

  /*
    API'nin doğrulama sınırlarına UYMAYAN anahtar hiç sorulmuyor: `?nerede=cz-a`
    ya da 300 harflik uydurma bir slug 400 alır ve o 400 burada bir istisnaya,
    istisnadan da hata ekranına dönerdi. Oysa bunlar "bilinmeyen şehir" — kullanıcı
    "bu şehri tanımıyoruz" ekranını görmeli, hata ekranını değil. Hata yutmuyoruz:
    gerçekten API'den gelen bir 400/500 hâlâ yukarı fırlıyor.
  */
  const letters = query.replaceAll(' ', '').length
  if (letters < MIN_CITY_QUERY_LENGTH || query.length > MAX_CITY_QUERY_LENGTH) return null

  const candidates = await searchCities({ query, country: parsed.country })

  return candidates.find((city) => city.slug === parsed.slug) ?? null
})
