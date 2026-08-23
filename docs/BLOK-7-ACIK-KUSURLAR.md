# Blok 7 — açık kusurlar ve 7d'ye giriş notu

Blok 7a/7b/7c commit edildikten **sonra** yapılan denetimin doğrulanmış bulguları.
Hepsi kodu okuyarak teyit edildi; dosya:satır referansları o günkü `5ecc8d1`
commit'ine ait.

Bu dosya bitince silinir — maddeler ya düzeltilir ya da bir issue'ya taşınır.

---

## 1. ~~Vaat edilen tekil index şemada YOK~~ — **KAPANDI** (1a082f3)

`apps/api/src/Expyra.Infrastructure/Persistence/Configurations/SchedulingConfigurations.cs`
satır 106-108 ve 115-117: **aynı sütun çiftine** (`ExperienceId`, `StartsAtUtc`)
iki `HasIndex` çağrısı var.

`HasDatabaseName` yalnız veritabanı adını değiştiriyor, MODEL adını değil. Model
tarafında ikisi de adsız kaldığı için EF `FindIndex(properties)` ile birincisini
buluyor ve **aynı nesneyi** döndürüyor. İkinci çağrı yeni index üretmiyor:
birincinin adını eziyor, üstüne `status = 'Open'` filtresi ekliyor, `IsUnique()`
birinciden miras kalıyor.

Üretilen şemada tek index var:
`20260823093845_AddSchedulingAndPricing.cs:227-232` →
`ix_availability_slot_open`, `unique: true`, `filter: "status = 'Open'"`.

`ux_availability_slot_experience_start` adı repoda yalnız **dört yorumda** geçiyor
(`SchedulingConfigurations.cs:107,184`, `CreateSlotCommand.cs:19`,
`HostScheduleStore.cs:76`); hiçbir migration'da yok.

**Neden önemli:** o yorumlar "kapalı satır bu index sayesinde dirilmiyor" diyor.
O koruma veritabanında değil, yalnız kodda (`HostScheduleStore.GenerateAsync`
içindeki `seen` HashSet'inde). Tek süreçte yeterli; iki eşzamanlı üretimde değil.
Testler bu yüzden geçiyor.

**Düzeltme:** iki index'e AYRI model adı ver (`HasDatabaseName` yetmez) ve yeni
migration üret. Sonra `KapatilanSeans_TekrarUretimdeDIRILMIYOR` testinin hâlâ
geçtiğini doğrula.

---

## 2. ~~`RemainingCapacity` diriltme yolunda yazılıyor~~ — **KAPANDI** (1a082f3)

PLAN kabul kriteri 5 (`docs/PLAN.md:275`): "`RemainingCapacity` bu blokta yalnız
**okunur** (yazma Blok 9'da, kilitli)."

`apps/api/src/Expyra.Application/Features/Scheduling/Commands/CreateSlot/CreateSlotCommand.cs:119`
→ `existing.RemainingCapacity = experience.Capacity;`

`existing` veritabanından çekilmiş, izlenen bir satır — bu bir nesne başlatıcısı
değil, var olan sayacın **ezilmesi**. Diğer iki yazma
(`HostScheduleStore.cs:146`, `CreateSlotCommand.cs:140`) nesne başlatıcısı olduğu
için `AvailabilitySlot.cs:56-58`'deki muafiyete giriyor; bu girmiyor.

Üstelik yön tehlikeli: azaltmıyor, **artırıyor**. Satılmış koltuğu olan kapalı bir
seans yeniden açılırsa koltuklar sıfırlanır.

Asimetri de var — satılmış koltuk kontrolü üç yerde YAPILIYOR
(`SlotLifecycle.cs:162` silme, `StopRecurrenceCommand.cs:98`,
`BlackoutLifecycle.cs:103`) ama diriltme yolunda yok.

---

## 3. ~~WCAG 2.2.2 duraklatma düğmesi fareyle tıklanamıyor~~ — **KAPANDI** (1a082f3)

`9acd2ac` bu düğmeyi ekledi ama **iki bağımsız engel** var:

1. `apps/web/src/app/globals.css:548` — `.hero-wallpaper` üzerinde
   `pointer-events: none`. Düğme (`hero-wallpaper.tsx:342`) doğrudan çocuğu ve
   özellik kalıtsal; `.hero-wallpaper-toggle` (globals.css:627-665) onu
   sıfırlamıyor. Repoda hiç `pointer-events: auto` yok.
2. `.hero-wallpaper` `position: fixed; z-index: 0` ile **kendi istifleme bağlamını**
   kuruyor, yani düğmedeki `z-index: 3` yalnız o bağlamın içinde geçerli.
   `site-chrome.tsx:21-23`'teki kardeş içerik katmanı `z-10` + `min-h-dvh` ile
   görünüm alanının tamamını, düğmenin oturduğu sağ alt köşe dahil kaplıyor.

Yani `pointer-events: auto` eklemek **tek başına yetmez**; istifleme sırası da
çözülmeli. Klavye yolu (Tab + Enter) çalışıyor.

---

## 4. ~~Host fiyatını geri okuyan uç yok~~ — **KAPANDI** (1a082f3)

`HostScheduleController.cs:282` `PUT .../pricing`, `:308` `DELETE .../pricing`.
**GET yok.**

- `HostScheduleResponse` (`HostScheduleResponse.cs:68-78`) fiyat taşımıyor;
  `GetHostScheduleQuery` fiyat tablosuna hiç dokunmuyor.
- `HostExperienceResponse` de taşımıyor; host tarafında **tekil ilan GET ucu da
  yok** (`HostExperiencesController.cs:64-68` yorumunda açıkça yazılı).
- Misafir ucu fiyatı taşıyor ama yalnız **yayındaki** ilan için ve slug ile —
  taslakta slug `null` olabilir.

**Risk:** `PUT` tam-değiştirme (`SetPricingCommand.cs:194-204` gövdede olmayan her
kademeyi siliyor). Form kayıtlı değeri okuyamadan boş açılır ve kaydedilirse
mevcut kademeler gerçekten silinir.

**Düzeltme:** fiyatı `GET .../schedule` yanıtına ekle (ayrı uç açmaya gerek yok —
takvim ekranı zaten fiyat formunu da barındıracak).

---

## 5. 7d'ye girmeden bilinmesi gerekenler — **AÇIK, 7d girdisi**

- **`formatMoney` ana birimle çalışıyor.** API her yerde minör birim tam sayısı
  gönderiyor. Yeni bir formatlayıcı gerekiyor; eskisini çağırmak tutarı 100 kat
  büyük gösterir.
- **Duvar saati dizgeleri `new Date()` ile ayrıştırılmamalı.** `2026-10-13T14:00`
  saat dilimi eki taşımıyor ve `new Date()` onu tarayıcının yerel saatinde
  yorumlar — Prag'daki bir tur İstanbul'daki misafire yanlış saatte görünür.
  Yanıttaki `timeZoneId` ile çizilmeli.
- **Tasarım sisteminde takvim/ay görünümü yok**, sıfırdan yazılacak.
- **i18n:** kaynak `messages/tr.ts`, çeviri `messages/en.ts`. `en.ts`'te eksik
  anahtar **derlemeyi kırar**; hiç anahtarlanmamış metni ise yakalamaz. Tahmini
  ~110-140 yeni anahtar × 2 dosya.

---

## 6. ~~Doküman sapmaları~~ — **KAPANDI**

Hepsi düzeltildi. Aşağıdaki tablo ne olduğunun kaydı.

| Nerede | Ne diyor | Gerçek |
|---|---|---|
| `CLAUDE.md:57` | "arayüz çevirisi Faz 8'de geliyor" | Blok 3'te geldi (`docs/PLAN.md:58,605`). 7d'ye başlayan oturum `messages/tr.ts`'i bulamaz — **en tehlikeli sapma** |
| `CLAUDE.md:15-21` komutlar | `api:seed` ve `api:test` yok | `package.json:12,14`'te var. Seed olmadan Blok 7'nin kur çevrimi **409** veriyor (`ExchangeRateStore.cs:60-64`) |
| `docs/DATABASE.md:10-14` | hızlı başlangıç: `db:up` → `api:migrate` → `api` | Seed adımı eksik, aynı 409 |
| `docs/DATABASE.md` şema | Blok 7'nin **yedi tablosu** hiç yok | `availability_slot`, `recurrence_template`, `availability_blackout`, `experience_price`, `price_rule`, `exchange_rate_snapshot`, `exchange_rate` |
| `docs/PLAN.md:62` yolculuk | Blok 7 "❌ yok" | API bitti, web bitmedi — ara durum gösterilmeli |
| `docs/PLAN.md` "bloke olanlar" | kur kaynağı yok | Çözüldü (`docs/exchange-rates.json` + seed). Postgres satırı da tamamen eskimiş |
| `HostExperienceResponse.cs:21-25` | "JsonStringEnumConverter kayıtlı değil" | `f964582` onu `Program.cs:30-32`'de kaydetti. Bu yorumu izleyen bir refactor web'i kırar |
| `docs/exchange-rates.json` | — | Hiçbir dokümandan referanslanmıyor |

---

## 7. Karara bağlanmamış

- **Fiyat yayın koşulu mu?** Bugün fiyatsız ilan yayınlanabiliyor ve misafir teklif
  ucu 409 veriyor. PLAN bu kararı hiç vermemiş.
- **Para birimi kilidi geri alınamaz.** `SetPricingCommand.cs:100-108` ve
  `DeletePricingCommand.cs:53-58` "Önce arşivleyin" diyor ama
  `ArchiveExperienceCommand.cs:46-55` `PublishedAtUtc`'ye dokunmuyor — damga
  hiçbir yerde `null`'a çekilmiyor. **Hata mesajı var olmayan bir çıkış yolu
  gösteriyor.**
- **Fiyatta "tarih aralığı kuralı"** PLAN ve ROADMAP'te vaat edilmiş, kod onu
  bilinçli olarak yazmadı. Ya modele eklenmeli ya vaatten düşülmeli.
- **Toplam asgari tahsilat kontrolü** `SetPricingCommand.cs`'in yorumunda "teklif
  anında" deniyor ama 7c'de yazılmadı.

---

## 8. Blok 7 dışında kalan eksikler (hâlâ açık)

- Hero videosu: tek dosya değil, **üç klip toplam ~41 MiB**.
- Birincil CTA'da beyaz metin **4,5:1 altında** (WCAG 1.4.3 AA).
- Tek bir odak halkası rengi var, gerçek zeminlerin çoğunda **3:1 altında**
  (WCAG 1.4.11).
- Üç sayfa `SiteHeader` yerine kendi `<header>`'ını kopyalıyor.
- Favicon hâlâ Vercel'in varsayılan üçgeni; beş `create-next-app` SVG'si
  referanssız duruyor.
- `apps/web` altında **hiç test yok** ve `pnpm check` web için test bile
  çalıştırmıyor.
- Galeri `alt` metni sabit boş string; host'tan alınmıyor ve alınacak alan da yok.
