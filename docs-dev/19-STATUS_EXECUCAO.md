# 19 — STATUS_EXECUCAO: o que já foi executado e o que falta

**Para que serve:** dar uma visão única e verificável do **estado de execução** de todas as tasks do `06-BACKLOG_INICIAL.md`, com a **ordem recomendada** do que ainda falta e uma estimativa de **complexidade**. Existe porque o backlog descreve *o conteúdo* de cada task, mas não registra *o que já rodou* — e essa lacuna já deixou pelo menos uma task ser pulada silenciosamente (ver §6).

**O que este documento NÃO é:** não é fonte de verdade sobre o conteúdo, escopo ou regras de nenhuma task — isso continua sendo o `06-BACKLOG_INICIAL.md` (e, acima dele, as specs e o `01-RULE_INDEX.md`, conforme a hierarquia do `00-README-SPEC-DRIVEN.md`). Aqui só se registra **status e sequenciamento**. Em caso de divergência sobre escopo, o backlog vence.

**Última atualização:** 2026-07-24 (branch `redesign`) — **TASK-075 concluída** (aprovada). Etapa Identificação, fluxo "novo" (DEC-064): escolher um Autos no dropdown deixa de comitar a identidade na hora — só popula um candidato local exibido numa pré-visualização (código, denominação da linha, empresa, tipo, selo `operante`/não operante), trocável livremente; o botão "Confirmar Autos" é o único gesto que cria o documento e congela `codigo`/`empresa` (Spec 04 §5). Autos `operante: true` reforça, na própria pré-visualização, a recomendação de carregar o JSON vigente (Spec 04 §3.1). Implementada em `cf13b46` — `src/formulario/identificacao/pre-visualizacao.ts` (novo: `preVisualizacaoDeAutos`/`identidadeDeAutosEstatico`, puras) + `identificacao.tsx` (estado local `codigoCandidato`, nunca elevado à sessão — RN-096/NEG-004) — e **aprovada** em `14-REVISOES/TASK-075-20260724.md`: RN-016/023/096 e DEC-064 cobertas com teste (unitário do helper puro, inclusive `denominacao_linha` provada fora do contrato comitado — RN-008..015; E2E do fluxo completo com troca de candidato antes de confirmar e do reforço `operante`), `data-testid`/`aria-*` existentes preservados, E2E que criavam documento do zero (`servicos.spec.ts`, `etapa-itinerarios.spec.ts`) atualizados com o passo de confirmação, suíte canônica **verde** (log reutilizado; fingerprint `e312675c…`; identidade `498d7fa6…` do mesmo working tree), typecheck/lint limpos. Nenhuma violação de RN Alta ou NEG-xxx; escopo exato ao objetivo da task. Antes nesta data — **TASK-100 concluída** (aprovada com ressalvas). Botão "redefinir Seção" na tabela lateral (Q-058/**DEC-080**): colapsa todas as contribuições da Seção (`secao.servicos[]`, Ida e Volta, de todos os Serviços) na coordenada do Serviço/sentido em edição no momento do clique, sob confirmação OK/Cancelar. Implementada em `288dec9` — função pura `redefinirSecao` (variante de `transladarSecao` com destino fixo, RN-004/026/027/029), botão `↻` só nas linhas de Seção entre "Mover" e "Remover", e cascata de recálculo/reconciliação delegada a `aoTransladarSecao` (o mesmo caminho da TASK-078 — RN-052/054..057/048, sem duplicação). **Aprovada com ressalvas** em `14-REVISOES/TASK-100-20260724.md`: código de escopo exato, RN cobertas com teste (OSRM sempre mockado; 4 chamadas na cascata provadas em integração e E2E), suíte canônica **verde** (log reutilizado; fingerprint `19967314…`; identidade `498d7fa6…` do mesmo working tree); nenhuma violação de RN Alta ou NEG-xxx. **Ressalva/condição de merge — resolvida no mesmo dia (`668124b`, adendo no parecer):** os documentos que fundamentam a task — `06-BACKLOG_INICIAL.md` (TASK-100), `10-DECISION_LOG.md` (DEC-080) e `16-OPEN_QUESTIONS.md` (Q-058, mais o spillover Q-057/DEC-079 da TASK-078) — foram versionados; working tree limpo, **sem condição de merge pendente** (entrega efetivamente aprovada). Antes nesta data — **TASK-078 concluída** (reprovada e corrigida no mesmo dia). A entrega original (`4bd5703`) foi **reprovada** em `b8d0301` (parecer `14-REVISOES/TASK-078-20260724.md`): o arrasto com o **botão direito** transladava a Seção inteira em vez de mover só o ponto do Serviço/sentido corrente — os dois botões ficavam indistinguíveis, porque o `mousedown` custom do botão direito em `src/shared/mapa/mapa.tsx` chamava só `evento.preventDefault()` e deixava o evento borbulhar até o container do mapa, engatando o arrasto nativo do MapLibre (`_addDragHandler`, sem filtro de botão). A correção (`714028b`) adiciona **`evento.stopPropagation()`** no `mousedown` quando `button === 2` (`mapa.tsx:606`): o evento deixa de alcançar o container, o arrasto nativo não engata no botão direito e a distinção de gesto passa a funcionar em uso real. O teste que dava **falso verde** (o `Marker` mockado não ligava o `mousedown` DOM ao arrasto nativo) foi substituído: o mock de `addTo` agora modela o `_addDragHandler` real (mousedown que alcança o container dispara o arrasto, sem filtrar botão) e há E2E de **navegador real** provando os dois gestos — botão esquerdo revela o cluster em cor neutra (translação real), botão direito **não** revela (regressão-guarda do defeito). **Aprovada** na reavaliação `14-REVISOES/TASK-078-20260724-reavaliacao.md`: mecanismo confirmado no código-fonte do maplibre-gl instalado, RN-004/027/029/052/048/054..057 com teste, suíte canônica **verde** (log reutilizado; fingerprint `0d01cc6a…` — cobre `src/`+`testes/`, mudou em relação ao log da reprovação `3f6a44e…`; identidade `498d7fa6…` do mesmo working tree; 1201 unitários + 69 E2E, incluindo os dois novos casos TASK-078). A lógica de domínio (`transladarSecao` preserva UUIDs/350 m/município — RN-004/027/029; cascata `aoTransladarSecao` — RN-052/048) estava correta desde a origem e foi preservada. **Desbloqueia a TASK-100** (DEC-080), que reusa o motor de translação com destino fixo. Antes nesta data — **Revisão de escopo do responsável: TASK-070 e TASK-076 canceladas; TASK-078 redesenhada; TASK-100 criada.** Reavaliando o backlog do ramo do mapa em uso real, o responsável decidiu: (1) **TASK-070 cancelada** (clique no vértice remove ponto de rota) — o botão "Remover" da tabela lateral já cobre a remoção de forma simples e suficiente, sem o risco de distinguir clique de arraste no mapa; a parte correspondente da DEC-057 foi marcada como cancelada em `10-DECISION_LOG.md`. (2) **TASK-076 cancelada** (Ida e Volta no mesmo mapa, abas, tracejado, dois painéis) — a troca de aba entre sentidos já é simples e a informação já está bem estruturada; era a task mais cara do backlog pendente (complexidade 5) sem ganho percebido que a justificasse; a DEC-062 foi marcada como cancelada. (3) **TASK-078 redesenhada** (Q-057/**DEC-079**): o mecanismo de "modo" de realocação da Seção (duplo clique para entrar, DEC-061) foi substituído por atribuição direta de botão — arrasto com o **botão esquerdo** move a Seção inteira (translação rígida, todos os `secao.servicos[]`), arrasto com o **botão direito** move só o ponto do Serviço/sentido corrente (o arrasto individual de hoje, sob 350 m, só migrado de botão); as consequências de confirmação da DEC-061 (município, recálculo em cascata, UUID preservada) continuam valendo. (4) **TASK-100 criada** (Q-058/**DEC-080**): botão de refresh nas linhas de Seção da tabela lateral (entre mover e remover), com confirmação OK/Cancelar, que devolve todos os pontos da Seção para a coordenada do ponto do Serviço/sentido em edição no momento do clique — depende do motor de translação que a TASK-078 introduz. Backlog (`06-BACKLOG_INICIAL.md`), open questions (`16-OPEN_QUESTIONS.md`, Q-057/Q-058) e decision log (`10-DECISION_LOG.md`, DEC-079/DEC-080) atualizados nesta revisão; ver §5 abaixo para a ordem recomendada resultante. Antes (2026-07-24): **TASK-098 concluída**: o handler de `contextmenu` sobre a linha (`src/shared/mapa/mapa.tsx:367-380`) passou a reusar `projetarSobreLinhas` (a mesma função que o `click` já usa desde a TASK-069/DEC-072), entregando a `aoClicarDireitoNaLinha` a coordenada **projetada** no traçado em vez do `lngLat` bruto do cursor; fora da linha, ou quando a projeção falha (linha degenerada, `?? posicao`), o clique degrada para a coordenada bruta sem ser descartado. `ancoraTela` do menu flutuante segue vindo do cursor bruto (`originalEvent.clientX/clientY`), e o índice de inserção continua resolvido por `ancorarPontoNaRota` (intocado). Implementa a **DEC-078** (Q-056), decidida pelo responsável — estende ao botão direito a mesma simetria que a DEC-072 já fixou para o botão esquerdo. Nenhuma mudança em `editor-mapa-itinerario.tsx`/`etapa-itinerarios.tsx`: já propagavam `posicao`/`posicaoNaLinha` genericamente desde a TASK-095. Implementada em `c91067e` e **aprovada** em `14-REVISOES/TASK-098-20260724.md`: paridade `contextmenu`↔`click` provada por teste unitário novo, deslocamento real (clique perto, não sobre, a linha) provado por E2E novo com OSRM mockado, suíte canônica verde (log reutilizado, fingerprint/identidade conferidos). RN-027/029 (350 m e município) seguem avaliadas pelos motores existentes, agora sobre a coordenada projetada — nenhuma mudança de texto de regra. Antes (2026-07-24): **TASK-097 concluída**: arrastar um marcador (ponto de rota, Seção ou Local) quando o cursor entrava na tolerância de 6 px da linha da rota deixava de aplicar a nova coordenada — o hover (TASK-069/DEC-072) re-renderizava a cada `mousemove` e `sincronizarMarcadores` (`src/shared/mapa/mapa.tsx`) chamava `setLngLat` **também no marcador em arrasto**, de modo que o `dragend` lia a coordenada antiga e o gesto virava no-op (violava **Spec 04 §7.3 itens 4/5/6** e a **RN-052**, criticidade Alta). A correção é **aditiva na primitiva** `shared/mapa`: `arrastandoRef` derivado de `dragstart`/`dragend` do próprio `Marker` (efêmero, em `ref`, nunca em estado React — RN-096); guarda em `sincronizarMarcadores` que **não** reposiciona o marcador em arrasto, com os demais seguindo sincronizados; supressão do hover (`mousemove`/`mouseleave`) durante o gesto; limpeza do `ref` na remoção do marcador e no unmount; e o `dragend` devolve o marcador à posição da prop **antes** de entregar a coordenada solta, preservando a recusa de 350 m (DEC-044) que não gera render. Nenhuma mudança de contrato/schema, nenhum `data-testid`/`aria-*` alterado, `editor-mapa-itinerario.tsx` de produção intocado — o defeito foi resolvido inteiramente na primitiva. Implementada em `6b1360f` e **aprovada** em `14-REVISOES/TASK-097-20260724.md`: os oito critérios de aceite e toda a lista vinculante de "Testes esperados" cobertos em três níveis (unitário `mapa`, integração com asserção explícita de **RN-004**, E2E de arrasto sobre a linha), suíte canônica **verde** (log reutilizado, fingerprint/identidade conferidos). **Desbloqueia a TASK-070** e é **pré-requisito da TASK-078** (dependência dura), recomendada antes da **TASK-076**. Observações não impeditivas no parecer (dois "casos" de prosa — arrasto aceito de Seção/Local sobre a linha e arrasto+falha OSRM — sem teste **dirigido ao gesto**, mecanismo coberto genericamente; e a criação da 097/098/099 ficou sem o commit "Cria a TASK-097" próprio, consolidada agora junto do parecer). **Segue pendente a TASK-098** (criada, não implementada): **Q-056 registrada e decidida (DEC-078)** — a Seção/Local criada pelo **clique direito sobre a linha** nascia na coordenada bruta do cursor, fora do traçado, porque o handler de `contextmenu` não projetava como o de `click` já projeta desde a **DEC-072**; a decisão do responsável estende a DEC-072 ao botão direito (clique fora da linha continua bruto; arrasto **não** gruda — opção C descartada). O índice de inserção na lista já estava correto (`ancorarPontoNaRota` projeta internamente) e não muda. As tasks pendentes **070/076/078** receberam as notas de dependência correspondentes no `06-BACKLOG_INICIAL.md`. Antes (2026-07-23): **TASK-096 concluída**: `comLocaisAtualizados` (`src/formulario/itinerarios/etapa-itinerarios.tsx:400-420`) deixou de bifurcar por `base.modo` e passou a bifurcar por `linhaAtual.completo`, gravando `servico.locais[]` pelo caminho unificado da **DEC-053** (`servicosDaSessao`/`comServicosDaSessao` para Serviço completo, `servicosEmConstrucaoDaSessao` para Serviço em construção). Corrige o descarte silencioso do Local em dois estados que não tinham ramo — modo "novo" com o Serviço **já promovido** (o bug relatado: UUID cru na tabela, aviso de "referência de Seção/Local incompleta" e mapa que parava de aceitar pontos de rota) e modo "carregado" com Serviço em construção —, nos quais a Parada era comitada com `local_uuid` pendurado, violando **RN-036**. O "X" da TASK-094 (`removerEntidadeLocalNaTabela`), que usa a mesma função, também volta a funcionar no Serviço promovido. Contrato JSON, schema, OSRM, PDF e `data-testid` intocados. Implementada em `5404f48` e **aprovada com ressalvas** em `14-REVISOES/TASK-096-20260723.md`; as **três ressalvas foram resolvidas no mesmo dia** (adendo no parecer), sem abrir task nova e sem tocar lógica de produção: o comentário enganoso do E2E e o título over-claim do teste de arrasto foram corrigidos (com asserção explícita de RN-004 acrescentada), e o "teste que prove a impossibilidade" do caso inválido 1 foi **descartado como teste** — o invariante é do chamador, não da função — e substituído por **comentários-sentinela nos dois lados do acoplamento** (`comLocaisAtualizados` e a linha de `aoComitarBase` em `aplicarNovasParadas`), avisando que trocar a base por `sessaoRef.current` ressuscita o descarte silencioso sem teste ficar vermelho. **Nenhuma pendência aberta.** A task nasceu fora da §5 deste documento (ver §6.5). Antes no mesmo dia: **TASK-095 concluída**: o formulário de nome de Seção/Local deixou de ser um `Painel` abaixo do mapa e virou uma **linha-formulário inline na tabela lateral, na posição de inserção** (DEC-077). O `EditorMapaItinerario` perdeu o estado/UI de criação (e a prop `bidirecional`): só reporta a intenção via `aoIniciarCriacaoParada(tipo, posicao, posicaoNaLinha?)` e recebe `posicaoCriacaoPendente` para manter o marcador provisório; o host (`etapa-itinerarios.tsx`) monta a linha na `<tbody>` usando a mesma âncora de `prepararInsercaoDeParada` (extraída para `indiceInsercaoParaPosicao`), rola até ela ao abrir e confirma reusando `criarSecaoNoPonto`/`criarLocalNoPonto` (TASK-017/018). `data-testid` de criação preservados; contrato JSON e fluxo de criação (TASK-094) intocados. Implementada em `2ed41d3` e **aprovada** em `14-REVISOES/TASK-095-20260723.md`. Antes no mesmo dia: **TASK-094 concluída**: Local nasce **unidirecional** (a criação gera só a geolocalização do sentido em edição, sem espelho Ida↔Volta — DEC-075) e o **"X" da tabela remove a entidade** Local inteira com todas as suas Paradas (nos dois sentidos, para Local legado com dois pontos — DEC-076); o gesto "Excluir ponto deste sentido" e os `data-testid` `excluir-sentido-*` deixam de existir (exceção consciente autorizada pela DEC-076). Contrato JSON intocado. Implementada em `2350be2` e **aprovada** em `14-REVISOES/TASK-094-20260723.md`. Fica pendente a **TASK-095** (formulário de nome inline na tabela, DEC-077 — §5, Grupo D), criada no mesmo dia e independente. Antes no mesmo dia: **TASK-093 concluída**: o movimento de Seção só dispara o espelho Ida↔Volta quando altera de fato a subsequência de Seções (DEC-074 item 1) — a troca adjacente Seção↔Local deixa de espelhar e de recalcular o outro sentido, cujos Locais ficam intocados. Implementada em `faf4364` e **aprovada** em `14-REVISOES/TASK-093-20260723.md`. Fecha a última condição do parecer da TASK-077 e libera a TASK-076 ("093 antes da 076" cumprida). Antes no mesmo dia: **DEC-074 registrada e TASK-093 criada**: as três ressalvas do parecer da TASK-077 foram decididas pelo responsável (a condição do movimento Seção↔Local virou a TASK-093, a rodar antes da 076; aviso DEC-068 no sentido espelhado e E2E de exportação encerrados sem ação). Antes (2026-07-22): **TASK-077 concluída**: Volta espelhada (DEC-063/DEC-071) — gestos de Seção (inserir/remover/mover) num Serviço bidirecional espelham no outro sentido no MESMO commit de sessão, com os dois recálculos sequenciais; ordem inversa virou validação estrutural dura da RN-030 (Spec 02 §14); o reuso deixou de ofertar Seções já usadas por qualquer sentido do Serviço corrente. Implementada em `553d1e6` e **aprovada com ressalvas** em `14-REVISOES/TASK-077-20260722.md`. Em 2026-07-23 a **DEC-074** resolveu as três ressalvas: a condição (mover Seção sobre Local não deve espelhar) virou a **TASK-093** (nova, complexidade 1, antes da 076); o aviso DEC-068 no sentido espelhado e o E2E de exportação foram **encerrados sem ação** por decisão do responsável. Antes (2026-07-22): **TASK-092 concluída**: setas de mover lado a lado + testes-guarda pendentes da revisão da 091; implementada em `8e33b09` e **aprovada** em `14-REVISOES/TASK-092-20260722.md`. Fecha os follow-ups do parecer da 091 (quatro colunas/vocabulário/`aria-label`) e o teste de desseleção sobre Local extremo herdado da 064; a condição da 091 (registro da DEC-073) foi cumprida em `a4130a6`. Antes no mesmo dia: **TASK-091 concluída**: a **Q-052** foi decidida (**DEC-073** — variante local + canais separados; Tipo vazio para ponto de rota), a task foi implementada em `f1eca46` e **aprovada com ressalvas** em `14-REVISOES/TASK-091-20260722.md` (condição: commitar o registro da DEC-073; follow-ups de teste-guarda de composição). Antes no mesmo dia: **TASK-064 concluída** — implementada em `d6a5fcf` (+ fixes `50f840b` e `7a3084f`) e **aprovada com ressalvas** em `14-REVISOES/TASK-064-20260722.md`; sincronização bidirecional tabela↔mapa com scroll-into-view, compondo com o erro da DEC-070. Antes (2026-07-21): TASK-079 implementada e aprovada; pontos de rota integram a lista lateral única.

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

80 tasks concluídas. Agrupadas pela fase do backlog.

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
| 069 | Affordance de hover sobre a linha + vértice fantasma projetado |
| 079 | Pontos de rota na lista lateral intercalados |
| 064 | Sincronização de seleção tabela↔mapa (com scroll-into-view) |
| 089 | E2E de recálculo afere ausência de bloqueante — absorvida pela TASK-068 |
| 090 | Executor canônico e controlado da suíte completa |
| 091 | Redesenho da tabela lateral unificada (colunas, zebra, densidade, "X") — desbloqueada pela DEC-073 |
| 092 | Setas de mover lado a lado + testes-guarda pendentes das revisões da 091/064 |
| 077 | Volta espelhada: montagem automática na ordem inversa da Ida + reuso ofertando só Seções de outros Serviços (DEC-063/DEC-071) |
| 093 | Espelho Ida↔Volta suprimido quando o movimento de Seção não altera a subsequência de Seções (DEC-074) |
| 094 | Local nasce unidirecional; o "X" da tabela remove a entidade Local inteira (DEC-075/DEC-076) |
| 095 | Formulário de nome de Seção/Local vira linha-formulário inline na tabela, na posição de inserção (DEC-077) |
| 096 | `servico.locais[]` gravado pelo caminho unificado da DEC-053 — Local deixa de sumir no modo "novo" após a promoção (RN-036) |
| 097 | Arrasto de marcador não é revertido pelo re-render do hover da linha (RN-052) |
| 098 | Clique direito sobre a linha entrega a coordenada projetada no traçado (DEC-078) |
| 078 | Realocação de Seção por botão: esquerdo move o cluster, direito move o ponto corrente (DEC-061/DEC-079) — reprovada em `b8d0301`, corrigida em `714028b` (`stopPropagation` no botão direito), aprovada na reavaliação |
| 100 | Botão "redefinir Seção": colapsa todas as contribuições no ponto do Serviço/sentido em edição (DEC-080) — aprovada com ressalvas (`14-REVISOES/TASK-100-20260724.md`); ressalva única (commitar os docs de fundamentação) **resolvida em `668124b`** (adendo no parecer) |
| 075 | Identificação (fluxo novo): pré-visualização do Autos trocável + confirmação explícita ("Confirmar Autos") antes de congelar `codigo`/`empresa` (DEC-064) — aprovada (`14-REVISOES/TASK-075-20260724.md`) |

---

## 4. Pendências de **registro** (código entregue, ciclo não fechado)

Nenhuma destas exige reimplementação — são lacunas de rastreabilidade.

- **TASK-004** — o único commit é `5d0ba4b WIP TASK-004 (interrompida no meio do ciclo): implementa RN-036`, e **não há parecer** em `14-REVISOES/`. Verificação do código, porém, mostra o conteúdo **entregue**: RN-033 (XOR) em `src/shared/contrato/esquema.ts`; RN-034/035/036 em `src/shared/contrato/validacoes-estruturais.ts`; testes em `testes/unitarios/contrato/paradas-itinerarios.test.ts`. **Ação sugerida:** rodar `/revisar-aderencia` na 004 para fechar o ciclo formalmente, ou registrar aqui que foi absorvida pelas tasks seguintes.
- **TASK-001..012, 041, 042** — implementadas antes de o processo de parecer existir (os pareceres começam em 2026-07-09, com TASK-008/013). Ausência de arquivo em `14-REVISOES/` é esperada e não indica pendência.

---

## 5. Tasks a executar — ordem recomendada

> **Atualização desta revisão:** a **TASK-091 foi concluída** — a Q-052 foi decidida (**DEC-073**), implementação `f1eca46`, parecer **aprovado com ressalvas** em `14-REVISOES/TASK-091-20260722.md` (condição: commitar o registro da DEC-073; follow-ups: teste-guarda das quatro colunas/vocabulário e teste de desseleção sobre Local extremo herdado da 064 — este último **segue aberto**, não foi absorvido pela 091). Antes: a **TASK-064 foi concluída** — implementação `d6a5fcf` + fixes `50f840b`/`7a3084f`, parecer **aprovado com ressalvas** em `14-REVISOES/TASK-064-20260722.md`. Nenhuma das duas faz parte da lista abaixo.

9 tasks pendentes (**atualização desta revisão, 2026-07-24**: a **TASK-075 saiu da lista** — implementada em `cf13b46` e **aprovada** em `14-REVISOES/TASK-075-20260724.md` (pré-visualização do Autos + "Confirmar Autos" antes de congelar, DEC-064); Grupo D perde a task de encaixe livre, sem mudança de restrição para as demais. Antes nesta data: a **TASK-100 saiu da lista** — implementada em `288dec9` e **aprovada com ressalvas** em `14-REVISOES/TASK-100-20260724.md` (condição de merge: commitar os docs de fundamentação DEC-080/Q-058/TASK-100, hoje soltos no working tree); reusa o motor de translação da TASK-078 com destino fixo, suíte canônica verde. Antes nesta data: a **TASK-078 saiu da lista** — reprovada em `b8d0301` e corrigida em `714028b` (`stopPropagation()` no botão direito), **aprovada** na reavaliação `14-REVISOES/TASK-078-20260724-reavaliacao.md`; com ela entregue, a **TASK-100** passa à posição 1 do Grupo C, com sua dependência dura cumprida. Antes nesta data: as **TASK-070 e TASK-076 saíram da lista por cancelamento** — decisão do responsável, ver cabeçalho; o **Grupo B fica encerrado** sem nenhuma task pendente restante; **entrou na lista** a **TASK-100**, nova, criada em 2026-07-24 (Q-058/DEC-080)). Antes, as **TASK-097 e TASK-098 saíram da lista** — concluídas e aprovadas em 2026-07-24, ver cabeçalho e o Grupo A-bis abaixo, que fica **encerrado**. **Entrou na lista em 2026-07-24** também a **TASK-099** (Grupo D, complexidade 1, **prioridade baixa**): refactor puro de nomenclatura de código — `aoAtualizarSessao` (troca a sessão inteira) e `aoAtualizarSecao` (entrega UMA Seção) diferem por uma letra, são homófonos e convivem no mesmo componente, e como o fluxo é sempre `aoAtualizarSecao` → host → callback de sessão, trocar um pelo outro compila em silêncio onde as assinaturas casam. Levantada na `/analisar-task` da TASK-097 e deixada fora do escopo dela; **não é bug**. Como "Seção" é nomenclatura de spec e intocável (`docs-dev/04` princípio 12), quem renomeia é o lado da sessão — nome proposto **`aoDefinirSessao`** (desfaz a colisão no verbo, espelha o `definirSessao` real de `aplicacao-formulario.tsx:30` e preserva o vocabulário "sessão", o que sustenta deixar o tipo `SessaoFormulario` fora do escopo). A confirmação do nome é decisão de código, sem Q-xxx/DEC-xxx. **Restrição dura: roda depois de 097 (entregue), 098 (entregue) e 078 (entregue); as TASK-070/076 foram canceladas** (todas tocam `etapa-itinerarios.tsx`/`shared/mapa/mapa.tsx`). **Entraram na lista em 2026-07-24** as **TASK-097** e **TASK-098**, criadas a partir de dois bugs relatados manualmente pelo responsável (ver cabeçalho e o Grupo A-bis abaixo): a 097 é defeito puro contra a Spec 04 §7.3 itens 4/5/6 e a RN-052, com causa-raiz confirmada em diagnóstico, e assume a **prioridade máxima** por ser bug vivo que descarta trabalho do usuário em silêncio e por ser pré-requisito de três tasks já pendentes (070, 078 e, por recomendação, 076); a 098 implementa a **DEC-078** (Q-056), que estende ao clique direito a projeção sobre o traçado já fixada pela DEC-072 para o clique esquerdo. A **TASK-095** saiu da lista: o formulário de nome de Seção/Local deixou de ser um `Painel` abaixo do mapa e virou uma **linha-formulário inline na tabela lateral, na posição de inserção** (DEC-077); o `EditorMapaItinerario` só reporta a intenção via `aoIniciarCriacaoParada` e o host monta/confirma a linha na tabela reusando os motores puros da TASK-017/018. Implementada em `2ed41d3` e **aprovada** em `14-REVISOES/TASK-095-20260723.md` — todos os oito critérios com teste, `data-testid` de criação preservados, sem mudança de contrato/fluxo, suíte canônica verde. A **TASK-094** saiu da lista: Local unidirecional na criação (DEC-075) + "X" removendo a entidade Local inteira (DEC-076); implementada em `2350be2` e **aprovada** em `14-REVISOES/TASK-094-20260723.md` — supera a lacuna da DEC-045 (entidade Local antes inapagável) e encerra o gesto "Excluir ponto deste sentido" (`excluir-sentido-*` removidos, exceção autorizada pela DEC-076). A **TASK-093** saiu da lista: criada em 2026-07-23 pela **DEC-074** (condição do parecer da TASK-077), implementada em `faf4364` e **aprovada** em `14-REVISOES/TASK-093-20260723.md` no mesmo dia — `moverParada` só emite gesto de Seção quando a subsequência de Seções muda; a condição de sequenciamento "093 antes da 076" está cumprida e a TASK-076 segue liberada. A **TASK-077** saiu da lista: implementada em `553d1e6` — espelhamento Ida↔Volta por gesto atômico de Seção (DEC-063/DEC-071), ordem inversa como validação estrutural dura da RN-030, reuso filtrado. Herdou corretamente a limpeza de Seção órfã (084) e a reconciliação de horários (046)/matrizes (088), aplicadas no write-back de CADA sentido, na ordem editado→espelhado. **Aprovada com ressalvas** em `14-REVISOES/TASK-077-20260722.md`; as três ressalvas foram resolvidas pela **DEC-074** — a primeira virou a TASK-093, as outras duas (aviso DEC-068 no sentido espelhado; E2E de exportação com Volta derivada) foram **encerradas sem ação**. A **TASK-092** saiu da lista: criada e concluída em 2026-07-22 — implementada em `8e33b09` e **aprovada** em `14-REVISOES/TASK-092-20260722.md`; setas lado a lado sem wrap, testes-guarda das quatro colunas/vocabulário/`aria-label` e da desseleção sobre Local extremo (follow-ups da 091 e da 064 **fechados**). A **TASK-079** saiu da lista: implementada em `4e61327` e **aprovada** em `docs-dev/14-REVISOES/TASK-079-20260721.md`; a lista lateral única intercala pontos e Paradas, as setas reancoram e recalculam, e o estado de Local extremo permanece na linha correta. A **TASK-069** saiu da lista: implementada em `f995680` e **aprovada** em `docs-dev/14-REVISOES/TASK-069-20260721.md`; hover e clique usam a mesma coordenada projetada, o fantasma é efêmero e o hover não chama OSRM. A **TASK-089** saiu da lista: a correção foi absorvida pelo commit `37502b4` da TASK-068 e **aprovada com ressalva de rastreabilidade** em `docs-dev/14-REVISOES/TASK-089-20260721.md`; o cenário afere ausência de bloqueante, passa 3/3 e a suíte canônica está verde. A **TASK-068** saiu da lista: a entrega inicial `37502b4` foi reprovada em `14-REVISOES/TASK-068-20260721.md`, corrigida em `861b5a4` e **aprovada** em `14-REVISOES/TASK-068-20260721-reavaliacao.md`; a correção completou a cobertura de RN-035/fallback, impediu a promoção do Serviço com Local extremo e a suíte canônica terminou verde. A **TASK-090** também saiu da lista: a entrega inicial `735c992` foi reprovada em `14-REVISOES/TASK-090-20260721.md`, corrigida em `aa79302` e **aprovada** em `14-REVISOES/TASK-090-20260721-reavaliacao.md`; o executor canônico agora rejeita log de outro working tree e cobre os caminhos negativos reais. A ordem abaixo respeita as dependências declaradas nas próprias tasks; onde há folga, ela é indicada. A antiga prioridade máxima (TASK-082) foi concluída; a visibilidade dos motivos usa a infraestrutura entregue pelas TASK-085/086. O Grupo A (bug vivo de integridade das matrizes) foi fechado pela **TASK-088**, implementada em `2b27c9a` e aprovada em `docs-dev/14-REVISOES/TASK-088-20260720.md` — não há mais bug bloqueando a exportação após remover uma Seção. A **TASK-065** saiu da lista de pendentes: reprovada em 2026-07-20 por E2E vermelho, foi corrigida em `6469a04` e **aprovada com ressalvas** na reavaliação `docs-dev/14-REVISOES/TASK-065-20260720-reavaliacao.md`. A **TASK-067** também saiu: implementada em `b2b3ab7` e **aprovada com ressalvas** em `docs-dev/14-REVISOES/TASK-067-20260720.md` — a condição de entrada herdada da 065 (teste do hit-test de `contextmenu`) foi cumprida por `testes/unitarios/mapa/mapa.test.tsx`, e sua condição de merge foi absorvida e concluída pela TASK-068.

### Grupo A-bis — Bugs vivos de gesto do mapa (2026-07-24)

Relatados manualmente pelo responsável, com causa-raiz localizada em `src/shared/mapa/mapa.tsx`. A **TASK-097 saiu da lista**: implementada em `6b1360f` e **aprovada** em `14-REVISOES/TASK-097-20260724.md` — invariante de arrasto na primitiva (o marcador em arrasto não é reposicionado pelo re-render do hover), RN-052 (Alta) restaurada, suíte canônica verde. Com ela entregue, o "antes da 070 / dura antes da 078 / recomendada antes da 076" está **cumprido**. A **TASK-098 também saiu da lista**: implementada em `c91067e` e **aprovada** em `14-REVISOES/TASK-098-20260724.md` — `contextmenu` sobre a linha passa a entregar a coordenada projetada (DEC-078), com a mesma paridade que o `click` já tem desde a DEC-072; suíte canônica verde. Grupo A-bis **encerrado**, nenhuma task pendente restante nele.

### Grupo B — Ramo do mapa e pontos de rota — **encerrado (2026-07-24)**

Fecha a UX de mapa e interações. Depende só do que já está entregue (060, 063, 065, 066, 067, 071).

A **TASK-070** (clique sobre o vértice remove o ponto de rota) foi **cancelada em 2026-07-24** por decisão do responsável: o botão "Remover" da tabela lateral já cobre a remoção de forma simples e suficiente. Não há mais nenhuma task pendente neste grupo.

A **TASK-092** saiu da lista: implementada em `8e33b09` e **aprovada** em `14-REVISOES/TASK-092-20260722.md` — os follow-ups de teste do parecer da 091 e o teste de desseleção herdado da 064 estão fechados. A **TASK-091** saiu da lista: a **Q-052** foi decidida (**DEC-073** — variante local de `Tabela`/`Botao` por prop, Tipo vazio para ponto de rota, precedência de canais fundo/texto/borda), implementada em `f1eca46` e **aprovada com ressalvas** em `14-REVISOES/TASK-091-20260722.md`. Condição do ciclo: commitar o registro da DEC-073 (`docs-dev/10` + `docs-dev/16`). Follow-ups de teste (não bloqueiam): teste-guarda das quatro colunas/vocabulário de Tipo/`aria-label` do "X" e o teste de desseleção sobre Local extremo herdado da revisão da 064.

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
implementou; a TASK-079 preservou o estado na lista unificada; a TASK-064 compôs a seleção sobre ele sem mascará-lo (revisão de 2026-07-22); a TASK-076 mantém a obrigação explícita de compô-lo.

A cadeia `079 → 064` está **concluída** (a 064 projetou a seleção sobre a lista unificada e compôs com a DEC-070). Permanece a trava rígida `068 → 076` (preservação da DEC-070); as travas `068 → 069` e `068 → 079` foram concluídas. As demais têm folga entre si.

### Grupo C — Grandes refactors de sentido e Seção

As próprias tasks pedem rodar **depois** do Grupo B, para não retrabalhar a superfície mais ativa.

A **TASK-077** saiu da lista: implementada em `553d1e6` e **aprovada com ressalvas** em `14-REVISOES/TASK-077-20260722.md` — espelhamento Ida↔Volta por gesto atômico de Seção (DEC-063/DEC-071). As três ressalvas do parecer foram resolvidas pela **DEC-074** (2026-07-23): a condição virou a **TASK-093**, implementada em `faf4364` e **aprovada** em `14-REVISOES/TASK-093-20260723.md`; os follow-ups de aviso DEC-068 no sentido espelhado e de E2E de exportação foram **encerrados sem ação**; ver §3 e o cabeçalho deste documento.

A **TASK-076** (Ida e Volta no mesmo mapa: abas, tracejado, dois painéis) foi **cancelada em 2026-07-24** por decisão do responsável: a troca de aba entre sentidos já é simples e a informação já está bem estruturada — era a task mais cara do backlog pendente (complexidade 5) sem ganho percebido que a justificasse.

A **TASK-078** saiu da lista: realocação de Seção por botão (DEC-061/**DEC-079**) — botão esquerdo translada o cluster inteiro, direito move só o ponto do Serviço/sentido corrente. Entrega original `4bd5703` **reprovada** em `b8d0301` (botão direito indistinguível do esquerdo); corrigida em `714028b` (`stopPropagation()` no `mousedown` do botão direito, mais mock fiel do `_addDragHandler` e E2E de navegador real dos dois gestos) e **aprovada** em `14-REVISOES/TASK-078-20260724-reavaliacao.md`. **Desbloqueia a TASK-100**, que reusa o motor de translação (`transladarSecao`) com destino fixo.

A **TASK-100** saiu da lista: botão "redefinir Seção" na tabela lateral (Q-058/**DEC-080**) — colapsa todas as contribuições da Seção (`secao.servicos[]`, Ida e Volta, de todos os Serviços) na coordenada do Serviço/sentido em edição no momento do clique, sob confirmação OK/Cancelar. Implementada em `288dec9` (função pura `redefinirSecao`, variante de `transladarSecao` com destino fixo; coluna "Redefinir" na tabela; cascata delegada a `aoTransladarSecao`, o mesmo caminho da TASK-078 — RN-052/054..057/048 sem duplicação) e **aprovada com ressalvas** em `14-REVISOES/TASK-100-20260724.md`. RN-004/026/027/029 com teste na função pura; convergência multi-Serviço e 4 chamadas OSRM provadas em integração e E2E (OSRM sempre mockado); suíte canônica **verde** (log reutilizado; fingerprint `19967314…`; identidade `498d7fa6…` do mesmo working tree). **Ressalva/condição de merge — resolvida:** os documentos que fundamentam a task — `06-BACKLOG_INICIAL.md` (TASK-100), `10-DECISION_LOG.md` (DEC-080) e `16-OPEN_QUESTIONS.md` (Q-058, mais o spillover Q-057/DEC-079 da TASK-078) — foram versionados em `668124b` (adendo no parecer); working tree limpo, sem condição de merge pendente.

### Grupo D — UX restante e qualidade

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 4 | **062** — E2E do fluxo "criar do zero" ponta a ponta | **3** | Depois do mapa estabilizado, senão os seletores mudam de novo. |
| 12 | **099** — Renomear `aoAtualizarSessao` → `aoDefinirSessao` (par homófono com `aoAtualizarSecao`) | **1** | **Prioridade baixa; roda por último deste grupo.** Refactor puro de nomenclatura, 59 ocorrências em 11 arquivos, sem mudança de comportamento. **Restrição dura de sequenciamento: depois de 097 (entregue), 098 (entregue), 078 (entregue) e 100** — todas editam `etapa-itinerarios.tsx` ou `shared/mapa/mapa.tsx`, e um rename atravessado nessa fila só gera conflito de merge. (As TASK-070/076, que também tocavam esses arquivos, foram canceladas em 2026-07-24 e saem desta restrição.) Nome final a confirmar pelo responsável (decisão de código, sem Q-xxx). |

### Grupo E — Fases originais restantes (MVP 3 em diante)

Independentes do ramo do mapa: nada aqui bloqueia ou é bloqueado por ele.

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 5 | **033** — PDF operacional: estrutura e identificação | **4** | Subsistema novo (@react-pdf) + captura do mapa. |
| 6 | **034** — PDF operacional: tabelas horárias e matrizes | **3** | Sobre a 033. |
| 7 | **035** — Comparador: carregamento e validação dos dois arquivos | **3** | |
| 8 | **036** — Motor de diff por UUID + taxonomia | **5** | Núcleo do Comparador; casamento por UUID e por contexto. |
| 9 | **037** — Telas de comparação | **4** | Superfície ampla (5 visões/abas). |
| 10 | **038** — Mapa comparativo | **3** | Bloqueio parcial: Q-004 (tolerância). |
| 11 | **039** — PDF comparativo completo | **4** | |

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

### 6.5 TASK-096 nasceu fora da §5 — regularizada em 2026-07-23

A TASK-096 foi criada em `a3cfa86` tocando **apenas** o `06-BACKLOG_INICIAL.md`; nunca entrou na §5 deste documento, contrariando o item 2 do §1 ("ao criar uma task nova, acrescente-a na §5"). Como implementação (`5404f48`) e revisão (`14-REVISOES/TASK-096-20260723.md`) vieram no mesmo dia, a lacuna não chegou a esconder nada — mas é o mesmo padrão do §6.1, e por isso fica registrado.

**Resolução:** a task entrou direto na §3 (executadas) no movimento da revisão. A contagem de pendentes da §5 não muda: a 096 nunca esteve lá.
