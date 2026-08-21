import { PlacesApiError, cityKeyOf, searchCities } from '@/features/places/api'

/**
 * Şehir seçicinin autocomplete ucu — tarayıcıdan çağrılan TEK yer.
 *
 * ## Neden route handler, neden server action değil
 *
 * `EXPYRA_API_URL`'in `NEXT_PUBLIC_` öneki yok: tarayıcı .NET API'yi hiç görmüyor,
 * yani isteğin Next sunucusunda sonlanması zorunlu. Geriye iki seçenek kalıyor ve
 * ikisi arasındaki fark bu ekranda ölçülebilir:
 *
 * - **Server action:** Next istemci başına eylemleri SIRAYLA gönderiyor
 *   (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, "Sequential
 *   dispatch on the client") ve aynı belge, mutasyon olmayan istekler için route
 *   handler'a yönlendiriyor. Sekiz tuş vuruşu sekiz ardışık gidiş-dönüş demek;
 *   üstelik eylem iptal edilemiyor, yani kullanıcı yazmayı bırakmışken hâlâ eski
 *   önekler için sıraya girmiş istekler cevap bekliyor.
 * - **Route handler:** düz `GET`. `AbortController` ile her tuşta önceki istek
 *   kesiliyor ve yanıt önbelleğe alınabiliyor — aşağıdaki `Cache-Control` sayesinde
 *   kullanıcı bir harf silip yeniden yazdığında ağa hiç çıkılmıyor.
 *
 * `proxy.ts` `/api` yollarında çalışmıyor (matcher dışında), yani buraya oturum
 * yenileme uğramıyor. Sorun değil: uç anonim, oturum okumuyor.
 *
 * ## Yanıt şekli API'nin değil, seçicinin şekli
 *
 * İstemciye `key` (doğal anahtar) hazır geliyor; anahtarın biçimi tek yerde,
 * `features/places/api.ts` içinde kuruluyor. Tarayıcıya `${countryCode}-${slug}`
 * birleştirmesi yaptırılsaydı aynı kural iki dosyada yaşar ve bir gün ayrışırdı.
 * Koordinat, saat dilimi ve uuid GÖNDERİLMİYOR: seçicinin işine yaramıyorlar ve
 * her tuş vuruşunda taşınıyorlar.
 */

/** İstemcinin sözleşmesi. `englishName` ikinci satırda gösteriliyor (bkz. city-picker). */
export type CityOptionPayload = {
  key: string
  name: string
  englishName: string
  countryCode: string
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  try {
    const cities = await searchCities({
      query: params.get('q'),
      // Alan adı Türkçe: bu uç `/api/bilet` ve `/api/cikis` ile aynı ailede,
      // dil segmenti taşımayan iç yollar bu repoda Türkçe adlandırılıyor.
      country: params.get('ulke'),
    })

    const payload: CityOptionPayload[] = cities.map((city) => ({
      key: cityKeyOf(city),
      name: city.name,
      englishName: city.englishName,
      countryCode: city.countryCode,
    }))

    return Response.json(
      { cities: payload },
      {
        headers: {
          // API'nin kendi başlığıyla aynı süre (`PublicCacheAttribute`): yanıt
          // anonim, kullanıcıya göre değişmiyor ve dile de bağlı değil.
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
        },
      },
    )
  } catch (error) {
    // Hata YUTULMUYOR: durum kodu istemciye aynen geçiyor ve arayüz "liste
    // yüklenemedi" diyor. Boş liste dönmek en kötüsü olurdu — kullanıcı aradığı
    // şehrin kayıtlı olmadığını sanır (CLAUDE.md #1).
    if (error instanceof PlacesApiError) {
      return Response.json({ cities: [] }, { status: error.status === 400 ? 400 : 502 })
    }

    throw error
  }
}
