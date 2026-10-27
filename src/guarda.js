'use strict';
// Guarda contra coleta degradada: se um feed falhou ou o total caiu demais, não publica
// (o site anterior continua no ar). Para não travar o painel para sempre:
//  - só conta falha de feed que estava ok e trazia notícias na publicação anterior;
//  - sem total anterior (ou 0), não compara proporção;
//  - se a publicação anterior tem mais de MAX_ATRASO_MIN minutos, publica mesmo degradado
//    (a memória de entradas evita que os itens voltem como "novos" depois);
//  - PAINEL_IGNORAR_GUARDA=1 desliga a guarda (execução manual).
const MIN_PROPORCAO = 0.7;
const MAX_ATRASO_MIN = 120;

// Sem a publicação anterior não há memória de entradas: publicar assim recarimba tudo como "novo"
// (incidente de 26/10/2026 19:00 UTC, HTTP 503 do Pages). Por isso, se a anterior não carregou, não publica.
// Primeira publicação de verdade (ou recuperação manual): PAINEL_PRIMEIRA_EXECUCAO=1.
function verificarAnterior({ anterior, erro }, env = process.env) {
  if (anterior) return null;
  if (env.PAINEL_PRIMEIRA_EXECUCAO === '1') return null;
  return 'noticias.json anterior indisponível (' + (erro || 'motivo desconhecido') + '); sem ele a memória de entradas seria perdida. Para a primeira publicação use PAINEL_PRIMEIRA_EXECUCAO=1';
}

function verificarColeta({ relatorio, total, anterior, fontes, agora = new Date(), env = process.env }) {
  if (env.PAINEL_IGNORAR_GUARDA === '1') return null;
  if (!anterior) return null;
  const gerado = anterior.geradoEm ? new Date(anterior.geradoEm).getTime() : NaN;
  if (!isNaN(gerado) && agora.getTime() - gerado > MAX_ATRASO_MIN * 60e3) return null;
  const nomes = new Set(fontes.map((f) => f.nome));
  const antes = new Map(((anterior.relatorio) || []).map((r) => [r.fonte, r]));
  const falhas = relatorio.filter((r) => nomes.has(r.fonte) && r.status === 'falhou').filter((r) => {
    const a = antes.get(r.fonte);
    return !a || (a.status === 'ok' && (a.floripa || 0) > 0);
  });
  const motivos = [];
  if (falhas.length) motivos.push(`${falhas.length} feed(s) falharam: ` + falhas.map((r) => `${r.fonte} (${r.erro})`).join('; '));
  const totalAnt = Array.isArray(anterior.noticias) ? anterior.noticias.length : 0;
  if (totalAnt > 0 && total < MIN_PROPORCAO * totalAnt) motivos.push(`total caiu para ${total} (anterior ${totalAnt}; mínimo ${Math.ceil(MIN_PROPORCAO * totalAnt)})`);
  return motivos.length ? motivos.join(' · ') : null;
}

module.exports = { verificarAnterior, verificarColeta, MIN_PROPORCAO, MAX_ATRASO_MIN };
