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

## Lide, datas, bairro e tema
- `src/lide.js`: busca o lide da matéria original (og:description, meta description ou 1º parágrafo; até ~400 caracteres), com 8 conexões simultâneas, timeout de 8 s e orçamento total de 100 s (`LIDE_ORCAMENTO_MS`). Sites com captcha/403/429 ficam sem lide (não há contorno). Lides de links já vistos são reaproveitados do `noticias.json` publicado.
- `data` = publicação; `entrou_em` = primeira vez no painel. Vem da memória `entradas` do `noticias.json` publicado (`src/memoria.js`: link e título normalizados → primeira entrada, mantida por 35 dias), então uma notícia que some de uma coleta e volta mantém a data original e não reaparece como nova.
- `src/guarda.js`: não publica (sai com erro e o site anterior fica no ar) se um feed que trazia notícias falhou ou se o total caiu abaixo de 70% da publicação anterior. Se a publicação anterior tem mais de 2 h, publica mesmo assim, para não travar o painel. `PAINEL_IGNORAR_GUARDA=1` desliga a guarda. Também não publica se o `noticias.json` anterior não puder ser baixado (3 tentativas, domínio próprio e github.io), pois sem ele a memória de entradas seria perdida; na primeira publicação use `PAINEL_PRIMEIRA_EXECUCAO=1`.
- Testes: `npm test`.
- `src/locais.js`: ruas, rodovias, terminais e equipamentos mapeados para bairro ou região (Norte da Ilha, Sul da Ilha, Leste da Ilha, Continente).
- `src/temas.js`: etiquetas de tema; o HTML tem filtro por tema.
- `novidades.json`: `novas` (todas), `novas_recentes` (publicadas há menos de 24 h) e `novas_antigas`.
