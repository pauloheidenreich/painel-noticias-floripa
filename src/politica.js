'use strict';
// Filtro de relevância política: pontua o texto com palavras-chave ponderadas.
// Fontes oficiais (Prefeitura/Câmara) sempre entram.
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// termos curtos (siglas) exigem fronteira no fim; os demais casam por prefixo (ex.: 'licitac' -> licitação)
const CURTOS = new Set(['sus', 'iss', 'ldo', 'loa', 'upa', 'tce', 'cpi', 'stf', 'ppp', 'nei', 'lei', 'leis', 'iptu', 'mpsc', 'pt', 'pl', 'psol']);
const T = (peso, ...termos) => termos.map((t) => { const n = norm(t).trim(); return [peso, new RegExp('(^|[^a-z0-9])(' + n + ')' + (CURTOS.has(n) ? '(?![a-z])' : ''), '')]; });

const POSITIVOS = [
  // atores do poder público (forte)
  ...T(3, 'prefeitura', 'prefeito', 'prefeita', 'vice-prefeito', 'secretaria municipal', 'secretario municipal', 'secretaria de estado',
    'camara municipal', 'camara de florianopolis', 'camara da capital', 'vereador', 'vereadora', 'deputad', 'alesc', 'assembleia legislativa',
    'governo do estado', 'governador', 'governadora', 'jorginho mello', 'topazio', 'tce', 'tribunal de contas', 'governo de sc', 'governo de santa catarina', 'lula', 'bolsonaro', 'boulos', 'motociata', 'ato em apoio', 'ato a favor', 'reeleic', 'turno', '6x1', '6×1',
    'tribunal regional eleitoral', 'tre-sc', 'cpi', 'senador', 'senadora', 'congresso nacional', 'governo federal', 'ministerio d'),
  // atos e instrumentos (forte)
  ...T(3, 'projeto de lei', 'sancion', 'decreto', 'plano diretor', 'licitac', 'orcamento', 'ldo', 'loa', 'audiencia publica',
    'concessao', 'parceria publico', 'ppp', 'eleic', 'eleitor', 'candidat', 'partido', 'mandato', 'impeachment',
    'improbidade', 'casan', 'comcap', 'consorcio fenix', 'politica', 'politico', 'ato pro', 'manifestac'),
  ...T(3, 'obras', 'asfalto', 'pavimenta', 'mobilidade', 'planmob', 'transporte publico', 'ponto de onibus', 'rede municipal', 'creche', 'iluminacao publica', 'vacinac', 'zona azul', 'centro de saude', 'mpsc', 'gaeco', 'concurso publico', 'selecao emergencial', 'processo seletivo', 'concurso camara', 'aquaviario', 'ambulante', 'ouvir moradores', 'sessao plenaria', 'pt', 'pl', 'psol'),
  ...T(2, 'ministerio publico', 'ufsc', 'obras', 'ampliacao', 'duplicac', 'transporte', 'saude publica'),
  ...T(1, 'obra '),
  // temas de gestão pública (médio)
  ...T(2, 'lei ', 'leis ', 'reforma do', 'pavimenta', 'asfalto', 'licenca', 'fiscaliza', 'servico publico', 'servidores',
    'greve', 'transporte coletivo', 'tarifa', 'onibus', 'mobilidade', 'saneamento', 'esgoto', 'abastecimento', 'coleta de lixo', 'residuos',
    'posto de saude', 'centro de saude', 'upa', 'hospital', 'sus', 'vacina', 'escola municipal', 'rede municipal', 'creche', 'nei ',
    'educacao', 'contrato', 'verba', 'recursos', 'investimento publico', 'financiamento', 'imposto', 'iptu', 'iss', 'taxa', 'concurso', 'fiscalizac',
    'regulariza', 'zoneamento', 'ambulante', 'edital', 'aprova', 'votac', 'comissao', 'defensoria', 'justica', 'stf', 'tribunal',
    'guarda municipal', 'policia militar', 'seguranca publica', 'defesa civil', 'floram', 'ipuf', 'sesp', 'detran', 'ponte hercilio luz',
    'governo', 'municipio', 'publico', 'publica', 'moradores cobram', 'protesto', 'denuncia', 'plano municipal', 'programa municipal'),
];
// assuntos tipicamente não políticos
const NEGATIVOS = T(-3, 'ironman', 'futebol', 'avai', 'figueirense', 'campeonato', 'show', 'festival', 'festa', 'gastronom', 'restaurante',
  'previsao do tempo', 'frente fria', 'chuva', 'calor', 'temperatura', 'ciclone', 'celebridade', 'famoso', 'bbb', 'novela', 'cantor',
  'atriz', 'ator ', 'golfinho', 'baleia', 'surf', 'praia lotada', 'turistas', 'acidente', 'colisao', 'capotamento', 'morre', 'morto',
  'assassin', 'homicidio', 'esfaque', 'baleado', 'roubo', 'furto', 'trafico', 'preso', 'presa ', 'prisao', 'tour', 'imoveis', 'aluguel',
  'mercado imobiliario', 'casa irada', 'beach club', 'receita', 'horoscopo', 'loteria', 'mega-sena', 'inflacao', 'custo de vida', 'teatro', 'livro', 'feirao', 'seminovos', 'carnaval', 'cinema', 'mostra de', 'exposic', 'artista', 'mandado', 'operacao', 'denunciado', 'fugiu', 'delegacia');
// termos fortes que "salvam" mesmo com negativo (ação do poder público)
const FORTES = POSITIVOS.filter(([p]) => p >= 3);
const LIMIAR = 4;

const CRIME = T(1, 'preso', 'prisao', 'fugiu', 'foragido', 'delegacia', 'homicidio', 'assassin', 'baleado', 'esfaque', 'trafico', 'roubo', 'furto', 'apreende', 'mandado');

// titulo: obrigatório; resto: resumo/categorias (opcional). Um termo forte precisa estar no título.
function avaliar(titulo, resto = '', fonte) {
  if (fonte && fonte.oficial) return { aceito: true, pontos: 99, motivo: 'fonte oficial' };
  const tt = ' ' + norm(titulo) + ' ';
  const t = ' ' + norm(titulo + ' . ' + resto) + ' ';
  // crime comum com 2+ marcadores no título: fora, salvo se envolver político/eleição/contas públicas
  const crimes = CRIME.filter(([, re]) => re.test(tt)).length;
  const politico = /(^|[^a-z])(prefeit|vereador|deputad|candidat|governador|secretari|servidor|licitac|desvio|corrupc|improbidade)/.test(tt);
  if (crimes >= 2 && !politico) return { aceito: false, pontos: -9, motivo: 'crime comum' };
  let pontos = 0; const hits = [];
  for (const [p, re] of POSITIVOS) if (re.test(t)) { pontos += p; hits.push(re.source.split('(')[2].slice(0, -1)); }
  const temForte = FORTES.some(([, re]) => re.test(tt));
  for (const [p, re] of NEGATIVOS) if (re.test(t)) { pontos += temForte ? -2 : p; hits.push('-' + re.source.split('(')[2].slice(0, -1)); }
  return { aceito: temForte ? pontos >= 3 : pontos >= LIMIAR + 1, pontos, motivo: hits.join(',') };
}
module.exports = { avaliar, LIMIAR };
