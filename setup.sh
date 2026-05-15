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

IP_LOCAL=$(ip route get 1 | awk '{print $7}' | head -1)

echo -e "${YELLOW}Tipo de instalação:${NC}"
echo "  1) Servidor local (rede interna)"
echo "  2) VPS com domínio (produção)"
read -p "Escolha (1 ou 2): " TIPO
echo ""

if [ "$TIPO" = "2" ]; then
    echo -e "${BLUE}━━━ DOMÍNIO ━━━${NC}"
    read -p "Domínio (ex: jcgames.com.br): " DOMINIO
    API_URL="https://${DOMINIO}"
    FRONTEND_URL="https://${DOMINIO}"
    AMBIENTE="PRODUCAO"
    echo -e "${GREEN}✅ Domínio: ${DOMINIO}${NC}"
else
    API_URL="http://${IP_LOCAL}:8000"
    FRONTEND_URL="http://${IP_LOCAL}:3000"
    AMBIENTE="LOCAL"
    echo -e "${GREEN}✅ IP detectado: ${IP_LOCAL}${NC}"
fi
echo ""

echo -e "${BLUE}━━━ BANCO DE DADOS ━━━${NC}"
read -p "Senha do banco: " DB_PASS
echo ""

JWT_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo -e "${GREEN}✅ Chave JWT gerada!${NC}"
echo ""

echo -e "${BLUE}━━━ EMAIL (Gmail) ━━━${NC}"
read -p "Seu email Gmail: " EMAIL_USER
read -p "Senha de App (xxxx xxxx xxxx xxxx): " EMAIL_PASS
read -p "Email do admin: " EMAIL_ADMIN
echo ""

echo -e "${BLUE}━━━ CLOUDINARY (upload de imagens) ━━━${NC}"
read -p "Cloud Name (ex: drpfwdjfg): " CLOUDINARY_CLOUD_NAME
read -p "Upload Preset (ex: jcgames_upload): " CLOUDINARY_PRESET
echo ""

echo -e "${BLUE}━━━ PAGBANK ━━━${NC}"
read -p "Token PagBank: " PAGBANK_TOKEN
echo "  1) sandbox (testes)"
echo "  2) production (producao)"
read -p "Ambiente (1 ou 2): " PAGBANK_CHOICE
if [ "$PAGBANK_CHOICE" = "2" ]; then
    PAGBANK_ENV="production"
else
    PAGBANK_ENV="sandbox"
fi
echo ""

echo -e "${YELLOW}Gerando arquivos...${NC}"

cat > docker-compose.yml << COMPOSE
services:
  db:
    image: postgres:16-alpine
    container_name: ecommerce_db
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: $DB_PASS
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
      DATABASE_URL: postgresql://admin:$DB_PASS@db/jc_games_db
      SECRET_KEY: $JWT_KEY
      EMAIL_USER: $EMAIL_USER
      EMAIL_PASS: "$EMAIL_PASS"
      EMAIL_ADMIN: $EMAIL_ADMIN
      API_URL: $API_URL
      CLOUDINARY_CLOUD_NAME: $CLOUDINARY_CLOUD_NAME
      CLOUDINARY_PRESET: $CLOUDINARY_PRESET
      PAGBANK_TOKEN: $PAGBANK_TOKEN
      PAGBANK_ENV: "$PAGBANK_ENV"
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

echo "NEXT_PUBLIC_API_URL=${API_URL}" > frontend/.env.local
echo "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}" >> frontend/.env.local
echo "NEXT_PUBLIC_CLOUDINARY_PRESET=${CLOUDINARY_PRESET}" >> frontend/.env.local

cat > ~/credenciais.txt << CREDS
=====================================
 JC GAMES STORE - CREDENCIAIS
 GUARDE COM SEGURANCA!
=====================================
AMBIENTE: $AMBIENTE

ACESSO
------
Loja:    $FRONTEND_URL
Admin:   $FRONTEND_URL/admin
API:     $API_URL
Adminer: http://$IP_LOCAL:8180

BANCO
-----
Usuario: admin
Senha:   $DB_PASS

EMAIL
-----
Conta:        $EMAIL_USER
Senha de App: $EMAIL_PASS
Admin:        $EMAIL_ADMIN

CLOUDINARY
----------
Cloud Name: $CLOUDINARY_CLOUD_NAME
Preset:     $CLOUDINARY_PRESET

PAGBANK
-------
Token:    $PAGBANK_TOKEN
Ambiente: $PAGBANK_ENV

JWT
---
Chave: $JWT_KEY

APOS SUBIR
----------
Rode: make tornar-superadmin admin=$EMAIL_ADMIN

GITHUB
------
https://github.com/RetroLuxxo/site
=====================================
CREDS

echo ""
# Inserir configs iniciais no banco após subir
echo -e "${YELLOW}Aguardando banco inicializar...${NC}"
sleep 5
docker exec ecommerce_db psql -U admin -d jc_games_db -c "
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('pagbank_token', '${PAGBANK_TOKEN}', 'Token do PagBank'),
('pagbank_env', '${PAGBANK_ENV}', 'Ambiente PagBank'),
('email_user', '${EMAIL_USER}', 'Email Gmail'),
('email_pass', '${EMAIL_PASS}', 'Senha de App Gmail'),
('email_admin', '${EMAIL_ADMIN}', 'Email admin'),
('cloudinary_cloud_name', '${CLOUDINARY_CLOUD_NAME}', 'Cloud Name Cloudinary'),
('cloudinary_preset', '${CLOUDINARY_PRESET}', 'Upload Preset Cloudinary'),
('loja_nome', '', 'Nome da loja'),
('loja_descricao', '', 'Descrição da loja'),
('loja_logo', '', 'Logo da loja'),
('loja_cor_primaria', '#8B2FC9', 'Cor primária'),
('loja_cor_fundo', '#0a0010', 'Cor de fundo'),
('loja_cor_botao', '#8B2FC9', 'Cor dos botões'),
('loja_cor_texto', '#ffffff', 'Cor do texto'),
('loja_cor_texto_botao', '#ffffff', 'Cor texto botões'),
('loja_cor_nome_loja', '#8B2FC9', 'Cor nome loja parte 1'),
('loja_cor_nome_loja2', '#ffffff', 'Cor nome loja parte 2'),
('loja_transparencia_cards', '0.08', 'Transparência cards'),
('loja_tamanho_fonte', '14', 'Tamanho fonte'),
('loja_tamanho_fonte_botao', '12', 'Tamanho fonte botões'),
('loja_tamanho_logo', '32', 'Tamanho logo'),
('loja_tamanho_nome_loja', '18', 'Tamanho nome loja'),
('loja_fonte', 'Orbitron', 'Fonte Google Fonts')
ON CONFLICT (chave) DO NOTHING;
" 2>/dev/null || echo "⚠️  Banco ainda não pronto — rode make up primeiro"

echo -e "${GREEN}✅ Configuracao concluida!${NC}"
echo -e "📄 Credenciais: ~/credenciais.txt"
echo ""
echo -e "${YELLOW}━━━ PRÓXIMOS PASSOS ━━━${NC}"
echo -e "1️⃣  Suba o projeto:  ${BLUE}make up${NC}"
echo -e "2️⃣  Acesse a loja:   ${BLUE}${FRONTEND_URL}${NC}"
echo -e "3️⃣  Faça o CADASTRO com o email: ${YELLOW}${EMAIL_ADMIN}${NC}"
echo -e "4️⃣  Depois rode este comando para virar Super Admin:"
echo ""
echo -e "${YELLOW}make tornar-superadmin admin=${EMAIL_ADMIN}${NC}"
echo ""
