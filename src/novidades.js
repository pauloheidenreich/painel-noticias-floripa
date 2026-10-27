'use strict';
// Compara a coleta atual com o noticias.json publicado anteriormente.
// Fontes da publicação anterior, em ordem: domínio próprio (sem o 301 do github.io) e o endereço github.io.
// PAINEL_ANTERIOR_URL aceita uma ou mais URLs separadas por vírgula.
const URLS_ANTERIOR = (process.env.PAINEL_ANTERIOR_URL || 'https://painel-floripa.com.br/noticias.json,https://pauloheidenreich.github.io/painel-noticias-floripa/noticias.json')
  .split(',').map((u) => u.trim()).filter(Boolean);
const URL_ANTERIOR = URLS_ANTERIOR[0];

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

// Baixa a publicação anterior com novas tentativas (HTTP 5xx/timeout do Pages são passageiros).
// Retorna { anterior, erro }: anterior = null e erro preenchido se nenhuma URL respondeu em nenhuma tentativa.
// Quem chama decide o que fazer; o coletor NÃO publica sem a anterior (ver verificarAnterior em guarda.js).
async function carregarAnterior({ urls = URLS_ANTERIOR, tentativas = 3, esperaMs = 5000, timeoutMs = 20000, fetchImpl = fetch, log = console.log } = {}) {
  const erros = [];
  for (let i = 1; i <= tentativas; i++) {
    for (const url of urls) {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetchImpl(url + '?t=' + Date.now(), { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' }, redirect: 'follow' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (!j || !Array.isArray(j.noticias)) throw new Error('formato inesperado');
        if (erros.length) log(`noticias.json anterior obtido de ${url} na tentativa ${i} (antes: ${erros.join('; ')})`);
        return { anterior: j, erro: null };
      } catch (e) {
        erros.push(`${url} #${i}: ${e.name === 'AbortError' ? 'timeout' : (e.message || e)}`);
      } finally { clearTimeout(t); }
    }
    if (i < tentativas && esperaMs > 0) await new Promise((res) => setTimeout(res, esperaMs * i));
  }
  const erro = erros.join('; ');
  log('[AVISO] noticias.json anterior indisponível: ' + erro);
  return { anterior: null, erro };
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
module.exports = { carregarAnterior, comparar, normLink, normTitulo, isoBrasilia, URL_ANTERIOR, URLS_ANTERIOR };
