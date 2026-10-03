# Deploy — sürüm doğrulaması

Deploy pipeline'ı henüz yok (ROADMAP 10.5). Bu dosya, hangi yolla deploy edilirse
edilsin **her deploy'un sonunda** koşulacak doğrulamayı tanımlıyor (issue #46,
vibe-check `OPS-015`). Pipeline geldiğinde bu adım onun son adımı olur.

## Neden

"Deploy bitti" ile "canlıda yeni kod koşuyor" aynı şey değil: eski konteyner
ayakta kalabilir, CDN eski web paketini sunabilir, yanlış branch derlenmiş olabilir.
Tek güvenilir kanıt, canlıdaki ikilinin **kendi** söylediği commit.

## Commit nereden geliyor

| Uç | Alan | Damga | Derlemede nasıl verilir |
|---|---|---|---|
| API `GET /api/health` | `commit`, `version`, `builtAtUtc` | `AssemblyInformationalVersion` (`1.0.0+<sha>`) | `dotnet build -p:SourceRevisionId=<sha> -p:ExpyraBuildTimeUtc=<ISO-8601>` |
| Web `GET /api/surum` | `commit`, `builtAtUtc` | `next.config.ts` → `env` (derlemede koda gömülür) | `EXPYRA_COMMIT=<sha> pnpm --filter @expyra/web build` |

İkisi de derleme anında gömülüyor, çalışma anı ortam değişkeninden okunmuyor:
eski paket + yeni ortam değişkeni "yeni sürüm" yalanını söyleyemesin diye. Bu yüzden
`EXPYRA_COMMIT`'i **çalışma anında** vermek işe yaramaz — derleme adımına verilir.

SHA verilmeden derlenen ikili `"dev"` döner. Canlıda `"dev"` görmek her zaman
hatadır: derleme adımı SHA'yı geçirmemiş demektir.

CI (`.github/workflows/ci.yml`) ikisini de `$GITHUB_SHA` ile derliyor ve
`HealthTests` API damgasının yanıta kadar ulaştığını `EXPYRA_EXPECTED_COMMIT` ile
doğruluyor.

## Deploy sonrası adım

Push edilen commit ile canlıdaki iki uç **aynı** olmalı:

```bash
expected=$(git rev-parse origin/main)          # deploy edilen commit
api=$(curl -fsS https://<api-alan-adi>/api/health | jq -r .commit)
web=$(curl -fsS https://<web-alan-adi>/api/surum  | jq -r .commit)

echo "beklenen: $expected"; echo "api:      $api"; echo "web:      $web"
[ "$api" = "$expected" ] && [ "$web" = "$expected" ] && echo "TAMAM" || { echo "UYUŞMUYOR"; exit 1; }
```

- `/api/health` veritabanı düşükken 503 döner ama gövdede `commit` yine vardır;
  `curl -f` 503'te durur — o durumda önce sağlık sorununa bakılır.
- `/api/surum` `Cache-Control: no-store` döner; arada bir CDN varsa yine de
  önbelleği atlayan bir adres kullan (ör. `?t=$(date +%s)`).
- Uyuşmazlık = deploy başarısız. Eski sürüm koşuyorsa geri dönüş gerekmez, ama
  "bitti" denmez; issue kapatılmaz.
