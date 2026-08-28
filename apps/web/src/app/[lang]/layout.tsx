import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { SiteChrome } from '@/components/brand/site-chrome'
import { getTranslator } from '@/features/i18n/translator'
import { WALLPAPER_CLIPS } from '@/lib/wallpaper-clips'
import { findLanguage } from '@/lib/languages'
import { isRoutableLanguage, routableLanguages } from '@/lib/routes'
import '../globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
    { media: '(prefers-color-scheme: light)', color: '#f2f3f7' },
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

  // Duvar kağıdı metinleri SUNUCUDA çözülüyor: bileşen istemci tarafında ve sözlük
  // `server-only`. Önceden bu metinler kaynak dosyaya gömülüydü ve ortak layout'ta
  // yaşadığı için /en dahil her sayfada Türkçe görünüyorlardı.
  const t = await getTranslator(lang)

  const wallpaperLabels = {
    captions: WALLPAPER_CLIPS.map((clip) => ({
      place: t(clip.placeKey),
      label: t(clip.labelKey),
    })),
    pause: t('wallpaper.pause'),
    play: t('wallpaper.play'),
  }

  return (
    <html
      lang={lang}
      dir={language?.rtl ? 'rtl' : 'ltr'}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SiteChrome wallpaperLabels={wallpaperLabels}>{children}</SiteChrome>
      </body>
    </html>
  )
}
