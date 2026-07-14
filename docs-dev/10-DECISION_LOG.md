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
**Motivo:** A partição código-a-código dos mistos estava em aberto (Q-001) e o enum antigo continha códigos inexistentes (`SL`, `MEXR`, `MLES`, `MEXS`, `MROS`); siglas curtas e todas cadastráveis. Supera a revisão preliminar do mesmo dia que usava `RO`/`ROL` e mistos "M*" longos.
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
**Decisão:** A direcionalidade pedida na criação do Serviço (Spec 04 §6 — Ida, Volta ou ambos) é mantida como **estado de sessão efêmero** no Serviço em construção (DEC-035), consumido pela etapa de mapa para criar 1 ou 2 `itinerarios` no(s) sentido(s) escolhido(s). **Nunca** é gravada no JSON — no documento, a direcionalidade é *derivada* de quais `itinerarios[].sentido` existem. No **modo carregado**, a direcionalidade é apenas **lida** dos `itinerarios` presentes (exibição), não reescrita na etapa Serviços.
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
**Motivo:** `Cidade - Nome` é identidade de Seção/Local, indisponível na camada que fala com o OSRM (que só conhece coordenadas — RN-047). Fazer *probe* por parada (opção 2) traz chamadas extras fora do §3.5; parsear o `message` como fonte primária (opção 3) é frágil e não contratual. Delegar a composição preserva o desacoplamento de camadas.
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
