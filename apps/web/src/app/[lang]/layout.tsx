import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Manrope } from 'next/font/google'
import { notFound } from 'next/navigation'
import { SiteChrome } from '@/components/brand/site-chrome'
import { getTranslator } from '@/features/i18n/translator'
import { findLanguage } from '@/lib/languages'
import { isRoutableLanguage, routableLanguages } from '@/lib/routes'
import '../globals.css'

/*
  Manrope: tasarımın tipografisi (bkz. globals.css başlığı). Latin-ext ALTKÜME
  DAHİL — Türkçe ğ/ş/İ ve Çekçe ě/ř/ů latin'de yok; eksik bırakmak o harflerde
  sistem fontuna düşürüp satırı bozardı.
*/
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'latin-ext'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * Statik `metadata` yerine `generateMetadata`: açıklama sayfanın dilinde
 * yazılmalı. `<html lang="en">` içindeki Türkçe bir `meta description` yalnız
 * arama sonucunda değil, paylaşılan her bağlantı önizlemesinde görünür.
 * Marka adı çevrilmiyor.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslator(lang)

  return {
    title: 'Expyra',
    description: t('meta.description'),
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#16181f' },
  ],
}

/** Arayüz dilleri build'de üretilir; başka dil segmenti 404. */
export function generateStaticParams() {
  return routableLanguages.map((lang) => ({ lang }))
}

/**
 * Tema, React hidrasyonundan ÖNCE uygulanmalı — yoksa koyu tema kullanıcısı
 * ilk karede beyaz ekran görür. Bu yüzden senkron inline script.
 */
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
`

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ lang: string }>
}>) {
  const { lang } = await params

  // Bilinmeyen dil segmenti 404. Aksi halde `/xx/kesfet` Türkçe arayüzü
  // "xx dili" gibi sunar ve arama motorları o URL'i indeksler.
  if (!isRoutableLanguage(lang)) {
    notFound()
  }

  const language = findLanguage(lang)

  return (
    <html
      lang={lang}
      dir={language?.rtl ? 'rtl' : 'ltr'}
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  )
}
