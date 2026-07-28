# Tajriba

> **Not:** `Tajriba` çalışma adıdır. İsim kesinleşince `./scripts/rename.sh <YeniAd>`
> ile tüm repo (namespace, paket adları, klasörler) tek komutta dönüşür.

Yerel deneyim rezervasyon platformu. Host'lar deneyim yayınlar, gezginler rezervasyon yapar.

## Durum

**Faz 0 — iskelet.** Çalışan: monorepo yapısı, API iskeleti, tasarım sistemi, CI.
Henüz yok: kimlik doğrulama, deneyim/rezervasyon özellikleri, ödeme.

Yol haritası için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), çalışma düzeni için
[docs/FEATURE-WORKFLOW.md](docs/FEATURE-WORKFLOW.md).

## Yapı

```
apps/api       ASP.NET Core 10 + PostgreSQL + EF Core (Clean Architecture, CQRS)
apps/web       Next.js 16 + Tailwind 4 (Liquid Glass tasarım sistemi)
apps/mobile    Expo — Faz 5'te kurulacak
packages/      web + mobil ortak tipler
```

## Kurulum

Gerekenler: .NET 10 SDK, Node 20+, pnpm 10, PostgreSQL 16.

```bash
pnpm install
pnpm db:up          # postgres + tajriba_dev veritabanı
pnpm api:migrate    # migration'ları uygula
```

Veritabanı bağlantın farklıysa `appsettings.Development.json`'ı **değiştirme**,
user-secrets ile ez:

```bash
dotnet user-secrets --project apps/api/src/Tajriba.WebApi \
  set "ConnectionStrings:Default" "Host=localhost;Database=tajriba_dev;Username=KULLANICI;Password=ŞIFRE"
```

## Çalıştırma

```bash
pnpm api     # http://localhost:5080/scalar   (API dokümantasyonu)
pnpm web     # http://localhost:3000
```

## PR açmadan önce

```bash
pnpm check   # .NET build + test, web lint + build — CI'ın çalıştırdığının aynısı
```

## Kurallar

Ayrıntısı [docs/FEATURE-WORKFLOW.md](docs/FEATURE-WORKFLOW.md)'de. Özet:

1. Her iş bir GitHub issue → bir branch → bir PR.
2. Sır repoya girmez. CI'da `gitleaks` tarıyor.
3. Hata yutulmaz — `catch { return []; }` yasak.
4. Migration'lar elle uygulanır; uygulama açılışta şemaya dokunmaz.
5. `main`'e doğrudan push yok.
