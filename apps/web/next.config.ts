import type { NextConfig } from 'next'
import routeMap from './src/lib/route-map.json'

/**
 * Lokalize URL'ler (docs/I18N.md §5).
 *
 * Fiziksel route'lar kanonik İngilizce adla duruyor (`app/[lang]/explore`).
 * Kullanıcının gördüğü lokalize slug (`/tr/kesfet`) buraya rewrite ile bağlanıyor:
 * dosya ağacı her dilde aynı kalıyor, yeni dil eklemek `route-map.json`'a bir
 * blok eklemek oluyor — klasör kopyalamak değil.
 *
 * Tablo `src/lib/route-map.json`'dan geliyor; `src/lib/routes.ts` (link üretimi)
 * de aynı dosyayı okuyor. İki ayrı tablo tutulsaydı linkler ile rewrite'lar
 * sessizce uyuşmaz ve 404 üretirdi.
 */

type PageId = keyof typeof routeMap.canonical

const pages = Object.keys(routeMap.canonical) as PageId[]
const languages = Object.keys(routeMap.localized)

const nextConfig: NextConfig = {
  async rewrites() {
    return pages.flatMap((page) =>
      languages
        .map((lang) => ({
          localized: routeMap.localized[lang as keyof typeof routeMap.localized][page],
          canonical: routeMap.canonical[page],
          lang,
        }))
        // Ana sayfada segment yok; slug ile kanonik aynıysa rewrite gereksiz.
        .filter(({ localized, canonical }) => localized !== '' && localized !== canonical)
        .map(({ lang, localized, canonical }) => ({
          source: `/${lang}/${localized}`,
          destination: `/${lang}/${canonical}`,
        })),
    )
  },

  async redirects() {
    const defaultLanguage = routeMap.defaultLanguage
    const defaultTable = routeMap.localized[defaultLanguage as keyof typeof routeMap.localized]

    return [
      // Kök bir dile ait olmalı — aksi halde hangi dil olduğu belirsiz kalır ve
      // hreflang tutarsızlaşır. Kalıcı DEĞİL: tarayıcı dili algılama (Faz 8.2)
      // geldiğinde hedef kullanıcıya göre değişecek, 301 önbelleğe yapışır.
      { source: '/', destination: `/${defaultLanguage}`, permanent: false },

      // Dil segmentsiz eski yollar. Yayınlanmış bağlantılar kırılmasın diye kalıcı.
      ...pages
        .filter((page) => defaultTable[page] !== '')
        .map((page) => ({
          source: `/${defaultTable[page]}`,
          destination: `/${defaultLanguage}/${defaultTable[page]}`,
          permanent: true,
        })),

      // Slug'ı bu geçişte değişen sayfalar. Tablodan türetilemez çünkü eski
      // adın kaydı yalnız git geçmişinde — burada açıkça yazılıyor.
      { source: '/host', destination: `/${defaultLanguage}/${defaultTable.becomeHost}`, permanent: true },

      // Kanonik yol kullanıcıya gösterilmez: `/tr/explore` ile `/tr/kesfet` aynı
      // içeriği verirse arama motoru iki ayrı sayfa görür ve sinyal bölünür.
      // Tek görünür URL lokalize olan.
      ...languages.flatMap((lang) =>
        pages
          .map((page) => ({
            page,
            localized: routeMap.localized[lang as keyof typeof routeMap.localized][page],
            canonical: routeMap.canonical[page],
          }))
          .filter(({ localized, canonical }) => canonical !== '' && localized !== canonical)
          .map(({ localized, canonical }) => ({
            source: `/${lang}/${canonical}`,
            destination: `/${lang}/${localized}`,
            permanent: true,
          })),
      ),
    ]
  },
}

export default nextConfig
