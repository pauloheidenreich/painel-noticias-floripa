'use strict';
// Compara a coleta atual com o noticias.json publicado anteriormente.
const URL_ANTERIOR = process.env.PAINEL_ANTERIOR_URL || 'https://pauloheidenreich.github.io/painel-noticias-floripa/noticias.json';

const normLink = (u) => {
  try {
    const x = new URL(u);
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|oc$|fbclid|gclid)/.test(k)) x.searchParams.delete(k);
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + (x.search || '')).toLowerCase();
  } catch { return String(u || '').trim().toLowerCase(); }
};
const normTitulo = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ISO com fuso -03:00 (America/Sao_Paulo, sem horário de verão)
function isoBrasilia(d = new Date()) {
  const l = new Date(d.getTime() - 3 * 3600e3);
  return l.toISOString().replace(/\.\d{3}Z$/, '-03:00');
}

async function carregarAnterior() {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(URL_ANTERIOR + '?t=' + Date.now(), { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!Array.isArray(j.noticias)) throw new Error('formato inesperado');
    return j;
  } catch (e) { console.log('[AVISO] noticias.json anterior indisponível (' + (e.message || e) + '): tudo será tratado como novo.'); return null; }
  finally { clearTimeout(t); }
}

// jaVisto (opcional): memória persistente de entradas; item que já passou pelo painel não é "novo"
function comparar(anterior, noticias, agora, jaVisto = () => false) {
  const links = new Set(), titulos = new Set();
  for (const n of anterior ? anterior.noticias : []) { links.add(normLink(n.link)); titulos.add(normTitulo(n.titulo)); }
  const eAntiga = (n) => links.has(normLink(n.link)) || titulos.has(normTitulo(n.titulo)) || jaVisto(n);
  const novas = noticias.filter((n) => !eAntiga(n));
  let removidas = 0;
  if (anterior) {
    const lk = new Set(noticias.map((n) => normLink(n.link))), tt = new Set(noticias.map((n) => normTitulo(n.titulo)));
    removidas = anterior.noticias.filter((n) => !lk.has(normLink(n.link)) && !tt.has(normTitulo(n.titulo))).length;
  }
  const lim = agora.getTime() - 24 * 3600e3;
  const recente = (n) => n.data && new Date(n.data).getTime() >= lim;
  const out = {
    atualizado_em: isoBrasilia(agora),
    atualizacao_anterior: anterior && anterior.geradoEm ? isoBrasilia(new Date(anterior.geradoEm)) : null,
    primeira_execucao: !anterior,
    total_noticias: noticias.length,
    total_novas: novas.length,
    total_novas_recentes: 0,
    total_novas_antigas: 0,
    novas: novas.map(item),
    novas_recentes: [],
    novas_antigas: [],
    removidas_count: removidas,
  };
  out.novas_recentes = out.novas.filter((x, i) => recente(novas[i]));
  out.novas_antigas = out.novas.filter((x, i) => !recente(novas[i]));
  out.total_novas_recentes = out.novas_recentes.length;
  out.total_novas_antigas = out.novas_antigas.length;
  return out;
}
function item(n) {
  return {
    titulo: n.titulo, link: n.link_original || n.link, link_google_news: n.link_original ? n.link : undefined, fonte: n.fonte,
    data: n.data ? isoBrasilia(new Date(n.data)) : null, entrou_em: n.entrou_em || null,
    bairros: n.bairros.length ? n.bairros : ['Geral/Cidade'], temas: n.temas || [], pontuacao: n.pontos,
    lide: n.lide || null, ...(n.resumo ? { resumo: n.resumo } : {}), ...(n.sem_ementa ? { sem_ementa: true } : {}),
  };
}
module.exports = { carregarAnterior, comparar, normLink, normTitulo, isoBrasilia, URL_ANTERIOR };
