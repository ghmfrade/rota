# 06 — BACKLOG_INICIAL: Backlog Priorizado

**Formato por task:** prioridade, fase, resumo, regras RN, dependências, critérios de aceite resumidos, testes esperados. Cada item vira uma task completa com `05-TASK_TEMPLATE.md` antes de ser implementado.
**Fases:** 1 Fundação · 2 Contrato JSON · 3 Validações de domínio · 4 Formulário · 5 Mapa e roteamento · 6 Distâncias e seccionamento · 7 Viagens e horários · 8 PDF operacional · 9 Comparador · 10 PDF comparativo · 11 Ingestor futuro · 12 Qualidade e testes · 13 Redesign visual (DEC-050).
**Alinhamento com MVPs:** ver `15-MVP_PLAN.md` (Fases 1–3 ≈ MVP 0; 4 e 7 ≈ MVP 1; 5–6 ≈ MVP 2; 8 ≈ MVP 3; 9–10 ≈ MVP 4; 11 ≈ MVP 5).

---

## Fase 1 — Fundação do projeto

## TASK-001 — Bootstrap do projeto Next.js

**Prioridade:** Alta · **Fase:** Fundação
**Resumo:** Criar o app React/Next.js client-side (sem backend transacional), com TypeScript, lint, testes configurados e estrutura de módulos que separa `formulario/`, `comparador/` e `shared/` (contrato).
**Regras RN:** RN-095, RN-096, RN-097. **Depende de:** —
**Critérios de aceite resumidos:** app roda localmente; nenhuma rota de API de escrita; módulos separados; pipeline de teste roda.
**Testes esperados:** smoke test de build; teste de exemplo por categoria.

## TASK-002 — Recursos estáticos: listas e base de municípios

**Prioridade:** Alta · **Fase:** Fundação
**Resumo:** Definir formato e loader das listas estáticas (Autos, empresas, tipos) e empacotar `municipios_sp.geojson` + `pop_municipios.csv` servidos junto do app.
**Regras RN:** RN-016, RN-029 (fonte de dados). **Depende de:** TASK-001. **Bloqueio parcial:** Q-005 (formato das listas).
**Critérios de aceite resumidos:** listas carregam client-side; base de municípios acessível; sem chamadas a servidor próprio.
**Testes esperados:** unitários do loader; integridade (645 municípios, join codarea↔cod_municipio).

---

## Fase 2 — Contrato JSON

## TASK-003 — Schema base do JSON de operação (tipos + validação estrutural)

**Prioridade:** Alta · **Fase:** Contrato JSON
**Resumo:** Modelar o documento completo da Spec 02 (raiz, autos, secoes, servicos, locais, matrizes, itinerarios, paradas, rota, viagens) em schema executável (ex.: zod) — **schema fechado**: campos de fluxo/extras são rejeitados.
**Regras RN:** RN-001, RN-005, RN-008..011, RN-013, RN-014, RN-024, RN-025, RN-031, RN-033..041, RN-044, RN-054, RN-056..059, RN-061..063. **Depende de:** TASK-001.
**Critérios de aceite resumidos:** exemplo mínimo da Spec 02 §15 valida; cada validação estrutural da Spec 02 §14 tem caso negativo que falha.
**Testes esperados:** contrato (fixture §15 passa; mutações dirigidas falham uma a uma).

## TASK-004 — Validador XOR de Parada e extremos-Seção

**Prioridade:** Alta · **Fase:** Contrato JSON
**Resumo:** Validações finas de Parada: XOR `secao_uuid`/`local_uuid`, ordem 1-based sem lacunas, extremos sempre Seção, referências íntegras com geolocalização do sentido.
**Regras RN:** RN-033..036. **Depende de:** TASK-003.
**Critérios de aceite resumidos:** todos os exemplos inválidos do RULE_INDEX recusados com erro identificável.
**Testes esperados:** unitários exaustivos (ambos presentes, nenhum, Local na ponta, referência quebrada, geoloc do sentido ausente).

## TASK-005 — Factory de entidades com UUID

**Prioridade:** Alta · **Fase:** Contrato JSON
**Resumo:** Criação de Seção/Serviço/Local/Viagem com `crypto.randomUUID()`; edição nunca troca UUID.
**Regras RN:** RN-001..003. **Depende de:** TASK-003.
**Critérios de aceite resumidos:** UUID v4 válida na criação; editar campos preserva UUID.
**Testes esperados:** unitários (formato; imutabilidade da identidade).

## TASK-006 — Importação de JSON com preservação de UUID

**Prioridade:** Alta · **Fase:** Contrato JSON
**Resumo:** Importar arquivo, validar (schema + checagens estáticas), carregar no estado de edição preservando **todas** as UUIDs; validar identidade contra listas estáticas (bloqueio se obsoleta).
**Regras RN:** RN-004, RN-017, RN-028, RN-032, RN-091 (parte F). **Depende de:** TASK-002, TASK-003, TASK-005.
**Critérios de aceite resumidos:** import→export sem edição = mesmo conjunto de UUIDs; identidade obsoleta bloqueia com mensagem da Spec 04 §14.
**Testes esperados:** integração (round-trip); regressão de UUID; casos de bloqueio.

## TASK-007 — Exportação de JSON (proposta / vigente)

**Prioridade:** Alta · **Fase:** Contrato JSON
**Resumo:** Ações "exportar proposta" (`data_criacao` automática) e "definir como vigente" (`data_publicacao` manual, remove `data_criacao`), com nomes de arquivo sugeridos e validação bloqueante.
**Regras RN:** RN-011, RN-078 (gate), RN-079. **Depende de:** TASK-003, TASK-006.
**Critérios de aceite resumidos:** XOR de datas correto por status; UUIDs preservadas; export bloqueado com pendência.
**Testes esperados:** integração; contrato (status/data); negativo (dois campos de data).

---

## Fase 3 — Validações de domínio

## TASK-008 — Módulo de tipificação tipo × característica

**Prioridade:** Alta · **Fase:** Validações de domínio
**Resumo:** Tabela da Spec 03 §10.2 como módulo puro: características permitidas por tipo, famílias, litoralidade, veículo único no semiurbano, forma convencional (padrão) por tipo e reconversão de Serviços na troca de tipo (DEC-034); usado por schema, dropdown e etapa Identificação.
**Regras RN:** RN-019..023. **Depende de:** TASK-003. (Q-001 decidida — DEC-026: partição fechada, sem bloqueio.)
**Critérios de aceite resumidos:** matriz completa testada; `SU` em Rodoviário recusado; `CR`+`CL` juntos recusados; `ME`/`ML`/`MM` recusados em Litorâneo e `MEL`/`MLL`/`MML` recusados em Rodoviário; `EX`/`LE`/`MX` aceitos nos dois; `SL` inexistente no enum.
**Testes esperados:** unitários (tabela inteira, válidos e inválidos).

## TASK-009 — Primitivas geoespaciais: Haversine e centroide

**Prioridade:** Alta · **Fase:** Validações de domínio
**Resumo:** Funções puras `haversine(p1,p2)` (R=6.371.000) e `centroide(pontos)` (média simples), únicas primitivas de distância em linha reta do projeto.
**Regras RN:** RN-027 (base), RN-087 (uso no Comparador). **Depende de:** TASK-001.
**Testes esperados:** unitários com valores conhecidos; simetria; escala sub-quilométrica.

## TASK-010 — Regra dos 350 m: inserção incremental (Seção) e pareada (Local)

**Prioridade:** Alta · **Fase:** Validações de domínio
**Resumo:** `INSERIR(S,P)` com centroide resultante (recusa se qualquer ponto do conjunto > 350 m) e validação pareada de Local; mais a checagem estática `VALIDA_ESTATICO` para leitores.
**Regras RN:** RN-027, RN-028, RN-032. **Depende de:** TASK-009.
**Critérios de aceite resumidos:** casos de borda da Spec 03 §7.2 (1º ponto, 2º ponto ≤700 m, deslocamento de centroide) cobertos.
**Testes esperados:** unitários (sequências determinísticas; aceito/recusado).

## TASK-011 — Derivação de município por ponto-em-polígono

**Prioridade:** Alta · **Fase:** Validações de domínio
**Resumo:** `MUNICIPIO(ponto)`: ray casting sobre o geojson, join com CSV, fallback ao polígono mais próximo ≤ 2 km, erro "fora de SP" acima; ponto decisor = centroide (Seção) / ponto ou ponto médio (Local).
**Regras RN:** RN-029. **Depende de:** TASK-002, TASK-009. **Bloqueio parcial:** Q-006 (distância à fronteira).
**Testes esperados:** unitários (interior, borda, litoral, fora de SP).

## TASK-012 — Checagens estáticas consolidadas de leitor

**Prioridade:** Média · **Fase:** Validações de domínio
**Resumo:** Pipeline de validação de JSON de origem desconhecida (usado por Formulário-import e Comparador): schema + 350 m estático + tipificação, com severidade (bloqueante × alerta técnico).
**Regras RN:** RN-028, RN-091. **Depende de:** TASK-003, TASK-008, TASK-010.
**Testes esperados:** integração com fixtures válidas/violadas.

---

## Fase 4 — Formulário

## TASK-013 — Tela inicial: carregar JSON × criar do zero

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Duas ações da Spec 04 §3, com avisos obrigatórios (preservação de UUID; documento do zero sem identidade), validação de carregamento e recomendação do caminho "carregar".
**Regras RN:** RN-004, RN-016, RN-017. **Depende de:** TASK-006.
**Testes esperados:** E2E (dois fluxos, mensagens).

## TASK-014 — Layout por etapas + painel de pendências

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Stepper não travado (7 etapas), cabeçalho persistente, painel de pendências vivo (erros bloqueantes × alertas) com navegação por clique.
**Regras RN:** RN-078 (estrutura). **Depende de:** TASK-013.
**Testes esperados:** E2E (navegação livre; pendência clicável).

## TASK-015 — Etapa Identificação

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Seleção de Autos/empresa/tipo das listas; `codigo`/`empresa` não editáveis pós-criação; `tipo` editável (troca reconverte Serviços incompatíveis à forma convencional do tipo + aviso — DEC-034); selo de status.
**Regras RN:** RN-016, RN-023. **Depende de:** TASK-008, TASK-013.
**Testes esperados:** E2E; unitário da reconversão na troca de tipo.

## TASK-016 — Etapa Serviços (CRUD + duplicar)

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Criar/editar/remover/duplicar Serviço: `numero_n` sequencial sugerido, dropdown filtrado por tipificação, `carater`, direcionalidade; duplicação com UUIDs novas e remoção em cascata de Seções órfãs.
**Regras RN:** RN-006, RN-007, RN-018, RN-019..021, RN-024. **Depende de:** TASK-005, TASK-008.
**Testes esperados:** unitários (duplicar → UUIDs novas, referências de Seção mantidas); E2E.

## TASK-017 — Editor de Seções no mapa

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Criar Seção clicando no mapa (nome digitado, município derivado somente-leitura), reutilizar Seções existentes, contribuição de geoloc por Serviço/sentido, arrasto com revalidação 350 m. Na recusa do arrasto, **só a mensagem literal da Spec 04 §14** (sem afordância de "criar Seção nova" — DEC-044/Q-025): arrastar não pode descaracterizar a Seção; quem quer Seção nova usa o fluxo de clique.
**Regras RN:** RN-025..027, RN-029. **Depende de:** TASK-010, TASK-011, TASK-020 (mapa base), TASK-024 (o gesto de criar/arrastar Seção dispara o recálculo do estado de rota ao vivo — RN-052; DEC-041).
**Fio da pendência de rota:** o recálculo disparado por este editor pode resultar em `sem-rota`; a montagem e a passagem do `ItinerarioAoVivo` a `coletarPendencias` (TASK-044) ficam consolidadas na TASK-019 (dona do estado por itinerário) — este editor apenas alimenta o recálculo.
**Testes esperados:** unitários dos fluxos de inserção; E2E de recusa 350 m.

## TASK-018 — Editor de Locais no mapa

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Criar/arrastar/excluir-por-sentido Locais (criação bidirecional espelhada; exclusão de um sentido torna unidirecional e remove a parada do sentido), 350 m pareado, município derivado.
**Regras RN:** RN-031, RN-032, RN-029. **Depende de:** TASK-010, TASK-011, TASK-020, TASK-024 (o gesto de criar/arrastar/excluir Local dispara o recálculo do estado de rota ao vivo — RN-052; DEC-041).
**Fio da pendência de rota:** idem TASK-017 — o recálculo pode resultar em `sem-rota`; a costura com `coletarPendencias` (TASK-044) fica consolidada na TASK-019.
**Testes esperados:** unitários; E2E.

## TASK-019 — Montagem do itinerário (paradas ordenadas + tabela lateral)

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Inserir Seções/Locais em ordem, reordenar pela tabela lateral sincronizada com o mapa, validações de Parada (XOR, extremos, geoloc do sentido), conjunto de Seções Ida=Volta.
**Regras RN:** RN-030, RN-033..036, RN-038. **Depende de:** TASK-004, TASK-017, TASK-018, TASK-024 (estado de rota ao vivo por itinerário — RN-052; DEC-041), TASK-025 (composer real de `descricao_itinerario` injetado no recálculo bem-sucedido — Q-027/DEC-046), TASK-044 (pendência bloqueante "itinerário sem rota válida" já disponível em `coletarPendencias`).
**Ordem de execução (DEC-046):** a TASK-025 roda **antes** desta task; a etapa real injeta o `ComporDescricao` real (sem placeholder provisório).
**Nota de UX herdada (DEC-044/Q-025):** ao montar a etapa real, **não** adicionar afordância de "criar Seção nova" na recusa de arrasto de Seção — só a mensagem da Spec 04 §14; o mesmo vale para a recusa pareada de Local (TASK-018).
**Obrigação de fiação (fecha o fio da TASK-044):** como dona do estado de rota ao vivo por itinerário, esta task **monta** o `ItinerarioAoVivo` (`{ numero_n, sentido, estadoRota }`) a partir dos estados `congelada`/`recalculada`/`sem-rota` da TASK-024 e o **passa** ao segundo parâmetro de `coletarPendencias` (TASK-044), de modo que um itinerário em `sem-rota` de fato acenda a pendência bloqueante no painel. Sem esta costura, o parâmetro de `coletarPendencias` fica no default vazio (nunca dispara) — é aqui que ele deixa de ser código morto.
**Testes esperados:** unitários; E2E (reordenar → recálculo sinalizado; recálculo que falha no OSRM → pendência bloqueante visível no painel, OSRM mockado).

---

## Fase 5 — Mapa e roteamento

## TASK-020 — Mapa base MapLibre/OSM

**Prioridade:** Alta · **Fase:** Mapa
**Resumo:** Componente de mapa client-side (tiles OSM), marcadores, arrasto, desenho de LineString; captura de canvas para o PDF.
**Regras RN:** RN-074 (imagem). **Depende de:** TASK-001.
**Testes esperados:** smoke/E2E.

## TASK-021 — Cliente OSRM (requisição, extração, conversão)

**Prioridade:** Alta · **Fase:** Rotas
**Resumo:** Montagem da URL (`overview=full&geometries=geojson&steps=true&…`), extração legs→trechos, conversão m→km half-up 2 casas, totais por soma dos trechos.
**Regras RN:** RN-014, RN-047, RN-050. **Depende de:** TASK-001.
**Testes esperados:** unitários (URL; arredondamento 0,005; soma=total) com **mock do OSRM**.

## TASK-022 — Tratamento de falha do OSRM (bloqueante)

**Prioridade:** Alta · **Fase:** Rotas
**Resumo:** Timeout/erro de rede (1 retry + mensagem de indisponibilidade), `NoRoute`, `NoSegment` (identifica a parada), `code != Ok`; sem fallback; pendência bloqueante enquanto houver itinerário sem rota.
**Regras RN:** RN-048, RN-049, RN-078. **Depende de:** TASK-021.
**Testes esperados:** integração com mock (cada código); verificação de que a mensagem não menciona tarifa.

## TASK-023 — Pontos de rota (forçar traçado)

**Prioridade:** Alta · **Fase:** Rotas
**Resumo:** Clique na rota cria vértice arrastável; intercalação na requisição por (`apos_parada_ordem`, índice); caminho `waypoints` + fallback de fusão de legs; invariante trechos = paradas−1; persistência em `rota.pontos_de_rota`.
**Regras RN:** RN-041..043, RN-051. **Depende de:** TASK-021.
**Testes esperados:** unitários com o exemplo literal da Spec 03 §3.6.1 (7 coordenadas, 2 trechos), nos dois caminhos.

## TASK-024 — Recalcular × abrir congelado

**Prioridade:** Alta · **Fase:** Rotas
**Resumo:** Abrir JSON desenha rota/descrição congeladas sem chamar OSRM; qualquer edição de itinerário/coordenada/ponto de rota dispara recálculo no "soltar"; reaplicação dos pontos de rota na reedição.
**Regras RN:** RN-015, RN-046, RN-052. **Depende de:** TASK-006, TASK-021, TASK-023.
**Testes esperados:** integração (abertura sem requisição — mock espião); E2E.

## TASK-025 — Descrição textual do itinerário

**Prioridade:** Alta · **Fase:** Rotas
**Resumo:** Compositor `DESCRICAO(itinerario)`: marcos = Seções (`Cidade - Nome`), vias de `steps[].name` por intervalo entre Seções, limpeza (§3.7.5), casos de borda (sem steps, Seções adjacentes); painel de UX com recalcular/copiar/ver itens; pendência bloqueante se ausente com rota presente.
**Regras RN:** RN-044..046, RN-053, RN-078. **Depende de:** TASK-021, TASK-024.
**Ordem de execução (DEC-046):** roda **antes** da TASK-019, que injeta o composer real no recálculo bem-sucedido. Entrega, no padrão de componente controlado + harness (DEC-043/045): o compositor (§3.7), a exposição de `steps[].name` em `extrairRota` (hoje descartado) e o painel de descrição controlado que a TASK-019 monta na etapa real.
**Testes esperados:** unitários (algoritmo + limpeza); contrato (`itens` bem-formados); E2E do painel.

---

## Fase 6 — Distâncias e seccionamento

## TASK-026 — Cálculo da matriz de distâncias

**Prioridade:** Alta · **Fase:** Distâncias
**Resumo:** `dist(I,A,B)` por soma de trechos entre posições (inclui Locais), todas as combinações, `valor_adotado` = média half-up/valor único; recálculo automático ao concluir edição do itinerário; pendência "matriz desatualizada".
**Regras RN:** RN-054..057, RN-078. **Depende de:** TASK-019, TASK-021.
**Testes esperados:** unitários (pares com Locais no meio; unidirecional; média 6,00/6,10→6,05).

## TASK-027 — Editor da matriz de seccionamento

**Prioridade:** Alta · **Fase:** Distâncias
**Resumo:** Matriz triangular inferior (X na diagonal, "—" não habilitado), habilitar/desabilitar par, edição manual, e os dois botões de sugestão em lote (menor distância entre Serviços; distâncias do próprio Serviço).
**Regras RN:** RN-058..060, RN-076 (formato). **Depende de:** TASK-026.
**Testes esperados:** unitários dos dois algoritmos de sugestão (empate; par só do Serviço); E2E do editor.

---

## Fase 7 — Viagens e horários

## TASK-028 — Grade de horários (dias comuns)

**Prioridade:** Alta · **Fase:** Horários
**Resumo:** Grade Seções × dias (blocos por posição ordinal, HH:MM); preencher primeira Seção cria a Viagem com sugestão inicial por acúmulo de durações; Locais ocultos recebem horários internamente.
**Regras RN:** RN-061..064, RN-067. **Depende de:** TASK-019, TASK-026.
**Testes esperados:** unitários (criação de Viagem por célula; offsets gerados); E2E da grade.

## TASK-029 — Edição de horário passante (âncoras + redistribuição)

**Prioridade:** Alta · **Fase:** Horários
**Resumo:** Editar passante vira âncora e reinterpolação proporcional entre âncoras (tail apeado; degenerado uniforme); bloqueio de fora-de-ordem na célula; reset por Viagem e em lote.
**Regras RN:** RN-063, RN-065, RN-066. **Depende de:** TASK-028.
**Atenção (herdado da revisão da TASK-028):** `atualizarHorarioSaida` (`src/formulario/viagens/acoes-grade.ts`) hoje re-deriva **todos** os offsets pela sugestão inicial ao reeditar a partida — correto enquanto não há âncoras, mas **apagaria âncoras manuais** quando esta task existir. Revisitar essa função para preservar âncoras ao mudar `horario_saida`. Ver parecer `docs-dev/14-REVISOES/TASK-028-20260714.md`.
**Testes esperados:** unitários (exemplo literal 0/30/60→fixa 50→25; monotonicidade; idempotência do reset).

## TASK-030 — Tabela de feriados e cópias

**Prioridade:** Alta · **Fase:** Horários
**Resumo:** Grade de feriados (`viagem_feriado=true`), botão "copiar dias comuns" (clona com UUIDs novas, confirmação de sobrescrever/mesclar), "copiar viagem para outro dia", apagar viagem/bloco.
**Regras RN:** RN-007, RN-061, RN-068, RN-071. **Depende de:** TASK-028.
**Testes esperados:** unitários (cópia → UUIDs novas; grades independentes); E2E.

## TASK-031 — Contagens e resumo operacional

**Prioridade:** Alta · **Fase:** Horários
**Resumo:** Módulo de contagens (viagens semanais, pares compráveis ∪ ponta-a-ponta, opções de deslocamento; estratificação pelas 7 faixas) + painel de revisão rotulado "semana padrão (sem feriados)".
**Regras RN:** RN-069, RN-072, RN-073. **Depende de:** TASK-027, TASK-030.
**Testes esperados:** unitários (fórmulas; feriado não altera; ponta-a-ponta sem dupla contagem).

## TASK-032 — Revisão e validação final

**Prioridade:** Alta · **Fase:** Horários/Formulário
**Resumo:** Tela de Revisão: listas de erros bloqueantes e alertas da Spec 04 §11, descrições textuais por Serviço/sentido, gate de exportação.
**Regras RN:** RN-071, RN-078. **Depende de:** TASK-014, TASK-025, TASK-026, TASK-029, TASK-031, TASK-044 (a pendência bloqueante "itinerário sem rota válida" que o gate consolida já é emitida por `coletarPendencias`).
**Testes esperados:** integração (cada pendência ativa/desativa o gate — inclusive a de rota ausente da TASK-044); E2E.

---

## Fase 8 — PDF operacional

## TASK-033 — PDF operacional: estrutura e identificação

**Prioridade:** Alta · **Fase:** PDF
**Resumo:** Geração client-side com a estrutura da Spec 04 §13.1 (capa, resumo rotulado, serviços, itinerários com sequência de Seções + descrição + mapa, rodapé com aviso SEI e `versao_schema`).
**Regras RN:** RN-074, RN-076, RN-077. **Depende de:** TASK-020, TASK-025, TASK-031.
**Testes esperados:** PDF (presença/ordem de seções; aviso; sem R$).

## TASK-034 — PDF operacional: tabelas horárias e matrizes

**Prioridade:** Alta · **Fase:** PDF
**Resumo:** Versão simples (corpo) e detalhada (anexo, passantes por Seção), matrizes triangulares em km, anexo com Locais sem horários; offsets ausentes de todo o PDF.
**Regras RN:** RN-075, RN-076. **Depende de:** TASK-033.
**Testes esperados:** PDF (duas versões; Locais só no anexo; sem offsets).

---

## Fase 9 — Comparador

## TASK-035 — Carregamento e validação dos dois arquivos

**Prioridade:** Alta · **Fase:** Comparador
**Resumo:** Upload duplo, validação por arquivo (bloqueantes × alertas técnicos), validação entre arquivos (mesmo Autos bloqueia; schema divergente alerta), rótulos sugeridos/editáveis, trocar lados.
**Regras RN:** RN-080, RN-084, RN-090, RN-091, RN-012. **Depende de:** TASK-012.
**Testes esperados:** integração (fixtures inválidas/Autos diferentes); unitário do espelhamento.

## TASK-036 — Motor de diff por UUID + taxonomia

**Prioridade:** Alta · **Fase:** Comparador
**Resumo:** Casamento por UUID (4 entidades) e por contexto (itinerário, parada, pares, geoloc, horários); taxonomia Adicionado/Removido/Alterado/Inalterado/Alerta; propagação; exclusão de status/datas; detector de UUIDs não preservados; heurística "recriada" (sinaliza).
**Regras RN:** RN-006, RN-012, RN-081..083, RN-085, RN-086. **Depende de:** TASK-035.
**Testes esperados:** unitários extensivos (mesma UUID alterada; só-vigente; só-proposta; `numero_n` mudado sem mudar identidade; taxa de casamento baixa).

## TASK-037 — Telas de comparação (visão geral, serviços, horários, opções, matrizes)

**Prioridade:** Alta · **Fase:** Comparador
**Resumo:** Visão geral (placar, destaques, alertas), tabela de Serviços, viagens por faixa (semana padrão × feriados separados), opções de deslocamento com atribuição de causas, matrizes comparativas célula a célula, filtros e abas.
**Regras RN:** RN-069, RN-072, RN-083, RN-088, RN-089. **Depende de:** TASK-031 (módulo de contagens compartilhado), TASK-036.
**Testes esperados:** unitários dos formatos (`antigo → novo (Δ)`); integração por aba.

## TASK-038 — Mapa comparativo

**Prioridade:** Média · **Fase:** Comparador
**Resumo:** Desenho das rotas congeladas (sobreposição/lado a lado/individual), destaques (Seção adicionada/removida/movida com deslocamento em metros via Haversine), comparação por sinais estáveis, camada técnica de Locais.
**Regras RN:** RN-015, RN-080, RN-087. **Depende de:** TASK-020, TASK-036. **Bloqueio parcial:** Q-004 (tolerância).
**Testes esperados:** unitários (sinais estáveis: geometria difere + sinais iguais → inalterada).

---

## Fase 10 — PDF comparativo

## TASK-039 — PDF comparativo completo

**Prioridade:** Alta · **Fase:** PDF Comparador
**Resumo:** Estrutura da Spec 05 §17.2 (capa com os dois arquivos + aviso SEI, resumo executivo, seções 3–9, anexo técnico), client-side, mesmas regras transversais.
**Regras RN:** RN-076, RN-077, RN-092. **Depende de:** TASK-037, TASK-038.
**Testes esperados:** PDF (estrutura; alertas presentes; semana padrão rotulada).

---

## Fase 11 — Ingestor futuro

## TASK-040 — (BLOQUEADA) Spec 06 + plano do Ingestor

**Prioridade:** Baixa · **Fase:** Ingestor
**Resumo:** Escrever a Spec 06 (modelo PostgreSQL, mapeamento UUID→chave, checagens estáticas na ingestão) e só então criar tasks de implementação. **Não implementar antes da decisão humana (RN-093).**
**Regras RN:** RN-093, RN-094. **Depende de:** decisão humana; MVPs 0–4 entregues.

---

## Fase 12 — Qualidade e testes (contínua)

## TASK-041 — Fixtures canônicas de JSON

**Prioridade:** Alta · **Fase:** Qualidade
**Resumo:** Conjunto versionado de fixtures: o exemplo mínimo da Spec 02 §15, um Autos bidirecional multi-serviço, um unidirecional, um par vigente/proposta com diffs conhecidos, e variantes inválidas por regra (uma mutação por RN estrutural).
**Regras RN:** transversal. **Depende de:** TASK-003.
**Testes esperados:** as próprias fixtures são consumidas pelas demais suítes.

## TASK-042 — Suíte de regressão de UUID e contrato

**Prioridade:** Alta · **Fase:** Qualidade
**Resumo:** Testes de regressão permanentes: round-trip import→export preserva UUIDs; schema fechado rejeita campos de fluxo/R$; snapshot do contrato por `versao_schema`.
**Regras RN:** RN-004, RN-010, RN-013. **Depende de:** TASK-006, TASK-007, TASK-041.

## TASK-043 — Consolidar o arredondamento half-up num único primitivo em `shared/`

**Prioridade:** Baixa · **Fase:** Qualidade
**Resumo:** Origem: ressalva não bloqueante da revisão de aderência da TASK-021 (`docs-dev/14-REVISOES/TASK-021-20260710.md`, seção "Problemas encontrados"). Hoje existem duas implementações independentes da mesma semântica de arredondamento half-up a N casas (`Number.EPSILON` + `Math.round`) — `arredondar2` em `src/shared/contrato/validacoes-estruturais.ts` (fixo a 2 casas, usado na checagem estrutural de somas do contrato) e `arredondaHalfUp` em `src/formulario/roteamento/extrair-rota.ts` (parametrizado, usado na conversão m→km do cliente OSRM; `duracao_s` chama `Math.round` direto em vez do helper, de forma não uniforme). Consolidar num único primitivo puro em `shared/` (ex.: `shared/geo/` ou novo módulo de cálculo), reaproveitado pelos dois pontos e usado uniformemente (inclusive para `duracao_s`). **Refator puro — nenhuma mudança de comportamento observável**; a regra de arredondamento continua a da Spec 03 §3.4/RN-050, só a implementação deixa de estar duplicada.
**Regras RN:** RN-050 (regra já existente; task não cria regra nova, só consolida a implementação). **Depende de:** TASK-003, TASK-021.
**Fora de escopo:** qualquer mudança na regra de arredondamento em si, na regra dos 350 m ou em qualquer outro cálculo; qualquer alteração de comportamento observável do schema ou do cliente OSRM; não expandir para outras duplicações não citadas na ressalva de origem.
**Critérios de aceite resumidos:** existe exatamente um primitivo de arredondamento half-up no repositório; `validacoes-estruturais.ts` e `extrair-rota.ts` (incluindo `duracao_s`) o consomem; nenhum teste existente muda de resultado.
**Testes esperados:** unitários do primitivo consolidado (mesmos casos já cobertos nas duas suítes atuais, incluindo os casos de borda 0,005→0,01 e o caso de fechamento de trechos); suíte completa (`npm test`) permanece 100% verde sem alteração de expectativas.

## TASK-044 — Pendência bloqueante de itinerário sem rota válida no painel

**Prioridade:** Alta · **Fase:** Rotas
**Resumo:** Origem: follow-up deferido explicitamente na análise da TASK-022. A TASK-022 entregou a taxonomia de falha do OSRM (indisponível/`NoRoute`/`NoSegment`/`code != Ok`) e a camada de mensagens (Spec 04 §14, sem menção a tarifa — RN-049), mas **não** fez o wire da pendência bloqueante "itinerário sem rota válida" no painel, porque nesse ponto do projeto não existia modelo de estado de rota em edição ao vivo (no modo carregado o `documento` já é schema-válido — todo itinerário tem `rota`; não havia caso computável de "sem rota"). A TASK-024 ("Recalcular × abrir congelado") introduz esse estado ao vivo: edições de itinerário/coordenada/ponto de rota que falham no OSRM deixam o itinerário sem `rota` válida. Esta task adiciona a entrada bloqueante correspondente em `coletarPendencias` (`src/formulario/pendencias/pendencias.ts`), consumindo o estado de rota ao vivo da TASK-024 e a taxonomia/mensagens da TASK-022, com a mensagem operacional de §14 ("O itinerário de Ida do Serviço 0000-1CR está sem rota calculada. Recalcule antes de exportar.") e `etapaAlvo` na etapa de mapa/itinerário. **Não** cria o gate de exportação em si (isso é a TASK-032, RN-078) — só popula a pendência viva que o gate consolidará.
**Regras RN:** RN-048 (indisponibilidade bloqueante — enquanto houver itinerário sem rota válida, não há matriz nem exportação), RN-078 (rota ausente é erro bloqueante de §11), RN-049 (mensagem não menciona tarifa). **Depende de:** TASK-022, TASK-024.
**Fora de escopo:** a taxonomia de falha e o retry do cliente OSRM (já entregues na TASK-022); a mecânica de recálculo/congelamento ao vivo (TASK-024); o gate final de exportação contra pendências (TASK-032); as demais pendências de §11 (descrição ausente — TASK-025; matriz desatualizada — TASK-026; etc.); qualquer alteração no contrato JSON (a pendência é de validação efêmera de sessão — NEG-004, nunca persistida).
**Critérios de aceite resumidos:** `coletarPendencias` emite uma pendência `severidade: "bloqueante"` por itinerário sem `rota` válida no estado ao vivo, com a mensagem de §14 e `etapaAlvo` na etapa de mapa/itinerário; a mensagem não contém "tarifa"/"R$" (RN-049); itinerários com rota válida não geram pendência; o `TODO` de `pendencias.ts` que hoje credita "rota ausente/desatualizada (TASK-022/024)" é atualizado para refletir a autoria real (TASK-044 para a viva; TASK-032 para o gate).
**Testes esperados:** unitários de `coletarPendencias` (itinerário sem rota → 1 bloqueante; com rota → nenhuma; um sem e um com rota → só a do primeiro; mensagem sem "tarifa"/"R$"); integração leve com o estado ao vivo da TASK-024 (rota que falhou no OSRM vira pendência); E2E opcional do painel (item clicável leva à etapa de mapa).
**Perguntas em aberto:** nenhuma (as ambiguidades da TASK-022 — identificação da parada no `NoSegment`, timeout de 15 s ajustável, fronteira desta pendência — foram decididas pelo responsável na análise da TASK-022).

## TASK-045 — Fetch-espião ativo na garantia de abertura sem OSRM

**Prioridade:** Baixa · **Fase:** Rotas
**Resumo:** Origem: ressalva (não bloqueante) da revisão da TASK-024, decidida em DEC-042 (Q-023). O teste de abertura de `congelarRotaCarregada` em `roteamento-recalculo-vivo.test.ts` cria um `vi.fn()` como espião de fetch mas **nunca o liga** à função sob teste (que é síncrona e não recebe `fetch`), tornando a asserção `not.toHaveBeenCalled()` **vacuamente verdadeira**. Esta task substitui o espião decorativo por um **espião ativo** sobre `globalThis.fetch` (`vi.spyOn`), assertando zero chamadas conforme DEC-042; a garantia estrutural (função síncrona, sem `Promise`) permanece como reforço. Só teste — nenhum código de produção muda.
**Regras RN:** RN-052 (garantia "abrir = 0 chamadas OSRM"; nenhuma regra nova). **Depende de:** TASK-024.
**Fora de escopo:** qualquer mudança em código de produção (`estado-rota-viva.ts` e demais); a assinatura provisória do composer (fica para a TASK-025); estender o padrão a outros testes/garantias (p.ex. RN-080 do Comparador) antes de aquelas suítes serem tocadas; qualquer alteração de comportamento observável.
**Critérios de aceite resumidos:** o teste de abertura usa `vi.spyOn(globalThis, "fetch")` (com `mockRestore` ao final) e assere zero chamadas; a asserção passa a **falhar** se `congelarRotaCarregada` chamar `fetch`; nenhum outro teste muda de resultado; suíte completa permanece verde.
**Testes esperados:** unitário ajustado em `roteamento-recalculo-vivo.test.ts` (abertura → espião ativo com zero chamadas); `npm test` 100% verde sem alteração de outras expectativas.
**Perguntas em aberto:** nenhuma (Q-023 decidida em DEC-042).

## TASK-046 — Reconciliação de horários/offsets quando o itinerário muda

**Prioridade:** Alta · **Fase:** Horários
**Resumo:** Origem: revisão da TASK-019 (item 1) + DEC-048 (Q-029). Quando o itinerário muda **depois** de existirem Viagens com `horarios_paradas`, reconciliar os offsets conforme DEC-048: **(a)** reordenar/inserir/remover parada ⇒ recomputar cada Viagem pela sugestão inicial (Spec 03 §8.1, acúmulo de `trecho.duracao_s`), fixando `horario_saida` e descartando âncoras manuais; **(b)** mudança que preserva ordem/conjunto (mover coordenada, ponto de rota) ⇒ preservar os `offset_horario` gravados, recomputar só via reset (§8.3). Detecta o caso comparando a sequência de identidade/`ordem` das paradas antes×depois; aplica-se ao write-back de `documentoComItinerarioAtualizado` que a TASK-019 já faz.
**Regras RN:** RN-063 (um offset por Parada, monotônico), RN-064 (sugestão inicial), RN-066 (reset), RN-015. **Depende de:** TASK-019, TASK-028.
**Fora de escopo:** reconciliação de `matriz_distancias` (já é escopo da TASK-026); a grade de horários e a criação de Viagem por célula (TASK-028); âncoras/redistribuição/reset em si (TASK-029); qualquer mudança de contrato JSON.
**Critérios de aceite resumidos:** reordenar paradas de itinerário com Viagens ⇒ offsets recomputados por §8.1 com `horario_saida` intacto e âncoras descartadas; mover coordenada/ponto de rota sem mudar a ordem ⇒ offsets gravados inalterados; inserir/remover parada ⇒ contagem de `horarios_paradas` reconciliada (um por Parada); documento resultante satisfaz RN-063; nada inválido exportável.
**Testes esperados:** unitários (reorder ⇒ re-sugestão mantendo saída; coordenada muda mas ordem igual ⇒ offsets preservados; inserir/remover parada ⇒ contagem reconciliada), OSRM mockado.
**Perguntas em aberto:** nenhuma (Q-029 decidida em DEC-048).

## TASK-047 — Feedback ao usuário do motivo de o recálculo/rota não ocorrer

**Prioridade:** Média · **Fase:** Rotas/Formulário
**Resumo:** Origem: revisão da TASK-019 (item 2). Hoje `aplicarNovasParadas` faz `if (!resultado.ok) return`, descartando **silenciosamente** as `ViolacaoMontagem` (RN-034 <2 paradas, RN-035 extremos Seção, RN-036 geoloc do sentido) — a tabela mostra a montagem inválida em WIP, mas o documento mantém a última ordem válida e o usuário não vê **por que** a rota não recalculou. Esta task superficializa o motivo na etapa "Seções, Locais e Itinerários": exibe as `ViolacaoMontagem` da tentativa atual e/ou sinaliza a divergência tabela×documento. Para falha do OSRM, reusa a taxonomia/mensagens de §14 (Spec 04) da TASK-022. Não altera a lógica de write-back nem o contrato.
**Regras RN:** RN-034/035/036 (violações de montagem exibidas), RN-048/049 (mensagem de falha de rota sem tarifa). **Depende de:** TASK-019, TASK-022.
**Fora de escopo:** mudar quando/como o recálculo ocorre; o gate de exportação (TASK-032); a pendência bloqueante de rota ausente (TASK-044); qualquer mudança de contrato JSON.
**Critérios de aceite resumidos:** montar sequência inválida (<2 paradas / Local no extremo / sem geoloc do sentido) mostra na etapa o motivo específico da recusa; nenhuma alteração no documento exportado; mensagens não mencionam tarifa/R$.
**Testes esperados:** unitários (cada `ViolacaoMontagem` vira mensagem); E2E (montagem inválida acende o aviso; exportação continua barrada onde já era).
**Perguntas em aberto:** nenhuma.

## TASK-048 — Display read-only da matriz de distâncias na etapa Matrizes

**Prioridade:** Alta · **Fase:** Distâncias
**Resumo:** Origem: lacuna de backlog identificada na análise da TASK-027 — a matriz de distâncias é **calculada e congelada** pela TASK-026 (`matriz_distancias`, RN-054..057) e **impressa no PDF** pela TASK-034, mas nenhuma task renderiza sua **exibição em tela** na etapa Matrizes do Formulário (Spec 04 §9.1). Esta task acopla à etapa Matrizes — cujo shell (seletor de Serviço + grade triangular inferior com "X" na diagonal e cabeçalhos `Cidade - Nome da Seção`) é entregue pela TASK-027 — a apresentação **somente-leitura** da matriz de distâncias do Serviço selecionado: uma célula por par com o `valor_adotado_de_distancia` em km, e **detalhe Ida/Volta expansível** (hover/clique) com `distancia_trecho_ida`/`distancia_trecho_volta` quando o Serviço é bidirecional (Spec 04 §9.1). Lê exclusivamente o `matriz_distancias` já congelado no documento — **não** chama OSRM nem recalcula (RN transversal de leitura do congelado; Spec 03 §12). Valores só em km, **sem R$** (RN-013/076).
**Regras RN:** RN-054 (uma entrada por par não-ordenado de Seções distintas — determina as células), RN-056 (`valor_adotado_de_distancia` exibido; detalhe Ida/Volta), RN-076 (formato triangular: "X" na diagonal, `Cidade - Nome`, km, sem R$), RN-013 (proibição de R$). **Depende de:** TASK-026 (cálculo/dados), TASK-027 (shell da etapa Matrizes: seletor de Serviço e grade triangular reaproveitada).
**Fora de escopo:** o cálculo/reconciliação de `matriz_distancias` e a pendência "matriz desatualizada" (já são da TASK-026); toda a matriz de **seccionamento** e seus botões de sugestão/edição (TASK-027); a impressão das matrizes no PDF (TASK-034); as matrizes comparativas do Comparador (TASK-037); qualquer chamada ao OSRM ou recálculo (a matriz é lida congelada); qualquer alteração no contrato JSON.
**Critérios de aceite resumidos:** a etapa Matrizes exibe, por Serviço selecionado, a matriz de distâncias como triangular inferior somente-leitura; diagonal com "X"; cabeçalhos no padrão `Cidade - Nome da Seção`; cada célula habitada mostra `valor_adotado_de_distancia` em km; Serviço bidirecional oferece detalhe expansível com Ida e Volta; Serviço unidirecional não oferece o detalhe (só o valor único); nenhum "R$"/valor monetário no DOM; nenhuma requisição de rede disparada ao abrir/navegar a etapa.
**Testes esperados:** unitários da derivação de linhas/células a partir de `matriz_distancias` (ordem de Seções; par presente vs. célula vazia; bidirecional expõe Ida/Volta, unidirecional só o único valor); E2E (matriz read-only renderiza "X" na diagonal e km nas células; expandir célula bidirecional mostra Ida/Volta; ausência de "R$"; sem chamada de rede — sem mock de OSRM porque a etapa não deve tocá-lo).
**Perguntas em aberto:** nenhuma (Spec 04 §9.1 fecha o formato; dados e cálculo já existem — TASK-026).

---

## Fase 13 — Redesign visual (DEC-050 / Q-031 / `18-DESIGN_SYSTEM.md`)

**Regra transversal do bloco (vale como "Fora de escopo" herdado por todas as tasks 049–056):** nenhuma mudança de comportamento, validação, fluxo, mensagem da Spec 04 §14 ou contrato JSON; `data-testid` e `aria-*` existentes intocáveis (E2E passam sem alterar seletores); etapas placeholder (Revisão, Exportação) e Comparador ficam fora — nascem sob o doc 18 nas suas próprias tasks. Execução em lote autônoma autorizada (DEC-050 item f).

## TASK-049 — Fundação do design system: Tailwind CSS 4 + tokens

**Prioridade:** Alta · **Fase:** Redesign visual
**Resumo:** Instalar/configurar Tailwind CSS 4 (build, compatível com export estático), definir os tokens do doc 18 §2 via `@theme` em `src/app/globals.css` (paleta azul/cinza, semânticas, raios, sombras 1–3, transições), reset/base tipográfica e utilitário `sr-only` real (hoje referenciado em `etapa-viagens.tsx`/`identificacao.tsx` e não definido). Nenhuma tela muda de estrutura ou comportamento.
**Specs fonte / decisões:** Spec 04 §2 (princípios de UX); DEC-050 (b); doc 18 §1–§2. **Regras RN:** RN-095/096 (nada de servidor — Tailwind roda em build). **Depende de:** —
**Fora de escopo:** componentes de `shared/ui` (TASK-050); qualquer restilização de tela (TASK-051+); mudanças em `data/`, contrato ou comportamento.
**Critérios de aceite resumidos:** `npm run build` (export estático) e `npm run dev` funcionam com Tailwind ativo; tokens do doc 18 §2 disponíveis como utilitários; `sr-only` aplica visually-hidden de verdade; suíte inteira permanece verde sem alterar expectativas.
**Testes esperados:** build/typecheck/lint verdes; `npm test` e E2E inalterados (nenhum seletor tocado).

## TASK-050 — Componentes base `shared/ui` + ícones-carimbo

**Prioridade:** Alta · **Fase:** Redesign visual
**Resumo:** Criar `src/shared/ui/` com os componentes do doc 18 §3 — `Botao` (primario/secundario/perigo/fantasma), `Campo`, `Select`, `Painel` (com variante colapsável `<details>/<summary>`), `Selo`, `Tabela`, `Tooltip` (segue o cursor via `onMouseMove`, atraso ~300 ms, fade; rótulo acessível permanece no elemento) e `Carimbo` (estados repouso/hover/ativo) — e o catálogo de SVGs próprios do doc 18 §4 em `src/shared/ui/carimbos/` (ID, ônibus, mapinha, relógio, grade, lista-check, download, pasta, folha nova). Componentes repassam props nativas (inclusive `data-testid`).
**Specs fonte / decisões:** Spec 04 §4/§11 (estruturas que os componentes servirão); DEC-050 (c)(d); doc 18 §3–§4. **Regras RN:** RN-076 (componentes exibem nomenclatura/formatos oficiais quando aplicável); RN-095. **Depende de:** TASK-049.
**Fora de escopo:** montar os componentes nas telas (TASK-051+); ícones de biblioteca externa; qualquer lógica de negócio dentro de `shared/ui`.
**Critérios de aceite resumidos:** todos os componentes do doc 18 §3 existem com as variantes/estados especificados; `Tooltip` segue o mouse e respeita `prefers-reduced-motion`; `Carimbo` alterna repouso/hover/ativo; nenhum componente contém hex/px fora dos tokens; nenhum import fora de `shared/`.
**Testes esperados:** unitários por componente (renderização das variantes, repasse de props/`data-testid`, estados do `Carimbo`, atraso/fade do `Tooltip` com timers falsos).

## TASK-051 — Shell full-screen + sidebar de carimbos

**Prioridade:** Alta · **Fase:** Redesign visual
**Resumo:** Refazer a casca do formulário (`layout-formulario.tsx`, `app/layout.tsx`, `app/page.tsx`) no padrão do doc 18 §5: `100dvh`, sidebar lateral fixa com os carimbos das 7 etapas (tooltip com o nome no hover, ativo destacado — o "stepper lateral" da Spec 04 §4), cabeçalho persistente compacto (Autos/Empresa/Tipo/selo de status via `Selo`), área de conteúdo com scroll próprio e `max-width`, painel de pendências colapsável com contagem em selo e flutuante quando aberto. A navegação continua `<nav>` + `<ol>/<li>/<button>` com `aria-current="step"` e os mesmos `data-testid`.
**Specs fonte / decisões:** Spec 04 §4 (layout geral, stepper lateral, elementos persistentes), §11 (pendências: bloqueante × alerta); DEC-050 (c); doc 18 §5. **Regras RN:** RN-078 (estrutura do painel de pendências preservada); RN-076. **Depende de:** TASK-050.
**Fora de escopo:** conteúdo interno das etapas (TASK-053+); tela inicial (TASK-052); resumo operacional além do reposicionamento visual.
**Critérios de aceite resumidos:** app ocupa a viewport inteira sem scroll horizontal do body; sidebar navega livremente entre as 7 etapas; tooltip aparece no hover e acompanha o cursor; etapa ativa destacada (`aria-current` intacto); pendências continuam distinguindo bloqueante × alerta com clique navegável; E2E existentes passam sem alterar seletores.
**Testes esperados:** E2E existentes verdes; unitário/E2E leve do shell (navegação pela sidebar, tooltip, colapso do painel).

## TASK-052 — Tela inicial redesenhada (full-screen, cartões com carimbo)

**Prioridade:** Alta · **Fase:** Redesign visual
**Resumo:** Restilizar `app/page.tsx` + `tela-inicial/tela-inicial.tsx` no doc 18 §5: hero centrado (título/descrição), dois cartões de ação (`Painel` + `Carimbo` pasta/folha) — "Carregar JSON existente" destacado como recomendado (Spec 04 §3) e "Criar Autos do zero" com o diálogo de confirmação/avisos obrigatórios estilizado. Mensagens e fluxo intactos.
**Specs fonte / decisões:** Spec 04 §3 (tela inicial, avisos obrigatórios, recomendação do caminho "carregar"); DEC-050; doc 18 §5. **Regras RN:** RN-004/016/017 (comportamentos da tela preservados — não reimplementar). **Depende de:** TASK-050.
**Fora de escopo:** qualquer mudança nos fluxos de import/criação, mensagens ou validações (TASK-013 já entregue); shell do formulário (TASK-051).
**Critérios de aceite resumidos:** tela inicial full-screen com os dois cartões e carimbos; caminho "carregar" visualmente recomendado; `alertdialog` e avisos textuais idênticos aos atuais; E2E da tela inicial passam sem alterar seletores.
**Testes esperados:** E2E existentes verdes; conferência visual.

## TASK-053 — Etapa Identificação com `shared/ui`

**Prioridade:** Média · **Fase:** Redesign visual
**Resumo:** Restilizar `identificacao/identificacao.tsx` com `Campo`/`Select`/`Painel`/`Selo`/`Botao`: seleções de Autos/empresa/tipo, selo de status, aviso de reconversão (DEC-034) no padrão visual de alerta. Comportamento (encadeamento das seleções, não-editáveis, reconversão) intacto.
**Specs fonte / decisões:** Spec 04 §5; DEC-050; doc 18. **Regras RN:** RN-016/023 (comportamento preservado). **Depende de:** TASK-051.
**Fora de escopo:** demais etapas; qualquer regra de identificação.
**Critérios de aceite resumidos:** etapa usa exclusivamente componentes `shared/ui` (zero elemento cru estilizado, zero `style=`); E2E verdes sem alterar seletores.
**Testes esperados:** E2E existentes; varredura de `style=`/hex no diff.

## TASK-054 — Etapa Serviços com `shared/ui`

**Prioridade:** Média · **Fase:** Redesign visual
**Resumo:** Restilizar `servicos/servicos.tsx` (maior componente de CRUD): lista/tabela de Serviços via `Tabela`, ações (criar/editar/remover/duplicar) via `Botao`, formulários via `Campo`/`Select`, avisos no padrão semântico. Comportamento (numeração, tipificação, duplicação com UUIDs novas, cascata) intacto.
**Specs fonte / decisões:** Spec 04 §6; DEC-050; doc 18. **Regras RN:** RN-006/007/018/019..021/024 (comportamento preservado). **Depende de:** TASK-051.
**Fora de escopo:** demais etapas; qualquer regra de Serviço.
**Critérios de aceite resumidos:** idem TASK-053, para a etapa Serviços.
**Testes esperados:** unitários existentes + E2E verdes sem alterar seletores.

## TASK-055 — Etapa Seções, Locais e Itinerários + editores + integração visual do mapa

**Prioridade:** Média · **Fase:** Redesign visual
**Resumo:** Restilizar `itinerarios/etapa-itinerarios.tsx`, `secoes/editor-secoes.tsx`, `locais/editor-locais.tsx`, `descricao/painel-descricao-itinerario.tsx` e a moldura do mapa (`shared/mapa/mapa.tsx` — só apresentação): mapa em destaque com moldura/sombra do doc 18 §5, tabela lateral de paradas via `Tabela`, controles via `shared/ui`, rótulos `Cidade - Nome da Seção` (RN-076). A exceção de `style=` para dimensões dinâmicas do mapa (doc 18 §6.1) aplica-se aqui.
**Specs fonte / decisões:** Spec 04 §7 (mapa em destaque + tabela lateral, padrão de nome §7.1); DEC-050; doc 18 §5–§6. **Regras RN:** RN-076; comportamento de RN-025..036/041..052 preservado (não reimplementar). **Depende de:** TASK-051.
**Fora de escopo:** demais etapas; qualquer regra de mapa/rota/OSRM; os harnesses `*-demo` (transitórios — DEC-043).
**Critérios de aceite resumidos:** etapa e editores usam `shared/ui`; mapa emoldurado; E2E de mapa/editores verdes sem alterar seletores; zero chamada de rede nova.
**Testes esperados:** E2E existentes (editor-secoes-350m etc.) verdes; conferência visual.

## TASK-056 — Etapas Viagens e Matrizes + resumo operacional + varredura final de consistência

**Prioridade:** Média · **Fase:** Redesign visual
**Resumo:** Restilizar `viagens/etapa-viagens.tsx` (grades de horários e feriados via `Tabela`, células/inputs no padrão, offsets continuam ocultos — RN-067), `matrizes/etapa-matrizes.tsx` (triangular inferior, "X" na diagonal, km sem R$ — RN-076) e `resumo/resumo-operacional.tsx` (painel colapsável com selos, rótulo "semana padrão (sem feriados)" — RN-069). Encerrar com **varredura de consistência do bloco**: grep de `style=` (só exceções documentadas), grep de hex/px fora de tokens, elementos crus estilizados fora de `shared/ui`, `sr-only` aplicado, `scope` declarado em todo `<th>` novo, e páginas `*-demo` minimamente funcionais. A varredura recolhe também os dois itens de aparência herdados dos pareceres do bloco: (a) a marca "(sem itinerário ainda)" da etapa Serviços vive hoje dentro da coluna Direcionalidade, à qual não pertence (`servicos/servicos.tsx:350-355`; parecer da TASK-054, achado 2) — decidir entre `Selo` e coluna própria; (b) `Tabela` recebe ou não superfície `Painel`, decidido **uma vez para o bloco todo** (parecer da TASK-054, achado 3); e (c) aviso aninhado em `Painel` — se `sombra-2` sobre `sombra-2` é o pretendido (parecer da TASK-053, achado 2). São escolhas de aparência, portanto do doc 18 (DEC-050), sem Q-xxx.
**Specs fonte / decisões:** Spec 04 §8 (grade), §9 (matrizes), §10 (resumo); DEC-050; doc 18 §6. **Regras RN:** RN-067, RN-069, RN-076 (comportamento/formatos preservados). **Depende de:** TASK-053, TASK-054, TASK-055.
**Fora de escopo:** etapas Revisão/Exportação (placeholders — ficam para suas tasks); qualquer regra de horários/matrizes.
**Critérios de aceite resumidos:** etapas restiladas com `shared/ui`; nenhum offset visível; nenhum "R$" no DOM; varredura sem achados fora das exceções; suíte completa (unit + E2E + build) verde.
**Testes esperados:** suíte completa; varredura documentada no fechamento da task.

---

## TASK-057 — Contadores de viagens semanais por Serviço na etapa Serviços (Spec 04 §6)

**Prioridade:** Média · **Fase:** Formulário (comportamento — **fora** do bloco de redesign)
**Resumo:** A etapa Serviços passa a exibir, por Serviço, os contadores de viagens semanais exigidos pelo último marcador da Spec 04 §6 ("Exibir por Serviço: … contadores (viagens semanais, ver §10)") — hoje ausentes da etapa e presentes só no resumo operacional da §10. Coluna nova na `Tabela` de `servicos/servicos.tsx`, alimentada por `contarServico()` de `shared/contagens` (módulo puro já existente, RN-072), **sem reimplementar** a contagem e **sem remover** a exibição do resumo. Rótulo "semana padrão (sem feriados)" obrigatório na etapa (RN-069/NEG-018), como já ocorre no resumo.
**Specs fonte / decisões:** Spec 04 §6 (último marcador), §10 (de onde vem a contagem); DEC-051 (opção A da Q-032); DEC-035 (Serviço em construção); doc 18 §6 (a coluna nova nasce no padrão visual). **Regras RN:** RN-069 (semana padrão, sem feriados — semântica preservada), RN-072 (cálculo vive no módulo puro), RN-006 (`numero_n` só display). **Depende de:** TASK-031 (`shared/contagens` + resumo), TASK-054 (a `Tabela` da etapa). Q-032 **decidida** (DEC-051) — a task **não** nasce bloqueada.
**Fora de escopo:** alterar `shared/contagens/` (a contagem já existe e não muda — reusar, nunca reimplementar); alterar `resumo/resumo-operacional.tsx` (a §10 continua como está); as demais colunas/ações da etapa Serviços; opções de deslocamento e pares O-D (a §6 pede **viagens semanais**, só isso); qualquer regra de viagem/feriado; aparência do bloco de redesign (itens da TASK-056).
**Critérios de aceite resumidos:** cada linha de Serviço **completo** exibe as viagens semanais vindas de `contarServico()` (Ida, Volta e total — grandeza idêntica à do resumo para o mesmo documento); Serviço **em construção** (sem itinerários, DEC-035) exibe `0`, que é o que `viagensSemana(undefined)` já retorna — nenhuma regra nova; rótulo "semana padrão (sem feriados)" visível na etapa; `data-testid`/`aria-*` existentes intocados e E2E atuais verdes sem alterar seletor; coluna nova com `scope="col"`; suíte completa (unit + E2E + build) verde.
**Testes esperados:** unitários da etapa com fixture de documento multi-Serviço (contagem exibida = `contarServico()` do mesmo Serviço; feriado não altera o número — RN-069, dois JSONs que só diferem na grade de feriados); E2E da etapa cobrindo Serviço completo (contador > 0) e em construção (`0`); nenhum teste de `shared/contagens` alterado.
**Riscos:** (a) `LinhaServico` unifica Serviço completo e em construção (`servicos.tsx:52-60`), mas `contarServico()` exige um `Servico` do documento — o caminho em construção não tem entidade para contar, e é aí que mora o erro provável; (b) tentação de "aproveitar" e trazer também pares O-D/opções de deslocamento do resumo — a §6 pede só viagens semanais; (c) a `Tabela` ganha uma sexta coluna: conferir que a rolagem própria do wrapper (doc 18 §1.5) continua absorvendo a largura, sem scroll horizontal no `body`.

---

## TASK-058 — Ressalvas pendentes das revisões do bloco (TASK-053 e TASK-057)

**Prioridade:** Média · **Fase:** Cleanup pós-redesign (fecha as ressalvas ainda abertas dos pareceres)
**Resumo:** Recolhe as ressalvas que ficaram abertas nas revisões da TASK-053 e da TASK-057 e não coube a nenhuma outra task fechar (as ressalvas de aparência de TASK-053/054 já estão na varredura da TASK-056; as condições de merge da TASK-057 vieram no parecer **após** o commit e nunca foram atendidas). Itens, todos pontuais e enumerados:
1. **[TASK-057 P1 — condição de merge] Fixture com UUID fora do schema** (`testes/unitarios/formulario/servicos-contadores.test.tsx:19`): `viagemFeriado()` gera `uuid: \`${base.uuid}-feriado\``, que não passa no `uuidV4` do contrato (RN-001/RN-010) — o documento montado não sobreviveria a `esquemaDocumentoOperacao`. Trocar por um UUIDv4 literal válido.
2. **[TASK-057 P2 — condição de merge] `data-testid="rotulo-semana-padrao"` duplicado** (`src/formulario/servicos/servicos.tsx:355` e `src/formulario/resumo/resumo-operacional.tsx:34`): `testes/e2e/resumo-operacional.spec.ts:22` usa o testid **sem `.first()`**, então o dia em que as duas telas co-renderizarem esse E2E quebra por strict-mode. Renomear **só o novo** (o de `servicos.tsx`, ex.: `servicos-rotulo-semana-padrao`) e atualizar `testes/e2e/servicos.spec.ts:142`; o testid do resumo é preexistente e **intocável**.
3. **[TASK-057 P3 — follow-up] Literal `ROTULO_SEMANA_PADRAO` duplicado** (`servicos.tsx:76` e `resumo-operacional.tsx:21`): o texto exigido literalmente pela RN-069/NEG-018 vive em dois lugares — uma edição futura diverge em silêncio. Fonte única em `shared/` (ex.: `shared/contagens` ou `shared/ui`), consumida por servicos e resumo. Toca o resumo, que é arquivo da TASK-056 — daí a dependência abaixo.
4. **[TASK-057 P4 — estilo] `viagensSemana(undefined) + viagensSemana(undefined)`** (`servicos.tsx:155-159`) soma duas chamadas constantes para dizer `0` — ofuscação. Simplificar para a constante `0` (a semântica "Serviço em construção → 0", DEC-035, permanece; nenhuma regra muda). Opcional.
5. **[TASK-053 P3 — consistência] Estados de erro/carregamento da Identificação sem superfície** (`identificacao.tsx:156,164`): `erroListas` e `!listas` renderizam `<p>` solto enquanto o estado carregado é `Painel` — a etapa "muda de moldura". Envolver em `Painel` (escolha de aparência, DEC-050). O `data-testid="erro-listas-identificacao"` é intocável.
6. **[Derivado — DEC-051/DEC-052] Atualizar `docs-dev/01-RULE_INDEX.md`:** na Origem da RN-069 (`:510`), acrescentar **Spec 04 §6** (a DEC-051 antecipou este ajuste de derivado). *(A Spec 04 §5 → "Tipo do Autos" da DEC-052 é edição de `docs/specs/**`, read-only — **não** entra aqui; é ação do dono da spec.)*
**Specs fonte / decisões:** revisões `docs-dev/14-REVISOES/TASK-053-20260715.md` e `TASK-057-20260715.md`; DEC-050 (aparência), DEC-051 (Origem da RN-069), DEC-052 (rótulo "Tipo do Autos" **permanece** — item 6 do "Fora de escopo"); doc 18 §6. **Regras RN:** RN-069/NEG-018 (literal exato preservado), RN-001/RN-010 (UUIDv4 válido), RN-072/RN-006 (contagem intacta — nada de lógica muda). **Depende de:** TASK-056 (o item 3 unifica o literal tocando `resumo-operacional.tsx`, arquivo da TASK-056 — rodar depois evita conflito) e TASK-057 (fecha o parecer dela).
**Fora de escopo:** **reverter o rótulo "Tipo do Autos" da Identificação** (DEC-052 — permanece; não tocar); alterar `src/shared/contagens/` ou qualquer lógica/regra de contagem, viagem ou feriado; editar `docs/specs/**` (o alinhamento da Spec 04 §5 e o restante são ações do dono da spec); as ressalvas de aparência já roteadas para a varredura da TASK-056 (marca "(sem itinerário ainda)", superfície da `Tabela`, aviso aninhado); a ressalva de layout da TASK-055 (tabela lateral / mapa único — tem task própria); qualquer mudança de comportamento, mensagem ou contrato JSON.
**Critérios de aceite resumidos:** (1) fixture usa UUIDv4 válido e o documento montado passaria em `esquemaDocumentoOperacao`; (2) `grep` do testid do rótulo no lado servicos retorna nome único, distinto do resumo, e `resumo-operacional.spec.ts` volta a ser seguro sem `.first()`; (3) o literal "semana padrão (sem feriados)" tem **uma** declaração em `shared/`, consumida por servicos e resumo (`grep` acha uma só); (4) estados de erro/carregamento da Identificação em `Painel`, consistentes com o carregado, `data-testid` intocado; (5) Origem da RN-069 no RULE_INDEX cita Spec 04 §6; (6) rótulo "Tipo do Autos" **inalterado**; `data-testid`/`aria-*` existentes preservados exceto a renomeação deliberada do item 2; suíte completa (unit + E2E + build) verde, nenhum outro seletor alterado.
**Testes esperados:** unitários e E2E existentes verdes; ajuste do único E2E que referencia o testid renomeado (item 2); nenhum teste de `shared/contagens` alterado; nenhum teste novo de regra (não há regra nova).
**Riscos:** (a) renomear testid e esquecer um consumidor — `grep` do nome antigo antes/depois; (b) o item 3 toca `resumo-operacional.tsx` (TASK-056) — respeitar a dependência para não conflitar com a restilização; (c) mover os estados de erro para `Painel` sem alterar `data-testid="erro-listas-identificacao"`.

---

## TASK-059 — Desenhar a rota ativa no mapa da etapa de itinerários

## Objetivo

Ao final, a rota roteirizada ativa de um itinerário (a `Rota.geometria`, GeoJSON LineString) aparece **desenhada** no mapa da etapa "Seções, Locais e Itinerários". Hoje não aparece: os editores passam apenas `marcadores` ao `<Mapa>`, nunca a linha da rota — a rota calculada existe no estado ao vivo mas nunca chega à tela.

## Contexto

`EditorSecoes` e `EditorLocais` renderizam um `<Mapa>` passando só `marcadores` ([`editor-secoes.tsx:184`](../../src/formulario/secoes/editor-secoes.tsx#L184), [`editor-locais.tsx:168`](../../src/formulario/locais/editor-locais.tsx#L168)). O `<Mapa>` já sabe desenhar `linhas: LinhaMapa[]` (LineString) — demonstrado em [`src/app/mapa-demo/page.tsx:24`](../../src/app/mapa-demo/page.tsx#L24). A geometria da rota ativa está em `estadoAtual.rota.geometria` do `EstadoRotaViva` (TASK-024; `situacao` `congelada`/`recalculada`), disponível na etapa. A Spec 04 §7.3 diz que, a cada parada, "a rota é recalculada **e desenhada**". Defeito descoberto na revisão da TASK-055. Task pequena e de baixo risco; o conversor `geometria → LinhaMapa` que ela cria é reaproveitado pela TASK-060.

## Fora de escopo

- Unificar os dois mapas num só (é a TASK-060) — aqui a rota é passada aos dois editores como estão hoje.
- Sincronização seleção tabela↔mapa; layout lateral da tabela (TASK-060).
- Renderizar os **pontos de rota** como vértices próprios sobre a linha (Spec 04 §7.3 "vértice pequeno sobre a linha") — só a LineString da rota entra aqui; vértices de ponto de rota ficam para a TASK-060 se não forem triviais.
- Promoção do `ServicoEmConstrucao` no fluxo "novo" (task própria — Defect B).
- Qualquer chamada nova ao OSRM: abrir JSON **não** recalcula (RN-052), só desenha a rota congelada.

## Specs fonte

- Spec 04 §7.3
- Spec 02 §10.2 (Rota; `geometria` GeoJSON LineString, coords `[longitude, latitude]`)

## Regras envolvidas

- RN-046 (descrição/rota derivada, congelada, recalculada com a rota)
- RN-052 (abrir JSON não chama OSRM; a rota congelada é desenhada sem recalcular)
- RN-015 (dados congelados não são recalculados por leitores)
- RN-042 (ponto de rota sem identidade — não confundir a LineString com marcadores/paradas)

## Entidades afetadas

- Rota, Itinerário, Parada (só leitura da geometria)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Com `estadoAtual` em `congelada` ou `recalculada`, o `<Mapa>` da etapa recebe `linhas` com a geometria da rota ativa e a linha é desenhada.
- [ ] Abrir um JSON existente desenha a rota **congelada** sem disparar o OSRM (RN-052).
- [ ] Em `sem-rota`, nenhuma linha é desenhada; a mensagem de falha existente (`data-testid="mensagem-sem-rota"`) permanece.
- [ ] Conversão `geometria.coordinates` (`[lon,lat]`) → `LinhaMapa` correta (ordem das coordenadas preservada).
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- Itinerário aberto de JSON com rota congelada → linha aparece no mapa sem chamada de rede.
- Reordenar parada → recálculo com sucesso → a linha atualiza para a nova geometria.

## Casos inválidos

- Estado `sem-rota` (falha OSRM mockada) → nenhuma linha; pendência/mensagem existente intacta.
- Abrir JSON → asserção de que o OSRM **não** foi chamado (mock sem chamadas).

## Testes esperados

- Unitários: conversor `geometria → LinhaMapa` (coords, vazio, ida/volta).
- Integração: `EditorSecoes`/`EditorLocais` repassam `linhas` ao `<Mapa>` quando recebem uma rota; não repassam quando não há rota.
- E2E: os specs de itinerários/editores seguem verdes sem alterar seletores (mock do OSRM).
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/secoes/editor-secoes.tsx`, `src/formulario/locais/editor-locais.tsx` (aceitar a rota e repassá-la a `linhas`)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (passar `estadoAtual.rota.geometria` aos editores)
- Conversor `geometria → LinhaMapa` (novo helper em `src/shared/mapa/` ou `src/formulario/roteamento/`)

## Riscos

- Enquanto os mapas são dois, a rota é passada aos dois (redundante) — consolidado na TASK-060; aceitável como interino.
- Não disparar recálculo ao desenhar (RN-052/RN-015): a linha vem do estado já congelado, nunca de uma nova chamada.

## Perguntas em aberto

- Nenhuma.

---

## TASK-060 — Unificar os dois mapas da etapa de itinerários num único mapa interativo + tabela lateral

## Objetivo

A etapa "Seções, Locais e Itinerários" passa a ter **um único mapa interativo** (Spec 04 §7) no lugar dos dois mapas separados de `EditorSecoes` e `EditorLocais`, com a **tabela lateral de paradas na mesma linha visual** do mapa (doc 18 §87) como consequência do layout. Seções, Locais e pontos de rota são lançados no mesmo mapa.

## Contexto

Hoje `EditorSecoes` e `EditorLocais` renderizam **cada um seu próprio `<Mapa>`** (dois mapas empilhados verticalmente), divergindo da Spec 04 §7 — "O cadastro de Seções, Locais, pontos de rota e a montagem do itinerário … acontecem **num mesmo mapa interativo**". A divergência entrou pelo fatiamento fino TASK-017 (motor+`EditorSecoes`) / TASK-018 (motor+`EditorLocais`) / TASK-019 (montou os dois), passou sem flag na revisão da TASK-019 e foi identificada na revisão da TASK-055 (`docs-dev/14-REVISOES/TASK-055-20260715.md`). A rota já é desenhada pela TASK-059. Padrão visual: DEC-050 / doc 18 §87 (mapa em destaque + tabela lateral). Substitui a ressalva 1 da TASK-055, retirada da TASK-058.

## Fora de escopo

- **Sincronização seleção tabela↔mapa** (clicar na parada destaca no mapa e vice-versa — Spec 04 §7): avaliar na `/analisar-task`; se for grande, vira task própria e fica fora daqui.
- Promoção do `ServicoEmConstrucao` no fluxo "novo" (Defect B — task separada).
- Qualquer regra de OSRM, 350 m, reuso, montagem de parada, descrição — **comportamento preservado**; a task só reorganiza a superfície de UI (RN-025..036, RN-041..052 inalteradas).
- Alterar `data-testid`/`aria-*` existentes (E2E devem passar sem trocar seletores; testids **novos** só para o seletor de ferramenta, se houver).

## Specs fonte

- Spec 04 §7 (mapa único + tabela lateral), §7.1 (inserção/reuso de Seção), §7.2 (Locais), §7.3 (itinerário e mapa)
- doc 18 §87 (mapa em destaque, moldura, tabela lateral na mesma linha visual)

## Regras envolvidas

- RN-025..036 (Seção/Local/parada — preservadas)
- RN-041..052 (rota/ponto de rota/OSRM — preservadas)
- RN-076 (rótulo `Cidade - Nome da Seção` na tabela — preservado)

## Entidades afetadas

- Seção, Local, Parada, ponto de rota, Rota (reorganização de UI; sem mudança de modelo)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] A etapa renderiza **um** `<Mapa>` (não dois); marcadores de Seção e de Local coexistem nele.
- [ ] O clique no mapa permite escolher o que se cria (Seção / Local / ponto de rota) — afordância de ferramenta/modo conforme doc 18 (design a definir na `/analisar-task`).
- [ ] Todos os fluxos preservados: criação de Seção/Local, reuso de Seção, arrasto sob 350 m (recusa → mensagem Spec 04 §14), exclusão de sentido de Local, montagem/reordenação de paradas, recálculo ao vivo.
- [ ] Tabela de paradas **lateral** ao mapa em tela larga (empilha no estreito), via componente `Tabela`.
- [ ] Rota desenhada (TASK-059) aparece no mapa único; zero chamada de rede nova.
- [ ] E2E existentes (`editor-secoes-350m`, `editor-locais-350m`, `etapa-itinerarios`, `descricao-itinerario`) verdes **sem alterar seletores**.

## Casos válidos

- Criar Seção e depois Local no mesmo mapa, alternando a ferramenta → ambos os marcadores e a rota aparecem; paradas entram na tabela lateral.
- Reordenar/remover parada pela tabela lateral → recálculo, como hoje.

## Casos inválidos

- Arrasto além de 350 m (Seção ou Local) → recusa com a mensagem da Spec 04 §14, agora no mapa único (comportamento idêntico ao atual).
- Montagem inválida (< 2 paradas, extremo não-Seção) → avisos existentes (RN-034/035) inalterados.

## Testes esperados

- Unitários: nenhum novo de regra (comportamento não muda); ajustes se helpers de marcador forem consolidados.
- Integração: o novo componente de mapa único monta marcadores de Seção+Local e repassa `aoClicar` conforme a ferramenta ativa.
- E2E: adaptar os specs dos editores ao mapa único **preservando os `data-testid`**; cobrir a troca de ferramenta se receber testid novo.
- Snapshot/contrato JSON: N/A.
- PDF: N/A.

## Arquivos prováveis

- Novo `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (mapa único que absorve `EditorSecoes` + `EditorLocais`)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (layout de duas colunas tabela | mapa; usa o novo componente)
- `src/formulario/secoes/editor-secoes.tsx`, `src/formulario/locais/editor-locais.tsx` (aposentados/absorvidos ou reduzidos a lógica sem `<Mapa>` próprio)

## Riscos

- **Refator grande e de alto risco** na parte mais complexa do app (roteamento ao vivo, 350 m pareado, reuso de Seção, montagem de paradas de dois tipos num só mapa). A `/analisar-task` deve avaliar quebrar em subtasks (ex.: consolidar marcadores; unificar clique/ferramenta; layout lateral) se o plano passar de ~10 passos.
- O seletor de ferramenta (Seção/Local/ponto de rota no mesmo clique) é decisão de **UX sob DEC-050/doc 18** — a Spec 04 §7 diz que os três são lançados no mesmo mapa, mas não detalha a interface. Resolver na análise; se o dono do domínio quiser **fixar** a interação, abrir Q-xxx antes de implementar.
- Não alterar `data-testid` existentes — os E2E dos editores dependem deles.

## Dependências

- TASK-059 (rota desenhada — o mapa único herda o desenho da rota).
- TASK-055 (etapa/editores já no design system).

## Perguntas em aberto

- **Design de interação — decidido (DEC-054 / Q-035, 2026-07-16):** no mapa único, **clique esquerdo cria Seção, clique direito cria Local**; marcadores circulares diferenciados por tipo; tabela lateral à direita. O **gesto de ponto de rota** (motor pronto na TASK-023) e a **sincronização seleção tabela↔mapa** ficam **fora desta task** → **TASK-063** e **TASK-064**, respectivamente.

---

## TASK-061 — Promover `ServicoEmConstrucao` a `Servico` completo ao concluir o itinerário no fluxo "novo"

## Objetivo

No fluxo **"novo"** (documento criado do zero), ao concluir a edição do itinerário de um Serviço, o `ServicoEmConstrucao` correspondente passa a ser **promovido a `Servico` completo** — com `itinerarios[]` (paradas + rota + `matriz_distancias`) e `viagens` a preencher depois — e passa a viver na lista de Serviços do documento. Ao final, o fluxo criar-do-zero deixa de travar após os itinerários: as etapas Viagens e Matrizes voltam a enxergar o Serviço.

## Contexto

Hoje, no modo "novo", um Serviço recém-criado vive em `servicosEmConstrucao` (`ServicoEmConstrucao`, DEC-035), que não tem `itinerarios` ([`sessao.ts:41-53`](../../src/formulario/sessao.ts#L41-L53)). O itinerário montado na etapa de mapa fica só em estado efêmero (`paradasEmEdicao`/`estadosRotaViva`); a função que grava itinerário+matriz num Serviço (`documentoComItinerarioAtualizado`) exige um `DocumentoOperacao` e só roda no modo "carregado" ([`etapa-itinerarios.tsx:251-270`](../../src/formulario/itinerarios/etapa-itinerarios.tsx#L251-L270)). Viagens ([`etapa-viagens.tsx:80`](../../src/formulario/viagens/etapa-viagens.tsx#L80)) e Matrizes ([`etapa-matrizes.tsx:60`](../../src/formulario/matrizes/etapa-matrizes.tsx#L60)) leem serviços só no modo "carregado" e recebem `[]` no "novo". Resultado: o Serviço nunca vira `Servico` completo e as etapas seguintes ficam vazias. A DEC-035 já previa a promoção ("promovido a `Servico` completo quando as etapas seguintes preencherem o resto"); a **DEC-053 (opção A da Q-034)** fixou que o ponto de promoção é a conclusão do itinerário, concentrando o modo dual num único lugar. Descoberto em teste manual do usuário (2026-07-16), a partir da revisão da TASK-055.

## Fora de escopo

- O **E2E** do fluxo criar-do-zero ponta a ponta — é a **TASK-062** (esta task entrega os testes unitários/integração da promoção; o E2E completo é separado).
- Desenho da rota no mapa (TASK-059) e unificação dos mapas (TASK-060) — independentes.
- Qualquer mudança no **contrato JSON** (schema) ou em `shared/contrato`: a promoção é transição de estado de sessão efêmero, não persistência (RN-096/NEG-004).
- Reimplementar contagens/matriz: reutiliza `matrizDistanciasDoServico`/`shared/contagens` como estão.
- Alterar o CRUD da etapa Serviços ou a criação de itinerários por direcionalidade (DEC-036) — já existem.

## Specs fonte

- Spec 04 §6 (criar Serviço)
- Spec 04 §7 (montagem do itinerário)
- Spec 04 §8 ("Após criar/alterar o itinerário … a etapa seguinte é a grade de horários")
- Spec 02 §6 (`Servico`: `itinerarios` ≥ 1, `matriz_distancias`)

## Regras envolvidas

- RN-001/002/004 (UUIDs preservadas na promoção — a `uuid` do `ServicoEmConstrucao` é herdada pelo `Servico`)
- RN-018 (documento válido exige ≥ 1 Serviço)
- RN-054..057 (matriz reconciliada ao concluir a edição do itinerário)
- RN-096 / NEG-004 (nada gravado no JSON antes da exportação; sessão é efêmera)

## Entidades afetadas

- Serviço, Itinerário, Parada, Rota, matriz de distâncias (promoção `ServicoEmConstrucao → Servico`)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] No modo "novo", concluir a edição do itinerário de um `ServicoEmConstrucao` o promove a `Servico` completo (com `itinerarios[]` contendo paradas+rota e `matriz_distancias` reconciliada), removido de `servicosEmConstrucao`.
- [ ] A `uuid` do `ServicoEmConstrucao` é preservada no `Servico` promovido (RN-001/002/004).
- [ ] Após a promoção, as etapas Viagens e Matrizes enxergam o Serviço (não mais `[]`) no modo "novo".
- [ ] A matriz do Serviço promovido é reconciliada no mesmo commit da rota (RN-054..057), como já ocorre no modo "carregado".
- [ ] Nada é gravado no JSON antes da exportação; a promoção só altera estado de sessão (RN-096/NEG-004).
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- Modo "novo": Serviço criado (direcionalidade "ida") → itinerário montado → ao concluir, vira `Servico` com 1 itinerário, matriz reconciliada; Viagens/Matrizes passam a listá-lo.
- Direcionalidade "ambos": os dois sentidos concluídos resultam em `Servico` com 2 itinerários.

## Casos inválidos

- Itinerário sem rota válida (OSRM mockado em `sem-rota`): a promoção **não** ocorre com rota inválida; o Serviço permanece em construção e a pendência ao vivo existente é mantida (RN-048) — sem gravar Serviço incompleto.
- Concluir sem paradas suficientes: a promoção não produz um `Servico` que viole o schema (`itinerarios` min(1)).

## Testes esperados

- Unitários: função de promoção `ServicoEmConstrucao (+ itinerário/rota/matriz) → Servico` (uuid preservada; matriz reconciliada; ida / ambos; caso sem-rota não promove).
- Integração: após concluir itinerário no modo "novo", `servicosDaSessao`/leitura de Viagens e Matrizes retorna o Serviço; assert de que o OSRM foi chamado só o esperado (mock).
- E2E: N/A nesta task (é a TASK-062); specs existentes seguem verdes.
- Snapshot/contrato JSON: N/A (não toca contrato); pode-se validar que o `Servico` promovido passa no schema `zod` strict.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/sessao.ts` (modelo de sessão do modo "novo" — hoje sem `documento`; acomodar os `Servico` completos promovidos; possível helper `servicosDaSessao` unificado)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (gatilho de promoção ao concluir o itinerário; hoje `documentoComItinerarioAtualizado` só roda no "carregado")
- `src/formulario/viagens/etapa-viagens.tsx`, `src/formulario/matrizes/etapa-matrizes.tsx` (ler Serviços pelo caminho unificado)

## Riscos

- **Modelo de sessão:** o modo "novo" hoje não carrega `DocumentoOperacao`; decidir na `/analisar-task` onde o `Servico` promovido passa a viver (novo campo de sessão vs. montar documento parcial). Se implicar mudança do modelo além do previsto na DEC-053, vira **DEC própria** antes de codar.
- Regressão no modo "carregado": a promoção não pode alterar o caminho já existente do documento carregado.
- Preservação de UUID (RN-004) é a regra crítica nº 1 — round-trip provado por teste.

## Perguntas em aberto

- Nenhuma bloqueante. Decidido por **DEC-053** (opção A da Q-034). O gatilho/forma da promoção e o lar do `Servico` no modo "novo" fecham na `/analisar-task`; se mexerem no modelo de sessão além do previsto, viram DEC própria.

---

## TASK-062 — E2E do fluxo "criar do zero" ponta a ponta (Identificação → Exportação)

## Objetivo

Ao final existe um teste **E2E (Playwright)** que exercita o fluxo **"novo"** completo — Identificação → Serviços → Seções/Locais → Itinerários → Viagens → Matrizes → Resumo → Exportação —, com o OSRM mockado, cobrindo a lacuna que deixou a trava da Q-034 passar despercebida (nenhum E2E cobre criar-do-zero; só o fluxo de JSON aberto).

## Contexto

A Q-034 registrou que "nenhum E2E exercita o fluxo 'novo' de Serviços → Itinerários → Viagens (só o fluxo de JSON aberto é coberto)" — foi por isso que a trava só apareceu em teste manual. Depois da **TASK-061** (promoção `ServicoEmConstrucao → Servico`), o fluxo passa a funcionar ponta a ponta; falta a rede de segurança que impeça a regressão. Testes **nunca** dependem do OSRM real — mock sempre (stack fixada, DEC-029).

## Fora de escopo

- Implementar/alterar a promoção — é a **TASK-061** (esta task só testa o fluxo já corrigido; depende dela).
- Cobrir o Comparador ou o fluxo de importação de JSON (já coberto por E2E existentes).
- Testar variações exaustivas de PDF/exportação além de disparar a exportação e validar o JSON resultante.

## Specs fonte

- Spec 04 §5 (Identificação), §6 (Serviços), §7 (itinerário), §8 (grade de horários), §9 (matrizes), §10 (resumo), §12 (exportação)
- Spec 02 §6 (`Servico` completo no JSON exportado)

## Regras envolvidas

- RN-018 (documento exportado tem ≥ 1 Serviço completo)
- RN-004 (UUIDs preservadas — round-trip: reimportar o JSON exportado mantém as UUIDs)
- RN-096 (exportar JSON é o "salvar")

## Entidades afetadas

- Documento de operação inteiro (Autos, Serviço, Seção, Local, Itinerário, Viagem, matriz) — via UI, ponta a ponta

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Um E2E cria um documento do zero pela UI (identidade → 1 Serviço → itinerário com paradas → horários → matriz) com o OSRM mockado.
- [ ] Após concluir o itinerário, as etapas Viagens e Matrizes exibem o Serviço (regressão-guarda da TASK-061).
- [ ] A exportação produz um JSON que **passa no schema** `zod` strict (Serviço completo, RN-018).
- [ ] Round-trip: reimportar o JSON exportado preserva as UUIDs geradas (RN-004).
- [ ] O teste não faz nenhuma chamada de rede real ao OSRM (mock verificado).

## Casos válidos

- Fluxo "novo" com 1 Serviço, direcionalidade "ida", itinerário de 2+ paradas, ao menos 1 Viagem → exporta JSON válido.

## Casos inválidos

- (guarda opcional) Tentar exportar antes de completar ≥ 1 Serviço → a UI bloqueia/sinaliza pendência (RN-018), sem gerar JSON inválido.

## Testes esperados

- Unitários: N/A (é uma task de E2E).
- Integração: N/A.
- E2E: o novo spec Playwright do fluxo criar-do-zero, com OSRM mockado; asserções de Viagens/Matrizes populadas e de JSON exportado válido + round-trip de UUID.
- Snapshot/contrato JSON: validação do JSON exportado contra o schema.
- PDF: N/A.

## Arquivos prováveis

- `e2e/` (novo spec, ex.: `e2e/fluxo-novo.spec.ts`) + helper de mock do OSRM já existente
- Possíveis `data-testid` adicionais **apenas** se o fluxo não for selecionável hoje (mínimos; sem alterar os existentes)

## Riscos

- Depende da TASK-061: sem a promoção, o E2E falha por design (Viagens/Matrizes vazias) — sequenciar depois dela.
- Flakiness de E2E: garantir mock determinístico do OSRM (sem rede real — DEC-029).

## Perguntas em aberto

- Nenhuma.

---

## TASK-063 — Gesto de ponto de rota no mapa único (forçar traçado pela interface)

## Objetivo

O usuário passa a **criar e mover pontos de rota diretamente no mapa** da etapa de itinerários: clicar sobre a **linha da rota** calculada cria um **vértice pequeno arrastável** (Spec 03 §3.6 / Spec 04 §7.3); soltar recalcula a rota reaplicando os pontos. Fecha a única parte do "mapa único" (DEC-054) que a TASK-060 deixou de fora, ligando o **motor já pronto da TASK-023** à interface.

## Contexto

A TASK-023 entregou **só a camada de cálculo/dados** de pontos de rota — `intercalar-pontos-de-rota.ts`, `&waypoints=` na URL, extração nos dois caminhos e persistência em `rota.pontos_de_rota` — e **deliberadamente deixou de fora a interação de mapa** (ver `docs-dev/14-REVISOES/TASK-023-20260713.md`: "a interação de mapa (clique/arraste para criar o vértice — Spec 04) … foram deliberadamente deixados de fora"). A etapa hoje apenas **reaplica** pontos persistidos no recálculo ([`etapa-itinerarios.tsx`](../../src/formulario/itinerarios/etapa-itinerarios.tsx)), sem UI para criá-los. A TASK-060 unificou os mapas e fixou o gesto de Seção/Local (DEC-054), mas o modo "ponto de rota" ficou dependente desta task. O mapa único e o desenho da rota (TASK-059) já existem.

## Fora de escopo

- Qualquer mudança no **contrato JSON**/schema — `pontos_de_rota` já existe (Spec 02 §10.3/§10.4); esta task só o alimenta pela UI.
- Reescrever o motor de intercalação/roteamento (TASK-023 — reusar como está).
- Seção/Local/reuso/350 m — inalterados (TASK-060).
- Sincronização seleção tabela↔mapa (TASK-064).

## Specs fonte

- Spec 03 §3.6 (pontos de rota: clique na linha cria vértice; ordem `apos_parada_ordem`; §3.6.1 exemplo literal)
- Spec 04 §7.3 (ponto de rota "visual distinto — vértice pequeno sobre a linha, sem rótulo, sem entrada na tabela de paradas; aparece em sub-lista própria"; recalcular ao soltar)

## Regras envolvidas

- RN-042 (ponto de rota: propósito único, sem identidade), RN-043 (forçar traçado altera distâncias), RN-051 (mapeamento legs→trechos com pontos de rota) — motor pronto (TASK-023)
- RN-046/RN-052 (rota congelada/recalculada ao editar)
- RN-041 (invariante de trechos)

## Entidades afetadas

- ponto de rota, Rota (a UI cria/move; o modelo não muda)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Clicar sobre a linha da rota cria um ponto de rota (vértice pequeno, sem rótulo — Spec 04 §7.3), visualmente distinto de Seção/Local.
- [ ] Arrastar o vértice e soltar recalcula a rota (RN-052), reaplicando os pontos via o motor da TASK-023.
- [ ] O ponto de rota **não** entra na tabela de paradas; aparece em **sub-lista própria** (Spec 04 §7.3).
- [ ] Remover um ponto de rota recalcula a rota.
- [ ] Invariante `trechos = paradas − 1` preservado (RN-041); zero campo novo no JSON.

## Casos válidos

- Rota com 2 Seções → clicar na linha entre elas cria 1 ponto de rota; a geometria/trechos refletem o desvio (RN-043); a sub-lista mostra o ponto.

## Casos inválidos

- Clique fora da linha da rota → não cria ponto de rota (só o gesto de Seção/Local do mapa vale, DEC-054).
- Falha do OSRM ao recalcular → mensagem da Spec 03 §3.5 (§14), sem apagar a última rota válida (RN-048).

## Testes esperados

- Unitários: nenhum novo de motor (reusa TASK-023); helper de "clique-na-linha → `apos_parada_ordem`" se criado.
- Integração: criar/mover/remover ponto de rota dispara recálculo com o motor real (OSRM mockado); sub-lista renderizada; ausência na tabela de paradas.
- E2E: criar um ponto de rota no mapa único e ver a rota recalcular (OSRM/tiles mockados).
- Snapshot/contrato JSON: `pontos_de_rota` bem-formado (sem `uuid`, `apos_parada_ordem ∈ [1, paradas−1]`).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (gesto de clique-na-linha + vértices arrastáveis + sub-lista)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (fio do recálculo com pontos de rota vindos do gesto — hoje só reaplica os persistidos)
- Possível helper em `src/formulario/roteamento/` ou `src/shared/mapa/` para detectar o clique sobre a linha.

## Riscos

- Detecção geométrica de "clique sobre a linha" e o índice `apos_parada_ordem` correto (a que par de paradas o ponto pertence) — ponto de atenção principal.
- Interação com o gesto de Seção/Local do mapa (DEC-054): distinguir clique-na-linha de clique-no-mapa-vazio.

## Perguntas em aberto

- Nenhuma (motor decidido na TASK-023; gesto habilitado por DEC-054).

---

## TASK-064 — Sincronização de seleção entre a tabela lateral e o mapa (etapa de itinerários)

## Objetivo

Selecionar uma parada na **tabela lateral destaca o marcador no mapa**, e selecionar um marcador no mapa **destaca a linha na tabela** — a sincronização bidirecional que a Spec 04 §7 pede ("selecionar na tabela destaca no mapa e vice-versa"), deixada fora da TASK-060 por ser substancial.

## Contexto

A TASK-060 unificou os mapas e pôs a tabela lateral ao lado (DEC-054 / doc 18 §87), mas **sem** o vínculo de seleção — o critério de aceite da TASK-060 pedia só a tabela lateral, não a sincronização, e a própria task marcou o sync como "avaliar; se for grande, vira task própria". A `/analisar-task` da TASK-060 confirmou que é grande (estado de seleção bidirecional + realce de marcador) e deferiu para cá (DEC-054).

## Fora de escopo

- Qualquer regra de OSRM/350 m/montagem/descrição — comportamento preservado; a task só adiciona realce/seleção de UI.
- Contrato JSON/schema — seleção é estado de UI efêmero, nunca persistido (RN-096).
- Criação/edição de paradas ou pontos de rota (TASK-060/063).

## Specs fonte

- Spec 04 §7 ("tabela lateral … sincronizada com o mapa (selecionar na tabela destaca no mapa e vice-versa)")
- doc 18 §87 (mapa em destaque + tabela lateral)

## Regras envolvidas

- RN-076 (rótulo `Cidade - Nome da Seção` na tabela — preservado)
- RN-025..036 (Seção/Local/parada — só realce, sem mudança de modelo)

## Entidades afetadas

- Seção, Local, Parada (realce de UI; sem mudança de modelo)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Clicar numa linha da tabela lateral destaca o marcador correspondente no mapa (cor/realce/`aria-current`).
- [ ] Clicar num marcador no mapa destaca a linha correspondente na tabela.
- [ ] A seleção é estado de UI efêmero — não altera o JSON nem dispara recálculo.
- [ ] E2E existentes verdes sem alterar seletores; testids novos só para o realce/seleção, se houver.

## Casos válidos

- Tabela com 3 paradas → clicar na 2ª realça o 2º marcador; clicar no 1º marcador realça a 1ª linha.

## Casos inválidos

- Selecionar uma parada cujo marcador não existe no sentido atual (ex.: Local unidirecional) → sem realce no mapa, sem erro.

## Testes esperados

- Unitários: nenhum novo de regra.
- Integração: seleção na tabela propaga ao mapa e vice-versa; nenhuma chamada de OSRM disparada pela seleção.
- E2E: selecionar na tabela e ver o marcador destacado (tiles mockados).
- Snapshot/contrato JSON: N/A (nada persistido).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` e `etapa-itinerarios.tsx` (estado de seleção compartilhado tabela↔mapa)
- Possível prop de realce em `src/shared/mapa/mapa.tsx` (marcador destacado)

## Riscos

- Estado de seleção bidirecional sem loops de atualização; realce de marcador na primitiva do mapa.
- Não regredir os E2E da TASK-060 (seletores preservados).

## Perguntas em aberto

- Nenhuma (habilitada por DEC-054).

---

## TASK-065 — Inverter os gestos do mapa único: esquerdo cria ponto de rota, direito abre menu Seção/Local

## Objetivo

O mapa único da etapa de itinerários passa a ter **um significado por botão** (DEC-055): clique **esquerdo sobre a linha da rota** cria ponto de rota; clique esquerdo **fora** da linha não cria nada (o mapa faz pan); clique **direito** abre um **menu flutuante** no ponto clicado com a escolha entre **Seção** e **Local**, que segue para o formulário de criação já existente.

## Contexto

A DEC-054 atribuiu Seção ao botão esquerdo quando o gesto de ponto de rota ainda estava deferido, e por isso não previu a colisão: a **linha da rota corre sobre as vias**, então uma Seção intermediária cai quase sempre em cima da linha, onde a Spec 04 §7.3 item 6 manda criar ponto de rota. A DEC-055 (Q-036) resolveu dando a cada botão um significado só. A TASK-063 entrega antes o **ancorador geométrico** e a detecção de clique sobre a linha em `shared/mapa`; esta task consome os dois e inverte o roteamento dos gestos. O `EditorMapaItinerario` (TASK-060) e os motores de Seção/Local/350 m são reusados intactos.

## Fora de escopo

- **Inserção posicional** da parada (clique direito sobre a linha inserindo entre as paradas do trecho) — é a TASK-067; aqui o clique direito **sempre acrescenta ao fim**, como hoje, independentemente de acertar a linha.
- Re-ancoragem de pontos de rota quando as paradas mudam — TASK-066 (Q-037).
- O gesto de ponto de rota em si (criar/mover/remover, sub-lista) — TASK-063, já entregue quando esta começar.
- Regra dos 350 m, reuso de Seção, derivação de município — inalterados (TASK-060).
- Sincronização seleção tabela↔mapa — TASK-064.
- Qualquer mudança no contrato JSON.

## Specs fonte

- Spec 04 §7 (mapa único; "o usuário lança Seções, Locais e pontos de rota enquanto desenha a rota")
- Spec 04 §7.1/§7.2 (criação de Seção e de Local — formulário e derivação de município, inalterados)
- Spec 04 §7.3 item 6 (clique sobre a linha da rota cria vértice arrastável)
- Spec 03 §3.6 (ponto de rota ancorado entre duas paradas consecutivas)
- `docs-dev/18-DESIGN_SYSTEM.md` §5 (flutuante efêmero usa `sombra-3`; nunca sobrepor interativo de forma bloqueante) e §6 (componentes vêm de `shared/ui`; `data-testid`/`aria-*` existentes intocáveis) — vinculante por DEC-050

## Regras envolvidas

- RN-042 (ponto de rota sem identidade; o gesto do esquerdo só o cria sobre a linha)
- RN-052 (editar recalcula no "soltar" de cada gesto)
- RN-097 (`shared/` é reusável por Formulário e Comparador — a extensão do `<Mapa>` e o menu novo nascem aditivos, sem acoplar o Comparador)
- RN-025/RN-031 (Seção pertence ao Autos, Local ao Serviço — a escolha do menu decide qual entidade nasce; nenhuma conversão implícita entre elas, NEG-012)

## Entidades afetadas

- Seção, Local, ponto de rota (só o gesto de criação muda; os modelos não)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Clique esquerdo **sobre a linha** da rota cria ponto de rota (comportamento da TASK-063, agora sem concorrer com a criação de Seção).
- [ ] Clique esquerdo **fora** da linha **não cria nada** e não abre formulário nenhum; o mapa continua panning normalmente.
- [ ] Clique direito (sobre a linha ou fora) abre um **menu flutuante no ponto clicado** com exatamente duas opções: Seção e Local.
- [ ] Escolhida a opção, abre o formulário de criação já existente do tipo correspondente, com o ponto clicado como geolocalização — motores de 350 m/município inalterados.
- [ ] O menu fecha ao escolher, ao cancelar e ao clicar fora; é acessível por teclado (foco, `Esc` fecha) e não bloqueia o mapa (doc 18 §5).
- [ ] Os `data-testid` existentes (`form-criar-secao`, `form-criar-local`, `nome-secao-input`, `nome-local-input`, `confirmar-criar-secao`, `confirmar-criar-local`, `tabela-paradas`, `editor-mapa-itinerario`) permanecem **inalterados** (doc 18 §6.5).
- [ ] A dica de gestos visível na etapa descreve o novo desenho.

## Casos válidos

- Itinerário com rota desenhada: clique direito num ponto qualquer → menu → "Seção" → formulário → nome → Seção criada **no fim** da lista de paradas, rota recalculada.
- Mesmo fluxo escolhendo "Local" → Local criado no fim, rota recalculada.
- Itinerário **sem** paradas (mapa vazio, sem linha): clique direito funciona normalmente — é o caminho de montagem do zero.

## Casos inválidos

- Clique esquerdo fora da linha → nenhum formulário, nenhuma entidade, nenhuma chamada OSRM.
- Clique esquerdo com **nenhuma rota desenhada** (menos de 2 paradas, ou estado `sem-rota`) → não há linha para acertar; nada acontece.
- Menu aberto e clique fora → fecha sem criar nada.
- Ponto fora de SP no formulário → mensagem existente (`MENSAGEM_FORA_DE_SP`), sem criar — comportamento herdado, não reimplementado.

## Testes esperados

- Unitários: o componente de menu flutuante (abre/fecha, `Esc`, clique fora, foco, duas opções).
- Integração (jsdom, `<Mapa>` dublado como em `editor-mapa-itinerario.test.tsx`): clique esquerdo fora da linha **não** cria Seção (**inválido** — é a inversão do que o teste afirma hoje); clique esquerdo sobre a linha cria ponto de rota; clique direito abre o menu e cada opção leva ao formulário certo; recusa de 350 m/fora de SP segue igual.
- E2E: `testes/e2e/etapa-itinerarios.spec.ts` atualizado — criar Seção e Local passa a ser clique direito + escolha (OSRM/tiles mockados, DEC-029).
- Snapshot/contrato JSON: N/A (nenhum campo muda) — a suíte de contrato existente deve seguir verde.
- PDF: N/A.

## Arquivos prováveis

- Criar `src/shared/ui/menu-flutuante.tsx` (+ export no índice de `shared/ui`)
- Alterar `src/shared/mapa/mapa.tsx` (callback de clique-na-linha para o botão direito, simétrico ao do esquerdo entregue pela TASK-063)
- Alterar `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (roteamento dos gestos, menu, dica)
- Alterar `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx` e `testes/e2e/etapa-itinerarios.spec.ts`
- Possível ajuste em `docs-dev/18-DESIGN_SYSTEM.md` §3 (registrar o componente novo)

## Dependências

- **TASK-063** (entrega o ancorador geométrico e a detecção de clique sobre a linha em `shared/mapa`).
- TASK-060 (mapa único) — já entregue.

## Riscos

- **Regressão de gesto entregue:** inverte comportamento aprovado na TASK-060; os testes que afirmam "esquerdo → Seção" mudam de asserção **por decisão registrada** (DEC-055), não por conveniência — a revisão de aderência deve conferir a DEC, não o texto da DEC-054.
- **Descoberta do gesto:** clique direito é gesto de menor descoberta; a dica visível na etapa é mitigação obrigatória (já era ressalva da Q-035).
- **Menu flutuante × doc 18 §5:** não pode sobrepor elemento interativo de forma bloqueante; usar `sombra-3` (flutuante efêmero).
- `shared/mapa` é usado pelo Comparador e pelas demo pages: a extensão precisa ser aditiva (callback ausente ≡ comportamento atual).

## Perguntas em aberto

- Nenhuma (desenho fixado pela DEC-055).

---

## TASK-066 — Re-ancorar os pontos de rota quando o conjunto ou a ordem das paradas muda

> **Desbloqueada pela DEC-056 (2026-07-16)** — a Q-037 foi decidida na opção A (re-ancorar onde é determinístico, descartar só na reordenação). Os critérios de aceite abaixo são os da regra decidida.

## Objetivo

Fechar a lacuna entre a Spec 03 §3.6.2 ("reedição fiel" — reaplicar os pontos de rota ao recalcular por alterar paradas) e a Spec 02 §10.4/RN-042 (`apos_parada_ordem` ∈ `[1, paradas.length − 1]`, índice posicional sobre a lista que acabou de mudar), aplicando a regra da **DEC-056** — e, no mesmo movimento, transformar o `throw` interno de `intercalar-pontos-de-rota.ts` na falha bloqueante bem-comportada que a RN-048 exige.

## Contexto

Levantada pela `/investigar-conflito` durante a análise da TASK-063. Hoje `etapa-itinerarios.tsx` reaplica `estadoAtual.rota.pontos_de_rota` **cru** no recálculo. Removida uma parada, os pontos do último trecho violam o intervalo e `intercalar-pontos-de-rota.ts` **lança** — sem `catch` em `solicitarRota` (que só embrulha o `fetch`) nem em `dispararRecalculo`, virando **rejeição não tratada** em vez do estado `sem-rota` da RN-048. Inserida uma parada no meio ou reordenada a sequência, os valores continuam no intervalo válido mas passam a designar **outro par de paradas**: o documento fica válido e o traçado forçado sai errado, **em silêncio**. O bug é alcançável **hoje** (importar JSON com `pontos_de_rota` + remover parada na tabela); a TASK-063 o torna rotineiro, e a TASK-067 (inserção posicional) depende desta regra para saber o que fazer com os pontos de um trecho partido em dois.

## Fora de escopo

- Qualquer mudança no contrato JSON — `apos_parada_ordem` já existe; a re-ancoragem só altera o **valor** calculado antes da requisição OSRM (Spec 02 §10.4 e §14 permanecem intocados).
- Inserção posicional de parada pelo clique na linha — TASK-067 (esta task entrega a regra que aquela consome).
- Gesto de ponto de rota — TASK-063; inversão de gestos — TASK-065.
- Reconciliação de horários na mudança de itinerário — já é da TASK-046 (DEC-048); não misturar.
- Mudar a política de comparação de pontos de rota no Comparador (Spec 05 §15.3, "pelo efeito") — leitores não recalculam (NEG-019).

## Specs fonte

- Spec 03 §3.6.2 (reedição fiel — reaplicação ao recalcular por alterar paradas)
- Spec 03 §3.6 regra 1 e §3.6.1 (ancoragem entre paradas consecutivas; travessia = `(apos_parada_ordem, índice no array)`)
- Spec 03 §3.5 (política de indisponibilidade/erro — categorias de falha)
- Spec 02 §10.4 e §14 (intervalo `[1, paradas.length − 1]`; validação estrutural)

## Regras envolvidas

- RN-042 (ancoragem e intervalo — o invariante que a re-ancoragem preserva)
- RN-048 (indisponibilidade/erro é bloqueante, sem degradação silenciosa — o `throw` deve virar `sem-rota`)
- RN-052 (editar recalcula)
- RN-041 (invariante de trechos, preservado em qualquer caminho)
- RN-043 (forçar traçado altera distâncias — reatribuir ao par errado corrompe `distancia_km`, matriz e tarifa)

## Entidades afetadas

- ponto de rota, Rota, Parada (a regra reindexa; nenhum modelo muda)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Parada **acrescentada ao fim** → nenhum `apos_parada_ordem` muda; traçado forçado idêntico.
- [ ] Parada **removida** → os dois trechos adjacentes fundem-se; os pontos de ambos preservam a sequência e assumem a ordem do trecho fundido; nenhum valor fora de `[1, paradas.length − 1]`.
- [ ] Parada **inserida no meio** → pontos antes dela mantêm a ordem; os depois recebem +1.
- [ ] **Reordenação** → os pontos daquele itinerário são descartados, com aviso não bloqueante (precedente DEC-048).
- [ ] Nenhum gesto da etapa produz **rejeição não tratada**: violação de intervalo residual vira estado `sem-rota` (RN-048), sem apagar a última rota válida.
- [ ] `trechos.length == paradas.length − 1` em todos os caminhos (RN-041).

## Casos válidos

- 3 paradas (A, B, C) com `p1,p2,p3` em `apos_parada_ordem: 1` e `p4` em `2` (exemplo literal da Spec 03 §3.6.1); remover B → trechos A→B e B→C fundem-se em A→C; os quatro pontos ficam em `apos_parada_ordem: 1`, na ordem `p1,p2,p3,p4`.
- Mesma base; acrescentar D ao fim → nada muda nos pontos.

## Casos inválidos

- JSON importado com `apos_parada_ordem` fora do intervalo (arquivo corrompido) → falha bloqueante da RN-048 com mensagem da Spec 03 §3.5, **sem** derrubar a etapa e **sem** apagar a última rota válida.
- `apos_parada_ordem == paradas.length` após a re-ancoragem → nunca deve ocorrer; se ocorrer, é bug e o teste falha (RN-042).

## Testes esperados

- Unitários: a função pura de re-ancoragem, caso a caso (fim/remoção/inserção/reordenação), incluindo vários pontos no mesmo trecho (§3.6.1) e os **inválidos** acima.
- Integração: remover parada na tabela lateral de um itinerário com pontos de rota **não** produz rejeição não tratada e recalcula com os pontos re-ancorados (OSRM mockado); reordenar dispara o aviso de descarte.
- E2E: opcional — o caminho crítico já fica coberto na integração.
- Snapshot/contrato JSON: `pontos_de_rota` resultante válido por `esquemaRota` e por `validacoes-estruturais` (§14) em todos os caminhos.
- PDF: N/A.

## Arquivos prováveis

- Criar `src/formulario/roteamento/reancorar-pontos-de-rota.ts` (+ export no índice)
- Alterar `src/formulario/roteamento/cliente-osrm.ts` e/ou `src/formulario/itinerarios/estado-itinerarios.ts` (`catch` defensivo → `FalhaOsrm`, RN-048)
- Alterar `src/formulario/itinerarios/etapa-itinerarios.tsx` (re-ancorar antes de reaplicar)
- Testes correspondentes em `testes/unitarios/formulario/`

## Dependências

- **DEC-056** (regra de re-ancoragem) — decidida; a task está liberada.
- TASK-063 (o gesto que torna o caminho rotineiro) — recomendável antes, não estritamente necessário.

## Riscos

- **Bug vivo até esta task entrar:** o caminho da rejeição não tratada já é alcançável hoje por importação + remoção de parada. É o argumento para priorizá-la logo após a TASK-063.
- Escolher a categoria de falha errada para a violação de intervalo (não é falha de rede nem semântica do OSRM — a taxonomia da TASK-022 pode precisar de um caso novo).
- Interação com a TASK-046 (horários): as duas reagem à mudança do conjunto de paradas; não duplicar a detecção — reusar a comparação de sequência que a DEC-048 já prevê.

## Perguntas em aberto

- Nenhuma (regra fixada pela DEC-056).

---

## TASK-067 — Inserção posicional: clique direito sobre a linha insere a parada entre as paradas do trecho

## Objetivo

Fechar a última parte da DEC-055: clicar com o botão direito **sobre a linha da rota** e escolher Seção ou Local insere a parada **entre as duas paradas que delimitam aquele trecho**, na posição correspondente ao ponto clicado — atendendo a Spec 04 §7.3 item 2 ("insere Seções e Locais **em ordem**"), hoje não atendida.

## Contexto

Hoje toda parada criada pelo mapa vai para o **fim** da lista, obrigando o usuário a subi-la com as setinhas da tabela lateral. A DEC-055 decidiu a inserção posicional. O motor já suporta: `inserirParada` (`motor-montagem.ts`) **já aceita índice de inserção** (default: fim) — falta o chamador calcular o índice, que sai do **mesmo ancorador geométrico** entregue pela TASK-063 para o `apos_parada_ordem`. A TASK-065 entrega o gesto do botão direito (menu Seção/Local) acrescentando sempre ao fim; esta task troca o fim pelo índice quando o clique acerta a linha. Depende da TASK-066 porque inserir uma parada no meio **parte um trecho em dois** e os pontos de rota daquele trecho precisam ser repartidos conforme a **DEC-056**.

## Fora de escopo

- A regra de re-ancoragem em si (DEC-056) — TASK-066; esta apenas a consome.
- O menu flutuante e o roteamento dos gestos — TASK-065.
- Reordenar/remover parada pela tabela lateral — já existe (TASK-019).
- Reconciliação de horários — TASK-046 (DEC-048), que já cobre "inserir Seção ou Local" como mudança de conjunto.
- Qualquer mudança no contrato JSON.

## Specs fonte

- Spec 04 §7.3 item 2 (insere Seções e Locais **em ordem**, clicando no mapa)
- Spec 04 §7.3 item 3 (tabela lateral na ordem da travessia; reordenar = recalcular)
- Spec 04 §7.3 item 5 (recalcular sempre que o itinerário muda)
- Spec 03 §3.6 (pontos de rota do trecho partido — regra na DEC-056, via TASK-066)

## Regras envolvidas

- RN-041 (invariante de trechos: `paradas + 1` ⇒ `trechos + 1`, automático)
- RN-052 (inserir recalcula)
- RN-042 (pontos de rota do trecho partido re-ancorados, nunca virando parada — NEG-011)
- RN-030 (conjunto de Seções consistente entre Ida e Volta — inserir só num sentido acende o aviso não bloqueante existente, DEC-047)
- RN-034/035/036 (montagem válida — resolução de paradas inalterada)

## Entidades afetadas

- Parada, Seção, Local, ponto de rota

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Clique direito **sobre a linha** entre as paradas 2 e 3 + escolher Seção → a Seção entra como parada de `ordem` 3, empurrando as seguintes.
- [ ] O mesmo vale para Local.
- [ ] Clique direito **fora** da linha → continua acrescentando ao **fim** (DEC-055).
- [ ] A rota é recalculada após a inserção (RN-052) e `trechos == paradas − 1` (RN-041).
- [ ] Pontos de rota do trecho partido são repartidos conforme a DEC-056 — nenhum vira parada, nenhum sai do intervalo válido.
- [ ] A tabela lateral reflete a nova ordem imediatamente.

## Casos válidos

- Itinerário A(1) → B(2) → C(3); clique direito sobre a linha no meio de B→C, escolher "Local" → paradas viram A(1), B(2), Novo(3), C(4); `trechos` passa de 2 para 3.
- Mesmo itinerário com `p4` em `apos_parada_ordem: 2` (trecho B→C); a parada nova cai **depois** de `p4` → `p4` continua em `2`; se cair **antes**, `p4` passa a `3` (DEC-056).

## Casos inválidos

- Clique direito sobre a linha com **rota ausente** (`sem-rota`) → não há linha; cai no caminho "fora da linha" (acrescenta ao fim).
- Ponto fora de SP → recusa existente, sem inserir.
- Violação dos 350 m no reuso de Seção → recusa existente, sem inserir.
- Falha do OSRM no recálculo pós-inserção → `sem-rota` (RN-048), sem apagar a última rota válida.

## Testes esperados

- Unitários: cálculo do índice de inserção a partir da posição ao longo do traçado (primeiro trecho, último trecho, exatamente sobre uma parada — **inválido**/borda).
- Integração: inserção no meio recalcula e reordena a tabela (OSRM mockado); pontos de rota do trecho partido repartidos corretamente; clique fora da linha ainda acrescenta ao fim.
- E2E: inserir uma Seção no meio de um itinerário pelo mapa e ver a tabela e a rota refletirem (OSRM/tiles mockados).
- Snapshot/contrato JSON: `paradas`/`trechos`/`pontos_de_rota` válidos após a inserção (§14).
- PDF: N/A.

## Arquivos prováveis

- Alterar `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (passar o índice do ancorador ao host)
- Alterar `src/formulario/itinerarios/etapa-itinerarios.tsx` (`inserirParada(paradas, parada, indice)`)
- Testes correspondentes

## Dependências

- **TASK-066** (regra de re-ancoragem da DEC-056) — precisa estar entregue antes.
- **TASK-065** (gesto do botão direito e menu).
- TASK-063 (ancorador geométrico).

## Riscos

- Clique exatamente **sobre** uma parada existente: índice ambíguo (antes ou depois dela) — definir borda determinística e testá-la.
- Rota com laço/retorno passando duas vezes pelo mesmo lugar: a posição ao longo do traçado pode ser ambígua (mesma limitação conhecida da TASK-063).
- Inserir só num sentido de Serviço bidirecional diverge o conjunto de Seções (RN-030) — o aviso não bloqueante existente (DEC-047) já cobre; não inventar bloqueio novo.

## Perguntas em aberto

- Nenhuma (regra fixada pela DEC-056; gesto fixado pela DEC-055).

---

## TASK-068 — Identidade visual do vértice de ponto de rota (ciano, tamanho intermediário)

## Objetivo

O vértice de ponto de rota ganha **cor própria (ciano) com mais destaque** e **tamanho intermediário** — maior que os 9 px de hoje, sempre menor que o marcador de Seção/Local (16 px) —, substituindo o cinza `#334155` que a TASK-063 escolheu por inferência controlada. A hierarquia visual "parada > ponto de rota" fica explícita e o token entra na paleta oficial.

## Contexto

A Spec 04 §7.3 fixa "visual distinto — vértice pequeno sobre a linha, sem rótulo" e nada mais sobre aparência; a TASK-063 preencheu a lacuna com cinza `#334155` (que é o token de **texto padrão** do doc 18, não uma cor de marcador) e 9 px, marcando ambos como **inferência controlada** em [`editor-mapa-itinerario.tsx`](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx). O responsável pelo domínio decidiu o visual definitivo na conversa da `/revisar-aderencia` da TASK-063 (**DEC-057**): ciano, com mais destaque, e tamanho entre o vértice atual e o marcador de parada. A paleta do doc 18 §2 **não tem família ciano** — o token é novo. O cinza atual some sobre o traçado da rota, que é justamente onde o vértice vive.

## Fora de escopo

- **Affordance de hover** sobre a linha (cursor + fantasma) — é a **TASK-069**.
- **Clique para remover** o vértice — é a **TASK-070**.
- Qualquer mudança no **contrato JSON**, no ancorador geométrico ou no motor de roteamento.
- Cor/forma/tamanho dos marcadores de **Seção e Local** — inalterados (DEC-054).
- Rótulo, popup ou entrada na tabela de paradas para o ponto de rota — proibido por Spec 04 §7.3.

## Specs fonte

- Spec 04 §7.3 (regra "Ponto de rota não é Seção, Local nem Parada — visual distinto, vértice pequeno sobre a linha, sem rótulo, sem nome, sem município")
- Spec 03 §3.6 (ponto de rota: definição e propósito único)

## Regras envolvidas

- RN-042 (ponto de rota sem identidade — sem rótulo, sem nome, sem município)
- RN-076 (padrão de exibição — o vértice **não** recebe rótulo `Cidade - Nome`, ao contrário da Seção)

## Entidades afetadas

- ponto de rota (só aparência; nem o modelo nem o contrato mudam)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] O vértice de ponto de rota é **ciano**, com token novo registrado em `docs-dev/18-DESIGN_SYSTEM.md` §2 (Cores) — não um hex solto no componente.
- [ ] O vértice é **maior que 9 px** e **estritamente menor** que o marcador de Seção/Local (16 px) — hierarquia verificada por teste, não por inspeção visual.
- [ ] A cor do vértice continua **distinta** da de Seção (azul) e da de Local (verde), e não colide com `erro` (vermelho) nem `alerta` (âmbar).
- [ ] O vértice segue **sem rótulo, sem nome, sem município e fora da tabela de paradas** (Spec 04 §7.3, RN-042) — inalterado.
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes (DEC-050).
- [ ] Zero alteração no contrato JSON, no ancorador ou no motor de roteamento.

## Casos válidos

- Itinerário com rota calculada e 2 pontos de rota: os vértices aparecem ciano, arrastáveis, menores que os 3 marcadores de Seção e maiores que o vértice de 9 px anterior.

## Casos inválidos

- Vértice com rótulo/popup/nome: proibido (Spec 04 §7.3) — o teste que garante a ausência de rótulo continua verde.
- Vértice do tamanho do marcador de parada (ou maior): viola "vértice **pequeno**" (§7.3) e a hierarquia da DEC-057.

## Testes esperados

- Unitários: o marcador do ponto de rota tem `forma: "circulo"`, o `tamanho` decidido, e cor `!==` das de Seção/Local (estender `editor-mapa-itinerario.test.tsx`, que já asserta essas três coisas).
- Integração: N/A (sem mudança de comportamento).
- E2E: N/A — os specs existentes seguem verdes sem tocar seletores.
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `docs-dev/18-DESIGN_SYSTEM.md` (§2 Cores — token ciano novo; especificação do vértice) — **vinculante, entra junto com o código** (DEC-050)
- `src/app/globals.css` (`@theme` do token; `.marcador-mapa-circulo--pequeno`)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (`COR_MARCADOR_PONTO_DE_ROTA`)
- `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`

## Riscos

- Ciano claro sobre a linha da rota (azul) pode ter contraste insuficiente — escolher tom que se destaque **do traçado**, não só do fundo do mapa.
- Aumentar o vértice o aproxima do marcador de parada: manter a diferença de tamanho legível, sob pena de reintroduzir a confusão que a DEC-057 quer eliminar.

## Perguntas em aberto

- Nenhuma (visual fixado pela DEC-057; o tom exato do ciano é escolha de design sob DEC-050/doc 18).

---

## TASK-069 — Affordance de hover sobre a linha da rota (cursor + vértice fantasma na posição do clique)

## Objetivo

Passar o mouse sobre a linha da rota passa a **mudar o cursor** (deixando de indicar pan) e a **mostrar sobre o traçado um vértice "fantasma"** na posição exata em que o clique criaria o ponto de rota. O gesto da Spec 04 §7.3 item 6 deixa de ser descoberto por tentativa e erro.

## Contexto

A Spec 04 §7.3 item 6 manda que clicar sobre a linha crie um vértice, e a TASK-063 entregou o gesto — mas **nada na tela diz que a linha é clicável**: o cursor continua o de pan, e o usuário só descobre o recurso pela frase de ajuda em `dica-gestos-mapa`. O responsável decidiu a affordance na conversa da `/revisar-aderencia` da TASK-063 (**DEC-057**). O caro já está pronto: `projetarNaLinha` ([`src/shared/mapa/ancoragem.ts`](../../src/shared/mapa/ancoragem.ts), TASK-063) devolve a projeção de um ponto qualquer sobre o traçado, e o `Mapa` já faz hit-test na camada `ID_CAMADA_LINHAS` com tolerância de 6 px ([`mapa.tsx`](../../src/shared/mapa/mapa.tsx)). Falta o `mousemove`, o cursor e o marcador de pré-visualização.

## Fora de escopo

- **Cor/tamanho** do vértice real — é a **TASK-068** (o fantasma reusa o token de lá; por isso 068 vem antes).
- **Clique para remover** o vértice — é a **TASK-070**.
- Criar/mover/remover ponto de rota — comportamento da TASK-063, **inalterado**: esta task só antecipa visualmente onde o clique cairia.
- Affordance do **clique direito** (menu Seção/Local) — é a TASK-065.
- Qualquer mudança no contrato JSON, no ancorador (`projetarNaLinha` é reusado como está) ou no motor de roteamento.
- Chamar OSRM no hover — **proibido**: passar o mouse não é editar (RN-052); nenhuma requisição sai de um `mousemove`.

## Specs fonte

- Spec 04 §7.3 item 6 (clicar sobre a linha da rota cria um vértice arrastável)
- Spec 04 §7.3 (regra "vértice pequeno sobre a linha, sem rótulo")
- Spec 03 §3.6 (ponto de rota ancorado ao trecho que molda)

## Regras envolvidas

- RN-052 (rota recalculada **ao editar** — hover **não** é edição: zero chamada ao OSRM)
- RN-042 (o fantasma não é ponto de rota: não existe no modelo, não é persistido, não tem `apos_parada_ordem` gravado)
- RN-096 / NEG-004 (pré-visualização é estado de UI efêmero, nunca gravado)

## Entidades afetadas

- ponto de rota (pré-visualização de UI; o modelo não muda)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Com o mouse **sobre a linha** da rota, o cursor muda (deixa de ser o de pan) e um **vértice fantasma** aparece sobre o traçado, na projeção do cursor.
- [ ] Com o mouse **fora da linha**, o cursor volta ao normal e o fantasma **some** — sem resíduo ao sair do mapa (`mouseleave`).
- [ ] O fantasma é **visualmente distinto** do vértice real (ex.: translucidez) — não confunde "vai criar" com "já existe".
- [ ] **Nenhuma chamada ao OSRM** é disparada por hover (RN-052) — assert explícito no teste com OSRM mockado.
- [ ] O fantasma **nunca** é persistido nem entra em `pontos_de_rota` (RN-042/RN-096).
- [ ] Sem `linhaRota` (itinerário em `sem-rota`), não há linha, logo não há hover nem fantasma — sem erro.
- [ ] Consumidores do `Mapa` **sem** o callback novo (Comparador, demo pages) ficam inalterados — a prop é opt-in, como `aoClicarNaLinha`.
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- Rota com 3 paradas: mouse no meio do primeiro trecho → cursor muda, fantasma aparece sobre a linha; mover ao longo do traçado desliza o fantasma; clicar cria o ponto ali (comportamento da TASK-063, preservado).

## Casos inválidos

- Mouse a 50 px da linha → nenhum fantasma, cursor normal.
- Mouse sai do mapa com o fantasma aceso → o fantasma some (`mouseleave`), sem marcador órfão.
- Itinerário em `sem-rota` (OSRM mockado em falha) → sem linha desenhada, hover não produz nada e não chama OSRM.

## Testes esperados

- Unitários: a projeção do cursor sobre o traçado reusa `projetarNaLinha` (já testado na TASK-063 — não reimplementar nem reduplicar); o editor rende o marcador fantasma na posição projetada e o remove ao sair.
- Integração: hover não dispara recálculo (contador de chamadas do OSRM mockado permanece em zero).
- E2E: mover o mouse sobre a linha mostra o fantasma; afastar some (OSRM/tiles mockados).
- Snapshot/contrato JSON: N/A.
- PDF: N/A.

## Arquivos prováveis

- `src/shared/mapa/mapa.tsx` (`mousemove`/`mouseleave` na camada de linhas, cursor via `getCanvas().style.cursor`, callback aditivo)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (marcador fantasma)
- `src/app/globals.css` (classe do fantasma) + `docs-dev/18-DESIGN_SYSTEM.md` (especificação do estado de pré-visualização)
- `src/shared/mapa/ancoragem.ts` — **reusado sem alteração**

## Riscos

- `mousemove` em mapa dispara muito: garantir que o hit-test não recalcule geometria pesada por evento (a projeção é barata, mas o `queryRenderedFeatures` a cada pixel merece atenção).
- Em telas de toque não há hover — a affordance não pode ser o **único** caminho de descoberta; a dica textual de `dica-gestos-mapa` permanece.
- O fantasma não pode capturar o clique (`pointer-events`), sob pena de matar o gesto que ele anuncia.

## Perguntas em aberto

- Nenhuma (affordance fixada pela DEC-057).

---

## TASK-070 — Clicar sobre o vértice remove o ponto de rota (exclusivo do ponto de rota)

## Objetivo

Clicar (sem arrastar) sobre um vértice de ponto de rota **remove** aquele ponto e dispara o recálculo, no padrão consagrado dos editores de rota. Clicar num marcador de **Seção ou Local não remove nada** — a remoção de parada continua **só pela tabela lateral**.

## Contexto

A Spec 04 §7.3 item 5 já prevê que "ponto de rota criado/movido/**removido**" recalcula a rota, e a TASK-063 entregou a remoção pelo botão **"Remover"** da sub-lista — mas não pelo mapa, onde o usuário está olhando. O responsável decidiu o gesto na conversa da `/revisar-aderencia` da TASK-063 (**DEC-057**), com a restrição explícita de que **só o ponto de rota** responde ao clique. O motor está pronto: `removerPontoDeRota` ([`src/formulario/roteamento/posicionar-ponto-de-rota.ts`](../../src/formulario/roteamento/posicionar-ponto-de-rota.ts)) e o handler `aoRemoverPontoDeRota` da TASK-063 já fazem o trabalho — falta ligar o clique do marcador a eles, distinguindo clique de arraste.

## Fora de escopo

- **Remover Seção/Local por clique no marcador** — **proibido por DEC-057**: a remoção de parada é só pela tabela lateral. Marcador de parada segue **arrastável** (Spec 04 §7.3 item 4) e clicável sem efeito destrutivo.
- Retirar o botão **"Remover" da sub-lista** — **permanece** (DEC-057): é o caminho por teclado e o gesto do mapa é adicional.
- Cor/tamanho do vértice (**TASK-068**) e affordance de hover (**TASK-069**).
- Arrastar o vértice (TASK-063, inalterado) e re-ancoragem por mudança de paradas (TASK-066/DEC-056).
- Confirmação/desfazer da remoção — não previstos em spec nenhuma; **não inventar**.
- Qualquer mudança no contrato JSON ou no motor de roteamento.

## Specs fonte

- Spec 04 §7.3 item 5 ("recalcula a rota sempre que o itinerário muda … ponto de rota criado/movido/**removido**")
- Spec 04 §7.3 item 4 (marcadores de parada são **movidos** arrastando — não removidos por clique)
- Spec 03 §3.6 (ponto de rota: propósito único, sem identidade)

## Regras envolvidas

- RN-042 (ponto de rota **sem `uuid`, sem identidade** — o fundamento da assimetria: é descartável e refazível)
- RN-030 (Seção compartilhada entre Ida e Volta — o motivo de sua remoção **não** ficar num clique)
- RN-052 (remover ponto de rota recalcula a rota)
- RN-048 (falha do recálculo não apaga a última rota válida)
- RN-041 (invariante `trechos == paradas − 1` — remover ponto de rota não muda a contagem de trechos)

## Entidades afetadas

- ponto de rota (removido pelo gesto); Seção e Local (**explicitamente não** afetados)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Clicar (sem arrastar) sobre um vértice de ponto de rota **remove** aquele ponto e dispara o recálculo (RN-052).
- [ ] **Arrastar** o vértice continua **movendo** (TASK-063) e **nunca** removendo — clique e arraste são distinguidos por limiar de deslocamento, testado nos dois lados da borda.
- [ ] Clicar num marcador de **Seção** ou de **Local não remove nada** (DEC-057, RN-030) — teste explícito por tipo de marcador.
- [ ] O botão **"Remover" da sub-lista continua funcionando** (caminho por teclado preservado).
- [ ] Remover o vértice remove **exatamente** aquele ponto (índice correto), preservando os demais na ordem de travessia (Spec 03 §3.6.1).
- [ ] `trechos == paradas − 1` preservado; a tabela de paradas não muda (RN-041/RN-042).
- [ ] Falha do OSRM no recálculo pós-remoção → mensagem da Spec 03 §3.5 (§14), sem apagar a última rota válida (RN-048).
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- Trecho com 3 pontos de rota (p1, p2, p3): clicar em p2 remove só p2; p1 e p3 permanecem, nessa ordem, e a rota recalcula com 2 pontos.
- Único ponto de rota do itinerário: clicar remove; a rota volta ao traçado livre do OSRM e a sub-lista fica vazia.

## Casos inválidos

- **Arrastar** o vértice 30 px e soltar → **move** (não remove); a sub-lista continua com o mesmo número de pontos.
- Micro-arraste abaixo do limiar (ex.: 1–2 px, tremor de mão) → tratado como clique → remove. Borda determinística, testada.
- Clicar num marcador de **Seção** → nada é removido; a parada continua na tabela lateral (RN-030).
- Clicar num marcador de **Local** → nada é removido.
- OSRM falha no recálculo pós-remoção (mock em `sem-rota`) → pendência bloqueante (RN-048); a última rota válida do documento não é apagada.

## Testes esperados

- Unitários: o marcador do ponto de rota expõe o handler de clique com o **índice** correto; marcadores de Seção/Local **não** expõem handler de remoção (asserção negativa explícita — é a garantia da DEC-057); `removerPontoDeRota` reusado sem alteração (já testado na TASK-063).
- Integração: clique no vértice → recálculo disparado com a lista sem aquele ponto (OSRM mockado); arraste → recálculo com a lista movida, mesma contagem.
- E2E: criar 2 pontos de rota, clicar no primeiro, ver a sub-lista cair para 1 e o OSRM ser chamado com 1 ponto a menos (OSRM/tiles mockados).
- Snapshot/contrato JSON: `pontos_de_rota` resultante bem-formado (`apos_parada_ordem ∈ [1, paradas−1]`, sem `uuid`).
- PDF: N/A.

## Arquivos prováveis

- `src/shared/mapa/mapa.tsx` (distinção clique × arraste no marcador: comparar posição de `dragstart`/`dragend`, ou `click` no elemento só quando não houve arraste; callback aditivo por marcador)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (ligar o clique do vértice a `aoRemoverPontoDeRota` — que já existe)
- `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`, `testes/e2e/etapa-itinerarios.spec.ts`
- `src/formulario/roteamento/posicionar-ponto-de-rota.ts` — **reusado sem alteração**

## Riscos

- **Distinguir clique de arraste é o risco principal:** limiar muito baixo transforma tremor de mão em remoção acidental; muito alto, o clique não pega. Escolher limiar em pixels, documentá-lo e testar os dois lados da borda.
- O marcador é elemento DOM acima do canvas: garantir que o clique nele **não** vaze para o `click` do mapa e crie um ponto novo no lugar do removido (a precedência "vértice ganha da linha" é a DEC-057).
- Remoção sem desfazer: aceitável porque o ponto é refazível com um clique (RN-042) — **não** inventar confirmação (nenhuma spec a prevê).

## Perguntas em aberto

- Nenhuma (gesto e exclusividade fixados pela DEC-057).

---

## TASK-071 — Pontos de rota da sessão sobrevivem a um recálculo que falha (Q-038)

## Objetivo

Os pontos de rota do itinerário em edição passam a viver em **estado de sessão próprio**, que sobrevive à transição para `sem-rota` (RN-048), em vez de serem derivados de `estadoAtual.rota.pontos_de_rota`. Uma falha de rota deixa de apagar, em silêncio, o traçado forçado pelo usuário — inclusive o que veio do arquivo importado.

## Contexto

`pontosDeRotaAtual` é derivado de `estadoAtual.rota.pontos_de_rota` ([`etapa-itinerarios.tsx:202-205`](../../src/formulario/itinerarios/etapa-itinerarios.tsx#L202-L205)) — que **só existe** em `congelada`/`recalculada`. Quando o recálculo falha (RN-048), `estadoAtual` vira `sem-rota` e a lista lida volta a `[]`; o próximo recálculo bem-sucedido grava a rota **sem** os pontos anteriores, sem nenhum aviso. Levantada como **Q-038** na análise da TASK-063 e confirmada na revisão dela (`docs-dev/14-REVISOES/TASK-063-20260716.md`, ressalva 1); **decidida pela DEC-058** (opção A). O bug é **anterior à TASK-063** e alcançável sem ela (importar JSON com `pontos_de_rota` + falha no recálculo seguinte), mas o gesto de mapa o tornou rotineiro. Precede a **TASK-066**: a re-ancoragem da DEC-056 opera sobre "a lista de pontos a reaplicar", e construí-la sobre uma lista que evapora numa falha é construir sobre areia.

## Fora de escopo

- **Re-ancoragem** dos pontos quando o conjunto/ordem de paradas muda — é a **TASK-066** (DEC-056). Esta task só garante que a lista **exista** para ela re-ancorar.
- Qualquer mudança no **contrato JSON**/schema — `rota.pontos_de_rota` mantém campo, semântica e schema; muda só **de onde a UI lê** enquanto edita.
- **Criar** ponto de rota em `sem-rota` — sem rota não há linha para ancorar; segue indisponível (DEC-058). O que sobrevive é o que já existia.
- Aviso de UI sobre pontos preservados — a DEC-058 não o pede; **não inventar**.
- Gestos do mapa (TASK-063/068/069/070) e o motor de intercalação — reusados como estão.

## Specs fonte

- Spec 03 §3.6.2 ("Reedição fiel" — pontos persistidos são reaplicados ao recalcular, "sem retrabalho manual")
- Spec 03 §3.5 / Spec 04 §14 (falha de rota: categorias e mensagens)
- Spec 02 §10.4 (`rota.pontos_de_rota` — eco dos pontos aplicados, congelado com a rota)
- Spec 04 §7.3 (registro: `router.project-osrm.org` é demo **sem SLA** — falha é transitória e corriqueira)

## Regras envolvidas

- RN-042 (persistência do ponto de rota; sem identidade, **sem fórmula de recomputação** — o que se perde, perde-se para sempre)
- RN-048 (falha bloqueante **sem degradação silenciosa**)
- RN-052 (recálculo ao editar)
- RN-096 / NEG-004 (a lista da sessão é efêmera; nada gravado antes da exportação)
- RN-015 (leitores nunca recalculam — o eco congelado que eles leem não muda)

## Entidades afetadas

- ponto de rota, Rota (fronteira estado de sessão × documento; o modelo e o contrato não mudam)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] A lista de pontos de rota em edição vive em **estado de sessão** por itinerário (`servicoUuid`+`sentido`), não derivada de `estadoAtual.rota`.
- [ ] Após um recálculo que **falha** (RN-048), os pontos de rota **continuam** na sessão, no mapa e na sub-lista.
- [ ] Recálculo falho seguido de recálculo **bem-sucedido** grava a rota **com** os pontos que já existiam antes da falha (Spec 03 §3.6.2).
- [ ] Ao **abrir um JSON**, a lista da sessão nasce de `rota.pontos_de_rota` do arquivo (reedição fiel) — **sem chamar OSRM** (RN-052/RN-015).
- [ ] `rota.pontos_de_rota` gravado continua sendo o **eco dos pontos aplicados no último recálculo bem-sucedido** — contrato e schema inalterados.
- [ ] Nada é gravado no JSON antes da exportação (RN-096/NEG-004).
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- JSON com 2 pontos de rota → reordenar parada → OSRM falha (`sem-rota`) → desfazer a reordenação → OSRM ok: a rota gravada volta com os **2 pontos** originais.
- Criar ponto de rota → OSRM falha → mover uma parada → OSRM ok: o ponto criado **sobrevive** e entra no recálculo.

## Casos inválidos

- Em `sem-rota`, clicar onde a linha estaria → nada é criado (não há linha nem trecho para ancorar) e nenhuma exceção é lançada.
- OSRM falha **duas vezes** seguidas → os pontos continuam na sessão; a pendência bloqueante permanece e a última rota válida do documento não é apagada (RN-048).
- Exportar com itinerário em `sem-rota` → continua **bloqueado** (RN-078) — pontos preservados na sessão **não** tornam a rota válida.

## Testes esperados

- Unitários: a redução de sessão preserva a lista de pontos na transição `congelada → sem-rota → recalculada`; a hidratação a partir do documento importado alimenta a lista.
- Integração: `congelada` → gesto → OSRM **falha** → gesto → OSRM **ok** → a rota gravada contém os pontos anteriores (OSRM mockado alternando falha/sucesso) — é a lacuna que a revisão da TASK-063 apontou.
- E2E: com OSRM mockado, provocar falha e depois sucesso, verificando que a sub-lista nunca esvazia e que a URL final leva os pontos (`waypoints=`).
- Snapshot/contrato JSON: `rota.pontos_de_rota` exportado bem-formado e igual aos pontos aplicados (schema `zod` strict).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/sessao.ts` (lista de pontos de rota por itinerário, no padrão de `paradasEmEdicaoMapa`/`estadosRotaViva`)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (`pontosDeRotaAtual` passa a ler o estado novo; handlers da TASK-063 comitam nele; hidratação na abertura do JSON)
- `src/formulario/roteamento/posicionar-ponto-de-rota.ts`, `intercalar-pontos-de-rota.ts` — **reusados sem alteração**

## Riscos

- **Duas fontes para o mesmo dado** (sessão × `rota.pontos_de_rota` congelado): deixar inequívoco quem manda em qual momento, sob pena de trocar um bug silencioso por outro. A DEC-058 fixa: sessão manda na edição, o congelado é eco.
- Hidratação no modo "novo" × "carregado" (DEC-035/DEC-053): garantir que a lista nasça certa nos dois fluxos.
- Colisão de merge com a TASK-066, que mexe no mesmo ponto — por isso a ordem 071 → 066.

## Perguntas em aberto

- Nenhuma (Q-038 decidida pela DEC-058).

---

## Ordem recomendada de execução

```text
001 → 002 → 003 → 004/005 (paralelo) → 041 → 006 → 007 → 042
→ 008/009 (paralelo) → 010 → 011 → 012
→ 013 → 014 → 015 → 016 → 020 → 021 → 043 → 022 → 023 → 024 → 044 → 045 → 017 → 018 → 019 → 025 → 047
→ 026 → 027 → 048 → 028 → 046 → 029 → 030 → 031 → 032
→ 033 → 034
→ 035 → 036 → 037 → 038 → 039
→ (decisão humana) 040
```

**Bloco de redesign visual (DEC-050 — independente das tasks de negócio pendentes; em execução):**

```text
049 → 050 → 051 → 052 → 053 → 054 → 055 → 056
```

**Comportamento derivado do bloco (DEC-051 — não é redesign; depende da TASK-031 e da TASK-054, ambas entregues):**

```text
057
```

**Cleanup das ressalvas do bloco (condições de merge da TASK-057 + achados de TASK-053; DEC-052 — depende da TASK-056 e da TASK-057):**

```text
058
```

**Correções da etapa de itinerários (mapa/rota — Spec 04 §7; descobertas na revisão da TASK-055):**

```text
059 → 060 → 063 → 065 → 071 → 066 → 067
                  ├→ 064
                  └→ 068 → 069 → 070
```

- TASK-063 (gesto de ponto de rota) e TASK-064 (sync tabela↔mapa) foram deferidas da TASK-060 por DEC-054 — dependem da TASK-060 (mapa único) e podem seguir em qualquer ordem entre si.
- TASK-068/069/070 vêm da **DEC-057** (decisão do responsável na revisão da TASK-063): identidade visual ciano do vértice, affordance de hover sobre a linha e clique-para-remover **exclusivo do ponto de rota** (Seção/Local só saem pela tabela lateral). Dependem só da TASK-063 (entregue) e não bloqueiam nem são bloqueadas pela TASK-065; a ordem 068 → 069 existe porque o vértice fantasma da 069 reusa o token de cor que a 068 cria.
- TASK-071 vem da **DEC-058** (Q-038 decidida): os pontos de rota da sessão sobrevivem a um recálculo que falha. **Precede a TASK-066** — as duas tocam a reaplicação dos pontos, e re-ancorar (066) uma lista que evapora numa falha seria construir sobre areia.
- TASK-065/066/067 vêm da **DEC-055** (Q-036), que superou em parte a DEC-054 invertendo os botões do mouse: esquerdo sobre a linha cria ponto de rota, direito abre menu Seção/Local. Todas dependem do **ancorador geométrico** entregue pela TASK-063. A **DEC-056** (Q-037) fixou a re-ancoragem dos pontos de rota e liberou TASK-066/067 — nenhuma task deste ramo está bloqueada.

**Fluxo criar-do-zero — promoção `ServicoEmConstrucao → Servico` (DEC-053 / Q-034; TASK-062 depende da TASK-061):**

```text
061 → 062
```

**Primeira task:** TASK-001; **primeira task de valor de negócio:** TASK-003 (schema do contrato) — é a fundação de tudo e o melhor ponto de partida para validar o processo spec-driven.
