/**
 * PROTOTİP VERİ — Blok 5'te gerçek `Experience` tablosundan gelecek ve bu dosya SİLİNECEK.
 * Ana sayfa ile /kesfet aynı listeyi kullansın diye buraya taşındı.
 */

export type Experience = {
  slug: string
  title: string
  /**
   * Şehrin doğal anahtarı: `<ülke kodu>-<slug>`, kayıt defterindeki satırla birebir
   * (docs/cities.json). Arama artık BUNUNLA eşleşiyor, şehir adının metniyle değil.
   *
   * Neden uuid değil: `city.id` seed sırasında üretiliyor ve yeniden üretilmiyor
   * (`City.cs`), yani her veritabanında farklı. Buraya yazılacak bir uuid, seed'i
   * bir kez daha koşan ilk makinede sessizce yanlış şehri gösterirdi.
   */
  cityKey: string
  /** Gösterim adı — prototip veri Türkçe; Blok 5'te `experience_translation`'dan gelecek. */
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
    cityKey: 'tr-istanbul',
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
    cityKey: 'cz-prague',
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
    cityKey: 'pt-lisbon',
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

export type ExperienceQuery = {
  /**
   * Kayıt defterinden ÇÖZÜLMÜŞ şehrin anahtarı. Kullanıcının yazdığı metin buraya
   * hiç ulaşmıyor: çözme işi `features/places/api.ts:resolveCity`'de, çözülemeyen
   * değer ise ekranda söyleniyor (PLAN Blok 4, kabul kriteri 3).
   *
   * Eskiden burada `destination: string` vardı ve `fold(...)` ile şehir/ülke/başlık
   * içinde substring aranıyordu. O eşleşme "praha" ile "Prag"ı hiçbir zaman
   * bulamıyordu ve "a" araması her şeyi döndürüyordu — bu bloğun ortadan
   * kaldırdığı şey tam olarak o.
   */
  cityKey?: string
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
 * 1. Sessizce yok say — kullanıcı tarih seçiyor, sonuç değişmiyor ve arayüz hiçbir
 *    şey söylemiyor: sistem tarihi dikkate almış gibi görünüyor. Bu yalan, ve
 *    rezervasyona kadar fark edilmiyor.
 * 2. Uydurma bir müsaitlik üret (ör. slug'dan türetilmiş sahte takvim). Yalanı
 *    doğruya BENZETİR — en kötüsü.
 * 3. Alanı bırak, sonucu daraltma, ve bunu kullanıcıya AÇIKÇA söyle.
 *
 * 3 seçildi. Şehir alanında ise aynı sorunun cevabı FARKLI olabildi: orada eksik
 * olan veri artık var (kayıt defteri), o yüzden şehir gerçekten filtreliyor.
 */
export function filterExperiences(
  all: readonly Experience[],
  { cityKey, guests, date }: ExperienceQuery,
): ExperienceSearchResult {
  let items = [...all]

  if (cityKey) {
    // Karşılaştırma tam eşitlik: anahtarın iki yakası da (URL ve bu tablo)
    // kayıt defterindeki satırdan geliyor, "yaklaşık" eşleşmeye yer yok.
    items = items.filter((item) => item.cityKey === cityKey)
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

/**
 * Salt tarih; UTC'de biçimleniyor — yerel saate çevrilirse bir gün geri kayar.
 *
 * Locale ARTIK VARSAYILANSIZ ve ilk parametre (`features/i18n/format.ts` ile
 * aynı imza kuralı). Varsayılanı `'tr-TR'` bırakmak, `/en/explore` sayfasında
 * özet satırının "1 Eylül 2026" yazmasıydı ve bunu kimse çeviri hatası saymaz.
 * İmzada zorunlu olunca unutmak derleme hatası oluyor.
 *
 * `format.ts`'teki `formatDateTime` kullanılmıyor çünkü buradaki `timeZone:
 * 'UTC'` seçeneği isteğe bağlı bir süsleme değil, doğruluğun şartı.
 */
export function formatSearchDate(locale: string, value: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}
