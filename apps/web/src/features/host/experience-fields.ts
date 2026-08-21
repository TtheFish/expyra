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
