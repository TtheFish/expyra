# Demo veri — hesaplar ve ilanlar

Local'de "içi dolu" bir site görmek için. Referans veriden sonra bir kez koş:

```bash
pnpm api:seed        # ülke/şehir/para birimi/kategori/kur (zorunlu)
pnpm api:seed:demo   # demo hesaplar + 5 yayında ilan (yalnız Development)
```

İdempotent: ikinci koşu 0 satır yazar. Bir ilanı sıfırlamak istersen satırı sil
(`delete from experience where slug = 'demo-...'`) ve tekrar koş.

## Hesaplar

Şifre YOK — giriş tek kullanımlık kodla. Dev'de kod e-posta yerine **giriş
ekranında görünür** (`/api/dev/emails` ucu, yalnız Development).

| E-posta | Rol | Ne görür |
|---|---|---|
| `host.ayse@expyra.dev` | Host | 3 İstanbul ilanı, host paneli (`/tr/host-ol`), tanıtım metni |
| `host.tuna@expyra.dev` | Host | İzmir + Göreme ilanları |
| `misafir@expyra.dev` | Misafir | Keşfet, detay, rezervasyon paneli |

Giriş: `/tr/giris` → e-postayı yaz → kod ekranda çıkar → yapıştır.

## İlanlar

| Slug | Host | Şehir | Ne var |
|---|---|---|---|
| `demo-kadikoy-lezzet-yuruyusu` | Ayşe | İstanbul | program, buluşma noktası, yaş 12+, TRY, ilk seans "son 2 yer" |
| `demo-balat-fotograf-yuruyusu` | Ayşe | İstanbul | sabah 08:00 seansları |
| `demo-bogaz-gunbatimi-tekne` | Ayşe | İstanbul | 3 dil, EUR |
| `demo-kemeralti-kahvalti-turu` | Tuna | İzmir | minimal alanlar (boş bölümler gizli) |
| `demo-goreme-gun-dogumu-yuruyusu` | Tuna | Göreme | yorucu, 05:00, EUR |

Her ilanda **tr + en + cs + de** metin (UI dilleri), 2 gerçek fotoğraf (Wikimedia
Commons, kapak + galeri), yetişkin + çocuk fiyatı, 14 günlük seans. Dil
değiştirince başlık/açıklama da o dile düşer. Detay: `/tr/deneyim/<slug>`,
düzenleme: host paneli.

Görseller `apps/api/src/Expyra.WebApi/.object-store/` altına yazılır (gitignore).
Kaynak fotoğraflar gömülü: `…/Seed/DemoPhotos/` (+ `SOURCES.md`). Eski PNG
gradyan seed'i varsa `pnpm api:seed:demo` bir kez daha koşunca JPEG'e yükselir.
