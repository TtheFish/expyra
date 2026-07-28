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

## 4. Başlangıç pazarı

⚠️ **Karar verilmedi.** Konuşulan: Prag (ortak orada) + İstanbul (biz buradayız).

**Neden tek şehirle başlamalı:** İki taraflı pazar yerinin en zor problemi
yumurta-tavuk. 50 şehirde 3'er deneyim = kimse rezervasyon yapmaz. Tek şehirde
40 deneyim = o şehir çalışır, sonra kopyalanır.

**Önerilen:** Prag'la başla.
- Ortak orada — host bulma ve saha desteği fiziksel olarak mümkün
- Turist yoğunluğu yüksek, sezon uzun
- Ödeme altyapısı (Stripe/AB) zaten oraya kurulacak
- İstanbul ikinci şehir olur

## 5. Gelir modeli

⚠️ **Oranlar karar verilmedi.** Sektör standardı referansı:

| Kalem | Aralık | Not |
|---|---|---|
| Host komisyonu | %10-20 | Stripe Connect `application_fee` ile otomatik kesilir |
| Gezgin hizmet bedeli | %0-10 | Alınmayabilir; fiyatı şeffaf tutmak avantaj |
| Stripe işlem maliyeti | ~%1,5 + 0,25 € | AB kartları; bu bizim gideri |

**Örnek:** 50 € rezervasyon, %15 komisyon → 7,50 € brüt, ~6,25 € net.
Aylık 10.000 € hacim → ~1.250 € net gelir.

**Sonuç:** Bu iş hacimle çalışır. Başabaş için gereken aylık rezervasyon
hacmini hesaplamak, fiyatlandırma kararının kendisidir.

## 6. Farklılaşma

Rakipler: GetYourGuide, Viator, Airbnb Experiences, Withlocals, Klook.

Onlarla envanter yarışı kazanılmaz — 10 yıl ve yüz milyonlarca dolar öndeler.
Kazanılabilecek yer **daralma**:

1. **Tek şehirde derinlik** — Prag'da onlarda olmayan 40 deneyim
2. **Küçük grup zorunluluğu** — max 8 kişi kuralı, ürünün kimliği olur
3. **Host'a daha adil komisyon** — büyük platformlar %20-30 alıyor
4. **Gerçekten yerel host doğrulaması** — acente değil, birey

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
| Gezgin gelmez (talep yok) | Rezervasyon olmaz | Tek şehir + SEO + host'ların kendi kitlesi |
| İki kişilik takım tükenir | Takvim kayar | Kapsam disiplini: v2 listesine dokunma |
| Rakip aynı şehre girer | Marj baskısı | Derinlik ve host ilişkisi kopyalanması zor |

**En büyük risk yazılım değil — arz.** Kod 13 haftada biter; Prag'da 20 host
bulmak ondan zor olabilir. Host toplama işi Faz 1'de paralel başlamalı.

## 9. Karar bekleyen sorular

Bunlar netleşmeden Faz 4 tasarımı eksik kalır:

1. **Başlangıç şehri:** Prag mı, İstanbul mu, ikisi mi?
2. **Komisyon oranı:** host'tan kaç %, gezginden hizmet bedeli var mı?
3. **Para birimi:** ana para birimi EUR mu, CZK mi?
4. **Grup büyüklüğü:** "küçük grup" bir kural mı, yoksa host'a mı bırakılıyor?
5. **Host doğrulama:** kimlik doğrulaması zorunlu mu, elle onay var mı?
