#!/usr/bin/env bash
# Local geliştirme veritabanını hazırlar (Homebrew PostgreSQL).
# Docker kullanıyorsan bunun yerine: docker compose up -d
set -euo pipefail

DB_NAME="${DB_NAME:-tajriba_dev}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo "==> PostgreSQL çalışıyor mu kontrol ediliyor..."
if ! pg_isready -q 2>/dev/null; then
  echo "    PostgreSQL kapalı, başlatılıyor..."
  brew services start postgresql@16
  # Servisin ayağa kalkmasını bekle
  for _ in $(seq 1 30); do
    pg_isready -q 2>/dev/null && break
    sleep 1
  done
fi

if ! pg_isready -q 2>/dev/null; then
  echo "HATA: PostgreSQL başlatılamadı. 'brew services list' ile kontrol et." >&2
  exit 1
fi

echo "==> '$DB_USER' rolü kontrol ediliyor..."
if ! psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  psql -d postgres -c "CREATE ROLE $DB_USER LOGIN SUPERUSER PASSWORD '$DB_PASSWORD';"
  echo "    '$DB_USER' rolü oluşturuldu."
else
  echo "    '$DB_USER' rolü zaten var."
fi

echo "==> '$DB_NAME' veritabanı kontrol ediliyor..."
if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  createdb -O "$DB_USER" "$DB_NAME"
  echo "    '$DB_NAME' oluşturuldu."
else
  echo "    '$DB_NAME' zaten var."
fi

echo
echo "Hazır. Şimdi migration'ları uygula:"
echo "  pnpm api:migrate"
