import languagesFile from '../../../../docs/languages.json'

/**
 * Dil listesi. Kaynak `docs/languages.json` — API'nin seed'iyle AYNI dosya
 * (docs/I18N.md). Kopyalanmadı: liste ikiye ayrılırsa hangisinin doğru olduğu
 * belirsizleşir.
 *
 * Neden API'den (`GET /api/languages`) değil: dil seçici, Postgres ayakta
 * olmadan da çalışmalı. Build zamanında çözülüyor, yani dosya kaybolursa
 * derleme kırılır — çalışma anında sessizce boş liste dönmez.
 *
 * Bu liste İÇERİK dilleri (49). Arayüz dilleri ayrı ve çok daha dar küme —
 * `features/i18n/` sözlüğü hangi dilleri taşıyorsa o (bugün tr + en).
 * Ayrım docs/I18N.md §1: host Korece yazabilir, arayüzü Korece'ye çevirmek
 * bizim iş yükümüz.
 */

export type Language = {
  code: string
  nativeName: string
  englishName: string
  /** Arayüz çevirisi tamamlanmış mı. Şu an yalnızca en + tr. */
  uiAvailable: boolean
  rtl: boolean
}

const all: Language[] = languagesFile.languages.map((item) => ({
  code: item.code,
  nativeName: item.nativeName,
  englishName: item.englishName,
  uiAvailable: item.uiAvailable,
  rtl: item.rtl,
}))

/** Arayüzün çevrildiği diller — dil seçicide üstte, seçilebilir. */
export const uiLanguages: Language[] = all.filter((item) => item.uiAvailable)

/**
 * Tüm diller. Host'un içerik yazabildiği küme; arayüz çevirisi olmayanlar da
 * burada (docs/I18N.md §1 — içerik dili sınırsız, arayüz dili kademeli).
 */
export const contentLanguages: Language[] = all

export const defaultLanguage = 'tr'

export function findLanguage(code: string | undefined): Language | undefined {
  if (!code) return undefined
  const needle = code.toLowerCase()
  return all.find((item) => item.code.toLowerCase() === needle)
}

/**
 * Dil adını kullanıcının dilinde verir: `ja` → "Japonca" (tr), "Japanese" (en).
 *
 * Bu liste olmadan arama işe yaramıyor — Türkçe konuşan biri "japonca" yazıyor,
 * listede ise "日本語" ve "Japanese" var. Kendi çeviri tablomuzu tutmuyoruz:
 * 49 dilin adını 49 dile çevirmek 2401 satır demek ve ICU bunu zaten taşıyor.
 *
 * `Intl.DisplayNames` Node ve tarayıcıda aynı ICU verisini kullandığı için
 * sunucu ve istemci aynı metni üretir — hidrasyon uyuşmazlığı olmaz.
 */
export function localNameOf(code: string, displayLanguage: string): string | undefined {
  try {
    const names = new Intl.DisplayNames([displayLanguage], {
      type: 'language',
      fallback: 'none',
    })
    return names.of(code)
  } catch {
    // Geçersiz locale etiketi. Sessizce yutmuyoruz — çağıran undefined'ı görüp
    // kendi dilindeki ada düşüyor; gösterilecek bir şey her zaman var.
    return undefined
  }
}

/**
 * Aksan duyarsız arama. "turkce" → "Türkçe", "japonca" → 日本語 (yerel ad üzerinden),
 * "de" → Deutsch (kod üzerinden).
 */
export function searchLanguages(
  list: readonly Language[],
  query: string,
  displayLanguage = defaultLanguage,
): Language[] {
  const needle = fold(query)
  if (!needle) return [...list]

  return list.filter((item) => {
    const local = localNameOf(item.code, displayLanguage)
    return (
      fold(item.nativeName).includes(needle) ||
      fold(item.englishName).includes(needle) ||
      (local !== undefined && fold(local).includes(needle)) ||
      item.code.toLowerCase().startsWith(needle)
    )
  })
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    // Birleşen aksan işaretleri (U+0300-U+036F) atılır: "Čeština" → "cestina".
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('tr-TR')
    .trim()
}
