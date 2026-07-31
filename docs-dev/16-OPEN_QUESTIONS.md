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

## Q-032 — Contadores de viagens semanais por Serviço: a etapa Serviços (Spec 04 §6) precisa exibi-los, ou o resumo operacional (§10) já satisfaz?

**Contexto:** O último marcador da Spec 04 §6 lista o que exibir por Serviço na etapa Serviços: "característica de veículo, caráter, direcionalidade e **contadores (viagens semanais, ver §10)**". A etapa não exibe os contadores — nunca exibiu (a lista `<ul>/<li>` original também não os tinha; a restilização da TASK-054 apenas transportou a lacuna para a `Tabela`). Os contadores existem e estão implementados, mas na **etapa Resumo**: `src/formulario/resumo/resumo-operacional.tsx:43-45` mostra "Viagens semana — Ida / Volta / Total" por Serviço, conforme a §10. A dúvida é de escopo de produto e não é decidível na implementação: a §6 exige a exibição **nas duas** etapas, ou o remissivo "ver §10" indica que a §10 é onde os contadores vivem e a §6 apenas os referencia? Levantada na revisão de aderência da TASK-054 (`docs-dev/14-REVISOES/TASK-054-20260715.md`, "Pendências"), que não podia resolvê-la: exibir contador é **comportamento**, e o doc 18 §7 proíbe que uma task de aparência introduza comportamento.
**Spec relacionada:** Spec 04 §6 (lista de Serviços) × Spec 04 §10 (resumo operacional); RN-069 (contagens da semana padrão, sem feriados).
**Impacto se não decidir:** a etapa Serviços permanece com uma exigência literal da §6 não atendida, sem registro — o tipo de lacuna que some entre pareceres. Se for divergência real, nenhuma task do bloco de redesign (TASK-054/055/056) pode corrigi-la, e a correção exige task própria fora do bloco.
**Opções possíveis:** A — a §6 exige mesmo: a etapa Serviços passa a exibir os contadores por Serviço (coluna nova na `Tabela`), reutilizando a contagem já existente da §10 (sem reimplementar RN-069); custo é uma TASK nova de comportamento. B — o resumo (§10) satisfaz a §6: o "ver §10" é remissivo, o dado não se duplica, e a lacuna se fecha com correção de **redação da spec** (edição humana da área read-only). C — manter como está e não registrar nada.
**Recomendação técnica:** A ou B — **não** C. Entre as duas, sem conhecer a intenção do autor da spec, a leitura literal favorece **A** (a §6 usa "Exibir por Serviço" e lista os contadores junto com os campos que a etapa de fato exibe; "ver §10" parece apontar *como se contam*, não *onde aparecem*), e A é a opção reversível — se a duplicação incomodar, remove-se a coluna sem tocar spec. B é mais barata mas exige alterar `docs/specs/**`, que só o responsável pode autorizar.
**Decisão:** **Decidida (DEC-051, 2026-07-15).** Opção A: a etapa Serviços passa a exibir os contadores de viagens semanais por Serviço (coluna na `Tabela`), reutilizando `shared/contagens` — o mesmo módulo do resumo da §10 —, sem reimplementar a RN-069 e sem remover a exibição do resumo. Como é comportamento (doc 18 §7), não cabe no bloco de redesign: vai para a TASK-057. Ver DEC-051.

## Q-033 — Rótulo visível do campo Tipo na etapa Identificação: "Tipo" (Spec 04 §5) ou "Tipo do Autos" (UI)?

**Contexto:** A restilização da TASK-053 trocou o rótulo **visível** do campo Tipo na etapa Identificação de "Tipo" para "Tipo do Autos" (`src/formulario/identificacao/identificacao.tsx:238-241`: o `<dt>Tipo</dt>` virou `sr-only` e quem rotula visivelmente passou a ser o `rotulo="Tipo do Autos"` do `Select`). A tabela de campos da Spec 04 §5 nomeia o campo apenas **"Tipo"**. O **nome acessível** não mudou (verificado na revisão: `toHaveAccessibleName("Tipo do Autos")` — antes e depois). "Tipo do Autos" é nomenclatura oficial (RN-076) e espelha "Código do Autos" da mesma tela. Levantada na revisão de aderência da TASK-053 (`docs-dev/14-REVISOES/TASK-053-20260715.md`, achado 1, severidade Baixa): é o único texto visível alterado por uma task cujo princípio (doc 18 §7) é "comportamento/texto visível não muda em task de design".
**Spec relacionada:** Spec 04 §5 (tabela de campos da Identificação); RN-076 (nomenclatura oficial); doc 18 §7.
**Impacto se não decidir:** o rótulo diverge do texto da spec sem registro — o tipo de desvio cosmético que some entre pareceres, e que faz a próxima leitura da Spec 04 §5 não bater com a UI.
**Opções possíveis:** A — **manter "Tipo do Autos" na UI** e alinhar a Spec 04 §5 (de "Tipo" para "Tipo do Autos"); o alinhamento da spec é edição humana da área read-only. B — **reverter a UI para "Tipo"** (aderência literal à Spec 04 §5; correção de uma linha, sem tocar spec). C — aceitar divergência permanente UI×spec sem editar a spec (descartada: institucionaliza contradizer a spec).
**Recomendação técnica:** A ou B — **não** C. As duas são defensáveis: B é a mais barata e estritamente literal; A preserva a consistência "Código do Autos"/"Tipo do Autos" já visível na tela e exige o ajuste da spec read-only.
**Decisão:** **Decidida (DEC-052, 2026-07-15).** Opção A: a UI mantém "Tipo do Autos"; a Spec 04 §5 passa a dever ler "Tipo do Autos" — ajuste de redação a cargo do dono da spec (área read-only), **não incluído na DEC** (mesmo precedente da DEC-051, que deixou a atualização de derivado como ação humana à parte). A UI **não** é revertida. Ver DEC-052.

## Q-034 — Fluxo "criar do zero" trava após os itinerários: a promoção de `ServicoEmConstrucao → Servico` (DEC-035) nunca foi implementada

**Contexto:** No fluxo **"novo"** (documento criado do zero), um Serviço recém-criado vive em `servicosEmConstrucao` (`ServicoEmConstrucao`, DEC-035), que **não tem campo `itinerarios`** (`src/formulario/sessao.ts:41-53`). O itinerário/rota montados na etapa de mapa ficam só em estado efêmero (`paradasEmEdicao`/`estadosRotaViva`); a função que grava itinerário+matriz num Serviço exige um `DocumentoOperacao` e só roda no modo "carregado" (`src/formulario/itinerarios/etapa-itinerarios.tsx:251-270`, `documentoComItinerarioAtualizado`). As etapas seguintes leem serviços **apenas** no modo "carregado" — Viagens (`src/formulario/viagens/etapa-viagens.tsx:80`) e Matrizes (`src/formulario/matrizes/etapa-matrizes.tsx:60`) obtêm `[]` no modo "novo". Resultado: depois de montar Seções/itinerário, o Serviço nunca vira `Servico` completo e as etapas Viagens/Matrizes ficam vazias — o usuário não consegue inserir horários. A DEC-035 já previa a saída ("`ServicoEmConstrucao` … **promovido a `Servico` completo quando as etapas seguintes preencherem o resto**"), mas essa promoção **nunca foi implementada** para a transição itinerário → Serviço no modo "novo". Nenhum E2E exercita o fluxo "novo" de Serviços → Itinerários → Viagens (só o fluxo de JSON aberto é coberto). Descoberto em teste manual do usuário e confirmado no código em 2026-07-16, a partir da revisão da TASK-055.

**Spec relacionada:** Spec 04 §6 (criar Serviço), §7 (montagem do itinerário), §8 ("Após criar/alterar o itinerário … a etapa seguinte é a grade de horários"); DEC-035 (`ServicoEmConstrucao`); RN-018 (documento válido exige ≥ 1 Serviço). Não altera o contrato JSON — é estado de sessão efêmero (RN-096/NEG-004).

**Impacto se não decidir:** o fluxo **criar-do-zero** permanece inutilizável além dos itinerários; só o fluxo de abrir JSON existente funciona ponta a ponta. Risco de a ferramenta parecer completa (as etapas existem e navegam) mas não permitir montar um documento novo de fato.

**Opções possíveis:** A — **promover** o `ServicoEmConstrucao` a `Servico` completo (com `itinerarios[]` contendo paradas+rota+matriz; `viagens` preenchidas depois) ao concluir a edição do itinerário, concentrando o modo dual num único ponto de promoção — leitura literal da DEC-035. B — fazer **Viagens e Matrizes lerem `servicosEmConstrucao`** diretamente (menos invasivo por etapa, mas espalha o tratamento de dois modos por mais telas). C — híbrido (promoção parcial + leitura tolerante). Em todos os casos: UUIDs preservadas (RN-002/004), nada gravado no JSON antes da exportação (RN-096).

**Recomendação técnica:** A — mais aderente à DEC-035 ("promovido a `Servico` completo") e concentra o modo "novo"/"carregado" num único ponto, em vez de replicar o `sessao.modo === "carregado" ? … : []` por etapa. Detalhe de arquitetura (gatilho e forma da promoção) a fechar na `/analisar-task` da futura task; se envolver decisão de modelo de sessão, pode virar DEC própria.

**Decisão:** **Decidida (DEC-053, 2026-07-16).** Opção A: no fluxo "novo", o `ServicoEmConstrucao` é promovido a `Servico` completo (itinerarios[] com paradas+rota+matriz; viagens depois) ao concluir a edição do itinerário, concentrando o modo dual num único ponto de promoção — leitura literal da DEC-035. As etapas Viagens/Matrizes voltam a ler os Serviços por um único caminho (documento). UUIDs preservadas (RN-001/002/004); nada gravado no JSON antes da exportação (RN-096). Gatilho/forma da promoção e eventuais ajustes do modelo de sessão ficam para a `/analisar-task` da task de implementação (TASK-061); um E2E do fluxo "novo" ponta a ponta (TASK-062) cobre a lacuna de teste. Ver DEC-053.

## Q-035 — Mapa único de itinerários (TASK-060): como o usuário indica se um clique cria Seção, Local ou ponto de rota?

**Contexto:** A Spec 04 §7 exige que Seções, Locais e pontos de rota sejam lançados **num mesmo mapa interativo**, mas **não detalha a interface** de como o usuário escolhe o que cria a cada clique. A TASK-060 unifica os dois mapas hoje separados (`EditorSecoes`/`EditorLocais`) num só canvas e precisa fixar esse gesto. A "Perguntas em aberto" da TASK-060 previa que isso viraria Q-xxx **só se o dono quisesse fixar a interação** em spec-derivado (doc 18, sob DEC-050) — foi o que ocorreu: o responsável definiu o modelo na conversa da `/analisar-task` (2026-07-16).
**Spec relacionada:** Spec 04 §7 (mapa único), §7.1 (Seção), §7.2 (Local), §7.3 (ponto de rota — "visual distinto, vértice pequeno sobre a linha, sem entrada na tabela de paradas"); doc 18 §87 (mapa em destaque + tabela lateral); DEC-050 (governança de UI pelo doc 18).
**Impacto se não decidir:** cada task de UI decidiria o gesto ad hoc; a unificação do mapa (TASK-060) ficaria sem afordância definida e o critério de aceite "escolher o que se cria" sem interpretação fixada.
**Opções possíveis:** A — seletor de modo explícito (botão Seção/Local/ponto de rota); o clique é roteado ao modo ativo. B — gesto do mouse: **clique esquerdo cria Seção, clique direito cria Local**; ponto de rota por clique sobre a linha da rota (gesto próprio); marcadores circulares diferenciados por tipo; lista ordenada (tabela lateral) à direita. C — deixar como UX livre revisável, sem fixar.
**Recomendação técnica:** A ou B — as duas atendem a Spec 04 §7; B tem menos cromo de UI (sem barra de ferramentas) mas o clique direito é gesto de menor descoberta (mitigar com dica visível).
**Decisão:** **Decidida (DEC-054, 2026-07-16).** Opção B: no mapa único da etapa de itinerários, **clique esquerdo cria Seção** e **clique direito cria Local**; ao clicar, abre-se a janelinha de criação do ponto; marcadores **circulares** com **diferenciação visual** entre Seção e Local; **lista ordenada de paradas à direita** (tabela lateral, doc 18 §87). O **gesto de ponto de rota** (clique sobre a linha → vértice arrastável, Spec 03 §3.6 — motor já pronto na TASK-023) e a **sincronização seleção tabela↔mapa** (Spec 04 §7) ficam **fora da TASK-060** e viram tasks próprias (TASK-063 e TASK-064). Ver DEC-054. **Superada em parte pela Q-036/DEC-055 (2026-07-16)** — a atribuição dos botões do mouse foi invertida. **Superada também em parte pela DEC-069 (2026-07-21)** — os marcadores deixam de ser circulares para ambos: Seção vira **quadrado** azul e Local encolhe para **12 px**, com forma/tamanho substituindo a cor como canal primário de distinção. O restante (tabela lateral, ausência de barra de ferramenta, deferimento de TASK-063/TASK-064) continua valendo.

## Q-036 — Mapa único: inversão dos gestos do mouse e inserção posicional de parada pelo clique sobre a linha da rota

**Contexto:** Ao analisar a TASK-063 (gesto de ponto de rota), apareceu uma colisão que a Q-035/DEC-054 não pôde prever, porque naquele momento o gesto de ponto de rota estava deferido: a **linha da rota corre exatamente sobre as vias**, e a Spec 04 §7.3 item 6 manda que clicar **sobre a linha** crie um ponto de rota, enquanto o item 2 manda que clicar no mapa crie Seção — com o DEC-054 atribuindo a Seção ao **mesmo** botão esquerdo. Uma Seção intermediária que o usuário queira lançar no meio do itinerário cai, quase sempre, em cima da linha: os dois gestos disputam o mesmo pixel. Além disso, hoje toda parada criada pelo mapa é **acrescentada ao fim** da lista ordenada, obrigando o usuário a subi-la com as setinhas da tabela lateral, embora a Spec 04 §7.3 item 2 fale em inserir Seções e Locais "**em ordem**". O responsável pelo domínio propôs, na conversa da `/analisar-task` da TASK-063 (2026-07-16), um desenho que resolve as duas coisas de uma vez.
**Spec relacionada:** Spec 04 §7 (mapa único), §7.3 itens 2, 3 e 6 (inserir em ordem; tabela lateral; clique sobre a linha cria vértice arrastável); Spec 03 §3.6 (ponto de rota ancorado entre duas paradas consecutivas); DEC-054 (atribuição dos botões, superada em parte); DEC-050/doc 18 (governança de UI).
**Impacto se não decidir:** a TASK-063 fica sem regra de desempate para o clique sobre a linha (criar Seção ou ponto de rota?), e a criação de parada no meio do itinerário continua só pela tabela lateral, contrariando a leitura natural do §7.3 item 2.
**Opções possíveis:** A — manter o DEC-054 e aplicar o literal da Spec 04 §7.3 item 6: clique esquerdo sobre a linha cria ponto de rota, clique esquerdo fora cria Seção; a Seção sobre a via é criada ao lado e arrastada até ela. B — modo explícito: um botão "adicionar ponto de rota" arma o gesto; fora do modo, o clique na linha cria Seção. C — modificador de teclado (ex.: `Alt`+clique na linha) para o ponto de rota. D — **inverter os botões**: esquerdo passa a ser o gesto de **ponto de rota** (só sobre a linha; fora dela não cria nada e o mapa faz pan normalmente), e o direito abre a **escolha entre Seção e Local** — sobre a linha, a parada é **inserida entre as paradas daquele trecho**; fora dela, é acrescentada ao fim.
**Recomendação técnica:** D. Elimina a disputa de pixel por construção (cada botão tem um significado só), torna a escolha Seção×Local explícita em vez de depender de qual botão o usuário lembrou, e a inserção posicional reusa o **mesmo ancorador geométrico** que a TASK-063 já precisa construir para o `apos_parada_ordem` — o `inserirParada` do motor de montagem já aceita índice de inserção. Custo: inverte o gesto entregue e aprovado na TASK-060 (testes de `editor-mapa-itinerario.test.tsx` mudam de asserção) e exige um componente de menu flutuante, que não existe hoje em `shared/ui`.
**Decisão:** **Decidida (DEC-055, 2026-07-16).** Opção D, com as três lacunas fechadas pelo responsável: clique **esquerdo fora da linha não cria nada** (o mapa faz pan normalmente); clique **direito fora da linha** abre a escolha e **acrescenta a parada ao fim** da lista; a escolha Seção×Local aparece como **menu flutuante no ponto clicado**. Ver DEC-055.

## Q-037 — Re-ancoragem dos pontos de rota quando o conjunto ou a ordem das paradas muda

**Contexto:** A Spec 03 §3.6.2 ("Reedição fiel") manda **reaplicar** os pontos de rota persistidos ao recalcular a rota, citando literalmente "por **alterar paradas** ou arrastar um ponto". Mas a Spec 02 §10.4 (e a RN-042) define `apos_parada_ordem` como a `ordem` da parada após a qual o ponto aparece, obrigatoriamente em `[1, paradas.length - 1]` — um índice **posicional**, calculado sobre a lista de paradas que acabou de mudar. As duas normas colidem quando o conjunto/ordem de paradas muda: **removida** uma parada, os pontos do último trecho passam a violar o intervalo (§14 os rejeita, e `intercalar-pontos-de-rota.ts` **lança**, hoje sem `catch` em `solicitarRota`/`dispararRecalculo` — vira rejeição não tratada em vez da falha bloqueante da RN-048); **inserida** uma parada no meio ou **reordenada** a sequência, os valores continuam no intervalo válido mas passam a designar **outro par de paradas** — o documento fica válido e o traçado forçado sai errado, em silêncio, contrariando a própria finalidade de §3.6.2. Nenhuma seção descreve a re-ancoragem, e o §3.6.1 não ajuda: a regra de travessia `(apos_parada_ordem, índice no array)` pressupõe o conjunto de paradas fixo. Falta ainda o caso de uma parada nova **partir um trecho em dois**, exigindo repartir os pontos daquele trecho entre os dois lados. Alcançável **hoje**, sem a TASK-063: importar JSON com `pontos_de_rota` e remover uma parada na tabela lateral. Levantada pela `/investigar-conflito` durante a análise da TASK-063 (2026-07-16).
**Spec relacionada:** Spec 03 §3.6 regra 1, §3.6.1, §3.6.2 × Spec 02 §10.4, §14; RN-042 (ancoragem e intervalo), RN-048 (falha bloqueante, sem degradação silenciosa), RN-052 (editar recalcula); precedente **DEC-048** (mesma questão resolvida para `offset_horario`, que também é indexado por posição de parada).
**Impacto se não decidir:** a TASK-063 entrega um gesto que torna rotineiro um caminho que hoje estoura em rejeição não tratada; a inserção posicional de parada (Q-036/DEC-055) fica sem regra para os pontos do trecho partido; e o traçado forçado pode ser silenciosamente reatribuído ao par errado de paradas, corrompendo `distancia_km` e, por consequência, a matriz e a tarifa.
**Opções possíveis:** A — **re-ancorar geometricamente onde é determinístico, descartar só onde é ambíguo**: parada acrescentada ao fim → nada muda; parada inserida no meio (posição conhecida ao longo do traçado, pois o usuário clicou sobre a linha) → pontos antes dela mantêm a ordem, os depois recebem +1; parada removida → os dois trechos adjacentes fundem-se e os pontos de ambos assumem a ordem do trecho fundido, preservando a sequência; **reordenação** → travessia muda por inteiro, sem referência posicional possível, então descartar os pontos daquele itinerário com aviso não bloqueante. B — **descartar sempre** que a ordem ou o conjunto de paradas mudar (analogia estrita com a DEC-048), preservando só o caso "mesma ordem, mesmo conjunto" (mover coordenada, mover/criar/remover ponto de rota). C — reaplicar cru e **truncar/clampear** o `apos_parada_ordem` fora do intervalo. D — **bloquear** a alteração de paradas enquanto houver pontos de rota no itinerário, exigindo remoção manual antes.
**Recomendação técnica:** A. A regra de precedência do `docs-dev/00` §9 não arbitra (os dois trechos estão na mesma spec e versão), mas a restrição de intervalo é **invariante de contrato com gate de validação** (Spec 02 §10.4/§14 — documento que a viole não exporta), enquanto a reaplicação de §3.6.2 é **intenção de UX** (poupar retrabalho): o invariante vence e a intenção é honrada até onde não o quebre. A DEC-048 já fixou a taxonomia "muda ordem/conjunto × não muda" e mandou descartar o que não tem como ser preservado — mas há uma assimetria que impede copiá-la cegamente: `offset_horario` tem fórmula de recomputação (§8.1), **ponto de rota não tem** (é intenção pura do usuário, não derivável), então descartar custa caro e é exatamente o que §3.6.2 quer evitar. A opção A preserva o trabalho nos três casos frequentes e só admite a perda no caso logicamente inevitável. C é descartada por corromper o traçado em silêncio (viola RN-042 e a norma de §3.6.2); D é rígida demais e contradiz o modelo de edição fluida da Spec 04 §7.3. Em qualquer opção, o `throw` de `intercalar-pontos-de-rota.ts` deve virar falha bloqueante bem-comportada (RN-048) num `catch` defensivo — arquivo corrompido não pode derrubar a etapa.
**Decisão:** **Decidida (DEC-056, 2026-07-16).** Opção A: **re-ancorar geometricamente onde é determinístico, descartar só onde é ambíguo.** Parada acrescentada ao fim → nada muda; parada inserida no meio → pontos antes dela mantêm a ordem, os depois recebem +1 (o trecho partido reparte seus pontos pelos dois lados conforme a posição ao longo da linha); parada removida → os dois trechos adjacentes fundem-se e os pontos de ambos assumem a ordem do trecho fundido, preservando a sequência; **reordenação** → pontos daquele itinerário descartados, com aviso não bloqueante. Em qualquer caminho, `apos_parada_ordem` fica em `[1, paradas.length − 1]` (RN-042) e `trechos == paradas − 1` (RN-041). O `throw` de `intercalar-pontos-de-rota.ts` passa a ser falha bloqueante bem-comportada da RN-048 (`sem-rota`), sem apagar a última rota válida. Desbloqueia TASK-066 e TASK-067. Ver DEC-056. **Superada em parte pela Q-040/DEC-060 (2026-07-17):** o caso da **reordenação** deixa de descartar — os pontos preservam sua posição na lista unificada da tabela lateral e re-ancoram ao par de paradas que passa a cercá-los; os demais casos permanecem.

## Q-038 — Recálculo que falha (`sem-rota`, RN-048) descarta os pontos de rota do último recálculo bem-sucedido

**Contexto:** `pontosDeRotaAtual`, em `etapa-itinerarios.tsx`, é derivado de `estadoAtual.rota.pontos_de_rota` — só existe quando `estadoAtual.situacao` é `congelada` ou `recalculada`. Quando um recálculo falha (RN-048), `estadoAtual` vira `{ situacao: "sem-rota", falha }`, sem `rota`; o próximo gesto do usuário lê `pontosDeRotaAtual` como `[]`, porque não há mais nenhum `rota` de onde derivá-lo. Se esse próximo gesto disparar um recálculo que desta vez tenha sucesso, a rota gravada sai **sem** os pontos de rota que existiam antes da falha — inclusive os que vieram do arquivo original (Spec 03 §3.6.2, "reedição fiel"). O documento permanece válido (nenhuma regra de esquema é violada) e a perda é **silenciosa**: nada na UI indica que os pontos de forçamento sumiram. Levantada durante a análise da TASK-063 (2026-07-16) — o gesto de criar/mover/remover ponto de rota torna esse caminho mais frequente (antes, só reaplicação passiva pós-import o alcançava), mas o bug já existe hoje, independente da TASK-063.
**Spec relacionada:** Spec 03 §3.6.2 (reedição fiel — pontos persistidos devem ser reaplicados ao reeditar); RN-042 (persistência do ponto de rota), RN-048 (falha bloqueante do OSRM, "sem degradação silenciosa" — a perda de dado é o mesmo espírito de "silencioso" que a RN-048 proíbe para a rota em si, embora o texto da RN-048 fale da rota, não dos pontos).
**Impacto se não decidir:** um recálculo falho seguido de um recálculo bem-sucedido apaga o traçado forçado do usuário sem aviso; o próximo `/analisar-task` que tocar `estado-rota-viva.ts`/`etapa-itinerarios.tsx` (candidata natural: TASK-066, que já mexe na reaplicação de pontos por causa da DEC-056) precisa saber que este caminho existe para não o piorar.
**Opções possíveis:** A — manter `pontosDeRotaAtual` (ou equivalente) num estado que sobrevive a uma transição para `sem-rota`, em vez de derivá-lo só de `estadoAtual.rota` (ex.: um campo separado no estado ao vivo, ou preservar o último `rota.pontos_de_rota` conhecido mesmo depois da falha). B — aceitar a perda como consequência aceitável de uma falha de rota (o usuário já foi avisado do `sem-rota`; refazer os pontos manualmente é o custo). C — investigar no momento da TASK-066 (que já vai mexer em reaplicação/re-ancoragem) em vez de task própria agora.
**Recomendação técnica:** A, avaliada em conjunto com a TASK-066 — o mesmo ponto do código (reaplicação dos pontos antes de montar a requisição) que a DEC-056 já vai alterar. Não decido a opção aqui: é escopo de implementação, não de leitura de spec.
**Decisão:** **Decidida (DEC-058, 2026-07-16).** Opção A: os pontos de rota do itinerário em edição passam a viver em **estado de sessão próprio**, que **sobrevive** à transição para `sem-rota`; `rota.pontos_de_rota` continua sendo o **eco dos pontos aplicados no último recálculo bem-sucedido**, gravado junto da rota congelada (contrato JSON inalterado). Ao abrir um JSON, a lista da sessão nasce do arquivo (reedição fiel, §3.6.2). Vira a **TASK-071**, que **precede a TASK-066** — as duas tocam a reaplicação dos pontos, e a ordem evita retrabalho. Ver DEC-058.

## Q-039 — TASK-062 (E2E criar-do-zero) precisa disparar a exportação pela UI, mas a tela de exportação é a TASK-032, ainda não implementada

**Contexto:** A TASK-062 pede um E2E que percorra o fluxo "novo" **até a Exportação** e valide o JSON exportado (schema strict + round-trip de UUID). Levantado na `/analisar-task` da TASK-062 (2026-07-17): as etapas **"Revisão" e "Exportação JSON/PDF" ainda renderizam placeholder** (`"Etapa em construção…"`, `src/formulario/layout/layout-formulario.tsx:211-216`); a camada pura `exportarComoProposta`/`exportarComoVigente` existe (`src/formulario/exportacao/exportar-documento.ts`), mas **nada a liga a um botão** — a tela de Revisão e o gate de exportação são a **TASK-032** (Revisão e validação final), ainda não implementada. A TASK-062, porém, só declarava dependência da TASK-061; sua nota de "Arquivos prováveis" assumia o fluxo inteiro selecionável hoje. Dos 5 critérios de aceite, **3 não são exercitáveis via UI** sem a TASK-032: exportação produz JSON válido (crit. 3), round-trip de UUID no JSON exportado (crit. 4) e o caso inválido de bloqueio da exportação sem ≥ 1 Serviço (RN-018). Os outros 2 — o núcleo (regressão-guarda da TASK-061: criar do zero → itinerário → Viagens/Matrizes populados) e o mock do OSRM — são implementáveis hoje.

**Spec relacionada:** Spec 04 §10 (Revisão) e §12 (Exportação JSON/PDF); RN-078 (gate de exportação), RN-018 (≥ 1 Serviço), RN-004 (round-trip de UUID). TASK-032 (tela de Revisão + gate) é a dona da UI de exportação.

**Impacto se não decidir:** a TASK-062 nasce com 3 de 5 critérios impossíveis via UI; ou se implementa um E2E parcial que não cobre o que o título promete ("… → Exportação"), ou se inventa UI de exportação dentro dela (invade a TASK-032, viola o princípio "uma task por vez").

**Opções possíveis:** (a) **re-sequenciar** a TASK-062 depois da TASK-032 e simplificar: com o botão de exportação e o gate reais, o E2E dirige o fluxo inteiro e valida o JSON exportado sem contornos. (b) **dividir**: implementar já o E2E da regressão-guarda (crit. 1, 2, 5) e deferir o leg de exportação (crit. 3, 4 + caso inválido) para uma sub-task dependente da TASK-032. (c) manter o escopo e cobrir export/round-trip como teste de **integração** rodando `exportarComoProposta` sobre o documento montado no nível de modelo (fora da UI), aceitando que "disparar a exportação" não seja pelo botão.

**Recomendação técnica:** (b) — entrega já o valor central (fecha a lacuna da Q-034) sem antecipar a TASK-032. A decisão do responsável foi outra (ver abaixo).

**Decisão:** **Decidida (DEC-059, 2026-07-17).** Opção (a): a TASK-062 passa a **depender da TASK-032** e é re-sequenciada para depois dela (`032 → 062`); o E2E é **simplificado** para dirigir o fluxo "novo" inteiro (Identificação → … → Exportação) usando a tela de Revisão e o botão de exportação reais que a TASK-032 entrega, dispensando qualquer contorno ou `data-testid` improvisado. Todos os 5 critérios de aceite (inclusive export/round-trip e o caso inválido do gate) ficam exercitáveis pela UI. OSRM sempre mockado (DEC-029). Ver DEC-059.

## Q-040 — Posição dos pontos de rota na UI: tabela lateral intercalada (§7/§7.3 item 3) ou sub-lista própria (§7.3, regra explícita de UX)

**Contexto:** A Spec 04 §7 (2º parágrafo, layout da etapa) e §7.3 item 3 dizem que a **tabela lateral** lista Seções, paradas comuns **e pontos de rota** "na ordem da travessia", sincronizada com o mapa. Mas a mesma §7.3, no bloco explicitamente rotulado "Regras explícitas de UX (decisões desta spec)", fixa o oposto: "Ponto de rota não é Seção, Local nem Parada... **sem entrada na tabela de paradas** (aparece em sub-lista própria)". A TASK-063 (entregue) implementou a leitura literal desse terceiro trecho: os pontos de rota aparecem numa `sub-lista-pontos-de-rota` própria, renderizada **abaixo do mapa** em `editor-mapa-itinerario.tsx` (linha 489), desconectada da `tabela-paradas` que fica na coluna lateral em `etapa-itinerarios.tsx` (linha 672). O responsável pelo domínio relatou (2026-07-17) que o resultado é ruim de usar — os pontos de rota "aparecem abaixo do mapa, em vez de junto das seções e pontos de parada, na ordem como aparecem" — e declarou preferência pela leitura de §7/§7.3 item 3: lista lateral única, intercalando Seção/Local/ponto de rota na ordem real da travessia (ex.: Seção A / ponto de rota a / Seção B / ponto de rota b / Local X / Seção C). Levantada por `/investigar-conflito` (2026-07-17): conflito **real de redação** dentro da mesma spec/versão, sem registro de superação em "Decisões Fechadas".
**Spec relacionada:** Spec 04 §7 (linha 115), §7.3 item 3 (linha 149) × §7.3 regra explícita de UX (linha 158); RN-042 (ponto de rota sem identidade — sem `uuid`, sem nome, sem município, fora de matrizes); RN-076 (padrão de exibição "Cidade - Nome" só se aplica a Seção). Nenhuma DEC existente decidiu este ponto: DEC-054/DEC-055 fixaram os *gestos* de criação no mapa; DEC-057 fixou a *identidade visual do vértice* no mapa; nenhuma tratou da *posição na tabela lateral*.
**Impacto se não decidir:** TASK-064 (sincronização seleção tabela↔mapa) precisa saber contra qual estrutura sincronizar (uma tabela só, ou tabela + sub-lista separada) antes de ser implementada; TASK-068/069/070 (visual do vértice no mapa) não são afetadas (tratam do mapa, não da tabela), mas qualquer refino futuro da tabela lateral fica sem base. Sem decisão, a UX permanece na forma que o próprio responsável classificou como ruim.
**Opções possíveis:** A — **Lista lateral única intercalada, na ordem da travessia** (leitura dos trechos de §7 e §7.3 item 3; preferência declarada do responsável). A `tabela-paradas` passa a incluir uma linha por ponto de rota, intercalada entre as paradas conforme `apos_parada_ordem`. Para não violar RN-042 ("não é Parada"), o ponto de rota entra como **item visualmente distinto** dentro da mesma lista — sem nome, sem município, sem o padrão "Cidade - Nome", sem as ações de parada (sem subir/descer por setinha, sem edição de campos) — só a ação "Remover", herdada da sub-lista atual. Não vira uma "parada disfarçada": é indicação posicional dentro da mesma lista, não uma entidade reordenável como Seção/Local. B — **Manter sub-lista própria** (leitura literal de §7.3 linha 158), mas **reposicionando-a**: sai de abaixo do mapa e passa para a coluna lateral, imediatamente abaixo da `tabela-paradas`. C — **Sub-lista agrupada por trecho**, ainda separada, organizada em blocos entre cada par de paradas ("Entre Seção A e Seção B" seguido dos pontos daquele trecho) — meio-termo: preserva a separação da linha 158, mas comunica a posição relativa que §7/§7.3 item 3 pedem.
**Recomendação técnica:** A precedência do `docs-dev/00` §9 não arbitra diretamente (mesma spec, mesma versão), mas dentro do §7.3 há sinal de especificidade: o bloco da linha 158 é introduzido como "Regras explícitas de UX (decisões desta spec)" — fixação deliberada, tecnicamente mais forte que a descrição de layout genérica de §7 e que o item 3 (enumeração de fluxo). Por leitura pura de texto, a opção B é a mais aderente à letra. Dito isso, a preferência do responsável pela opção A é compatível com RN-042 desde que o ponto de rota não ganhe tratamento de parada dentro da lista (sem nome, sem reordenação/edição, só remoção) — implementável sem tocar contrato. Recomenda-se **A**, tratando a redação de §7.3 linha 158 como imprecisa neste ponto ("sem entrada na tabela" leia-se "sem ser tratado como parada", não "fisicamente em lista separada"); se decidida A, cabe ao dono da spec alinhar a §7.3 (a exemplo da DEC-052). A escolha é humana.
**Decisão:** **Decidida (DEC-060, 2026-07-17).** Opção A, **modificada pelo responsável**: pontos de rota intercalados na tabela lateral, itens visualmente distintos (sem nome/município/`Cidade - Nome`), **com setinhas de subir/descer** além do "Remover" — a posição na lista unificada passa a reger a ancoragem (`apos_parada_ordem` + índice), inclusive quando Seções/paradas sobem ou descem ultrapassando pontos (eles passam a pertencer ao outro trecho). **Supera em parte a DEC-056** (o caso "reordenação → descarte" vira re-ancoragem posicional). Desbloqueia a TASK-079; TASK-066 atualizada. Ver DEC-060.

## Q-041 — Realocação de uma Seção inteira no mapa: mover todos os pontos do cluster de uma vez, sob a regra dos 350 m

**Contexto:** A regra dos 350 m (RN-027; Spec 02 §5.2; Spec 03 §7.2) valida cada ponto contra o centroide do **conjunto** de pontos da Seção (todas as contribuições, de todos os Serviços, Ida e Volta). O arrasto de hoje move **um ponto por vez** (a contribuição do Serviço × sentido corrente — `revalidarArrasto`, `src/formulario/secoes/fluxos-secao.ts`), e a DEC-044 fixou que a recusa exibe só a mensagem da Spec 04 §14, porque "arrastar não deve poder descaracterizar uma Seção". Consequência prática relatada pelo responsável em teste manual (2026-07-17): **é impossível corrigir a localização de uma Seção mal posicionada** — o usuário teria que arrastar ponto a ponto, cada um preso a ≤ 350 m do centroide do conjunto, "de 350 em 350 metros". Nenhuma spec prevê uma operação de **realocação da Seção inteira**. Geometricamente, uma **translação rígida** (mover todos os pontos pelo mesmo vetor) preserva o invariante dos 350 m por construção (as distâncias ao centroide não mudam) — a operação não viola RN-027; o que ela muda é o **lugar** da Seção, que é exatamente o que a DEC-044 disse que o arrasto de um ponto não pode fazer. A questão é se essa mudança de lugar, como **gesto deliberado e distinto** (não um arrasto acidental), deve existir.
**Spec relacionada:** Spec 02 §5.2 (clustering); Spec 03 §7.2 (INSERIR/validação incremental — silente sobre mover o conjunto); Spec 04 §7.1 (arrasto por ponto) e §14 (mensagem de recusa); RN-027, RN-029 (município derivado do ponto — uma translação pode mudar o município), RN-052 (mover coordenada recalcula rota); DEC-044 (motivo: descaracterizar), DEC-055 (o clique direito já tem dono no mapa — menu Seção/Local).
**Impacto se não decidir:** a única forma prática de "mover" uma Seção é apagá-la e recriá-la — o que **troca a UUID** e destrói a comparabilidade entre versões (RN-004/Spec 01 §6), empurrando o usuário justamente para o pior caminho; ou o usuário desiste e deixa a Seção no lugar errado.
**Opções possíveis:** A — **gesto de realocação da Seção inteira** (translação rígida): um gesto explícito de "mover Seção" (proposta do responsável: duplo clique no marcador entra no modo, os pontos de **todas** as contribuições aparecem no mapa em cor neutra, arrastar o marcador ativo move o conjunto todo pelo mesmo vetor; cancelar por `Esc`/gesto definido no design; confirmar no soltar). Ao confirmar: município re-derivado do novo centroide (RN-029; fora de SP → recusa), **todos** os itinerários de **todos** os Serviços que referenciam a Seção têm rota marcada para recálculo (RN-052) e matrizes reconciliadas (RN-054..057). B — realocação só por **remover e recriar** a Seção (status quo documentado, aceitando a perda de UUID). C — afrouxar a regra dos 350 m no arrasto individual (ex.: validar só contra os pontos do próprio Serviço). — **C é descartável de pronto**: contraria RN-027 (o cluster é de todos os pontos) e exigiria reescrever a Spec 02 §5.2.
**Recomendação técnica:** A. Não cria regra de negócio nova no contrato (nenhum campo muda; o invariante dos 350 m permanece válido por construção; UUID preservada — é o **único** caminho que preserva a identidade ao corrigir o lugar) e resolve a dor real. Exige decisão porque: (i) muda o alcance do gesto (o usuário de um Serviço move também as contribuições **dos outros** Serviços — aceitável, pois Seção é entidade do Autos, RN-025, mas deve ser deliberado); (ii) convive com a DEC-044 (o arrasto simples continua recusando >350 m; a realocação é gesto distinto e explícito — a DEC-044 não é revogada, é complementada); (iii) o custo de recálculo em cascata (todos os Serviços afetados) precisa ser aceito. O gesto exato (duplo clique × opção num menu de contexto do marcador) é design sob DEC-050/doc 18 — fixar na decisão apenas a existência e a semântica da operação.
**Decisão:** **Decidida (DEC-061, 2026-07-17).** Opção A: gesto explícito de realocação da Seção inteira (translação rígida de todos os pontos), com re-derivação de município, recálculo em cascata dos itinerários afetados e UUID preservada; DEC-044 permanece para o arrasto simples. Desenho exato do gesto fecha na `/analisar-task` da TASK-078 sob DEC-050. Ver DEC-061. **O mecanismo de entrada por "modo" (duplo clique) foi superado pela DEC-079 (2026-07-24, Q-057):** o botão do mouse usado no arrasto passou a distinguir os dois gestos diretamente, sem etapa de modo; as consequências de confirmação fixadas aqui (município, recálculo em cascata, UUID) permanecem válidas.

## Q-042 — Etapa de itinerários: Ida e Volta visíveis no mesmo mapa (cores próprias, Volta tracejada), em vez de uma passagem exclusiva por sentido

**Contexto:** Hoje a etapa "Seções, Locais e Itinerários" edita **um sentido por vez**: seletor de Serviço + botões Ida/Volta (`seletor-sentido`, `src/formulario/itinerarios/etapa-itinerarios.tsx`), e o mapa mostra apenas os marcadores, a rota e a descrição do sentido selecionado. A Spec 04 §4 fala em "uma passagem por Serviço × sentido" e o §7.3 item 1 em "escolhe o Serviço e o sentido", mas nada proíbe **exibir** os dois sentidos simultaneamente — a §7.4, aliás, manda exibir o painel de descrição "para **cada** Serviço e sentido". O responsável relatou (2026-07-17) que alternar entre abas esconde o contexto: quer **um único mapa** com um controle de visibilidade (checkbox) por sentido, cores distintas por sentido e a linha da **Volta tracejada** para diferenciação imediata, e os **dois** painéis de descrição textual (Ida e Volta) embaixo, cada um com seus botões copiar / recalcular / ver itens estruturados.
**Spec relacionada:** Spec 04 §4 (etapa de mapa por Serviço × sentido), §7.3 (montagem por sentido; recálculo por gesto), §7.4 (painel de descrição por Serviço **e sentido** — compatível com exibir os dois); RN-046/052 (recálculo por sentido, inalterado); DEC-050/doc 18 (cores/tracejado são design); DEC-054/055/057 (gestos do mapa único — precisam de um alvo de sentido definido quando os dois estão visíveis).
**Impacto se não decidir:** a divergência entre o que o responsável espera e o que a etapa faz cresce a cada task do ramo do mapa (TASK-064..071 renderizam sobre a superfície atual); decidir depois de todas elas implica retrabalho maior.
**Opções possíveis:** A — **mapa único com os dois sentidos visíveis** (proposta do responsável): checklist de visibilidade Ida/Volta; Ida em cor própria com linha cheia, Volta em cor própria com linha **tracejada**; marcadores dos dois sentidos coexistem; a edição por gesto tem **alvo de sentido inequívoco** (arrastar um marcador edita o sentido daquele marcador; criar entidade nova segue a regra de criação espelhada já existente; gestos ambíguos — clique direito para criar, clique na linha — vão para o **sentido ativo**, mantido como seleção leve); os dois painéis de descrição (§7.4) aparecem embaixo, um por sentido, cada um com copiar/recalcular/ver estruturado; recálculo continua por sentido (RN-052). B — manter a edição por abas e acrescentar só uma **sobreposição somente-leitura** do outro sentido (linha tracejada esmaecida, sem marcadores interativos). C — status quo (abas exclusivas).
**Recomendação técnica:** A, com a ressalva de que o "sentido ativo" para gestos ambíguos precisa ficar explícito na UI (o checklist de visibilidade não substitui a noção de alvo). Se a Q-043 for decidida pela Volta espelhada, a opção A fica ainda mais natural: a Volta deixa de ser "montada" e passa a ser só **ajustada** (posições, Locais por sentido, pontos de rota), e os gestos sobre marcadores da Volta são autoalvo. Cores exatas, tracejado e legenda são do doc 18 (DEC-050) — a decisão fixa a existência e a semântica, não o hex.
**Decisão:** **Decidida (DEC-062, 2026-07-17).** Opção A, com o detalhamento do responsável: sentido ativo por **botão tipo aba** (Ida/Volta), que rege também o conteúdo da tabela lateral; itens (Seções, Locais e pontos de rota) **numerados 1..n na ordem da viagem** do sentido ativo, com a numeração nos marcadores do mapa; o ponto do sentido inativo de uma Seção fica na mesma tonalidade, levemente acinzentado, em segundo plano (ativo sempre à frente); Volta tracejada; dois painéis de descrição embaixo. Desbloqueia a TASK-076. Ver DEC-062.

## Q-043 — Volta espelhada: montagem automática da Volta como inverso da Ida e regra "ordem das Seções da Volta = inverso da Ida"

**Contexto:** A Spec 02 §14 exige que, quando os dois itinerários existem, o **conjunto** de Seções da Ida seja idêntico ao da Volta ("só os Locais comuns intermediários podem diferir") — nada diz sobre a **ordem**; a RN-030 derivou "a ordem pode diferir". A Spec 04 §7.1/§7.2 já manda a **criação espelhada de pontos** (criar Seção/Local na Ida de um Serviço bidirecional cria as duas geolocalizações no mesmo lugar), mas a **montagem do itinerário** da Volta (a lista `paradas[]`) é manual e começa vazia. O responsável afirmou (2026-07-17) a regra de domínio: *"ABCD sempre volta DCBA — não pode ir passando de um jeito e voltar passando de outro"* — a sequência de Seções da Volta é **necessariamente** o inverso da Ida (a rota/traçado pode diferir por binários e pontos de rota; Locais podem divergir por sentido, como a Spec 02 §14 já permite). Ele pediu também as duas consequências de UX: **(i)** inserir Seções na Ida já monta a Volta na ordem inversa automaticamente (a Volta nasce pronta, o usuário só ajusta posições/Locais/pontos de rota); **(ii)** o painel "Reutilizar Seção existente" deixa de ofertar as Seções do **próprio** Serviço corrente (reutilizar passa a servir só para trazer Seções **de outros Serviços** — e, ao reutilizar num Serviço bidirecional, a Seção entra nos dois sentidos, na posição inversa correspondente). Hoje o reuso oferta todas as Seções do documento (`editor-mapa-itinerario.tsx`, `reuso-secoes`), inclusive as do próprio Serviço, justamente porque a Volta precisa ser montada à mão.
**Spec relacionada:** Spec 02 §14 (conjunto idêntico — a ordem inversa seria **validação nova**, mudança de spec); Spec 04 §7.1 (criação espelhada de pontos; reutilização de Seções existentes "criadas por este ou por outros Serviços" — a restrição do reuso a outros Serviços também toca a spec); Spec 03 §4.2 (matriz soma trechos entre posições — indiferente à ordem); RN-030 (e DEC-020/DEC-047 — aviso não bloqueante de divergência de conjunto); RN-004 (o espelhamento automático não cria UUIDs novas — referencia as mesmas Seções).
**Impacto se não decidir:** o usuário monta a Volta duas vezes à mão (a dor relatada); ou o Formulário espelha automaticamente "por conveniência" sem regra registrada — regra inventada, proibida pelo protocolo (`docs-dev/04` princípio 2). E a TASK-076 (mapa Ida+Volta) e o reuso ficam sem semântica definida.
**Opções possíveis:** A — **regra dura + espelhamento automático**: a spec (dono) passa a exigir que a sequência de Seções da Volta seja o inverso exato da Ida (validação estrutural nova na Spec 02 §14, ao lado da de conjunto); o Formulário monta a Volta automaticamente (inserir/remover/reordenar Seção na Ida reflete na Volta na posição inversa — e vice-versa); a edição da Volta fica restrita a posições de pontos, Locais por sentido e pontos de rota; o reuso oferta só Seções ainda não usadas no Serviço corrente. **Migração:** JSON importado com Volta fora da ordem inversa precisa de política (bloquear × alerta técnico + oferta de reordenar). B — **só o default de UX**: o Formulário espelha a Volta automaticamente ao montar a Ida (nasce invertida), mas reordenar a Volta continua permitido; divergência de ordem vira **aviso não bloqueante** (análogo à DEC-047); nenhuma validação estrutural nova; o reuso é filtrado igual à opção A. C — status quo (montagem manual dos dois sentidos; reuso ofertando tudo).
**Recomendação técnica:** A se a regra de domínio é de fato universal (o responsável, que conhece a operação ARTESP/SUCOL, afirma que é — e regra que "tem de ser assim" sem validação vira documento inválido em silêncio); B se existir qualquer caso legítimo de Volta com ordem própria (laços/anéis viários que invertem a sequência de atendimento). A opção A exige **edição da Spec 02 §14 pelo dono da spec** (read-only para implementação) e atualização da RN-030 no RULE_INDEX; a B não toca spec. Nos dois casos o espelhamento automático e o filtro do reuso são os mesmos — a diferença é só a dureza da validação e a política de importação. Locais e pontos de rota permanecem livres por sentido nos dois casos.
**Decisão:** **Decidida (DEC-063, 2026-07-17).** Opção A: o **dono da spec editou a Spec 02 §14** ("se na ida as seções são ABCD, na volta necessariamente são DCBA") e atualizou a RN-030 no RULE_INDEX. Regra dura (validação estrutural — importação recusa Volta fora da ordem inversa), montagem automática da Volta espelhada e reuso ofertando só Seções ainda não usadas no Serviço corrente. Desbloqueia a TASK-077. Pendência de alinhamento do dono: Spec 02 §2 ainda descreve só o conjunto. Ver DEC-063.

## Q-044 — Etapa Identificação (fluxo novo): a escolha do Autos deve congelar imediatamente, ou só após confirmação explícita com os dados do Autos à vista?

**Contexto:** A Spec 04 §5 diz que Código/Empresa são "não editáveis **após criado o documento**", sem fixar **quando** o documento é criado no fluxo do zero. A TASK-015 interpretou (inferência controlada, comentário em `src/formulario/identificacao/identificacao.tsx`): "a seleção do Autos das listas é o ato de 'criar' o documento" — escolher no dropdown congela `codigo`/`empresa` **na hora**, sem chance de conferir. O responsável relatou (2026-07-17) que isso é hostil: escolheu o Autos errado e não há volta (só recomeçando a sessão). A lista estática já carrega os dados para uma conferência útil: `codigo`, `denominacao_linha` (origem–destino da linha), `empresa`, `tipo` e `operante`.
**Spec relacionada:** Spec 04 §5 (campos e não-editabilidade "após criado o documento" — o momento da criação é lacuna); Spec 04 §3.2 (a seleção vem das listas estáticas — RN-016); Spec 01 §8 (listas estáticas).
**Impacto se não decidir:** erro de seleção sem recuperação no fluxo novo; e a TASK-075 (proposta) fica sem regra sobre o momento do congelamento.
**Opções possíveis:** A — **pré-visualização + confirmação explícita** (proposta do responsável): escolher o Autos no dropdown exibe um painel com os dados do registro (código, denominação da linha/origem–destino, empresa, tipo, situação `operante`) **sem criar o documento**; o usuário pode trocar a seleção livremente; o botão **"Confirmar Autos"** é o ato que cria o documento e congela `codigo`/`empresa` (a partir daí, Spec 04 §5 vale como hoje — sem troca). B — status quo (seleção = criação imediata). C — seleção congela, mas com ação de "desfazer identificação" enquanto nada mais foi preenchido.
**Recomendação técnica:** A — não contradiz a Spec 04 §5 (apenas fixa o momento da "criação" no ponto da confirmação explícita), usa dados que a lista estática já tem (nenhum dado novo) e elimina o erro sem recuperação. `operante` exibido também ajuda o reforço da recomendação de "carregar JSON" quando o Autos já opera (Spec 04 §3.1, parte final).
**Decisão:** **Decidida (DEC-064, 2026-07-17).** Opção A: pré-visualização do Autos (código, denominação da linha, empresa, tipo, situação `operante`) e criação/congelamento do documento **só** no botão "Confirmar Autos"; sem troca após confirmar. Desbloqueia a TASK-075. Ver DEC-064.

## Q-045 — Tela inicial: a redação do aviso obrigatório de "Criar Autos do zero" pode ser simplificada?

**Contexto:** A Spec 04 §3.2 fixa o aviso obrigatório antes de prosseguir no fluxo do zero, com texto citado literalmente: *"Este documento não parte de um JSON anterior. Sem ele, não haverá preservação de identidade das entidades para comparação entre versões (o Comparador tratará tudo como novo)."* A implementação (TASK-013/052) o reproduz literal. O responsável pediu (2026-07-17) um texto mais acessível ("dizendo que não vai ter como comparar, faz um texto bacana") no diálogo de confirmação. Mensagens fixadas em spec vêm sendo tratadas como literais no projeto (ex.: Spec 04 §14, DEC-044) — mudar a redação é edição de `docs/specs/**`, ação do dono da spec.
**Spec relacionada:** Spec 04 §3.2 (aviso obrigatório, texto citado); RN-017 (avisos da tela inicial); RN-004 (o conteúdo do aviso protege a preservação de UUID).
**Impacto se não decidir:** a TASK-073 (restilização da tela inicial) precisa saber se mantém o literal ou espera nova redação.
**Opções possíveis:** A — **manter o literal e envolvê-lo** com texto complementar amigável (título/parágrafo introdutório do diálogo explicando em linguagem simples; o parágrafo da spec permanece na íntegra) — sem mudança de spec. B — o **dono da spec** edita a §3.2 com a nova redação (mantendo o conteúdo normativo: sem JSON anterior não há preservação de identidade e o Comparador tratará tudo como novo) e o Formulário adota o novo literal.
**Recomendação técnica:** A resolve já, sem tocar spec; B é a única via se o objetivo é **substituir** o texto exibido. As duas podem se compor (A agora, B depois).
**Decisão:** **Decidida (DEC-065, 2026-07-17).** Opção B: o dono editou a Spec 04 §3.2 com a instrução de redação e pediu o texto à implementação; o texto proposto está registrado na DEC-065, a ser colado pelo dono na §3.2 no lugar do placeholder. A TASK-073 adota o literal final assim que fixado na spec. Ver DEC-065.

## Q-046 — Valor de `versao_schema` num documento criado do zero no Formulário (sem JSON de origem para herdar a versão)

**Contexto:** No modo "novo" (DEC-035/053), `montarDocumentoParaExportacao` (TASK-032, `src/formulario/exportacao/montar-documento.ts`) monta um `DocumentoOperacao` pela primeira vez a partir da sessão em edição — diferente do modo "carregado", não há JSON de origem de onde herdar `versao_schema` (Spec 02 §3). A implementação da TASK-032 adotou o literal `"1.0"` como constante fixa (`VERSAO_SCHEMA_ATUAL` em `src/shared/contrato/esquema.ts`), citando "Q-046, opção (a)" em comentário e teste — mas essa Q nunca havia sido aberta formalmente. Achado da revisão de aderência da TASK-032 (`docs-dev/14-REVISOES/TASK-032-20260717.md`).
**Spec relacionada:** Spec 02 §3 (campo `versao_schema`), §15 (exemplo mínimo, que usa `"1.0"`).
**Impacto se não decidir:** o valor gravado em todo documento criado do zero fica sem base rastreável — o protocolo (`docs-dev/04` princípio 2) exige que toda inferência cite uma Q-xxx real, não uma referência solta.
**Opções possíveis:** A — **constante fixa `"1.0"`**, a mesma do exemplo mínimo da Spec 02 §15 e das fixtures canônicas, mantida num ponto único do código para atualização manual se o contrato mudar de versão. B — derivar de outra fonte (nenhuma fonte candidata identificada: versão de pacote/build não corresponde à versão do *contrato JSON*).
**Recomendação técnica:** A — única opção com base normativa real (o próprio exemplo da spec), sem inventar mecanismo novo.
**Decisão:** **Decidida (DEC-066, 2026-07-17).** Opção A — confirma, com registro formal, o que a TASK-032 já havia implementado. Ver DEC-066.

## Q-047 — Documento carregado com violação técnica pré-existente (350 m / tipificação): a Revisão/Exportação deve bloquear, mesmo a leitura sendo só alerta?

**Contexto:** A RN-091 (Spec 05 §4.1) fixa que a checagem estática dos 350 m (RN-028/RN-032) e da tipificação (RN-019..022) é **alerta técnico, nunca bloqueia**, para qualquer leitor estático — inclusive o import do Formulário (`src/shared/checagens-leitor/checagens-leitor.ts:16-21`). Já a Spec 04 §11 lista "violação da regra dos 350 m detectada em revalidação" e "violação de tipificação tipo × característica" como **erros bloqueantes** da tela de Revisão, que impedem a exportação. O gate de exportação da TASK-032 (`src/formulario/exportacao/gate-exportacao.ts`) hoje só combina as pendências vivas de sessão com a validação estrutural do schema — não reaplica essas duas checagens técnicas no momento de exportar. Achado da revisão de aderência da TASK-032 (`docs-dev/14-REVISOES/TASK-032-20260717.md`), levantado como possível conflito entre a Spec 04 §11 e a RN-091.
**Spec relacionada:** Spec 04 §11 (bloqueantes da Revisão); Spec 05 §4.1 (RN-091, leitor estático); Spec 03 §7.3/§7.4 (350 m); Spec 03 §10 (tipificação).
**Impacto se não decidir:** um documento carregado com uma dessas violações já presentes na origem pode ser reexportado sem correção, mesmo a Spec 04 §11 dizendo que isso deveria ser bloqueado.
**Opções possíveis:** A — **momentos diferentes, regras diferentes** (não é conflito real): abrir/editar o documento sempre permite ver e corrigir, com alerta não bloqueante (RN-091 continua valendo à risca para a leitura); a exportação, porém, reaplica as mesmas checagens (`coletarAlertasTecnicos`, já existente e reaproveitável) como **bloqueante** — a pessoa é obrigada a corrigir antes de gerar o arquivo final, mas nunca é impedida de abrir/inspecionar o arquivo com o defeito. B — RN-091 vence também na exportação: nunca bloquear, mesmo ao exportar (contradiz o texto literal da Spec 04 §11).
**Recomendação técnica:** A — reconcilia as duas regras sem contradizer nenhuma (RN-091 fala do momento da leitura; Spec 04 §11 fala do momento da exportação) e reaproveita a lógica pura já existente (`coletarAlertasTecnicos`), sem duplicar checagem.
**Decisão:** **Decidida (DEC-067, 2026-07-17).** Opção A: abrir/visualizar/editar o documento sempre permite, com alerta não bloqueante (RN-091 intocada); a exportação passa a bloquear enquanto a violação persistir. Ver DEC-067.

## Q-048 — Ponto de rota órfão (trecho terminal removido ao apagar uma parada de extremo): descartar ou virar `sem-rota`?

**Contexto:** Um ponto de rota fica ancorado a um trecho entre duas paradas consecutivas (`apos_parada_ordem` ∈ `[1, paradas.length − 1]`, RN-042). A TASK-066 (DEC-056/DEC-060) re-ancora os pontos quando as paradas mudam. A revisão de aderência da TASK-066 (`docs-dev/14-REVISOES/TASK-066-20260717.md`) apontou um subcaso não coberto pela DEC-056: ao **remover uma parada de extremo** (a primeira ou a última do itinerário), o trecho terminal **deixa de existir por inteiro** — não há "dois trechos adjacentes que se fundem" como na remoção do meio —, e os pontos de rota daquele trecho ficam **órfãos**. Hoje `reancorarPontosDeRota` produz para eles `apos_parada_ordem = 0` ou `= length` (fora do intervalo); a rede de segurança da RN-048 captura o valor inválido e o itinerário vira `sem-rota` (comportamento seguro, sem corromper documento, mas o usuário precisa remover os pontos manualmente para voltar a rotear).
**Spec relacionada:** Spec 03 §3.6/§3.6.1/§3.6.2 (pontos de rota, re-ancoragem, reedição fiel); Spec 02 §10.4 (intervalo de `apos_parada_ordem`); RN-042 (ancoragem/intervalo), RN-048 (falha bloqueante). Precedente: DEC-056 (descarte com aviso não bloqueante na reordenação, superado pela DEC-060 só naquele caso).
**Impacto se não decidir:** removida uma parada de extremo com ponto de rota no trecho terminal, o itinerário fica em `sem-rota` sem explicação clara do porquê — o usuário não relaciona o `sem-rota` aos pontos órfãos invisíveis.
**Opções possíveis:** A — **descartar o ponto órfão**, com aviso não bloqueante na etapa (o trecho a que ele pertencia deixou de existir; refazê-lo custa um clique — mesmo tratamento que a DEC-056 deu ao descarte na reordenação, e coerente com a natureza do ponto de rota: sem identidade, intenção pura do usuário, RN-042). B — manter o `sem-rota` atual (conservador: nunca descarta trabalho manual, mas exige remoção manual e não explica). C — clampear o ponto ao trecho terminal sobrevivente (rejeitado pela mesma razão da DEC-056: reatribui ao par errado e corrompe o traçado em silêncio).
**Recomendação técnica:** A — o ponto órfão **não tem mais significado** (o trecho que ele forçava não existe), então preservá-lo só produz um `sem-rota` inexplicável; descartar com aviso é a leitura consistente com a DEC-056 e com a ausência de identidade do ponto de rota.
**Decisão:** **Decidida (DEC-068, 2026-07-17).** Opção A: o ponto de rota órfão é **descartado**, com aviso não bloqueante na etapa. Decisão do responsável pelo domínio nesta conversa ("o ponto de rota que fica órfão deve ser excluído, pois não faz mais sentido"). Ver DEC-068.

## Q-049 — Como sinalizar na tabela e no mapa um Local temporariamente inserido no extremo do itinerário?

**Contexto:** A TASK-068 absorveu a condição de merge da TASK-067: quando um clique direito sobre a última rota válida não puder mais ser ancorado porque a montagem corrente está inválida, a Seção/Local criada não pode desaparecer; degrada para o caminho “fora da linha” e entra ao fim. Para uma Seção, o fim pode ser estruturalmente válido. Para um Local, porém, a Spec 02 §10.1/§14 e a RN-035 proíbem primeira ou última Parada Local. A TASK-047 já permite manter a lista de edição inválida e mostra o motivo num aviso geral, sem gravar rota/documento inválido, mas não identifica diretamente na tabela e no mapa qual ocorrência está errada.
**Spec relacionada:** Spec 02 §10.1/§14 (extremos sempre Seção); Spec 04 §7/§7.3 (mapa e tabela lateral durante a montagem); RN-035; DEC-050 (design system); DEC-069 (Local circular verde de 12 px); TASK-047 (feedback de montagem inválida).
**Impacto se não decidir:** a TASK-068 sabe que deve manter o Local no fim da lista e exibir a violação, mas não sabe se o aviso geral basta, se a inserção deve ser recusada ou se a ocorrência inválida precisa de identificação contextual. A TASK-079 pode reconstruir a tabela sem preservar o estado, a TASK-064 pode confundir seleção com erro e a TASK-076 pode aplicar o erro ao sentido errado ao mostrar os dois simultaneamente.
**Opções possíveis:** A — **manter o Local na lista de edição e sinalizar a ocorrência diretamente**: linha correspondente da tabela em vermelho com explicação no hover/foco; marcador circular verde no mapa com borda vermelha; aviso geral permanece; sem OSRM, conclusão ou exportação enquanto a RN-035 persistir; o estado desaparece ao Local voltar a posição intermediária e é isolado por itinerário/sentido. B — manter o Local e somente o aviso geral da TASK-047, sem marcação contextual. C — recusar a inserção do Local no extremo e não o colocar na lista.
**Recomendação técnica:** A — preserva o gesto e a edição incremental decididos para a TASK-068, identifica o alvo do problema por forma + cor + texto e não cria regra nova: a trava continua sendo exatamente RN-035. Seleção futura deve usar canal visual diferente do erro.
**Decisão:** **Decidida (DEC-070, 2026-07-21).** Opção A, autorizada explicitamente pelo responsável pelo domínio: Local extremo permanece na lista de edição; sua linha na tabela fica em estado vermelho com mensagem explicativa no hover/foco; seu marcador verde recebe borda vermelha; aviso geral permanece; não há OSRM, conclusão/promoção do Serviço nem exportação enquanto inválido; o bloqueio chega ao gate como estado efêmero mesmo quando a última rota válida continua congelada; ao deixar o extremo, os realces/bloqueio somem; o estado é por itinerário e sentido. Ver DEC-070.

## Q-050 — Como Locais e pontos de rota são posicionados quando a TASK-077 espelha uma alteração de Seção no outro sentido?

**Contexto:** A DEC-063/RN-030 exige que a sequência de Seções da Volta seja o inverso exato da Ida e que inserir/remover/reordenar uma Seção reflita no outro sentido. A Spec 02 §§2/14 permite que Locais divirjam livremente, mas não define onde eles permanecem quando uma Seção os ultrapassa no espelhamento automático. A DEC-060 já determina que pontos de rota preservam sua posição relativa na lista e são reancorados quando uma Parada os ultrapassa, sem descarte em reordenação. Também falta definir, ao inserir/reutilizar uma Seção nova entre duas Seções, de qual lado dos Locais já existentes naquele intervalo ela entra. Exemplo trazido pelo responsável: com Ida `A-B-C-D-E` e Volta `E-D-1-2-C-3-B-4-A` (números são Locais), mover `D` antes de `C` na Ida (`A-B-D-C-E`) deve produzir `E-1-2-C-D-3-B-4-A`; a sequência `A-D-C-B-E`, obtida por movimentos atômicos sucessivos, deve produzir `E-1-2-3-B-C-D-4-A`.
**Spec relacionada:** Spec 02 §§10–10.4 e §14; Spec 04 §§7.1–7.3; RN-030, RN-034/035, RN-041/042, RN-052; DEC-060, DEC-063 e DEC-070; TASK-077.
**Impacto se não decidir:** duas implementações podem produzir sequências completas diferentes embora ambas satisfaçam a ordem inversa das Seções. O resultado pode depender acidentalmente do algoritmo de diff, mudar a posição operacional dos Locais e reancorar pontos de rota a trechos diferentes. A TASK-077 não pode definir corretamente seu motor puro nem os casos de inserção, reuso e reordenação enquanto faltar essa semântica.
**Opções possíveis:** A — **replay do gesto atômico de Seção**: no outro sentido, mover somente a mesma Seção para a posição inversa; Locais preservam sua ordem relativa e não acompanham Seções; pontos de rota preservam sua posição relativa e são reancorados conforme a DEC-060. Remoção elimina somente a Seção. Inserção/reuso coloca a nova Seção imediatamente depois da Seção anterior na ordem do itinerário de destino: se a Ida passa de `A-B` para `A-X-B` e a Volta era `B-1-2-A`, o resultado é `B-X-1-2-A`. B — ancorar cada Local à Seção anterior ou seguinte e movê-lo junto dela; exige escolher uma das duas âncoras e produz comportamento diferente quando novas Seções entram no intervalo. C — preservar índices numéricos dos Locais e substituir somente os elementos de Seção nos índices disponíveis; pode produzir saltos pouco intuitivos e não representa o gesto efetuado pelo usuário.
**Recomendação técnica:** A — corresponde à semântica posicional já adotada pela DEC-060, reproduz os exemplos fornecidos pelo responsável, não inventa vínculo entre Local e Seção e não exige alteração do contrato. O motor deve receber a identidade da Seção movida e sua posição de destino, em vez de tentar deduzir o gesto apenas comparando a sequência final. Na inserção/reutilização, a convenção `B-X-1-2-A` foi a preferência expressa pelo responsável nesta conversa. Reordenação preserva os pontos de rota e apenas os reancora; descarte continua restrito a ponto órfão de trecho terminal removido, conforme DEC-068.
**Decisão:** **Decidida (DEC-071, 2026-07-21).** Opção A: replay do gesto atômico de Seção no outro sentido; Locais preservam sua ordem relativa e não acompanham Seções; pontos de rota preservam sua posição relativa e são reancorados conforme a DEC-060; inserção/reuso adota `B-X-1-2-A`; descarte de ponto de rota permanece restrito ao órfão de trecho terminal da DEC-068. Desbloqueia novamente a TASK-077. Ver DEC-071.

## Q-051 — O ponto de rota criado deve usar a coordenada projetada exibida pelo fantasma?

**Contexto:** A TASK-069/DEC-057 exige que, ao passar o mouse sobre a linha, um vértice fantasma mostre a posição exata em que o clique criará o ponto de rota. O hit-test de `Mapa` aceita o cursor numa tolerância de 6 px ao redor da camada, mas o gesto entregue pela TASK-063 repassa e persiste a coordenada bruta do cursor. Além disso, `projetarNaLinha` calcula a distância ao longo e perpendicular ao traçado, mas ainda não expõe a coordenada projetada. Assim, um fantasma desenhado sobre a linha poderia divergir do ponto efetivamente criado.
**Spec relacionada:** Spec 03 §3.6 (ponto ancorado ao trecho que molda); Spec 04 §7.3 item 6 (clicar sobre a linha cria o vértice); RN-042/052; DEC-057; TASK-069.
**Impacto se não decidir:** não é possível garantir ao mesmo tempo que o fantasma esteja sobre o traçado, represente a posição exata criada e que a coordenada bruta do clique permaneça inalterada.
**Opções possíveis:** A — **projetar também a criação**: o fantasma aparece no ponto da linha mais próximo do cursor e o clique cria o ponto de rota exatamente nessa mesma coordenada projetada; autoriza extensão aditiva de `projetarNaLinha` e o ajuste estreito do callback de clique. B — manter a criação na coordenada bruta e mostrar o fantasma também nela, embora possa ficar fora do traçado. C — projetar somente o fantasma e manter a criação bruta, aceitando que a pré-visualização não represente a posição exata criada.
**Recomendação técnica:** A — mantém a affordance verdadeira, elimina a diferença causada pela tolerância do hit-test e garante que o ponto criado pertença ao traçado mostrado.
**Decisão:** **Decidida (DEC-072, 2026-07-21).** Opção A: o ponto de rota é criado no ponto pertencente à linha mais próximo da coordenada bruta do clique; o fantasma e o clique usam a mesma projeção. Ver DEC-072.

## Q-052 — Composição visual da lista lateral unificada: colunas, zebra de maior contraste, densidade e "X" de remover

**Contexto:** A lista lateral da etapa de itinerários (paradas + pontos de rota intercalados, DEC-060/TASK-079) tem hoje duas colunas ("Item do itinerário" / "Ações"), com rótulo+coordenadas amontoados na primeira e todos os botões numa célula; o zebrado herdado do componente `Tabela` (doc 18 §3 — `nth-child(even):bg-cinza-50`, hover `azul-50`) tem contraste baixo e as linhas são altas. O responsável (2026-07-22) pediu colunas explícitas (`Cidade - Nome` · Tipo · mover · remover-"X"), linhas mais próximas e zebra de contraste maior. O redesenho (TASK-091) precisa compor com **três** estados visuais que já ocorrem na mesma linha — vermelho de Local extremo (DEC-070), ciano do ponto de rota (DEC-069) e o realce de seleção da TASK-064 —, e a coluna "Tipo" precisa de vocabulário para **três** naturezas (Seção, Local de parada, ponto de rota), sendo que o ponto de rota **não** tem `Cidade - Nome` (RN-042).
**Spec relacionada:** Spec 04 §7/§7.3 (tabela lateral); Spec 02 §5/§10.1/§10.4 (Seção município+nome; ordem de travessia; ponto de rota); doc 18 §2/§3/§4 (tokens; `Tabela` com zebra/hover; variação por prop e não por `className` — DEC-050); RN-025, RN-031, RN-042; DEC-060, DEC-069, DEC-070; TASK-064, TASK-079, TASK-091.
**Impacto se não decidir:** a TASK-091 não pode implementar sem arriscar (a) um zebrado que mascare o vermelho de Local extremo ou o realce de seleção da 064; (b) um vocabulário de "Tipo" ad hoc; ou (c) elevar o contraste **alterando o token global de zebra** e mudando **todas** as tabelas do app. A colisão de quatro canais na mesma linha ficaria definida pela ordem de emissão do CSS (o "perde em silêncio" documentado em doc 18 §4), não por decisão.
**Opções possíveis:** A — **variante local governada + canais separados por natureza de sinal:** (1) "Tipo" = `Seção` / `Local de parada` / `ponto de rota`; (2) ponto de rota exibe "Ponto de rota N (lat, lng)" na coluna de nome e continua item discriminado (RN-042), sem `Cidade - Nome`; (3) o "X" é `Botao` compacto (variante `perigo` ou `fantasma`) com `aria-label="Remover …"`, preservando os `data-testid` atuais; (4) densidade e zebra de maior contraste entram como **variante/prop nova** de `Tabela` (ex.: `densidade="compacta"` + zebra `cinza-100`), sem tocar o token usado pelas outras tabelas; (5) precedência de canais fixa — **fundo** = zebra (repouso), com a seleção da TASK-064 sobrepondo o zebra; **texto/ícone** = erro (vermelho) e ponto de rota (ciano); **borda** = erro de Local extremo (vermelho) e foco. Os quatro coexistem por ocuparem canais físicos distintos (fundo × texto × borda). B — **alterar o token global de zebra** (`cinza-50` → mais escuro) e reusar `azul-50` também para seleção; simples, mas muda todas as tabelas e faz a seleção colidir com o hover. C — manter a estrutura de duas colunas e só compactar/escurecer; não atende ao pedido de colunas explícitas.
**Recomendação técnica:** A — respeita doc 18 §4 (variação por prop, não por `className`; não muda tabelas alheias), separa os quatro sinais em canais físicos distintos (fundo/texto/borda) garantindo coexistência perceptível com a DEC-070 e a TASK-064, e não inventa regra (ponto de rota segue sem identidade e sem `Cidade - Nome`, RN-042). A precedência exata de fundo (seleção sobre zebra) e o valor concreto da "zebra compacta" devem ser fixados no doc 18 no mesmo ciclo da TASK-091.
**Decisão:** **Decidida (2026-07-22) — ver DEC-073.** Opção A adotada, com ajuste no item (1): a coluna "Tipo" fica vazia para o ponto de rota (a natureza já é evidente pelo texto "Ponto de Rota N (lat, long)" na coluna de nome); itens (2)-(5) confirmados como redigidos na opção A. Desbloqueia a TASK-091.

## Q-053 — Criação de Local sem espelhamento: o Local deve nascer unidirecional, só com o ponto do sentido em edição?

**Contexto:** A Spec 04 §7.2 e o §16 item 6 fixam que, em Serviço bidirecional, a criação de um Local **sempre gera os dois pontos** espelhados (Ida e Volta no mesmo lugar), com ajuste ou exclusão do ponto da Volta na montagem daquele sentido — implementado em `camposDeCriacao` (`src/formulario/locais/fluxos-local.ts`, TASK-018). O entendimento inicial da equipe era que o ponto da Ida e o da Volta precisavam nascer interligados. Após amadurecimento (responsável, 2026-07-23), esse vínculo não se sustentou: um é o ponto da Ida, o outro é o da Volta, e o fluxo desejado é o usuário lançar a Volta inteira com seus próprios Locais. O contrato já suporta: a Spec 02 §7.1 declara as duas geolocalizações **independentemente opcionais** (ao menos uma presente — RN-032), e o espelho Ida↔Volta de itinerário já trata Locais como livres por sentido (DEC-071).
**Spec relacionada:** Spec 04 §7.2 e §16 item 6; Spec 02 §7.1 (RN-031/032); Spec 03 §7.4 (350 m pareada); DEC-045, DEC-071.
**Impacto se não decidir:** a UX continua criando um ponto de Volta que o usuário não pediu; o Local "reaparece" na lista do outro sentido mesmo quando o usuário só o queria na Ida, alimentando a percepção de entidade fantasma.
**Opções possíveis:** A — **Local nasce unidirecional**: a criação gera apenas a geolocalização do sentido em edição, mesmo em Serviço bidirecional; sem espelhamento nem vínculo Ida↔Volta; cada sentido lança seus próprios Locais. A regra pareada dos 350 m (RN-032/Spec 03 §7.4) permanece no contrato e nos leitores, aplicável apenas a Locais que tenham os dois pontos (documentos legados importados). Seções seguem espelhadas (Spec 04 §7.1, RN-030 intocada). Exige edição da Spec 04 §7.2 e §16 item 6 pelo responsável; nenhuma mudança na Spec 02. B — manter o espelhamento atual da §7.2.
**Recomendação técnica:** A — o contrato não muda, o Comparador não muda, o espelho de itinerário (DEC-071) já é compatível; o corte é local (`camposDeCriacao` + editores) e reversível.
**Decisão:** **Decidida (DEC-075, 2026-07-23).** Opção A, por decisão do responsável pelo domínio nesta conversa ("não existe real necessidade do local da ida estar vinculado de alguma forma ao local da volta"). Ver DEC-075.

## Q-054 — Remoção da entidade Local: o "X" da tabela deve excluir o Local inteiro (entidade + Paradas)?

**Contexto:** Hoje o único gesto de exclusão de Local é "Excluir ponto deste sentido" (DEC-045/TASK-018): torna o Local unidirecional e remove a Parada daquele sentido, mas a **entidade** permanece em `servico.locais[]`. A remoção da entidade ficou explicitamente fora do escopo ("Full CRUD de remoção da entidade Local permanece fora da TASK-018" — DEC-045) e nunca foi retomada por task posterior: um Local com um único ponto é **inapagável** (`excluirSentidoDoLocal` recusa com `ponto_unico` — `src/formulario/locais/fluxos-local.ts`) e continua listado na etapa mesmo sem nenhuma Parada. Relato do responsável (2026-07-23): Local "apagado" continua aparecendo na lista abaixo do mapa. Com a DEC-075 (Local nasce unidirecional), o gesto de excluir sentido perde a função — todo Local novo tem um ponto só.
**Spec relacionada:** Spec 04 §7.2; Spec 02 §7/§10.1 (RN-031..036); DEC-045, DEC-070, DEC-073, DEC-075.
**Impacto se não decidir:** Locais órfãos acumulam-se no documento sem caminho de remoção; a UX transmite a impressão de bug ("entidade fantasma"); a task da DEC-075 não sabe o que fazer com o botão de excluir sentido.
**Opções possíveis:** A — o **"X" da linha do Local na tabela lateral remove a entidade** de `servico.locais[]` e todas as Paradas que a referenciem; o botão "Excluir ponto deste sentido" é eliminado. Em Local legado com dois pontos (documento importado), o "X" remove a entidade e as paradas de ambos os sentidos. O "X" de Seção segue removendo só a Parada (Seção é do Autos). B — manter dois gestos (X remove só a Parada; ação separada remove a entidade). C — status quo (entidade sem remoção).
**Recomendação técnica:** A — um gesto único e coerente com o modelo da DEC-075; reutiliza `removerParadasDeLocal` (motor já existente); B mantém a duplicidade que confunde, C perpetua a lacuna.
**Decisão:** **Decidida (DEC-076, 2026-07-23).** Opção A, por decisão do responsável pelo domínio nesta conversa ("o botão excluir entidade não será mais necessário; o botão X no local deverá excluir totalmente o local"). Ver DEC-076.

## Q-055 — Formulário de nome de Seção/Local: painel abaixo do mapa ou linha-formulário inline na tabela lateral, na posição de inserção?

**Contexto:** Ao escolher "Seção"/"Local" no menu de criação do mapa, o campo de nome aparece hoje num `Painel` abaixo do mapa (`src/formulario/itinerarios/editor-mapa-itinerario.tsx`, `form-criar-secao`/`form-criar-local`), desconectado da tabela lateral onde a parada vai entrar. O responsável (2026-07-23) pediu, com mockup, que o campo apareça **na tabela lateral, como uma linha inserida na posição exata em que a nova parada entrará** (ex.: entre `cityB` e `cityC`), com visual de janela branca no padrão da janela flutuante do mapa, rótulo pequeno cinza, campo de texto e botões criar/cancelar. A âncora de inserção já é conhecida no momento do gesto (`prepararInsercaoDeParada` com posição na linha). A Spec 04 §7.1/§7.2 exige apenas que o nome seja digitado pelo usuário — não fixa onde o formulário aparece; a composição da tabela é governada pela DEC-073 (TASK-091).
**Spec relacionada:** Spec 04 §7/§7.1–§7.3 (mapa + tabela lateral); doc 18 (DEC-050); DEC-069, DEC-070, DEC-073.
**Impacto se não decidir:** a task de UI não sabe se substitui ou duplica o painel atual; risco de compor mal com a variante de tabela da DEC-073 e com os estados da DEC-070.
**Opções possíveis:** A — **linha-formulário inline** na posição de inserção (sem âncora de linha → fim da tabela); janela branca no padrão do `MenuFlutuante`/`Painel`; rótulo pequeno cinza; `[Criar Seção]`/`[Criar Local]` + `[Cancelar]`; a tabela rola até a linha-formulário ao abrir; `data-testid` existentes preservados. B — manter o painel abaixo do mapa.
**Recomendação técnica:** A — o campo aparece no contexto em que o item vai entrar, aproveitando a âncora já resolvida; nenhuma mudança de spec (precedente DEC-073).
**Decisão:** **Decidida (DEC-077, 2026-07-23).** Opção A, por decisão do responsável pelo domínio nesta conversa, conforme o mockup fornecido. Ver DEC-077.

## Q-056 — Seção/Local criado por clique direito SOBRE a linha da rota: coordenada bruta do clique ou coordenada projetada sobre o traçado?

**Contexto:** A DEC-072 fixou que o **ponto de rota** criado pelo clique **esquerdo** sobre a linha nasce na **coordenada projetada** (ponto do traçado mais próximo do cursor), e não na coordenada bruta — `src/shared/mapa/mapa.tsx` projeta no handler de `click` (`projetarSobreLinhas`). O clique **direito** sobre a linha, que abre o menu Seção/Local (DEC-055), **não** recebeu o mesmo tratamento: o handler de `contextmenu` repassa `evento.lngLat` cru, e essa coordenada segue até `criarSecaoNoPonto`/`criarLocalNoPonto` (`src/formulario/itinerarios/etapa-itinerarios.tsx`), virando a `geolocalizacao_*` persistida da entidade. Relato do responsável (2026-07-24): ao criar uma Seção/Local intermediária clicando sobre o itinerário calculado, a entidade nasce **fora** da linha azul, no pixel exato do clique, o que é inconveniente — a expectativa é que ela nasça sobre o traçado, como já acontece com o ponto de rota. O **índice de inserção** na lista já está correto e não é objeto desta questão: `indiceInsercaoParaPosicao` chama `ancorarPontoNaRota`, que projeta internamente.
**Spec relacionada:** Spec 04 §7.3 itens 2 e 6 (insere Seções e Locais em ordem clicando no mapa; clicar sobre a linha); Spec 02 §5.1/§7.1 (geolocalizações de Seção e Local); RN-027 (350 m por centroide cumulativo), RN-029 (município por ponto-em-polígono), RN-042/052; DEC-055, DEC-072.
**Impacto se não decidir:** a coordenada persistida da entidade é entrada das RN-027 e RN-029 — mudá-la não é ajuste cosmético e não pode ser decidido pelo implementador (`docs-dev/04` princípio 2). Sem decisão, o gesto do botão direito permanece incoerente com o do esquerdo sobre a mesma linha, e a Seção/Local intermediária continua nascendo deslocada do itinerário.
**Opções possíveis:** A — **projetar também a criação por clique direito**: quando o `contextmenu` acertar a camada de linhas (mesma tolerância de 6 px do hit-test já existente), a coordenada entregue ao menu e persistida na entidade é a projeção sobre o traçado, exatamente como a DEC-072 já faz para o ponto de rota; clique direito **fora** da linha continua na coordenada bruta (é o caminho de montagem do itinerário do zero, DEC-055). B — manter a coordenada bruta e registrar o comportamento atual como decisão. C — projetar também no **arrasto** de marcador de Seção/Local que termine perto da linha (grudar no traçado).
**Recomendação técnica:** A — é a leitura coerente da DEC-072, o motor já existe (`projetarNaLinha`/`projetarSobreLinhas`, reusados sem alteração), o efeito sobre RN-027/RN-029 é de poucos metros e a projeção é discutivelmente mais fiel à intenção do usuário (que clicou *na linha*). C foi descartada: removeria a capacidade de posicionar deliberadamente uma parada fora do traçado, sem motivo de domínio que a sustente.
**Decisão:** **Decidida (DEC-078, 2026-07-24).** Opção A, por decisão do responsável pelo domínio nesta conversa. Ver DEC-078.

## Q-057 — Gesto de realocação de Seção (TASK-078): qual botão do mouse move o cluster inteiro e qual move só o ponto do serviço/sentido corrente?

**Contexto:** A DEC-061 desenhou a realocação de Seção como um **modo explícito**: duplo clique no marcador entra no modo de realocação (os demais pontos do cluster aparecem em cor neutra), e **dentro do modo** o arrasto move todos pelo mesmo vetor; fora do modo, o arrasto simples continua movendo **um único ponto** (contribuição do Serviço × sentido corrente), sob a regra dos 350 m (DEC-044). Reavaliando o backlog em uso real (2026-07-24), o responsável considera esse modo desnecessário: os dois gestos — mover só o ponto visualizado e mover a Seção inteira — devem existir **sem** uma etapa de entrada/saída de modo, diferenciados diretamente pelo **botão do mouse** usado no arrasto: botão **esquerdo** arrasta **todos** os pontos da Seção (todos os `secao.servicos[]`, Ida e Volta, translação rígida); botão **direito** arrasta **exclusivamente** o ponto visualizado no mapa naquele Serviço e sentido (o arrasto individual de hoje, sob a regra dos 350 m — DEC-044 inalterada nesse gesto, só migra de botão). Isso substitui o mecanismo de "modo" da DEC-061 por atribuição direta de botão, e formalmente **não** colide com a DEC-055: aquela decisão fixa o significado dos botões **sobre a linha da rota vazia** (criar ponto de rota / abrir menu Seção-Local); esta questão é sobre o arrasto de um **marcador já existente** — superfície distinta, sem sobreposição de gesto.
**Spec relacionada:** Spec 02 §5.1/§5.2 (contribuições e clustering); Spec 03 §7.2 (350 m); Spec 04 §7.1 (arrasto por ponto); RN-027, RN-029, RN-052; DEC-044 (arrasto simples recusa >350 m), DEC-055 (botões sobre a linha vazia), DEC-061 (mecanismo de modo, ora reconsiderado).
**Impacto se não decidir:** a TASK-078 fica sem gesto de entrada definido; implementar o modo por duplo clique da DEC-061 quando o responsável já expressou preferência por um design mais simples (sem modo) obrigaria a retrabalhar a task assim que fosse percebido, e mistura dois desenhos de interação incompatíveis no mesmo componente.
**Opções possíveis:** A — **atribuição direta por botão** (proposta do responsável, 2026-07-24): esquerdo arrasta a Seção inteira (translação rígida, sem modo/entrada explícita), direito arrasta só o ponto do serviço/sentido corrente (350 m). Elimina a UI de "modo" e o gesto de cancelamento por `Esc` da DEC-061 (soltar sem mover ou tecla `Esc` durante o arrasto restaura a posição — mecanismo de cancelamento de arrasto, não de modo). B — manter o mecanismo de modo da DEC-061 (duplo clique entra, arrasto dentro do modo move tudo, arrasto fora do modo continua sendo o único ponto no botão padrão). C — os dois gestos convivem, mas via modificador de teclado (ex.: `Shift`+arrasto) em vez de botão do mouse — descartável a princípio: menor descoberta que o botão, e o responsável já não pediu isso.
**Recomendação técnica:** A, por ser a proposta explícita do responsável nesta conversa e por eliminar uma etapa de interação (o "modo") sem perder nenhuma garantia técnica: o invariante dos 350 m (RN-027), a re-derivação de município (RN-029) e o recálculo em cascata (RN-052/054..057) da DEC-061 permanecem idênticos — muda só **como o usuário entra no gesto**, não o que ele faz ao confirmar. Risco técnico a resolver na análise da TASK-078 (não nesta questão): o navegador dispara `contextmenu` no botão direito por padrão — a implementação precisa suprimir esse evento nativo durante o arrasto do marcador para que o botão direito arraste em vez de abrir o menu do navegador; **não** conflita com o menu Seção/Local da DEC-055, que só existe sobre a linha vazia, não sobre um marcador já criado.
**Decisão:** **Decidida (DEC-079, 2026-07-24).** Opção A, por decisão do responsável pelo domínio nesta conversa. Supera o mecanismo de "modo" da DEC-061 (que permanece válida quanto às consequências de confirmação — município, recálculo em cascata, UUID preservada). Ver DEC-079.

## Q-058 — Reset de Seção (TASK-100 nova): qual coordenada única todos os pontos do cluster recebem ao ser redefinidos?

**Contexto:** Pedido novo do responsável (2026-07-24): um botão de "redefinir" na linha da Seção na tabela lateral deve devolver **todos** os pontos da Seção (todas as entradas de `secao.servicos[]`, Ida e Volta) para o **mesmo lugar** — desfazendo os ajustes manuais que os diferenciaram entre Serviços/sentidos, para o usuário recomeçar a posicioná-los. Isso exige escolher **qual** coordenada vira o ponto único de destino: não há spec nem RN que já defina isso, porque a operação em si é nova (nenhuma spec prevê "redefinir" uma Seção).
**Spec relacionada:** Spec 02 §5.1/§5.2 (contribuições e clustering — silente sobre reset); Spec 03 §2.3 (município derivado do centroide); RN-027 (350 m — trivialmente satisfeita quando todos os pontos coincidem), RN-029 (município re-derivado do novo ponto único), RN-052 (recálculo).
**Impacto se não decidir:** a coordenada de destino é a essência do comportamento da task — sem decisão, a IA teria que escolher por conta própria, o que é exatamente a "invenção de regra de negócio" que `docs-dev/04` princípio 2 proíbe.
**Opções possíveis:** A — **centroide atual do cluster** (o mesmo já calculado para derivar o município, RN-029): não privilegia nenhum Serviço/sentido. B — **ponto do Serviço/sentido em edição**: usa a coordenada do ponto visualizado no mapa no momento em que o usuário aciona o botão de refresh (a linha da tabela onde o clique ocorre já identifica esse contexto). C — coordenada original de criação da Seção — descartada: o contrato não persiste esse dado hoje, exigiria campo novo (proibido sem alterar a Spec 02 antes, RN-008..015).
**Recomendação técnica:** B, por ser a opção mais previsível para o usuário (o ponto que ele está vendo no mapa no momento do clique é o que sobrevive) e por não exigir computar um centroide novo fora do que os motores de Seção já expõem.
**Decisão:** **Decidida (DEC-080, 2026-07-24).** Opção B, por decisão do responsável pelo domínio nesta conversa. Ver DEC-080.

## Q-059 — Tabelas de operação excepcional por Serviço (férias de verão/inverno/personalizado): estrutura no contrato e efeito nas contagens

**Contexto:** Pedido novo do responsável (2026-07-27): hoje a operação de um itinerário tem **duas** grades — dias comuns e feriados —, distinguidas por `viagem_feriado` **booleano** (Spec 02 §11; Spec 03 §9). Não há como registrar uma **operação excepcional** (ex.: horário reduzido de férias). Descartou-se explicitamente modelar o período por **meses ou datas**: não é possível cravar início/fim de férias por Autos e isso exigiria atualização constante só para acertar datas. A decisão de desenho já convergida com o responsável é: a tabela excepcional é uma **categoria semântica de texto**, não um intervalo datado, com **três tipos** — `ferias_verao`, `ferias_inverno` (rótulos fixos, filtráveis por serem valores fechados) e `personalizado` (descrição em texto livre, à escolha do usuário). Um mesmo Serviço pode ter **várias** tabelas excepcionais. Convergências já fixadas na discussão: (a) a tabela excepcional **não** tem sub-grade de feriado própria — a **precedência** é **feriado > excepcional > padrão**: se cai feriado, a excepcional "cai" e entra a grade de feriado; (b) **toda** Viagem de tabela excepcional **não** é de feriado (invariante); (c) **não há** validação de sobreposição entre tabelas excepcionais (o sistema não tem como julgar categorias textuais dúbias criadas pelo usuário); (d) a **semana padrão** continua sendo "a semana que não é excepcional nem feriado". Modelo de dados convergido: entidade **homogênea** com discriminador `tipo`, no **nível do Serviço** (`servico.tabelas_excepcionais[]`), cada uma `{ uuid, tipo, descricao? }` (`descricao` obrigatória só quando `tipo == personalizado`; para verão/inverno o rótulo deriva do tipo), com os tipos canônicos únicos por Serviço (no máx. uma `ferias_verao` e uma `ferias_inverno`) e `personalizado` repetível; cada Viagem passa a **referenciar** a tabela por UUID (`null` = grade padrão/feriado). Esta é a mesma família da "Alternativa B" originalmente cogitada (generalizar o booleano), **sem** o array de meses — que era o seu defeito fatal (desnormalização e manutenção de datas). Preserva RN-004 (a tabela é entidade com UUID estável, round-trip na importação) e reaproveita **toda** a maquinaria de Viagem (validações de `horarios_paradas`, cópia, PDF, diff), pois a tabela excepcional é só mais uma **dimensão de grade**, como `viagem_feriado` já é hoje.
**Spec relacionada:** Spec 02 §4 (Serviço) e §11 (Viagem/`viagem_feriado`), §14 (validações estruturais), `versao_schema`; Spec 03 §9 (grades comum/feriado e contagens — RN-062/068/070/071) e §9.4 (fórmulas); Spec 04 §8 (grade de horários — §8.1 duas tabelas, §8.4 "copiar dias comuns"; UX de criar/filtrar tabela excepcional); Spec 05 (diff do Comparador sobre a nova entidade/grade). **Altera contrato JSON fechado** (RN-008..015): entidade nova + campo novo na Viagem exigem editar a Spec 02 **antes** do código, bump de `versao_schema` e regra de migração de documentos existentes (todo `viagens[]` atual tem `viagem_feriado`).
**Impacto se não decidir:** nenhuma task pode começar — mexer em Viagem/grade sem contrato definido violaria "campo novo exige alterar a Spec 02 antes" (RN-008..015) e "não inventar regra" (`docs-dev/04` princípio 2). Ficam indefinidos: a codificação da grade na Viagem, a fórmula de contagem da semana padrão e o comportamento do Comparador para a nova dimensão.
**Opções possíveis (codificação da grade na Viagem — o eixo estrutural em aberto):**
1. **(recomendada)** Manter `viagem_feriado` booleano e **adicionar** à Viagem `tabela_excepcional_uuid: string | null` (referência à `servico.tabelas_excepcionais[]`), com o **invariante**: se `tabela_excepcional_uuid ≠ null` então `viagem_feriado = false`. Menos invasiva às RN que já citam o booleano (RN-062/068/071); a referência por UUID é obrigatória porque duas tabelas `personalizado` compartilham `tipo` e só se distinguem pela identidade.
2. Substituir `viagem_feriado` por um **discriminador de grade** único na Viagem. Ainda assim precisaria da entidade `tabelas_excepcionais[]` para a identidade das `personalizado`; mais invasiva (quebra toda referência ao booleano em Spec 03/04/05) sem ganho semântico sobre a opção 1. Rejeitada tecnicamente.
- **Descartadas por já discutidas:** tabela por **meses/datas** (exige manutenção de datas por Autos); atributo `viagens` **paralelo** (duplica validações/cópia/PDF/diff, não generaliza a N tabelas); `[array de meses]` **na própria Viagem** (desnormaliza nome+período na folha).
**Consequência obrigatória em qualquer opção (não é escolha):** a **fórmula de contagem** da semana padrão (Spec 03 §9.4 / RN-070) hoje é "conte Viagens com `viagem_feriado = false`". Como uma Viagem excepcional teria `viagem_feriado = false`, ela entraria na conta indevidamente. A fórmula tem de passar a "grade **padrão**" = **nem feriado, nem excepcional** (`viagem_feriado = false` **e** `tabela_excepcional_uuid = null`). O **conceito** de semana padrão não muda; o **texto** da RN-070 e da §9.4, sim.
**Sub-decisões a confirmar junto (já convergidas na discussão, registradas para constar):** (a) nível = **Serviço**; (b) tipos canônicos (`ferias_verao`/`ferias_inverno`) **únicos** por Serviço, `personalizado` repetível; (c) `descricao` obrigatória só para `personalizado`; (d) **sem** validação de sobreposição; (e) precedência **feriado > excepcional > padrão**, sem sub-grade de feriado dentro da excepcional.
**Recomendação técnica:** opção 1 (booleano preservado + `tabela_excepcional_uuid` nulável + invariante), com a entidade homogênea `servico.tabelas_excepcionais[]` e a correção da fórmula de contagem acima. Estruturalmente coerente com o desenho vigente, mínimo de blast radius nas RN existentes e reaproveitamento integral da maquinaria de Viagem. Ver [[Q-029]] e [[Q-030]] (reconciliação e âncoras de horário por Viagem, que valem igualmente às Viagens de tabela excepcional).
**Decisão:** **Decidida (DEC-081, 2026-07-27).** Opção 1, por decisão do responsável pelo domínio nesta conversa ("conforme recomendado"): entidade homogênea `servico.tabelas_excepcionais[]` `{ uuid, tipo, descricao? }` (tipos `ferias_verao`/`ferias_inverno` únicos por Serviço, `personalizado` repetível; `descricao` só para personalizado), Viagem com `viagem_feriado` booleano preservado + `tabela_excepcional_uuid` nulável e invariante `≠ null ⇒ viagem_feriado = false`; precedência feriado > excepcional > padrão; semana padrão exclui feriado **e** excepcional (nova fórmula RN-070/§9.4); sem validação de sobreposição. **Exige alteração das Specs 02/03/04/05 + bump de `versao_schema` antes do código** (apontadas na DEC-081, a aplicar pelo dono das specs) e quebra em tasks via `/nova-task`. Ver DEC-081.

## Q-060 — Inserção de Viagem por offset relativo a partir da Viagem selecionada

**Contexto:** Proposta de UX do responsável (2026-07-27, redesign da grade de horários). Hoje a Spec 04 §8.3 prevê "inserir viagem entre viagens ou no início da grade": cria bloco vazio e o **horário digitado** define a posição. A proposta acrescenta um gesto mais rápido: com uma Viagem **selecionada**, botões acima/abaixo da célula criam **outra Viagem** cujo `horario_saida` é o da selecionada **deslocado de ±X min** (imagem "selecao de horario e botoes 1": "-0:10" acima, "+1:10" abaixo). A nova Viagem herda os offsets da selecionada (mesmo itinerário), transladando só o horário de partida.
**Spec relacionada:** Spec 04 §8.3 (inserir viagem — hoje só por horário absoluto digitado), §8.2 (criar Viagem preenche derivadas por acúmulo); Spec 02 §12 (entidade nova = UUID nova); RN-061, RN-063/RN-067.
**Impacto se não decidir:** a Spec 04 não descreve inserção por offset relativo; implementar sem decisão inventaria comportamento (semântica do sinal ±, valor default de X, herança de offsets/âncoras vs. re-sugestão §8.2, escopo de dias). Viola `docs-dev/04` princípio 2.
**Opções/sub-decisões a fixar:** (a) a nova Viagem **herda os offsets** da selecionada (translação rígida) ou **re-sugere** pela §8.1/RN-064? — recomendo herdar; (b) X editável na própria célula (o "-0:10"/"+1:10" da imagem), com default a definir; (c) gesto opera **só no dia da célula selecionada** ou em todos os dias em que a Viagem-origem existe? — recomendo só o dia selecionado (§8.2: "outros dias não são afetados"); (d) a nova Viagem entra na ordenação temporal do dia (§8.1) automaticamente.
**Recomendação técnica:** aceitar como **açúcar de UX** sobre a criação já prevista (§8.2/§8.3): herda offsets da origem, translada só `horario_saida`, escopo no dia selecionado, UUID nova (RN-004/Spec 02 §12). Não altera contrato. Habilita a **TASK-107**.
**Decisão:** **Decidida (DEC-082, 2026-07-27).** Herdar offsets da origem; escopo só o dia selecionado; X editável, default 10 min; UUID nova; recusa fora de 00:00–23:59. Ver DEC-082.

## Q-061 — Cópia de Viagem por headway até um horário-limite (geração em lote)

**Contexto:** Proposta do responsável (2026-07-27). Um botão de "seta curva" alterna o modo para **gerar várias Viagens** a partir da selecionada, com **headway** fixo (intervalo entre partidas, ex.: "+1:10") **até** um **horário-limite** (ex.: "17:00") — imagem "selecao de horario e botoes 2". Ex.: origem 08:00, headway 01:10, limite 17:00 → 08:00, 09:10, 10:20 … até a última partida ≤ 17:00.
**Spec relacionada:** Spec 04 §8.3 (inserir/copiar viagem — hoje uma a uma), §8.2 (derivadas por acúmulo); Spec 02 §12 (UUIDs novas); RN-061/RN-063/RN-067.
**Impacto se não decidir:** geração em lote por headway **não existe** em nenhuma spec; é regra nova (limite inclusivo/exclusivo, herança de offsets, escopo de dias, partida que ultrapassaria 24h). Implementar sem decisão inventa regra (`docs-dev/04` princípio 2).
**Opções/sub-decisões:** (a) limite **inclusivo** (última partida pode ser == limite) — recomendo inclusivo; (b) cada Viagem gerada **herda os offsets** da origem — recomendo sim; (c) escopo: só o dia da célula selecionada — recomendo sim; (d) headway como duração `HH:MM`; (e) headway ≤ 0 ou limite < origem → recusa com aviso; (f) partidas que passariam de 23:59 → parar antes (sem virar o dia).
**Recomendação técnica:** gerador em lote de Viagens (cada uma UUID nova, offsets herdados, só `horario_saida` transladado), limite inclusivo, escopo no dia selecionado, recusa amigável para entrada inválida. Não altera contrato. Habilita a **TASK-108**.
**Decisão:** **Decidida (DEC-083, 2026-07-27).** Limite inclusivo; para antes das 24h (não vira o dia); offsets herdados; escopo só o dia selecionado; UUIDs novas; recusa para headway/limite inválidos. Ver DEC-083.

## Q-062 — Cópia de Viagem para o dia adjacente (setas ←/→) e política de duplicidade

**Contexto:** Proposta do responsável (2026-07-27). Setas ←/→ na Viagem selecionada **copiam a Viagem** para o dia **anterior/seguinte** (imagens 1 e 2). Regra proposta: **se já existir Viagem igual** naquele dia, **não copia** e apenas avisa ("já tem horário"). Copiar viagem para outro dia já existe na Spec 04 §8.3 (UUID nova); o **novo** é o gesto de um clique para o dia adjacente **e** a guarda de duplicidade.
**Spec relacionada:** Spec 04 §8.3 (copiar viagem para outro dia); **RN-062** ("reforço de horário é válido — não há validação de unicidade"); Spec 02 §12.
**Relação com RN-062 (importante):** RN-062 diz que o **contrato** permite Viagens duplicadas (nenhuma validação estrutural de unicidade). A guarda proposta **não** contradiz isso: não proíbe duplicatas no documento — apenas faz **este gesto de conveniência** recusar-se a criar uma cópia **idêntica** já existente, avisando. Precisa da confirmação do responsável de que (a) é isso mesmo (guarda só no gesto, contrato inalterado — não reintroduz validação de unicidade em outros caminhos) e (b) o critério de "igual".
**Impacto se não decidir:** sem decisão, a IA teria de escolher o critério de "igual" e se a guarda bloqueia ou só avisa — invenção de regra.
**Opções:** A — copiar sempre (sem guarda), coerente com RN-062 pura; B — **(proposta)** guarda de duplicidade: não cria, avisa; C — guarda + opção de forçar. **Recomendo B**, com critério de igualdade = mesmo `horario_saida` no dia destino na **mesma grade** (comum/feriado/excepcional), a confirmar. Habilita a **TASK-109**.
**Decisão:** **Decidida (DEC-084, 2026-07-27).** Opção B (guarda que não copia e avisa), critério = mesmo `horario_saida` na mesma grade (ignorando offsets); guarda **só no gesto**, RN-062 preservada (contrato segue aceitando duplicatas). Ver DEC-084.

## Q-063 — Operações de dia inteiro na grade: copiar um dia para outros dias e apagar as Viagens de um dia

**Contexto:** Proposta do responsável (2026-07-27). (1) Imagem 3: diálogo "Copiar para [lista que permite vários dias]" que replica **todas as Viagens de um dia** (a coluna inteira) para os dias escolhidos. (2) Clarificação: o **"X"** de uma Viagem oferece apagar **aquela Viagem** ou **as Viagens do dia** (a coluna inteira). Hoje a Spec 04 §8.3 cobre: copiar/apagar **uma** Viagem e apagar o **bloco inteiro** (a n-ésima partida em **todos** os dias). Operações de **coluna** (dia inteiro) — copiar-dia-para-dias e apagar-dia — **não** estão descritas.
**Spec relacionada:** Spec 04 §8.3; Spec 02 §12 (UUIDs novas); RN-062 (duplicatas permitidas — ver Q-062 quanto ao destino já ter Viagens).
**Impacto se não decidir:** falta definir se copiar-dia **substitui** ou **mescla** as Viagens já existentes no dia destino, como interage com a guarda da Q-062, e se apagar-dia pede confirmação. Sem isso, comportamento inventado.
**Opções/sub-decisões:** (a) copiar-dia para dia com Viagens: **substituir** × **mesclar** × mesclar-com-guarda-Q-062 — recomendo **mesclar com guarda de duplicidade** (Q-062); (b) apagar-dia sob **confirmação** — recomendo sim; (c) UUIDs novas em toda cópia (RN-004/Spec 02 §12).
**Recomendação técnica:** extensão natural do §8.3 (operações de coluna), resolvendo a interação com a Q-062 e exigindo confirmação para apagar-dia. Não altera contrato. Habilita a **TASK-110**.
**Decisão:** **Decidida (DEC-085, 2026-07-27).** Copiar-dia com destino cheio = mesclar com a guarda da DEC-084; apagar-dia sob confirmação OK/Cancelar; UUIDs novas na cópia. Ver DEC-085.

## Q-064 — Modo compacto da grade: ocultar Seções intermediárias e final (só linhas de partida)

**Contexto:** Proposta do responsável (2026-07-27, imagem 4). Um toggle que **oculta as Seções intermediárias e a final** de cada Viagem, deixando visível só a **Seção de partida** (o `horario_saida`), para facilitar a leitura das partidas do dia — **mantendo** todas as funções de cópia/inserção e a navegação por teclado (Enter passa para a próxima **Seção de partida visível**). É modo de **visualização**: não altera dados nem contrato; os horários ocultos continuam em `horarios_paradas`.
**Spec relacionada:** Spec 04 §8.1 (grade exibe Seções como linhas; menciona só "modo avançado" para **Locais**, não para ocultar Seções), §2.4.
**Impacto se não decidir:** a §8.1 não prevê ocultar Seções; é affordance de UI nova. Baixo risco (não toca dado/contrato/regra de negócio), mas foge do descrito — registrado como decisão de UX para não "inventar" silenciosamente.
**Opções:** A — **(proposta)** toggle do sentido que colapsa para só a linha de partida de cada Viagem, sem entrar no PDF principal; B — não fazer. **Recomendo A**, como modo de exibição puro (tela apenas). Habilita a **TASK-111**.
**Decisão:** **Decidida (DEC-086, 2026-07-27).** Adotado o toggle na tela; no PDF, o recorte compacto **já é a "versão simples" do §13.2** (entregue pela TASK-034, sem escopo novo de PDF). Ver DEC-086.

## Q-065 — "Copiar dias comuns" com origem estendida (feriados / outra tabela excepcional)

**Contexto:** Proposta do responsável (2026-07-27). Ao criar/editar uma tabela (feriados ou excepcional), poder **copiar as Viagens** não só da **grade comum**, mas também da **grade de feriados** ou de **outra tabela excepcional** qualquer. Hoje a Spec 04 §8.4/§8.5 só prevê **"Copiar dias comuns"** — origem **sempre a grade comum**. A TASK-105 implementa isso (origem = comum). Estender a **origem** é novo.
**Spec relacionada:** Spec 04 §8.4/§8.5; Spec 02 §11 (invariante `tabela_excepcional_uuid ≠ null ⇒ viagem_feriado = false`, RN-099); RN-007 (cópia → UUIDs novas).
**Impacto se não decidir:** ao copiar entre grades com invariantes diferentes é preciso definir a **normalização** dos discriminadores (ex.: feriado→excepcional zera `viagem_feriado` e seta `tabela_excepcional_uuid`; excepcional→feriado seta `viagem_feriado=true` e limpa a referência). Sem decisão, essa transformação seria inventada e poderia violar RN-099.
**Opções/sub-decisões:** (a) origens permitidas: comum, feriados, qualquer excepcional; (b) normalização automática dos discriminadores no destino (obrigatória p/ preservar RN-099); (c) confirmação sobrescrever/mesclar se o destino já tiver conteúdo (como §8.4). **Recomendo** as três origens com normalização automática + confirmação, UUIDs novas (RN-007). Habilita a **TASK-112** (estende a TASK-105).
**Decisão:** **Decidida (DEC-087, 2026-07-27).** Origens comum/feriados/excepcional com normalização automática (RN-099); **"mesclar" = sincronização preservando UUID** (apaga ausentes, atualiza offsets, preserva UUID das casadas por `horario_saida`, acrescenta faltantes com UUID nova) — **exceção à RN-007**, valendo para TASK-105 **e** TASK-112; "sobrescrever" segue com UUIDs novas. **Exige alteração da Spec 04 §8.4/§8.5 e carve-out na RN-007 antes do código.** Edge do casamento sob RN-062 (duplicatas) a resolver na `/analisar-task`. Ver DEC-087.

## Q-066 — Retirar a ação "Apagar bloco inteiro" da grade de horários

**Contexto:** Na revisão de aderência da TASK-106 (2026-07-27), o responsável
pelo domínio determinou que o botão **"Apagar bloco" não existirá mais**. A
implementação atual segue a Spec 04 §8.3: apaga, em todos os dias, a Viagem que
ocupa a mesma posição ordinal. O problema operacional apontado é que o bloco é
apenas um alinhamento visual por posição — não uma entidade nem uma unidade de
operação — e pode juntar Viagens com horários diferentes em cada dia. Portanto,
o gesto destrutivo agrupa partidas sem vínculo operacional real. Permanecem
distintos e úteis: o "X" que apaga **uma Viagem** e a operação de apagar **um dia
inteiro** da TASK-110/DEC-085.

**Spec relacionada:** Spec 04 §8.1 (bloco = posição ordinal) e §8.3 (na redação
anterior, mandava disponibilizar apagar o bloco inteiro; o responsável já
alinhou a seção à opção A); RN-061 (cada célula preenchida é uma Viagem
independente por dia). Não há entidade `Bloco` no contrato da Spec 02.

**Conflito:** era **real entre a redação anterior da spec e a nova orientação do
responsável**. Foi resolvido pelo alinhamento da Spec 04 §8.3 e pela DEC-088.

**Impacto se não decidir:** a TASK-106 permanece sem reavaliação final: manter o
botão contraria a UX determinada nesta revisão; removê-lo antes de alinhar a spec
viola a hierarquia de verdade. As TASK-107..111, dependentes da fundação da
TASK-106, não devem avançar sobre uma superfície reprovada.

**Opções possíveis:**

- **A — retirar "Apagar bloco inteiro" (proposta do responsável):** alinhar a
  Spec 04 §8.3, remover botão/handler/motor/testes exclusivos de `apagarBloco` e
  manter "Apagar viagem inteira"; a operação de coluna da TASK-110 permanece.
- **B — manter a ação da spec vigente:** conservar o botão e a remoção ordinal,
  aceitando que o bloco seja uma unidade visual destrutível.
- **C — redefinir o bloco como unidade operacional:** exigiria nova modelagem e
  não foi solicitada; não recomendada, pois hoje o contrato não possui essa
  entidade.

**Recomendação técnica:** opção **A**, fiel à orientação e ao racional operacional
dados pelo responsável. Não altera o JSON, o Comparador, o PDF nem as contagens;
altera a Spec 04 §8.3, a superfície da TASK-106 e seus testes.

**Decisão:** **Decidida (DEC-088, 2026-07-27).** Opção A, por decisão explícita
do responsável pelo domínio: retirar "Apagar bloco inteiro"; manter o bloco
apenas como alinhamento visual e preservar as ações de apagar uma Viagem e de
apagar um dia inteiro. A Spec 04 §8.3 já foi alinhada pelo responsável. Ver
DEC-088.

---

## Q-067 — A ação antiga “Copiar uma Viagem para outro dia” permanece após as setas adjacentes e a cópia de dia inteiro?

**Status:** Decidida — DEC-089

**Origem:** verificação manual da TASK-107 (2026-07-27)

**Contexto:** a UI atual oferece `Select` de dia + botão “Copiar”, que duplica
uma única Viagem para um dia arbitrário. O novo modelo visual reserva as ações
flutuantes para restaurar, apagar, inserir ±X, copiar para o dia
anterior/seguinte (TASK-109) e copiar um dia inteiro para vários dias
(TASK-110). O responsável apontou que a ação antiga parece redundante e polui a
composição. Contudo, as operações não são equivalentes: a TASK-109 alcança
somente o dia adjacente, e a TASK-110 copia todas as Viagens do dia, não uma
Viagem isolada.

**Spec relacionada:** Spec 04 §8.3 (“Copiar viagem para outro dia”); Spec 02
§12; RN-004/RN-007/RN-061/RN-062; DEC-084/TASK-109; DEC-085/TASK-110.

**Impacto:** somente Formulário e testes. Sem campo novo ou migração de JSON;
qualquer cópia continua criando UUID nova. A alteração humana já presente na
Spec 04 §8.3 substitui a ação antiga pela cópia ao dia à esquerda/direita; falta
somente versionar esse texto e formalizar a decisão em DEC.

**Opções:** A — manter as três operações (cópia unitária arbitrária, setas
adjacentes e cópia de dia inteiro); B — retirar a ação antiga e considerar
setas + cópia de dia inteiro como substituição deliberada, alterando antes a
Spec 04 §8.3; C — incorporar à TASK-110 um diálogo de cópia **unitária** para
vários dias e então retirar o seletor/botão antigo, preservando a capacidade
unitária arbitrária em uma UI menos poluída.

**Recomendação técnica:** B, por corresponder ao modelo visual solicitado e
evitar três caminhos parcialmente sobrepostos. A alteração humana já presente
na Spec 04 §8.3 aplica materialmente essa opção. O responsável confirmou a
opção B e esclareceu que a remoção do controle antigo pode ocorrer na TASK-109,
sem bloquear a correção visual e a reavaliação da TASK-107.

**Decisão:** **Decidida (DEC-089, 2026-07-27).** Opção B, por decisão explícita
do responsável: retirar a ação unitária arbitrária; manter as setas de dia
adjacente e a cópia de dia inteiro. A retirada/refatoração fica na TASK-109 e
não bloqueia a correção visual/reavaliação da TASK-107. A Spec 04 §8.3 já foi
alinhada pelo responsável. **Complemento explícito:** a navegação não é
circular; em SEG não aparece ← e em DOM não aparece →. Ver DEC-089.

---

## Q-068 — Onde fica a ação “Restaurar sugestão” na superfície da Viagem?

**Status:** Decidida — DEC-090

**Origem:** correção e reavaliação visual da TASK-107 (2026-07-27)

**Contexto:** a imagem-modelo
`docs-dev/selecao de horario e botoes 1.png` posiciona a seta circular de
restauração à esquerda do controle superior. Durante a implementação da
TASK-107, o responsável pelo domínio solicitou que a ação ficasse
**imediatamente abaixo do X**, formando com ele uma coluna vertical à direita
da Viagem, porque essa composição ficou visualmente melhor. A orientação não
havia sido persistida e, por isso, a reavaliação voltou a tratar a imagem como
prescrição literal.

**Spec relacionada:** Spec 04 §8.2 (“Restaurar sugestão”); TASK-107; DEC-050.
Não altera a semântica da restauração, o contrato JSON nem qualquer RN de
domínio.

**Opções:** A — seguir literalmente a imagem-modelo e colocar a restauração à
esquerda do controle superior; B — colocar a restauração abaixo do X, em coluna
vertical à direita da Viagem.

**Decisão:** **Decidida (DEC-090, 2026-07-27).** Opção B, por decisão explícita
do responsável pelo domínio: a ação “Restaurar sugestão” fica imediatamente
abaixo do X. Para esse detalhe de composição, a DEC-090 prevalece sobre a
posição retratada na imagem-modelo.

---

## Q-069 — Qual é o escopo e o ciclo de vida dos últimos deslocamentos relativos?

**Status:** Decidida — DEC-091

**Origem:** necessidade identificada pelo responsável ao final da TASK-107
(2026-07-27)

**Contexto:** a DEC-082 definiu dois controles de inserção relativa, com X
editável e default de 10 minutos. A implementação da TASK-107 mantém hoje um
valor de deslocamento anterior e outro posterior **por Viagem**; por isso, ao
passar o mouse sobre outra Viagem, os campos voltam a `00:10`. O responsável
determinou que o último valor digitado deve ser reaproveitado nos hovers
seguintes, preservando dois valores independentes: um para a seta para cima
(subtração de tempo) e outro para a seta para baixo (adição de tempo). Falta
fixar até onde esses dois valores são compartilhados e quando voltam ao
default.

**Spec relacionada:** Spec 04 §8.2/§8.3; DEC-082/TASK-107; RN-067/RN-096. É
estado de conveniência da UI: não altera Viagem, contrato JSON, PDF,
Comparador ou contagens.

**Impacto se não decidir:** a TASK-113 não pode escolher sem respaldo entre
compartilhar os valores em toda a etapa, isolá-los por Serviço/sentido/grade ou
levá-los para a sessão do Formulário. Também fica indefinido se uma entrada
inválida substitui o último valor reutilizável.

**Opções:** A — manter dois últimos valores **válidos** por instância aberta da
etapa “Viagens e horários”, compartilhados entre todas as Viagens, grades,
Serviços e sentidos exibidos nessa instância; ao sair/desmontar a etapa, ambos
voltam independentemente a `00:10`; entrada inválida não substitui o último
valor válido. B — manter dois valores válidos por Serviço × sentido × grade,
com o mesmo reset ao desmontar a etapa. C — guardar os dois valores na
`SessaoFormulario`, sobrevivendo à navegação entre etapas até iniciar nova
sessão ou importar outro JSON.

**Recomendação técnica:** A. É a leitura mais direta de “agilizar o
preenchimento de vários horários rapidamente”, reduz o estado atual de mapas
por UUID para dois valores escalares e mantém a preferência estritamente
efêmera, sem ampliar o modelo da sessão nem tocar o contrato (RN-096).

**Decisão:** **Decidida (DEC-091, 2026-07-27).** Opção A, por decisão explícita
do responsável pelo domínio: dois últimos valores válidos e independentes por
instância aberta da etapa, compartilhados entre todas as Viagens, grades,
Serviços e sentidos; ambos voltam a `00:10` ao desmontar a etapa; entrada
inválida não substitui o último valor válido. Ver DEC-091.

---

## Q-070 — Cópia unitária de Viagem entre dias: setas ←/→ no hover ou arrasto da seleção até a coluna do dia?

**Status:** Decidida — DEC-092

**Origem:** decisão do responsável pelo domínio ao revisar a superfície da
Viagem antes de implementar a TASK-109 (2026-07-28)

**Contexto:** a DEC-084 (Q-062) definiu a cópia unitária para o dia adjacente
por **setas ←/→** exibidas na Viagem, e a DEC-089 (Q-067) retirou a ação antiga
"seletor de dia + botão Copiar" justamente em favor dessas setas. Ao avaliar a
composição já entregue nas TASK-106/107 (X, ↻ e os dois controles de inserção
relativa aparecendo no hover), o responsável constatou que **acrescentar duas
setas laterais polui a superfície da célula** — o gesto mais comum da grade
passaria a custar mais dois controles flutuantes sobre uma célula já densa.

A alternativa proposta é **não renderizar controle nenhum** para essa cópia e
usar um gesto direto: **arrastar a Viagem selecionada e soltá-la na coluna do
dia destino**, que então recebe a cópia. O ganho é superfície limpa; o custo é
que arrasto é gesto descoberto por affordance (cursor/realce da coluna alvo) e
não existe em teclado nem em telas de toque sem equivalente.

O ponto exige decisão porque a **Spec 04 §8.3 já foi alinhada pelo responsável**
com o texto "**Copiar viagem para dia ao lado**" — isto é, o alcance adjacente
está na spec, não só na DEC. Trocar o gesto e ampliar o destino para **qualquer
dia** altera o texto da spec e supera parcialmente a DEC-089, que havia
eliminado deliberadamente a cópia unitária para dia arbitrário.

**Spec relacionada:** Spec 04 §8.3 ("Copiar viagem para dia ao lado"), §8.1
(grade Seções × dias SEG…DOM); Spec 02 §12 (entidade nova → UUID nova);
RN-004/RN-007/RN-061/RN-062; DEC-084, DEC-089, DEC-090; TASK-109; DEC-050 e
`docs-dev/18-DESIGN_SYSTEM.md` (affordances, estados de hover/arrasto).

**Impacto se não decidir:** a TASK-109 não pode ser implementada — ela é
literalmente "as setas ←/→". Implementá-la como está entrega uma UI que o
responsável já rejeitou; implementá-la com arrasto sem decisão registrada seria
inventar UX e contrariar a spec vigente (`docs-dev/04` princípio 2).

**Opções:** A — manter as setas ←/→ da DEC-084/DEC-089, como a spec vigente
descreve. B — substituir as setas pelo **arrasto da Viagem selecionada até a
coluna do dia destino**, com destino em **qualquer** dia da semana, sempre
**copiando** (a origem permanece), mantendo a **guarda de duplicidade** da
DEC-084 e oferecendo um **atalho de teclado** para o caso adjacente. C —
oferecer os dois caminhos simultaneamente (setas + arrasto), com a poluição
visual que motivou a questão.

**Recomendação técnica:** B. Elimina dois flutuantes da célula sem perder
função, e o arrasto é o gesto que já exprime "esta Viagem passa a existir
naquele dia". C acumula caminhos redundantes sobre a mesma operação, exatamente
o problema que a DEC-089 fechou. O risco de B é acessibilidade — endereçado
pelo atalho de teclado e pela permanência da cópia de dia inteiro (TASK-110).

**Decisão:** **Decidida (DEC-092, 2026-07-28).** Opção B, por decisão explícita
do responsável pelo domínio, com destino em qualquer dia, cópia sempre (nunca
mover), guarda de duplicidade preservada e atalho `Ctrl+←` / `Ctrl+→` para o
dia adjacente. Ver DEC-092.

---

## Q-071 — Onde ficam as operações de dia inteiro e como se compõe o modo headway na grade?

**Status:** Decidida — DEC-093

**Origem:** correção solicitada pelo responsável ao validar manualmente as
TASK-108/TASK-110 (2026-07-29)

**Contexto:** a TASK-110 colocou “Copiar dia” no hover de uma Viagem e
“Apagar as Viagens do dia” como alternativa dentro do `X` dessa Viagem. A
granularidade das operações é de **coluna/dia inteiro**, mas sua afordância ficou
ancorada numa entidade **Viagem**, misturando os dois escopos. O responsável
determinou que o cabeçalho `SEG…DOM` seja o alvo das operações de coluna e
reiterou que a cópia unitária entre dias já é coberta por arrasto e por
`Ctrl+←`/`Ctrl+→` (DEC-092), portanto não deve ganhar botão no hover.

Na mesma superfície, o alternador do modo headway (TASK-108) hoje usa aparência
fantasma quando inativo e primária quando ativo; o responsável pediu fundo azul
claro no repouso e azul normal no estado pressionado. O formulário inferior
também deve deixar de pôr os dois campos numa única linha e passar a mostrar
duas linhas: `a cada [HH:MM]` e `até [HH:MM]`, com um único botão de geração
ocupando a coluna à direita das duas linhas.

O responsável detalhou ainda a entrada dos dois campos: máscara imediata de
quatro algarismos preenchidos com zeros à esquerda (`1` → `00:01`; `123` →
`01:23`). A máscara não corrige valores impossíveis: `9875` permanece visível
como `98:75`, inválido, com o botão de geração desabilitado.

**Spec relacionada:** Spec 04 §8.1 (colunas `SEG…DOM`), §8.2 (ações por
Viagem), §8.3 (cópia unitária por teclado/arrasto); Spec 02 §11/§12;
RN-004/RN-007/RN-061/RN-062/RN-063/RN-067; DEC-083, DEC-085, DEC-090,
DEC-092; TASK-108/TASK-109/TASK-110; DEC-050 e
`docs-dev/18-DESIGN_SYSTEM.md`.

**Impacto se não decidir:** a TASK-117 não pode alterar a posição definida pela
DEC-085 nem criar uma nova variante visual do `Botao` sem respaldo; implementar
diretamente escolheria uma interação de UI que não é literal nas specs.

**Opções:** A — manter a composição atual (operações de dia no hover da Viagem,
alternador fantasma e formulário de headway em uma linha). B — tornar cada
cabeçalho `SEG…DOM` um botão que abre as opções “Copiar para outro dia” e
“Apagar o dia”; deixar o `X` restrito a apagar aquela Viagem; manter a cópia
unitária somente por arrasto/atalho; usar azul claro no alternador inativo e
azul normal no ativo; compor o formulário de headway em duas linhas, com um
único botão de geração abrangendo ambas e máscara temporal que preserve valores
inválidos visíveis, desabilitando a geração. C — manter controles duplicados no
cabeçalho e no hover para descoberta.

**Recomendação técnica:** B. Faz a posição comunicar a granularidade da ação,
elimina controles redundantes na superfície densa da Viagem e preserva
integralmente os motores e regras já aprovados. O `MenuFlutuante` existente pode
oferecer as duas opções do cabeçalho; os diálogos de cópia/confirmação continuam
responsáveis pelas ações subsequentes. A aparência do alternador deve vir de
variante explícita do `Botao`, nunca de classes de cor sobrepostas.

**Decisão:** **Decidida (DEC-093, 2026-07-29).** Opção B, por decisão explícita
do responsável pelo domínio, incluindo a máscara `1` → `00:01`, `123` →
`01:23`, preservação visível de `9875` como `98:75` inválido e botão de geração
desabilitado enquanto os campos não forem válidos.

---

## Q-072 — Guarda de duplicidade na geração de Viagens por headway

**Status:** Decidida — DEC-094

**Origem:** problema constatado pelo responsável ao usar a geração por headway
da TASK-108 (2026-07-29)

**Contexto:** a geração por headway da DEC-083/TASK-108 cria todas as partidas
calculadas entre a Viagem-origem e o horário-limite, sem consultar as Viagens
que já existem no mesmo dia e grade. Por isso, repetir o gesto — inclusive por
duplo clique acidental — cria novas Viagens nos mesmos horários. A DEC-084
definiu uma guarda por `horario_saida`/grade para a cópia unitária entre dias,
mas determinou expressamente que ela valia exclusivamente naquele gesto; a
DEC-085 depois estendeu a mesma política à cópia de dia inteiro por decisão
própria. A RN-062 continua permitindo reforços de horário no contrato.

**Spec relacionada:** Spec 04 §8.2–§8.3 (ações e criação de Viagem na grade);
Spec 02 §11/§12/§14 (Viagem, identidade de cópias e duplicatas válidas);
RN-004/RN-007/RN-061/RN-062/RN-063/RN-067; DEC-083/DEC-084/DEC-085;
TASK-108/TASK-109/TASK-110.

**Impacto se não decidir:** aplicar a guarda ao headway superaria a
exclusividade fixada pela DEC-084. Também falta uma decisão documental sobre a
reação quando apenas parte do lote coincide com horários existentes e sobre o
aviso ao usuário. Implementar diretamente inventaria essa extensão de regra.

**Opções:** A — manter a geração atual, criando todas as Viagens calculadas,
inclusive reforços. B — aplicar a guarda somente ao gesto de headway: para cada
horário calculado, manter intacta a Viagem que já existir no mesmo dia e grade,
ignorar offsets no critério de igualdade, pular apenas a cópia coincidente e
continuar criando os demais horários ausentes; uma repetição integral vira
no-op. C — tornar `(dia_semana, horario_saida, grade)` único em todos os
caminhos, inclusive importação e edição.

**Recomendação técnica:** B. É a leitura direta do problema relatado e torna o
gesto idempotente sem contrariar a RN-062: a guarda permanece comportamento
local de conveniência, não validação do documento. Reutilizar o mesmo critério
da DEC-084 evita duas definições de “horário já existente”. Recomenda-se aviso
não bloqueante com a quantidade de horários ignorados; as Viagens preexistentes
preservam integralmente UUID, offsets e demais dados. Habilita a **TASK-118**.

**Decisão:** **Decidida (DEC-094, 2026-07-30).** Opção B, por decisão explícita
do responsável pelo domínio: a guarda fica restrita ao gesto de headway,
preserva integralmente as Viagens preexistentes, mescla lotes parcialmente
coincidentes e torna a repetição integral um no-op. Aprovado também o aviso não
bloqueante com a quantidade de horários ignorados.

---

## Q-073 — Escopo do destaque e do alerta para Viagens com partida coincidente

**Status:** Decidida — DEC-095

**Origem:** solicitação do responsável pelo domínio para destacar em laranja e
informar no painel de Alertas as Viagens que começam no mesmo dia e horário
(2026-07-30)

**Contexto:** a RN-062 permite que duas ou mais Viagens do mesmo itinerário
tenham o mesmo `dia_semana` e `horario_saida`: são reforços válidos, não erro de
contrato. O pedido não pretende proibir nem remover esses reforços; pretende
torná-los visíveis na grade, com destaque laranja semelhante ao da seleção, e
incluir um alerta não bloqueante para confirmação de que o cadastro foi
intencional. Os `offset_horario` das Seções não participam da coincidência.

A unidade exata da comparação, porém, não está fechada. A grade da Spec 04 §8
é exibida por Serviço × sentido × grade, enquanto o texto solicitado nomeia o
Serviço. Comparar o Serviço inteiro poderia marcar como coincidentes partidas
simultâneas de Ida e Volta, embora pertençam a itinerários distintos; comparar
grades diferentes poderia ainda misturar operações comum, de feriado e
excepcional, que são independentes pela RN-061. Também é preciso fixar a
agregação/navegação do alerta e a precedência visual quando uma Viagem
coincidente estiver selecionada.

**Spec relacionada:** Spec 04 §8.1 (grade por Serviço × sentido e por grade),
§11 (alertas não bloqueantes, ciência e navegação para a origem); Spec 02
§11/§14 (Viagem e reforços válidos); RN-061/RN-062/RN-078; DEC-050 e
`docs-dev/18-DESIGN_SYSTEM.md`.

**Impacto se não decidir:** implementar diretamente escolheria, sem regra de
origem, se partidas de sentidos ou grades diferentes são coincidências e como
um alerta agregado leva à origem. Uma comparação ampla demais produziria
falsos positivos; uma estreita demais poderia omitir o caso pretendido.

**Opções:** A — considerar coincidência somente dentro do mesmo itinerário
(mesmo Serviço e sentido) e da mesma grade, agrupando por
`dia_semana + horario_saida`, sem comparar offsets; emitir um alerta por
Serviço que tenha ao menos um grupo, com quantidade de grupos e navegação para
o primeiro, e destacar em laranja todas as células das Viagens envolvidas; a
seleção azul tem precedência visual temporária, sem retirar o alerta. B —
comparar o Serviço inteiro dentro da mesma grade, juntando Ida e Volta; alerta
e destaque podem, portanto, abranger ambos os sentidos. C — comparar o Serviço
inteiro sem separar sentido nem grade, marcando também coincidências entre
operação comum, de feriado e excepcional.

**Recomendação técnica:** A. É a extensão estritamente informativa da RN-062,
cujo próprio texto define o reforço como duas Viagens do **mesmo itinerário**,
e respeita a independência das grades da RN-061. Evita acusar como repetição
duas partidas legítimas em sentidos opostos ou em regimes operacionais
distintos. Texto sugerido do alerta: **“O Serviço {numero_n} possui partidas
coincidentes no mesmo dia e horário. As Viagens destacadas em laranja são
reforços válidos; confirme se o cadastro é intencional.”** Habilita a
**TASK-119**.

**Decisão:** **Decidida (DEC-095, 2026-07-30).** Opção A, por decisão explícita
do responsável pelo domínio, com o seguinte refinamento vinculante: dentro de
cada grupo coincidente, a primeira Viagem na ordem exibida pela grade permanece
com aparência normal; somente a segunda e as posteriores são consideradas
Viagens de reforço e recebem o destaque laranja. Com duas partidas `08:00`,
somente a segunda é destacada; com três, a segunda e a terceira. Permanecem o
alerta por Serviço, a navegação para o primeiro grupo e a precedência visual
temporária da seleção azul.

---

## Q-074 — Segundo clique na Viagem selecionada deve desfazer a seleção?

**Status:** Decidida — DEC-096

**Origem:** incômodo relatado pelo responsável ao usar a seleção persistente da
grade de horários (2026-07-30)

**Contexto:** a TASK-106 determinou que clicar numa Viagem cria uma superfície
azul contínua e “mantém a seleção persistente”. A implementação atual atribui o
`uuid` da Viagem tanto no `onClick` da célula quanto no foco do campo; clicar
novamente na mesma Viagem conserva a seleção, e o único modo de retirar o azul
é selecionar outra Viagem. O responsável considera esse comportamento um
antipadrão e solicitou um toggle: o segundo clique na mesma Viagem deve
desmarcá-la. A DEC-095 tornou o término da seleção ainda mais observável, pois
uma Viagem de reforço deve voltar do azul para o laranja quando for
desselecionada.

**Spec relacionada:** Spec 04 §8.1–§8.3 (grade, edição e ações de Viagem);
TASK-106 (seleção persistente e superfície contínua); DEC-082/DEC-083/DEC-092
(ações que usam a Viagem selecionada); DEC-095/TASK-119 (precedência azul sobre
o destaque laranja); DEC-050 e `docs-dev/18-DESIGN_SYSTEM.md`.

**Impacto se não decidir:** implementar o toggle contraria literalmente o
critério de seleção persistente da TASK-106; manter o comportamento atual
contraria a nova orientação do responsável e deixa a precedência visual da
DEC-095 sem um gesto de encerramento na própria Viagem.

**Opções:** A — o clique funciona como toggle por `uuid`: primeiro clique
seleciona; novo clique em qualquer célula da mesma Viagem limpa a seleção;
clicar em outra Viagem transfere a seleção diretamente. Desselecionar não muda
foco, horário ou qualquer dado; a superfície volta ao estado derivado
subjacente (normal ou laranja de reforço). Foco/navegação por Tab/Enter
continuam selecionando a Viagem alcançada, como hoje; não se acrescentam
`Escape`, clique fora ou desmarcação por `blur`. B — manter a seleção
persistente da TASK-106, exigindo selecionar outra Viagem. C — além do toggle
da opção A, também desmarcar por `Escape`, clique fora da grade e perda de foco.

**Recomendação técnica:** A. É exatamente o gesto solicitado, supera somente a
persistência indefinida da TASK-106 e preserva foco, digitação, navegação e as
ações dependentes de seleção. O escopo cabe na **TASK-119**, que já precisa
compor o azul selecionado com o laranja do reforço; criar uma task separada
duplicaria testes e edição na mesma superfície.

**Decisão:** **Decidida (DEC-096, 2026-07-30).** Opção A, por decisão explícita
do responsável pelo domínio: primeiro clique seleciona; segundo clique em
qualquer célula da mesma Viagem desmarca; clicar em outra Viagem transfere a
seleção. A desseleção não altera foco nem dados e restaura a aparência normal
ou o laranja de reforço. Não se acrescentam `Escape`, clique fora, `blur` ou
mudança na navegação por Tab/Enter.

---

## Q-075 — Como a TASK-119 navega para coincidências em grades excepcionais?

**Status:** Decidida — DEC-097

**Origem:** análise prévia da TASK-119, após constatar que a detecção da
DEC-095 abrange grades excepcionais, mas essa superfície ainda pertence à
TASK-105 (2026-07-30)

**Contexto:** a DEC-095 exige detectar partidas coincidentes dentro do mesmo
itinerário e da mesma grade, sem misturar operação comum, de feriado ou
excepcional. Também exige um alerta agregado por Serviço, com quantidade de
grupos e navegação para o primeiro grupo. A implementação atual da etapa
Viagens renderiza somente as grades comum e de feriado; a grade excepcional,
necessária para destacar e posicionar uma ocorrência excepcional, é escopo da
TASK-105. Sem essa superfície, um reforço excepcional importado pode ser
detectado, mas o clique no alerta não consegue selecionar a grade nem levar à
primeira ocorrência.

Além disso, “primeiro grupo” não fixava a prioridade entre sentidos e grades,
e o texto literal decidido na DEC-095 não contém a quantidade de grupos.

**Spec relacionada:** Spec 04 §8.1/§8.5 (grades por Serviço, sentido e regime),
§11 (alerta não bloqueante e navegação para a origem); Spec 02 §6.1/§11
(tabela excepcional e pertencimento da Viagem); RN-061/RN-062/RN-078/RN-099;
DEC-095; TASK-105; TASK-119.

**Impacto se não decidir:** implementar a TASK-119 antes da TASK-105 obrigaria
a ignorar reforços excepcionais, navegar apenas até a etapa sem posicionar a
origem ou absorver indevidamente a construção da grade excepcional. Também
deixaria a escolha do primeiro grupo e a apresentação da quantidade a cargo da
implementação, sem regra explícita.

**Opções:** A — tornar a TASK-105 pré-requisito da TASK-119; depois dela,
ordenar a navegação pela ordem dos itinerários no documento, pela ordem visual
das grades, por `DIAS_SEMANA`, `horario_saida` e ordem exibida; manter o texto
literal da DEC-095 e apresentar a quantidade de grupos em um `Selo` associado.
B — implementar agora somente para grades comum e de feriado e completar a
grade excepcional na TASK-105, alterando explicitamente os critérios da
TASK-119. C — detectar a coincidência excepcional agora, mas navegar apenas
para a etapa Viagens, sem posicionar grade ou ocorrência.

**Recomendação técnica:** A. É a única opção que atende integralmente à
DEC-095 e à navegação da Spec 04 §11 sem duplicar ou absorver o escopo da
TASK-105. Também preserva o texto vinculante do alerta e torna determinística
a escolha da primeira origem.

**Decisão:** **Decidida (DEC-097, 2026-07-30).** Opção A, por decisão explícita
do responsável pelo domínio: a TASK-119 passa a depender da conclusão e
aprovação da TASK-105. Depois dessa dependência, a primeira origem segue a
ordem dos itinerários no documento, a ordem visual das grades,
`DIAS_SEMANA`, `horario_saida` e a ordem exibida; a quantidade de grupos é
mostrada em um `Selo` associado, sem alterar o texto literal da DEC-095.

## Q-076 — O que ocorre ao remover uma Tabela excepcional referenciada por Viagens?

**Status:** Decidida — DEC-098

**Origem:** análise da TASK-104 (2026-07-30)

**Contexto:** a TASK-104 exige remover Tabelas excepcionais. A Spec 02
§11/§14 e a RN-099 proíbem que uma Viagem mantenha
`tabela_excepcional_uuid` apontando para uma tabela inexistente. Nenhuma spec
ou decisão anterior determinava se a remoção deveria ser recusada ou se também
deveria apagar as Viagens associadas. Transformá-las em Viagens comuns
alteraria silenciosamente sua semântica e não é uma alternativa prevista.

**Spec relacionada:** Spec 02 §6.1/§11/§14; Spec 04 §8.5;
RN-061/RN-098/RN-099; TASK-104/TASK-105.

**Impacto se não decidir:** bloquear por conta própria poderia impedir uma
remoção esperada; aplicar cascata poderia apagar Viagens sem autorização
normativa. Remover apenas a tabela produziria documento estruturalmente
inválido.

**Opções possíveis:** A — bloquear a remoção enquanto houver Viagens
associadas, informar a quantidade e exigir que elas sejam removidas previamente
na grade excepcional. B — após confirmação explícita, remover a tabela e todas
as Viagens associadas, em todos os itinerários do Serviço. C — oferecer no
diálogo a escolha entre cancelar ou remover em cascata, sempre exibindo a
quantidade de Viagens afetadas.

**Recomendação técnica:** A — evita perda implícita de dados e mantém a
TASK-104 restrita ao CRUD da entidade. Como a grade excepcional pertence à
TASK-105, a remoção das Viagens associadas permanece naquela superfície.

**Decisão:** **Decidida (DEC-098, 2026-07-30).** Opção A, por decisão explícita
do responsável pelo domínio: a remoção de uma Tabela excepcional é bloqueada
enquanto houver Viagens associadas a ela. A interface informa a quantidade de
Viagens que ainda a referenciam e orienta removê-las previamente na grade
excepcional. Não há remoção em cascata nem conversão para a grade comum.

## Q-077 — Como parear reforços coincidentes no `Copiar (sobrescrever)`?

**Status:** Decidida — DEC-099

**Origem:** correção solicitada para a semeadura entre grades após a atualização
da Spec 04 §8.4/§8.5 (2026-07-30)

**Contexto:** a Spec 04 §8.5 determina que `Copiar (sobrescrever)` sincroniza a
grade destino com a origem, casando Viagens por `horario_saida`, preservando por
contagem as UUIDs que já existiam no destino e atualizando seus
`horarios_paradas`. A RN-062, porém, permite duas ou mais Viagens no mesmo dia,
grade e `horario_saida`. Quando origem e destino possuem vários reforços
coincidentes com offsets diferentes, a contagem define quantas UUIDs permanecem,
mas não define qual Viagem do destino recebe os offsets de qual Viagem da
origem.

**Spec relacionada:** Spec 02 §11/§11.1/§12/§14; Spec 04 §8.4/§8.5;
RN-004/RN-005/RN-007/RN-061/RN-062/RN-063/RN-099; DEC-087; TASK-105/TASK-112.

**Impacto se não decidir:** implementações diferentes podem preservar a mesma
quantidade de UUIDs, mas associá-las a conjuntos diferentes de offsets. O JSON
continua estruturalmente válido, porém o Comparador pode atribuir uma alteração
de horário de passagem à Viagem errada.

**Opções:** A — dentro de cada `dia_semana + horario_saida`, parear origem e
destino pela ordem estável em que aparecem nos respectivos arrays; B — parear
primeiro Viagens com `horarios_paradas` idênticos e, depois, parear os
excedentes pela ordem estável; C — recusar a sincronização quando houver
reforços coincidentes, exigindo que o usuário os diferencie antes da cópia.

**Recomendação técnica:** A. É determinística, preserva a semântica já descrita
como casamento “por contagem”, não transforma offsets em identidade e coincide
com a ordem estável já praticada pelo motor entregue na TASK-112.

**Decisão:** **Decidida (DEC-099, 2026-07-30).** Opção A, por decisão explícita
do responsável pelo domínio: dentro de cada `dia_semana + horario_saida`,
origem e destino são pareados pela ordem estável em que aparecem nos
respectivos arrays. As UUIDs preservadas são sempre as do destino; excedentes
da origem recebem UUID nova e excedentes do destino são removidos.

## Q-078 — Onde deve aparecer o formulário de geração por headway?

**Status:** Decidida — DEC-100

**Origem:** bug visual relatado após a TASK-117 (2026-07-30)

**Contexto:** ao ativar o modo headway no hover de uma Viagem, a implementação
atual insere `a cada`, `até` e o botão de geração numa linha auxiliar da própria
tabela. Essa linha aparece ao fundo, separada da superfície de ações da Viagem,
e pode deslocar ou desconfigurar a grade. Os controles flutuantes também são
recortados pelo wrapper de rolagem ou pelas células seguintes, especialmente no
modo compacto e nas bordas da tabela.

**Spec relacionada:** Spec 04 §8.1–§8.3; Spec 02 §11/§12;
RN-061/RN-063/RN-067/RN-096; DEC-083/DEC-090/DEC-093; TASK-108/TASK-114/TASK-117;
`docs-dev/18-DESIGN_SYSTEM.md` §2/§3/§5/§6.

**Impacto se não decidir:** mover o formulário para dentro do hover altera a
composição em duas linhas fixada pela DEC-093 e o ciclo de abertura/fechamento
da superfície interativa. Manter a linha auxiliar preserva a decisão anterior,
mas não atende à composição solicitada nem resolve por si só o recorte dos
controles.

**Opções:** A — ao ativar headway, substituir o conteúdo da superfície
flutuante da Viagem por `a cada`, `até` e o botão de geração, mantendo-a aberta
enquanto houver hover ou foco e reposicionando-a para permanecer visível sobre
a tabela e dentro da viewport; B — manter o formulário em uma linha auxiliar da
tabela e corrigir apenas dimensões, empilhamento e recorte; C — abrir o
formulário em diálogo separado.

**Recomendação técnica:** A. Mantém os campos associados visualmente à Viagem
que origina a geração, elimina a linha inserida ao fundo e segue o contrato de
elemento flutuante reposicionável do design system.

**Decisão:** **Decidida (DEC-100, 2026-07-30).** Opção A, com detalhamento
explícito do responsável: ao ativar headway, o controle de criar outra Viagem
“X tempo depois” é substituído, dentro da superfície flutuante, por duas linhas
`a cada [HH:MM]` e `até [HH:MM]`, com um único botão na coluna direita
abrangendo ambas. Não há linha auxiliar na tabela, e a superfície permanece
aberta enquanto houver hover ou foco na âncora ou no próprio flutuante.

## Q-079 — Como compor as ações da Viagem no modo compacto?

**Status:** Decidida — DEC-101

**Origem:** proposta de correção do hover no modo “Exibir somente partidas”
(2026-07-30)

**Contexto:** a DEC-090 posiciona `Restaurar sugestão` abaixo do `X`, e a
DEC-093 mantém o alternador de headway na superfície da Viagem. No modo compacto
as Seções intermediárias/final ficam ocultas, portanto o responsável propôs
ocultar `Restaurar sugestão`, colocar o alternador de headway ao lado do `X` e
inverter a superfície na coluna de domingo para que abra à esquerda.

**Spec relacionada:** Spec 04 §8.1/§8.2; RN-063/RN-066/RN-067/RN-096;
DEC-086/DEC-090/DEC-093; TASK-111/TASK-114/TASK-117;
`docs-dev/18-DESIGN_SYSTEM.md` §3/§5/§6.

**Impacto se não decidir:** ocultar `Restaurar sugestão` muda a disponibilidade
de uma ação prevista na Spec 04 §8.2 enquanto o modo compacto estiver ativo, e
reposicionar os controles supera parcialmente a composição da DEC-090. Manter a
composição atual conserva a decisão anterior, mas continua ocupando uma coluna
vertical maior e sujeita a recorte.

**Opções:** A — no modo compacto, ocultar `Restaurar sugestão`, exibir `X` e o
alternador de headway lado a lado, abrir à direita de SEG–SÁB e à esquerda de
DOM; ao sair do modo compacto, restaurar a composição completa da DEC-090;
B — manter `X`, restaurar e headway na mesma coluna vertical em ambos os modos,
apenas corrigindo o recorte; C — manter `Restaurar sugestão` acessível no modo
compacto, mas movê-lo para um menu secundário, deixando `X` e headway lado a
lado.

**Recomendação técnica:** A. O modo compacto passa a oferecer somente ações
compreensíveis sobre a partida visível; a restauração continua disponível ao
reexibir todas as Seções, sem alterar dados nem o contrato JSON.

**Decisão:** **Decidida (DEC-101, 2026-07-30).** Opção A, por decisão explícita
do responsável: no modo compacto, `Restaurar sugestão` fica oculto, `X` e o
alternador de headway aparecem lado a lado, SEG–SÁB preferem abrir à direita e
DOM à esquerda. Ao reexibir todas as Seções, retorna a composição completa da
DEC-090; ao ativar headway, entra o formulário flutuante da DEC-100.

## Q-080 — Qual deve ser a largura das superfícies flutuantes de ação da Viagem?

**Status:** Decidida — DEC-102

**Origem:** observação do responsável pelo domínio sobre o hover entregue pelas
TASK-121/TASK-122 (2026-07-31)

**Contexto:** as superfícies `acao-inserir-anterior`, `acao-inserir-posterior` e
`superficie-headway` compõem um campo `HH:MM` (`min-w-20`) mais um botão
(`min-w-10`), resultando numa caixa sensivelmente mais larga que a célula de
horário que a ancora. O responsável avalia que a caixa deve ter a **largura da
célula de horário** para não cobrir colunas vizinhas nem parecer desalinhada. A
DEC-100 fixou a *composição* (duas linhas e um botão à direita abrangendo
ambas), mas não fixou largura; nenhuma DEC anterior fixa a largura dessas
superfícies.

**Spec relacionada:** Spec 04 §8.1/§8.2/§8.3; RN-096;
DEC-082/DEC-090/DEC-093/DEC-100/DEC-101;
`docs-dev/18-DESIGN_SYSTEM.md` §3/§5/§6.

**Impacto se não decidir:** o hover continua mais largo que a coluna,
sobrepondo células vizinhas e forçando reposicionamento em SÁB/DOM com mais
frequência do que o necessário. Por outro lado, estreitar a caixa pode reduzir a
legibilidade do campo `HH:MM` e do botão, e a DEC-090 pede "controles ±X largos
e legíveis" — daí a necessidade de decisão explícita.

**Opções:** A — a superfície assume a largura da célula de horário que a ancora
(medida em runtime), com o conteúdo se adaptando a essa largura;
B — a superfície recebe uma largura fixa em token do design system, próxima da
largura nominal da coluna, sem medir a célula; C — manter a largura atual
dirigida pelo conteúdo, apenas reduzindo os mínimos (`min-w-20`/`min-w-10`).

**Recomendação técnica:** A. A `SuperficieFlutuante` já mede a âncora em runtime
para posicionar, de modo que reutilizar a mesma medida para a largura não
acrescenta mecanismo novo e mantém o alinhamento mesmo quando a largura da
coluna varia com o conteúdo. Se a decisão for A, é preciso definir também o
piso mínimo de legibilidade (a caixa não deve encolher a ponto de cortar
`HH:MM`) e se o botão continua na coluna à direita das duas linhas do headway.

**Decisão:** **Decidida (DEC-102, 2026-07-31).** Opção A, com detalhamento
explícito do responsável: a superfície assume a largura da célula de horário
medida em runtime; há **piso de legibilidade** — a caixa nunca encolhe a ponto
de truncar `HH:MM` ou o alvo mínimo do botão, e em coluna mais estreita que o
piso ela usa o piso e transborda o mínimo indispensável; o botão único do
headway continua na coluna à direita abrangendo as duas linhas (DEC-100).

## Q-081 — Ordem dos botões na superfície da Viagem e tolerância de fechamento do hover

**Status:** Decidida — DEC-103

**Origem:** observação do responsável pelo domínio sobre o hover entregue pelas
TASK-121/TASK-122 (2026-07-31)

**Contexto:** hoje o `X` de apagar vem antes do alternador de headway (`↪`) — em
coluna no modo completo (DEC-090) e lado a lado no modo compacto (DEC-101).
Depois de clicar no alternador, o usuário precisa deslocar o ponteiro até os
campos `a cada`/`até` do formulário da DEC-100; com o alternador no fim da
composição, esse trajeto passa por fora da âncora e da superfície e o hover
fecha antes de o ponteiro chegar ao campo. O responsável propõe **inverter a
ordem** (1º o alternador, 2º o `X`) e **atrasar em cerca de 0,5 s** o
fechamento — hoje `agendarSaidaHover` usa 300 ms.

**Spec relacionada:** Spec 04 §8.2/§8.3; RN-096 (estado de hover é efêmero);
DEC-090/DEC-101/DEC-100; `docs-dev/18-DESIGN_SYSTEM.md` §3/§5/§6.

**Impacto se não decidir:** a inversão supera parcialmente a DEC-090 ("X no topo
à direita", restaurar imediatamente abaixo do X) e a ordem descrita na DEC-101
("`X` e o alternador de headway lado a lado"), de modo que implementar sem
decisão seria alterar composição já decidida. Manter como está preserva as
decisões, mas conserva o problema de usabilidade relatado. O atraso maior é
tuning do mesmo gesto, mas convém decidir junto porque só faz sentido como par.

**Opções:** A — inverter a ordem em ambos os modos (alternador primeiro, `X`
depois; no modo completo, definir também onde fica `Restaurar sugestão`) e
elevar o atraso de fechamento para ~500 ms; B — inverter a ordem apenas no modo
compacto, mantendo a coluna da DEC-090 no modo completo, com o mesmo atraso
maior; C — manter a ordem atual e resolver apenas com atraso maior e/ou uma
faixa de tolerância entre a âncora e a superfície.

**Recomendação técnica:** A, com a ressalva de que o `X` destrutivo deve
continuar visualmente distinto e não deve assumir a posição onde o usuário
clicava no alternador por hábito. O atraso deve permanecer um único valor
compartilhado (hoje em `agendarSaidaHover`), não um por superfície, e continuar
sendo estado efêmero (RN-096). No modo completo é preciso dizer explicitamente
a ordem final dos três controles (alternador, restaurar, `X`) para não deixar a
DEC-090 ambígua.

**Decisão:** **Decidida (DEC-103, 2026-07-31).** Opção B, por confirmação
explícita do responsável: a inversão vale **somente no modo compacto** — o
alternador de headway vem primeiro e o `X` depois; no modo completo a coluna da
DEC-090 permanece intacta (`X` no topo, `Restaurar sugestão` no meio,
alternador no fim). O atraso de fechamento do hover sobe de 300 ms para ~500 ms,
num valor único compartilhado pelas superfícies e pelos dois modos.

## Q-082 — Origem da imagem do mapa no PDF operacional

**Status:** Decidida — DEC-104

**Origem:** `/analisar-task` da TASK-033 (2026-07-31) — primeira task a construir
a superfície de PDF operacional

**Contexto:** a Spec 04 §13.1 item 4d exige, para cada Serviço e sentido, a
**imagem do mapa com a rota**, obtida por **captura do próprio canvas**
(Spec 01 §8). A primitiva já existe (`src/shared/mapa/captura.ts`, com
`preserveDrawingBuffer: true` em `src/shared/mapa/mapa.tsx`), mas o canvas só
existe **enquanto a etapa Itinerários está montada**. O PDF é gerado na etapa
Exportação (§12), onde nenhum mapa está em tela, e um documento tem até duas
imagens por Serviço. A spec não define **quando** a captura ocorre, se ela é
persistida em sessão, nem o que o PDF faz quando a imagem não está disponível.

**Spec relacionada:** Spec 04 §13.1 item 4d, §12; Spec 01 §8; RN-074 (estrutura
fixa do PDF), RN-096/NEG-004 (nada persistido além do JSON exportado).

**Impacto se não decidir:** o item 4d da TASK-033 fica sem implementação
definida — ou o PDF sai sem mapa (descumprindo a estrutura da RN-074), ou o
implementador inventa por conta própria um mecanismo de captura não
especificado.

**Opções:** 1 — **captura sob demanda na geração**: a rotina de PDF monta um
mapa oculto por itinerário, aguarda o mapa ficar ocioso, captura e descarta
(PDF sempre completo; geração mais lenta e dependente dos tiles); 2 — **cache
efêmero em sessão**: captura ao concluir/recalcular cada itinerário e guarda o
data-URI na sessão (rápido, mas itinerário nunca visitado nesta sessão sai sem
imagem — inclusive todo documento apenas importado); 3 — **passo explícito de
pré-visualização** antes de gerar, que percorre os itinerários capturando;
4 — subquestão válida para 1, 2 e 3: imagem ausente é **pendência bloqueante**
ou **lacuna tolerada com aviso**.

**Recomendação técnica:** opção 1 com **lacuna tolerada** — mantém o PDF correto
para documentos importados (que nunca passaram pela etapa de mapa), não cria
estado novo de sessão e é mockável nos testes; a captura que falha por tile
indisponível não derruba a geração do PDF.

**Decisão:** **Decidida (DEC-104, 2026-07-31).** Opção 1 com lacuna tolerada,
por decisão explícita do responsável, **acrescida do enquadramento**: o mapa
capturado deve mostrar a rota **centralizada e inteiramente contida**, no melhor
zoom possível (ajuste aos limites da geometria da rota). Ver DEC-104.
