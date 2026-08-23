/**
 * Deneyim formlarının alan adları.
 *
 * **Neden ayrı bir dosya:** bu sabitleri iki taraf da okuyor — inputları çizen
 * istemci bileşenleri (`experience-forms.tsx`) ve `FormData`'yı ayrıştıran sunucu
 * eylemleri (`experience-actions.ts`). Eylem dosyası `'use server'` ve o dosyadan
 * yalnız `async` fonksiyon export edilebiliyor; sabitleri oraya koymak derlemeyi
 * kırardı. İstemci dosyasına koymak da olmazdı: `'use client'` modülünden
 * sunucuya dönen şey değerin kendisi değil, istemci referansı.
 *
 * Adlar Türkçe: dil segmenti taşımayan iç yollar ve form alanları bu repoda
 * Türkçe adlandırılıyor (`donus`, `nerede`, `arayuz-dili` ile aynı aile).
 * Kullanıcıya görünmüyorlar, çevrilmiyorlar.
 */

/** Düzenlenen ilanın kimliği — KAYNAK kimliği, kullanıcı kimliği değil. */
export const EXPERIENCE_ID_FIELD = 'deneyim'

/**
 * Formun hangi alan kümesine sahip olduğu. `PATCH` gerçek bir delta olduğu için
 * bu işaret şart: hiç işaretlenmemiş bir onay kutusu grubu ile "bu formda o alan
 * yok" tarayıcıda aynı görünüyor, ve ikisi sunucuda taban tabana zıt anlama
 * geliyor (boşalt / dokunma).
 */
export const SECTION_FIELD = 'bolum'

export type ExperienceSection = 'temel' | 'sehir' | 'kategori' | 'listeler'

/**
 * İlan METNİNİN dili. `UI_LANGUAGE_FIELD` (`arayuz-dili`) ile karıştırılmamalı:
 * o, eylemin cevabını hangi dilde yazacağını söylüyor. Hesap formundaki `dil`
 * alanıyla da karıştırılmamalı: o, kullanıcının tercih ettiği içerik dili.
 * Üç kavram, üç ad (docs/I18N.md §1 ve §3).
 */
export const TEXT_LANGUAGE_FIELD = 'metin-dili'

export const TITLE_FIELD = 'baslik'
export const DESCRIPTION_FIELD = 'aciklama'
export const DURATION_FIELD = 'sure'
export const CAPACITY_FIELD = 'kapasite'
export const CATEGORY_FIELD = 'kategori'
/** Çoklu: `formData.getAll` ile okunuyor. */
export const SPOKEN_LANGUAGE_FIELD = 'konusulan-dil'
export const TAGS_FIELD = 'etiketler'

/**
 * Şehir seçicinin gizli alanının adı.
 *
 * `components/search/city-picker.tsx` bunu SABİT yazıyor (`name="nerede"`) çünkü
 * bileşen arama çubuğu için doğdu. Host formunda yeniden kullanmanın bedeli bu
 * ad — ve burada tanımlı olması, seçiciyi bir gün prop alacak hâle getirmenin tek
 * dosyalık bir iş olduğunu görünür tutuyor.
 *
 * Değer bir uuid DEĞİL, doğal anahtar (`cz-prague`); uuid'e çevirme işi sunucuda
 * (`resolveCity`).
 */
export const CITY_FIELD = 'nerede'

/** Çeviri sekmelerinin URL parametresi: hangi dilin metni düzenleniyor. */
export const TEXT_LANGUAGE_PARAM = 'metin-dili'

// ---------------------------------------------------------------------------
// Fiyat (PLAN Blok 7)
// ---------------------------------------------------------------------------

export const CURRENCY_FIELD = 'para-birimi'

/** Kademe tutarları — ANA birim, ondalıklı (`45.50`). Minöre çevrim sunucuda. */
export const ADULT_PRICE_FIELD = 'yetiskin-fiyat'
export const CHILD_PRICE_FIELD = 'cocuk-fiyat'
export const INFANT_PRICE_FIELD = 'bebek-fiyat'

/**
 * Ana birimdeki ondalık metni MİNÖR birim tam sayısına çevirir — <b>kayan nokta
 * kullanmadan</b>.
 *
 * `Number('45.55') * 100` bu işi yapamaz: sonuç 4554.999999999999 çıkar ve
 * `Math.round` onu kurtarsa bile 3 haneli para birimlerinde (KWD) hata büyür.
 * Burada dizge ikiye bölünüp kesir kısmı ÜSSE göre dolduruluyor/kontrol ediliyor;
 * her adım tam sayı.
 *
 * <b>Fazla hane sessizce yuvarlanmıyor.</b> EUR için "45.555" yazan host'a
 * "45,56 kaydedildi" demek, onun yazmadığı bir fiyatı onaylatmak olurdu — ve o
 * fark her satışta tekrarlanırdı. `null` dönüyor, çağıran hata gösteriyor
 * (CLAUDE.md #1).
 *
 * @param raw Kullanıcının yazdığı metin. `<input type="number">` locale'den
 *   bağımsız olarak nokta üretiyor; virgül yine de kabul ediliyor çünkü
 *   yapıştırılan metin ondan gelebiliyor.
 * @param minorUnits ISO 4217 üssü — kayıt defterinden, sabit değil.
 * @returns Minör birim tam sayısı; girdi geçersizse `null`.
 */
export function parseMinorAmount(raw: string, minorUnits: number): number | null {
  const text = raw.trim().replace(',', '.')

  if (!/^\d{1,15}(\.\d{0,6})?$/.test(text)) return null

  const [whole, fraction = ''] = text.split('.')

  // Üsten FAZLA hane yazılmışsa reddediliyor — ama yalnız sıfır olmayan haneler
  // sayılıyor: "45.00" EUR'da geçerli, "45.000" da (ikisi de 45,00).
  if (fraction.length > minorUnits && /[^0]/.test(fraction.slice(minorUnits))) {
    return null
  }

  const scaled = fraction.slice(0, minorUnits).padEnd(minorUnits, '0')
  const value = Number(`${whole}${scaled}`)

  return Number.isSafeInteger(value) ? value : null
}

/**
 * Minör birim tam sayısını form alanına yazılacak ANA birim metnine çevirir.
 * <see cref="parseMinorAmount"/>'ın tersi; yine kayan nokta yok.
 *
 * Biçim NÖTR (daima nokta, binlik ayracı yok): bu bir `<input type="number">`
 * değeri, gösterilecek metin değil. Gösterim `formatMinorMoney`'nin işi.
 */
export function toMajorAmountInput(amountMinor: number, minorUnits: number): string {
  if (minorUnits === 0) return String(amountMinor)

  const text = String(Math.abs(amountMinor)).padStart(minorUnits + 1, '0')
  const whole = text.slice(0, text.length - minorUnits)
  const fraction = text.slice(text.length - minorUnits)

  return `${amountMinor < 0 ? '-' : ''}${whole}.${fraction}`
}
