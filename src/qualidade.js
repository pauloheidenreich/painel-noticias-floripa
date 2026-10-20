'use strict';
// Descarta itens que não são notícia e itens de outras cidades.
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Fontes/domínios que publicam páginas de serviço, rotas ou listagens, não notícias.
const FONTES_BLOQUEADAS = [
  'moovit', 'onibus.info', 'horariodeonibus', 'itinerario', 'rome2rio', 'busbud', 'clickbus', 'quicobus',
  'qconcursos', 'gran cursos', 'grancursos', 'estrategia concursos', 'direcao concursos', 'jc concursos', 'ache concursos',
  'pci concursos', 'concursossc', 'concursos no brasil', 'folha dirigida', 'concurso hoje', 'apostilas', 'nova concursos',
  'tripadvisor', 'booking', 'viagem e turismo', 'melhores destinos', 'imagem da ilha', 'giro espotivo',
];
// Padrões de título que indicam página de serviço/listagem/guia
const TITULOS_BLOQUEADOS = [
  /de transporte p[uú]blico$/i, /\bhor[aá]rios? (de|do|da|dos) (onibus|ônibus|linha)/i, /^linha \d+/i, /\bitiner[aá]rio\b/i,
  /^guia\b/i, /\bguia (do|de|da|para)\b/i, /\b\d+ (planos|coisas|lugares|praias|restaurantes|cachoeiras|passeios|dicas)\b/i,
  /^(veja|confira) (a )?(lista|programa[cç][aã]o)/i, /\bgabarito\b/i, /\bedital aberto\b/i, /\bapostila\b/i,
  /^v[ií]deos?: jornal do almo[cç]o/i, /^condi[cç][oõ]es das praias/i, /\bprevis[aã]o do tempo\b/i,
];
// Páginas institucionais das fontes oficiais (sem caráter de notícia)
const INSTITUCIONAL = /^(regimento interno|lei org[aâ]nica|secretaria municipal de [\p{L} ]+|vereadores|mesa diretora|comiss[oõ]es|ouvidoria|transpar[eê]ncia|contato|fale conosco|agenda|concursos?|licita[cç][oõ]es|servi[cç]os|in[ií]cio|home|not[ií]cias)$/iu;

const OUTRAS_CIDADES = /\b(Palho[cç]a|S[aã]o Jos[eé]|Bigua[cç]u|Santo Amaro da Imperatriz|Governador Celso Ramos|Ant[oô]nio Carlos|[AÁ]guas Mornas|S[aã]o Pedro de Alc[aâ]ntara|Angelina|Rancho Queimado|Anit[aá]polis|S[aã]o Bonif[aá]cio|Alfredo Wagner|Paulo Lopes|Garopaba|Tijucas|Canelinha|Major Gercino|Nova Trento|Leoberto Leal)\b/;
const FLORIPA_TITULO = /Florian[oó]polis|Floripa|\bCapital\b/;

function motivoDescarte(item, fonte) {
  const fonteTxt = norm(item.fonte + ' ' + (item.link || ''));
  const b = FONTES_BLOQUEADAS.find((f) => fonteTxt.includes(norm(f)));
  if (b) return 'fonte bloqueada: ' + b;
  const t = TITULOS_BLOQUEADOS.find((re) => re.test(item.titulo));
  if (t) return 'título de serviço/listagem: ' + t.source;
  if (fonte && fonte.oficial && INSTITUCIONAL.test(item.titulo.trim())) return 'página institucional';
  // outra cidade citada no título sem citar Florianópolis (ignora "Grande Florianópolis")
  const semGrande = item.titulo.replace(/Grande Florian[oó]polis/gi, '');
  const outra = item.titulo.match(OUTRAS_CIDADES);
  if (outra && !FLORIPA_TITULO.test(semGrande)) return 'outra cidade: ' + outra[1];
  return null;
}
module.exports = { motivoDescarte, OUTRAS_CIDADES };
