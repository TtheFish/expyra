# Mimari

## Genel yerleşim

```
tajriba/
├── apps/
│   ├── api/                     ASP.NET Core 10 + PostgreSQL
│   │   ├── src/
│   │   │   ├── Tajriba.Domain/          entity'ler, iş kuralları (bağımlılık YOK)
│   │   │   ├── Tajriba.Application/     feature'lar (CQRS handler + validator)
│   │   │   ├── Tajriba.Infrastructure/  EF Core, dış servisler
│   │   │   └── Tajriba.WebApi/          controller, middleware, DI kökü
│   │   └── tests/
│   │       ├── Tajriba.Application.UnitTests/    handler testleri (DB'siz)
│   │       └── Tajriba.IntegrationTests/         uçtan uca (gerçek Postgres)
│   ├── web/                     Next.js 16 (App Router) + Tailwind 4
│   └── mobile/                  Expo — Faz 5'te kurulacak
├── packages/
│   └── shared-types/            web + mobil ortak tipler (OpenAPI'den üretilir)
├── docs/
├── scripts/
└── .github/workflows/           CI
```

## Bağımlılık yönü

```
WebApi ──► Application ──► Domain
   │            ▲
   └──► Infrastructure ──┘
```

Ok yönünün tersine referans **yoktur**:

- `Domain` hiçbir şey bilmez. EF Core, MediatR, ASP.NET buraya girmez.
- `Application` sadece `Domain`'i bilir. Veritabanına `IAppDbContext` üzerinden erişir —
  Npgsql'i tanımaz.
- `Infrastructure` arayüzleri gerçekler (EF Core, dosya depolama, Stripe).
- `WebApi` her şeyi birbirine bağlar; iş kuralı barındırmaz.

Bu yüzden handler testleri veritabanı olmadan çalışır.

## Neden CQRS/MediatR

Her istek kendi handler'ında yaşıyor. İki kişi paralel çalışırken aynı dosyayı
açmak zorunda kalmıyoruz — servis sınıfları büyüdükçe çakışma üretiyordu.

MediatR **12.x**'te kalıyoruz: 13.x ticari lisansa geçti. Sürüm yükseltmeyin.

## Veri erişimi kuralları

- Migration'lar elle uygulanır (`pnpm api:migrate`). Uygulama açılışta şemaya dokunmaz.
- Birden fazla satırı atomik değiştiren işlem transaction kullanır
  (`IAppDbContext.BeginTransactionAsync`).
- Kapasite gibi yarışa açık alanlarda satır kilidi veya concurrency token kullanılır —
  "oku, düş, kaydet" tek başına yeterli değil.
- Zaman damgaları `SaveChangesAsync` içinde otomatik dolar; handler'da elle set edilmez.

## Hata yönetimi

Tek çıkış noktası: `GlobalExceptionHandler`. Tüm hatalar RFC 7807 `ProblemDetails`
olarak döner.

| Fırlatılan | HTTP |
|---|---|
| `ValidationException` (FluentValidation) | 400 + alan bazlı hatalar |
| `BadRequestException` | 400 |
| `UnauthorizedAccessException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| diğer her şey | 500 (detay dışarı sızmaz) |

Handler içinde `try/catch` ile hata yutmak yasak.

## Yapılandırma ve sırlar

- Sır repoya girmez. Local: `dotnet user-secrets`. Prod: ortam değişkeni.
- `appsettings.Development.json` sadece localhost değerleri içerir.
- CI'da `gitleaks` her PR'ı tarar.

## Gözlemlenebilirlik

Serilog + konsol. İstek logları `UseSerilogRequestLogging` ile. Faz 6'da yapılandırılmış
log toplama eklenecek.

## Henüz olmayan, bilerek ertelenenler

| Konu | Ne zaman |
|---|---|
| Kimlik doğrulama (JWT + refresh token) | Faz 1 |
| Dosya depolama (S3/R2) | Faz 2 |
| Stripe Connect | Faz 3 — Prag/Estonya şirket kararı beklemede |
| i18n (EN/CS/TR) | Faz 4 |
| Expo mobil | Faz 5 |
| Rate limiting, caching, deploy | Faz 6 |
