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
 * Para. Bugün ana birim (`48` = 48 EUR) alıyor çünkü prototip veri böyle;
 * Blok 7'de tutar minör birime (`Money(AmountMinor, CurrencyCode)`) dönecek ve
 * o gün burada `minimumFractionDigits` yerine `MinorUnits` kullanılacak
 * (docs/PLAN.md Blok 4 — JPY 0, KWD 3 hane).
 *
 * Sembolün yeri dile bağlı: "€48.00" (en) ve "48,00 €" (tr) aynı tutar.
 */
export function formatMoney(locale: string, amount: number, currency: string): string {
  return numberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDateTime(
  locale: string,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value))
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
