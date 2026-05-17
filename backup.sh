#!/bin/bash
# ╔══════════════════════════════════════════╗
# ║     JC Games Store — Backup Completo     ║
# ╚══════════════════════════════════════════╝

PASTA_SITE="$(cd "$(dirname "$0")" && pwd)"
DATA=$(date +%Y-%m-%d_%H-%M)
DESTINO="$HOME/backups/jcgames_$DATA"

mkdir -p "$DESTINO"
echo "📦 Backup iniciado: $DESTINO"

# 1. Banco de dados
echo "🗄️  Exportando banco..."
docker compose -f "$PASTA_SITE/docker-compose.yml" exec -T db \
  pg_dump -U admin jc_games_db > "$DESTINO/banco.sql"
echo "   ✅ banco.sql"

# 2. Imagens dos produtos
echo "🖼️  Copiando imagens..."
docker compose -f "$PASTA_SITE/docker-compose.yml" cp \
  jc_backend:/app/uploads "$DESTINO/uploads" 2>/dev/null \
  && echo "   ✅ uploads/" || echo "   ⚠️  Sem pasta uploads"

# 3. Configurações (.env / docker-compose.yml)
echo "⚙️  Copiando configurações..."
cp "$PASTA_SITE/docker-compose.yml" "$DESTINO/docker-compose.yml"
echo "   ✅ docker-compose.yml"

# 4. Compactar tudo
echo "🗜️  Compactando..."
tar -czf "$HOME/backups/jcgames_$DATA.tar.gz" -C "$HOME/backups" "jcgames_$DATA"
rm -rf "$DESTINO"

echo ""
echo "✅ Backup salvo em: ~/backups/jcgames_$DATA.tar.gz"
ls -lh "$HOME/backups/jcgames_$DATA.tar.gz"
