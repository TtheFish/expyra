/**
 * PROTOTİP VERİ — Faz 2'de gerçek `Experience` tablosundan gelecek.
 * Ana sayfa ile /kesfet aynı listeyi kullansın diye buraya taşındı.
 */

export type Experience = {
  slug: string
  title: string
  city: string
  country: string
  price: number
  currency: string
  rating: string
  durationHours: number
  /** Kapasite: arama sonucu misafir sayısına göre elenirken kullanılıyor. */
  maxGuests: number
  tone: string
}

export const experiences: Experience[] = [
  {
    slug: 'bogazda-gun-batimi-yelkeni',
    title: 'Boğaz’da Gün Batımı Yelkeni',
    city: 'İstanbul',
    country: 'Türkiye',
    price: 48,
    currency: 'EUR',
    rating: '4.9',
    durationHours: 3,
    maxGuests: 8,
    tone: 'oklch(0.62 0.14 40)',
  },
  {
    slug: 'vltava-kiyisinda-fotograf-turu',
    title: 'Vltava Kıyısında Fotoğraf Turu',
    city: 'Prag',
    country: 'Çekya',
    price: 35,
    currency: 'EUR',
    rating: '4.8',
    durationHours: 2,
    maxGuests: 6,
    tone: 'oklch(0.55 0.10 230)',
  },
  {
    slug: 'ev-yapimi-pasta-atolyesi',
    title: 'Ev Yapımı Pasta Atölyesi',
    city: 'Lizbon',
    country: 'Portekiz',
    price: 62,
    currency: 'EUR',
    rating: '5.0',
    durationHours: 4,
    maxGuests: 4,
    tone: 'oklch(0.58 0.12 20)',
  },
]

/**
 * Küçük harfe çevirme dile bağlı: Türkçe'de `I → ı`, `İ → i`.
 * "İstanbul" araması varsayılan (invariant) küçültmeyle "i̇stanbul" olur ve
 * kendi şehrini bulamaz. Aynı tuzak `ticket-pdf.ts` içinde büyük harf yönünde
 * not edilmiş. Faz 8'de locale kullanıcıdan gelecek — şimdilik arayüz dili.
 */
const fold = (value: string) => value.toLocaleLowerCase('tr-TR').trim()

export type ExperienceQuery = {
  destination?: string
  guests?: number
  /** `parseSearchDate`'ten geçmiş `yyyy-aa-gg`. */
  date?: string
}

/** Kullanıcının verdiği ama sonucu daraltmayan filtre. */
export type UnappliedFilter = 'date'

export type ExperienceSearchResult = {
  items: Experience[]
  /**
   * Sonuca ETKİ ETMEYEN filtreler. Arayüz bunları görünür biçimde söylemek
   * zorunda — çağıranın yok saymaması için ayrı bir alan olarak dönüyor.
   */
  unapplied: UnappliedFilter[]
}

/**
 * KARAR — tarih filtresi neden sonucu daraltmıyor:
 *
 * Deneyimlerin müsaitliği (seans/takvim) veri modelinde HENÜZ YOK; `availability_slot`
 * Blok 7'de geliyor (docs/PLAN.md). Yani "bu tarihte var mı" sorusunun bugün doğru
 * cevabı üretilemiyor. Üç seçenek vardı:
 *
 * 1. Sessizce yok say — bugünkü davranış. Kullanıcı tarih seçiyor, sonuç
 *    değişmiyor ve arayüz hiçbir şey söylemiyor: sistem tarihi dikkate almış gibi
 *    görünüyor. Bu yalan, ve rezervasyona kadar fark edilmiyor.
 * 2. Uydurma bir müsaitlik üret (ör. slug'dan türetilmiş sahte takvim). Yalanı
 *    doğruya BENZETİR — en kötüsü. Blok 7 geldiğinde de "neden bu tarihte yok"
 *    diye bakılacak bir kaynak bırakmaz.
 * 3. Alanı bırak, sonucu daraltma, ve bunu kullanıcıya AÇIKÇA söyle.
 *
 * 3 seçildi. Alanı arayüzden kaldırmak da bir seçenekti; kaldırılmadı çünkü arama
 * çubuğunun şekli Blok 7 ile aynı kalacak ve tarih bilgisi bugün de anlamlı: özet
 * satırında görünüyor, URL'de taşınıyor, paylaşılan bağlantıda korunuyor.
 */
export function filterExperiences(
  all: readonly Experience[],
  { destination, guests, date }: ExperienceQuery,
): ExperienceSearchResult {
  let items = [...all]

  if (destination) {
    const needle = fold(destination)
    items = items.filter((item) =>
      [item.city, item.country, item.title].some((field) => fold(field).includes(needle)),
    )
  }

  if (guests && guests > 0) {
    items = items.filter((item) => item.maxGuests >= guests)
  }

  return { items, unapplied: date ? ['date'] : [] }
}

/** Arama çubuğundaki `<input type="date">` bu biçimi üretiyor. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sorgudaki tarihi doğrular. Geçersizse `undefined` — `?tarih=abc` ile gelen
 * serbest metin özet satırına yansımasın diye: URL'den gelen değeri doğrulamadan
 * ekrana basmak, kullanıcının kendi sayfasına metin yazdırabildiği bir yüzey açar.
 */
export function parseSearchDate(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined

  // `2026-02-31` desenden geçiyor ama takvimde yok; JS onu sessizce 3 Mart'a
  // kaydırır. Geri yazdırıp karşılaştırmak taşan günü yakalıyor.
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed.toISOString().slice(0, 10) === value ? value : undefined
}

/** Salt tarih; UTC'de biçimleniyor — yerel saate çevrilirse bir gün geri kayar. */
export function formatSearchDate(value: string, locale = 'tr-TR'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

/** Fiyat biçimi tek yerde: Faz 8'de locale ve görüntüleme para birimi buraya gelir. */
export function formatPrice(amount: number, currency: string, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
