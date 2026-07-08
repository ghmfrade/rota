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
**Decisão:** Pendente

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
