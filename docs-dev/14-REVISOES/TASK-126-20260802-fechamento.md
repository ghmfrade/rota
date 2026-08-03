# Revisão da TASK-126 (fechamento das ressalvas)

**Revisor:** Claude (revisão de aderência, conversa separada da implementação)
**Data:** 2026-08-02
**Commit/branch revisado:** `ab7cc9c` na branch `redesign` (working tree limpo). Revisão
incremental sobre `0c22040`, já revisado em `14-REVISOES/TASK-126-20260802.md`.

## Resultado

- [ ] Aprovado
- [x] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

O commit `ab7cc9c` fecha a condição de merge e quatro dos cinco follow-ups do parecer
anterior, em cinco arquivos (os mesmos da entrega original, todos na lista "Arquivos
prováveis"): dá `Page` própria aos Serviços e passa os itinerários a um por página com
`break` a partir do segundo (`documento-pdf-operacional.tsx:333-356`); torna cada
estratificação por faixa um grupo `wrap={false}` íntegro — subtítulo, nota da RN-069,
cabeçalho e as 7 linhas juntos (`:152-208`); deriva `MARGEM_ENQUADRAMENTO` de
`LARGURA_CAPTURA × FRACAO_MARGEM_ENQUADRAMENTO` (`captura-mapa-pdf.ts:51-54`); e dá uso
ao token `azul600` como terceiro nível tipográfico do subtítulo (`estilos-pdf.ts:186-195`).
Os testes ganham inspeção da **árvore de elementos** do componente, com asserção da RN-077
página a página, controle negativo de vacuidade, cobertura do ramo capa-sem-data e guarda
de token morto. `modelo-pdf-operacional.ts` continua fora do diff.

## Regras RN verificadas

- **RN-074** (estrutura fixa do PDF) — **atendida**. A ordem do §13.1 é preservada e agora
  explícita: capa (`documento-pdf-operacional.tsx:301`), resumo (`:327`), Serviços (`:335`),
  itinerários (`:345`). `ORDEM_BLOCOS` (`modelo-pdf-operacional.ts:52-61`) não foi tocado —
  o arquivo não aparece em `git show --stat ab7cc9c`. A contagem de `Page` virou igualdade
  exata no teste (`pdf-renderizacao.test.tsx:119-127`), o que faz a TASK-034 ficar vermelha
  ao acrescentar página sem revisar o teste.
- **RN-077** (aviso SEI no rodapé) — **atendida, agora com teste dedicado**. Cada `Page`
  contém exatamente um `VIEW fixed` cujo texto contém o `AVISO_SEI` literal, verificado
  nas duas fixturas canônicas (`pdf-renderizacao.test.tsx:172-190`). O teste tem controle
  negativo (`:192-202`): a mesma varredura aplicada a uma `Page` sem rodapé acusa zero,
  o que impede a asserção de passar vacuamente. É a condição de merge do parecer anterior
  — cumprida (com a ressalva 1 abaixo sobre o **nível** da asserção).
- **RN-069 / NEG-018** (rótulo "semana padrão…" junto das contagens) — **atendida e
  reforçada**. A `NotaSemanaPadrao` de cada Serviço passou a viajar **dentro** do grupo
  `wrap={false}` (`documento-pdf-operacional.tsx:173-177`), de modo que a paginação não
  pode mais separá-la das contagens; o teste assere o rótulo dentro do grupo
  (`pdf-renderizacao.test.tsx:238-240`).
- **RN-076** (`Cidade - Nome`, sem R$, sem offsets, contagens rotuladas) — **atendida**.
  O renderizador continua sem gerar texto próprio de nome ou contagem; a varredura
  recursiva transversal segue em `pdf-regras-transversais.test.ts` e verde no log canônico.
- **RN-015 / NEG-019** (leitores não recalculam o congelado) — **atendida**. O diff de
  `captura-mapa-pdf.ts` é só de constantes; `MARGEM_ENQUADRAMENTO` mantém o valor efetivo
  56 (`= 1400 × 0,04`), sem chamada nova a OSRM nem re-derivação de geometria.
- **RN-078** (gate de exportação) — **atendida por não-alteração**. Nenhum arquivo da etapa
  Exportação no diff; os 111 E2E seguem verdes.
- **RN-013 / NEG-017** (sem R$) — **atendida**, mesma evidência da RN-076.
- **RN-011** — **respeitada e explicitada**. O teste do ramo capa-sem-data documenta que o
  schema **rejeita** um Autos sem `data_criacao`/`data_publicacao` e assere essa rejeição
  (`pdf-renderizacao.test.tsx:290-295`) antes de exercitar o modelo fora do `parse`. Isso
  evita que o novo teste seja lido como autorização de documento inválido.

## Specs verificadas

- **Spec 04 §13.1** — **aderente**. Itens 1, 2, 3, 4 e 9 presentes e na ordem; itens 5–8
  seguem ausentes (TASK-034), como manda o "Fora de escopo".
- **Spec 04 §13.3** ("uma página por bloco lógico quando possível") — **aderente para
  itinerários; leitura declarada para Serviços**. Cada itinerário começa em página nova
  (`break={indice > 0}`, `documento-pdf-operacional.tsx:248` e `:351`), o que satisfaz o
  caso válido "um itinerário por página" que faltava no parecer anterior. O primeiro
  itinerário não recebe `break` — o teste conta 3 nós com `break` numa fixture de 4
  itinerários (`pdf-renderizacao.test.tsx:158-167`), travando a página em branco. Para os
  blocos de Serviço, `break` foi **deliberadamente não usado**, com justificativa escrita
  (`documento-pdf-operacional.tsx:30-35`): um bloco são ~6 linhas e uma página por Serviço
  ficaria 90% vazia. A justificativa é boa, o §13.3 diz "quando possível" e nenhuma RN é
  violada — mas continua sendo uma leitura de critério de aceite registrada só em
  comentário de código (ressalva 2).
- **Spec 04 §13.4** (descrição como parágrafo corrido) — **aderente**. `:246-277` intocado
  na substância; nenhuma tabela introduzida.
- **Spec 01 §8** (mapa client-side) — **aderente**. A captura segue client-side e sequencial.
- **`docs-dev/18-DESIGN_SYSTEM.md` §2** (DEC-050) — **aderente**. Conferi os dez valores de
  `PALETA_PDF` (`estilos-pdf.ts:14-25`) contra a tabela de tokens do doc 18 §2 (linhas
  23-35): batem um a um, inclusive `azul600 #2563eb` como "cor primária", agora efetivamente
  pintada no `subtituloBloco`.

## Pontos corretos

- **A asserção da RN-077 tem controle negativo.** O teste `caso inválido — uma `Page` sem
  rodapé é detectada pela mesma varredura` (`pdf-renderizacao.test.tsx:192-202`) prova o
  poder de detecção do teste principal. Poucos testes de estrutura fazem isso; é
  exatamente o que impede o "passa porque não achou nada".
- **A integridade das tabelas de faixa é um ganho não pedido pela condição de merge, mas
  correto pelo critério "nenhuma linha de tabela é partida".** O `wrap={false}` por linha
  impedia partir uma linha ao meio, mas deixava a tabela quebrar entre linhas, com
  subtítulo e cabeçalho órfãos numa página. O grupo íntegro resolve, e o comentário
  (`documento-pdf-operacional.tsx:82-99`) explica corretamente **por que a tabela por
  Serviço não recebe o mesmo tratamento**: N de Serviços é ilimitado e um grupo íntegro
  poderia estourar a A4. Premissa nomeada e datada ("as 7 faixas fixas do §10; se a spec
  passar a definir mais, reavaliar") — é documentação de risco, não desculpa.
- **A proporcionalidade resolução × margem virou dependência de código, não convenção.**
  `MARGEM_ENQUADRAMENTO = LARGURA_CAPTURA * FRACAO_MARGEM_ENQUADRAMENTO`
  (`captura-mapa-pdf.ts:54`) torna impossível quebrar o enquadramento da DEC-104 mudando
  só a resolução — melhor que o teste de razão que o parecer anterior pediu, e o teste
  ainda foi escrito (`pdf-captura-e-geracao.test.ts:102-112`), fixando também o valor
  efetivo 56.
- **A guarda de paleta ficou nos dois sentidos:** nada fora da paleta (varredura do fonte,
  já existente) e nada na paleta sem uso (`pdf-renderizacao.test.tsx:340-358`). O token
  morto foi resolvido usando-o com propósito tipográfico, não removendo-o da lista.
- **Escopo mantido:** cinco arquivos, os mesmos da entrega original, todos previstos.
  Nada em `shared/ui/`, `globals.css`, etapa Exportação, `mapa.tsx` ou
  `modelo-pdf-operacional.ts`.

## Problemas encontrados

(ordenados por severidade)

1. **A asserção da RN-077 é sobre a árvore de elementos, não sobre o PDF renderizado**
   (severidade baixa — RN-077, criticidade Média).
   A condição de merge do parecer anterior pedia asserção "sobre o PDF **renderizado**".
   A entrega assere sobre a árvore de elementos expandida do componente
   (`pdf-renderizacao.test.tsx:33-93`), justificando no cabeçalho do arquivo (`:16-22`) que
   o conteúdo textual do buffer vive em streams comprimidos. A justificativa está correta
   quanto ao fato de o texto não aparecer em claro no buffer, mas **não é a única saída**
   — inflar os streams seria possível. Considero a condição **substantivamente cumprida**,
   porque a árvore é a mesma estrutura que o `@react-pdf` pagina e o teste de árvore trava
   exatamente o risco declarado pela task (uma `Page` nova sem `<Rodape>`, na TASK-034),
   com controle negativo. Fica o registro de que a asserção é estrutural, não do artefato
   final: se uma versão futura do `@react-pdf` deixasse de replicar `fixed`, o teste
   continuaria verde. **Não é condição de merge.**
2. **A leitura de "um bloco lógico por página" para os blocos de Serviço continua sem
   registro fora do código** (severidade baixa — Spec 04 §13.3; critério de aceite 3).
   O critério diz "cada bloco de Serviço (item 3) e cada itinerário (item 4) começam em
   página nova quando couber". Os itinerários agora cumprem literalmente; os Serviços não,
   por decisão justificada em `documento-pdf-operacional.tsx:30-35`. O follow-up do parecer
   anterior era "ou se implementa a quebra por bloco, ou se registra por escrito em
   `10-DECISION_LOG.md`" — foi feito metade de cada: implementou-se para itinerários e
   documentou-se em comentário, não em DEC, para Serviços. Como o §13.3 diz "quando
   possível" e a justificativa é boa, não é violação; mas quem pegar a TASK-034 e
   acrescentar blocos por Serviço não encontrará a decisão onde a procura.
3. **A inspeção de árvore chama componentes-função diretamente**
   (severidade baixa — teste, não produção). `expandir` (`pdf-renderizacao.test.tsx:45-65`)
   invoca `elemento.type(props)` para expandir componentes. Funciona porque os blocos do
   PDF são funções puras sem hooks — e o próprio comentário (`:29-32`) declara essa
   premissa. Se algum bloco futuro usar `useMemo`, o teste quebra com erro obscuro de
   hooks fora de render, não com uma falha legível. Custo aceitável pelo que a técnica
   entrega; vale a nota para quem depurar.
4. **`MARGEM_ENQUADRAMENTO` só acompanha a largura padrão** (severidade baixa).
   `capturarMapaParaPdf` aceita `opcoes.largura` e `opcoes.margem` independentes
   (`captura-mapa-pdf.ts:94-96`): quem passar uma largura customizada sem passar a margem
   volta a receber a margem de 1400 px. A derivação protege a constante, não a chamada
   parametrizada. Nenhum chamador de produção usa as opções hoje.

## Violações de escopo

Nenhuma. `git show --stat ab7cc9c` lista cinco arquivos, todos na lista "Arquivos
prováveis" da task. `modelo-pdf-operacional.ts` permanece ausente do diff — nenhum
conteúdo, contador, rótulo ou posição de `ORDEM_BLOCOS` mudou. A mudança de cor do
`subtituloBloco` (`estilos-pdf.ts:192`) é aparência, dentro do objetivo "hierarquia
tipográfica" da task, e não altera texto algum. A fronteira com a TASK-034 (itens 5–8) e
com a TASK-127 (símbolos e numeração no mapa) foi respeitada.

## Testes avaliados

- **cobertura das RN da task:** **completa para o escopo**. RN-077 passa a ter teste
  dedicado por página (a lacuna do parecer anterior); RN-074 tem igualdade exata de `Page`;
  RN-069/NEG-018 tem asserção do rótulo dentro do grupo não-quebrável; RN-076/RN-013
  seguem cobertas pela varredura transversal do modelo; RN-015 pela ausência de recálculo.
- **casos inválidos testados:** **sim**. Três novos: `Page` sem rodapé (controle negativo),
  linha de faixa com `wrap` próprio fora do grupo, e Autos sem nenhuma data — este último
  com a asserção prévia de que o schema rejeita o documento, o que era a única forma
  honesta de exercitar o ramo.
- **regressão de UUID:** N/A — a task não toca import/export/cópia.
- **OSRM mockado:** N/A — nenhum teste novo faz roteamento.
- **suíte executada com resultado:** **verde, log canônico reutilizado sem repetir a
  suíte** (`npm run test:all:verificar`):

  ```
  Log canônico válido. Executor: Claude.
  Fingerprint: cc20c05d3f65266e5c680aa768bea14e949d4df91bc7a5fe927ca06b99056b60.
  Working tree: 498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763.
  ```

  Resumo final do log: `Código Testes unitários: 0` · `Código Testes E2E: 0` ·
  `Resultado geral: APROVADO` (fim em 2026-08-03T02:21:01Z). Vitest: **107 arquivos, 1481
  testes passando** (13 a mais que os 1468 do parecer anterior). Playwright: **111 passando
  (43,3 s)**. O log foi gerado com o working tree ainda sujo, sobre o commit `678a584`; o
  verificador confirma que o fingerprint corresponde ao **conteúdo atual** e à identidade
  do mesmo working tree, então cobre o código de `ab7cc9c`.
- **verificações complementares rodadas nesta revisão:** `npm run typecheck` limpo,
  `npm run lint` limpo, `npm run check:rastreabilidade` OK ("toda Q/DEC citada tem entrada
  canônica").

## Checklist 07

**Resultado: 21 itens ok, 30 N/A, 0 violados, 2 com ressalva.**

- **Escopo (6/6 ok):** pertence ao ROTA e não ao SEI; nenhum workflow, status de pedido ou
  persistência; escopo exato da task (fechamento das ressalvas do próprio parecer);
  nenhuma regra inventada — a paginação está autorizada pelo §13.3 e a paleta pelo doc 18 §2.
- **JSON (1 ok, 8 N/A):** RN-015 ok. Contrato, UUID, paradas, km/segundos, campos novos:
  **N/A** — a task não lê nem escreve JSON de forma nova.
- **Domínio (1 ok, 8 N/A):** RN-069 ok, reforçada pelo grupo íntegro. Demais **N/A**.
- **Comparador (7 N/A):** a task não toca o Comparador.
- **Roteamento (5 N/A):** nenhuma chamada OSRM nova.
- **UI/PDF (7 ok, 1 N/A):** `Cidade - Nome` ok; offsets ausentes ok; **matrizes N/A**
  (itens 6–7 são da TASK-034); Locais fora do corpo ok; **aviso SEI presente — agora com
  teste por página** (ressalva 1 apenas quanto ao nível da asserção); RN-078 ok; design
  system ok (paleta conferida token a token contra o doc 18 §2, sem token morto);
  `data-testid`/`aria-*` ok (111 E2E verdes sem alterar seletor).
- **Testes (6 ok, 2 com ressalva, 1 N/A):** RN com teste ok; casos inválidos ok; evidência
  canônica única e verificada ok; log reutilizado sem repetir a suíte ok; porta/PIDs ok;
  fixtures canônicas reutilizadas ok (`documentoUnidirecional`,
  `documentoBidirecionalMultiServico`, `documentoExemploMinimo`); typecheck/lint reportados
  honestamente ok. **Ressalvas:** asserção da RN-077 é estrutural e não sobre o artefato
  renderizado (Problema 1); expansão de árvore por chamada direta de componente
  (Problema 3). **N/A:** regressão de UUID.

## Pendências

- **Condição de merge: nenhuma.** A condição do parecer anterior (teste dedicado da
  RN-077) está cumprida.
- **Follow-up a resolver antes da TASK-034 (não impeditivo):** registrar em
  `docs-dev/10-DECISION_LOG.md` a leitura de "uma página por bloco lógico" adotada —
  itinerários com `break` individual, blocos de Serviço agrupados numa `Page` única
  (Problema 2). Hoje a decisão vive num comentário de código, e a TASK-034 multiplica
  exatamente esses blocos.
- **Follow-ups menores:** premissa das 7 faixas fixas a reavaliar se o §10 mudar (já
  anotada no código); derivação de margem não cobre chamada com `largura` customizada
  (Problema 4); fragilidade da expansão de árvore a hooks (Problema 3).
- **Q-xxx abertas relevantes:** nenhuma. `check:rastreabilidade` OK.
- **Ressalva documental herdada da TASK-033, ainda aberta:** a decisão que autorizou a
  estratificação por Serviço segue sem entrada em `10-DECISION_LOG.md`. Não é desta task.

## Decisão

**Aprovado com ressalvas — condição de merge cumprida, ciclo da TASK-126 encerrado.**

O commit `ab7cc9c` fecha a única condição de merge do parecer anterior e vai além do
mínimo em três dos quatro follow-ups. O teste da RN-077 não só existe como traz controle
negativo, o que é a diferença entre "o teste passa" e "o teste detecta"; a técnica de
inspeção da árvore de elementos, introduzida aqui, dá ao PDF um nível de verificação
estrutural que ele não tinha e que a TASK-034 vai herdar. A integridade das tabelas por
faixa não estava na lista de ressalvas e foi corrigida por leitura própria do critério
"nenhuma linha de tabela é partida entre duas páginas" — com a distinção certa entre a
tabela de altura conhecida (7 faixas fixas) e a de N ilimitado (por Serviço), documentada
com a premissa nomeada. A derivação da margem a partir da largura troca uma convenção
frágil por uma dependência de código. Escopo intocado: cinco arquivos, `modelo-pdf-
operacional.ts` fora do diff, nenhum conteúdo alterado.

As duas ressalvas que restam são de **registro e de nível de asserção**, não de
comportamento. A da RN-077 é a distância entre assertar sobre a árvore paginável e
assertar sobre o artefato inflado — a justificativa escrita no teste é honesta e o risco
declarado pela task está travado, por isso não reabro a condição de merge. A segunda é a
mesma de antes, reduzida: os itinerários agora cumprem o critério literalmente, e só a
leitura sobre blocos de Serviço continua morando em comentário em vez de DEC. Ela precisa
ser registrada **antes** da TASK-034, que escreve os itens 5–8 sobre esta mesma
paginação — mas não bloqueia o merge desta entrega.
