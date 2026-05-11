#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       JC GAMES STORE — Setup             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

IP=$(ip route get 1 | awk '{print $7}' | head -1)
echo -e "${GREEN}✅ IP detectado: $IP${NC}"
echo ""

echo -e "${BLUE}━━━ BANCO DE DADOS ━━━${NC}"
read -p "Senha do banco: " DB_PASS
echo ""

JWT_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo -e "${GREEN}✅ Chave JWT gerada automaticamente!${NC}"
echo ""

echo -e "${BLUE}━━━ EMAIL (Gmail) ━━━${NC}"
read -p "Seu email Gmail: " EMAIL_USER
read -p "Senha de App (xxxx xxxx xxxx xxxx): " EMAIL_PASS
read -p "Email do admin: " EMAIL_ADMIN
echo ""

echo -e "${BLUE}━━━ PAGBANK ━━━${NC}"
read -p "Token PagBank: " PAGBANK_TOKEN
echo "1) sandbox  2) production"
read -p "Ambiente (1 ou 2): " PAGBANK_CHOICE
[ "$PAGBANK_CHOICE" = "2" ] && PAGBANK_ENV="production" || PAGBANK_ENV="sandbox"
echo ""

cat > docker-compose.yml << COMPOSE
services:
  db:
    image: postgres:16-alpine
    container_name: ecommerce_db
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: jc_games_db
    volumes:
      - postgres_data:/var/lib/postgresql
    ports:
      - "5432:5432"
  adminer:
    image: adminer
    restart: always
    ports:
      - "8180:8080"
  backend:
    build: ./backend
    container_name: jc_backend
    restart: always
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASS}@db/jc_games_db
      SECRET_KEY: ${JWT_KEY}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASS: "${EMAIL_PASS}"
      EMAIL_ADMIN: ${EMAIL_ADMIN}
      PAGBANK_TOKEN: ${PAGBANK_TOKEN}
      PAGBANK_ENV: "${PAGBANK_ENV}"
  frontend:
    build: ./frontend
    container_name: jc_frontend
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - backend
volumes:
  postgres_data:
COMPOSE

echo "NEXT_PUBLIC_API_URL=http://${IP}:8000" > frontend/.env.local

cat > ~/credenciais.txt << CREDS
=====================================
 JC GAMES STORE — CREDENCIAIS
=====================================
IP:           ${IP}
Loja:         http://${IP}:3000
Admin:        http://${IP}:3000/admin
Adminer:      http://${IP}:8180

Banco senha:  ${DB_PASS}
Email:        ${EMAIL_USER}
Email senha:  ${EMAIL_PASS}
Email admin:  ${EMAIL_ADMIN}
PagBank:      ${PAGBANK_TOKEN}
Ambiente:     ${PAGBANK_ENV}
JWT:          ${JWT_KEY}

Após subir execute no Adminer:
UPDATE usuarios SET is_admin = TRUE WHERE email = '${EMAIL_ADMIN}';
=====================================
CREDS

echo ""
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo -e "📄 Credenciais salvas em: ~/credenciais.txt"
echo ""
echo -e "🚀 Agora rode: ${BLUE}make up${NC}"
