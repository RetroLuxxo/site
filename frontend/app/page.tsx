"use client";
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? (window.location.port === "3000" ? window.location.protocol + "//" + window.location.hostname + ":8000" : window.location.protocol + "//" + window.location.host) : "http://localhost:8000");

type Produto = { id: number; nome: string; preco: number; imagem_url: string; estoque: number; descricao: string; };
type ItemCarrinho = { produto: Produto; quantidade: number; };
type OpcaoFrete = { nome: string; preco: number; prazo: number; };
type DadosEndereco = { logradouro: string; bairro: string; localidade: string; uf: string; };
type Usuario = { id: number; email: string; nome: string; telefone: string; cpf: string; is_admin: boolean; };
type Pedido = { id: number; status: string; total: number; frete_nome: string; frete_prazo: number; cidade: string; estado: string; itens: any[]; codigo_rastreio?: string; };
type CartItemDB = { id: number; product_id: number; quantidade: number; session_id: string; };
type Endereco = { id: number; cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string; principal: boolean; };

export default function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => {
    if (typeof window === "undefined") return [];
    try { const s = localStorage.getItem("carrinho"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [abaPeril, setAbaPerfil] = useState<"dados"|"pedidos"|"rastreamento">("dados");
  const [loading, setLoading] = useState(true);
  const [lojaNome, setLojaNome] = useState("JC GAMES STORE");
  const [lojaDesc, setLojaDesc] = useState("Hardware de Elite");
  const [lojaLogo, setLojaLogo] = useState("/favicon.png");
  const [lojaCorPrimaria, setLojaCorPrimaria] = useState("#8B2FC9");
  const [lojaCorFundo, setLojaCorFundo] = useState("#0a0010");
  const [lojaCorBotao, setLojaCorBotao] = useState("#8B2FC9");
  const [lojaCorTexto, setLojaCorTexto] = useState("#ffffff");
  const [lojaTransparencia, setLojaTransparencia] = useState("0.08");
  const [lojaTamanhoFonte, setLojaTamanhoFonte] = useState("14");
  const [lojaTamanhoFonteBotao, setLojaTamanhoFonteBotao] = useState("12");
  const [lojaCorTextoBotao, setLojaCorTextoBotao] = useState("#ffffff");
  const [lojaTamanhoLogo, setLojaTamanhoLogo] = useState("32");
  const [lojaTamanhoNomeLoja, setLojaTamanhoNomeLoja] = useState("18");
  const [lojaCorNomeLoja, setLojaCorNomeLoja] = useState("#8B2FC9");
  const [lojaCorNomeLoja2, setLojaCorNomeLoja2] = useState("#ffffff");
  const [lojaFonte, setLojaFonte] = useState("Orbitron");
  const [sincronizando, setSincronizando] = useState(false);
  const [menuMobile, setMenuMobile] = useState(false);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string>("");
  const [telaAuth, setTelaAuth] = useState<"login"|"cadastro">("login");
  const [authForm, setAuthForm] = useState({ email: "", senha: "", nome: "", telefone: "", cpf: "" });
  const [authErro, setAuthErro] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [perfilForm, setPerfilForm] = useState({ nome: "", telefone: "", cpf: "" });
  const [senhaForm, setSenhaForm] = useState({ senha_atual: "", nova_senha: "", confirmar: "" });
  const [perfilMsg, setPerfilMsg] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [enderecosSalvos, setEnderecosSalvos] = useState<Endereco[]>([]);

  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [opcoesFretes, setOpcoesFretes] = useState<OpcaoFrete[]>([]);
  const [freteSelecionado, setFreteSelecionado] = useState<OpcaoFrete | null>(null);
  const [endereco, setEndereco] = useState<DadosEndereco | null>(null);
  const [usarEnderecoSalvo, setUsarEnderecoSalvo] = useState<Endereco | null>(null);

  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cpf: "", numero: "", complemento: "" });
  const [pedidoFinalizado, setPedidoFinalizado] = useState<number | null>(null);
  const [pixData, setPixData] = useState<{qr_code:string;qr_code_image:string;total:number}|null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<"pix"|"cartao">("pix");
  const [cartaoForm, setCartaoForm] = useState({numero:"",nome:"",validade:"",cvv:"",parcelas:"1"});
  const [cartaoErro, setCartaoErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroCheckout, setErroCheckout] = useState("");

  const authHeaders = (tk?: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${tk || token}` });
  const sessionId = (u: Usuario) => `user_${u.id}`;

  const carregarCarrinhoDB = useCallback(async (u: Usuario, tk: string, produtosLocal: Produto[]) => {
    setSincronizando(true);
    try {
      const r = await fetch(`${API}/carrinho?session_id=${sessionId(u)}`, { headers: authHeaders(tk) });
      if (!r.ok) return;
      const itensDB: CartItemDB[] = await r.json();
      const carrinhoLocal: ItemCarrinho[] = (() => { try { const s = localStorage.getItem("carrinho"); return s ? JSON.parse(s) : []; } catch { return []; } })();
      for (const item of carrinhoLocal) { if (!itensDB.find(i => i.product_id === item.produto.id)) await fetch(`${API}/carrinho`, { method: "POST", headers: authHeaders(tk), body: JSON.stringify({ product_id: item.produto.id, quantidade: item.quantidade, session_id: sessionId(u) }) }); }
      const r2 = await fetch(`${API}/carrinho?session_id=${sessionId(u)}`, { headers: authHeaders(tk) });
      const itensFinal: CartItemDB[] = await r2.json();
      const all = produtosLocal.length > 0 ? produtosLocal : produtos;
      setCarrinho(itensFinal.map(i => { const p = all.find(p => p.id === i.product_id); return p ? { produto: p, quantidade: i.quantidade } : null; }).filter(Boolean) as ItemCarrinho[]);
      localStorage.removeItem("carrinho");
    } finally { setSincronizando(false); }
  }, [token, produtos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const addId = params.get("add");
    const abrirCarrinho = params.get("carrinho");
    const abrirCheckout = params.get("checkout");
    if (abrirCarrinho) { setCarrinhoAberto(true); window.history.replaceState({}, "", "/"); return; }
    if (abrirCheckout) { setCheckoutAberto(true); window.history.replaceState({}, "", "/"); return; }
    if (!addId) return;
    fetch(`${API}/configuracoes/loja`).then(r => r.ok?r.json():{}).then((cfg: Record<string,string>) => {
        if(cfg.loja_nome) setLojaNome(cfg.loja_nome);
        if(cfg.loja_descricao) setLojaDesc(cfg.loja_descricao);
        if(cfg.loja_logo) setLojaLogo(cfg.loja_logo);
        if(cfg.loja_cor_primaria) setLojaCorPrimaria(cfg.loja_cor_primaria);
        if(cfg.loja_cor_fundo) setLojaCorFundo(cfg.loja_cor_fundo);
        if(cfg.loja_cor_botao) setLojaCorBotao(cfg.loja_cor_botao);
        if(cfg.loja_cor_texto) setLojaCorTexto(cfg.loja_cor_texto);
        if(cfg.loja_transparencia_cards) setLojaTransparencia(cfg.loja_transparencia_cards);
        if(cfg.loja_tamanho_fonte) setLojaTamanhoFonte(cfg.loja_tamanho_fonte);
        if(cfg.loja_tamanho_fonte_botao) setLojaTamanhoFonteBotao(cfg.loja_tamanho_fonte_botao);
        if(cfg.loja_cor_texto_botao) setLojaCorTextoBotao(cfg.loja_cor_texto_botao);
        if(cfg.loja_tamanho_logo) setLojaTamanhoLogo(cfg.loja_tamanho_logo);
        if(cfg.loja_tamanho_nome_loja) setLojaTamanhoNomeLoja(cfg.loja_tamanho_nome_loja);
        if(cfg.loja_cor_nome_loja) setLojaCorNomeLoja(cfg.loja_cor_nome_loja);
        if(cfg.loja_cor_nome_loja2) setLojaCorNomeLoja2(cfg.loja_cor_nome_loja2);
        if(cfg.loja_fonte) setLojaFonte(cfg.loja_fonte);
      }).catch(()=>{});
    fetch(`${API}/produtos`).then(r => r.json()).then(data => {
      const p = data.find((p: Produto) => p.id === parseInt(addId));
      if (p && p.estoque > 0) {
        setCarrinho(prev => {
          const ex = prev.find(i => i.produto.id === p.id);
          const novo = ex ? prev.map(i => i.produto.id===p.id?{...i,quantidade:i.quantidade+1}:i) : [...prev,{produto:p,quantidade:1}];
          localStorage.setItem("carrinho", JSON.stringify(novo));
          return novo;
        });
        setCarrinhoAberto(true);
      }
      window.history.replaceState({}, "", "/");
    });
  }, []);

  useEffect(() => {
    fetch(`${API}/produtos`).then(r => r.json()).then(data => {
      fetch(`${API}/configuracoes/loja`).then(r => r.ok?r.json():{}).then((cfg: Record<string,string>) => {
        if(cfg.loja_nome) setLojaNome(cfg.loja_nome);
        if(cfg.loja_descricao) setLojaDesc(cfg.loja_descricao);
        if(cfg.loja_logo) setLojaLogo(cfg.loja_logo);
        if(cfg.loja_cor_primaria) setLojaCorPrimaria(cfg.loja_cor_primaria);
        if(cfg.loja_cor_fundo) setLojaCorFundo(cfg.loja_cor_fundo);
        if(cfg.loja_cor_botao) setLojaCorBotao(cfg.loja_cor_botao);
        if(cfg.loja_cor_texto) setLojaCorTexto(cfg.loja_cor_texto);
        if(cfg.loja_transparencia_cards) setLojaTransparencia(cfg.loja_transparencia_cards);
        if(cfg.loja_tamanho_fonte) setLojaTamanhoFonte(cfg.loja_tamanho_fonte);
        if(cfg.loja_tamanho_fonte_botao) setLojaTamanhoFonteBotao(cfg.loja_tamanho_fonte_botao);
        if(cfg.loja_cor_texto_botao) setLojaCorTextoBotao(cfg.loja_cor_texto_botao);
        if(cfg.loja_tamanho_logo) setLojaTamanhoLogo(cfg.loja_tamanho_logo);
        if(cfg.loja_tamanho_nome_loja) setLojaTamanhoNomeLoja(cfg.loja_tamanho_nome_loja);
        if(cfg.loja_cor_nome_loja) setLojaCorNomeLoja(cfg.loja_cor_nome_loja);
        if(cfg.loja_cor_nome_loja2) setLojaCorNomeLoja2(cfg.loja_cor_nome_loja2);
        if(cfg.loja_fonte) setLojaFonte(cfg.loja_fonte);
      }).catch(()=>{});
      setProdutos(data); setProdutosFiltrados(data); setLoading(false);
      const tk = localStorage.getItem("token");
      if (tk) {
        setToken(tk);
        fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tk}` } }).then(r => r.ok ? r.json() : null).then(u => {
          if (u) { setUsuario(u); preencherFormComUsuario(u); setPerfilForm({ nome: u.nome, telefone: u.telefone, cpf: u.cpf }); carregarCarrinhoDB(u, tk, data); carregarEnderecos(tk); }
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { const t = busca.toLowerCase(); setProdutosFiltrados(produtos.filter(p => p.nome.toLowerCase().includes(t) || p.descricao?.toLowerCase().includes(t))); }, [busca, produtos]);

  useEffect(() => {
    const handleFocus = () => {
      if (usuario) {
        carregarCarrinhoDB(usuario, token, produtos);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [usuario, token, produtos]);
  useEffect(() => { if (!usuario) localStorage.setItem("carrinho", JSON.stringify(carrinho)); }, [carrinho, usuario]);

  const carregarEnderecos = async (tk: string) => { const r = await fetch(`${API}/enderecos`, { headers: authHeaders(tk) }); if (r.ok) setEnderecosSalvos(await r.json()); };
  const adicionarCarrinhoDB = async (p: Produto) => {
    if (!usuario) return;
    const r = await fetch(`${API}/carrinho?session_id=${sessionId(usuario)}`, { headers: authHeaders() });
    if (!r.ok) return;
    const itens: CartItemDB[] = await r.json();
    const existing = itens.find(i => i.product_id === p.id);
    if (existing) {
      await fetch(`${API}/carrinho/${existing.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ incremento: 1 }) });
    } else {
      await fetch(`${API}/carrinho`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ product_id: p.id, quantidade: 1, session_id: sessionId(usuario) }) });
    }
  };
  const removerCarrinhoDB = async (id: number) => { if (!usuario) return; const r = await fetch(`${API}/carrinho?session_id=${sessionId(usuario)}`, { headers: authHeaders() }); if (!r.ok) return; const itens: CartItemDB[] = await r.json(); const it = itens.find(i => i.product_id === id); if (it) await fetch(`${API}/carrinho/${it.id}`, { method: "DELETE", headers: authHeaders() }); };
  const preencherFormComUsuario = (u: Usuario) => setForm(f => ({ ...f, nome: u.nome, email: u.email, telefone: u.telefone, cpf: u.cpf }));

  const usarEndereco = async (end: Endereco) => {
    setUsarEnderecoSalvo(end); setCep(end.cep); setForm(f => ({ ...f, numero: end.numero, complemento: end.complemento })); setBuscandoCep(true);
    try { const r = await fetch(`${API}/frete?cep_destino=${end.cep.replace(/\D/g,"")}`); const d = await r.json(); if (r.ok) { setEndereco(d.endereco); setOpcoesFretes(d.opcoes_frete); } } finally { setBuscandoCep(false); }
  };

  const salvarEnderecoAtual = async () => {
    if (!endereco || !form.numero || !usuario) { alert("Preencha o número antes de salvar!"); return; }
    const r = await fetch(`${API}/enderecos`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ cep, logradouro: endereco.logradouro, numero: form.numero, complemento: form.complemento, bairro: endereco.bairro, cidade: endereco.localidade, estado: endereco.uf, principal: enderecosSalvos.length === 0 }) });
    if (r.ok) { carregarEnderecos(token); alert("✅ Endereço salvo!"); }
    else { alert("❌ Erro ao salvar endereço"); }
  };

  const finalizarAuth = async (data: any, tk: string) => {
    setToken(tk); setUsuario(data.usuario); localStorage.setItem("token", tk);
    preencherFormComUsuario(data.usuario); setPerfilForm({ nome: data.usuario.nome, telefone: data.usuario.telefone, cpf: data.usuario.cpf });
    setLoginAberto(false); await carregarCarrinhoDB(data.usuario, tk, produtos); await carregarEnderecos(tk);
  };

  const fazerLogin = async () => {
    setAuthLoading(true); setAuthErro("");
    try { const r = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email:authForm.email,senha:authForm.senha}) }); const d = await r.json(); if (!r.ok) { setAuthErro(d.detail||"Erro"); return; } await finalizarAuth(d,d.access_token); } finally { setAuthLoading(false); }
  };

  const fazerCadastro = async () => {
    setAuthErro("");
    if (!authForm.nome.trim() || authForm.nome.trim().length < 3) { setAuthErro("Nome deve ter pelo menos 3 caracteres"); return; }
    const tel = authForm.telefone.replace(/\D/g,"");
    if (tel.length < 10 || tel.length > 11) { setAuthErro("Telefone inválido"); return; }
    const cpf = authForm.cpf.replace(/\D/g,"");
    if (cpf.length !== 11) { setAuthErro("CPF deve ter 11 dígitos"); return; }
    if (!authForm.email.trim() || !authForm.email.includes("@")) { setAuthErro("Email inválido"); return; }
    if (!authForm.senha || authForm.senha.length < 6) { setAuthErro("Senha deve ter pelo menos 6 caracteres"); return; }
    setAuthLoading(true);
    try { const r = await fetch(`${API}/auth/cadastro`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(authForm) }); const d = await r.json(); if (!r.ok) { setAuthErro(d.detail||"Erro"); return; } await finalizarAuth(d,d.access_token); } finally { setAuthLoading(false); }
  };

  const logout = () => { localStorage.setItem("carrinho",JSON.stringify(carrinho)); setUsuario(null); setToken(""); localStorage.removeItem("token"); setForm({nome:"",email:"",telefone:"",cpf:"",numero:"",complemento:""}); setEnderecosSalvos([]); };
  const abrirPerfil = async () => { setPerfilAberto(true); setMenuMobile(false); const r = await fetch(`${API}/meus-pedidos`,{headers:authHeaders()}); if (r.ok) setPedidos(await r.json()); };
  const salvarPerfil = async () => { const r = await fetch(`${API}/auth/me`,{method:"PUT",headers:authHeaders(),body:JSON.stringify(perfilForm)}); if (r.ok) { const u=await r.json(); setUsuario(u); preencherFormComUsuario(u); setPerfilMsg("✅ Dados salvos!"); setTimeout(()=>setPerfilMsg(""),3000); } };
  const alterarSenha = async () => { if (senhaForm.nova_senha!==senhaForm.confirmar) { setPerfilMsg("❌ Senhas não conferem!"); return; } const r=await fetch(`${API}/auth/senha`,{method:"PUT",headers:authHeaders(),body:JSON.stringify({senha_atual:senhaForm.senha_atual,nova_senha:senhaForm.nova_senha})}); if (r.ok) { setPerfilMsg("✅ Senha alterada!"); setSenhaForm({senha_atual:"",nova_senha:"",confirmar:""}); } else { const d=await r.json(); setPerfilMsg(`❌ ${d.detail}`); } setTimeout(()=>setPerfilMsg(""),3000); };
  const cancelarPedido = async (id:number) => { if (!confirm("Cancelar?")) return; const r=await fetch(`${API}/pedidos/${id}/cancelar`,{method:"PUT",headers:authHeaders()}); if (r.ok) { setPedidos(prev=>prev.map(p=>p.id===id?{...p,status:"cancelado"}:p)); setPedidoSelecionado(null); } };
  const adicionarAoCarrinho = async (p:Produto) => {
    if (p.estoque===0) return;
    let novaQtd = 1;
    setCarrinho(prev=>{
      const ex=prev.find(i=>i.produto.id===p.id);
      if(ex&&ex.quantidade>=p.estoque) return prev;
      novaQtd = ex ? ex.quantidade+1 : 1;
      return ex?prev.map(i=>i.produto.id===p.id?{...i,quantidade:novaQtd}:i):[...prev,{produto:p,quantidade:1}];
    });
    await adicionarCarrinhoDB(p);
  };
  const removerDoCarrinho = async (id:number) => { setCarrinho(prev=>prev.filter(i=>i.produto.id!==id)); await removerCarrinhoDB(id); };
  const alterarQuantidade = async (id:number,d:number) => {
    const itemAtual = carrinho.find(i=>i.produto.id===id);
    if(!itemAtual) return;
    const novaQtd = itemAtual.quantidade + d;
    if(novaQtd<=0||novaQtd>itemAtual.produto.estoque) return;
    setCarrinho(prev=>prev.map(i=>i.produto.id===id?{...i,quantidade:novaQtd}:i));
    if(usuario){
      const r = await fetch(`${API}/carrinho?session_id=${sessionId(usuario)}`,{headers:authHeaders()});
      if(r.ok){
        const itens:CartItemDB[] = await r.json();
        const item = itens.find(i=>i.product_id===id);
        if(item) await fetch(`${API}/carrinho/${item.id}`,{method:"PUT",headers:authHeaders(),body:JSON.stringify({quantidade:novaQtd})});
      }
    }
  };

  const buscarCep = async () => {
    const c=cep.replace(/\D/g,""); if(c.length!==8)return;
    setBuscandoCep(true); setOpcoesFretes([]); setFreteSelecionado(null); setUsarEnderecoSalvo(null);
    try { const r=await fetch(`${API}/frete?cep_destino=${c}`); const d=await r.json(); if(r.ok){setEndereco(d.endereco);setOpcoesFretes(d.opcoes_frete);} } finally { setBuscandoCep(false); }
  };

  const finalizarPedido = async () => {
    if (!freteSelecionado||!endereco) return;
    if (!form.nome||!form.email||!form.cpf||!form.telefone||!form.numero) { setErroCheckout("Preencha todos os campos obrigatórios!"); return; }
    setEnviando(true); setErroCheckout("");
    try {
      const hdrs:any={"Content-Type":"application/json"}; if(token) hdrs["Authorization"]=`Bearer ${token}`;
      const r=await fetch(`${API}/pedidos`,{method:"POST",headers:hdrs,body:JSON.stringify({...form,cep,endereco:usarEnderecoSalvo?.logradouro||endereco.logradouro,bairro:usarEnderecoSalvo?.bairro||endereco.bairro,cidade:usarEnderecoSalvo?.cidade||endereco.localidade,estado:usarEnderecoSalvo?.estado||endereco.uf,frete_nome:freteSelecionado.nome,frete_preco:freteSelecionado.preco,frete_prazo:freteSelecionado.prazo,usuario_id:usuario?.id??null,itens:carrinho.map(i=>({product_id:i.produto.id,quantidade:i.quantidade,preco_unitario:i.produto.preco}))})});
      const pedido=await r.json();
      if(r.ok){
        if(usuario){const idb:CartItemDB[]=await(await fetch(`${API}/carrinho?session_id=${sessionId(usuario)}`,{headers:authHeaders()})).json();for(const it of idb)await fetch(`${API}/carrinho/${it.id}`,{method:"DELETE",headers:authHeaders()});}
        setPedidoFinalizado(pedido.id); setProdutos(prev=>prev.map(p=>{const it=carrinho.find(i=>i.produto.id===p.id);return it?{...p,estoque:Math.max(0,p.estoque-it.quantidade)}:p;}));
        setCarrinho([]); setCheckoutAberto(false); setCarrinhoAberto(false);
        try {
          if(formaPagamento==="pix"){
            const pixR = await fetch(`${API}/pagamentos/pix?pedido_id=${pedido.id}`, {method:"POST"});
            if (pixR.ok) { const px = await pixR.json(); setPixData(px); }
          } else {
            const cartaoR = await fetch(`${API}/pagamentos/cartao`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pedido_id:pedido.id,numero_cartao:cartaoForm.numero.replace(/\s/g,""),nome_cartao:cartaoForm.nome,mes_validade:cartaoForm.validade.split("/")[0],ano_validade:"20"+cartaoForm.validade.split("/")[1],cvv:cartaoForm.cvv,parcelas:parseInt(cartaoForm.parcelas)})});
            const cr = await cartaoR.json();
            if(cartaoR.ok){setPixData({qr_code:"",qr_code_image:"",total:pedido.total});}
            else{setErroCheckout(cr.detail||"Erro no cartão");}
          }
        } catch {}
      } else { setErroCheckout(pedido.detail||"Erro ao finalizar"); }
    } finally { setEnviando(false); }
  };

  const totalItens=carrinho.reduce((s,i)=>s+i.quantidade,0);
  const totalProdutos=carrinho.reduce((s,i)=>s+i.produto.preco*i.quantidade,0);
  const totalFinal=totalProdutos+(freteSelecionado?.preco??0);
  const sBadge=(s:string)=>({pendente:"bg-amber-500/20 text-amber-300 border border-amber-500/40",cancelado:"bg-red-500/20 text-red-300 border border-red-500/40",enviado:"bg-blue-500/20 text-blue-300 border border-purple-500/40",pago:"bg-purple-500/20 text-purple-300 border border-purple-500/40",entregue:"bg-emerald-500/20 text-emerald-300 border border-green-500/40"}[s]||"bg-gray-500/20 text-gray-300 border border-gray-500/40");
  const sIcon=(s:string)=>({pendente:"⏳",cancelado:"❌",enviado:"🚚",pago:"💳",entregue:"✅"}[s]||"📦");

  // Estilos — transparência sutil mas legível
  const inp="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 focus:bg-white/10 outline-none transition-all";
  const inpR="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-gray-500 outline-none";
  // Card modal: fundo semi-opaco com blur leve
  const modal="w-full bg-[#0d0010]/95 backdrop-blur-md border border-white/8";
  // Card interno: levemente translúcido
  const card="bg-white/4 border border-white/8 rounded-2xl";

  return (
    <div className="min-h-screen text-white" style={{fontFamily:`'${lojaFonte}',system-ui,sans-serif`,background:lojaCorFundo,color:lojaCorTexto,fontSize:lojaTamanhoFonte+"px"}}>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${lojaFonte.replace(/ /g,"+")}&display=swap`}/>
      {lojaLogo && lojaLogo !== "/favicon.png" && <link rel="icon" href={lojaLogo} type="image/png"/>}
      <style>{`
        :root {
          --cor-botao: ${lojaCorBotao};
          --cor-botao-hover: ${lojaCorBotao}cc;
          --transparencia-cards: ${lojaTransparencia};
          --fonte-botao: ${lojaTamanhoFonteBotao}px;
          --cor-texto-botao: ${lojaCorTextoBotao};
        }
        .btn-dinamico { background-color: var(--cor-botao) !important; font-size: var(--fonte-botao) !important; color: var(--cor-texto-botao) !important; }
        .btn-dinamico:hover { background-color: var(--cor-botao-hover) !important; }
        .glass-card { background: rgba(139,47,201,var(--transparencia-cards)) !important; }
      `}</style>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.25s ease forwards}
        .slide-in{animation:slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards}
        .slide-up{animation:slideUp 0.3s ease forwards}
        .btn-press:active{transform:scale(0.97)}
        .card-h{transition:transform 0.2s ease;position:relative;overflow:hidden}
        .card-h:hover{transform:translateY(-3px)}
        .crt-img-area::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px);pointer-events:none;z-index:2;opacity:1}
        .crt-img-area::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.35) 100%);pointer-events:none;z-index:3;opacity:1}
        .crt-scanline-img{position:absolute;width:100%;height:3px;background:linear-gradient(90deg,transparent,rgba(139,47,201,0.5),transparent);z-index:6;pointer-events:none;top:-3px;opacity:0}
        .card-h:hover .crt-scanline-img{animation:scan 3s linear infinite;opacity:1}
        .crt-glow{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(139,47,201,0.15) 0%,transparent 70%);z-index:1;opacity:0;transition:opacity 0.3s;pointer-events:none}
        .card-h:hover .crt-glow{opacity:1}
        .crt-price{text-shadow:0 0 8px rgba(57,255,20,0.4);transition:text-shadow 0.3s}
        .card-h:hover .crt-price{text-shadow:0 0 16px rgba(57,255,20,0.7)}
        @keyframes scan{0%{top:-3px;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}
        @keyframes flicker{0%,97%,100%{opacity:0}98%{opacity:0.03}99%{opacity:0}}
        .crt-flicker{position:absolute;inset:0;z-index:4;pointer-events:none;animation:flicker 8s infinite;opacity:0;background:rgba(255,255,255,0.05)}
        .glass-header{background:rgba(10,0,20,0.90);backdrop-filter:blur(20px);border-bottom:1px solid rgba(139,47,201,0.2)}
        .glass-sidebar{background:rgba(10,0,20,0.97);backdrop-filter:blur(20px);border-left:1px solid rgba(139,47,201,0.2)}
        .glass-modal{background:rgba(12,0,24,0.97);backdrop-filter:blur(24px);border:1px solid rgba(139,47,201,0.25)}
        .glass-card{background:rgba(139,47,201,0.05);border:1px solid rgba(139,47,201,0.15)}
        .glass-card-hover:hover{background:rgba(139,47,201,0.1)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
      `}</style>

      {/* HEADER */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src={lojaLogo} alt={lojaNome} className="object-contain rounded-lg" style={{width:lojaTamanhoLogo+"px",height:lojaTamanhoLogo+"px"}}/>
            <span className="font-black tracking-tight hidden sm:block" style={{fontSize:lojaTamanhoNomeLoja+"px"}}>
              <span style={{color:lojaCorNomeLoja}}>{lojaNome.split(" ").slice(0,-1).join(" ")||lojaNome}</span>
              {lojaNome.split(" ").length>1&&<span style={{color:lojaCorNomeLoja2}}> {lojaNome.split(" ").slice(-1)[0]}</span>}
            </span>
          </a>
          <div className="flex-1 max-w-md hidden md:block">
            <input placeholder="🔍 Buscar produtos..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:bg-white/10 outline-none transition-all"/>
          </div>
          <div className="flex items-center gap-2">
            {sincronizando&&<span className="text-xs text-gray-600 hidden sm:block">☁️</span>}
            {usuario?(
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={abrirPerfil} className="flex items-center gap-2 bg-white/6 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm transition-all btn-press">
                  <span className="w-6 h-6 rounded-full bg-purple-700 flex items-center justify-center text-xs font-black flex-shrink-0">{usuario.nome[0]}</span>
                  <span className="text-gray-300 font-medium">{usuario.nome.split(" ")[0]}</span>
                </button>
                {usuario.is_admin&&<a href="/admin" className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs text-green-400 hover:bg-green-500/20 transition-all font-bold">⚙️ Admin</a>}
                <button onClick={logout} className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400 font-bold transition-all btn-press">Sair</button>
              </div>
            ):(
              <button onClick={()=>setLoginAberto(true)} className="hidden sm:block bg-white/6 border border-white/10 hover:border-purple-500/40 rounded-xl px-4 py-2 text-sm text-purple-400 transition-all font-medium btn-press">Entrar</button>
            )}
            <button onClick={()=>setCarrinhoAberto(true)} className="relative bg-purple-700 hover:bg-purple-600 rounded-xl px-3 sm:px-4 py-2 text-sm font-bold transition-all btn-press btn-dinamico flex items-center gap-2">
              <span>🛒</span><span className="hidden sm:inline">Carrinho</span>
              {totalItens>0&&<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">{totalItens}</span>}
            </button>
            <button onClick={()=>setMenuMobile(!menuMobile)} className="sm:hidden bg-white/6 border border-white/10 rounded-xl p-2 text-gray-400">☰</button>
          </div>
        </div>
        <div className="md:hidden px-4 pb-3">
          <input placeholder="🔍 Buscar produtos..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 outline-none transition-all"/>
        </div>
        {menuMobile&&(
          <div className="sm:hidden border-t border-white/5 px-4 py-3 space-y-1 fade-in">
            {usuario?(<>
              <button onClick={abrirPerfil} className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-white/5 text-sm text-gray-300 transition-all">👤 {usuario.nome.split(" ")[0]}</button>
              {usuario.is_admin&&<a href="/admin" className="block py-2.5 px-3 rounded-lg hover:bg-white/5 text-sm text-green-400 transition-all">⚙️ Admin</a>}
              <button onClick={()=>{logout();setMenuMobile(false);}} className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-white/5 text-sm text-red-400 transition-all">Sair</button>
            </>):<button onClick={()=>{setLoginAberto(true);setMenuMobile(false);}} className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-white/5 text-sm text-purple-400 transition-all">Entrar / Cadastrar</button>}
          </div>
        )}
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{lojaDesc.includes(" de ")?(lojaDesc.split(" de ")[0]+" de "):lojaDesc} {lojaDesc.includes(" de ")?<span className="text-purple-400">{lojaDesc.split(" de ")[1]}</span>:""}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{produtosFiltrados.length} produto{produtosFiltrados.length!==1?"s":""} disponível{produtosFiltrados.length!==1?"s":""}</p>
        </div>
        {busca&&<button onClick={()=>setBusca("")} className="text-sm text-purple-400 hover:text-blue-300 transition-all">✕ Limpar</button>}
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-16">
        {loading?(
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(10)].map((_,i)=><div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse"><div className="h-40 bg-white/5"/><div className="p-3 space-y-2"><div className="h-3 bg-white/5 rounded w-3/4"/><div className="h-5 bg-white/5 rounded w-1/2"/></div></div>)}
          </div>
        ):produtosFiltrados.length===0?(
          <div className="text-center py-24"><p className="text-5xl mb-4">🔍</p><p className="text-gray-500">Nenhum produto para "{busca}"</p><button onClick={()=>setBusca("")} className="mt-4 text-purple-400 hover:text-blue-300 text-sm transition-all">Limpar busca</button></div>
        ):(
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {produtosFiltrados.map((p,i)=>(
              <div key={p.id} className={`glass-card glass-card-hover rounded-2xl overflow-hidden card-h group ${p.estoque===0?"opacity-50":""}`} style={{animation:`fadeIn 0.4s ease forwards`,animationDelay:`${Math.min(i*0.04,0.5)}s`,opacity:0}}>

                <div className="relative h-44 sm:h-52 overflow-hidden crt-img-area" style={{background:"#ffffff"}}>
                  <div className="crt-scanline-img"/>
                  <a href={`/produto/${p.id}`}><img src={p.imagem_url} alt={p.nome} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500"/></a>
                  {p.estoque===0&&<div className="absolute inset-0 bg-black/70 flex items-center justify-center"><span className="text-red-400 font-black text-xs tracking-widest uppercase bg-black/60 px-3 py-1 rounded-full">Esgotado</span></div>}
                  {p.estoque>0&&p.estoque<=3&&<div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">Últimas {p.estoque}!</div>}
                </div>
                <div className="p-3 sm:p-4">
                  <a href={`/produto/${p.id}`} className="block text-xs sm:text-sm font-semibold text-gray-200 line-clamp-2 leading-tight mb-3 min-h-[2.5rem] hover:text-purple-400 transition-all">{p.nome}</a>
                  <div className="mb-3">
                    <p className="text-[9px] text-purple-400/70 font-bold uppercase tracking-widest">PIX</p>
                    <p className="text-lg sm:text-xl font-black text-green-400 crt-price">R$ {p.preco.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    <p className="text-gray-600 text-[9px] sm:text-[10px]">12x R$ {(p.preco/12).toLocaleString("pt-BR",{maximumFractionDigits:2})}</p>
                  </div>
                  <button onClick={()=>adicionarAoCarrinho(p)} disabled={p.estoque===0} className={`w-full py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wide transition-all btn-press ${p.estoque===0?"bg-white/5 text-gray-600 cursor-not-allowed":"bg-purple-700 hover:bg-purple-600 text-white btn-dinamico"}`}>
                    {p.estoque===0?"Esgotado":"+ Carrinho"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pedido Confirmado */}
      {pedidoFinalizado&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-modal rounded-3xl p-6 text-center max-w-sm w-full slide-up overflow-y-auto max-h-[90vh]">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-green-500/25 flex items-center justify-center text-2xl mx-auto mb-4">✅</div>
            <h2 className="text-lg font-black text-green-400 mb-1">Pedido #{pedidoFinalizado}</h2>
            <p className="text-gray-400 text-sm mb-4">{pixData?.qr_code?"Pague via PIX para confirmar:":"Pagamento confirmado!"}</p>
            {pixData?.qr_code ? (<>
              {pixData.qr_code_image && <img src={pixData.qr_code_image} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-xl mb-3 bg-white p-2"/>}
              <p className="text-xs text-gray-500 mb-2">Ou copie o código PIX:</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3">
                <p className="text-xs text-gray-300 break-all select-all">{pixData.qr_code}</p>
              </div>
              <button onClick={()=>{
                try{navigator.clipboard.writeText(pixData?.qr_code||"");}
                catch{const t=document.createElement("textarea");t.value=pixData?.qr_code||"";document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t);}
                setPixCopiado(true); setTimeout(()=>setPixCopiado(false),3000);
              }} className="w-full bg-purple-700 hover:bg-purple-600 py-2.5 rounded-xl font-black text-xs mb-3 transition-all btn-press btn-dinamico">{pixCopiado?"✅ Copiado!":"📋 Copiar Código PIX"}</button>
              <p className="text-green-400 font-black text-lg mb-4">Total: R$ {pixData.total.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            </>):(<p className="text-gray-500 text-sm mb-4">Você receberá um email de confirmação.</p>)}
            <button onClick={()=>{setPedidoFinalizado(null);setPixData(null);}} className="w-full bg-white/6 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl font-black text-sm transition-all btn-press">Continuar Comprando</button>
          </div>
        </div>
      )}

      {/* Login */}
      {loginAberto&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className={`glass-modal w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl slide-up overflow-hidden`}>
            <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-white/6">
              <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {(["login","cadastro"] as const).map(t=><button key={t} onClick={()=>setTelaAuth(t)} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${telaAuth===t?"bg-purple-700 text-white":"text-gray-500 hover:text-gray-300"}`}>{t==="login"?"Entrar":"Cadastrar"}</button>)}
              </div>
              <button onClick={()=>setLoginAberto(false)} className="text-gray-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 transition-all">✕</button>
            </div>
            <div className="px-5 py-5 space-y-3">
              {authErro&&<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{authErro}</div>}
              {telaAuth==="cadastro"&&<><input placeholder="Nome completo *" value={authForm.nome} onChange={e=>setAuthForm({...authForm,nome:e.target.value})} className={inp}/><div className="grid grid-cols-2 gap-3"><input placeholder="Telefone *" value={authForm.telefone} onChange={e=>setAuthForm({...authForm,telefone:e.target.value})} className={inp}/><input placeholder="CPF *" value={authForm.cpf} onChange={e=>setAuthForm({...authForm,cpf:e.target.value})} className={inp}/></div></>}
              <input placeholder="Email *" type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} className={inp}/>
              <input placeholder="Senha *" type="password" value={authForm.senha} onChange={e=>setAuthForm({...authForm,senha:e.target.value})} onKeyDown={e=>e.key==="Enter"&&(telaAuth==="login"?fazerLogin():fazerCadastro())} className={inp}/>
              <button onClick={telaAuth==="login"?fazerLogin:fazerCadastro} disabled={authLoading} className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-3 rounded-xl font-black text-sm transition-all btn-press flex items-center justify-center gap-2">
                {authLoading?(<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Aguarde...</span></>):telaAuth==="login"?"Entrar":"Criar Conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Perfil */}
      {perfilAberto&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className={`glass-modal w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col slide-up`}>
            <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-white/6 flex-shrink-0">
              <h2 className="font-black text-lg">Minha Conta</h2>
              <button onClick={()=>setPerfilAberto(false)} className="text-gray-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 transition-all">✕</button>
            </div>
            <div className="flex border-b border-white/6 flex-shrink-0">
              {(["dados","pedidos","rastreamento"] as const).map(aba=>(
                <button key={aba} onClick={()=>setAbaPerfil(aba)} className={`flex-1 py-3 text-xs font-black uppercase tracking-wide transition-all ${abaPeril===aba?"text-purple-400 border-b-2 border-blue-400":"text-gray-500 hover:text-gray-300"}`}>
                  {aba==="dados"?"📝 Dados":aba==="pedidos"?"📦 Pedidos":"🚚 Rastr."}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {perfilMsg&&<div className="bg-white/5 border border-white/8 rounded-xl p-3 text-sm">{perfilMsg}</div>}
              {abaPeril==="dados"&&(
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600 uppercase font-black tracking-wider">Informações Pessoais</p>
                    <input placeholder="Nome" value={perfilForm.nome} onChange={e=>setPerfilForm({...perfilForm,nome:e.target.value})} className={inp}/>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Telefone" value={perfilForm.telefone} onChange={e=>setPerfilForm({...perfilForm,telefone:e.target.value})} className={inp}/>
                      <input placeholder="CPF" value={perfilForm.cpf} onChange={e=>setPerfilForm({...perfilForm,cpf:e.target.value})} className={inp}/>
                    </div>
                    <input value={usuario?.email||""} readOnly className={inpR}/>
                    <button onClick={salvarPerfil} className="bg-purple-700 hover:bg-purple-600 px-6 py-2.5 rounded-xl font-black text-sm transition-all btn-press">Salvar</button>
                  </div>
                  {enderecosSalvos.length>0&&(
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 uppercase font-black tracking-wider">Endereços Salvos</p>
                      {enderecosSalvos.map(end=><div key={end.id} className={`${card} p-3 text-sm`}><p className="font-semibold text-gray-200">{end.logradouro}, {end.numero}</p><p className="text-gray-500 text-xs">{end.bairro} — {end.cidade}/{end.estado}</p>{end.principal&&<span className="text-green-400 text-xs font-bold">✓ Principal</span>}</div>)}
                    </div>
                  )}
                  <div className="space-y-3 pt-4 border-t border-white/6">
                    <p className="text-xs text-gray-600 uppercase font-black tracking-wider">Alterar Senha</p>
                    <input placeholder="Senha atual" type="password" value={senhaForm.senha_atual} onChange={e=>setSenhaForm({...senhaForm,senha_atual:e.target.value})} className={inp}/>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Nova senha" type="password" value={senhaForm.nova_senha} onChange={e=>setSenhaForm({...senhaForm,nova_senha:e.target.value})} className={inp}/>
                      <input placeholder="Confirmar" type="password" value={senhaForm.confirmar} onChange={e=>setSenhaForm({...senhaForm,confirmar:e.target.value})} className={inp}/>
                    </div>
                    <button onClick={alterarSenha} className="bg-white/6 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl font-black text-sm transition-all btn-press">Alterar Senha</button>
                  </div>
                </div>
              )}
              {abaPeril==="pedidos"&&(
                <div className="space-y-3">
                  {pedidos.length===0?(<div className="text-center py-12"><p className="text-4xl mb-3">📦</p><p className="text-gray-600 text-sm">Nenhum pedido ainda</p></div>):pedidos.map(p=>(
                    <div key={p.id} onClick={()=>setPedidoSelecionado(pedidoSelecionado?.id===p.id?null:p)} className={`${card} glass-card-hover rounded-2xl overflow-hidden cursor-pointer transition-all`}>
                      <div className="flex items-center justify-between p-4">
                        <div><p className="font-black text-gray-200">Pedido #{p.id}</p><p className="text-gray-500 text-xs">{p.cidade}/{p.estado} · {p.frete_nome}</p></div>
                        <div className="text-right"><span className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${sBadge(p.status)}`}>{sIcon(p.status)} {p.status.toUpperCase()}</span><p className="text-green-400 font-black text-sm mt-1">R$ {p.total.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p></div>
                      </div>
                      {pedidoSelecionado?.id===p.id&&(
                        <div className="border-t border-white/6 p-4 space-y-2 fade-in bg-white/2">
                          {p.itens?.map((it:any,i:number)=><p key={i} className="text-sm text-gray-400">• Produto #{it.product_id} — {it.quantidade}x — R$ {it.preco_unitario.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>)}
                          {p.codigo_rastreio&&<div className="bg-blue-500/10 border border-purple-500/20 rounded-xl p-3 mt-2"><p className="text-xs text-purple-400 font-black mb-1">📦 RASTREIO</p><p className="font-black text-white">{p.codigo_rastreio}</p></div>}
                          {p.status==="pendente"&&<button onClick={e=>{e.stopPropagation();cancelarPedido(p.id);}} className="text-xs text-red-400 border border-red-400/20 px-4 py-2 rounded-lg hover:bg-red-400/10 transition-all btn-press mt-2">Cancelar Pedido</button>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {abaPeril==="rastreamento"&&(
                <div className="space-y-4">
                  {pedidos.filter(p=>["pendente","enviado"].includes(p.status)).length===0?(<div className="text-center py-12"><p className="text-4xl mb-3">🚚</p><p className="text-gray-600 text-sm">Nenhum pedido ativo</p></div>):pedidos.filter(p=>["pendente","enviado"].includes(p.status)).map(p=>(
                    <div key={p.id} className={`${card} rounded-2xl p-5`}>
                      <div className="flex justify-between items-center mb-4"><p className="font-black text-gray-200">Pedido #{p.id}</p><span className={`px-2 py-1 rounded-lg text-xs font-black ${sBadge(p.status)}`}>{sIcon(p.status)} {p.status.toUpperCase()}</span></div>
                      <div className="space-y-2 mb-4">
                        {[{l:"Pedido Recebido",d:true},{l:"Pagamento Confirmado",d:p.status!=="pendente"},{l:`Enviado via ${p.frete_nome}`,d:["enviado","entregue"].includes(p.status)},{l:"Entregue",d:p.status==="entregue"}].map((e,i)=>(
                          <div key={i} className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full flex-shrink-0 ${e.d?"bg-emerald-500":"bg-white/10"}`}/><p className={`text-sm ${e.d?"text-gray-200 font-semibold":"text-gray-600"}`}>{e.l}</p></div>
                        ))}
                      </div>
                      {p.codigo_rastreio&&<div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4 mt-2">
  <p className="text-xs text-purple-400 font-black uppercase tracking-widest mb-3">📦 Código de Rastreio</p>
  <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-3 mb-3">
    <p className="font-black text-white text-base tracking-widest flex-1 font-mono">{p.codigo_rastreio}</p>
    <button onClick={()=>{try{navigator.clipboard.writeText(p.codigo_rastreio||"")}catch{const t=document.createElement("textarea");t.value=p.codigo_rastreio||"";document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t);}}} className="text-gray-400 hover:text-white transition-all p-1 rounded-lg hover:bg-white/10" title="Copiar código">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
    </button>
  </div>
  <a href={`https://www.correios.com.br/rastreamento#${p.codigo_rastreio}`} target="_blank" className="text-xs text-purple-400 hover:text-purple-300 transition-all flex items-center gap-1">
    Rastrear nos Correios <span>→</span>
  </a>
</div>}
                      <p className="text-xs text-gray-600 mt-3">Prazo: {p.frete_prazo} dia{p.frete_prazo>1?"s":""} útil{p.frete_prazo>1?"eis":""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Carrinho */}
      {carrinhoAberto&&(
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={()=>setCarrinhoAberto(false)}/>
          <div className="w-full sm:w-96 glass-sidebar h-full flex flex-col slide-in">
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/6">
              <div><h2 className="font-black text-lg">Carrinho</h2>{usuario&&<p className="text-xs text-green-400">☁️ Sincronizado</p>}</div>
              <button onClick={()=>setCarrinhoAberto(false)} className="text-gray-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 transition-all">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carrinho.length===0?(<div className="flex flex-col items-center justify-center h-full text-center"><p className="text-5xl mb-4">🛒</p><p className="text-gray-600 text-sm">Seu carrinho está vazio</p></div>):carrinho.map(item=>(
                <div key={item.produto.id} className={`${card} rounded-2xl p-3 flex gap-3`}>
                  <img src={item.produto.imagem_url} alt={item.produto.nome} className="w-16 h-16 object-contain rounded-xl bg-black/40 flex-shrink-0 p-1"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-200 line-clamp-2 leading-tight">{item.produto.nome}</p>
                    <p className="text-green-400 font-black text-sm mt-1">R$ {(item.produto.preco*item.quantidade).toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={()=>alterarQuantidade(item.produto.id,-1)} className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 transition-all text-sm font-black flex items-center justify-center btn-press">−</button>
                      <span className="text-sm font-black w-4 text-center text-gray-200">{item.quantidade}</span>
                      <button onClick={()=>alterarQuantidade(item.produto.id,1)} disabled={item.quantidade>=item.produto.estoque} className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 disabled:opacity-30 transition-all text-sm font-black flex items-center justify-center btn-press">+</button>
                    </div>
                  </div>
                  <button onClick={()=>removerDoCarrinho(item.produto.id)} className="text-gray-600 hover:text-red-400 transition-all self-start p-1 text-lg">✕</button>
                </div>
              ))}
            </div>
            {carrinho.length>0&&(
              <div className="p-4 border-t border-white/6 space-y-3">
                <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Subtotal</span><span className="font-black text-green-400 text-lg">R$ {totalProdutos.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span></div>
                {!usuario&&<button onClick={()=>{setCarrinhoAberto(false);setLoginAberto(true);}} className="w-full border border-purple-500/25 text-purple-400 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-600/10 transition-all btn-press">☁️ Entrar para sincronizar</button>}
                <button onClick={()=>{setCarrinhoAberto(false);setCheckoutAberto(true);}} className="w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-xl font-black text-sm transition-all btn-press">Finalizar Compra →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkoutAberto&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div className={`glass-modal w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[95vh] flex flex-col slide-up`}>
            <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-white/6 flex-shrink-0">
              <h2 className="font-black text-lg">Finalizar Compra</h2>
              <button onClick={()=>setCheckoutAberto(false)} className="text-gray-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 transition-all">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
              {erroCheckout&&<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{erroCheckout}</div>}
              <div className="space-y-3">
                <p className="text-xs text-gray-600 uppercase font-black tracking-wider">👤 Dados Pessoais</p>
                <input placeholder="Nome completo *" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inp}/>
                <div className="grid grid-cols-2 gap-3"><input placeholder="Email *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inp}/><input placeholder="Telefone *" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} className={inp}/></div>
                <input placeholder="CPF *" value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} className={inp}/>
              </div>
              {enderecosSalvos.length>0&&(
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 uppercase font-black tracking-wider">📍 Endereços Salvos</p>
                  {enderecosSalvos.map(end=>(
                    <label key={end.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${usarEnderecoSalvo?.id===end.id?"border-purple-500/60 bg-blue-500/10":"border-white/8 bg-white/3 hover:border-white/15"}`}>
                      <input type="radio" name="end" checked={usarEnderecoSalvo?.id===end.id} onChange={()=>usarEndereco(end)} className="accent-blue-500"/>
                      <div className="text-sm"><p className="font-semibold text-gray-200">{end.logradouro}, {end.numero}</p><p className="text-gray-500 text-xs">{end.cidade}/{end.estado}</p></div>
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${!usarEnderecoSalvo?"border-purple-500/60 bg-blue-500/10":"border-white/8 bg-white/3 hover:border-white/15"}`}>
                    <input type="radio" name="end" checked={!usarEnderecoSalvo} onChange={()=>{setUsarEnderecoSalvo(null);setEndereco(null);setOpcoesFretes([]);}} className="accent-blue-500"/>
                    <p className="text-sm font-semibold text-gray-200">+ Novo endereço</p>
                  </label>
                </div>
              )}
              {!usarEnderecoSalvo&&(
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 uppercase font-black tracking-wider">📍 Endereço de Entrega</p>
                  <div className="flex gap-2">
                    <input placeholder="CEP *" value={cep} onChange={e=>setCep(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscarCep()} className={inp}/>
                    <button onClick={buscarCep} disabled={buscandoCep} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 px-5 py-3 rounded-xl font-black text-sm transition-all btn-press whitespace-nowrap flex items-center gap-2 min-w-[80px] justify-center">
                      {buscandoCep?<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:"Buscar"}
                    </button>
                  </div>
                  {endereco&&(
                    <div className="space-y-3 fade-in">
                      <input value={endereco.logradouro} readOnly className={inpR}/>
                      <div className="grid grid-cols-2 gap-3"><input placeholder="Número *" value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} className={inp}/><input placeholder="Complemento" value={form.complemento} onChange={e=>setForm({...form,complemento:e.target.value})} className={inp}/></div>
                      <div className="grid grid-cols-3 gap-3"><input value={endereco.bairro} readOnly className={inpR}/><input value={endereco.localidade} readOnly className={inpR}/><input value={endereco.uf} readOnly className={inpR}/></div>
                      {usuario&&<button onClick={salvarEnderecoAtual} className="w-full bg-purple-700/30 hover:bg-purple-700/60 border border-purple-500/40 text-purple-300 hover:text-white py-2.5 rounded-xl font-black text-sm transition-all btn-press">💾 Salvar este endereço</button>}
                    </div>
                  )}
                </div>
              )}
              {opcoesFretes.length>0&&(
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 uppercase font-black tracking-wider">🚚 Frete</p>
                  {opcoesFretes.map(o=>(
                    <label key={o.nome} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${freteSelecionado?.nome===o.nome?"border-purple-500/60 bg-blue-500/10":"border-white/8 bg-white/3 hover:border-white/15"}`}>
                      <div className="flex items-center gap-3"><input type="radio" name="frete" checked={freteSelecionado?.nome===o.nome} onChange={()=>setFreteSelecionado(o)} className="accent-blue-500"/><div><p className="font-black text-sm text-gray-200">{o.nome}</p><p className="text-gray-500 text-xs">{o.prazo} dia{o.prazo>1?"s":""} útil{o.prazo>1?"eis":""}</p></div></div>
                      <span className="font-black text-green-400 text-sm">R$ {o.preco.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-2">
                <p className="text-xs text-gray-600 uppercase font-black tracking-wider mb-3">🧾 Resumo</p>
                {carrinho.map(i=><div key={i.produto.id} className="flex justify-between text-sm text-gray-400"><span className="line-clamp-1 flex-1 mr-2">{i.produto.nome} ×{i.quantidade}</span><span className="flex-shrink-0">R$ {(i.produto.preco*i.quantidade).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span></div>)}
                <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-white/6"><span>Frete ({freteSelecionado?.nome??"—"})</span><span>R$ {(freteSelecionado?.preco??0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span></div>
                <div className="flex justify-between font-black pt-2 border-t border-white/6"><span className="text-gray-200">Total</span><span className="text-green-400 text-lg">R$ {totalFinal.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span></div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4 border-t border-white/6 flex-shrink-0 space-y-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-black tracking-wider mb-3">💳 Forma de Pagamento</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={()=>setFormaPagamento("pix")} className={"py-2.5 rounded-xl font-black text-sm transition-all btn-press border "+(formaPagamento==="pix"?"bg-purple-700 border-purple-500 text-white":"bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/40")}>🏦 PIX</button>
                  <button onClick={()=>setFormaPagamento("cartao")} className={"py-2.5 rounded-xl font-black text-sm transition-all btn-press border "+(formaPagamento==="cartao"?"bg-purple-700 border-purple-500 text-white":"bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/40")}>💳 Cartão</button>
                </div>
                {formaPagamento==="cartao"&&(
                  <div className="space-y-3 fade-in">
                    <input placeholder="Número do cartão" maxLength={19} value={cartaoForm.numero} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,16);setCartaoForm({...cartaoForm,numero:v.replace(/(.{4})/g,"$1 ").trim()});}} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all"/>
                    <input placeholder="Nome no cartão" value={cartaoForm.nome} onChange={e=>setCartaoForm({...cartaoForm,nome:e.target.value.toUpperCase()})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all"/>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="MM/AA" maxLength={5} value={cartaoForm.validade} onChange={e=>{let v=e.target.value.replace(/\D/g,"");if(v.length>=3)v=v.slice(0,2)+"/"+v.slice(2,4);setCartaoForm({...cartaoForm,validade:v});}} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all"/>
                      <input placeholder="CVV" maxLength={4} value={cartaoForm.cvv} onChange={e=>setCartaoForm({...cartaoForm,cvv:e.target.value.replace(/\D/g,"")})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all"/>
                    </div>
                    <select value={cartaoForm.parcelas} onChange={e=>setCartaoForm({...cartaoForm,parcelas:e.target.value})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/70 outline-none transition-all">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>{const taxa=n===1?0:0.0299;const total=totalFinal*(1+taxa);const parc=total/n;return(<option key={n} value={n} style={{background:"#1a0030"}}>{n}x de R$ {parc.toLocaleString("pt-BR",{minimumFractionDigits:2})}{n>1?" (com juros)":" (sem juros)"}</option>);})}
                    </select>
                    {cartaoErro&&<p className="text-red-400 text-xs">{cartaoErro}</p>}
                  </div>
                )}
              </div>
              <button onClick={finalizarPedido} disabled={!freteSelecionado||enviando} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed py-4 rounded-xl font-black text-sm transition-all btn-press flex items-center justify-center gap-3">
                {enviando?(<><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Processando...</span></>):formaPagamento==="pix"?"🏦 Pagar com PIX":"💳 Pagar com Cartão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
