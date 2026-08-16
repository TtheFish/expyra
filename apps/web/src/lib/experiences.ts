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

export function filterExperiences(
  all: readonly Experience[],
  { destination, guests }: { destination?: string; guests?: number },
): Experience[] {
  let result = [...all]

  if (destination) {
    const needle = fold(destination)
    result = result.filter((item) =>
      [item.city, item.country, item.title].some((field) => fold(field).includes(needle)),
    )
  }

  if (guests && guests > 0) {
    result = result.filter((item) => item.maxGuests >= guests)
  }

  return result
}

/** Fiyat biçimi tek yerde: Faz 8'de locale ve görüntüleme para birimi buraya gelir. */
export function formatPrice(amount: number, currency: string, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
