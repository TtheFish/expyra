import { defaultUiLocale, isUiLocale, type UiLocale } from './locale'

/**
 * Sınır ekranlarının metinleri — 404, hata sınırı, kök hata sınırı, yükleniyor.
 *
 * ## Neden bu tablo sözlüğün DIŞINDA
 *
 * Sözlük `server-only` ve istemci bileşenleri metni sunucu ebeveyninden prop
 * olarak alıyor (bkz. `translator.ts`, `site-header.tsx`). Bu dört dosyanın
 * SUNUCU EBEVEYNİ YOK — Next 16'nın dosya sözleşmesi böyle:
 *
 * | Dosya | Kısıt (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`) |
 * |---|---|
 * | `not-found.tsx` | *"do not accept any props"* — `params.lang` yok |
 * | `error.tsx` | *"must be Client Components"* — sözlüğe dokunamaz |
 * | `global-error.tsx` | Kök layout'un yerine geçiyor; dil belirleyen yer o |
 * | `loading.tsx` | Suspense fallback'i, prop almıyor |
 *
 * Yani "sunucuda çöz, prop olarak indir" kalıbı burada uygulanamıyor. Kalan iki
 * seçenek vardı: her dosyaya kendi Türkçe tablosunu bırakmak (bugünkü durum —
 * `/en` altında Türkçe 404, tam da bu bloğun kapattığı WCAG 3.1.1 açığı), ya da
 * dilleri tek bir istemci güvenli tabloda toplamak. İkincisi seçildi.
 *
 * **Bedeli açıkça yazılı:** bu tablo `[lang]` altındaki her sayfanın istemci
 * paketine giriyor ve TÜM arayüz dillerini taşıyor — sözlüğün "kullanıcının
 * dili diğerlerini indirmez" kuralının (docs/I18N.md §5) tek istisnası. Bugün
 * iki dil × on üç kısa dizge; taşınabilir. Arayüz dili sayısı büyüdüğünde
 * doğru çözüm bu tabloyu şişirmek değil, `[lang]/layout.tsx`'ten aktif dilin
 * dizgelerini taşıyan dar bir provider geçirmek olur (o zaman `global-error`
 * yine kapsam dışı kalır — layout'un kendisi çökmüşken provider da yok).
 *
 * Anahtar kümesi burada da derlemede korunuyor: `Record<UiLocale, …>` yeni bir
 * arayüz dili eklendiğinde kırılır, `BoundaryMessages` eksik alanı yakalar.
 */
export type BoundaryMessages = {
  /** `loading.tsx` — yalnız ekran okuyucuya. */
  loading: string

  notFound: {
    /** Ekran okuyucu için: rakam yığını değil, ne olduğunun adı. */
    code: string
    title: string
    lede: string
    explore: string
    home: string
  }

  error: {
    title: string
    lede: string
    retry: string
    home: string
    /** Sunucu logundaki satırla eşleşen referans (`error.digest`). */
    reference: string
  }

  /**
   * Kök hata sınırı. `error` ile aynı alanları taşıyor ama metin AYRI: orada
   * "bu sayfayı yükleyemedik", burada "uygulama durdu" — kullanıcı için iki
   * farklı büyüklükte olay.
   */
  globalError: {
    /** `metadata` client component'te yok; başlık React'in `<title>`'ı ile. */
    documentTitle: string
    title: string
    lede: string
    retry: string
    home: string
    reference: string
  }
}

export const boundaryMessages = {
  tr: {
    loading: 'Sayfa yükleniyor',

    notFound: {
      code: 'Hata 404 · sayfa bulunamadı',
      title: 'Bu sayfa yok',
      lede: 'Bağlantı eskimiş olabilir ya da adres yanlış yazılmış olabilir. Aradığın deneyim hâlâ burada olabilir — keşfetmeyi dene.',
      explore: 'Deneyimleri keşfet',
      home: 'Ana sayfaya dön',
    },

    error: {
      title: 'Bir şeyler ters gitti',
      lede: 'Bu sayfayı yükleyemedik. Sorun bizde olabilir — genellikle tekrar denemek yetiyor.',
      retry: 'Tekrar dene',
      home: 'Ana sayfaya dön',
      reference: 'Destek kodu',
    },

    globalError: {
      documentTitle: 'Bir şeyler ters gitti · Expyra',
      title: 'Bir şeyler ters gitti',
      lede: 'Uygulama beklenmedik biçimde durdu. Sayfayı yeniden yüklemek çoğu zaman yetiyor.',
      retry: 'Yeniden dene',
      home: 'Ana sayfaya dön',
      reference: 'Destek kodu',
    },
  },

  en: {
    loading: 'Loading the page',

    notFound: {
      code: 'Error 404 · page not found',
      title: 'This page doesn’t exist',
      lede: 'The link may be old, or the address may have a typo. What you were looking for could still be here — try exploring.',
      explore: 'Explore experiences',
      home: 'Back to the home page',
    },

    error: {
      title: 'Something went wrong',
      lede: 'We couldn’t load this page. It may well be on our side — trying again usually does it.',
      retry: 'Try again',
      home: 'Back to the home page',
      reference: 'Support code',
    },

    globalError: {
      documentTitle: 'Something went wrong · Expyra',
      title: 'Something went wrong',
      lede: 'The app stopped unexpectedly. Reloading the page usually clears it.',
      retry: 'Reload',
      home: 'Back to the home page',
      reference: 'Support code',
    },
  },
} as const satisfies Record<UiLocale, BoundaryMessages>

/**
 * Yoldan arayüz dilini çıkarır — sınır ekranlarının elindeki TEK kaynak bu.
 *
 * `useParams()` DEĞİL: `not-found.tsx` eşleşmeyen yollarda da basılıyor ve o
 * durumda `[lang]` bir değere bağlanmış olmayabilir. Yol her zaman var.
 *
 * Tanınmayan segment varsayılana düşüyor (`/xx/...`): 404 ekranının üstüne
 * ikinci bir 404 üretmenin kullanıcıya bir faydası yok.
 */
export function boundaryLocaleOf(pathname: string): UiLocale {
  const segment = pathname.split('/')[1] ?? ''
  return isUiLocale(segment) ? segment : defaultUiLocale
}
