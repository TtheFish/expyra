import routeMap from '@/lib/route-map.json'

/**
 * Arayüz dilinin kimliği.
 *
 * **Tek kaynak `route-map.json`.** Arayüz dili = URL'e girebilen dil
 * (docs/I18N.md §5.2: "Slug yalnızca arayüz çevirisi olan diller için"). O tabloya
 * yeni bir dil eklendiği an bu birleşim genişler ve sözlük tipi o dilin çevirisini
 * İSTER — yani "dili açtım ama çeviriyi yazmadım" durumu derlemede kırılır
 * (docs/I18N.md §6: "yarım dil yayına alınmaz").
 *
 * `lib/routes.ts` de aynı dosyayı okuyor ama farklı bir soruya cevap veriyor:
 * orada soru "bu segment URL'de görünebilir mi" ve dönüş tipi `string`. Burada
 * soru "hangi sözlüğü yükleyeceğim" ve cevabın DAR bir birleşim olması şart —
 * `string` olsaydı `dictionaries[locale]` tipi kontrol edilemezdi. Aynı kaynak,
 * ayrı tip.
 */
export type UiLocale = keyof typeof routeMap.localized

const uiLocales = Object.keys(routeMap.localized) as UiLocale[]

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === 'string' && (uiLocales as string[]).includes(value)
}

/**
 * Varsayılan dil `route-map.json`'dan geliyor ama JSON'dan okunan değer `string`;
 * daraltmayı burada yapıp bozuk tabloyu SESSİZ geçmiyoruz. Bu hata ancak
 * `defaultLanguage` `localized` tablosunda yokken oluşur — o durumda site zaten
 * her yolda 404 verirdi, gürültülü patlaması daha dürüst.
 */
function requireConfiguredDefault(): UiLocale {
  const value = routeMap.defaultLanguage
  if (!isUiLocale(value)) {
    throw new Error(
      `route-map.json bozuk: defaultLanguage "${value}" localized tablosunda yok.`,
    )
  }
  return value
}

export const defaultUiLocale: UiLocale = requireConfiguredDefault()

/**
 * Çoğul kategorileri — CLDR'nin o dil için tanıdığı biçimler.
 *
 * Elle yazılıyor çünkü tip sistemine bir BİRLEŞİM lazım; `Intl.PluralRules`
 * bunu yalnız çalışma anında verebiliyor. Tablo ICU ile uyuşmazsa çeviri
 * arandığında hata fırlatılıyor (bkz. `translator.ts`) — sessizce yanlış çekim
 * basmıyoruz.
 *
 * Doğrulaması tek satır:
 * `new Intl.PluralRules('tr').resolvedOptions().pluralCategories`
 *
 * Türkçe'de sayıdan sonra isim çekimlenmez ("1 deneyim", "3 deneyim") ama CLDR
 * yine de `one`/`other` ayrımını tanıyor: ileride "Bir deneyim" gibi bir yazım
 * istenirse şema değişmeden yazılabilsin diye ikisi de isteniyor.
 *
 * `Record<UiLocale, …>` bilinçli: yeni bir arayüz dili eklendiğinde burası da
 * derlemede kırılır, unutulamaz.
 */
export const pluralCategories = {
  tr: ['one', 'other'],
  en: ['one', 'other'],
  // Çekçe dört biçim: one (1), few (2-4), many (ondalık), other (5+).
  cs: ['one', 'few', 'many', 'other'],
  de: ['one', 'other'],
} as const satisfies Record<UiLocale, readonly Intl.LDMLPluralRule[]>

export type PluralCategoryOf<L extends UiLocale> = (typeof pluralCategories)[L][number]

/**
 * Sunucu eylemlerinin cevabını hangi dilde yazacağını taşıyan gizli form alanı.
 *
 * Neden forma yazılıyor: sunucu eylemi hangi sayfadan çağrıldığını bilmiyor —
 * `usePathname` istemcide, `params` yalnız render sırasında var. Dil çerezi de
 * cevap değil: `expyra_lang` İÇERİK dili tercihini tutuyor ve 49 değerden biri
 * olabilir (`ja` seçen kullanıcı hâlâ `/tr` arayüzünde geziyor).
 *
 * İstemciden gelmesi güvenlik sorunu değil: değer `uiLocaleOf` ile KAPALI bir
 * kümeye daraltılıyor, en kötü ihtimalle kullanıcı hata mesajını yanlış dilde
 * görür. Kimlik hâlâ istemciden alınmıyor (CLAUDE.md #3) — token'daki `sub`
 * neyse o.
 *
 * Ad `dil` DEĞİL: hesap formunda `dil` alanı zaten var ve o kullanıcının TERCİH
 * ETTİĞİ içerik dili. İki farklı kavram aynı alan adını paylaşırsa biri
 * diğerinin üstüne yazar.
 */
export const UI_LANGUAGE_FIELD = 'arayuz-dili'

/** Bilinmeyen değer varsayılana düşer; `notFound()` DEĞİL — burada bir sayfa yok, bir cevap var. */
export function uiLocaleOf(value: unknown): UiLocale {
  return isUiLocale(value) ? value : defaultUiLocale
}
