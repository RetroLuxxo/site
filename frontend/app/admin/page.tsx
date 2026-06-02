"use client";
import React, { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? (window.location.port === "3000" ? window.location.protocol + "//" + window.location.hostname + ":8000" : window.location.protocol + "//" + window.location.host) : "http://localhost:8000");

type Pedido = { id: number; nome: string; email: string; telefone: string; status: string; total: number; frete_nome: string; cidade: string; estado: string; itens: any[]; codigo_rastreio?: string; };
type Produto = { id: number; nome: string; preco: number; estoque: number; imagem_url: string; descricao: string; ativo?: boolean; };
type Dashboard = { total_pedidos: number; pendentes: number; enviados: number; entregues: number; cancelados: number; total_faturado: number; total_usuarios: number; total_produtos: number; };
type UsuarioAdmin = { id: number; email: string; nome: string; is_admin: boolean; is_superadmin: boolean; };
type Cupom = { id: number; codigo: string; desconto_pct: number; desconto_fixo: number; limite_uso: number; usos: number; ativo: boolean; };

const FONTES = ["Orbitron","Rajdhani","Exo 2","Audiowide","Quantico","Righteous","Press Start 2P","Russo One","Aldrich","Oxanium","Chakra Petch","Share Tech Mono","VT323","Silkscreen"];

function FontePicker({valor, onChange}: {valor:string, onChange:(v:string)=>void}) {
  const [aberto, setAberto] = React.useState(false);
  return (
    <div className="space-y-2">
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${FONTES.map(f=>`family=${f.replace(/ /g,"+")}:wght@400;700`).join("&")}&display=swap`}/>
      <div className="relative">
        <button type="button" onClick={()=>setAberto(!aberto)} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white text-left flex justify-between items-center hover:border-purple-500/70 transition-all" style={{fontFamily:`'${valor}',sans-serif`}}>
          <span>{valor}</span>
          <span className="text-gray-400">{aberto?"▲":"▼"}</span>
        </button>
        {aberto && (
          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/12 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
            {FONTES.map(f=>(
              <button key={f} type="button" onClick={()=>{onChange(f);setAberto(false);}} className={"w-full px-4 py-3 text-left text-sm hover:bg-purple-700/40 transition-all "+(valor===f?"bg-purple-700/60 text-purple-300":"text-white")} style={{fontFamily:`'${f}',sans-serif`}}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-center py-3 rounded-xl bg-white/5 text-base font-bold" style={{fontFamily:`'${valor}',sans-serif`}}>
        Preview — {valor}
      </p>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState("");
  const [aba, setAba] = useState<"dashboard"|"pedidos"|"produtos"|"cupons"|"configuracoes">("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [novoPedido, setNovoPedido] = useState(false);
  const [totalPedidosAntes, setTotalPedidosAntes] = useState(0);
  const [configs, setConfigs] = useState<Record<string,{valor:string;descricao:string}>>({});
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [importando, setImportando] = useState(false);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [dadosUsuario, setDadosUsuario] = useState<UsuarioAdmin|null>(null);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [novoCupom, setNovoCupom] = useState({codigo:"",desconto_pct:0,desconto_fixo:0,limite_uso:100});
  const [lojaNome, setLojaNome] = useState("");
  const [lojaLogo, setLojaLogo] = useState("");
  const [lojaCorPrimaria, setLojaCorPrimaria] = useState("#8B2FC9");
  const [lojaFonte, setLojaFonte] = useState("Orbitron");
  const [lojaCorNome1, setLojaCorNome1] = useState("#8B2FC9");
  const [lojaCorNome2, setLojaCorNome2] = useState("#ffffff");
  const [lojaTamanhoNome, setLojaTamanhoNome] = useState(18);
  const [lojaTamanhoLogo, setLojaTamanhoLogo] = useState(32);
  const [bannerCarrossel, setBannerCarrossel] = useState(false);
  const [bannersConfig, setBannersConfig] = useState<{url:string,ativo:boolean}[]>(
    Array(5).fill(null).map(()=>({url:"",ativo:false}))
  );

  useEffect(() => {
    if(lojaFonte) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${lojaFonte.replace(/ /g,"+")}&display=swap`;
      document.head.appendChild(link);
    }
  }, [lojaFonte]);
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [enviandoStatus, setEnviandoStatus] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: "", descricao: "", preco: "", imagem_url: "", estoque: "", peso_kg: "0.5", comprimento_cm: "15", largura_cm: "15", altura_cm: "15" });
  const [uploadando, setUploadando] = useState(false);

  const uploadImagem = async (file: File, callback: (url: string) => void) => {
    setUploadando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "jcgames_upload");
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "drpfwdjfg";
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.secure_url) callback(d.secure_url);
      else showMsg("❌ Erro no upload");
    } catch { showMsg("❌ Erro no upload"); }
    finally { setUploadando(false); }
  };
  const [showNovoProduto, setShowNovoProduto] = useState(false);

  // Botão voltar fecha detalhes abertos em vez de sair
  useEffect(() => {
    const fechar = () => {
      if (pedidoAberto) setPedidoAberto(null);
      else if (produtoEditando) setProdutoEditando(null);
      else if (showNovoProduto) setShowNovoProduto(false);
    };
    const aberto = !!pedidoAberto || !!produtoEditando || showNovoProduto;
    if (aberto) {
      window.history.pushState({ panel: true }, '');
      window.addEventListener('popstate', fechar);
    }
    return () => window.removeEventListener('popstate', fechar);
  }, [pedidoAberto, produtoEditando, showNovoProduto]);

  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (!tk) { window.location.href = "/"; return; }
    setToken(tk);
    carregarDados(tk);
  }, []);

  useEffect(() => {
    if (!token) return;
    const verificarNovos = async () => {
      try {
        const r = await fetch(`${API}/admin/pedidos`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
        if (!r.ok) return;
        const p = await r.json();
        const total = p.filter((x: any) => x.status === "pendente").length;
        setTotalPedidosAntes(prev => {
          if (prev > 0 && total > prev) {
            setNovoPedido(true);
            try { new Audio("https://www.soundjay.com/buttons/sounds/button-09a.mp3").play(); } catch {}
            setTimeout(() => setNovoPedido(false), 5000);
          }
          return total;
        });
      } catch {}
    };
    verificarNovos();
    const interval = setInterval(verificarNovos, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const H = (tk: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${tk}` });

  const carregarDados = async (tk: string) => {
    setLoading(true);
    try {
      const pubCfg: any = await fetch(`${API}/configuracoes/loja`).then(r => r.ok ? r.json() : {});
      if(pubCfg.loja_nome) setLojaNome(pubCfg.loja_nome);
      if(pubCfg.loja_logo) setLojaLogo(pubCfg.loja_logo);
      if(pubCfg.loja_cor_primaria) setLojaCorPrimaria(pubCfg.loja_cor_primaria);
      if(pubCfg.loja_fonte) setLojaFonte(pubCfg.loja_fonte);
      if(pubCfg.loja_cor_nome_loja) setLojaCorNome1(pubCfg.loja_cor_nome_loja);
      if(pubCfg.loja_cor_nome_loja2) setLojaCorNome2(pubCfg.loja_cor_nome_loja2);
      if(pubCfg.loja_tamanho_nome_loja) setLojaTamanhoNome(Number(pubCfg.loja_tamanho_nome_loja));
      if(pubCfg.loja_tamanho_logo) setLojaTamanhoLogo(Number(pubCfg.loja_tamanho_logo));
      if(pubCfg.loja_banner_carrossel) setBannerCarrossel(pubCfg.loja_banner_carrossel==="true");
      setBannersConfig(Array(5).fill(null).map((_,i)=>({
        url: pubCfg[`loja_banner_${i+1}_url`]||"",
        ativo: pubCfg[`loja_banner_${i+1}_ativo`]==="true"
      })));

      const [dash, peds, prods, cfgs] = await Promise.all([
        fetch(`${API}/admin/dashboard`, { headers: H(tk) }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/admin/pedidos`, { headers: H(tk) }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/admin/produtos`, { headers: H(tk) }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/admin/configuracoes`, { headers: H(tk) }).then(r => r.ok ? r.json() : {}),
      ]);
      if (!dash) { window.location.href = "/"; return; }
      const me = await fetch(`${API}/auth/me`, { headers: H(tk) });
      if (me.ok) setDadosUsuario(await me.json());
      setDashboard(dash); setPedidos(peds); setProdutos(prods); setConfigs(cfgs);
      const cups = await fetch(`${API}/admin/cupons`, { headers: H(tk) }).then(r => r.ok ? r.json() : []);
      setCupons(cups);
    } finally { setLoading(false); }
  };

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const salvarConfigs = async () => {
    setSalvandoConfig(true);
    try {
      const payload: Record<string,string> = {};
      Object.entries(configs).forEach(([k,v]) => { payload[k] = v.valor; });
      payload["loja_banner_carrossel"] = bannerCarrossel ? "true" : "false";
      for(let i=0;i<5;i++){
        payload[`loja_banner_${i+1}_url`] = bannersConfig[i]?.url||"";
        payload[`loja_banner_${i+1}_ativo`] = bannersConfig[i]?.ativo?"true":"false";
      }
      const r = await fetch(`${API}/admin/configuracoes`, { method: "PUT", headers: H(token), body: JSON.stringify(payload) });
      if (r.ok) showMsg("✅ Configurações salvas!");
      else showMsg("❌ Erro ao salvar");
    } finally { setSalvandoConfig(false); }
  };

  const atualizarStatus = async (id: number, status: string, rastreio?: string) => {
    setEnviandoStatus(true);
    try {
      const body: any = { status };
      if (rastreio) body.codigo_rastreio = rastreio;
      const r = await fetch(`${API}/admin/pedidos/${id}/status`, { method: "PUT", headers: H(token), body: JSON.stringify(body) });
      if (r.ok) {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, status, codigo_rastreio: rastreio || p.codigo_rastreio } : p));
        if (pedidoAberto?.id === id) setPedidoAberto(prev => prev ? { ...prev, status, codigo_rastreio: rastreio || prev.codigo_rastreio } : null);
        setCodigoRastreio("");
        showMsg(`✅ Pedido #${id} → ${status}`);
        carregarDados(token);
      }
    } finally { setEnviandoStatus(false); }
  };

  const salvarProduto = async () => {
    if (!produtoEditando) return;
    const r = await fetch(`${API}/admin/produtos/${produtoEditando.id}`, {
      method: "PUT", headers: H(token),
      body: JSON.stringify({ nome: produtoEditando.nome, preco: produtoEditando.preco, estoque: produtoEditando.estoque, imagem_url: produtoEditando.imagem_url, descricao: produtoEditando.descricao }),
    });
    if (r.ok) { setProdutos(prev => prev.map(p => p.id === produtoEditando.id ? produtoEditando : p)); setProdutoEditando(null); showMsg("✅ Produto atualizado!"); }
  };

  const deletarProduto = async (id: number, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    try {
      const r = await fetch(`${API}/admin/produtos/${id}`, { method: "DELETE", headers: { ...H(token), "Accept": "application/json" } });
      if (r.ok) { setProdutos(prev => prev.filter(p => p.id !== id)); showMsg("✅ Produto removido!"); }
      else { const e = await r.json(); showMsg(`❌ ${e.detail}`); }
    } catch { showMsg("❌ Erro ao remover"); }
  };

  const criarProduto = async () => {
    const r = await fetch(`${API}/produtos`, {
      method: "POST", headers: H(token),
      body: JSON.stringify({ ...novoProduto, preco: parseFloat(novoProduto.preco), estoque: parseInt(novoProduto.estoque), peso_kg: parseFloat(novoProduto.peso_kg), comprimento_cm: parseInt(novoProduto.comprimento_cm), largura_cm: parseInt(novoProduto.largura_cm), altura_cm: parseInt(novoProduto.altura_cm) }),
    });
    if (r.ok) {
      const p = await r.json(); setProdutos(prev => [...prev, p]);
      setShowNovoProduto(false);
      setNovoProduto({ nome: "", descricao: "", preco: "", imagem_url: "", estoque: "", peso_kg: "0.5", comprimento_cm: "15", largura_cm: "15", altura_cm: "15" });
      showMsg("✅ Produto criado!");
    }
  };

  const pedidosFiltrados = filtroStatus ? pedidos.filter(p => p.status === filtroStatus) : pedidos;

  const sBadge = (s: string) => ({
    pendente: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    cancelado: "bg-red-500/20 text-red-300 border border-red-500/40",
    enviado: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    pago: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
    entregue: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
  }[s] || "bg-gray-500/20 text-gray-300 border border-gray-500/40");

  const sBtn = (s: string, atual: string) => `px-3 py-1.5 rounded-lg text-xs font-black transition-all btn-press ${atual === s ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`;

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:bg-white/8 outline-none transition-all";

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c1a] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-500 text-sm">Carregando painel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white" style={{fontFamily:`'${lojaFonte}',system-ui,sans-serif`,background:"#0a0c1a"}}>
      <style>{`
        .btn-press:active{transform:scale(0.97)}
        .glass{background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08)}
        .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.2s ease forwards}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {/* HEADER */}
      <nav className="glass border-b border-white/5 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 overflow-hidden" style={{background: lojaCorPrimaria}}>
              {lojaLogo ? <img src={lojaLogo} alt="logo" style={{width: lojaTamanhoLogo+"px", height: lojaTamanhoLogo+"px"}} className="object-contain p-0.5"/> : <span>{lojaNome ? lojaNome[0] : "A"}</span>}
            </div>
            <div className="min-w-0">
              <p className="font-black leading-tight" style={{fontFamily: lojaFonte, fontSize: lojaTamanhoNome+"px"}}><span style={{color: lojaCorNome1}}>{lojaNome?.split(" ")[0] || "Admin"}</span> <span style={{color: lojaCorNome2}}>{lojaNome?.split(" ").slice(1).join(" ") || "ADMIN"}</span></p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{background: lojaCorPrimaria + "80"}}>PAINEL</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/" className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-all btn-press">← Loja</a>
            {novoPedido && (
              <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-xl px-3 py-1.5 animate-pulse">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-green-400 text-xs font-black">🔔 Novo Pedido!</span>
              </div>
            )}
            <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/"; }} className="text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 px-3 py-2 rounded-xl transition-all btn-press">Sair</button>
          </div>
        </div>
      </nav>

      {/* Notificação */}
      {msg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass px-5 py-3 rounded-2xl text-sm font-medium shadow-xl fade-in whitespace-nowrap">
          {msg}
        </div>
      )}

      {/* ABAS */}
      <div className="glass border-b border-white/5">
        <div className="max-w-7xl mx-auto flex">
          {(["dashboard","pedidos","produtos","cupons",...(dadosUsuario?.is_superadmin ? ["configuracoes"] : [])] as const).map((a: any) => (
            <button key={a} onClick={() => setAba(a)}
              className={`flex-1 py-4 text-sm font-black uppercase tracking-wider transition-all text-center ${aba===a?"text-blue-400 border-b-2 border-blue-400":"text-gray-500 hover:text-gray-300"}`}>
              {a==="dashboard"?"📊 Dashboard":a==="produtos"?"🛍️ Produtos":a==="configuracoes"?"⚙️ Config":a==="cupons"?"🎫 Cupons":
                <span className="flex items-center gap-1">📦 Pedidos{totalPedidosAntes>0&&<span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-black">{totalPedidosAntes}</span>}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">

        {/* DASHBOARD */}
        {aba==="dashboard" && dashboard && (
          <div className="space-y-4 fade-in">
            <h2 className="text-xl font-black">Visão Geral</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:"Total Faturado", value:`R$ ${dashboard.total_faturado.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, color:"text-emerald-400", icon:"💰", big:true },
                { label:"Pedidos", value:dashboard.total_pedidos, color:"text-blue-400", icon:"📦", big:false },
                { label:"Usuários", value:dashboard.total_usuarios, color:"text-purple-400", icon:"👤", big:false },
                { label:"Produtos", value:dashboard.total_produtos, color:"text-amber-400", icon:"🛍️", big:false },
              ].map(c => (
                <div key={c.label} className="card rounded-2xl p-4">
                  <p className="text-xl mb-2">{c.icon}</p>
                  <p className={`font-black ${c.big?"text-2xl":"text-3xl"} ${c.color} leading-tight`}>{c.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:"Pendentes", value:dashboard.pendentes, color:"text-amber-400", filter:"pendente" },
                { label:"Enviados", value:dashboard.enviados, color:"text-blue-400", filter:"enviado" },
                { label:"Entregues", value:dashboard.entregues, color:"text-emerald-400", filter:"entregue" },
                { label:"Cancelados", value:dashboard.cancelados, color:"text-red-400", filter:"cancelado" },
              ].map(c => (
                <div key={c.label} className="card rounded-2xl p-4 cursor-pointer hover:bg-white/5 transition-all btn-press"
                  onClick={() => { setFiltroStatus(c.filter); setAba("pedidos"); }}>
                  <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PEDIDOS */}
        {aba==="pedidos" && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-black">Pedidos ({pedidosFiltrados.length})</h2>
            </div>
            {/* Filtros em scroll horizontal */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{scrollbarWidth:"none"}}>
              {["","pendente","pago","enviado","entregue","cancelado"].map(s => (
                <button key={s} onClick={() => setFiltroStatus(s)} className={`${sBtn(s,filtroStatus)} whitespace-nowrap flex-shrink-0`}>
                  {s===""?"Todos":s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {pedidosFiltrados.map(p => (
                <div key={p.id} className="card rounded-2xl overflow-hidden">
                  <div className="p-4 cursor-pointer hover:bg-white/3 transition-all"
                    onClick={() => { setPedidoAberto(pedidoAberto?.id===p.id?null:p); setCodigoRastreio(p.codigo_rastreio||""); }}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-black text-gray-600 flex-shrink-0 mt-0.5">#{p.id}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-200 truncate">{p.nome}</p>
                        <p className="text-gray-500 text-xs truncate">{p.email}</p>
                        <p className="text-gray-600 text-xs">{p.cidade}/{p.estado}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${sBadge(p.status)}`}>
                            {p.status.toUpperCase()}
                          </span>
                          <button onClick={(e)=>{
                            e.stopPropagation();
                            const it=Array.isArray(p.itens)?p.itens:(typeof p.itens==="string"?JSON.parse(p.itens):[]);
                            const linhas = [
                              "================================",
                              "PEDIDO #"+p.id+" — "+p.status.toUpperCase(),
                              "================================",
                              "",
                              "CLIENTE",
                              "Nome: "+p.nome,
                              "Email: "+p.email,
                              "Tel: "+p.telefone,
                              "",
                              "ENDEREÇO DE ENTREGA",
                              (p as any).endereco+", "+(p as any).numero+" "+((p as any).complemento||""),
                              (p as any).bairro+" — "+p.cidade+"/"+p.estado,
                              "CEP: "+(p as any).cep,
                              "",
                              "ITENS PARA SEPARAÇÃO",
                              "--------------------------------",
                              ...it.map((i:any)=>{
                                const prod = produtos.find((pr:Produto)=>pr.id===i.product_id);
                                return "• "+i.quantidade+"x "+(prod?prod.nome:"Produto #"+i.product_id)+" — R$ "+Number(i.preco_unitario).toFixed(2);
                              }),
                              "--------------------------------",
                              "",
                              "Frete: "+p.frete_nome+" — R$ "+Number((p as any).frete_preco||0).toFixed(2),
                              p.codigo_rastreio?"Rastreio: "+p.codigo_rastreio:"",
                              "",
                              "TOTAL: R$ "+Number(p.total).toLocaleString("pt-BR",{minimumFractionDigits:2}),
                              "================================",
                            ].filter(l=>l!==undefined);
                            const blob = new Blob([linhas.join("\n")], {type:"text/plain;charset=utf-8"});
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "pedido_"+p.id+".txt";
                            a.click();
                            URL.revokeObjectURL(url);
                          }} className="px-2 py-1 rounded-lg text-[10px] font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all">📄</button>
                        </div>
                        <p className="text-emerald-400 font-black text-sm">R$ {p.total.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                      </div>
                    </div>
                  </div>

                  {pedidoAberto?.id===p.id && (
                    <div className="border-t border-white/5 p-4 space-y-4 bg-white/2 fade-in">
                      {/* Itens */}
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-black mb-2">Itens</p>
                        {p.itens?.map((it:any,i:number) => (
                          <p key={i} className="text-sm text-gray-400">• Produto #{it.product_id} — {it.quantidade}x — R$ {it.preco_unitario.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                        ))}
                      </div>

                      {p.codigo_rastreio && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                          <p className="text-xs text-blue-400 font-black mb-1">🚚 Rastreio</p>
                          <p className="font-black text-white">{p.codigo_rastreio}</p>
                        </div>
                      )}

                      {/* Botões de status */}
                      <div>
                        <p className="text-gray-500 text-xs uppercase font-black mb-2">Atualizar Status</p>
                        <div className="flex flex-wrap gap-2">
                          {["pendente","pago","entregue","cancelado"].map(s => (
                            <button key={s} onClick={() => atualizarStatus(p.id, s)}
                              className={`${sBtn(s, p.status)} btn-press`}>
                              {s.charAt(0).toUpperCase()+s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Envio com rastreio */}
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-3">
                        <p className="text-blue-400 font-black text-xs uppercase">🚚 Marcar como Enviado</p>
                        <input
                          placeholder="Código de rastreio (ex: BR123456789BR)"
                          value={codigoRastreio}
                          onChange={(e) => setCodigoRastreio(e.target.value)}
                          className={inp}
                        />
                        <button
                          onClick={() => atualizarStatus(p.id, "enviado", codigoRastreio)}
                          disabled={!codigoRastreio || enviandoStatus}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl font-black text-sm transition-all btn-press flex items-center justify-center gap-2">
                          {enviandoStatus ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Enviando...</span></>
                          ) : "Confirmar Envio"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUTOS */}
        {aba==="cupons" && (
          <div className="space-y-4 max-w-2xl">
            {msg&&<div className="bg-white/5 border border-white/8 rounded-xl p-3 text-sm">{msg}</div>}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
              <p className="font-black text-sm text-purple-400">🎫 Novo Cupom</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Código</p>
                  <input value={novoCupom.codigo} onChange={e=>setNovoCupom({...novoCupom,codigo:e.target.value.toUpperCase()})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white outline-none" placeholder="EX: DESCONTO10"/>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Limite de Uso</p>
                  <input type="number" value={novoCupom.limite_uso} onChange={e=>setNovoCupom({...novoCupom,limite_uso:parseInt(e.target.value)})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white outline-none"/>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Desconto % (ex: 10 = 10%)</p>
                  <input type="number" value={novoCupom.desconto_pct} onChange={e=>setNovoCupom({...novoCupom,desconto_pct:parseFloat(e.target.value)})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white outline-none"/>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Desconto Fixo R$</p>
                  <input type="number" value={novoCupom.desconto_fixo} onChange={e=>setNovoCupom({...novoCupom,desconto_fixo:parseFloat(e.target.value)})} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white outline-none"/>
                </div>
              </div>
              <button onClick={async()=>{
                if(!novoCupom.codigo){showMsg("❌ Digite um código!");return;}
                const r=await fetch(`${API}/admin/cupons`,{method:"POST",headers:H(token),body:JSON.stringify(novoCupom)});
                if(r.ok){const d=await r.json();setCupons(prev=>[...prev,d]);setNovoCupom({codigo:"",desconto_pct:0,desconto_fixo:0,limite_uso:100});showMsg("✅ Cupom criado!");}
                else showMsg("❌ Erro ao criar cupom");
              }} className="w-full bg-purple-700 hover:bg-purple-600 py-3 rounded-xl font-black text-sm transition-all">
                + Criar Cupom
              </button>
            </div>
            <div className="space-y-2">
              {cupons.length===0&&<p className="text-gray-500 text-sm text-center py-4">Nenhum cupom cadastrado</p>}
              {cupons.map(c=>(
                <div key={c.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-purple-400 font-mono">{c.codigo}</span>
                      {!c.ativo&&<span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inativo</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.desconto_pct>0?`${c.desconto_pct}% de desconto`:``}
                      {c.desconto_fixo>0?` R$ ${c.desconto_fixo.toFixed(2)} de desconto`:``}
                      {" · "}{c.usos}/{c.limite_uso} usos
                    </p>
                  </div>
                  <button onClick={async()=>{
                    const r=await fetch(`${API}/admin/cupons/${c.id}`,{method:"PUT",headers:H(token),body:JSON.stringify({ativo:!c.ativo})});
                    if(r.ok) setCupons(prev=>prev.map(x=>x.id===c.id?{...x,ativo:!c.ativo}:x));
                  }} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${c.ativo?"bg-yellow-600 hover:bg-yellow-500":"bg-green-600 hover:bg-green-500"} text-white`}>
                    {c.ativo?"Desativar":"Ativar"}
                  </button>
                  <button onClick={async()=>{
                    if(!confirm("Remover cupom?"))return;
                    const r=await fetch(`${API}/admin/cupons/${c.id}`,{method:"DELETE",headers:H(token)});
                    if(r.ok) setCupons(prev=>prev.filter(x=>x.id!==c.id));
                  }} className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs font-black text-white transition-all">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba==="configuracoes" && (
        <div className="space-y-6 max-w-2xl">
          {msg&&<div className="bg-white/5 border border-white/8 rounded-xl p-3 text-sm">{msg}</div>}
          {[
            {titulo:"🏦 PagBank", chaves:[
              {k:"pagbank_token",label:"Token",tipo:"password"},
              {k:"pagbank_env",label:"Ambiente (sandbox / production)",tipo:"text"},
            ]},
            {titulo:"📧 Email", chaves:[
              {k:"email_user",label:"Gmail",tipo:"text"},
              {k:"email_pass",label:"Senha de App",tipo:"password"},
              {k:"email_admin",label:"Email Admin",tipo:"text"},
            ]},
            {titulo:"🖼️ Cloudinary", chaves:[
              {k:"cloudinary_cloud_name",label:"Cloud Name",tipo:"text"},
              {k:"cloudinary_preset",label:"Upload Preset",tipo:"text"},
            ]},
            {titulo:"🏪 Loja", chaves:[
              {k:"loja_logo",label:"Logo da Loja",tipo:"logo"},
              {k:"loja_tamanho_logo",label:"Tamanho da Logo (px)",tipo:"text"},
              {k:"loja_tamanho_nome_loja",label:"Tamanho do Nome da Loja (px)",tipo:"text"},
              {k:"loja_cor_nome_loja",label:"Cor Parte 1 do Nome",tipo:"color"},
              {k:"loja_cor_nome_loja2",label:"Cor Parte 2 do Nome",tipo:"color"},
              {k:"loja_fonte",label:"Fonte Google Fonts",tipo:"fonte"},
              {k:"loja_nome",label:"Nome da Loja",tipo:"text"},
              {k:"loja_descricao",label:"Descrição",tipo:"text"},
              {k:"loja_layout",label:"Layout",tipo:"layout"},
              {k:"loja_banner_url",label:"Imagem do Banner",tipo:"logo"},
              {k:"loja_banner_carrossel",label:"Carrossel de Banners",tipo:"carrossel"},

            ]},
            {titulo:"🎨 Visual", chaves:[
              {k:"loja_cor_primaria",label:"Cor Primária",tipo:"color"},
              {k:"loja_cor_fundo",label:"Cor de Fundo",tipo:"color"},
              {k:"loja_cor_botao",label:"Cor dos Botões",tipo:"color"},
              {k:"loja_cor_texto_botao",label:"Cor do Texto dos Botões",tipo:"color"},
              {k:"loja_cor_texto",label:"Cor do Texto",tipo:"color"},
              {k:"loja_transparencia_cards",label:"Transparência dos Cards (0.0 a 1.0)",tipo:"text"},
              {k:"loja_tamanho_fonte",label:"Tamanho da Fonte (px)",tipo:"text"},
              {k:"loja_tamanho_fonte_botao",label:"Tamanho Fonte Botões (px)",tipo:"text"},
            ]},
          ].map(secao=>(
            <div key={secao.titulo} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
              <p className="font-black text-sm text-purple-400 mb-2">{secao.titulo}</p>
              {secao.chaves.map(({k,label,tipo})=>(
                <div key={k}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  {tipo==="logo" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" value={configs[k]?.valor||""} onChange={e=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:e.target.value}}))} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all" placeholder="URL da imagem"/>
                        <label className="cursor-pointer bg-purple-700 hover:bg-purple-600 px-3 py-3 rounded-xl text-xs font-black whitespace-nowrap flex-shrink-0">
                          {uploadando?"⏳":"📤"}
                          <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files)uploadImagem(e.target.files[0],url=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:url}})));}}/>
                        </label>
                      </div>
                      {configs[k]?.valor&&<img src={configs[k].valor} alt={label} className="h-16 object-contain rounded-lg bg-black/40 p-1"/>}
                    </div>
                  ) : tipo==="color" ? (
                    <div className="flex gap-3 items-center">
                      <input type="color" value={configs[k]?.valor||"#8B2FC9"} onChange={e=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:e.target.value}}))} className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"/>
                      <input type="text" value={configs[k]?.valor||""} onChange={e=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:e.target.value}}))} className="flex-1 bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all" placeholder="#8B2FC9"/>
                    </div>
                  ) : tipo==="layout" ? (
                    <div className="flex gap-3">
                      {["default","banner"].map(l=>(
                        <button key={l} type="button" onClick={()=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:l}}))}
                          className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${configs[k]?.valor===l?"bg-purple-700 border-purple-500 text-white":"bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>
                          {l==="default"?"📦 Default":"🖼️ Banner"}
                        </button>
                      ))}
                    </div>
                  ) : tipo==="carrossel" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Auto-play (carrossel)</span>
                        <div onClick={()=>setBannerCarrossel(p=>!p)} className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${bannerCarrossel?"bg-purple-600":"bg-white/20"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${bannerCarrossel?"translate-x-5":"translate-x-1"}`}/>
                        </div>
                      </div>
                      {[0,1,2,3,4].map(i=>(
                        <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-300">Banner {i+1}</span>
                            <button type="button" onClick={()=>{const idx=i;setBannersConfig(prev=>{const next=[...prev];next[idx]={...next[idx],ativo:!next[idx].ativo};return next;});}} className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${bannersConfig[i]?.ativo?"bg-purple-600":"bg-white/20"}`}>
                              <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${bannersConfig[i]?.ativo?"translate-x-4":"translate-x-0.5"}`}/>
                            </button>
                          </div>
                          {bannersConfig[i]?.url&&<img src={bannersConfig[i].url} className="w-full h-16 object-cover rounded"/>}
                          <div className="flex gap-2">
                            <input value={bannersConfig[i]?.url||""} onChange={e=>setBannersConfig(p=>p.map((b,j)=>j===i?{...b,url:e.target.value}:b))} placeholder="URL do banner" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"/>
                            <label className="cursor-pointer bg-purple-700 hover:bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                              {uploadando?"⏳":"📤"}
                              <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files)uploadImagem(e.target.files[0],url=>setBannersConfig(p=>p.map((b,j)=>j===i?{...b,url}:b)));}}/>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : tipo==="fonte" ? (
                    <FontePicker valor={configs[k]?.valor||"Orbitron"} onChange={v=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:v}}))}/>
                  ) : (
                    <input type={tipo} value={configs[k]?.valor||""} onChange={e=>setConfigs(prev=>({...prev,[k]:{...prev[k],valor:e.target.value}}))} className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all" placeholder={configs[k]?.descricao||label}/>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="font-black text-sm text-purple-400 mb-2">👑 Gerenciar Admins</p>
            <p className="text-xs text-gray-500">Digite o email de um usuário cadastrado para torná-lo admin</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@exemplo.com"
                id="emailAdmin"
                className="flex-1 bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/70 outline-none transition-all"
              />
              <button
                onClick={async()=>{
                  const email=(document.getElementById("emailAdmin") as HTMLInputElement).value;
                  if(!email){showMsg("❌ Digite um email!");return;}
                  const r=await fetch(`${API}/admin/tornar-admin`,{method:"POST",headers:H(token),body:JSON.stringify({email,nivel:"admin"})});
                  if(r.ok){showMsg(`✅ ${email} agora é Admin!`);}
                  else{const d=await r.json();showMsg(`❌ ${d.detail}`);}
                }}
                className="bg-purple-700 hover:bg-purple-600 px-4 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap"
              >
                👑 Admin
              </button>
              {dadosUsuario?.is_superadmin && (
              <button
                onClick={async()=>{
                  const email=(document.getElementById("emailAdmin") as HTMLInputElement).value;
                  if(!email){showMsg("❌ Digite um email!");return;}
                  const r=await fetch(`${API}/admin/tornar-admin`,{method:"POST",headers:H(token),body:JSON.stringify({email,nivel:"superadmin"})});
                  if(r.ok){showMsg(`✅ ${email} agora é Super Admin!`);}
                  else{const d=await r.json();showMsg(`❌ ${d.detail}`);}
                }}
                className="bg-yellow-600 hover:bg-yellow-500 px-4 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap"
              >
                ⭐ Super Admin
              </button>
              )}
            </div>
          </div>

          <button onClick={salvarConfigs} disabled={salvandoConfig} className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-4 rounded-xl font-black text-sm transition-all">
            {salvandoConfig?"Salvando...":"💾 Salvar Configurações"}
          </button>
        </div>
        )}

        {aba==="produtos" && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-black">Produtos ({produtos.length})</h2>
              <div className="flex gap-2">
                <button onClick={()=>setSelecionados(selecionados.length===produtos.length?[]:produtos.map(p=>p.id))} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-black text-xs transition-all btn-press">
                  {selecionados.length===produtos.length?"☑️ Desmarcar":"☐ Todos"}
                </button>
                <label className="cursor-pointer bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl font-black text-sm transition-all btn-press flex items-center gap-2">
                  {importando ? "⏳ Importando..." : "📥 CSV"}
                  <input type="file" accept=".csv" className="hidden" onChange={async e => {
                    if(!e.target.files?.length) return;
                    setImportando(true);
                    const file = e.target.files[0];
                    const text = await file.text();
                    const lines = text.split("\n").filter(l => l.trim());
                    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g,""));
                    let ok = 0, erro = 0;
                    for(let i=1;i<lines.length;i++){
                      const vals = lines[i].split(",").map(v => v.trim().replace(/"/g,""));
                      const row: any = {};
                      headers.forEach((h,j) => row[h] = vals[j]||"");
                      const nome = row["Título"] || row["titulo"] || row["nome"] || row["Nome"] || "";
                      const preco = parseFloat((row["Preço"] || row["preco"] || row["Preço (R$)"] || "0").replace(".","").replace(",","."));
                      const imagem = row["Imagem"] || row["imagem"] || row["imagem_url"] || "";
                      if(!nome || !preco) continue;
                      const r = await fetch(`${API}/produtos`, {method:"POST", headers:H(token), body:JSON.stringify({nome,descricao:nome,preco,imagem_url:imagem||"",estoque:10,peso_kg:0.5,comprimento_cm:15,largura_cm:15,altura_cm:15})});
                      if(r.ok) ok++; else erro++;
                    }
                    setImportando(false);
                    showMsg(`✅ ${ok} importados${erro>0?`, ❌ ${erro} erros`:""}`);
                    carregarDados(token);
                    e.target.value = "";
                  }}/>
                </label>
                {selecionados.length > 0 && (
                  <button onClick={async () => {
                    if(!confirm(`Remover ${selecionados.length} produtos?`)) return;
                    const r = await fetch(`${API}/admin/produtos`, {method:"DELETE", headers:H(token), body:JSON.stringify({ids:selecionados})});
                    if(r.ok){setProdutos(prev=>prev.filter(p=>!selecionados.includes(p.id)));setSelecionados([]);showMsg(`✅ ${selecionados.length} removidos!`);}
                    else showMsg("❌ Erro ao remover");
                  }} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl font-black text-sm transition-all btn-press">
                    🗑️ Remover ({selecionados.length})
                  </button>
                )}
                <button onClick={() => setShowNovoProduto(!showNovoProduto)}
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-black text-sm transition-all btn-press">
                  + Novo
                </button>
              </div>
            </div>

            {showNovoProduto && (
              <div className="card rounded-2xl p-4 space-y-3 fade-in">
                <p className="font-black text-blue-400 text-sm">Novo Produto</p>
                <input placeholder="Nome *" value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto,nome:e.target.value})} className={inp}/>
                <input placeholder="Descrição *" value={novoProduto.descricao} onChange={(e) => setNovoProduto({...novoProduto,descricao:e.target.value})} className={inp}/>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Preço *" type="number" value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto,preco:e.target.value})} className={inp}/>
                  <input placeholder="Estoque *" type="number" value={novoProduto.estoque} onChange={(e) => setNovoProduto({...novoProduto,estoque:e.target.value})} className={inp}/>
                </div>
                <div className="flex gap-2 items-center">
                  <input placeholder="URL da Imagem *" value={novoProduto.imagem_url} onChange={(e) => setNovoProduto({...novoProduto,imagem_url:e.target.value})} className={inp}/>
                  <label className="cursor-pointer bg-purple-700 hover:bg-purple-600 px-3 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0">
                    {uploadando?"⏳":"📤 Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files&&uploadImagem(e.target.files[0],url=>setNovoProduto({...novoProduto,imagem_url:url}))}/>
                  </label>
                </div>
                {novoProduto.imagem_url&&<img src={novoProduto.imagem_url} alt="preview" className="w-24 h-24 object-contain rounded-xl bg-black/40 p-1"/>}
                <div className="flex gap-3">
                  <button onClick={criarProduto} className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl font-black text-sm transition-all btn-press">Criar</button>
                  <button onClick={() => setShowNovoProduto(false)} className="bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl font-black text-sm transition-all btn-press">Cancelar</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {produtos.map(p => (
                <div key={p.id} className="card rounded-2xl overflow-hidden">
                  {produtoEditando?.id===p.id ? (
                    <div className="p-4 space-y-3">
                      <p className="font-black text-blue-400 text-xs">Editando #{p.id}</p>
                      <input value={produtoEditando.nome} onChange={(e) => setProdutoEditando({...produtoEditando,nome:e.target.value})} className={inp} placeholder="Nome"/>
                      <input value={produtoEditando.descricao} onChange={(e) => setProdutoEditando({...produtoEditando,descricao:e.target.value})} className={inp} placeholder="Descrição"/>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={produtoEditando.preco} onChange={(e) => setProdutoEditando({...produtoEditando,preco:parseFloat(e.target.value)})} className={inp} placeholder="Preço"/>
                        <input type="number" value={produtoEditando.estoque} onChange={(e) => setProdutoEditando({...produtoEditando,estoque:parseInt(e.target.value)})} className={inp} placeholder="Estoque"/>
                      </div>
                      <div className="flex gap-2 items-center">
                      <input value={produtoEditando.imagem_url} onChange={(e) => setProdutoEditando({...produtoEditando,imagem_url:e.target.value})} className={inp} placeholder="URL Imagem"/>
                      <label className="cursor-pointer bg-purple-700 hover:bg-purple-600 px-3 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0">
                        {uploadando?"⏳":"📤 Upload"}
                        <input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files&&uploadImagem(e.target.files[0],url=>setProdutoEditando({...produtoEditando,imagem_url:url}))}/>
                      </label>
                    </div>
                    {produtoEditando.imagem_url&&<img src={produtoEditando.imagem_url} alt="preview" className="w-24 h-24 object-contain rounded-xl bg-black/40 p-1"/>}
                      <div className="flex gap-2">
                        <button onClick={salvarProduto} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl font-black text-xs btn-press">Salvar</button>
                        <button onClick={() => setProdutoEditando(null)} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl font-black text-xs btn-press">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 p-3 items-center">
                      <input type="checkbox" checked={selecionados.includes(p.id)} onChange={e=>setSelecionados(prev=>e.target.checked?[...prev,p.id]:prev.filter(i=>i!==p.id))} className="w-4 h-4 accent-purple-500 flex-shrink-0"/>
                      <img src={p.imagem_url} alt={p.nome} className="w-16 h-16 object-contain rounded-xl bg-black/40 flex-shrink-0 p-1"/>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-200 line-clamp-2 leading-tight">{p.nome} {p.ativo===false&&<span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-black">⏸️</span>}</p>
                        <p className="text-emerald-400 font-black text-sm">R$ {p.preco.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                        <p className={`text-xs font-bold ${p.estoque>0?"text-blue-400":"text-red-400"}`}>Estoque: {p.estoque} un.</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => setProdutoEditando(p)} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-black btn-press">Editar</button>
                        <button onClick={async()=>{
                          const r=await fetch(`${API}/admin/produtos/${p.id}/pausar`,{method:"PUT",headers:H(token)});
                          if(r.ok){const d=await r.json();setProdutos(prev=>prev.map(x=>x.id===p.id?{...x,ativo:d.ativo}:x));showMsg(d.ativo?"✅ Produto ativado!":"⏸️ Produto pausado!");}
                        }} className={`px-3 py-1.5 rounded-lg text-xs font-black btn-press transition-all ${p.ativo!==false?"bg-yellow-600 hover:bg-yellow-500 text-white":"bg-green-600 hover:bg-green-500 text-white"}`}>
                          {p.ativo!==false?"⏸️ Pausar":"▶️ Ativar"}
                        </button>
                        <button onClick={() => deletarProduto(p.id, p.nome)} className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs font-black btn-press text-white">Remover</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
