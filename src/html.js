// Gera o index.html do painel: menu lateral de bairros por região + grade 3x2 paginada.
// Os dados vão embutidos como JSON; "últimas 24h" é calculado no navegador a partir do horário atual.
const { TEMAS } = require('./temas');
const REGIOES = require('./regioes');
const { decodificar: dec } = require('./entidades');
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'sem data';
// rótulos de região que a coleta pode atribuir como "bairro"
const ROTULOS = { 'Norte da Ilha': 'Norte', 'Sul da Ilha': 'Sul', 'Leste da Ilha': 'Leste', 'Continente': 'Continente', 'Centro da Ilha': 'Centro' };

exports.gerarHtml = ({ novidades, noticias, relatorio, geradoEm, total }) => {
  const ns = noticias.map((n) => ({
    titulo: dec(n.titulo), fonte: dec(n.fonte), data: n.data || null, entrou_em: n.entrou_em || null,
    link: n.link_original || n.link, gn: n.link_original && n.link !== n.link_original ? n.link : null,
    bairros: n.bairros || [], temas: n.temas || [], ano: n.ano_do_ato || null,
    lide: dec(n.lide || n.resumo) || (n.sem_ementa ? 'Ato da Câmara sem ementa disponível publicamente (site exige verificação).' : ''),
    sem: !n.lide && !n.resumo && !!n.sem_ementa, nova: !!n.nova,
  })).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const contTema = {}; for (const n of ns) for (const t of n.temas) contTema[t] = (contTema[t] || 0) + 1;
  const temas = TEMAS.filter((t) => contTema[t]).sort((a, b) => contTema[b] - contTema[a]);
  const dados = JSON.stringify({ gerado: geradoEm.toISOString(), regioes: REGIOES, rotulos: ROTULOS, temas, rotTema: { 'Controle Externo (TCE/MPSC/Justiça)': 'Controle Externo' }, noticias: ns }).replace(/</g, '\\u003c');
  const nv = novidades || { novas: [] };
  const fontes = relatorio.map((r) => `<li class="${h(r.status)}">${r.status === 'ok' ? '<i>●</i> ' : '○ '}${h(r.fonte.replace(/ \(via Google News\)$/, ''))}${r.status === 'ok' ? '' : ' (falhou nesta coleta)'}</li>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><script defer src="https://cloud.umami.is/script.js" data-website-id="4c4d7199-0432-4d6c-9c9a-b8be9afdc974" data-domains="painel-floripa.com.br"></script><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notícias políticas de Florianópolis por bairro</title>
<style>
:root{--Centro:#2563eb;--Norte:#0f766e;--Sul:#b45309;--Leste:#7c3aed;--Continente:#db2777;--Cidade:#334155;--marinho:#0f2a4a}
*{box-sizing:border-box}html{scroll-padding-top:72px}:focus-visible{outline:3px solid #2563eb;outline-offset:2px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.legenda{margin:0 4px 8px;padding:0 10px;font-size:12px;color:#64748b}.limpar{font:inherit;font-size:13px;margin-left:10px;padding:3px 10px;border-radius:8px;border:1px solid #d6dbe3;background:#fff;color:#475569;cursor:pointer;vertical-align:middle}#titulo{outline-offset:4px}.vazio button{font:inherit;font-size:14px;margin:12px 6px 0;padding:8px 14px;border-radius:10px;border:1px solid #d6dbe3;background:#fff;cursor:pointer}.chip .n{opacity:.75;margin-left:4px}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f3f5f8;color:#1e293b}
aside{position:sticky;top:64px;height:calc(100vh - 64px);flex:0 0 260px;width:260px;background:#fff;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;z-index:10}
.busca{padding:16px 14px 10px}.busca input{width:100%;padding:9px 12px;border:1px solid #d6dbe3;border-radius:10px;font:inherit;font-size:14px;background:#f8fafc}
.lista{flex:1;overflow:auto;padding:0 8px 8px;font-size:14px}
.item{font:inherit;color:inherit;background:none;border:0;margin:0;width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;cursor:pointer}
.item:hover{background:#f1f5f9}.item.ativo{background:#e8eefc;font-weight:600}
.item .c{font-size:12px;min-width:22px;text-align:center;border-radius:10px;padding:1px 6px;color:#fff}
.item.zero{color:#64748b}.item .c.c0{background:#e5e7eb!important;color:#475569}
.cidade{margin:2px 0 6px;font-weight:600}.item.reg{font-style:italic}
details{margin-top:4px}summary{list-style:none;cursor:pointer;padding:7px 10px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
summary::-webkit-details-marker{display:none}summary{min-height:36px;border-radius:8px}summary:hover{background:#f1f5f9}summary::before{content:"▸";color:#64748b;font-size:17px;line-height:1;width:22px;height:22px;display:inline-grid;place-items:center;margin-left:-4px;transition:.15s}details[open] summary::before{transform:rotate(90deg)}
summary i{width:9px;height:9px;border-radius:50%}summary span{margin-left:auto;color:#64748b;font-weight:500}
details .item{padding-left:26px}
.temas{border-top:1px solid #eef0f3;padding:10px 12px 14px}.temas h4{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.chips{max-height:120px;overflow:auto;display:flex;flex-wrap:wrap;gap:5px}.chip{font:inherit;font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid #d6dbe3;background:#fff;cursor:pointer;color:#475569}.chip{white-space:nowrap}.chip.on{background:#1e293b;color:#fff;border-color:#1e293b}.chip[aria-disabled=true]{background:#f8fafc;border-color:#e5e7eb;border-style:dashed;color:#64748b;cursor:default}
main{flex:1;min-width:0;padding:28px 36px;min-height:calc(100vh - 64px);display:flex;flex-direction:column}

.topo{position:sticky;top:0;z-index:20;height:64px;background:var(--marinho);color:#fff;display:flex;align-items:center;gap:14px;padding:0 24px;overflow:hidden}
.topo svg.ponte{position:absolute;right:300px;bottom:0;height:60px;width:420px;opacity:.16;pointer-events:none}
.marca{flex:1;display:flex;align-items:center;gap:12px;min-width:0;position:relative}.marca b{display:block;font-size:17px;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.marca small{display:block;font-size:12px;color:#a9bdd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.selo-ilha{flex:0 0 34px;height:34px;border-radius:9px;background:#f5b841;color:var(--marinho);display:grid;place-items:center;font-weight:800;font-size:15px}
.marca>div{min-width:0}.cu{display:none}
.status{margin-left:auto;text-align:right;font-size:12px;color:#cfdbea;line-height:1.4;position:relative;white-space:nowrap}.status strong{color:#fff;font-size:13px}
.corpo{display:flex;align-items:flex-start}
.painel-cab{margin-bottom:20px}.pag #voltar{margin-right:12px}.cel-status{display:none;font-size:13px;color:#64748b;margin-top:4px}h1{margin:0;font-size:26px}
.rodape{background:var(--marinho);color:#cfdbea;font-size:13px;line-height:1.55}
.rodape .cols{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:32px;max-width:1200px;margin:0 auto;padding:36px 32px 24px}
.rodape h3{margin:0 0 10px;color:#fff;font-size:13px;text-transform:uppercase;letter-spacing:.07em}.rodape p{margin:0 0 8px}.rodape ul{margin:0;padding:0;list-style:none}.rodape li{padding:2px 0}
.rodape a{color:#f5b841;text-decoration:none}.rodape a:hover{text-decoration:underline}.rodape .falhou{color:#ffb4ab}.rodape .ok i{color:#7dd3a8;font-style:normal}
.rodape .fim{border-top:1px solid #ffffff1f;text-align:center;padding:14px;font-size:12px;color:#8fa6c2}
.horas{display:flex;gap:6px;margin-top:6px}.horas span{background:#ffffff14;border-radius:6px;padding:2px 8px;color:#fff}

.grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:18px;flex:1;max-height:720px}
.card{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.06),0 6px 18px rgba(15,23,42,.05);padding:18px;display:flex;flex-direction:column;gap:10px;min-height:0;position:relative}
.card.velho{background:#f8fafc}.velho-lbl{background:#e2e8f0;color:#334155}
.meta{font-size:12px;color:#64748b;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.selos{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.selos>span{display:inline-flex;align-items:center;height:20px;line-height:20px;padding:0 8px;border-radius:6px;font-size:11px;white-space:nowrap;box-sizing:border-box}
.tag{color:#fff;font-weight:600}.tema{background:#f1f5f9;color:#475569}.ato{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}
.novo{background:#15803d;color:#fff;font-weight:700}
.card h2{margin:0;font-size:17px;line-height:1.3}.card h2 a{color:inherit;text-decoration:none}.card h2 a:hover{text-decoration:underline}
.card p{margin:0;font-size:14px;line-height:1.45;color:#475569;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.card p.sem{font-style:italic;color:#64748b}
.links{margin-top:auto;display:flex;gap:12px;font-size:13px}.links a{font-weight:600;color:#2563eb;text-decoration:none}.links a.gn{font-weight:400;color:#64748b}
.pag{display:flex;justify-content:center;align-items:center;gap:14px;margin-top:22px}.pag button{font:inherit;font-size:14px;padding:8px 16px;border-radius:10px;border:1px solid #d6dbe3;background:#fff;cursor:pointer}.pag button:disabled{opacity:.4;cursor:default}.pag span{font-size:13px;color:#64748b}
.vazio{grid-column:1/-1;color:#64748b;text-align:center;padding:60px}
#abrir{display:none}
@media(max-width:800px){.topo{padding:0 12px;gap:10px}.topo svg.ponte{right:-60px;width:300px}.selo-ilha{display:none}.marca b{font-size:15px}.status{display:none}.cel-status{display:block!important}.marca .lg{display:none}.cu{display:inline}
.rodape .cols{grid-template-columns:1fr;gap:22px;padding:28px 20px 18px}
aside{position:fixed;top:64px;left:0;height:calc(100vh - 64px);transform:translateX(-100%);transition:.2s;width:280px;visibility:hidden}body.menu aside{transform:none;visibility:visible;box-shadow:0 0 40px rgba(0,0,0,.2)}
main{padding:16px}h1{font-size:22px}
#abrir{display:inline-flex;flex:0 0 auto;gap:6px;font:inherit;font-size:13px;font-weight:600;padding:6px 10px;border-radius:9px;border:1px solid #ffffff40;background:#ffffff14;color:#fff;position:relative}
.grade{grid-template-columns:1fr;grid-template-rows:none;max-height:none}}
</style></head><body>
<header class="topo" role="banner"><button id="abrir" type="button" aria-controls="menu" aria-expanded="false">☰ Bairros</button>
<svg class="ponte" viewBox="0 0 420 60" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2"><path d="M0 52H420"/><path d="M120 52V8M300 52V8" stroke-width="4"/><path d="M0 50Q60 46 120 8Q210 60 300 8Q360 46 420 50"/><path d="M135 22V52M150 32V52M165 40V52M180 45V52M195 48V52M210 49V52M225 48V52M240 45V52M255 40V52M270 32V52M285 22V52M30 47V52M60 44V52M90 33V52M330 33V52M360 44V52M390 47V52" stroke-width="1"/></svg>
<div class="marca"><span class="selo-ilha" aria-hidden="true">F</span><div><b><span class="lg">Painel de Notícias Políticas — Florianópolis</span><span class="cu">Notícias Políticas · Floripa</span></b><small>Prefeitura, Câmara e políticas públicas por bairro</small></div></div>
<div class="status"><strong>${total} notícias</strong><br><span class="lg">Atualizado às </span>${h(geradoEm.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }))} · ${h(geradoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }))}</div></header>
<div class="corpo"><aside id="menu" aria-label="Bairros"><div class="busca"><input id="q" placeholder="Buscar bairro…" aria-label="Buscar bairro"></div><p class="legenda">Números = notícias das últimas 24h</p><nav class="lista" id="lista"></nav>
<div class="temas"><h4>Temas</h4><div class="chips" id="chips"></div></div></aside>
<main><div class="painel-cab"><h1 id="titulo" tabindex="-1">Toda a cidade</h1><button type="button" class="limpar" id="limpar" hidden>× limpar</button><div class="cel-status">${total} notícias · atualizado às ${h(geradoEm.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }))} de ${h(geradoEm.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }))}</div></div>
<section class="grade" id="grade"></section><p class="sr-only" id="anuncio" aria-live="polite"></p>
<nav class="pag" aria-label="Paginação"><button id="voltar" type="button" disabled aria-label="Voltar à visão anterior">← Voltar</button><button id="ant" type="button">‹ Anteriores</button><span id="pg"></span><button id="prox" type="button">Próximas ›</button></nav>
</main></div>
<footer class="rodape"><div class="cols">
<section><h3>Sobre o painel</h3><p>Notícias de relevância política sobre Florianópolis — Prefeitura, Câmara Municipal, serviços e políticas públicas — coletadas automaticamente e organizadas por bairro e região.</p><p>Bairro, região e tema são atribuídos automaticamente e podem conter erros. ${nv.novas.length} notícias novas nesta atualização.</p></section>
<section><h3>Fontes monitoradas</h3><ul>${fontes}</ul></section>
<section><h3>Dados abertos</h3><ul><li><a href="noticias.json">noticias.json</a> — todas as notícias e metadados</li><li><a href="novidades.json">novidades.json</a> — o que mudou desde a última coleta</li></ul><p style="margin-top:12px">Atualização automática diária (horário de Brasília):</p><div class="horas"><span>7h</span><span>12h</span><span>18h</span></div></section>
</div><div class="fim">© 2026 Paulo Heidenreich</div></footer>
<script>
const D=${dados};
const DIA=864e5;let AGORA=Date.now();
const regDe={};for(const[r,bs]of Object.entries(D.regioes))bs.forEach(b=>regDe[b]=r);Object.assign(regDe,D.rotulos);
const regiaoDe=n=>{for(const b of n.bairros)if(regDe[b])return regDe[b];return null};
const cor=r=>'var(--'+(r||'Cidade')+')';
const novo=n=>n.data&&AGORA-new Date(n.data)<DIA;
const $=id=>document.getElementById(id);
const abertos=new Set();let cont={},hist={},sel=null,tema=null,pag=0,q='',prof=0;
const hashDe=()=>{const p=new URLSearchParams();if(sel)sel[0]==='@'?p.set('regiao',sel.slice(1)):p.set('bairro',sel);if(tema)p.set('tema',tema);if(q)p.set('busca',$('q').value.trim());if(pag)p.set('pag',pag+1);const s=p.toString();return s?'#'+s:location.pathname+location.search};
const lerHash=()=>{const p=new URLSearchParams(location.hash.slice(1));sel=p.get('regiao')?'@'+p.get('regiao'):p.get('bairro')||null;tema=p.get('tema')||null;const b=p.get('busca')||'';$('q').value=b;q=norm(b);pag=Math.max(0,(+p.get('pag')||1)-1)};
const inicial=()=>!sel&&!tema&&!q&&!pag;
let ultF=null;function rastrear(){const k=(sel||'')+'|'+(tema||'');if(ultF===null){ultF=k;return}if(k===ultF)return;ultF=k;try{const d={};if(sel)sel[0]==='@'?d.regiao=sel.slice(1):d.bairro=sel;if(tema)d.tema=tema;window.umami&&umami.track('filtro',d)}catch(e){}}
function btnVoltar(){$('voltar').disabled=inicial()}
function empurrar(){const h=hashDe();if(h===(location.hash||location.pathname+location.search))return;prof++;history.pushState({prof},'',h);btnVoltar();rastrear()}
function contar(){AGORA=Date.now();cont={};hist={};D.noticias.forEach(n=>{const rs=new Set();n.bairros.forEach(b=>{hist[b]=(hist[b]||0)+1;if(regDe[b])rs.add(regDe[b])});rs.forEach(r=>hist['@'+r]=(hist['@'+r]||0)+1)});D.noticias.filter(novo).forEach(n=>{const rs=new Set();n.bairros.forEach(b=>{cont[b]=(cont[b]||0)+1;if(regDe[b])rs.add(regDe[b])});rs.forEach(r=>cont['@'+r]=(cont['@'+r]||0)+1)})}
const fmt=s=>s?new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',',' ·'):'sem data';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
const lblC=n=>' aria-label="'+n+(n===1?' nova':' novas')+' nas últimas 24h"';
const it=(id,nome,n,r,cls='')=>'<button type="button" class="item '+cls+(n||hist[id]?'':' zero')+(sel===id?' ativo':'')+'" aria-pressed="'+(sel===id)+'" data-b="'+esc(id)+'"><span>'+esc(nome)+'</span><span class="c'+(n?'':' c0')+'" style="background:'+cor(r)+'"'+lblC(n)+'>'+n+'</span></button>';
function lista(){const f=b=>!q||norm(b).includes(q);const nc=D.noticias.filter(novo).length;let h='<button type="button" class="item cidade'+(sel?'':' ativo')+'" aria-pressed="'+!sel+'" data-b=""><span>Toda a cidade</span><span class="c" style="background:'+cor()+'"'+lblC(nc)+'>'+nc+'</span></button>';
for(const[r,bs]of Object.entries(D.regioes)){const v=bs.filter(f);if(!v.length&&!f(r))continue;const tot=cont['@'+r]||0;const aberto=q||abertos.has(r);
h+='<details data-r="'+r+'"'+(aberto?' open':'')+'><summary><i style="background:'+cor(r)+'"></i>'+r+'<span>'+tot+'</span></summary>'+it('@'+r,'Toda a região',tot,r,'reg')+v.map(b=>it(b,b,cont[b]||0,regDe[b])).join('')+'</details>'}
$('lista').innerHTML=h}
function chips(){const ct={};D.noticias.filter(casa).forEach(n=>n.temas.forEach(t=>ct[t]=(ct[t]||0)+1));$('chips').innerHTML=D.temas.map(x=>'<button type="button" class="chip'+(tema===x?' on':'')+'" aria-pressed="'+(tema===x)+'"'+(!ct[x]&&tema!==x?' aria-disabled="true"':'')+' data-t="'+esc(x)+'">'+esc(D.rotTema[x]||x)+'<span class="n">'+(ct[x]||0)+'</span></button>').join('')}
const casa=n=>!sel||(sel[0]==='@'?n.bairros.some(b=>regDe[b]===sel.slice(1)):n.bairros.includes(sel));
function grade(){const ns=D.noticias.filter(n=>casa(n)&&(!tema||n.temas.includes(tema)));
const tp=Math.max(1,Math.ceil(ns.length/6));pag=Math.max(0,Math.min(pag,tp-1));
const nomeSel=!sel?'Toda a cidade':sel[0]==='@'?'Região '+sel.slice(1):sel;$('titulo').textContent=nomeSel+(tema?' · '+tema:'');$('limpar').hidden=!sel&&!tema;
$('grade').innerHTML=ns.slice(pag*6,pag*6+6).map(n=>{const r=regiaoDe(n);const b=sel&&sel[0]!=='@'?sel:(n.bairros.find(x=>!D.rotulos[x])||n.bairros[0]);
return '<article class="card'+(novo(n)?'':' velho')+'"><div class="meta"><span>'+esc(n.fonte.replace(/ \\(via Google News\\)$/,''))+'</span>·<span>'+fmt(n.data)+'</span></div><div class="selos">'+(novo(n)?'<span class="novo">Novo</span>':'<span class="velho-lbl">Mais de 24h</span>')+'<span class="tag" style="background:'+cor(r)+'">'+esc(b||'Cidade')+'</span>'+(n.temas[0]?'<span class="tema">'+esc(tema||n.temas[0])+'</span>':'')+(n.ano?'<span class="ato">ato de '+esc(n.ano)+'</span>':'')+'</div>'
+'<h2><a href="'+esc(n.link)+'" target="_blank" rel="noopener">'+esc(n.titulo)+'<span class="sr-only"> (abre em nova aba)</span></a></h2>'+(n.lide?'<p'+(n.sem?' class="sem"':'')+' title="'+esc(n.lide)+'">'+esc(n.lide)+'</p>':'')+'<div class="links"><a href="'+esc(n.link)+'" target="_blank" rel="noopener">Ler na fonte →</a>'+(n.gn?'<a class="gn" href="'+esc(n.gn)+'" target="_blank" rel="noopener">via Google News</a>':'')+'</div></article>'}).join('')||'<div class="vazio">'+(tema?'Nenhuma notícia de '+esc(tema)+' em '+esc(nomeSel):'Nenhuma notícia em '+esc(nomeSel))+'<br>'+(tema?'<button type="button" data-acao="sem-tema">Remover tema</button>':'')+(sel&&sel[0]!=='@'&&regDe[sel]?'<button type="button" data-acao="regiao">Ver toda a região</button>':'')+'</div>';
$('pg').textContent='Página '+(pag+1)+' de '+tp;$('ant').disabled=pag===0;$('prox').disabled=pag>=tp-1;$('anuncio').textContent='Página '+(pag+1)+' de '+tp+' · '+ns.length+(ns.length===1?' notícia':' notícias')}
$('lista').addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.r&&!q){d.open?abertos.add(d.dataset.r):abertos.delete(d.dataset.r)}},true);
$('lista').onclick=e=>{const i=e.target.closest('.item');if(!i)return;sel=i.dataset.b||null;const dr=i.closest('details');if(dr)abertos.add(dr.dataset.r);pag=0;const m=document.body.classList.contains('menu');if(m)menu(false);lista();chips();grade();empurrar();const a=$('lista').querySelector('.item[aria-pressed="true"]');if(!m&&a)a.focus()};
$('chips').onclick=e=>{const c=e.target.closest('.chip');if(!c||c.getAttribute('aria-disabled')==='true')return;tema=tema===c.dataset.t?null:c.dataset.t;pag=0;chips();grade();empurrar();const a=$('chips').querySelector('[data-t="'+CSS.escape(c.dataset.t)+'"]');if(a)a.focus()};
$('q').oninput=()=>{q=norm($('q').value.trim());lista()};$('q').onchange=()=>empurrar();
const irPag=d=>{pag+=d;grade();empurrar();scrollTo(0,0);$('titulo').focus({preventScroll:true})};$('ant').onclick=()=>irPag(-1);$('prox').onclick=()=>irPag(1);
$('limpar').onclick=()=>{sel=tema=null;pag=0;lista();chips();grade();empurrar();$('titulo').focus()};
$('grade').addEventListener('click',e=>{const b=e.target.closest('[data-acao]');if(!b)return;if(b.dataset.acao==='sem-tema')tema=null;else{const r=regDe[sel];sel='@'+r;abertos.add(r)}pag=0;lista();chips();grade();empurrar();$('titulo').focus()});
const menu=(on,foco)=>{document.body.classList.toggle('menu',on);$('abrir').setAttribute('aria-expanded',on);if(on){$('q').focus();setTimeout(()=>$('q').focus(),220)}else if(foco)$('abrir').focus()};
$('abrir').onclick=e=>{e.stopPropagation();menu(!document.body.classList.contains('menu'))};
document.querySelector('main').addEventListener('click',e=>{if(e.target.id!=='abrir'&&document.body.classList.contains('menu'))menu(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu'))menu(false,true)});
$('voltar').onclick=()=>{if(history.state&&history.state.prof>0)history.back();else{sel=tema=null;q='';$('q').value='';pag=0;history.replaceState({prof:0},'',location.pathname+location.search);render()}};
function render(){lista();chips();grade();btnVoltar();rastrear()}
addEventListener('popstate',e=>{prof=e.state&&e.state.prof||0;lerHash();render()});
lerHash();history.replaceState({prof:0},'',location.href);contar();render();
setInterval(()=>{contar();const f=document.activeElement;if(!$('lista').contains(f))lista();if(!$('grade').contains(f))grade()},5*60e3);
</script></body></html>`;
};
