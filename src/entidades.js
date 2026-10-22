'use strict';
// Decodifica entidades HTML (nomeadas e numéricas) e corrige mojibake UTF-8 lido como Latin-1 ("Ã§" -> "ç").
const L1 = 'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(' ');
const NOMES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚', bdquo: '„', ndash: '–', mdash: '—', hellip: '…', bull: '•', euro: '€', trade: '™', circ: 'ˆ', tilde: '˜', OElig: 'Œ', oelig: 'œ', Scaron: 'Š', scaron: 'š', Yuml: 'Ÿ', laquo: '«', raquo: '»', thinsp: ' ', ensp: ' ', emsp: ' ', zwnj: '', zwj: '', lrm: '', rlm: '' };
L1.forEach((n, i) => { NOMES[n] = String.fromCharCode(160 + i); });
NOMES.nbsp = ' ';
const umaVez = (s) => s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (m, e) => {
  if (e[0] === '#') {
    const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    // 128–159 em referências numéricas costumam ser Windows-1252
    const w = { 145: '‘', 146: '’', 147: '“', 148: '”', 150: '–', 151: '—', 133: '…', 128: '€' };
    if (w[cp]) return w[cp];
    try { return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m; } catch { return m; }
  }
  return NOMES[e] ?? NOMES[e.toLowerCase()] ?? m;
});
function mojibake(s) {
  if (!/[ÃÂ][\u0080-\u00bf]/.test(s)) return s;
  return s.replace(/[\u00c2-\u00f4][\u0080-\u00bf]{1,3}/g, (m) => { const t = Buffer.from(m, 'latin1').toString('utf8'); return t.includes('\ufffd') ? m : t; });
}
function decodificar(s) {
  s = String(s ?? '');
  for (let i = 0; i < 3; i++) { const t = umaVez(s); if (t === s) break; s = t; } // cobre &amp;ecirc; (dupla codificação)
  return mojibake(s);
}
module.exports = { decodificar };
