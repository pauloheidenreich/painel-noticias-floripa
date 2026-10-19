// Bairros de Florianópolis (Ilha e Continente) + localidades/praias mapeadas ao bairro.
// "ambiguo: true" = nome comum também em outras cidades; só conta se o texto citar Florianópolis.
const B = (nome, opts = {}) => ({ nome, aliases: opts.aliases || [], ambiguo: !!opts.ambiguo });
module.exports = [
  // Centro / região central
  B('Centro', { ambiguo: true, aliases: ['Centro de Florianópolis', 'Centro da Capital', 'Centro Histórico de Florianópolis', 'Mercado Público', 'Praça XV', 'Beira-Mar Norte', 'Avenida Hercílio Luz'] }),
  B('Agronômica'), B('José Mendes'), B('Monte Serrat', { aliases: ['Morro do Mocotó', 'Mont Serrat'] }),
  B('Prainha', { ambiguo: true }), B('Saco dos Limões'), B('Trindade', { ambiguo: true, aliases: ['UFSC'] }),
  B('Pantanal', { ambiguo: true }), B('Santa Mônica', { ambiguo: true }), B('Córrego Grande'), B('Itacorubi'),
  B('Carvoeira'), B('Serrinha', { ambiguo: true }), B('João Paulo'), B('Saco Grande'), B('Monte Verde', { ambiguo: true }),
  B('Costeira do Pirajubaé', { aliases: ['Costeira'] }),
  // Norte da Ilha
  B('Santo Antônio de Lisboa'), B('Sambaqui'), B('Cacupé'), B('Ratones'), B('Vargem Grande', { ambiguo: true }),
  B('Vargem Pequena'), B('Vargem do Bom Jesus'), B('Canasvieiras'), B('Jurerê', { aliases: ['Jurerê Internacional'] }),
  B('Daniela', { ambiguo: true, aliases: ['Praia da Daniela'] }), B('Praia do Forte', { ambiguo: true }),
  B('Cachoeira do Bom Jesus'), B('Ponta das Canas'), B('Lagoinha do Norte', { aliases: ['Praia da Lagoinha'] }),
  B('Praia Brava', { ambiguo: true }), B('Ingleses', { aliases: ['Ingleses do Rio Vermelho'] }), B('Santinho', { aliases: ['Praia do Santinho'] }),
  B('São João do Rio Vermelho', { aliases: ['Rio Vermelho'] }), B('Moçambique', { aliases: ['Praia do Moçambique'] }),
  // Leste
  B('Lagoa da Conceição', { aliases: ['Lagoa da Conceicao', 'Avenida das Rendeiras'] }), B('Barra da Lagoa'), B('Costa da Lagoa'),
  B('Canto da Lagoa'), B('Porto da Lagoa'), B('Retiro da Lagoa'), B('Joaquina', { aliases: ['Praia da Joaquina'] }),
  B('Praia Mole'), B('Canto dos Araçás'),
  // Sul da Ilha
  B('Rio Tavares'), B('Campeche'), B('Morro das Pedras'), B('Armação', { ambiguo: true, aliases: ['Armação do Pântano do Sul'] }),
  B('Pântano do Sul'), B('Açores', { ambiguo: true, aliases: ['Praia dos Açores'] }), B('Solidão', { ambiguo: true, aliases: ['Praia da Solidão'] }),
  B('Lagoinha do Leste'), B('Ribeirão da Ilha'), B('Caieira da Barra do Sul'), B('Alto Ribeirão'), B('Tapera', { ambiguo: true, aliases: ['Tapera da Base'] }),
  B('Carianos'), B('Base Aérea'), B('Aeroporto Hercílio Luz', { aliases: ['aeroporto de Florianópolis', 'Floripa Airport'] }),
  B('Lagoa do Peri'),
  // Continente
  B('Estreito', { ambiguo: true }), B('Coqueiros'), B('Capoeiras'), B('Abraão', { ambiguo: true }), B('Balneário', { ambiguo: true, aliases: ['Balneário do Estreito'] }),
  B('Bom Abrigo'), B('Itaguaçu'), B('Jardim Atlântico'), B('Monte Cristo', { ambiguo: true }), B('Canto', { ambiguo: true }),
  B('Coloninha'), B('Sapé', { ambiguo: true }), B('Vila São João', { ambiguo: true }), B('Chico Mendes'), B('Novo Continente'),
];
