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

/**
 * `next/image`'in yükleyebileceği uzak kaynaklar. Açık liste olmadan görsel hiç
 * çizilmiyor — ve bu bir güvenlik önlemi: liste açık bırakılsaydı optimizasyon
 * ucu herhangi bir adresi indiren bir proxy'ye dönerdi (SSRF).
 *
 * Adres yapılandırmadan geliyor çünkü geliştirmede API'nin kendisi, üretimde CDN
 * alan adı. Değişken tanımsızsa derleme KIRILIYOR: sessizce boş bir liste, tüm
 * görsellerin çizilmediği ama hata da vermeyen bir üretim dağıtımı demek olurdu.
 */
function mediaPattern() {
  const raw = process.env.EXPYRA_MEDIA_URL?.trim() || process.env.EXPYRA_API_URL?.trim()

  if (!raw) {
    throw new Error(
      'EXPYRA_MEDIA_URL (ya da EXPYRA_API_URL) tanımlı değil; görseller çizilemez. ' +
        'apps/web/.env.example dosyasına bak.',
    )
  }

  const url = new URL(raw)
  const prefix = url.pathname.replace(/\/+$/, '')

  return {
    protocol: url.protocol.replace(':', '') as 'http' | 'https',
    hostname: url.hostname,
    port: url.port,
    // Yol ön eki adresin KENDİSİNDEN geliyor. Geliştirmede görseller API ile aynı
    // alan adında duruyor (`/api/dev/objects/...`) ve ön ek olmasaydı optimizasyon
    // ucu üzerinden API'nin diğer uçları da istenebilirdi. Üretimde adres bir CDN
    // kökü olacak, ön ek boş kalacak ve `/**` doğru cevap olacak.
    pathname: `${prefix}/**`,
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [mediaPattern()],

    /*
      Next 16 varsayılan olarak ÖZEL IP'lerden görsel optimize etmiyor: optimizasyon
      ucu, adres verilen her yeri indiren bir proxy olduğu için iç ağa erişim
      sızdırabilir (SSRF). Geliştirmede depo `localhost:5205` — yani tam olarak o
      yasağın kapsamında ve bayrak olmadan hiçbir görsel çizilmiyor.

      `development` KAPISI ŞART: üretimde medya herkese açık bir CDN'de duracak,
      dolayısıyla bayrağa hiç gerek yok ve açık bırakmak korumayı sebepsiz
      kaldırmak olurdu. Yapılandırma bayrağıyla değil ortamla kapatılıyor —
      bayrak yanlış bir ortam değişkeniyle üretime sızabilir (API tarafındaki
      `AddDevelopmentObjectStorage` ile aynı gerekçe).
    */
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
  },

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
