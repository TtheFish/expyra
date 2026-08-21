import type { PluralCategoryOf, UiLocale } from './locale'
import type { tr } from './messages/tr'

/**
 * Sözlüğün TİP tarafı. Buradaki tek amaç şu cümleyi derleme hatasına çevirmek:
 * "anahtar sözlükte yok" / "çeviri eksik" / "çeviride yer tutucu kaybolmuş".
 *
 * docs/I18N.md §5: *"Eksik anahtar derlemede hata olmalı, çalışma anında sessiz
 * boş metin değil."* Çalışma anında `?? key` gibi bir kaçış valfi YOK — olsaydı
 * eksik çeviri ekranda `host.invite.cta` yazan bir düğme olarak çıkar ve
 * kimsenin dikkatini çekmezdi.
 *
 * Bu dosya `server-only` DEĞİL: yalnız tip taşıyor, çalışma anı yükü sıfır.
 * Metin taşıyan dosyalar (`messages/*.ts`) ve onları yükleyen `translator.ts`
 * server-only.
 */

/** Kaynak tablonun tipi; anahtar kümesinin ve yer tutucuların TANIMI. */
type Source = typeof tr

export type MessageKey = keyof Source

/** Kaynak sözlüğün dili — o da yayınlanan bir arayüz dili olmak zorunda. */
export type SourceLocale = 'tr'

/** `T` `true` değilse derleme kırılır. Çalışma anı karşılığı yok. */
export type Assert<T extends true> = T

export type SourceLocaleIsRoutable = Assert<SourceLocale extends UiLocale ? true : false>

/**
 * Çoğul metin: dilin CLDR biçimleri (docs/I18N.md §5, `locale.ts`).
 * Türkçe'de `one` ve `other` aynı yazılır, İngilizce'de yazılmaz — biçim
 * seçimi çalışma anında `Intl.PluralRules` ile yapılıyor.
 */
export type PluralForms<L extends UiLocale> = Readonly<Record<PluralCategoryOf<L>, string>>

/**
 * Bir dilin tam sözlüğü.
 *
 * Anahtar kümesi kaynaktan geliyor; **eksik anahtar** ve **fazla anahtar** ikisi
 * de hata. Kaynakta çoğul olan bir anahtar burada düz metin olarak yazılamaz:
 * "3 experiences" cümlesini tek biçimle geçmek, hatayı çeviri dosyasına gömüp
 * görünmez kılardı.
 */
export type Dictionary<L extends UiLocale> = {
  readonly [K in MessageKey]: Source[K] extends string ? string : PluralForms<L>
}

/**
 * Çalışma anında elde tutulan biçim. `Dictionary<L>`'i dile göre daraltmak
 * çağıran tarafta bir işe yaramıyor — `t` zaten anahtarı kaynaktan tanıyor,
 * biçimi ise `Intl.PluralRules` seçiyor.
 */
export type LoadedMessage = string | Readonly<Partial<Record<Intl.LDMLPluralRule, string>>>
export type LoadedDictionary = Readonly<Record<MessageKey, LoadedMessage>>

// --- Yer tutucu tipleri ------------------------------------------------------

/** `'{n} saniye kaldı'` → `'n'`. Şablon literal tipiyle metnin içi okunuyor. */
export type PlaceholdersIn<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholdersIn<Rest>
  : never

/** Çoğul anahtarlarda kural kaynağın `other` biçimidir; düz metinde metnin kendisi. */
type SourceText<K extends MessageKey> = Source[K] extends string
  ? Source[K]
  : Source[K] extends { readonly other: infer Other extends string }
    ? Other
    : never

type NamesOf<K extends MessageKey> = PlaceholdersIn<SourceText<K>>

/**
 * `t()` çağrısının ikinci parametresi.
 *
 * - Yer tutucusu olmayan metin: ikinci parametre YOK (fazlası hata).
 * - Yer tutuculu metin: her ad zorunlu, eksiği ve fazlası hata.
 * - Çoğul metin: `n` zorunlu ve `number` — biçimi seçen değer o.
 *
 * Değer `number` olabilir; biçimlendirme `interpolate` içinde locale'e göre
 * yapılıyor, çağıranın `formatNumber` yazması gerekmiyor (bkz. `format.ts`).
 */
export type TranslateArgs<K extends MessageKey> = Source[K] extends string
  ? [NamesOf<K>] extends [never]
    ? []
    : [values: Readonly<Record<NamesOf<K>, string | number>>]
  : [
      values: Readonly<{ n: number }> &
        Readonly<Record<Exclude<NamesOf<K>, 'n'>, string | number>>,
    ]

export interface Translate {
  <K extends MessageKey>(key: K, ...values: TranslateArgs<K>): string
}

/**
 * Çoğul OLMAYAN anahtarlar. `getTemplate` yalnız bunları kabul ediyor: çoğul bir
 * metnin "şablonu" tek bir dizge değil, biçim tablosu — istemciye taşınamaz.
 */
export type PlainMessageKey = {
  [K in MessageKey]: Source[K] extends string ? K : never
}[MessageKey]

/**
 * Çoğul anahtarlar — `PlainMessageKey`'in tam tersi.
 *
 * `getPluralTemplates` yalnız bunları kabul ediyor. Var olma nedeni tek bir
 * ekran: misafir seçicinin +/− düğmeleri sayfayı yenilemiyor, yani "2 yetişkin"
 * metnini sunucu dolduramıyor ve çekimi istemci seçmek zorunda.
 */
export type PluralMessageKey = Exclude<MessageKey, PlainMessageKey>

/**
 * Bir çoğul anahtarın biçim tablosu, istemciye taşınabilir hâlde.
 *
 * `Partial` bilinçli: hangi biçimlerin dolu olduğunu DİL belirliyor (`tr`/`en`
 * için `one`+`other`, Rusça geldiğinde `few`+`many` de). Tabloyu dilin CLDR
 * kümesiyle doldurmayı `Dictionary<L>` zaten derlemede zorluyor; burada tipin
 * dili bilmesine gerek yok, biçimi `Intl.PluralRules` seçiyor.
 */
export type PluralTemplates = Readonly<Partial<Record<Intl.LDMLPluralRule, string>>>

/**
 * Ne çoğul ne de yer tutuculu anahtarlar: `t(key)` tek parametreyle çağrılabilen
 * küme. Anahtarı değişken olarak taşıyan yerler (ör. bir hata eşlemesinin dönüş
 * tipi) bunu kullanır — `MessageKey` kullanılırsa `t(key)` çağrısı, kümedeki
 * yer tutuculu anahtarlar yüzünden derlenmez.
 */
export type SimpleMessageKey = {
  [K in MessageKey]: Source[K] extends string
    ? [PlaceholdersIn<Source[K]>] extends [never]
      ? K
      : never
    : never
}[MessageKey]

// --- Çevirinin yer tutucularını kaynakla karşılaştırma -----------------------

/**
 * Anahtar kümesi `Dictionary<L>` ile korunuyor ama metnin İÇİ korunmuyordu:
 * `'{n} deneyim'` karşısına `'experiences'` yazmak tip olarak `string` ve
 * sessizce geçerdi — ekranda sayısı olmayan bir cümle çıkardı. Aşağıdaki
 * tipler bunu da derlemede yakalıyor.
 *
 * `n` özel: çoğulu seçen değer her zaman var ama her biçimde GÖRÜNMEK zorunda
 * değil ("bir kişi" / "{n} kişi" ikisi de meşru).
 */
type SameNames<A extends string, B extends string> = [Exclude<A, B>] extends [never]
  ? [Exclude<B, A>] extends [never]
    ? true
    : false
  : false

type VariantsOf<V> = V extends string
  ? V
  : V extends Readonly<Record<string, string>>
    ? V[keyof V]
    : never

type PluralVariantOk<Required extends string, V> = V extends string
  ? SameNames<Required, Exclude<PlaceholdersIn<V>, 'n'>>
  : false

type KeyOk<K extends MessageKey, V> = Source[K] extends string
  ? V extends string
    ? SameNames<PlaceholdersIn<Source[K]>, PlaceholdersIn<V>>
    : false
  : // Birleşim üzerinden dağılıyor: biçimlerden BİRİ bile uymazsa sonuç `true` olmaz.
    [PluralVariantOk<Exclude<NamesOf<K>, 'n'>, VariantsOf<V>>] extends [true]
    ? true
    : false

/**
 * Yer tutucusu kaynakla uyuşmayan anahtarlar. Hepsi doğruysa `never`.
 *
 * `Assert<…>` ile birlikte kullanılınca derleme hatası anahtarın ADINI yazar:
 * *Type '"host.listings.summary"' does not satisfy the constraint 'true'.*
 */
export type MismatchedKeys<D extends Readonly<Record<MessageKey, unknown>>> = {
  [K in MessageKey]: KeyOk<K, D[K]> extends true ? never : K
}[MessageKey]

/**
 * Çeviri dosyalarının sonuna konan kontrol; `Assert` ile birlikte kullanılır:
 * `type X = Assert<PlaceholdersMatchSource<typeof en>>`.
 *
 * `Assert` burada UYGULANMIYOR çünkü `D` henüz somut değilken TypeScript
 * kısıtı doğrulayamaz ve tanımın kendisi hata verir; çağrı yerinde `D` bilindiği
 * için orada çözülüyor.
 */
export type PlaceholdersMatchSource<D extends Readonly<Record<MessageKey, unknown>>> =
  [MismatchedKeys<D>] extends [never] ? true : MismatchedKeys<D>

/**
 * Kaynak kendi kendini doğrulayamaz (ölçüt o) ama ŞEKLİ doğrulanabilir: çoğul
 * yazılan her anahtar Türkçe'nin tüm CLDR biçimlerini taşımalı, yoksa `t()`
 * çalışma anında o biçimi arar ve bulamaz.
 */
export type SourceIsWellFormed = Assert<Source extends Dictionary<SourceLocale> ? true : false>
