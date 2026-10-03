# Açık eksikler

Bilinen ama henüz kapatılmamış işler. Her madde ya bir dış bağımlılığı bekliyor
ya da kendi işini hak edecek kadar büyük.

Kapanan madde buradan **silinir**, üstü çizilmez — dosya kısa kalmalı ki
okunsun.

---

## 1. Hero videoları 41 MiB — `high`, **araç bekliyor**

`apps/web/public/brand/clips/` altında üç klip:

| Dosya | Boyut |
|---|---|
| `01-balik.mp4` | 8,8 MiB |
| `02-teyze.mp4` | 15,9 MiB |
| `03-balloon.mp4` | 16,3 MiB |

Ana sayfa ilk klibi hemen, ikincisini hemen ardından yüklüyor — yani ilk
ziyarette ~25 MiB. Mobil veriyle açan biri için bu kabul edilemez.

**Neden kapatılmadı:** bu makinede `ffmpeg` yok ve yeniden kodlamadan boyut
düşmüyor.

**Yapılacak** (ffmpeg olan bir makinede):

```bash
ffmpeg -i 01-balik.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 30 -preset slow -an -movflags +faststart 01-balik.min.mp4
```

Hedef klip başına 1,5–2 MiB. `-an` sesi atıyor (klipler zaten sessiz
oynatılıyor), `+faststart` metadata'yı başa alıyor. AV1/WebM ikinci bir kaynak
olarak eklenebilir ama önce H.264 boyutunu düşürmek yeterli.

**Kod tarafında ayrıca yapılabilecek iki şey** (ffmpeg gerektirmiyor, ama
tarayıcıda doğrulanmadan girilmemeli — `hero-wallpaper.tsx` içindeki durum
makinesi kırılgan):

- İkinci klibin ön yüklemesini ilk klip oynarken değil, geçişe birkaç saniye
  kala başlatmak.
- `navigator.connection.saveData` ve yavaş bağlantıda hiç klip yüklememek,
  poster görselinde kalmak.

---

## 2. Galeri görsellerinde alt metni yok — `medium`, **şema işi**

`experience_media` satırında alternatif metin alanı yok, dolayısıyla misafir
detayındaki galeri `alt=""` ile çiziliyor
(`apps/web/src/app/[lang]/experience/[slug]/page.tsx`).

Bugünkü hâli **savunulabilir**: host'tan alt metin alınmıyor ve uydurulacak her
metin ("deneyimden bir kare") ekran okuyucuya bilgi değil gürültü taşır. Kapak
görseli için `alt=""` zaten doğru — hemen yanında başlık duruyor.

**Eksik olan şey** host'tan alt metin İSTEYEBİLMEK. O bir şema değişikliği
(`experience_media.alt_text`), bir API alanı ve yükleyici arayüzünde bir alan
demek — kendi işini hak ediyor.

---

## 3. Blok 7 sonrası küçük notlar

- **`apiBaseUrl` + `problemOf` dört dosyada kopyalanmış** durumda ve her yeni
  BFF dosyası kopyayı artırıyor. Blok 7'de yeni dosya AÇILMADI (uçlar mevcut
  dosyalara eklendi) ama bir sonraki alan bunu tekrar soracak. Taşıma atomik bir
  PR'ın işi; `lib/api-client.ts` doğru ev.
- **Host tarafında tekil ilan GET ucu yok**; `fetchHostExperience` listeyi çekip
  içinden seçiyor. İlan sayısı büyüdükçe düzenleme sayfası gereksiz satır
  taşıyor.
- **Takvimde ay ızgarası yok**, düz liste var. Izgara klavye gezinmesi ve odak
  yönetimi istiyor; yarım yapılmış bir ızgara listeden daha erişilemez olur.
