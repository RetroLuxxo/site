#!/bin/bash
PASTA_SITE="$(cd "$(dirname "$0")" && pwd)"
ARQUIVO="$1"

if [ -z "$ARQUIVO" ]; then
  echo "❌ Uso: bash restore.sh ~/backups/jcgames_XXXX.tar.gz"
  exit 1
fi

echo "📦 Restaurando de: $ARQUIVO"
TEMP=$(mktemp -d)
tar -xzf "$ARQUIVO" -C "$TEMP"
PASTA=$(ls "$TEMP")
SRC="$TEMP/$PASTA"

echo "⏹️  Parando containers..."
docker compose -f "$PASTA_SITE/docker-compose.yml" down

echo "🐳 Subindo banco..."
docker compose -f "$PASTA_SITE/docker-compose.yml" up -d db

echo "⏳ Aguardando banco ficar pronto..."
until docker compose -f "$PASTA_SITE/docker-compose.yml" exec -T db \
  psql -U admin postgres -c "SELECT 1" > /dev/null 2>&1; do
  echo "   aguardando..."
  sleep 2
done
echo "   ✅ Banco pronto!"

echo "🗑️  Limpando banco existente..."
docker compose -f "$PASTA_SITE/docker-compose.yml" exec -T db \
  psql -U admin postgres -c "DROP DATABASE IF EXISTS jc_games_db;"
docker compose -f "$PASTA_SITE/docker-compose.yml" exec -T db \
  psql -U admin postgres -c "CREATE DATABASE jc_games_db;"

echo "🗄️  Restaurando banco..."
docker compose -f "$PASTA_SITE/docker-compose.yml" exec -T db \
  psql -U admin jc_games_db < "$SRC/banco.sql"
echo "   ✅ Banco restaurado"

if [ -d "$SRC/uploads" ]; then
  echo "🖼️  Restaurando imagens..."
  docker compose -f "$PASTA_SITE/docker-compose.yml" up -d backend
  sleep 3
  docker compose -f "$PASTA_SITE/docker-compose.yml" cp \
    "$SRC/uploads" jc_backend:/app/uploads
  echo "   ✅ Imagens restauradas"
fi

docker compose -f "$PASTA_SITE/docker-compose.yml" up -d
rm -rf "$TEMP"

echo ""
echo "✅ Restore concluído!"
