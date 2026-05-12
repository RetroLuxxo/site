from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, JSON, Boolean
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    nome = Column(String, default="")
    telefone = Column(String, default="")
    cpf = Column(String, default="")
    senha_hash = Column(String, default="")
    ativo = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_superadmin = Column(Boolean, default=False)

class Endereco(Base):
    __tablename__ = "enderecos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    cep = Column(String)
    logradouro = Column(String)
    numero = Column(String)
    complemento = Column(String, default="")
    bairro = Column(String)
    cidade = Column(String)
    estado = Column(String)
    principal = Column(Boolean, default=False)

class Produto(Base):
    __tablename__ = "produtos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    descricao = Column(Text)
    preco = Column(Float)
    imagem_url = Column(String)
    fotos = Column(JSON, default=list)
    estoque = Column(Integer, default=0)
    peso_kg = Column(Float, default=0.5)
    comprimento_cm = Column(Integer, default=15)
    largura_cm = Column(Integer, default=15)
    altura_cm = Column(Integer, default=15)

class Avaliacao(Base):
    __tablename__ = "avaliacoes"
    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    nome = Column(String, default="Anônimo")
    estrelas = Column(Integer, default=5)
    comentario = Column(Text, default="")
    aprovado = Column(Boolean, default=True)

class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("produtos.id"))
    quantidade = Column(Integer, default=1)
    session_id = Column(String, index=True)

class Pedido(Base):
    __tablename__ = "pedidos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    nome = Column(String)
    email = Column(String)
    telefone = Column(String)
    cpf = Column(String)
    cep = Column(String)
    endereco = Column(String)
    numero = Column(String)
    complemento = Column(String, default="")
    bairro = Column(String)
    cidade = Column(String)
    estado = Column(String)
    frete_nome = Column(String)
    frete_preco = Column(Float)
    frete_prazo = Column(Integer)
    total = Column(Float)
    status = Column(String, default="pendente")
    itens = Column(JSON)
    codigo_rastreio = Column(String, default="")

class Configuracao(Base):
    __tablename__ = "configuracoes"
    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String, unique=True, index=True)
    valor = Column(Text, default="")
    descricao = Column(String, default="")
