'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { carregarMemoria, entradaDe, jaVisto, atualizarMemoria } = require('../src/memoria');
const { comparar } = require('../src/novidades');

const it = (titulo, link, entrou_em, extra = {}) => ({ titulo, link, entrou_em, bairros: [], data: '2026-10-01T10:00:00.000Z', ...extra });

test('semeia a memória a partir dos itens publicados (primeira execução)', () => {
  const ant = { geradoEm: '2026-10-25T10:00:00Z', noticias: [it('Obra da Casan', 'https://ndmais.com.br/a?utm_source=x', '2026-10-24T23:01:56-03:00'), it('Sem data', 'https://g1.globo.com/b', undefined)] };
  const mem = carregarMemoria(ant);
  assert.strictEqual(entradaDe(mem, { titulo: 'outro', link: 'https://www.ndmais.com.br/a/' }), '2026-10-24T23:01:56-03:00');
  assert.strictEqual(entradaDe(mem, { titulo: 'Sem data', link: 'https://x/y' }), '2026-10-25T07:00:00-03:00');
  assert.strictEqual(carregarMemoria(null).size, 0);
});

test('item que some de uma coleta e volta mantém entrou_em e não é "novo"', () => {
  const agora1 = new Date('2026-10-24T23:00:00-03:00');
  const ant1 = { geradoEm: agora1.toISOString(), noticias: [it('Câmara forma comissão', 'https://n/1', '2026-10-01T09:00:00-03:00'), it('Outra', 'https://n/2', '2026-10-02T09:00:00-03:00')] };
  // coleta degradada: só "Outra" veio → memória continua com a 1
  const mem1 = carregarMemoria(ant1);
  const out1 = atualizarMemoria(mem1, [it('Outra', 'https://n/2', '2026-10-02T09:00:00-03:00')], agora1);
  const ant2 = { geradoEm: agora1.toISOString(), entradas: out1, noticias: [it('Outra', 'https://n/2', '2026-10-02T09:00:00-03:00')] };
  const mem2 = carregarMemoria(ant2);
  const volta = it('Câmara forma comissão', 'https://n/1', undefined);
  assert.strictEqual(entradaDe(mem2, volta), '2026-10-01T09:00:00-03:00');
  volta.entrou_em = entradaDe(mem2, volta);
  const nov = comparar(ant2, [volta, ant2.noticias[0]], new Date(), jaVisto(mem2));
  assert.strictEqual(nov.total_novas, 0);
  // item realmente novo continua sendo novo
  const nov2 = comparar(ant2, [it('Inédita', 'https://n/3', undefined)], new Date(), jaVisto(mem2));
  assert.strictEqual(nov2.total_novas, 1);
});

test('casa por título quando o link muda, e guarda a data mais antiga', () => {
  const mem = carregarMemoria({ entradas: { 't:prefeitura anuncia obra': '2026-10-10T10:00:00-03:00' }, noticias: [it('Prefeitura anuncia obra', 'https://a/1', '2026-10-20T10:00:00-03:00')] });
  assert.strictEqual(entradaDe(mem, { titulo: 'Prefeitura anuncia obra!', link: 'https://b/2' }), '2026-10-10T10:00:00-03:00');
});

test('poda chaves com mais de 35 dias, exceto as dos itens atuais', () => {
  const agora = new Date('2026-10-25T10:00:00-03:00');
  const mem = new Map([['l:velha', '2026-09-10T10:00:00-03:00'], ['l:recente', '2026-10-01T10:00:00-03:00'], ['l:lixo', 'x']]);
  const atual = it('Atual antiga', 'https://velha2', '2026-09-01T10:00:00-03:00');
  const out = atualizarMemoria(mem, [atual], agora);
  assert.ok(!('l:velha' in out) && !('l:lixo' in out));
  assert.ok('l:recente' in out);
  assert.strictEqual(out['l:velha2'], '2026-09-01T10:00:00-03:00');
  assert.strictEqual(out['t:atual antiga'], '2026-09-01T10:00:00-03:00');
});
