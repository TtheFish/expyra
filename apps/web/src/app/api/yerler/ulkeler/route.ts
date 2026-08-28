import { PlacesApiError, fetchCountries } from '@/features/places/api'

/**
 * Şehir seçicinin BOŞ hâli: "nereye gidebilirim?".
 *
 * Kayıt defterinde 156 şehir, 39 ülke var. "En az iki harf yaz" diyen bir kutu,
 * arzın nerede olduğunu bilmeyen kullanıcıyı çıkmaza sokuyor — Tokyo yazıp boş
 * dönüyor ve platformun kırık olduğunu düşünüyor. Ülke listesi bu ekranın tek
 * dürüst boş hâli: elimizde popülerlik verisi yok, "öne çıkan şehirler" uydurmak
 * ölçülemeyen bir sıra üretirdi (API tarafı da aynı gerekçeyle alaka sıralaması
 * yazmadı).
 *
 * **Neden istemciden, sunucu prop'u olarak değil:** `ExperienceSearch` ana sayfada
 * da var. Listeyi orada çekmek, arama kutusuna hiç dokunmayan her ziyaretçiyi
 * kayıt defteri API'sine bağımlı kılardı — API kesintisinde ana sayfa 500'e
 * düşerdi. Burada liste yalnız panel AÇILDIĞINDA isteniyor ve hata görünür bir
 * satıra dönüşüyor.
 *
 * Neden ayrı route: uçlar API'deki `/api/places/countries` ve `/api/places/cities`
 * ile birebir. Tek dosyada moda göre dallanan bir uç, iki farklı önbellek süresini
 * ve iki farklı hata anlamını aynı adrese sıkıştırırdı.
 */

export type CountryOptionPayload = {
  code: string
  /** ICU bu kodu tanımıyorsa gösterilecek son çare ad (bkz. city-picker). */
  englishName: string
  cityCount: number
}

export async function GET() {
  try {
    const countries = await fetchCountries()

    const payload: CountryOptionPayload[] = countries.map((country) => ({
      code: country.code,
      englishName: country.englishName,
      cityCount: country.cityCount,
    }))

    return Response.json(
      { countries: payload },
      {
        headers: {
          // API'nin `RegistryMaxAgeSeconds`/`RegistryStaleSeconds` değerleriyle aynı.
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      },
    )
  } catch (error) {
    if (error instanceof PlacesApiError) {
      return Response.json({ countries: [] }, { status: 502 })
    }

    throw error
  }
}
