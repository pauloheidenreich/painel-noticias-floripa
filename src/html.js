const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'sem data';
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

exports.gerarHtml = ({ novidades, grupos, relatorio, geradoEm, total }) => {
  const ordem = Object.keys(grupos).filter((b) => b !== 'Geral/Cidade').sort((a, b) => a.localeCompare(b, 'pt'));
  if (grupos['Geral/Cidade']) ordem.push('Geral/Cidade');
  const chips = ordem.map((b) => `<a class="chip" href="#${slug(b)}">${h(b)} <b>${grupos[b].length}</b></a>`).join('');
  const secoes = ordem.map((b) => `
  <section id="${slug(b)}" class="bairro" data-nome="${h(b.toLowerCase())}">
    <h2>${h(b)} <span>${grupos[b].length}</span></h2>
    <ul>${grupos[b].map((n) => `
      <li><a href="${h(n.link)}" target="_blank" rel="noopener">${h(n.titulo)}</a>
        <div class="meta"><span class="fonte">${h(n.fonte)}</span> · <time>${fmt(n.data)}</time>${n.bairros.length > 1 ? ` · <span class="outros">também: ${h(n.bairros.filter((x) => x !== b).join(', '))}</span>` : ''}</div></li>`).join('')}
    </ul>
  </section>`).join('');
  const nv = novidades || { novas: [] };
  const blocoNovas = `
  <section id="novas" class="bairro novas" data-nome="novas">
    <h2>🆕 Novas desde a última atualização <span>${nv.novas.length}</span></h2>
    <p class="meta">${nv.primeira_execucao ? 'Primeira execução: todas as notícias contam como novas.' : 'Desde ' + h(fmt(nv.atualizacao_anterior)) + ' · ' + nv.removidas_count + ' saíram do painel'} · <a href="novidades.json">novidades.json</a></p>
    ${nv.novas.length ? `<ul>${nv.novas.slice(0, 30).map((n) => `
      <li><a href="${h(n.link)}" target="_blank" rel="noopener">${h(n.titulo)}</a>
        <div class="meta"><span class="fonte">${h(n.fonte)}</span> · <time>${fmt(n.data)}</time> · ${h(n.bairros.join(', '))}</div></li>`).join('')}</ul>${nv.novas.length > 30 ? `<p class="meta">+ ${nv.novas.length - 30} outras no novidades.json</p>` : ''}` : '<p class="meta">Nenhuma notícia nova.</p>'}
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
.chips{display:flex;gap:6px;overflow-x:auto;padding-top:10px}
.chip{white-space:nowrap;text-decoration:none;color:var(--azul);background:#fff;border:1px solid #d6e3ef;border-radius:999px;padding:4px 10px;font-size:.85rem}
.chip b{color:var(--mar)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;padding:18px 0}
.bairro{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 2px 8px #0001;scroll-margin-top:110px}
.bairro h2{margin:0 0 8px;font-size:1.15rem;color:var(--azul);display:flex;justify-content:space-between}
.bairro h2 span{background:var(--mar);color:#fff;border-radius:999px;padding:0 10px;font-size:.85rem;line-height:1.7}
ul{list-style:none;margin:0;padding:0}li{padding:9px 0;border-top:1px solid #eee}li:first-child{border-top:0}
li a{color:var(--txt);text-decoration:none;font-weight:600}li a:hover{color:var(--mar);text-decoration:underline}
.meta{font-size:.8rem;color:var(--sub);margin-top:3px}.fonte{color:var(--azul)}
#geral-cidade,#novas{grid-column:1/-1}.novas{border:2px solid var(--mar)}
footer{font-size:.85rem;color:var(--sub);padding:10px 0 30px}footer .falhou{color:#b3261e}
@media(max-width:400px){main{grid-template-columns:1fr}}
</style></head><body>
<header><div class="wrap"><h1>🏛️ Notícias políticas de Florianópolis por bairro</h1>
<p>${total} notícias políticas reais (poder público, Câmara, Prefeitura, governo, serviços públicos e eleições) coletadas automaticamente · atualizado em ${fmt(geradoEm.toISOString())} (horário de Brasília)</p></div></header>
<div class="ferr"><div class="wrap"><input id="q" placeholder="Filtrar por bairro ou palavra…" aria-label="Filtrar"><nav class="chips">${chips}</nav></div></div>
<div class="wrap"><main>${blocoNovas}${secoes}</main>
<footer><h3>Fontes desta coleta</h3><ul>${fontes}</ul>
<p>Classificação automática por menção ao nome do bairro no título/resumo; pode haver erros. Só entram matérias de relevância política (filtro automático por palavras-chave; fontes oficiais entram sempre). Notícias sem bairro identificado ficam em “Geral/Cidade”.</p></footer></div>
<script>
document.getElementById('q').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();
document.querySelectorAll('.bairro').forEach(s=>{let vis=0;const nomeOk=s.dataset.nome.includes(q);
s.querySelectorAll('li').forEach(li=>{const ok=!q||nomeOk||li.textContent.toLowerCase().includes(q);li.style.display=ok?'':'none';if(ok)vis++});
s.style.display=vis?'':'none'})});
</script></body></html>`;
};
