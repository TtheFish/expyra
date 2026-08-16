# Expyra — Claude Code notları

Bu dosya, bu repoda çalışan her Claude oturumu için bağlam. Genel tercihler
`~/.claude/CLAUDE.md`'de; burası projeye özel.

## Proje

Yerel deneyim rezervasyon platformu. Monorepo: .NET 10 API + Next.js 16 web +
(ileride) Expo mobil. İki kişilik takım, feature bazlı geliştirme.

İsim değişirse: `./scripts/rename.sh <YeniAd>` (tek komut, tüm repo).

## Komutlar

```bash
pnpm check          # PR öncesi tam doğrulama (CI'ın aynısı)
pnpm api            # API'yi çalıştır
pnpm web            # web'i çalıştır
pnpm db:up          # local postgres hazırla
pnpm api:migrate    # migration uygula
```

## Bu repoda uyulması gereken kurallar

Bunlar eski projeyi (github.com/TtheFish/Tajriba) çökerten hatalardan çıkarıldı.
Kod yazarken bunları ihlal etme:

1. **Hata yutma yok.** `catch (Exception) { return new List<T>(); }` kalıbı yasak.
   Tüm hata dönüşümü `GlobalExceptionHandler`'da, tek yerde.
2. **Startup'ta şema değişikliği yok.** `EnsureCreated`, `DROP DATABASE`,
   otomatik `Migrate()` — hiçbiri. Migration elle uygulanır.
3. **Kullanıcı kimliği istemciden alınmaz.** `ICurrentUser.RequireUserId()` kullan;
   command/query içine `UserId` parametresi koyma.
4. **Sır repoya yazılmaz.** `dotnet user-secrets` veya ortam değişkeni.
   `appsettings.Development.json` sadece localhost değerleri içerir.
5. **Yarışa açık yazma işlemleri transaction ister.** Kapasite düşümü gibi
   "oku-değiştir-yaz" akışları `BeginTransactionAsync` olmadan yazılmaz.
6. **`TreatWarningsAsErrors` açık.** Analyzer uyarısı build'i kırar; bastırmak
   yerine düzelt. Gerçekten gereksizse `.editorconfig`'e gerekçesiyle ekle.

## Feature eklerken

Kalıp: `docs/FEATURE-WORKFLOW.md`. Referans örnek:
`apps/api/src/Expyra.Application/Features/Health/Queries/GetHealth/`.

Request + response + handler aynı dosyada; validator ayrı dosyada; controller
`WebApi/Features/<Feature>/` altında.

## Tasarım sistemi

Liquid Glass (iOS 26 uyarlaması). Tanım: `apps/web/src/app/globals.css`.
Bileşenler: `apps/web/src/components/ui/`.

- Yeni yüzey `GlassSurface` üzerine kurulur, elle `backdrop-filter` yazılmaz.
- Cam ancak arkasında renk varsa görünür — zemindeki mesh gradient buna hizmet eder.
- Kontrast WCAG AA altına düşerse `--veil` artırılır, metin rengi değiştirilmez.
- Metin hardcode edilmez; arayüz çevirisi Faz 8'de geliyor, yeni metinleri o yapıya
  hazır yaz. Dil listesi koda gömülmez — `docs/I18N.md`.

## Paket sürümleri

`apps/api/Directory.Packages.props` — merkezi. csproj'a sürüm yazma.

- **MediatR 12.x'te kal.** 13.x ticari lisansa geçti.
- **FluentAssertions kullanma.** 8.x ticari; `Shouldly` kullanıyoruz.
- Güvenlik açığı (NU1903) çıkarsa transitive paketi "Security pins" bölümüne ekle.

## İş takibi

Yeni iş çıkınca GitHub issue aç (`gh issue create --assignee @me`), Obsidian'a değil.
Deploy edilen iş aynı oturumda `gh issue close` ile kapatılır.
