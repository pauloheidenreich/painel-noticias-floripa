'use strict';
// Dados abertos da Câmara Municipal de Florianópolis (cmf.sc.gov.br/jsonweb).
// Só roda com process.env.CMF_TOKEN. O token NUNCA vai para logs, erros, JSON ou HTML:
// a URL com o token só existe dentro de chamar() e toda mensagem de erro passa por mascarar().
const BASE = 'https://www.cmf.sc.gov.br/jsonweb/web-aplicativo.php';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json,text/html,*/*', 'Accept-Language': 'pt-BR',
};
const FONTE = 'Câmara (dados abertos)';
// [serviço, tipo] — proposições e normas principais (indicações/requerimentos ficam de fora: ~50 por página, abafariam o painel)
const CONSULTAS = [
  ['proposicoes', 'Projetos-de-Leis-ordinarias'], ['proposicoes', 'Projetos-de-Leis-Complementares'],
  ['proposicoes', 'Projetos-de-Resolucoes'], ['proposicoes', 'Projetos-de-Decretos-Legislativos'],
  ['legislacoes', 'Leis-ordinarias'], ['legislacoes', 'Leis-Complementares'],
  ['legislacoes', 'Resolucoes'], ['legislacoes', 'Decretos-Legislativos'],
];
// homenagens/honrarias: fora do painel político
// também denominação de ruas/servidões (atos de rotina, sem relevância política)
const HONRARIA = /\b(denomina|medalha|diploma|t[ií]tulo de cidad[aã]|cidad[aã]o honor[aá]rio|utilidade p[uú]blica|comenda|voto de (louvor|congratula|pesar)|honra ao m[eé]rito)\b/i;

const mascarar = (s, token) => {
  let t = String(s ?? '');
  if (token) for (const v of [token, encodeURIComponent(token)]) t = t.split(v).join('***');
  return t.replace(/keysoft=[^&\s"']*/gi, 'keysoft=***');
};
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const limpa = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

// chave tipo+número+ano, igual para "LEI Nº 9299/2013", "LEI N. 11.452, DE 01 DE SETEMBRO DE 2025." e "PROJETO DE LEI N.º 20086/2026"
function chaveAto(titulo) {
  const t = norm(titulo).replace(/\bCMF\b/g, ' ').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.*?)\s+N[º°O.]*\s*\.?\s*([\d.]+)\s*(?:\/\s*(\d{4})|,?\s*DE\s+\d{1,2}\s+DE\s+[A-Z]+\s+DE\s+(\d{4}))/);
  if (!m) return null;
  const tipo = m[1].replace(/[^A-Z ]/g, '').trim();
  const cat = /^PROJETO DE LEI COMPLEMENTAR/.test(tipo) ? 'PLC' : /^PROJETO DE LEI/.test(tipo) ? 'PL'
    : /^PROJETO DE RESOLUCAO/.test(tipo) ? 'PR' : /^PROJETO DE DECRETO/.test(tipo) ? 'PDL'
    : /^LEI COMPLEMENTAR/.test(tipo) ? 'LC' : /^LEI/.test(tipo) ? 'LEI' : /^RESOLUCAO/.test(tipo) ? 'RES'
    : /^DECRETO LEGISLATIVO/.test(tipo) ? 'DL' : /^DECRETO/.test(tipo) ? 'DEC' : tipo;
  return `${cat}:${Number(m[2].replace(/\./g, ''))}:${m[3] || m[4]}`;
}
// "2026-10-21 10:42:30" (horário de Brasília) -> ISO UTC
const dataIso = (s) => { const d = new Date(String(s || '').replace(' ', 'T') + '-03:00'); return isNaN(d) ? null : d.toISOString(); };

async function buscarCamara({ dias = 30, orcamentoMs = 180000, intervaloMs = 5000, paginasMax = 2, log = console.log } = {}) {
  const token = process.env.CMF_TOKEN;
  const st = { ativo: !!token, chamadas: 0, falhas: 0, itens: 0, honrarias: 0, erro: null };
  const itens = [];
  if (!token) return { itens, st };
  const inicio = Date.now(); const limite = Date.now() - dias * 864e5; let ultima = 0;
  async function chamar(servico, params) {
    const u = BASE + '?' + new URLSearchParams({ keysoft: token, call: servico, ...params });
    for (let tent = 0; tent < 3; tent++) {
      const w = ultima + intervaloMs - Date.now(); if (w > 0) await espera(w);
      if (Date.now() - inicio > orcamentoMs) throw new Error('orçamento de tempo esgotado');
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 30000);
      try {
        st.chamadas++;
        const r = await fetch(u, { headers: HEADERS, signal: ctrl.signal });
        ultima = Date.now();
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const corpo = await r.text();
        if (!corpo.trim()) throw new Error('resposta vazia');
        const d = JSON.parse(corpo);
        return Array.isArray(d) ? d : (Object.values(d || {}).find(Array.isArray) || []);
      } catch (e) {
        ultima = Date.now(); st.falhas++;
        if (tent === 2) throw new Error(mascarar(e.name === 'AbortError' ? 'timeout' : (e.message || e), token));
        await espera(5000 * (tent + 1));
      } finally { clearTimeout(to); }
    }
  }
  try {
    for (const [servico, tipo] of CONSULTAS) {
      for (let p = 1; p <= paginasMax; p++) {
        let lista;
        try { lista = await chamar(servico, { tipo, pagina: String(p) }); }
        catch (e) { const m = mascarar(e.message, token); log(`  [Câmara] ${tipo} p.${p}: ${m}`); if (/orçamento/.test(m)) throw e; break; }
        if (!lista.length) break;
        let antigos = 0;
        for (const x of lista) {
          const data = dataIso(x.data);
          if (!data || new Date(data).getTime() < limite) { antigos++; continue; }
          const titulo = limpa(x.titulo); const ementa = limpa(x.ementa);
          if (!titulo) continue;
          itens.push({ titulo, ementa, autoria: limpa(x.autoria) || null, data, link: limpa(x.link).replace(/#.*$/, ''), chave: chaveAto(titulo), tipo_api: tipo, honraria: HONRARIA.test(ementa) });
        }
        if (antigos) break; // páginas vêm do mais novo ao mais antigo
      }
    }
  } catch (e) { st.erro = mascarar(e.message || e, token); }
  st.itens = itens.length; st.honrarias = itens.filter((i) => i.honraria).length;
  st.tempo_s = Math.round((Date.now() - inicio) / 1000);
  return { itens, st };
}
module.exports = { buscarCamara, chaveAto, mascarar, FONTE, HONRARIA };
