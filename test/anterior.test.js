'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarAnterior } = require('../src/novidades');
const { verificarAnterior } = require('../src/guarda');

const pub = { geradoEm: '2026-10-26T18:46:46Z', noticias: [{ titulo: 'a', link: 'https://x/a', entrou_em: '2026-10-25T08:00:00-03:00' }], entradas: { 'l:x/a': '2026-10-25T08:00:00-03:00' } };
const resp = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo });
// fetch falso: devolve as respostas na ordem; registra as URLs chamadas
const falso = (respostas) => { const chamadas = []; const f = async (url) => { chamadas.push(url); const r = respostas.shift(); if (r instanceof Error) throw r; return r; }; f.chamadas = chamadas; return f; };
const opts = (fetchImpl, extra = {}) => ({ urls: ['https://a/n.json', 'https://b/n.json'], esperaMs: 0, fetchImpl, log: () => {}, ...extra });

test('carrega na primeira tentativa', async () => {
  const f = falso([resp(200, pub)]);
  const r = await carregarAnterior(opts(f));
  assert.deepStrictEqual(r, { anterior: pub, erro: null });
  assert.strictEqual(f.chamadas.length, 1);
});
test('HTTP 503 na URL principal: usa a alternativa', async () => {
  const f = falso([resp(503), resp(200, pub)]);
  const r = await carregarAnterior(opts(f));
  assert.strictEqual(r.anterior, pub);
  assert.match(f.chamadas[1], /^https:\/\/b\/n\.json\?t=/);
});
test('503 em tudo na 1ª rodada, ok na 2ª tentativa', async () => {
  const f = falso([resp(503), resp(503), resp(200, pub)]);
  const r = await carregarAnterior(opts(f));
  assert.strictEqual(r.anterior, pub);
  assert.strictEqual(f.chamadas.length, 3);
});
test('falha em todas as tentativas: anterior null com erro detalhado', async () => {
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const f = falso([resp(503), abort, resp(404), resp(200, { erro: 'x' }), resp(503), resp(503)]);
  const r = await carregarAnterior(opts(f));
  assert.strictEqual(r.anterior, null);
  assert.match(r.erro, /HTTP 503/); assert.match(r.erro, /timeout/); assert.match(r.erro, /HTTP 404/); assert.match(r.erro, /formato inesperado/);
  assert.strictEqual(f.chamadas.length, 6);
});
test('verificarAnterior: bloqueia sem anterior (incidente 26/10 19:00 UTC)', () => {
  assert.match(verificarAnterior({ anterior: null, erro: 'HTTP 503' }, {}), /indisponível \(HTTP 503\)/);
});
test('verificarAnterior: libera com anterior ou com PAINEL_PRIMEIRA_EXECUCAO=1', () => {
  assert.strictEqual(verificarAnterior({ anterior: pub, erro: null }, {}), null);
  assert.strictEqual(verificarAnterior({ anterior: null, erro: 'HTTP 404' }, { PAINEL_PRIMEIRA_EXECUCAO: '1' }), null);
});
