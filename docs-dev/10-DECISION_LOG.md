# 10 — DECISION_LOG: Log de Decisões Técnicas e de Produto

Decisões **já tomadas** nas specs (status `Aceita`). Novas decisões entram aqui com `DEC-xxx` sequencial após decisão humana registrada. Datas: as specs não datam decisões individuais — `não informada`, com a versão da spec como referência temporal.

---

## DEC-001 — ROTA não é sistema de gestão

**Status:** Aceita · **Origem:** Spec 01 §1, §3 (v0.4 substitui a v0.1, que era um sistema de gestão) · **Data:** não informada
**Decisão:** O ROTA é um conjunto de ferramentas de apoio à elaboração/verificação de tabelas operacionais; não conhece status, fluxo nem aprovação.
**Motivo:** Toda a gestão formal já ocorre no SEI; duplicá-la criaria duas fontes de verdade.
**Consequências:** sem modelo de estado, sem permissões, sem histórico; a v0.1 da Spec 01/02 ficou obsoleta na parte de workflow.
**Impacto em implementação:** RN-095; schema fechado; checklist de escopo; nenhum módulo de tramitação jamais.

## DEC-002 — SEI conduz todo o fluxo formal

**Status:** Aceita · **Origem:** Spec 01 §1, §3 · **Data:** não informada
**Decisão:** Pedido, pendência, concordância, aprovação, publicação, vigência e arquivamento acontecem no SEI, fora do ROTA; a empresa peticiona os artefatos (PDF + JSON) no SEI.
**Motivo:** O SEI é o sistema oficial do processo administrativo.
**Consequências:** ROTA gera artefatos; PDFs carregam aviso de que não substituem a publicação oficial.
**Impacto em implementação:** RN-077, RN-095.

## DEC-003 — Três ferramentas desacopladas

**Status:** Aceita · **Origem:** Spec 01 §2 · **Data:** não informada
**Decisão:** Formulário, Comparador e Ingestor (futuro) não compartilham estado; o único contrato entre elas é o JSON de operação.
**Motivo:** Independência de evolução e implantação; leitura estática confiável.
**Consequências:** nada do Formulário exige o Comparador (e vice-versa); Ingestor não é pré-requisito de nada.
**Impacto em implementação:** RN-097; separação de módulos; lint arquitetural sugerido.

## DEC-004 — JSON é o contrato central

**Status:** Aceita · **Origem:** Spec 01 §5; Spec 02 §1 · **Data:** não informada
**Decisão:** O JSON é fotografia completa e autossuficiente da operação de um Autos; só dados de operação; versionado por `versao_schema`.
**Motivo:** Permitir que três ferramentas independentes (e o SEI, como transporte) operem sem cadastro compartilhado.
**Consequências:** toda evolução de dado passa pela Spec 02 primeiro.
**Impacto em implementação:** RN-008..010; testes de contrato.

## DEC-005 — Formulário não persiste no servidor

**Status:** Aceita · **Origem:** Spec 01 §2, §5, §8 · **Data:** não informada
**Decisão:** Exportar o JSON é salvar; retomar é reimportar; backend praticamente inexistente; roteamento, cálculos e PDF são client-side.
**Motivo:** Zero gestão + simplicidade de implantação + o artefato oficial vive no SEI.
**Consequências:** sem autosave em servidor; a responsabilidade pelo arquivo é do usuário.
**Impacto em implementação:** RN-096; nenhum endpoint de escrita.

## DEC-006 — Comparador é ferramenta separada e somente-leitura

**Status:** Aceita · **Origem:** Spec 01 §2, §8; Spec 05 §1–§2 · **Data:** não informada
**Decisão:** Recebe dois JSONs, mostra diff, gera PDF comparativo próprio; não altera arquivos, não chama OSRM, não persiste nada.
**Motivo:** O comparativo não é dado de operação — não pertence ao JSON nem ao Formulário.
**Consequências:** comparativo nunca é gravado no JSON.
**Impacto em implementação:** RN-080, RN-092.

## DEC-007 — Ingestor é futuro

**Status:** Aceita · **Origem:** Spec 01 §2, §10 (Spec 06 pendente) · **Data:** não informada
**Decisão:** A ingestão no PostgreSQL oficial fica para depois; não faz parte do fluxo inicial de aprovação.
**Motivo:** O valor imediato está no Formulário e no Comparador; o banco oficial exige spec própria.
**Consequências:** qualquer código de Ingestor antes da Spec 06 + decisão humana é violação (RN-093).
**Impacto em implementação:** TASK-040 bloqueada.

## DEC-008 — UUID estável é a identidade

**Status:** Aceita · **Origem:** Spec 01 §6; Spec 02 §12 (fechou UUID em Viagem — questão nº 1 da Spec 01 §9) · **Data:** não informada
**Decisão:** Seção, Serviço, Local e Viagem carregam UUIDv4 gerada na criação (client-side), única no documento inteiro, nunca regenerada.
**Motivo:** Sem identidade estável o Comparador não distingue "alterou" de "removeu e recriou"; no Ingestor, a UUID vira chave do banco.
**Consequências:** unicidade global mesmo para Local; cópias são entidades novas.
**Impacto em implementação:** RN-001..005, RN-007; suíte de regressão permanente.

## DEC-009 — `numero_n` é apenas display

**Status:** Aceita · **Origem:** Spec 01 §6; Spec 02 §6, §12 · **Data:** não informada
**Decisão:** `numero_n` é sequencial por ordem de cadastro, potencialmente reaproveitável, e nunca é chave.
**Motivo:** Rótulos humanos mudam; identidade não pode depender deles.
**Impacto em implementação:** RN-006; diff casa por UUID e exibe `antigo → novo` quando o rótulo muda.

## DEC-010 — Importação preserva UUID

**Status:** Aceita · **Origem:** Spec 01 §6 ("regra dura"); Spec 02 §12; Spec 04 §3.1 · **Data:** não informada
**Decisão:** Importar preserva todas as UUIDs; só entidades novas da sessão ganham UUID nova.
**Motivo:** Se o Formulário regenerasse UUIDs, o diff viraria "removeu tudo e criou tudo".
**Impacto em implementação:** RN-004; teste de round-trip obrigatório; alerta de UUIDs não preservadas no Comparador (RN-086).

## DEC-011 — OSRM indisponível bloqueia rota não calculada

**Status:** Aceita · **Origem:** Spec 01 §8; Spec 03 §3.5 · **Data:** não informada
**Decisão:** Sem rota OSRM válida não se prossegue (sem fallback de linha reta); mensagens específicas por tipo de erro; 1 retry só em falha de rede; **a mensagem não menciona tarifa** (Spec 03 corrigiu a leitura da Spec 01).
**Motivo:** A distância roteada alimenta a tarifa — rota não calculada tornaria a tabela inválida.
**Impacto em implementação:** RN-048, RN-049; pendência bloqueante de exportação.

## DEC-012 — Pontos de rota não são paradas

**Status:** Aceita · **Origem:** Spec 01 §8; Spec 02 §10.4, §13 item 19; Spec 03 §3.6 · **Data:** não informada
**Decisão:** Vértices de forçamento de traçado: sem `uuid`, sem tarifa, fora de matrizes e da regra dos 350 m; persistidos só para reproduzir a rota; nunca alteram a contagem de trechos.
**Motivo:** O traçado do OSRM nem sempre é o percurso real do ônibus; era preciso forçar sem poluir o domínio.
**Impacto em implementação:** RN-041..043, RN-051.

## DEC-013 — Seção e Local são entidades distintas

**Status:** Aceita · **Origem:** Spec 01 §8; Spec 02 §2, §13 itens 5–7 (elimina o campo `papel` do desenho anterior) · **Data:** não informada
**Decisão:** Seção = entidade do Autos, compartilhada, com tarifa (cluster 350 m por centroide); Local = entidade do Serviço, sem tarifa (350 m pareado). O tipo do ponto é dado pela coleção que o contém.
**Motivo:** Papéis contextuais geravam ambiguidade; a matriz de distâncias exige Seção compartilhada no Autos.
**Impacto em implementação:** RN-025..032.

## DEC-014 — JSON não contém workflow (exceção estreita: `status`+data)

**Status:** Aceita · **Origem:** Spec 01 §3; Spec 02 §4.1, §13 item 18, §16 · **Data:** não informada
**Decisão:** Nenhum campo de fluxo no JSON; única exceção é `autos.status` (`proposta`/`vigente`) com data condicional — autodeclaração de arquivo, fora do diff.
**Motivo:** Comparador/Ingestor precisam saber o que estão lendo sem convenção de nome de arquivo.
**Impacto em implementação:** RN-010..012; schema fechado; teste negativo de campos de fluxo.

## DEC-015 — PDF operacional ≠ PDF comparativo

**Status:** Aceita · **Origem:** Spec 01 §8; Spec 04 §13; Spec 05 §17 · **Data:** não informada
**Decisão:** Dois artefatos distintos, um por ferramenta, cada um com estrutura própria; ambos client-side, sem R$, sem offsets, com aviso SEI.
**Impacto em implementação:** RN-074..077, RN-092.

## DEC-016 — Viagem estratificada por dia

**Status:** Aceita · **Origem:** Spec 02 §11/§13 item 21 (v0.6, induzida pela Spec 04 §8); supera o item 20 (enum binário `regra_feriado`) · **Data:** não informada
**Decisão:** Cada Viagem = uma partida em um único `dia_semana`, com `viagem_feriado` booleano; substitui `dias_semana[]` + `regra_feriado`.
**Motivo:** Uma célula da grade = uma Viagem (objeto simples); permite offsets diferentes por dia.
**Consequências:** grade de feriados própria que substitui integralmente a comum no dia; feriado fora das contagens.
**Impacto em implementação:** RN-061, RN-068..072.

## DEC-017 — Município derivado da geolocalização

**Status:** Aceita · **Origem:** Spec 02 §13 item 22; Spec 03 §2.3 (v0.2, induzida pela Spec 04 §7.1) · **Data:** não informada
**Decisão:** `municipio` de Seção/Local é derivado por ponto-em-polígono (base estática de SP), somente-leitura, congelado no JSON; fallback 2 km; fora de SP bloqueia.
**Motivo:** Elimina digitação inconsistente e sustenta o padrão visual `Cidade - Nome da Seção`.
**Impacto em implementação:** RN-029; recursos estáticos empacotados.

## DEC-018 — Regra dos 350 m por centroide cumulativo (Seção) e pareada (Local)

**Status:** Aceita · **Origem:** Spec 02 §5.2, §13 itens 8–9; Spec 03 §7 (fecha a questão nº 5 da Spec 01 §9) · **Data:** não informada
**Decisão:** Seção: validação incremental com centroide resultante (média simples de lat/lon; Haversine R=6.371.000); Local: pareada Ida×Volta ≤ 350 m; leitores usam checagem estática fraca.
**Impacto em implementação:** RN-027, RN-028, RN-032; TASK-009/010.

## DEC-019 — Horário por offset na Viagem

**Status:** Aceita · **Origem:** Spec 02 §11.1, §13 itens 3/15 (fecha a questão nº 3 da Spec 01 §9) · **Data:** não informada
**Decisão:** `offset_horario` pertence à Viagem (não à Parada), resolvido em absoluto por `horario_saida + offset`; usuário digita horários de relógio; sugestão por acúmulo de durações; redistribuição proporcional entre âncoras; reset.
**Motivo:** O trânsito faz o tempo variar entre viagens do mesmo itinerário.
**Impacto em implementação:** RN-063..067.

## DEC-020 — Ida e Volta compartilham o conjunto de Seções

**Status:** Aceita · **Origem:** Spec 01 §8; Spec 02 §2, §8, §14 · **Data:** não informada
**Decisão:** Quando os dois itinerários existem, referenciam o mesmo conjunto de Seções; divergência real → dois Serviços unidirecionais.
**Motivo:** Garante que todo par de Seções é alcançável em ao menos um itinerário (matriz sempre satisfazível).
**Impacto em implementação:** RN-030, RN-056.

## DEC-021 — Matrizes: distâncias computada, seccionamento confirmado

**Status:** Aceita · **Origem:** Spec 02 §8–§9, §13 itens 10–11, 17; Spec 03 §4–§6 · **Data:** não informada
**Decisão:** `matriz_distancias` é computada/congelada (todas as combinações, intra-Serviço, `valor_adotado` = média half-up); `matriz_seccionamento` guarda o valor confirmado pelo usuário, com duas sugestões de UI (menor entre Serviços; do próprio Serviço).
**Impacto em implementação:** RN-054..060.

## DEC-022 — Tarifa em R$ é externa; sem R$ nesta versão

**Status:** Aceita · **Origem:** Spec 02 §13 item 12, §16; Spec 03 §11; Spec 04 §2.8 · **Data:** não informada
**Decisão:** Conversão distância→R$ por portaria, fora do ROTA; JSON nunca guarda R$; nesta versão nem UX nem PDF exibem valores monetários.
**Impacto em implementação:** RN-013; teste de ausência de "R$" nos PDFs.

## DEC-023 — Descrição textual do itinerário por vias

**Status:** Aceita · **Origem:** Spec 02 §10.5, §13 item 23 (v0.7); Spec 03 §3.7 (v0.3); Spec 04 §7.4/§13.4 · **Data:** não informada
**Decisão:** `rota.descricao_itinerario` (texto + itens): só Seções e vias; Locais fora; derivada, congelada, recalculada com a rota; vias sem nome omitidas; sem edição manual nesta versão.
**Impacto em implementação:** RN-044..046, RN-053.

## DEC-024 — Comparação por sinais estáveis e bloqueio de Autos diferentes

**Status:** Aceita · **Origem:** Spec 04 §18; Spec 05 §4.4, §15.3, §20 · **Data:** não informada
**Decisão:** Rota comparada por paradas/pontos de rota (efeito)/distância com tolerância/`itens` — nunca geometria byte-a-byte; comparação principal exige o mesmo `autos.codigo`.
**Impacto em implementação:** RN-084, RN-087.

## DEC-025 — OSRM público no desenvolvimento; auto-hospedado como requisito de produção

**Status:** Superada em parte por DEC-029 (2026-07-07) — produção também usa o demo público por ora · **Origem:** Spec 01 §8; Spec 04 §7.3 (nota) e §16 item 12 · **Data:** não informada
**Decisão:** `router.project-osrm.org` (demo, sem SLA) serve ao desenvolvimento; produção exige instância própria ou provedor com SLA, sem mudar o contrato da Spec 03 §3.
**Impacto em implementação:** URL configurável; nenhuma dependência de comportamento exclusivo do demo.

## DEC-026 — Códigos de característica de veículo definitivos: sem `SL`; partição fechada por litoralidade

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (tabela da revisão P2, `docs/specs/old/REVISAO-specs-01-02-03.md`, com `MX` unificado); aplicada às Spec 01 v0.6 §7, Spec 02 v0.9 §6, Spec 03 v0.5 §10 e Spec 04 v0.3 (exemplos) · **Data:** 2026-07-07
**Decisão:** O código `SL` (Semileito) **não existe**. O enum rodoviário definitivo é: `CR` (Convencional Rodoviário), `CL` (Convencional Rodoviário Litorâneo), `EX` (Executivo), `LE` (Leito), `ME`/`MEL` (misto convencional/convencional litorâneo + executivo), `ML`/`MLL` (misto convencional/convencional litorâneo + leito), `MX` (misto executivo + leito — mesmo código nos dois tipos, pois executivo e leito não têm forma litorânea) e `MM`/`MML` (misto convencional/convencional litorâneo + executivo + leito). Partição por tipo fechada: `Rodoviário` = `CR`, `EX`, `LE`, `ME`, `ML`, `MX`, `MM`; `Rodoviário Litorâneo` = `CL`, `EX`, `LE`, `MEL`, `MLL`, `MX`, `MML`. Exemplos de `numero_n` passam a usar `0000-1CR`.
**Motivo:** A partição código-a-código dos mistos estava em aberto (Q-001) e o enum antigo continha códigos inexistentes (`SL`, `MEXR`, `MLES`, `MEXS`, `MROS`); siglas curtas e todas cadastráveis. Supera a revisão preliminar do mesmo dia que usava `RO`/`ROL` e mistos "M\*" longos.
**Consequências:** resolve a Q-001; exclusividade por litoralidade em códigos distintos (`CR`×`CL`, `ME`×`MEL`, `ML`×`MLL`, `MM`×`MML`); `EX`/`LE`/`MX` neutros à litoralidade.
**Impacto em implementação:** RN-019, RN-021, RN-022 atualizadas; módulo de tipificação (TASK-008) desbloqueado; enum do schema (TASK-003) e fixtures usam a lista nova.

## DEC-027 — Spec 03 §3.7.3 corrigida: Locais não participam de `matriz_distancias`

**Status:** Aceita · **Origem:** Spec 03 §3.7.3 (edição pontual autorizada pelo responsável pelo domínio) · **Data:** 2026-07-07
**Decisão:** O §3.7.3 deixa de afirmar que Locais "continuam existindo normalmente em `matriz_distancias`"; passa a dizer que Locais **não** aparecem no texto da descrição nem em `itens`, remetendo a Spec 02 §8 para o tratamento de Locais (seus trechos são somados nas distâncias entre Seções, §4.2 — não geram par próprio na matriz).
**Motivo:** Redação anterior conflitava com Spec 02 §8 (pares de `matriz_distancias` são só entre Seções) e RN-054/055; risco de uma IA criar pares com `local_uuid`.
**Consequências:** resolve a Q-002 pela opção recomendada (correção de redação); sem mudança de comportamento, só de texto.
**Impacto em implementação:** nenhum module novo; elimina ambiguidade para implementações futuras de `matriz_distancias` e da descrição textual.

## DEC-028 — Stack de bibliotecas: zod + @react-pdf + Vitest/Playwright

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção recomendada na Q-003 · **Data:** 2026-07-07
**Decisão:** Validação de schema com zod (modo strict, rejeita campos extras — RN-010); geração de PDF client-side com @react-pdf; testes unitários com Vitest e end-to-end com Playwright.
**Motivo:** Stack madura, strict-mode nativo no zod, boa integração com React/Next.js já fixado na Spec 01 §8.
**Consequências:** resolve a Q-003; desbloqueia TASK-001/003/033.
**Impacto em implementação:** dependências fixadas para validação de schema, PDF e testes; RN-008..015.

## DEC-029 — OSRM de produção: manter o demo público temporariamente

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 3 da Q-007 (revista) · **Data:** 2026-07-07
**Decisão:** Produção continua usando `router.project-osrm.org` (demo público, sem SLA) por ora. Self-hosted/provedor gerenciado fica para quando o volume justificar.
**Motivo:** Uso client-side com baixíssimo volume — cerca de 70 empresas, cada uma usando o sistema ~4–5 vezes por mês (≈300–350 requisições/mês no total). O custo/complexidade de hospedar OSRM próprio não se justifica nesse volume.
**Consequências:** revoga a parte de DEC-025 que exigia instância própria/SLA para produção; mantém a URL configurável (nenhuma dependência de comportamento exclusivo do demo, contrato da Spec 03 §3 inalterado) para permitir migração futura sem refatoração.
**Impacto em implementação:** nenhuma mudança de código necessária agora; reavaliar se o volume crescer (ex.: mais empresas, uso mais frequente) ou se o demo público ficar instável.

## DEC-030 — Schema das listas estáticas (Autos/empresas/tipos) e base de municípios

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 1 da Q-005 · **Data:** 2026-07-07
**Decisão:** Arquivo único `data/autos_empresas.json` — `{versao_schema, tipos:[{codigo,descricao}], empresas:[{id,nome}], autos:[{codigo,tc,denominacao_linha,empresa_id,tipo,operante}]}` — gerado a partir de `Autos_por_empresa.csv` pelo script `scripts/gerar_dados_estaticos.py`. `tipo` usa os 4 valores macro já fixados na Spec 01 §8 (`Semiurbano`, `Semiurbano Litorâneo`, `Rodoviário`, `Rodoviário Litorâneo` — não o enum código-a-código de linha da Q-001/DEC-026), mapeados da coluna `caracteristica` do CSV: `Semiurbana`→`Semiurbano`, `Semiurbana Litorânea`→`Semiurbano Litorâneo`, `Rodoviária Convencional`→`Rodoviário`, `Rodoviária Litorânea`→`Rodoviário Litorâneo`; o único caso residual do CSV, `Rodoviário Executivo` (1 registro), foi inferido como `Rodoviário` (família não-litorânea — `EX` não tem forma litorânea própria, Spec 01 §8 linha 154/160). A flag `operante` (Spec 04 §3.1) nasce `true` para todos os 1.280 Autos, a ajustar manualmente depois. Empresa é referenciada por `empresa_id` (slug do nome) em vez de nome repetido, evitando divergência de grafia entre registros da mesma empresa.
Base de municípios: arquivo separado `data/municipios.json` — `{versao_schema, municipios:[{codigo_ibge,nome,populacao_residente,estado}]}`, gerado de `pop_municipios.csv` pelo mesmo script. Fica separado de `municipios_sp.geojson` (que só tem `codarea`/geometria); os dois se casam por `codigo_ibge`/`codarea` no momento da derivação automática de município de Seções/Locais (Spec 03 §2.3).
**Motivo:** Arquivo único para Autos/empresas/tipos facilita o pré-encadeamento de seleção da Spec 04 §5 (uma única fonte já carregada); vínculo explícito por id evita ambiguidade de nome de empresa. Municípios ficam à parte porque servem um propósito diferente (geolocalização, não o formulário de Autos) e têm formato de origem próprio (CSV de população, sem geometria).
**Consequências:** resolve a Q-005; desbloqueia TASK-002/013/015. Reexecutar `scripts/gerar_dados_estaticos.py` sempre que os CSVs de origem mudarem (novos Autos, novos municípios). A flag `operante` exige revisão humana antes de uso em produção — nenhum dos 1.280 registros foi verificado individualmente.
**Impacto em implementação:** `data/autos_empresas.json`, `data/municipios.json`, `scripts/gerar_dados_estaticos.py` criados; RN-017 (identidade obsoleta) passa a ter os campos de que depende.

## DEC-031 — Distância ponto→fronteira no fallback de município: ponto→segmento

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 1 (recomendada) da Q-006 · **Data:** 2026-07-08
**Decisão:** No fallback de borda da derivação de município (Spec 03 §2.3), a distância do ponto à **fronteira** de um município é a **distância mínima ponto→segmento** — o menor `haversine(ponto, ponto-mais-próximo-do-segmento)` sobre todos os segmentos de todos os anéis do polígono da feature —, com **curto-circuito por bounding box** (pula a feature cujo limite inferior de distância à sua caixa envolvente já supera o menor valor corrente). **Não** se usa distância aos vértices (opção 2): erra em segmentos longos, medindo a um vértice distante quando a projeção sobre a aresta está muito mais perto. O teto de **2 km** e o erro bloqueante "fora de SP" acima dele (mensagem na Spec 04 §14) permanecem inalterados.
**Motivo:** A Spec 03 §2.3 diz "fronteira com a menor distância Haversine ao ponto", mas não fixava se a fronteira é amostrada por vértices ou por segmentos. Ponto→segmento é a leitura geometricamente correta de "distância a uma fronteira" (uma poligonal é o conjunto de seus segmentos, não só de seus vértices) e evita divergência entre implementações em pontos de borda com arestas longas.
**Consequências:** resolve a Q-006; desbloqueia por completo a TASK-011 (o fallback de borda e o retorno "fora de SP" ficam determinísticos).
**Impacto em implementação:** RN-029; a função `MUNICIPIO(ponto)` (`shared/geo/`) calcula distância à fronteira por ponto→segmento com projeção equirretangular local (correção de meridiano por `cos(lat)`) e distância final em Haversine (§2.1). Caso raro (ponto fora de todos os 645 polígonos); a otimização por bounding box mantém o custo baixo.

## DEC-032 — 350 m pareado de Local nos leitores estáticos: alerta técnico, não bloqueante

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 1 (recomendada) da Q-013 · **Data:** 2026-07-09
**Decisão:** Em qualquer leitor estático de JSON de origem desconhecida (import do Formulário, Comparador, Ingestor), a violação da regra dos 350 m pareada de Local (RN-032 — distância Haversine entre `geolocalizacao_ida` e `geolocalizacao_volta` do mesmo Local > 350 m) gera **alerta técnico não bloqueante**, exatamente como a checagem estática fraca de Seção (RN-028; Spec 05 §4.1). **Não** bloqueia o carregamento nem a comparação. A validação **bloqueante** da regra dos 350 m permanece apenas no gesto de edição do Formulário (RN-027 incremental de Seção; checagem pareada ao inserir/arrastar Local), onde há a ação do usuário a recusar.
**Motivo:** A Spec 05 §4.1 nomeia como alerta técnico a checagem fraca de Seção por centroide, mas não tem linha dedicada ao pareado de Local; a RN-091 descreve genericamente "350 m estático … (alertas técnicos)" e a Spec 03 §7.4 diz que a checagem pareada "vale … na checagem estática (Comparador/Ingestor)". Tratar o Local (parada secundária, sem relevância tarifária — RN-031) como mais rígido que a Seção seria incoerente. Um leitor não tem o gesto de inserção para recusar; apenas sinaliza.
**Consequências:** resolve a Q-013; confirma a inferência controlada adotada na TASK-012 e vincula a TASK-035 (Comparador) e o futuro Ingestor à mesma severidade — nenhum leitor bloqueia por 350 m (nem de Seção nem de Local).
**Impacto em implementação:** RN-032 (parte leitor) e RN-028; `shared/checagens-leitor` (`coletarAlertas350mLocal` emite alerta técnico, não bloqueio). Sem mudança de spec necessária — a decisão é a leitura coerente da Spec 05 §4.1 combinada com a Spec 03 §7.4.

## DEC-033 — Destino de navegação de pendências sem entidade única de origem: etapa Revisão

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção (a) (recomendada) da Q-014; Spec 04 §4, §11 · **Data:** 2026-07-09
**Decisão:** No painel de pendências do Formulário (Spec 04 §4/§11), uma pendência clicável cuja origem **não é uma entidade única** navega para a etapa **Revisão**. O caso concreto é o alerta "documento criado do zero" (Spec 04 §11 — ausência de preservação de identidade, §3.2), que é propriedade do documento inteiro. Pendências ligadas a uma entidade específica (Seção, Serviço, Local, Viagem, itinerário) **continuam** levando à sua etapa/entidade de origem, como manda a §11; esta decisão cobre apenas os alertas de escopo global do documento.
**Motivo:** A §11 torna cada pendência clicável "levando à etapa/entidade correspondente", mas o alerta de documento-do-zero não tem entidade única — é uma propriedade do documento. A tela de Revisão (§11) é onde a própria spec lista esse alerta, tornando-a o destino natural e coerente; evita apontar para um lugar arbitrário.
**Consequências:** resolve a Q-014; remove a inferência controlada pendente na análise da TASK-014 e desbloqueia a implementação do painel de pendências. Baixo impacto (só UX de navegação); nenhuma mudança de spec (é leitura coerente da §11).
**Impacto em implementação:** RN-078 (estrutura do painel de pendências); TASK-014 (`formulario/` — coletor de pendências / `PainelPendencias`): o alerta "documento criado do zero" recebe `etapaAlvo = revisao`.

## DEC-034 — Trocar o `tipo` do Autos: reconversão automática ao padrão do tipo, nunca bloqueio

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção (a) (recomendada) da Q-015; corrige Spec 04 §5 e Spec 03 §10.4 · **Data:** 2026-07-09
**Decisão:** O `tipo` do Autos é **editável a qualquer momento** no Formulário — tanto num documento criado do zero quanto num JSON carregado (`codigo` e `empresa` continuam não editáveis após criado o documento). Ao trocar o `tipo`, cada Serviço cuja `caracteristica_veiculo` não pertença ao conjunto do novo tipo (Spec 03 §10.2) é **reconvertido automaticamente para a forma convencional (padrão) do tipo**: `Rodoviário`→`CR`, `Rodoviário Litorâneo`→`CL`, `Semiurbano`→`SU`, `Semiurbano Litorâneo`→`SUL`. A operação **nunca bloqueia**; exibe um **aviso** listando os Serviços que mudaram. A reconversão é sempre ao padrão (não há remapeamento por código, p.ex. `ME`→`MEL` — descartado na Q-015 opção (c)).
**Motivo:** A Spec 04 §5 era internamente contraditória (`tipo` "não editável após criado" × "trocar o tipo → bloqueio/alerta") e o comportamento de bloqueio estava errado do ponto de vista operacional: o responsável pelo domínio determinou que o operador deve poder corrigir o `tipo` e ter os Serviços ajustados sozinhos, sem barreira. No semiurbano a reconversão é trivial (o veículo já é único — `SU`/`SUL`); no rodoviário a forma convencional (`CR`/`CL`) é o padrão natural.
**Consequências:** resolve a Q-015 e a contradição da §5. **Não** toca o contrato JSON (RN-008..015 intactas): a reconversão só troca `caracteristica_veiculo` entre valores válidos do enum, sem campo novo. O leitor estático (RN-019..022, TASK-012) segue igual — documentos exportados continuam coerentes, porque a reconversão acontece na edição.
**Impacto em implementação:** RN-023 reescrita (bloqueio/alerta → reconversão ao padrão + aviso); Spec 04 §5 (v0.4) e Spec 03 §10.4 (v0.6) corrigidas; `02-DOMAIN_MODEL` e `03-TRACEABILITY_MATRIX` atualizados; TASK-008 (`shared/tipificacao`) ganha `caracteristicaPadrao(tipo)` e `reconverterServicosParaTipo(...)` com testes; TASK-015 (etapa Identificação) implementa a edição do `tipo` com o aviso de reconversão.

## DEC-035 — Serviço em construção na etapa Serviços: subconjunto de sessão efêmero, não `Servico` completo

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção (a) (recomendada) da Q-016; Spec 02 §6, §14; Spec 04 §6 · **Data:** 2026-07-09
**Decisão:** Na etapa Serviços do Formulário (TASK-016), um Serviço criado do zero é mantido como **estado de sessão efêmero** — um `ServicoEmConstrucao` com o subconjunto de campos definíveis nesta etapa (`uuid`, `numero_n`, `caracteristica_veiculo`, `carater` e a direcionalidade de [[Q-017]]/DEC-036) — e **não** como um `Servico` completo do schema, porque `itinerarios` (≥ 1, com paradas/rota/viagens) e `matriz_distancias` só são produzidos nas etapas seguintes (mapa/matrizes/viagens, TASK-017+). O `ServicoEmConstrucao` é promovido a `Servico` completo quando essas etapas preencherem o restante. No **modo carregado**, o CRUD opera diretamente sobre os `Servico` completos já existentes no documento. A lógica pura de **duplicar** (RN-007) opera sobre o `Servico` completo do schema, independentemente da UI dos dois modos.
**Motivo:** Um `Servico` schema-válido exige `itinerarios`/`matriz_distancias` que ainda não existem na etapa Serviços; montar um `Servico` com esses arrays vazios violaria o schema (`min(1)`). O subconjunto efêmero espelha o precedente `IdentidadeAutos` (subconjunto de `autos` mantido em sessão enquanto o documento ainda não é válido — DEC-014/RN-018).
**Consequências:** resolve a Q-016. **Não** cria campo de contrato (RN-008..015 intactas): é estado de memória, nunca gravado no JSON (RN-096/NEG-004). Desbloqueia a TASK-016; define a forma que as tasks de mapa/matrizes/viagens (TASK-017/019/026/027) consumirão para completar o Serviço.
**Impacto em implementação:** RN-001..007, RN-018, RN-024; `formulario/sessao.ts` (novo tipo `ServicoEmConstrucao` no modo novo); `formulario/servicos/` (UI + duplicar/remover puros). Sem mudança de spec.

## DEC-036 — Direcionalidade (Ida/Volta/ambos) é estado de sessão efêmero, não campo de contrato

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção (a) (recomendada) da Q-017; Spec 04 §6; Spec 02 §6, §10 · **Data:** 2026-07-09
**Decisão:** A direcionalidade pedida na criação do Serviço (Spec 04 §6 — Ida, Volta ou ambos) é mantida como **estado de sessão efêmero** no Serviço em construção (DEC-035), consumido pela etapa de mapa para criar 1 ou 2 `itinerarios` no(s) sentido(s) escolhido(s). **Nunca** é gravada no JSON — no documento, a direcionalidade é _derivada_ de quais `itinerarios[].sentido` existem. No **modo carregado**, a direcionalidade é apenas **lida** dos `itinerarios` presentes (exibição), não reescrita na etapa Serviços.
**Motivo:** A direcionalidade não é campo do contrato (Spec 02 §6 não a tem); gravá-la seria inventar campo de fluxo/estrutura (proibido — RN-008..015). Mas a §6 a pede no ato de criação, antes de existirem itinerários — logo precisa de um lar temporário até a etapa de mapa materializá-la em `itinerarios`.
**Consequências:** resolve a Q-017. Casa com DEC-035 (a direcionalidade é um dos campos do `ServicoEmConstrucao`). A etapa de mapa (TASK-017/019) lê esse estado para instanciar os itinerários; nenhum campo novo no JSON.
**Impacto em implementação:** RN-008..015 (fronteira do contrato preservada); `formulario/sessao.ts` (campo de direcionalidade em `ServicoEmConstrucao`); TASK-017/019 consomem o estado. Sem mudança de spec.

## DEC-037 — `numero_n`: sufixo regenerado quando a `caracteristica_veiculo` muda

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A (recomendada) da Q-018; Spec 02 §6; Spec 03 §10.3 regra 5; RN-006; DEC-034 · **Data:** 2026-07-09
**Decisão:** Sempre que a `caracteristica_veiculo` de um Serviço mudar — por **edição direta** na etapa Serviços (TASK-016) ou por **reconversão** na troca de tipo do Autos (RN-023/DEC-034) — o Formulário **regenera o sufixo** do `numero_n` para a nova característica, **preservando o número sequencial** (ex.: `"0000-1ME"` reconvertido `ME`→`CL` vira `"0000-1CL"`). O `numero_n` permanece **editável**: regenera por padrão, mas o usuário pode sobrescrever. Isso fecha a ponta solta deixada na TASK-015, onde a reconversão (`formulario/identificacao/reconversao.ts`) só reescrevia `caracteristica_veiculo` e deixava o `numero_n` inconsistente.
**Motivo:** O `numero_n` embute a característica como sufixo (formato `"0000-NXX"`, exemplo `"0000-1CR"` — Spec 02 §6); um sufixo que contradiz a característica real é pior que a natureza "reaproveitável/display" do campo. Regenerar não viola nenhuma RN: `numero_n` **nunca é identidade** (RN-006 — a identidade é a `uuid`) e não é campo de contrato de fluxo. A Spec 02 §6 dá o formato mas não fixava a regra de manutenção do sufixo — esta decisão a fixa.
**Consequências:** resolve a Q-018. Ajuste retroativo na TASK-015: `reconversao.ts` passa a atualizar o `numero_n` além da `caracteristica_veiculo` (com o mesmo aviso). A TASK-016 aplica a mesma regra no caminho de edição direta e na sugestão inicial de `numero_n` (sequencial por ordem de cadastro + sufixo da característica — Spec 03 §10.3 regra 5). Nenhuma mudança de contrato JSON.
**Impacto em implementação:** RN-006, RN-023/DEC-034; `formulario/servicos/` (sugestão e edição de `numero_n`), `formulario/identificacao/reconversao.ts` (regenerar sufixo na reconversão) e seus testes (atualizar fixtures que usem `numero_n` simplificado para exercitar o sufixo). Sem mudança de spec.

## DEC-038 — Rótulo do `NoSegment`: índice best-effort no cliente, composição de `[Cidade - Nome]` na camada com identidade

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 1 (recomendada) da Q-019; Spec 04 §14; Spec 03 §3.5; RN-048/049 · **Data:** 2026-07-13
**Decisão:** O cliente OSRM (`solicitarRota`), que recebe só coordenadas nuas (`readonly Ponto[]`), devolve na falha `NoSegment` um `indiceCoordenada?` **best-effort** (`undefined` quando o OSRM não expõe o índice — o `message` é texto livre, não contratual) e emite a mensagem **interina** `A parada nº N…`/genérica. A composição do rótulo definitivo `A parada [Cidade - Nome]…` (Spec 04 §14) cabe à **camada com identidade das paradas** (pendências/UI), que consome esse índice. Com pontos de rota (Spec 03 §3.6), se a coordenada rejeitada for um ponto de rota, `indiceCoordenada` fica `undefined` (mensagem genérica).
**Motivo:** `Cidade - Nome` é identidade de Seção/Local, indisponível na camada que fala com o OSRM (que só conhece coordenadas — RN-047). Fazer _probe_ por parada (opção 2) traz chamadas extras fora do §3.5; parsear o `message` como fonte primária (opção 3) é frágil e não contratual. Delegar a composição preserva o desacoplamento de camadas.
**Consequências:** resolve a Q-019. Implementada na TASK-022 (`roteamento/falhas-osrm.ts`, `roteamento/cliente-osrm.ts`). A camada que compõe `[Cidade - Nome]` é a das pendências/UI (TASK-044+). Nenhum campo novo no contrato JSON (`message?` é recorte do envelope OSRM, não da Spec 02).
**Impacto em implementação:** RN-048/049; `formulario/roteamento/` (taxonomia + índice best-effort); TASK-044+ (composição do rótulo com identidade). Sem mudança de spec.

## DEC-039 — Timeout da requisição OSRM: default 15 s, ajustável

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 1 (recomendada) da Q-020; Spec 03 §3.5; DEC-029 · **Data:** 2026-07-13
**Decisão:** A requisição ao OSRM usa um timeout próprio (via `AbortController`) com **default de 15 s**, **ajustável por chamada** (`timeoutMs`), espelhando a configurabilidade da URL base (DEC-029). O estouro do timeout é o gatilho da falha `indisponivel` re-tentável (1 retry, Spec 03 §3.5).
**Motivo:** A Spec 03 §3.5 cita "timeout" como gatilho de retry mas não fixa duração; sem timeout próprio, a UX dependeria do timeout indeterminado do runtime e o retry único não teria gatilho previsível. Um default parametrizável não inventa regra de negócio — é parâmetro de operação, coerente com a URL base configurável.
**Consequências:** resolve a Q-020. Implementada na TASK-022 (`roteamento/cliente-osrm.ts`, `OSRM_TIMEOUT_PADRAO_MS = 15_000`). Nenhum impacto no contrato JSON.
**Impacto em implementação:** RN-048; `formulario/roteamento/cliente-osrm.ts` (constante + opção `timeoutMs`). Sem mudança de spec.

## DEC-040 — Pendência bloqueante de rota ausente: taxonomia na TASK-022, entrada de pendência deferida à TASK-044

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção 1 (recomendada) da Q-021; Spec 03 §3.5; Spec 04 §11; RN-048/078 · **Data:** 2026-07-13
**Decisão:** A TASK-022 entrega **só** a taxonomia de falha do OSRM + a camada de mensagens (§14, sem menção a tarifa). A **entrada de pendência bloqueante** "itinerário sem rota válida" em `coletarPendencias` é **deferida à TASK-044**, que consome o estado de rota ao vivo introduzido pela TASK-024. A TASK-044 já está **criada e ordenada** (024 → 044), garantindo que a parcela deferida de RN-048/078 será implementada assim que houver caso computável de "sem rota" — não fica órfã.
**Motivo:** Ao tempo da TASK-022 não existia modelo de estado de rota em edição ao vivo: no modo carregado todo itinerário do `documento` schema-válido já tem `rota`, e itinerários em construção só surgem na TASK-017+/TASK-024. Antecipar a pendência contra dados inexistentes arriscaria fabricar modelo (viola docs-dev/04 princípio 2).
**Consequências:** resolve a Q-021. Corrige o `TODO` desatualizado em `pendencias.ts:61` (crédito a "TASK-022/024") — a correção pertence à TASK-044. O gate de exportação em si (RN-078) permanece com a TASK-032. Casa com a DEC-041 (o estado ao vivo que a TASK-044 lê é o da TASK-024).
**Impacto em implementação:** RN-048/078; `formulario/pendencias/pendencias.ts` (entrada de pendência — TASK-044); depende do estado de rota ao vivo da TASK-024. Sem mudança de spec.

## DEC-041 — TASK-024 entrega motor headless de recálculo-vs-congelado, não UI de edição

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção (a) (recomendada) da Q-022; Spec 03 §3.6.2, §3.7.7; Spec 04 §3.1 item 6, §7.3; RN-052/046/015 · **Data:** 2026-07-13
**Decisão:** A TASK-024 entrega **só o motor headless** de recálculo-vs-congelado + o **modelo de estado de rota ao vivo** por itinerário (`congelada` — vinda do JSON, sem OSRM; `recalculada` — produto de edição; `sem-rota` — recálculo falhou), com a garantia "abrir JSON = **0** chamadas OSRM" (RN-052; Spec 04 §3.1 item 6) e um `recalcularItinerario(gesto)` que reaplica os `rota.pontos_de_rota` persistidos (§3.6.2) e delega a recomposição da descrição a um **composer injetável** (o algoritmo da descrição é a TASK-025). O **fio dos gestos reais** do mapa (arrastar/reordenar/criar parada ou ponto de rota) é das TASK-017/018/019, que passam a **depender funcionalmente** da TASK-024.
**Motivo:** A política "abrir congela / editar recalcula no soltar" pressupõe a etapa de mapa editável, ainda não construída. A lista de dependências declarada da TASK-024 (TASK-006/021/023) não inclui os editores — indício de que a task é a camada de orquestração, não a UI. Antecipar UI de edição invadiria TASK-017/018/019 ("uma task por vez"). O precedente das TASK-021/022/023 (motor testado por mock, sem UI) confirma o recorte.
**Consequências:** resolve a Q-022. O E2E de edição ao vivo fica diferido para quando os editores existirem; nesta task, "abrir → 0 chamadas OSRM" é coberto por integração com fetch-espião. **Higiene de backlog apontada:** o "Depende de" das TASK-017/018/019 subdeclara — funcionalmente elas consomem o motor da TASK-024; recomenda-se acrescentar TASK-024 às dependências delas quando forem analisadas. O estado `sem-rota` alimenta a pendência bloqueante da TASK-044 (DEC-040).
**Impacto em implementação:** RN-052/046/015 (e consumo de RN-041/042/043/048/050/051 já entregues); `formulario/roteamento/` (novo estado de rota ao vivo + orquestrador), possivelmente `formulario/sessao.ts` (estado efêmero, NEG-004 — nunca no JSON); costura para TASK-025 (composer) e TASK-044 (pendência). Sem mudança de spec nem de contrato JSON.

## DEC-042 — Garantia "abrir = 0 chamadas OSRM" provada por fetch-espião ativo, não decorativo

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção (a) (recomendada) da Q-023; ressalva da revisão da TASK-024; Spec 04 §3.1 item 6; Spec 03 §3.6.2; RN-052 · **Data:** 2026-07-13
**Decisão:** Testes que provam "não chama OSRM" — RN-052 na abertura (via `congelarRotaCarregada`) e, por extensão, toda garantia de ausência de chamada de rede/OSRM (p.ex. RN-080 no Comparador) — devem usar um **espião ativo** sobre o `fetch` efetivamente disponível à unidade (`vi.spyOn(globalThis, "fetch")` ou `fetch` injetado e exercido) e assertar **zero** chamadas. Um `vi.fn()` criado e **nunca ligado** à função sob teste é **decorativo** e proibido — a asserção passa mesmo se a garantia quebrar. A garantia estrutural (função síncrona, sem `Promise`) permanece como reforço, não como substituta do espião.
**Motivo:** A revisão da TASK-024 encontrou exatamente esse espião decorativo no teste de `congelarRotaCarregada`; a DEC-041 já pedia "cobertura por fetch-espião", sem fixar que ele precisa ser ativo. Sem o padrão, garantias críticas de "sem rede" ganham falso senso de cobertura.
**Consequências:** resolve a Q-023. Corrige o teste da TASK-024 na TASK-045 (já criada e ordenada, 024/044 → 045). Estabelece padrão reutilizável para as demais garantias de "não chama OSRM" (RN-080 do Comparador, quando testado). Não altera o parecer da TASK-024 (aprovado): a ressalva era não bloqueante, pois a garantia RN-052 já era assegurada estruturalmente pela assinatura síncrona.
**Impacto em implementação:** `testes/unitarios/formulario/roteamento-recalculo-vivo.test.ts` (TASK-045). Sem alteração de código de produção, de spec nem de contrato JSON.

## DEC-043 — TASK-017 entrega motor + componente controlado de Seções; TASK-019 monta a etapa real do mapa

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A (recomendada) da Q-024; estrutura de dependências do backlog (TASK-019 depende de TASK-017/018) · **Data:** 2026-07-13
**Decisão:** A TASK-017 entrega só o motor de regras de Seção (350 m incremental — RN-027; contribuição por Serviço/sentido — RN-026; derivação de município — RN-029) e o componente controlado `EditorSecoes`, montado num harness próprio e transitório para os testes. A TASK-019 é quem monta a etapa "Seções, Locais e Itinerários" de verdade (seleção de Serviço/sentido, tabela lateral sincronizada, persistência em sessão) — só nesse momento o follow-up gravado na revisão da TASK-020 (remover/reaproveitar `src/app/mapa-demo`, apontar o E2E de mapa para o ponto de montagem real) é resolvido em definitivo.
**Motivo:** o follow-up da TASK-020 nomeou "TASK-017" antes do fatiamento fino 017/018/019 do backlog; a estrutura de dependências atual (019 depende de 017+018) é mais específica e mais recente, e indica que a TASK-019 é a integradora. Montar a etapa real na TASK-017 exigiria inventar cedo um modelo de sessão para `autos.secoes` no modo "novo" e para seleção de Serviço/sentido — modelagem que pertence à TASK-019.
**Consequências:** resolve a Q-024. O harness `src/app/mapa-demo/` (TASK-020) permanece por ora; a TASK-017 pode criar um harness próprio e transitório para seu E2E, também a ser revisitado pela TASK-019. Nenhuma mudança de contrato JSON.
**Impacto em implementação:** `src/formulario/secoes/` (TASK-017); a etapa real (`layout-formulario.tsx`, caso `"secoes-locais-itinerarios"`) permanece placeholder até a TASK-019.

## DEC-044 — Recusa de arrasto de Seção (>350 m): só a mensagem, sem afordância de "criar Seção nova"

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-025); ressalva da revisão da TASK-017 · **Data:** 2026-07-13
**Decisão:** Ao arrastar um ponto de Seção para além dos 350 m do cluster (RN-027), o sistema recusa o gesto (o ponto volta à posição anterior) e exibe **apenas** a mensagem literal da Spec 04 §14 — "Este ponto fica a mais de 350 m do conjunto de pontos desta Seção. Crie uma Seção separada (com outro nome) para este local." **Não** há afordância interativa (botão/atalho) que ofereça criar a Seção nova no ponto recusado. Quem quiser uma Seção nova a cria pelo fluxo normal de clique no mapa. O "oferece criar Seção nova" da coluna "Comportamento" de §14 é considerado satisfeito pela própria mensagem, que já instrui a criação de uma Seção separada.
**Motivo:** arrastar não deve poder **descaracterizar** uma Seção existente (mudar sua identidade de lugar); o papel da recusa é só informar isso. Criar Seção nova é outra intenção, com seu próprio ponto de entrada (criar Seção) — misturar as duas num atalho na recusa confunde o gesto e antecipa UI que não agrega. Mantém a etapa de arrasto simples e o motor de Seção (TASK-017) sem responsabilidade de criação.
**Consequências:** resolve a ressalva da revisão da TASK-017 (`docs-dev/14-REVISOES/TASK-017-20260713.md`). O `revalidarArrasto` mantém o retorno `{ ok:false, motivo:"350m", nomeSecao }` (usado só para compor a mensagem, não uma oferta). A TASK-019, ao montar a etapa real, **não** deve adicionar afordância de "criar Seção nova" na recusa de arrasto. Nenhuma mudança de contrato JSON; RN-027 permanece válida (o usuário ainda cria Seção nova quando quer — só não por atalho automático).
**Impacto em implementação:** `src/formulario/secoes/fluxos-secao.ts`, `src/formulario/secoes/editor-secoes.tsx`, `testes/e2e/editor-secoes-350m.spec.ts` (TASK-017, já aderentes); a etapa real (TASK-019) segue esta decisão.

## DEC-045 — Exclusão de sentido de Local (TASK-018): motor torna o Local unidirecional e sinaliza; a remoção da Parada é da TASK-019

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-026); item 1 das ambiguidades da análise da TASK-018 · **Data:** 2026-07-13
**Decisão:** A TASK-018 entrega o **motor de Local** sobre `servico.locais[]` — criação espelhada (Serviço bidirecional gera `geolocalizacao_ida` e `geolocalizacao_volta` no mesmo ponto), arrasto com revalidação dos **350 m pareada** Ida×Volta (RN-032, sem cluster/centroide) e **exclusão por sentido** que remove a `geolocalizacao_<sentido>` e torna o Local **unidirecional** — mais o componente controlado `EditorLocais` e um harness transitório para o E2E. Ao excluir um sentido, o motor **apenas sinaliza** (callback) que a Parada daquele sentido deve sair do itinerário; a **remoção efetiva** da Parada é fiada pela **TASK-019**, dona das paradas ordenadas e da tabela lateral (RN-033..036). O motor **não** esvazia o último ponto de um Local (RN-032: ao menos uma geolocalização) — a exclusão por sentido só é oferecida quando ambos os pontos existem — e **não** manipula `itinerario.paradas[]`.
**Motivo:** simetria com a DEC-043 (motor de entidade nas TASK-017/018, etapa real de itinerário/paradas/sessão na TASK-019, que depende de ambas). O motor de Local não tem o itinerário em mãos para remover uma Parada preservando integridade (RN-036: a Parada de sentido X exige `geolocalizacao_X`); atribuir a remoção à TASK-018 obrigaria a inventar cedo o modelo de `itinerario.paradas[]` editável, que pertence à TASK-019.
**Consequências:** resolve a Q-026 e o item 1 das ambiguidades da análise da TASK-018. A TASK-018 fica com escopo fechado (motor + componente controlado + harness), sem tocar paradas/itinerário; a TASK-019, ao montar a etapa real, consome o sinal de exclusão de sentido e remove a Parada correspondente. Full CRUD de remoção da entidade Local (esvaziar o último ponto) permanece fora da TASK-018. Nenhuma mudança de contrato JSON.
**Impacto em implementação:** TASK-018 — `src/formulario/locais/fluxos-local.ts`, `src/formulario/locais/editor-locais.tsx`, `src/app/editor-locais-demo/page.tsx` e testes; a costura da remoção de Parada fica no caso `"secoes-locais-itinerarios"` da TASK-019.

## DEC-046 — TASK-025 (composer de descrição) é executada antes da TASK-019, que injeta o composer real; sem placeholder provisório

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção (b) da Q-027); investigação de conflito da análise da TASK-019 · **Data:** 2026-07-14
**Decisão:** O caminho de recálculo bem-sucedido da TASK-019 depende de um `ComporDescricao` que produza `rota.descricao_itinerario` (obrigatória no schema, RN-044). Esse composer é **inequivocamente** da TASK-025 (Compositor `DESCRICAO(itinerario)` — Spec 03 §3.7; RN-044..046/053): a TASK-024 foi construída para **injetá-lo** (DEC-041), `extrair-rota.ts` já reserva `steps[].name` como "insumo da descrição, TASK-025" e a URL do OSRM já pede `steps=true`. Em vez de a TASK-019 injetar um placeholder provisório (opção (a) da Q-027), **reordena-se o backlog**: a **TASK-025 é implementada antes da TASK-019**, que passa a **depender funcionalmente** dela e injeta o `ComporDescricao` **real** desde o início. Não há código provisório nem dívida de limpeza. A TASK-025 entrega — no padrão já fixado para Seção/Local (DEC-043/045) — o composer (§3.7, com a limpeza §3.7.5 e os casos de borda), a **exposição de `steps[].name`** em `extrairRota` (hoje descartado), o **painel de descrição controlado** (`§7.4`) e um harness transitório para seu E2E; a TASK-019 monta esse painel na etapa real "Seções, Locais e Itinerários".
**Motivo:** a decisão é dependency-legal — TASK-019 e TASK-025 são irmãs sobre a TASK-024 (nenhuma dependia da outra) e seus downstreams são disjuntos (019→TASK-026/028; 025→TASK-032/033), então antecipar a 025 **não atrasa nenhum ramo**. A TASK-025 é autossuficiente hoje (unitários com o exemplo literal da Spec 03 §3.6.1; expor `steps[].name` está no seu escopo). Reordenar **elimina por construção** o risco de "lixo" provisório que a opção (a) traria, e mantém "uma task por vez" (a TASK-019 não antecipa o algoritmo §3.7).
**Consequências:** resolve a Q-027. A **TASK-019 ganha `TASK-025` na sua lista de "Depende de"** no backlog; a ordem de execução passa a ser TASK-025 → TASK-019. A obrigação de fiação da TASK-019 (montar `ItinerarioAoVivo` e passar a `coletarPendencias` — TASK-044) e o consumo do sinal de exclusão de sentido de Local (DEC-045) permanecem inalterados. Nenhuma mudança de contrato JSON.
**Impacto em implementação:** TASK-025 — `src/formulario/roteamento/extrair-rota.ts` (expor `steps[].name`), novo compositor de descrição em `src/formulario/roteamento/` (ou `src/formulario/descricao/`), painel controlado + harness; TASK-019 — injeta o composer real em `recalcularItinerario` na etapa `"secoes-locais-itinerarios"` (`layout-formulario.tsx`).

## DEC-047 — Divergência Ida≠Volta de conjunto de Seções (RN-030) é aviso não bloqueante, não pendência de §11

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção (a) da Q-028); análise da TASK-019 · **Data:** 2026-07-14
**Decisão:** A divergência de conjunto de Seções entre Ida e Volta (RN-030) **não** é adicionada à lista fechada de pendências de §11 (Spec 04, linhas 311–319). No fluxo normal ela é evitada **por construção**: a Spec 04 §7.1 (linha 121) e o princípio 6 (§12, linha 463) já mandam criar a Seção **espelhada nos dois sentidos** por padrão em Serviço bidirecional ("Ida e Volta no mesmo ponto"; a Volta é só reposicionada depois, sob a regra dos 350 m). Para os casos **residuais** — JSON antigo/errado importado ou bug de UI — a etapa "Seções, Locais e Itinerários" exibe um **aviso não bloqueante** ao lado da tabela, alimentado por um predicado `conjuntoSecoesConsistente(ida, volta)` exposto pelo motor de montagem. A **trava dura** permanece na validação estrutural de RN-030 já existente (`src/shared/contrato/validacoes-estruturais.ts` — `validarServico`), aplicada na importação/exportação/Revisão.
**Motivo:** respeita §11 como lista fechada e o princípio "não inventar regra" — emitir pendência bloqueante viva (opção (b)) adicionaria item à lista fechada; bloquear o gesto (opção (c)) contradiz o modelo de arrasto por sentido da §7.1 e é rígido demais. Como a criação espelhada já garante o caso normal e a exportação já barra a divergência, o sinal ao vivo é **puramente defensivo** e não precisa de peso de pendência.
**Consequências:** resolve a Q-028. A TASK-019 expõe `conjuntoSecoesConsistente(ida, volta)` no motor de montagem e mostra o aviso não bloqueante na etapa; **não** adiciona entrada a `coletarPendencias` (§11) para esse caso. Nenhuma mudança de contrato JSON. Nenhuma alteração de spec — o espelhamento e o gate estrutural já eram spec/código existentes.
**Impacto em implementação:** TASK-019 — predicado `conjuntoSecoesConsistente` no motor de `ItinerarioAoVivo` e aviso não bloqueante na etapa `"secoes-locais-itinerarios"`; a validação estrutural de RN-030 permanece intocada.

## DEC-048 — Reconciliação de horários quando o itinerário muda: reordenar recomputa pela sugestão inicial; mudança sem reordenar preserva os offsets

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção (a) da Q-029); revisão da TASK-019 (item 1) · **Data:** 2026-07-14
**Decisão:** Define o que acontece com os `offset_horario`/`horarios_paradas` já gravados quando o itinerário muda **depois** de existirem Viagens (lacuna deixada em aberto pela Spec 03 §8, que só cobre criação, edição manual e reset sob demanda):

- **Mudança de ordem ou do conjunto de paradas** (reordenar pela tabela lateral, inserir/remover Seção ou Local): a rota é recalculada **e** os horários intermediários de cada Viagem são **recomputados pela sugestão inicial** da Spec 03 §8.1 (acúmulo de `trecho.duracao_s`), mantendo fixo o `horario_saida` de cada Viagem. Os tempos correm em sequência a partir dos offsets da rota nova. Como as posições mudaram, âncoras manuais anteriores (§8.2) **não** têm como ser preservadas e são descartadas nesse itinerário.
- **Mudança que NÃO altera a ordem nem o conjunto de paradas** (mover a coordenada de uma parada, inserir/mover/remover ponto de rota — a rota e as durações mudam, mas a sequência de paradas é a mesma): os `offset_horario` **gravados são preservados**; o sistema **não** recomputa automaticamente só porque a rota mudou. A rota nova apenas atualiza a **sugestão** (Spec 03 §3.6, linha 186); os offsets só são recomputados se o usuário acionar o reset (§8.3).
  **Motivo:** preserva o trabalho do usuário — um ajuste de traçado que não mexe na sequência de paradas não deve apagar horários já digitados — e alinha com a semântica já fixada (offset é valor confirmado/editável; ponto de rota muda a **sugestão**, não o gravado — §3.6). Ao mesmo tempo, reordenar/alterar o conjunto torna os offsets antigos posicionalmente sem sentido (colariam na parada errada), então recomputar pela §8.1 é a única reconciliação coerente e mantém RN-063 (um offset por Parada, monotônico). Recomputar sempre (opção (b)) apagaria edições legítimas; nunca recomputar (opção (c)) deixaria o documento estruturalmente inválido ao reordenar.
  **Consequências:** resolve a Q-029. Nenhuma mudança de contrato JSON — offset continua valor gravado; é regra de **quando** recomputar (fronteira Spec 04), reusando a fórmula da Spec 03 §8.1. A reconciliação de `matriz_distancias` na mesma mudança já é escopo da TASK-026 ("recálculo automático ao concluir edição do itinerário; pendência matriz desatualizada"). Nenhuma alteração de spec — a regra vive na fronteira "quando recalcular" que a Spec 04 já reserva.
  **Impacto em implementação:** nova **TASK-046** (reconciliação de horários na mudança de itinerário), dependente de TASK-019 + TASK-028; a distinção reordenar-vs-não-reordenar compara a sequência de identidade/`ordem` das paradas antes×depois no write-back de `documentoComItinerarioAtualizado` que a TASK-019 já faz. TASK-028/029 devem respeitar esta regra quando existirem Viagens.

## DEC-049 — Conjunto de âncoras de horário é estado efêmero da sessão do Formulário (sobrevive à navegação, some ao recarregar JSON)

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção (b) da Q-030); análise da TASK-029 · **Data:** 2026-07-15
**Decisão:** A redistribuição proporcional (Spec 03 §8.2) depende de saber **quais** paradas são âncoras (offset fixado manualmente pelo usuário). Como o contrato JSON (Spec 02 §11.1) grava apenas `parada_ordem` + `offset_horario` — sem campo de âncora — e o conjunto de âncoras **não** é recuperável de forma confiável a partir dos offsets (paradas derivadas reinterpoladas também divergem do baseline §8.1), o conjunto de âncoras é **estado efêmero, nunca persistido** (RN-010; NEG-011). Sobre a longevidade desse estado: as âncoras vivem enquanto a **sessão do Formulário** existe — sobrevivem à navegação entre etapas (sair da grade de horários e voltar preserva as âncoras fixadas) — e são descartadas ao **recarregar/importar outro JSON** ou iniciar sessão nova. Não é estado apenas do componente da etapa (opção (a) descartada por perder as âncoras a cada troca de etapa); não é inferido dos offsets (opção (c) descartada por não ser determinístico).
**Motivo:** preserva o trabalho de edição do usuário durante toda a sessão sem inventar campo de contrato (proibido — RN-008..015). Alinha com o padrão já fixado para pendências de validação (NEG-011: "efêmeras, de sessão, nunca vão para o JSON") e com DEC-048, que já trata âncoras como estado de edição descartável (reordenar o itinerário as descarta). A corretude da fórmula (§8.2) e do reset (§8.3) independe da longevidade — só a UX de edição depende.
**Consequências:** resolve a Q-030. Nenhuma mudança de contrato JSON — offset continua o único valor gravado por parada. A implementação da TASK-029 mantém o conjunto de âncoras (`Map<viagemUuid, Set<parada_ordem>>` ou equivalente) na sessão do Formulário, não no JSON; ao recarregar/importar, o estado nasce vazio (offsets carregados são finais e contam como derivados até serem reeditados). Ao reordenar/alterar o conjunto de paradas, DEC-048 já manda descartar as âncoras daquele itinerário.
**Impacto em implementação:** escopo da **TASK-029**. O estado de âncoras é lido/escrito pela etapa Viagens e vive na `SessaoFormulario`; a lógica pura de redistribuição (§8.2) e reset (§8.3) recebe o conjunto de âncoras como parâmetro, permanecendo testável sem UI.

## DEC-050 — Design system do ROTA: doc derivado vinculante (docs-dev/18), Tailwind CSS 4, ícones-carimbo SVG, sidebar lateral, bloco de redesign TASK-049..056 em lote autônomo

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção 1 da Q-031); lacuna de aparência nas specs 01–05 · **Data:** 2026-07-15
**Decisão:**

- **(a) Governança:** o design visual (paleta, tipografia, sombras, componentes, ícones, padrões de layout) passa a ser governado pelo documento derivado **vinculante** `docs-dev/18-DESIGN_SYSTEM.md`, subordinado à Spec 04 — em divergência, o comportamento/estrutura da spec sempre prevalece. O doc 18 entra na ordem de leitura obrigatória (doc 00 §4) e no checklist de aderência (doc 07) para toda task que toque UI.
- **(b) Stack de estilo:** **Tailwind CSS 4** entra na stack fixada (complementa DEC-028): tokens via `@theme` em `globals.css`, processamento 100% em build (compatível com export estático e com o guardrail "nenhuma dependência que exija servidor próprio").
- **(c) Navegação:** o formulário adota **sidebar lateral de ícones-carimbo** — forma "lateral" já prevista na Spec 04 §4 ("stepper lateral ou superior"); navegação livre, rótulos acessíveis (`aria-*`) e `data-testid` preservados; item ativo em destaque colorido; hover com tooltip que acompanha o cursor.
- **(d) Ícones:** SVGs **próprios** em estilo carimbo (moldura circular, traço uniforme), componente `Carimbo` em `src/shared/ui/` — sem biblioteca externa de ícones, sem emoji.
- **(e) Escopo do redesign:** bloco **TASK-049..056** restiliza o que já existe preservando comportamento, validações, contrato JSON, `data-testid` e `aria-*` (os E2E provam a não-regressão). Etapas placeholder (Revisão, Exportação) e o Comparador não são redesenhados agora — nascem sob o doc 18 quando suas tasks chegarem.
- **(f) Modo de execução:** o responsável **autoriza execução em lote autônoma** para este bloco: ciclo analisar → implementar → clean → revisar por task, **sem** aprovação humana entre a análise e a implementação — exceção pontual ao modo supervisionado padrão do doc 04. As análises e as revisões de aderência continuam sendo produzidas e registradas (`14-REVISOES/`). Divisão de modelos fixada pelo responsável: análise e revisão com Opus; implementação e clean com Sonnet. Condições de parada: conflito real de spec (vira Q-xxx), segunda reprovação consecutiva da mesma task, ou E2E que só passaria alterando seletor/comportamento.
  **Motivo:** as specs definem O QUÊ do comportamento, mas nunca especificaram aparência — a UI ficou sem estilo algum. Aparência é decisão de implementação derivada: um doc em `docs-dev/` pode evoluir sem tocar `docs/specs/**` (read-only) e, entrando na ordem de leitura e no checklist, garante **um único padrão visual** para o projeto inteiro, incluindo telas futuras. Tailwind 4 roda em build (nenhum servidor — guardrails intactos); ícones próprios dão identidade única sem dependência; a sidebar lateral já era forma prevista na Spec 04 §4.
  **Consequências:** resolve a Q-031. Cria `docs-dev/18-DESIGN_SYSTEM.md`; atualiza doc 00 §4/§12, doc 07 (itens de UI), doc 13 (módulo `shared/ui` + diretriz de dependência) e `CLAUDE.md`. Cria as TASK-049..056 no backlog (fase nova "Redesign visual"). Nenhuma spec alterada; nenhum campo de contrato; nenhuma regra de negócio nova.
  **Impacto em implementação:** `package.json` (tailwindcss dev), `src/app/globals.css` (tokens `@theme`), novo `src/shared/ui/` (componentes base + carimbos), restilização de `src/app/` e `src/formulario/` (TASK-049..056). `formulario/` e `comparador/` podem importar `shared/ui` (já era permitido — só dependem de `shared/`).

## DEC-051 — A etapa Serviços exibe os contadores de viagens semanais por Serviço (Spec 04 §6), reutilizando a contagem da §10

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-032); Spec 04 §6 × §10 · **Data:** 2026-07-15
**Decisão:** o último marcador da Spec 04 §6 é exigência literal: a **etapa Serviços** passa a exibir, por Serviço, os **contadores de viagens semanais** — hoje ausentes da etapa —, como coluna da `Tabela` de Serviços. A contagem **não é reimplementada**: reutiliza o módulo já existente `src/shared/contagens/`, o mesmo que alimenta o resumo operacional da §10 (`src/formulario/resumo/resumo-operacional.tsx:43-45`), com a semântica da RN-069 intacta (semana padrão, exclusivamente `viagem_feriado = false`, rótulo "semana padrão (sem feriados)"). A exibição no resumo (§10) **permanece** — a §6 e a §10 são exibições distintas do mesmo dado, não alternativas.
**Motivo:** leitura literal da §6, que usa "Exibir por Serviço" e lista os contadores junto dos campos que a etapa de fato exibe; o remissivo "ver §10" aponta _como se contam_, não _onde aparecem_. É também a opção reversível: se a duplicação da informação incomodar no uso, remove-se a coluna sem tocar `docs/specs/**` — enquanto a alternativa (declarar que o resumo satisfaz a §6) exigiria editar a spec, área read-only.
**Consequências:** resolve a Q-032. Fecha a divergência registrada na revisão da TASK-054 (`docs-dev/14-REVISOES/TASK-054-20260715.md`, "Pendências"), que a própria task não podia resolver. Exige **TASK nova** (TASK-057): exibir contador é **comportamento**, e o doc 18 §7 proíbe que uma task de aparência o introduza — logo não cabe em nenhuma task do bloco de redesign (TASK-054 já entregue; TASK-055/056 mantêm o escopo). Nenhuma spec alterada; nenhum campo de contrato; nenhuma regra de negócio nova (a contagem já existe e não muda).
**Impacto em implementação:** `src/formulario/servicos/servicos.tsx` (coluna nova na `Tabela`, consumindo `shared/contagens`) — primeira leitura de contagem fora de `formulario/resumo/`; nenhuma alteração em `src/shared/contagens/`. RN afetadas: **RN-069** ganha um segundo consumidor de exibição no Formulário (semântica inalterada; a "Origem" da RN-069 em `docs-dev/01-RULE_INDEX.md:507-510` cita Spec 04 §10 e §13.3 e **passa a caber também a Spec 04 §6** — atualização de derivado a fazer se o responsável pedir, não incluída nesta DEC). Sem impacto em `comparador/`, contrato JSON, OSRM ou PDF.

## DEC-052 — Rótulo visível do campo Tipo na Identificação é "Tipo do Autos"; Spec 04 §5 a alinhar

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-033); revisão da TASK-053, achado 1 · **Data:** 2026-07-15
**Decisão:** o rótulo **visível** do campo Tipo na etapa Identificação (`src/formulario/identificacao/identificacao.tsx`) **permanece "Tipo do Autos"**. A Spec 04 §5, que hoje nomeia o campo apenas "Tipo", **passa a dever ler "Tipo do Autos"** — ajuste de **redação** da área read-only (`docs/specs/04-*.md §5`), a cargo do dono da spec e **não incluído nesta DEC** (mesmo precedente da DEC-051, que deixou a atualização de derivado como ação humana à parte). A UI **não** é revertida.
**Motivo:** "Tipo do Autos" é nomenclatura oficial (RN-076), espelha "Código do Autos" da mesma tela e mantém o **nome acessível** que já era exposto (a revisão da TASK-053 verificou `toHaveAccessibleName("Tipo do Autos")` antes e depois). Entre alinhar a spec ao rótulo (opção A) e reverter o rótulo à spec (opção B), o responsável optou por A: preserva a consistência visual "Código do Autos"/"Tipo do Autos" e evita uma terceira variação de texto para o mesmo conceito.
**Consequências:** fecha o achado 1 da revisão da TASK-053 e resolve a Q-033. A UI **não** muda por esta DEC — a **TASK-058** (cleanup das ressalvas do bloco) **não** toca esse rótulo, e isso é explícito no seu "Fora de escopo". Enquanto a Spec 04 §5 não for ajustada pelo dono da spec, a divergência UI×spec fica **rastreada** por esta DEC + Q-033 (não é divergência silenciosa). Nenhum contrato JSON, nenhuma regra de negócio, nenhum comportamento afetado.
**Impacto em implementação:** nenhum código muda por esta DEC — a UI já está no estado decidido. Ação pendente, fora do escopo do implementador: edição de `docs/specs/04-*.md §5` (dono da spec). Sem impacto em `comparador/`, OSRM ou PDF.

## DEC-053 — Fluxo "novo": `ServicoEmConstrucao` é promovido a `Servico` completo ao concluir a edição do itinerário

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-034); Spec 04 §6/§7/§8; DEC-035; RN-018 · **Data:** 2026-07-16
**Decisão:** no fluxo **"novo"** (documento criado do zero), ao concluir a edição do itinerário de um Serviço (etapa de mapa/itinerários), o `ServicoEmConstrucao` correspondente é **promovido a `Servico` completo** — com `itinerarios[]` contendo paradas + rota + `matriz_distancias` reconciliada, e `viagens` a preencher nas etapas seguintes — passando a viver na lista de Serviços do documento, e não mais em `servicosEmConstrucao`. Com isso, as etapas Viagens e Matrizes leem os Serviços por um **único caminho** (os `Servico` completos do documento), sem replicar o dual `sessao.modo === "carregado" ? … : []` por etapa. UUIDs preservadas na promoção (RN-001/002/004); nada gravado no JSON antes da exportação (RN-096/NEG-004) — a promoção é transição de **estado de sessão efêmero**, não persistência.
**Motivo:** leitura literal da DEC-035, que já previa o `ServicoEmConstrucao` "promovido a `Servico` completo quando as etapas seguintes preencherem o resto". A opção A concentra o tratamento dos modos "novo"/"carregado" num **único ponto de promoção**, em vez de espalhar a leitura tolerante de `servicosEmConstrucao` por Viagens, Matrizes e Resumo (opção B, descartada por multiplicar a superfície de dois-modos e os casos de teste; opção C, híbrida, idem). Fecha a trava descrita na Q-034: hoje, no modo "novo", o Serviço nunca vira `Servico` e as etapas Viagens/Matrizes recebem `[]`, deixando o fluxo criar-do-zero inutilizável além dos itinerários.
**Consequências:** resolve a Q-034. Desbloqueia o fluxo criar-do-zero ponta a ponta (Identificação → Serviços → Seções/Locais → Itinerários → Viagens → Matrizes → Resumo → Exportação). Exige **task(s) nova(s)**: a promoção em si (gatilho + forma) e um **E2E** que exercite o fluxo "novo" completo (hoje só o fluxo de JSON aberto é coberto — nenhum E2E cobre novo→Serviços→Itinerários→Viagens). O gatilho preciso da promoção e eventuais ajustes do modelo de sessão (ex.: quando o Serviço passa a existir no documento no modo "novo", que hoje não carrega `DocumentoOperacao`) ficam para a `/analisar-task`; se implicarem mudança do modelo de sessão além do previsto aqui, viram DEC própria. Nenhuma spec alterada; nenhum campo de contrato novo; nenhuma regra de negócio nova.
**Impacto em implementação:** `src/formulario/sessao.ts` (modelo de sessão do modo "novo" — hoje sem `documento`; a promoção precisa de um lar para os `Servico` completos), `src/formulario/itinerarios/etapa-itinerarios.tsx` (`documentoComItinerarioAtualizado` hoje só roda no modo "carregado" — ponto natural do gatilho de promoção), leitura de Serviços em `src/formulario/viagens/etapa-viagens.tsx` e `src/formulario/matrizes/etapa-matrizes.tsx`. RN afetadas: RN-001/002/004 (UUIDs na promoção), RN-018 (documento válido exige ≥ 1 Serviço), RN-054..057 (matriz reconciliada ao concluir itinerário). Sem impacto em `comparador/`, contrato JSON (schema), OSRM ou PDF.

## DEC-054 — Mapa único de itinerários: clique esquerdo cria Seção, clique direito cria Local; ponto de rota e sync tabela↔mapa deferidos

**Status:** Aceita · **Superada em parte pela DEC-055** (atribuição dos botões do mouse) **e pela DEC-069** (marcadores deixam de ser circulares para ambos: Seção vira quadrado, Local encolhe para 12 px) · **Origem:** decisão do responsável pelo domínio (opção B da Q-035), na `/analisar-task` da TASK-060; Spec 04 §7; doc 18 §87; DEC-050 · **Data:** 2026-07-16
**Decisão:** o mapa único da etapa "Seções, Locais e Itinerários" (TASK-060, unificando os dois mapas de `EditorSecoes`/`EditorLocais`) adota interação **por gesto do mouse**:

- **Clique esquerdo** no mapa → cria **Seção**; **clique direito** → cria **Local** (ponto de parada). Ao clicar, abre-se a **janelinha** de criação com os campos do ponto (Seção: nome; Local: nome — município derivado, somente-leitura, Spec 04 §7.1/§7.2).
- Marcadores **circulares** para ambos, com **diferenciação visual** entre Seção e Local (cor/preenchimento, tokens do doc 18 — não literal na spec, inferência controlada sob DEC-050).
- **Lista ordenada de paradas à direita** — a `Tabela` lateral na mesma linha visual do mapa (doc 18 §87), mapa à esquerda.
- **Não há barra/seletor de ferramenta** — a afordância é o próprio gesto; uma **dica visível** compensa a baixa descoberta do clique direito.
  **Motivo:** a Spec 04 §7 exige os três tipos no mesmo mapa mas não fixa a interface; entre um seletor de modo explícito (opção A) e o gesto do mouse (opção B), o responsável optou por B — menos cromo de UI e fluxo mais direto ("lançar enquanto desenha a rota", Spec 04 §7). A diferenciação visual e a dica de descoberta são decisões de aparência, que o doc 18 governa (DEC-050) sem tocar `docs/specs/**`.
  **Consequências:** resolve a Q-035. Fixa o gesto que a TASK-060 implementa; a primitiva `shared/mapa` ganha um handler de clique direito (`contextmenu`) aditivo, sem quebrar `aoClicar`. **Deferimentos explícitos, fora da TASK-060, em tasks próprias:**
- **TASK-063** — gesto de **ponto de rota** (clique sobre a linha da rota → vértice arrastável, Spec 03 §3.6 / Spec 04 §7.3): o **motor já existe** (TASK-023 entregou `intercalar-pontos-de-rota`, `&waypoints=`, extração); falta só a **interação de mapa** + disparo de recálculo ao soltar, mais a sub-lista própria de pontos de rota na tabela (Spec 04 §7.3, "não entra na tabela de paradas").
- **TASK-064** — **sincronização seleção tabela↔mapa** (Spec 04 §7: "selecionar na tabela destaca no mapa e vice-versa"): estado de seleção bidirecional + realce de marcador.
  Nenhuma spec alterada; nenhum campo de contrato; nenhuma regra de negócio nova (os motores de Seção/Local/rota são reusados intactos).
  **Impacto em implementação:** `src/shared/mapa/mapa.tsx` (prop `aoClicarDireito` → `contextmenu`, aditiva), novo `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (mapa único), `src/formulario/itinerarios/etapa-itinerarios.tsx` (layout duas colunas), `testes/e2e/etapa-itinerarios.spec.ts` (mapa único; criar Local passa a ser clique direito — testids preservados). `EditorSecoes`/`EditorLocais` e suas demo pages permanecem para o E2E dos 350 m. Sem impacto em `comparador/`, contrato JSON, OSRM (motor) ou PDF.

## DEC-055 — Mapa único: esquerdo sobre a linha cria ponto de rota (fora, é pan); direito abre menu Seção/Local, inserindo entre as paradas do trecho quando sobre a linha

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção D da Q-036; conversa da `/analisar-task` da TASK-063; Spec 04 §7 (mapa único), §7.3 itens 2, 3 e 6; Spec 03 §3.6; supera em parte a DEC-054 · **Data:** 2026-07-16
**Decisão:** Inverte a atribuição dos botões do mouse fixada pela DEC-054, fechando a colisão entre o gesto de Seção e o gesto de ponto de rota sobre a linha da rota:

- **Clique esquerdo SOBRE a linha da rota** → cria **ponto de rota** (vértice pequeno arrastável, sem rótulo — Spec 04 §7.3 item 6; Spec 03 §3.6).
- **Clique esquerdo FORA da linha** → **não cria nada**; o mapa mantém o comportamento nativo de **pan** (arrastar o mapa).
- **Clique direito** → abre um **menu flutuante no ponto clicado** com a escolha entre **Seção** e **Local**; escolhido o tipo, segue o formulário de criação já existente (nome, município derivado, regra dos 350 m — motores inalterados).
  - **Sobre a linha da rota** → a parada nova é **inserida ENTRE as paradas que delimitam aquele trecho**, na posição correspondente ao ponto clicado ao longo do traçado (Spec 04 §7.3 item 2, "insere Seções e Locais **em ordem**").
  - **Fora da linha** → a parada nova é **acrescentada ao FIM** da lista ordenada (comportamento atual), que é o caminho de montagem do itinerário do zero — sem duas paradas não há linha, logo o itinerário inicial nasce todo pelo botão direito.
    **Da DEC-054 continuam valendo**, sem alteração: marcadores **circulares** com diferenciação visual entre Seção e Local; **tabela lateral** com a lista ordenada de paradas à direita do mapa; e o deferimento do gesto de ponto de rota (TASK-063) e da sincronização seleção tabela↔mapa (TASK-064) para tasks próprias.
    **Motivo:** a DEC-054 atribuiu a Seção ao botão esquerdo quando o gesto de ponto de rota ainda estava deferido, e por isso não pôde prever a colisão: a **linha da rota corre exatamente sobre as vias**, então uma Seção intermediária lançada no meio do itinerário cai quase sempre em cima da linha, onde a Spec 04 §7.3 item 6 manda criar ponto de rota. Dar a cada botão **um significado só** elimina a disputa de pixel por construção, em vez de mitigá-la por modo ou modificador de teclado (opções B e C da Q-036, de menor descoberta). A escolha Seção×Local passa a ser **explícita** — coerente com o doc 02, em que são entidades distintas (DEC-013) — em vez de depender de qual botão o usuário lembrou. A inserção posicional atende a leitura natural do §7.3 item 2 ("em ordem"), hoje não atendida (toda parada criada pelo mapa vai para o fim, obrigando a subi-la com as setinhas da tabela), e é barata: o `inserirParada` do motor de montagem **já aceita índice de inserção** e o índice sai do **mesmo ancorador geométrico** que a TASK-063 precisa construir para o `apos_parada_ordem`. Custo aceito: inverter um gesto já entregue e aprovado na TASK-060 (asserções de `editor-mapa-itinerario.test.tsx` mudam) e criar um componente de menu flutuante, inexistente em `shared/ui`.
    **Consequências:** resolve a Q-036. Supera **em parte** a DEC-054 (apenas a atribuição dos botões; o resto daquela decisão permanece). Nenhuma spec alterada — a Spec 04 §7 nunca fixou gesto, e o desenho decidido é leitura literal do §7.3 itens 2 e 6, que a DEC-054 é que não conseguia acomodar. **Nenhum campo de contrato JSON**, nenhuma regra de negócio nova: os motores de Seção/Local/350 m/roteamento são reusados intactos. Tasks: a **TASK-063** (gesto de ponto de rota) segue como está — o esquerdo sobre a linha é exatamente o seu escopo, e ela entrega o **ancorador geométrico** que as demais consomem; a inversão dos gestos e o menu flutuante viram a **TASK-065**; a inserção posicional de parada vira a **TASK-066**, que **nasce bloqueada pela Q-037** (sem regra de re-ancoragem, inserir parada no meio de um trecho que contém pontos de rota não tem comportamento definido). Ordem recomendada: TASK-063 → TASK-065 → TASK-066. No intervalo entre a 063 e a 065 o comportamento fica coerente (esquerdo sobre a linha cria ponto de rota; esquerdo fora ainda cria Seção, como hoje).
    **Impacto em implementação:** `src/shared/mapa/mapa.tsx` — detecção de clique sobre a camada de linhas, com callbacks aditivos para os dois botões (consumidor sem callback fica inalterado; o Comparador e as demo pages não mudam). Novo componente de **menu flutuante** em `src/shared/ui/` (doc 18 §5: flutuante efêmero usa `sombra-3`; §6.2: todo elemento de UI vem de `shared/ui`). `src/formulario/itinerarios/editor-mapa-itinerario.tsx` — roteamento dos gestos, seletor de tipo, vértices e sub-lista de pontos de rota. `src/formulario/itinerarios/etapa-itinerarios.tsx` — fio do recálculo. `src/formulario/itinerarios/motor-montagem.ts` — `inserirParada` já suporta o índice; só o chamador muda. Testes: `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx` (asserções de gesto invertidas — `data-testid` preservados, doc 18 §6.5) e `testes/e2e/etapa-itinerarios.spec.ts`. RN afetadas: nenhuma muda de texto; RN-042/043/051/052 são exercidas pelo gesto novo, RN-041 permanece invariante. Sem impacto em `comparador/`, contrato JSON, motor OSRM ou PDF.

## DEC-056 — Pontos de rota são re-ancorados geometricamente quando as paradas mudam; descartados só na reordenação

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A (recomendada) da Q-037; `/investigar-conflito` durante a análise da TASK-063; Spec 03 §3.6, §3.6.1, §3.6.2 × Spec 02 §10.4, §14; precedente DEC-048 · **Data:** 2026-07-16
**Decisão:** Fecha o conflito entre a Spec 03 §3.6.2 (reaplicar os pontos de rota ao recalcular "por alterar paradas") e a Spec 02 §10.4/RN-042 (`apos_parada_ordem` ∈ `[1, paradas.length − 1]`, índice posicional sobre a lista que mudou). A reaplicação passa a ser precedida de **re-ancoragem**, resolvida caso a caso:

- **Parada acrescentada ao fim** — nenhum `apos_parada_ordem` muda de significado; reaplicação literal, sem ajuste.
- **Parada inserida no meio** — a posição da parada nova ao longo do traçado é conhecida (o usuário clicou sobre a linha — DEC-055); os pontos **antes** dela mantêm o `apos_parada_ordem`, os **depois** recebem **+1**. O trecho partido reparte seus pontos pelos dois lados conforme a posição ao longo da linha.
- **Parada removida** — os dois trechos adjacentes **fundem-se**; os pontos de ambos preservam a sequência de travessia e assumem o `apos_parada_ordem` do trecho fundido.
- **Reordenação de paradas** — a travessia muda por inteiro e não há referência posicional que preserve a intenção do usuário: os pontos de rota **daquele itinerário são descartados**, com **aviso não bloqueante** na etapa (nunca pendência de §11, que é lista fechada — precedente DEC-047).
  Em todos os caminhos: `apos_parada_ordem` resultante sempre em `[1, paradas.length − 1]` (RN-042), `trechos == paradas − 1` (RN-041), e **nenhum ponto de rota vira parada** (NEG-011). Adicionalmente, o `throw` de `intercalar-pontos-de-rota.ts` para intervalo inválido — hoje **rejeição não tratada**, porque nem `solicitarRota` (que só embrulha o `fetch`) nem `dispararRecalculo` capturam — passa a ser tratado como **falha bloqueante bem-comportada** da RN-048: estado `sem-rota`, sem apagar a última rota válida e sem derrubar a etapa.
  **Motivo:** a regra de precedência do `docs-dev/00` §9 ("a spec mais específica e mais recente vence") **não arbitra**, porque os dois trechos estão na mesma spec e na mesma versão. O desempate vem da natureza de cada norma: a restrição de intervalo é **invariante de contrato com gate de validação** (Spec 02 §10.4/§14 — documento que a viole é inválido e não exporta), enquanto a reaplicação de §3.6.2 é **declaração de intenção de UX** (poupar retrabalho). Invariante de contrato vence intenção de UX, e a intenção é honrada **até onde não o quebre**. A DEC-048 já fixou, para os `offset_horario` (igualmente indexados por posição de parada), a taxonomia "muda ordem/conjunto × não muda" e mandou descartar o que não tem como ser preservado — mas há uma **assimetria** que impede copiá-la cegamente: offset tem fórmula de recomputação (Spec 03 §8.1), **ponto de rota não tem** (é intenção pura do usuário, não derivável de nenhuma fonte). Descartar sempre (opção B) cobraria caro exatamente o que §3.6.2 quer evitar; esta decisão preserva o trabalho nos três casos frequentes e admite a perda só no caso logicamente inevitável. Opção C (clampear) foi descartada por corromper o traçado **em silêncio** — o pior desfecho, porque reatribui o forçamento ao par errado de paradas e contamina `distancia_km`, a matriz e a tarifa sem sinal nenhum (viola RN-042/RN-043 e a norma de §3.6.2). Opção D (bloquear a edição de paradas havendo pontos de rota) contradiz o modelo de edição fluida da Spec 04 §7.3.
  **Consequências:** resolve a Q-037 e **desbloqueia a TASK-066 e a TASK-067**. **Nenhuma mudança de contrato JSON** — `apos_parada_ordem` já existe e a re-ancoragem só altera o **valor** calculado antes de montar a requisição OSRM; a `rota` congelada ecoa os pontos efetivamente aplicados. Spec 02 §10.4/§14 permanecem intocadas — a re-ancoragem é, na verdade, o que torna a validação de §14 **satisfazível** depois de uma remoção de parada (hoje ela é violável por gesto de UI). **Nenhuma alteração de spec:** a regra vive na fronteira "quando/como recalcular" que a Spec 04 já reserva, mesmo enquadramento da DEC-048. **Nenhum impacto no Comparador** (Spec 05 §15.3 compara pontos de rota "pelo efeito", não par-a-par, e leitores nunca recalculam — NEG-019/RN-015); se pontos forem descartados numa reordenação, o diff acusa "pontos de rota alterados", que é a leitura correta. Corrige um bug **alcançável hoje**, sem a TASK-063: importar JSON com `pontos_de_rota` e remover uma parada na tabela lateral produz rejeição não tratada.
  **Impacto em implementação:** escopo da **TASK-066** (desbloqueada) — novo `src/formulario/roteamento/reancorar-pontos-de-rota.ts` (função pura, testável sem UI, recebendo paradas antes/depois e os pontos); `catch` defensivo em `src/formulario/roteamento/cliente-osrm.ts` e/ou `src/formulario/itinerarios/estado-itinerarios.ts` mapeando a violação de intervalo para `FalhaOsrm` (a taxonomia da TASK-022 pode precisar de um caso novo — não é falha de rede nem erro semântico do OSRM); `src/formulario/itinerarios/etapa-itinerarios.tsx` re-ancora antes de reaplicar (hoje reaplica cru, linha ~195). A **TASK-067** (inserção posicional) consome a regra do trecho partido. RN afetadas: nenhuma muda de texto — RN-042 ganha a regra de **como** o índice é mantido válido, RN-048 ganha o caminho da violação de intervalo; RN-041/043/052 permanecem. A detecção "mudou ordem/conjunto de paradas" é a mesma que a **TASK-046** (DEC-048) usa para horários — reusar a comparação de sequência, não duplicar. Sem impacto em `comparador/`, contrato JSON, motor OSRM ou PDF.

## DEC-057 — Vértice de ponto de rota: identidade visual própria (ciano), affordance de hover sobre a linha, e clique-para-remover exclusivo do vértice

**Status:** Aceita · **Superada em parte pela DEC-069** (o vértice **permanece em 9 px**; a cor ciano, o hover e o clique-para-remover continuam valendo) · **O gesto "clique remove o vértice" foi cancelado em 2026-07-24** (a TASK-070, que o implementaria, foi cancelada por decisão do responsável — o botão "Remover" da tabela lateral já cumpre a função de remoção de forma simples e suficiente; ver `06-BACKLOG_INICIAL.md`, TASK-070). As demais partes desta decisão (ciano, hover/fantasma, exclusividade do ponto de rota) permanecem entregues e valendo. · **Origem:** decisão do responsável pelo domínio na conversa da `/revisar-aderencia` da TASK-063 (2026-07-16); Spec 04 §7.3 (itens 4, 5 e 6; regra "ponto de rota não é Seção, Local nem Parada — visual distinto, vértice pequeno sobre a linha, sem rótulo"); Spec 03 §3.6; refina a DEC-054/DEC-055 · **Data:** 2026-07-16
**Decisão:** Fecha três lacunas de UX que a TASK-063 entregou por **inferência controlada** (a spec fixa "vértice pequeno, sem rótulo" e nada mais sobre aparência ou affordance), agora decididas pelo responsável:

- **Identidade visual do vértice** — **ciano**, com mais destaque que o cinza atual (`#334155`, inferido pela TASK-063), e **tamanho intermediário**: maior que os 9 px de hoje, e **sempre menor** que o marcador de Seção/Local (16 px). A hierarquia visual "parada > ponto de rota" é obrigatória e continua atendendo à letra do §7.3 ("vértice **pequeno**"); o ciano dá ao ponto de rota família própria, distinta do azul de Seção e do verde de Local.
- **Affordance de hover sobre a linha** — passar o mouse sobre a linha da rota **muda o cursor** (deixa de indicar pan) e **mostra, sobre a linha, a posição exata** em que o clique criaria o vértice (pré-visualização "fantasma" na projeção do cursor sobre o traçado). O gesto deixa de ser descoberto por tentativa e erro.
- **Clique remove o vértice** — clicar (sem arrastar) sobre um vértice de ponto de rota **remove** aquele ponto e dispara o recálculo (Spec 04 §7.3 item 5, "ponto de rota criado/movido/**removido**" recalcula), no padrão consagrado de editores de rota de mapa.
  - **Exclusivo do ponto de rota.** Clicar num marcador de **Seção ou Local não remove nada** — a remoção de parada continua **só pela tabela lateral**. Sem exceção.
  - O botão **"Remover" da sub-lista permanece** e convive com o gesto: é o único caminho por teclado, e a sub-lista continua listando os pontos.
    **Motivo:** a assimetria "clique remove ponto de rota, mas nunca Seção/Local" **não é arbitrária** — decorre do modelo: ponto de rota **não tem `uuid`, não tem identidade e não é entidade comparável** (RN-042), não entra em matriz nem em tarifa, e refazê-lo custa um clique; uma **Seção tem UUID**, pode ser **compartilhada entre os dois sentidos e entre Serviços** (RN-030), e sua remoção repercute em paradas, trechos, matriz e horários. Dar a um clique perdido o poder de apagar uma Seção seria destrutivo e irreversível pela mesma via; dar-lhe o poder de apagar um ponto de rota é barato e reversível. O custo da remoção precisa ser proporcional ao custo do erro — por isso o gesto rápido fica no que é descartável, e o deliberado (tabela lateral) no que tem identidade. Quanto ao visual: o cinza da TASK-063 era inferência do implementador, não decisão de domínio, e some sobre o traçado; o ciano dá terceira família de cor sem colidir com o azul (Seção), o verde (Local), o vermelho (bloqueante) ou o âmbar (alerta), que a doc 18 já reserva. Quanto ao hover: a Spec 04 §7.3 item 6 manda "clicar sobre a linha" criar o vértice, mas nada na tela **diz** que a linha é clicável — a affordance é o que torna a regra da spec descobrível, e a projeção do cursor sobre o traçado já existe pronta (`projetarNaLinha`, TASK-063).
    **Consequências:** **Nenhuma alteração de spec** — as três decisões vivem no espaço de design que a Spec 04 §7.3 deixa aberto (ela fixa "visual distinto, vértice pequeno, sem rótulo" e o quê, nunca o como), mesmo enquadramento da DEC-054. **Nenhum campo de contrato JSON, nenhuma regra de negócio nova**: remover ponto de rota já era comportamento previsto (§7.3 item 5) e já existe pelo botão da sub-lista desde a TASK-063 — muda só o gesto que o alcança. **Nenhum motor tocado** (roteamento, 350 m, montagem, ancorador). Refina, sem superar, a DEC-054 (marcadores circulares diferenciados) e a DEC-055 (esquerdo sobre a linha cria ponto de rota) — o clique sobre um **vértice** é caso mais específico do que o clique sobre a **linha**, e o vértice **ganha** o desempate: sobre um vértice, esquerdo remove; sobre a linha nua, esquerdo cria. Não há disputa de pixel real (o marcador é elemento DOM acima do canvas do MapLibre, e o `click` do mapa não dispara), mas a precedência fica escrita para que nenhuma task futura a inverta por acidente. Tasks: **TASK-068** (identidade visual), **TASK-069** (affordance de hover), **TASK-070** (clique remove) — independentes entre si, todas dependentes da TASK-063 (entregue). Ordem recomendada: 068 → 069 → 070 (a 069 desenha o fantasma com o token de cor que a 068 cria). Nenhuma bloqueia ou é bloqueada pela TASK-065.
    **Impacto em implementação:** `docs-dev/18-DESIGN_SYSTEM.md` §2 ganha token `--color-ciano-*` (a paleta atual não tem família ciano) e a especificação do vértice — doc 18 é vinculante para UI (DEC-050), logo o token entra lá **junto** com o código, nunca só no CSS. `src/app/globals.css` — `.marcador-mapa-circulo--pequeno` muda de cor/tamanho; classe nova para o fantasma. `src/shared/mapa/mapa.tsx` — `mousemove`/`mouseleave` na camada `ID_CAMADA_LINHAS` com callback aditivo (consumidor sem callback fica inalterado: Comparador e demo pages não mudam), `cursor` via `getCanvas().style.cursor`, e distinção clique × arraste no marcador (comparar posição de `dragstart`/`dragend`, ou `click` no elemento só quando não houve arraste). `src/formulario/itinerarios/editor-mapa-itinerario.tsx` — cor/tamanho do vértice, marcador fantasma, `aoRemoverPontoDeRota` no clique do vértice. `src/formulario/roteamento/posicionar-ponto-de-rota.ts` e `src/shared/mapa/ancoragem.ts` — **reusados sem alteração** (`projetarNaLinha` já dá a projeção do cursor; `removerPontoDeRota` já existe). RN afetadas: nenhuma muda de texto; RN-042 (sem identidade) é o **fundamento** da assimetria de remoção, RN-052 é exercida pelo recálculo do clique-remove, RN-030 é o motivo de a Seção ficar de fora. Testes: `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`, `testes/e2e/etapa-itinerarios.spec.ts` — `data-testid`/`aria-*` existentes preservados (doc 18 §6.5). Sem impacto em `comparador/`, contrato JSON, motor OSRM ou PDF.

## DEC-058 — Os pontos de rota da sessão sobrevivem a um recálculo que falha; `rota.pontos_de_rota` é o eco do último cálculo bem-sucedido

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A (recomendada) da Q-038; `/revisar-aderencia` da TASK-063 (2026-07-16); Spec 03 §3.6.2 (reedição fiel) × RN-048 (falha bloqueante sem degradação silenciosa) · **Data:** 2026-07-16
**Decisão:** Os pontos de rota do itinerário em edição passam a viver num **estado de sessão próprio**, que **sobrevive** à transição para `sem-rota` (RN-048), em vez de serem derivados de `estadoAtual.rota.pontos_de_rota` — que deixa de existir quando o recálculo falha. A intenção do usuário (quais pontos forçam o traçado) e o resultado do cálculo (a rota congelada) passam a ser coisas separadas:

- **Fonte da verdade em edição:** a lista de pontos de rota da sessão. É ela que os gestos (criar/mover/remover) alteram, que o mapa desenha e que a sub-lista mostra — inclusive enquanto o itinerário está em `sem-rota`.
- **`rota.pontos_de_rota` no JSON:** continua sendo o **eco dos pontos efetivamente aplicados** no último recálculo bem-sucedido, gravado junto da rota congelada (Spec 02 §10.4, Spec 03 §3.6.2). Nada muda no contrato nem para os leitores.
- **Ao abrir um JSON:** a lista da sessão nasce de `rota.pontos_de_rota` do arquivo (reedição fiel, §3.6.2) — o caminho de entrada é o mesmo de hoje.
- Uma falha de rota deixa de apagar o trabalho manual do usuário: corrigido o que causou a falha, o próximo recálculo bem-sucedido reaplica os pontos que já estavam lá.
  **Motivo:** a Spec 03 §3.6.2 diz que o **ganho** de persistir pontos de rota é a "reedição fiel" — reproduzir o traçado forçado "sem retrabalho manual". Derivá-los do resultado do cálculo inverte a dependência: o dado que **causa** a rota passa a depender da rota **existir**, e some justamente no momento em que o cálculo falha. Como `router.project-osrm.org` é servidor de demonstração **sem SLA** (registro explícito da Spec 04 §7.3), a falha é transitória e corriqueira: punir o trabalho manual do usuário por um soluço de servidor é desproporcional e derrota a finalidade de §3.6.2 — o que descarta a **opção B**. A perda é ainda **silenciosa**, o desfecho que a RN-048 mais rejeita ("sem degradação silenciosa"); o texto da RN-048 fala da rota, não dos pontos, mas o espírito é o mesmo e a leitura conservadora é honrá-lo. A **opção C** (resolver dentro da TASK-066) foi descartada por **ordem de dependência**, não por mérito: a re-ancoragem da DEC-056 opera sobre "a lista de pontos a reaplicar" — construir re-ancoragem sobre uma lista que evapora numa falha é construir sobre areia. Arrumar a fonte da verdade **primeiro** deixa a TASK-066 mais simples, não mais cara. Ponto de rota, diferente de `offset_horario` (DEC-048), **não tem fórmula de recomputação** — é intenção pura do usuário, não derivável de fonte nenhuma; o que se perde, perde-se para sempre. Esse é o mesmo argumento que a DEC-056 usou para preservar pontos onde é determinístico, e aplicá-lo aqui é consistência, não regra nova.
  **Consequências:** resolve a **Q-038**. **Nenhuma mudança de contrato JSON** — `rota.pontos_de_rota` mantém campo, semântica e schema; muda apenas **de onde** a UI lê a lista enquanto edita (estado efêmero de sessão, RN-096/NEG-004: nada gravado antes da exportação). **Nenhuma alteração de spec** — a decisão implementa §3.6.2 à letra, e a fronteira "estado de sessão × documento" é a mesma da DEC-035/DEC-053. **Nenhum impacto no Comparador, PDF ou Ingestor** (leitores nunca recalculam — RN-015/NEG-019; o que eles leem é o eco congelado, inalterado). Corrige um defeito **anterior à TASK-063** e alcançável sem ela (abrir JSON com `pontos_de_rota` + falha de OSRM no recálculo seguinte). Vira a **TASK-071**, que **precede a TASK-066** — as duas tocam o mesmo ponto (reaplicação dos pontos antes de montar a requisição), e a ordem 071 → 066 evita retrabalho. Levanta um desdobramento honesto para a TASK-071 resolver com a regra já existente: em `sem-rota` **não há linha** para ancorar um ponto novo (o mapa não desenha rota), então **criar** ponto de rota segue indisponível — o que sobrevive é o que já existia, e isso basta para fechar a Q-038.
  **Impacto em implementação:** escopo da **TASK-071**. `src/formulario/sessao.ts` — a lista de pontos de rota por itinerário passa a ser estado de sessão (chave `servicoUuid`+`sentido`, como `paradasEmEdicaoMapa`/`estadosRotaViva` já fazem). `src/formulario/itinerarios/etapa-itinerarios.tsx` — `pontosDeRotaAtual` (hoje derivado de `estadoAtual.rota`, linhas ~202-205) passa a ler o estado novo; os handlers da TASK-063 (`aoCriarPontoDeRota`/`aoMoverPontoDeRota`/`aoRemoverPontoDeRota`) comitam nele; a hidratação a partir do arquivo importado alimenta-o na abertura. `src/formulario/roteamento/posicionar-ponto-de-rota.ts` e o motor de intercalação — **reusados sem alteração**. RN afetadas: nenhuma muda de texto — RN-042 e RN-048 ganham o caminho "falha não descarta pontos", RN-096/NEG-004 confirmam que a lista é efêmera até exportar. Testes: unitário da sobrevivência (`congelada` → gesto → OSRM falha → `sem-rota` → gesto → OSRM ok → a rota gravada contém os pontos anteriores) e E2E com OSRM mockado alternando falha/sucesso — o caso inválido que a revisão da TASK-063 apontou como lacuna. Sem impacto em `comparador/`, contrato JSON, motor OSRM ou PDF.

## DEC-059 — TASK-062 (E2E criar-do-zero ponta a ponta) depende da TASK-032 e é re-sequenciada para depois dela

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio na `/analisar-task` da TASK-062 (2026-07-17), opção (a) da Q-039; Spec 04 §10 (Revisão) e §12 (Exportação); RN-078 (gate de exportação), RN-018, RN-004 · **Data:** 2026-07-17
**Decisão:** A TASK-062 passa a **depender da TASK-032** (Revisão e validação final — a dona da tela de Revisão e do gate/botão de exportação) e é **re-sequenciada para depois dela**: a cadeia deixa de ser `061 → 062` e passa a `061 → 032 → 062` (a 062 continua também dependente da 061, cuja promoção `ServicoEmConstrucao → Servico` o E2E exercita). O E2E é **simplificado**: dirige o fluxo "novo" inteiro (Identificação → Serviços → itinerário no mapa → Viagens → Matrizes → Revisão → Exportação) usando o botão de exportação e o gate **reais** que a TASK-032 entrega, e valida o JSON exportado (schema strict + round-trip de UUID) a partir do download real — sem contornos nem `data-testid` improvisados. OSRM sempre mockado (DEC-029).
**Motivo:** a `/analisar-task` da TASK-062 descobriu que as etapas Revisão/Exportação ainda são placeholder (`src/formulario/layout/layout-formulario.tsx:211-216`) e que a camada pura `exportarComoProposta`/`exportarComoVigente` não está ligada a nenhum botão — a UI de exportação é escopo da TASK-032, não implementada. Sem ela, 3 dos 5 critérios de aceite da TASK-062 (exportação produz JSON válido, round-trip de UUID no JSON exportado, e o caso inválido de bloqueio da exportação sem ≥ 1 Serviço — RN-018/RN-078) **não são exercitáveis via UI**. As alternativas rejeitadas: a opção (b) (dividir, entregando já a regressão-guarda e deferindo o leg de exportação) fragmentaria o E2E que o próprio título promete "ponta a ponta"; a opção (c) (validar o export como teste de integração fora da UI) contradiz a natureza de E2E da task e o critério "disparar a exportação" pela interface. Esperar a TASK-032 entrega o fluxo inteiro de uma vez, com o botão e o gate reais, e é o caminho mais simples e fiel ao título — "uma task por vez", sem inventar UI de exportação dentro da 062.
**Consequências:** resolve a **Q-039**. **Nenhuma alteração de spec, contrato JSON ou regra de negócio** — é decisão de **sequenciamento e escopo de teste**. A razão de existir da TASK-062 (fechar a lacuna da Q-034: nenhum E2E cobre o fluxo criar-do-zero, só o de JSON aberto) permanece intacta; muda apenas **quando** ela roda (depois da TASK-032) e que ela pode assumir a UI de exportação pronta. A regressão-guarda da promoção (TASK-061) continua no escopo — o E2E confirma que, após concluir o itinerário no modo "novo", Viagens e Matrizes enxergam o Serviço. A ressalva de cobertura da revisão da TASK-061 (fiação da promoção sem teste de integração dedicado) segue endereçada por esta TASK-062, agora depois da TASK-032.
**Impacto em implementação:** escopo da **TASK-062** (quando desbloqueada pela TASK-032). Novo `testes/e2e/fluxo-novo.spec.ts` que dirige o fluxo "novo" com OSRM e tiles mockados (`page.route`, padrão de `testes/e2e/etapa-itinerarios.spec.ts` — não há helper compartilhado), captura o download da exportação (evento `download` do Playwright), valida o JSON contra `esquemaDocumentoOperacao` (Spec 02 §14) e reimporta para o round-trip de UUID (RN-004). Consome os `data-testid` do botão/gate de exportação que a **TASK-032** criar — a 062 não deve inventar seletores de exportação próprios. Atenção (RN-039): o Serviço promovido nasce com `viagens: []` e só passa no `esquemaServico` strict após ≥ 1 Viagem, então a etapa Viagens é obrigatória no roteiro. Sem alteração de `src/` de produção além de eventuais `data-testid` mínimos **só** se algum passo do fluxo não for selecionável (os existentes são intocáveis — DEC-050). Sem impacto em `comparador/`, motor OSRM, PDF ou contrato JSON.

## DEC-060 — Pontos de rota entram na tabela lateral, intercalados na ordem da travessia, com setinhas e "Remover"; a posição na lista unificada passa a reger a ancoragem

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-040, modificada por ele); `/investigar-conflito` de 2026-07-17 (conflito interno da Spec 04 §7/§7.3 item 3 × regra explícita de UX da §7.3) · **Data:** 2026-07-17
**Decisão:** Os pontos de rota passam a ser exibidos **na mesma tabela lateral** das paradas, **intercalados na ordem real da travessia** (derivada de `apos_parada_ordem` + índice no array — Spec 03 §3.6.1), como **itens visualmente distintos**: sem nome, sem município, sem o padrão `Cidade - Nome` (RN-042/RN-076), **com** as ações de **subir/descer por setinha** e o botão **"Remover"**. A sub-lista própria abaixo do mapa (TASK-063) deixa de existir. A semântica das setinhas é posicional: **a posição do item na lista unificada determina a que trecho o ponto pertence** — mover um ponto de rota (ou uma Seção/Local) pela lista faz os pontos ultrapassados passarem a pertencer ao outro trecho (re-ancoragem pela posição na lista), com recálculo da rota (RN-052).
**Motivo:** dado pelo responsável: a sub-lista solta abaixo do mapa é ruim de usar — o ponto de rota pertence ao contexto da travessia e deve aparecer entre as paradas que ele conecta; e as setinhas respondem, pela própria lista, o que acontece quando Seções/paradas sobem ou descem ultrapassando pontos (eles passam a fazer parte de outro trecho). A leitura adotada trata a redação "sem entrada na tabela de paradas" da Spec 04 §7.3 como imprecisa neste ponto ("sem ser tratado como parada", não "fisicamente em lista separada") — os trechos de §7 e §7.3 item 3 ("a tabela lateral lista Seções, paradas comuns e pontos de rota na ordem da travessia") passam a ser a leitura vigente.
**Consequências:** resolve a **Q-040** e desbloqueia a **TASK-079**. **Supera em parte a DEC-056 (Q-037):** o caso "reordenação de paradas → descartar os pontos de rota com aviso" deixa de valer — reordenar pela tabela passa a **re-ancorar pela posição na lista unificada** (os pontos preservam sua posição relativa na lista e passam a pertencer ao par de paradas que os cerca), sem descarte; os demais casos da DEC-056 (acrescentar ao fim; inserir no meio; remover parada; `throw` → `sem-rota` da RN-048) permanecem. A **TASK-066** deve ser implementada já com este comportamento (critério de aceite da reordenação atualizado no backlog). O ponto de rota continua sem identidade (RN-042 intocada — o número/posição é indicação de UI, nunca `uuid`/nome) e o contrato JSON não muda. Cabe ao dono da spec alinhar a redação da Spec 04 §7.3 (a exemplo da DEC-052).
**Impacto em implementação:** TASK-079 (lista unificada na etapa; remoção da sub-lista; setinhas com re-ancoragem posicional) e TASK-066 (caso da reordenação atualizado); TASK-064 (sync tabela↔mapa) projeta sobre a lista unificada. Arquivos: `src/formulario/itinerarios/etapa-itinerarios.tsx`, `editor-mapa-itinerario.tsx`, `src/formulario/roteamento/reancorar-pontos-de-rota.ts` (TASK-066), testes correspondentes.

## DEC-061 — Realocação de Seção inteira: gesto explícito de translação rígida de todos os pontos do cluster

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-041) · **Data:** 2026-07-17
**Decisão:** Passa a existir um **gesto explícito de "mover Seção inteira"**: entrar no modo de realocação exibe **todos** os pontos contribuídos à Seção (todas as entradas de `secao.servicos[]`, Ida e Volta) e o arrasto move o conjunto todo pelo **mesmo vetor** (translação rígida); confirmar no soltar, com gesto de cancelamento. Ao confirmar: o município é re-derivado do novo centroide (RN-029; fora de SP → recusa integral), **todos** os itinerários de **todos** os Serviços que referenciam a Seção têm a rota recalculada (RN-052) e as matrizes reconciliadas (RN-054..057). A UUID da Seção e as entradas de `secao.servicos[]` são preservadas (RN-004). O arrasto simples de um ponto **continua** com o comportamento da DEC-044 (recusa >350 m, só a mensagem) — a DEC-044 não é revogada, é complementada por um gesto distinto e deliberado.
**Motivo:** a translação rígida preserva o invariante dos 350 m por construção (as distâncias ao centroide não mudam — RN-027 intocada) e é o **único** caminho que corrige o lugar de uma Seção mal posicionada **preservando a identidade** (a alternativa — apagar e recriar — troca a UUID e destrói a comparabilidade, RN-004/Spec 01 §6). A dor é real e foi verificada em teste manual: mover ponto a ponto sob os 350 m do centroide do conjunto é impraticável.
**Consequências:** resolve a **Q-041** e desbloqueia a **TASK-078**. Nenhum campo novo no contrato; nenhuma alteração na regra dos 350 m. O desenho exato do gesto (entrada no modo, cancelamento) é design sob DEC-050/doc 18, fixado na `/analisar-task` da TASK-078 — candidato da conversa: item "Mover Seção" em menu de contexto do marcador, cancelamento por `Esc` (evita colisão com o clique direito da DEC-055 e o clique-remove da TASK-070).
**Impacto em implementação:** TASK-078 — `src/formulario/secoes/fluxos-secao.ts` (função pura de translação), `editor-mapa-itinerario.tsx` (modo de realocação), `etapa-itinerarios.tsx` (recálculo em cascata multi-Serviço), doc 18 (estado visual do modo).

## DEC-062 — Ida e Volta visíveis no mesmo mapa; sentido ativo por abas; itens numerados na ordem da viagem; ponto do sentido inativo em segundo plano

**Status:** Aceita · **Cancelada em 2026-07-24** (a TASK-076, que a implementaria, foi cancelada por decisão do responsável — a troca de aba entre Ida e Volta já é simples e a informação já está bem estruturada; não há ganho percebido em ver os dois sentidos no mesmo mapa. Ver `06-BACKLOG_INICIAL.md`, TASK-076). Mantida no histórico só como registro do que foi considerado e não será implementado. · **Origem:** decisão do responsável pelo domínio (opção A da Q-042, com detalhamento dele na conversa de 2026-07-17) · **Data:** 2026-07-17
**Decisão:** A etapa de itinerários passa a exibir **Ida e Volta no mesmo mapa**: checklist de visibilidade por sentido; Ida em linha cheia e Volta **tracejada**, cores próprias por sentido (tokens do doc 18). O **sentido ativo** é selecionado por um **botão tipo aba** (Ida/Volta): trocar a aba troca também o conteúdo da **tabela lateral** (Seções, Locais e pontos de rota do sentido ativo, na ordem em que o veículo passa — a lista unificada da DEC-060). Os itens (Seções, Locais e pontos de rota) ficam **numerados (1, 2, 3, 4…) na ordem da viagem**, exatamente como ocorrem na tabela lateral do sentido ativo — a numeração aparece nos marcadores do mapa. Uma Seção tem ponto de Ida e de Volta: o ponto do **sentido ativo fica numerado**; o do sentido inativo fica com a **mesma tonalidade, levemente acinzentado, em segundo plano**, com o ativo sempre à frente (z-order). Gestos com alvo natural editam o sentido do marcador arrastado; gestos ambíguos (criar por clique direito, clique na linha) vão para o **sentido ativo**. Os **dois painéis de descrição textual** (Ida e Volta) aparecem embaixo, cada um com copiar / recalcular / ver itens estruturados (Spec 04 §7.4). Recálculo continua por sentido (RN-052); abrir JSON desenha as duas rotas congeladas sem chamar OSRM (RN-015/052).
**Motivo:** dado pelo responsável: alternar abas exclusivas esconde o contexto — a Volta precisa ser vista junto da Ida para o traçado fazer sentido; o tracejado e as cores diferenciam os sentidos de imediato; a numeração torna a ordem da viagem legível no próprio mapa.
**Consequências:** resolve a **Q-042** e desbloqueia a **TASK-076**. A numeração é indicação posicional de UI — o ponto de rota continua sem nome/identidade (RN-042); a redação "sem rótulo" da Spec 04 §7.3 fica a alinhar pelo dono se entendida como conflitante com o número. Compatível com a Spec 04 §7.4 (painel por Serviço **e sentido**). Com a DEC-063 (Volta espelhada), a tabela da Volta é derivada da Ida — a aba de sentido rege ajustes por sentido (posições, Locais, pontos de rota).
**Impacto em implementação:** TASK-076 — `etapa-itinerarios.tsx` (estado por sentido em paralelo; abas; dois painéis de descrição), `editor-mapa-itinerario.tsx` (marcadores dos dois sentidos, numeração, segundo plano do inativo), `src/shared/mapa/mapa.tsx` (linha tracejada — extensão aditiva; rótulo numérico no marcador), doc 18 (tokens de cor por sentido, espec do tracejado/numeração/segundo plano).

## DEC-063 — Volta é o espelho da Ida: ordem das Seções da Volta = inverso exato da Ida (regra dura na Spec 02 §14); montagem automática e reuso ofertando só Seções ainda não usadas no Serviço

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-043); Spec 02 §14 **já editada pelo dono da spec** (2026-07-17) e RN-030 atualizada por ele no RULE_INDEX · **Data:** 2026-07-17
**Decisão:** Num Serviço bidirecional, a sequência de Seções da Volta é **necessariamente o inverso exato** da Ida (Ida A→B→C→D ⇒ Volta D→C→B→A) — agora **validação estrutural** da Spec 02 §14 (editada pelo dono: "sendo inclusive espelhados… se na ida as seções são ABCD, na volta necessariamente são DCBA"); só os Locais comuns intermediários (e os pontos de rota) podem diferir entre os sentidos. O Formulário **monta a Volta automaticamente**: inserir/remover/reordenar Seção na Ida reflete na Volta na posição inversa (e vice-versa); a edição da Volta se restringe ao que é por sentido (posições de pontos, Locais, pontos de rota). O painel "Reutilizar Seção existente" deixa de ofertar Seções já usadas no itinerário do Serviço corrente — o reuso serve para trazer Seções **de outros Serviços**; ao reutilizar num Serviço bidirecional, a Seção entra nos dois sentidos, na posição inversa correspondente.
**Motivo:** regra de domínio afirmada pelo responsável (operação ARTESP/SUCOL): "ABCD sempre volta DCBA — não pode ir passando de um jeito e voltar passando de outro". Sem a regra dura, um documento com Volta fora de ordem seria válido em silêncio; sem o espelhamento automático, o usuário monta a Volta duas vezes à mão (a dor relatada) e o reuso da própria Ida vira ruído.
**Consequências:** resolve a **Q-043** e desbloqueia a **TASK-077**. Por estar na Spec 02 §14, a validação segue o tratamento estrutural existente da RN-030 (trava dura na importação/exportação/Revisão): **JSON importado com Volta fora da ordem inversa passa a ser recusado** como violação estrutural. A RN-030 do RULE_INDEX já foi atualizada pelo dono ("a ordem deve ser a inversa, ABCD vira DCBA"). Pendência de alinhamento apontada ao dono: a Spec 02 **§2** (visão geral da árvore) ainda descreve só o conjunto idêntico, sem a ordem — alinhar a redação; conferir também Spec 01 §8 e Spec 03 §4.2 (indiferente à ordem — sem impacto de cálculo). O espelhamento não cria UUIDs (RN-004); a criação espelhada de pontos da Spec 04 §7.1 permanece.
**Impacto em implementação:** TASK-077 — `motor-montagem.ts` (espelho puro Ida↔Volta), `etapa-itinerarios.tsx` (commit dos dois sentidos por gesto de Seção), `editor-mapa-itinerario.tsx` (filtro do reuso), `src/shared/contrato/validacoes-estruturais.ts` (validação nova da ordem inversa em `validarServico`, agora com base na Spec 02 §14 editada), fixtures/testes de contrato (round-trip). Interage com a promoção (DEC-053): "ambos" pode promover num gesto só, com a Volta derivada.

## DEC-064 — Etapa Identificação (fluxo novo): pré-visualização do Autos e congelamento só no "Confirmar Autos"

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-044) · **Data:** 2026-07-17
**Decisão:** No fluxo "novo", escolher um Autos no dropdown **não cria o documento**: exibe uma **pré-visualização** com os dados do registro da lista estática — código, denominação da linha (origem–destino), empresa, tipo e situação (`operante`) — e a seleção pode ser trocada livremente. O botão **"Confirmar Autos"** é o ato que **cria o documento** e congela `codigo`/`empresa` (Spec 04 §5); a partir daí o Autos não pode mais ser trocado. Autos `operante: true` exibe na pré-visualização o reforço da recomendação de carregar o JSON vigente (Spec 04 §3.1, parte final).
**Motivo:** o congelamento imediato na seleção (inferência controlada da TASK-015) é hostil — um clique errado no dropdown não tem recuperação. A Spec 04 §5 não fixa o momento da "criação do documento"; fixá-lo na confirmação explícita elimina o erro sem contradizer a spec e usa dados que a lista estática já tem (nenhum dado novo, nada persistido — `denominacao_linha`/`operante` são só exibição).
**Consequências:** resolve a **Q-044** e desbloqueia a **TASK-075**. O modo "carregado" não muda (identidade vem do JSON). A editabilidade do `tipo` e a reconversão (DEC-034) permanecem como estão após a confirmação. RN-016 intocada (a seleção continua vindo das listas estáticas).
**Impacto em implementação:** TASK-075 — `src/formulario/identificacao/identificacao.tsx` (estado local de seleção candidata + painel de pré-visualização + botão de confirmação); E2E que criam documento do zero ganham o passo de confirmação (atualização deliberada).

## DEC-065 — Aviso obrigatório do "Criar Autos do zero": nova redação na Spec 04 §3.2 (dono da spec), com texto proposto pela implementação

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção B da Q-045); Spec 04 §3.2 já editada pelo dono com a instrução de redação · **Data:** 2026-07-17
**Decisão:** O texto do aviso obrigatório do fluxo "criar do zero" é **substituído** por redação simples e clara, definida na Spec 04 §3.2 pelo dono da spec. O dono registrou na spec a instrução/ideia e pediu a proposta de texto à implementação. **Texto proposto** (a ser colado pelo dono na §3.2, no lugar do placeholder — `docs/specs/**` é read-only para a implementação):

> "Este documento será criado do zero, sem partir de um JSON anterior. Use este caminho apenas se a linha ainda não tem arquivo ROTA (primeira criação) ou se o arquivo anterior foi perdido. Sem o JSON anterior, não será possível comparar esta versão com a operação atual: o Comparador tratará tudo como novo."

**Motivo:** dado pelo responsável: o texto atual é técnico demais ("preservação de identidade das entidades") para o momento da escolha; o aviso deve dizer, em bom português, que a comparação não será possível e quando o caminho deve ser usado (primeiro arquivo da linha, ou arquivo perdido).
**Consequências:** resolve a **Q-045**. A **TASK-073** adota o literal final da §3.2 assim que o dono substituir o placeholder (até lá, o placeholder não deve ir para a UI — a task aguarda o texto fixado). O conteúdo normativo permanece o mesmo (sem JSON anterior não há identidade preservada; Comparador trata tudo como novo — RN-004/017).
**Impacto em implementação:** TASK-073 — `src/formulario/tela-inicial/tela-inicial.tsx` (novo literal no diálogo); E2E da tela inicial que asserta o texto do aviso é atualizado junto (mudança deliberada, registrada).

## DEC-066 — Documento criado do zero grava `versao_schema` fixo `"1.0"`, herdado do exemplo mínimo da Spec 02 §15

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-046), confirmando retroativamente a implementação já entregue na TASK-032 · **Data:** 2026-07-17
**Decisão:** Um documento criado do zero no Formulário (modo "novo", sem JSON de origem) grava `versao_schema: "1.0"` — o mesmo literal do exemplo mínimo da Spec 02 §15 —, mantido num único ponto do código (`VERSAO_SCHEMA_ATUAL` em `src/shared/contrato/esquema.ts`). O modo "carregado" continua preservando a `versao_schema` do JSON de origem, inalterada.
**Motivo:** não há JSON de origem de onde herdar a versão no fluxo "novo"; `"1.0"` é o único valor com base normativa (o exemplo da própria spec), evitando inventar uma fonte nova.
**Consequências:** resolve a **Q-046**. Formaliza, com registro, a decisão que a TASK-032 já havia tomado por inferência sem Q-xxx correspondente — achado da revisão de aderência (`docs-dev/14-REVISOES/TASK-032-20260717.md`). Se o contrato mudar de versão no futuro, `VERSAO_SCHEMA_ATUAL` é o único ponto a atualizar.
**Impacto em implementação:** nenhum código novo — já implementado em `src/shared/contrato/esquema.ts` (TASK-032). Atualizar os comentários/testes que citavam "Q-046, opção (a)" solta para referenciar a DEC-066 registrada (`src/shared/contrato/esquema.ts`, `testes/unitarios/formulario/montar-documento.test.ts`).

## DEC-067 — Violação técnica pré-existente (350 m / tipificação) num documento carregado: alerta ao abrir/editar, bloqueante ao exportar

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-047) · **Data:** 2026-07-17
**Decisão:** As checagens técnicas de 350 m estático de Seção (RN-028), 350 m pareado de Local (RN-032) e tipificação `tipo` × `caracteristica_veiculo` (RN-019..022) continuam **alerta não bloqueante ao abrir/visualizar/editar** um documento (RN-091 intocada — o usuário sempre consegue abrir o arquivo, ver o problema e corrigi-lo). A **exportação**, porém, passa a **bloquear** (Spec 04 §11) enquanto qualquer uma dessas violações persistir no documento no momento do clique em "Exportar proposta"/"Definir como vigente" — reaproveitando a mesma lógica pura já existente (`coletarAlertasTecnicos`, `src/shared/checagens-leitor/checagens-leitor.ts`), sem duplicar a checagem.
**Motivo:** dado pelo responsável: "o JSON errado deve ser carregado e deve ser possível ser visto, alterado e deve avisar e não bloquear. O bloqueio deve ocorrer na hora de exportar o JSON, para que não seja permitido que ele exporte coisa errada e seja obrigado a corrigir para exportar." Reconcilia a RN-091 (alerta na leitura) com a Spec 04 §11 (bloqueante na Revisão/Exportação) tratando-as como regras do mesmo requisito em momentos diferentes, não como contradição.
**Consequências:** resolve a **Q-047**. Fecha uma lacuna encontrada na revisão de aderência da TASK-032 (`docs-dev/14-REVISOES/TASK-032-20260717.md`): o gate de exportação (`gate-exportacao.ts`) ainda não reaplicava essas duas checagens. Não afeta a RN-091 nem `checagens-leitor.ts` em si — a mudança é só no ponto de exportação. Distinto da TASK-078 (DEC-061): aquela evita que uma **nova** violação de 350 m seja criada durante a edição ao vivo; esta cobre o caso de um documento que **já chega** com a violação (importado ou nunca detectado).
**Impacto em implementação:** task nova (backlog) — `src/formulario/exportacao/gate-exportacao.ts` (reaplicar `coletarAlertasTecnicos` sobre o documento montado, tratando qualquer alerta como bloqueante nesse ponto específico), `src/formulario/pendencias/pendencias.ts` ou o próprio gate (decidir na `/analisar-task` onde entram as novas pendências bloqueantes — mensagens da Spec 04 §14, `etapaAlvo` apontando para Seções/Locais/Serviços conforme o caso).

## DEC-068 — Ponto de rota órfão (trecho terminal removido ao apagar parada de extremo) é descartado, com aviso não bloqueante

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio (opção A da Q-048), na conversa de 2026-07-17; ressalva da revisão de aderência da TASK-066 (`docs-dev/14-REVISOES/TASK-066-20260717.md`) · **Data:** 2026-07-17
**Decisão:** Quando a remoção de uma parada de **extremo** (a primeira ou a última do itinerário) faz um trecho terminal **deixar de existir por inteiro**, os pontos de rota daquele trecho ficam **órfãos** (não há trecho a que re-ancorar — ao contrário da remoção de uma parada do meio, em que os dois trechos adjacentes se fundem, DEC-056). Esses pontos órfãos são **descartados**, com **aviso não bloqueante** na etapa (nunca pendência de §11, que é lista fechada — mesmo tratamento que a DEC-056 deu ao descarte na reordenação; precedente DEC-047). Os demais casos permanecem: remoção do meio funde (sem descarte); reordenação re-ancora sem descarte (DEC-060); inserção e acréscimo ao fim inalterados. Em todos os caminhos, `apos_parada_ordem` resultante fica em `[1, paradas.length − 1]` (RN-042) — agora **pela própria função** de re-ancoragem, não só pela rede de segurança da RN-048.
**Motivo:** dado pelo responsável — "o ponto de rota que fica órfão deve ser excluído, pois não faz mais sentido". Um ponto de rota força o traçado **de um trecho específico**; removido o trecho terminal, o ponto não força mais nada e preservá-lo só produziria um `sem-rota` inexplicável (o comportamento que a TASK-066 entregou por conservadorismo, sinalizado como ressalva). O ponto de rota não tem identidade (`uuid`), não entra em matriz nem tarifa, e refazê-lo custa um clique (mesmo argumento da DEC-056/DEC-057); descartá-lo com aviso é barato, reversível e coerente. A opção C (clampear) foi rejeitada pela mesma razão da DEC-056: reatribui o forçamento ao par errado e corrompe `distancia_km`/matriz/tarifa em silêncio (RN-043).
**Consequências:** resolve a **Q-048**. **Supera a ressalva da revisão da TASK-066:** o comportamento passa de "órfão → `apos_parada_ordem` fora do intervalo → `sem-rota` via rede da RN-048" para "órfão → descartado com aviso". A rede de segurança da RN-048 (o `catch` em `solicitarRota` que converte o `throw` de `intercalar-pontos-de-rota.ts` em `sem-rota`) **permanece** como defesa em profundidade contra um documento importado já corrompido — ela não some, deixa de ser o caminho normal do gesto de remoção. **Nenhuma mudança de contrato JSON** (a re-ancoragem só altera o valor calculado antes da requisição OSRM; `pontos_de_rota` congelado ecoa os pontos efetivamente aplicados). **Nenhuma alteração de spec.** **Nenhum impacto no Comparador** (Spec 05 §15.3 compara pontos "pelo efeito"; um descarte aparece como "pontos de rota alterados", leitura correta) nem no PDF. Corrige o subcaso que a DEC-056 não cobriu (ela descreve remoção do meio, "dois trechos que se fundem"; a remoção de extremo não tem dois trechos).
**Impacto em implementação:** **TASK-083** (nova) — `src/formulario/roteamento/reancorar-pontos-de-rota.ts` filtra, na remoção, os pontos cujo `apos_parada_ordem` re-ancorado cairia fora de `[1, paradas.length − 1]` (os órfãos do trecho terminal); `src/formulario/itinerarios/etapa-itinerarios.tsx` expõe o aviso não bloqueante quando o descarte ocorre. Fecha também os dois follow-ups da revisão da TASK-066 (corrigir o docstring da pós-condição, que passa a valer pela função; e o teste da remoção de extremo). RN afetadas: nenhuma muda de texto — RN-042 ganha "descarta o órfão em vez de sair do intervalo", RN-048 mantém a rede como defesa em profundidade. Sem impacto em `comparador/`, contrato JSON, motor OSRM ou PDF.

## DEC-069 — Vocabulário visual dos marcadores do mapa: Seção quadrada, Local circular de 12 px, vértice de ponto de rota ciano mantido em 9 px

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio na conversa da `/revisar-aderencia` da TASK-067 (2026-07-21); Spec 04 §7/§7.3; DEC-050/doc 18 (governança de UI); supera em parte a DEC-054 e em parte a DEC-057 · **Data:** 2026-07-21
**Decisão:** Os três marcadores do mapa único de itinerários passam a se distinguir por **forma e tamanho**, não só por cor:

- **Seção** — **quadrado azul**, 16 px (a **cor não muda**: segue o azul atual). Substitui o círculo azul fixado pela DEC-054.
- **Local (ponto de parada)** — **círculo verde de 12 px** (era 16 px). Cor e forma não mudam; só o tamanho.
- **Ponto de rota** — **círculo ciano de 9 px**: a cor nova da DEC-057 é confirmada, o **tamanho permanece em 9 px**. Substitui a parte da DEC-057 que mandava aumentá-lo ("maior que os 9 px de hoje").
  Hierarquia resultante, verificável por teste: `ponto de rota (9) < Local (12) < Seção (16)`, com três formas/tamanhos distintos.
  **Motivo:** dado pelo responsável. Diferenciar Seção de Local **apenas por cor**, como a DEC-054 fixou, é o elo fraco do desenho atual: azul e verde de mesma forma e mesmo tamanho se confundem sobre a base cartográfica e são praticamente idênticos para as formas mais comuns de daltonismo (deuteranopia/protanopia). Forma passa a ser o canal primário (**quadrado = Seção**, **círculo = não-Seção**), tamanho o secundário (**12 = parada**, **9 = ponto de rota**), e a cor vira reforço redundante — a mesma lógica de acessibilidade que o doc 18 já aplica a estados (nunca só cor). Encolher o Local de 16 para 12 px também restaura a hierarquia "parada > ponto de rota" que a DEC-057 buscava, mas **por baixo** (aproximando o Local do vértice) em vez de **por cima** (aumentando o vértice): o vértice fica onde está, continua atendendo à letra da Spec 04 §7.3 ("vértice **pequeno** sobre a linha") e ganha destaque pela **cor** ciano, que é o que a DEC-057 de fato queria resolver — o cinza `#334155` sumia sobre o traçado. Aumentar o vértice, como aquela decisão previa, teria espremido a faixa livre de tamanho em 1 px (entre 9 e 12) sem benefício real.
  **Consequências:** **supera em parte a DEC-054** — cai a cláusula "marcadores **circulares** para ambos, com diferenciação visual entre Seção e Local (cor/preenchimento)"; todo o resto daquela decisão (gestos — já invertidos pela DEC-055 —, tabela lateral à direita, ausência de barra de ferramenta, deferimento de TASK-063/064) **continua valendo**. **Supera em parte a DEC-057** — cai apenas "tamanho intermediário: maior que os 9 px de hoje"; a cor ciano, a affordance de hover sobre a linha (TASK-069) e o clique-para-remover exclusivo do vértice (TASK-070) **continuam valendo sem alteração**. **Nenhuma alteração de spec:** a Spec 04 §7 exige os três tipos no mesmo mapa e não fixa aparência — forma, cor e tamanho de marcador são matéria do doc 18 sob DEC-050. **Nenhuma mudança de contrato JSON, de modelo de domínio ou de regra RN** — Seção e Local continuam entidades distintas por definição (RN-025/031), e a mudança visual apenas torna essa distinção legível; o ponto de rota segue sem identidade, sem rótulo e fora da tabela de paradas (RN-042, RN-076). **Nenhum impacto no Comparador, no PDF nem no motor de roteamento.** Desbloqueia a **TASK-068**, que nascia em contradição com a DEC-054 vigente.
  **Impacto em implementação:** escopo da **TASK-068** (ampliada em 2026-07-21) — `src/shared/mapa/mapa.tsx` ganha `forma: "quadrado"` como valor **aditivo** da união `"pino" | "circulo"` (nenhum consumidor atual usa `"quadrado"`; o Comparador e as demo pages não mudam); `src/app/globals.css` recebe a classe do quadrado e o novo tamanho do círculo de Local, com borda/sombra proporcionais; `src/formulario/itinerarios/editor-mapa-itinerario.tsx` troca `forma`/`tamanho` de Seção e Local e a constante `COR_MARCADOR_PONTO_DE_ROTA`; `docs-dev/18-DESIGN_SYSTEM.md` §2 registra o token ciano novo e especifica as três formas (**vinculante, entra junto com o código** — DEC-050). Testes: `editor-mapa-itinerario.test.tsx` (as asserções de `forma: "circulo"` da Seção passam a `"quadrado"`; hierarquia de tamanho aferida por teste, não por inspeção visual) e `testes/unitarios/mapa/mapa.test.tsx`. O marcador **pendente** (âmbar) e o `forma: "pino"` usado fora do mapa de itinerários ficam **inalterados**. Nenhum `data-testid`/`aria-*` muda (DEC-050).

## DEC-070 — Local em extremo permanece na lista de edição, com erro contextual na tabela e no mapa, sem conclusão nem exportação

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-049; Spec 02 §10.1/§14, Spec 04 §7.3, RN-035, DEC-050/069 · **Data:** 2026-07-21
**Decisão:** Durante a montagem, um **Local pode entrar temporariamente como primeira ou última Parada** da lista de edição — inclusive pelo fallback ao fim da TASK-068 quando o clique posicional não puder ser ancorado —, mas essa ocorrência fica explicitamente **inválida** até voltar a uma posição intermediária. A UI sinaliza a mesma ocorrência por dois canais: (1) a **linha da tabela lateral correspondente ao Local** recebe estado de erro vermelho e explicação no hover/foco, informando que Locais (pontos de parada) só podem ocupar posições intermediárias e que o extremo deve ser Seção; (2) o **marcador circular verde de 12 px do Local no mapa** mantém forma/cor e recebe **borda vermelha**. O aviso geral de montagem inválida entregue pela TASK-047 permanece. Enquanto RN-035 estiver violada, a validação ao vivo não chama o OSRM, o Serviço não é concluído/promovido e a exportação permanece bloqueada. Ao inserir/reordenar uma Seção de modo que o Local deixe o extremo, os estados vermelhos somem. O erro pertence à **ocorrência da Parada naquele itinerário e sentido**, não à entidade Local globalmente: o mesmo Local pode estar válido no outro sentido.
**Motivo:** dado pelo responsável: o Local precisa poder entrar na lista ao fim durante a construção, mas o erro não pode ficar comunicado apenas por um aviso distante; a própria linha da tabela e o ponto correspondente no mapa devem mostrar qual ocorrência está errada. Isso preserva a edição incremental já aceita pela TASK-047 sem enfraquecer a regra estrutural da Spec 02 §10.1/RN-035.
**Consequências:** resolve a **Q-049** e amplia a **TASK-068**, que já é dona do fallback de inserção e do vocabulário visual dos marcadores. Nenhuma regra de domínio muda: Local continua proibido nos extremos do documento válido; apenas se decide a apresentação do estado intermediário inválido. Nenhuma alteração de spec, contrato JSON, ancorador ou motor OSRM. A **TASK-079** deve preservar o estado vermelho da linha ao construir a lista lateral unificada; a **TASK-064** deve usar canal visual distinto para seleção e nunca apagar/mascarar o erro; a **TASK-076**, ao mostrar Ida e Volta simultaneamente, deve calcular e apresentar a borda vermelha por sentido, sem contaminar o marcador válido do outro sentido.
**Impacto em implementação:** **TASK-068** — derivar as ocorrências de Local em extremo a partir de `paradasEmEdicao`; expor estado visual aditivo no marcador de `src/shared/mapa/mapa.tsx`; aplicar borda `--color-erro` ao círculo verde do Local; aplicar estado de erro à linha correspondente em `src/formulario/itinerarios/etapa-itinerarios.tsx`, usando o `Tooltip` compartilhado e descrição acessível (não apenas cor/hover); manter os avisos de `ViolacaoMontagem` da TASK-047. A violação precisa chegar ao **coletor de pendências/gate de exportação como estado efêmero**, porque hoje `violacoesMontagemMapa` é estado local da etapa e a última rota válida preservada poderia deixar o gate enxergar apenas o documento antigo; nenhuma pendência é persistida no JSON (NEG-004). Testes unitários/integração/E2E cobrem Local no primeiro/último lugar, ausência de chamada OSRM, bloqueio real de conclusão/exportação mesmo havendo rota anterior válida, remoção automática dos realces/bloqueio ao corrigir a ordem e isolamento por sentido. RN afetada: **RN-035**, sem mudança de texto; RN-034/036, RN-052 e RN-078 permanecem como validação/fluxo/gate existentes.

## DEC-071 — Espelhamento da Volta reproduz o gesto atômico de Seção; Locais ficam independentes e pontos de rota são reancorados por posição

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-050; Spec 02 §§10–10.4/§14, Spec 04 §§7.1–7.3, RN-030/034/035/041/042/052, DEC-060/063/068/070 · **Data:** 2026-07-21
**Decisão:** O espelhamento Ida↔Volta da TASK-077 reproduz o **gesto atômico de Seção** no outro sentido: move somente a mesma Seção para a posição inversa, em vez de tentar reconstruir a lista completa apenas a partir da sequência final. Os **Locais preservam sua ordem relativa**, não acompanham Seção anterior ou seguinte e permanecem como itens independentes da lista do seu sentido. Os **pontos de rota preservam sua posição relativa e são reancorados** conforme a DEC-060; reordenação não os descarta. Remover uma Seção elimina somente a ocorrência correspondente no outro sentido; se um Local ficar temporariamente no extremo, aplica-se a DEC-070, sem correção silenciosa. Inserir ou reutilizar uma Seção nova a coloca **imediatamente depois da Seção anterior na ordem do itinerário de destino**: se a Ida passa de `A-B` para `A-X-B` e a Volta era `B-1-2-A`, o resultado é `B-X-1-2-A`. O descarte de ponto de rota continua restrito ao ponto órfão de trecho terminal removido, conforme a DEC-068.
**Motivo:** a regra reproduz diretamente o gesto do usuário e a semântica posicional já adotada pela DEC-060, sem inventar vínculo de domínio entre Local e Seção. Também torna determinísticos os exemplos fornecidos pelo responsável: com Ida `A-B-C-D-E` e Volta `E-D-1-2-C-3-B-4-A`, mover `D` antes de `C` produz `E-1-2-C-D-3-B-4-A`; movimentos atômicos sucessivos até `A-D-C-B-E` produzem `E-1-2-3-B-C-D-4-A`. Usar apenas o estado final perderia qual Seção foi movida e poderia gerar posições diferentes para os Locais.
**Consequências:** resolve a **Q-050** e desbloqueia novamente a **TASK-077**, agora com semântica completa para Locais, pontos de rota, inserção, reuso, remoção e reordenação. O motor deve receber a identidade da Seção movida e a posição de destino; uma substituição arbitrária da sequência inteira não pode fingir que conhece o gesto. Nenhuma alteração do contrato JSON ou de `docs/specs/**`: mudam somente a ordem das Paradas e os dados derivados/reancorados já existentes. A validação estrutural da RN-030 continua comparando apenas a subsequência de Seções; Locais podem divergir livremente. A TASK-079 deve preservar a mesma semântica na lista lateral unificada.
**Impacto em implementação:** **TASK-077** — `src/formulario/itinerarios/motor-montagem.ts` ganha operações puras explícitas para inserir, remover e mover uma Seção no itinerário espelhado a partir do gesto atômico; `src/formulario/itinerarios/etapa-itinerarios.tsx` transporta a identidade/posição do gesto, comita os dois sentidos e reutiliza `reancorarPontosDeRota`; o reuso aplica a convenção `B-X-1-2-A`; testes cobrem os dois exemplos decididos, inserção/reuso, remoção com Local extremo e preservação/reancoragem de pontos de rota. RN afetadas: RN-030 recebe a semântica de construção por gesto; RN-034/035 continuam validando a lista resultante; RN-041/042 e RN-052 continuam governando pontos de rota e recálculo. Interage com TASK-079/DEC-060, TASK-083/DEC-068 e TASK-068/DEC-070, sem mudar suas regras.

## DEC-072 — Fantasma e criação do ponto de rota usam a mesma coordenada projetada sobre a linha

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-051; Spec 03 §3.6, Spec 04 §7.3 item 6, RN-042/052, DEC-057 · **Data:** 2026-07-21
**Decisão:** Ao passar o mouse dentro da tolerância de hit-test da linha, o Formulário projeta a coordenada bruta do cursor no ponto pertencente ao traçado mais próximo. O vértice fantasma aparece nessa coordenada projetada e, ao clicar, o ponto de rota é criado exatamente na mesma projeção — não necessariamente na coordenada bruta do clique. Assim, a pré-visualização mostra fielmente o resultado do gesto e o ponto criado pertence à linha exibida.
**Motivo:** dado pelo responsável: a opção A significa criar o ponto exatamente sobre a linha, no ponto da linha mais próximo de onde o usuário clicou. Isso elimina a divergência que a tolerância de 6 px produziria entre a posição visual antecipada e a coordenada persistida.
**Consequências:** resolve a **Q-051** e desbloqueia a **TASK-069**. Autoriza uma extensão aditiva de `projetarNaLinha` para expor a coordenada projetada e o ajuste estreito de `aoClicarNaLinha`; não altera o contrato JSON, a ancoragem lógica `apos_parada_ordem`, o motor OSRM nem os gestos de mover/remover. Hover continua sendo estado efêmero e não chama OSRM (RN-052).
**Impacto em implementação:** **TASK-069** — `src/shared/mapa/ancoragem.ts` passa a devolver também a coordenada projetada; `src/shared/mapa/mapa.tsx` reutiliza a mesma projeção no hover e no clique, com callback opt-in e limpeza de cursor/fantasma; `src/formulario/itinerarios/editor-mapa-itinerario.tsx` compõe o marcador fantasma sem persistência; testes unitários/E2E provam coincidência entre fantasma e clique, limpeza fora da linha/ao sair do mapa, ausência sem rota e zero chamadas ao OSRM. RN afetadas: RN-042/052/096 e RN-097, sem mudança de texto.

## DEC-073 — Composição visual da lista lateral unificada: variante local com canais separados por natureza de sinal; Tipo sem valor para ponto de rota

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-052, com ajuste no item (1); Spec 04 §7/§7.3, Spec 02 §5/§10.1/§10.4, doc 18 §2/§3/§4, RN-025/031/042, DEC-060/069/070 · **Data:** 2026-07-22
**Decisão:** Adotada a opção A da Q-052 (variante local governada de `Tabela` + canais separados por natureza de sinal), com os cinco pontos fixados assim:

1. A coluna "Tipo" recebe valor apenas para Seção (`Seção`) e Local (`Local de parada`); para o ponto de rota a célula de Tipo fica vazia — a natureza do item já fica evidente pelo próprio texto da coluna de nome (item 2), sem duplicar a informação.
2. O ponto de rota exibe **"Ponto de Rota N (lat, long)"** na coluna de nome (maiúscula em "Rota", como grafado pelo responsável) e nunca `Cidade - Nome` (RN-042).
3. O "X" de remover é `Botao` compacto (variante `perigo` ou `fantasma`) com `aria-label="Remover …"`, preservando os `data-testid` atuais.
4. Densidade e zebra de maior contraste entram como variante/prop nova de `Tabela` (ex.: `densidade="compacta"` + zebra `cinza-100`), sem alterar o token usado pelas demais tabelas do app.
5. Precedência de canais fixa: **fundo** = zebra em repouso, com a seleção da TASK-064 sobrepondo o zebra; **texto/ícone** = erro (vermelho, Local extremo) e ponto de rota (ciano); **borda** = erro de Local extremo e foco — os quatro sinais coexistem por ocuparem canais físicos distintos (fundo × texto × borda).
   **Motivo:** dado pelo responsável — a coluna "Tipo" não precisa repetir informação para o ponto de rota porque ela já está contida no formato do nome ("Ponto de Rota N (lat, long)"); os itens 3, 4 e 5 confirmam a sugestão A da Q-052 tal como redigida (variação por prop, não por `className`, sem tocar o token global de zebra, canais físicos distintos para evitar colisão entre zebra/seleção/erro/ponto-de-rota).
   **Consequências:** resolve a **Q-052** e desbloqueia a **TASK-091**. Nenhuma alteração ao contrato JSON ou a `docs/specs/**`. O valor concreto da "zebra compacta" (`cinza-100` ou outro) e a precedência de fundo (seleção sobre zebra) devem ser fixados no doc 18 no mesmo ciclo da TASK-091.
   **Impacto em implementação:** **TASK-091** — componente `Tabela`/lista lateral ganha colunas explícitas (nome com `Cidade - Nome` para Seção/Local e "Ponto de Rota N (lat, long)" para ponto de rota; Tipo vazio para ponto de rota; mover; remover), nova variante de densidade/zebra e precedência de canais fundo/texto/borda coexistindo com DEC-069 (ciano do ponto de rota), DEC-070 (vermelho de Local extremo) e o realce de seleção da TASK-064. RN afetadas: RN-025, RN-031, RN-042 (ponto de rota sem `Cidade - Nome`, sem alteração de texto). doc 18 §2/§3/§4 recebem a nova variante de `Tabela` no mesmo ciclo.

## DEC-074 — Espelho Ida↔Volta só dispara quando a subsequência de Seções muda; descarte silencioso de ponto de rota no sentido espelhado é aceito

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio na conversa da `/revisar-aderencia` da TASK-077 (2026-07-23), sobre as ressalvas do parecer `14-REVISOES/TASK-077-20260722.md` (sem Q-xxx prévia — precedente DEC-069); Spec 02 §14, Spec 04 §7.2, RN-030/041..043/052, DEC-063/068/071 · **Data:** 2026-07-23
**Decisão:** Três pontos, resolvendo as três ressalvas do parecer da TASK-077:

1. **O espelho Ida↔Volta só dispara quando o gesto altera de fato a subsequência de Seções do sentido editado.** Mover uma Seção por cima/baixo de um **Local** (troca adjacente que mantém a subsequência idêntica) **não espelha nem recalcula o outro sentido** — adota-se a correção sugerida no parecer: comparar `subsequenciaSecoes(antes)` com `subsequenciaSecoes(depois)` e suprimir o `GestoSecao` de movimento quando iguais. Isso torna executável, sem exceção, o critério que o motor já declara ("só gestos que tocam a subsequência de Seções disparam o espelho") e preserva os Locais do sentido não editado intocados (Spec 02 §14; DEC-071 "Locais ficam independentes").
2. **O descarte silencioso de ponto de rota no sentido espelhado é aceito.** Quando a remoção espelhada de uma Seção de extremo órfã um ponto de rota do outro sentido, o ponto é descartado **sem aviso** naquele sentido — não importa o ponto de rota se perder. O aviso não bloqueante da DEC-068 permanece obrigatório apenas para o sentido **editado**; a DEC-068 fica **complementada** (não superada) por esta exceção estreita do caminho espelhado.
3. **A lacuna de E2E de exportação com Volta derivada é aceita como está.** A cobertura por integração (promoção "ambos" com Volta derivada) + validação estrutural (RN-030 dura, reusada pelo gate) basta; o E2E ponta a ponta segue como candidato natural à TASK-062/076, sem condição pendente sobre a TASK-077.
   **Motivo:** dado pelo responsável — (1) registrar a decisão "pela sugestão" do parecer; (2) "não importa o ponto de rota se perder"; (3) "tudo bem o teste não estar 100%". O ponto de rota não tem identidade nem entra em matriz/tarifa e refazê-lo custa um clique (mesmo racional das DEC-056/057/068); o custo de sinalizar o descarte num sentido que o usuário não está editando não se paga.
   **Consequências:** fecha as três ressalvas do parecer da TASK-077. A condição registrada em `19-STATUS_EXECUCAO.md` ("antes da TASK-076") passa a ser cumprida pela **TASK-093** (nova), que implementa o item 1 com teste de guarda. Os follow-ups 2 e 3 do parecer são **encerrados sem ação**. Nenhuma alteração de `docs/specs/**`, contrato JSON ou RN — o item 1 é correção de fidelidade à DEC-071 já vigente; o item 2 é escolha de UX dentro do espaço da DEC-068.
   **Impacto em implementação:** **TASK-093** — `src/formulario/itinerarios/etapa-itinerarios.tsx` (`moverParada`: emitir `gestoSecao` de movimento só quando a subsequência de Seções mudar; alternativa equivalente dentro de `aplicarNovasParadas`); teste de guarda unitário/integração: mover Seção sobre Local não altera o outro sentido nem dispara segundo recálculo OSRM. RN afetadas: nenhuma muda de texto (RN-030/052 seguem valendo; RN-041..043 intocadas).

## DEC-075 — Local nasce unidirecional: a criação gera só o ponto do sentido em edição, sem espelhamento Ida↔Volta

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-053 (dada nesta conversa, 2026-07-23); Spec 04 §7.2/§16 item 6; Spec 02 §7.1 (RN-031/032); Spec 03 §7.4; DEC-045, DEC-071 · **Data:** 2026-07-23
**Decisão:** A criação de um Local gera **apenas** a geolocalização do sentido em edição, mesmo em Serviço bidirecional. Não há espelhamento nem vínculo entre um Local da Ida e um Local da Volta: cada sentido lança seus próprios Locais, independentes. O contrato JSON **não muda** — a Spec 02 §7.1 segue admitindo Local com um ou dois pontos; a regra pareada dos 350 m (RN-032/Spec 03 §7.4) permanece no contrato, no arrasto e nos leitores estáticos, aplicável somente a Locais que tenham os dois pontos (documentos legados importados). Seções seguem espelhadas na criação (Spec 04 §7.1) e a RN-030 segue intocada.
**Motivo:** dado pelo responsável — o entendimento inicial da equipe ("o local precisava interligar Ida e Volta") não se sustentou após amadurecimento: "não existe real necessidade do local da ida estar vinculado de alguma forma ao local da volta — um é o ponto da ida e o outro é o da volta, não tem porque misturar os dois". O fluxo desejado é o usuário lançar a Volta inteira com seus próprios Locais.
**Consequências:** resolve a Q-053. **Exige edição da Spec 04 §7.2 e §16 item 6 pelo responsável** (texto proposto apresentado na conversa de registro; a IA não edita `docs/specs/**`). Nenhuma mudança em Spec 02/03/05, contrato JSON ou texto de RN — a pareada da RN-032 vira caminho exclusivo de legado. Reforça a DEC-071 (Locais livres por sentido no espelho de itinerário). A implementação será task própria, a criar após o responsável validar Q/DEC e aplicar a spec.
**Impacto em implementação:** `src/formulario/locais/fluxos-local.ts` (`camposDeCriacao` deixa de espelhar; parâmetro `bidirecional` perde efeito na criação), `src/formulario/itinerarios/editor-mapa-itinerario.tsx` e `src/formulario/locais/editor-locais.tsx` (fluxo de criação), testes unitários/E2E correspondentes. RN afetadas: nenhuma muda de texto.

## DEC-076 — O "X" da tabela remove a entidade Local inteira (com suas Paradas); fim do gesto "Excluir ponto deste sentido"

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-054 (dada nesta conversa, 2026-07-23); lacuna registrada na DEC-045; DEC-070, DEC-073, DEC-075 · **Data:** 2026-07-23
**Decisão:** O "X" de remover da linha de um **Local** na tabela lateral passa a remover a **entidade** de `servico.locais[]` e **todas as Paradas que a referenciem**. O botão "Excluir ponto deste sentido" é **eliminado** — com a DEC-075 todo Local novo tem um ponto só, e o gesto perde a função. Em Local legado com dois pontos (documento importado), o "X" remove a entidade e as paradas de **ambos** os sentidos. O "X" da linha de uma **Seção** segue removendo apenas a Parada (a Seção pertence ao Autos — Spec 02 §5); pontos de rota seguem a DEC-073.
**Motivo:** dado pelo responsável — "o botão excluir entidade não será mais necessário; o botão X no local deverá excluir totalmente o local". Fecha o estado atual, relatado pelo responsável e confirmado no código: a entidade Local é hoje **inapagável** (`excluirSentidoDoLocal` recusa com `ponto_unico` quando há um só ponto — recorte deliberado da DEC-045 nunca retomado) e permanece na lista da etapa mesmo depois de "apagada" do itinerário.
**Consequências:** resolve a Q-054 e fecha a lacuna da DEC-045 ("Full CRUD de remoção da entidade Local permanece fora"), **superando-a** na parte do gesto de exclusão de sentido (a divisão TASK-018/019 registrada lá permanece como histórico). A DEC-070 (Local extremo) fica intocada. A edição de spec necessária é a **mesma da DEC-075** (o trecho "excluir o ponto só naquele sentido" da §7.2 sai na mesma substituição). Os `data-testid` `excluir-sentido-*` deixam de existir junto com o gesto — exceção consciente à intocabilidade do doc 18, pois o gesto foi removido do produto, não renomeado.
**Impacto em implementação:** `src/formulario/locais/fluxos-local.ts` (`excluirSentidoDoLocal` torna-se obsoleta; nova função pura de remoção de entidade), `src/formulario/locais/editor-locais.tsx` e `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (remoção do botão), `src/formulario/itinerarios/etapa-itinerarios.tsx` (`aoExcluirSentidoDeLocal` → remoção de entidade reutilizando `removerParadasDeLocal`), testes unitários/E2E que usam `excluir-sentido-*`. RN afetadas: nenhuma muda de texto (RN-031..036 seguem valendo).

## DEC-077 — Formulário de nome de Seção/Local vira linha-formulário inline na tabela lateral, na posição de inserção

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-055 (dada nesta conversa com mockup, 2026-07-23); Spec 04 §7.1–§7.3; DEC-069, DEC-070, DEC-073 · **Data:** 2026-07-23
**Decisão:** Ao escolher "Seção" ou "Local" no menu de criação, o formulário de nome deixa de ser um painel abaixo do mapa e passa a ser uma **linha-formulário inserida na tabela lateral, na posição exata onde a nova parada entrará** (âncora já resolvida por `prepararInsercaoDeParada`; criação sem âncora de linha → linha-formulário ao fim da tabela). Visual: janela de fundo branco no mesmo padrão da janela flutuante do mapa (`MenuFlutuante`/`Painel` do design system), rótulo pequeno em cinza sem destaque ("Nome da Seção"/"Nome do Local"), campo de texto e botões `[Criar Seção]`/`[Criar Local]` e `[Cancelar]`. A tabela rola até a linha-formulário quando ela abre. Os `data-testid` existentes (`form-criar-secao`, `form-criar-local`, `nome-secao-input`, `nome-local-input`, `confirmar-criar-secao`, `confirmar-criar-local`) são preservados.
**Motivo:** pedido do responsável, com mockup na conversa: o campo de nome deve aparecer no contexto exato onde o item vai entrar na lista (ex.: entre `cityB` e `cityC`), não num painel desconectado abaixo do mapa.
**Consequências:** resolve a Q-055. **Nenhuma mudança de spec** — a Spec 04 §7.1/§7.2 exige apenas que o nome seja digitado, sem fixar onde; escolha de UX dentro do espaço da spec (precedente DEC-073). Compõe com a DEC-073 (variante compacta da tabela — a linha-formulário é mais um estado da mesma tabela) e com a DEC-070 (o vermelho de Local extremo continua com seus canais próprios). A implementação será task própria, a criar após validação do responsável.
**Impacto em implementação:** `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (remover os `Painel` de criação abaixo do mapa; injetar a linha-formulário na tabela na posição de inserção), componente de tabela lateral (TASK-091/DEC-073), scroll-até-a-linha, testes unitários/E2E dos fluxos de criação. RN afetadas: nenhuma.

## DEC-078 — Seção/Local criado por clique direito sobre a linha nasce na coordenada projetada sobre o traçado

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-056 (dada nesta conversa, a partir de bug relatado manualmente em 2026-07-24); Spec 04 §7.3 itens 2 e 6; Spec 02 §5.1/§7.1; estende a DEC-072 ao botão direito; DEC-055 · **Data:** 2026-07-24
**Decisão:** Quando o clique **direito** acertar a camada da linha da rota (mesmo hit-test e mesma tolerância de 6 px já usados pelo clique esquerdo), a coordenada entregue ao menu Seção/Local — e, portanto, a `geolocalizacao_*` persistida da entidade criada — é a **projeção sobre o traçado** (ponto da linha mais próximo do clique), e não a coordenada bruta do cursor. Clique direito **fora** da linha permanece na coordenada bruta, sem alteração (é o caminho de montagem do itinerário do zero — DEC-055). O **índice de inserção** na lista de paradas não muda: já é resolvido por `ancorarPontoNaRota`, que projeta internamente, e continua correto.
**Motivo:** dado pelo responsável — se o usuário decidiu criar uma Seção/Local intermediária clicando **sobre** o itinerário calculado, ela deve nascer onde a linha passa, no ponto georreferenciado do itinerário mais próximo do clique; nascer no pixel exato do cursor, fora da linha azul, é inconveniente. É a mesma norma que a DEC-072 já fixou para o ponto de rota criado pelo clique esquerdo sobre a mesma linha: a assimetria entre os dois botões era lacuna de implementação, não escolha de domínio.
**Consequências:** resolve a **Q-056**. **Nenhuma alteração de spec** — a Spec 04 §7.3 item 2 manda inserir Seções e Locais "em ordem, clicando no mapa", sem fixar a coordenada resultante; mesmo enquadramento da DEC-072. **Nenhuma mudança de contrato JSON**, de `versao_schema` ou de RN (nenhuma muda de texto). **RN-027** (350 m por centroide cumulativo) e **RN-029** (município por ponto-em-polígono) passam a ser avaliadas sobre a coordenada projetada: o deslocamento é limitado pela tolerância do hit-test (poucos metros em zoom urbano) e não altera as regras, apenas a entrada delas — a validação continua rodando integralmente sobre a coordenada efetivamente persistida, e a recusa por 350 m ou por "fora de SP" segue idêntica. **Não** se aplica ao arrasto de marcador de Seção/Local (opção C descartada): arrastar continua entregando a coordenada solta, preservando a capacidade de posicionar uma parada deliberadamente fora do traçado. Nenhum impacto no Comparador, no PDF, no motor OSRM ou no espelho Ida↔Volta (DEC-071/074). Task: **TASK-098**.
**Impacto em implementação:** **TASK-098** — `src/shared/mapa/mapa.tsx`: o handler de `contextmenu` reusa `projetarSobreLinhas` (já existente, usado pelo `click`) quando `consultarLinha` acertar, entregando a coordenada projetada a `aoClicarDireitoNaLinha`; consumidores sem essa prop ficam inalterados (RN-097). `src/formulario/itinerarios/editor-mapa-itinerario.tsx` e `etapa-itinerarios.tsx`: nenhuma mudança de lógica — a coordenada já flui de `menuCriacao.posicao` até `criarSecaoNoPonto`/`criarLocalNoPonto`. Motores de Seção/Local, 350 m, município, montagem e ancoragem **reusados sem alteração**. Testes: unitário provando que `contextmenu` sobre a linha entrega a mesma projeção que o `click` no mesmo ponto, e que fora da linha a coordenada segue bruta; integração provando que a Seção/Local criada persiste a coordenada projetada. `data-testid`/`aria-*` preservados (doc 18 §6.5). RN afetadas: RN-027, RN-029 (entrada, sem mudança de texto); RN-097 (extensão aditiva da primitiva).

## DEC-079 — Realocação de Seção: botão esquerdo arrasta o cluster inteiro, botão direito arrasta só o ponto do serviço/sentido corrente; supera o mecanismo de "modo" da DEC-061

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da Q-057 (dada nesta conversa, 2026-07-24, revisando o backlog em uso real); Spec 02 §5.1/§5.2; Spec 03 §7.2; Spec 04 §7.1; supera em parte a DEC-061 · **Data:** 2026-07-24
**Decisão:** O gesto de realocação de Seção deixa de depender de um **modo** com entrada explícita (duplo clique, DEC-061). Os dois movimentos passam a existir diretamente, distinguidos pelo **botão do mouse** usado no arrasto de um marcador de Seção:

- **Arrasto com o botão esquerdo** → move **todos** os pontos da Seção (todas as entradas de `secao.servicos[]`, Ida e Volta) pelo mesmo vetor — translação rígida, como a DEC-061 já especificava para dentro do "modo".
- **Arrasto com o botão direito** → move **exclusivamente** o ponto visualizado no mapa, no Serviço e sentido correntes — o arrasto individual de hoje, sob a regra dos 350 m (DEC-044, inalterada; só migra de botão).

Ao confirmar a translação (soltar o botão esquerdo): município re-derivado do novo centroide (RN-029; fora de SP → recusa integral, nenhum ponto movido), recálculo de todos os itinerários de todos os Serviços que referenciam a Seção (RN-052) e reconciliação das matrizes afetadas (RN-054..057), UUID da Seção e as entradas de `secao.servicos[]` preservadas (RN-004) — todas as consequências já fixadas pela DEC-061 permanecem idênticas. Cancelar a translação (soltar sem deslocamento efetivo, ou `Esc` durante o arrasto) restaura as posições originais sem efeito nenhum, nenhuma chamada OSRM.
**Motivo:** dado pelo responsável, ao reavaliar o backlog do ramo do mapa: o mecanismo de "modo" (duplo clique para entrar, cor neutra nos demais pontos, arrasto dentro do modo) acrescenta uma etapa de interação que o botão do mouse já resolve sozinho — o usuário já decide, ao escolher qual botão usar, se quer mover só o ponto corrente ou a Seção inteira, sem precisar entrar/sair de um estado intermediário. Como a DEC-055 fixa o significado dos botões apenas **sobre a linha da rota vazia** (criar ponto de rota / abrir o menu Seção-Local), e este gesto é sobre o arrasto de um **marcador já existente**, as duas decisões operam em superfícies distintas e não colidem.
**Consequências:** resolve a **Q-057**. Supera o mecanismo de entrada por "modo" da DEC-061 (duplo clique, cor neutra dos demais pontos durante o modo, `Esc` cancela o modo) — essa mecânica **não** será implementada; as consequências de confirmação que a DEC-061 fixou (município, recálculo em cascata, UUID preservada, DEC-044 inalterada para o ponto individual) continuam valendo integralmente, só migradas para o botão esquerdo. Nenhum campo novo no contrato; nenhuma alteração de regra de negócio (RN-027/029/052/054..057 continuam com o mesmo texto). Risco técnico a resolver na implementação, não nesta decisão: o navegador dispara `contextmenu` nativamente ao soltar o botão direito — o handler de arrasto precisa suprimir esse evento durante o gesto para que o botão direito arraste em vez de abrir o menu do navegador (não é o menu Seção/Local da DEC-055, que só existe sobre a linha vazia).
**Impacto em implementação:** **TASK-078** (backlog atualizado nesta revisão) — `src/formulario/secoes/fluxos-secao.ts` (função pura de translação, reusada); `src/shared/mapa/mapa.tsx` (distinguir o botão do `mousedown`/`dragstart` do marcador de Seção — `event.button`/`originalEvent.button` — e rotear para o gesto de translação do cluster ou para o arrasto individual existente; suprimir `contextmenu` nativo durante o arrasto com o botão direito); `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (pontos do cluster em cor neutra durante o arrasto com o botão esquerdo, sem etapa de "modo"); `etapa-itinerarios.tsx` (commit + recálculo em cascata dos itinerários afetados, reusado da DEC-061). `docs-dev/18-DESIGN_SYSTEM.md`: estado visual do arrasto de cluster (cor neutra), sem o estado de "modo ativo" que a DEC-061 previa.

## DEC-080 — Reset de Seção: todos os pontos do cluster voltam para a coordenada do ponto do Serviço/sentido em edição no momento do clique

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção B da Q-058 (dada nesta conversa, 2026-07-24, a partir de pedido novo de funcionalidade) · **Data:** 2026-07-24
**Decisão:** Passa a existir uma operação de **"redefinir" Seção**: um botão (ícone de refresh) na linha da Seção na tabela lateral, que devolve **todos** os pontos do cluster (todas as entradas de `secao.servicos[]`, Ida e Volta) para uma **única coordenada** — a do ponto do **Serviço/sentido em edição** no momento em que o usuário aciona o botão (o ponto visualizado no mapa correspondente à linha da tabela onde o clique ocorreu). O gesto exige confirmação explícita: uma janela de diálogo pergunta "Gostaria de redefinir todas as geolocalizações desta seção em todos os serviços e sentidos?" com **OK** e **Cancelar**; só o **OK** aplica a mudança. Ao confirmar: RN-027 (350 m) é trivialmente satisfeita (todos os pontos coincidem, distância zero ao centroide); o município é re-derivado do ponto único (RN-029; fora de SP → recusa integral, nenhum ponto movido); todos os itinerários de todos os Serviços que referenciam a Seção têm a rota recalculada (RN-052) e as matrizes reconciliadas (RN-054..057); a UUID da Seção e as entradas de `secao.servicos[]` são preservadas (RN-004). O botão aparece **somente** nas linhas de Seção da tabela (não em Locais nem em pontos de rota), posicionado **depois** dos botões de mover (subir/descer) e **antes** do "X" de remover, sem quebrar o alinhamento das colunas existentes.
**Motivo:** dado pelo responsável — depois de diferenciar manualmente os pontos de uma Seção entre Serviços/sentidos (o próprio gesto da TASK-078), o usuário às vezes quer desfazer essa diferenciação inteira e recomeçar do zero a redesenhar os pontos, sem ter que ajustar cada contribuição manualmente uma a uma. A coordenada de destino escolhida (o ponto do Serviço/sentido em edição, não um centroide recalculado) é a mais previsível: o usuário vê exatamente qual ponto vai "vencer" antes de confirmar, porque é o que já está olhando no mapa.
**Consequências:** resolve a **Q-058** e libera a **TASK-100** (nova). Nenhum campo novo no contrato; nenhuma alteração de regra de negócio (RN-027/029/052/054..057 continuam com o mesmo texto — a operação só é uma nova forma de produzir uma translação onde o vetor final é "todos os pontos para o mesmo lugar"). Reusa o motor de translação da Seção que a TASK-078 introduz (`transladarSecao`/equivalente), aplicado com destino fixo em vez de vetor de arrasto.
**Impacto em implementação:** **TASK-100** — `src/formulario/secoes/fluxos-secao.ts` (função pura de reset, reusando o motor de translação da TASK-078); componente de confirmação (`shared/ui/`, padrão de diálogo já usado no design system, doc 18); tabela lateral (`etapa-itinerarios.tsx`) — botão de refresh na linha de Seção, entre mover e remover; `etapa-itinerarios.tsx`/`editor-mapa-itinerario.tsx` — commit + recálculo em cascata dos itinerários afetados (mesmo caminho da TASK-078).

## DEC-081 — Tabelas de operação excepcional por Serviço (férias de verão/inverno/personalizado): entidade homogênea + referência nulável na Viagem, sem meses/datas

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, **opção 1 (recomendada) da Q-059** (dada nesta conversa, 2026-07-27, "conforme recomendado"); Spec 02 §4/§11/§14/§15; Spec 03 §9/§9.4; Spec 04 §8; Spec 05 · **Data:** 2026-07-27
**Decisão:** O contrato passa a modelar **operação excepcional** de um Serviço como uma **categoria semântica de texto** — nunca um intervalo de meses ou datas. Estrutura decidida:

- **Nova entidade, no nível do Serviço:** `servico.tabelas_excepcionais[]`, cada item `{ uuid, tipo, descricao? }`. `tipo` é enum fechado `"ferias_verao" | "ferias_inverno" | "personalizado"`. `descricao` (string livre) é **obrigatória só quando `tipo == "personalizado"`**; para `ferias_verao`/`ferias_inverno` o rótulo deriva do `tipo` (`descricao` ausente/nula). `uuid` é UUIDv4 gerada na criação e **preservada na importação** (RN-004).
- **Cardinalidade:** os tipos canônicos são **únicos por Serviço** (no máximo uma `ferias_verao` e uma `ferias_inverno`), garantindo que "filtrar férias de verão" retorne exatamente uma tabela; `personalizado` é **repetível**. **Não há** validação de sobreposição entre tabelas excepcionais — o sistema não julga categorias textuais dúbias criadas pelo usuário.
- **Vínculo na Viagem (codificação — opção 1):** mantém-se `viagem_feriado` **booleano** e **adiciona-se** à Viagem `tabela_excepcional_uuid: string | null` (referência a `servico.tabelas_excepcionais[].uuid`; `null` = grade padrão/feriado). A referência é por UUID porque duas tabelas `personalizado` compartilham `tipo` e só se distinguem pela identidade.
- **Invariante:** se `tabela_excepcional_uuid ≠ null`, então `viagem_feriado = false` (uma Viagem excepcional **nunca** é de feriado).
- **Precedência operacional:** **feriado > excepcional > padrão**. A tabela excepcional **não** tem sub-grade de feriado própria — quando cai um feriado, a excepcional "cai" e entra a grade de feriado.
- **Semana padrão e contagens:** o conceito de semana padrão continua "a semana que não é feriado **nem** excepcional". A **fórmula** de contagem (hoje "Viagens com `viagem_feriado = false`") passa a **grade padrão = `viagem_feriado = false` E `tabela_excepcional_uuid = null`** — Viagens excepcionais **não** entram em nenhuma contagem, do mesmo modo que as de feriado. (RN de contagem = **RN-069**; grade de feriado que substitui integralmente = **RN-068**; Viagem estratificada = **RN-061**.)
- **Filtragem:** `ferias_verao`/`ferias_inverno` são filtráveis por serem valores de enum fechados; `personalizado` é filtrável só por substring da `descricao`.

A tabela excepcional é, estruturalmente, **mais uma dimensão de grade** — como `viagem_feriado` já é hoje —, reaproveitando integralmente a maquinaria de Viagem (validações de `horarios_paradas`, cópia, PDF, diff). Exige **bump de `versao_schema`** e **regra de migração** dos documentos existentes (todo `viagens[]` atual tem `viagem_feriado` e nasce sem `tabela_excepcional_uuid` = `null`).
**Motivo:** dado pelo responsável ao acatar a recomendação técnica da Q-059. Descartou-se explicitamente o desenho por **meses/datas** (não há como cravar início/fim de férias por Autos; exigiria atualização constante só para acertar datas) e as duas alternativas ruins já analisadas: um **atributo `viagens` paralelo** (duplica validações/cópia/PDF/diff e não generaliza a N tabelas) e um **`[array de meses]` na própria Viagem** (desnormaliza nome+período na folha). A opção 1 tem o **menor blast radius** nas RN que já citam `viagem_feriado` (RN-062/068/071 seguem com o mesmo texto), a entidade homogênea com `tipo` generaliza a N tabelas e mantém a filtragem por enum, e a referência nulável preserva o contrato de identidade (RN-004).
**Consequências:** resolve a **Q-059**. **Exige alteração de spec antes de qualquer código** (contrato fechado, RN-008..015) — a ser aplicada pelo dono das specs, com texto que a implementação pode propor:

- **Spec 02** — §4 (Serviço ganha `tabelas_excepcionais[]`); §11 (Viagem ganha `tabela_excepcional_uuid` + o invariante `≠ null ⇒ viagem_feriado = false`); §14 (validações estruturais novas: enum de `tipo`, `descricao` obrigatória só em `personalizado`, unicidade dos tipos canônicos por Serviço, referência de `tabela_excepcional_uuid` a uma tabela existente do mesmo Serviço, invariante feriado); §15 (exemplo); **`versao_schema`** incrementado + nota de migração.
- **Spec 03** — §9 (precedência feriado > excepcional > padrão; excepcional fora das contagens) e **§9.4 / RN-070** (nova fórmula da semana padrão excluindo também a grade excepcional).
- **Spec 04** — §8 (UX: criar/editar/filtrar tabelas excepcionais na grade de horários; a tabela excepcional é outra grade além de comum/feriado).
- **Spec 05** — diff do Comparador sobre a nova entidade (por UUID) e sobre a nova dimensão de grade.

Depois das specs aplicadas, a funcionalidade deve ser quebrada em tasks via `/nova-task` (não há task existente — recurso novo). Nenhuma task é desbloqueada automaticamente; nenhuma decisão anterior é superada.
**Impacto em implementação:** **RN afetadas** (`docs-dev/01-RULE_INDEX.md` / `docs-dev/03-TRACEABILITY_MATRIX.md`, atualizadas junto com esta DEC): **RN-069** (fórmula de contagem — texto muda: semana padrão exclui também excepcional); **RN-061** (Viagem estratificada — ganha `tabela_excepcional_uuid` + invariante); **RN-068** (feriado substitui integralmente também a excepcional; precedência); **RN-062** (não-unicidade estendida à tupla com `tabela_excepcional_uuid`); **RN novas RN-098** (entidade `tabelas_excepcionais[]`: cardinalidade, `descricao` condicional, sem sobreposição) e **RN-099** (grade excepcional da Viagem: referência, invariante, precedência, contagens, cópia, diff). RN-004/RN-008..015 aplicam-se sem mudança de texto (identidade preservada; contrato ampliado formalmente pela Spec 02). **Módulos:** `src/shared/contrato/` (schema zod strict + `validacoes-estruturais.ts`: nova entidade, invariante, unicidade, referência); `src/shared/` de contagens (nova cláusula da semana padrão); `src/formulario/` grade de horários (UX das tabelas + filtro); `src/comparador/` (diff da nova dimensão); geração do PDF operacional. **Migração:** documentos com `versao_schema` anterior recebem `tabela_excepcional_uuid = null` em toda Viagem e `tabelas_excepcionais = []` em todo Serviço.

## DEC-082 — Inserção de Viagem por offset relativo (±X min) a partir da Viagem selecionada

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, **Q-060** (dada nesta conversa, 2026-07-27); Spec 04 §8.2/§8.3; Spec 02 §12 · **Data:** 2026-07-27
**Decisão:** Na grade de horários, com uma Viagem selecionada, botões acima/abaixo da célula criam **outra Viagem** cujo `horario_saida` é o da selecionada deslocado de **±X min** (X **editável** na própria célula, **default 10 min**). A nova Viagem **herda os offsets** da Viagem-origem (translação rígida — preserva âncoras/redistribuição manuais), transladando só o horário de partida; recebe **UUID nova** (Spec 02 §12). O gesto opera **só no dia da célula selecionada** (coerente com Spec 04 §8.2, "outros dias não são afetados"); a nova Viagem entra automaticamente na ordenação temporal do dia (§8.1). Recusa amigável se o horário resultante sair de 00:00–23:59.
**Motivo:** açúcar de UX sobre a criação já prevista (§8.2/§8.3), sem inventar regra de domínio nem tocar o contrato — só acelera a digitação repetitiva. Herança de offsets e escopo no dia selecionado foram as opções recomendadas escolhidas pelo responsável.
**Consequências:** resolve a **Q-060**; **desbloqueia a TASK-107** (Grupo H, `06-BACKLOG_INICIAL.md`). Não altera contrato JSON, PDF, contagens nem Comparador.
**Impacto em implementação:** **RN:** RN-004 (UUID nova), RN-061, RN-063/RN-067 — todas aplicadas sem mudança de texto. **Módulos:** `src/formulario/viagens/acoes-grade.ts`, `etapa-viagens.tsx`. **Depende de** TASK-106 (fundação/seleção). Sem alteração de spec.

## DEC-083 — Cópia de Viagem por headway até um horário-limite (geração em lote)

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, **Q-061** (dada nesta conversa, 2026-07-27); Spec 04 §8.2/§8.3; Spec 02 §12 · **Data:** 2026-07-27
**Decisão:** Um botão de "seta curva" alterna o modo de inserção para **gerar várias Viagens** a partir da selecionada, com **headway** fixo (`HH:MM`) **até** um **horário-limite** **inclusivo** (a última partida pode ser exatamente o limite). Cada Viagem gerada **herda os offsets** da origem (só `horario_saida` transladado) e recebe **UUID nova**; escopo **só no dia da célula selecionada** (consistente com a DEC-082). A sequência **para antes das 24h** — não cria Viagem "virando" para o dia seguinte (RN-061: Viagem é de um único `dia_semana`). Headway ≤ 0, limite < origem ou limite inválido → recusa com aviso, sem gerar nada.
**Motivo:** gerador em lote acelera a montagem de operações de headway constante (frequência regular), reusando a maquinaria de criação de Viagem. Limite inclusivo e corte às 23:59 foram as opções recomendadas escolhidas pelo responsável.
**Consequências:** resolve a **Q-061**; **desbloqueia a TASK-108** (Grupo H). Não altera contrato JSON, PDF, contagens nem Comparador.
**Impacto em implementação:** **RN:** RN-004, RN-061, RN-063/RN-067 — sem mudança de texto. **Módulos:** `src/formulario/viagens/acoes-grade.ts`, `copias-grade.ts`, `etapa-viagens.tsx`. **Depende de** TASK-106. Sem alteração de spec.

## DEC-084 — Cópia de Viagem para o dia adjacente (setas ←/→) com guarda de duplicidade só no gesto

**Status:** Aceita · **Superada em parte pela DEC-092:** o gesto deixa de ser as setas ←/→ e passa a ser o arrasto até a coluna do dia, com destino em qualquer dia; permanece integralmente a **guarda de duplicidade** e a leitura da RN-062 · **Origem:** decisão do responsável pelo domínio, **Q-062** (dada nesta conversa, 2026-07-27); Spec 04 §8.3; Spec 02 §12; RN-062 · **Data:** 2026-07-27
**Decisão:** Setas ←/→ na Viagem selecionada copiam-na para o dia **anterior/seguinte** (UUID nova — Spec 02 §12). **Guarda de duplicidade**: se o dia destino já tiver Viagem "igual", o gesto **não copia** e apenas **avisa** ("já tem horário"). Critério de "igual" = **mesmo `horario_saida` na mesma grade** (comum/feriado/excepcional), **ignorando os offsets internos** (evita quase-duplicatas). **A guarda vale exclusivamente neste gesto** — o **contrato continua permitindo Viagens duplicadas** e **nenhuma validação de unicidade é reintroduzida** em import ou em qualquer outro caminho (**RN-062 preservada integralmente**).
**Motivo:** um clique para replicar uma Viagem no dia vizinho é o padrão mais comum de montagem; a guarda evita criação acidental de duplicata idêntica sem, com isso, transformar a não-unicidade permitida pela RN-062 em restrição estrutural. O responsável escolheu explicitamente a guarda-que-avisa e o critério por horário/grade.
**Consequências:** resolve a **Q-062**; **desbloqueia a TASK-109** (Grupo H). **Não** altera a RN-062 (continua sem validação de unicidade no contrato); a guarda é comportamento de UI, não de validação de documento.
**Impacto em implementação:** **RN:** RN-004 (UUID nova), RN-061, **RN-062 (não tocar — a guarda não pode escorregar para outros caminhos de escrita/import)**. **Módulos:** `src/formulario/viagens/acoes-grade.ts`, `copias-grade.ts`, `etapa-viagens.tsx`. **Depende de** TASK-106. Sem alteração de spec.

## DEC-085 — Operações de dia inteiro na grade: copiar um dia para vários dias e apagar as Viagens de um dia

**Status:** Aceita · **Superada em parte pela DEC-088:** permanecem as operações
de dia inteiro; deixam de valer apenas as referências à disponibilidade de
"apagar bloco inteiro" como ação da grade · **Origem:** decisão do responsável
pelo domínio, **Q-063** (dada nesta conversa, 2026-07-27); Spec 04 §8.3; Spec 02
§12 · **Data:** 2026-07-27
**Decisão:** Duas operações de **coluna** (dia inteiro), além das de Viagem/bloco já previstas no §8.3:

- **Copiar um dia para vários dias** (diálogo de multisseleção de dias): replica **todas as Viagens do dia-origem** nos dias destino (UUIDs novas). Quando o destino já tem Viagens, o comportamento é **mesclar com a guarda de duplicidade da DEC-084** — acrescenta as Viagens do origem e **pula, com aviso, as que já existirem iguais** (mesmo `horario_saida` na mesma grade).
- **Apagar as Viagens do dia inteiro** (variante do "X"): limpa a coluna daquele dia **sob confirmação OK/Cancelar** (destrutivo, como o "apagar bloco inteiro" do §8.3).
  **Motivo:** operações de coluna são a extensão natural do §8.3 para montar semanas com dias repetidos e limpar um dia de uma vez. Mesclar-com-guarda e confirmação de apagar-dia foram as opções recomendadas escolhidas pelo responsável.
  **Consequências:** resolve a **Q-063**; **desbloqueia a TASK-110** (Grupo H). Herda a guarda da DEC-084 (interação registrada). Não altera contrato JSON, PDF, contagens nem Comparador.
  **Impacto em implementação:** **RN:** RN-004, RN-061, RN-062 (guarda só no gesto — ver DEC-084). **Módulos:** `src/formulario/viagens/copias-grade.ts`, `acoes-grade.ts`, `etapa-viagens.tsx`; `shared/ui` (diálogo de multisseleção de dias; confirmação). **Depende de** TASK-106; interage com a TASK-109/DEC-084. Sem alteração de spec.

## DEC-086 — Modo compacto da grade (ocultar Seções intermediárias/final); no PDF é a "versão simples" já prevista no §13.2

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, **Q-064** (dada nesta conversa, 2026-07-27); Spec 04 §8.1, §13.2 · **Data:** 2026-07-27
**Decisão:** A grade de horários ganha um **toggle de visualização** que **oculta as Seções intermediárias e a final**, deixando visível só a **Seção de partida** (o `horario_saida`) de cada Viagem, mantendo todas as funções de cópia/inserção; a navegação por teclado ajusta o **Enter** para a próxima **Seção de partida visível**. É modo **de exibição**: não altera dados (`horarios_paradas` das Seções ocultas permanecem) nem contrato. **No PDF**, esse recorte compacto **já é a "versão simples"** definida na **Spec 04 §13.2** (corpo, item 5: "apenas os horários de saída de cada viagem") — portanto o "também no PDF" pedido pelo responsável **não cria escopo novo de PDF**: é entregue pela geração do PDF operacional (TASK-034) conforme o §13.2 já especifica; a versão detalhada (grade completa) segue no anexo técnico (§13.1 item 8a / §13.2).
**Motivo:** facilita a leitura das partidas do dia sem perder as funções de edição; o responsável pediu o modo na tela e como opção de PDF, e o PDF já contempla exatamente esse recorte na versão simples do §13.2 (sem trabalho de spec adicional).
**Consequências:** resolve a **Q-064**; **desbloqueia a TASK-111** (Grupo H, parte de **tela**). A parte de **PDF** permanece com a **TASK-034** (PDF: tabela horária, §13.2) — sem task nova, coerente com a lição §6.6 do `19-STATUS_EXECUCAO.md` (não construir task sobre superfície de PDF ainda inexistente). Não altera contrato JSON, contagens nem Comparador.
**Impacto em implementação:** **RN:** RN-063 (dados das Seções ocultas íntegros), RN-067 — sem mudança de texto. **Módulos:** `src/formulario/viagens/etapa-viagens.tsx`, `montagem-grade.ts` (tela); geração do PDF operacional (TASK-034) para a versão simples do §13.2. **Depende de** TASK-106. Sem alteração de spec.

## DEC-087 — "Copiar dias comuns" com origem estendida (feriados/excepcional) e mescla como sincronização preservando UUID (exceção à RN-007)

**Status:** Aceita · **Superada em parte pela DEC-099 (2026-07-30):** a Spec 04 §8.4/§8.5 passou a ter uma **única** ação, `Copiar (sobrescrever)`, cuja semântica é a sincronização preservando a UUID do destino casado; o par sobrescrever/mesclar e a moldura de "exceção à RN-007" deixam de valer, e a RN-007 foi reescrita para descrever a sincronização como regra, não como exceção (TASK-120). Permanecem válidas a **origem estendida** (comum/feriados/excepcional) e a **normalização automática dos discriminadores** · **Origem:** decisão do responsável pelo domínio, **Q-065** (dada nesta conversa, 2026-07-27); Spec 04 §8.4/§8.5, §13; Spec 02 §11/§12; RN-007/RN-099 · **Data:** 2026-07-27
**Decisão:** Duas partes:

1. **Origem estendida da semente de grade:** o "copiar dias comuns" passa a poder puxar Viagens não só da **grade comum**, mas também da **grade de feriados** ou de **qualquer tabela excepcional** existente do Serviço. A **normalização** dos discriminadores de grade no destino é **automática e obrigatória** para preservar o invariante **RN-099** (ex.: origem feriado → destino excepcional: zera `viagem_feriado`, seta `tabela_excepcional_uuid` do destino; origem excepcional → destino feriado: seta `viagem_feriado = true`, limpa `tabela_excepcional_uuid`).
2. **Semântica da mescla = sincronização preservando UUID (idempotente):** quando o destino já tem conteúdo e o usuário confirma **mesclar**, a operação torna o destino **igual à origem** (após normalização):
   - **apaga** do destino as Viagens **ausentes** na origem;
   - nas Viagens que **casam por `horario_saida`** (na grade destino), **mantém a entidade e o seu `uuid`**, apenas **atualizando os offsets** (`horarios_paradas`) para os da origem — inclusive quando só os offsets mudaram;
   - **acrescenta** as Viagens da origem **ausentes** no destino como entidades novas (**UUID nova** só nessas).
     Vale para **as duas** operações: o "copiar dias comuns" **base** (origem = comum, TASK-105) **e** a origem estendida (TASK-112). A opção **"sobrescrever"** (limpar tudo e reclonar com UUIDs novas) permanece disponível como a alternativa destrutiva-total no mesmo diálogo de confirmação.

**Exceção à RN-007 (explícita):** a RN-007 (Alta) diz que **toda** cópia — inclusive "copiar dias comuns para feriado" — cria entidades com **UUIDs novas**. Esta decisão abre uma **exceção** para o caminho de **mescla/sincronização**: as Viagens do destino que **casam por horário** **preservam o seu `uuid`** (só as genuinamente novas recebem UUID nova). Objetivo: **estabilidade de identidade para o Comparador** — o diff mostra "offset alterado" em vez de "Viagem apagada + Viagem criada" —, coerente com o espírito da RN-004. O caminho **"sobrescrever"** segue a RN-007 original (UUIDs novas).
**Motivo:** o responsável quer que semear/atualizar uma grade a partir de outra seja **idempotente e diff-estável** — reexecutar o "copiar dias comuns" não deve trocar as UUIDs das Viagens que continuam existindo no mesmo horário. A origem estendida cobre o caso real de derivar feriado/excepcional de outra grade que não a comum.
**Consequências:** resolve a **Q-065**. **Exige alteração de spec antes do código** (contrato/UX fechados, RN-008..015) — a aplicar pelo dono das specs, com texto que a implementação pode propor:

- **Spec 04 §8.4 e §8.5** — hoje dizem "clona… **UUIDs novas**" e "Confirmação… (sobrescrever/**mesclar**)" sem definir a mescla. Passam a: (a) **origem selecionável** (comum/feriados/excepcional) com normalização automática dos discriminadores; (b) **"mesclar" = sincronização preservando UUID** conforme acima; (c) **"sobrescrever" = reclonar com UUIDs novas**.
- **RN-007** (`docs-dev/01-RULE_INDEX.md` / `03-TRACEABILITY_MATRIX.md`) — acrescentar a **carve-out**: no caminho de **mescla/sincronização** de grade, as Viagens casadas por `horario_saida` **preservam UUID**; a criação de UUID nova aplica-se só às Viagens novas e ao caminho "sobrescrever". (Apontada aqui; **editar a RN só se o responsável pedir** — `docs-dev/12`.)

**Desbloqueia a TASK-112** (origem estendida) **após** a alteração de spec; **revisa a TASK-105** — a mescla base ganha a semântica de sincronização (a TASK-105 deixa de ser puramente "UUIDs novas"; ganha nota no `06-BACKLOG_INICIAL.md` e passa a depender da mesma alteração de spec).
**Edge a resolver na `/analisar-task` (RN-062):** como a RN-062 permite **duas** Viagens com o mesmo `(dia_semana, horario_saida)`, o casamento "por `horario_saida`" **não é unívoco** quando há duplicatas. A conciliação por multiconjunto/contagem (quantas casam, quais preservam UUID) deve ser fixada na análise da TASK-105/112; se a spec/decisão não bastar, **abrir Q-xxx antes de implementar** (não decidir por conta própria — `docs-dev/04` princípio 2).
**Impacto em implementação:** **RN:** **RN-007** (carve-out — ver acima), **RN-099** (normalização preserva o invariante), **RN-004** (identidade preservada no caminho de mescla), **RN-062** (edge do casamento — ver acima). **Módulos:** `src/formulario/viagens/copias-grade.ts` (motor de sincronização), componentes da grade (TASK-105/112). **Depende de:** alteração da Spec 04 §8.4/§8.5; TASK-102/104 (contrato/entidade), TASK-105 (base). **Sequenciamento:** aplicar a spec → revisar/implementar TASK-105 → TASK-112.

## DEC-088 — Ação "Apagar bloco inteiro" é retirada da grade; bloco permanece apenas como alinhamento visual

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A da
**Q-066**; Spec 04 §8.1/§8.3 já alinhada pelo responsável · **Data:** 2026-07-27

**Decisão:** A grade de horários **não oferece** ação para apagar o bloco inteiro
(a n-ésima posição ordinal em todos os dias). O bloco continua existindo somente
como **alinhamento visual por posição** e como suporte à inserção/ordenação da
grade; não é entidade nem unidade de operação. Permanecem disponíveis e
distintas:

- apagar **uma Viagem** de um dia;
- apagar **as Viagens de um dia inteiro**, operação de coluna da
  TASK-110/DEC-085.

**Motivo:** um mesmo bloco pode alinhar Viagens com horários diferentes em cada
dia, sem vínculo operacional entre elas. Apagá-las em conjunto por ocuparem a
mesma posição visual seria um gesto destrutivo sobre partidas independentes,
contrário à semântica da RN-061.

**Consequências:** resolve a **Q-066** pela opção A. A Spec 04 §8.3 já foi
atualizada pelo responsável e agora declara expressamente que "Apagar bloco
inteiro" não fica disponível. Supera apenas as referências à ação de bloco na
DEC-085; copiar/apagar um dia inteiro permanece integralmente válido. Elimina a
pendência documental dessa parte da correção da **TASK-106**, mas **não aprova**
a entrega `c2db60a`: seleção contínua, Enter entre Viagens e Tab vazio→vazio
continuam exigindo correção e nova revisão. As TASK-107..111 continuam
dependentes de uma TASK-106 aprovada.

**Impacto em implementação:** nenhuma mudança de contrato JSON, Comparador, PDF,
contagens ou texto de RN. A **RN-061** fundamenta a independência das Viagens,
sem precisar de alteração. Na correção da TASK-106, remover o botão, confirmação
e handler de `apagarBloco` em `src/formulario/viagens/etapa-viagens.tsx`, o motor
e export correspondente em `copias-grade.ts`/`index.ts` e seus testes exclusivos
em `testes/unitarios/formulario/viagens-copias-grade.test.ts`; preservar
`apagarViagem` e o escopo futuro da TASK-110.

## DEC-089 — A cópia unitária arbitrária é substituída pelas setas adjacentes e pela cópia de dia inteiro

**Status:** Aceita · **Superada em parte pela DEC-092:** a cópia unitária para dia **arbitrário** volta a existir, agora pelo arrasto (sem controle renderizado); permanecem válidas a retirada do antigo “seletor de dia + botão Copiar” e a ausência de wrap SEG↔DOM · **Origem:** decisão do responsável pelo domínio, opção B da
**Q-067**; Spec 04 §8.3 já alinhada pelo responsável; DEC-084/TASK-109;
DEC-085/TASK-110 · **Data:** 2026-07-27

**Decisão:** retirar da grade a ação antiga composta por seletor de dia + botão
“Copiar”, que duplica uma única Viagem para um dia arbitrário. Permanecem como
substitutas deliberadas:

- setas ←/→ da **TASK-109**, que copiam uma Viagem para o dia
  anterior/seguinte com a guarda de duplicidade da DEC-084;
- cópia de **um dia inteiro para vários dias** da **TASK-110**, com a política
  da DEC-085.

A navegação entre dias **não é circular**: em **SEG** não existe dia anterior,
portanto a seta ← **não é renderizada**; em **DOM** não existe dia seguinte,
portanto a seta → **não é renderizada**. Nenhuma das duas bordas volta para a
outra ponta da semana.

A remoção do controle antigo e a refatoração do motor ficam na **TASK-109** e
não bloqueiam a correção visual nem a reavaliação da TASK-107.

**Motivo:** as três ações eram parcialmente sobrepostas e poluíam a superfície
flutuante. O modelo visual escolhido usa as setas para a cópia unitária mais
comum e reserva a seleção de múltiplos dias para a operação de dia inteiro. A
retirada elimina o caminho arbitrário unitário de forma deliberada.

**Consequências:** resolve a **Q-067** pela opção B. A Spec 04 §8.3 já foi
atualizada pelo responsável para “Copiar viagem para dia ao lado”, com a guarda
de horário existente. O detalhe de borda SEG/DOM deste complemento deve ser
refletido na próxima consolidação humana da §8.3. A TASK-109 absorve a retirada
da UI antiga e deve
reutilizar/refatorar `copiarViagemParaDias`, evitando dois motores de clonagem.
A TASK-110 permanece com granularidade de coluna/dia inteiro. A correção da
TASK-107 continua bloqueada somente pelos achados visuais do parecer, não pela
remoção de “Copiar”.

**Impacto em implementação:** nenhuma mudança no contrato JSON, Comparador,
PDF, contagens ou texto de RN. **RN-004/RN-007/RN-061** continuam exigindo UUID
nova e preservação de grade/offsets; **RN-062** continua permitindo duplicatas
no contrato, com a guarda restrita ao gesto da DEC-084. Na TASK-109, remover
`diaCopiaPorViagem`, o `Select`, o botão/handler `aoCopiarViagem` e os testes E2E
da UI antiga; preservar e reutilizar o motor puro de cópia onde couber, sem
duplicar lógica. A UI calcula a existência do dia adjacente antes de renderizar
cada seta; não deve renderizar controle desabilitado nem aplicar wrap
SEG↔DOM.

## DEC-090 — “Restaurar sugestão” fica abaixo do X na superfície da Viagem

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção B
da **Q-068**; Spec 04 §8.2; TASK-107; DEC-050 · **Data:** 2026-07-27

**Decisão:** na superfície selecionada da Viagem, a ação
**“Restaurar sugestão”** usa a seta circular `↻` e fica imediatamente
**abaixo do X**, formando com a ação de apagar uma coluna vertical à direita
da Viagem. Para esse detalhe de composição, esta decisão prevalece sobre a
posição à esquerda do controle superior retratada na imagem-modelo
`docs-dev/selecao de horario e botoes 1.png`.

**Motivo:** durante a implementação da TASK-107, o responsável pelo domínio
comparou as composições e determinou que o restaurar abaixo do X ficou
visualmente melhor. A orientação foi reiterada explicitamente na reavaliação
de 2026-07-27.

**Consequências:** resolve a **Q-068** e remove como achado da TASK-107 a
divergência de posição do restaurar em relação à imagem-modelo. Os demais
requisitos visuais continuam válidos: X no topo à direita; controles ±X
largos e legíveis; ação anterior acima da seleção; ação posterior abaixo da
última Seção; ações exibidas somente no hover.

**Impacto em implementação:** nenhuma mudança no contrato JSON, nas RN, no
Comparador, no PDF ou nas contagens. Afeta somente a composição da UI em
`src/formulario/viagens/etapa-viagens.tsx`, os testes geométricos de
`testes/e2e/etapa-viagens.spec.ts`, a documentação da TASK-107 e seu parecer de
aderência. A implementação atual — X e `↻` na mesma coordenada horizontal, com
`↻` abaixo — corresponde à decisão.

## DEC-091 — Últimos deslocamentos relativos compartilhados na etapa por direção

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-069**; Spec 04 §8.2/§8.3; DEC-082/TASK-107 · **Data:** 2026-07-27

**Decisão:** a etapa “Viagens e horários” mantém dois últimos deslocamentos
relativos **válidos** e independentes: um para a ação anterior (seta para cima,
subtração de tempo) e outro para a ação posterior (seta para baixo, adição de
tempo). Os dois valores são compartilhados entre todas as Viagens, grades,
Serviços e sentidos exibidos na mesma instância aberta da etapa. Cada direção
inicia em `00:10`; ao sair ou desmontar a etapa, ambas voltam
independentemente a `00:10`. Entrada inválida não substitui o último valor
válido da direção correspondente.

**Motivo:** o responsável identificou, ao final da TASK-107, que retornar ao
default a cada novo hover obriga a repetir a digitação e reduz a agilidade no
preenchimento de vários horários. Dois valores independentes preservam ritmos
distintos de antecipação e postergação sem ampliar o estado da sessão.

**Consequências:** resolve a **Q-069** e **desbloqueia a TASK-113**. A
preferência é estritamente efêmera na instância aberta da etapa: não sobrevive
à navegação que a desmonte, não integra a `SessaoFormulario` e não entra no
contrato JSON. Permanecem inalteradas todas as regras da DEC-082 para criar a
Viagem: dia da célula selecionada, UUID nova, offsets herdados e recusa de
resultado fora de 00:00–23:59.

**Impacto em implementação:** nenhuma mudança no texto das RN existentes, no
contrato JSON, Comparador, PDF ou contagens. **RN-067** continua governando o
formato de relógio da UI e **RN-096** fundamenta o estado efêmero, sem
persistência de servidor. Na **TASK-113**,
`src/formulario/viagens/etapa-viagens.tsx` substitui os mapas de deslocamento
por UUID de Viagem por dois valores escalares independentes no estado local da
etapa; os testes cobrem compartilhamento entre hovers/contextos, independência
das direções, reset no desmonte e rejeição de entrada inválida.

## DEC-092 — Cópia unitária de Viagem entre dias passa a ser por arrasto até a coluna do dia; as setas ←/→ são retiradas

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção B da
**Q-070**; Spec 04 §8.1/§8.3; Spec 02 §12; DEC-084/DEC-089; TASK-109; DEC-050 ·
**Data:** 2026-07-28

**Decisão:** a grade de horários **não recebe** as setas ←/→ previstas na
DEC-084. A cópia unitária de uma Viagem para outro dia passa a ser feita por
**arrasto direto**: o usuário clica na Viagem selecionada, arrasta o bloco da
seleção e **solta sobre a coluna do dia destino**, que recebe uma cópia da
Viagem. Detalhes fixados pelo responsável:

- **Destino: qualquer dia da semana** (SEG…DOM), não apenas o adjacente. O
  arrasto restabelece deliberadamente a cópia unitária para dia arbitrário que a
  DEC-089 havia retirado — agora sem custo de superfície, porque não há controle
  renderizado.
- **Sempre copia, nunca move:** a Viagem de origem permanece intacta; o destino
  recebe entidade nova com **UUID nova** (Spec 02 §12, RN-004/RN-007), mesmo
  `horario_saida` e mesmos offsets (`horarios_paradas`), com normalização da
  grade destino quando aplicável. Não existe modificador de teclado que
  transforme o gesto em mover/apagar.
- **Guarda de duplicidade preservada (DEC-084):** se o dia destino já tiver
  Viagem com o **mesmo `horario_saida` na mesma grade** (comum/feriado/
  excepcional), o arrasto **não copia** e apenas avisa. A guarda continua
  valendo **exclusivamente no gesto** — **RN-062 intocada**, nenhuma validação
  de unicidade entra em import ou em qualquer outro caminho de escrita.
- **Caminho sem mouse:** com a Viagem selecionada, **`Ctrl+←`** copia para o dia
  **anterior** e **`Ctrl+→`** para o dia **seguinte**, com a mesma guarda de
  duplicidade. É equivalente parcial e assumido como tal: o atalho cobre só os
  dias adjacentes, enquanto o arrasto alcança qualquer dia. Sem dia adjacente
  (SEG para `Ctrl+←`, DOM para `Ctrl+→`) o atalho não faz nada — sem wrap
  SEG↔DOM, como já fixado na DEC-089.
- **Affordance obrigatória:** o gesto precisa ser descobrível sem controle
  visível — cursor de arrasto sobre a Viagem selecionada e **realce da coluna de
  dia sob o cursor** durante o arrasto, indicando o destino que receberá a
  cópia; soltar fora de uma coluna de dia cancela sem efeito.

**Motivo:** a superfície da Viagem já concentra X, ↻ e os dois controles de
inserção relativa (DEC-082/DEC-090). Acrescentar duas setas laterais para o
gesto mais frequente da grade polui uma célula pequena e densa. O arrasto
expressa diretamente "esta Viagem passa a existir naquele dia", devolve a
superfície limpa e, por não custar controle, permite ampliar o destino para
qualquer dia sem reintroduzir o seletor de dia que a DEC-089 eliminou.

**Consequências:** resolve a **Q-070** pela opção B. **Supera a DEC-084 quanto
ao gesto e ao alcance** (as setas ←/→ deixam de existir; o destino deixa de ser
só o adjacente), preservando integralmente sua **guarda de duplicidade** e a
leitura da RN-062. **Supera a DEC-089 quanto ao alcance da cópia unitária**: a
cópia para dia arbitrário volta a existir, agora pelo arrasto; permanece válida
a retirada do controle antigo "seletor de dia + botão Copiar", que a TASK-109
continua devendo remover, e permanece válida a ausência de wrap SEG↔DOM. A
**TASK-110** (cópia de dia inteiro, DEC-085) segue intacta e continua sendo o
caminho para operações de coluna.

**Alteração de spec: aplicada pelo responsável em 2026-07-28.** A **Spec 04
§8.3** passou a descrever os dois caminhos como itens distintos — "**Copiar
viagem para dia ao lado**" (duplica para o dia à esquerda/direita, **usando
atalho do teclado**) e "**Copiar viagem para dia de escolha do usuário**"
(duplica para o dia escolhido, **usando o segurar e arrastar do mouse**) —,
ambos com mesmo `horario_saida`, mesmos offsets, **UUID nova** (Spec 02 §12) e a
guarda de horário no destino. As teclas concretas (`Ctrl+←`/`Ctrl+→`), a
ausência de wrap SEG↔DOM, a affordance de realce da coluna alvo e a proibição de
mover permanecem fixadas por esta DEC, sem contradizer o texto da spec. Com
isso, a **TASK-109 está desbloqueada**.

**Impacto em implementação:** **RN:** RN-004 e RN-007 (cópia = entidade nova com
UUID nova), RN-061 (Viagem pertence a um único `dia_semana`; a cópia é do dia
destino), **RN-062 (não tocar — a guarda vive só no gesto)**, RN-063/RN-067
(offsets transladados sem recálculo). Nenhuma mudança de texto de RN;
`01-RULE_INDEX.md` e `03-TRACEABILITY_MATRIX.md` não precisam de edição.
**Módulos:** `src/formulario/viagens/etapa-viagens.tsx` (arrasto, realce da
coluna alvo, atalhos de teclado), `copias-grade.ts` (motor único de clonagem,
reutilizado — sem segundo motor), `acoes-grade.ts`; `shared/ui/` apenas se o
realce de coluna exigir estado novo previsto no doc 18. **Tasks:** **TASK-109 é
reescrita** por esta decisão (deixa de ser "setas ←/→" e passa a ser "arrasto +
atalhos"), mantendo no escopo a remoção do `Select`/botão "Copiar" e a
reutilização de `copiarViagemParaDias`. Sem impacto em contrato JSON, PDF,
Comparador ou contagens.

## DEC-093 — Operações de dia inteiro no cabeçalho e composição em duas linhas do modo headway

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção B da
**Q-071**, com detalhamento explícito da máscara dos campos; Spec 04 §8.1–§8.3;
Spec 02 §11/§12; DEC-083/DEC-085/DEC-090/DEC-092; TASK-117; DEC-050 ·
**Data:** 2026-07-29

**Decisão:** as operações de **coluna/dia inteiro** deixam a superfície da
Viagem e passam ao cabeçalho da própria coluna. Cada `SEG…DOM` é um botão que,
ao ser acionado, oferece exatamente “Copiar para outro dia” e “Apagar o dia”
para aquele dia e aquela grade. “Copiar para outro dia” continua abrindo o
diálogo de multisseleção e usando integralmente a política da DEC-085;
“Apagar o dia” continua sob confirmação explícita. O `X` no hover fica
restrito a apagar **aquela Viagem**. Não existe botão visível de cópia unitária
na Viagem: essa cópia continua exclusivamente por arrasto ou
`Ctrl+←`/`Ctrl+→`, conforme a DEC-092.

O alternador do modo headway usa **azul claro quando inativo** e **azul normal
quando ativo**. Ao ativá-lo, o formulário inferior usa duas linhas —
`a cada [HH:MM]` e `até [HH:MM]` — com um único botão de geração ocupando a
coluna à direita das duas linhas.

Os dois campos aplicam durante a digitação uma máscara de quatro algarismos,
preenchida com zeros à esquerda e exibida como `HH:MM`: digitar `1` exibe
`00:01`; digitar `123` exibe `01:23`. A máscara é somente apresentação e não
normaliza horário impossível: digitar `9875` exibe `98:75`, permanece inválido
e deixa o botão de geração desabilitado. A geração só fica acionável quando
headway e horário-limite formam entradas válidas para as regras da DEC-083.

**Motivo:** a posição do controle deve comunicar sua granularidade: operações
de dia pertencem ao cabeçalho da coluna, enquanto o hover reúne somente ações
da Viagem. A nova composição reduz poluição visual, preserva os gestos já
decididos e torna a entrada do headway rápida sem esconder do usuário o valor
inválido que precisa ser corrigido.

**Consequências:** resolve a **Q-071** e **desbloqueia a TASK-117**. Supera a
DEC-085 somente quanto à posição das afordâncias: seus motores, política de
mescla/guarda, UUIDs novas e confirmação destrutiva permanecem intactos. A
DEC-092 permanece integralmente válida para a cópia unitária. A máscara e o
estado habilitado do botão são conveniência efêmera da UI e não entram no
contrato JSON.

**Impacto em implementação:** nenhuma mudança no texto das RN existentes, no
contrato JSON, Comparador, PDF ou contagens. **RN-004/RN-007/RN-061/RN-062**
continuam governando cópia e identidade; **RN-063/RN-067** continuam governando
offsets e entradas temporais; **RN-096** fundamenta os estados efêmeros.
**Módulos:** `src/formulario/viagens/etapa-viagens.tsx`,
`src/formulario/viagens/horario-relogio.ts`, `src/shared/ui/botao.tsx`, testes
da etapa e do design system. A nova aparência do `Botao` deve ser variante
explícita documentada em `docs-dev/18-DESIGN_SYSTEM.md`, nunca sobreposição de
cores por `className`.

## DEC-094 — Guarda de duplicidade na geração de Viagens por headway

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção B da
**Q-072**, com aprovação explícita do aviso não bloqueante; Spec 04 §8.2–§8.3;
Spec 02 §11/§12/§14; DEC-083/DEC-084/DEC-085; TASK-118 ·
**Data:** 2026-07-30

**Decisão:** a guarda de duplicidade passa a valer também, e somente, no gesto
de geração de Viagens por headway. Para cada horário calculado, se já existir
uma Viagem com o mesmo `horario_saida`, no mesmo `dia_semana` e na mesma grade,
a Viagem preexistente é mantida integralmente e nenhuma nova Viagem é criada
naquele horário. Os offsets não participam do critério de igualdade. Horários
ausentes do mesmo lote continuam sendo criados normalmente; se todos já
existirem, a geração inteira é um no-op.

Após a geração, a interface apresenta um **aviso não bloqueante** com a
quantidade de horários ignorados. A guarda é uma conveniência local desse gesto:
não torna `(dia_semana, horario_saida, grade)` único no contrato, na importação,
na edição manual nem em outros caminhos.

**Motivo:** a geração por headway deve ser idempotente diante de repetição ou
duplo clique acidental, inclusive quando o lote coincide apenas parcialmente
com a grade existente. Reutilizar o critério da DEC-084 evita definições
divergentes de horário já existente e preserva a permissão de reforços da
RN-062 fora desse gesto.

**Consequências:** resolve a **Q-072** e **desbloqueia a TASK-118**. As Viagens
preexistentes preservam UUID, offsets e todos os demais dados; somente as
Viagens correspondentes a horários ausentes recebem UUIDs novas e os offsets
previstos pela DEC-083. O aviso informa quantas partidas calculadas foram
ignoradas sem bloquear a continuidade do uso.

**Impacto em implementação:** nenhuma mudança no texto das RN existentes, no
contrato JSON, na importação, no Comparador, no PDF ou nas contagens.
**RN-004/RN-007/RN-061** continuam governando identidade e pertencimento das
Viagens; **RN-062** permanece aceitando reforços no documento;
**RN-063/RN-067** continuam governando horários e offsets.
`01-RULE_INDEX.md` e `03-TRACEABILITY_MATRIX.md` não precisam de edição.
**Módulos:** `src/formulario/viagens/acoes-grade.ts`,
`src/formulario/viagens/copias-grade.ts`,
`src/formulario/viagens/etapa-viagens.tsx` e testes da etapa.
**Task:** TASK-118.

## DEC-095 — Destaque somente nas Viagens de reforço com partida coincidente

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-073**, com refinamento explícito de destacar somente a segunda Viagem e
as posteriores do grupo; Spec 04 §8.1/§11; Spec 02 §11/§14; RN-061/RN-062/
RN-078; TASK-119; DEC-050 · **Data:** 2026-07-30

**Decisão:** uma partida coincidente é detectada somente dentro do mesmo
itinerário (mesmo Serviço e sentido) e da mesma grade. O agrupamento usa
`dia_semana + horario_saida` e ignora integralmente os `offset_horario` e os
demais horários de passagem. Ida e Volta não são comparadas entre si; grades
comum, de feriado e excepcional também não são misturadas.

Em cada grupo com duas ou mais Viagens, a **primeira Viagem na ordem em que é
exibida na grade é a viagem-base e mantém a aparência normal**. Somente a
segunda Viagem e as posteriores são Viagens de reforço e recebem o destaque
laranja claro em toda a sua superfície visível. Portanto, duas partidas
`08:00` destacam apenas a segunda; três partidas `08:00` destacam a segunda e a
terceira. A seleção azul tem precedência visual temporária sobre o laranja, que
reaparece quando a Viagem deixa de estar selecionada.

O Formulário emite um alerta não bloqueante por Serviço que tenha ao menos um
grupo coincidente, com quantidade de grupos e navegação para o primeiro:
**“O Serviço {numero_n} possui partidas coincidentes no mesmo dia e horário.
As Viagens destacadas em laranja são reforços válidos; confirme se o cadastro
é intencional.”**

**Motivo:** o destaque deve diferenciar a partida original do reforço
subsequente, sem sugerir que ambas são anômalas. Restringir a comparação ao
mesmo itinerário e à mesma grade segue a definição de reforço da RN-062 e evita
falsos positivos entre sentidos opostos ou regimes operacionais independentes.

**Consequências:** resolve a **Q-073** e **desbloqueia a TASK-119**. Reforços
continuam válidos e exportáveis; o alerta apenas exige ciência e não altera,
remove ou mescla Viagens. O destaque e a pendência são derivados do documento
atual e nunca persistidos no JSON.

**Impacto em implementação:** nenhuma alteração de texto é necessária em
`docs-dev/01-RULE_INDEX.md` ou `docs-dev/03-TRACEABILITY_MATRIX.md`.
**RN-061/RN-062** definem o escopo e a validade do reforço; **RN-078** mantém o
alerta não bloqueante; **RN-096/NEG-004** mantêm alerta e destaque efêmeros.
**Módulos:** `src/formulario/pendencias/`, `src/formulario/revisao/`,
`src/formulario/layout/painel-pendencias.tsx`,
`src/formulario/viagens/etapa-viagens.tsx`, detector puro compartilhado e
testes. O laranja claro deve ser token/contrato visual explícito do design
system, sem `style=` inline nem sobreposição conflitante de classes.
**Task:** TASK-119.

## DEC-096 — Segundo clique na mesma Viagem desfaz a seleção

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-074**; Spec 04 §8.1–§8.3; TASK-106; DEC-082/DEC-083/DEC-092/DEC-095;
TASK-119; DEC-050 · **Data:** 2026-07-30

**Decisão:** a seleção da Viagem funciona como toggle por `uuid`. O primeiro
clique em qualquer célula de uma Viagem seleciona toda a sua superfície; um
novo clique em qualquer célula da mesma Viagem limpa a seleção. Clicar numa
Viagem diferente transfere a seleção diretamente para ela.

Desselecionar é exclusivamente visual e efêmero: não altera foco, horário,
UUID, âncoras nem qualquer dado do documento. A superfície volta ao estado
derivado subjacente — aparência normal numa Viagem comum ou destaque laranja
numa Viagem de reforço da DEC-095. Foco e navegação por Tab/Enter continuam
selecionando a Viagem alcançada, como hoje. Não se acrescentam desmarcação por
`Escape`, clique fora da grade, perda de foco ou `blur`.

**Motivo:** exigir a seleção de outra Viagem para retirar o azul cria um estado
visual sem gesto de encerramento na própria entidade e incomoda durante a
edição. O toggle é o comportamento solicitado e permite conferir corretamente
o retorno do reforço ao laranja sem ampliar a mudança para foco ou navegação.

**Consequências:** resolve a **Q-074** e **desbloqueia a TASK-119**. Supera na
TASK-106 somente a expressão “mantém a seleção persistente” no sentido de
persistência indefinida: a superfície contínua, a persistência após o primeiro
clique e todos os demais comportamentos da task permanecem válidos. As ações de
inserção, headway e arrasto continuam usando a Viagem enquanto ela estiver
selecionada.

**Impacto em implementação:** nenhuma RN, spec, contrato JSON, PDF, Comparador
ou contagem precisa ser alterada. **RN-096** continua fundamentando o estado
efêmero. **Módulos:** `src/formulario/viagens/etapa-viagens.tsx` e testes de
componente/E2E da grade. O handler deve impedir que `onFocus`/`aoSelecionar` do
campo reative no mesmo gesto o `uuid` que o toggle acabou de limpar e deve
preservar os comportamentos de foco das TASK-115/TASK-116.
**Tasks:** TASK-106 (critério superado em parte) e TASK-119.

## DEC-097 — TASK-119 depende da grade excepcional da TASK-105

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-075**; Spec 04 §8.1/§8.5/§11; Spec 02 §6.1/§11; RN-061/RN-062/RN-078/
RN-099; DEC-095; TASK-105; TASK-119 · **Data:** 2026-07-30

**Decisão:** a **TASK-105 é pré-requisito funcional da TASK-119**. A TASK-119
só pode ser implementada depois de a grade excepcional da TASK-105 estar
concluída e aprovada, porque a detecção da DEC-095 deve destacar e navegar
também para coincidências pertencentes a tabelas excepcionais.

Depois dessa dependência, o “primeiro grupo” do alerta agregado por Serviço é
determinado pela ordem dos itinerários no documento, seguida da ordem visual
das grades, da ordem canônica de `DIAS_SEMANA`, de `horario_saida` e, nos
empates, da ordem em que as Viagens são exibidas na grade. O texto do alerta
permanece literalmente o fixado na DEC-095; a quantidade de grupos é
apresentada em um `Selo` associado ao item, sem ser interpolada na mensagem.

**Motivo:** a etapa Viagens atual renderiza somente as grades comum e de
feriado. Implementar a TASK-119 antes da TASK-105 permitiria detectar um
reforço excepcional importado, mas não destacar sua superfície nem posicionar
Serviço, sentido, grade e primeira ocorrência ao clicar no alerta. Absorver a
grade excepcional na TASK-119 duplicaria o escopo da TASK-105; ignorá-la ou
navegar apenas até a etapa entregaria parcialmente a DEC-095 e a Spec 04 §11.

**Consequências:** resolve a **Q-075** e **bloqueia a TASK-119 até a conclusão
e aprovação da TASK-105**. As DEC-095 e DEC-096 permanecem válidas quanto à
detecção, ao destaque dos reforços, ao alerta e ao toggle de seleção; muda
somente a ordem de execução e ficam explícitas a ordenação da primeira origem
e a apresentação da quantidade. A TASK-105 não absorve a detecção, o alerta ou
o destaque da TASK-119: ela apenas entrega a superfície excepcional da qual a
TASK-119 passa a depender.

**Impacto em implementação:** nenhuma alteração de spec, RN, contrato JSON,
importação, PDF, Comparador, Ingestor ou contagens. `01-RULE_INDEX.md` e
`03-TRACEABILITY_MATRIX.md` não precisam de edição. **Módulos futuros da
TASK-119:** detector puro compartilhado, `src/formulario/pendencias/`,
`src/formulario/revisao/`, `src/formulario/layout/painel-pendencias.tsx` e
`src/formulario/viagens/etapa-viagens.tsx`, já com a grade excepcional
entregue pela TASK-105.
**Tasks:** TASK-105 e TASK-119.

## DEC-098 — Remoção de Tabela excepcional é bloqueada enquanto houver Viagens associadas

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da Q-076; Spec 02 §6.1/§11/§14; Spec 04 §8.5 · **Data:** 2026-07-30

**Decisão:** a remoção de uma Tabela excepcional é **bloqueada enquanto houver
qualquer Viagem do mesmo Serviço com `tabela_excepcional_uuid` igual à UUID da
tabela**. A interface informa quantas Viagens ainda estão associadas e orienta
o usuário a removê-las previamente na grade excepcional. Somente uma tabela
sem Viagens associadas pode ser removida pela TASK-104. Não há remoção em
cascata e as Viagens não são convertidas para a grade comum.

**Motivo:** a opção A evita perda implícita de dados operacionais e preserva a
integridade referencial da RN-099 sem ampliar o CRUD da TASK-104 para manipular
o conteúdo das grades, que pertence à TASK-105. Também impede que uma remoção
transforme silenciosamente uma Viagem excepcional em comum.

**Consequências:** resolve a **Q-076** e desbloqueia a **TASK-104**. O CRUD pode
criar, editar, filtrar e remover Tabelas excepcionais vazias; ao encontrar
Viagens associadas, recusa a remoção com mensagem operacional e a respectiva
quantidade. A remoção prévia dessas Viagens será possível na grade excepcional
da TASK-105. A decisão não altera a cardinalidade, a descrição condicional, a
semântica das grades ou a preservação de UUID.

**Impacto em implementação:** a TASK-104 deve consultar todos os itinerários do
Serviço selecionado antes de remover a tabela, contando as Viagens cuja
`tabela_excepcional_uuid` corresponda à UUID alvo. Contagem maior que zero
produz bloqueio sem mutação da sessão; contagem zero permite retirar somente a
entrada de `servico.tabelas_excepcionais[]`. Testes unitários e E2E devem cobrir
os dois caminhos, inclusive a ausência de cascata e de conversão para a grade
comum. **RN afetadas:** RN-098 e RN-099; suas entradas no
`01-RULE_INDEX.md` e a rastreabilidade correspondente em
`03-TRACEABILITY_MATRIX.md` precisam incorporar a política quando os derivados
forem atualizados. Não há campo novo nem alteração do contrato JSON.
**Tasks:** TASK-104 e TASK-105.

## DEC-099 — Reforços coincidentes são pareados pela ordem estável na sincronização de grades

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-077**; Spec 02 §11/§11.1/§12/§14; Spec 04 §8.4/§8.5;
RN-004/RN-005/RN-007/RN-061/RN-062/RN-063/RN-099 · **Data:** 2026-07-30

**Decisão:** no `Copiar (sobrescrever)`, dentro de cada grupo com o mesmo
`dia_semana + horario_saida`, as Viagens da origem e do destino são pareadas
pela **ordem estável em que aparecem nos respectivos arrays**. Cada par preserva
a UUID que a Viagem já possuía no destino e recebe uma cópia dos
`horarios_paradas` da Viagem correspondente na origem. Depois do pareamento, o
excedente do destino é removido e o excedente da origem é acrescentado com UUID
nova. UUIDs da origem nunca são reutilizadas no destino.

**Motivo:** a ordem estável torna determinístico o casamento “por contagem” da
Spec 04 §8.5 sem transformar offsets em chave de identidade e sem proibir os
reforços válidos da RN-062. Também coincide com o comportamento já praticado
pelo motor da TASK-112.

**Consequências:** resolve a **Q-077** e desbloqueia a **TASK-120** quanto ao
pareamento de reforços coincidentes. A sincronização pode remover, atualizar e
acrescentar Viagens de forma idempotente, preservando a identidade correta do
destino conforme a ordem documentada. A decisão não altera a cópia unitária de
Viagem nem a cópia aditiva de um dia para outros dias.

**Impacto em implementação:** o motor de
`src/formulario/viagens/copias-grade.ts` deve manter filas/grupos em ordem
estável por `dia_semana + horario_saida`, com testes para reforços de offsets
iguais e diferentes, excedentes nos dois lados, idempotência, imutabilidade e
preservação das UUIDs do destino. **RN afetadas:** RN-007 e RN-062; a redação da
RN-007 e a rastreabilidade correspondente precisam ser alinhadas à nova
semântica da Spec 04 quando os derivados forem atualizados.
**Tasks:** TASK-105, TASK-112 e TASK-120.

## DEC-100 — Formulário de headway substitui a inserção posterior dentro da superfície flutuante

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-078**, com detalhamento explícito da composição; Spec 04 §8.1–§8.3;
Spec 02 §11/§12; RN-061/RN-063/RN-067/RN-096;
DEC-083/DEC-090/DEC-093 · **Data:** 2026-07-30

**Decisão:** ao ativar o modo headway, o conteúdo da superfície flutuante da
Viagem — especificamente o controle de criar outra Viagem “X tempo depois” —
é substituído pelo formulário:

```text
a cada [HH:MM] [ botão ]
   até [HH:MM] [        ]
```

O botão único ocupa a coluna à direita e abrange visualmente as duas linhas.
Não é criada linha auxiliar no corpo da tabela. A superfície permanece aberta
enquanto houver **hover ou foco** na Viagem ou no próprio flutuante e é
reposicionada para continuar visível sobre a tabela e dentro da viewport.

**Motivo:** o formulário pertence à Viagem que origina a geração e deve
permanecer no mesmo contexto interativo de suas ações. Substituir o controle de
inserção posterior evita empilhar duas ações concorrentes, elimina a linha de
headway ao fundo e permite editar os campos sem o hover fechar prematuramente.

**Consequências:** resolve a **Q-078** e desbloqueia a **TASK-121**. Supera a
DEC-093 somente quanto à posição do formulário em uma linha auxiliar inferior:
permanecem válidas a composição em duas linhas, a máscara, a validação, o estado
desabilitado e o botão único à direita. A DEC-083 e a DEC-094 permanecem
integralmente válidas para cálculo, limite e guarda de duplicidade.

**Impacto em implementação:** retirar a `<tr>`/célula auxiliar de headway de
`src/formulario/viagens/etapa-viagens.tsx` e renderizar os campos dentro de uma
superfície flutuante capaz de escapar do recorte da `Tabela`, preservando
`data-testid`, `aria-*`, foco, `Esc` e rascunhos. O fechamento deve considerar
conjuntamente hover e foco da âncora e do flutuante. Nenhuma RN, spec, contrato
JSON, PDF, Comparador ou contagem precisa ser alterada.
**Tasks:** TASK-108, TASK-117 e TASK-121.

## DEC-101 — Modo compacto oculta restaurar e alinha apagar/headway horizontalmente

**Status:** Aceita · **Origem:** decisão do responsável pelo domínio, opção A
da **Q-079**; Spec 04 §8.1/§8.2; RN-063/RN-066/RN-067/RN-096;
DEC-086/DEC-090/DEC-093/DEC-100 · **Data:** 2026-07-30

**Decisão:** no modo **“Exibir somente partidas”**, a superfície da Viagem:

- não renderiza `Restaurar sugestão`;
- exibe o `X` de apagar a Viagem e o alternador de headway lado a lado;
- prefere abrir à direita nas colunas SEG–SÁB e à esquerda na coluna DOM,
  admitindo o reposicionamento adicional necessário para permanecer visível.

Ao reexibir todas as Seções, volta a composição completa da DEC-090, com
`Restaurar sugestão` disponível. Ao ativar headway no modo compacto, os dois
botões ("X" e alternador) são alinhados e, ao clicar no alternador, a superficie flutuante do hover é substituida conforme definido na DEC-100.

**Motivo:** com as Seções intermediárias e final ocultas, a restauração de
horários passantes perde contexto visual imediato e pode ser acessada após
reexibir a grade completa. A disposição horizontal reduz a altura do hover e a
inversão em domingo evita recorte na última coluna.

**Consequências:** resolve a **Q-079** e desbloqueia a **TASK-122 quanto à
decisão de UX**; sua implementação continua sequenciada depois da TASK-121,
que entrega a superfície flutuante reposicionável. A DEC-090 permanece válida
no modo completo e é superada apenas pela composição específica do modo
compacto. Ocultar o botão não recalcula nem restaura offsets e não altera o
JSON.

**Impacto em implementação:** condicionar a composição das ações em
`src/formulario/viagens/etapa-viagens.tsx` ao compacto, sem disparar
handlers nem modificar âncoras ao ocultar o botão. Testes de componente e E2E
devem cobrir SEG/DOM, completo/compacto, retorno do restaurar, troca para o
formulário da DEC-100 e preservação de `horarios_paradas`. Nenhuma RN, spec,
contrato JSON, PDF, Comparador ou contagem precisa ser alterada.
**Tasks:** TASK-111, TASK-114, TASK-117, TASK-121 e TASK-122.
