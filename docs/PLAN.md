# Ürün Planı — feature blokları

> **Bu dosya ile [ROADMAP.md](ROADMAP.md) farkı:** ROADMAP *ne yapılacak* listesi,
> fazlara bölünmüş. Bu dosya *hangi sırayla ve neden* — her blok hem misafir hem
> host tarafını kapsayan bir **dikey dilim** ([FEATURE-WORKFLOW.md](FEATURE-WORKFLOW.md)).
> İkisi çelişirse §"ROADMAP ile farklar" bölümü kazanır; oradaki her fark
> gerekçesiyle yazılı.
>
> Envanter **koddan** çıkarıldı, ROADMAP'ten değil: "planda var" ile "kodda var"
> ayrı şeyler.

---

## Nerede duruyoruz

**Yapıldı (gerçekten çalışıyor, koddan doğrulandı)**
- Şifresiz kimlik: `POST /api/auth/request-code|verify-code|refresh|sign-out`, `GET /api/auth/me` — `apps/api/src/Expyra.WebApi/Features/Auth/AuthController.cs`
- Refresh ailesi + rotasyon + yeniden kullanım tespiti + ban kapısı (`VerifyLoginCodeCommand.cs`, `RefreshSessionCommand.cs`)
- Kimlik uçlarında hız sınırı + e-posta/IP kotaları (`RateLimiterExtensions.cs` + `login_code` sayaç index'leri)
- Dil kayıt defteri: `language` tablosu, 49 satır seed, `GET /api/languages` (`LanguageSeedData.cs`)
- Eşzamanlılık altyapısı: `BeginTransactionAsync` + `FindForUpdateAsync` + `AcquireAdvisoryLockAsync` (`Expyra.Infrastructure/Persistence/AppDbContext.cs`) — testli (`LoginCodeConcurrencyTests.cs`)
- Web BFF + oturum yenileme: `apps/web/src/features/auth/` (10 dosya) + `apps/web/src/proxy.ts`
- Lokalize URL altyapısı: `apps/web/src/lib/routes.ts` + `route-map.json` + `next.config.ts` rewrite/301 (ROADMAP 8.2'nin URL yarısı **erken bitmiş**)
- Tasarım sistemi: `components/ui/glass-*`, tema, video wallpaper, erişilebilir arama bileşenleri
- ~72 test metodu (unit + integration), `GlobalExceptionHandler`, ProblemDetails

**Prototip (ekran var, veri sahte)**

> Bu envanter Temmuz'da çekilmiş bir fotoğraftı ve eskidi; aşağıdaki üstü çizili
> satırlar Blok 5-6'da eritildi. Silinmiyor çünkü hangi prototipin ne zaman
> gerçeğe döndüğü, "bu ekran hep böyle miydi" sorusunun tek kaydı.

- ~~Ana sayfa vitrini + `/kesfet` — veri `apps/web/src/lib/experiences.ts`~~ → **Blok 5**: dosya silindi, ikisi de gerçek API'den besleniyor
- ~~Host paneli `/host-ol` — `draftExperiences` sabiti, düğmeler `disabled`~~ → **Blok 5**: gerçek ilan listesi, çalışan sihirbaz
- Bilet + PDF — `apps/web/src/lib/ticket.ts` (`DEMO_TICKETS`), `lib/ticket-pdf.ts`, `app/api/bilet/[code]/pdf/route.ts`
- Arama çubuğu — tarih alanı sonuca etki etmiyor; şehir serbest metin
- QR — `ticketPayload()` imzasız düz URL, işaret ettiği `/dogrula/[code]` sayfası **yok**
- Dil seçici — 49 dilin 47'si yalnız çerez yazıyor (dürüstçe belirtilmiş)

**Hiç yok**
- Domain'de: `Experience`, `Translation`, `Location/Country/City`, `Category`, `Currency/Money`, `Availability`, `Booking`, `Order/Payment`, `Ticket`, `Review`, `Favorite`, `Report`, `app_user.roles`
- Object storage (paket bile yok), background job/scheduler, gerçek e-posta göndericisi, outbox
- Rol bazlı yetki (`AddAuthorization()` çıplak, tek `[Authorize]` var)
- `pg_trgm` / `unaccent` / `tsvector` — repoda tek satır geçmiyor
- Web'de: deneyim detay sayfası, çıkış butonu (route var, tetikleyen yok), profil sayfası, `not-found.tsx`/`error.tsx`, `sitemap.ts`/`robots.ts`, tek bir test dosyası
- `apps/mobile/` yalnız `README.md`; `packages/shared-types` yalnız `Paginated<T>` + `ProblemDetails` (`api.generated.ts` üretilmemiş)
- `docker-compose.yml` yok; `scripts/db-up.sh` **Homebrew'a bağlı** (`brew services start postgresql@16`) — bu makine Windows

---

## Yolculuk haritası

| Misafir adımı | Host adımı | Durum | Blok |
|---|---|---|---|
| Hesap aç / gir | Hesap aç / gir | ✅ TAMAM | — |
| Giriş yaptığını görür, çıkar, adını düzenler | aynı ekran | ✅ TAMAM | 1 |
| — | "Host ol" der, host olur | ✅ TAMAM | 2 |
| Arayüzü kendi dilinde görür | aynı | ✅ TAMAM | 3 |
| Şehir seçer (gerçek şehir) | Şehir/kategori seçer | ✅ TAMAM | 4 |
| Deneyimi listede görür + **detayını açar** | Deneyim taslağı yazar, yayınlar | ✅ TAMAM | 5 |
| Görselleri görür | Görsel yükler, kapak seçer | ✅ TAMAM | 6 |
| Tarih-saat seçer, fiyatı kendi para biriminde görür | Takvim + fiyat girer | ❌ yok | **7** |
| Arar, filtreler, boş sonuçta yönlendirilir | (tek taraflı) | ⚠️ prototip | **8** |
| Rezervasyon yapar | Gelen rezervasyonu görür/onaylar | ❌ yok | **9** |
| Onay e-postası alır | "Yeni rezervasyon" e-postası alır | ❌ yok | **10** |
| Öder, makbuz animasyonunu görür | Kazancını görür | ❌ yok | **11** |
| Biletini/QR'ını gösterir | QR okutur, check-in yapar | ⚠️ prototip / ❌ yok | **12** |
| İptal eder, iade alır | İptal politikasını belirler, iptali görür | ❌ yok | **13** |
| Puan/yorum yazar | Yoruma cevap verir | ❌ (buton `disabled`) | **14** |
| Favoriye ekler, "haber ver" der | (tek taraflı) | ❌ yok | **15** |
| Şikayet eder | Banlanır, ilanları gizlenir | ⚠️ ban kapısı var, araç yok | **16** |
| Paylaşır, Google'dan bulur | ilanı indekslenir | ❌ yok | **17** |
| Gerçek kartla öder | Payout alır | ❌ ⏸ şirket kaydı | **18** |
| Mobil uygulama | Mobil check-in (çevrimdışı) | ❌ yok | **19** |

**Boyut ölçeği:** S ≈ 1-2 gün / 1 kişi · M ≈ 3-5 gün · L ≈ 1-2 hafta (tek kişi, PR'lara bölünmüş).

---

## Feature blokları

### Blok 1 — Oturum görünür olur · M

**Ne:** "Giriş yaptım ve bunu görüyorum; adımı düzenleyebiliyorum; çıkabiliyorum." Bu blokta misafir ile host **aynı kişidir** — rol ayrımı henüz yok, ekran tek.

**Ön koşul:** Yok. Bugün yazılabilir, migration gerektirmez.

**Misafir tarafı (= host tarafı):**
- API: `GET /api/auth/me` **var, bağlanacak**. Yeni: `PATCH /api/users/me` (`DisplayName`, `PreferredLanguage`) — ROADMAP 1.5'in yazma yarısı.
- Web: `components/brand/site-header.tsx` sunucuda oturumu okur (`features/auth/session.ts`), avatar/ad + hesap menüsü basar; menüde `POST /cikis` gönderen form (bugün `SIGN_OUT_PATH` ölü export, `features/auth/return-to.ts:30`).
- Yeni sayfa: `/tr/hesap` · `/en/account` — `route-map.json`'a satır; profil görüntüle/düzenle.
- `my-experiences`, `sign-in`, `how-it-works` kendi header kopyalarını bırakıp `SiteHeader`/`SiteFooter` kullanır (bugün bu 3 sayfada dil seçici ve tema düğmesi yok).
- Dürüstlük düzeltmeleri: `explore/page.tsx` `tarih` parametresi ya filtreye girer ya arayüzden kalkar; `app/api/bilet/[code]/pdf/route.ts`'e oturum kontrolü (bugün kodu bilen herkes indiriyor — yalnız `Cache-Control: private, no-store` var); QR'ın işaret ettiği `/dogrula` yokken bilet üstünde "demo" ibaresi.
- `app/[lang]/not-found.tsx`, `error.tsx`, `app/global-error.tsx`, `loading.tsx`.

**Veri modeli:** Değişiklik yok. (Bu blok bilinçli olarak migration'sız — Blok 2'nin migration'ıyla çakışmasın.)

**Bu işe DAHİL DEĞİL:** E-posta değiştirme (step-up OTP ister), avatar (Blok 6), rol/host paneli (Blok 2), biyografi/kullanıcı adı alanları.

**Kabul kriterleri:**
1. Giriş yapmış kullanıcı her sayfada adını görür; giriş yapmamış kullanıcı "Giriş yap" görür.
2. Menüdeki çıkış → API'de refresh ailesi iptal + çerezler silinmiş + ana sayfaya 303.
3. `PATCH /api/users/me` ile değişen ad, aynı oturumda header'da görünür.
4. `/tr/xx-olmayan-sayfa` ve `/xx/kesfet` **404** döner, 500 değil (bugün doğrulanmadı — `app/[lang]/layout.tsx:76` `notFound()` çağırıyor).
5. Başkasının bilet kodunun PDF'i **401/404** döner.
6. `pnpm check` yeşil.

**Riskler / tuzaklar:** Header oturum okuyunca sayfalar dinamik render'a düşer — statik olması gereken sayfalarda (ana sayfa, nasıl-çalışır) header'ı ayrı bir dinamik sınıra al, tüm sayfayı dinamikleştirme. Yeni metinler JSX'e gömülmesin: `features/auth/messages.ts` kalıbı kullanılsın (kalıcı çözüm Blok 3).

---

### Blok 2 — Host rolü ve yetki kapısı · S · **TEK TARAFLI (host)**

**Ne:** Kullanıcı "Host ol" der ve o andan itibaren host uçlarına erişebilir.

**Neden tek taraflı:** Misafir tarafında karşılığı yok — misafir zaten varsayılan roldür. Bu blok bir ürün özelliği değil, **3-16 arası her host ucunun önündeki kapı**: bugün hiçbir uç "bu isteği yapan host mu" sorusunu cevaplayamaz (`ICurrentUser` yalnız `UserId` veriyor, JWT'de rol claim'i yok, tanımlı tek bir authorization policy yok).

**Ön koşul:** Blok 1 (hesap menüsü, "Host ol" düğmesinin yeri).

**Host tarafı:**
- API: migration `AddUserRoles` → `app_user.roles`. `POST /api/host/activate` (idempotent). `JwtTokenService`'e rol claim'i, `AuthenticationExtensions`'a `AddPolicy("Host")`, `ICurrentUser.RequireHostId()`.
- Web: `become-a-host/page.tsx`'teki "Host ol" gerçek çağrı yapar; `proxy.ts` `PROTECTED_PAGES`'e host sayfaları eklenir (sayfa kimliği üzerinden — mevcut doğru kalıp).

**Misafir tarafı:** Yalnız navigasyon: host olan kullanıcı menüsünde "Host paneli" görünür.

**Veri modeli:** `app_user.roles`. **Karar gerekiyor (docs'ta yok):** `text[]` sütun (`roles @> ARRAY['Host']` ile sorgulanır, EF/Npgsql destekliyor) vs. `user_role` join tablosu. Öneri: `text[]` — rol sayısı az, sorgu nadir, migration tek sütun.

**Bu işe DAHİL DEĞİL:** Admin rolü ekranları (Blok 16'da sadece uç), host doğrulama/KYC (Blok 18), host profil sayfası.

**Kabul kriterleri:**
1. Host olmayan kullanıcı bir host ucuna **403** alır (integration test).
2. "Host ol" ikinci kez çağrılınca 200/204, çift satır yok.
3. Rol edindikten sonra kullanıcı **yeniden giriş yapmadan** host uçlarını kullanabilir.
4. `POST /api/auth/refresh` rolü koruyarak yeni token üretir.

**Riskler / tuzaklar:** Rol claim'i access token'a yazılırsa "host oldum ama 15 dakika kullanamıyorum" olur — **`POST /api/host/activate` dönüşünde refresh rotasyonunu tetikle** ve yeni token'ı çereze yaz. Alternatif: rolü token'a hiç koymayıp her istekte DB'den okumak (basit ama her uçta bir sorgu). Karar bu blokta verilmeli, sonradan değiştirmek tüm uçları etkiler.

---

### Blok 3 — Arayüz metin altyapısı (i18n) · M · **ÇAPRAZ (iki taraf)**

**Ne:** Arayüzdeki her metin anahtar üzerinden gelir; `/en/...` gerçekten İngilizcedir.

**Ön koşul:** Blok 1 (yeni sayfalar bu altyapıyla yazılsın).

**Kapsam (iki taraf ortak):**
- `apps/web/src/lib/i18n/` — dil başına ayrı yüklenen sözlük, tipli anahtarlar; **eksik anahtar derlemeyi kırar** (I18N §5 kuralı).
- `features/auth/messages.ts` bu yapıya taşınır (bugünkü tek doğru örnek, referans kalıp).
- `Intl` sarmalayıcıları: `formatDate/formatNumber/formatMoney(locale, ...)` — `lib/ticket.ts`, `lib/ticket-pdf.ts:26` (`const LOCALE = 'tr-TR'`), `lib/experiences.ts` içindeki sabit `'tr-TR'` parametreye döner.
- API tarafı: `LoginCodeEmailComposer` kalıbı genelleştirilir (e-posta metinleri kullanıcının `PreferredLanguage`'ında) — Blok 10 buna yaslanacak.
- Sorgu parametresi adları: `?nerede=&tarih=&yetiskin=&cocuk=` ve `?donus=` bugün `/en` altında da Türkçe. **Öneri:** `route-map.json`'a `params` bölümü eklenip `path()` çevirsin (mevcut "tek kaynak" kalıbının aynısı). Ucuz alternatif: her iki dilde de kanonik İngilizce parametre adı — dil kimliğini slug taşıyor.

**Veri modeli:** Yok. (`language.UiAvailable` zaten var: `tr` + `en`.)

**Bu işe DAHİL DEĞİL:** Prototip sayfaların (`explore`, `become-a-host`, `my-experiences`) çevirisi — bunlar Blok 5-9'da zaten yeniden yazılıyor, iki kez çevrilmesin. Yeni arayüz dili eklemek (tr+en dışına çıkmak). İçerik çevirisi (o Blok 5).

**Kabul kriterleri:**
1. Sözlükten bir anahtar silinince `pnpm check` **kırılır**.
2. `/en/explore` ve `/en/account` tek bir Türkçe dizge içermez.
3. Dil değiştirince kullanıcı aynı sayfada kalır (`switchLanguage` zaten var) ve parametreler kaybolmaz.
4. Bilet PDF'i `en` locale'inde üretilince tarih ve büyük harfler İngilizce kurala göre çıkar (`toUpperCase` Türkçe İ tuzağı korunur).

**Riskler / tuzaklar:** Dil seçicideki 49 dil **içerik** dilidir, URL'e girecek küme arayüz dilleridir (I18N §5.2) — 47 dil için slug üretme. Anahtar isimlendirmesi baştan feature bazlı olsun (`experience.detail.bookButton`), sayfa bazlı değil; blok 5-14 hepsi buraya yazacak.

---

### Blok 4 — Yer, kategori ve para birimi kayıt defteri · M

**Ne:** Misafir "Nereye?" alanına gerçek bir şehir seçer; host aynı seçiciyi Blok 5'te kullanır. Sistemde artık serbest metin şehir ve kodda gömülü para birimi yok.

**Ön koşul:** Yok (referans veri, hiçbir şeye bağımlı değil) — ama Blok 5'ten **önce** bitmeli.

**Misafir tarafı:**
- API: `GET /api/places/countries`, `GET /api/places/cities?q=&country=` (aksan duyarsız, alias eşleşmeli), `GET /api/categories`, `GET /api/currencies`. Hepsi anonim ve cache'lenebilir.
- Web: `components/search/experience-search.tsx` içindeki serbest metin alanı şehir seçiciye döner (mevcut `language-picker.tsx`'in aksan duyarsız arama kalıbı kopyalanır).

**Host tarafı:** Bu blokta ekran yok — aynı seçici bileşeni Blok 5'te host formunda kullanılır. **Blok tek taraflı görünüyor ama tek taraflı değil**: ürettiği veri ve bileşen iki tarafta da tüketiliyor, host tüketicisi bir blok sonra geliyor.

**Veri modeli:** `country` (ISO 3166-1 alpha-2 PK, `Language` kalıbı), `city` (`CountryCode` FK, `Latitude`, `Longitude`, `TimeZoneId`), `city_alias` (arama/çok dillilik için: Prag/Prague/Praha), `currency` (ISO 4217 PK + `MinorUnits` + `Symbol`), `category` (slug PK).

**Bu işe DAHİL DEĞİL:** Harita, coğrafi yakınlık sorgusu (Blok 8'de kullanılacak, koordinat burada saklanıyor), serbest etiket (`experience_tag` → Blok 5), kur oranı kaynağı (Blok 7).

**Kabul kriterleri:**
1. "prag", "Praha", "Prague" üçü de aynı şehir satırını döndürür.
2. `GET /api/places/cities` 20 satırdan uzun cevap dönmez (limitli autocomplete).
3. Şehir seçilmeden arama yapılamaz veya seçilmeyen metin sunucuda **sessizce yok sayılmaz** (400 ya da "şehir bulunamadı" akışı).
4. `currency` satırında JPY `MinorUnits = 0`, KWD `= 3`.

**Riskler / tuzaklar:**
- **Seed'i `HasData` ile migration'a gömme.** 49 dil için doğruydu; binlerce şehir için migration dosyasını şişirir ve her düzeltme yeni migration olur. Ayrı idempotent seed komutu (`dotnet run -- seed places`) öner.
- **Kategori adları bizim metnimiz, host'un değil** → çeviri DB'de değil, Blok 3'ün sözlüğünde. DB'de yalnız slug. (I18N'in içerik/arayüz ayrımının doğru uygulanışı.)
- **Şehir adının çok dilliliği I18N.md'de kapsanmıyor** — `city_alias` bunun en ucuz cevabı; kararı bu blokta ver, Blok 8'de fark etme.
- **Para birimi tutarı: `bigint` minör birim mi, `numeric` mi?** `decimal(18,2)` seçilirse JPY yanlış, KWD yuvarlanır. Öneri: `bigint` minör birim + `Money(AmountMinor, CurrencyCode)` owned type. **Bu karar Blok 7'ye girmeden kapanmalı.**
- Şehir listesinin genişliği arz odağı şehir kararına bağlı (VISION §9 açık soru) — başlangıçta ülkelerin tamamı + odak ülkenin şehirleri yeter.

---

### Blok 5 — Deneyim var olur · L · *(iki PR: 5a şema+host, 5b misafir okuma)*

**Ne:** Host deneyim taslağı yazar, çevirisini girer, yayınlar ↔ misafir onu listede görür ve **detay sayfasını açar**.

**Ön koşul:** Blok 2 (rol kapısı), Blok 3 (metin altyapısı), Blok 4 (şehir/kategori).

**Host tarafı:**
- API: `POST /api/host/experiences` (taslak), `PATCH /api/host/experiences/{id}`, `PUT /api/host/experiences/{id}/translations/{lang}`, `POST .../publish`, `POST .../archive`, `GET /api/host/experiences?status=`
- Web: `/tr/host/deneyim/yeni` sihirbazı (temel bilgi + ilk çeviri + şehir + kategori + konuşulan diller), `become-a-host` sayfasındaki `draftExperiences` sabiti **gerçek listeye döner**, "Düzenle" `disabled` kalkar.

**Misafir tarafı:**
- API: `GET /api/experiences?city=&cursor=` (cursor tabanlı sayfalama), `GET /api/experiences/{slug}`
- Web: ana sayfa vitrini + `/kesfet` gerçek veriye bağlanır (`lib/experiences.ts` **prototip burada ölür**), yeni `/tr/deneyim/[slug]` · `/en/experience/[slug]` detay sayfası, `experience-card.tsx`'e `glass-interactive` ve link geri gelir — **bugünkü en büyük kopukluk burada kapanır**.

**Veri modeli:** `experience` (HostId, CityId, CategoryId, DurationMinutes, Capacity, TimeZoneId (şehirden türer), OriginalLanguage, Status: Draft/Published/Archived, Slug), `experience_translation` ((ExperienceId, Language) bileşik PK, Title, Description, Source: HostWritten/Machine, UpdatedAt), `experience_spoken_language` (join tablosu — **dizi değil**, aksi halde `language.code`'a FK konamaz ve Blok 8'deki "İngilizce konuşulan" filtresi tipolu satırları sessizce eler), `experience_tag`.

**Bu işe DAHİL DEĞİL:** Görsel (Blok 6 — kart kapağı şimdilik mevcut `tone` gradyanı), takvim/fiyat (Blok 7), arama/filtre (Blok 8), makine çevirisi (yalnız `Source` alanı hazır), iptal politikası alanı (Blok 13), favori/puan.

**Kabul kriterleri:**
1. Yayınlama doğrulaması: `OriginalLanguage` için çeviri satırı, şehir, kategori, `Capacity > 0` yoksa **409/400**, taslak yayınlanmaz (I18N §2 kuralı).
2. Fallback zinciri sunucuda çözülür: `de-AT` → `de` → `OriginalLanguage` → `en`; istemciye tek çeviri gider ve arayüz "Bu açıklama Türkçe" rozetini gösterir.
3. Yayınlanmamış deneyim misafir için **404**; başka host'un taslağı da **404** (403 değil — enumeration).
4. Detay sayfası SSR'da tek sorguda dolar (N+1 yok), `alternateLinks` ile hreflang basar.
5. Ana sayfa ve `/kesfet` artık `lib/experiences.ts`'i import etmez (dosya silinir).

**Riskler / tuzaklar:**
- **`experience` tablosunda `title`/`description` sütunu HİÇ olmamalı.** ROADMAP'te 2.2 (başlık/açıklama) 2.3'ten önce listeli; ayrı migration'lara bölünürse 2.3 canlı veri migration'ına döner. **2.2 + 2.3 tek migration.**
- `experience_translation` bileşik PK → `FindForUpdateAsync` **kullanılamaz** (`AppDbContext.cs:126` "tek sütunlu birincil anahtar" kontrolü). Çeviri satırında oku-değiştir-yaz gerekirse `experience` satırını kilitle.
- Navigation property yok kuralı (`UserConfiguration.cs` kararı) — açık join'lerle devam.
- Slug üretimi invariant culture ile (Türkçe `İ`/`ı` tuzağı, `EmailAddress.cs`/`LanguageCode.cs` kalıbı hazır); slug `OriginalLanguage` başlığından + kısa sonek, dile göre değişmez.
- `AppDbContext`'e 4 DbSet ekleniyor — FEATURE-WORKFLOW §2.3 çakışma dosyası, aynı anda ikinci migration üretilmesin.

---

### Blok 6 — Görseller ve avatar · M

**Ne:** Host kapak + galeri görseli yükler ↔ misafir gerçek fotoğrafı görür. Aynı altyapı avatarı da taşır (ROADMAP 1.6).

**Ön koşul:** Blok 5.

**Host tarafı:** `POST /api/host/experiences/{id}/media/upload-url` (presigned), `POST .../media` (kayıt + doğrulama), `PATCH .../media/{mediaId}` (sıra, kapak), `DELETE`. Web: sürükle-bırak yükleyici, sıralama, kapak seçimi.

**Misafir tarafı:** Kart ve detay sayfası gerçek görseli gösterir (`next/image`, boyut/oran DB'den), avatar host kartında görünür.

**Veri modeli:** `experience_media` (StorageKey, SortOrder, IsCover, Width/Height/ContentType/ByteSize), `app_user.avatar_key`.

**Bu işe DAHİL DEĞİL:** CDN dönüşümü/varyant üretimi (tek boyut + `next/image`), moderasyon, video.

**Kabul kriterleri:**
1. **Base64 DB'ye yazılmaz**, API bayt taşımaz (presigned).
2. Yükleme sonrası API nesneyi HEAD'ler; content-type/boyut beklenenden farklıysa medya `Active` işaretlenmez.
3. Kapak görseli olmayan deneyim yayınlanamaz (Blok 5'in doğrulamasına bir kural eklenir).
4. Silinen medyanın storage nesnesi de gider veya "yetim" olarak işaretlenir.

**Riskler / tuzaklar:** S3/R2 hesabı **dış bağımlılık** (aşağıda "bloke" bölümü). Kilitlenmemek için `IObjectStorage` arkasına önce `FileSystemObjectStorage` yazılır (dev), `S3ObjectStorage` hesap gelince eklenir — `IEmailSender`/`FileSystemEmailSender` ile birebir aynı kalıp. Yetim nesne temizliği zamanlayıcı ister; repoda background job altyapısı yok (Blok 10'da geliyor) — o gelene kadar elle komut.

---

### Blok 7 — Takvim ve para birimli fiyat · L

**Ne:** Host müsaitliğini ve fiyatını kendi para biriminde girer ↔ misafir detay sayfasında gerçek seansları ve kendi para biriminde fiyatı görür.

**Ön koşul:** Blok 5 (Blok 6'dan bağımsız, paralel gidebilir).

**Host tarafı:** `POST/PATCH/DELETE /api/host/experiences/{id}/slots`, `POST .../recurrence` (haftalık şablon), `POST .../blackouts`, `PUT .../pricing`. Web: takvim ekranı (ay görünümü + seans ekleme), fiyat formu (para birimi seçici + yetişkin/çocuk/bebek + tarih aralığı kuralı).

**Misafir tarafı:** `GET /api/experiences/{slug}/availability?from=&to=`, `GET /api/experiences/{slug}/quote?slotId=&adults=&children=`. Web: detay sayfasında takvim + kişi seçimi + fiyat özeti; "tahsilat host'un para biriminde yapılır" notu.

**Veri modeli:** `availability_slot` (StartsAtUtc, Capacity, RemainingCapacity), `recurrence_template`, `availability_blackout`, `experience_price` + `price_rule`, `Money` owned type (`AmountMinor` + `CurrencyCode`), `exchange_rate_snapshot`.

**Bu işe DAHİL DEĞİL:** Rezervasyon (Blok 9), gerçek kur servisi (elle/stub snapshot yeter), dinamik/son dakika fiyatlandırma, takvim senkronizasyonu (v2).

**Kabul kriterleri:**
1. "Her salı 14:00" şablonu 8 hafta ileri seans üretir; DST geçişinde saat **yerel saatte sabit kalır** (UTC'de kayar).
2. Sistemde `decimal Price` diye tek sütun yoktur; her tutar `(AmountMinor, CurrencyCode)`.
3. Misafir EUR görüntüleme seçince fiyat çevrilir, ekranda tahsilat para birimi de yazar; çevrilen tutar hiçbir yerde tahsilata girmez.
4. Geçmiş tarihli seans misafir API'sinden dönmez.
5. `RemainingCapacity` bu blokta yalnız **okunur** (yazma Blok 9'da, kilitli).

**Riskler / tuzaklar:** `RemainingCapacity` denormalize mi, `booking` sayımıyla mı hesaplanacak — Blok 9 bu satırı kilitleyeceği için **denormalize öner**, ama kararı burada ver. Zaman dilimi `experience.TimeZoneId`'den (şehirden türeyen) gelir; istemcinin saat diliminden asla türetilmez. Kur snapshot'ı gösterim içindir, `booking` satırına yazılacak "o anki kur" alanı Blok 9'da eklenir.

---

### Blok 8 — Keşif: arama, filtre, boş sonuç · L · **TEK TARAFLI (misafir)**

**Ne:** Misafir dünyanın herhangi bir yerinde arar, daraltır ve sonuç yoksa bile eli boş dönmez.

**Neden tek taraflı:** Arama bir okuma yüzeyidir; host karşılığı ("ilanım hangi aramalarda çıkıyor") analitiktir ve v2'dir. Host'un bu bloktan kazancı dolaylı: ilanı bulunabilir hale gelir.

**Ön koşul:** Blok 5 (liste/şehir gezinme/metin arama için), Blok 7 (tarih ve fiyat filtreleri için). **Bloğun ilk yarısı Blok 7'yi beklemez** — ayrı PR.

**Misafir tarafı:** `GET /api/experiences` üzerine: `?q=` (dil duyarlı FTS + trigram fallback), `?country=&city=`, `?from=&to=` (seans varlığı), `?minPrice=&maxPrice=&currency=`, `?category=&duration=&spokenLanguage=`, `?sort=popular|price|rating`. Boş sonuçta: `GET /api/places/cities/nearby?cityId=&radiusKm=` + `POST /api/interest-signals` ("haber ver"). Web: `/kesfet` filtre paneli, sıralama, sonsuz/sayfalı liste, boş sonuç ekranı (bugünkü statik öğüt yerine yakın şehirler + haber ver formu).

**Veri modeli:** `interest_signal` (Email/UserId, CityId, CreatedAt). Migration: `pg_trgm` + `unaccent` eklentileri (**repoda bugün hiç yok**), `experience_translation` üzerinde dil bazlı kısmi FTS index'leri.

**Bu işe DAHİL DEĞİL:** Harita üzerinden arama (v2), kişiselleştirme/öneri, arama analitiği, favoriler (Blok 15).

**Kabul kriterleri:**
1. `SearchConfig` olan dilde stemmer'lı arama, olmayan dilde (cs/uk/ko/ja) trigram'a düşer ve **sessizce boş dönmez** (I18N §4 kuralı, test edilir).
2. Aynı deneyim iki dilde eşleşse bile sonuçta bir kez çıkar (`DISTINCT ON experience_id`).
3. Cursor sayfalama: aynı cursor iki kez aynı sonucu verir, sayfa sınırında kayıt atlanmaz.
4. Boş sonuçta en az bir yakın şehir önerisi (koordinat mesafesiyle) veya haber ver formu görünür.
5. `?spokenLanguage=en` filtresi ilan metninin diliyle **karışmaz** (I18N §3).

**Riskler / tuzaklar:** Arz odağı şehir kararı verilmeden Çekçe/trigram davranışı doğrulanamaz (VISION §9 açık soru). Alfabetik sıralama ICU collation ister. Filtre sayısı arttıkça index planı bozulabilir — `EXPLAIN` ile en az bir kez bakılmalı; bu blok Postgres olmadan **hiç doğrulanamaz**.

---

### Blok 9 — Rezervasyon · L

**Ne:** Misafir seans seçip rezervasyon yapar ↔ host gelen rezervasyonu listesinde görür (ve onay modunda onaylar).

**Ön koşul:** Blok 7. (Blok 8'den bağımsız.)

**Misafir tarafı:** `POST /api/bookings` (quote + oluştur), `GET /api/bookings/mine`, `GET /api/bookings/{id}`. Web: detay sayfasından checkout adımı (kişi sayısı + özet + onay), `/deneyimlerim` **gerçek veriye bağlanır** (`DEMO_TICKETS` prototipinin yarısı burada ölür, kalanı Blok 12'de).

**Host tarafı:** `GET /api/host/bookings?experienceId=&status=`, `POST /api/host/bookings/{id}/approve|decline`. Web: host panelinde "Gelen rezervasyonlar" ekranı, seans bazlı doluluk.

**Veri modeli:** `booking` (SlotId, UserId, Status, **dondurulmuş** toplam: `ChargeAmountMinor` + `ChargeCurrency` (host'un), opsiyonel `DisplayAmountMinor` + `DisplayCurrency` + `RateSnapshotId`), `booking_guest_line` (yetişkin/çocuk/bebek × birim fiyat), `experience.RequiresApproval`.

**Bu işe DAHİL DEĞİL:** Ödeme (Blok 11), iptal (Blok 13), bilet/QR (Blok 12), e-posta (Blok 10).

**Kabul kriterleri:**
1. **Eşzamanlılık testi (ROADMAP 5.6):** kapasitesi 3 olan seansa 20 paralel istek → tam 3 başarılı, `RemainingCapacity` asla negatif, `LoginCodeConcurrencyTests.cs` kalıbıyla yazılır.
2. Fiyat istemciden gelmez; sunucu quote'u yeniden hesaplar, uyuşmazsa **409**.
3. Rezervasyon satırı fiyatı **dondurur**: host fiyatı sonradan değiştirince eski rezervasyon değişmez.
4. Aynı idempotency anahtarıyla iki istek tek rezervasyon üretir (çift tıklama).
5. Başkasının rezervasyonu **404**.

**Riskler / tuzaklar:** CLAUDE.md #5'in ana sahnesi. Kilit sırası disiplini: `RequestLoginCode` advisory→satır sırasıyla alıyor, `VerifyLoginCode` ABBA'yı önlemek için advisory almıyor — aynı disiplin burada da geçerli, sıra dokümante edilmeli. `EnableRetryOnFailure` bilinçli kapalı (`Expyra.Infrastructure/DependencyInjection.cs`) → kilit/serialization hatası kullanıcıya hata olarak döner; yutulmaz, ama 409/503 eşlemesi `GlobalExceptionHandler`'da düşünülmeli. Rezervasyon ucuna hız sınırı burada eklenir, Faz 10'a bırakılmaz.

---

### Blok 10 — Bildirimler · M

**Ne:** Misafir onay ve 24 saat hatırlatma e-postası alır ↔ host "yeni rezervasyon" e-postası alır.

**Ön koşul:** Blok 9, Blok 3 (metin altyapısı).

**İki taraf ortak:** `outbox_message` tablosu + `BackgroundService` gönderici + gerçek `IEmailSender` implementasyonu (bugün prod'da `UnconfiguredEmailSender` bilerek patlıyor). Şablonlar kullanıcının `PreferredLanguage`'ında. Web: hesap sayfasında bildirim tercihleri (S).

**Veri modeli:** `outbox_message` (Type, PayloadJson, ScheduledAtUtc, SentAtUtc, AttemptCount, LastError).

**Bu işe DAHİL DEĞİL:** Push (Blok 19), SMS, pazarlama e-postası, tam bir job scheduler (tek `BackgroundService` + Postgres kuyruğu yeter).

**Kabul kriterleri:**
1. Rezervasyon transaction'ı ile outbox satırı **aynı transaction'da** yazılır (rezervasyon var ama e-posta yok durumu olmaz).
2. Gönderim başarısızsa satır kaybolmaz, geri çekilmeli tekrar dener, N denemeden sonra "ölü mektup" işaretlenir.
3. Aynı outbox satırı iki kez gönderilmez (kilit + `SentAtUtc`).
4. 24 saat hatırlatma deneyimin **yerel saatine** göre hesaplanır.

**Riskler / tuzaklar:** Gerçek e-posta sağlayıcısı dış bağımlılık; `FileSystemEmailSender` ile dev'de uçtan uca doğrulanabilir. Outbox işleyicisi çok örnekli deploy'da çift göndermesin — `FOR UPDATE SKIP LOCKED`.

---

### Blok 11 — Ödeme (sahte sağlayıcı) + makbuz + kazanç · L

**Ne:** Misafir öder ve makbuz animasyonuyla biletini alır ↔ host kazancını görür.

**Ön koşul:** Blok 9.

**Misafir tarafı:** `POST /api/orders` (rezervasyondan sipariş), `POST /api/orders/{id}/pay` (idempotency anahtarlı), `GET /api/orders/{id}`. Web: ödeme ekranı, hata senaryoları (başarısız kart/timeout), **makbuz yazıcı animasyonu (6.3b)** — üç aşama, stepped keyframe, testere dişli `clip-path`, atlanabilir, `prefers-reduced-motion`'da doğrudan sonuç.

**Host tarafı:** `GET /api/host/earnings?from=&to=`. Web: kazanç ekranı (brüt, komisyon, net — sahte de olsa gerçek rakamlarla).

**Veri modeli:** `order` + durum makinesi, `payment_attempt` (`IdempotencyKey` unique index), `commission_entry`, `IPaymentProvider` + `FakePaymentProvider` (gecikme, başarısız kart, timeout).

**Bu işe DAHİL DEĞİL:** Gerçek Stripe (Blok 18), iade (Blok 13), fatura/KDV (Blok 18), payout.

**Kabul kriterleri:**
1. Çift tıklama tek tahsilat üretir: unique index **+** aynı anahtarda `AcquireAdvisoryLockAsync` (index tek başına yarışta 500 üretir, advisory lock sıraya sokar).
2. Sipariş durum makinesi geçersiz geçişi reddeder (beklemede→tamamlandı doğrudan olmaz).
3. Komisyon satırı ödeme ile **aynı transaction'da** yazılır.
4. Animasyon bitmeden sekme kapanırsa sipariş yine tamamdır (animasyon akışın kapısı değil).
5. `FakePaymentProvider` yalnız `IPaymentProvider` arkasında yaşar; `Application` katmanında "fake" geçen tek satır yok.

**Riskler / tuzaklar:** ROADMAP'in açık kuralı: "nasıl olsa sahte" kısayolu alınırsa Faz 6b bu fazı baştan yazdırır. Ödeme ucuna hız sınırı burada. Para birimi: tahsilat host'un para biriminde, `booking`'deki dondurulmuş tutar kullanılır — yeniden hesaplama yok.

---

### Blok 12 — Bilet ve check-in · L

**Ne:** Misafir imzalı QR biletini gösterir ↔ host kamerayla okutur ve anında sonuç görür.

**Ön koşul:** Blok 11.

**Misafir tarafı:** `GET /api/tickets/{bookingId}` (imzalı token), `GET /api/tickets/{bookingId}/pdf` (**PDF API'ye taşınır — 7.1b**). Web: `/deneyimlerim` gerçek biletleri gösterir (`lib/ticket.ts` prototipi **burada ölür**), `app/api/bilet/[code]/pdf/route.ts` emekliye ayrılır, yeni `/tr/dogrula/[code]` · `/en/verify/[code]` doğrulama sayfası (QR'ın bugün 404 veren hedefi).

**Host tarafı:** `POST /api/host/check-in` (token + slot). Web: host tarayıcı ekranı (`getUserMedia` + `BarcodeDetector`, yoksa el ile kod girişi), sonuç: geçerli / kullanılmış (+ ilk kullanım zamanı) / yanlış tarih / geçersiz; bilet üzerinde kişi sayısı.

**Veri modeli:** `ticket` (BookingId, TokenId, IssuedAtUtc, ValidForDate, ScannedAtUtc?, ScannedByUserId?).

**Bu işe DAHİL DEĞİL:** Apple/Google Wallet `.pkpass` (7.3 — Apple sertifikası dış bağımlılık), çevrimdışı check-in (Blok 19), toplu check-in.

**Kabul kriterleri:**
1. Token **imzalı** (HMAC/JWS); tek karakter değişince doğrulama başarısız.
2. İkinci okutma "zaten kullanıldı" + ilk kullanım zamanı döner; `FindForUpdateAsync<Ticket>` ile iki paralel okutmanın **yalnız biri** başarılı (integration test).
3. Deneyim gününden başka gün okutulunca uyarır, sessizce kabul etmez.
4. PDF'i API üretir; web ve mobil aynı belgeyi alır. Font gömülü (`ğ ı ş İ ě š č ř ů` bozulmaz), büyük harf çevirimi locale duyarlı.
5. QR yükünde kişisel veri yok (yalnız imzalı opak token).

**Riskler / tuzaklar:** Web'deki pdf-lib üreticisi (`lib/ticket-pdf.ts`) silinmezse iki farklı bilet doğar — emeklilik bu bloğun tanımlı bir maddesi olmalı. Prototipin iki dersi (font gömme, locale-duyarlı büyük harf) API tarafında **yeniden** öğrenilmesin, kod taşınırken not edilsin. Kamera izni HTTPS ister — local dev'de `localhost` istisnası çalışır, staging'de sertifika gerekir.

---

### Blok 13 — İptal ve iade · M

**Ne:** Misafir iptal eder ve politikaya göre iade alır ↔ host politikasını kendi belirler ve iptali görür.

**Ön koşul:** Blok 11 (iade), Blok 9 (kapasite iadesi).

**Misafir tarafı:** `POST /api/bookings/{id}/cancel` (politika hesabı önce `GET .../cancellation-preview`). Web: iptal onay ekranı — "ne kadar iade alacaksın" **önce** gösterilir.

**Host tarafı:** `PATCH /api/host/experiences/{id}` içine `CancellationPolicy` (Esnek/Orta/Katı), `POST /api/host/bookings/{id}/cancel`. Web: politika seçimi deneyim formunda, host panelinde iptal görünümü.

**Veri modeli:** `experience.CancellationPolicy` (ek sütun — **ucuz additive migration**, fiyat/konum gibi şekil belirleyici değil, bu yüzden bilinçli olarak geç eklendi), `refund`, `booking.CancelledAtUtc/CancelReason`.

**Bu işe DAHİL DEĞİL:** Anormal iptal örüntüsü uyarısı (v2), kısmi katılım iadesi, uyuşmazlık akışı.

**Kabul kriterleri:**
1. İptal tek transaction: `booking` durumu + `availability_slot.RemainingCapacity` geri verme + `refund` satırı.
2. Politikaya göre iade tutarı sunucuda hesaplanır, istemciden gelmez.
3. Geçmiş seansın rezervasyonu iptal edilemez.
4. İki paralel iptal isteği kapasiteyi iki kez geri vermez.

**Riskler / tuzaklar:** Üç tablo tek transaction (model raporunun uyarısı). Bilet üretilmişse iptalde geçersizleşmeli (Blok 12'nin `ticket` satırı iptal edilir), aksi halde iptal edilmiş rezervasyon kapıdan geçer.

---

### Blok 14 — Yorum ve puan · M

**Ne:** Misafir katıldığı deneyime puan/yorum yazar ↔ host cevap verir.

**Ön koşul:** Blok 12 (katılım kanıtı: okutulmuş bilet veya geçmiş seans).

**Misafir tarafı:** `POST /api/reviews`, `GET /api/experiences/{slug}/reviews`. Web: `/deneyimlerim`'deki "Puan ver" butonu **açılır** (bugün `disabled`), detay sayfasında yorum listesi.

**Host tarafı:** `POST /api/host/reviews/{id}/reply`. Web: host panelinde yorumlar sekmesi.

**Veri modeli:** `review` (BookingId unique, Rating, Body, Language, HostReply, HostRepliedAtUtc), `experience.RatingAverage`/`RatingCount` (denormalize).

**Bu işe DAHİL DEĞİL:** Yorum moderasyonu, fotoğraflı yorum, host→misafir puanı.

**Kabul kriterleri:**
1. Katılım kanıtı olmayan rezervasyona yorum yazılamaz (**403**).
2. Rezervasyon başına tek yorum (unique index).
3. `rating: '4.9'` sabit dizesi koddan silinir; kart ve detay gerçek ortalamayı gösterir.
4. Ortalama güncellemesi yorumla aynı transaction'da.

**Riskler / tuzaklar:** VISION §9'a göre yorum sistemi, "onay süreci yok" kararının **tek telafisi** — kalitesiz ilanın sonradan görünür olmasını sağlayan mekanizma. Bu yüzden lansman öncesi zorunlu, "nice to have" değil. Yorum dili ≠ arayüz dili; yorum satırında `Language` tutulmalı ki çeviri rozeti gösterilebilsin.

---

### Blok 15 — Favoriler ve haber ver · S · **TEK TARAFLI (misafir)**

**Ne:** Misafir deneyimi kaydeder ve boş şehir için haber ister. **Tek taraflı:** host karşılığı ("kaç kişi favoriledi") analitik, v2.
**Ön koşul:** Blok 5. **API:** `PUT/DELETE /api/favorites/{experienceId}`, `GET /api/favorites`. **Web:** kartta ve detayda kalp, `/tr/favorilerim`. **Veri:** `favorite` ((UserId, ExperienceId) PK).
**DAHİL DEĞİL:** Koleksiyon/liste, paylaşılabilir favori listesi.
**Kabul:** Giriş yapmamış kullanıcı kalbe basınca `?donus=` ile giriş → dönünce favori kaydedilmiş olur; çift basma tek satır. **Risk:** Blok 8'in `interest_signal` tablosuyla karışmasın (biri deneyim, diğeri şehir).

---

### Blok 16 — Hesap durumu, şikayet, ban uygulaması · M

**Ne:** Misafir şikayet eder ↔ banlanan host'un ilanları anında görünmez olur.
**Ön koşul:** Blok 5 (ilan), Blok 2 (Admin rolü).
**Misafir:** `POST /api/reports`. Web: detay sayfasında "Bildir".
**Host/iç:** `POST /api/admin/users/{id}/suspend|ban|reactivate` (Admin policy), banlı host'un ilanları listeden ve detaydan düşer.
**Veri:** `report` (TargetType, TargetId, ReporterId, Reason, Status). `app_user.status` **zaten var ve token kapısı çalışıyor** (`VerifyLoginCodeCommand.cs:115`, `RefreshSessionCommand.cs:106`).
**DAHİL DEĞİL:** Tam admin paneli (v2), otomatik tespit, anormal iptal örüntüsü.
**Kabul:** Ban verildiği anda ilanlar misafir sorgularında yok; host'un mevcut oturumu yenilenemiyor; ban geri alınınca ilanlar geri geliyor. **Risk:** İlanları gizleme yolu — `app_user.status` üzerinden join **öner** (denormalize edilirse çok satırlı yazma ve transaction gerekir; docs bu tercihi yapmamış).

---

### Blok 17 — SEO, paylaşım, indekslenebilirlik · M · **ağırlıklı misafir**

**Ne:** Deneyim sayfaları aranır bulunur ve paylaşıldığında düzgün görünür (host'un dolaylı kazancı: trafik).
**Ön koşul:** Blok 5, Blok 6 (OG görseli), Blok 3.
**Kapsam:** `app/sitemap.ts`, `app/robots.ts`, deneyim/şehir sayfalarında metadata + hreflang (`alternateLinks()` **hazır**), structured data (Event/Offer), OG görsel üretimi.
**DAHİL DEĞİL:** Blog/içerik pazarlaması, çok dilli sitemap ötesi uluslararası SEO ayarı.
**Kabul:** Sitemap yalnız yayınlanmış deneyimleri içerir; her sayfa `x-default` + tüm arayüz dillerini basar; Rich Results testinden Event şeması geçer. **Risk:** Taslak/arşiv ilanların sitemap'e sızması; arayüz dili olmayan bir dil için URL üretme (I18N §5.2).

---

### Stripe'ın para modeli — Blok 7'de sabitlendi

Sağlayıcı **Stripe** olarak kesinleşti. Para modeli şanslı bir hizada: Stripe da
tutarları **minör birim tam sayısı** olarak alıyor, yani `Money(AmountMinor, Currency)`
zaten sağlayıcının beklediği şekil — çevirme katmanı gerekmiyor.

İki yerde ISO'dan **ayrışıyor** ve ikisi de `docs/payment-constraints.json` +
`PaymentCurrencyRules`'da kayıtlı (kaynak: docs.stripe.com/currencies, 23 Ağu 2026):

1. **ISK yüz kat tuzağı.** ISO'ya göre İzlanda kronunun küsuratı yok (üs 0) ve kayıt
   defterimiz doğru olarak öyle diyor. Stripe geriye dönük uyumluluk için ISK'yi İKİ
   ondalıklı bekliyor: 5 ISK için `amount = 500`. Fiyatı ISO minör biriminde saklayıp
   olduğu gibi göndermek **yüzde bir tahsil etmek** demek. Dönüşümün tek yeri
   `PaymentCurrencyRules.ToProviderAmount`; `IPaymentProvider` implementasyonu
   tutarı ORADAN geçirmek zorunda. UGX aynı durumda (kayıt defterimizde henüz yok).
2. **Asgari tahsilat.** Para birimi başına alt sınır var (0,50 EUR · 50 JPY · 15 CZK ·
   0,30 GBP · 175 HUF). Altında fiyat verilen ilan yayınlanır ama **her ödeme
   reddedilir** — Blok 7'de yazılan veri Blok 18'de patlardı. Fiyat doğrulaması bu
   sınırı uyguluyor.

Ayrıca: HUF ve TWD **payout** tutarının 100'e tam bölünmesini istiyor (tahsilatı
değil — Blok 18'in işi). Üst sınır çoğu para biriminde 8 hane; IDR/COP/INR istisna.

**Doğrulanamayan bir iddia koda girmedi:** üç ondalıklı para birimlerinde (KWD, BHD,
JOD, OMR, TND) tutarın 10'a bölünmesi gerektiği yaygın bir bilgi ama Stripe'ın kendi
dokümanında teyidini bulamadım. Beşinin desteklendiği teyitli; bölünebilirlik kuralı
yazılmadı — doğrulanmamış bir kısıt, geçerli fiyatları sessizce reddederdi.

---

### Blok 18 — Gerçek Stripe Connect · L · ⏸ **BLOKE (şirket kaydı)**

**Ne:** Misafir gerçek kartla öder ↔ host gerçekten para alır.
**Ön koşul:** Blok 11 (`IPaymentProvider`'ın ikinci implementasyonu — başka hiçbir kod değişmemeli, bu Blok 11'in başarı testidir).
**Kapsam:** Connect Express onboarding, PaymentIntent + SCA/3DS, **idempotent** webhook işleme, `application_fee`, çoklu ülke payout/KYC, ülke bazlı KDV faturası.
**Kabul:** Aynı webhook olayı iki kez gelince tek etki; `FakePaymentProvider` ile yazılan tüm testler Stripe implementasyonunda da geçer. **Risk:** Lansman kapısı — sahte ödemeyle gerçek kullanıcıya açılamaz (VISION §9).

---

### Blok 19 — Mobil (Expo) · L

**Ne:** Misafir telefonda rezervasyon yapar ve bileti çevrimdışı gösterir ↔ host sahada çevrimdışı check-in yapar.
**Ön koşul:** Blok 12 (çevrimdışı biletin anlamı için), `packages/shared-types` OpenAPI üretimi çalışır olmalı (bugün `api.generated.ts` yok).
**Kapsam:** Expo kurulumu (`apps/mobile` bugün yalnız README), auth (Apple ile giriş — store şartı, Blok 2'nin `external_login` tablosu hazır), keşif+detay, rezervasyon+ödeme, QR + Wallet, host kamerası + **çevrimdışı doğrulama** (günün biletleri önden indirilir), push, store yayını.
**Kabul:** İnternetsiz ortamda o günün bileti okutulabilir ve çevrimiçi olunca senkronlanır — çift check-in üretmez. **Risk:** Çevrimdışı doğrulama imzayı cihazda kontrol eder ama "tek kullanımlık" garantisini veremez; çakışma çözümü tasarlanmalı.

---

### Blok 20 — Prod sertleştirme · L

**Ne:** İki tarafın da güvenebileceği bir sistem.
**Kapsam:** Kalan hız sınırları + güvenlik başlıkları, observability (yapılandırılmış log, hata takibi, uptime), GDPR/KVKK (veri silme/dışa aktarma, çerez onayı), yedek + **geri yükleme provası**, deploy pipeline (staging + prod, migration adımı), yük testi (rezervasyon ucu: eşzamanlı 100).
**Kabul:** Yedekten geri yükleme en az bir kez prova edildi; rezervasyon ucu 100 eşzamanlıda kapasiteyi bozmuyor. **Risk:** `apps/api/src/Expyra.WebApi/WeatherForecast.cs` gibi ölü şablon kodu ve `Expyra.Infrastructure` için hiç test projesi olmaması — bu blok bunları da kapsar.

---

## Bağımlılık sırası

```
1 (oturum)  →  2 (rol)  →  3 (i18n metin)  →  4 (yer/kategori/para)  →  5 (DENEYİM)
                                                                          │
                                        ┌─────────────────────────────────┼──────────────┐
                                        ▼                                 ▼              ▼
                                    6 (görsel)                        7 (takvim+fiyat)  15 (favori)
                                        │                                 │
                                        └────────────┬────────────────────┤
                                                     ▼                    ▼
                                                 9 (REZERVASYON)  ←   8 (arama/filtre)
                                                     │
                                        ┌────────────┼────────────┐
                                        ▼            ▼            ▼
                                   10 (bildirim)  11 (ödeme)   16 (ban/şikayet)
                                                     │
                                        ┌────────────┼────────────┐
                                        ▼            ▼            ▼
                                   12 (bilet)   13 (iptal)    17 (SEO)
                                        │
                                        ├──► 14 (yorum)
                                        ├──► 18 (Stripe) ⏸
                                        └──► 19 (mobil)  →  20 (prod)
```

**Sıranın gerekçesi:**

1. **1 → 2:** Rolün UI'da bir yeri olması için önce oturumun görünür olması gerekiyor. Ayrıca Blok 1 migration'sız — ilk migration çakışmasını Blok 2'ye erteliyor.
2. **2 en başta:** `roles` sütunu + JWT claim'i + policy olmadan **hiçbir host ucu yazılamaz**; 5-16 arası her host maddesi bu kapının arkasında. En küçük iş, en büyük tıkaç.
3. **3 (i18n) ekran dalgasından önce:** Bugün 7 sayfanın 6'sı, 13 bileşenin 12'si hardcoded Türkçe. Bloklar 5-14 bu sayıyı 3-4 katına çıkarır. Altyapı önce gelirse yeni ekranlar borç üretmez; sonra gelirse üç katı ekran sökülür. ROADMAP'in 2.3'ü öne çekme gerekçesinin (şekil belirleyen iş erken gelir) arayüz karşılığı.
4. **4 (yer/para/kategori) 5'ten önce:** `Experience.CityId` bir FK, `city` bir dizge değil. Sonradan dönüştürmek canlı veri migration'ı. `Currency.MinorUnits` olmadan `Money` tipi yazılamaz, `Money` olmadan Blok 7 yazılamaz. İkisi de saf referans verisi, hiçbir şeye bağımlı değil — en ucuz erken yatırım.
5. **5 tek gerçek darboğaz:** 6-17 arası her şey `Experience`'a bağlı. İçinde `experience_translation` **aynı migration'da** olmalı, yoksa 2.3'ün öne çekilmesinin anlamı kalmıyor.
6. **6 ve 7 paralel:** Görselin fiyatla, fiyatın görselle işi yok. İkisi de yalnız Blok 5'i bekliyor.
7. **7 → 9:** Rezervasyon kilitleyeceği satırı (`availability_slot`) önce var etmeli.
8. **8 → 9 değil, 9 ∥ 8:** Arama rezervasyonu beklemez, rezervasyon aramayı beklemez. İkisi de 7'yi bekler — iki kişilik takımın en doğal ayrım noktası.
9. **11 → 12:** Bilet ödemeden doğar; ödeme yokken bilet üretmek prototipin bugünkü hatasını (imzasız, sahibi belirsiz bilet) tekrarlar.
10. **14 (yorum) 12'den sonra:** "Sadece katılım sonrası" kuralının kanıtı okutulmuş bilettir.
11. **13 (iptal) geç ama ucuz:** `CancellationPolicy` tek sütun; fiyat/konum gibi şekil belirlemiyor, bu yüzden erken gelmesi gerekmiyor.
12. **18 kritik yolda değil** (VISION §9 kararının tam amacı bu) ama **lansman kapısı**.

---

## Paralel çalışma

Çakışma tablosu: `AppDbContext.cs`, `Directory.Packages.props`, migration dosyaları, `packages/shared-types/src/index.ts` (FEATURE-WORKFLOW §2.3 — görev metninde §7 diye geçen tablo bu). **Kural: aynı anda iki migration üretilmez.**

| Dönem | Kişi A | Kişi B | Çakışma notu |
|---|---|---|---|
| 1 | Blok 2 (rol, API ağırlıklı) | Blok 1 (web ağırlıklı) + Blok 3 | Blok 1 migration'sız → temiz ayrım |
| 2 | Blok 4 (referans veri + seed) | Blok 3 bitişi + Blok 1 artıkları (hata sınırları, PDF yetkisi) | Migration yalnız A'da |
| 3-4 | **Blok 5a** (şema + host uçları) | **Blok 5b** (misafir okuma + detay sayfası) | Tek migration A'da; B, A'nın entity'lerini bekler → 5a'yı erken merge et, 5b üstüne gelsin |
| 5 | Blok 7 (takvim + fiyat, migration) | Blok 6 (görsel — `IObjectStorage`, ayrı migration) | **İki migration aynı hafta** — sıraya sok, A önce üretsin |
| 6-7 | Blok 9 (rezervasyon + eşzamanlılık testi) | Blok 8 (arama, FTS index migration'ı) | B'nin migration'ı yalnız index/extension → A ile çakışması düşük ama yine haberleş |
| 8 | Blok 11 (ödeme) | Blok 10 (bildirim) + Blok 15 (favori) | Ayrı tablolar, `AppDbContext` iki kez düzenlenir → küçük çakışma, önce haberleş |
| 9 | Blok 12 (bilet + check-in) | Blok 13 (iptal) + Blok 14 (yorum) | 13, 12'nin `ticket` iptaline dokunuyor → 12 önce merge |
| 10 | Blok 16 (ban/şikayet) | Blok 17 (SEO) + Blok 15 artığı | Bağımsız |
| 11+ | Blok 18 (Stripe, evrak gelirse) veya 20 | Blok 19 (mobil) | 19, `shared-types` üretimini bekliyor |

**Ayrıca:** `packages/shared-types` OpenAPI üretimi (`pnpm types:generate`) bugün hiç çalışmamış (`api.generated.ts` yok). Blok 5 biter bitmez bir kez kurulsun — 5'ten sonra elle tip yazımı hızla borca döner.

---

## ROADMAP ile farklar

| # | Fark | Gerekçe |
|---|---|---|
| 1 | **8.1 (arayüz çeviri altyapısı) Faz 8'den Blok 3'e çekildi** — Faz 2'den önce | ROADMAP 2.3'ü "şekil belirliyor" diye öne çekiyor; aynı mantık arayüz metnine uygulanmamış. Bugün borç 6/7 sayfa; Blok 5-14 bunu 3-4 katına çıkarır. Not: **mevcut prototip sayfalar çevrilmesin**, onlar zaten yeniden yazılıyor |
| 2 | **1.6 (avatar) Faz 1'den Blok 6'ya taşındı** | ROADMAP'in kendi notu "Faz 2'deki storage'ın ilk müşterisi" diyor — Faz 1'de bitirilmesi imkânsız. Bu ROADMAP'in kendi içinde tutarsızlığı |
| 3 | **`Currency` + `Country`/`City`/`Category` tek migration (Blok 4), Faz 2.6 ile Faz 3.4 birleştirildi** | `Currency.MinorUnits` olmadan `Money` yazılamaz, `Money` olmadan `Experience`/`Price` şekli belirlenemez. İkisi de saf referans verisi, aynı migration en ucuzu. ROADMAP `Currency`'yi ayrı madde saymamış |
| 4 | **2.2 ve 2.3 aynı blokta, aynı migration** | ROADMAP 2.2'yi ("başlık, açıklama") 2.3'ten önce listeliyor. Ayrılırsa 2.3 canlı veri migration'ına döner ve tüm okuma sorguları yeniden yazılır — öne çekmenin amacı kaçar |
| 5 | **Faz 4 ikiye bölündü (Blok 8'in iki PR'ı)** | ROADMAP Faz 4'ün bağımlılığını "Faz 2" yazıyor, ama 4.4'ün tarih ve fiyat filtreleri Faz 3'e bağlı. 4.1/4.2/4.3 Blok 5'ten sonra, 4.4/4.8 Blok 7'den sonra |
| 6 | **7.4 (e-posta bildirimleri) Faz 7'den Blok 10'a, rezervasyonun hemen ardına** | Onay e-postası olmayan rezervasyon yarım bir üründür; host "yeni rezervasyon" bildirimi almadan takvimini yönetemez. Ayrıca outbox altyapısı Blok 11'in de işine yarar |
| 7 | **4.7 (favoriler) kritik yoldan çıkarıldı (Blok 15)** | Küçük, bağımsız, hiçbir şeyi bloke etmiyor. Faz 4'ün içinde tutmak keşif blokunu gereksiz büyütüyor |
| 8 | **7.3 (Apple/Google Wallet) MVP dışına** | Apple sertifikası dış bağımlılık; QR + PDF ile kapı akışı zaten tamam. Lansman sonrası |
| 9 | **10.1'in bir kısmı yerinde yapılıyor** | Hız sınırı altyapısı zaten var (`RateLimiterExtensions.cs`); rezervasyon (Blok 9) ve ödeme (Blok 11) uçlarına `[EnableRateLimiting]` o bloklarda eklenir, Faz 10'a bırakılmaz |
| 10 | **Blok 1 ROADMAP'te hiç yok** | ROADMAP "Faz 1 bitti" varsayımıyla ilerliyor ama arayüzde çıkış butonu yok, header oturumu bilmiyor, PDF ucu yetkisiz, tarih filtresi yalan söylüyor. Bunlar faz beklemiyor — bugünkü kodda kırık |
| 11 | **`/dogrula` ve imzalı QR öncesi dürüstlük düzeltmesi (Blok 1)** | Bugünkü bilet, var olmayan bir adrese işaret eden imzasız bir QR taşıyor. Blok 12'ye kadar "demo" işareti taşımalı |
| 12 | **VISION §9 açık soruları planın kapısı değil ama Blok 4/8'i şekillendiriyor** | Arz odağı şehir kararı: Blok 4'ün şehir seed kapsamını ve Blok 8'in Çekçe/trigram testini belirliyor. Blok 8'e girmeden önce kapanmalı |

---

## Şu an bloke olanlar

| Bağımlılık | Neyi bloke ediyor | Şu an ne yapılabilir |
|---|---|---|
| **Postgres yok** (bu makinede) — `docker-compose.yml` **yok**, `scripts/db-up.sh` Homebrew'a bağlı (`brew services start postgresql@16`), platform Windows | **Blok 4'ten itibaren her şeyin doğrulanması.** Migration `dotnet ef migrations add` ile üretilebilir ama uygulanamaz; integration testler (kabul kriterlerinin çoğu) çalışmaz | **İlk iş bu:** ya `docker-compose.yml` + `db-up` betiğinin Windows/Docker yolu, ya yerel Postgres kurulumu. Bu olmadan Blok 9'un eşzamanlılık testi, Blok 8'in FTS davranışı **hiç doğrulanamaz** — planın en riskli iki noktası |
| **`gh` oturumu yok** | CLAUDE.md ve FEATURE-WORKFLOW §2.1 "her iş bir issue" kuralı | Blok listesi issue taslağı olarak sırada tutulur ("bu işe dahil değil" satırları bu raporda hazır), oturum gelince toplu açılır |
| **S3/R2 hesabı yok** | Blok 6 (görsel + avatar) | `IObjectStorage` + `FileSystemObjectStorage` (dev) önce yazılır — `IEmailSender`/`FileSystemEmailSender` kalıbının aynısı. Hesap geldiğinde yalnız ikinci implementasyon eklenir, Blok 6 gecikmez |
| **Gerçek e-posta sağlayıcısı yok** (prod'da `UnconfiguredEmailSender` bilerek patlıyor) | Blok 10'un prod tarafı | Outbox + `BackgroundService` + şablonlar `FileSystemEmailSender` ile uçtan uca yazılıp test edilebilir |
| **Stripe / şirket kaydı yok** | Blok 18, lansman | Blok 11 `FakePaymentProvider` ile tam yazılır. **Kısayol alınmazsa** Blok 18 gerçekten "ikinci implementasyon" olur |
| **Kur oranı kaynağı yok** | Blok 7'nin görüntüleme çevirisi | `exchange_rate_snapshot` tablosu + elle/stub oranlarla yazılır; tahsilat zaten host'un para biriminde, gerçek kur servisi lansman öncesi eklenir |
| **Apple Wallet sertifikası yok** | 7.3 (`.pkpass`) | MVP dışına alındı |
| **Arz odağı şehir kararı yok** (VISION §9) | Blok 4'ün seed kapsamı, Blok 8'in FTS/trigram testi (Çekçe stemmer'ı yok — I18N §4) | Ülke tablosu tam, şehir tablosu dar seed'le başlar; karar gelince satır eklenir (migration değil) |
| **`packages/shared-types` OpenAPI üretimi kurulmamış** | Blok 19 (mobil) ve web'in tip güvenliği | Blok 5 biter bitmez `pnpm types:generate` bir kez çalıştırılıp CI'a bağlanmalı |

**Doğrulama durumu.** Planı çıkaran analiz uygulamayı çalıştırmadı; aşağıdakiler
sonradan canlı sunucuda ölçüldü:

- `/xx/kesfet` ve `/en/kesfet` **404** dönüyor (500 değil) — Blok 1 kabul kriteri 4
  zaten sağlanıyor.
- Eski yollar yönleniyor: `/kesfet` → `/tr/kesfet`, `/host` → `/tr/host-ol`,
  `/tr/explore` → `/tr/kesfet`.
- `dotnet build` + 93 unit test yeşil; web tarafında lint / typecheck / build yeşil.
- Cam yüzeylerde blur artık gerçekten uygulanıyor (9/9 ölçüldü) — UX denetiminin
  en ağır bulgusu kapandı.

Hâlâ doğrulanmadı: `pnpm check` bütünü (integration testler Postgres istiyor) ve
açık issue listesi (`gh` oturumu yok).
