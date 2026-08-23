/**
 * `Intl` sarmalayıcıları — hepsi locale'i İLK PARAMETRE olarak alıyor.
 *
 * Sabit `'tr-TR'` bırakmanın bedeli görünmez: sayfa İngilizce açılır, tarih
 * "21 Ağustos" yazar, fiyat "48,00 €" olur ve kimse bunu bir çeviri hatası
 * saymaz. Locale'i imzaya koymak, unutmayı derleme hatasına çeviriyor.
 *
 * Bu dosya İSTEMCİ GÜVENLİ (`server-only` yok): geri sayım gibi saniyede bir
 * değişen sayılar istemcide biçimlenmek zorunda. Taşıdığı tek şey locale
 * dizgesi — sözlük değil.
 */

/**
 * `Intl.*` kurucuları pahalı; her çağrıda yenisini yaratmak bir listede fark
 * ediliyor. Anahtar kümesi kapalı (arayüz dili sayısı × para birimi sayısı),
 * yani bu önbellek sınırsız büyüyemez.
 */
const numberFormats = new Map<string, Intl.NumberFormat>()
const pluralRules = new Map<string, Intl.PluralRules>()

function numberFormat(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${options ? JSON.stringify(options) : ''}`
  let formatter = numberFormats.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, formatter)
  }
  return formatter
}

/**
 * Sayı biçimi daima `Intl` üzerinden: Arapça arayüzde "٥٨" beklenir, elle
 * `String(n)` yazan her yer o dilde yanlış görünür. Ondalık ayracı da dile
 * bağlı — "1.234,5" (tr) ile "1,234.5" (en) aynı sayı.
 */
export function formatNumber(locale: string, value: number): string {
  return numberFormat(locale).format(value)
}

/**
 * Para — <b>ANA birim</b> (`48` = 48 EUR) ve küsuratı atıyor.
 *
 * Yalnız PROTOTİP veri için: bilet ekranı ve PDF'i (`DEMO_TICKETS`) hâlâ bu
 * şekli taşıyor. **Yeni kodda kullanma** — API'nin gönderdiği her tutar minör
 * birim tam sayısı ve buraya geçirilirse yüz kat büyük görünür. Doğrusu
 * <see cref="formatMinorMoney"/>.
 *
 * Prototip veri gerçek rezervasyona döndüğünde (Blok 9) bu fonksiyon silinecek.
 */
export function formatMoney(locale: string, amount: number, currency: string): string {
  return numberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Para — <b>MİNÖR birim tam sayısı</b>. API'nin konuştuğu tek şekil bu
 * (CLAUDE.md #7): `4500` + `EUR` + `minorUnits: 2` → "45,00 €".
 *
 * <b>Üs parametre, sabit DEĞİL.</b> ISO 4217 üssü para birimine göre değişiyor
 * — JPY 0, KWD 3, çoğunluk 2 — ve web'de bir tablo tutulmuyor: kayıt defteri
 * sunucuda (`currency.minor_units`) ve yanıt onu `chargeMinorUnits` /
 * `display.minorUnits` olarak zaten taşıyor. Burada bir kopya tutmak, iki
 * kaynağın ayrışacağı ve JPY'nin yüz kat küçük görüneceği gün demekti.
 *
 * Küsurat ATILMIYOR (`formatMoney`'nin aksine): 45,00 € ile 45,50 € arasındaki
 * fark ödenecek paranın kendisi. `minimumFractionDigits` ile üs eşitleniyor,
 * yani JPY'de hiç ondalık, KWD'de üç hane çıkıyor.
 */
export function formatMinorMoney(
  locale: string,
  amountMinor: number,
  currency: string,
  minorUnits: number,
): string {
  return numberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  }).format(amountMinor / 10 ** minorUnits)
}

/**
 * <b>Kesin bir ANI</b> biçimler (ISO 8601, saat dilimi ekli). Duvar saati
 * dizgeleri için DEĞİL — onlar için <see cref="formatWallClock"/>.
 */
export function formatDateTime(
  locale: string,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value))
}

/**
 * <b>Duvar saati</b> biçimler: `2026-10-13T14:00` gibi saat dilimi EKİ OLMAYAN
 * bir dizgeyi, deneyimin saat diliminde yazıldığı gibi gösterir.
 *
 * <b>`new Date(value)` KULLANILMIYOR</b> ve bu farkın bedeli görünmez: o çağrı
 * eki olmayan dizgeyi TARAYICININ saat diliminde yorumlar, yani Prag'daki
 * 14:00'lük bir tur İstanbul'daki misafire 14:00 diye gösterilir ama altındaki
 * `Date` 12:00 UTC'yi tutar; sonraki her hesap bir saat kayar.
 *
 * Burada dizge AYRIŞTIRILIYOR, dönüştürülmüyor: sunucu zaten deneyimin
 * saat dilimindeki duvar saatini gönderdi ve gösterilecek şey tam olarak o.
 * Yalnız BİÇİM locale'e göre değişiyor ("13 Eki 14:00" / "Oct 13, 2:00 PM").
 *
 * @param wallClock `YYYY-MM-DDTHH:mm` — sonda `Z` ya da offset OLMAMALI.
 */
export function formatWallClock(
  locale: string,
  wallClock: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wallClock)

  if (!match) {
    // Sessizce `new Date()`e düşmüyor: o dal tam olarak bu fonksiyonun
    // engellemek için var olduğu saat kaymasını geri getirirdi (CLAUDE.md #1).
    throw new Error(
      `formatWallClock: "${wallClock}" beklenen biçimde değil (YYYY-MM-DDTHH:mm). ` +
        'Saat dilimi ekli bir damga geldiyse formatDateTime kullanılmalı.',
    )
  }

  const [, year, month, day, hour, minute] = match

  // UTC olarak kuruluyor ve `timeZone: 'UTC'` ile okunuyor: iki taraf da aynı
  // varsayımda olduğu için kaydırma sıfır. Sayılar ne yazıldıysa o çıkıyor.
  const asUtc = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)),
  )

  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(asUtc)
}

/**
 * Büyük harfe çevirme DİLE BAĞLI: Türkçe'de "i" → "İ", invariant kuralda "I".
 * Bilet üzerindeki büyük harfli başlıklar bu yüzden `toUpperCase()` ile
 * yazılamaz (docs/PLAN.md Blok 3, kabul kriteri 4).
 */
export function upperCase(locale: string, text: string): string {
  return text.toLocaleUpperCase(locale)
}

export type MessageValues = Readonly<Record<string, string | number>>

/**
 * `{yerTutucu}` alanlarını doldurur.
 *
 * **Sayılar burada biçimleniyor.** Çağıran `formatNumber` yazmak zorunda
 * kalsaydı, unuttuğu her yer Arapça/Hintçe arayüzde ASCII rakam basardı ve bu
 * hiçbir testte görünmezdi. Değer `number` ise locale'e göre biçimlenir.
 *
 * Karşılığı olmayan yer tutucu OLDUĞU GİBİ bırakılır — sessizce boş string
 * basmak eksik çeviriyi görünmez yapar. Tipler bu dalı zaten ulaşılamaz kılıyor
 * (bkz. `dictionary.ts`); son savunma hattı olarak duruyor.
 */
export function interpolate(locale: string, template: string, values?: MessageValues): string {
  if (!values) return template

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name]
    if (value === undefined) return match
    return typeof value === 'number' ? formatNumber(locale, value) : value
  })
}

/**
 * İSTEMCİDE çoğul metin: biçimi seçer ve doldurur.
 *
 * `translate()`in çoğul dalının aynısı, ama sözlük yerine tek bir anahtarın
 * biçim tablosuyla çalışıyor (`getPluralTemplates` ile sunucudan prop olarak
 * inen tablo). Sunucuda `t()` varken bunu kullanmak yanlış — tek meşru yeri,
 * sayının kullanıcı elinde değiştiği bileşenler.
 *
 * Biçim eksikse SESSİZCE `other`'a düşmüyor: yanlış çekim ekranda kimsenin
 * gözüne çarpmaz, hata çarpar. Zaten `Dictionary<L>` bu durumu derlemede
 * imkânsız kılıyor; buradaki kontrol yalnızca son savunma hattı.
 */
export function formatPlural(
  locale: string,
  templates: Readonly<Partial<Record<Intl.LDMLPluralRule, string>>>,
  count: number,
  values?: MessageValues,
): string {
  const category = selectPluralCategory(locale, count)
  const template = templates[category]

  if (template === undefined) {
    throw new Error(
      `i18n: "${locale}" dilinde "${category}" biçimi yok. ` +
        'locale.ts içindeki pluralCategories tablosu ICU ile uyuşmuyor.',
    )
  }

  return interpolate(locale, template, { n: count, ...values })
}

/**
 * Çoğul kategorisi. `pluralCategories` tablosu ICU ile uyuşmuyorsa çağıran
 * bunu fark eder (sözlükte o biçim yoktur ve hata fırlatılır).
 */
export function selectPluralCategory(locale: string, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }
  return rules.select(count)
}
