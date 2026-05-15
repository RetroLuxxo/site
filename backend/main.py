from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import models, schemas
from database import SessionLocal, engine
import requests
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta

models.Base.metadata.create_all(bind=engine)

# Migrations automáticas — adiciona colunas novas sem perder dados
def run_migrations():
    try:
        with engine.connect() as conn:
            migrations = [
                "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE",
                "ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS descricao VARCHAR DEFAULT ''",
                "ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fotos JSON DEFAULT '[]'",
                "ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE",
            ]
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                except Exception as e:
                    print(f"Migration skipped: {e}")
    except Exception as e:
        print(f"Migration error: {e}")

run_migrations()

app = FastAPI(title="JC Games Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
import requests as http_requests

PAGBANK_TOKEN = os.getenv("PAGBANK_TOKEN", "")
PAGBANK_ENV = os.getenv("PAGBANK_ENV", "sandbox")
PAGBANK_URL = "https://sandbox.api.pagseguro.com" if PAGBANK_ENV == "sandbox" else "https://api.pagseguro.com"
PAGBANK_HEADERS = {"Authorization": f"Bearer {PAGBANK_TOKEN}", "Content-Type": "application/json"}

def get_config(db, chave: str, fallback: str = "") -> str:
    try:
        c = db.query(models.Configuracao).filter(models.Configuracao.chave == chave).first()
        return c.valor if c and c.valor else fallback
    except:
        return fallback

def get_pagbank_headers(db):
    token = get_config(db, "pagbank_token", PAGBANK_TOKEN)
    env = get_config(db, "pagbank_env", PAGBANK_ENV)
    url = "https://sandbox.api.pagseguro.com" if env == "sandbox" else "https://api.pagseguro.com"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    return url, headers
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASS", "")
EMAIL_ADMIN = os.getenv("EMAIL_ADMIN", "")

def enviar_email(destinatario: str, assunto: str, corpo_html: str):
    if not EMAIL_USER or not EMAIL_PASS:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = f"JC Games Store <{EMAIL_USER}>"
        msg["To"] = destinatario
        msg.attach(MIMEText(corpo_html, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, destinatario, msg.as_string())
            if EMAIL_ADMIN and EMAIL_ADMIN != destinatario:
                server.sendmail(EMAIL_USER, EMAIL_ADMIN, msg.as_string())
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
SECRET_KEY = os.getenv("SECRET_KEY", "jcgames_secret_key_2025")
ALGORITHM = "HS256"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def criar_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(days=30)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_usuario_atual(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("sub")
        if not usuario_id:
            return None
        return db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    except JWTError:
        return None

@app.get("/")
def read_root():
    return {"status": "Online", "empresa": "JC GAMES CLÁSSICOS"}

# --- AUTH ---
@app.post("/auth/cadastro", response_model=schemas.Token)
def cadastro(dados: schemas.UsuarioCadastro, db: Session = Depends(get_db)):
    existente = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    senha_hash = bcrypt.hashpw(dados.senha.encode(), bcrypt.gensalt()).decode()
    usuario = models.Usuario(
        email=dados.email,
        nome=dados.nome,
        telefone=dados.telefone,
        cpf=dados.cpf,
        senha_hash=senha_hash
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    token = criar_token({"sub": str(usuario.id)})
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}

@app.post("/auth/login", response_model=schemas.Token)
def login(dados: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario or not bcrypt.checkpw(dados.senha.encode(), usuario.senha_hash.encode()):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    token = criar_token({"sub": str(usuario.id)})
    return {"access_token": token, "token_type": "bearer", "usuario": usuario}

@app.get("/auth/me", response_model=schemas.Usuario)
def me(usuario = Depends(get_usuario_atual)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return usuario

@app.put("/auth/me", response_model=schemas.Usuario)
def atualizar_perfil(dados: schemas.UsuarioUpdate, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    for campo, valor in dados.model_dump(exclude_none=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario

# --- ENDERECOS ---
@app.get("/enderecos", response_model=List[schemas.Endereco])
def listar_enderecos(usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return db.query(models.Endereco).filter(models.Endereco.usuario_id == usuario.id).all()

@app.post("/enderecos", response_model=schemas.Endereco)
def salvar_endereco(endereco: schemas.EnderecoCreate, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    if endereco.principal:
        db.query(models.Endereco).filter(models.Endereco.usuario_id == usuario.id).update({"principal": False})
    db_end = models.Endereco(**endereco.model_dump(), usuario_id=usuario.id)
    db.add(db_end)
    db.commit()
    db.refresh(db_end)
    return db_end

# --- PRODUTOS ---
@app.get("/produtos", response_model=List[schemas.Produto])
def listar_produtos(db: Session = Depends(get_db)):
    return db.query(models.Produto).filter(models.Produto.ativo == True).all()

@app.post("/produtos", response_model=schemas.Produto)
def criar_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    db_produto = models.Produto(**produto.model_dump())
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

# --- CARRINHO ---
@app.get("/carrinho", response_model=List[schemas.CartItem])
def ver_carrinho(session_id: str, db: Session = Depends(get_db)):
    return db.query(models.CartItem).filter(models.CartItem.session_id == session_id).all()

@app.post("/carrinho", response_model=schemas.CartItem)
def adicionar_ao_carrinho(item: schemas.CartItemCreate, db: Session = Depends(get_db)):
    produto = db.query(models.Produto).filter(models.Produto.id == item.product_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db_item = models.CartItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/carrinho/{item_id}")
def atualizar_item_carrinho(item_id: int, dados: dict, db: Session = Depends(get_db)):
    item = db.query(models.CartItem).filter(models.CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if "incremento" in dados:
        item.quantidade = item.quantidade + dados["incremento"]
    else:
        item.quantidade = dados.get("quantidade", item.quantidade)
    if item.quantidade < 1:
        item.quantidade = 1
    db.commit()
    db.refresh(item)
    return item

@app.delete("/carrinho/{item_id}")
def remover_do_carrinho(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.CartItem).filter(models.CartItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(db_item)
    db.commit()
    return {"message": "Item removido"}

# --- FRETE ---
@app.get("/frete")
def calcular_frete(cep_destino: str, db: Session = Depends(get_db)):
    cep_limpo = cep_destino.replace("-", "").replace(".", "").strip()
    try:
        r = requests.get(f"https://viacep.com.br/ws/{cep_limpo}/json/", timeout=5)
        dados_cep = r.json()
        if "erro" in dados_cep:
            raise HTTPException(status_code=400, detail="CEP não encontrado")
    except Exception:
        raise HTTPException(status_code=400, detail="Erro ao consultar CEP")

    uf = dados_cep.get("uf", "")
    if uf == "PR":
        opcoes = [{"nome": "PAC", "preco": 15.90, "prazo": 3}, {"nome": "SEDEX", "preco": 29.90, "prazo": 1}]
    elif uf in ["SP", "SC", "RS"]:
        opcoes = [{"nome": "PAC", "preco": 22.90, "prazo": 5}, {"nome": "SEDEX", "preco": 39.90, "prazo": 2}]
    elif uf in ["RJ", "MG", "ES"]:
        opcoes = [{"nome": "PAC", "preco": 25.90, "prazo": 6}, {"nome": "SEDEX", "preco": 44.90, "prazo": 3}]
    else:
        opcoes = [{"nome": "PAC", "preco": 35.90, "prazo": 10}, {"nome": "SEDEX", "preco": 59.90, "prazo": 5}]

    return {"endereco": dados_cep, "opcoes_frete": opcoes}

# --- PEDIDOS ---
@app.post("/pedidos", response_model=schemas.Pedido)
def criar_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(get_db)):
    total = sum(i.preco_unitario * i.quantidade for i in pedido.itens) + pedido.frete_preco
    itens_json = [i.model_dump() for i in pedido.itens]
    # Verifica estoque antes de criar pedido
    for item in pedido.itens:
        produto = db.query(models.Produto).filter(models.Produto.id == item.product_id).first()
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto #{item.product_id} não encontrado")
        if produto.estoque < item.quantidade:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque}")

    db_pedido = models.Pedido(
        **{k: v for k, v in pedido.model_dump().items() if k != "itens"},
        itens=itens_json,
        total=total,
        status="pendente"
    )
    db.add(db_pedido)

    # Decrementa estoque
    for item in pedido.itens:
        produto = db.query(models.Produto).filter(models.Produto.id == item.product_id).first()
        if produto:
            produto.estoque = max(0, produto.estoque - item.quantidade)

    db.commit()
    db.refresh(db_pedido)

    # Registra uso do cupom
    if hasattr(pedido, "cupom_id") and pedido.cupom_id:
        import datetime
        cupom = db.query(models.Cupom).filter(models.Cupom.id == pedido.cupom_id).first()
        if cupom:
            cupom.usos += 1
            uso = models.CupomUso(cupom_id=cupom.id, usuario_id=pedido.usuario_id, usado_em=str(datetime.datetime.now()))
            db.add(uso)

    # Envia email de confirmação
    itens_html = "".join([
        f"<tr><td style='padding:8px;border-bottom:1px solid #333'>Produto #{i['product_id']}</td><td style='padding:8px;border-bottom:1px solid #333'>{i['quantidade']}x</td><td style='padding:8px;border-bottom:1px solid #333'>R$ {i['preco_unitario']:,.2f}</td></tr>"
        for i in itens_json
    ])
    corpo = f"""
    <div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:40px;max-width:600px;margin:0 auto">
        <h1 style="color:#3b82f6">JC GAMES <span style="color:#fff">STORE</span></h1>
        <h2 style="color:#22c55e">✅ Pedido #{db_pedido.id} Confirmado!</h2>
        <p>Olá <strong>{db_pedido.nome}</strong>, seu pedido foi recebido com sucesso!</p>
        <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#3b82f6;margin-top:0">📦 Itens do Pedido</h3>
            <table style="width:100%;border-collapse:collapse">
                <tr style="color:#9ca3af;font-size:12px">
                    <th style="text-align:left;padding:8px">Produto</th>
                    <th style="text-align:left;padding:8px">Qtd</th>
                    <th style="text-align:left;padding:8px">Valor</th>
                </tr>
                {itens_html}
            </table>
        </div>
        <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#3b82f6;margin-top:0">🚚 Entrega</h3>
            <p style="margin:4px 0">{db_pedido.endereco}, {db_pedido.numero} {db_pedido.complemento}</p>
            <p style="margin:4px 0">{db_pedido.bairro} — {db_pedido.cidade}/{db_pedido.estado}</p>
            <p style="margin:4px 0">CEP: {db_pedido.cep}</p>
            <p style="margin:4px 0;color:#3b82f6"><strong>{db_pedido.frete_nome}</strong> — Prazo: {db_pedido.frete_prazo} dia(s) útil(eis)</p>
        </div>
        <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#3b82f6;margin-top:0">💰 Resumo Financeiro</h3>
            <p style="margin:4px 0">Frete: R$ {db_pedido.frete_preco:,.2f}</p>
            <p style="margin:4px 0;font-size:20px;color:#22c55e"><strong>Total: R$ {db_pedido.total:,.2f}</strong></p>
        </div>
        <p style="color:#9ca3af;font-size:12px">Em caso de dúvidas responda este email. Obrigado pela preferência!</p>
    </div>
    """
    enviar_email(db_pedido.email, f"Pedido #{db_pedido.id} confirmado — JC Games Store", corpo)

    return db_pedido

@app.get("/pedidos", response_model=List[schemas.Pedido])
def listar_pedidos(db: Session = Depends(get_db)):
    return db.query(models.Pedido).all()

@app.get("/meus-pedidos", response_model=List[schemas.Pedido])
def meus_pedidos(usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return db.query(models.Pedido).filter(models.Pedido.usuario_id == usuario.id).all()

@app.put("/auth/senha")
def alterar_senha(dados: dict, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    senha_atual = dados.get("senha_atual", "")
    nova_senha = dados.get("nova_senha", "")
    if not bcrypt.checkpw(senha_atual.encode(), usuario.senha_hash.encode()):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    usuario.senha_hash = bcrypt.hashpw(nova_senha.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"message": "Senha alterada com sucesso"}

@app.put("/pedidos/{pedido_id}/cancelar")
def cancelar_pedido(pedido_id: int, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    pedido = db.query(models.Pedido).filter(
        models.Pedido.id == pedido_id,
        models.Pedido.usuario_id == usuario.id
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.status != "pendente":
        raise HTTPException(status_code=400, detail="Só é possível cancelar pedidos pendentes")
    pedido.status = "cancelado"
    db.commit()
    return {"message": "Pedido cancelado"}

# --- ADMIN ---
def get_admin(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    usuario = get_usuario_atual(authorization, db)
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return usuario

@app.get("/admin/pedidos", response_model=List[schemas.Pedido])
def admin_listar_pedidos(status: Optional[str] = None, db: Session = Depends(get_db), admin = Depends(get_admin)):
    query = db.query(models.Pedido)
    if status:
        query = query.filter(models.Pedido.status == status)
    return query.order_by(models.Pedido.id.desc()).all()

@app.put("/admin/pedidos/{pedido_id}/status")
def admin_atualizar_status(pedido_id: int, dados: schemas.PedidoStatusUpdate, db: Session = Depends(get_db), admin = Depends(get_admin)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    pedido.status = dados.status
    if dados.codigo_rastreio:
        pedido.codigo_rastreio = dados.codigo_rastreio
    db.commit()

    # Email quando enviado
    if dados.status == "enviado" and pedido.email:
        rastreio = dados.codigo_rastreio or pedido.codigo_rastreio or ""
        corpo = f"""
    <div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:40px;max-width:600px;margin:0 auto">
        <h1 style="color:#3b82f6">JC GAMES <span style="color:#fff">STORE</span></h1>
        <h2 style="color:#3b82f6">🚚 Seu pedido foi enviado!</h2>
        <p>Olá <strong>{pedido.nome}</strong>, seu pedido #{pedido.id} saiu para entrega!</p>
        <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#3b82f6;margin-top:0">📦 Código de Rastreio</h3>
            <p style="font-size:24px;font-weight:900;color:#fff;letter-spacing:2px">{rastreio}</p>
            <a href="https://www.correios.com.br/rastreamento#{rastreio}" 
               style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:900;margin-top:10px">
               Rastrear nos Correios →
            </a>
        </div>
        <div style="background:#161616;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#3b82f6;margin-top:0">📍 Endereço de Entrega</h3>
            <p style="margin:4px 0">{pedido.endereco}, {pedido.numero} {pedido.complemento}</p>
            <p style="margin:4px 0">{pedido.bairro} — {pedido.cidade}/{pedido.estado}</p>
            <p style="margin:4px 0;color:#3b82f6"><strong>{pedido.frete_nome}</strong> — Prazo: {pedido.frete_prazo} dia(s) útil(eis)</p>
        </div>
        <p style="color:#9ca3af;font-size:12px">Em caso de dúvidas responda este email. Obrigado pela preferência!</p>
    </div>
        """
        enviar_email(pedido.email, f"Pedido #{pedido_id} enviado! Rastreio: {rastreio}", corpo)

    return {"message": f"Pedido #{pedido_id} atualizado para {dados.status}"}

@app.get("/admin/dashboard")
def admin_dashboard(db: Session = Depends(get_db), admin = Depends(get_admin)):
    total_pedidos = db.query(models.Pedido).count()
    pendentes = db.query(models.Pedido).filter(models.Pedido.status == "pendente").count()
    enviados = db.query(models.Pedido).filter(models.Pedido.status == "enviado").count()
    entregues = db.query(models.Pedido).filter(models.Pedido.status == "entregue").count()
    cancelados = db.query(models.Pedido).filter(models.Pedido.status == "cancelado").count()
    faturamento = db.query(models.Pedido).filter(models.Pedido.status != "cancelado").all()
    total_faturado = sum(p.total for p in faturamento)
    total_usuarios = db.query(models.Usuario).count()
    total_produtos = db.query(models.Produto).count()
    return {
        "total_pedidos": total_pedidos,
        "pendentes": pendentes,
        "enviados": enviados,
        "entregues": entregues,
        "cancelados": cancelados,
        "total_faturado": total_faturado,
        "total_usuarios": total_usuarios,
        "total_produtos": total_produtos,
    }

@app.get("/admin/produtos")
def admin_listar_produtos(db: Session = Depends(get_db), admin = Depends(get_admin)):
    return db.query(models.Produto).all()

@app.put("/admin/produtos/{produto_id}", response_model=schemas.Produto)
def admin_atualizar_produto(produto_id: int, dados: schemas.ProdutoUpdate, db: Session = Depends(get_db), admin = Depends(get_admin)):
    produto = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for campo, valor in dados.model_dump(exclude_none=True).items():
        setattr(produto, campo, valor)
    db.commit()
    db.refresh(produto)
    return produto

@app.put("/admin/produtos/{produto_id}/pausar")
def pausar_produto(produto_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    produto = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    produto.ativo = not produto.ativo
    db.commit()
    return {"ativo": produto.ativo}

@app.delete("/admin/produtos/{produto_id}")
def admin_deletar_produto(produto_id: int, db: Session = Depends(get_db), admin = Depends(get_admin)):
    produto = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.query(models.CartItem).filter(models.CartItem.product_id == produto_id).delete()
    db.query(models.Avaliacao).filter(models.Avaliacao.produto_id == produto_id).delete()
    db.delete(produto)
    db.commit()
    return {"message": "Produto removido"}

@app.delete("/admin/produtos")
def admin_deletar_produtos_lote(dados: dict, db: Session = Depends(get_db), admin = Depends(get_admin)):
    ids = dados.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="Nenhum produto selecionado")
    for pid in ids:
        db.query(models.CartItem).filter(models.CartItem.product_id == pid).delete()
        db.query(models.Avaliacao).filter(models.Avaliacao.produto_id == pid).delete()
        produto = db.query(models.Produto).filter(models.Produto.id == pid).first()
        if produto:
            db.delete(produto)
    db.commit()
    return {"message": f"{len(ids)} produtos removidos"}

@app.post("/pagamentos/pix")
def criar_pix(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    payload = {
        "reference_id": f"PEDIDO-{pedido.id}",
        "customer": {
            "name": pedido.nome,
            "email": pedido.email,
            "tax_id": pedido.cpf.replace(".", "").replace("-", "")
        },
        "items": [
            {
                "reference_id": f"item-{pedido.id}",
                "name": f"Pedido #{pedido.id} - JC Games Store",
                "quantity": 1,
                "unit_amount": int(pedido.total * 100)
            }
        ],
        "qr_codes": [
            {
                "amount": {"value": int(pedido.total * 100)},
                "expiration_date": ((__import__("datetime").datetime.now() + __import__("datetime").timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S") + "-03:00")
            }
        ],
        "notification_urls": [f"{os.getenv('API_URL', 'http://192.168.18.10:8000')}/pagamentos/webhook"]
    }

    pag_url, pag_headers = get_pagbank_headers(db)
    r = http_requests.post(f"{pag_url}/orders", json=payload, headers=pag_headers)
    data = r.json()

    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail=data.get("error_messages", str(data)))

    qr = data.get("qr_codes", [{}])[0]
    return {
        "order_id": data.get("id"),
        "qr_code": qr.get("text"),
        "qr_code_image": qr.get("links", [{}])[0].get("href") if qr.get("links") else None,
        "total": pedido.total,
        "status": data.get("status")
    }


@app.post("/pagamentos/webhook")
async def pagbank_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    ref = body.get("reference_id", "")
    status = body.get("charges", [{}])[0].get("status", "")
    if ref.startswith("PEDIDO-") and status == "PAID":
        pedido_id = int(ref.replace("PEDIDO-", ""))
        pedido = db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()
        if pedido:
            pedido.status = "pago"
            db.commit()
    return {"status": "ok"}


@app.post("/pagamentos/cartao")
def pagar_cartao(dados: dict, db: Session = Depends(get_db)):
    import requests as http_req
    pedido = db.query(models.Pedido).filter(models.Pedido.id == dados.get("pedido_id")).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    parcelas = dados.get("parcelas", 1)
    taxa = 0 if parcelas == 1 else 0.0299
    total_com_juros = int(pedido.total * (1 + taxa) * 100)
    payload = {
        "reference_id": f"PEDIDO-{pedido.id}",
        "customer": {
            "name": pedido.nome,
            "email": pedido.email,
            "tax_id": pedido.cpf.replace(".","").replace("-","")
        },
        "items": [{"reference_id": f"item-{pedido.id}", "name": f"Pedido #{pedido.id} - JC Games Store", "quantity": 1, "unit_amount": total_com_juros}],
        "charges": [{
            "reference_id": f"charge-{pedido.id}",
            "description": f"Pedido #{pedido.id} JC Games Store",
            "amount": {"value": total_com_juros, "currency": "BRL"},
            "payment_method": {
                "type": "CREDIT_CARD",
                "installments": parcelas,
                "capture": True,
                "card": {
                    "number": dados.get("numero_cartao"),
                    "exp_month": dados.get("mes_validade"),
                    "exp_year": dados.get("ano_validade"),
                    "security_code": dados.get("cvv"),
                    "holder": {"name": dados.get("nome_cartao")}
                }
            }
        }],
        "notification_urls": [f"{os.getenv('API_URL', 'http://192.168.18.10:8000')}/pagamentos/webhook"]
    }
    pag_url2, pag_headers2 = get_pagbank_headers(db)
    r = http_req.post(f"{pag_url2}/orders", json=payload, headers=pag_headers2)
    data = r.json()
    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail=str(data.get("error_messages", data)))
    return {"order_id": data.get("id"), "status": data.get("charges", [{}])[0].get("status"), "total": pedido.total, "parcelas": parcelas}

# ============================================================
# AVALIAÇÕES
# ============================================================
@app.get("/produtos/{produto_id}/avaliacoes")
def listar_avaliacoes(produto_id: int, db: Session = Depends(get_db)):
    return db.query(models.Avaliacao).filter(models.Avaliacao.produto_id == produto_id, models.Avaliacao.aprovado == True).all()

@app.post("/produtos/{produto_id}/avaliacoes")
def criar_avaliacao(produto_id: int, dados: dict, db: Session = Depends(get_db)):
    if not 1 <= dados.get("estrelas", 5) <= 5:
        raise HTTPException(status_code=400, detail="Estrelas deve ser entre 1 e 5")
    av = models.Avaliacao(produto_id=produto_id, nome=dados.get("nome","Anônimo"), estrelas=dados.get("estrelas",5), comentario=dados.get("comentario",""), usuario_id=dados.get("usuario_id"))
    db.add(av); db.commit(); db.refresh(av)
    return av

@app.put("/produtos/{produto_id}/fotos")
def atualizar_fotos(produto_id: int, dados: dict, token: str = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    p = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    if not p: raise HTTPException(status_code=404, detail="Produto não encontrado")
    p.fotos = dados.get("fotos", [])
    db.commit(); db.refresh(p)
    return p

# ============================================================
# CONFIGURAÇÕES
# ============================================================
@app.get("/configuracoes/loja")
def configs_publicas(db: Session = Depends(get_db)):
    chaves = ["loja_nome", "loja_descricao", "loja_logo", "loja_cor_primaria", "loja_cor_fundo", "loja_cor_botao", "loja_cor_texto", "loja_transparencia_cards", "loja_tamanho_fonte", "loja_tamanho_fonte_botao", "loja_cor_texto_botao", "loja_tamanho_logo", "loja_tamanho_nome_loja", "loja_cor_nome_loja", "loja_cor_nome_loja2", "loja_fonte", "loja_layout", "loja_banner_url", "loja_banner_titulo", "loja_banner_subtitulo"]
    configs = db.query(models.Configuracao).filter(models.Configuracao.chave.in_(chaves)).all()
    return {c.chave: c.valor for c in configs}
@app.get("/admin/configuracoes")
def listar_configuracoes(usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_superadmin:
        raise HTTPException(status_code=403, detail="Acesso negado — apenas Super Admin")
    configs = db.query(models.Configuracao).all()
    return {c.chave: {"valor": c.valor, "descricao": c.descricao} for c in configs}

@app.put("/admin/configuracoes")
def salvar_configuracoes(dados: dict, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_superadmin:
        raise HTTPException(status_code=403, detail="Acesso negado — apenas Super Admin")
    for chave, valor in dados.items():
        config = db.query(models.Configuracao).filter(models.Configuracao.chave == chave).first()
        if config:
            config.valor = str(valor)
        else:
            db.add(models.Configuracao(chave=chave, valor=str(valor)))
    db.commit()
    return {"ok": True}

@app.post("/admin/tornar-admin")
def tornar_admin(dados: dict, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
    email = dados.get("email", "").strip()
    nivel = dados.get("nivel", "admin")
    u = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if nivel == "superadmin":
        if not usuario.is_superadmin:
            raise HTTPException(status_code=403, detail="Apenas Super Admins podem criar Super Admins")
        u.is_superadmin = True
        u.is_admin = True
    else:
        u.is_admin = True
        u.is_superadmin = False
    db.commit()
    return {"ok": True, "email": email, "nivel": nivel}

# ============================================================
# CUPONS
# ============================================================
@app.post("/cupons/validar")
def validar_cupom(dados: dict, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario:
        raise HTTPException(status_code=401, detail="Login necessário")
    codigo = dados.get("codigo", "").strip().upper()
    cupom = db.query(models.Cupom).filter(models.Cupom.codigo == codigo, models.Cupom.ativo == True).first()
    if not cupom:
        raise HTTPException(status_code=404, detail="Cupom inválido ou expirado")
    if cupom.limite_uso > 0 and cupom.usos >= cupom.limite_uso:
        raise HTTPException(status_code=400, detail="Cupom esgotado")
    uso = db.query(models.CupomUso).filter(models.CupomUso.cupom_id == cupom.id, models.CupomUso.usuario_id == usuario.id).first()
    if uso:
        raise HTTPException(status_code=400, detail="Você já utilizou este cupom")
    return {"id": cupom.id, "codigo": cupom.codigo, "desconto_pct": cupom.desconto_pct, "desconto_fixo": cupom.desconto_fixo}

@app.get("/admin/cupons")
def listar_cupons(usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return db.query(models.Cupom).all()

@app.post("/admin/cupons")
def criar_cupom(dados: dict, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
    cupom = models.Cupom(
        codigo=dados.get("codigo","").upper(),
        desconto_pct=float(dados.get("desconto_pct", 0)),
        desconto_fixo=float(dados.get("desconto_fixo", 0)),
        limite_uso=int(dados.get("limite_uso", 100)),
        ativo=True
    )
    db.add(cupom)
    db.commit()
    db.refresh(cupom)
    return cupom

@app.put("/admin/cupons/{cupom_id}")
def atualizar_cupom(cupom_id: int, dados: dict, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
    cupom = db.query(models.Cupom).filter(models.Cupom.id == cupom_id).first()
    if not cupom:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    cupom.ativo = dados.get("ativo", cupom.ativo)
    cupom.limite_uso = dados.get("limite_uso", cupom.limite_uso)
    cupom.desconto_pct = dados.get("desconto_pct", cupom.desconto_pct)
    cupom.desconto_fixo = dados.get("desconto_fixo", cupom.desconto_fixo)
    db.commit()
    return cupom

@app.delete("/admin/cupons/{cupom_id}")
def deletar_cupom(cupom_id: int, usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not usuario or not usuario.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado")
    cupom = db.query(models.Cupom).filter(models.Cupom.id == cupom_id).first()
    if cupom:
        db.delete(cupom)
        db.commit()
    return {"ok": True}
