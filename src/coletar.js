'use strict';
const fs = require('fs');
const path = require('path');
const FONTES = require('./fontes');
const BAIRROS = require('./bairros');
const { gerarHtml } = require('./html');

const RAIZ = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (painel-floripa prototipo)';
const DIAS_MAX = 30;

function decode(s) {
  if (!s) return '';
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = s.replace(/<[^>]+>/g, ' ');
  const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  s = s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ent[e.toLowerCase()] ?? m;
  });
  return s.replace(/\s+/g, ' ').trim();
}
const tag = (xml, t) => { const m = xml.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>', 'i')); return m ? m[1] : ''; };

function parseRss(xml) {
  const itens = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const x = m[0];
    itens.push({
      titulo: decode(tag(x, 'title')),
      link: decode(tag(x, 'link')),
      data: decode(tag(x, 'pubDate')) || decode(tag(x, 'dc:date')),
      resumo: decode(tag(x, 'description')).slice(0, 600),
      categorias: [...x.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((c) => decode(c[1])),
      origem: decode(tag(x, 'source')),
    });
  }
  return itens;
}

async function baixar(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const REGEX = BAIRROS.map((b) => ({
  b,
  // sensível a maiúsculas (nomes próprios), insensível a acentos
  re: new RegExp('(^|[^\\p{L}])(' + [b.nome, ...b.aliases].map((n) => esc(norm(n))).join('|') + ')(?![\\p{L}])', 'u'),
}));
const RE_FLORIPA = /Florian[oó]polis|Floripa|\bCapital catarinense|\bIlha de Santa Catarina/i;
const RE_OUTRA_CIDADE = /\b(S[aã]o Jos[eé]|Palho[cç]a|Bigua[cç]u|Joinville|Blumenau|Itaja[ií]|Crici[uú]ma|Chapec[oó]|Lages|Balne[aá]rio Cambori[uú]|Penha|Tubar[aã]o|Itapema|Bombinhas|Governador Celso Ramos)\b/;

function classificar(it, fonte) {
  const texto = it.titulo + ' . ' + it.resumo + ' . ' + it.categorias.join(' . ');
  const t = norm(texto);
  const citaFloripa = RE_FLORIPA.test(texto) || fonte.oficial || it.categorias.some((c) => /florian/i.test(c));
  const achados = [];
  for (const { b, re } of REGEX) {
    if (!re.test(t)) continue;
    if (b.ambiguo && !citaFloripa) continue;
    achados.push(b.nome);
  }
  // remove "Centro"/genéricos quando há bairro mais específico? mantém todos (notícia pode aparecer em vários)
  const ehFloripa = citaFloripa || (achados.length > 0 && !RE_OUTRA_CIDADE.test(texto));
  return { ehFloripa, bairros: achados };
}

async function main() {
  const relatorio = [];
  const todas = new Map();
  const limite = Date.now() - DIAS_MAX * 864e5;
  for (const f of FONTES) {
    try {
      const itens = parseRss(await baixar(f.url));
      let ok = 0;
      for (const it of itens) {
        if (!it.titulo || !it.link) continue;
        const d = new Date(it.data);
        if (!isNaN(d) && d.getTime() < limite) continue;
        const c = classificar(it, f);
        if (!c.ehFloripa) continue;
        let fonteNome = f.nome;
        if (f.agregador && it.origem) fonteNome = it.origem + ' (via Google News)';
        else if (f.oficial) fonteNome = f.nome + ' (via Google News)';
        // Google News: título termina com " - Veículo"
        const titulo = it.origem ? it.titulo.replace(new RegExp('\\s+-\\s+' + esc(it.origem) + '$'), '') : it.titulo;
        const chave = titulo.toLowerCase().replace(/\W+/g, '');
        if (todas.has(chave)) continue;
        todas.set(chave, { titulo, link: it.link, fonte: fonteNome, data: isNaN(d) ? null : d.toISOString(), bairros: c.bairros });
        ok++;
      }
      relatorio.push({ fonte: f.nome, url: f.url, status: 'ok', itens: itens.length, floripa: ok });
      console.log(`[OK]    ${f.nome}: ${itens.length} itens, ${ok} de Florianópolis`);
    } catch (e) {
      relatorio.push({ fonte: f.nome, url: f.url, status: 'falhou', erro: String(e.message || e) });
      console.log(`[FALHA] ${f.nome}: ${e.message || e}`);
    }
  }
  const noticias = [...todas.values()].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const grupos = {};
  for (const n of noticias) for (const b of n.bairros.length ? n.bairros : ['Geral/Cidade']) (grupos[b] ||= []).push(n);
  const geradoEm = new Date();
  fs.writeFileSync(path.join(RAIZ, 'noticias.json'), JSON.stringify({ geradoEm, relatorio, noticias }, null, 2));
  fs.writeFileSync(path.join(RAIZ, 'index.html'), gerarHtml({ grupos, relatorio, geradoEm, total: noticias.length, bairros: BAIRROS.map((b) => b.nome) }));
  console.log(`\n${noticias.length} notícias de Florianópolis. Por bairro:`);
  for (const [b, l] of Object.entries(grupos).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${b}: ${l.length}`);
  console.log('\nGerado: ' + path.join(RAIZ, 'index.html'));
}
main().catch((e) => { console.error(e); process.exit(1); });
