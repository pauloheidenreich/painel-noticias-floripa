# Painel de Notícias de Florianópolis por Bairro (protótipo)

Coleta notícias reais de feeds RSS, filtra as de Florianópolis, classifica por bairro e gera um `index.html` estático e responsivo.

## Requisitos
- Node.js 18 ou superior (usa o `fetch` nativo). **Nenhuma dependência externa** – não precisa de `npm install`.

## Como usar no Windows
1. Instale o Node.js LTS em https://nodejs.org (marque "Add to PATH").
2. Copie a pasta `painel-floripa` para o seu computador (ex.: `C:\Users\Voce\painel-floripa`).
3. Abra o **Prompt de Comando** ou **PowerShell** nessa pasta:
   ```
   cd C:\Users\Voce\painel-floripa
   npm start
   ```
   Isso baixa as notícias e gera `index.html` e `noticias.json` na pasta.
4. Abra o `index.html` com duplo clique, **ou** rode `npm run serve` e acesse http://localhost:8080
   (porta alternativa no PowerShell: `$env:PORT=3000; npm run serve`).

### Atualização automática (opcional)
No Agendador de Tarefas do Windows, crie uma tarefa que execute a cada hora:
- Programa: `cmd.exe`
- Argumentos: `/c cd /d C:\Users\Voce\painel-floripa && npm start`

## Arquivos
- `src/coletar.js` – baixa, filtra, classifica e grava as saídas
- `src/fontes.js` – lista de feeds (edite aqui para adicionar fontes)
- `src/bairros.js` – bairros e localidades/praias, com apelidos
- `src/html.js` – modelo do painel
- `src/servidor.js` – servidor local simples
- `index.html`, `noticias.json` – saídas geradas

## Limitações
- Classificação por menção textual ao nome do bairro (título/resumo/categorias); pode haver falsos positivos e negativos.
- Sites da Prefeitura (pmf.sc.gov.br) e da Câmara (cmf.sc.gov.br) não respondem a robôs (timeout / captcha); suas notícias vêm via Google News filtrado pelo domínio oficial, que pode estar desatualizado.
- Itens do Google News trazem só o título e link de redirecionamento do Google.
- Só notícias dos últimos 30 dias.

## Qualidade e enriquecimento (versão online)
- `src/qualidade.js`: descarta páginas que não são notícia (Moovit e sites de linhas/horários, portais de concursos, guias, listagens, previsão do tempo, vídeos de telejornal, páginas institucionais) e itens cujo título cita outra cidade da Grande Florianópolis sem citar Florianópolis. Os descartes ficam em `noticias.json` → `descartadas`.
- `src/ementas.js`: para atos da Câmara que trazem só o número (ex.: "LEI Nº 9299/2013"), resolve o link original do Google News, tenta ler a página da Câmara (que exige captcha; não é contornado) e procura a ementa em notícias pelo número. Quando acha, grava `resumo`; senão, `sem_ementa: true`.
