# @expyra/mobile

**Durum: henüz kurulmadı.** Faz 5'te Expo ile kurulacak.

Şimdi kurmuyoruz çünkü Expo ~500 MB bağımlılık getirir ve Faz 1-4 boyunca
kullanılmayacak. Yer ayrılmış olması, monorepo yapısının mobili baştan
hesaba kattığını gösteriyor.

## Kurulunca çalıştırılacak komut

```bash
pnpm create expo-app@latest apps/mobile --template blank-typescript
```

Sonrasında yapılacaklar:

1. `package.json` içindeki adı `@expyra/mobile` yap
2. `@expyra/shared-types` bağımlılığını `workspace:*` olarak ekle
3. `metro.config.js` içinde monorepo desteğini aç (`watchFolders` + `nodeModulesPaths`)
4. API taban adresini `app.config.ts` üzerinden ortam değişkeninden oku — sabit yazma
5. Kök `package.json`'a `"mobile": "pnpm --filter @expyra/mobile start"` script'ini geri ekle
   (paket yokken komut hata verdiği için kaldırıldı)

## Neden Expo?

- Web ile aynı TypeScript tiplerini paylaşır (`packages/shared-types`)
- OTA güncelleme, store süreçlerini basitleştirir
- Kamera/QR okuyucu (check-in özelliği için) hazır modüllerle gelir
