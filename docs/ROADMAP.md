# Yol Haritası

Sıfırdan yayına kadar tüm iş listesi. Her satır bir **dikey dilim**: API + web
(+ ilgiliyse mobil) birlikte biter. Her satır bir GitHub issue olur.

**Takım:** 2 kişi. **Tahminler** ikisinin paralel çalıştığı varsayımıyla.

> **Universal kapsam kararı ([VISION.md](VISION.md) §4):** platform ilk günden çok
> dilli, çok para birimli, çok ülkeli. Bu yüzden i18n veri modeli, para birimi ve
> konum hiyerarşisi **öne çekildi** — Faz 8'e bırakılamaz, çünkü ikisi de
> `Experience` ve `Price` tablolarının şeklini değiştiriyor. Canlı sistemde
> `decimal Price` alanını çok para birimine çevirmek acı verici bir migration olur;
> baştan doğru kurmak neredeyse bedava.

---

## Özet takvim

| Faz | Konu | Süre | Bağımlılık |
|---|---|---|---|
| 0 | İskelet | ✅ bitti | — |
| 1 | Kimlik & hesap | 2 hafta | — |
| 2 | Deneyim yönetimi **+ çok dilli içerik + konum** | 3 hafta | Faz 1 |
| 3 | Müsaitlik & **çok para birimli fiyat** | 2 hafta | Faz 2 |
| 4 | Keşif & arama (global) | 2,5 hafta | Faz 2 |
| 5 | Rezervasyon | 2 hafta | Faz 3, 4 |
| 6 | Ödeme akışı (**sahte sağlayıcı**) | 1,5 hafta | Faz 5 |
| 7 | Operasyon (QR, cüzdan, bildirim, ban) | 2 hafta | Faz 5 |
| 8 | Arayüz çevirisi & SEO | 1,5 hafta | Faz 4 |
| — | **Demo sürüm çalışır** | **~14 hafta** | |
| 6b | **Gerçek Stripe Connect** | 2 hafta | ⏸ şirket kaydı |
| 9 | Mobil (Expo) | 3 hafta | Faz 6 |
| 10 | Prod sertleştirme | 2 hafta | hepsi |
| — | **Yayına hazır** | **~21 hafta (~5 ay)** | |

**İki not:**

- **Universal olmanın maliyeti ~2 hafta.** Sonradan eklemenin maliyeti bunun birkaç
  katı ve canlı veriyle uğraşmak zorunda kalırdın.
- **Sahte ödeme sayesinde şirket kaydı artık kritik yolda değil.** 14. haftada
  çalışan, gösterilebilir bir ürün oluyor. Ama Faz 6b bitmeden gerçek kullanıcıya
  açılamaz — sahte ödemeyle para toplanmaz.

---

## Faz 1 — Kimlik & hesap · 2 hafta

| # | İş | Not |
|---|---|---|
| 1.1 | E-posta + şifre ile kayıt | Argon2id/PBKDF2, şifre politikası |
| 1.2 | Giriş + JWT + **refresh token rotasyonu** | Eski projede refresh token yoktu |
| 1.3 | E-posta doğrulama | Tek kullanımlık token, süre sınırlı |
| 1.4 | Şifre sıfırlama | Aynı token altyapısı |
| 1.5 | Profil görüntüle / düzenle | Ad, kullanıcı adı, biyografi |
| 1.6 | Avatar yükleme | Faz 2'deki storage'ın ilk müşterisi |
| 1.7 | Rol modeli: gezgin ↔ host | Tek hesap iki rol; host olma akışı |
| 1.8 | Oturum koruması | Web route guard + API `[Authorize]` politikaları |
| 1.9 | Sosyal giriş (Google + Apple) | Apple, mobil store şartı — şimdi yapılırsa Faz 9 kolaylaşır |

**Çıktı:** Kullanıcı kayıt olur, giriş yapar, profilini yönetir.

---

## Faz 2 — Deneyim yönetimi (host) · 3 hafta

| # | İş | Not |
|---|---|---|
| 2.1 | Object storage altyapısı (S3/R2) | Presigned URL. **Base64 DB'ye yazma yok** |
| 2.2 | Deneyim oluştur (taslak) | Başlık, açıklama, süre, kapasite |
| 2.3 | **Çok dilli içerik veri modeli** | `ExperienceTranslation` + `Language` kayıt defteri; dil listesi kodda sabit DEĞİL. Tasarım: [I18N.md](I18N.md) |
| 2.4 | Görsel yükleme | Çoklu, sıralama, kapak seçimi, boyut/format doğrulama |
| 2.5 | Kategori & etiket | Sabit kategori listesi + serbest etiket |
| 2.6 | **Konum hiyerarşisi** | Ülke → şehir → koordinat. Global aramanın temeli; şehir serbest metin OLAMAZ |
| 2.7 | Yayınla / düzenle / arşivle | Taslak→yayın geçiş kuralları |
| 2.8 | Host: deneyimlerim listesi | Durum filtreli |

**Çıktı:** Host, istediği ülkede ve dilde deneyim yayınlayabilir.

**Neden 2.3 ve 2.6 burada:** İkisi de `Experience` tablosunun şeklini belirliyor.
Faz 8'e bırakılırsa canlı veriyle migration yapmak gerekir.

---

## Faz 3 — Müsaitlik & çok para birimli fiyat · 2 hafta

| # | İş | Not |
|---|---|---|
| 3.1 | Tekil müsaitlik (tarih + saat + kapasite) | |
| 3.2 | Haftalık tekrar şablonu | "Her salı 14:00" |
| 3.3 | Toplu kapatma / tatil günleri | |
| 3.4 | **Para birimli fiyat modeli** | Fiyat `(tutar, para birimi)` çifti. Host satış para birimini kendi seçer |
| 3.5 | Fiyat kuralları | Yetişkin/çocuk/bebek, tarihe göre fark |
| 3.6 | **Kur çevirisi (görüntüleme)** | Gezgin kendi para biriminde görür; **tahsilat host'un para biriminde** |
| 3.7 | Zaman dilimi yönetimi | Deneyim yerel saatinde; UTC saklanır |

**Çıktı:** Host takvimini ve fiyatını kendi para biriminde yönetir.

**Kur kuralı:** Çeviri sadece gösterim içindir. Tahsilat her zaman host'un para
biriminde yapılır — aksi halde kur farkı riskini platform üstlenir.

---

## Faz 4 — Keşif & arama (global) · 2,5 hafta

| # | İş | Not |
|---|---|---|
| 4.1 | Deneyim listeleme + sayfalama | Cursor tabanlı |
| 4.2 | **Ülke/şehir gezinme** | Global katalogda kaybolmadan daralma |
| 4.3 | Metin arama | Postgres full-text, dil duyarlı. **Çekçe stemmer'ı yok (Prag!), KO/JA'da parser yok** — [I18N.md](I18N.md) §4 |
| 4.4 | Filtreler | Tarih, fiyat (kur duyarlı), kategori, süre, **konuşulan dil** (ilan metninin dili değil — [I18N.md](I18N.md) §3) |
| 4.5 | Deneyim detay sayfası | Görseller, açıklama, takvim, host kartı |
| 4.6 | **Boş sonuç akışı** | "Burada henüz yok" → yakın şehirler + haber ver. Global olmanın en büyük ürün riski |
| 4.7 | Favoriler | |
| 4.8 | Sıralama | Popülerlik, fiyat, puan |

**Çıktı:** Gezgin, dünyanın herhangi bir yerinde arama yapıp sonuç alır —
sonuç yoksa bile eli boş dönmez.

---

## Faz 5 — Rezervasyon · 2 hafta

| # | İş | Not |
|---|---|---|
| 5.1 | Uygunluk + fiyat hesaplama endpoint'i | Tek doğruluk kaynağı sunucu |
| 5.2 | **Rezervasyon oluşturma** | Transaction + satır kilidi. Eski projenin en kritik hatası buradaydı |
| 5.3 | **Deneyimlerim** (gezgin) | Yaklaşan biletler + geçmiş işlemler. Prototip: `/deneyimlerim` |
| 5.4 | İptal + iptal politikası | Esnek / orta / katı |
| 5.5 | Host: gelen rezervasyonlar | Onay gerektiren mod dahil |
| 5.6 | Kapasite yarışı testi | Eşzamanlı istek altında integration test |

**Çıktı:** Rezervasyon uçtan uca çalışır (ödemesiz).

---

## Faz 6 — Ödeme akışı (sahte sağlayıcı) · 1,5 hafta

> **Karar:** Stripe hesabı henüz yok. Ödeme akışı uçtan uca **varmış gibi** kurulacak;
> arkasındaki sağlayıcı sahte. Bu, şirket kaydını kritik yoldan çıkarır —
> MVP artık evrak beklemiyor.

| # | İş | Not |
|---|---|---|
| 6.1 | `IPaymentProvider` soyutlaması | Tek arayüz: ödeme başlat, doğrula, iade et |
| 6.2 | `FakePaymentProvider` | Gerçekçi davranır: gecikme, başarısız kart, timeout senaryoları |
| 6.3 | Ödeme akışı (API + web) | Sepet → ödeme → sipariş durumu; **gerçek olan kısım bu** |
| 6.3b | **Makbuz yazıcı animasyonu** | Ödeme tamamlanınca bilet "yazdırılır" — referans: dqnamo.com/experiments/receipt-printer. Detay aşağıda |
| 6.4 | Sipariş durum makinesi | beklemede → ödendi → tamamlandı / iade edildi |
| 6.5 | Komisyon hesabı | Platform payı kayıtta tutulur, henüz tahsil edilmez |
| 6.6 | İade / kısmi iade | İptal politikasına bağlı |
| 6.7 | Host kazanç ekranı | Sahte de olsa gerçek rakamlarla |
| 6.8 | Ödeme hata senaryoları | Başarısız kart, timeout, çifte tıklama, idempotency |

**Çıktı:** Ödeme uçtan uca çalışıyor; sadece para gerçekten hareket etmiyor.

**Kritik tasarım kuralı:** Sahte sağlayıcı **sadece** `IPaymentProvider`'ın arkasında
yaşar. "Nasıl olsa sahte" diye kısayol alınmaz — idempotency, durum makinesi, hata
yolları gerçekmiş gibi yazılır. Aksi halde Stripe geldiğinde bu fazın tamamı yeniden
yazılır ve hiçbir şey kazanılmamış olur.

### Makbuz yazıcı animasyonu (6.3b)

Ödeme onaylandığında sonuç ekranı düz bir "başarılı" mesajı olmayacak: bilet, bir
yazarkasa makbuzu gibi kademeli olarak "yazdırılır". Referans:
[dqnamo.com/experiments/receipt-printer](https://www.dqnamo.com/experiments/receipt-printer).

Üç aşama: **işleniyor → yazdırılıyor → tamam**. Kağıt aşağı doğru adım adım
(stepped keyframe) beslenir, düz kayma değil — mekanik his buradan geliyor.
Alt kenar `clip-path` ile testere dişli (kopartılmış kağıt). Tipografi monospace.

Bunu bir süs olarak değil, üç sebeple yapıyoruz:

1. **Ödeme onayı beklerken geçen süreyi doldurur.** Sahte sağlayıcıda bile gecikme
   var (6.2), gerçek Stripe'ta daha fazla olacak — boş spinner yerine anlamlı hareket.
2. **Bilet zaten var.** Prototip `GlassTicket` + PDF üretimi (7.1b) hazır; makbuz
   aynı verinin ikinci sunumu, yeni veri modeli gerektirmiyor.
3. Paylaşılabilir bir an yaratır — ekran görüntüsü alınası bir onay ekranı.

**Kurallar:**

- `prefers-reduced-motion` açıksa animasyon çalışmaz, bilet doğrudan görünür.
  Sistemde bu zaten global olarak uygulanıyor (`globals.css`) — kontrol et, ezme.
- Animasyon **ödemenin durumunu temsil etmez.** Sipariş durumu sunucudan gelir;
  yazdırma bitmeden kullanıcı sayfadan ayrılırsa rezervasyon yine tamamdır.
  Animasyonu akışın kapısı yapmak, eski projenin "UI durumu = iş durumu" hatasıdır.
- Atlanabilir olmalı — tıklayınca sona atlar. 1,75 sn ilk seferde hoş, beşincide değil.

---

## Faz 6b — Gerçek Stripe Connect · 2 hafta · ⏸ şirket kaydı bekliyor

Sadece `IPaymentProvider`'ın ikinci implementasyonu. Lansman öncesi **zorunlu** —
sahte ödemeyle gerçek kullanıcıya açılamaz.

| # | İş | Not |
|---|---|---|
| 6b.1 | Connect Express onboarding | Host banka/kimlik doğrulaması Stripe'ta |
| 6b.2 | PaymentIntent + SCA/3DS | AB zorunluluğu |
| 6b.3 | Webhook işleme | **İdempotent** — Stripe aynı olayı tekrar gönderir |
| 6b.4 | Komisyon (`application_fee`) | Faz 6.5'te hesaplanan pay artık gerçekten kesilir |
| 6b.5 | Çoklu ülke payout | Host'un ülkesine göre KYC ve ödeme kuralları |
| 6b.6 | Makbuz / fatura | Ülke bazlı KDV |

---

## Faz 7 — Operasyon · 2 hafta

| # | İş | Not |
|---|---|---|
| 7.1 | QR bilet üretimi | İmzalı token; **tek kullanımlık**; üzerinde geçerlilik tarihi |
| 7.1b | **Bilet PDF'i** | İndirilebilir, yazdırılabilir. **API'de üretilir** — web ve mobil aynı belgeyi alır |
| 7.2 | Host check-in tarayıcısı | Host ekranında kamera; okutunca anında sonuç |
| 7.3 | Apple Wallet / Google Wallet bileti | `.pkpass` üretimi; telefonu açmadan bilet |
| 7.4 | E-posta bildirimleri | Onay, hatırlatma (24 sa), iptal, host bilgilendirme |
| 7.5 | Host dashboard | Rezervasyon sayısı, doluluk, kazanç özeti |
| 7.6 | Yorum & puan | Sadece katılım sonrası; host cevabı |
| 7.7 | **Hesap durumu ve ban altyapısı** | Aktif/askıda/banlı; banlı host'un ilanları gizlenir |
| 7.8 | Şikayet / bildirim akışı | Platform dışı ödeme ihbarının ana kaynağı |

### QR bilet davranışı (7.1 + 7.2)

Rezervasyon ödendiğinde bilet üretilir. Beklenen davranış:

- Bilet **imzalı** — içeriği değiştirilirse doğrulama başarısız olur
- **Tek okutmalık** — ikinci okutmada "bu bilet zaten kullanıldı" + ilk kullanım zamanı
- **Geçerlilik tarihi var** — deneyim gününden başka bir günde okutulursa uyarır
- Host tarayıcıda okutur → ekranda anında: geçerli / kullanılmış / yanlış tarih / geçersiz
- Kişi sayısı biletin üzerinde görünür (host kaç kişiyi aldığını görsün)
- İnternet yoksa da çalışmalı — host cihazı o günün biletlerini önden indirir
  (mobil tarafı Faz 9.5)

**Neden bu kadar detay:** Bilet doğrulaması yanlış çalışırsa host deneyim gününde
kapıda kalır. Tekrar okutulabilen bilet ise doğrudan gelir kaybı.

### PDF üretimi hakkında (7.1b)

Web'de çalışan bir prototip var (`/api/bilet/[code]/pdf`). Üretimde bu **API'ye
taşınacak** — iki ayrı üretici iki farklı bilet demektir, mobil ve web aynı
belgeyi indirmeli.

Prototipten çıkan iki ders:

1. **Font gömmek zorunlu.** PDF kütüphanelerinin varsayılan Helvetica'sı WinAnsi
   kodlaması kullanıyor; içinde `ğ ı ş İ` ve Çekçe `ě š č ř ů` yok. Universal bir
   platformda host adı bilet üzerinde bozuk çıkar.
2. **Büyük harf çevirimi dile bağlı.** `toUpperCase()` "Türkiye"yi "TÜRKIYE" yapar.
   Locale-duyarlı çevirim şart — her dilde ayrı ayrı patlayan sessiz bir hata.

**Çıktı:** Deneyim günü akışı tamam; platform kuralları uygulanabilir durumda.

---

## Faz 8 — Arayüz çevirisi & SEO · 1,5 hafta

| # | İş | Not |
|---|---|---|
| 8.1 | Arayüz çeviri altyapısı | **Hardcoded metin yok**; eksik anahtar derlemeyi kırar. İçerik modeli Faz 2.3'te geldi, bu arayüz katmanı |
| 8.2 | Dil seçimi ve algılama | Tarayıcı dili + kullanıcı tercihi; URL'de dil segmenti. **Türkçe route isimleri burada karara bağlanır** — [I18N.md](I18N.md) §5 |
| 8.3 | SEO | Metadata, sitemap, hreflang, structured data (Event/Offer) |
| 8.4 | Çoklu para birimi | Görüntüleme + tahsilat kuru ayrımı |
| 8.5 | Paylaşım kartları | OG görselleri |

**Çıktı:** Web MVP yayına hazır.

---

## Faz 9 — Mobil (Expo) · 3 hafta

| # | İş | Not |
|---|---|---|
| 9.1 | Expo kurulum + monorepo entegrasyonu | Metro config, paylaşılan tipler |
| 9.2 | Auth ekranları | Apple ile giriş dahil (store şartı) |
| 9.3 | Keşif + detay | |
| 9.4 | Rezervasyon + ödeme | Faz 6b bittiyse Stripe RN SDK, bitmediyse sahte sağlayıcı |
| 9.5 | QR bilet + Apple/Google Wallet | **Çevrimdışı erişim** — etkinlik alanında internet olmayabilir |
| 9.6 | Host check-in kamerası | Günün biletleri önden indirilir; çevrimdışı doğrulama |
| 9.7 | Push bildirim | |
| 9.8 | Store yayını | App Store + Play Store; gizlilik formları |

---

## Faz 10 — Prod sertleştirme · 2 hafta

| # | İş | Not |
|---|---|---|
| 10.1 | Rate limiting + güvenlik başlıkları | Login ve ödeme uçlarına özel |
| 10.2 | Observability | Hata takibi, yapılandırılmış log, uptime |
| 10.3 | GDPR/KVKK | Veri silme, dışa aktarma, çerez onayı, gizlilik metni |
| 10.4 | Yedekleme + geri yükleme provası | Yedek, geri yüklenmeden yedek sayılmaz |
| 10.5 | Deploy pipeline | Staging + prod, migration adımı dahil |
| 10.6 | Yük testi | Rezervasyon ucu hedef: eşzamanlı 100 istek |

---

## v2'ye bırakılanlar

Bilinçli olarak MVP dışında:

- Host ↔ gezgin mesajlaşma
- Tam admin / moderasyon paneli (temel ban altyapısı Faz 7'de)
- Kupon, indirim, hediye kartı
- Harita üzerinden arama
- Takvim senkronizasyonu (Google/iCal)
- Referans & sadakat programı
- Grup / özel rezervasyon talebi
- Bekleme listesi

---

## İki kişi nasıl paralel çalışır

Fazlar sıralı görünüyor ama içleri paralelleşir:

| Dönem | Kişi A | Kişi B |
|---|---|---|
| 1-2. hafta | Faz 1 API (auth, token) | Faz 1 web (ekranlar) + tasarım sistemi genişletme |
| 3-5. hafta | Faz 2 (host tarafı) | Faz 4 (keşif tarafı) |
| 6-7. hafta | Faz 3 (takvim) | Faz 4 devam + Faz 8.1 (i18n altyapısı) |
| 8-9. hafta | Faz 5 (rezervasyon) | Faz 7 (QR, bildirim) |
| 10-12. hafta | Faz 6 (ödeme) | Faz 8 (SEO, çokdillilik) |
| 13+ | Faz 9 mobil | Faz 10 prod |

**Çakışma riski yüksek dosyalar** (aynı anda dokunulmaz, önce haberleşin):
`AppDbContext`, `Directory.Packages.props`, migration'lar, `shared-types`.

---

## Bir sonraki adım

Faz 1'in 9 işi issue olarak açılır, ikiye bölünür, `feature/<no>-<slug>`
branch'leriyle başlanır. Ayrıntı: [FEATURE-WORKFLOW.md](FEATURE-WORKFLOW.md).
