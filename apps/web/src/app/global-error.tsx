'use client'

/**
 * Son savunma hattı: kök layout'un (`app/[lang]/layout.tsx`) kendisi render
 * edilemediğinde devreye girer. O layout patladığında `<html>`/`<body>`,
 * `globals.css`, font ve tema script'i — hiçbiri basılmamış olur; bu yüzden bu
 * dosya kendi belgesini kuruyor.
 *
 * **Tasarım sisteminden bilinçli sapma.** CLAUDE.md "yeni yüzey GlassSurface
 * üzerine kurulur" diyor; burada cam yok ve stiller satır içi. Gerekçe: bu ekranın
 * varlık sebebi "yukarıdaki her şey bozuldu" durumu. `globals.css` import etmek,
 * çökmüş olabilecek bir yapıya bağımlılık eklemek olurdu — ve Next'in kendi
 * belgesi zaten uygulama stillerini bu sayfaya taşımıyor. Cam malzeme de arkasında
 * mesh gradient olmadan görünmez; burada arka plan yok.
 *
 * Tema `localStorage`'dan okunamıyor (tema script'i kök layout'ta): bu sayfa
 * yalnız işletim sisteminin `prefers-color-scheme` sinyaline uyuyor.
 *
 * `metadata` export'u client component'te desteklenmiyor — başlık React'in
 * `<title>` bileşeniyle veriliyor.
 */

const messages = {
  documentTitle: 'Bir şeyler ters gitti · Expyra',
  title: 'Bir şeyler ters gitti',
  lede: 'Uygulama beklenmedik biçimde durdu. Sayfayı yeniden yüklemek çoğu zaman yetiyor.',
  retry: 'Yeniden dene',
  home: 'Ana sayfaya dön',
  reference: 'Destek kodu',
} as const

/** Satır içi, çünkü bu sayfa hiçbir stil dosyasına güvenemiyor. */
const css = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: #f2f3f7;
    color: #16181f;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
  }
  .card { max-width: 32rem; text-align: center; }
  .title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; }
  .lede { margin: 0.75rem 0 0; font-size: 0.9375rem; opacity: 0.72; }
  .actions {
    margin-top: 1.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.75rem;
    padding: 0 1.25rem;
    border: 1px solid currentColor;
    border-radius: 1.25rem;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }
  .button-primary { border-color: transparent; background: #c62b1f; color: #fff; }
  .button:focus-visible { outline: 2px solid #e0574a; outline-offset: 3px; }
  .reference { margin: 1.5rem 0 0; font-size: 0.6875rem; opacity: 0.6; }
  .reference code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  @media (prefers-color-scheme: dark) {
    body { background: #16181f; color: #eef0f5; }
  }
`

type GlobalErrorProps = {
  error: Error & { digest?: string }
  /** Bkz. `app/[lang]/error.tsx` — aynı gerekçeyle retry tercih ediliyor. */
  reset: () => void
  unstable_retry?: () => void
}

export default function GlobalError({ error, reset, unstable_retry }: GlobalErrorProps) {
  // Kök layout dili belirleyen yer; o çalışmadığı için dil bilinmiyor.
  // Varsayılan arayüz dili yazılıyor (docs/I18N.md §5) — arayüz zaten Türkçe.
  return (
    <html lang="tr">
      <body>
        <title>{messages.documentTitle}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />

        <div className="card">
          <h1 className="title">{messages.title}</h1>
          <p className="lede">{messages.lede}</p>

          <div className="actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => (unstable_retry ?? reset)()}
            >
              {messages.retry}
            </button>
            {/*
              `next/link` DEĞİL, bilerek. Buraya düşüldüğünde React ağacı zaten
              çökmüş durumda; soft navigation aynı bozuk ağaç üzerinde yürür.
              Düz `<a>` belgeyi baştan yükleyip temiz bir durum kuruyor —
              kullanıcının burada ihtiyacı olan tam olarak bu.
              Hedef `/`: dil seçimi `next.config.ts` yönlendirmesinin işi,
              varsayılan dil buraya kopyalanmıyor.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button" href="/">
              {messages.home}
            </a>
          </div>

          {error.digest && (
            <p className="reference">
              {messages.reference} <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
