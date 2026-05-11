from pydantic import BaseModel
from typing import List, Optional

class UsuarioBase(BaseModel):
    email: str

class UsuarioCadastro(BaseModel):
    email: str
    nome: str
    telefone: str
    cpf: str
    senha: str

class UsuarioLogin(BaseModel):
    email: str
    senha: str

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None

class Usuario(BaseModel):
    id: int
    email: str
    nome: str
    telefone: str
    cpf: str
    is_admin: bool = False
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: Usuario

class EnderecoCreate(BaseModel):
    cep: str
    logradouro: str
    numero: str
    complemento: Optional[str] = ""
    bairro: str
    cidade: str
    estado: str
    principal: bool = False

class Endereco(EnderecoCreate):
    id: int
    usuario_id: int
    class Config:
        from_attributes = True

class ProdutoBase(BaseModel):
    nome: str
    descricao: str
    preco: float
    imagem_url: str
    estoque: int
    peso_kg: float = 0.5
    comprimento_cm: int = 15
    largura_cm: int = 15
    altura_cm: int = 15

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[float] = None
    imagem_url: Optional[str] = None
    estoque: Optional[int] = None
    peso_kg: Optional[float] = None
    comprimento_cm: Optional[int] = None
    largura_cm: Optional[int] = None
    altura_cm: Optional[int] = None

class Produto(ProdutoBase):
    id: int
    class Config:
        from_attributes = True

class CartItemBase(BaseModel):
    product_id: int
    quantidade: int = 1
    session_id: str

class CartItemCreate(CartItemBase):
    pass

class CartItem(CartItemBase):
    id: int
    class Config:
        from_attributes = True

class ItemPedido(BaseModel):
    product_id: int
    quantidade: int
    preco_unitario: float

class PedidoCreate(BaseModel):
    nome: str
    email: str
    telefone: str
    cpf: str
    cep: str
    endereco: str
    numero: str
    complemento: Optional[str] = ""
    bairro: str
    cidade: str
    estado: str
    frete_nome: str
    frete_preco: float
    frete_prazo: int
    itens: List[ItemPedido]
    usuario_id: Optional[int] = None

class PedidoStatusUpdate(BaseModel):
    status: str
    codigo_rastreio: Optional[str] = None

class Pedido(PedidoCreate):
    id: int
    status: str
    total: float
    codigo_rastreio: Optional[str] = ""
    class Config:
        from_attributes = True
