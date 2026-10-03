import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PASS_ICON_FILES, WALLET_ASSETS_DIR, WWDR_CERT_FILE } from './pass-assets'

/**
 * Pass paketindeki dosya adları. Apple yanlış adlı dosyayı sessizce yok
 * sayıyor — bir PII temizleyici `icon@2x.png`'yi `…@example.org` yapmıştı ve
 * hiçbir şey kırılmamıştı (#48). Bu test o sessizliği kırıyor.
 */

const assetsDir = join(process.cwd(), WALLET_ASSETS_DIR)

/** PNG IHDR: imza (8) + uzunluk (4) + tür (4), sonra genişlik ve yükseklik. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(join(assetsDir, file))
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('Apple Wallet pass dosyaları', () => {
  it('paket ikon, @2x ve @3x ikonlarını taşıyor', () => {
    expect(Object.keys(PASS_ICON_FILES).sort()).toEqual(['icon.png', 'icon@2x.png', 'icon@3x.png'])
  })

  it('hiçbir ad e-posta adresine dönüşmemiş', () => {
    const names = [...Object.keys(PASS_ICON_FILES), ...Object.values(PASS_ICON_FILES), WWDR_CERT_FILE]
    for (const name of names) expect(name).not.toContain('@example.')
  })

  it.each([
    ['icon.png', 29],
    ['icon@2x.png', 58],
    ['icon@3x.png', 87],
  ] as const)('%s diskte ve %i px', (name, px) => {
    expect(pngSize(PASS_ICON_FILES[name])).toEqual({ width: px, height: px })
  })

  it('WWDR sertifikası diskte', () => {
    expect(readFileSync(join(assetsDir, WWDR_CERT_FILE), 'utf8')).toContain('BEGIN CERTIFICATE')
  })
})
