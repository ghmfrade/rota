# 16 — OPEN_QUESTIONS: Perguntas em Aberto

Consolidação do que **exige decisão humana**. Nada aqui foi decidido — quando decidido, a resposta migra para `10-DECISION_LOG.md` (nova `DEC-xxx`) e a Q ganha status `Decidida (DEC-xxx)`. Temas que as specs **já** decidiram não entram aqui (ver `10-DECISION_LOG.md`).

---

## Domínio

## Q-001 — Partição dos mistos rodoviários por litoralidade

**Contexto:** A Spec 03 §10.2 permitia mistos genéricos nos dois tipos rodoviários sem partição código-a-código, e o enum antigo continha códigos inexistentes (`SL`, `MEXR`, `MLES`, `MEXS`, `MROS`).
**Spec relacionada:** Spec 03 §10.2/§10.3; Spec 01 §7; Spec 02 §6.
**Decisão:** **Decidida (DEC-026, 2026-07-07).** `SL`/Semileito não existe. Enum rodoviário definitivo: `CR`, `CL`, `EX`, `LE`, `ME`, `MEL`, `ML`, `MLL`, `MX`, `MM`, `MML`. Partição fechada: `CR`/`ME`/`ML`/`MM` só em `Rodoviário`; `CL`/`MEL`/`MLL`/`MML` só em `Rodoviário Litorâneo`; `EX`, `LE` e `MX` válidos nos dois (executivo e leito não têm forma litorânea). Aplicada nas Specs 01 v0.6, 02 v0.9, 03 v0.5 e 04 v0.3 (exemplos `0000-1CR`).

## Q-002 — Redação da Spec 03 §3.7.3 (Locais e `matriz_distancias`)

**Contexto:** O trecho diz que Locais "continuam existindo normalmente em `paradas[]`, `rota.trechos`, **`matriz_distancias`**, horários internos…". Locais não têm entrada na matriz (pares são de Seções — Spec 02 §8); seus trechos são **somados** nas distâncias entre Seções (Spec 03 §4.2). Conflito aparente de redação, sem efeito normativo.
**Spec relacionada:** Spec 03 §3.7.3 × Spec 02 §8.
**Impacto se não decidir:** risco de uma IA ler "Local participa da matriz" e criar pares com `local_uuid`.
**Opções possíveis:** 1. Corrigir a redação da spec ("contribuem para as somas da matriz"). 2. Manter e confiar no RULE_INDEX (RN-054/055 já blindam).
**Recomendação técnica:** opção 1, em edição pontual de spec autorizada por humano.
**Decisão:** **Decidida (DEC-027, 2026-07-07).** §3.7.3 corrigido: Locais não aparecem no texto nem em `itens`; remete a Spec 02 §8 (sem par próprio em `matriz_distancias`).

## Q-013 — Severidade do 350 m pareado de Local (RN-032) nos leitores estáticos

**Contexto:** A checagem dos 350 m entre `geolocalizacao_ida` e `geolocalizacao_volta` do mesmo Local (RN-032; Spec 03 §7.4) é bloqueante no gesto de inserção do Formulário. Para leitores estáticos (import do Formulário, Comparador, Ingestor), a Spec 05 §4.1 lista explicitamente como **alerta técnico** apenas a checagem fraca de Seção por centroide (RN-028); não há linha dedicada ao pareado de Local. Faltava fixar a severidade da checagem pareada de Local **no leitor** (bloqueante × alerta técnico). Levantada na TASK-012 como inferência controlada.
**Spec relacionada:** Spec 03 §7.4; Spec 05 §4.1; Spec 02 §7.1.
**Impacto se não decidir:** a TASK-012 (import) e a TASK-035 (Comparador) precisam saber se um Local com Ida/Volta a > 350 m recusa o arquivo ou só sinaliza; risco de dois leitores tratarem o mesmo arquivo de forma diferente.
**Opções possíveis:** 1. Alerta técnico (não bloqueia), igual à checagem de Seção (RN-028). 2. Bloqueante no leitor.
**Recomendação técnica:** opção 1 — RN-091 trata "350 m estático" genericamente como alerta técnico e a Spec 03 §7.4 aplica a pareada a leitores; não faz sentido ser mais rígido com o Local (parada secundária, sem relevância tarifária) do que com a Seção.
**Decisão:** **Decidida (DEC-032, 2026-07-09).** Opção 1: no leitor estático, o 350 m pareado de Local é **alerta técnico não bloqueante**. Implementada na TASK-012 (`shared/checagens-leitor`).

## Arquitetura

## Q-003 — Stack de bibliotecas (validação, PDF, testes)

**Contexto:** As specs fixam React/Next.js, MapLibre/OSM e OSRM; não fixam biblioteca de schema (zod?), gerador de PDF client-side (pdfmake? @react-pdf?) nem stack de testes (Vitest/Playwright?). RN-010 exige validação *strict* (rejeitar campos extras).
**Spec relacionada:** Spec 01 §8 (stack); requisitos derivados RN-008..015.
**Impacto se não decidir:** TASK-001/003/033 não iniciam com decisão fechada.
**Opções possíveis:** 1. zod + @react-pdf + Vitest/Playwright. 2. Alternativas equivalentes.
**Recomendação técnica:** opção 1 (madura, strict-mode nativo no zod, boa DX em Next.js).
**Decisão:** **Decidida (DEC-028, 2026-07-07).** Opção 1: zod + @react-pdf + Vitest/Playwright.

## Q-007 — OSRM de produção

**Contexto:** Spec 04 §7.3 registra: o demo público não tem SLA; produção exige instância auto-hospedada ou provedor com SLA (DEC-025). Falta decidir hospedagem, extrato OSM (SP? Brasil?), cadência de atualização e orçamento.
**Spec relacionada:** Spec 04 §7.3, §16 item 12; Spec 03 §3.
**Impacto se não decidir:** não bloqueia MVPs 0–1; bloqueia release de produção do MVP 2.
**Opções possíveis:** 1. OSRM self-hosted (extrato SP + entorno). 2. Provedor gerenciado. 3. Continuar no demo (inaceitável para produção).
**Recomendação técnica:** opção 1 com extrato regional e atualização mensal; URL configurável desde a TASK-021.
**Decisão:** **Decidida (DEC-029, 2026-07-07).** Mantido o demo público (`router.project-osrm.org`) também em produção, por ora. Volume real é baixo (≈70 empresas, ~4–5 usos/mês cada, uso client-side) e não justifica hospedagem própria neste momento. Revoga a exigência de SLA/self-hosted da DEC-025 para o estado atual; reavaliar se o volume crescer.

## JSON

## Q-005 — Formato das listas estáticas

**Contexto:** Spec 01 §8: listas de Autos/empresas/tipos "vêm de JSON estático servido junto do app (no futuro, gerado a partir do PostgreSQL)". O schema dessas listas (campos, vínculo Autos↔empresa↔tipo, flag "já operante" usada no aviso da Spec 04 §3.1) não está especificado.
**Spec relacionada:** Spec 01 §8; Spec 04 §3.1–§3.2, §5.
**Impacto se não decidir:** TASK-002/013/015 travam; a validação de identidade obsoleta (RN-017) depende dos campos.
**Opções possíveis:** 1. Um arquivo único `{autos:[{codigo,tipo,empresa,operante}], empresas:[...], tipos:[...]}`. 2. Arquivos separados.
**Recomendação técnica:** arquivo único versionado, com vínculo explícito codigo→empresa/tipo (a UX da Spec 04 §5 pré-encadeia as seleções).
**Decisão:** **Decidida (DEC-030, 2026-07-07).** Opção 1, arquivo único `data/autos_empresas.json` (gerado de `Autos_por_empresa.csv`) + `data/municipios.json` separado (gerado de `pop_municipios.csv`, casa com `municipios_sp.geojson` por código IBGE). `operante` nasce `true` para todos, a revisar depois.

## Q-012 — Identidade obsoleta: existência independente ou coerência codigo↔empresa↔tipo?

**Contexto:** RN-017 e Spec 04 §3.1 item 3 mandam bloquear o carregamento se `codigo`, `empresa` ou `tipo` não existirem nas listas estáticas atuais. Não está dito se basta cada campo existir **isoladamente** ou se o trio precisa ser **coerente** (o registro de `codigo` na lista ter exatamente aquela `empresa` e aquele `tipo`). Um JSON antigo poderia trazer um `codigo` ainda válido, mas com empresa já trocada na lista atual.
**Spec relacionada:** Spec 01 §8; Spec 02 §4; Spec 04 §3.1 item 3, §14.
**Impacto se não decidir:** define o comportamento de bloqueio quando o trio é internamente inconsistente com a lista. Baixo — TASK-006 já entrega a validação por existência independente.
**Opções possíveis:** 1. Existência independente de cada campo (leitura literal da §3.1; implementada na TASK-006 como inferência controlada). 2. Coerência do trio (mais rígido; o Autos de `codigo` X deve ter aquela `empresa`/`tipo` na lista).
**Recomendação técnica:** existência independente nesta versão — a mensagem da §14 fala do Autos/código; coerência é refinamento futuro, se houver caso real de troca de empresa mantendo código.
**Decisão:** _(em aberto)_

## Mapa/roteamento

## Q-006 — Distância ponto→fronteira no fallback de município

**Contexto:** Spec 03 §2.3: se o ponto não cai em nenhum polígono, usa-se o polígono "cuja fronteira tem a menor distância Haversine ao ponto", teto 2 km. Não define como medir distância a uma **fronteira** (amostrar vértices? segmentos? tolerância?).
**Spec relacionada:** Spec 03 §2.3.
**Impacto se não decidir:** implementações diferentes podem divergir em pontos de borda; caso raro, mas bloqueante quando ocorre.
**Opções possíveis:** 1. Distância mínima ponto→segmento sobre todos os segmentos do anel exterior (exato). 2. Distância aos vértices (aproximação, mais simples e errada em segmentos longos).
**Recomendação técnica:** opção 1 (ponto→segmento), com curto-circuito por bounding box.
**Decisão:** **Decidida (DEC-031, 2026-07-08).** Opção 1: distância mínima ponto→segmento sobre todos os segmentos dos anéis do polígono, com curto-circuito por bounding box; teto de 2 km e erro "fora de SP" inalterados. Desbloqueia a TASK-011.

## Q-019 — Como identificar "qual parada" no `NoSegment`, dado que o cliente recebe só coordenadas?

**Contexto:** Spec 04 §14 manda a mensagem "A parada [Cidade - Nome] não pôde ser associada a uma via." Mas (a) `solicitarRota` recebe `readonly Ponto[]` — coordenadas nuas, sem `Cidade - Nome` (que é identidade de Seção/Local, indisponível nesta camada); e (b) o envelope `NoSegment` do OSRM não garante um campo estruturado com o índice da coordenada rejeitada (o `message` é texto livre, não contratual). Assim, o cliente pode no máximo devolver um índice de coordenada (se derivável) e delegar a composição do rótulo à camada que tem identidade das paradas. Levantada na análise da TASK-022.
**Spec relacionada:** Spec 04 §14; Spec 03 §3.5; RN-048/049.
**Impacto se não decidir:** a mensagem final de `NoSegment` (TASK-022/044) fica indefinida entre citar o rótulo `[Cidade - Nome]` (que o cliente não tem) e uma forma degradada.
**Opções possíveis:** 1. Cliente devolve `indiceCoordenada?` (best-effort, `undefined` se o OSRM não informar) e a UI/pendências compõe o `[Cidade - Nome]` (recomendada — respeita o desacoplamento de camadas). 2. Cliente faz *probe* por parada (chamada `nearest`/rota individual) para achar a coordenada não-ancorável — mais chamadas de rede, fora do §3.5. 3. Parsear o `message` do OSRM por índice — frágil, não contratual.
**Recomendação técnica:** opção 1 — cliente só expõe a taxonomia + índice best-effort; a mensagem final com rótulo é da camada de UI/pendências (tasks seguintes).
**Decisão:** **Decidida (DEC-038, 2026-07-13).** Opção 1: o cliente OSRM devolve `indiceCoordenada?` best-effort e emite a forma interina `A parada nº N…`/genérica; a composição de `[Cidade - Nome]` (Spec 04 §14) cabe à camada com identidade das paradas (pendências/UI). Implementada na TASK-022 (`falhas-osrm.ts`/`cliente-osrm.ts`).

## Q-020 — Valor do timeout da requisição OSRM

**Contexto:** Spec 03 §3.5 fala em "timeout" como gatilho de retry, mas nenhuma spec fixa a duração. Precisa de um número para o `AbortController`. Levantada na análise da TASK-022.
**Spec relacionada:** Spec 03 §3.5; DEC-029 (URL base configurável).
**Impacto se não decidir:** sem timeout próprio, a UX depende do timeout indeterminado do runtime; o retry único de §3.5 não tem gatilho previsível.
**Opções possíveis:** 1. Timeout configurável com default via opção do cliente/env (recomendada — coerente com DEC-029, "URL base configurável"). 2. Sem timeout próprio, confiar no timeout do runtime (indeterminado; ruim para UX).
**Recomendação técnica:** opção 1 — default configurável, marcado como parâmetro, sem inventar regra de negócio.
**Decisão:** **Decidida (DEC-039, 2026-07-13).** Opção 1: default de **15 s**, ajustável por chamada (`timeoutMs`), espelhando a configurabilidade da URL base (DEC-029). Implementada na TASK-022 (`OSRM_TIMEOUT_PADRAO_MS = 15_000`).

## Q-021 — Fronteira de escopo TASK-022 × TASK-024 quanto à pendência bloqueante de rota ausente

**Contexto:** o resumo da TASK-022 cita "pendência bloqueante enquanto houver itinerário sem rota", e o `TODO` de `pendencias.ts` credita isso a "TASK-022/024". Porém não existia modelo de estado de rota em edição ao vivo: no modo carregado o `documento` é schema-válido (todo itinerário já tem `rota`), e itinerários em construção só surgem na TASK-017+/TASK-024. Logo não há caso computável de "itinerário sem rota" para alimentar `coletarPendencias` na TASK-022.
**Spec relacionada:** Spec 03 §3.5; Spec 04 §11; RN-048/078.
**Impacto se não decidir:** risco de a TASK-022 fabricar um modelo de itinerário-em-edição inexistente (violaria docs-dev/04 princípio 2), ou de a pendência bloqueante ficar sem dono.
**Opções possíveis:** 1. TASK-022 entrega a taxonomia de falha + camada de mensagens (e, opcionalmente, um predicado puro reutilizável); a entrada de pendência em `coletarPendencias` fica com a task que introduz o estado de recálculo/congelado — recomendada. 2. Antecipar a pendência na TASK-022 contra dados inexistentes — arriscaria inventar modelo.
**Recomendação técnica:** opção 1 — não fabricar modelo de itinerário-em-edição na TASK-022.
**Decisão:** **Decidida (DEC-040, 2026-07-13).** Opção 1: a TASK-022 entrega só a taxonomia/mensagens; a entrada de pendência bloqueante é **deferida à TASK-044**, já criada e ordenada (024 → 044), garantindo que a parte deferida de RN-048/078 será implementada após o estado ao vivo da TASK-024 existir — não fica órfã.

## Q-022 — Fronteira da TASK-024: motor headless de recálculo × fio dos gestos do mapa

**Contexto:** a política "abrir congela / editar recalcula no soltar" (RN-052; Spec 04 §7.3) pressupõe a etapa de mapa editável (TASK-017/018/019), ainda não construída. A lista de dependências declarada da TASK-024 (TASK-006/021/023) não inclui os editores. Levantada na análise da TASK-024.
**Spec relacionada:** Spec 03 §3.6.2, §3.7.7; Spec 04 §3.1 item 6, §7.3; RN-052/046/015.
**Impacto se não decidir:** define se a TASK-024 entrega UI de edição (invadindo TASK-017/018/019) ou um motor headless que os editores consomem depois.
**Opções possíveis:** (a) TASK-024 entrega **só o motor headless + o modelo de estado de rota ao vivo** (`congelada | recalculada | sem-rota`), com a garantia "abrir = 0 chamadas OSRM" e um `recalcularItinerario(gesto)` testado por integração com fetch-espião; o fio dos gestos reais é das TASK-017/018/019 (recomendada). (b) Antecipar um protótipo mínimo de edição no mapa para viabilizar o E2E — viola "uma task por vez". (c) Bloquear a TASK-024 até TASK-017/018/019.
**Recomendação técnica:** (a) — coerente com a lista de dependências, com os guardrails (`shared`/`formulario` desacoplados, lógica pura testável fora da UI) e com o precedente das TASK-021/022/023 (motor testado por mock, sem UI).
**Decisão:** **Decidida (DEC-041, 2026-07-13).** Opção (a): a TASK-024 entrega só o motor headless de recálculo-vs-congelado + o estado de rota ao vivo, com a costura da descrição (composer da TASK-025) injetável; o fio dos gestos das TASK-017/018/019 passa a depender funcionalmente da TASK-024. O E2E de edição ao vivo fica diferido para quando os editores existirem; nesta task, "abrir → 0 chamadas OSRM" é coberto por integração com fetch-espião.

## Q-023 — Como provar a garantia "abrir = 0 chamadas OSRM" (RN-052) no teste de `congelarRotaCarregada`?

**Contexto:** a revisão da TASK-024 encontrou que o teste de abertura de `congelarRotaCarregada` cria um `vi.fn()` como "espião de fetch" mas **nunca o liga** à função sob teste (que é síncrona e não recebe `fetch`), tornando `expect(fetchEspiao).not.toHaveBeenCalled()` **vacuamente verdadeiro** — passa mesmo se a garantia quebrar. A [[Q-022]]/DEC-041 já enunciava que "abrir → 0 chamadas OSRM é coberto por integração com fetch-espião", mas não fixou que o espião precisa ser **ativo** (ligado ao `fetch` realmente exercido pela unidade). Levantada na revisão da TASK-024.
**Spec relacionada:** Spec 04 §3.1 item 6; Spec 03 §3.6.2; RN-052 (padrão de teste de uma garantia, não regra de negócio nova).
**Impacto se não decidir:** garantias de "não chama OSRM" (RN-052 na abertura; por extensão RN-080 no Comparador) podem ser "testadas" por asserções decorativas que passam mesmo quando a garantia é violada — falso senso de cobertura.
**Opções possíveis:** (a) o teste espiona o `fetch` **efetivamente disponível** à unidade (`vi.spyOn(globalThis, "fetch")` ou `fetch` injetado e exercido) e assere **zero** chamadas — espião ativo; a garantia estrutural (função síncrona, sem `Promise`) permanece como reforço, não substituta. (b) remover a asserção do espião e confiar só na assinatura síncrona + no `toEqual` de identidade. (c) manter como está — descartada (asserção enganosa).
**Recomendação técnica:** (a) — honra literalmente a DEC-041, vira guard real de regressão e estabelece um padrão reutilizável para toda garantia de "não chama OSRM/rede" (RN-052/RN-080). Custo mínimo, só teste.
**Decisão:** **Decidida (DEC-042, 2026-07-13).** Opção (a): garantias de "não chama OSRM" são provadas por fetch-espião **ativo** com zero chamadas; espião decorativo (nunca ligado à unidade) é proibido. Implementação na TASK-045.

## Q-024 — Quem monta a etapa real "Seções, Locais e Itinerários": TASK-017 ou TASK-019?

**Contexto:** a revisão da TASK-020 (`docs-dev/14-REVISOES/TASK-020-20260710.md:69`) registrou um follow-up atribuindo à TASK-017 a responsabilidade de "remover ou reaproveitar o harness `src/app/mapa-demo/` quando a etapa de itinerário passar a montar o mapa de verdade" — nominando TASK-017. Mas a estrutura de dependências do backlog atual (mais recente e mais granular) mostra o inverso: TASK-019 ("Montagem do itinerário — paradas ordenadas + tabela lateral") **depende de** TASK-017 e TASK-018, sugerindo que é a TASK-019 quem monta a etapa completa (seleção de Serviço/sentido, tabela lateral sincronizada, persistência em sessão), consumindo os motores de Seção (017) e Local (018) que ela orquestra. A nota da TASK-020 foi escrita antes do fatiamento fino 017/018/019 do backlog, provavelmente usando "TASK-017" como atalho para "as tasks de edição no mapa" em geral. Levantada na análise da TASK-017.
**Spec relacionada:** Spec 04 §7 (mapa único, tabela lateral); backlog TASK-017/018/019; segue sem alterar contrato.
**Impacto se não decidir:** risco de a TASK-017 inventar cedo um modelo de sessão para `autos.secoes` no modo "novo" e para seleção de Serviço/sentido — modelagem que pertence à tabela lateral/sincronização da TASK-019 — ou, no sentido oposto, de deixar o follow-up da TASK-020 sem dono.
**Opções possíveis:** A — TASK-017 entrega só o motor + componente controlado (`EditorSecoes`), testado por harness próprio e transitório; a TASK-019 monta a etapa real definitiva e só então resolve o follow-up da TASK-020 (remove/substitui o harness antigo, aponta o E2E de mapa para o ponto de montagem real). B — TASK-017 já monta na etapa real com estado local temporário (não persistido em `SessaoFormulario`) para seções e seleção de Serviço/sentido, documentado como provisório até a TASK-019 redesenhar.
**Recomendação técnica:** A — o grafo de dependências do backlog (019 depende de 017+018, não o contrário) é mais específico e mais recente que a nota solta da revisão da TASK-020; resolver o follow-up "de verdade" só faz sentido quando a etapa "de verdade" existir.
**Decisão:** **Decidida (DEC-043, 2026-07-13).** Opção A: a TASK-017 entrega só o motor de regras de Seção (350 m, município, contribuição por Serviço/sentido) + o componente controlado `EditorSecoes`, montado num harness próprio e transitório para os testes (não a etapa real). A TASK-019 é quem monta a etapa "Seções, Locais e Itinerários" de verdade — com ela, o follow-up da TASK-020 (remover/reaproveitar `src/app/mapa-demo`, apontar o E2E de mapa para o ponto de montagem real) é resolvido em definitivo.

## Q-025 — Recusa de arrasto de Seção (>350 m): "oferecer criar Seção nova" exige afordância interativa ou basta a mensagem?

**Contexto:** a Spec 04 §14 (coluna "Comportamento", linha "Seção fora do limite de 350 m") diz "Recusa a inserção/arrasto; **oferece criar Seção nova**", e o resumo da TASK-017 no backlog lista "oferta de 'criar Seção nova' na recusa". Ao arrastar um ponto de Seção para além dos 350 m do cluster (RN-027), o sistema recusa e o ponto volta à posição anterior. Dúvida: a "oferta de criar Seção nova" precisa ser uma **afordância interativa** (botão/atalho que já cria a Seção no ponto recusado), ou basta a **mensagem literal** de §14 — que já instrui "Crie uma Seção separada (com outro nome) para este local"? Levantada na revisão da TASK-017 (`docs-dev/14-REVISOES/TASK-017-20260713.md`).
**Spec relacionada:** Spec 04 §7.1, §7.3, §14; RN-027. Não altera contrato JSON.
**Impacto se não decidir:** a ressalva da revisão da TASK-017 fica sem dono; risco de a TASK-019 (que monta a etapa real) reintroduzir uma afordância que o responsável não quer — ou, no oposto, de o requisito de §14 se perder silenciosamente.
**Opções possíveis:** A — basta a mensagem: na recusa, o sistema apenas informa que o ponto não pode descaracterizar a Seção daquela forma; quem quiser uma Seção nova usa o fluxo normal de criação (clique no mapa). B — afordância interativa: além da mensagem, um botão "criar Seção nova aqui" que já cria a Seção no ponto recusado.
**Decisão:** **Decidida (DEC-044, 2026-07-13).** Opção A: na recusa de arrasto basta a mensagem literal da Spec 04 §14 (que já orienta a criar uma Seção separada). Não há afordância interativa de "criar Seção nova" — o usuário que quiser uma Seção nova a cria pelo fluxo normal de clique no mapa. O "oferece criar Seção nova" de §14 é considerado satisfeito pela própria mensagem.

## Q-026 — Excluir um sentido de um Local: quem remove a Parada daquele sentido do itinerário, TASK-018 ou TASK-019?

**Contexto:** o resumo da TASK-018 no backlog descreve "exclusão de um sentido torna unidirecional **e remove a parada do sentido**" (Spec 04 §7.2: excluir o ponto só de um sentido → o Local vira unidirecional e "a parada correspondente sai do itinerário daquele sentido"). Mas Paradas, ordenação e tabela lateral são domínio da TASK-019 ("Montagem do itinerário — paradas ordenadas + tabela lateral", RN-033..036), que **depende de** TASK-018. A DEC-043 já fixou o mesmo padrão para a TASK-017: entregar o motor da entidade (Seção) + componente controlado, deixando a etapa real (itinerário/paradas/sessão) para a TASK-019. Faltava dizer explicitamente onde mora a **remoção da Parada** disparada pela exclusão de um sentido de Local. Levantada na análise da TASK-018 (item 1 das ambiguidades).
**Spec relacionada:** Spec 04 §7.2, §7.3; Spec 02 §7.1, §10.1; RN-031, RN-032, RN-036; backlog TASK-018/019; DEC-043. Não altera contrato JSON.
**Impacto se não decidir:** risco de a TASK-018 antecipar a manipulação de `itinerario.paradas[]` (modelo de estado que pertence à TASK-019) — ou, no oposto, de a exclusão de sentido não sinalizar nada e a Parada órfã (referenciando um Local sem `geolocalizacao_<sentido>`, violando RN-036) sobreviver no itinerário.
**Opções possíveis:** A — a TASK-018 entrega só o motor sobre `servico.locais[]` (criar espelhado, arrastar 350 m pareado, excluir sentido → Local unidirecional) e **emite um sinal** (callback) de que a Parada daquele sentido deve sair; a **remoção efetiva** da Parada é fiada pela TASK-019, dona das paradas/tabela lateral (mesmo padrão da DEC-043). B — a TASK-018 já remove a Parada do itinerário do sentido, assumindo cedo um modelo de `itinerario.paradas[]` editável.
**Recomendação técnica:** A — simétrica à DEC-043 (motor de entidade na 017/018, etapa real na 019); a TASK-018 não deve inventar o modelo de sessão de paradas antes da TASK-019, e o motor de Local não tem itinerário em mãos para remover Parada com integridade (RN-036).
**Decisão:** **Decidida (DEC-045, 2026-07-13).** Opção A: a TASK-018 entrega o motor de Local (`servico.locais[]`) — criação espelhada, arrasto com 350 m pareado, exclusão por sentido que torna o Local unidirecional — e apenas **sinaliza** que a Parada daquele sentido deve sair; a **remoção da Parada** do itinerário é responsabilidade da TASK-019, dona das paradas ordenadas e da tabela lateral. O motor **não** esvazia o último ponto de um Local (RN-032) nem manipula `itinerario.paradas[]`.

## Q-027 — TASK-019 precisa do composer de descrição (TASK-025) para o recálculo bem-sucedido: placeholder provisório ou reordenar o backlog?

**Contexto:** `recalcularItinerario` (TASK-024/DEC-041) **injeta** um `ComporDescricao` e o invoca em todo recálculo bem-sucedido, para produzir `rota.descricao_itinerario` (obrigatória no schema, validada por RN-044). O algoritmo real é a **TASK-025** (Compositor `DESCRICAO(itinerario)`, RN-044..046/053), **não implementada** e **não** declarada como dependência da TASK-019 (deps: 004, 017, 018, 024, 044). A TASK-019, como dona do estado de rota ao vivo, aciona o caminho de sucesso da TASK-024 e por isso precisa de um composer; sem ele, o ramo `recalculada` não produz uma `rota` schema-válida. A investigação de conflito (análise da TASK-019) confirmou: (1) a autoria do composer é **inequivocamente** da TASK-025 — a TASK-024 foi construída para injetá-lo (DEC-041), `extrair-rota.ts` reserva `steps[].name` como "insumo da descrição, TASK-025", e a URL do OSRM já pede `steps=true`; (2) TASK-019 e TASK-025 são **irmãs sobre a TASK-024** (nenhuma depende da outra) e seus downstreams são disjuntos (019→026/028; 025→032/033), logo **reordenar 025 antes de 019 é dependency-legal** e não atrasa nenhum ramo; (3) a TASK-025 é autossuficiente hoje (unitários com o exemplo literal da Spec 03 §3.6.1; expor `steps[].name` está no seu escopo) e o painel §7.4 segue o precedente 017/018→019 (composer + componente controlado + harness → montado na etapa real pela 019). Levantada na análise da TASK-019.
**Spec relacionada:** Spec 04 §7.3/§7.4; Spec 03 §3.6.1, §3.7; RN-044/046/052/053; DEC-041/043/045; backlog TASK-019/024/025. Não altera contrato JSON.
**Impacto se não decidir:** ou a TASK-019 inventa um composer (viola "não inventar" e "uma task por vez") ou não exercita o caminho de recálculo bem-sucedido.
**Opções possíveis:** (a) a TASK-019 injeta um `ComporDescricao` **placeholder mínimo e provisório** (só itens `secao` dos extremos/sequência, sem vias — válido por RN-044), com a composição real diferida à TASK-025, que fica obrigada a substituí-lo **e remover o stub** (sem lixo residual). (b) **reordenar**: implementar a TASK-025 antes da TASK-019, que passa a **depender** dela e injeta o composer **real** desde o início — sem placeholder, sem dívida de limpeza; segue o precedente 017/018→019.
**Recomendação técnica:** (b) — dependency-legal, sem atraso de downstream, coerente com o padrão de componente controlado + harness já usado para Seção/Local, e **elimina por construção** o risco de "lixo" provisório que a opção (a) cria.
**Decisão:** **Decidida (DEC-046, 2026-07-14).** Opção (b): a TASK-025 é executada **antes** da TASK-019, que ganha dependência funcional dela e injeta o `ComporDescricao` real. Sem placeholder e sem código provisório a limpar. A TASK-025 entrega o composer (§3.7, RN-044..046/053) + a exposição de `steps[].name` em `extrairRota` + o painel de descrição controlado + harness transitório; a TASK-019 o consome na etapa real (precedente DEC-043/045).

## Q-028 — Como o Formulário sinaliza ao vivo a divergência de conjunto de Seções entre Ida e Volta (RN-030) durante a montagem?

**Contexto:** A TASK-019 lista RN-030 no escopo (Ida e Volta devem referenciar o mesmo conjunto de Seções), mas a lista de pendências de §11 (Spec 04, linhas 311–319) **não** inclui "conjunto Ida≠Volta", e o protocolo proíbe inventar pendência nova (lista fechada). A validação estrutural de RN-030 já existe (`src/shared/contrato/validacoes-estruturais.ts` — `validarServico`) e barra a divergência na importação/exportação. Faltava dizer **quando/como** o Formulário sinaliza a divergência durante a edição. Ponto decisivo levantado na análise: a Spec 04 §7.1 (linha 121) e o **princípio 6** (§12, linha 463) já mandam **criar a Seção espelhada nos dois sentidos por padrão** em Serviço bidirecional ("Ida e Volta no mesmo ponto"; a Volta é só reposicionada depois, sob a regra dos 350 m). Logo, num Formulário fiel à spec a divergência **não é alcançável pela UI** — ela só surge por caminho anormal: importar JSON antigo/errado (ou bug de UI). O aviso ao vivo é, portanto, **rede de segurança defensiva**, não a defesa principal.
**Spec relacionada:** Spec 02 §2, §5, §14; Spec 04 §7.1 (linha 121), §7.3, §11, §12 princípio 6 (linha 463). Não altera contrato JSON.
**Impacto se não decidir:** a TASK-019 não sabe se sinaliza a divergência de forma bloqueante (arriscando inventar pendência de §11) ou não sinaliza nada (perdendo o caso residual de JSON importado errado).
**Opções possíveis:** (a) feedback na própria etapa (aviso **não bloqueante** ao lado da tabela) + confiar no gate estrutural já existente na exportação/Revisão — **não** cria pendência de §11 nova; o motor de montagem expõe `conjuntoSecoesConsistente(ida, volta)` e a etapa mostra o aviso. (b) emitir pendência **bloqueante** viva em `coletarPendencias`, simétrica às de rota/descrição — adiciona item à lista fechada §11. (c) bloquear o gesto que causaria a divergência.
**Recomendação técnica:** (a) — respeita §11 como lista fechada e "não inventar regra"; a divergência já é barrada na exportação pela validação estrutural existente; e a criação espelhada da §7.1/princípio 6 já garante o caso normal por construção, tornando o aviso puramente defensivo (JSON importado). (b) fura a lista fechada; (c) é rígida demais e contradiz o modelo de arrasto por sentido da §7.1.
**Decisão:** **Decidida (DEC-047, 2026-07-14).** Opção (a): a divergência Ida≠Volta de conjunto de Seções **não** vira pendência de §11. O caso normal é evitado por construção — Seção bidirecional nasce espelhada (Spec 04 §7.1, princípio 6). Para os casos residuais (JSON importado errado, bug de UI), a etapa mostra um **aviso não bloqueante** ao lado da tabela, alimentado por um `conjuntoSecoesConsistente(ida, volta)` exposto pelo motor de montagem; a **trava dura** permanece na validação estrutural já existente, aplicada na exportação/Revisão. Nenhuma mudança de contrato JSON.

## Q-029 — Reconciliação de horários/offsets quando o itinerário muda depois de existirem Viagens

**Contexto:** A Spec 03 §8 define a geração de `offset_horario` em três momentos — sugestão inicial ao criar a Viagem (§8.1), redistribuição proporcional ao editar manualmente um horário a jusante (§8.2) e reset à sugestão sob demanda (§8.3). **Nenhum** deles cobre o que acontece com os offsets/`horarios_paradas` já gravados quando o **itinerário** muda depois: reordenar paradas, inserir/remover Seção ou Local, ou recálculo de rota por mover coordenada/ponto de rota. RN-063 exige `horarios_paradas` com exatamente um elemento por Parada (mesmo conjunto de `ordem`): mudar o número de paradas invalida estruturalmente as Viagens existentes; reordenar mantém o número mas cola os offsets em posições erradas. A revisão da TASK-019 (item 1) flagou exatamente isto — `documentoComItinerarioAtualizado` grava paradas+rota novos mas mantém `viagens[].horarios_paradas` como estavam. A Spec 03 §3.6 (linha 186) já diz que mover ponto de rota muda a **sugestão** de offset, não o valor gravado (offset é valor confirmado/editável, Spec 02 §11.1) — mas é **omissa** sobre reordenar/alterar o conjunto de paradas.
**Spec relacionada:** Spec 03 §8.1/§8.2/§8.3, §3.6 (linha 186); Spec 02 §11.1; RN-063/064/065/066. Não altera contrato JSON — offset continua sendo valor gravado; é regra de **quando** recomputar (fronteira Spec 04), reusando a fórmula da Spec 03 §8.1.
**Impacto se não decidir:** as tasks de horários (TASK-028/029) não sabem se, ao mudar o itinerário, os horários já digitados devem ser (a) recomputados automaticamente, (b) preservados intactos, ou (c) invalidados — arriscando apagar trabalho do usuário sem aviso ou deixar o documento semanticamente defasado (offset na parada errada).
**Opções possíveis:** (a) reordenar/alterar conjunto de paradas ⇒ recomputar horários pela sugestão inicial (§8.1) mantendo `horario_saida`; alteração que **não** muda ordem/conjunto (mover coordenada, ponto de rota) ⇒ **preservar** offsets gravados, recomputar só se o usuário pedir (§8.3). (b) sempre recomputar a cada mudança de rota. (c) sempre preservar e só sinalizar "horários desatualizados" como pendência, nunca recomputar sozinho.
**Recomendação técnica:** (a) — casa com a semântica já existente (offset é valor confirmado; §3.6 diz que ponto de rota muda só a sugestão) e evita apagar edições manuais por uma mudança que não mexeu na sequência de paradas; ao mesmo tempo, reordenar/alterar o conjunto torna os offsets antigos sem sentido posicional, então recomputar pela sugestão inicial é o comportamento coerente e preserva RN-063. (b) apagaria edições legítimas; (c) deixaria o documento estruturalmente inválido ao reordenar.
**Decisão:** **Decidida (DEC-048, 2026-07-14).** Opção (a): **reordenar ou alterar o conjunto de paradas** recomputa os horários de cada Viagem pela sugestão inicial (§8.1) com `horario_saida` fixo e âncoras manuais descartadas; **mudança que preserva ordem/conjunto** (coordenada, ponto de rota) preserva os offsets gravados, recomputando só via reset (§8.3). Sem mudança de contrato JSON.

## Q-030 — Ciclo de vida do conjunto de âncoras de horário (estado efêmero de sessão)

**Contexto:** A redistribuição proporcional da Spec 03 §8.2 é **stateful** — várias âncoras (paradas cujo offset o usuário fixou manualmente) acumulam-se e a reinterpolação acontece "entre duas âncoras consecutivas". Mas o contrato JSON (Spec 02 §11.1) grava apenas `parada_ordem` + `offset_horario` por parada: **não há campo de âncora**, e o conjunto de âncoras **não é recuperável de forma confiável** a partir dos offsets (paradas derivadas reinterpoladas também divergem do baseline §8.1, ficando indistinguíveis de âncoras manuais). Logo o conjunto de âncoras só pode ser **estado efêmero**, nunca persistido (RN-010, contrato fechado; padrão já consagrado em NEG-011 — pendências de validação "efêmeras, de sessão, nunca vão para o JSON"). Falta decidir a **longevidade** desse estado. Levantada na análise da TASK-029.
**Spec relacionada:** Spec 03 §8.2/§8.3; Spec 02 §11.1; Spec 04 §8.2; RN-063/065/066; NEG-011. Não altera contrato JSON.
**Impacto se não decidir:** a TASK-029 não sabe por quanto tempo as âncoras vivem; apenas a longevidade do estado de edição depende disso — a corretude da fórmula de redistribuição (§8.2) e do reset (§8.3) independe dela. Numa Viagem reaberta sem âncoras, offsets manuais antigos contam como "derivados" e podem ser movidos por uma edição posterior via interpolação/tail.
**Opções possíveis:** (a) âncoras vivem só enquanto a **etapa Viagens** está aberta (estado de componente React); somem ao trocar de etapa. (b) âncoras vivem enquanto a **sessão do Formulário** existe (sobrevivem a trocar de etapa; somem ao recarregar/importar outro JSON). (c) inferir âncoras dos offsets a cada abertura — **rejeitada**, não é determinístico nem confiável.
**Recomendação técnica:** (a) ou (b) — nunca (c). Coerente com DEC-048, que já descarta âncoras manuais ao reordenar o itinerário: âncora é estado de edição, não dado de contrato.
**Decisão:** **Decidida (DEC-049, 2026-07-15).** Opção (b): o conjunto de âncoras é **estado efêmero da sessão do Formulário** — sobrevive à navegação entre etapas (o usuário sai da grade e volta sem perder as âncoras que fixou), e é descartado ao recarregar/importar outro JSON ou iniciar sessão nova. Nunca é gravado no contrato (RN-010; NEG-011). Ver [[Q-029]]/DEC-048 (reordenar o itinerário descarta âncoras) e Spec 03 §8.2/§8.3.

## Comparador

## Q-004 — Tolerância de "rota alterada"

**Contexto:** Spec 05 §15.3 manda comparar rota por sinais estáveis, incluindo "`rota.distancia_km`/`duracao_s` **com tolerância**" — o valor da tolerância (absoluto? percentual?) não foi fixado.
**Spec relacionada:** Spec 05 §15.3; Spec 04 §18.
**Impacto se não decidir:** TASK-038 bloqueada na parte "trecho alterado"; risco de ruído (tolerância baixa) ou de mudança real ignorada (alta).
**Opções possíveis:** 1. Percentual (ex.: 1%) com piso absoluto (ex.: 0,1 km / 60 s). 2. Só absoluto. 3. Configurável com default.
**Recomendação técnica:** opção 1 — robusta para itinerários curtos e longos.
**Decisão:** Pendente

## Q-008 — Modo "comparar Autos diferentes"

**Contexto:** Spec 05 §4.4 bloqueia Autos diferentes e descreve um "escape controlado" **opcional** de justaposição de agregados (sem casamento por UUID, sem PDF padrão); §21.2 deixa a formalização para o futuro.
**Spec relacionada:** Spec 05 §4.4, §21.2.
**Impacto se não decidir:** nenhum para o bloqueio (já decidido); define apenas se o escape entra no MVP 4.
**Opções possíveis:** 1. Não implementar no MVP 4 (só o bloqueio). 2. Implementar a justaposição mínima.
**Recomendação técnica:** opção 1 — a própria spec diz "a recomendação é bloquear por padrão".
**Decisão:** Pendente

## Ingestor

## Q-009 — Escrita da Spec 06 e gatilho do Ingestor

**Contexto:** Spec 06 (Ingestor + PostgreSQL) está pendente em todas as specs; RN-093 proíbe antecipação.
**Spec relacionada:** Spec 01 §10; Spec 02 §17; Spec 03 §14; Spec 05 §21.
**Impacto se não decidir:** nenhum no MVP 0–4; define o início do MVP 5.
**Opções possíveis:** 1. Escrever a Spec 06 após o MVP 4 estabilizar. 2. Escrever antes, em paralelo (risco de retrabalho).
**Recomendação técnica:** opção 1.
**Decisão:** Pendente

## PDF

## Q-010 — Tabela de tarifa da portaria (versão futura)

**Contexto:** Spec 03 §11 fixa o contrato ("entra `distancia_km`, sai R$ para exibição, nada persiste"); Spec 04 §2.8 adia a exibição de R$ para versão futura. A forma do recurso (arquivo de faixas, vigência, arredondamento monetário) segue aberta.
**Spec relacionada:** Spec 03 §11; Spec 04 §2.8, §9.2; Spec 05 §21.1.
**Impacto se não decidir:** nenhum agora (sem R$ nesta versão); necessário antes de qualquer feature tarifária.
**Opções possíveis:** definir schema do recurso estático da portaria quando a feature for priorizada.
**Recomendação técnica:** manter fora até demanda real; registrar aqui para não "vazar" R$ por iniciativa de IA.
**Decisão:** Pendente

## UI

## Q-011 — Persistência local de rascunho (localStorage)

**Contexto:** As specs dizem que nada é salvo **no servidor** e que exportar é salvar; não mencionam recuperação de sessão local (fechar aba sem exportar = perda de trabalho). `Inferência controlada`: um rascunho em `localStorage` não viola RN-096 (não é servidor), mas não está especificado.
**Spec relacionada:** Spec 01 §5; Spec 04 §2.1.
**Impacto se não decidir:** UX arriscada (perda de horas de edição) ou feature não autorizada.
**Opções possíveis:** 1. Sem persistência local (literal à spec). 2. Rascunho em localStorage com aviso, apagado ao exportar. 
**Recomendação técnica:** opção 2, formalizada por adenda à Spec 04 antes de implementar.
**Decisão:** Pendente

## Q-014 — Destino de navegação de pendências sem entidade única de origem

**Contexto:** A Spec 04 §4/§11 torna cada item do painel de pendências clicável, "levando à etapa/entidade correspondente". Pendências ligadas a uma entidade (Seção, Serviço, Local, Viagem, itinerário) têm origem clara; mas alertas de **escopo global do documento** — o caso concreto é "documento criado do zero" (§11, alerta de ausência de preservação de identidade, §3.2) — não têm entidade única de origem. Levantada na análise da TASK-014 como inferência controlada.
**Spec relacionada:** Spec 04 §4, §11, §3.2.
**Impacto se não decidir:** a TASK-014 (painel de pendências) não sabe para onde navegar ao clicar num alerta global; inferência pendente no coletor de pendências.
**Opções possíveis:** (a) etapa Revisão (onde §11 lista o alerta); (b) etapa Identificação (origem da identidade do documento); (c) não navegável (só informativo).
**Recomendação técnica:** (a) — a §11 é a própria tela de Revisão e é onde esse alerta é listado; destino coerente e não arbitrário; impacto baixo (só UX).
**Decisão:** **Decidida (DEC-033, 2026-07-09).** Opção (a): alertas sem entidade única de origem (ex.: "documento criado do zero") navegam para a etapa **Revisão**; pendências com entidade específica continuam indo à sua etapa/entidade de origem (§11).

## Q-015 — Editabilidade do `tipo` e comportamento ao trocar o tipo com Serviços incompatíveis

**Contexto:** A Spec 04 §5 é internamente contraditória sobre o `tipo` do Autos: a mesma linha o marca como "não editável após criado o documento" (herdando o "Idem" de Código/Empresa) e, ao mesmo tempo, prevê "trocar o tipo com Serviços já cadastrados → bloqueio/alerta". Além da contradição, o comportamento previsto ("bloquear/alertar", também em Spec 03 §10.4) foi identificado pelo responsável pelo domínio como **errado**: o operador precisa poder corrigir o `tipo` a qualquer momento, e os Serviços que não couberem devem ser **ajustados automaticamente**, não barrados. Levantada na análise da TASK-015.
**Spec relacionada:** Spec 04 §5; Spec 03 §10.4; RN-023.
**Impacto se não decidir:** a TASK-015 (etapa Identificação) não sabe se o `tipo` é editável nem o que fazer com Serviços incompatíveis ao trocá-lo.
**Opções possíveis:** (a) `tipo` editável a qualquer momento; ao trocar, Serviços incompatíveis são reconvertidos para a forma convencional (padrão) do novo tipo, com aviso — nunca bloqueia; (b) manter o texto atual (tipo travado após criado; bloqueio/alerta na troca); (c) mapeamento "esperto" na troca de litoralidade (ex.: `ME`→`MEL`) em vez de reconverter tudo ao padrão.
**Recomendação técnica:** (a) — decisão do responsável pelo domínio; corrige a contradição da §5 e o comportamento; não toca o contrato JSON (só troca valores válidos de `caracteristica_veiculo`).
**Decisão:** **Decidida (DEC-034, 2026-07-09).** Opção (a): o `tipo` é editável a qualquer momento (documento novo ou carregado); `codigo` e `empresa` seguem não editáveis após criado. Ao trocar o `tipo`, cada Serviço cuja `caracteristica_veiculo` não pertença ao novo tipo é reconvertido para a **forma convencional (padrão)** do tipo — `Rodoviário`→`CR`, `Rodoviário Litorâneo`→`CL`, `Semiurbano`→`SU`, `Semiurbano Litorâneo`→`SUL` — com **aviso** listando os Serviços alterados; nunca bloqueia. A reconversão é sempre ao padrão (cega), não um remapeamento por código (`ME`→`MEL`) — opção (c) descartada.

## Q-016 — Representação em memória do Serviço em construção (documento incompleto no modo novo)

**Contexto:** Um `Servico` schema-válido (Spec 02 §6) exige `itinerarios` ≥ 1 (cada um com ≥ 2 paradas + rota + ≥ 1 viagem) e `matriz_distancias`, produzidos só nas etapas de mapa/matrizes/viagens (TASK-017+). Na etapa Serviços (TASK-016), o Serviço é **incompleto** e não pode ser tipado como `Servico`. Além disso, o **modo novo** da sessão hoje não carrega `documento` (só `identidade` — `formulario/sessao.ts`), enquanto o **modo carregado** tem `Servico[]` completos; o CRUD precisa operar nos dois. Levantada na análise da TASK-016.
**Spec relacionada:** Spec 02 §6, §14; Spec 04 §6.
**Impacto se não decidir:** a forma da sessão (e o que as tasks de mapa/matrizes/viagens consumirão depois) fica indefinida; risco de montar `Servico` schema-inválido ou de inventar campo de contrato.
**Opções possíveis:** (a) tipo de sessão `ServicoEmConstrucao` (subconjunto: `uuid`, `numero_n`, `caracteristica_veiculo`, `carater`, direcionalidade), promovido a `Servico` completo quando mapa/matrizes/viagens preencherem o resto; no modo carregado o CRUD opera sobre os `Servico` completos existentes; (b) montar já um `Servico` com `itinerarios: []`/`matriz_distancias: []` — viola o schema (`min(1)`); (c) promover o modo novo a um "documento em construção" parcial único, compartilhado pelos dois modos.
**Recomendação técnica:** (a) — menor invasão, coerente com o precedente `IdentidadeAutos` (subconjunto efêmero de `autos`); não toca o contrato JSON (RN-008..015 intactas). A lógica pura de **duplicar** (RN-007) opera sobre o `Servico` completo do schema e é testável independentemente da UI dos dois modos. Ver [[Q-017]].
**Decisão:** **Decidida (DEC-035, 2026-07-09).** Opção (a): estado de sessão efêmero `ServicoEmConstrucao` no modo novo; CRUD sobre `Servico` completos no modo carregado; a lógica pura de duplicar opera sobre o schema completo. Não cria campo de contrato.

## Q-017 — Onde vive a "direcionalidade (Ida/Volta/ambos)" entre a etapa Serviços e a etapa de mapa

**Contexto:** A Spec 04 §6 pede a direcionalidade **no ato de criação** do Serviço, mas ela **não é campo do contrato** (Spec 02 §6): é derivada de quais `itinerarios[].sentido` existem (1 unidirecional ou 2 bidirecional), e não há itinerários na etapa Serviços (são da TASK-017+). Levantada na análise da TASK-016.
**Spec relacionada:** Spec 04 §6; Spec 02 §6, §10.
**Impacto se não decidir:** sem lugar definido, ou se inventa campo no JSON (proibido — RN-008..015) ou se perde a escolha do usuário até a etapa de mapa.
**Opções possíveis:** (a) estado de **sessão efêmero** no Serviço em construção ([[Q-016]]), consumido pela etapa de mapa para criar 1 ou 2 itinerários — nunca vai ao JSON; no modo carregado, a direcionalidade é *lida* dos `itinerarios` existentes (display); (b) adiar a captação para a etapa de mapa (contradiz a §6, que pede na criação); (c) criar itinerários placeholder já na etapa Serviços (viola o schema).
**Recomendação técnica:** (a) — respeita a §6 (captura na criação) sem inventar campo de contrato; o dado é consumido pela etapa de mapa. Casa com a Q-016 opção (a).
**Decisão:** **Decidida (DEC-036, 2026-07-09).** Opção (a): direcionalidade é estado de sessão efêmero do Serviço em construção (modo novo), consumido pela etapa de mapa para criar 1 ou 2 itinerários; no modo carregado é lida dos `itinerarios` existentes. Nunca é gravada no JSON.

## Q-018 — Consistência do `numero_n` com a `caracteristica_veiculo` (sufixo do rótulo) ao mudar a característica

**Contexto:** O `numero_n` embute a característica como sufixo — formato `"0000-NXX"`, exemplo `"0000-1CR"` (Spec 02 §6): `<código>-<sequencial><caracteristica_veiculo>`. Quando a `caracteristica_veiculo` muda — por edição direta (TASK-016) ou por reconversão na troca de tipo (RN-023/DEC-034) — o sufixo do `numero_n` fica **inconsistente** com a característica real (ex.: `"0000-1ME"` reconvertido `ME`→`CL` continua exibindo `ME`). A reconversão da TASK-015 (`formulario/identificacao/reconversao.ts`) só reescreve `caracteristica_veiculo`, nunca `numero_n` — ficou como ponta solta (o teste da TASK-015 usou `numero_n` simplificado `"N01"`, que mascarou o efeito). A Spec 02 §6 dá o **formato** mas **não** fixa regra que obrigue o `numero_n` a acompanhar a `caracteristica_veiculo`. Levantada na análise da TASK-016.
**Spec relacionada:** Spec 02 §6; Spec 03 §10.3 regra 5; RN-006; RN-023/DEC-034.
**Impacto se não decidir:** a TASK-016 não sabe se, ao editar a característica (ou reconverter na troca de tipo), regenera o sufixo do `numero_n` ou o deixa como rótulo livre; risco de rótulos que contradizem a característica real ou, no outro extremo, de reescrever um rótulo que o usuário controla.
**Opções possíveis:** A — regenerar o sufixo sempre que a `caracteristica_veiculo` mudar (edição direta **e** reconversão), preservando o número sequencial (`"0000-1ME"`→`"0000-1CL"`), permanecendo editável pelo usuário; B — `numero_n` é rótulo livre, nunca reescrito automaticamente (a característica real aparece na coluna própria da lista como fonte de verdade visível).
**Recomendação técnica:** A — o `numero_n` existe para leitura humana e um sufixo que contradiz a característica é pior que "reaproveitável"; não viola RN (não é identidade — RN-006 — nem toca o contrato). Fecha a ponta solta da TASK-015 (reconversão passa a atualizar o `numero_n` também). Mantém-se editável (regenera por padrão; o usuário pode sobrescrever).
**Decisão:** **Decidida (DEC-037, 2026-07-09).** Opção A: ao mudar a `caracteristica_veiculo` de um Serviço — por edição direta ou por reconversão na troca de tipo — o Formulário regenera o **sufixo** do `numero_n` para a nova característica, preservando o número sequencial; o rótulo continua editável. Aplica-se também ao caminho de reconversão da TASK-015 (`reconversao.ts` passa a atualizar o `numero_n`).

## Q-031 — Design visual não especificado nas specs: como governar aparência (paleta, componentes, ícones, navegação)?

**Contexto:** As specs 01–05 definem comportamento e estrutura de UX (etapas, painéis, mapa, mensagens), mas **nenhuma** especifica aparência: não há paleta de cores, tipografia, sombras, biblioteca de componentes nem estilo de ícones. O resultado prático é uma UI sem estilo algum (`globals.css` de ~10 linhas, HTML com aparência default do navegador). É lacuna de spec, não conflito. A Spec 04 §4 já permite navegação por "stepper **lateral** ou superior", então uma sidebar lateral de ícones é compatível. Também falta decidir a base técnica de estilo (a DEC-028 fixou zod/@react-pdf/Vitest/Playwright, mas não CSS) e como garantir consistência visual nas telas futuras (Revisão, Exportação, Comparador).
**Spec relacionada:** Spec 04 §2 (princípios de UX), §3 (tela inicial), §4 (layout geral, stepper lateral ou superior); Spec 01 §8 (stack); DEC-028 (stack de bibliotecas).
**Impacto se não decidir:** cada task de UI decide aparência ad hoc, sem padrão — inconsistência crescente e retrabalho; ou o projeto termina sem design.
**Opções possíveis:** 1. Criar documento derivado vinculante de design system (`docs-dev/18-DESIGN_SYSTEM.md`), subordinado à Spec 04, + bloco de tasks de redesign; base Tailwind CSS 4; ícones SVG próprios estilo carimbo; sidebar lateral. 2. Escrever uma "spec de design" em `docs/specs/` (exigiria edição humana da área read-only). 3. Continuar sem padrão, estilizando por task.
**Recomendação técnica:** opção 1 — aparência é decisão de implementação derivada (o comportamento continua nas specs); um doc derivado pode evoluir sem tocar `docs/specs/**` e entra na ordem de leitura/checklist para valer em todo o projeto.
**Decisão:** **Decidida (DEC-050, 2026-07-15).** Opção 1, com Tailwind CSS 4, ícones-carimbo SVG próprios, sidebar lateral de carimbos e bloco de redesign TASK-049..056 em execução em lote autônoma autorizada. Ver DEC-050.
