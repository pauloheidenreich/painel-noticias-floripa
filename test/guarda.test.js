'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { verificarColeta } = require('../src/guarda');

const fontes = [{ nome: 'G1 SC' }, { nome: 'GN A' }, { nome: 'ND+' }];
const agora = new Date('2026-10-24T22:47:00-03:00');
const ant = (extra = {}) => ({
  geradoEm: new Date(agora.getTime() - 15 * 60e3).toISOString(),
  noticias: Array.from({ length: 150 }, (_, i) => ({ titulo: 't' + i, link: 'l' + i })),
  relatorio: [{ fonte: 'G1 SC', status: 'ok', floripa: 4 }, { fonte: 'GN A', status: 'ok', floripa: 30 }, { fonte: 'ND+', status: 'ok', floripa: 0 }],
  ...extra,
});
const ok = [{ fonte: 'G1 SC', status: 'ok' }, { fonte: 'GN A', status: 'ok' }, { fonte: 'ND+', status: 'ok' }];
const env = {};

test('coleta normal passa', () => {
  assert.strictEqual(verificarColeta({ relatorio: ok, total: 150, anterior: ant(), fontes, agora, env }), null);
});
test('feed com HTTP 503 bloqueia', () => {
  const rel = [ok[0], { fonte: 'GN A', status: 'falhou', erro: 'HTTP 503' }, ok[2]];
  assert.match(verificarColeta({ relatorio: rel, total: 140, anterior: ant(), fontes, agora, env }), /GN A \(HTTP 503\)/);
});
test('total abaixo de 70% bloqueia; 70% passa', () => {
  assert.match(verificarColeta({ relatorio: ok, total: 26, anterior: ant(), fontes, agora, env }), /total caiu para 26/);
  assert.strictEqual(verificarColeta({ relatorio: ok, total: 105, anterior: ant(), fontes, agora, env }), null);
});
test('sem anterior ou total anterior 0: não compara proporção', () => {
  assert.strictEqual(verificarColeta({ relatorio: ok, total: 5, anterior: null, fontes, agora, env }), null);
  assert.strictEqual(verificarColeta({ relatorio: ok, total: 5, anterior: ant({ noticias: [] }), fontes, agora, env }), null);
});
test('feed sem notícias ou já falho na publicação anterior não bloqueia', () => {
  const rel = [ok[0], ok[1], { fonte: 'ND+', status: 'falhou', erro: 'HTTP 500' }];
  assert.strictEqual(verificarColeta({ relatorio: rel, total: 150, anterior: ant(), fontes, agora, env }), null);
  const rel2 = [ok[0], { fonte: 'GN A', status: 'falhou', erro: 'HTTP 503' }, ok[2]];
  const a = ant(); a.relatorio[1] = { fonte: 'GN A', status: 'falhou' };
  assert.strictEqual(verificarColeta({ relatorio: rel2, total: 150, anterior: a, fontes, agora, env }), null);
});
test('falha da API da Câmara (fora de FONTES) não bloqueia', () => {
  const rel = [...ok, { fonte: 'Câmara (dados abertos)', status: 'falhou', erro: 'x' }];
  assert.strictEqual(verificarColeta({ relatorio: rel, total: 150, anterior: ant(), fontes, agora, env }), null);
});
test('publicação anterior com mais de 2 h: publica mesmo degradado (não trava para sempre)', () => {
  const a = ant({ geradoEm: new Date(agora.getTime() - 121 * 60e3).toISOString() });
  assert.strictEqual(verificarColeta({ relatorio: ok, total: 26, anterior: a, fontes, agora, env }), null);
});
test('PAINEL_IGNORAR_GUARDA=1 desliga', () => {
  assert.strictEqual(verificarColeta({ relatorio: ok, total: 26, anterior: ant(), fontes, agora, env: { PAINEL_IGNORAR_GUARDA: '1' } }), null);
});
