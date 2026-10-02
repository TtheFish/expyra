import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'
import type {
  LoadedDictionary,
  MessageKey,
  PlainMessageKey,
  PluralMessageKey,
  PluralTemplates,
  Translate,
} from './dictionary'
import { interpolate, selectPluralCategory, type MessageValues } from './format'
import { isUiLocale, type UiLocale } from './locale'

/**
 * Sözlük yükleyici ve `t`.
 *
 * ### Dosya `server-only` — ve bu, "dil başına ayrı yükleme" kuralının en sert hâli
 *
 * docs/I18N.md §5: *"Çeviri dosyaları dil başına ayrı yüklenir; kullanıcının dili
 * build'e girmeyen diğer 20 dili indirmez."* Burada tarayıcı HİÇBİR dili
 * indirmiyor: sözlük istemci paketine giremiyor, `server-only` bunu derlemede
 * zorluyor (`import` denemesi build'i kırar). İstemci bileşenlerine yalnız
 * ihtiyaç duydukları BİRKAÇ dizge prop olarak geçiyor.
 *
 * `import()` dinamik: 20 dile çıkıldığında sunucu da yalnız istenen dilin
 * modülünü değerlendirir, hepsini belleğe almaz.
 *
 * ### Eksik çeviride ne olur: derleme kırılır, Türkçe'ye DÜŞÜLMEZ
 *
 * İçerik için fallback zinciri var (docs/I18N.md §2: `de-AT` → `de` →
 * `OriginalLanguage` → `en`) çünkü içeriği host yazıyor ve eksik olması normal.
 * Arayüz metnini BİZ yazıyoruz; eksik olması bir ürün durumu değil, bitmemiş bir
 * iş. Çalışma anında Türkçe'ye düşmek iki şeyi bozardı:
 *
 * 1. `<html lang="en">` içinde Türkçe cümle — ekran okuyucu Türkçe metni
 *    İngilizce fonetikle okur (WCAG 3.1.1, Seviye A). Bu blok tam olarak bunu
 *    düzeltmek için var.
 * 2. Eksik çeviri görünmez olur; "İngilizce hazır" sanılır ve öyle yayınlanır.
 *
 * Karar docs/I18N.md §6 ile aynı: *"yarım dil yayına alınmaz — eksik anahtar
 * derlemede zaten kırar."* Bir dili yayına almak `route-map.json`'a satır
 * eklemektir ve o satır, sözlüğü tamamlanana kadar derlemeyi kırar.
 */

const dictionaries: Record<UiLocale, () => Promise<LoadedDictionary>> = {
  tr: () => import('./messages/tr').then((module) => module.tr),
  en: () => import('./messages/en').then((module) => module.en),
  cs: () => import('./messages/cs').then((module) => module.cs),
  de: () => import('./messages/de').then((module) => module.de),
  bg: () => import('./messages/bg').then((module) => module.bg),
}

/**
 * Bilinmeyen dil segmenti **404**.
 *
 * `[lang]/layout.tsx` zaten aynı kontrolü yapıyor; burada tekrar edilmesinin
 * nedeni Next'in kendi rehberindeki gerekçe: sözlüğü olmayan bir dil için
 * çalışma anı hatası yerine 404 dönmek (`node_modules/next/dist/docs/01-app/
 * 02-guides/internationalization.md`). Kontrol yükleyicide olunca yeni bir
 * sayfa yazan kişi unutamaz.
 */
export function requireUiLocale(value: string): UiLocale {
  if (!isUiLocale(value)) {
    notFound()
  }
  return value
}

/**
 * `cache`: aynı istekte üst çubuk, sayfa ve alt bilgi ayrı ayrı `getTranslator`
 * çağırıyor — üçü de aynı sözlüğü ve aynı `t`'yi alsın (`features/auth/session.ts`
 * ile aynı kalıp).
 */
export const getTranslator = cache(async (locale: string): Promise<Translate> => {
  const uiLocale = requireUiLocale(locale)
  const dictionary = await dictionaries[uiLocale]()

  return ((key: MessageKey, values?: MessageValues) =>
    translate(uiLocale, dictionary, key, values)) as Translate
})

/**
 * Şablonu DOLDURMADAN verir.
 *
 * Tek meşru kullanımı: yer tutucusu İSTEMCİDE değişen metinler. Bugün bir tane
 * var — dil seçicinin tetikleyici etiketi (`language.trigger`): kullanıcı arayüz
 * çevirisi olmayan bir içerik dili seçtiğinde sayfa yenilenmiyor, dolayısıyla
 * etiketi sunucu dolduramıyor.
 *
 * İstemciye giden şey yine tek bir dizge, sözlük değil. `t` varken bunu
 * kullanmak, doldurmayı unutup ekranda `{dil}` göstermek demek — bu yüzden ayrı
 * bir ad taşıyor, `grep` ile bulunabilsin.
 */
export const getTemplate = cache(async (locale: string, key: PlainMessageKey): Promise<string> => {
  const uiLocale = requireUiLocale(locale)
  const dictionary = await dictionaries[uiLocale]()
  const entry = dictionary[key]

  // `PlainMessageKey` bunu garantiliyor; kaynak tablo değişirse sessiz "[object
  // Object]" yerine hata istiyoruz.
  if (typeof entry !== 'string') {
    throw new Error(`i18n: "${key}" düz metin değil, şablon olarak taşınamaz.`)
  }

  return entry
})

/**
 * Bir çoğul anahtarın BİÇİM TABLOSUNU verir — doldurmadan, seçmeden.
 *
 * `getTemplate`'in çoğul karşılığı ve aynı dar gerekçeyle var: yer tutucusu
 * istemcide değişen metinler. Bugün tek tüketicisi misafir seçicinin özet
 * satırı (`components/search/guest-picker.tsx`) — +/− düğmeleri sayfayı
 * yenilemediği için "2 yetişkin"i sunucu yazamıyor ve İngilizce'de
 * "1 adult"/"2 adults" ayrımı çekim gerektiriyor.
 *
 * Tarayıcıya inen şey yine sözlük değil, tek bir anahtarın birkaç dizgesi.
 * Biçimi istemcide `formatPlural` seçiyor (`format.ts`, `Intl.PluralRules`).
 * Yeni bir dil `few`/`many` getirdiğinde tablo kendiliğinden o biçimleri de
 * taşır — çağrı yerinde biçim adı yazılı olmadığı için burada değişecek bir
 * şey yok.
 */
export const getPluralTemplates = cache(
  async (locale: string, key: PluralMessageKey): Promise<PluralTemplates> => {
    const uiLocale = requireUiLocale(locale)
    const dictionary = await dictionaries[uiLocale]()
    const entry = dictionary[key]

    // `PluralMessageKey` bunu garantiliyor; kaynak tablo değişirse sessizce
    // tek biçimli bir tablo döndürmek yerine hata istiyoruz.
    if (typeof entry === 'string') {
      throw new Error(`i18n: "${key}" çoğul bir metin değil, biçim tablosu yok.`)
    }

    return entry
  },
)

function translate(
  locale: UiLocale,
  dictionary: LoadedDictionary,
  key: MessageKey,
  values?: MessageValues,
): string {
  const entry = dictionary[key]

  if (typeof entry === 'string') {
    return interpolate(locale, entry, values)
  }

  const count = values?.n

  // Tipler bu dala izin vermiyor (`TranslateArgs` çoğul anahtarda `n: number`
  // istiyor). Yine de duruyor: sessizce "other" biçimine düşmek, yanlış çekimi
  // görünmez kılardı.
  if (typeof count !== 'number') {
    throw new Error(`i18n: "${key}" çoğul bir metin, sayısal "n" değeri gerekiyor.`)
  }

  const category = selectPluralCategory(locale, count)
  const template = entry[category]

  // Buraya ancak `locale.ts`'teki `pluralCategories` tablosu ICU ile
  // uyuşmuyorsa gelinir — yani yeni bir dil eklenirken tablo eksik yazılmışsa.
  // Gürültülü patlıyor: yanlış çekim ekranda kimsenin gözüne çarpmaz, hata çarpar.
  if (template === undefined) {
    throw new Error(
      `i18n: "${key}" için "${locale}" dilinde "${category}" biçimi yok. ` +
        'locale.ts içindeki pluralCategories tablosu ICU ile uyuşmuyor.',
    )
  }

  return interpolate(locale, template, values)
}
