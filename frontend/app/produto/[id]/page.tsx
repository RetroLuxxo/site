"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? (window.location.port === "3000" ? window.location.protocol + "//" + window.location.hostname + ":8000" : window.location.protocol + "//" + window.location.host) : "http://localhost:8000");

type Produto = { id: number; nome: string; descricao: string; preco: number; imagem_url: string; fotos: string[]; estoque: number; peso_kg: number; };
type Avaliacao = { id: number; nome: string; estrelas: number; comentario: string; };

export default function ProdutoPage() {
  const { id } = useParams();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [avForm, setAvForm] = useState({ nome: "", estrelas: 5, comentario: "" });
  const [enviandoAv, setEnviandoAv] = useState(false);
  const [avMsg, setAvMsg] = useState("");
  const [qtdCarrinho, setQtdCarrinho] = useState(0);
  const [adicionado, setAdicionado] = useState(false);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [carrinho, setCarrinho] = useState<{produto:Produto;quantidade:number}[]>([]);
  const [lojaNome, setLojaNome] = useState("JC GAMES STORE");
  const [lojaLogo, setLojaLogo] = useState("/favicon.png");
  const [lojaCorPrimaria, setLojaCorPrimaria] = useState("#8B2FC9");
  const [lojaFonte, setLojaFonte] = useState("Orbitron");
  const [lojaCorNome1, setLojaCorNome1] = useState("#8B2FC9");
  const [lojaCorNome2, setLojaCorNome2] = useState("#ffffff");
  const [lojaTamanhoNome, setLojaTamanhoNome] = useState(18);
  const [lojaTamanhoLogo, setLojaTamanhoLogo] = useState(32);

  useEffect(() => {
    fetch(`${API}/configuracoes/loja`).then(r=>r.ok?r.json():{}).then((cfg:any)=>{
      if(cfg.loja_nome) setLojaNome(cfg.loja_nome);
      if(cfg.loja_logo) setLojaLogo(cfg.loja_logo);
      if(cfg.loja_cor_primaria) setLojaCorPrimaria(cfg.loja_cor_primaria);
      if(cfg.loja_fonte) setLojaFonte(cfg.loja_fonte);
      if(cfg.loja_cor_nome_loja) setLojaCorNome1(cfg.loja_cor_nome_loja);
      if(cfg.loja_cor_nome_loja2) setLojaCorNome2(cfg.loja_cor_nome_loja2);
      if(cfg.loja_tamanho_nome_loja) setLojaTamanhoNome(Number(cfg.loja_tamanho_nome_loja));
      if(cfg.loja_tamanho_logo) setLojaTamanhoLogo(Number(cfg.loja_tamanho_logo));
      const link=document.createElement("link");
      link.rel="stylesheet";
      link.href=`https://fonts.googleapis.com/css2?family=${(cfg.loja_fonte||"Orbitron").replace(/ /g,"+")}&display=swap`;
      document.head.appendChild(link);
    });
  }, []);

  useEffect(() => {
    const tk = localStorage.getItem("token");
    const syncCarrinho = async () => {
      try {
        if (tk) {
          const me = await fetch(`${API}/auth/me`, {headers:{Authorization:`Bearer ${tk}`}});
          if (me.ok) {
            const u = await me.json();
            const r = await fetch(`${API}/carrinho?session_id=user_${u.id}`, {headers:{Authorization:`Bearer ${tk}`}});
            if (r.ok) {
              const itensDB = await r.json();
              const prods = await fetch(`${API}/produtos`).then(r=>r.json());
              const c = itensDB.map((i:any) => {
                const p = prods.find((p:any) => p.id === i.product_id);
                return p ? {produto:p, quantidade:i.quantidade} : null;
              }).filter(Boolean);
              setCarrinho(c);
              const item = c.find((i:any) => i.produto?.id === parseInt(id as string));
              setQtdCarrinho(item ? item.quantidade : 0);
              return;
            }
          }
        }
        const c = JSON.parse(localStorage.getItem("carrinho") || "[]");
        setCarrinho(c);
        const item = c.find((i: any) => i.produto?.id === parseInt(id as string));
        setQtdCarrinho(item ? item.quantidade : 0);
      } catch {}
    };
    syncCarrinho();
    window.addEventListener("focus", syncCarrinho);
    return () => window.removeEventListener("focus", syncCarrinho);
  }, [id]);

  const adicionarAoCarrinho = async () => {
    if (!produto) return;
    const tk = localStorage.getItem("token");
    const novaQtd = qtdCarrinho + 1;
    if (tk) {
      // Logado: salva no banco
      const me = await fetch(`${API}/auth/me`, {headers:{Authorization:`Bearer ${tk}`}});
      if (me.ok) {
        const u = await me.json();
        const r = await fetch(`${API}/carrinho?session_id=user_${u.id}`, {headers:{Authorization:`Bearer ${tk}`}});
        if (r.ok) {
          const itens = await r.json();
          const ex = itens.find((i:any) => i.product_id === produto.id);
          if (ex) {
            await fetch(`${API}/carrinho/${ex.id}`, {method:"PUT", headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json"}, body:JSON.stringify({quantidade:novaQtd})});
          } else {
            await fetch(`${API}/carrinho`, {method:"POST", headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json"}, body:JSON.stringify({product_id:produto.id, quantidade:1, session_id:`user_${u.id}`})});
          }
        }
      }
    } else {
      // Não logado: salva no localStorage
      const c = JSON.parse(localStorage.getItem("carrinho") || "[]");
      const ex = c.find((i: any) => i.produto?.id === produto.id);
      const novo = ex ? c.map((i: any) => i.produto?.id===produto.id?{...i,quantidade:i.quantidade+1}:i) : [...c,{produto,quantidade:1}];
      localStorage.setItem("carrinho", JSON.stringify(novo));
      setCarrinho(novo);
    }
    setQtdCarrinho(novaQtd);
    setAdicionado(true);
    // Recarrega carrinho do banco para atualizar estado
    setTimeout(async () => {
      const tk2 = localStorage.getItem("token");
      if (tk2) {
        const me2 = await fetch(`${API}/auth/me`, {headers:{Authorization:`Bearer ${tk2}`}});
        if (me2.ok) {
          const u2 = await me2.json();
          const r2 = await fetch(`${API}/carrinho?session_id=user_${u2.id}`, {headers:{Authorization:`Bearer ${tk2}`}});
          if (r2.ok) {
            const itensDB2 = await r2.json();
            const prods2 = await fetch(`${API}/produtos`).then(r=>r.json());
            const c2 = itensDB2.map((i:any) => {
              const p2 = prods2.find((p:any) => p.id === i.product_id);
              return p2 ? {produto:p2, quantidade:i.quantidade} : null;
            }).filter(Boolean);
            setCarrinho(c2);
          }
        }
      }
    }, 500);
  };

  const removerDoCarrinho = async (prodId: number) => {
    const novo = carrinho.filter((i: any) => i.produto?.id !== prodId);
    localStorage.setItem("carrinho", JSON.stringify(novo));
    setCarrinho(novo);
    const item = novo.find((i: any) => i.produto?.id === produto?.id);
    setQtdCarrinho(item ? item.quantidade : 0);
    const tk = localStorage.getItem("token");
    if (tk) {
      const me = await fetch(`${API}/auth/me`, {headers:{Authorization:`Bearer ${tk}`}});
      if (me.ok) {
        const u = await me.json();
        const r = await fetch(`${API}/carrinho?session_id=user_${u.id}`, {headers:{Authorization:`Bearer ${tk}`}});
        if (r.ok) {
          const itens = await r.json();
          const ex = itens.find((i:any) => i.product_id === prodId);
          if (ex) await fetch(`${API}/carrinho/${ex.id}`, {method:"DELETE", headers:{Authorization:`Bearer ${tk}`}});
        }
      }
    }
  };

  const totalCarrinho = carrinho.reduce((s: number, i: any) => s + i.produto.preco * i.quantidade, 0);

  useEffect(() => {
    fetch(`${API}/produtos`).then(r => r.json()).then(data => {
      const p = data.find((p: Produto) => p.id === parseInt(id as string));
      if (p) setProduto(p);
    });
    fetch(`${API}/produtos/${id}/avaliacoes`).then(r => r.json()).then(setAvaliacoes).catch(() => {});
  }, [id]);

  const enviarAvaliacao = async () => {
    if (!avForm.nome.trim() || !avForm.comentario.trim()) { setAvMsg("Preencha nome e comentario!"); return; }
    setEnviandoAv(true);
    try {
      const r = await fetch(`${API}/produtos/${id}/avaliacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(avForm) });
      if (r.ok) { const av = await r.json(); setAvaliacoes(prev => [...prev, av]); setAvForm({ nome: "", estrelas: 5, comentario: "" }); setAvMsg("Avaliacao enviada!"); }
    } finally { setEnviandoAv(false); setTimeout(() => setAvMsg(""), 3000); }
  };

  const mediaEstrelas = avaliacoes.length > 0 ? (avaliacoes.reduce((s, a) => s + a.estrelas, 0) / avaliacoes.length).toFixed(1) : null;
  const todasFotos = produto ? [produto.imagem_url, ...(produto.fotos || [])].filter(Boolean) : [];

  if (!produto) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"linear-gradient(135deg,#0a0010 0%,#130020 50%,#0a0010 100%)"}}>
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen text-white" style={{fontFamily:`'${lojaFonte}',system-ui,sans-serif`,background:"linear-gradient(135deg,#0a0010 0%,#130020 50%,#0a0010 100%)"}}>
      <header className="sticky top-0 z-50" style={{background:"rgba(10,0,20,0.90)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(139,47,201,0.2)"}}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2">
            <img src={lojaLogo} alt="logo" style={{width:lojaTamanhoLogo+"px",height:lojaTamanhoLogo+"px"}} className="object-contain rounded-lg"/>
            <span className="font-black" style={{fontFamily:lojaFonte,fontSize:lojaTamanhoNome+"px"}}><span style={{color:lojaCorNome1}}>{lojaNome?.split(" ")[0]}</span><span style={{color:lojaCorNome2}}> {lojaNome?.split(" ").slice(1).join(" ")}</span></span>
          </a>
          <a href="/" className="ml-4 text-sm text-gray-400 hover:text-purple-400 transition-all">← Voltar</a>
          <div className="ml-auto">
            <button onClick={()=>setCarrinhoAberto(true)} className="relative flex items-center gap-2 bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-xl text-sm font-black transition-all">
              🛒 Carrinho
              {carrinho.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">
                  {carrinho.reduce((s,i)=>s+i.quantidade,0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div>
            <div className="relative rounded-2xl overflow-hidden mb-3" style={{background:"#ffffff",height:"400px"}}>
              <img src={todasFotos[fotoAtiva]||produto.imagem_url} alt={produto.nome} className="w-full h-full object-contain p-6"/>
            </div>
            {todasFotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {todasFotos.map((foto, i) => (
                  <button key={i} onClick={() => setFotoAtiva(i)} className={"flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all " + (fotoAtiva===i?"border-purple-500":"border-white/10")} style={{background:"#fff"}}>
                    <img src={foto} alt="" className="w-full h-full object-contain p-1"/>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-black text-white leading-tight">{produto.nome}</h1>
            {mediaEstrelas && (
              <div className="flex items-center gap-2">
                <div className="flex">{[1,2,3,4,5].map(s=><span key={s} className={s<=Math.round(parseFloat(mediaEstrelas))?"text-yellow-400":"text-gray-600"}>&#9733;</span>)}</div>
                <span className="text-sm text-gray-400">{mediaEstrelas} ({avaliacoes.length} avaliacoes)</span>
              </div>
            )}
            <div>
              <p className="text-xs text-purple-400/70 font-bold uppercase tracking-widest">PIX</p>
              <p className="text-4xl font-black text-green-400">R$ {produto.preco.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
              <p className="text-gray-500 text-sm">12x R$ {(produto.preco/12).toLocaleString("pt-BR",{maximumFractionDigits:2})}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-sm text-gray-300 leading-relaxed">{produto.descricao}</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              <p>Peso: {produto.peso_kg}kg</p>
              <p>Estoque: {produto.estoque} unidade{produto.estoque!==1?"s":""}</p>
            </div>
            <div className="space-y-2">
              {qtdCarrinho > 0 && (
                <div className="bg-purple-700/20 border border-purple-500/30 rounded-xl px-4 py-2 text-sm text-purple-300 text-center font-bold">
                  {qtdCarrinho}x no carrinho
                </div>
              )}
              {qtdCarrinho >= produto.estoque ? (
                <div className="w-full bg-white/5 border border-white/10 py-4 rounded-xl font-black text-center text-sm text-gray-500">
                  {produto.estoque === 0 ? "Esgotado" : "Limite atingido"}
                </div>
              ) : (
                <button onClick={adicionarAoCarrinho} className={"w-full py-4 rounded-xl font-black text-sm transition-all " + (adicionado?"bg-green-600 hover:bg-green-500":"bg-purple-700 hover:bg-purple-600")}>
                  {adicionado ? "✅ Adicionado!" : "+ Adicionar ao Carrinho"}
                </button>
              )}
            </div>
            <button onClick={()=>setCarrinhoAberto(true)} className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl font-black text-center text-xs text-gray-400 transition-all">
              🛒 Ver Carrinho {carrinho.length > 0 && "(" + carrinho.reduce((s,i)=>s+i.quantidade,0) + ")"}
            </button>
          </div>
        </div>
        <div className="max-w-2xl">
          <h2 className="text-xl font-black mb-6">Avaliacoes ({avaliacoes.length})</h2>
          {avaliacoes.length === 0 && <p className="text-gray-500 text-sm mb-6">Nenhuma avaliacao ainda. Seja o primeiro!</p>}
          <div className="space-y-3 mb-8">
            {avaliacoes.map(av => (
              <div key={av.id} className="bg-white/4 border border-white/8 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-black text-sm text-gray-200">{av.nome}</p>
                  <div className="flex">{[1,2,3,4,5].map(s=><span key={s} className={s<=av.estrelas?"text-yellow-400 text-sm":"text-gray-600 text-sm"}>&#9733;</span>)}</div>
                </div>
                <p className="text-sm text-gray-400">{av.comentario}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5 space-y-3">
            <h3 className="font-black text-sm text-gray-200">Deixe sua avaliacao</h3>
            <input placeholder="Seu nome" value={avForm.nome} onChange={e=>setAvForm({...avForm,nome:e.target.value})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none"/>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s=>(
                <button key={s} onClick={()=>setAvForm({...avForm,estrelas:s})} className={"text-2xl transition-all " + (s<=avForm.estrelas?"text-yellow-400":"text-gray-600 hover:text-yellow-300")}>&#9733;</button>
              ))}
            </div>
            <textarea placeholder="Seu comentario..." value={avForm.comentario} onChange={e=>setAvForm({...avForm,comentario:e.target.value})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none resize-none h-24"/>
            {avMsg && <p className="text-sm text-green-400">{avMsg}</p>}
            <button onClick={enviarAvaliacao} disabled={enviandoAv} className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-3 rounded-xl font-black text-sm transition-all">
              {enviandoAv?"Enviando...":"Enviar Avaliacao"}
            </button>
          </div>
        </div>
      </main>

      {/* Carrinho Sidebar */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={()=>setCarrinhoAberto(false)}/>
          <div className="w-full sm:w-96 h-full flex flex-col" style={{background:"rgba(10,0,20,0.97)",borderLeft:"1px solid rgba(139,47,201,0.2)"}}>
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/6">
              <h2 className="font-black text-lg">Carrinho</h2>
              <button onClick={()=>setCarrinhoAberto(false)} className="text-gray-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 transition-all">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-5xl mb-4">🛒</p>
                  <p className="text-gray-600 text-sm">Seu carrinho está vazio</p>
                </div>
              ) : carrinho.map((item: any) => (
                <div key={item.produto.id} className="bg-white/4 border border-white/8 rounded-2xl p-3 flex gap-3">
                  <img src={item.produto.imagem_url} alt={item.produto.nome} className="w-16 h-16 object-contain rounded-xl bg-white flex-shrink-0 p-1"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-200 line-clamp-2">{item.produto.nome}</p>
                    <p className="text-green-400 font-black text-sm mt-1">R$ {(item.produto.preco*item.quantidade).toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={()=>{
                        const tk=localStorage.getItem("token");
                        const novaQtd=item.quantidade-1;
                        if(novaQtd<=0){removerDoCarrinho(item.produto.id);return;}
                        const novo=carrinho.map((i:any)=>i.produto.id===item.produto.id?{...i,quantidade:novaQtd}:i);
                        setCarrinho(novo);setQtdCarrinho(novo.find((i:any)=>i.produto.id===produto?.id)?.quantidade||0);
                        localStorage.setItem("carrinho",JSON.stringify(novo));
                        if(tk){fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${tk}`}}).then(r=>r.ok?r.json():null).then(u=>{if(!u)return;fetch(`${API}/carrinho?session_id=user_${u.id}`,{headers:{Authorization:`Bearer ${tk}`}}).then(r=>r.ok?r.json():[]).then(itens=>{const ex=itens.find((i:any)=>i.product_id===item.produto.id);if(ex)fetch(`${API}/carrinho/${ex.id}`,{method:"PUT",headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json"},body:JSON.stringify({quantidade:novaQtd})});});});}
                      }} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black flex items-center justify-center">−</button>
                      <span className="text-xs font-black">{item.quantidade}</span>
                      <button onClick={()=>{
                        const tk=localStorage.getItem("token");
                        const novaQtd=item.quantidade+1;
                        if(novaQtd>item.produto.estoque)return;
                        const novo=carrinho.map((i:any)=>i.produto.id===item.produto.id?{...i,quantidade:novaQtd}:i);
                        setCarrinho(novo);setQtdCarrinho(novo.find((i:any)=>i.produto.id===produto?.id)?.quantidade||0);
                        localStorage.setItem("carrinho",JSON.stringify(novo));
                        if(tk){fetch(`${API}/auth/me`,{headers:{Authorization:`Bearer ${tk}`}}).then(r=>r.ok?r.json():null).then(u=>{if(!u)return;fetch(`${API}/carrinho?session_id=user_${u.id}`,{headers:{Authorization:`Bearer ${tk}`}}).then(r=>r.ok?r.json():[]).then(itens=>{const ex=itens.find((i:any)=>i.product_id===item.produto.id);if(ex)fetch(`${API}/carrinho/${ex.id}`,{method:"PUT",headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json"},body:JSON.stringify({quantidade:novaQtd})});});});}
                      }} disabled={item.quantidade>=item.produto.estoque} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-black flex items-center justify-center">+</button>
                    </div>
                  </div>
                  <button onClick={()=>removerDoCarrinho(item.produto.id)} className="text-gray-600 hover:text-red-400 transition-all self-start p-1">✕</button>
                </div>
              ))}
            </div>
            {carrinho.length > 0 && (
              <div className="p-4 border-t border-white/6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Total</span>
                  <span className="font-black text-green-400 text-lg">R$ {totalCarrinho.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                </div>
                <a href="/?checkout=1" className="block w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-xl font-black text-sm text-center transition-all">
                  Finalizar Compra →
                </a>
                <a href="/" className="block w-full bg-white/5 border border-white/10 hover:bg-white/10 py-2.5 rounded-xl font-black text-xs text-gray-400 text-center transition-all">
                  ← Ver todos os produtos
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
