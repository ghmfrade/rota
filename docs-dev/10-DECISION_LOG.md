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
