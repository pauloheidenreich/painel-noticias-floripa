const http = require('http'); const fs = require('fs'); const path = require('path');
const RAIZ = path.join(__dirname, '..'); const PORTA = Number(process.env.PORT) || 8080;
http.createServer((req, res) => {
  const nome = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const arq = path.join(RAIZ, path.normalize(nome));
  if (!arq.startsWith(RAIZ) || !['index.html', 'noticias.json'].includes(path.basename(arq))) { res.writeHead(404); return res.end('404'); }
  fs.readFile(arq, (e, d) => { if (e) { res.writeHead(404); return res.end('Rode "npm start" primeiro.'); }
    res.writeHead(200, { 'Content-Type': arq.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' }); res.end(d); });
}).listen(PORTA, () => console.log(`Painel em http://localhost:${PORTA}`));
