#!/bin/bash
# ╔══════════════════════════════════════════╗
# ║     JC Games Store — Reset Completo      ║
# ╚══════════════════════════════════════════╝

PASTA_SITE="$(cd "$(dirname "$0")" && pwd)"

echo "⚠️  Isso vai APAGAR tudo e reinstalar do zero!"
read -p "Tem certeza? [S/n]: " CONFIRM
CONFIRM=${CONFIRM:-S}
[[ ! "$CONFIRM" =~ ^[Ss]$ ]] && echo "Cancelado." && exit 0

cd "$PASTA_SITE"
docker compose down -v --rmi all

cd "$(dirname "$PASTA_SITE")"
mv "$PASTA_SITE" "${PASTA_SITE}.bak_$(date +%Y%m%d_%H%M)"

git clone https://github.com/RetroLuxxo/site.git "$PASTA_SITE"
cd "$PASTA_SITE"
bash setup.sh
