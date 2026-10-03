/**
 * Web paketinin hangi commit'ten derlendiği (issue #46, vibe-check OPS-015).
 *
 * API'deki `/api/health` alanı `commit` ile aynı adı ve aynı "bilinmiyor" değerini
 * (`"dev"`) kullanıyor: deploy doğrulaması iki ucu aynı `jq .commit` ile okuyup
 * push edilen SHA ile karşılaştırıyor (docs/DEPLOY.md).
 *
 * Değerler `next.config.ts`'teki `env` bloğundan geliyor ve DERLEMEDE gömülü —
 * çalışma anı ortamı bunları değiştiremez.
 */

// Statik ön-oluşturulsaydı Next kendi önbellek başlığını yazar ve aşağıdaki
// `no-store` yok sayılırdı.
export const dynamic = 'force-dynamic'

export type VersionPayload = {
  commit: string
  builtAtUtc: string | null
}

export function GET() {
  const payload: VersionPayload = {
    commit: process.env.EXPYRA_COMMIT || 'dev',
    builtAtUtc: process.env.EXPYRA_BUILT_AT || null,
  }

  return Response.json(payload, {
    headers: {
      // Önbellekte kalan eski yanıt, yeni deploy'u eski sürüm gibi gösterirdi —
      // doğrulamanın tam yanlış sonuç verdiği durum.
      'Cache-Control': 'no-store',
    },
  })
}
