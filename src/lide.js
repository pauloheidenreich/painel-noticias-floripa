'use strict';
// Busca o lide (og:description / meta description / 1º parágrafo) da matéria original.
// Não contorna bloqueios: captcha, 403/429 ou página de verificação => sem lide.
const { resolverGoogleNews } = require('./ementas');
const UA = 'Mozilla/5.0 (compatible; painel-floripa/0.2; +https://pauloheidenreich.github.io/painel-noticias-floripa/)';
const MAX = 400;

const ent = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') { try { return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)); } catch { return m; } }
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' }[e.toLowerCase()] ?? m;
});
const limpar = (s) => ent(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function cortar(s) {
  s = limpar(s); if (s.length <= MAX) return s;
  const c = s.slice(0, MAX); const p = Math.max(c.lastIndexOf('. '), c.lastIndexOf('; '));
  return (p > 200 ? c.slice(0, p + 1) : c.replace(/\s+\S*$/, '') + '…');
}
const BLOQUEIO = /Bot Verification|recaptcha|hcaptcha|Just a moment|cf-chl|Attention Required|Verificação de segurança|Access Denied/i;
const GENERICO = /^(leia mais|clique|assine|cookies|todos os direitos|acesse|publicidade|siga o|receba as not)/i;

function extrair(html, titulo) {
  const meta = (attr, nome) => html.match(new RegExp(`<meta[^>]+${attr}=["']${nome}["'][^>]*content=["']([^"']{30,})["']`, 'i'))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']{30,})["'][^>]*${attr}=["']${nome}["']`, 'i'))?.[1];
  const cand = [meta('property', 'og:description'), meta('name', 'description'), meta('name', 'twitter:description')].filter(Boolean).map(limpar);
  // 1º parágrafo relevante do corpo do artigo
  const corpo = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html;
  for (const m of corpo.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const p = limpar(m[1]); if (p.length >= 80 && !GENERICO.test(p)) { cand.push(p); break; }
  }
  const tn = limpar(titulo).toLowerCase();
  const bom = cand.find((c) => c.length >= 40 && c.toLowerCase() !== tn && !GENERICO.test(c));
  return bom ? cortar(bom) : null;
}

async function baixarHtml(url, ms) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, signal: ctrl.signal, redirect: 'follow' });
    if (r.status === 403 || r.status === 429 || r.status === 401) return { bloqueado: 'HTTP ' + r.status };
    if (!r.ok) return { erro: 'HTTP ' + r.status };
    if (!/html/i.test(r.headers.get('content-type') || '')) return { erro: 'não-HTML' };
    // lê no máximo ~400 KB
    const reader = r.body.getReader(); let s = ''; let n = 0; const dec = new TextDecoder();
    while (n < 400000) { const { done, value } = await reader.read(); if (done) break; n += value.length; s += dec.decode(value, { stream: true }); }
    try { reader.cancel(); } catch {}
    if (BLOQUEIO.test(s.slice(0, 5000))) return { bloqueado: 'verificação/captcha' };
    return { html: s };
  } finally { clearTimeout(t); }
}

async function pool(itens, n, fn) {
  let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < itens.length) { const x = itens[i++]; await fn(x); } }));
}

// cache: Map normLink -> { lide, link_original }
async function preencherLides(noticias, cache, { concorrencia = 8, timeoutMs = 8000, orcamentoMs = 100000 } = {}, normLink) {
  const st = { total: noticias.length, cache: 0, feed: 0, buscados: 0, ok: 0, bloqueados: 0, erros: 0, sem: 0, sem_tempo: 0 };
  const inicio = Date.now();
  await pool(noticias, concorrencia, async (n) => {
    if (n.sem_busca_lide) return; // itens da API da Câmara: a ementa já é o resumo (o site exige captcha)
    const c = cache.get(normLink(n.link));
    if (c && c.lide) { n.lide = c.lide; if (c.link_original && !n.link_original) n.link_original = c.link_original; n.lide_origem = 'cache'; st.cache++; return; }
    if (Date.now() - inicio > orcamentoMs) { st.sem_tempo++; return; }
    try {
      if (!n.link_original && /news\.google\.com/.test(n.link)) {
        const o = c && c.link_original ? c.link_original : await resolverGoogleNews(n.link).catch(() => null);
        if (o) n.link_original = o;
      }
      const alvo = n.link_original || (!/news\.google\.com/.test(n.link) ? n.link : null);
      if (alvo) {
        st.buscados++;
        const r = await baixarHtml(alvo, timeoutMs).catch((e) => ({ erro: e.name === 'AbortError' ? 'timeout' : String(e.message || e) }));
        if (r.bloqueado) { st.bloqueados++; n.lide_status = 'bloqueado: ' + r.bloqueado; }
        else if (r.erro) { st.erros++; n.lide_status = r.erro; }
        else { const l = extrair(r.html, n.titulo); if (l) { n.lide = l; n.lide_origem = 'pagina'; st.ok++; } }
      }
      if (!n.lide && n.resumo_feed && n.resumo_feed.length >= 60 && n.resumo_feed.toLowerCase() !== n.titulo.toLowerCase()) { n.lide = cortar(n.resumo_feed); n.lide_origem = 'feed'; st.feed++; }
    } catch (e) { st.erros++; n.lide_status = String(e.message || e); }
  });
  st.sem = noticias.filter((n) => !n.lide).length;
  return st;
}
module.exports = { preencherLides, extrair };
