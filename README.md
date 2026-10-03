# Expyra

Yerel deneyim rezervasyon platformu. Host'lar deneyim yayınlar, gezginler rezervasyon yapar.

## Durum

**Blok 1-7 tamam.** Çalışan: şifresiz kimlik (e-posta + tek kullanımlık kod), host rolü,
arayüz dili (tr/en/cs/de/bg, lokalize URL'ler), yer/kategori/para birimi kayıt defteri, deneyim
oluşturma ve yayınlama, görsel yükleme, host takvimi + fiyat, misafir tarafında
müsaitlik ve teklif.

Henüz yok: rezervasyon (Blok 9), gerçek ödeme, gerçek bilet, yorum, mobil uygulama.
Checkout, bilet ve yorum ekranlarının yalnız **demo** arayüzleri var; prod'da
kapalı kalırlar (bkz. [docs/DEMO.md](docs/DEMO.md)).
Blok tanımları [docs/PLAN.md](docs/PLAN.md)'de, açık işler
[GitHub issue'larında](https://github.com/yldray/expyra/issues) ve
[docs/ACIK-EKSIKLER.md](docs/ACIK-EKSIKLER.md)'de.

Projenin amacı ve iş modeli için [docs/VISION.md](docs/VISION.md). Mimari için
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), yol haritası için
[docs/ROADMAP.md](docs/ROADMAP.md), çalışma düzeni için
[docs/FEATURE-WORKFLOW.md](docs/FEATURE-WORKFLOW.md).

## Yapı

```
apps/api       ASP.NET Core 10 + PostgreSQL + EF Core (Clean Architecture, CQRS)
apps/web       Next.js 16 + Tailwind 4 ("Expyra Yeni" tasarım sistemi: kağıt + kart + cam)
apps/mobile    Expo — Blok 19'da kurulacak
packages/      web + mobil ortak tipler
docs/*.json    referans verinin tek kaynağı (koda gömülü değil, seed okuyor)
```

## Kurulum

Gerekenler: .NET 10 SDK, Node 20+, pnpm 10, PostgreSQL 18 (compose ve CI ile aynı major; collation farkı olmasın).

Sıfırdan çalışır hale getiren tam zincir — **adımlar sırayla, hiçbiri atlanamaz**:

```bash
# 1. Bağımlılıklar. pnpm .NET tarafına dokunmaz, restore ayrı.
pnpm install
dotnet restore apps/api

# 2. Sırlar. Üçü de zorunlu: eksikse uygulama AÇILIŞTA patlar — bu kasıtlı,
#    varsayılan anahtara düşmek sessiz bir güvenlik açığı olurdu.
S=apps/api/src/Expyra.WebApi
dotnet user-secrets set "Auth:Jwt:SigningKey" "$(openssl rand -base64 32)" --project $S
dotnet user-secrets set "Auth:Otp:HashKey"    "$(openssl rand -base64 32)" --project $S
# Veritabanı bağlantın varsayılandan farklıysa (aşağıya bak) ayrıca:
# dotnet user-secrets set "ConnectionStrings:Default" "Host=...;Database=expyra_dev;Username=...;Password=..." --project $S

# 3. Web'in ortam değişkenleri. Bu dosya olmadan `next build` patlar.
cp apps/web/.env.example apps/web/.env.local

# 4. Veritabanı ve şema.
pnpm db:up          # sunucuyu bulur/başlatır + expyra_dev ve expyra_test'i oluşturur
pnpm api:migrate    # şemayı uygular — uygulama açılışta şemaya ASLA dokunmaz
pnpm api:seed       # ülke, şehir, para birimi, kategori, kur
```

**Seed atlanamaz.** Şehir listesi olmadan ilan oluşturulamaz, kur satırları olmadan
misafirin para birimi çevrimi 409 döner. Komut idempotent: ikinci koşuda
"Değişen satır: 0" yazar ve kur anlık görüntüsünün üzerine yazmaz.

`appsettings.Development.json`'ı **değiştirme** — bağlantı dizeni user-secrets ile ez.
Sır repoya girmez; CI'da `gitleaks` tüm geçmişi tarıyor.

Veritabanı ayrıntısı, Docker/Windows/Linux kurulumu ve şema için
[docs/DATABASE.md](docs/DATABASE.md).

## Çalıştırma

İki ayrı terminal:

```bash
pnpm api     # http://localhost:5205/scalar   (API dokümantasyonu)
pnpm web     # http://localhost:3000
```

Sağlık kontrolü: `curl http://localhost:5205/api/health` → `databaseReachable: true`.

API portu [launchSettings.json](apps/api/src/Expyra.WebApi/Properties/launchSettings.json)'da
tanımlı. Değiştirirsen `apps/web/.env.local` içindeki `EXPYRA_API_URL` ve
`EXPYRA_MEDIA_URL`'i de güncelle — web API'yi yalnız sunucu tarafından çağırıyor.

Geliştirmede giriş kodu e-posta yerine ekrana/loga yazılır; posta kutusu gerekmez.

## PR açmadan önce

```bash
pnpm check   # .NET build + test, lint, web testi, web build — CI'ın koştuğunun aynısı
```

Integration testler `expyra_test` veritabanını kullanır (`pnpm db:up` onu da kurar) ve
tabloları temizler — geliştirme verinle aynı yerde durmazlar.

## Kurallar

Ayrıntısı [docs/FEATURE-WORKFLOW.md](docs/FEATURE-WORKFLOW.md)'de. Özet:

1. Her iş bir GitHub issue → bir branch → bir PR.
2. Sır repoya girmez. CI'da `gitleaks` tarıyor.
3. Hata yutulmaz — `catch { return []; }` yasak.
4. Migration'lar elle uygulanır; uygulama açılışta şemaya dokunmaz.
5. `main`'e doğrudan push yok.
