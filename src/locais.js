'use strict';
// Ruas, rodovias, terminais e equipamentos -> bairro (ou etiqueta de região).
// "regiao" é usada quando o texto só permite identificar a região.
module.exports = [
  // terminais de integração
  { termos: ['TICEN', 'Terminal de Integração do Centro', 'Terminal Cidade de Florianópolis'], bairro: 'Centro' },
  { termos: ['TITRI', 'Terminal da Trindade'], bairro: 'Trindade' },
  { termos: ['TICAN', 'Terminal de Canasvieiras'], bairro: 'Canasvieiras' },
  { termos: ['TILAG', 'Terminal da Lagoa'], bairro: 'Lagoa da Conceição' },
  { termos: ['TIRIO', 'Terminal do Rio Tavares'], bairro: 'Rio Tavares' },
  { termos: ['TISAN', 'Terminal de Santo Antônio'], bairro: 'Santo Antônio de Lisboa' },
  { termos: ['TICAP', 'Terminal do Capoeiras'], bairro: 'Capoeiras' },
  // vias
  { termos: ['Avenida Mauro Ramos', 'Av. Mauro Ramos', 'Mauro Ramos', 'Avenida Hercílio Luz', 'Av. Hercílio Luz', 'Rua Felipe Schmidt', 'Avenida Paulo Fontes', 'Largo da Alfândega', 'Praça XV', 'Mercado Público', 'Avenida Rio Branco', 'Rua Bocaiúva', 'Centrosul', 'Antiga rodoviária', 'Rodoviária Rita Maria', 'Ponte Hercílio Luz', 'Catedral Metropolitana'], bairro: 'Centro' },
  { termos: ['Beira-Mar Norte', 'Beira Mar Norte', 'Avenida Beira-Mar Norte'], bairro: 'Centro' },
  { termos: ['Beira-Mar Continental', 'Beira Mar Continental'], regiao: 'Continente' },
  { termos: ['Avenida Ivo Silveira', 'Av. Ivo Silveira', 'Av. Gov. Ivo Silveira', 'Ivo Silveira'], bairro: 'Capoeiras' },
  { termos: ['Via Expressa', 'BR-282'], regiao: 'Continente' },
  { termos: ['Avenida da Saudade'], bairro: 'Itacorubi' },
  { termos: ['Rua Mané Vicente'], bairro: 'Monte Verde' },
  { termos: ['Avenida das Rendeiras'], bairro: 'Lagoa da Conceição' },
  { termos: ['Avenida Pequeno Príncipe'], bairro: 'Campeche' },
  { termos: ['Rodovia Admar Gonzaga', 'SC-404'], bairro: 'Itacorubi' },
  { termos: ['SC-401', 'SC 401', 'Rodovia José Carlos Daux'], regiao: 'Norte da Ilha' },
  { termos: ['SC-403', 'SC 403'], bairro: 'Ingleses' },
  { termos: ['SC-405', 'SC 405', 'Rodovia Diomício Freitas'], regiao: 'Sul da Ilha' },
  { termos: ['SC-406', 'SC 406'], regiao: 'Leste da Ilha' },
  { termos: ['Elevado do Rio Tavares'], bairro: 'Rio Tavares' },
  { termos: ['Elevado do Itacorubi', 'Ceasa'], bairro: 'Itacorubi' },
  // equipamentos
  { termos: ['UFSC', 'Universidade Federal de Santa Catarina', 'Hospital Universitário', 'HU-UFSC', 'HU/UFSC', 'Udesc', 'Centro de Eventos da UFSC'], bairro: 'Trindade' },
  { termos: ['Hospital Celso Ramos', 'Hospital Governador Celso Ramos'], bairro: 'Centro' },
  { termos: ['Hospital Infantil Joana de Gusmão', 'Hospital Joana de Gusmão'], bairro: 'Agronômica' },
  { termos: ['Hospital Florianópolis'], bairro: 'Estreito' },
  { termos: ['Cepon', 'Hemosc', 'Hospital Nereu Ramos'], bairro: 'Trindade' },
  { termos: ['Centro Integrado de Cultura', 'CIC'], bairro: 'Agronômica' },
  { termos: ['Centro Administrativo do Governo', 'Casa d\'Agronômica', 'Casa da Agronômica'], bairro: 'Agronômica' },
  { termos: ['Aeroporto Hercílio Luz', 'aeroporto de Florianópolis', 'Floripa Airport'], bairro: 'Carianos' },
  { termos: ['Ressacada'], bairro: 'Carianos' },
  { termos: ['Orla do Estreito'], bairro: 'Estreito' },
  { termos: ['Ponte Colombo Salles', 'Ponte Pedro Ivo'], bairro: 'Centro' },
  // regiões
  { termos: ['Norte da Ilha', 'norte da Ilha'], regiao: 'Norte da Ilha' },
  { termos: ['Sul da Ilha', 'sul da Ilha'], regiao: 'Sul da Ilha' },
  { termos: ['Leste da Ilha', 'leste da Ilha'], regiao: 'Leste da Ilha' },
  { termos: ['Continente', 'parte continental', 'área continental'], regiao: 'Continente' },
];
