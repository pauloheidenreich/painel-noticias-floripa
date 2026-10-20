'use strict';
// Enriquecimento de atos da Câmara que trazem só o número (ex.: "LEI Nº 9299/2013").
// 1) resolve o redirecionamento do Google News para obter o link original (cmf.sc.gov.br);
// 2) tenta ler a página original (o site costuma exigir captcha: nesse caso não insiste);
// 3) procura a ementa em notícias do Google News pelo número do ato.
// Sem ementa encontrada: sem_ementa = true.
const UA = 'Mozilla/5.0 (painel-floripa prototipo)';
const SO_NUMERO = /^(LEI|LEI COMPLEMENTAR|LEI CMF|LEI COMPLEMENTAR CMF|DECRETO|DECRETO LEGISLATIVO|RESOLU[CÇ][AÃ]O|PROJETO DE LEI|PROJETO DE LEI COMPLEMENTAR|EMENDA|INDICA[CÇ][AÃ]O|MO[CÇ][AÃ]O|REQUERIMENTO|PORTARIA)\b[^a-z]*$/u;

async function get(url, opts = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try { return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } }); }
  finally { clearTimeout(t); }
}

async function resolverGoogleNews(link) {
  const m = link.match(/news\.google\.com\/rss\/articles\/([^?]+)/); if (!m) return null;
  const id = m[1];
  const h = await (await get('https://news.google.com/rss/articles/' + id)).text();
  const sg = h.match(/data-n-a-sg="([^"]+)"/)?.[1], ts = h.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!sg || !ts) return null;
  const req = [['Fbv4je', JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]), null, 'generic']];
  const r = await get('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'f.req=' + encodeURIComponent(JSON.stringify([req])) });
  const t = await r.text();
  const u = t.match(/\[\\"garturlres\\",\\"([^\\"]+)\\"/)?.[1];
  return u && /^https?:\/\//.test(u) ? u : null;
}

function numeroDoAto(titulo) {
  const m = titulo.match(/N[º°.]*\s*\.?\s*([\d.]+)(?:\s*\/\s*(\d{4}))?/i); if (!m) return null;
  const n = m[1].replace(/\./g, ''); const ano = m[2] || (titulo.match(/DE (\d{4})/) || [])[1] || null;
  return { n, ano, tipo: titulo.split(/\s+N/i)[0].trim() };
}

async function ementaDaPagina(url) {
  const r = await get(url); const h = await r.text();
  if (/Bot Verification|recaptcha|Just a moment/i.test(h)) return { bloqueado: true };
  const meta = h.match(/<meta[^>]+name="description"[^>]+content="([^"]{20,})"/i)?.[1];
  const em = h.match(/Ementa[^<]*<\/[^>]+>\s*<[^>]+>([^<]{20,})/i)?.[1];
  return { texto: (em || meta || '').trim() || null };
}

async function ementaGoogleNews(ato) {
  const fmt = ato.n.length > 3 ? ato.n.replace(/\B(?=(\d{3})+$)/g, '.') : ato.n;
  const q = `("${ato.n}" OR "${fmt}") Florianópolis lei`;
  const x = await (await get('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=pt-BR&gl=BR&ceid=BR:pt-419')).text();
  for (const m of x.matchAll(/<item>[\s\S]*?<title>([^<]+)<\/title>/g)) {
    const t = m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const re = new RegExp('(lei|decreto|resolu[cç][aã]o|projeto)[^0-9]{0,20}(n[º°.]*\\s*)?(' + ato.n + '|' + fmt.replace(/\./g, '\\.') + ')(?![0-9])', 'i');
    if (ato.n.length >= 3 && re.test(t) && !SO_NUMERO.test(t.replace(/\s+-\s+[^-]+$/, ''))) return t.replace(/\s+-\s+[^-]+$/, '');
  }
  return null;
}

async function enriquecer(noticias) {
  // processa em paralelo (lotes de 5) para não demorar
  const lista = noticias.filter((n) => SO_NUMERO.test(n.titulo.trim()));
  const stats = { candidatos: lista.length, link_resolvido: 0, com_resumo: 0, sem_ementa: 0, captcha: 0 };
  for (let i = 0; i < lista.length; i += 5) await Promise.all(lista.slice(i, i + 5).map((n) => um(n, stats)));
  return stats;
}
async function um(n, stats) {
  {
    const ato = numeroDoAto(n.titulo);
    try {
      const orig = await resolverGoogleNews(n.link);
      if (orig) { n.link_original = orig; stats.link_resolvido++; }
      let resumo = null;
      if (orig) { const p = await ementaDaPagina(orig).catch(() => ({})); if (p.bloqueado) stats.captcha++; resumo = p.texto || null; }
      if (!resumo && ato) resumo = await ementaGoogleNews(ato).catch(() => null);
      if (resumo) { n.resumo = resumo; stats.com_resumo++; } else { n.sem_ementa = true; stats.sem_ementa++; }
    } catch { n.sem_ementa = true; stats.sem_ementa++; }
    if (ato && ato.ano) n.ano_do_ato = Number(ato.ano);
  }
}
module.exports = { enriquecer, SO_NUMERO, resolverGoogleNews };
