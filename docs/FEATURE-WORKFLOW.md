# Feature Workflow

İki kişiyiz. Bu dosyanın tek amacı: **aynı anda farklı feature'lar üzerinde çalışırken
birbirimizin ayağına basmamak.**

---

## 1. Feature nedir

Bir feature = **dikey dilim**. Kullanıcının görebildiği bir davranışın
DB'den ekrana kadar tamamı. "Booking servisi" feature değil; "gezgin rezervasyon
oluşturabilir" feature.

Kural: bir feature tek bir issue, tek bir branch, tek bir PR.

---

## 2. Akış

```
issue aç  →  branch aç  →  yaz + test  →  PR  →  review  →  merge  →  issue kapat
```

### 2.1 Issue

Her iş GitHub issue'suyla başlar. Şablon: `.github/ISSUE_TEMPLATE/feature.md`.

```bash
gh issue create --title "Host müsaitlik ekleyebilir" --assignee @me --label feature
```

Issue'da **"bu işe dahil değil"** satırını mutlaka doldur. Kapsam kayması iki kişilik
takımı en çok yavaşlatan şey.

### 2.2 Branch

```bash
git switch -c feature/12-host-availability     # feature/<issue-no>-<kısa-slug>
```

Türler: `feature/`, `fix/`, `chore/`, `refactor/`.

`main` korumalıdır — doğrudan push yok, her şey PR ile girer.

### 2.3 Çakışmayı önleme

Backend'de feature'lar kendi klasörlerinde yaşar, bu yüzden çakışma nadirdir.
Çakışma **ortak dosyalarda** olur. Bunlara dokunacaksan **önce söyle**:

| Dosya | Neden riskli |
|---|---|
| `AppDbContext.cs` | Herkes DbSet ekliyor |
| `Directory.Packages.props` | Paket sürümleri |
| `packages/shared-types/src/index.ts` | Paylaşılan tipler |
| Migration dosyaları | Sıra bozulursa DB bozulur |

**Migration kuralı:** aynı anda iki kişi migration üretmesin. Üretmeden önce
`git pull --rebase` yap; ürettikten sonra hemen PR aç.

---

## 3. Backend'de feature nasıl yazılır

Klasör yapısı (`apps/api/src/Tajriba.Application/Features/<Feature>/`):

```
Features/
└── Bookings/
    ├── Commands/
    │   └── CreateBooking/
    │       ├── CreateBookingCommand.cs        ← request + response + handler
    │       └── CreateBookingCommandValidator.cs
    └── Queries/
        └── GetMyBookings/
            └── GetMyBookingsQuery.cs
```

Controller ise `apps/api/src/Tajriba.WebApi/Features/Bookings/BookingsController.cs`.

Referans örnek: `Features/Health/Queries/GetHealth/GetHealthQuery.cs` — kopyala, uyarla.

### Kalıp

```csharp
// 1) Request + Response + Handler AYNI dosyada. Feature okumak için 5 dosya açma.
public sealed record CreateBookingCommand(Guid ExperienceId, DateOnly Date, int Adults)
    : IRequest<BookingResponse>;

public sealed record BookingResponse(Guid Id, decimal TotalPrice);

internal sealed class CreateBookingCommandHandler(
    IAppDbContext db,
    ICurrentUser currentUser,          // ← kullanıcı id'sini command'a KOYMA
    IDateTimeProvider clock)
    : IRequestHandler<CreateBookingCommand, BookingResponse>
{
    public async Task<BookingResponse> Handle(CreateBookingCommand request, CancellationToken ct)
    {
        var userId = currentUser.RequireUserId();

        // Birden fazla satır değişiyorsa transaction ŞART
        await using var tx = await db.BeginTransactionAsync(ct);
        // ...
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new BookingResponse(booking.Id, booking.TotalPrice);
    }
}
```

```csharp
// 2) Validator ayrı dosyada. Pipeline'a kaydetmene gerek yok, otomatik bulunur.
public sealed class CreateBookingCommandValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingCommandValidator()
    {
        RuleFor(x => x.ExperienceId).NotEmpty();
        RuleFor(x => x.Adults).GreaterThan(0).LessThanOrEqualTo(20);
    }
}
```

### Yasaklar

Bunlar eski projeyi çökerten şeylerdi. Tekrarı PR'da reddedilir.

1. **`catch (Exception) { return new List<T>(); }`** — hatayı yutup boş sonuç dönme.
   Sistem bozuksa bozuk görünsün. Hata yönetimi tek yerde: `GlobalExceptionHandler`.
2. **Startup'ta şema değiştirme** — `EnsureCreated`, `DROP DATABASE`, otomatik migrate yok.
   Migration elle uygulanır: `pnpm api:migrate`.
3. **Kullanıcı id'sini istemciden alma** — `ICurrentUser` kullan.
4. **Oku-değiştir-yaz'ı transaction'sız yapma** — kapasite düşümü gibi yerlerde
   yarış koşulu oluşur.
5. **Sırrı repoya yazma** — `dotnet user-secrets` veya ortam değişkeni.

---

## 4. Frontend'de feature

```
apps/web/src/
├── app/                      ← route'lar (Next.js App Router)
├── features/<feature>/       ← o feature'a ait bileşen + hook + servis
└── components/ui/            ← paylaşılan tasarım sistemi bileşenleri
```

API tipleri **elle yazılmaz**. Backend ayaktayken:

```bash
pnpm types:generate
```

---

## 5. PR

```bash
gh pr create --fill --assignee @me
```

PR şablonundaki kutucukları gerçekten doldur. "Nasıl doğruladım" boşsa review başlamaz.

**PR küçük olsun.** 400 satırdan büyük diff'i kimse düzgün okuyamaz — feature'ı böl.

CI yeşil olmadan merge yok. CI üç şeyi kontrol eder: .NET build+test, web lint+build,
sır taraması.

---

## 6. Merge ve kapanış

- Merge yöntemi: **squash**. `main` geçmişi feature başına tek commit olur.
- Merge sonrası branch silinir.
- **Deploy olduğunda issue kapatılır** — yorumda özet + tarih + commit hash.
  Sadece local'de biten iş için issue açık kalır.

---

## 7. Günlük komutlar

```bash
pnpm db:up          # local postgres + veritabanı hazırla
pnpm api:migrate    # migration'ları uygula
pnpm api            # API'yi çalıştır  (http://localhost:5080/scalar)
pnpm web            # web'i çalıştır   (http://localhost:3000)
pnpm check          # PR açmadan önce: build + test + lint (CI'ın yaptığının aynısı)
```
