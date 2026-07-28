#!/usr/bin/env bash
#
# Projeyi yeniden adlandırır: Tajriba -> <YeniAd>
#
# Kullanım:  ./scripts/rename.sh Wandr
#
# Neyi değiştirir:
#   - .NET namespace'leri, proje ve klasör adları, solution dosyası
#   - package.json isimleri (@tajriba/* -> @yeniad/*)
#   - workspace filtreleri, script'ler, docs içindeki referanslar
#
# Neyi DEĞİŞTİRMEZ: git geçmişi, veritabanı adı (onu elle yap).
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Kullanım: $0 <YeniAd>    (örn: $0 Wandr)" >&2
  exit 1
fi

OLD_PASCAL="Tajriba"
NEW_PASCAL="$1"
OLD_LOWER="$(echo "$OLD_PASCAL" | tr '[:upper:]' '[:lower:]')"
NEW_LOWER="$(echo "$NEW_PASCAL" | tr '[:upper:]' '[:lower:]')"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "==> $OLD_PASCAL -> $NEW_PASCAL  ($OLD_LOWER -> $NEW_LOWER)"
echo "    Dizin: $ROOT"
echo

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "HATA: Çalışma dizini temiz değil. Önce commit et veya stash'le." >&2
  exit 1
fi

echo "==> Derlenmiş çıktılar temizleniyor..."
find . -type d \( -name bin -o -name obj -o -name node_modules -o -name .next \) \
  -prune -exec rm -rf {} + 2>/dev/null || true

echo "==> Dosya içerikleri güncelleniyor..."
grep -rl --binary-files=without-match -e "$OLD_PASCAL" -e "$OLD_LOWER" . \
  --exclude-dir=.git \
  | while read -r file; do
      sed -i '' -e "s/$OLD_PASCAL/$NEW_PASCAL/g" -e "s/$OLD_LOWER/$NEW_LOWER/g" "$file"
    done

echo "==> Klasör ve dosya adları güncelleniyor..."
# En derinden başla ki üst klasör yeniden adlandırılınca yol bozulmasın
find . -depth -name "*${OLD_PASCAL}*" -not -path "./.git/*" | while read -r path; do
  newpath="$(dirname "$path")/$(basename "$path" | sed "s/$OLD_PASCAL/$NEW_PASCAL/g")"
  mv "$path" "$newpath"
done

echo
echo "Bitti. Şimdi doğrula:"
echo "  pnpm install && pnpm check"
echo
echo "Elle yapman gerekenler:"
echo "  1. GitHub repo adını değiştir"
echo "  2. Veritabanı adı: ${OLD_LOWER}_dev -> ${NEW_LOWER}_dev (appsettings.Development.json + createdb)"
echo "  3. Logo dosyalarını değiştir"
