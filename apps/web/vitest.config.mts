import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Web tarafının test koşucusu.
 *
 * **Neden bugüne kadar yoktu ve neden şimdi var:** `apps/web` altında tek bir
 * test yoktu ve `pnpm check` web için test bile çalıştırmıyordu — yani
 * arayüzdeki hiçbir mantık korunmuyordu. Blok 7 tarayıcıda iki gerçek hata
 * çıkardı (süre alanının `min`/`step` çakışması, duraklatma düğmesinin
 * tıklanamaması) ve ikisi de ancak elle tıklayınca görüldü.
 *
 * **Kapsam bilinçli olarak DAR:** yalnız SAF modüller. Bileşen testi
 * (`@testing-library/react` + jsdom) ayrı bir karar ve ayrı bir bağımlılık
 * yığını; bugün korunması gereken şey para ve saat aritmetiği — ikisi de sessiz
 * bozuluyor ve ikisi de saf fonksiyon.
 *
 * Sunucu modülleri (`server-only` taşıyanlar) buradan İTHAL EDİLEMEZ ve bu
 * doğru: onların davranışı zaten API integration testlerinde ölçülüyor.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // `node` ortamı: test edilen her şey saf TypeScript, DOM'a dokunan yok.
    // jsdom eklemek, hiçbir testin ihtiyaç duymadığı bir yükleme maliyeti olurdu.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
