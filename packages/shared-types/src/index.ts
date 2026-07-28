/**
 * Web ve mobil uygulamanın PAYLAŞTIĞI tipler.
 *
 * Kural: API tipleri ELLE YAZILMAZ. Backend çalışırken `pnpm types:generate`
 * çalıştır — OpenAPI şemasından `api.generated.ts` üretilir.
 * Elle yazılan tip, backend değişince sessizce yalan söylemeye başlar.
 *
 * Buraya sadece platformlar arası paylaşılan yardımcı tipler yazılır.
 */

export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

/** ASP.NET ProblemDetails karşılığı — API'nin tek hata formatı. */
export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  errors?: Record<string, string[]>
}
