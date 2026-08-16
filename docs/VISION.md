# Amaç, Hedef ve İş Modeli

> **Uyarı:** Bu dosyadaki `⚠️` işaretli satırlar **varsayım** — henüz karar verilmedi.
> Kod yazmadan önce değil ama **Faz 4 (keşif) bitmeden** netleşmeli, çünkü hedef kitle
> ve şehir seçimi arama/filtre tasarımını doğrudan değiştiriyor.

---

## 1. Neden var

**Problem:** Bir şehre giden insan, o şehirde yaşayan birinin bildiği şeyleri bulamıyor.
Büyük platformlarda listelenen şey "tur" — otobüs, kalabalık grup, ezber anlatım.
Aradığı şey ise "birinin evinde yemek yapmak", "fotoğrafçıyla mahalle gezmek",
"balıkçıyla sabah çıkmak".

Diğer taraftan: bunu yapabilecek yerel insanın platformu yok. Instagram'dan
organize etmeye çalışıyor, ödeme alamıyor, takvim tutamıyor, güven veremiyor.

**Expyra bu iki tarafı buluşturur.**

- **Host:** deneyimini yayınlar, takvimini yönetir, parasını güvenle alır.
- **Gezgin:** küçük gruplu, gerçek, yerel bir şey bulur ve tek tıkla rezervasyon yapar.

## 2. Ne DEĞİL

Kapsamı korumak için, olmadığımız şeyleri de yazıyoruz:

- Otobüslü klasik tur satan bir acente değil
- Konaklama platformu değil
- Restoran rezervasyon sistemi değil
- Etkinlik bileti (konser, maç) platformu değil

## 3. Hedef kitle

### Host tarafı
⚠️ **Varsayım:** Yarı zamanlı, ayda 4-20 rezervasyon alan bireysel host'lar.
Profesyonel tur şirketi değil — onlar zaten büyük platformlarda.

### Gezgin tarafı
⚠️ **Varsayım:** 25-45 yaş, Avrupa içi kısa seyahat yapan, "turistik olmayan"
arayan, mobil öncelikli kullanıcı.

## 4. Kapsam: universal

**Karar: Expyra global bir platform.** Tek ülkeye, tek dile veya tek para birimine
bağlı bir sistem kurulmuyor.

Bunun anlamı — bunlar sonradan eklenecek özellikler değil, **veri modelinin kendisi**:

| Boyut | Gereklilik |
|---|---|
| Dil | İçerik çok dilli saklanır; arayüz çevirisi ayrı katman. **Dil listesi kodda sabit değil** — bkz. [I18N.md](I18N.md) |
| Para birimi | Fiyat, para birimiyle birlikte saklanır; görüntüleme kuru ayrı |
| Saat dilimi | Her deneyim kendi yerel saatinde; UTC saklanır |
| Konum | Ülke → şehir → koordinat hiyerarşisi + coğrafi arama |
| Ödeme | Host'un ülkesine göre payout ve KYC (Stripe Connect çoklu ülke) |
| Vergi | Ülke bazlı KDV/OSS kuralları |

Sonradan eklemenin maliyeti: tek para birimli bir `Price decimal` alanını
çok para birimine çevirmek, sistem canlıyken migration + tüm fiyat mantığının
yeniden yazılması demek. Baştan doğru kurmak neredeyse bedava.

### Ama: mimari universal ≠ arz universal

İki taraflı pazar yerinin en zor problemi yumurta-tavuk. 50 şehirde 3'er deneyim
olursa hiçbirinde rezervasyon olmaz; kullanıcı boş arama sonucu görüp bir daha gelmez.

Bu bir **pazarlama** problemi, mimari problem değil. İkisi çelişmez:

- **Sistem** ilk günden her ülkeyi, her dili, her para birimini destekler
- **Arz toplama** bir şehirden başlar, o şehir çalışınca ikinciye geçilir

⚠️ **Karar bekliyor:** arz toplamaya hangi şehirden başlanacak? Prag mantıklı —
ortak orada, saha desteği fiziksel olarak mümkün ve Stripe altyapısı zaten
AB'ye kurulacak. Ama bu sadece ilk odak; platform hiçbir zaman "Prag sitesi" olmaz.

## 5. Gelir modeli

⚠️ **Oranlar karar verilmedi.** Sektör standardı referansı:

| Kalem | Aralık | Not |
|---|---|---|
| Host komisyonu | %10-20 | Stripe Connect `application_fee` ile otomatik kesilir |
| Gezgin hizmet bedeli | %0-10 | Alınmayabilir; fiyatı şeffaf tutmak avantaj |
| Stripe işlem maliyeti | ~%1,5 + 0,25 € | AB kartları; AB dışı kart ~%3 — global olduğumuz için bu gider değişken |
| Kur dönüşümü | ~%1-2 | Farklı para biriminde tahsilat/ödeme yapıldığında |

**Örnek:** 50 € rezervasyon, %15 komisyon → 7,50 € brüt, ~6,25 € net.
Aylık 10.000 € hacim → ~1.250 € net gelir.

**Sonuç:** Bu iş hacimle çalışır. Başabaş için gereken aylık rezervasyon
hacmini hesaplamak, fiyatlandırma kararının kendisidir.

## 6. Farklılaşma

Rakipler: GetYourGuide, Viator, Airbnb Experiences, Withlocals, Klook.

Onlarla envanter yarışı kazanılmaz — 10 yıl ve yüz milyonlarca dolar öndeler.
Kazanılabilecek yer **daralma**:

1. **Tek şehirde derinlik** — Prag'da onlarda olmayan 40 deneyim
2. **Host'a daha adil komisyon** — büyük platformlar %20-30 alıyor
3. **Host özerkliği** — kendi fiyatını, grubunu, politikasını kendi belirler;
   platform ürüne karışmaz
4. **Gerçekten yerel host** — acente değil, birey

⚠️ Bunların hangisinin asıl konumlandırma olacağı karar bekliyor.

## 7. Başarı ölçütleri

Yazılım "bitti" demek yetmez. Ölçtüğümüz şeyler:

### Lansman (web MVP, ~13. hafta)
- [ ] 20 yayınlanmış deneyim (tek şehir)
- [ ] 10 doğrulanmış host
- [ ] İlk ücretli rezervasyon uçtan uca tamam (ödeme + QR + check-in)

### Lansman + 3 ay
- [ ] Aylık 100 rezervasyon
- [ ] Host geri gelme oranı > %70 (ilk deneyimden sonra ikinciyi de yayınlayan)
- [ ] Rezervasyon iptal oranı < %10
- [ ] Ortalama puan > 4,5

### Ürün sağlığı (sürekli)
- Rezervasyon akışı tamamlanma oranı (detay → ödeme)
- Ödeme hata oranı
- Arama sonucu boş dönme oranı — envanter yetersizliğinin erken sinyali

## 8. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| **Stripe hesabı açılamaz** | Proje durur | Faz 1'de başlat; Estonya OÜ yedek plan |
| Host bulunamaz (arz yok) | Ürün boş kalır | Lansmandan önce elle 20 host topla — kod değil saha işi |
| **Arz dağılır** | Her şehirde 2-3 deneyim → hiçbiri çalışmaz | Sistem global, arz odağı tek şehir. Boş şehir arama sonucu gösterme |
| Gezgin gelmez (talep yok) | Rezervasyon olmaz | Odak şehirde derinlik + SEO + host'ların kendi kitlesi |
| Çoklu ülke uyum yükü | Vergi/yasal karmaşa | Faz 10'a kadar sadece AB; AB dışı host'lar ikinci dalga |
| İki kişilik takım tükenir | Takvim kayar | Kapsam disiplini: v2 listesine dokunma |
| Rakip aynı şehre girer | Marj baskısı | Derinlik ve host ilişkisi kopyalanması zor |

**En büyük risk yazılım değil — arz.** Kod 13 haftada biter; 20 host bulmak
ondan zor olabilir. Host toplama işi Faz 1'de paralel başlamalı.

Global olmanın ikinci riski: **boş görünmek.** Kullanıcı kendi şehrini arayıp
sıfır sonuç görürse bir daha gelmez. Bunun ürün cevabı var — arama boş dönüyorsa
"yakındaki şehirler" veya "yakında burada da olacağız + haber ver" akışı.
Bu, Faz 4'te (keşif) tasarlanmak zorunda.

## 9. Karar bekleyen sorular

### Verilen kararlar

**Para birimi — sabit ana para birimi YOK.**
Host deneyimini hangi para biriminde satacağına kendi karar verir. Gezgin de
görüntüleme para birimini kendi seçer. Platform araya sabit bir para birimi koymaz.

> Teknik karşılığı: her fiyat `(tutar, para birimi)` çifti olarak saklanır.
> Görüntüleme kuru anlık çevrilir ama **tahsilat her zaman host'un para biriminde**
> yapılır — aksi halde kur farkı riskini platform üstlenir.

**Host özerkliği — her şeyi host ayarlar.**
Platform kural dayatmaz. Fiyat, grup büyüklüğü, süre, iptal politikası, dil,
para birimi — hepsi host'un kararı. Platformun işi altyapıyı vermek, ürünü
tanımlamak değil.

> Bunun sonucu: "max 8 kişi küçük grup" gibi bir konumlandırma kuralı **yok**.
> Farklılaşma başka yerden gelmeli (bkz. §6) — host'a daha adil komisyon ve
> gerçek yerel host olması.

**Host olma — onay süreci yok.**
Kullanıcı "host ol" der, deneyim yayınlar. Elle moderasyon kapısı yok.

> ⚠️ Bunun bilinen riski: kalitesiz veya sahte ilan. Karşılığı sonradan gelen
> kontroller — yorum/puan sistemi, şikayet mekanizması, ilk rezervasyon öncesi
> kimlik doğrulaması. Bunlar v2'de; şimdilik bilinçli olarak açık bırakıldı.

**Ödeme — şimdilik sahte sağlayıcı.**
Stripe hesabı henüz yok. Ödeme akışı uçtan uca **varmış gibi** çalışacak:
sepet, ödeme ekranı, sipariş durumu, iade — hepsi gerçek. Arkasındaki sağlayıcı
sahte. Hesap açıldığında sadece o katman değişir.

> Bu karar **şirket kaydını kritik yoldan çıkarır** — MVP artık evrak beklemiyor.
> Ama: sahte ödemeyle gerçek kullanıcıya açılamaz. Lansman öncesi Stripe şart.

**Platform dışı ödeme yasak — ihlalde ban.**
Host rezervasyonu platform üzerinden onaylamayıp parayı elden/nakit alırsa hesabı
kapatılır. Kural net: para platformdan geçer.

> Bu, pazar yerlerinin en bilinen sızıntısı (*disintermediation*). Host komisyon
> vermemek için gezgini platform dışına çekmek ister. Kuralı yazmak yetmez; teknik
> karşılığı olmadan uygulanamaz:
>
> | Gereken | Neden |
> |---|---|
> | Hesap durumu alanı (aktif / askıda / banlı) | Ban uygulanabilir olmalı |
> | Banlı host'un ilanları anında gizlenir | Ban görünür sonuç doğurmalı |
> | Banlı hesap yeniden kayıt olamaz | E-posta + ödeme kimliği eşleştirmesi |
> | Şikayet/bildirim akışı | Tespitin ana kaynağı gezgin olacak |
> | Anormal iptal örüntüsü uyarısı | "Sürekli iptal eden host" sinyali |
>
> Bunlar Faz 7'ye eklendi — MVP'de en azından **ban uygulanabilir** olmalı,
> yoksa kural sadece kâğıt üstünde kalır.

**Dil kapsamı — sınırsız, liste kodda tutulmaz.**
Avrupa dilleriyle sınırlı değil; Korece, Japonca ve sonrasında gelen her dil aynı
yoldan girer. Sistemde "desteklenen diller" diye bir enum yok — dil bir veri satırı.

> İki ayrı kapsam var, karıştırılmamalı: **içerik** dilinde kısıt yok (host hangi
> dilde yazarsa), **arayüz** çevirisi kademeli açılır (lansman EN + TR, sonrası
> talebe göre). Detay ve veri modeli: [I18N.md](I18N.md).

### Hâlâ karar bekleyen

1. **Arz odağı:** ilk 20 host hangi şehirden toplanacak?
2. **Komisyon oranı:** host'tan kaç %, gezginden hizmet bedeli var mı?
3. **Coğrafi kapsam sınırı:** ilk sürümde sadece AB host'ları mı? (vergi ve
   ileride Stripe KYC yükünü belirler)
4. **Arayüz dili sırası:** EN + TR'den sonra hangi dil? (çeviri iş yükü, arz
   odağı şehriyle uyumlu olmalı)
