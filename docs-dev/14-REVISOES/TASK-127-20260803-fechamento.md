# Revisão da TASK-127 — fechamento de ressalvas

**Revisor:** Claude Opus 5 (`/revisar-aderencia`, conversa separada da implementação)
**Data:** 2026-08-03
**Commit/branch revisado:** `15a1d47` (fechamento das ressalvas do parecer
`14-REVISOES/TASK-127-20260803.md`) e `a830a16` (registro no backlog da correção
`eeb6204`), branch `redesign`. Arquivos lidos no estado atual do working tree, não
só no diff.

## Resultado

- [ ] Aprovado
- [x] Aprovado com ressalvas
- [ ] Reprovado

**Condição de merge do parecer anterior: fechada.** Nenhuma condição de merge
remanescente; as ressalvas abaixo são follow-ups para a TASK-034.

## Resumo da entrega

`15a1d47` toca sete arquivos, todos dentro das ressalvas do parecer anterior.
`simbolos-mapa-pdf.ts` ganha o parâmetro `escala` (default `1`) em
`desenharSimbolos`, que multiplica lado do quadrado, raio do círculo, halo,
espaçamento do rótulo e corpo das fontes (`simbolos-mapa-pdf.ts:39-41,111-153,168-181`);
`captura-mapa-pdf.ts` passa a mesma `escala = canvasBase.width / largura` que já
corrigia as coordenadas (`captura-mapa-pdf.ts:136-147`), renomeia
`compornImagemComSimbolos` → `comporImagemComSimbolos` e exporta
`projetarSimbolos`/`comporImagemComSimbolos` + a interface mínima
`ProjetorDeCoordenadas` (`captura-mapa-pdf.ts:91-94`) para tornar o caminho de
composição testável sem WebGL. `legenda-itinerario.ts` desacopla numeração de
geolocalização: a parada é numerada por existir a Seção/Local, e a geolocalização
do sentido passa a governar **só** o desenho (`legenda-itinerario.ts:96-141`).
Testes: `pdf-composicao-simbolos.test.ts` (novo, 168 linhas), quatro casos de
escala em `pdf-simbolos-mapa.test.ts`, dois casos ancorados na fixture canônica e
um caso novo de Seção sem geolocalização em `pdf-legenda-itinerario.test.ts`, e a
reancoragem do teste negativo de nome de Local em `pdf-renderizacao.test.tsx`.
`a830a16` acrescenta 13 linhas à seção da TASK-117 em `06-BACKLOG_INICIAL.md:6681-6693`,
registrando `eeb6204` como correção pós-entrega já aplicada.

## Regras RN verificadas

- **RN-074** (estrutura fixa; item 4d) — **atendida, inalterada**.
  `modelo-pdf-operacional.ts` e `documento-pdf-operacional.tsx` **não** entram no
  diff (`git show --name-only 15a1d47`): a estrutura do §13.1 e `ORDEM_BLOCOS`
  seguem intocadas; mudou só como o símbolo é dimensionado dentro da imagem.
- **RN-076** (Locais fora da sequência, da descrição e das tabelas; `Cidade - Nome`)
  — **atendida**. `legendaSecoes` continua recebendo entradas só do ramo
  `secao_uuid` (`legenda-itinerario.ts:105`) e o nome vem de `nomeExibicaoSecao`.
  Verifiquei nesta revisão que `identificadoresLocais` não é renderizado em
  nenhuma superfície: os únicos consumidores são o próprio modelo
  (`modelo-pdf-operacional.ts:185,410,425`) e testes — `grep -rn identificadoresLocais src/`
  não devolve nenhum arquivo `.tsx`. O teste negativo de vazamento de nome
  (`pdf-renderizacao.test.tsx:223-238`) foi **reancorado** na fixture canônica; conferi
  por instrumentação descartável que a página de índice 3 do exemplo mínimo é de
  fato a de **"Itinerários"** e que a fixture tem o Local `2.1` na Ida — a asserção
  negativa continua incidindo sobre a página certa e não passa vacuamente.
- **RN-031** (Local pertence ao Serviço; numeração por Serviço e sentido) —
  **atendida**. A geolocalização da Seção continua lida da entrada
  `secao.servicos[servico_uuid]` do sentido corrente (`legenda-itinerario.ts:107-108`)
  e os Locais continuam vindo de `servico.locais`; a numeração segue derivada
  **por itinerário**, então o reinício por sentido permanece consequência
  estrutural.
- **RN-033** (Parada XOR) — **atendida**. O `if/else if` sobre
  `secao_uuid`/`local_uuid` (`legenda-itinerario.ts:97,117`) não mudou de forma;
  nunca lê os dois nem inventa um terceiro caso.
- **RN-035** (extremos são Seção) — **atendida no caso de borda**. Local antes da
  primeira Seção continua sem prefixo: com geolocalização, é desenhado sem rótulo;
  sem geolocalização, é ignorado (`legenda-itinerario.ts:122-127`). Nunca `0.1`.
  Teste preservado em `pdf-legenda-itinerario.test.ts:217-229` (`identificadoresLocais`
  vazio).
- **RN-036** (referência com geolocalização do sentido) — **atendida, com mudança de
  tratamento defensivo — ver problema 1**. A regra é de **validação** (criticidade
  Alta) e está exercida fora deste módulo: recusa na importação
  (`src/shared/contrato/validacoes-estruturais.ts:169,179,184,196,201`, mensagens
  `[RN-036]`) e, em edição, o itinerário sem ponto não roteia e gera pendência
  bloqueante "sem rota" (`src/formulario/pendencias/pendencias.ts:169-176`), que
  fecha o gate da RN-078. O documento em que os dois comportamentos divergem é,
  portanto, inalcançável por caminho válido.
- **RN-015 / NEG-019** (congelado, sem recálculo) — **atendida**. `grep -in "osrm\|fetch("`
  sobre o diff completo de `15a1d47` não devolve nenhuma linha; o desenho continua
  lendo `rota.geometria` e as geolocalizações congeladas.
- **RN-096 / NEG-004** (nada persistido) — **atendida**. `comporImagemComSimbolos`
  cria e descarta o canvas de composição na própria chamada
  (`captura-mapa-pdf.ts:126-149`); nenhum arquivo de `src/shared/contrato/` entra no
  diff.
- **RN-077 / RN-078** (rodapé e gate) — **atendidas, inalteradas**. Nenhum arquivo de
  rodapé, pendência ou exportação no diff; nenhum motivo de bloqueio novo.
- **NEG-001..019** — **nenhuma violação**. O commit não cria status, workflow,
  persistência, backend nem valor monetário; `a830a16` é registro documental no
  backlog, que é exatamente onde o processo do ROTA registra correção — não é
  estado de processo dentro do produto.

## Specs verificadas

- **Spec 04 §13.1 item 4b** — **aderente**. `sequenciaDeSecoes`
  (`modelo-pdf-operacional.ts:294-310`) não foi tocada; li a função nesta revisão e
  confirmei que ela filtra **apenas** por Seção inexistente (`.filter((secao): secao is Secao => secao !== undefined)`)
  — é exatamente o critério para o qual `numerarItinerario` foi alinhada.
- **Spec 04 §13.1 item 4d** — **aderente**. A imagem continua sendo composição 2D
  sobre o canvas capturado; a mudança é de dimensionamento, não de conteúdo.
- **Spec 04 §13.1 item 8b** ("relação de Locais comuns por Serviço/sentido — nome,
  município, **posição no itinerário**") — **aderente, e é o argumento que sustenta a
  mudança do problema 1**: o identificador que a TASK-034 vai referenciar descreve
  posição na travessia, e a posição existe independentemente de haver ponto
  desenhável. `identificadoresLocais` continua exposto e não escrito no corpo.
- **Spec 04 §7.1** (`Cidade - Nome da Seção`) — **aderente** (`nomeExibicaoSecao`
  inalterado; asserção em `pdf-legenda-itinerario.test.ts:266-269`).
- **Spec 04 §7.3 / Spec 01 §8** — **aderente**. Continua captura de canvas
  client-side, sem camada GL com `text-field`. A tipagem
  `import("maplibre-gl").Map` foi trocada pela interface local
  `ProjetorDeCoordenadas` (`captura-mapa-pdf.ts:91-94`): `maplibre-gl` segue
  entrando **só** pelo import dinâmico dentro de `capturarMapaDaRota`
  (comentário e desenho preservados em `captura-mapa-pdf.ts:3-7`), então o novo
  teste importa o módulo sem arrastar WebGL.
- **Spec 02 §5.1 / §7.1 / §10** — **aderente**. A ordenação defensiva por
  `paradas[].ordem` (`legenda-itinerario.ts:94`) permanece; as geolocalizações
  continuam lidas por Serviço/sentido.
- **DEC-104** — **preservada**. A tolerância a falha continua em duas camadas:
  `simbolos.length === 0` cai no caminho antigo e a exceção de composição cai para
  o traçado puro (`captura-mapa-pdf.ts:232-243`). O teste
  `pdf-composicao-simbolos.test.ts:132-140` fixa que contexto 2D indisponível
  **lança**, e o `catch` do chamador é quem tolera.
- **DEC-105** — **aderente em forma, cor e hierarquia**; a escala é multiplicativa
  sobre os nominais, então a razão quadrado : círculo (34 : 24) é invariante.
  Ver o problema 1 quanto ao item 4 da decisão ("ligando cada Local do anexo ao
  símbolo correspondente no mapa").
- **DEC-069 / doc 18 §2** — **aderente**: `#1d4ed8` e `#16a34a` inalterados.
- **doc 08 §7** — **aderente**: o novo teste usa contexto 2D falso que registra
  chamadas e um **canvas falso** (objeto com `width/height/getContext/toDataURL`)
  devolvido por `document.createElement` espionado
  (`pdf-composicao-simbolos.test.ts:59-78`). Não há `HTMLCanvasElement` real,
  `getContext("webgl")`, tile nem `maplibre-gl` em Vitest; o ambiente é `jsdom`
  só para existir `document`.

## Pontos corretos

- **A condição de merge está efetivamente fechada, e provei que os testes novos
  falhariam antes.** Restaurei `src/formulario/pdf/` no estado de `497cfe4` e rodei
  os três arquivos de teste alvo: **9 testes falharam** (`expected 34 to be 68`,
  `expected 12 to be 24`, e as asserções de composição/legenda), e o working tree
  foi restaurado logo em seguida (`git status` limpo). Os testes de escala não são
  tautológicos.
- A correção é a mínima e a certa: `escala` multiplica **tamanhos**, nunca
  posições (que já vinham escaladas pelo chamador), e o default `1` garante
  ausência de regressão — coberto por teste explícito
  (`pdf-simbolos-mapa.test.ts:196-204`). Como a mesma razão escala coordenadas e
  tamanhos, o símbolo passa a ocupar fração constante da imagem para qualquer
  `devicePixelRatio`, que era exatamente o defeito relatado.
- O caminho de composição saiu de zero cobertura para seis testes, incluindo
  dois casos inválidos (`getContext` nulo; lista vazia sem chamar o projetor).
- O alinhamento com `sequenciaDeSecoes` é real e verificado nas duas pontas:
  ambas passam a filtrar só por existência da Seção. O efeito colateral bom é que
  o ordinal deixou de deslizar — antes, uma Seção sem ponto fazia o mapa desenhar
  `1º` sobre a Seção que a sequência (b) chama de segunda; agora a legenda e a
  sequência têm o mesmo cardinal e o mesmo ordinal.
- A reancoragem na fixture canônica (`documentoExemploMinimo`, exemplo mínimo da
  Spec 02 §15) é feita com `esquemaDocumentoOperacao.parse` **depois** da mutação
  (`pdf-renderizacao.test.tsx:228-230`), então o documento sob teste é
  comprovadamente válido — o oposto do objeto parcial anterior.
- O renome `compornImagemComSimbolos` → `comporImagemComSimbolos` foi feito em
  todas as ocorrências (`grep` por `compornImagem` no `src/` e `testes/`: nenhuma).
- `a830a16` está bem ancorado: as 13 linhas entram no fim da seção da TASK-117,
  imediatamente antes de `## TASK-118` (`06-BACKLOG_INICIAL.md:6681-6693`), no mesmo
  nível de heading que o resto do documento usa, sem remover nada
  (`--numstat`: `13 0`).

## Problemas encontrados

1. **[Menor — deriva controlada de escopo, com efeito para a TASK-034] O fechamento
   da ressalva 3 mudou também o ramo do Local, e agora um Local sem geolocalização
   do sentido recebe identificador sem ter símbolo no mapa.**
   O parecer anterior pediu *alinhamento* entre `numerarItinerario` e
   `sequenciaDeSecoes` — e `sequenciaDeSecoes` (`modelo-pdf-operacional.ts:294-310`)
   só fala de **Seções**. A implementação estendeu a mesma regra ao ramo
   `local_uuid` (`legenda-itinerario.ts:117-139`): o Local sem
   `geolocalizacao_<sentido>` passa a consumir `n.m` e a entrar em
   `identificadoresLocais`, ficando apenas sem símbolo. É mudança de comportamento
   observável que a ressalva não exigia. Avaliei-a criticamente e **não a considero
   violação**, por três razões verificadas: (a) o critério de aceite/caso inválido da
   task — *"Local sem geolocalização do sentido em edição: não é desenhado, e o
   identificador não é atribuído a outro Local por engano"* — é satisfeito **melhor**
   agora do que antes: cada Local fica com o seu próprio identificador
   (`1.1` para o sem ponto, `1.2` para o seguinte —
   `pdf-legenda-itinerario.test.ts:241-251`), enquanto no comportamento anterior o
   `1.1` era herdado pelo Local seguinte; (b) o §13.1 item 8b pede "posição no
   itinerário", e a posição não depende de haver ponto desenhável; (c) RN-035 e
   RN-036 não são contrariadas — a RN-036 é validação, e o documento em que isso
   se manifesta já é recusado na importação e bloqueado no gate em edição (ver RN-036
   acima). **O que fica como ressalva** é a tensão com a DEC-105 item 4, que descreve
   os identificadores do anexo como "ligando cada Local do anexo ao **símbolo
   correspondente** no mapa do corpo": nesse documento inválido, o anexo da TASK-034
   passará a exibir um `1.1` que **não existe** na imagem, e a série vista no mapa
   pulará números. Antes havia bijeção anexo ↔ mapa. **Ação:** a TASK-034 deve
   decidir explicitamente como o anexo trata Local sem ponto (omitir, marcar "sem
   localização" ou apenas listar), e não presumir que todo identificador tem símbolo.
   Não é condição de merge: o caso é inalcançável em documento válido e nenhuma RN
   Alta é violada.

2. **[Menor] O teste que fecha a ressalva 3 no ramo da Seção não exercita a
   variante que a RN-036 nomeia.** `pdf-legenda-itinerario.test.ts:252-273` chama
   `secao(SECAO_A, "Cidade A", "Seção A", {})`, e o helper
   (`pdf-legenda-itinerario.test.ts:18-36`) constrói `servicos: []` a partir do
   record vazio — ou seja, o caso coberto é "a Seção referenciada **não tem entrada**
   para este Serviço" (`validacoes-estruturais.ts:179`), não "a entrada existe e está
   **sem `geolocalizacao_<sentido>`**" (`validacoes-estruturais.ts:184`), que é o que
   o nome do teste anuncia. O código guarda os dois com o mesmo
   `entrada?.[campoGeolocalizacao]` (`legenda-itinerario.ts:107-108`), então não há
   defeito — há imprecisão de rótulo e uma variante da RN-036 sem caso próprio.

3. **[Menor — herdado, parcialmente fechado] Fixtures ad hoc.** Dois dos alvos do
   problema 5 anterior foram reancorados na fixture canônica, mas
   `pdf-legenda-itinerario.test.ts:18-72` mantém os helpers `secao`/`local`/`parada`
   construídos à mão para os demais casos. A justificativa está escrita no cabeçalho
   do arquivo (`:6-13`) e é legítima para os casos de borda — um documento canônico
   não pode violar RN-035/RN-036 por definição —, mas há casos **válidos** ainda
   sobre fixture manual (Seção compartilhada por dois Serviços, itinerário sem
   Local) que caberiam na canônica. Item "fixtures canônicas reutilizadas" do
   checklist 07 fica **parcialmente** atendido.

4. **[Menor — registro] A §3 de `19-STATUS_EXECUCAO.md` não acompanha os ciclos
   fechados.** A tabela de tasks executadas termina na **125**: nem a TASK-126
   (ciclo encerrado em 2026-08-02, conforme o próprio bloco de histórico do
   documento) nem a TASK-127 têm linha, e o texto "102 tasks concluídas"
   (`19-STATUS_EXECUCAO.md:615`) já diverge das **113** linhas da tabela. **Não
   toquei a tabela nem o total nesta revisão**, para não misturar o registro de
   outra task e não alterar um número cuja base de contagem não consegui reconstruir;
   registrei o estado real no bloco de atualização, como fez o fechamento da
   TASK-126. Fica como pendência de **registro**, sem efeito sobre código.

## Violações de escopo

- **Nenhuma.** Os sete arquivos de `15a1d47` são exatamente os do fechamento das
  ressalvas 1, 3, 4 e 5 do parecer anterior; nenhum arquivo de UI, de contrato, de
  pendências ou de outra task entrou. `modelo-pdf-operacional.ts`,
  `documento-pdf-operacional.tsx` e `estilos-pdf.ts` — tocados na primeira entrega —
  ficaram **fora** deste diff, o que é o sinal de que nada foi "aproveitado".
- Os oito itens do "Fora de escopo" da task continuam respeitados: nenhum Local na
  legenda do corpo, na sequência (b) ou na descrição (c); anexo da TASK-034 não
  escrito; ponto de rota sem símbolo e sem rótulo; `shared/mapa/mapa.tsx` e a etapa
  de mapa intocados; nenhuma camada GL com `text-field`; enquadramento da DEC-104 e
  tolerância a falha intactos; nenhum acabamento tipográfico geral (TASK-126 segue
  dona da folha).
- A violação de escopo do parecer anterior (`eeb6204`) foi **encerrada pela via que
  o parecer indicou e que o responsável escolheu**: `a830a16` registra a correção na
  seção da TASK-117 do backlog, em vez de reverter. Não reabro a ressalva.
- O ramo do Local do problema 1 é a única mudança de comportamento além da letra da
  ressalva; está declarada na mensagem do commit e permanece dentro dos módulos da
  própria task.

## Testes avaliados

- **cobertura das RN da task:** sim, e agora sem a lacuna anterior. O caminho de
  composição — `projetarSimbolos` e `comporImagemComSimbolos` — passou a ter teste
  próprio (`pdf-composicao-simbolos.test.ts`), que é onde a escala da RN-074/DEC-105
  se materializa na imagem. RN-076, RN-031, RN-033, RN-035 e RN-036 seguem cobertas
  em `pdf-legenda-itinerario.test.ts`.
- **casos inválidos testados:** sim. Novos: contexto 2D indisponível
  (`pdf-composicao-simbolos.test.ts:132-140`), lista vazia sem chamar o projetor
  (`:161-167`), escala fracionária sem produzir `NaN`
  (`pdf-simbolos-mapa.test.ts:206-215`), Seção sem geolocalização do sentido
  (`pdf-legenda-itinerario.test.ts:252-273`). Os seis casos inválidos da task
  continuam cobertos.
- **teste que falharia antes:** **sim, verificado por execução.** Com
  `src/formulario/pdf/` restaurado em `497cfe4`, os arquivos
  `pdf-composicao-simbolos`, `pdf-simbolos-mapa` e `pdf-legenda-itinerario`
  acusam **9 falhas** (3 arquivos vermelhos), entre elas
  `expected 34 to be 68` e `expected 12 to be 24` — exatamente as asserções de
  escala. Working tree restaurado e limpo em seguida.
- **regressão de UUID:** N/A — a task não toca import/export/cópia; nenhum arquivo
  de contrato no diff.
- **OSRM mockado:** N/A — nenhuma chamada; captura injetada e desenho sobre canvas
  e contexto falsos.
- **suíte executada com resultado:** **verde, reutilizada sem reexecução**, conforme
  a política de evidência canônica. `npm run test:all:verificar` executado nesta
  revisão → "Log canônico válido. Executor: **Claude**. Fingerprint:
  `69374a3b8dd1fedd5d6034427f9ba5cb7be1415989adb7d38b90d63e82d554b7`. Working tree:
  `f216d04bbdc2b0d9cc65af66e626404e432e07f5195f98dee7dc136d3e1b32e0`."
  `RESUMO FINAL` do `ultimo-test-all.log`: Código Testes unitários **0**, Código
  Testes E2E **0**, `Resultado geral: APROVADO`, **1520 unitários em 110 arquivos**
  (`ultimo-test-all.log:32-33`) + **111 E2E** — +13 unitários e +1 arquivo sobre o
  parecer anterior (1507/109), o que bate exatamente com os testes acrescentados
  (6 + 4 + 2 + 1). Rodei também nesta revisão: `npm run typecheck` (limpo),
  `npm run lint` (limpo) e `npm run check:rastreabilidade`
  ("Rastreabilidade de decisões: OK"). A suíte pesada **não** foi repetida.

## Checklist 07

**Resultado: 23 itens ok, 27 N/A, 0 violados, 3 com ressalva.**

- **Escopo (6/6 ok)** — pertence ao ROTA e não ao SEI; sem workflow; sem status de
  pedido; sem persistência transacional; **apenas** o escopo do fechamento de
  ressalvas (o item violado no parecer anterior está fechado por `a830a16`); nenhuma
  regra inventada — cada decisão cita DEC-104/DEC-105, RN-035/RN-036 ou §13.1.
- **JSON (contrato)** — N/A em bloco: nenhum arquivo de schema/contrato no diff;
  nada gravado. Os dois itens verificáveis por leitura (RN-033 XOR preservado;
  RN-015 congelado não recalculado) estão **ok**.
- **Domínio** — Seção e Local seguem entidades separadas, sem promoção
  (RN-025/RN-031) **ok**; ponto de rota sem uuid/símbolo (RN-042) **ok**; extremos
  Seção (RN-035) **ok**; `numero_n` não usado como identidade **ok**. Tipificação,
  viagens, feriados e `numero_n`/identidade de Serviço: **N/A**.
- **Comparador (7 itens)** — **N/A**: nenhum arquivo de `comparador/` no diff.
- **Roteamento (5 itens)** — **N/A**, com a confirmação positiva de ausência de OSRM
  (`grep` no diff).
- **UI/PDF** — `Cidade - Nome da Seção` **ok**; sem offsets **ok**; matrizes **N/A**;
  aviso SEI e gate da RN-078 **ok** (intocados); design system **N/A** (nenhum
  componente de UI no diff — o canvas de composição não é superfície de UI);
  `data-testid`/`aria-*` **ok** (nenhum tocado; 111 E2E verdes sem alteração de
  seletor). **Com ressalva:** "Locais fora da grade principal, da descrição textual e
  do corpo do PDF (só anexo)" — atendido na letra, com a leitura da DEC-105 de que a
  **imagem** não é nenhuma dessas superfícies; mantenho o registro do parecer
  anterior para que a próxima revisão não trate isso como regressão.
- **Testes** — "toda regra RN alterada possui teste" **ok** (a lacuna do caminho de
  composição foi fechada); "casos inválidos" **ok**; UUID **N/A**; OSRM **N/A**;
  verificações direcionadas/typecheck/lint reportados **ok**; evidência única e
  `test:all:verificar` verde **ok**; log válido reutilizado sem repetir a suíte
  **ok**; porta/PIDs — o log registra o encerramento do grupo do PID próprio e a
  revisão não subiu servidor **ok**. **Com ressalva:** "fixtures canônicas
  reutilizadas" → problema 3 (parcialmente fechado). **Com ressalva:** precisão do
  caso de RN-036 exercitado → problema 2.

## Pendências

- **Nenhuma condição de merge.** A única do parecer anterior (escala/`devicePixelRatio`)
  está fechada e provada por teste que falha no código anterior.
- **Antes/junto da TASK-034:** decidir como o anexo (§13.1 item 8b) trata Local sem
  geolocalização do sentido, agora que ele **recebe** identificador sem ter símbolo
  no mapa (problema 1). É a única consequência real deste commit sobre outra task.
- **Follow-up menor:** dar caso próprio à variante "entrada da Seção existe, sem
  `geolocalizacao_<sentido>`" e ajustar o nome do teste atual (problema 2);
  migrar para a fixture canônica os casos **válidos** que ainda usam helper manual
  (problema 3).
- **Registro:** reconciliar a §3 de `19-STATUS_EXECUCAO.md` — TASK-126 e TASK-127
  sem linha na tabela e o total "102" divergente das 113 linhas (problema 4).
  Deliberadamente não alterei a tabela nem o total.
- **Nenhuma Q-xxx** foi criada ou afetada. DEC-104 e DEC-105 cobrem tudo o que a
  implementação exerceu; nenhuma decisão precisou ser reescrita.

## Decisão

**Aprovado com ressalvas, sem condição de merge remanescente.** O fechamento faz o
que o parecer anterior exigiu e faz bem: a escala passou a ser a mesma razão para
coordenadas e tamanhos, o default `1` protege contra regressão, o caminho de
composição saiu de cobertura zero para seis testes com canvas e contexto falsos — e
verifiquei por execução que esses testes falham contra o código anterior, o que
descarta asserção tautológica. O renome do erro de digitação, a reancoragem na
fixture canônica e o registro de `eeb6204` no backlog fecham as ressalvas 2, 4 e 5.
O diff é estritamente o das ressalvas; nada de UI, contrato ou outra task entrou, e
nenhuma RN de criticidade Alta ou NEG-xxx é violada.

Não é aprovação limpa por um motivo e três detalhes. O motivo é o problema 1: o
alinhamento pedido era sobre Seção, e a implementação estendeu a regra ao Local,
mudando comportamento observável — a favor dela pesam o critério de aceite da task
(que passa a ser atendido mais literalmente), o §13.1 item 8b e a inalcançabilidade
do caso em documento válido; contra ela pesa a DEC-105 item 4, que descreve a
ligação anexo ↔ símbolo como total. Como a divergência só aparece em documento que
a RN-036 já recusa na importação e que o gate da RN-078 já bloqueia em edição, é
ressalva e não impedimento — mas é obrigação da TASK-034 resolvê-la
explicitamente, não herdá-la por omissão. Os detalhes são a imprecisão do caso de
RN-036 exercitado, o fechamento apenas parcial das fixtures ad hoc e o atraso de
registro da §3 do documento 19.
