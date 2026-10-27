'use strict';
const fs = require('fs');
const path = require('path');
const FONTES = require('./fontes');
const BAIRROS = require('./bairros');
const { gerarHtml } = require('./html');
const { decodificar } = require('./entidades');
const { avaliar } = require('./politica');
const { carregarAnterior, comparar } = require('./novidades');
const { motivoDescarte, anoAtoAntigo, outraCidadeNoTexto } = require('./qualidade');
const { enriquecer } = require('./ementas');
const { buscarCamara, chaveAto, FONTE: FONTE_CMF } = require('./camara');
const { preencherLides } = require('./lide');
const { temas: temasDe } = require('./temas');
const LOCAIS = require('./locais');
const { normLink, isoBrasilia } = require('./novidades');
const { carregarMemoria, mesclarEntradas, entradaDe, jaVisto, atualizarMemoria } = require('./memoria');
const { verificarColeta, verificarAnterior } = require('./guarda');

const RAIZ = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (painel-floripa prototipo)';
const DIAS_MAX = 30;

function decode(s) {
  if (!s) return '';
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodificar(s);
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

const escN = (n) => esc(norm(n));
const RE_LOCAIS = LOCAIS.map((l) => ({ ...l, re: new RegExp('(^|[^\\p{L}0-9])(' + l.termos.map(escN).join('|') + ')(?![\\p{L}0-9])', 'u') }));
// Classificação final (notícia já confirmada como de Florianópolis): bairros oficiais + locais + regiões
function bairrosDe(texto) {
  // "Centro de Saúde", "Centro Cultural", "Centro Multiuso"... não são o bairro Centro
  texto = texto.replace(/\bCentro(\s+(de|do|da|dos|das))?\s+(?!Florian|Capital|Hist[oó]rico)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+)/gu, 'centro $3');
  const t = norm(texto);
  const achados = new Set();
  for (const { b, re } of REGEX) if (re.test(t)) achados.add(b.nome);
  const regioes = new Set();
  for (const l of RE_LOCAIS) if (l.re.test(t)) { if (l.bairro) achados.add(l.bairro); else regioes.add(l.regiao); }
  // etiqueta de região só quando não há bairro específico
  if (!achados.size) for (const r of regioes) achados.add(r);
  return [...achados];
}

async function main() {
  // dados abertos da Câmara (só com CMF_TOKEN): roda em paralelo com os feeds; nunca derruba a coleta
  const pCamara = buscarCamara({ log: console.log }).catch((e) => ({ itens: [], st: { ativo: true, erro: 'falha inesperada' } }));
  const carga = await carregarAnterior();
  const semAnterior = verificarAnterior(carga);
  if (semAnterior) { console.error('Publicação cancelada: ' + semAnterior); process.exit(1); }
  const anterior = carga.anterior;
  const relatorio = [];
  const todas = new Map();
  const rejeitadas = []; const descartadas = []; let totalFloripa = 0;
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
        // Google News: o resumo traz manchetes de outras matérias, então avalia só o título
        // Google News: título termina com " - Veículo"
        const titulo = it.origem ? it.titulo.replace(new RegExp('\\s+-\\s+' + esc(it.origem) + '$'), '') : it.titulo;
        let fonteNome = f.nome;
        if (f.agregador && it.origem) fonteNome = it.origem + ' (via Google News)';
        else if (f.oficial) fonteNome = f.nome + ' (via Google News)';
        const desc = motivoDescarte({ titulo, fonte: fonteNome + ' ' + (it.origem || ''), link: it.link }, f);
        if (desc) { descartadas.push({ titulo, fonte: fonteNome, motivo: desc }); continue; }
        const pol = avaliar(titulo, f.url.includes('news.google.com') ? '' : it.resumo + ' . ' + it.categorias.join(' . '), f);
        if (!pol.aceito) { rejeitadas.push({ titulo, fonte: f.nome, pontos: pol.pontos, motivo: pol.motivo }); totalFloripa++; continue; }
        totalFloripa++;
        const chave = titulo.toLowerCase().replace(/\W+/g, '');
        if (todas.has(chave)) continue;
        todas.set(chave, { titulo, link: it.link, fonte: fonteNome, data: isNaN(d) ? null : d.toISOString(), bairros: c.bairros, pontos: pol.pontos, motivo: pol.motivo, ...(f.url.includes('news.google.com') ? {} : { resumo_feed: it.resumo }) });
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
  if (!noticias.length) { console.error('Nenhuma notícia coletada: mantendo arquivos anteriores.'); process.exit(1); }
  const ementas = await enriquecer(noticias);
  console.log(`Atos só com número: ${ementas.candidatos} · link original resolvido: ${ementas.link_resolvido} · com resumo: ${ementas.com_resumo} · sem ementa: ${ementas.sem_ementa} (captcha no site da Câmara: ${ementas.captcha})`);
  const cmf = await pCamara;
  const cst = cmf.st; cst.ementas_preenchidas = 0; cst.adicionados = 0; cst.duplicados = 0; cst.descartados = 0;
  if (cst.ativo) {
    const porChave = new Map(cmf.itens.filter((x) => x.chave && x.ementa).map((x) => [x.chave, x]));
    // 1) ementas para atos da Câmara vindos do Google News
    for (const n of noticias) {
      const k = chaveAto(n.titulo); const x = k && porChave.get(k);
      if (!x) continue;
      if (!n.resumo || n.sem_ementa) { n.resumo = x.ementa; cst.ementas_preenchidas++; }
      delete n.sem_ementa; n.ementa_cmf = true;
      if (x.autoria) n.autoria = x.autoria;
      if (!n.link_original && x.link) n.link_original = x.link;
    }
    // 2) proposições/normas recentes como itens próprios (dedup por tipo+número+ano e por título)
    const chavesExist = new Set(noticias.map((n) => chaveAto(n.titulo)).filter(Boolean));
    const MAX_CMF = 25; // limite de itens próprios da API por coleta (mais recentes), para não abafar o noticiário
    for (const x of cmf.itens) {
      if (cst.adicionados >= MAX_CMF) { cst.excedentes = (cst.excedentes || 0) + 1; continue; }
      if (x.honraria) { descartadas.push({ titulo: x.titulo, fonte: FONTE_CMF, motivo: 'honraria/homenagem' }); cst.descartados++; continue; }
      if ((x.chave && chavesExist.has(x.chave)) || todas.has(x.titulo.toLowerCase().replace(/\W+/g, ''))) { cst.duplicados++; continue; }
      const desc = motivoDescarte({ titulo: x.titulo, fonte: FONTE_CMF, link: x.link }, { oficial: true });
      if (desc) { descartadas.push({ titulo: x.titulo, fonte: FONTE_CMF, motivo: desc }); cst.descartados++; continue; }
      const pol = avaliar(x.titulo, x.ementa, { oficial: true });
      noticias.push({ titulo: x.titulo, link: x.link, fonte: FONTE_CMF, data: x.data, bairros: [], pontos: pol.pontos, motivo: pol.motivo, resumo: x.ementa || null, ...(x.ementa ? {} : { sem_ementa: true }), autoria: x.autoria, sem_busca_lide: true });
      if (x.chave) chavesExist.add(x.chave); cst.adicionados++;
    }
    noticias.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    relatorio.push({ fonte: FONTE_CMF, url: 'https://www.cmf.sc.gov.br/jsonweb/ (API de dados abertos)', status: cst.erro && !cmf.itens.length ? 'falhou' : 'ok', itens: cmf.itens.length, floripa: cst.adicionados, ...(cst.erro ? { erro: cst.erro } : {}) });
    console.log(`Câmara (dados abertos): ${cst.chamadas} chamadas em ${cst.tempo_s}s, ${cmf.itens.length} itens recentes, ${cst.adicionados} adicionados, ${cst.duplicados} duplicados, ${cst.descartados} descartados (honrarias/denominações/filtros), ${cst.excedentes || 0} acima do limite, ${cst.ementas_preenchidas} ementas preenchidas${cst.erro ? ' · erro: ' + cst.erro : ''}`);
  } else console.log('Câmara (dados abertos): sem CMF_TOKEN, ignorada');
  console.log(`Descartados por qualidade: ${descartadas.length}`);
  // cache (lide/link original) herdado da publicação anterior; data de entrada pela memória persistente
  const cache = new Map();
  for (const a of (anterior && anterior.noticias) || []) cache.set(normLink(a.link), { lide: a.lide, link_original: a.link_original });
  const memoria = carregarMemoria(anterior);
  // restauração pontual (ex.: datas perdidas em 26/10/2026): absorvida em `entradas` na próxima publicação; depois pode ser apagada
  const arqRestauro = path.join(RAIZ, 'entradas-restauradas.json');
  if (fs.existsSync(arqRestauro)) { const r = JSON.parse(fs.readFileSync(arqRestauro, 'utf8')); mesclarEntradas(memoria, r.entradas || r); console.log(`Entradas restauradas mescladas: ${Object.keys(r.entradas || r).length} chaves`); }
  console.log(`Memória de entradas: ${memoria.size} chaves` + (anterior && !anterior.entradas ? ' (semeada da publicação anterior)' : ''));
  const t0 = Date.now();
  const lides = await preencherLides(noticias, cache, { concorrencia: 8, timeoutMs: 8000, orcamentoMs: Number(process.env.LIDE_ORCAMENTO_MS) || 100000 }, normLink);
  console.log(`Lides: ${noticias.length - lides.sem}/${noticias.length} (cache ${lides.cache}, página ${lides.ok}, feed ${lides.feed}; bloqueados ${lides.bloqueados}, erros ${lides.erros}, sem tempo ${lides.sem_tempo}) em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const agoraIso = isoBrasilia(new Date());
  // descarte pós-enriquecimento: ato antigo (ano só no link original/ementa) e notícia só de outra cidade (pelo lide)
  for (let i = noticias.length - 1; i >= 0; i--) {
    const n = noticias[i]; const oficial = /^(Prefeitura|Câmara Municipal) de Florianópolis/.test(n.fonte) || n.fonte === FONTE_CMF;
    const ano = anoAtoAntigo(n.titulo, n.link_original) || (n.ano_do_ato && n.ano_do_ato < Number(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 4)) - 1 ? n.ano_do_ato : null);
    const m = ano ? 'ato legislativo antigo: ' + ano : oficial ? null : outraCidadeNoTexto(n);
    if (m) { descartadas.push({ titulo: n.titulo, fonte: n.fonte, motivo: m }); noticias.splice(i, 1); }
  }
  console.log(`Descartados após lide: ${descartadas.length} no total por qualidade`);
  const geralAntes = noticias.filter((n) => !n.bairros.length).length;
  for (const n of noticias) {
    const texto = [n.titulo, n.resumo_feed, n.lide, n.resumo].filter(Boolean).join(' . ');
    n.bairros = bairrosDe(texto);
    n.temas = temasDe(texto);
    n.entrou_em = entradaDe(memoria, n) || agoraIso;
    delete n.resumo_feed; delete n.sem_busca_lide;
  }
  const geralDepois = noticias.filter((n) => !n.bairros.length).length;
  console.log(`Geral/Cidade: antes ${geralAntes}/${noticias.length} (${(100 * geralAntes / noticias.length).toFixed(0)}%), depois ${geralDepois}/${noticias.length} (${(100 * geralDepois / noticias.length).toFixed(0)}%)`);
  const contTemas = {}; for (const n of noticias) for (const t of n.temas.length ? n.temas : ['(sem tema)']) contTemas[t] = (contTemas[t] || 0) + 1;
  console.log('Temas:', JSON.stringify(contTemas));
  const qualidade = { camara: { ativo: cst.ativo, chamadas: cst.chamadas, itens: cmf.itens.length, adicionados: cst.adicionados, ementas_preenchidas: cst.ementas_preenchidas, erro: cst.erro || null }, lides, geral_antes: geralAntes, geral_depois: geralDepois, temas: contTemas };
  const grupos = {};
  for (const n of noticias) for (const b of n.bairros.length ? n.bairros : ['Geral/Cidade']) (grupos[b] ||= []).push(n);
  const geradoEm = new Date();
  // guarda: feed falhou ou total caiu demais → não publica (o site anterior continua no ar)
  const bloqueio = verificarColeta({ relatorio, total: noticias.length, anterior, fontes: FONTES, agora: geradoEm });
  if (bloqueio) { console.error('Coleta degradada, publicação cancelada: ' + bloqueio); process.exit(1); }
  const novidades = comparar(anterior, noticias, geradoEm, jaVisto(memoria));
  const entradas = atualizarMemoria(memoria, noticias, geradoEm);
  const chavesNovas = new Set(novidades.novas.map((n) => n.link));
  for (const n of noticias) n.nova = chavesNovas.has(n.link);
  fs.writeFileSync(path.join(RAIZ, 'novidades.json'), JSON.stringify(novidades, null, 2));
  // histórico simples: acrescenta um resumo por execução (mantém as últimas 200), herdado do publicado
  const historico = ((anterior && anterior.historico) || []).concat([{ atualizado_em: novidades.atualizado_em, total_noticias: novidades.total_noticias, total_novas: novidades.total_novas, removidas_count: novidades.removidas_count }]).slice(-200);
  fs.writeFileSync(path.join(RAIZ, 'noticias.json'), JSON.stringify({ geradoEm, relatorio, totalFloripa, ementas, qualidade, noticias, rejeitadas, descartadas, historico, entradas }, null, 2));
  fs.writeFileSync(path.join(RAIZ, 'index.html'), gerarHtml({ novidades, noticias, grupos, relatorio, geradoEm, total: noticias.length, bairros: BAIRROS.map((b) => b.nome) }));
  console.log(`\n${totalFloripa} itens de Florianópolis (antes da dedup.), ${rejeitadas.length} rejeitados pelo filtro político; ${noticias.length} notícias políticas. Por bairro:`);
  for (const [b, l] of Object.entries(grupos).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${b}: ${l.length}`);
  console.log(`\nNovidades: ${novidades.total_novas} novas, ${novidades.removidas_count} removidas` + (novidades.primeira_execucao ? ' (primeira execução)' : ` desde ${novidades.atualizacao_anterior}`));
  console.log('\nGerado: ' + path.join(RAIZ, 'index.html') + ' e novidades.json');
}
main().catch((e) => { console.error(e); process.exit(1); });
