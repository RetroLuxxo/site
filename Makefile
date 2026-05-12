# ============================================================
#  JC GAMES STORE — Makefile
#  Uso: make <comando>
# ============================================================

.PHONY: help up down restart build build-frontend build-backend \
        logs logs-backend logs-frontend logs-db \
        shell-backend shell-frontend shell-db \
        importar-produtos backup-db status limpar

# Cores
GREEN  = \033[0;32m
YELLOW = \033[0;33m
BLUE   = \033[0;34m
RED    = \033[0;31m
NC     = \033[0m

# ============================================================
# AJUDA
# ============================================================
help:
	@echo ""
	@echo "$(BLUE)╔══════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║       JC GAMES STORE — Makefile          ║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)📦 CONTAINERS$(NC)"
	@echo "  make up              → Sobe todos os containers"
	@echo "  make down            → Para todos os containers"
	@echo "  make restart         → Reinicia tudo"
	@echo "  make status          → Status dos containers"
	@echo ""
	@echo "$(GREEN)🔨 BUILD$(NC)"
	@echo "  make build           → Rebuilda tudo do zero"
	@echo "  make build-frontend  → Rebuilda só o frontend"
	@echo "  make build-backend   → Rebuilda só o backend"
	@echo ""
	@echo "$(GREEN)📋 LOGS$(NC)"
	@echo "  make logs            → Logs de todos"
	@echo "  make logs-backend    → Logs do backend"
	@echo "  make logs-frontend   → Logs do frontend"
	@echo "  make logs-db         → Logs do banco"
	@echo ""
	@echo "$(GREEN)🖥️  SHELL$(NC)"
	@echo "  make shell-backend   → Abre shell no backend"
	@echo "  make shell-frontend  → Abre shell no frontend"
	@echo "  make shell-db        → Abre psql no banco"
	@echo ""
	@echo "$(GREEN)🛠️  UTILIDADES$(NC)"
	@echo "  make importar-produtos CSV=arquivo.csv → Importa produtos"
	@echo "  make backup-db       → Faz backup do banco"
	@echo "  make limpar          → Remove imagens e volumes não usados\n  make tornar-admin admin=email → Torna usuário Admin\n  make tornar-superadmin admin=email → Torna Super Admin"
	@echo ""

# ============================================================
# CONTAINERS
# ============================================================
up:
	@echo "$(GREEN)▶ Subindo containers...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✅ Containers rodando!$(NC)"
	@echo "   🌐 Loja:    http://$(shell hostname -I | awk '{print $$1}'):3000"
	@echo "   ⚙️  Admin:   http://$(shell hostname -I | awk '{print $$1}'):3000/admin"
	@echo "   🔌 API:     http://$(shell hostname -I | awk '{print $$1}'):8000"
	@echo "   🗄️  Adminer: http://$(shell hostname -I | awk '{print $$1}'):8180"

down:
	@echo "$(YELLOW)⏹ Parando containers...$(NC)"
	docker compose down
	@echo "$(GREEN)✅ Containers parados!$(NC)"

restart:
	@echo "$(YELLOW)🔄 Reiniciando...$(NC)"
	docker compose down
	docker compose up -d
	@echo "$(GREEN)✅ Reiniciado!$(NC)"

status:
	@echo "$(BLUE)📊 Status dos containers:$(NC)"
	docker compose ps

# ============================================================
# BUILD
# ============================================================
build:
	@echo "$(YELLOW)🔨 Rebuilding tudo do zero (pode demorar)...$(NC)"
	docker compose build --no-cache
	docker compose up -d
	@echo "$(GREEN)✅ Build completo!$(NC)"

build-frontend:
	@echo "$(YELLOW)🔨 Rebuilding frontend...$(NC)"
	docker compose build --no-cache frontend
	docker compose up -d
	@echo "$(GREEN)✅ Frontend rebuilado!$(NC)"

build-backend:
	@echo "$(YELLOW)🔨 Rebuilding backend...$(NC)"
	docker compose build --no-cache backend
	docker compose up -d
	@echo "$(GREEN)✅ Backend rebuilado!$(NC)"

# ============================================================
# LOGS
# ============================================================
logs:
	docker compose logs -f --tail=50

logs-backend:
	docker compose logs -f --tail=50 backend

logs-frontend:
	docker compose logs -f --tail=50 frontend

logs-db:
	docker compose logs -f --tail=50 db

# ============================================================
# SHELL
# ============================================================
shell-backend:
	@echo "$(BLUE)🖥️  Abrindo shell no backend...$(NC)"
	docker exec -it jc_backend bash

shell-frontend:
	@echo "$(BLUE)🖥️  Abrindo shell no frontend...$(NC)"
	docker exec -it jc_frontend sh

shell-db:
	@echo "$(BLUE)🗄️  Abrindo psql...$(NC)"
	docker exec -it ecommerce_db psql -U admin -d jc_games_db

# ============================================================
# UTILIDADES
# ============================================================
importar-produtos:
	@if [ -z "$(CSV)" ]; then \
		echo "$(RED)❌ Informe o arquivo CSV: make importar-produtos CSV=arquivo.csv$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)📦 Importando produtos de $(CSV)...$(NC)"
	@python3 -c "\
import csv, urllib.request, json; \
produtos = []; \
f = open('$(CSV)', encoding='utf-8'); \
reader = csv.DictReader(f); \
[produtos.append({'nome': r['Título'][:255], 'descricao': r['Título'], 'preco': float(r['Preço'].replace('.','').replace(',','.')), 'imagem_url': r['Imagem'], 'estoque': 10, 'peso_kg': 0.5, 'comprimento_cm': 15, 'largura_cm': 15, 'altura_cm': 15}) for r in reader if r['Título'] and r['Preço']]; \
ok = 0; \
[ok.__class__ for p in produtos for req in [urllib.request.Request('http://localhost:8000/produtos', json.dumps(p).encode(), {'Content-Type':'application/json'}, method='POST')] for resp in [urllib.request.urlopen(req)] if print(f'✅ {p[\"nome\"][:60]}') or True]; \
print(f'\n✅ Importação concluída!') \
"
	@echo "$(GREEN)✅ Produtos importados!$(NC)"

backup-db:
	@echo "$(YELLOW)💾 Fazendo backup do banco...$(NC)"
	@mkdir -p backups
	@FILENAME="backups/jc_games_$(shell date +%Y%m%d_%H%M%S).sql"; \
	docker exec ecommerce_db pg_dump -U admin jc_games_db > $$FILENAME; \
	echo "$(GREEN)✅ Backup salvo em: $$FILENAME$(NC)"

restaurar-db:
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)❌ Informe o arquivo: make restaurar-db FILE=backups/arquivo.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)♻️  Restaurando banco de $(FILE)...$(NC)"
	docker exec -i ecommerce_db psql -U admin jc_games_db < $(FILE)
	@echo "$(GREEN)✅ Banco restaurado!$(NC)"

limpar:
	@echo "$(YELLOW)🧹 Limpando imagens e volumes não usados...$(NC)"
	docker system prune -f
	docker volume prune -f
	@echo "$(GREEN)✅ Limpeza concluída!$(NC)"

.PHONY: tornar-admin

tornar-admin:
	@if [ -z "$(admin)" ]; then \
		echo "❌ Informe: make tornar-admin admin=email@gmail.com"; \
		exit 1; \
	fi
	@echo "👑 Tornando $(admin) admin..."
	docker exec ecommerce_db psql -U admin -d jc_games_db -c "UPDATE usuarios SET is_admin = TRUE WHERE email = '$(admin)';"
	@echo "✅ $(admin) agora é admin!"

.PHONY: tornar-superadmin
tornar-superadmin:
	@if [ -z "$(admin)" ]; then \
		echo "❌ Informe: make tornar-superadmin admin=email@gmail.com"; \
		exit 1; \
	fi
	@echo "⭐ Tornando $(admin) Super Admin..."
	docker exec ecommerce_db psql -U admin -d jc_games_db -c "UPDATE usuarios SET is_admin = TRUE, is_superadmin = TRUE WHERE email = '$(admin)';"
	@echo "✅ $(admin) agora é Super Admin!"
