import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Apple Wallet paketine giren görseller ve sunucuda okunan sabit dosyalar.
 *
 * Bu modül bilinçli olarak `server-only` DEĞİL: dosya adları saf veri ve
 * `pass-assets.test.ts` onları doğruluyor. Okuyan fonksiyonlar yalnız sunucu
 * modüllerinden (`apple-pass.ts`, `config.ts`) çağrılıyor.
 *
 * **Dosya adları neden testle korunuyor:** bir PII temizleyici `icon@2x.png`
 * adını e-posta sanıp `…@example.org`'a çevirmişti — pass retina ikonsuz
 * üretiliyordu ve hiçbir şey kırılmadı. Apple paketteki adlara bakıyor; ad
 * yanlışsa dosya sessizce yok sayılıyor (#48).
 *
 * **Dağıtım:** okumalar `process.cwd()/src/...` üzerinden. `src/` sunucu
 * çıktısına `next.config.ts` → `outputFileTracingIncludes` ile giriyor; yeni bir
 * dosya eklenirse oradaki desenin onu kapsadığından emin ol.
 */

/** `process.cwd()`'ye göreli — `next.config.ts`'teki izleme deseniyle aynı kök. */
export const WALLET_ASSETS_DIR = 'src/lib/wallet/assets'

/**
 * Pakete giren ikonlar: paket içindeki ad → diskteki ad.
 * Apple ikon ölçüsü 29 pt: @1x 29 px, @2x 58 px, @3x 87 px.
 */
export const PASS_ICON_FILES = {
  'icon.png': 'icon.png',
  'icon@2x.png': 'icon@2x.png',
  'icon@3x.png': 'icon@3x.png',
} as const

/** Apple'ın herkese açık WWDR G4 ara sertifikası — sır değil, repoda duruyor. */
export const WWDR_CERT_FILE = 'AppleWWDRCAG4.pem'

function assetPath(file: string): string {
  return join(process.cwd(), WALLET_ASSETS_DIR, file)
}

export function readPassIcons(): Record<keyof typeof PASS_ICON_FILES, Buffer> {
  return Object.fromEntries(
    Object.entries(PASS_ICON_FILES).map(([name, file]) => [name, readFileSync(assetPath(file))]),
  ) as Record<keyof typeof PASS_ICON_FILES, Buffer>
}

export function readWwdrCertPem(): string {
  return readFileSync(assetPath(WWDR_CERT_FILE), 'utf8')
}
