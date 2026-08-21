# Veritabanı

PostgreSQL. Bağlantı dizesi **repoda değil** — geliştirmede `dotnet user-secrets`,
üretimde ortam değişkeni (CLAUDE.md #4).

---

## Hızlı başlangıç

```bash
pnpm db:up          # sunucuyu bul/başlat + expyra_dev ve expyra_test'i oluştur
pnpm api:migrate    # şemayı uygula — startup'ta ASLA otomatik değil (CLAUDE.md #2)
pnpm api            # http://localhost:5205
```

İlk kurulumda iki sır da verilmeli, yoksa uygulama **açılışta patlar** (bu kasıtlı;
varsayılan anahtara düşmek sessiz bir güvenlik açığıdır):

```bash
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=expyra_dev;Username=postgres;Password=<şifren>" --project apps/api/src/Expyra.WebApi
dotnet user-secrets set "Auth:Jwt:SigningKey" "<32 baytın base64'ü>" --project apps/api/src/Expyra.WebApi
dotnet user-secrets set "Auth:Otp:HashKey"   "<32 baytın base64'ü>" --project apps/api/src/Expyra.WebApi
```

Anahtar üretmek için: `openssl rand -base64 32`

---

## Sunucuyu nereden bulur

`scripts/db-up.sh` şu sırayı dener:

1. **Zaten çalışan** bir PostgreSQL (nasıl kurulduğu önemsiz)
2. **Docker** → `docker compose up -d postgres`
3. **Yerel servis** → brew (macOS) / systemctl (Linux) / Windows servisi

Windows'ta `psql` genelde `PATH`'te olmaz; betik `C:\Program Files\PostgreSQL\*\bin`
altından kendisi bulur.

Şifre gerekiyorsa oturuma ver, betiğe yazma:

```bash
export PGPASSWORD='...'      # bash
$env:PGPASSWORD='...'        # PowerShell
```

---

## Bu makinedeki kurulum (geliştirici notu)

Makinede **iki** PostgreSQL yan yana çalışıyor:

| Sürüm | Port | Kim kullanıyor |
|---|---|---|
| 17 | 5432 | Başka projeler — **dokunulmadı** |
| **18** | **5433** | **Expyra** |

17'nin `postgres` şifresi bilinmiyordu. Mevcut kurulumun `pg_hba.conf`'unu değiştirip
şifre sıfırlamak yerine yanına ikinci bir örnek kuruldu: başka projelerin kimlik
doğrulama ayarını değiştirmek, çözdüğünden fazla şey bozar.

Bu makinede bağlantı dizesi bu yüzden `Port=5433`. Başka bir makinede kurulum tekse
5432 kullanılır — port yalnızca user-secrets'ta yaşıyor, repoda hiçbir yerde sabit değil.

```bash
# psql (bu makinede)
"/c/Program Files/PostgreSQL/18/bin/psql.exe" -U postgres -h localhost -p 5433 -d expyra_dev
```

---

## Veritabanları

| Ad | Amaç |
|---|---|
| `expyra_dev` | Geliştirme |
| `expyra_test` | Integration testler |

**Ayrı olmaları şart.** Integration testler her koşuda kimlik tablolarını
`TRUNCATE` ediyor; geliştirme verisiyle aynı yerde durmaları veri kaybı demek.

Testler bağlantıyı şu sırayla arar: `EXPYRA_TEST_DB` → `ConnectionStrings__Default`
→ `localhost:5432/expyra_test` varsayılanı.

Bu makinede son basamak yanlış porta gidiyor (yukarıdaki iki kurulum tablosu), yani
`pnpm check` env değişkeni olmadan 112 integration testi birden kırıyor. Değişken bu
yüzden **kullanıcı düzeyinde kalıcı** tanımlı; yeni açılan her kabuk onu görür:

```powershell
setx EXPYRA_TEST_DB "Host=localhost;Port=5433;Database=expyra_test;Username=postgres;Password=postgres"
```

Varsayılan neden 5433'e çekilmedi: 5433 bu makineye özgü: tek Postgres kurulu bir
makinede doğru port 5432 ve repodaki varsayılanı buraya göre değiştirmek takımın
diğer kutusunu kırardı. Makineye özgü olan makinede duruyor.

`setx` yalnızca **yeni** süreçleri etkiler. Açık bir terminalde tek seferlik:

```bash
$env:EXPYRA_TEST_DB = "Host=localhost;Port=5433;Database=expyra_test;Username=postgres;Password=postgres"
dotnet test apps/api
```

Postgres yoksa testler **sessizce yeşil geçmez**: fixture patlar ve koleksiyondaki
her test o mesajla kırmızı olur. "Atlandı" satırı CI çıktısında kaybolur ve kimse
kimlik akışının hiç test edilmediğini fark etmez (CLAUDE.md #1).

---

## Şema

Migration'lar `apps/api/src/Expyra.Infrastructure/Migrations/`. **Elle uygulanır**;
uygulama açılışında migrate eden kod yok, yalnızca bekleyen migration varsa uyarı basar.

| Tablo | Ne tutar | Not |
|---|---|---|
| `language` | 49 dilin kayıt defteri | Seed migration'a gömülü; kaynak `docs/languages.json` |
| `app_user` | Hesaplar | `roles text[]`, `status` metin olarak |
| `login_code` | Tek kullanımlık giriş kodları | Kod **hash'li**; satır kullanıcıdan önce doğabilir |
| `refresh_token` | Oturum aileleri | Token hash'li; rotasyon + yeniden kullanım tespiti |
| `external_login` | Google/Apple bağı | Tablo hazır, kodu Faz 1.9'da |

Dikkat çeken index'ler:

- `ux_login_code_pending` — kısmi (`WHERE status='Pending'`): "aynı anda en fazla 1
  geçerli kod" değişmezini **veritabanı** garantiliyor.
- `ix_login_code_email_created`, `ix_login_code_ip_created` — hız sınırı sayaçları
  buradan okunuyor; ayrı bir throttle tablosu yok.
- `ix_refresh_token_family` — kısmi (`WHERE revoked_at_utc IS NULL`): aile bazlı
  toplu iptal için.
- `app_user.roles` üzerinde index **yok** — o sütunda filtreleyen sorgu yok.

### Migration ekleme

```bash
git pull --rebase   # aynı anda iki kişi migration üretmesin (FEATURE-WORKFLOW §2.3)
dotnet ef migrations add <Ad> --project apps/api/src/Expyra.Infrastructure --startup-project apps/api/src/Expyra.WebApi
pnpm api:migrate
```

EF'in ürettiği dosyalar biçim kurallarından muaf (`.editorconfig` → `[**/Migrations/*.cs]`):
elle düzeltmek anlamsız, bir sonraki üretim aynı çıktıyı yeniden yazar.

---

## Sürüm

Yerel, `docker-compose.yml` ve CI **aynı ana sürümde** olmalı. Farklı sürümler farklı
davranır ve "bende çalışıyordu" oraya taşınır. Şu an üçü de **PostgreSQL 18**.

---

## Bilinen tuzaklar

**Zaman çözünürlüğü.** .NET 100 ns üretir, `timestamptz` mikrosaniye saklar. Kesme
yapılmazsa yazılan değer okunana eşit olmaz ve aynı kaydı iki kez döndüren uç iki
farklı zaman damgası verir. Kesme tek yerde: `DateTimeOffsetExtensions.TruncateToMicroseconds`.
**`IDateTimeProvider` uygulayan her sınıf** onu çağırmalı — testteki sahte saat dahil.

**Kota sayaçları geçmiş satırlardan okunuyor.** IP ve e-posta kotaları `login_code`
tablosundaki eski satırlara bakıyor. Test veritabanı temizlenmezse testler kendi
kotalarını doldurup 429 almaya başlar; belirtisi aldatıcıdır — test tek başına geçer,
hep birlikte koşunca kırılır.

**Enum'lar metin olarak saklanıyor** (`status`, `roles`). psql'de okunabiliyor ve enum
yeniden sıralanırsa eski satırlar sessizce başka anlama gelmiyor.

**`app_user` — `user` değil.** `user` PostgreSQL'de ayrılmış kelime; EF tırnaklar ama
psql'de elle yazılan her `select * from user` patlar.

---

## Geliştirmede e-posta

Ağa çıkmıyor: `.eml` dosyası olarak diske düşüyor.

```
apps/api/src/Expyra.WebApi/.mail-drop/
```

Bu klasörde **gerçek giriş kodları** var; `.gitignore`'da `**/.mail-drop/` olarak
korunuyor. Yol çalışma dizinine göre oluştuğu için tek bir sabit yol yazmak yetmez —
CI'daki gitleaks tüm geçmişi tarıyor ve bir kez girerse geçmiş yeniden yazılana kadar
CI kırık kalır.
