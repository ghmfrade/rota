# 19 — STATUS_EXECUCAO: o que já foi executado e o que falta

**Para que serve:** dar uma visão única e verificável do **estado de execução** de todas as tasks do `06-BACKLOG_INICIAL.md`, com a **ordem recomendada** do que ainda falta e uma estimativa de **complexidade**. Existe porque o backlog descreve *o conteúdo* de cada task, mas não registra *o que já rodou* — e essa lacuna já deixou pelo menos uma task ser pulada silenciosamente (ver §6).

**O que este documento NÃO é:** não é fonte de verdade sobre o conteúdo, escopo ou regras de nenhuma task — isso continua sendo o `06-BACKLOG_INICIAL.md` (e, acima dele, as specs e o `01-RULE_INDEX.md`, conforme a hierarquia do `00-README-SPEC-DRIVEN.md`). Aqui só se registra **status e sequenciamento**. Em caso de divergência sobre escopo, o backlog vence.

**Última atualização:** 2026-07-21 (branch `redesign`) — TASK-068 corrigida e aprovada na reavaliação; Q-049 decidida pela DEC-070 e TASK-079/064/076 alinhadas ao estado contextual de Local em extremo. TASK-089 reconhecida como absorvida pela TASK-068 e aprovada com ressalva de rastreabilidade; não deve ser reimplementada.

---

## 1. Como manter (evitar que uma task seja pulada de novo)

Este documento só cumpre a função se for atualizado no mesmo movimento do ciclo da task:

1. Ao **concluir** uma task (implementação + `/revisar-aderencia` registrada em `14-REVISOES/`), mova-a da §5 para a §3.
2. Ao **criar** uma task nova (`/nova-task`), acrescente-a na §5, na posição da ordem recomendada, com a complexidade estimada — e **confira se ela não se sobrepõe a uma task pendente** (foi exatamente o que faltou entre a TASK-046 e a TASK-087; ver §6).
3. Ao **pular deliberadamente** uma task da ordem recomendada, registre o motivo na §6. Pular sem registrar é o defeito que este documento existe para impedir.

**Método de verificação do status** (reproduzível): uma task conta como executada quando existe commit `Implementa TASK-xxx` no histórico **e/ou** arquivo de parecer em `docs-dev/14-REVISOES/TASK-xxx-*.md`. Comandos usados no levantamento:

```bash
git log --all --oneline | grep -oiE "Implementa TASK-[0-9]{3}" | sort -u
ls docs-dev/14-REVISOES/
```

## 2. Legenda de complexidade

Escala de **1 a 5**, combinando esforço e risco de regressão — não só volume de código. Aplica-se **somente às tasks pendentes** (§5); as já executadas não recebem nota.

| Nota | Significado |
|:---:|---|
| **1** | Trivial: poucos pontos de código, sem lógica de domínio nova. |
| **2** | Pequena: escopo fechado, primitivas já existem, testes diretos. |
| **3** | Média: lógica nova ou vários pontos de código; risco moderado de regressão. |
| **4** | Grande: regra de domínio com múltiplos casos, ou superfície ampla de UI. |
| **5** | Refactor grande na superfície mais ativa do app; alto risco de regressão. |

---

## 3. Tasks executadas

71 tasks concluídas. Agrupadas pela fase do backlog.

### Fases 1–3 — Fundação, contrato JSON e validações de domínio

| Task | Título resumido |
|---|---|
| 001 | Bootstrap do projeto Next.js |
| 002 | Recursos estáticos: listas e base de municípios |
| 003 | Schema base do JSON de operação |
| 004 | Validador XOR de Parada e extremos-Seção — ⚠️ ver §4 |
| 005 | Factory de entidades com UUID |
| 006 | Importação de JSON com preservação de UUID |
| 007 | Exportação de JSON (proposta / vigente) |
| 008 | Módulo de tipificação tipo × característica |
| 009 | Primitivas geoespaciais: Haversine e centroide |
| 010 | Regra dos 350 m (incremental e pareada) |
| 011 | Derivação de município por ponto-em-polígono |
| 012 | Checagens estáticas consolidadas de leitor |

### Fase 4 — Formulário

| Task | Título resumido |
|---|---|
| 013 | Tela inicial: carregar JSON × criar do zero |
| 014 | Layout por etapas + painel de pendências |
| 015 | Etapa Identificação |
| 016 | Etapa Serviços (CRUD + duplicar) |
| 017 | Editor de Seções no mapa |
| 018 | Editor de Locais no mapa |
| 019 | Montagem do itinerário (paradas + tabela lateral) |

### Fases 5–6 — Mapa, roteamento, distâncias e seccionamento

| Task | Título resumido |
|---|---|
| 020 | Mapa base MapLibre/OSM |
| 021 | Cliente OSRM |
| 022 | Tratamento de falha do OSRM (bloqueante) |
| 023 | Pontos de rota (forçar traçado) |
| 024 | Recalcular × abrir congelado |
| 025 | Descrição textual do itinerário |
| 026 | Cálculo da matriz de distâncias |
| 027 | Editor da matriz de seccionamento |
| 048 | Display read-only da matriz de distâncias |

### Fase 7 — Viagens, horários e revisão final

| Task | Título resumido |
|---|---|
| 028 | Grade de horários (dias comuns) |
| 029 | Edição de horário passante (âncoras + redistribuição) |
| 030 | Tabela de feriados e cópias |
| 031 | Contagens e resumo operacional |
| 032 | Revisão e validação final |

### Fase 12 — Qualidade e follow-ups

| Task | Título resumido |
|---|---|
| 041 | Fixtures canônicas de JSON |
| 042 | Suíte de regressão de UUID e contrato |
| 043 | Consolidação do arredondamento half-up |
| 044 | Pendência bloqueante de itinerário sem rota válida |
| 045 | Fetch-espião ativo na garantia de abertura sem OSRM |
| 046 | Reconciliação de horários/offsets quando o itinerário muda |
| 047 | Feedback do motivo de o recálculo não ocorrer |

### Fase 13 — Redesign visual (DEC-050)

| Task | Título resumido |
|---|---|
| 049 | Fundação do design system: Tailwind 4 + tokens |
| 050 | Componentes base `shared/ui` + ícones-carimbo |
| 051 | Shell full-screen + sidebar de carimbos |
| 052 | Tela inicial redesenhada |
| 053 | Etapa Identificação com `shared/ui` |
| 054 | Etapa Serviços com `shared/ui` |
| 055 | Etapa Seções, Locais e Itinerários + editores |
| 056 | Etapas Viagens e Matrizes + varredura final |
| 057 | Contadores de viagens semanais por Serviço |
| 058 | Ressalvas pendentes das revisões do bloco |

### Correções da etapa de itinerários (mapa/rota) e follow-ups recentes

| Task | Título resumido |
|---|---|
| 059 | Desenhar a rota ativa no mapa |
| 060 | Unificar os dois mapas num único mapa + tabela lateral |
| 061 | Promover `ServicoEmConstrucao` no fluxo "novo" |
| 063 | Gesto de ponto de rota no mapa único |
| 066 | Re-ancorar pontos de rota quando as paradas mudam |
| 071 | Pontos de rota sobrevivem a um recálculo que falha |
| 072 | Unificar o CRUD da etapa Serviços no modo "novo" |
| 073 | Tela inicial: cartões inteiros clicáveis |
| 074 | Coluna lateral: reuso de Seção + rolagem própria |
| 080 | Promover `ServicoEmConstrucao` no modo "carregado" |
| 081 | Alerta "tabela de feriados vazia" na Revisão |
| 084 | Remover parada limpa `secao.servicos[]` + Seção órfã (RN-018) |
| 085 | Erros que bloqueiam a exportação ficam visíveis |
| 086 | Diagnóstico técnico de DEV para os erros do gate |
| 082 | Bloquear exportação com violação de 350 m ou tipificação |
| 083 | Descartar ponto de rota órfão na remoção de extremo (DEC-068) |
| 088 | Remover Seção reconcilia `matriz_seccionamento` com `matriz_distancias` (RN-059) |
| 065 | Inverter os gestos do mapa único: esquerdo = ponto de rota, direito = menu Seção/Local |
| 067 | Inserção posicional: clique direito sobre a linha insere a parada entre as paradas do trecho |
| 068 | Vocabulário visual + degradação do clique + erro contextual de Local em extremo |
| 089 | E2E de recálculo afere ausência de bloqueante — absorvida pela TASK-068 |
| 090 | Executor canônico e controlado da suíte completa |

---

## 4. Pendências de **registro** (código entregue, ciclo não fechado)

Nenhuma destas exige reimplementação — são lacunas de rastreabilidade.

- **TASK-004** — o único commit é `5d0ba4b WIP TASK-004 (interrompida no meio do ciclo): implementa RN-036`, e **não há parecer** em `14-REVISOES/`. Verificação do código, porém, mostra o conteúdo **entregue**: RN-033 (XOR) em `src/shared/contrato/esquema.ts`; RN-034/035/036 em `src/shared/contrato/validacoes-estruturais.ts`; testes em `testes/unitarios/contrato/paradas-itinerarios.test.ts`. **Ação sugerida:** rodar `/revisar-aderencia` na 004 para fechar o ciclo formalmente, ou registrar aqui que foi absorvida pelas tasks seguintes.
- **TASK-001..012, 041, 042** — implementadas antes de o processo de parecer existir (os pareceres começam em 2026-07-09, com TASK-008/013). Ausência de arquivo em `14-REVISOES/` é esperada e não indica pendência.

---

## 5. Tasks a executar — ordem recomendada

17 tasks pendentes. A **TASK-089** saiu da lista: a correção foi absorvida pelo commit `37502b4` da TASK-068 e **aprovada com ressalva de rastreabilidade** em `docs-dev/14-REVISOES/TASK-089-20260721.md`; o cenário afere ausência de bloqueante, passa 3/3 e a suíte canônica está verde. A **TASK-068** saiu da lista: a entrega inicial `37502b4` foi reprovada em `14-REVISOES/TASK-068-20260721.md`, corrigida em `861b5a4` e **aprovada** em `14-REVISOES/TASK-068-20260721-reavaliacao.md`; a correção completou a cobertura de RN-035/fallback, impediu a promoção do Serviço com Local extremo e a suíte canônica terminou verde. A **TASK-090** também saiu da lista: a entrega inicial `735c992` foi reprovada em `14-REVISOES/TASK-090-20260721.md`, corrigida em `aa79302` e **aprovada** em `14-REVISOES/TASK-090-20260721-reavaliacao.md`; o executor canônico agora rejeita log de outro working tree e cobre os caminhos negativos reais. A ordem abaixo respeita as dependências declaradas nas próprias tasks; onde há folga, ela é indicada. A antiga prioridade máxima (TASK-082) foi concluída; a visibilidade dos motivos usa a infraestrutura entregue pelas TASK-085/086. O Grupo A (bug vivo de integridade das matrizes) foi fechado pela **TASK-088**, implementada em `2b27c9a` e aprovada em `docs-dev/14-REVISOES/TASK-088-20260720.md` — não há mais bug bloqueando a exportação após remover uma Seção. A **TASK-065** saiu da lista de pendentes: reprovada em 2026-07-20 por E2E vermelho, foi corrigida em `6469a04` e **aprovada com ressalvas** na reavaliação `docs-dev/14-REVISOES/TASK-065-20260720-reavaliacao.md`. A **TASK-067** também saiu: implementada em `b2b3ab7` e **aprovada com ressalvas** em `docs-dev/14-REVISOES/TASK-067-20260720.md` — a condição de entrada herdada da 065 (teste do hit-test de `contextmenu`) foi cumprida por `testes/unitarios/mapa/mapa.test.tsx`, e sua condição de merge foi absorvida e concluída pela TASK-068.

### Grupo B — Ramo do mapa e pontos de rota

Fecha a UX de mapa e interações. Depende só do que já está entregue (060, 063, 065, 066, 067, 071).

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 1 | **069** — Affordance de hover sobre a linha | **2** | Desbloqueada pela conclusão da 068. |
| 2 | **070** — Clique sobre o vértice remove o ponto de rota | **2** | Independente de 067 (✅). |
| 3 | **079** — Pontos de rota na lista lateral intercalados | **4** | Ao reconstruir a lista, preserva o estado vermelho/descrição do Local extremo (DEC-070). Desbloqueada por 068 + 066 + 071. |
| 4 | **064** — Sincronização de seleção tabela↔mapa | **3** | Depois da 079; seleção usa canal distinto e não mascara linha/borda vermelha de RN-035 (DEC-070). |

**Condição de merge da TASK-067 concluída pela TASK-068** (parecer `14-REVISOES/TASK-067-20260720.md`, problema 1): com
montagem inválida e a última rota válida ainda desenhada, o clique direito **sobre a linha** descarta
a Seção/Local criada **sem mensagem** — `prepararInsercaoDeParada` devolve `undefined`
(`src/formulario/itinerarios/etapa-itinerarios.tsx:490,499,510`) e os chamadores só retornam. A
correção prescrita pela DEC-055 é degradar para o caminho "fora da linha" (acrescentar ao fim), com
teste do caso "montagem inválida + linha desenhada". Não exige Q-xxx. **Encaminhada em 2026-07-21:**
por decisão do responsável, virou o **item D da TASK-068** — concluído e coberto por testes; não há task própria para ela.

**Feedback contextual do Local em extremo (Q-049/DEC-070, 2026-07-21):** o fallback mantém o Local
na lista de edição, mas a ocorrência no primeiro/último lugar fica inválida: linha correspondente da
tabela em vermelho com explicação no hover/foco, marcador circular verde com borda vermelha, aviso
geral da TASK-047 preservado e zero OSRM/conclusão/exportação enquanto RN-035 persistir. A TASK-068
implementou; TASK-079/064/076 têm obrigação explícita de preservar/compor o estado.

Travas rígidas: `068 → 069`, `068 → 079 → 064` e `068 → 076` (preservação da DEC-070). As demais têm folga entre si.

### Grupo C — Grandes refactors de sentido e Seção

As próprias tasks pedem rodar **depois** do Grupo B, para não retrabalhar a superfície mais ativa.

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 5 | **077** — Volta espelhada (ordem inversa como regra dura) | **4** | Antes da 076 (que assume Volta derivada). **Herda a obrigação** de manter corretas a limpeza de Seção (084, entregue), a reconciliação de horários (046) e a reconciliação das matrizes (088) quando o espelho refletir a remoção nos dois sentidos. |
| 6 | **076** — Ida e Volta no mesmo mapa (abas, tracejado, dois painéis) | **5** | A mais cara do backlog pendente. Deixar por último do grupo; preserva erro de Local extremo por sentido, sem contaminar a ocorrência válida no outro (DEC-070). |
| 7 | **078** — Realocação de Seção inteira (translação rígida) | **4** | Cascata de recálculo multi-Serviço — caminho novo. |

### Grupo D — UX restante e qualidade

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 8 | **075** — Identificação: pré-visualização + confirmação explícita | **2** | Encaixe livre — independente de tudo acima. |
| 9 | **062** — E2E do fluxo "criar do zero" ponta a ponta | **3** | Depois do mapa estabilizado, senão os seletores mudam de novo. |
### Grupo E — Fases originais restantes (MVP 3 em diante)

Independentes do ramo do mapa: nada aqui bloqueia ou é bloqueado por ele.

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 10 | **033** — PDF operacional: estrutura e identificação | **4** | Subsistema novo (@react-pdf) + captura do mapa. |
| 11 | **034** — PDF operacional: tabelas horárias e matrizes | **3** | Sobre a 033. |
| 12 | **035** — Comparador: carregamento e validação dos dois arquivos | **3** | |
| 13 | **036** — Motor de diff por UUID + taxonomia | **5** | Núcleo do Comparador; casamento por UUID e por contexto. |
| 14 | **037** — Telas de comparação | **4** | Superfície ampla (5 visões/abas). |
| 15 | **038** — Mapa comparativo | **3** | Bloqueio parcial: Q-004 (tolerância). |
| 16 | **039** — PDF comparativo completo | **4** | |

### Grupo F — Bloqueada

| Task | Complex. | Observação |
|---|:---:|---|
| **040** — Spec 06 + plano do Ingestor | — | **Não implementar** antes da decisão humana (RN-093). Depende dos MVPs 0–4 entregues. |

---

## 6. Achados de sequenciamento (registro para não repetir)

### 6.1 TASK-046 foi pulada silenciosamente — resolvido em 2026-07-20

A ordem recomendada do `06-BACKLOG_INICIAL.md` prevê `… 028 → 046 → 029 → 030 → 031 → 032`. As tasks 029, 030, 031 e 032 foram executadas, mas a **046 não** — existe apenas o commit que a criou (`c86397f`, junto com a 047). Consequência: a reconciliação de `horarios_paradas` na mudança de itinerário (DEC-048/Q-029) nunca entrou, e a violação **RN-063** ficou alcançável pelo usuário — que é justamente o bug reportado em 2026-07-18 e transformado na TASK-087.

**Resolução:** a TASK-046 foi implementada no commit `ef08312` e aprovada no
parecer `docs-dev/14-REVISOES/TASK-046-20260720.md` (commit `a15986d`). A skill
`revisar-aderencia` passou a exigir a atualização deste documento no mesmo ciclo.

**Lição registrada:** a ordem recomendada do backlog não era conferida contra o que efetivamente rodou. É a razão de existir deste documento (§1).

### 6.2 TASK-087 foi absorvida pela TASK-046 — resolvido em 2026-07-20

A 087 (remover parada reconcilia `horarios_paradas`) é a **fatia "remover" do caso (a) da 046**, que já cobre inserir/remover/reordenar. A 087 foi redigida sem citar a 046 em nenhum ponto — nem no contexto, nem nas dependências.

**Risco concreto se a 087 for implementada isolada:** o write-back `servicosComItinerarioAtualizado` (`src/formulario/itinerarios/etapa-itinerarios.tsx`) é chamado por `aplicarNovasParadas` **tanto** quando o conjunto/ordem de paradas muda **quanto** nos gestos de ponto de rota e arrasto de coordenada (paradas inalteradas). Reconciliar os offsets "sempre que o write-back rodar" recomputaria os horários também nesses gestos — violando o **caso (b) da DEC-048**, que manda **preservar** os `offset_horario` gravados quando ordem e conjunto não mudam. Trocaria um bug de bloqueio por uma perda silenciosa de horários do usuário.

**Resolução:** a implementação da TASK-046 cobre remoção, inserção e
reordenação, preserva offsets quando a sequência não muda e inclui o caso de
remoção da TASK-087 como regressão. A TASK-087 está absorvida e não deve ser
implementada isoladamente.

O write-back atual verificado na revisão é `servicosComItinerarioAtualizado`.

### 6.3 TASK-004 fechada sem parecer

Ver §4. Código entregue, ciclo formal não encerrado.

### 6.4 `etapa-itinerarios.spec.ts:71` ficou desatualizado desde a TASK-081 — resolvido em 2026-07-21

Achado na reavaliação da TASK-065 (`14-REVISOES/TASK-065-20260720-reavaliacao.md`, problema 4). O E2E `mover parada recalcula com sucesso …` exige `painel-pendencias → pendencia-item` com contagem **0**, mas o fixture `carregar-multi-servico.json` passou a produzir o alerta *"Serviços 0001-1SU, 0001-2SU sem grade de feriados"*, emitido atualmente por `src/formulario/pendencias/pendencias.ts:200` — introduzido pela **TASK-081** (`06a7ed4`). Falha determinística (3/3 em `--repeat-each=3`), e **não** é a flakiness intermitente descrita no parecer anterior da 065.

**Atribuição:** não é da TASK-065 — nenhum dos seus commits toca `src/formulario/pendencias/`. É débito de teste da TASK-081, que acrescentou o alerta sem atualizar o E2E que assume zero pendências nesse fixture.

**Resolução:** a correção foi absorvida pelo commit `37502b4` da TASK-068: a asserção agora filtra `pendencia-item` por `data-severidade="bloqueante"`, preservando a prova de recálculo e o caso inválido `NoRoute`. A revisão `docs-dev/14-REVISOES/TASK-089-20260721.md` aprovou a entrega com ressalva pela ausência de commit próprio; o cenário passou 3/3, a suíte canônica ficou verde e a TASK-089 não deve ser reimplementada.
