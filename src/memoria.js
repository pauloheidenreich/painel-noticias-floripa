'use strict';
// Memória persistente de entradas: chave (link/título normalizados) -> primeira vez no painel (entrou_em).
// Gravada em noticias.json → `entradas`, para que uma notícia que some de uma coleta e volta depois
// (feed incompleto, HTTP 503...) mantenha a data de entrada original e não reapareça como "nova".
const { normLink, normTitulo, isoBrasilia } = require('./novidades');

const DIAS_MEMORIA = 35;
const chaves = (n) => ['l:' + normLink(n.link), 't:' + normTitulo(n.titulo)];
const ms = (iso) => { const t = new Date(iso).getTime(); return isNaN(t) ? null : t; };

// guarda sempre a data mais antiga
function anotar(mem, k, iso) {
  if (!iso || ms(iso) == null) return;
  const atual = mem.get(k);
  if (!atual || ms(iso) < ms(atual)) mem.set(k, iso);
}

// Memória a partir da publicação anterior: `entradas` + itens publicados (primeira execução: só os itens).
function carregarMemoria(anterior) {
  const mem = new Map();
  if (!anterior) return mem;
  if (anterior.entradas && typeof anterior.entradas === 'object') for (const [k, v] of Object.entries(anterior.entradas)) anotar(mem, k, v);
  const fallback = anterior.geradoEm ? isoBrasilia(new Date(anterior.geradoEm)) : null;
  for (const a of anterior.noticias || []) { const e = a.entrou_em || fallback; for (const k of chaves(a)) anotar(mem, k, e); }
  return mem;
}

const entradaDe = (mem, n) => { const [l, t] = chaves(n); return mem.get(l) || mem.get(t) || null; };
const jaVisto = (mem) => (n) => entradaDe(mem, n) != null;

// Nova memória: anterior + itens atuais; descarta chaves com mais de DIAS_MEMORIA dias (exceto as dos itens atuais).
function atualizarMemoria(mem, noticias, agora = new Date()) {
  const nova = new Map(mem);
  const atuais = new Set();
  for (const n of noticias) for (const k of chaves(n)) { atuais.add(k); anotar(nova, k, n.entrou_em); }
  const lim = agora.getTime() - DIAS_MEMORIA * 864e5;
  const out = {};
  for (const [k, v] of nova) if (atuais.has(k) || ms(v) >= lim) out[k] = v;
  return out;
}

module.exports = { DIAS_MEMORIA, carregarMemoria, entradaDe, jaVisto, atualizarMemoria };
