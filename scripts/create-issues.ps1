<#
.SYNOPSIS
  Açık işleri GitHub issue'su olarak açar.

.DESCRIPTION
  CLAUDE.md: "Yeni iş çıkınca GitHub issue aç, Obsidian'a değil."

  Betik İDEMPOTENT: aynı başlıkta AÇIK bir issue varsa yenisini açmıyor.
  İki kez çalıştırmak güvenli — ikinci koşuda "atlandı" der ve çıkar.

  Kapanmış bir issue'nun başlığı tekrar geçerse YENİSİ açılıyor. Sebep: kapalı
  bir işi "zaten var" diye atlamak, geri gelen bir hatayı görünmez yapardı.

.PARAMETER DryRun
  Hiçbir şey açmaz, ne açacağını yazar. Önce bununla çalıştır.

.EXAMPLE
  gh auth login
  ./scripts/create-issues.ps1 -DryRun
  ./scripts/create-issues.ps1
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# --- Ön koşullar -------------------------------------------------------------

# Kuru koşu HİÇBİR ön koşul istemiyor: amacı ne açılacağını göstermek ve o soru
# oturum açmadan da sorulabilmeli. Kontrolleri kuru koşuya da uygulamak,
# "önce şunu kur" diyerek listeye bakmayı engellerdi.
if (-not $DryRun) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "gh bulunamadı. https://cli.github.com/ üzerinden kur."
    }

    # `gh auth status` oturum yoksa sıfırdan farklı dönüyor. Kontrolü burada
    # yapmak, on beşinci issue'da "unauthorized" almaktan iyi.
    #
    # `2>&1 | Out-Null`: gh mesajı stderr'e yazıyor ve PowerShell onu
    # NativeCommandError'a çeviriyor — çıktı bastırılmazsa kullanıcı kendi
    # hata mesajımız yerine bir yığın izi görüyor.
    & gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "gh oturumu yok. Önce: gh auth login"
    }
}

# --- Etiketler ---------------------------------------------------------------
#
# Etiket YOKSA gh issue create hata veriyor, o yüzden önce kuruluyorlar.
# `--force` var olanı güncelliyor; renk/açıklama değişirse tek kaynak bu dosya.

$labels = @(
    @{ Name = 'blok';       Color = '0e8a16'; Description = 'PLAN.md feature bloğu' },
    @{ Name = 'eksik';      Color = 'd93f0b'; Description = 'Bilinen açık eksik' },
    @{ Name = 'erisilebilirlik'; Color = '5319e7'; Description = 'WCAG / erişilebilirlik' },
    @{ Name = 'performans'; Color = 'fbca04'; Description = 'Boyut, süre, kaynak kullanımı' },
    @{ Name = 'teknik-borc'; Color = 'c2e0c6'; Description = 'Çalışıyor ama taşınması gereken' },
    @{ Name = 'bloke';      Color = 'b60205'; Description = 'Dış bağımlılık bekliyor' }
)

if (-not $DryRun) {
    foreach ($label in $labels) {
        & gh label create $label.Name --color $label.Color --description $label.Description --force 2>&1 | Out-Null
    }
}

# --- Açılacak işler ----------------------------------------------------------
#
# Gövdeler burada YAZILI, docs'tan üretilmiyor: issue kapandıktan sonra da
# okunabilir olmalı ve doküman o arada değişmiş olabilir. Dosya referansı
# veriliyor ki ayrıntı için nereye bakılacağı belli olsun.

$issues = @(
    @{
        Title  = 'Hero videoları 41 MiB — yeniden kodlanmalı'
        Labels = 'eksik,performans,bloke'
        Body   = @'
`apps/web/public/brand/clips/` altındaki üç klip toplam ~41 MiB:

| Dosya | Boyut |
|---|---|
| `01-balik.mp4` | 8,8 MiB |
| `02-teyze.mp4` | 15,9 MiB |
| `03-balloon.mp4` | 16,3 MiB |

Ana sayfa ilk klibi hemen, ikincisini hemen ardından yüklüyor — ilk ziyarette
~25 MiB. Mobil veriyle açan biri için kabul edilemez.

**Neden hâlâ açık:** geliştirme makinesinde `ffmpeg` yok.

**Yapılacak:**

```bash
ffmpeg -i 01-balik.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 30 -preset slow \
  -an -movflags +faststart 01-balik.min.mp4
```

Hedef klip başına 1,5–2 MiB. `-an` sesi atıyor (klipler zaten sessiz),
`+faststart` metadata'yı başa alıyor.

**Kod tarafında ayrıca** (ffmpeg gerektirmiyor, ama `hero-wallpaper.tsx`
içindeki durum makinesi kırılgan — tarayıcıda doğrulanmadan girilmemeli):

- İkinci klibin ön yüklemesini geçişe birkaç saniye kala başlatmak.
- `navigator.connection.saveData` ve yavaş bağlantıda poster görselinde kalmak.

Ayrıntı: `docs/ACIK-EKSIKLER.md` §1
'@
    },
    @{
        Title  = 'Host görsel başına alternatif metin girebilmeli'
        Labels = 'eksik,erisilebilirlik'
        Body   = @'
`experience_media` satırında alternatif metin alanı yok, dolayısıyla misafir
detayındaki galeri `alt=""` ile çiziliyor.

**Bugünkü hâli savunulabilir:** host'tan alt metin alınmıyor ve uydurulacak her
metin ("deneyimden bir kare") ekran okuyucuya bilgi değil gürültü taşır. Kapak
görselinde `alt=""` zaten doğru — hemen yanında başlık duruyor.

**Eksik olan** host'tan alt metin İSTEYEBİLMEK:

- [ ] `experience_media.alt_text` sütunu + migration
- [ ] `PATCH .../media/{mediaId}` gövdesine alan
- [ ] Yükleyici arayüzünde görsel başına metin alanı
- [ ] Misafir detayında `alt` dolduruluyor, boşsa `alt=""` kalıyor

Alt metnin DİLİ ayrı bir soru: ilanın orijinal dilinde mi, çeviri tablosunda mı?
`docs/I18N.md` §2'nin fallback zinciriyle tutarlı olmalı.

Ayrıntı: `docs/ACIK-EKSIKLER.md` §2
'@
    },
    @{
        Title  = 'apiBaseUrl ve problemOf dört BFF dosyasında kopyalanmış'
        Labels = 'teknik-borc'
        Body   = @'
Her `features/<alan>/api.ts` dosyası `apiBaseUrl()` ve `problemOf()`
fonksiyonlarını yerel olarak yeniden tanımlıyor:

- `features/auth/api.ts`
- `features/places/api.ts`
- `features/host/experiences-api.ts`
- `features/experiences/api.ts`

Blok 7'de yeni dosya AÇILMADI (takvim/fiyat uçları mevcut dosyalara eklendi,
çünkü aynı kaynağın altındalar ve aynı kapıyı kullanıyorlar) ama bir sonraki
alan bunu tekrar soracak.

**Yapılacak:** `lib/api-client.ts` — `apiBaseUrl`, `problemOf`,
`validationErrorsOf` ve `send` tek yere. Atomik bir PR; imzalar değişmiyor.

Dikkat: `problemOf`in iki sürümü FARKLI davranıyor — host kopyası gövdeyi
ayrıştırıp `errors` sözlüğünü okuyor, misafir kopyası yalnız durum kodunu
taşıyor (gerekçesi dosyada yazılı). Taşıma bu farkı korumalı ya da bilinçli
olarak kaldırmalı.
'@
    },
    @{
        Title  = 'Host tarafında tekil ilan GET ucu yok'
        Labels = 'teknik-borc'
        Body   = @'
`HostExperiencesController` liste ucu taşıyor ama `GET /{id}` yok. Web tarafı
bu yüzden listeyi çekip içinden seçiyor (`fetchHostExperience`).

Bedeli görünür: ilan sayısı büyüdükçe düzenleme sayfası gereksiz satır taşıyor.

**Yapılacak:** `GET /api/host/experiences/{id}` eklendiğinde
`fetchHostExperience`in gövdesi tek satıra iniyor ve çağıranların hiçbiri
değişmiyor.
'@
    },
    @{
        Title  = 'Host takviminde ay ızgarası'
        Labels = 'blok'
        Body   = @'
Takvim bölümü bugün düz bir liste: haftalık kurallar, kapalı günler ve
yaklaşan on iki seans.

Izgara BİLİNÇLİ olarak yazılmadı: bir takvim ızgarası klavye gezinmesi (ok
tuşları, `grid` rolü, `aria-selected`) ve odak yönetimi demek — yarım yapılmış
bir ızgara düz listeden daha erişilemez olur.

**Gerçekten gerektiğinde** (host'un aylık doluluğu bir bakışta görmesi
gerektiğinde) kendi işi olarak açılsın. Şartı: klavye gezinmesi ilk günden
çalışsın.

Bugünkü hâli: `apps/web/src/app/[lang]/host/experience/[id]/page.tsx`,
`ScheduleSection`.
'@
    },
    @{
        Title  = 'pnpm check web için typecheck çalıştırmıyor'
        Labels = 'teknik-borc'
        Body   = @'
`apps/web/package.json` içinde `typecheck` betiği var (`tsc --noEmit`) ama
kök `pnpm check` onu çağırmıyor.

Kapsam AÇIK DEĞİL: `next build` zaten tip denetimi yapıyor, yani hata CI'da
yakalanıyor. Eksik olan hızlı geri bildirim — `tsc --noEmit` saniyeler
sürüyor, `next build` on saniyeden fazla.

**Yapılacak:** `pnpm -r --if-present typecheck` adımını `check`e ekle, lint'ten
önce.
'@
    }
)

# --- Blok takip issue'ları ---------------------------------------------------
#
# Blok 1-7 BİTTİ, açılmıyorlar. Blok 18 bloke (şirket kaydı) ve öyle
# işaretleniyor.

$blocks = @(
    @{ Number = 8;  Title = 'Keşif: arama, filtre, boş sonuç'; Size = 'L'; Note = 'Bloğun ilk yarısı Blok 7''yi beklemiyordu; artık ikisi de hazır.' },
    @{ Number = 9;  Title = 'Rezervasyon';                     Size = 'L'; Note = 'Blok 7 bitti, bu doğrudan devamı. RemainingCapacity yazması burada başlıyor — satır kilidi altında.' },
    @{ Number = 10; Title = 'Bildirimler';                     Size = 'M'; Note = 'Outbox + BackgroundService. Gerçek e-posta sağlayıcısı yok ama uçtan uca FileSystemEmailSender ile yazılabilir.' },
    @{ Number = 11; Title = 'Ödeme (sahte sağlayıcı) + makbuz + kazanç'; Size = 'L'; Note = 'Fiş animasyonu için referans: https://www.dqnamo.com/experiments/receipt-printer' },
    @{ Number = 12; Title = 'Bilet ve check-in';               Size = 'L'; Note = 'Bugünkü bilet imzasız bir QR taşıyor ve "demo" işareti gerekiyor.' },
    @{ Number = 13; Title = 'İptal ve iade';                   Size = 'M'; Note = '' },
    @{ Number = 14; Title = 'Yorum ve puan';                   Size = 'M'; Note = 'Bugün buton disabled.' },
    @{ Number = 15; Title = 'Favoriler ve haber ver';          Size = 'S'; Note = '' },
    @{ Number = 16; Title = 'Hesap durumu, şikayet, ban uygulaması'; Size = 'M'; Note = 'Ban kapısı var, yönetim aracı yok.' },
    @{ Number = 17; Title = 'SEO, paylaşım, indekslenebilirlik'; Size = 'M'; Note = '' },
    @{ Number = 19; Title = 'Mobil (Expo)';                    Size = 'L'; Note = 'Önce packages/shared-types OpenAPI üretimi kurulmalı.' },
    @{ Number = 20; Title = 'Prod sertleştirme';               Size = 'L'; Note = '' }
)

foreach ($block in $blocks) {
    $note = if ($block.Note) { "`n`n$($block.Note)" } else { '' }

    $issues += @{
        Title  = "Blok $($block.Number) — $($block.Title)"
        Labels = 'blok'
        Body   = "Kapsam, kabul kriterleri ve tuzaklar: ``docs/PLAN.md`` içinde ``### Blok $($block.Number)``.`n`nBoyut: $($block.Size)$note`n`n---`n`nBu bir TAKİP issue'su. İş PR'lara bölünürken alt issue açılabilir; kabul kriterleri PLAN'da tek kaynak olarak duruyor."
    }
}

$issues += @{
    Title  = 'Blok 18 — Gerçek Stripe Connect'
    Labels = 'blok,bloke'
    Body   = "Kapsam: ``docs/PLAN.md`` ``### Blok 18``.`n`n**BLOKE: şirket kaydı yok.**`n`nBlok 11 sahte sağlayıcıyla tam yazılıyor; kısayol alınmazsa bu blok gerçekten ""ikinci implementasyon"" oluyor. Para kısıtları (``docs/payment-constraints.json``) ve ``PaymentCurrencyRules`` zaten Stripe'a göre kurgulandı."
}

# --- Açılış -------------------------------------------------------------------

Write-Host ""
Write-Host "Açılacak issue sayısı: $($issues.Count)" -ForegroundColor Cyan
Write-Host ""

# Var olan AÇIK başlıklar tek çağrıda okunuyor: issue başına `gh issue list`
# çalıştırmak yirmi tur eder.
$existing = @()
if (-not $DryRun) {
    $existing = (& gh issue list --state open --limit 500 --json title | ConvertFrom-Json).title
}

$created = 0
$skipped = 0

foreach ($issue in $issues) {
    if ($existing -contains $issue.Title) {
        Write-Host "  atlandı  $($issue.Title)" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    if ($DryRun) {
        Write-Host "  [kuru]   $($issue.Title)  [$($issue.Labels)]" -ForegroundColor DarkGray
        continue
    }

    # Gövde dosyadan veriliyor: uzun metni komut satırına gömmek Windows'ta
    # argüman uzunluğu sınırına takılıyor ve satır sonlarını bozuyor.
    $bodyFile = New-TemporaryFile
    Set-Content -Path $bodyFile -Value $issue.Body -Encoding utf8

    try {
        & gh issue create `
            --title $issue.Title `
            --body-file $bodyFile `
            --label $issue.Labels `
            --assignee '@me'

        if ($LASTEXITCODE -ne 0) {
            throw "gh issue create başarısız: $($issue.Title)"
        }

        $created++
    }
    finally {
        Remove-Item $bodyFile -ErrorAction SilentlyContinue
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "Kuru koşu. Gerçekten açmak için -DryRun olmadan çalıştır." -ForegroundColor Yellow
} else {
    Write-Host "Açılan: $created · Atlanan: $skipped" -ForegroundColor Green
}
