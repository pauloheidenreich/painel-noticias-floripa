const gn = (q) => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=pt-BR&gl=BR&ceid=BR:pt-419';
module.exports = [
  { nome: 'ND+', url: 'https://ndmais.com.br/feed/' },
  { nome: 'NSC Total', url: 'https://www.nsctotal.com.br/feed' },
  { nome: 'G1 SC', url: 'https://g1.globo.com/rss/g1/sc/santa-catarina/' },
  // Sites oficiais (pmf.sc.gov.br e cmf.sc.gov.br) não respondem ou exigem captcha para robôs;
  // por isso suas notícias são obtidas via Google News filtrado pelo domínio oficial.
  { nome: 'Prefeitura de Florianópolis', url: gn('site:pmf.sc.gov.br'), oficial: true, direta: 'https://www.pmf.sc.gov.br/noticias' },
  { nome: 'Câmara Municipal de Florianópolis', url: gn('site:cmf.sc.gov.br'), oficial: true, direta: 'https://www.cmf.sc.gov.br/noticias' },
  { nome: 'Google News (Florianópolis)', url: gn('Florianópolis when:7d'), agregador: true },
  { nome: 'Google News (bairros Norte)', url: gn('Florianópolis (Ingleses OR Canasvieiras OR Jurerê OR "Santo Antônio de Lisboa" OR "Rio Vermelho" OR "Ponta das Canas" OR Santinho OR Ratones) when:14d'), agregador: true },
  { nome: 'Google News (bairros Sul/Leste)', url: gn('Florianópolis (Campeche OR "Rio Tavares" OR "Lagoa da Conceição" OR "Barra da Lagoa" OR "Ribeirão da Ilha" OR Armação OR "Pântano do Sul" OR Tapera) when:14d'), agregador: true },
  { nome: 'Google News (bairros Centro/Continente)', url: gn('Florianópolis (Trindade OR Itacorubi OR Agronômica OR "Saco Grande" OR Estreito OR Coqueiros OR Capoeiras OR Abraão OR "Monte Cristo") when:14d'), agregador: true },
  { nome: 'Google News (política: Câmara)', url: gn('"Câmara de Florianópolis" OR "vereador de Florianópolis" OR "vereadores de Florianópolis" OR "vereadora" Florianópolis when:30d'), agregador: true },
  { nome: 'Google News (política: Prefeitura)', url: gn('"Prefeitura de Florianópolis" OR "Topázio Neto" OR "prefeito de Florianópolis" when:30d'), agregador: true },
  { nome: 'Google News (política: serviços/estado)', url: gn('Florianópolis (Casan OR Comcap OR "Plano Diretor" OR licitação OR "audiência pública" OR Alesc OR "MPSC" OR "TCE") when:30d'), agregador: true },
];
