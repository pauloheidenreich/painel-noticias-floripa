'use strict';
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const T = {
  'Saúde': ['saude', 'hospital', 'upa ', 'posto de saude', 'centro de saude', 'vacina', 'medico', 'sus ', 'dengue', 'sarampo', 'cepon', 'hemosc', 'leito', 'atendimento medico', 'enfermag'],
  'Educação': ['educacao', 'escola', 'creche', 'nei ', 'professor', 'aluno', 'estudante', 'matricula', 'ensino', 'ufsc', 'udesc', 'uniedu', 'bolsa de estudo', 'universidade'],
  'Mobilidade': ['onibus', 'transporte', 'mobilidade', 'transito', 'zona azul', 'estacionamento', 'ciclovia', 'ponte', 'terminal', 'planmob', 'aquaviario', 'sc-401', 'sc-405', 'sc-406', 'via expressa', 'tarifa', 'aeroporto', 'motorista', 'pedestre'],
  'Obras e Urbanismo': ['obra', 'pavimenta', 'asfalto', 'plano diretor', 'urbanis', 'reforma', 'construc', 'demolic', 'rodoviaria', 'iluminacao publica', 'calcada', 'praca', 'revitaliza', 'postes', 'zoneamento', 'licenca ambiental', 'ampliacao', 'duplicac'],
  'Saneamento e Meio Ambiente': ['casan', 'comcap', 'esgoto', 'saneamento', 'agua', 'lixo', 'residuo', 'reciclag', 'organicos', 'floram', 'ambiental', 'meio ambiente', 'arvore', 'balneabilidade', 'praia', 'drenagem', 'enchente', 'adutora', 'reservatorio'],
  'Segurança': ['seguranca', 'policia', 'guarda municipal', 'crime', 'violencia', 'bombeiros', 'defesa civil', 'delegad', 'pf ', 'policia federal', 'gaeco'],
  'Contas Públicas e Licitações': ['licitac', 'contrato', 'orcamento', 'ldo', 'loa', 'r$', 'milhoes', 'imposto', 'iptu', 'iss ', 'taxa', 'recursos', 'verba', 'gasto', 'pagamento', 'leilao', 'concessao', 'edital', 'gratificac', 'salario', 'concurso', 'processo seletivo', 'cargos comissionados'],
  'Câmara e Legislação': ['camara', 'vereador', 'vereadora', 'lei ', 'lei n', 'projeto de lei', 'decreto', 'resolucao', 'sessao', 'plenario', 'comissao', 'alesc', 'deputad', 'assembleia', 'sancion', 'legislat', 'emenda', 'regimento'],
  'Controle Externo (TCE/MPSC/Justiça)': ['tce', 'tribunal de contas', 'mpsc', 'ministerio publico', 'justica', 'tribunal', 'stj', 'stf', 'tj-sc', 'tjsc', 'judicial', 'decisao', 'acao civil', 'improbidade', 'gaeco', 'promotor', 'defensoria', 'cpi', 'investiga', 'apura', 'fiscaliza'],
  'Eleições e Partidos': ['eleic', 'eleitor', 'eleito', 'candidat', 'partido', 'votac', 'votos', 'turno', 'campanha', 'lula', 'bolsonaro', 'motociata', 'pt ', 'pl ', 'psol', 'mdb', 'psd', 'boulos', 'zona eleitoral', 'urna', 'tre', 'ato em apoio', 'ato pro', 'senador', 'governadores eleitos'],
  'Moradia': ['moradia', 'habitac', 'aluguel', 'regularizacao fundiaria', 'ocupacao', 'despejo', 'minha casa', 'imoveis', 'loteamento', 'sem-teto', 'comunidade'],
  'Assistência Social': ['assistencia social', 'cras', 'creas', 'situacao de rua', 'populacao de rua', 'vulnerab', 'bolsa familia', 'idosos', 'pessoa com deficiencia', 'acolhimento', 'fome', 'cesta basica', 'violencia contra a mulher', 'crianca em situacao'],
};
const RE = Object.entries(T).map(([tema, termos]) => [tema, termos.map((t) => new RegExp('(^|[^a-z0-9])' + norm(t).replace(/[.*+?^${}()|[\]\\$]/g, '\\$&').replace(/ $/, '(?![a-z])')))]);
function temas(texto) {
  const t = ' ' + norm(texto) + ' ';
  return RE.filter(([, rs]) => rs.some((r) => r.test(t))).map(([tema]) => tema);
}
module.exports = { temas, TEMAS: Object.keys(T) };
