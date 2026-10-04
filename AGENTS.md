# Expyra — Codex notları

Bu dosya, bu repoda çalışan her Codex oturumu için bağlam. Genel tercihler
`~/.Codex/AGENTS.md`'de; burası projeye özel.

## Proje

Yerel deneyim rezervasyon platformu. Monorepo: .NET 10 API + Next.js 16 web +
(ileride) Expo mobil. İki kişilik takım, feature bazlı geliştirme.

İsim değişirse: `./scripts/rename.sh <YeniAd>` (tek komut, tüm repo).

## Komutlar

```bash
pnpm check          # PR öncesi tam doğrulama (CI'ın aynısı)
pnpm api            # API'yi çalıştır
pnpm web            # web'i çalıştır
pnpm db:up          # local postgres hazırla (kurulum: docs/DATABASE.md)
pnpm api:migrate    # migration uygula
pnpm api:seed       # referans veri (ülke/şehir/para birimi/kategori/kur)
pnpm api:seed:demo  # demo hesaplar + ilanlar — hesaplar ve giriş: docs/DEMO.md
pnpm api:test       # yalnız API testleri
```

`api:seed` **atlanmamalı**: kur satırları oradan geliyor ve onlarsız misafirin
para birimi çevrimi 409 döner. İdempotent — ikinci koşuda 0 satır yazar.

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
7. **Para tel üzerinde MİNÖR BİRİM tam sayısı.** `4500` = 45,00 €. API hiçbir
   yerde ondalık para metni ayrıştırmıyor ve `decimal Price` diye bir sütun yok —
   `Money(AmountMinor, CurrencyCode)`. Üs para birimine göre değişiyor
   (JPY 0, KWD 3) ve kayıt defteri `currency.minor_units`; kopyalama.
8. **Enum tel üzerinde camelCase METİN.** `"tuesday"`, `"open"`, `"adult"` —
   sayı değil. .NET'te Pazar = 0 ama ISO 8601'de Pazartesi = 1; sayı gönderen bir
   istemci "salı" derken "çarşamba" alır. Yanıtlarda enum'u elle metne çevirirken
   de küçük harf kullan (`ScheduleFormat.Name`), aksi halde aynı API iki farklı
   düzen konuşur.

## Plan ve sıra

Blok sırası, kabul kriterleri ve "şu an bloke olanlar": `docs/PLAN.md`.
Yolculuk haritası (hangi adım hazır, hangisi değil) o dosyanın başında.

## Feature eklerken

Kalıp: `docs/FEATURE-WORKFLOW.md`. Referans örnek:
`apps/api/src/Expyra.Application/Features/Health/Queries/GetHealth/`.

Request + response + handler aynı dosyada; validator ayrı dosyada; controller
`WebApi/Features/<Feature>/` altında.

## Tasarım sistemi

Kaynak tasarım: **"Expyra Yeni"** (Claude Design, 05.09.2026). Tanım ve gerekçeler
`apps/web/src/app/globals.css` başlığında; burada yalnız uyulması gerekenler.

Üç malzeme var ve **işleri ayrı** — birini diğerinin yerine kullanmak tasarımı bozar:

| Malzeme | Ne zaman | Nasıl |
|---|---|---|
| Kağıt (`--bg`) | sayfanın kendisi | düz beyaz, deseni yok |
| Kart (`surface`) | **içerik okunacak her yüzey** | opak + 1px `--line` + yumuşak gölge |
| Cam (`glass`) | yalnız bir şeyin ÜSTÜNDE duran öğe | sticky header, fotoğraf üstündeki rozet, video üstündeki arama |

- **Beyaz zeminde cam kullanma.** Görünmez; oraya `surface` gider.
- Zeminde mesh gradient YOK (05.09.2026'da kaldırıldı). Camı fotoğraf ve video besliyor.
- Tipografi Manrope; başlıklar 800 ağırlık + negatif harf aralığı (`section-title`).
- Birincil aksiyon `glass-brand` (mercan gradyan). Kontrast gerekçesi CSS'te yazılı.
- Koyu tema yalnız kullanıcı AÇIKÇA seçerse; sistem tercihiyle otomatik geçiş yok.
- Kontrast WCAG AA altına düşerse örtü (`--veil`, hero `--media-scrim`) artırılır,
  metin rengi değiştirilmez.
- **Metin hardcode edilmez ve YARIM ÇEVİRİ PUSH EDİLMEZ.** Kendi başlığı var:
  aşağıdaki "Çeviri" bölümü.

## Çeviri — yarım dil push edilmez

Arayüz dilleri: **tr, en, cs, de, bg, hr**. Kaynak sözlük `messages/tr.ts`; çeviriler
`en.ts`, `cs.ts`, `de.ts`, `bg.ts` ve `hr.ts`. Yeni bir panel, ekran ya da tek bir düğme metni eklendiğinde
**hepsine birden** eklenir. Bir dilde eksik anahtar bırakıp "sonra bakarız"
denmez — kullanıcı o ekranda boşluk ya da yabancı dilde cümle görür.

Neden bu kadar sert: `/en` altında Türkçe cümle WCAG 3.1.1 (Seviye A) ihlali —
ekran okuyucu Türkçe metni İngilizce fonetikle okur. Bu yüzden eksik çeviride
Türkçe'ye **düşülmez**, derleme kırılır (`docs/I18N.md` §5).

Metin taşıyan **dört** yer var; biri unutulursa öbürleri yakalamaz:

| Dosya | Ne taşır |
|---|---|
| `features/i18n/messages/<dil>.ts` | arayüzün tamamı |
| `features/i18n/boundary.ts` | 404 / hata / yükleniyor ekranları |
| `features/i18n/locale.ts` | dilin CLDR çoğul biçimleri |
| `lib/route-map.json` | lokalize URL segmentleri |

Çoğul biçim sayısı dile göre değişir: tr ve en iki (`one`, `other`), **cs dört**
(`one`, `few`, `many`, `other`). Çekçe'de `many` yalnız ondalıklı sayıda seçilir
("1,5 hodiny"), tam sayıda asla.

**Kontrol tek komut** ve `pnpm check` onu zaten koşuyor:

```bash
pnpm --filter @expyra/web typecheck
```

Eksik anahtar, fazla anahtar ve kaybolan yer tutucu (`{n}`, `{sehir}`) üçü de
derleme hatası — hangi anahtarda olduğunu yazarak. Yakalanamayan tek şey
JSX'e doğrudan gömülmüş dizge; onu yazmamak yazarın sorumluluğu.

Yeni bir arayüz dili açmak: `docs/I18N.md` §5 + Çekçe'yi ekleyen PR örnek.
Dil kaydı (`docs/languages.json`) `HasData` ile migration'a gömülü, yani
`uiAvailable` değişikliği **migration ister**. Demo ilan başlık/açıklamaları da
o dilde görünmeli: `DemoDataSeeder` içindeki her `UiTexts` sözlüğüne (ve Prag
backfill'ine) aynı dil kodunu ekle — yoksa kartlar UI dilinde, başlıklar Türkçe
kalır.

## Branch — her iş main'den başlar

1. **Her zaman güncel `main`'den dallan.** `git switch main && git pull` sonra
   yeni branch. Branch'ten branch açma.
2. **Branch kısa yaşar.** Bir iş, bir PR, aynı gün döner. 41 commit biriktiren
   bir branch'te CI hiç koşmamıştı ve içinde iki gerçek hata vardı — seed boş
   veritabanında hiç çalışmıyordu, CI web build'i ortam değişkeni olmadan
   koşuyordu. İkisi de PR açılana kadar görünmedi.
3. **Merge edilen branch silinir** — local ve remote: `git branch -d <ad>` +
   `git push origin --delete <ad>`. Duran branch, bir sonraki kişinin yanlış
   yerden dallanması demek.
4. `main`'e doğrudan push yok; PR üzerinden. Bu 1. maddeyle çelişmiyor: dallanma
   noktası main, dönüş yolu PR.

## Paket sürümleri

`apps/api/Directory.Packages.props` — merkezi. csproj'a sürüm yazma.

- **MediatR 12.x'te kal.** 13.x ticari lisansa geçti.
- **FluentAssertions kullanma.** 8.x ticari; `Shouldly` kullanıyoruz.
- Güvenlik açığı (NU1903) çıkarsa transitive paketi "Security pins" bölümüne ekle.

## İş takibi

Yeni iş çıkınca GitHub issue aç (`gh issue create --assignee @me`), Obsidian'a değil.
Deploy edilen iş aynı oturumda `gh issue close` ile kapatılır.
