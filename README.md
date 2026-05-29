# JC Games Store 🎮

E-commerce completo para venda de hardware arcade e games.

**Stack**: FastAPI + Next.js 15 + PostgreSQL + Docker

---

## ✅ Funcionalidades

- Vitrine responsiva (mobile, tablet, desktop)
- Carrinho sincronizado entre dispositivos (logado)
- Login e cadastro com JWT
- Checkout com busca de CEP e frete automático por UF
- Pagamento PIX via PagBank
- Email de confirmação de pedido
- Email automático ao enviar pedido com código de rastreio
- Perfil do cliente com histórico e rastreamento
- Painel Admin: dashboard, pedidos, produtos
- CRUD de produtos com controle de estoque
- Importação de produtos via CSV

---

## 🖥️ Pré-requisitos

Instale no PC antes de começar:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) ou Docker + Docker Compose (Linux)
- [Git](https://git-scm.com/downloads)

### Instalar Docker no Ubuntu/Debian:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl start docker
sudo systemctl enable docker
sudo apt install git make -y
# Reinicie o terminal após este comando
```

### Verificar instalação:
```bash
docker --version
docker compose version
git --version
```

---

## 🚀 Instalação Passo a Passo

### 1. Clone o repositório

```bash
git clone https://github.com/RetroLuxxo/site.git
cd site
```

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo:
```bash
cp docker-compose.exemplo.yml docker-compose.yml
```

Edite o `docker-compose.yml` com suas credenciais:
```bash
nano docker-compose.yml
```

Substitua os valores:

| Campo | O que colocar |
|-------|---------------|
| `SENHA_DO_BANCO_AQUI` | Uma senha forte para o PostgreSQL |
| `CHAVE_SECRETA_AQUI` | Uma string aleatória longa para JWT |
| `SEU_EMAIL@gmail.com` | Seu email do Gmail |
| `SENHA_DE_APP_GMAIL_AQUI` | Senha de app do Gmail (ver seção abaixo) |
| `SEU_TOKEN_PAGBANK_AQUI` | Token da API PagBank (ver seção abaixo) |
| `sandbox` | Mude para `production` quando for ao ar |

### 3. Configure o frontend

Crie o arquivo de configuração:
```bash
nano frontend/.env.local
```

Adicione:
```
NEXT_PUBLIC_API_URL=http://IP_DO_SEU_SERVIDOR:8000
```

> Substitua `IP_DO_SEU_SERVIDOR` pelo IP local (ex: `192.168.1.100`) ou pelo domínio se tiver.
> Para rodar localmente use `http://localhost:8000`

### 4. Suba os containers

```bash
make up
```

> Na primeira vez demora mais pois baixa as imagens Docker.

### 5. Acesse o sistema

| Serviço | URL |
|---------|-----|
| 🌐 Loja | http://localhost:3000 |
| ⚙️ Admin | http://localhost:3000/admin |
| 🔌 API | http://localhost:8000 |
| 🗄️ Adminer (banco) | http://localhost:8180 |

### 6. Configure o usuário admin

- **Sistema**: PostgreSQL
- **Servidor**: db
- **Usuário**: admin
- **Senha**: (a que você definiu)
- **Base de dados**: jc_games_db

Execute este SQL:
```sql
make tornar-superadmin admin=seu@email.com
```

---

## 📧 Configurar Gmail (Senha de App)

O sistema envia emails via Gmail. Para isso:

1. Acesse sua conta Google → **Segurança**
2. Ative a **Verificação em duas etapas** (obrigatório)
3. Pesquise "Senhas de app" nas configurações
4. Crie uma senha de app para "Email"
5. Copie a senha gerada (formato: `xxxx xxxx xxxx xxxx`)
6. Cole no `docker-compose.yml` no campo `EMAIL_PASS`

---

## 💳 Configurar PagBank (PIX)

### Ambiente de Teste (Sandbox):
1. Acesse [portaldev.pagbank.com.br](https://portaldev.pagbank.com.br)
2. Faça login com sua conta PagBank
3. Clique em **Tokens** → **Gerar Token**
4. Cole o token no `docker-compose.yml` no campo `PAGBANK_TOKEN`
5. Mantenha `PAGBANK_ENV: "sandbox"` para testes

### Ambiente de Produção:
1. Acesse [developer.pagbank.com.br](https://developer.pagbank.com.br)
2. Gere o token de produção
3. Atualize `PAGBANK_TOKEN` e mude `PAGBANK_ENV: "production"`

---

## 🛠️ Comandos do Makefile

```bash
make up                          # Sobe todos os containers
make down                        # Para todos os containers
make restart                     # Reinicia tudo
make status                      # Status dos containers
make build                       # Rebuilda tudo do zero
make build-frontend              # Rebuilda só o frontend
make build-backend               # Rebuilda só o backend
make logs                        # Logs de todos os containers
make logs-backend                # Logs do backend
make logs-frontend               # Logs do frontend
make shell-backend               # Abre shell no backend
make shell-db                    # Abre psql no banco
make backup-db                   # Faz backup do banco
make restaurar-db FILE=arquivo   # Restaura backup
make importar-produtos CSV=arq   # Importa produtos via CSV
make limpar                      # Remove imagens não usadas
```

---

## 📦 Importar Produtos via CSV

O CSV deve ter as colunas: `Título`, `Preço`, `Imagem`

```bash
make importar-produtos CSV=meus_produtos.csv
```

---

## 🗄️ Backup e Restauração do Banco

### Fazer backup:
```bash
make backup-db
# Salvo em: backups/jc_games_YYYYMMDD_HHMMSS.sql
```

### Restaurar backup:
```bash
make restaurar-db FILE=backups/jc_games_20260511_115529.sql
```

---

## 📁 Estrutura do Projeto

```
site/
├── backend/
│   ├── main.py          # Todas as rotas da API
│   ├── models.py        # Modelos do banco (SQLAlchemy)
│   ├── schemas.py       # Validação de dados (Pydantic)
│   ├── database.py      # Conexão com PostgreSQL
│   ├── requirements.txt # Dependências Python
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Loja principal
│   │   ├── admin/page.tsx   # Painel administrativo
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── .env.local           # URL da API (não commitado)
│   └── Dockerfile
├── docker-compose.yml        # Configurações (não commitado)
├── docker-compose.exemplo.yml # Modelo sem senhas
├── Makefile                  # Comandos úteis
└── README.md
```

---

## 🔌 Rotas da API

### Produtos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/produtos` | Lista todos os produtos |
| POST | `/produtos` | Cria produto (admin) |
| PUT | `/admin/produtos/{id}` | Edita produto (admin) |
| DELETE | `/admin/produtos/{id}` | Remove produto (admin) |

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/cadastro` | Cadastro de usuário |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Dados do usuário logado |
| PUT | `/auth/me` | Atualiza dados |
| PUT | `/auth/senha` | Altera senha |

### Carrinho
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/carrinho` | Lista itens do carrinho |
| POST | `/carrinho` | Adiciona item |
| DELETE | `/carrinho/{id}` | Remove item |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pedidos` | Cria pedido |
| GET | `/meus-pedidos` | Pedidos do usuário |
| PUT | `/pedidos/{id}/cancelar` | Cancela pedido |
| GET | `/admin/pedidos` | Lista todos (admin) |
| PUT | `/admin/pedidos/{id}/status` | Atualiza status (admin) |

### Pagamento
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pagamentos/pix` | Gera QR Code PIX |
| POST | `/pagamentos/webhook` | Webhook PagBank |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/frete` | Calcula frete por CEP |
| GET | `/enderecos` | Endereços do usuário |
| POST | `/enderecos` | Salva endereço |
| GET | `/admin/dashboard` | Métricas do admin |

---

## 🚀 Deploy em Produção (VPS)

### Requisitos
- VPS com Ubuntu 22.04+
- Domínio apontando para o IP da VPS
- Portas 80 e 443 abertas

### Passos
```bash
# 1. Instala Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl start docker
sudo systemctl enable docker
newgrp docker
sudo systemctl start docker
sudo systemctl enable docker

# 2. Clona o projeto
git clone https://github.com/RetroLuxxo/site.git
cd site

# 3. Configura
cp docker-compose.exemplo.yml docker-compose.yml
nano docker-compose.yml  # preenche as variáveis de produção

# 4. Sobe
make up

# 5. Para HTTPS, instale o Nginx Proxy Manager:
# https://nginxproxymanager.com/
```

### Variáveis importantes para produção:
- `SECRET_KEY`: use uma string aleatória de 64+ caracteres
- `PAGBANK_ENV`: mude para `production`
- `PAGBANK_TOKEN`: use o token de produção do PagBank

---

## 🐛 Solução de Problemas

### Container não sobe:
```bash
make logs-backend   # Ver erro do backend
make logs-frontend  # Ver erro do frontend
```

### Banco não conecta:
```bash
make shell-db  # Abre o psql para verificar
```

### Frontend não atualiza após mudança:
```bash
make build-frontend  # Rebuilda o frontend
```

### Disco cheio:
```bash
make limpar          # Remove imagens não usadas
docker system prune -a -f  # Limpeza mais agressiva
```

---

## 📞 Suporte

Projeto desenvolvido por **Jeverson Dias da Silva**

- GitHub: [@RetroLuxxo](https://github.com/RetroLuxxo)
- Email: retroluxxo@gmail.com

---

## 📄 Licença

MIT — use à vontade!

## 🖼️ Upload de Imagens (Cloudinary)

As imagens dos produtos são hospedadas no Cloudinary (gratuito até 25GB).

**Configuração:**
1. Crie conta em [cloudinary.com](https://cloudinary.com)
2. Anote o **Cloud Name** no dashboard
3. Vá em Settings → Upload → Upload Presets → Add Upload Preset
4. Defina como **Unsigned** e salve o nome do preset
5. Informe os dados durante o `bash setup.sh`

**Uso:**
- No painel admin, ao cadastrar ou editar produto, clique em **📤 Upload**
- Selecione a imagem — ela vai direto para o Cloudinary
- A URL é preenchida automaticamente
