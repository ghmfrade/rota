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
