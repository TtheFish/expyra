#!/usr/bin/env bash
# Local geliştirme veritabanını hazırlar.
#
# Üç ortamı da tanır ve bu sırayla dener:
#   1. Zaten çalışan bir PostgreSQL (kurulum şekli önemsiz)
#   2. Docker  → docker compose up -d
#   3. Yerel kurulum → servisi başlatmayı dener (brew / systemd / Windows servisi)
#
# Eski sürüm yalnız Homebrew biliyordu; Windows ve Linux'ta hiç çalışmıyordu.
set -euo pipefail

DB_NAME="${DB_NAME:-expyra_dev}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Windows'ta psql genelde PATH'te olmuyor; kurulum dizinini kendimiz buluyoruz.
if ! command -v psql >/dev/null 2>&1; then
  for kok in "/c/Program Files/PostgreSQL" "/mnt/c/Program Files/PostgreSQL"; do
    [ -d "$kok" ] || continue
    surum_bin=$(ls -d "$kok"/*/bin 2>/dev/null | sort -r | head -1 || true)
    [ -n "${surum_bin:-}" ] && PATH="$surum_bin:$PATH" && export PATH && break
  done
fi

hazir_mi() {
  command -v pg_isready >/dev/null 2>&1 &&
    pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null
}

echo "==> PostgreSQL kontrol ediliyor ($DB_HOST:$DB_PORT)..."

if hazir_mi; then
  echo "    Çalışıyor."
elif command -v docker >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
  echo "    Kapalı. Docker ile başlatılıyor..."
  docker compose up -d postgres
  for _ in $(seq 1 40); do hazir_mi && break; sleep 1; done
else
  echo "    Kapalı. Yerel servis başlatılmayı deneniyor..."
  if command -v brew >/dev/null 2>&1; then
    brew services start postgresql@17 || brew services start postgresql@16 || true
  elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start postgresql || true
  elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command \
      "Get-Service -Name 'postgresql*' | Where-Object Status -ne 'Running' | Start-Service" || true
  fi
  for _ in $(seq 1 30); do hazir_mi && break; sleep 1; done
fi

if ! hazir_mi; then
  cat >&2 <<'HATA'
HATA: PostgreSQL başlatılamadı.

Seçenekler:
  • Docker:  docker compose up -d postgres
  • macOS:   brew services start postgresql@17
  • Linux:   sudo systemctl start postgresql
  • Windows: Hizmetler'den "postgresql-x64-17" servisini başlat

Sunucu çalışıyor ama bu betik göremiyorsa DB_HOST / DB_PORT ver.
HATA
  exit 1
fi

# Bağlantı: şifre PGPASSWORD ortam değişkeninden gelir. Betiğe şifre YAZILMAZ —
# repoya sır girmez (CLAUDE.md #4). Şifresiz (trust/peer) kurulumlarda da çalışır.
psql_calistir() { psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres "$@"; }

if ! psql_calistir -tAc 'select 1' >/dev/null 2>&1; then
  cat >&2 <<HATA
HATA: '$DB_USER' kullanıcısıyla bağlanılamadı.

Şifre gerekiyorsa bu oturum için ver:
  export PGPASSWORD='...'        # bash
  \$env:PGPASSWORD='...'          # PowerShell

Sonra tekrar: pnpm db:up
HATA
  exit 1
fi

echo "==> '$DB_NAME' veritabanı kontrol ediliyor..."
if [ "$(psql_calistir -tAc "select 1 from pg_database where datname='$DB_NAME'")" = "1" ]; then
  echo "    Zaten var."
else
  psql_calistir -c "create database \"$DB_NAME\" owner \"$DB_USER\";" >/dev/null
  echo "    Oluşturuldu."
fi

# Testler ayrı bir veritabanı kullanır: integration testler tabloları temizliyor,
# geliştirme verisiyle aynı yerde durmaları veri kaybına davetiye.
TEST_DB="${TEST_DB:-expyra_test}"
if [ "$(psql_calistir -tAc "select 1 from pg_database where datname='$TEST_DB'")" != "1" ]; then
  psql_calistir -c "create database \"$TEST_DB\" owner \"$DB_USER\";" >/dev/null
  echo "    '$TEST_DB' (test) oluşturuldu."
fi

cat <<'SON'

Hazır. Sırada:
  pnpm api:migrate     # şemayı uygula (startup'ta ASLA otomatik değil)
  pnpm api             # API'yi çalıştır
SON
