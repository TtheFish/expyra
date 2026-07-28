# Yol Haritası

Sıfırdan yayına kadar tüm iş listesi. Her satır bir **dikey dilim**: API + web
(+ ilgiliyse mobil) birlikte biter. Her satır bir GitHub issue olur.

**Takım:** 2 kişi. **Tahminler** ikisinin paralel çalıştığı varsayımıyla.

---

## Özet takvim

| Faz | Konu | Süre | Bağımlılık |
|---|---|---|---|
| 0 | İskelet | ✅ bitti | — |
| 1 | Kimlik & hesap | 2 hafta | — |
| 2 | Deneyim yönetimi | 2,5 hafta | Faz 1 |
| 3 | Müsaitlik & takvim | 1,5 hafta | Faz 2 |
| 4 | Keşif & arama | 2 hafta | Faz 2 |
| 5 | Rezervasyon | 2 hafta | Faz 3, 4 |
| 6 | Ödeme (Stripe Connect) | 2,5 hafta | Faz 5 + **şirket kaydı** |
| 7 | Operasyon (QR, bildirim, yorum) | 1,5 hafta | Faz 5 |
| 8 | Çokdillilik & SEO | 1,5 hafta | Faz 4 |
| — | **Web MVP yayında** | **~13 hafta** | |
| 9 | Mobil (Expo) | 3 hafta | Faz 6 |
| 10 | Prod sertleştirme | 1,5 hafta | hepsi |
| — | **Tam sürüm** | **~18 hafta (~4,5 ay)** | |

**Kritik yol uyarısı:** Faz 6 Stripe hesabına, o da şirket kaydına bağlı.
Kayıt işlemini **Faz 1 başlarken** başlat — yoksa Faz 5 bitince beklemede kalırız.

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

## Faz 2 — Deneyim yönetimi (host) · 2,5 hafta

| # | İş | Not |
|---|---|---|
| 2.1 | Object storage altyapısı (S3/R2) | Presigned URL. **Base64 DB'ye yazma yok** |
| 2.2 | Deneyim oluştur (taslak) | Başlık, açıklama, süre, kapasite, dil |
| 2.3 | Görsel yükleme | Çoklu, sıralama, kapak seçimi, boyut/format doğrulama |
| 2.4 | Kategori & etiket | Sabit kategori listesi + serbest etiket |
| 2.5 | Konum | Adres + koordinat; buluşma noktası açıklaması |
| 2.6 | Yayınla / düzenle / arşivle | Taslak→yayın geçiş kuralları |
| 2.7 | Host: deneyimlerim listesi | Durum filtreli |

**Çıktı:** Host deneyim yayınlayabilir.

---

## Faz 3 — Müsaitlik & fiyat · 1,5 hafta

| # | İş | Not |
|---|---|---|
| 3.1 | Tekil müsaitlik (tarih + saat + kapasite) | |
| 3.2 | Haftalık tekrar şablonu | "Her salı 14:00" |
| 3.3 | Toplu kapatma / tatil günleri | |
| 3.4 | Fiyat kuralları | Yetişkin/çocuk/bebek, tarihe göre fark |
| 3.5 | Zaman dilimi yönetimi | Deneyim yerel saatinde; UTC saklanır |

**Çıktı:** Host takvimini yönetir, fiyat belirler.

---

## Faz 4 — Keşif & arama · 2 hafta

| # | İş | Not |
|---|---|---|
| 4.1 | Deneyim listeleme + sayfalama | Cursor tabanlı |
| 4.2 | Metin arama | Postgres full-text; ayrı arama motoru gerekmiyor |
| 4.3 | Filtreler | Şehir, tarih aralığı, fiyat, kategori, süre, dil |
| 4.4 | Deneyim detay sayfası | Görseller, açıklama, takvim, host kartı |
| 4.5 | Favoriler | |
| 4.6 | Sıralama | Popülerlik, fiyat, puan |

**Çıktı:** Gezgin deneyim bulur ve inceler.

---

## Faz 5 — Rezervasyon · 2 hafta

| # | İş | Not |
|---|---|---|
| 5.1 | Uygunluk + fiyat hesaplama endpoint'i | Tek doğruluk kaynağı sunucu |
| 5.2 | **Rezervasyon oluşturma** | Transaction + satır kilidi. Eski projenin en kritik hatası buradaydı |
| 5.3 | Rezervasyonlarım (gezgin) | Yaklaşan / geçmiş |
| 5.4 | İptal + iptal politikası | Esnek / orta / katı |
| 5.5 | Host: gelen rezervasyonlar | Onay gerektiren mod dahil |
| 5.6 | Kapasite yarışı testi | Eşzamanlı istek altında integration test |

**Çıktı:** Rezervasyon uçtan uca çalışır (ödemesiz).

---

## Faz 6 — Ödeme · Stripe Connect · 2,5 hafta

> **Ön koşul:** şirket kaydı + Stripe platform hesabı. Bu faz koda değil,
> evrağa bağlı — erken başlat.

| # | İş | Not |
|---|---|---|
| 6.1 | Connect Express onboarding | Host banka/kimlik doğrulaması Stripe'ta |
| 6.2 | Checkout / PaymentIntent | SCA + 3DS zorunlu (AB) |
| 6.3 | Webhook işleme | **İdempotent** — Stripe aynı olayı tekrar gönderir |
| 6.4 | Komisyon (application fee) | Platform payı |
| 6.5 | İade / kısmi iade | İptal politikasına bağlı |
| 6.6 | Host kazanç & payout ekranı | |
| 6.7 | Makbuz / fatura | AB KDV kuralları |
| 6.8 | Ödeme hata senaryoları | Başarısız kart, timeout, çifte tıklama |

**Çıktı:** Para akıyor, host ödeme alıyor.

---

## Faz 7 — Operasyon · 1,5 hafta

| # | İş | Not |
|---|---|---|
| 7.1 | QR bilet üretimi | İmzalı, tekrar kullanılamaz |
| 7.2 | Host check-in | QR doğrulama + manuel liste |
| 7.3 | E-posta bildirimleri | Onay, hatırlatma (24 sa), iptal, host bilgilendirme |
| 7.4 | Host dashboard | Rezervasyon sayısı, doluluk, kazanç özeti |
| 7.5 | Yorum & puan | Sadece katılım sonrası; host cevabı |

**Çıktı:** Deneyim günü akışı tamam.

---

## Faz 8 — Çokdillilik & SEO · 1,5 hafta

| # | İş | Not |
|---|---|---|
| 8.1 | i18n altyapısı | EN + CS + TR. **Hardcoded metin yok** |
| 8.2 | Çok dilli deneyim içeriği | Host birden fazla dilde açıklama girebilir |
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
| 9.4 | Rezervasyon + ödeme | Stripe React Native SDK |
| 9.5 | QR bilet | **Çevrimdışı erişim** — etkinlik alanında internet olmayabilir |
| 9.6 | Host check-in kamerası | |
| 9.7 | Push bildirim | |
| 9.8 | Store yayını | App Store + Play Store; gizlilik formları |

---

## Faz 10 — Prod sertleştirme · 1,5 hafta

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
- Admin / moderasyon paneli
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
