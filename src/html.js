const { TEMAS } = require('./temas');
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'sem data';
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const REGIOES = ['Norte da Ilha', 'Sul da Ilha', 'Leste da Ilha', 'Continente'];

exports.gerarHtml = ({ novidades, noticias, grupos, relatorio, geradoEm, total }) => {
  const agora = geradoEm.getTime();
  const idade = (n) => (n.data ? (agora - new Date(n.data).getTime()) / 864e5 : null);
  const item = (n, b) => {
    const d = idade(n);
    const cls = d == null ? '' : d < 1 ? 'recente' : d > 7 ? 'antiga' : '';
    const selo = d == null ? '' : d < 1 ? '<span class="selo s-rec">últimas 24h</span>' : d > 7 ? `<span class="selo s-ant">publicada há ${Math.floor(d)} dias</span>` : '';
    const entrou = n.entrou_em && n.data && Math.abs(new Date(n.entrou_em) - new Date(n.data)) > 864e5 ? ` · no painel desde ${fmt(n.entrou_em)}` : '';
    return `
      <li class="${cls}" data-temas="${h((n.temas || []).join('|'))}"><a href="${h(n.link_original || n.link)}" target="_blank" rel="noopener">${h(n.titulo)}</a> ${selo}
        ${n.lide ? `<div class="lide">${h(n.lide)}</div>` : n.resumo ? `<div class="lide">${h(n.resumo)}</div>` : n.sem_ementa ? '<div class="lide sem">Ato da Câmara sem ementa disponível publicamente (site exige verificação).</div>' : ''}
        <div class="meta"><span class="fonte">${h(n.fonte)}</span> · publicada <time>${fmt(n.data)}</time>${entrou}${n.ano_do_ato ? ` · ato de ${n.ano_do_ato}` : ''}${b && n.bairros.length > 1 ? ` · <span class="outros">também: ${h(n.bairros.filter((x) => x !== b).join(', '))}</span>` : ''}${!b && n.bairros.length ? ` · ${h(n.bairros.join(', '))}` : ''}</div>
        ${(n.temas || []).length ? `<div class="tags">${n.temas.map((t) => `<span class="tag">${h(t)}</span>`).join('')}</div>` : ''}</li>`;
  };
  const nomes = Object.keys(grupos);
  const ordem = [
    ...nomes.filter((b) => b !== 'Geral/Cidade' && !REGIOES.includes(b)).sort((a, b) => a.localeCompare(b, 'pt')),
    ...REGIOES.filter((r) => grupos[r]),
    ...(grupos['Geral/Cidade'] ? ['Geral/Cidade'] : []),
  ];
  const chips = ordem.map((b) => `<a class="chip${REGIOES.includes(b) ? ' reg' : ''}" href="#${slug(b)}">${h(b)} <b>${grupos[b].length}</b></a>`).join('');
  const contTema = {}; for (const n of noticias) for (const t of n.temas || []) contTema[t] = (contTema[t] || 0) + 1;
  const temaBtns = `<button class="tema ativo" data-tema="">Todos os temas</button>` + TEMAS.filter((t) => contTema[t]).map((t) => `<button class="tema" data-tema="${h(t)}">${h(t)} <b>${contTema[t]}</b></button>`).join('');
  const secoes = ordem.map((b) => `
  <section id="${slug(b)}" class="bairro${REGIOES.includes(b) ? ' regiao' : ''}" data-nome="${h(b.toLowerCase())}">
    <h2>${REGIOES.includes(b) ? '📍 ' : ''}${h(b)} <span>${grupos[b].length}</span></h2>
    <ul>${grupos[b].map((n) => item(n, b)).join('')}</ul>
  </section>`).join('');
  const rec = noticias.filter((n) => { const d = idade(n); return d != null && d < 1; });
  const bloco24 = `
  <section id="ultimas-24h" class="bairro destaque" data-nome="últimas 24h">
    <h2>⏱️ Publicadas nas últimas 24h <span>${rec.length}</span></h2>
    ${rec.length ? `<ul>${rec.map((n) => item(n)).join('')}</ul>` : '<p class="meta">Nenhuma notícia política publicada nas últimas 24 horas.</p>'}
  </section>`;
  const nv = novidades || { novas: [] };
  const blocoNovas = `
  <section id="novas" class="bairro novas" data-nome="novas">
    <h2>🆕 Novas desde a última atualização <span>${nv.novas.length}</span></h2>
    <p class="meta">${nv.primeira_execucao ? 'Primeira execução: todas as notícias contam como novas.' : 'Desde ' + h(fmt(nv.atualizacao_anterior)) + ' · ' + nv.removidas_count + ' saíram do painel'} · ${nv.total_novas_recentes ?? 0} publicadas nas últimas 24h e ${nv.total_novas_antigas ?? 0} mais antigas que só apareceram agora · <a href="novidades.json">novidades.json</a></p>
    ${nv.novas.length ? `<ul>${nv.novas.slice(0, 30).map((x) => `
      <li data-temas="${h((x.temas || []).join('|'))}"><a href="${h(x.link)}" target="_blank" rel="noopener">${h(x.titulo)}</a>
        <div class="meta"><span class="fonte">${h(x.fonte)}</span> · publicada <time>${fmt(x.data)}</time> · ${h(x.bairros.join(', '))}</div></li>`).join('')}</ul>${nv.novas.length > 30 ? `<p class="meta">+ ${nv.novas.length - 30} outras no novidades.json</p>` : ''}` : '<p class="meta">Nenhuma notícia nova.</p>'}
  </section>`;
  const fontes = relatorio.map((r) => `<li class="${r.status}">${h(r.fonte)}: ${r.status === 'ok' ? `${r.floripa} de Florianópolis (de ${r.itens})` : 'falhou – ' + h(r.erro)}</li>`).join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notícias políticas de Florianópolis por bairro</title>
<style>
:root{--azul:#0b4f8a;--mar:#11a0c9;--areia:#f6f1e7;--txt:#1d2733;--sub:#5d6b7a}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--areia);color:var(--txt)}
header{background:linear-gradient(135deg,var(--azul),var(--mar));color:#fff;padding:28px 20px}
header h1{margin:0 0 6px;font-size:clamp(1.4rem,4vw,2.2rem)}header p{margin:0;opacity:.9}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
.ferr{position:sticky;top:0;background:#fffdf8ee;backdrop-filter:blur(6px);padding:12px 0;z-index:2;border-bottom:1px solid #e3dccd}
input{width:100%;padding:10px 14px;border:1px solid #cfc6b3;border-radius:10px;font-size:1rem}
.chips,.temas{display:flex;gap:6px;overflow-x:auto;padding-top:8px}
.chip,.tema{white-space:nowrap;text-decoration:none;color:var(--azul);background:#fff;border:1px solid #d6e3ef;border-radius:999px;padding:4px 10px;font-size:.82rem;cursor:pointer;font-family:inherit}
.chip b,.tema b{color:var(--mar)}.chip.reg{border-style:dashed}.tema.ativo{background:var(--azul);color:#fff}.tema.ativo b{color:#cfeefa}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;padding:18px 0}
.bairro{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 2px 8px #0001;scroll-margin-top:150px}
.bairro h2{margin:0 0 8px;font-size:1.15rem;color:var(--azul);display:flex;justify-content:space-between;gap:8px}
.bairro h2 span{background:var(--mar);color:#fff;border-radius:999px;padding:0 10px;font-size:.85rem;line-height:1.7}
.regiao{background:#fbfdff;border:1px dashed #b9d3e6}
ul{list-style:none;margin:0;padding:0}li{padding:9px 0;border-top:1px solid #eee}li:first-child{border-top:0}
li a{color:var(--txt);text-decoration:none;font-weight:600}li a:hover{color:var(--mar);text-decoration:underline}
li.antiga{opacity:.62}li.antiga a{font-weight:500}li.recente{border-left:3px solid #1aa260;padding-left:8px}
.selo{font-size:.7rem;border-radius:6px;padding:1px 6px;white-space:nowrap;vertical-align:middle}.s-rec{background:#e3f6ea;color:#137a45}.s-ant{background:#eee;color:#666}
.lide{font-size:.88rem;margin-top:4px;color:#33414f;line-height:1.4}.lide.sem{font-style:italic;color:#8a96a3}
.meta{font-size:.8rem;color:var(--sub);margin-top:3px}.fonte{color:var(--azul)}
.tags{margin-top:4px;display:flex;flex-wrap:wrap;gap:4px}.tag{font-size:.7rem;background:#eef5fb;color:#245b85;border-radius:6px;padding:1px 6px}
#geral-cidade,#novas,#ultimas-24h{grid-column:1/-1}.novas{border:2px solid var(--mar)}.destaque{border:2px solid #1aa260}
footer{font-size:.85rem;color:var(--sub);padding:10px 0 30px}footer .falhou{color:#b3261e}
@media(max-width:400px){main{grid-template-columns:1fr}}
</style></head><body>
<header><div class="wrap"><h1>🏛️ Notícias políticas de Florianópolis por bairro</h1>
<p>${total} notícias políticas reais (poder público, Câmara, Prefeitura, governo, serviços públicos e eleições) coletadas automaticamente · atualizado em ${fmt(geradoEm.toISOString())} (horário de Brasília)</p></div></header>
<div class="ferr"><div class="wrap"><input id="q" placeholder="Filtrar por bairro ou palavra…" aria-label="Filtrar">
<nav class="temas" aria-label="Filtrar por tema">${temaBtns}</nav><nav class="chips">${chips}</nav></div></div>
<div class="wrap"><main>${bloco24}${blocoNovas}${secoes}</main>
<footer><h3>Fontes desta coleta</h3><ul>${fontes}</ul>
<p>Só entram matérias de relevância política (filtro automático por palavras-chave; fontes oficiais entram sempre). Bairro, região e tema são atribuídos automaticamente pelo título e pelo lide da matéria e podem conter erros. Notícias sem bairro identificado ficam em “Geral/Cidade”. Itens esmaecidos foram publicados há mais de 7 dias.</p></footer></div>
<script>
let tema='';const q=document.getElementById('q');
function filtrar(){const t=q.value.toLowerCase().trim();
document.querySelectorAll('.bairro').forEach(s=>{const lis=s.querySelectorAll('li');if(!lis.length){s.style.display=(t||tema)?'none':'';return}
let vis=0;const nomeOk=s.dataset.nome.includes(t);
lis.forEach(li=>{const ok=(!t||nomeOk||li.textContent.toLowerCase().includes(t))&&(!tema||(li.dataset.temas||'').split('|').includes(tema));li.style.display=ok?'':'none';if(ok)vis++});
s.style.display=vis?'':'none'})}
q.addEventListener('input',filtrar);
document.querySelectorAll('.tema').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tema').forEach(x=>x.classList.remove('ativo'));b.classList.add('ativo');tema=b.dataset.tema;filtrar()}));
</script></body></html>`;
};
