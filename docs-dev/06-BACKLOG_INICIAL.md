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
**Consolidação (TASK-066, entregue antes — parecer `docs-dev/14-REVISOES/TASK-066-20260717.md`):** a classificação de gesto "mudou ordem/conjunto de paradas" que esta task precisa (a mesma taxonomia acrescentar-ao-fim/inserir/remover/reordenar) **já existe no código**, implementada pela TASK-066 em `src/formulario/roteamento/reancorar-pontos-de-rota.ts` por diffing das chaves de identidade das paradas antes×depois (`chaveParadaEmEdicao`, `src/formulario/itinerarios/motor-montagem.ts`). Como a 066 entrou antes desta, a direção da consolidação prevista na DEC-056/no risco da TASK-066 **inverteu**: **REUSAR** essa classificação aqui (extraindo um utilitário comum de "classificar gesto de mudança de paradas" se preciso), **nunca reimplementar** um segundo detector — a `/analisar-task` desta task deve abrir aquele arquivo e decidir onde o utilitário compartilhado passa a viver. Ponto de atenção herdado do parecer da 066: o subcaso "remover parada de **extremo**" orfana os pontos do trecho terminal; a 066 o resolve caindo em `sem-rota` (conservador), e a eventual Q-xxx de descarte-vs-`sem-rota` (se aberta) toca as duas tasks — conferir antes de duplicar a detecção.

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

1. **[TASK-057 P1 — condição de merge] Fixture com UUID fora do schema** (`testes/unitarios/formulario/servicos-contadores.test.tsx:19`): `viagemFeriado()` gera `uuid: \`${base.uuid}-feriado\``, que não passa no `uuidV4`do contrato (RN-001/RN-010) — o documento montado não sobreviveria a`esquemaDocumentoOperacao`. Trocar por um UUIDv4 literal válido.
2. **[TASK-057 P2 — condição de merge] `data-testid="rotulo-semana-padrao"` duplicado** (`src/formulario/servicos/servicos.tsx:355` e `src/formulario/resumo/resumo-operacional.tsx:34`): `testes/e2e/resumo-operacional.spec.ts:22` usa o testid **sem `.first()`**, então o dia em que as duas telas co-renderizarem esse E2E quebra por strict-mode. Renomear **só o novo** (o de `servicos.tsx`, ex.: `servicos-rotulo-semana-padrao`) e atualizar `testes/e2e/servicos.spec.ts:142`; o testid do resumo é preexistente e **intocável**.
3. **[TASK-057 P3 — follow-up] Literal `ROTULO_SEMANA_PADRAO` duplicado** (`servicos.tsx:76` e `resumo-operacional.tsx:21`): o texto exigido literalmente pela RN-069/NEG-018 vive em dois lugares — uma edição futura diverge em silêncio. Fonte única em `shared/` (ex.: `shared/contagens` ou `shared/ui`), consumida por servicos e resumo. Toca o resumo, que é arquivo da TASK-056 — daí a dependência abaixo.
4. **[TASK-057 P4 — estilo] `viagensSemana(undefined) + viagensSemana(undefined)`** (`servicos.tsx:155-159`) soma duas chamadas constantes para dizer `0` — ofuscação. Simplificar para a constante `0` (a semântica "Serviço em construção → 0", DEC-035, permanece; nenhuma regra muda). Opcional.
5. **[TASK-053 P3 — consistência] Estados de erro/carregamento da Identificação sem superfície** (`identificacao.tsx:156,164`): `erroListas` e `!listas` renderizam `<p>` solto enquanto o estado carregado é `Painel` — a etapa "muda de moldura". Envolver em `Painel` (escolha de aparência, DEC-050). O `data-testid="erro-listas-identificacao"` é intocável.
6. **[Derivado — DEC-051/DEC-052] Atualizar `docs-dev/01-RULE_INDEX.md`:** na Origem da RN-069 (`:510`), acrescentar **Spec 04 §6** (a DEC-051 antecipou este ajuste de derivado). _(A Spec 04 §5 → "Tipo do Autos" da DEC-052 é edição de `docs/specs/**`, read-only — **não** entra aqui; é ação do dono da spec.)_
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

## TASK-072 — Unificar o CRUD da etapa Serviços no modo "novo": listar/editar/duplicar/remover Serviços promovidos + numeração contínua

## Objetivo

No fluxo **"novo"**, a etapa Serviços passa a exibir e administrar, numa lista única, tanto os `ServicoEmConstrucao` quanto os `Servico` já **promovidos** (DEC-053/TASK-061): editar, duplicar e remover funcionam sobre qualquer um dos dois, e a numeração sugerida de `numero_n` (Spec 03 §10.3 regra 5) passa a ser **contínua** sobre as duas listas. A lista passa também a **rotular explicitamente o estado** de cada Serviço — em construção × completo — para todos, nos dois modos.

## Contexto

A TASK-061 introduziu a promoção `ServicoEmConstrucao → Servico`, movendo o Serviço concluído para `sessao.servicos` (modo novo). O CRUD da etapa Serviços ([`servicos.tsx`](../../src/formulario/servicos/servicos.tsx)) já foi construído para unir as duas listas (`completos` + `linhasEmConstrucao`, com `todosNumeros` contando ambas), mas deriva `completos` **só** de `sessao.documento.autos.servicos` quando `sessao.modo === "carregado"` — no modo novo é sempre `[]`. Consequência descoberta em teste manual do responsável (2026-07-16): o Serviço promovido **some da lista**, não pode ser editado/duplicado/removido, e a numeração colide (o promovido não entra em `todosNumeros`, então após finalizar `1-1CR` o próximo volta a sugerir `1-1CR` em vez de `1-2CR`). É o mesmo buraco `sessao.modo === "carregado"` que a TASK-061 fechou em Viagens/Matrizes/pendências/itinerários — mas o CRUD de Serviços ficou de fora porque a TASK-061 o declarou fora de escopo ("já existe"), premissa que a própria promoção invalidou. A base já existe: `servicosDaSessao`/`comServicosDaSessao` (`sessao.ts`, TASK-061); `duplicarServico`/`removerServico` já são puros; o CRUD já bifurca por `linha.completo`. Follow-up formal da revisão da TASK-061.

## Fora de escopo

- A promoção em si (gatilho, forma, lar do `Servico`) — é a **TASK-061**, entregue.
- Alterar o comportamento do **modo carregado** (mantém a trava de mínimo 1 Serviço e a mesma cascata de Seção órfã — nenhuma regressão).
- Mudança de contrato/schema (`shared/contrato`): tudo é estado de sessão efêmero (RN-096/NEG-004).
- Reimplementar `duplicarServico`/`numero-n`/contagens — reusam-se como estão.
- Troca de direcionalidade de um Serviço completo (é operação de itinerário, etapa de mapa — já fora do escopo da etapa Serviços).

## Specs fonte

- Spec 04 §6 (etapa Serviços: criar/editar/duplicar/remover; `numero_n` sugerido)
- Spec 03 §10.3 regra 5 (`numero_n` sequencial por ordem de cadastro)
- Spec 02 §6 (`Servico`), §14 (validação — documento exportado exige ≥ 1 Serviço; Seção com ≥ 1 entrada)

## Regras envolvidas

- RN-001/002 (identidade por UUID preservada em edição; cópia recebe UUID nova)
- RN-006 (`numero_n` é rótulo de display, nunca identidade; sequencial é só sugestão)
- RN-007 (duplicar = entidade nova, UUIDs novas, `secao_uuid` mantida, `local_uuid` re-mapeada)
- RN-018 (documento válido exige ≥ 1 Serviço + cascata de Seção órfã) — **gate de exportação, não de sessão**: no modo novo a remoção não trava no "último Serviço"
- RN-096 / NEG-004 (sessão efêmera; nada gravado no JSON antes da exportação)
- DEC-035 (`ServicoEmConstrucao`), DEC-053 (`servicosDaSessao`/promoção), DEC-037 (sufixo de `numero_n` regenerado na troca de característica)
- DEC-050 (design system vinculante para UI — o rótulo de estado usa `Selo` do `shared/ui`, tokens do doc 18; o estado "em construção" × "completo" não é conceito de contrato, é de sessão — DEC-035/DEC-053 —, logo o rótulo é _inferência controlada_ de usabilidade sob o doc 18, não regra de spec)

## Entidades afetadas

- Serviço (completo e em construção), Seção (cascata de órfã na remoção)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] No modo "novo", a lista da etapa Serviços exibe `ServicoEmConstrucao` **e** `Servico` promovidos (DEC-053) num único conjunto — o promovido não some após concluir o itinerário.
- [ ] A numeração sugerida de `numero_n` é contínua sobre as duas listas: criar `1-1CR`, promovê-lo e criar outro sugere `1-2CR` (Spec 03 §10.3 regra 5).
- [ ] Cada linha da lista rotula explicitamente o estado do Serviço — **em construção** × **completo** — para todos, nos dois modos (`Selo` do `shared/ui`, doc 18/DEC-050), preservando o `data-testid="servico-em-construcao"` já existente para o estado em construção.
- [ ] Editar/Duplicar/Remover operam sobre um Serviço promovido no modo novo (deixam de ser no-op).
- [ ] Duplicar um Serviço promovido gera entidade nova com UUIDs novas (RN-007), `secao_uuid` mantidas e `local_uuid` re-mapeadas (reusa `duplicarServico`).
- [ ] Remover um Serviço promovido no modo novo: sai de `sessao.servicos`, tira suas entradas de cada Seção de `secoesEmConstrucao` e descarta Seção que fique órfã (cascata — RN-018), **sem** trava de "mínimo 1 Serviço" durante a construção.
- [ ] O modo "carregado" permanece inalterado (mesma trava de mínimo 1, mesma cascata).
- [ ] UUIDs preservadas em edição (RN-001/002); nada gravado no JSON antes da exportação (RN-096/NEG-004).
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- Novo: criar Serviço A (`1-1CR`, ida) → montar itinerário (promoção) → a lista continua mostrando A com contadores de viagens; criar novo Serviço sugere `1-2CR`.
- Estado visível: antes da promoção, A exibe o selo "em construção"; depois da promoção, A exibe o selo "completo" — na mesma tabela.
- Duplicar A promovido → A' com UUID nova e `numero_n` no próximo sequencial livre, mesmas Seções.
- Remover A promovido sendo o único Serviço do modo novo → some da lista; Seção usada só por ele é removida de `secoesEmConstrucao`; Seção ainda usada por um `ServicoEmConstrucao` permanece.

## Casos inválidos

- (carregado) Remover o último Serviço continua **bloqueado** (RN-018) — regressão-guarda de que a mudança não afrouxou o modo carregado.
- Editar/duplicar **não** regeneram a UUID de um Serviço existente (RN-001/002) — round-trip prova.
- Remover um Serviço no modo novo **não** apaga Seção ainda referenciada por outro Serviço (completo ou em construção) — cascata só sobre Seção efetivamente órfã.

## Testes esperados

- Unitários: função pura de remoção com cascata aplicável ao modo novo (`servicos` + `secoesEmConstrucao` → cascata de órfã, sem trava mínimo-1); numeração contínua (`sugerirNumeroN` sobre a lista unificada); duplicar promovido (RN-007 round-trip de UUID; `secao_uuid` mantida, `local_uuid` re-mapeada).
- Integração: `EtapaServicos` no modo novo com um Serviço promovido — listar, editar, duplicar, remover; assert do selo de estado (em construção × completo) por linha; assert de que `sessao.servicos` muda e `secoesEmConstrucao` cascateia; e de que o modo carregado não regride.
- E2E: N/A (o fluxo ponta a ponta é a TASK-062).
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/servicos/servicos.tsx` (`completos` via `servicosDaSessao`; `salvar`/`duplicar`/`remover`/`podeRemover` via `comServicosDaSessao` no modo novo)
- `src/formulario/servicos/remover.ts` (função pura de remoção com cascata genérica sobre `servicos` + `secoes`, reutilizável pelos dois modos, sem trava mínimo-1 quando aplicada à sessão novo)
- `testes/unitarios/formulario/servicos-*.test.ts` (casos novos)

## Riscos

- **Regressão no modo carregado:** a generalização de `remover.ts` não pode mudar o comportamento carregado (mesma cascata, mesma trava mínimo-1). Cobrir com regressão-guarda.
- **Condição da cascata:** uma Seção só é órfã quando **nenhum** Serviço — completo **ou** em construção — a referencia; a cascata deve operar sobre `secao.servicos[]` (que já reflete o uso por ambos), não sobre "está nas paradas de um Serviço completo".
- Depende de `servicosDaSessao`/`comServicosDaSessao` e do campo `sessao.servicos` (TASK-061).

## Dependências

- **TASK-061** (entregue) — fornece `sessao.servicos`, `servicosDaSessao`, `comServicosDaSessao`.

## Perguntas em aberto

- Nenhuma bloqueante. O comportamento de remoção no modo novo (sem trava de mínimo 1 durante a construção — RN-018 é gate de exportação; cascata de Seção órfã como no carregado) foi **decidido pelo responsável nesta conversa (2026-07-17)**. Se quiser formalizá-lo, vira DEC via `/registrar-decisao`.

---

## TASK-062 — E2E do fluxo "criar do zero" ponta a ponta (Identificação → Exportação)

## Objetivo

Ao final existe um teste **E2E (Playwright)** que exercita o fluxo **"novo"** completo — Identificação → Serviços → Seções/Locais → Itinerários → Viagens → Matrizes → Resumo → Exportação —, com o OSRM mockado, cobrindo a lacuna que deixou a trava da Q-034 passar despercebida (nenhum E2E cobre criar-do-zero; só o fluxo de JSON aberto).

## Contexto

A Q-034 registrou que "nenhum E2E exercita o fluxo 'novo' de Serviços → Itinerários → Viagens (só o fluxo de JSON aberto é coberto)" — foi por isso que a trava só apareceu em teste manual. Depois da **TASK-061** (promoção `ServicoEmConstrucao → Servico`), o fluxo passa a funcionar ponta a ponta; falta a rede de segurança que impeça a regressão. Testes **nunca** dependem do OSRM real — mock sempre (stack fixada, DEC-029).

**Depende também da TASK-032 (DEC-059 / Q-039).** A `/analisar-task` da TASK-062 (2026-07-17) descobriu que as etapas **Revisão e Exportação ainda são placeholder** — a UI que dispara a exportação (botão + gate, RN-078) é escopo da **TASK-032**, não implementada. Sem ela, os critérios de export/round-trip e o caso inválido do gate não são exercitáveis pela interface. Decisão do responsável (opção (a) da Q-039): **re-sequenciar a TASK-062 para depois da TASK-032** e simplificar o E2E, que passa a usar o botão de exportação e o gate reais — sem contornos. Cadeia: `061 → 032 → 062`.

## Fora de escopo

- Implementar/alterar a promoção — é a **TASK-061** (esta task só testa o fluxo já corrigido; depende dela).
- **Construir a tela de Revisão ou o botão/gate de exportação — é a TASK-032** (DEC-059). Esta task consome a UI de exportação pronta; não inventa seletores de exportação próprios nem antecipa a TASK-032.
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
- [ ] Pela tela de Revisão/Exportação da TASK-032, o botão de exportação produz um JSON que **passa no schema** `zod` strict (Serviço completo, RN-018) — capturado pelo download real do Playwright.
- [ ] Round-trip: reimportar o JSON exportado preserva as UUIDs geradas (RN-004).
- [ ] O teste não faz nenhuma chamada de rede real ao OSRM (mock verificado).

## Casos válidos

- Fluxo "novo" com 1 Serviço, direcionalidade "ida", itinerário de 2+ paradas, ao menos 1 Viagem → exporta JSON válido.

## Casos inválidos

- Tentar exportar antes de completar ≥ 1 Serviço → o gate da TASK-032 bloqueia/sinaliza a pendência (RN-018/RN-078), sem gerar JSON inválido.

## Testes esperados

- Unitários: N/A (é uma task de E2E).
- Integração: N/A.
- E2E: o novo spec Playwright do fluxo criar-do-zero, com OSRM mockado; asserções de Viagens/Matrizes populadas e de JSON exportado válido + round-trip de UUID.
- Snapshot/contrato JSON: validação do JSON exportado contra o schema.
- PDF: N/A.

## Arquivos prováveis

- `testes/e2e/fluxo-novo.spec.ts` (novo spec). Não há helper de mock do OSRM compartilhado — cada spec faz `page.route("https://router.project-osrm.org/**", …)` inline (padrão de `testes/e2e/etapa-itinerarios.spec.ts`); mockar também os tiles OSM.
- Consome os `data-testid` do botão/gate de exportação criados pela **TASK-032** — sem inventar seletores de exportação próprios. `data-testid` adicionais **apenas** se algum passo do fluxo não for selecionável (mínimos; sem alterar os existentes — DEC-050).

## Riscos

- Depende da TASK-061 (entregue) **e da TASK-032** (UI de exportação — DEC-059): sem a promoção, o E2E falha por design (Viagens/Matrizes vazias); sem a TASK-032, não há botão/gate para disparar a exportação. Sequenciar depois de ambas.
- RN-039: o Serviço promovido nasce com `viagens: []` e só passa no schema strict após ≥ 1 Viagem — a etapa Viagens é obrigatória no roteiro, não opcional.
- Flakiness de E2E: garantir mock determinístico do OSRM (sem rede real — DEC-029) e prontidão do MapLibre (esperar `.maplibregl-marker`) ao criar Seções por clique no mapa.

## Perguntas em aberto

- Q-039 — **decidida (DEC-059, 2026-07-17):** re-sequenciar após a TASK-032 e simplificar o E2E (usa o botão/gate de exportação reais).

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
- Calcular ou redesenhar o estado inválido de Local em extremo — entregue pela TASK-068/DEC-070; esta task apenas **compõe** a seleção sem apagá-lo.

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
- [ ] Selecionar um Local extremo inválido **não remove nem mascara** o vermelho da linha ou a borda vermelha do marcador (DEC-070); seleção usa canal visual distinto, como contorno/fundo/`aria-current`, e os dois estados são perceptíveis simultaneamente.
- [ ] A seleção é estado de UI efêmero — não altera o JSON nem dispara recálculo.
- [ ] E2E existentes verdes sem alterar seletores; testids novos só para o realce/seleção, se houver.

## Casos válidos

- Tabela com 3 paradas → clicar na 2ª realça o 2º marcador; clicar no 1º marcador realça a 1ª linha.

## Casos inválidos

- Selecionar uma parada cujo marcador não existe no sentido atual (ex.: Local unidirecional) → sem realce no mapa, sem erro.
- Local extremo inválido selecionado → não pode parecer válido nem perder a descrição de RN-035; desselecionar preserva integralmente o estado vermelho.

## Testes esperados

- Unitários: nenhum novo de regra.
- Integração: seleção na tabela propaga ao mapa e vice-versa; nenhuma chamada de OSRM disparada pela seleção; seleção + erro RN-035 coexistem sem sobrescrita.
- E2E: selecionar na tabela e ver o marcador destacado (tiles mockados).
- Snapshot/contrato JSON: N/A (nada persistido).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` e `etapa-itinerarios.tsx` (estado de seleção compartilhado tabela↔mapa)
- Possível prop de realce em `src/shared/mapa/mapa.tsx` (marcador destacado)

## Riscos

- Estado de seleção bidirecional sem loops de atualização; realce de marcador na primitiva do mapa.
- Colisão visual seleção × erro: a borda vermelha/descrição da DEC-070 tem precedência semântica e precisa permanecer visível.
- Não regredir os E2E da TASK-060 (seletores preservados).

## Perguntas em aberto

- Nenhuma (habilitada por DEC-054).
- **Atenção (2026-07-17):** a **Q-040 foi decidida (DEC-060)** — os pontos de rota entram na tabela lateral, intercalados (TASK-079). A sincronização desta task deve projetar sobre a **lista unificada**; se esta task rodar antes da TASK-079, a 079 herda a obrigação de não quebrar o sync.
- **Atenção (2026-07-21):** a **Q-049 foi decidida (DEC-070)** — a TASK-068 entrega o estado contextual de Local extremo; seleção deve preservá-lo por composição, nunca reutilizar o vermelho como simples realce.
- **Atenção (2026-07-22):** a tabela roda dentro de um contêiner com rolagem própria (`overflow-y-auto`, TASK-074); a sincronização **mapa→tabela** desta task inclui **rolar a linha selecionada para dentro da viewport** (`scrollIntoView`), só quando a seleção tem origem no mapa (nunca no próprio clique da linha, para não "pular" sob o cursor). O **redesenho estrutural** da tabela (colunas, zebra, densidade, "X") é a **TASK-091** (bloqueada pela **Q-052**) e roda **depois** desta; se a 091 vier antes, herda a obrigação de não quebrar este sync.

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
>
> **Atualizada pela DEC-060 (2026-07-17):** o caso da **reordenação** deixou de descartar — os pontos preservam sua posição na lista unificada da tabela lateral (Q-040) e re-ancoram ao par de paradas que passa a cercá-los, com recálculo. O critério de aceite correspondente abaixo foi ajustado; os demais casos da DEC-056 permanecem.

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
- [ ] **Reordenação** → os pontos **não** são descartados (DEC-060, que supera neste caso a DEC-056): preservam sua posição na lista unificada e re-ancoram ao par de paradas que passa a cercá-los; `apos_parada_ordem` re-derivado da posição, sempre em `[1, paradas.length − 1]`.
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
- Integração: remover parada na tabela lateral de um itinerário com pontos de rota **não** produz rejeição não tratada e recalcula com os pontos re-ancorados (OSRM mockado); reordenar re-ancora pela posição na lista (DEC-060), sem descarte e sem valor fora do intervalo.
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

## TASK-068 — Vocabulário visual dos marcadores + degradação do clique sem ancoragem + erro contextual de Local em extremo

## Objetivo

Fechar o **vocabulário visual dos três marcadores** do mapa único de itinerários, hoje indistinguíveis por forma e tamanho (tudo círculo de 16 px, exceto o vértice de 9 px), e corrigir a **ressalva de merge aberta pela TASK-067**:

- **A. Vértice de ponto de rota** — cor própria **ciano**, **mantido em 9 px**, substituindo o cinza `#334155` que a TASK-063 escolheu por inferência controlada (DEC-057, com o tamanho revisto pela DEC-069).
- **B. Marcador de Seção** — passa de **círculo azul** para **quadrado azul** de 16 px; a cor não muda.
- **C. Marcador de Local** — continua **círculo verde**, agora de **12 px** (era 16 px).
- **D. Clique direito sobre a linha quando não há como ancorar** — deixa de descartar o gesto em silêncio e volta a **acrescentar a parada ao fim**, como manda a DEC-055.
- **E. Local temporariamente em extremo (DEC-070/Q-049)** — permanece na lista de edição, mas a **linha da tabela lateral correspondente ao Local** fica em estado vermelho com explicação no hover/foco e o **marcador circular verde de 12 px recebe borda vermelha** naquele itinerário/sentido. O aviso geral da TASK-047 permanece; não há OSRM, conclusão/promoção do Serviço nem exportação enquanto a RN-035 persistir.

Depois desta task, forma, cor e tamanho carregam significado independente: **quadrado azul de 16 px = Seção**, **círculo verde de 12 px = Local**, **círculo ciano de 9 px = ponto de rota** — legível mesmo por quem não distingue azul de verde. A hierarquia `9 < 12 < 16` é verificável por teste.

## Contexto

A Spec 04 §7.3 fixa "visual distinto — vértice pequeno sobre a linha, sem rótulo" e nada mais sobre aparência; a TASK-063 preencheu a lacuna com cinza `#334155` (que é o token de **texto padrão** do doc 18, não uma cor de marcador) e 9 px, marcando ambos como **inferência controlada** em [`editor-mapa-itinerario.tsx`](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx). O responsável pelo domínio decidiu o visual do vértice na conversa da `/revisar-aderencia` da TASK-063 (**DEC-057**): ciano, com mais destaque. A paleta do doc 18 §2 **não tem família ciano** — o token é novo. O cinza atual some sobre o traçado da rota, que é justamente onde o vértice vive.

Os itens **B** e **C** vêm da **DEC-069** (2026-07-21), que **supera em parte a DEC-054** (caiu "marcadores **circulares** para ambos, com diferenciação visual por cor/preenchimento") **e em parte a DEC-057** (o vértice **não** aumenta; fica em 9 px). Diferenciar só por cor era o ponto fraco do desenho: azul e verde de mesma forma e mesmo tamanho se confundem sobre o mapa e são praticamente idênticos para daltonismo do tipo deuteranopia/protanopia. Forma passa a ser o canal primário, tamanho o secundário, cor o reforço. Encolher o Local para 12 px restaura a hierarquia "parada > ponto de rota" **por baixo**, em vez de aumentar o vértice — que continua atendendo à letra do §7.3 ("vértice **pequeno**") e ganha destaque pela cor. **Nada disso toca o modelo, o contrato JSON ou a Spec 02** — aparência é governada pelo doc 18 sob DEC-050.

O item **D** é a condição de merge registrada em [`14-REVISOES/TASK-067-20260720.md`](../14-REVISOES/TASK-067-20260720.md) (problema 1): com a montagem inválida e a última rota válida ainda desenhada, `prepararInsercaoDeParada` devolve `undefined` (`etapa-itinerarios.tsx:490,499,510`) e os chamadores só retornam — a Seção/Local que o usuário acabou de nomear some sem mensagem, justamente no estado em que criar uma Seção seria a saída. Entra aqui por decisão do responsável (2026-07-21), por ser correção pequena, no mesmo ramo do mapa, e sem task própria que a cubra. **Não é regra nova:** a DEC-055 já fixa "fora da linha → acrescenta ao FIM", e os "Casos inválidos" da TASK-067 já mandam tratar `sem-rota` assim — aqui apenas se estende a mesma degradação ao caso vizinho "há linha desenhada, mas não há como ancorar".

O item **E** foi decidido pelo responsável na **Q-049/DEC-070** (2026-07-21). A montagem incremental pode conter temporariamente um Local no primeiro/último lugar, mas isso **não flexibiliza** a Spec 02 §10.1/RN-035: é estado inválido de edição, não documento válido. A ocorrência precisa ser identificada onde o usuário olha — tabela e mapa — sem depender apenas do aviso geral. O erro é por **Parada naquele itinerário e sentido**, não pela entidade Local globalmente; se o mesmo Local estiver válido no outro sentido, só a ocorrência inválida recebe os realces.

## Fora de escopo

- **Affordance de hover** sobre a linha (cursor + fantasma) — é a **TASK-069**.
- **Clique para remover** o vértice — é a **TASK-070**.
- Qualquer mudança no **contrato JSON**, no ancorador geométrico ou no motor de roteamento.
- **Cor de preenchimento** do marcador de Seção (segue azul) e do Local (segue verde) — a única cor adicional do Local é a borda vermelha quando sua ocorrência viola RN-035 (DEC-070).
- Marcador **pendente** (âmbar, `COR_MARCADOR_PENDENTE`) e o `forma: "pino"` usado fora do mapa de itinerários — inalterados.
- Rótulo, popup ou entrada na tabela de paradas para o ponto de rota — proibido por Spec 04 §7.3.
- Qualquer outra mudança de comportamento do clique posicional além da degradação do item D — a lógica de cálculo do índice, a re-ancoragem e o recálculo ficam como a TASK-067 os entregou.
- Generalizar o estado vermelho para toda `ViolacaoMontagem`: esta task marca diretamente apenas **Local no primeiro/último lugar** (RN-035); RN-034/RN-036 continuam no aviso geral da TASK-047.
- Os follow-ups menores 2 a 4 do parecer da TASK-067 (aviso de descarte preso, cobertura E2E de RN-035, comentário de acoplamento) — **não** entram; seguem como follow-up livre.

## Specs fonte

- Spec 04 §7.3 (regra "Ponto de rota não é Seção, Local nem Parada — visual distinto, vértice pequeno sobre a linha, sem rótulo, sem nome, sem município"; item 2, "insere Seções e Locais em ordem")
- Spec 04 §7 (mapa único com os três tipos; a spec não fixa aparência nem gesto)
- Spec 02 §10.1 e §14 (primeira e última Parada são sempre Seção; Local só pode ser intermediário)
- Spec 03 §3.6 (ponto de rota: definição e propósito único)

## Regras envolvidas

- RN-042 (ponto de rota sem identidade — sem rótulo, sem nome, sem município)
- RN-076 (padrão de exibição — o vértice **não** recebe rótulo `Cidade - Nome`, ao contrário da Seção)
- RN-025/031 (Seção e Local são entidades distintas — a distinção visual por forma reforça, não cria, essa separação)
- RN-052 (a degradação do item D volta a disparar o recálculo que o aborto silencioso suprimia)
- RN-035 (a parada acrescentada ao fim pode violar o extremo-Seção; validação, aviso e gate aplicam a regra já existente — não criar uma RN nova)
- DEC-070/Q-049 (a ocorrência de Local em extremo permanece editável, mas é identificada na tabela e no mapa e impede conclusão/exportação)

## Entidades afetadas

- Seção, Local, Parada e ponto de rota (aparência/estado de edição; nem o modelo nem o contrato mudam) — e o gesto de criação pelo mapa, no item D

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] O vértice de ponto de rota é **ciano**, com token novo registrado em `docs-dev/18-DESIGN_SYSTEM.md` §2 (Cores) — não um hex solto no componente.
- [ ] O marcador de **Seção** é **quadrado** azul de **16 px**; `forma: "quadrado"` é valor novo do `Mapa` de `shared/mapa`, aditivo (consumidores sem ele não mudam).
- [ ] O marcador de **Local** é **círculo verde de 12 px**, com borda/sombra proporcionais.
- [ ] O vértice de ponto de rota **continua com 9 px** — só a cor muda (DEC-069 revisa a DEC-057 neste ponto).
- [ ] **Hierarquia de tamanho verificada por teste**, não por inspeção visual: `ponto de rota (9) < Local (12) < Seção (16)`.
- [ ] As três formas são distinguíveis **sem depender da cor** (quadrado × círculo grande × círculo pequeno).
- [ ] O vértice segue **sem rótulo, sem nome, sem município e fora da tabela de paradas** (Spec 04 §7.3, RN-042) — inalterado.
- [ ] Clique direito **sobre a linha** num itinerário cuja montagem está inválida (rota antiga ainda desenhada): a Seção/Local criada **entra ao fim da lista**, o fluxo de recálculo/validação é disparado e a violação de montagem aparece na etapa — **nunca** um descarte silencioso. Se o resultado mantiver um Local no extremo, a validação recusa a montagem antes de chamar o OSRM.
- [ ] Se o item acrescentado deixar um **Local como primeira ou última Parada**, a linha da tabela lateral correspondente recebe estado de erro com `--color-erro` e explicação disponível no **hover e no foco**, sem depender somente da cor. Mensagem semanticamente equivalente a: “Este Local está no fim do itinerário. Locais (pontos de parada) só podem ocupar posições intermediárias; a última Parada deve ser uma Seção.” Para o primeiro lugar, a redação identifica o início/primeira Parada.
- [ ] O marcador dessa ocorrência mantém **círculo verde de 12 px** e recebe **borda vermelha**; Seções, pontos de rota e ocorrências válidas do mesmo Local não recebem essa borda.
- [ ] O aviso geral `avisos-montagem-invalida` da TASK-047 permanece junto do feedback contextual.
- [ ] Enquanto houver Local em extremo, o OSRM **não é chamado**, o Serviço não é concluído/promovido e a exportação permanece bloqueada; ao inserir/reordenar uma Seção e tornar o Local intermediário, linha e marcador voltam automaticamente ao estado normal.
- [ ] O bloqueio chega a `coletarPendencias`/gate de exportação como **estado efêmero da sessão ou derivação equivalente**, inclusive quando a última rota/documento válido permanece congelado; não basta manter `violacoesMontagemMapa` local à etapa. Nenhuma pendência entra no JSON (NEG-004).
- [ ] O estado inválido é isolado por itinerário/sentido; o mesmo Local válido no outro sentido não é marcado como erro.
- [ ] Clique direito sobre a linha com montagem **válida**: continua inserindo **na posição do trecho** (TASK-067 intacta).
- [ ] Nenhum `data-testid`/`aria-*` **existente** é alterado; atributos acessíveis aditivos (`aria-invalid`, `aria-describedby` ou equivalente) e testids novos mínimos podem identificar o estado contextual; E2E existentes permanecem verdes (DEC-050).
- [ ] Zero alteração no contrato JSON, no ancorador ou no motor de roteamento.

## Casos válidos

- Itinerário com rota calculada, 3 Seções, 1 Local e 2 pontos de rota: quadrados azuis de 16 px nas Seções, círculo verde de 12 px no Local, vértices ciano de 9 px sobre a linha — as três famílias distinguíveis em escala de cinza.
- Montagem válida + clique direito sobre a linha entre as paradas 2 e 3 → parada nova com `ordem` 3 (comportamento da TASK-067, preservado).
- Seção A → Local X (inválido, linha vermelha e marcador verde com borda vermelha) → acrescentar Seção B → A/X/B válido, realces removidos e rota recalculada.

## Casos inválidos

- Vértice com rótulo/popup/nome: proibido (Spec 04 §7.3) — o teste que garante a ausência de rótulo continua verde.
- Vértice do tamanho do marcador de parada (ou maior): viola "vértice **pequeno**" (§7.3) e a hierarquia da DEC-057/DEC-069.
- Local com o mesmo tamanho da Seção, ou Seção redonda: desfaz a distinção por forma/tamanho que é o objetivo da DEC-069.
- Montagem inválida (ex.: 1 parada só, ou extremo Local) + clique direito sobre a linha ainda desenhada → **não pode** sumir com a entidade criada; acrescenta ao fim e a etapa exibe o motivo da recusa.
- Local como primeira ou última Parada sem linha/marcador em vermelho, ou com erro indicado somente por cor/hover sem descrição acessível → viola DEC-070.
- Marcar a entidade Local nos dois sentidos quando só uma ocorrência é extrema → inválido; o estado é por itinerário/sentido.
- Itinerário sem rota (`sem-rota`) → não há linha, o gesto cai no caminho "fora da linha" como já cai hoje.

## Testes esperados

- Unitários: `forma`/`tamanho`/`cor` dos três marcadores em `editor-mapa-itinerario.test.tsx` (que já asserta `forma` para Seção, Local e vértice — as asserções de `"circulo"` da Seção mudam para `"quadrado"`); render do `Mapa` com `forma: "quadrado"` produzindo a classe CSS correspondente; hierarquia de tamanho aferida a partir dos tokens, não de números repetidos no teste; estado aditivo inválido aplica borda de erro sem trocar o preenchimento verde.
- Integração: o caso D — montar a etapa com montagem inválida e linha desenhada, disparar `aoCriarLocal`/`aoCriarSecao` **com** `posicaoNaLinha`, e afirmar que a parada foi acrescentada ao fim, que o recálculo ocorreu e que nada foi descartado em silêncio (OSRM mockado). Cobre os três `return undefined` de `prepararInsercaoDeParada`.
- Integração/UI: Local no primeiro e no último lugar marca exatamente a linha e o marcador daquele sentido, mantém o aviso geral, não chama OSRM/não promove e expõe descrição acessível; corrigir para posição intermediária remove ambos os realces e permite o recálculo.
- Pendências/exportação: com última rota válida preservada e `paradasEmEdicao` contendo Local extremo, `coletarPendencias` e `avaliarGateExportacao` retornam bloqueio de RN-035; corrigida a ordem, o bloqueio desaparece. O teste não pode passar apenas porque o documento antigo continua válido.
- E2E: criar Local ao fim, aferir linha vermelha + explicação, marcador com borda vermelha e bloqueio; acrescentar Seção depois e aferir recuperação. OSRM/tiles sempre mockados.
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `docs-dev/18-DESIGN_SYSTEM.md` (§2 Cores — token ciano novo; especificação das três formas e do estado inválido de marcador/linha) — **vinculante, entra junto com o código** (DEC-050/070)
- `src/app/globals.css` (`@theme` do token; `.marcador-mapa-circulo--pequeno`, tamanho do círculo de Local, classe nova do quadrado e estado de borda inválida)
- `src/shared/mapa/mapa.tsx` (`forma?: "pino" | "circulo" | "quadrado"`, criador de elemento correspondente e estado visual aditivo de marcador inválido)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (`COR_MARCADOR_PONTO_DE_ROTA`, `forma`/`tamanho` de Seção e Local)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (item D: fallback para `inserirParada`; item E: detectar Local extremo por sentido e marcar a linha da tabela com `Tooltip`/descrição acessível)
- `src/formulario/sessao.ts` e/ou `src/formulario/pendencias/pendencias.ts` (tornar a violação de montagem corrente visível ao painel/gate como estado efêmero ou derivação pura; nunca persistir no contrato)
- `testes/unitarios/formulario/pendencias.test.ts`, `testes/unitarios/formulario/gate-exportacao.test.ts` e `testes/e2e/revisao-exportacao.spec.ts` (bloqueio real apesar da última rota válida e liberação após correção)
- `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`, `testes/unitarios/mapa/mapa.test.tsx`, `testes/unitarios/formulario/etapa-itinerarios.test.tsx`

## Riscos

- **O destaque do vértice tem que vir todo da cor.** Com o tamanho congelado em 9 px (DEC-069), o ciano é o único canal que separa o ponto de rota do traçado — se o tom escolhido for tímido, o problema que a DEC-057 queria resolver (o cinza sumindo sobre a linha) volta inteiro. Escolher tom que se destaque **do traçado da rota**, não só do fundo do mapa.
- **9 px e 12 px ficam próximos.** A diferença Local × vértice é de 3 px; garantir que borda e sombra reforcem a distinção (o vértice já usa borda mais fina e `sombra-1`), sob pena de a hierarquia existir só no CSS e não aos olhos.
- Quadrado e círculo de mesmo lado/diâmetro parecem tamanhos diferentes ao olho (o quadrado "pesa" mais); ajustar por área percebida, não por número igual.
- O item D é a única parte com risco de comportamento: cuidado para **não** reintroduzir o append ao fim no caminho em que a ancoragem **funciona** — a TASK-067 tem testes que pegam isso, mantê-los verdes.
- O vermelho de RN-035 não pode substituir o verde do Local nem depender só de cor/hover; borda, estado da linha e descrição acessível precisam apontar a mesma ocorrência.
- **Rota válida antiga pode mascarar o rascunho inválido no gate.** O estado/derivação da violação corrente precisa ser consumido por pendências/exportação; testar só o aviso local não atende a DEC-070.
- A seleção da TASK-064 e o segundo plano por sentido da TASK-076 devem compor com o erro, não sobrescrevê-lo; os critérios dessas tasks foram atualizados pela DEC-070.

## Dependências

- **DEC-069** (2026-07-21) — ✅ **registrada**; era o que bloqueava os itens B e C (a DEC-054 vigente dizia "marcadores circulares para ambos"). A task está **desbloqueada**.
- **DEC-070/Q-049** (2026-07-21) — ✅ **registrada**; fixa o tratamento contextual do Local em extremo e as obrigações de preservação nas TASK-079/064/076.
- TASK-067 (✅ implementada em `b2b3ab7`, aprovada com ressalvas) — o item D é a condição de merge dela.

## Perguntas em aberto

- Nenhuma. Formas e tamanhos estão fixados pela DEC-069; a cor ciano, pela DEC-057; o tratamento do Local extremo, pela DEC-070/Q-049. O **tom exato** do ciano e o **raio de canto** do quadrado são escolha de design sob DEC-050/doc 18, a resolver na implementação sem consulta.

---

## TASK-069 — Affordance de hover sobre a linha da rota (cursor + vértice fantasma na posição do clique)

## Objetivo

Passar o mouse sobre a linha da rota passa a **mudar o cursor** (deixando de indicar pan) e a **mostrar sobre o traçado um vértice "fantasma"** na posição exata em que o clique criaria o ponto de rota. O gesto da Spec 04 §7.3 item 6 deixa de ser descoberto por tentativa e erro.

## Contexto

A Spec 04 §7.3 item 6 manda que clicar sobre a linha crie um vértice, e a TASK-063 entregou o gesto — mas **nada na tela diz que a linha é clicável**: o cursor continua o de pan, e o usuário só descobre o recurso pela frase de ajuda em `dica-gestos-mapa`. O responsável decidiu a affordance na conversa da `/revisar-aderencia` da TASK-063 (**DEC-057**). O caro já está pronto: `projetarNaLinha` ([`src/shared/mapa/ancoragem.ts`](../../src/shared/mapa/ancoragem.ts), TASK-063) calcula a projeção de um ponto qualquer sobre o traçado, e o `Mapa` já faz hit-test na camada `ID_CAMADA_LINHAS` com tolerância de 6 px ([`mapa.tsx`](../../src/shared/mapa/mapa.tsx)). Falta expor a coordenada projetada, o `mousemove`, o cursor e o marcador de pré-visualização. A **DEC-072/Q-051** decidiu que fantasma e clique usam essa mesma projeção: o ponto de rota é criado exatamente sobre a linha, no ponto dela mais próximo do clique bruto.

## Fora de escopo

- **Cor/tamanho** do vértice real — é a **TASK-068** (o fantasma reusa o token de lá; por isso 068 vem antes).
- **Clique para remover** o vértice — é a **TASK-070**.
- Mover/remover ponto de rota — comportamento da TASK-063, **inalterado**. A criação recebe apenas o ajuste estreito da DEC-072: usa a mesma coordenada projetada antecipada pelo fantasma.
- Affordance do **clique direito** (menu Seção/Local) — é a TASK-065.
- Qualquer mudança no contrato JSON, no ancorador **lógico** (`apos_parada_ordem`) ou no motor de roteamento. Exceção estreita da DEC-072: `projetarNaLinha` ganha, de forma aditiva, a coordenada projetada que hover e clique compartilham.
- Chamar OSRM no hover — **proibido**: passar o mouse não é editar (RN-052); nenhuma requisição sai de um `mousemove`.

## Specs fonte

- Spec 04 §7.3 item 6 (clicar sobre a linha da rota cria um vértice arrastável)
- Spec 04 §7.3 (regra "vértice pequeno sobre a linha, sem rótulo")
- Spec 03 §3.6 (ponto de rota ancorado ao trecho que molda)

## Regras envolvidas

- RN-052 (rota recalculada **ao editar** — hover **não** é edição: zero chamada ao OSRM)
- RN-042 (o fantasma não é ponto de rota: não existe no modelo, não é persistido, não tem `apos_parada_ordem` gravado)
- RN-096 / NEG-004 (pré-visualização é estado de UI efêmero, nunca gravado)
- DEC-072/Q-051 (fantasma e criação usam a mesma coordenada projetada sobre a linha)

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
- [ ] Ao clicar dentro da tolerância da linha, o ponto de rota é criado na **mesma coordenada projetada** mostrada pelo fantasma, não na coordenada bruta do cursor (DEC-072).
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

- Unitários: `projetarNaLinha` devolve a coordenada pertencente ao traçado mais próxima do cursor; hover e clique entregam a mesma projeção; o editor rende o marcador fantasma nessa posição e o remove ao sair.
- Integração: hover não dispara recálculo (contador de chamadas do OSRM mockado permanece em zero).
- E2E: mover o mouse sobre a linha mostra o fantasma; afastar some (OSRM/tiles mockados).
- Snapshot/contrato JSON: N/A.
- PDF: N/A.

## Arquivos prováveis

- `src/shared/mapa/mapa.tsx` (`mousemove`/`mouseleave` na camada de linhas, cursor via `getCanvas().style.cursor`, callback aditivo)
- `src/shared/mapa/ancoragem.ts` (extensão aditiva do retorno com a coordenada projetada — DEC-072)
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

## TASK-070 — Clicar sobre o vértice remove o ponto de rota (exclusivo do ponto de rota) — **CANCELADA (2026-07-24)**

> **CANCELADA por decisão do responsável (2026-07-24): NÃO IMPLEMENTAR.** O botão "Remover" da tabela lateral já cobre a remoção de ponto de rota de forma simples e suficiente; o gesto de clique no mapa acrescentaria complexidade e risco (distinguir clique de arraste, remoção acidental) sem ganho percebido de uso. O texto abaixo é mantido só como registro histórico do que foi analisado — não descreve trabalho pendente. Referências cruzadas em outras tasks/documentos (TASK-078, TASK-097, TASK-099, `19-STATUS_EXECUCAO.md`) foram atualizadas para não depender mais desta task. A parte da DEC-057 que previa este gesto está marcada como cancelada em `10-DECISION_LOG.md`.

## Objetivo (histórico — não implementar)

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
- **Depende da TASK-097** (acrescentado em 2026-07-24): enquanto o arrasto perto da linha for revertido pelo re-render do hover, um arrasto legítimo termina sem deslocamento efetivo e fica a um passo de ser lido como clique — ou seja, como **remoção**. Rodar a 070 antes da 097 troca um bug inócuo (gesto que não faz nada) por um destrutivo (gesto que apaga o ponto). Acrescentar critério de aceite: arrasto **sobre a linha** move e nunca remove, com o hover ativo durante o gesto.

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

## TASK-073 — Tela inicial: cartões inteiros clicáveis com hover e diálogo de confirmação ao lado

## Objetivo

Na tela inicial, os dois cartões ("Carregar JSON existente" e "Criar Autos do zero") passam a ser **superfícies de ação inteiras**: pôr o mouse sobre qualquer ponto do cartão dá feedback visual (fundo acinzentado/estado hover) e clicar em qualquer ponto dispara a ação — sem depender do input de arquivo cru nem do botão interno. O diálogo de confirmação do "criar do zero" abre **ao lado** dos cartões (não abaixo), sem empurrar o layout.

## Contexto

Relato do responsável em teste manual (2026-07-17): "não dá pra saber onde precisa clicar para escolher um JSON; não tem efeito de hover como ocorre com o botão criar do zero". Hoje (`src/formulario/tela-inicial/tela-inicial.tsx`, TASK-013/052) o cartão de carregar expõe um `<input type="file">` cru (`data-testid="input-arquivo-json"`) e o de criar tem um `Botao` pequeno; o `alertdialog` (`aviso-criar-zero`) renderiza abaixo. É mudança de **aparência/afordância** sob DEC-050/doc 18 — os fluxos e validações são preservados. **Q-045 decidida (DEC-065, opção B):** o aviso obrigatório ganha nova redação na Spec 04 §3.2; o texto proposto está na DEC-065, aguardando o dono da spec substituir o placeholder da §3.2 — esta task adota o **literal final da spec** no diálogo (o placeholder nunca vai para a UI).

## Fora de escopo

- Alterar qualquer fluxo/validação de importação ou criação (TASK-006/013 — reusar como estão).
- Redigir/editar a Spec 04 §3.2 (o texto da DEC-065 é colado pelo dono; a task só consome o literal final).
- O reforço de recomendação para Autos `operante` (Spec 04 §3.2, parte final — segue com a TASK-015/075).

## Specs fonte

- Spec 04 §3 (duas ações lado a lado; recomendação do "carregar"), §3.1/§3.2 (fluxos e avisos — inalterados)
- `docs-dev/18-DESIGN_SYSTEM.md` (DEC-050 — estados de hover, sombras, flutuantes)

## Regras envolvidas

- RN-004/016/017 (comportamentos da tela preservados — não reimplementar)

## Entidades afetadas

- Nenhuma (só superfície de UI)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] O cartão "Carregar JSON existente" inteiro é clicável (abre o seletor de arquivo) e tem estado hover visível; o input de arquivo cru deixa de ser a única área ativa (o `data-testid="input-arquivo-json"` continua existindo e funcional para os E2E).
- [ ] O cartão "Criar Autos do zero" inteiro é clicável (abre o diálogo) e tem estado hover visível.
- [ ] O diálogo de confirmação abre **ao lado** da área dos cartões (posicionamento lateral em tela larga; empilha no estreito), com `sombra-3` de flutuante (doc 18 §5), sem sobrepor de forma bloqueante.
- [ ] O diálogo exibe o texto do aviso obrigatório **conforme fixado na Spec 04 §3.2** (nova redação da DEC-065, após o dono substituir o placeholder), na íntegra; o E2E que asserta o texto é atualizado junto (mudança deliberada).
- [ ] Acessibilidade preservada: cartões operáveis por teclado (foco visível, `Enter`/`Espaço`), `alertdialog` com foco gerenciado.
- [ ] Nenhum `data-testid`/`aria-*` existente alterado; E2E atuais verdes sem trocar seletores.

## Casos válidos

- Clicar no meio do texto do cartão de carregar abre o seletor de arquivo; escolher um JSON válido segue o fluxo atual.
- Clicar no cartão de criar abre o diálogo ao lado; confirmar entra no modo novo.

## Casos inválidos

- JSON inválido → mesma mensagem de erro atual (`mensagem-erro-carregar`).
- Cancelar o diálogo → volta ao estado inicial, nada criado.

## Testes esperados

- E2E existentes da tela inicial verdes; caso novo leve: clique na área do cartão (fora do input/botão) dispara a ação.
- Conferência visual (hover, posicionamento do diálogo).

## Arquivos prováveis

- `src/formulario/tela-inicial/tela-inicial.tsx`
- `src/shared/ui/` (se o padrão "painel clicável" virar variante de `Painel`)

## Riscos

- Cartão inteiro clicável contendo controles internos (input/botões): evitar duplo disparo e manter o input funcional para os E2E.
- Posição lateral do diálogo em telas estreitas — definir o empilhamento.

## Dependências

- TASK-052 (entregue). **DEC-065** (decidida) — o texto final precisa estar fixado na Spec 04 §3.2 pelo dono antes de a task tocar o literal do diálogo (o restante da task não depende disso).

## Perguntas em aberto

- Nenhuma (Q-045 decidida pela DEC-065). Pendência **do dono da spec**: colar na §3.2 o texto proposto na DEC-065 (ou redação própria equivalente).

---

## TASK-074 — Coluna lateral da etapa de itinerários: reuso de Seção acima da tabela de paradas + rolagem própria da tabela

## Objetivo

Na etapa "Seções, Locais e Itinerários": o painel **"Reutilizar Seção existente"** sai de baixo do mapa e passa a viver na **coluna lateral, acima da tabela de paradas**; a tabela de paradas ganha **rolagem vertical própria**, limitada à altura do mapa, em vez de crescer indefinidamente para baixo.

## Contexto

Relato do responsável (2026-07-17): "reutilizar seções existentes está mal localizado — deve ficar acima da tabela PARADA|AÇÕES ao lado do mapa; e a tabela, caso fique maior que o mapa, deve ter barra de rolagem própria". Hoje o painel de reuso (`data-testid="reuso-secoes"`) renderiza dentro do `EditorMapaItinerario`, abaixo do mapa (`editor-mapa-itinerario.tsx`), enquanto a tabela (`tabela-paradas`) fica na coluna lateral (`etapa-itinerarios.tsx`, `coluna-paradas`) sem limite de altura. É reorganização de **layout** sob DEC-050/doc 18 §5 (mapa em destaque + tabela lateral); nenhuma regra de reuso/350 m/montagem muda. Se a Q-043 for decidida (reuso passa a ofertar só Seções de outros Serviços), o **conteúdo** do dropdown muda na TASK-077 — esta task só muda o **lugar**.

## Fora de escopo

- Filtrar as Seções ofertadas no reuso (Q-043/TASK-077).
- Sincronização seleção tabela↔mapa (TASK-064) e intercalação de pontos de rota (Q-040/TASK-079).
- Qualquer regra de reuso, 350 m, montagem ou recálculo.

## Specs fonte

- Spec 04 §7 (mapa em destaque + tabela lateral), §7.1 (reutilização de Seções — comportamento inalterado)
- `docs-dev/18-DESIGN_SYSTEM.md` §5 (DEC-050; rolagem própria de conteúdo largo/alto)

## Regras envolvidas

- RN-025..027 (reuso/350 m — comportamento preservado)
- RN-076 (rótulo `Cidade - Nome da Seção` — preservado)

## Entidades afetadas

- Nenhuma (layout)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] O painel "Reutilizar Seção existente" aparece na coluna lateral, **acima** da tabela de paradas, com o mesmo comportamento (mesmos `data-testid`: `reuso-secoes`, `select-secao-reuso`, `select-ponto-reuso`, `confirmar-reuso`).
- [ ] A tabela de paradas tem contêiner com `overflow-y: auto` e altura máxima atrelada à altura do mapa — a coluna lateral não cresce além da linha visual do mapa.
- [ ] Em tela estreita (empilhado), a rolagem própria continua funcional.
- [ ] Nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes sem trocar seletores.

## Casos válidos

- Itinerário com 20 paradas: a tabela rola internamente; o mapa e o painel de reuso permanecem visíveis.
- Reutilizar uma Seção pelo painel na nova posição funciona como hoje.

## Casos inválidos

- Recusa de 350 m no reuso → mesma mensagem atual, exibida em posição visível junto ao painel.

## Testes esperados

- E2E existentes verdes; conferência visual da rolagem.
- Integração leve: o painel de reuso continua disparando `aoAtualizarSecao` (nenhuma mudança de comportamento).

## Arquivos prováveis

- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (extrair o painel de reuso, ou expô-lo como slot)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (coluna lateral: reuso acima da `Tabela`; wrapper com rolagem)

## Riscos

- O painel de reuso usa estado interno do `EditorMapaItinerario` (mensagens de recusa) — extrair sem duplicar estado.
- Altura "igual à do mapa" (hoje `h-[60vh]`) — usar a mesma referência para não dessincronizar.

## Dependências

- TASK-060 (entregue). Independente das demais; recomendável **antes** de TASK-064/079 (que mexem na mesma coluna).

## Perguntas em aberto

- Nenhuma (aparência sob DEC-050).

---

## TASK-075 — Etapa Identificação: pré-visualização do Autos e confirmação explícita antes de congelar (DEC-064)

## Objetivo

No fluxo "novo", escolher um Autos no dropdown **não cria mais o documento na hora**: exibe um painel de pré-visualização com os dados do registro escolhido — código, denominação da linha (origem–destino), empresa, tipo e situação (`operante`) — permitindo trocar a seleção livremente. O botão **"Confirmar Autos"** é o ato que cria o documento e congela `codigo`/`empresa` (Spec 04 §5); depois de confirmado, o Autos não pode mais ser trocado.

## Contexto

Relato do responsável (2026-07-17): "só de escolher o Autos já congela ID e empresa; deve aparecer os dados do Autos escolhido e só congelar após clicar confirmar". Hoje `aoSelecionarAutos` (`src/formulario/identificacao/identificacao.tsx`) comita a identidade no primeiro `onChange` — inferência controlada da TASK-015 ("a seleção é o ato de criar o documento") que a Q-044 reabre. A lista estática (`data/autos_empresas.json`, DEC-030) já tem todos os campos da pré-visualização: `codigo`, `denominacao_linha`, `empresa_id`, `tipo`, `operante`. A exibição de `operante` também serve ao reforço da Spec 04 §3.1 (Autos que já opera → recomendar carregar o JSON vigente).

## Fora de escopo

- O modo "carregado" (identidade vem do JSON — inalterado).
- A editabilidade do `tipo` e a reconversão (DEC-034 — inalteradas; o tipo segue editável após a confirmação).
- Mudança de contrato/listas estáticas (nenhum campo novo).
- Desfazer a confirmação depois de dada (Spec 04 §5 volta a valer: não editável após criado).

## Specs fonte

- Spec 04 §5 (Identificação; "não editável após criado o documento" — a Q-044 fixa o momento da criação)
- Spec 04 §3.1 (final — reforço da recomendação de carregar quando o Autos já é operante)
- Spec 01 §8 (listas estáticas)

## Regras envolvidas

- RN-016 (identificação vem das listas estáticas)
- RN-023/DEC-034 (troca de tipo — preservada)
- RN-096/NEG-004 (tudo estado de sessão efêmero)

## Entidades afetadas

- Autos (identidade de sessão; nenhuma mudança de contrato)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Escolher um Autos no dropdown exibe a pré-visualização (código, denominação da linha, empresa, tipo, selo de situação `operante`/não operante) **sem** criar o documento.
- [ ] Trocar a seleção antes de confirmar atualiza a pré-visualização, sem efeito colateral.
- [ ] "Confirmar Autos" cria o documento (identidade fixada, `status: proposta`) e congela `codigo`/`empresa`; o seletor deixa de ser exibido.
- [ ] Após confirmar, não há caminho de troca do Autos (Spec 04 §5).
- [ ] Autos `operante: true` exibe o reforço recomendando carregar o JSON vigente (Spec 04 §3.1) na pré-visualização.
- [ ] `data-testid`/`aria-*` existentes preservados (`seletor-autos`, `campo-codigo`, `campo-empresa`, `select-tipo`, `selo-status-identificacao`); testids novos só para a pré-visualização e o botão de confirmação.
- [ ] E2E existentes verdes (ajuste apenas do passo novo de confirmação, se algum E2E cria documento do zero pela Identificação).

## Casos válidos

- Escolher Autos A → conferir → trocar para Autos B → confirmar B → identidade é B; etapas seguintes funcionam como hoje.

## Casos inválidos

- Confirmar sem seleção → botão desabilitado.
- Depois de confirmado, o dropdown não é mais renderizado — sem troca.

## Testes esperados

- Unitários/integração: seleção não comita sessão; confirmação comita; troca antes de confirmar; reforço do `operante`.
- E2E: fluxo novo passa pela confirmação (atualizar specs que hoje assumem congelamento imediato).

## Arquivos prováveis

- `src/formulario/identificacao/identificacao.tsx` (estado local de "seleção candidata" + painel de pré-visualização + confirmação)
- `testes/unitarios/formulario/identificacao*.test.tsx`, `testes/e2e/*` que criem documento do zero

## Riscos

- E2E existentes que dependem do congelamento imediato precisam do passo extra — atualização deliberada, registrada na task.
- `denominacao_linha` não está no contrato do documento (é só das listas) — exibir sem persistir.

## Dependências

- **DEC-064** (decidida — task liberada). TASK-053 (entregue).

## Perguntas em aberto

- Nenhuma (Q-044 decidida pela DEC-064).

---

## TASK-076 — Ida e Volta visíveis no mesmo mapa: abas de sentido ativo, numeração na ordem da viagem, Volta tracejada e dois painéis de descrição (DEC-062) — **CANCELADA (2026-07-24)**

> **CANCELADA por decisão do responsável (2026-07-24): NÃO IMPLEMENTAR.** A troca entre Ida e Volta pela aba já é simples e a informação de cada sentido já está bem estruturada; não há ganho percebido em exibir os dois sentidos simultaneamente no mesmo mapa, e a task era o maior refactor pendente do backlog (complexidade 5). O texto abaixo é mantido só como registro histórico do que foi analisado — não descreve trabalho pendente. Referências cruzadas em outras tasks/documentos (TASK-077, TASK-078, TASK-093, TASK-097, TASK-099, `19-STATUS_EXECUCAO.md`) foram atualizadas para não depender mais desta task. A DEC-062 está marcada como cancelada em `10-DECISION_LOG.md`.

## Objetivo (histórico — não implementar)

Um **único mapa** exibe simultaneamente os marcadores e as rotas de Ida e de Volta (Ida em linha cheia, Volta **tracejada**, cores próprias por sentido), com **checklist de visibilidade** por sentido. O **sentido ativo** é escolhido por **botão tipo aba** (Ida/Volta) e rege a tabela lateral (Seções, Locais e pontos de rota do sentido ativo, na ordem em que o veículo passa). Os itens ficam **numerados (1, 2, 3…) na ordem da viagem** nos marcadores do mapa, conforme a tabela lateral do sentido ativo; o ponto do sentido **inativo** de uma Seção aparece na mesma tonalidade, levemente acinzentado, em **segundo plano** (ativo sempre à frente). Os **dois painéis de descrição textual** (Ida e Volta) aparecem embaixo, cada um com copiar / recalcular / ver itens estruturados (Spec 04 §7.4).

## Contexto

Pedido do responsável (2026-07-17), **decidido pela DEC-062**. Hoje `etapa-itinerarios.tsx` renderiza um sentido por vez (`seletor-sentido` com botões Ida/Volta), e o `PainelDescricaoItinerario` só do sentido ativo. A Spec 04 §7.4 manda o painel "para **cada** Serviço e sentido" — compatível com exibir os dois. Alvo de gesto (DEC-062): arrastar um marcador edita o sentido daquele marcador; gestos ambíguos (criar por clique direito, clique na linha) vão para o **sentido ativo** (a aba). O recálculo continua **por sentido** (RN-052), inclusive `sem-rota` e violações de montagem, exibidos por sentido. A numeração é indicação posicional de UI (RN-042 intocada); a tabela lateral é a lista unificada da DEC-060 (TASK-079).

## Fora de escopo

- Espelhamento automático da Volta e regra de ordem inversa (Q-043/TASK-077 — independente; os dois convivem).
- Gestos de criação/menu (DEC-055/TASK-065) e inserção posicional (TASK-067) — inalterados; apenas ganham o alvo de sentido definido pela Q-042.
- Sincronização seleção tabela↔mapa (TASK-064).
- Qualquer regra de OSRM/350 m/montagem/descrição; qualquer mudança de contrato.
- Recalcular a regra de Local extremo — pertence à TASK-068/DEC-070; esta task apenas preserva e separa corretamente o estado já derivado por sentido.

## Specs fonte

- Spec 04 §7 (mapa único da etapa), §7.3 (montagem/recálculo por sentido), §7.4 (painel de descrição por Serviço e sentido)
- `docs-dev/18-DESIGN_SYSTEM.md` (DEC-050 — cores por sentido, tracejado, legenda; tokens novos se necessários, registrados no doc 18 §2)

## Regras envolvidas

- RN-046/052 (recálculo por sentido — preservado; exibir os dois não recalcula nada)
- RN-015 (rotas congeladas desenhadas sem recalcular)
- RN-030 (conjunto de Seções Ida=Volta — o aviso existente permanece)
- RN-076 (rótulos — preservados)

## Entidades afetadas

- Itinerário, Rota, Seção, Local, ponto de rota (só apresentação/alvo de gesto)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Com um Serviço bidirecional selecionado, o mapa exibe as duas rotas (quando existem): Ida em linha cheia, Volta **tracejada**, cores distintas (tokens do doc 18), com legenda.
- [ ] Checklist de visibilidade por sentido: ocultar um sentido remove seus marcadores e linha do mapa sem alterar dados.
- [ ] O sentido ativo é escolhido por **botão tipo aba** (Ida/Volta); trocar a aba troca o conteúdo da tabela lateral (itens do sentido ativo, na ordem de passagem — lista unificada da DEC-060).
- [ ] Os marcadores do sentido ativo exibem a **numeração 1..n na ordem da viagem**, idêntica à ordem da tabela lateral; o ponto do sentido inativo de uma Seção fica na mesma tonalidade, levemente acinzentado, em segundo plano, com o ativo sempre à frente (z-order).
- [ ] Arrastar um marcador edita o sentido daquele marcador (revalidação 350 m e recálculo **do sentido dele**).
- [ ] Gestos sem alvo natural (criar por clique direito, clique na linha) vão para o **sentido ativo** (a aba — DEC-062).
- [ ] Os dois painéis de descrição (Ida e Volta) aparecem embaixo, cada um com copiar/recalcular/ver estruturado; recalcular um sentido não toca o outro.
- [ ] Estados `sem-rota`/violações de montagem exibidos por sentido, sem ambiguidade.
- [ ] Um Local extremo inválido em apenas um sentido mantém a linha vermelha na tabela desse sentido e a borda vermelha somente no marcador correspondente; o marcador do mesmo Local no outro sentido permanece normal quando sua ocorrência for intermediária (DEC-070).
- [ ] O tratamento de segundo plano/acinzentado do sentido inativo não apaga nem transfere a borda de erro; ao trocar o sentido ativo, a tabela mostra o estado da lista daquele sentido.
- [ ] Abrir JSON desenha as duas rotas congeladas **sem** chamar OSRM (RN-052/RN-015).
- [ ] Serviço unidirecional: comportamento equivalente ao atual (um sentido só).
- [ ] `data-testid`/`aria-*` existentes preservados onde a estrutura sobreviver; mudanças de seletor só as inevitáveis pela remoção das abas, registradas e com E2E atualizados na mesma task.

## Casos válidos

- Serviço "ambos" com as duas rotas: alternar visibilidade; arrastar ponto da Volta recalcula só a Volta; os dois painéis de descrição atualizam de forma independente.

## Casos inválidos

- Ida `recalculada` e Volta `sem-rota` (OSRM mockado): a linha da Ida permanece; a mensagem de falha aparece atribuída à Volta.
- Ocultar um sentido não dispara recálculo nem altera a sessão.
- Local intermediário na Ida e extremo na Volta → somente a ocorrência/marcador da Volta fica em erro; ocultar/mostrar sentidos não contamina a Ida.

## Testes esperados

- Integração: duas linhas passadas ao `<Mapa>` (cheia/tracejada); visibilidade filtra; alvo de gesto por marcador; zero chamada OSRM na abertura (espião ativo, DEC-042); estado inválido de Local isolado por sentido.
- E2E: fluxo bidirecional com os dois sentidos visíveis e Local inválido em apenas um deles (OSRM/tiles mockados).

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (estado por sentido em paralelo; dois painéis de descrição)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (marcadores/linhas dos dois sentidos; alvo de gesto)
- `src/shared/mapa/mapa.tsx` (estilo tracejado em `LinhaMapa` — extensão aditiva)
- `docs-dev/18-DESIGN_SYSTEM.md` (tokens/espec do tracejado e cores por sentido)

## Riscos

- **Refator grande** sobre a superfície mais ativa do app; rodar **depois** do ramo pendente do mapa (TASK-064..071) para não retrabalhar.
- O modelo atual de estado é fortemente indexado por `(servicoUuid, sentido)` — favorece a mudança, mas os handlers assumem "sentido selecionado" único em vários pontos.
- Tabela lateral: definir na análise se mostra o sentido ativo (recomendado, com a Q-043 tornando a Volta derivada) ou as duas listas.
- Composição visual por sentido: numeração, segundo plano e erro RN-035 precisam coexistir sem fazer um Local válido parecer inválido.
- **Re-render durante gesto de arrasto** (acrescentado em 2026-07-24): abas de sentido e dois painéis de descrição multiplicam os re-renders desta superfície, e cada render sincroniza os marcadores do mapa. A **TASK-097** estabelece o invariante que impede isso de reverter um arrasto em curso (`sincronizarMarcadores` não reposiciona o marcador em arrasto); rodar a 076 antes da 097 reintroduz o defeito por um caminho novo. Não é dependência dura, mas a ordem 097 → 076 é fortemente recomendada, e a análise da 076 deve reafirmar o invariante.

## Dependências

- **DEC-062** (decidida — task liberada). Recomendado: após TASK-064..071 e a TASK-079 (lista unificada que a aba rege); depende também da TASK-068/DEC-070 para preservar o estado contextual por sentido. Recomendado também **após a TASK-097** (invariante de arrasto — ver Riscos).

## Perguntas em aberto

- Nenhuma (Q-042 decidida pela DEC-062; com a DEC-063, a tabela da Volta é derivada da Ida e a aba rege os ajustes por sentido).

---

## TASK-077 — Volta espelhada: montagem automática na ordem inversa da Ida + reuso ofertando só Seções de outros Serviços (DEC-063)

## Objetivo

Num Serviço bidirecional, montar a **Ida** passa a montar a **Volta automaticamente na ordem inversa** (Seções A→B→C na Ida ⇒ Volta C→B→A, com os pontos de Volta pré-posicionados conforme a criação espelhada já existente); a edição da Volta se restringe ao que é legitimamente por sentido (posições de pontos, Locais, pontos de rota — e, se a Q-043 decidir a opção B, reordenação com aviso). O painel "Reutilizar Seção existente" deixa de ofertar Seções já usadas no Serviço corrente — reuso passa a servir para trazer Seções **de outros Serviços** (e, num Serviço bidirecional, a Seção reutilizada entra nos dois sentidos, na posição inversa correspondente).

## Contexto

Pedido do responsável (2026-07-17): "ABCD sempre volta DCBA — não sendo necessário reutilizar a seção já usada na ida". **Decidido pela DEC-063 (opção A — regra dura):** o dono da spec **já editou a Spec 02 §14** ("se na ida as seções são ABCD, na volta necessariamente são DCBA") e atualizou a RN-030 no RULE_INDEX — a validação estrutural nova em `validarServico` está **no escopo desta task**, com base na spec editada; importação recusa Volta fora da ordem inversa (trava dura, tratamento estrutural existente da RN-030). Hoje a Volta nasce vazia e é montada à mão, e o reuso oferta todas as Seções do documento (inclusive as do próprio Serviço) exatamente para viabilizar essa montagem manual. A Spec 04 §7.1 já manda a criação espelhada dos **pontos**; esta task espelha o **itinerário** (lista `paradas[]`). Locais e pontos de rota permanecem livres por sentido (Spec 02 §14). DEC-071 define comportamento de locais e pontos de rota da volta/ida alteradas ao montar automaticamente.

## Fora de escopo

- A exibição simultânea Ida+Volta no mapa (Q-042/TASK-076 — independente).
- Edição da Spec 02 §14 (ação do dono da spec, se opção A).
- Regra dos 350 m, criação espelhada de pontos, exclusão de sentido de Local — inalteradas.
- Reconciliação de horários (TASK-046) e re-ancoragem de pontos de rota (TASK-066) — reusadas como estão; o espelhamento dispara os mesmos caminhos de mudança de itinerário já existentes.

## Specs fonte

- Spec 02 §14 (validação de conjunto Ida=Volta; ordem — conforme Q-043), §10/§10.1 (itinerários e paradas)
- Spec 04 §7.1 (criação espelhada; reutilização de Seções), §7.2 (Locais por sentido)
- Spec 03 §4.2 (matriz por posições — indiferente à ordem, mas recalculada quando o itinerário muda)

## Regras envolvidas

- RN-030 (conjunto Ida=Volta — o espelhamento a satisfaz por construção; RULE_INDEX a atualizar conforme a decisão)
- RN-004/001 (nenhuma UUID nova no espelhamento — as mesmas Seções são referenciadas)
- RN-033..036 (validações de Parada — a Volta espelhada nasce válida: extremos Seção, geoloc do sentido exigida)
- RN-052/054..057 (recálculo e matriz ao mudar itinerário — dos dois sentidos quando o espelhamento muda ambos)

## Entidades afetadas

- Itinerário, Parada, Seção (Volta derivada da Ida); Local e ponto de rota (livres por sentido)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Inserir/remover Seção na Ida de um Serviço bidirecional reflete na Volta na posição inversa correspondente, no mesmo commit de sessão; a Volta de um Serviço com Ida A→B→C é C→B→A.
- [ ] Reordenar Seções na Ida reordena a Volta para o inverso (e vice-versa, se a edição da Volta for permitida pela decisão).
- [ ] Locais e pontos de rota **não** são espelhados — cada sentido tem os seus (Spec 02 §14; Spec 04 §7.2).
- [ ] O recálculo de rota dispara para os sentidos alterados (RN-052) e a matriz reconcilia (RN-054..057).
- [ ] O dropdown de reuso não oferta Seções já presentes no itinerário do Serviço corrente; oferta as demais Seções do documento (RN-025 — Seções de outros Serviços).
- [ ] Reutilizar uma Seção num Serviço bidirecional insere a parada nos dois sentidos (posição inversa na Volta), com as contribuições de geoloc dos dois sentidos (sob 350 m).
- [ ] Sequência de Seções da Volta divergente do inverso da Ida é **inválida** (validação estrutural nova em `validarServico`, Spec 02 §14 editada — DEC-063); importação/exportação/Revisão recusam (trava dura da RN-030).
- [ ] UUIDs preservadas (RN-004); nenhum campo novo no contrato.
- [ ] `data-testid`/`aria-*` existentes preservados; E2E atualizados onde o fluxo de montagem da Volta mudou (mudança deliberada, registrada).

## Casos válidos

- Montar Ida A→B→C (Serviço "ambos") → Volta nasce C→B→A sem nenhum gesto; ajustar a posição do ponto de Volta de B (sob 350 m) não muda a ordem.
- Reutilizar Seção de outro Serviço no meio da Ida → entra na posição inversa correspondente da Volta.

## Casos inválidos

- Importar JSON com Volta fora da ordem inversa → recusa estrutural (DEC-063; mesmo tratamento da trava dura da RN-030).
- Excluir o ponto de Volta de um Local (unidirecional) não afeta a Ida — como hoje.
- O reuso não lista Seção já usada no Serviço corrente (asserção de filtro).

## Testes esperados

- Unitários do motor de espelhamento (inserir/remover/reordenar na Ida ⇒ Volta inversa; Locais/pontos de rota intocados; UUIDs preservadas — round-trip).
- Integração: montagem da Ida popula a Volta; promoção no modo novo (DEC-053) com "ambos" funciona com a Volta derivada; reuso filtrado.
- E2E: fluxo bidirecional monta só a Ida e exporta com a Volta inversa válida (OSRM mockado).

## Arquivos prováveis

- `src/formulario/itinerarios/motor-montagem.ts` (espelhamento como função pura sobre as duas listas)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (aplicar o espelho no commit dos gestos de Seção)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (filtro do reuso)
- `src/shared/contrato/validacoes-estruturais.ts` (validação nova da ordem inversa — Spec 02 §14 já editada pelo dono, DEC-063)
- `docs-dev/01-RULE_INDEX.md` (RN-030 — **já atualizada pelo dono**; conferir Traceability se necessário)

## Riscos

- **Fixtures e JSONs existentes** com Volta fora da ordem inversa passam a ser inválidos — revisar fixtures canônicas (TASK-041) e o snapshot de contrato ao introduzir a validação.
- Espelhar no commit certo: os gestos hoje comitam um sentido por vez (`aplicarNovasParadas`); o espelho dobra o commit para os dois sentidos e dispara **dois** recálculos — atenção a corridas (padrão `sessaoRef` existente).
- Interação com a promoção (DEC-053): "ambos" exige os dois sentidos com rota válida — com a Volta derivada, a promoção pode acontecer num gesto só; cobrir com teste.

## Dependências

- **DEC-063** (decidida — task liberada; Spec 02 §14 e RN-030 já editadas pelo dono). Recomendado: após TASK-076.

## Perguntas em aberto

- Nenhuma (Q-043 decidida pela DEC-063). Pendência **do dono da spec** (não desta task): alinhar a Spec 02 §2, que ainda descreve só o conjunto idêntico sem a ordem.

---

## TASK-078 — Gesto de realocação de Seção: botão esquerdo move o cluster inteiro, botão direito move só o ponto do serviço/sentido corrente (DEC-061/DEC-079)

## Objetivo

O usuário passa a poder **mover uma Seção inteira** no mapa, arrastando um marcador dela com o **botão esquerdo**: o gesto move todos os pontos contribuídos à Seção (todas as entradas de `secao.servicos[]`, Ida e Volta) pelo **mesmo vetor** — preservando o invariante dos 350 m por construção, re-derivando o município do novo centroide e disparando o recálculo das rotas de todos os itinerários que a referenciam. O arrasto com o **botão direito** continua movendo **só o ponto visualizado** (a contribuição do Serviço × sentido corrente), sob a regra dos 350 m — o mesmo comportamento de hoje, só migrado de botão. Corrige a impossibilidade prática de realocar uma Seção mal posicionada sem destruir sua UUID, sem exigir uma etapa própria de "entrar em modo".

## Contexto

Relato do responsável (2026-07-17): mover uma Seção hoje exige arrastar ponto a ponto, cada um preso aos 350 m do centroide do conjunto — "impraticável". A proposta original (Q-041/**DEC-061**) previa um **modo** de realocação (ex.: duplo clique no marcador entra no modo, os demais pontos aparecem em cor neutra, arrastar move todos juntos, `Esc` cancela o modo). Reavaliando o backlog em uso real (2026-07-24), o responsável simplificou o desenho (Q-057/**DEC-079**): **não há mais modo** — o **botão do mouse** usado no arrasto já distingue os dois gestos diretamente. Botão **esquerdo** arrasta **todos** os pontos da Seção (translação rígida); botão **direito** arrasta **exclusivamente** o ponto do Serviço/sentido corrente (350 m — DEC-044, inalterada). A translação rígida não viola RN-027 (distâncias ao centroide inalteradas); o que muda é o **lugar** da Seção. A DEC-079 supera só o **mecanismo de entrada** da DEC-061 (o modo); as consequências de confirmação (município, recálculo em cascata, UUID preservada) permanecem as mesmas fixadas pela DEC-061.

## Fora de escopo

- Afrouxar/alterar a regra dos 350 m do arrasto individual (DEC-044 e RN-027 intocadas — só migra do botão padrão para o botão direito).
- Mover Locais em conjunto (Local é pareado, por Serviço — o arrasto atual basta).
- Qualquer mudança de contrato (nenhum campo novo; as coordenadas mudam pelos caminhos existentes).
- Re-anexar itinerários/horários além do que os caminhos de recálculo existentes já fazem (TASK-046/066 reusadas).
- **Redefinir todos os pontos da Seção para um único lugar** ("resetar" a Seção) — é a **TASK-100**, gesto distinto (botão de refresh na tabela lateral, não um arrasto no mapa).

## Specs fonte

- Spec 02 §5.1/§5.2 (contribuições e clustering)
- Spec 03 §7.2 (invariante dos 350 m — preservado por construção), §2.3 (município derivado)
- Spec 04 §7.1 (arrasto por ponto — o botão direito reusa este gesto; o botão esquerdo passa a ser a translação, conforme Q-057/DEC-079), §14 (mensagens)

## Regras envolvidas

- RN-027 (350 m — invariante mantido; teste prova que a translação nunca é recusada por 350 m)
- RN-029 (município re-derivado do novo lugar; fora de SP → recusa com `MENSAGEM_FORA_DE_SP`)
- RN-004/001 (UUID da Seção preservada — a razão de ser da operação)
- RN-052 (mover coordenadas recalcula as rotas dos itinerários afetados — de **todos** os Serviços que usam a Seção)
- RN-054..057 (matrizes dos Serviços afetados reconciliadas)

## Entidades afetadas

- Seção (todas as contribuições), Rota/Itinerário/matriz dos Serviços que a referenciam

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Arrastar um marcador de Seção com o **botão esquerdo** move todos os pontos do cluster pelo mesmo vetor (translação rígida); os demais pontos ficam visíveis em cor neutra durante o arrasto, sem etapa prévia de "entrar em modo".
- [ ] Arrastar o mesmo marcador com o **botão direito** move **só** o ponto do Serviço/sentido corrente, sob a regra dos 350 m (DEC-044) — comportamento idêntico ao arrasto de hoje, só acessível pelo botão direito.
- [ ] Soltar o botão esquerdo confirma a translação; soltar sem deslocamento efetivo, ou `Esc` durante o arrasto, cancela e restaura as posições originais sem efeito.
- [ ] O `contextmenu` nativo do navegador **não** abre ao soltar o botão direito sobre um marcador de Seção durante o arrasto (suprimido); fora de um arrasto, o botão direito sobre a **linha vazia** continua abrindo o menu Seção/Local da DEC-055 — as duas superfícies não colidem.
- [ ] Ao confirmar a translação: município re-derivado do novo centroide (RN-029); destino fora de SP → recusa com a mensagem existente, sem mover nada.
- [ ] Nenhuma recusa por 350 m é possível na translação pelo botão esquerdo (invariante preservado — teste com cluster no limite).
- [ ] Todos os itinerários (de todos os Serviços) que referenciam a Seção têm a rota recalculada (RN-052) e a matriz reconciliada (RN-054..057) após a translação; falha de OSRM em um deles → `sem-rota` daquele itinerário (RN-048), sem apagar a última rota válida.
- [ ] A UUID da Seção e as entradas de `secao.servicos[]` são preservadas (round-trip) nos dois gestos.
- [ ] O arrasto pelo botão direito (ponto único) continua com o comportamento atual (DEC-044) — regressão-guarda.
- [ ] Nenhum `data-testid`/`aria-*` existente alterado; E2E atuais verdes.

## Casos válidos

- Seção com 4 pontos (2 Serviços × Ida/Volta), arrastada 5 km pelo **botão esquerdo**: os 4 pontos mantêm as distâncias relativas; município muda; as rotas dos 2 Serviços recalculam.
- O mesmo marcador arrastado pelo **botão direito** move só a contribuição do Serviço/sentido corrente, sob 350 m — sem afetar os demais pontos da Seção.
- Cancelar no meio do arrasto com o botão esquerdo (soltar sem deslocamento, ou `Esc`): nada muda, nenhuma chamada OSRM.

## Casos inválidos

- Translação pelo botão esquerdo para fora de SP → recusa integral (nenhum ponto movido).
- Arrasto pelo botão direito além de 350 m do centroide → recusa só a mensagem da Spec 04 §14 (DEC-044), sem afetar os demais pontos da Seção.
- OSRM falha no recálculo de um dos itinerários afetados pela translação → aquele itinerário em `sem-rota` com pendência; os demais seguem.

## Testes esperados

- Unitários: função pura de translação (vetor aplicado a todas as contribuições; invariante 350 m preservado; município re-derivado; fora de SP recusa); distinção de botão no handler de arrasto (`event.button`/`originalEvent.button`) roteando para translação (esquerdo) ou arrasto individual (direito); supressão do `contextmenu` nativo durante o arrasto com o botão direito, sem interferir no `contextmenu` da DEC-055 sobre a linha vazia.
- Integração: confirmar a translação dispara recálculo por itinerário afetado (OSRM mockado; contagem de chamadas); cancelamento não dispara nada; o arrasto pelo botão direito continua recalculando só o itinerário do Serviço/sentido corrente.
- E2E: realocar uma Seção usada por um Serviço com o botão esquerdo e ver rota/tabela atualizarem; arrastar o mesmo marcador com o botão direito e ver só o ponto do sentido corrente mudar (OSRM/tiles mockados).

## Arquivos prováveis

- `src/formulario/secoes/fluxos-secao.ts` (função pura `transladarSecao`, reusada)
- `src/shared/mapa/mapa.tsx` (distinguir o botão do `mousedown`/`dragstart` do marcador de Seção; suprimir `contextmenu` nativo durante o arrasto com o botão direito)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (pontos do cluster em cor neutra durante o arrasto com o botão esquerdo)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (commit + recálculo em cascata dos itinerários afetados)
- `docs-dev/18-DESIGN_SYSTEM.md` (estado visual do arrasto de cluster, cor neutra — sem o estado de "modo" que a DEC-061 prévia)

## Riscos

- **Cascata de recálculo multi-Serviço** é caminho novo (hoje o recálculo é do itinerário corrente): definir na análise se recalcula na hora (várias chamadas OSRM) ou marca os itinerários como desatualizados com pendência — decisão de UX a alinhar na `/analisar-task` (sem inventar regra: RN-052 manda recalcular ao editar coordenada).
- **Suprimir o `contextmenu` nativo do navegador** durante o arrasto com o botão direito é o risco técnico principal desta task (Q-057/DEC-079): sem isso, soltar o botão direito ao final do arrasto abriria o menu do navegador (ou, se mal implementado, o menu Seção/Local da DEC-055) em vez de só confirmar o movimento do ponto.
- Serviço em construção (modo novo): pontos vivem em `secoesEmConstrucao` — cobrir os dois modos.
- **Arrasto sobre a linha da rota**: a translação de uma Seção pode acontecer em cima do traçado, onde a **TASK-097** (já entregue) corrigiu a reversão do arrasto pelo re-render do hover — o invariante entregue por ela deve seguir valendo para os dois botões.

## Dependências

- **DEC-061** (consequências de confirmação) e **DEC-079** (mecanismo de gesto por botão, Q-057) — ambas decididas, task liberada. **TASK-097 entregue** (`6b1360f`, 2026-07-24) — dependência dura já cumprida. Sem dependência das TASK-070/076 (canceladas em 2026-07-24).

## Perguntas em aberto

- Nenhuma. Q-041 decidida pela DEC-061 (consequências de confirmação); Q-057 decidida pela DEC-079 (mecanismo de gesto por botão, sem modo).

---

## TASK-079 — Pontos de rota na lista lateral, intercalados na ordem da travessia, com setinhas e "Remover" (DEC-060)

## Objetivo

Os pontos de rota deixam de aparecer numa sub-lista solta abaixo do mapa e passam a ser exibidos **na mesma tabela lateral** das paradas, intercalados na ordem real da travessia (ex.: Seção A / ponto de rota 1 / Seção B / ponto de rota 2 / Local X / Seção C), como itens visualmente distintos — sem nome/município/`Cidade - Nome` — **com setinhas de subir/descer e "Remover"** (DEC-060). A posição na lista unificada passa a reger a ancoragem: mover um item (ponto ou parada) re-deriva `apos_parada_ordem`/índice dos pontos afetados e recalcula.

## Contexto

A TASK-063 implementou o literal da Spec 04 §7.3 ("sub-lista própria"), mas §7 e §7.3 item 3 dizem o contrário ("a tabela lateral lista Seções, paradas comuns e pontos de rota na ordem da travessia") — conflito real de redação registrado na **Q-040** (`/investigar-conflito`, 2026-07-17) e **decidido pela DEC-060**: lista lateral única intercalada, com a semântica posicional — a posição do item na lista determina a que trecho o ponto pertence; Seções/paradas que sobem ou descem ultrapassando pontos fazem esses pontos pertencerem ao outro trecho (re-ancoragem posicional, **superando em parte a DEC-056** no caso da reordenação). Cabe ao dono da spec alinhar a redação da §7.3 (a exemplo da DEC-052).

## Fora de escopo

- Gestos de criar/mover/remover ponto de rota no mapa (TASK-063/070) e visual do vértice (TASK-068/069) — inalterados.
- O motor de re-ancoragem por mudança de conjunto (inserir/remover parada) — TASK-066 (esta task consome; a 066 já implementa o caso da reordenação conforme a DEC-060).
- Sobrevivência dos pontos à falha de recálculo (TASK-071) — fonte de dados reusada.
- Qualquer mudança de contrato.
- Calcular ou alterar a regra visual de Local em extremo — pertence à TASK-068/DEC-070; esta task deve somente preservar o estado ao reconstruir/intercalar a lista.

## Specs fonte

- Spec 04 §7 (layout da tabela lateral), §7.3 item 3 (leitura vigente pela DEC-060)
- Spec 03 §3.6/§3.6.1 (ordem de travessia: `(apos_parada_ordem, índice no array)`)

## Regras envolvidas

- RN-042 (ponto de rota sem identidade: sem nome, sem município, sem `Cidade - Nome` — o número/posição é indicação de UI; DEC-060 dá a ele setinhas e "Remover")
- RN-076 (padrão de rótulo só para Seção)
- RN-052 (mover/remover pela lista recalcula)

## Entidades afetadas

- ponto de rota (só apresentação)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] A lista lateral exibe os pontos de rota intercalados entre as paradas, na posição dada por `apos_parada_ordem` + índice no array.
- [ ] O item de ponto de rota é visualmente distinto (sem rótulo `Cidade - Nome`, sem nome/município, sem edição de campos) e oferece **setinhas de subir/descer** e **"Remover"** (DEC-060), ambos com recálculo (RN-052).
- [ ] Mover um ponto de rota pela setinha re-deriva sua ancoragem pela nova posição na lista: dentro do mesmo trecho muda o índice no array; ultrapassando uma parada, muda o `apos_parada_ordem` (a coordenada do ponto não muda — só a ancoragem).
- [ ] Mover uma **parada** pela setinha re-ancora os pontos ultrapassados pela posição na lista (DEC-060 — sem descarte; supera o caso de reordenação da DEC-056), com recálculo.
- [ ] A `sub-lista-pontos-de-rota` abaixo do mapa deixa de existir **ou** é substituída pela representação nova — sem duplicação.
- [ ] As paradas mantêm exatamente as ações e `data-testid` atuais (`parada-item`, `parada-mover-cima/baixo`, `parada-remover`).
- [ ] A linha de um Local extremo mantém o estado vermelho, a explicação no hover/foco e a descrição acessível entregues pela TASK-068/DEC-070 depois que a tabela vira lista unificada; intercalar pontos de rota não desloca o erro para outro item.
- [ ] Remover uma parada re-intercala os pontos conforme a re-ancoragem vigente (TASK-066) — a lista nunca mostra ponto órfão.
- [ ] `apos_parada_ordem ∈ [1, paradas−1]` e `trechos == paradas − 1` em todos os caminhos (RN-041/042).
- [ ] E2E existentes verdes; seletores da sub-lista antiga atualizados de forma deliberada e registrada (`ponto-rota-item`/`remover-ponto-rota` preservados se possível).

## Casos válidos

- Itinerário A→B com 2 pontos no trecho 1: lista mostra A, ponto 1, ponto 2, B; remover o ponto 1 pela lista recalcula e a lista atualiza.
- Itinerário A→B→C com ponto p no trecho A→B: subir a parada B acima de A (setinha) mantém p na sua posição da lista, agora ancorado ao par que o cerca (B→A), com recálculo.
- Descer o ponto p pela setinha, ultrapassando B: p passa ao trecho B→C (`apos_parada_ordem` 2), mesma coordenada.

## Casos inválidos

- Ponto de rota não expõe edição de campos nem rótulo `Cidade - Nome` (asserção negativa — RN-042/076).
- Itinerário `sem-rota` com pontos preservados na sessão (TASK-071): a lista continua exibindo os pontos (não órfãos do estado).
- Nenhum movimento pela lista produz `apos_parada_ordem` fora do intervalo (RN-042) — teste de borda nos extremos da lista.
- Reordenar a lista e deixar um Local no primeiro/último lugar → exatamente a ocorrência extrema fica vermelha; movê-la para posição intermediária remove o estado, sem afetar pontos de rota vizinhos.

## Testes esperados

- Unitários: função pura de intercalação (paradas + pontos → lista de exibição) e a inversa (posição na lista → `apos_parada_ordem`/índice), casos do §3.6.1 (vários pontos no mesmo trecho), extremos da lista.
- Integração: renderização intercalada; setinhas e "Remover" da lista disparam recálculo com a lista re-ancorada (OSRM mockado); o estado de Local extremo acompanha a ocorrência correta antes/depois da reordenação.
- E2E: criar ponto pelo mapa e vê-lo aparecer intercalado na lista; movê-lo pela setinha (OSRM/tiles mockados).

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (a lista lateral passa a receber também os pontos de rota)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (remoção da sub-lista antiga)
- `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`, `testes/e2e/etapa-itinerarios.spec.ts`

## Riscos

- Interação com a TASK-064 (sync tabela↔mapa): se a 064 rodar antes, esta task não pode quebrar o sync; se rodar depois, a 064 já projeta sobre a lista unificada (ver nota na TASK-064).
- Interação com a TASK-071: a fonte dos pontos exibidos passa a ser o estado de sessão (DEC-058) — exibir da fonte certa.
- Interação com a TASK-068/DEC-070: a lista unificada não pode perder tooltip/descrição nem aplicar o vermelho a um ponto de rota intercalado.

## Dependências

- **DEC-060** (decidida — task liberada). TASK-063 (entregue). **TASK-066** (a re-ancoragem por posição que as setinhas consomem), **TASK-071** (fonte de dados) e **TASK-068/DEC-070** (estado contextual de Local extremo) antes; coordenada com a TASK-064.

## Perguntas em aberto

- Nenhuma (Q-040 decidida pela DEC-060).

---

## TASK-080 — Promover `ServicoEmConstrucao` a `Servico` completo ao concluir o itinerário também no modo "carregado"

## Objetivo

No modo **"carregado"** (JSON importado), concluir a edição do itinerário de um `ServicoEmConstrucao` — um Serviço criado na sessão **além** dos que vieram no JSON — passa a **promovê-lo a `Servico` completo** (com `itinerarios[]` paradas+rota e `matriz_distancias` reconciliada), anexado a `documento.autos.servicos` e removido de `servicosEmConstrucao`. Ao final, esses Serviços novos deixam de ficar presos em "em construção" e voltam a ser elegíveis para as etapas Viagens/Matrizes, como já ocorre no modo "novo".

## Contexto

A TASK-061 (DEC-053) introduziu a promoção `ServicoEmConstrucao → Servico` ao concluir o itinerário, mas o gatilho em [`etapa-itinerarios.tsx`](../../src/formulario/itinerarios/etapa-itinerarios.tsx) está condicionado a `atual.modo === "novo"` no ramo `else if` do handler de conclusão do recálculo ([`etapa-itinerarios.tsx:400-435`](../../src/formulario/itinerarios/etapa-itinerarios.tsx#L400-L435)). Só que o modo "carregado" **também** cria Serviços em `servicosEmConstrucao`: a etapa Serviços grava todo Serviço novo por `atualizarEmConstrucao`, que escreve `servicosEmConstrucao` sem bifurcar por modo ([`servicos.tsx:168-170`](../../src/formulario/servicos/servicos.tsx#L168-L170)); e a etapa de itinerários lista esses Serviços como linhas em construção nos dois modos ([`etapa-itinerarios.tsx:191-197`](../../src/formulario/itinerarios/etapa-itinerarios.tsx#L191-L197)). Consequência descoberta em teste manual do responsável (2026-07-17): num documento carregado, os Serviços criados na sessão — mesmo com itinerário válido recalculado — **nunca** são promovidos, permanecem em "em construção" e não podem receber horários. A infraestrutura da promoção já é agnóstica de modo: `servicosDaSessao`/`comServicosDaSessao` (DEC-053; [`sessao.ts:145-169`](../../src/formulario/sessao.ts#L145-L169)) leem/escrevem `documento.autos.servicos` no carregado e `sessao.servicos` no novo; `servicosEmConstrucao?` existe nos dois variantes de `SessaoFormulario`; e `promoverServico` é função pura ([`promocao-servico.ts`](../../src/formulario/itinerarios/promocao-servico.ts)). Falta apenas o ramo do handler deixar de exigir `modo === "novo"` e passar a promover nos dois modos — no carregado, anexando a `documento.autos.servicos` via `comServicosDaSessao`. Follow-up direto da TASK-061, que declarou o modo carregado "já resolvido" para Serviços completos (verdadeiro para os do JSON, falso para os criados na sessão).

## Fora de escopo

- A mecânica da promoção em si (`promoverServico`, gatilho, reconciliação de matriz) — já entregue pela **TASK-061**; esta task só **remove o gate de modo** do ramo que a aciona.
- O caminho do Serviço **já completo** (documento carregado ou já promovido) — continua como está (`servicosComItinerarioAtualizado`, [`etapa-itinerarios.tsx:388-399`](../../src/formulario/itinerarios/etapa-itinerarios.tsx#L388-L399)); nenhuma regressão.
- O CRUD da etapa Serviços — no modo carregado, o Serviço promovido já aparece na lista porque `completos` deriva de `documento.autos.servicos`; a unificação do CRUD no modo novo é a **TASK-072** (entregue), não retocada aqui.
- Qualquer mudança de **contrato/schema** (`shared/contrato`): a promoção é transição de estado de sessão efêmero, nunca persistência (RN-096/NEG-004).
- O E2E ponta a ponta do fluxo carregar-JSON-e-editar — fora; esta task entrega unitário/integração da fiação.

## Specs fonte

- Spec 04 §7 (montagem do itinerário)
- Spec 04 §8 ("Após criar/alterar o itinerário … a etapa seguinte é a grade de horários")
- Spec 04 §9.1 (recálculo automático da matriz ao concluir o itinerário)
- Spec 02 §6 (`Servico`: `itinerarios` ≥ 1, `matriz_distancias`), §10 (direcionalidade derivada dos `itinerarios[].sentido`)

## Regras envolvidas

- RN-001/002/004 (UUID do `ServicoEmConstrucao` preservada no `Servico` promovido — a regra crítica nº 1; round-trip provado por teste)
- RN-018 (documento válido exige ≥ 1 Serviço — o promovido entra em `documento.autos.servicos`)
- RN-038 (1 itinerário para ida/volta, 2 para "ambos"; "ambos" só promove com os dois sentidos prontos)
- RN-034 (mínimo 2 paradas), RN-048 (`sem-rota`/OSRM falho não promove Serviço incompleto)
- RN-054..057 (matriz reconciliada no mesmo commit da rota)
- RN-096 / NEG-004 (nada gravado no JSON antes da exportação; sessão efêmera)

## Entidades afetadas

- Serviço, Itinerário, Parada, Rota, matriz de distâncias (promoção `ServicoEmConstrucao → Servico` no modo carregado)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] No modo "carregado", concluir o itinerário de um `ServicoEmConstrucao` criado na sessão o promove a `Servico` completo (com `itinerarios[]` paradas+rota e `matriz_distancias` reconciliada), **anexado a `documento.autos.servicos`** e removido de `servicosEmConstrucao`.
- [ ] A `uuid` do `ServicoEmConstrucao` é preservada no `Servico` promovido (RN-001/002/004).
- [ ] Após a promoção, o Serviço aparece como **completo** na etapa de itinerários e fica elegível para Viagens/Matrizes/horários no modo carregado.
- [ ] A matriz é reconciliada no mesmo commit da rota (RN-054..057).
- [ ] Direcionalidade "ambos" só promove com os dois sentidos válidos; `sem-rota` não promove (RN-038/RN-048) — mesmo comportamento já garantido por `promoverServico`.
- [ ] Os Serviços que **já vieram completos no JSON** seguem pelo caminho de Serviço completo, sem regressão; a promoção não os toca.
- [ ] Nada é gravado no JSON antes da exportação (RN-096/NEG-004); nenhum `data-testid`/`aria-*` alterado; E2E existentes verdes.

## Casos válidos

- Carregar JSON com 1 Serviço → criar Serviço B (ida) na sessão → montar itinerário válido → ao concluir, B vira `Servico` em `documento.autos.servicos` com 1 itinerário e matriz reconciliada; a linha de B passa a "completo"; Viagens/Matrizes o listam.
- Carregado + Serviço B "ambos": os dois sentidos concluídos resultam em B com 2 itinerários; só um sentido pronto mantém B em construção.
- Editar depois um Serviço **carregado do JSON**: continua pelo caminho de Serviço completo (regressão-guarda de que o modo carregado não mudou para os pré-existentes).

## Casos inválidos

- Carregado + Serviço em construção com itinerário `sem-rota` (OSRM mockado): **não** promove; permanece em construção e a pendência ao vivo é mantida (RN-048).
- Carregado + "ambos" com só a Ida válida: **não** promove enquanto a Volta não fechar (RN-038).
- Promoção **não** regenera a UUID (RN-001/002/004) — round-trip prova.

## Testes esperados

- Unitários: reuso dos testes de `promoverServico` (já cobrem uuid/matriz/ida/ambos/sem-rota) — validar que a função não depende de modo. Se necessário, um teste da composição de sessão no modo carregado (anexa a `documento.autos.servicos`, remove de `servicosEmConstrucao`, preserva os Serviços pré-existentes e suas UUIDs).
- Integração: no modo carregado, após concluir o itinerário de um `ServicoEmConstrucao`, `servicosDaSessao` passa a incluí-lo e `servicosEmConstrucaoDaSessao` a excluí-lo; assert de round-trip de UUID de todos os Serviços (pré-existentes + promovido); OSRM mockado.
- E2E: N/A nesta task; specs existentes seguem verdes.
- Snapshot/contrato JSON: N/A (não toca contrato); pode-se validar que o `Servico` promovido passa no `zod` strict.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (ramo de promoção do handler de conclusão — generalizar a condição `atual.modo === "novo"` para promover nos dois modos, escrevendo por `comServicosDaSessao`)
- `testes/unitarios/formulario/promocao-servico.test.ts` e/ou um teste de integração da fiação no modo carregado (casos novos)

## Riscos

- **Regressão no modo carregado (pré-existentes):** a generalização não pode alterar o caminho dos Serviços que já vêm completos do JSON — cobrir com regressão-guarda.
- **Preservação de UUID (RN-004):** regra crítica nº 1 — round-trip de todos os Serviços após a promoção.
- **Interação com a fiação assíncrona:** o ramo mescla sobre `sessaoRef.current` (sessão mais recente); a generalização deve manter essa leitura para não sobrescrever commits concorrentes.

## Dependências

- **TASK-061** (entregue) — fornece `promoverServico`, `servicosDaSessao`/`comServicosDaSessao`, `sessao.servicos` e o ramo de promoção que esta task generaliza.

## Perguntas em aberto

- Nenhuma. É correção de bug contra a intenção já decidida na DEC-053 (a promoção ao concluir o itinerário vale para todo `ServicoEmConstrucao`, independentemente do modo); o gate `modo === "novo"` foi um recorte de escopo da TASK-061, não uma regra.

---

## TASK-081 — Alerta "tabela de feriados vazia" na Revisão, agregado num único item (RN-071)

## Objetivo

A tela de Revisão passa a exibir **um único** alerta não bloqueante "tabela de feriados vazia" (Spec 04 §11) quando **algum** Serviço não tem nenhuma Viagem de feriado (`viagem_feriado: true`) — o alerta **lista os Serviços afetados pelo `numero_n`, separados por vírgula** (ex.: "Serviços 0000-1CR, 0000-2CR sem grade de feriados"). Hoje `coletarPendencias` não emite esse alerta, embora a checagem "grade vazia é válida" (RN-071) já esteja implementada no nível de dados desde a TASK-030.

## Contexto

Achado da revisão de aderência da TASK-032 (`docs-dev/14-REVISOES/TASK-032-20260717.md`): a Spec 04 §11 lista "tabela de feriados vazia (nenhuma Viagem de feriado — pode ser intencional)" entre os alertas da Revisão, mas nem a TASK-030 nem a TASK-032 o implementaram — a revisão da TASK-030 (`docs-dev/14-REVISOES/TASK-030-20260715.md:42-43`) já havia atribuído esse item à "TASK-031/032", e a TASK-032 não o cobriu (`coletarPendencias`, `src/formulario/pendencias/pendencias.ts`, só emite hoje: documento criado do zero, rota ausente, descrição ausente, matriz desatualizada). RN-071 (grade vazia é válida, tratada como alerta) já está provada no nível da montagem de blocos (`viagens-montagem-grade.test.ts`) — falta só o alerta na camada de pendências/Revisão.

**Granularidade agregada (decisão do responsável, 2026-07-17):** como muitas linhas legitimamente não operam em feriado, um alerta por Serviço/sentido produziria ruído (dezenas de itens repetindo o óbvio). O alerta é, portanto, **um só item**, que **enumera os Serviços afetados** pelo `numero_n` numa lista separada por vírgula — sinaliza sem poluir, e o texto singular da spec ("tabela de feriados vazia") casa com um alerta único. Um Serviço entra na lista quando **nenhum** dos seus itinerários tem Viagem de feriado (o serviço inteiro não roda em feriado); a assimetria por sentido — Ida com feriado, Volta sem — é rara e fica como detalhe a fechar na `/analisar-task` (candidato: só entra na lista o Serviço **sem nenhuma** Viagem de feriado em sentido algum, para manter o alerta como "esta linha não opera em feriado").

## Fora de escopo

- Qualquer mudança na regra RN-071 em si (grade vazia continua válida) — só a exibição do alerta na Revisão.
- Contadores/resumo operacional de feriados (TASK-031, já entregue) — não retocar.
- Qualquer mudança de contrato JSON (o alerta é validação efêmera de sessão — NEG-004, nunca persistido).

## Specs fonte

- Spec 04 §11 (alertas da Revisão)
- Spec 03 §9.3 (grade de feriados)

## Regras envolvidas

- RN-071 (grade de feriados vazia é válida, alerta não bloqueante)
- RN-078 (alertas não bloqueiam a exportação — só bloqueantes bloqueiam)

## Entidades afetadas

- Viagem (`viagem_feriado: true`), Itinerário, Serviço

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] `coletarPendencias` emite **no máximo um** alerta "tabela de feriados vazia" para todo o documento (nunca um por Serviço), presente somente quando ao menos um Serviço não tem nenhuma Viagem de feriado.
- [ ] A mensagem do alerta **lista os Serviços afetados pelo `numero_n`, separados por vírgula** (ex.: "Serviços 0000-1CR, 0000-2CR sem grade de feriados — confirme se é intencional"), na ordem em que aparecem no documento, com `etapaAlvo` apontando para a etapa de horários (mesmo padrão dos demais alertas sem entidade única de origem — DEC-033, se aplicável).
- [ ] Se **todos** os Serviços têm ao menos 1 Viagem de feriado, nenhum alerta é emitido.
- [ ] O alerta é **não bloqueante**: não aparece em `pendenciasBloqueantes` do gate de exportação (`avaliarGateExportacao`) e não impede exportar.
- [ ] Nenhum `data-testid`/`aria-*` existente alterado; testes e E2E existentes seguem verdes.

## Casos válidos

- Um Serviço (0000-1CR) sem Viagem de feriado, dois com: um único alerta, mensagem "Serviços 0000-1CR sem grade de feriados…", exportação permanece liberada (sem outros bloqueantes).
- Três Serviços sem Viagem de feriado: **um** alerta só, listando os três `numero_n` por vírgula na ordem do documento.
- Todos os Serviços com grade de feriados preenchida: nenhum alerta.

## Casos inválidos

- N/A (é um alerta, não uma validação de entrada — não há "caso inválido" de dado, só presença/ausência de Viagem de feriado).

## Testes esperados

- Unitários: `coletarPendencias` — nenhum Serviço com feriado → 1 alerta listando todos os `numero_n` por vírgula; parte dos Serviços sem feriado → 1 alerta só com os afetados, na ordem do documento; todos com feriado → nenhum alerta; o alerta não entra em `pendenciasBloqueantes`.
- Integração: N/A.
- E2E: opcional, reaproveitando `revisao-exportacao.spec.ts` se a fixture carregada permitir cobrir os casos sem criar fixture nova.
- Snapshot/contrato JSON: N/A.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/pendencias/pendencias.ts` (nova checagem em `coletarPendencias`)
- `testes/unitarios/formulario/pendencias.test.ts` (ou arquivo de teste equivalente já existente)

## Riscos

- Baixo — checagem de leitura pura sobre dados já existentes, sem novo estado nem mudança de contrato.

## Dependências

- **TASK-030** (entregue) — grade de feriados e RN-071 já implementadas no nível de dados.
- **TASK-032** (entregue) — `coletarPendencias`/`TelaRevisao` já existem; esta task só acrescenta uma checagem.

## Perguntas em aberto

- Nenhuma que bloqueie. Detalhe de design a fechar na `/analisar-task` (não é regra de negócio nova — a agregação num único alerta já está decidida): tratamento da assimetria por sentido (Serviço que roda feriado num sentido e não no outro). Candidato: só entra na lista o Serviço **sem nenhuma** Viagem de feriado em sentido algum, mantendo o alerta como "esta linha não opera em feriado".

---

## TASK-082 — Bloquear a exportação quando o documento tem violação técnica de 350 m ou tipificação (DEC-067)

## Objetivo

O gate de exportação passa a **bloquear** "Exportar proposta"/"Definir como vigente" quando o documento (montado para exportação) apresenta violação de 350 m estático de Seção (RN-028), 350 m pareado de Local (RN-032) ou tipificação `tipo` × `caracteristica_veiculo` (RN-019..022) — reaproveitando a checagem pura já existente (`coletarAlertasTecnicos`, `src/shared/checagens-leitor/checagens-leitor.ts`). Abrir, visualizar e editar o documento continuam permitidos e sem bloqueio nenhum (RN-091 intocada) — só a exportação passa a exigir a correção.

## Contexto

Achado da revisão de aderência da TASK-032 (`docs-dev/14-REVISOES/TASK-032-20260717.md`): a Spec 04 §11 lista "violação da regra dos 350 m detectada em revalidação" e "violação de tipificação tipo × característica" entre os erros bloqueantes da Revisão, mas o gate de exportação (`avaliarGateExportacao`, `src/formulario/exportacao/gate-exportacao.ts`) não reaplica essas checagens — hoje ele só combina as pendências vivas de `coletarPendencias` com a validação estrutural do schema (`validarParaExportacao`), e nem uma nem outra cobrem 350 m/tipificação. Ao mesmo tempo, a RN-091 (Spec 05 §4.1) fixa que essas mesmas checagens são **alerta técnico, nunca bloqueiam** para qualquer leitor estático — o que gerou uma aparente tensão entre as duas regras, resolvida pela **DEC-067**: são momentos diferentes (leitura × exportação), não uma contradição. A lógica pura já existe e já é testada (`coletarAlertasTecnicos`, usada hoje só no import); falta reaplicá-la no momento da exportação, com a severidade elevada a bloqueante **apenas nesse ponto**.

## Fora de escopo

- Qualquer mudança na severidade dessas checagens **na leitura/import** (`checagens-leitor.ts` continua devolvendo alerta técnico não bloqueante — RN-091 intocada; esta task não toca esse arquivo além de, no máximo, reexportar a função pura já existente).
- A regra de negócio dos 350 m ou de tipificação em si (RN-027/028/032/019..022 inalteradas) — só o momento em que a violação passa a bloquear.
- O gesto de realocação de Seção inteira (TASK-078/DEC-061) — trata de **evitar** uma violação nova durante a edição ao vivo; esta task trata de **um documento que já chega** com a violação (importado ou nunca corrigido).
- Qualquer mudança de contrato JSON.

## Specs fonte

- Spec 04 §11 (bloqueantes da Revisão)
- Spec 05 §4.1 (RN-091 — leitor estático, alerta técnico)
- Spec 03 §7.3/§7.4 (350 m), §10 (tipificação)

## Regras envolvidas

- RN-091 (checagem técnica é alerta ao ler — permanece inalterada nesta task)
- RN-028/RN-032 (350 m estático de Seção/pareado de Local)
- RN-019..022 (tipificação `tipo` × `caracteristica_veiculo`)
- RN-078 (exportação bloqueada com pendências — Spec 04 §11/§12/§14)
- DEC-067 (a decisão que libera esta task)

## Entidades afetadas

- Seção, Local, Serviço (checagem sobre o documento montado, sem alterar o modelo)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] `avaliarGateExportacao` passa a considerar bloqueante qualquer item devolvido por `coletarAlertasTecnicos` sobre o documento montado para exportação — `liberado` só é `true` se, além dos critérios já existentes, essa lista vier vazia.
- [ ] A mensagem exibida ao usuário segue o padrão operacional da Spec 04 §14 (sem tecniquês cru do RN citado — reaproveitar/adaptar a mensagem já existente em `AlertaTecnico.mensagem`, com `etapaAlvo` apontando para a Seção/Local/Serviço envolvido).
- [ ] Abrir/visualizar/editar um documento com essas violações continua **sem nenhum bloqueio** (regressão-guarda explícita: `checagens-leitor.ts`/import inalterados, RN-091 intocada).
- [ ] Um documento sem essas violações não é afetado pela mudança (regressão-guarda do caminho feliz do gate).
- [ ] Nenhum `data-testid`/`aria-*` existente alterado; testes e E2E existentes seguem verdes.

## Casos válidos

- Documento carregado sem violação de 350 m/tipificação: gate liberado como hoje (se não houver outras pendências).
- Documento corrigido durante a sessão (violação existia no import, usuário ajustou a Seção): gate libera assim que a violação some — checagem recomputada a cada avaliação, sem estado extra (mesmo padrão de `coletarPendencias`).

## Casos inválidos

- Documento carregado com uma Seção cujos pontos violam os 350 m estáticos: `avaliarGateExportacao` devolve `liberado: false`; abrir/editar o mesmo documento continua permitido, com alerta técnico não bloqueante (comportamento de `checagens-leitor.ts`, inalterado).
- Documento com tipificação incompatível (`tipo` × `caracteristica_veiculo`): mesmo comportamento — bloqueia só a exportação.
- Documento com violação de 350 m **e** demais pendências vivas (ex.: rota ausente): o gate permanece bloqueado por qualquer uma delas; a mensagem/lista reflete todas.

## Testes esperados

- Unitários: `avaliarGateExportacao` — documento com violação de 350 m de Seção → bloqueado; com violação de Local → bloqueado; com tipificação incompatível → bloqueado; documento limpo → comportamento inalterado (regressão-guarda).
- Integração: N/A.
- E2E: opcional — reaproveitar `revisao-exportacao.spec.ts` com uma fixture que viole 350 m/tipificação, se compensar o custo de manter uma fixture extra; senão, cobertura unitária basta.
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/exportacao/gate-exportacao.ts` (reaplicar `coletarAlertasTecnicos` sobre o documento montado, tratando qualquer item como bloqueante neste ponto)
- `testes/unitarios/formulario/gate-exportacao.test.ts` (casos novos)

## Riscos

- Reaproveitar `coletarAlertasTecnicos` errado (ex.: também elevá-lo a bloqueante dentro de `checagens-leitor.ts`) violaria a RN-091 — a task deve tocar só o ponto de exportação, nunca o de leitura.
- Mensagem ao usuário não pode expor a redação técnica crua (`[RN-028] Seção "X": ...`) sem adaptação — Spec 04 §14 pede tom operacional; decidir na `/analisar-task` se a mensagem de `AlertaTecnico` é reaproveitada tal como está ou adaptada.

## Dependências

- **DEC-067** (decidida — task liberada).
- **TASK-008/TASK-010** (entregues) — fornecem `coletarAlertasTecnicos`, `validaEstaticoSecao`, `validaLocalPareado`, `validarConjuntoDeCaracteristicas`.
- **TASK-032** (entregue) — fornece `avaliarGateExportacao`, o ponto de entrada desta task.

## Perguntas em aberto

- Nenhuma (Q-047 decidida pela DEC-067).

---

## TASK-083 — Ponto de rota órfão na remoção de parada de extremo é descartado, com aviso (DEC-068)

## Objetivo

Fechar o subcaso que a TASK-066 deixou como ressalva (`docs-dev/14-REVISOES/TASK-066-20260717.md`): ao remover a **primeira** ou a **última** parada de um itinerário, o trecho terminal deixa de existir e os pontos de rota daquele trecho ficam **órfãos**. `reancorarPontosDeRota` passa a **descartá-los** (em vez de produzir `apos_parada_ordem` fora de `[1, paradas.length − 1]`, que hoje cai na rede da RN-048 e vira `sem-rota`), com **aviso não bloqueante** na etapa — conforme a **DEC-068**.

## Contexto

Ressalva da revisão de aderência da TASK-066: na remoção de extremo, `reancorar-pontos-de-rota.ts` produz `apos_parada_ordem = 0` (removida a primeira parada) ou `= length` (removida a última), fora do intervalo da RN-042. Hoje isso é **contido** — `intercalarPontosDeRota` lança, `solicitarRota` captura e o itinerário vira `sem-rota` —, seguro mas inexplicável: o usuário removeu uma parada terminal e a rota "some" por causa de pontos órfãos que ele não vê. A DEC-068 (Q-048, decidida pelo responsável) fixou: o ponto órfão **não faz mais sentido** (o trecho que ele forçava sumiu) e deve ser **descartado**, com aviso. Remoção do meio continua fundindo (sem descarte); reordenação continua sem descarte (DEC-060).

## Fora de escopo

- Os demais casos de `reancorarPontosDeRota` (acrescentar ao fim, inserir no meio, remover do meio, reordenar) — já entregues pela TASK-066/DEC-056/DEC-060, **inalterados**.
- A rede de segurança da RN-048 (`catch` em `cliente-osrm.ts`) — **permanece** como defesa em profundidade contra JSON importado já corrompido; esta task não a remove, só deixa de depender dela no gesto normal de remoção.
- A limpeza de `secao.servicos[]` na remoção de parada (Seção) — é a TASK-084; independente desta.
- Qualquer mudança de contrato JSON (a re-ancoragem só altera o valor calculado antes da requisição OSRM).

## Specs fonte

- Spec 03 §3.6/§3.6.1/§3.6.2 (pontos de rota, ancoragem, reedição fiel)
- Spec 02 §10.4 (`apos_parada_ordem` ∈ `[1, paradas.length − 1]`)

## Regras envolvidas

- RN-042 (ancoragem/intervalo — agora garantido **pela própria função**, não só pela rede)
- RN-048 (falha bloqueante — mantida como defesa em profundidade)
- RN-041 (`trechos == paradas − 1`, preservado)
- DEC-068 (a decisão que libera esta task)

## Entidades afetadas

- ponto de rota, Parada, Rota (reindexação; nenhum modelo muda)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Remover a **última** parada de um itinerário com ponto de rota no trecho terminal → o ponto é **descartado** (não vira `sem-rota`); a rota recalcula com as paradas restantes; aviso não bloqueante exibido.
- [ ] Remover a **primeira** parada → idem para os pontos do trecho inicial.
- [ ] Remover uma parada do **meio** → comportamento inalterado (funde os dois trechos, nenhum descarte) — regressão-guarda da TASK-066.
- [ ] `reancorarPontosDeRota` **nunca** devolve `apos_parada_ordem` fora de `[1, paradas.length − 1]` em nenhum caminho (a pós-condição do docstring passa a valer pela função; corrige o overclaim apontado na revisão da TASK-066).
- [ ] O aviso é **não bloqueante** (nunca pendência de §11 — lista fechada; mesmo padrão da DEC-047/DEC-056).

## Casos válidos

- 3 paradas A,B,C com ponto no trecho B→C (`apos_parada_ordem: 2`); remover C → o ponto é descartado, rota A→B recalcula, aviso exibido.
- Mesma base, ponto no trecho A→B (`apos_parada_ordem: 1`); remover A → ponto descartado, rota B→C recalcula.

## Casos inválidos

- JSON importado com `apos_parada_ordem` já fora do intervalo (arquivo corrompido) → a rede da RN-048 continua produzindo `sem-rota` (defesa em profundidade preservada — não é o caminho do gesto de remoção).

## Testes esperados

- Unitários: `reancorarPontosDeRota` — remoção de extremo (primeiro/último) descarta os órfãos e mantém o resto; remoção do meio inalterada; pós-condição de intervalo em **todos** os caminhos (fechar a lacuna de cobertura da TASK-066).
- Integração: remover parada de extremo na tabela lateral com ponto no trecho terminal recalcula (OSRM mockado) sem `sem-rota`, e sinaliza o descarte.
- E2E: opcional.
- Snapshot/contrato JSON: `pontos_de_rota` resultante válido por `esquemaRota`/§14 em todos os caminhos.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/roteamento/reancorar-pontos-de-rota.ts` (filtrar órfãos na remoção; corrigir docstring da pós-condição)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (aviso não bloqueante quando houver descarte)
- `testes/unitarios/formulario/roteamento-reancorar-pontos-de-rota.test.ts` e `itinerarios-estado.test.ts` (casos novos)

## Dependências

- **DEC-068** (decidida — task liberada).
- **TASK-066** (entregue) — esta task modifica `reancorarPontosDeRota` que a 066 criou.

## Riscos

- Confundir "remoção de extremo" com "remoção do meio": a condição correta é filtrar todo ponto cujo `apos_parada_ordem` re-ancorado caia fora de `[1, len − 1]` — isso descarta exatamente os órfãos do trecho terminal e preserva os demais, sem detectar extremo explicitamente.

## Perguntas em aberto

- Nenhuma (Q-048 decidida pela DEC-068).

---

## TASK-084 — Remover uma parada (Seção) de um itinerário limpa `secao.servicos[]` e descarta a Seção órfã

## Objetivo

Corrigir um **bug vivo**: ao remover uma parada de Seção de um itinerário pela tabela lateral, a entrada correspondente em `secao.servicos[]` **não é removida**. A Seção continua aparecendo no mapa e nas opções de "reutilizar Seção existente", e — pior — o documento fica **estruturalmente inválido** (RN-018: "o Serviço referenciado não tem nenhuma Parada apontando para esta Seção", `validacoes-estruturais.ts:115-124`), bloqueando a exportação sem que o usuário consiga desfazer, a não ser removendo o Serviço inteiro. A remoção de parada passa a limpar a contribuição do Serviço à Seção e, se a Seção ficar sem nenhum Serviço, a descartá-la (cascata — o análogo por-parada do que a TASK-080 já faz por-Serviço).

## Contexto

Reportado pelo responsável (2026-07-17): "após excluir uma seção de um serviço, essa seção continua aparecendo no mapa, além de continuar existindo nas opções de reutilizar seção existente, mesmo que nenhum outro serviço utilize ela… o JSON fica bloqueado". Diagnóstico: `servicosComItinerarioAtualizado` (`etapa-itinerarios.tsx:275-293`) reescreve `paradas` e `rota` do itinerário no write-back, mas **nunca toca `secao.servicos[]`**. Uma Seção deixa de ser referenciada por qualquer parada do Serviço, mas mantém sua contribuição de geolocalização em `secao.servicos[]` — o que (a) a mantém no mapa/reuso (derivados de `secao.servicos[]`) e (b) dispara a violação RN-018 de `validarSecoesDoAutos`. A "cascata de Seção órfã" já existe para remoção de **Serviço inteiro** (`removerServicoDeLista`, `src/formulario/servicos/remover.ts`), keyed por `servico_uuid`; falta o análogo **por-parada**: quando um Serviço deixa de referenciar uma Seção em **todos** os seus itinerários (Ida e Volta), remover a contribuição desse Serviço; Seção sem nenhuma contribuição é descartada de `autos.secoes`/`secoesEmConstrucao`.

## Fora de escopo

- Remoção de **Serviço inteiro** — já é a TASK-080/`removerServicoDeLista` (reusar a mesma noção de órfã, não reimplementar).
- O espelhamento Ida↔Volta na remoção de Seção de Serviço bidirecional (RN-030/DEC-063) — é a **TASK-077**; esta task coordena com ela (a limpeza opera sobre "nenhum itinerário do Serviço referencia a Seção", correta com ou sem o espelho), mas não implementa o gesto espelhado.
- Tornar o bloqueio de exportação **visível** ao usuário — é a TASK-085 (complementar; sem ela, o sintoma fica diagnosticável mas a causa desta task já some).
- Qualquer mudança de contrato JSON.

## Specs fonte

- Spec 02 §5.1/§10.1/§14 (Seção, `secao.servicos[]`, integridade referencial de parada)
- Spec 04 §6/§7.1/§7.3 (remoção de parada pela tabela lateral; reuso de Seção)

## Regras envolvidas

- RN-018 (Seção exige ≥ 1 Serviço referenciando-a por parada; cascata de órfã)
- RN-036 (integridade referencial parada↔Seção)
- RN-026 (contribuição de geolocalização por Serviço/sentido)
- RN-004 (UUIDs preservadas — a Seção que **permanece** referenciada mantém `uuid` e entradas)
- RN-030 (Ida e Volta referenciam o mesmo conjunto de Seções — a limpeza considera ambos os sentidos do Serviço)

## Entidades afetadas

- Seção (`secao.servicos[]`, cascata de órfã), Parada, Serviço

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Remover a parada de uma Seção do itinerário de um Serviço, quando **nenhum** outro itinerário desse Serviço a referencia, remove a entrada desse Serviço de `secao.servicos[]`.
- [ ] Uma Seção que fique **sem nenhuma** entrada em `secao.servicos[]` é descartada de `autos.secoes` (modo carregado) / `secoesEmConstrucao` (modo novo) — cascata análoga à `removerServicoDeLista`.
- [ ] Após a remoção, a Seção descartada **não aparece** mais no mapa nem nas opções de "reutilizar Seção existente".
- [ ] Após a remoção, o documento **não** apresenta a violação RN-018 de `validarSecoesDoAutos` para aquela Seção (deixa de bloquear a exportação por esse motivo).
- [ ] Uma Seção ainda referenciada por **outro** Serviço (ou pelo outro sentido do mesmo Serviço) **não** é removida — a cascata opera só sobre Seção efetivamente órfã (RN-030/RN-004).
- [ ] UUIDs das Seções que permanecem são preservadas (round-trip) — RN-004.

## Casos válidos

- Serviço unidirecional A→B→C; remover B → a Seção B perde a contribuição desse Serviço; como nenhum outro Serviço a usa, B sai de `autos.secoes`; mapa e reuso deixam de listá-la; exportação deixa de bloquear por RN-018.
- Seção compartilhada por dois Serviços; remover a parada dela em um Serviço → a contribuição **daquele** Serviço sai de `secao.servicos[]`, a Seção permanece (o outro Serviço ainda a referencia), UUID intacta.

## Casos inválidos

- Remover uma parada de Seção **sem** limpar `secao.servicos[]` (comportamento atual) → RN-018 em `coletarViolacoesEstruturais` — é a regressão que esta task fecha; teste-guarda garante que a violação some.

## Testes esperados

- Unitários: a função pura de limpeza (por-parada, análoga a `removerServicoDeLista`) — remove a contribuição só quando nenhum itinerário do Serviço referencia a Seção; descarta Seção órfã; preserva Seção ainda usada; não muta a entrada; round-trip de UUID (RN-004).
- Integração: remover parada na tabela lateral → o documento resultante passa em `coletarViolacoesEstruturais` (sem RN-018) e a Seção some do mapa/reuso; OSRM mockado.
- E2E: opcional — remover Seção e confirmar que a exportação libera (coordenar com a TASK-085 se a visibilidade do gate for exercitada).
- Snapshot/contrato JSON: documento resultante válido por `esquemaDocumentoOperacao` + `validacoes-estruturais`.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/secoes/remover.ts` (novo) ou `src/formulario/servicos/remover.ts` (função pura de limpeza por-parada, reaproveitando a noção de órfã)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (`servicosComItinerarioAtualizado`/write-back da remoção aplica a limpeza no mesmo commit)
- Testes correspondentes em `testes/unitarios/formulario/`

## Dependências

- **TASK-019** (entregue) — write-back de itinerário que esta task estende.
- **TASK-080** (entregue) — fornece a cascata por-Serviço (`removerServicoDeLista`) como referência/reuso.
- Coordenar com **TASK-077** (espelho Ida↔Volta) — a limpeza deve continuar correta quando a remoção de Seção reflete nos dois sentidos.

## Riscos

- Descartar uma Seção ainda referenciada por outro sentido do **mesmo** Serviço (Ida vs. Volta) ou por outro Serviço — a condição de órfã deve olhar **todos** os itinerários de **todos** os Serviços (a base já existente em `removerServicoDeLista` opera sobre `secao.servicos[]`, que reflete isso).
- Interação com RN-030: num Serviço bidirecional, remover a Seção de só um sentido deixaria Ida/Volta com conjuntos diferentes (RN-030) — por isso a coordenação com a TASK-077; decidir na `/analisar-task` se esta task exige o espelho da 077 como pré-requisito ou trata o unidirecional primeiro.

## Perguntas em aberto

- Nenhuma (bug de integridade; comportamento-alvo determinado pela RN-018 e pelo precedente `removerServicoDeLista`). A ordenação frente à TASK-077 é decisão de sequenciamento, não de domínio.

---

## TASK-085 — Erros que bloqueiam a exportação ficam visíveis ao usuário (bloqueio sem aviso)

## Objetivo

Corrigir um **bug de feedback**: quando a exportação é bloqueada por uma **violação estrutural** (Spec 02 §14 — ex.: a Seção órfã da TASK-084) ou pelos alertas técnicos elevados a bloqueante (TASK-082/DEC-067), os botões de exportação ficam desabilitados **sem que o usuário veja o quê corrigir**. `avaliarGateExportacao` calcula `errosEstruturais` e os usa para `liberado: false`, mas **não os devolve**; a tela de Revisão lista só as pendências de `coletarPendencias`, e o botão desabilitado impede o clique que mostraria `exportacao-erros`. O gate passa a **expor** os motivos estruturais/técnicos do bloqueio, e a Revisão/Exportação passa a **exibi-los** em linguagem operacional (Spec 04 §14).

## Contexto

Reportado pelo responsável (2026-07-17): "o bloqueio do JSON vem sem nenhum aviso do que tem de errado… precisa de algum tipo de aviso do que está errado para o usuário conseguir corrigir". Diagnóstico: em `src/formulario/exportacao/gate-exportacao.ts`, `avaliarGateExportacao` retorna `{ liberado, pendenciasBloqueantes, documentoIncompleto }` — `pendenciasBloqueantes` vem só de `coletarPendencias` (rota/descrição/matriz ausentes), enquanto `errosEstruturais` (de `validarParaExportacao`/`coletarViolacoesEstruturais`) entra no cálculo de `liberado` e é **descartado**. Resultado: uma violação estrutural (como a Seção órfã) desabilita os botões enquanto a lista "Erros bloqueantes" da `tela-revisao.tsx` mostra "Nenhum erro bloqueante", e a `tela-exportacao.tsx` mostra só a mensagem genérica "Existem pendências bloqueantes. Resolva os itens listados" — sem itens listados. As mensagens de `ViolacaoEstrutural.mensagem` já existem e já citam a RN + explicação; falta **transportá-las** ao gate e à UI. Nota de sequenciamento: sem esta task, o bloqueio novo da **TASK-082** (350 m/tipificação) também nasceria invisível — por isso esta task idealmente precede ou acompanha a 082.

## Fora de escopo

- Introduzir ou mudar **quais** validações bloqueiam (isso é a TASK-082 para técnicas e a TASK-084 para a Seção órfã) — esta task só torna **visível** o que já bloqueia.
- Reescrever a taxonomia de `Pendencia` — reaproveitar a estrutura existente (mensagem + `etapaAlvo`/`severidade`) para acomodar os motivos estruturais.
- A mensagem literal de falha de rota/OSRM (§14) — já entregue (TASK-022/047).
- Qualquer mudança de contrato JSON.

## Specs fonte

- Spec 04 §11 (Revisão: duas listas — bloqueantes e alertas; item navegável), §12/§14 ("botões desabilitados + painel de pendências em foco"; mensagens operacionais)
- Spec 02 §14 (violações estruturais — a fonte das mensagens a exibir)

## Regras envolvidas

- RN-078 (exportação bloqueada com pendências — e o usuário precisa saber quais)
- RN-076 (nomenclatura/rótulos operacionais nas mensagens; `Cidade - Nome` onde couber)
- Spec 04 §14 (tom operacional, sem tecniquês cru do RN)

## Entidades afetadas

- Nenhuma do modelo — camada de apresentação/gate (Pendências, Revisão, Exportação)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] `avaliarGateExportacao` passa a **devolver** os motivos estruturais do bloqueio (não só usá-los para `liberado`), numa forma consumível pela UI (lista de pendências/mensagens com `etapaAlvo`).
- [ ] Com uma violação estrutural presente (ex.: Seção órfã — RN-018), a tela de **Revisão** lista o motivo em "Erros bloqueantes" (deixa de mostrar "Nenhum erro bloqueante" com o botão desabilitado), navegável para a etapa/entidade de origem (§11).
- [ ] A tela de **Exportação** deixa de exibir a mensagem genérica sem itens: mostra os motivos concretos do bloqueio (ou remete claramente ao painel de pendências em foco — §14).
- [ ] As mensagens seguem o tom da Spec 04 §14 (adaptar a redação técnica de `ViolacaoEstrutural.mensagem` para linguagem operacional; não expor "[RN-018] …" cru).
- [ ] Documento sem bloqueios: comportamento inalterado (regressão-guarda; nenhum item novo aparece).
- [ ] `data-testid`/`aria-*` existentes preservados; E2E verdes.

## Casos válidos

- Documento com uma Seção órfã (RN-018): Revisão mostra 1 erro bloqueante com mensagem operacional apontando a Seção e a etapa; corrigida a causa, o item some e o gate libera.
- Documento limpo: "Nenhum erro bloqueante", botões habilitados — como hoje.

## Casos inválidos

- Bloqueio ativo (estrutural/técnico) com "Erros bloqueantes: 0" na Revisão e botão desabilitado (comportamento atual) → é a regressão que esta task fecha; teste-guarda garante que o motivo aparece.

## Testes esperados

- Unitários: `avaliarGateExportacao` devolve os motivos estruturais quando `liberado === false` por violação estrutural; vazio quando liberado.
- Unitários/componente: `tela-revisao.tsx` renderiza os motivos estruturais na lista de bloqueantes; `tela-exportacao.tsx` exibe os motivos em vez da mensagem genérica sozinha.
- E2E: opcional — documento com Seção órfã (ou fixture com violação estrutural) mostra o motivo na Revisão e o botão desabilitado com explicação.
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/exportacao/gate-exportacao.ts` (expor os motivos estruturais no `ResultadoGateExportacao`)
- `src/formulario/pendencias/pendencias.ts` (adaptar `ViolacaoEstrutural` → `Pendencia` operacional, ou estrutura equivalente)
- `src/formulario/revisao/tela-revisao.tsx` e `src/formulario/exportacao/tela-exportacao.tsx` (exibir os motivos)
- Testes correspondentes

## Dependências

- **TASK-032** (entregue) — fornece o gate e as telas de Revisão/Exportação.
- Relaciona-se com **TASK-082** (bloqueio técnico) e **TASK-084** (Seção órfã): esta task torna **visíveis** os bloqueios que ambas produzem. Recomendável **antes** ou junto da 082/084 para que os bloqueios não nasçam mudos.

## Riscos

- Expor a redação técnica crua (`[RN-018] …`) sem adaptação viola o tom da Spec 04 §14 — decidir na `/analisar-task` o mapeamento `ViolacaoEstrutural.mensagem` → texto operacional, reaproveitando o padrão já usado nas pendências existentes.
- Duplicar a fonte de verdade do gate: a UI deve consumir o que `avaliarGateExportacao` devolve, não recomputar violações por conta própria (evitar divergência entre botão e lista).

## Perguntas em aberto

- Nenhuma (bug de feedback; o formato das duas listas já é fixado pela Spec 04 §11 e o tom pela §14).

---

## TASK-086 — Diagnóstico técnico de DEV para os erros estruturais do gate de exportação (complemento da TASK-085)

## Objetivo

Devolver aos DEVs a trilha técnica que a TASK-085 traduziu para linguagem operacional: cada erro estrutural do gate passa a carregar um `diagnostico` técnico (RN + caminho JSON + mensagem crua do schema), **invisível ao usuário**, exposto (A) num atributo `data-diagnostico` no item da lista de bloqueio e (B) num `console.debug` só fora de produção. Facilita localizar a origem do bloqueio e reproduzir qual entrada o gerou, sem reexpor tecniquês na tela (Spec 04 §14).

## Contexto

Na TASK-085, `coletarErrosEstruturais` (`src/formulario/exportacao/gate-exportacao.ts`) traduz cada `issue` do `esquemaDocumentoOperacao.safeParse` para uma `Pendencia` com `mensagem` operacional — mas **descarta** o `issue.message` cru (com `[RN-xxx]`) e o `issue.path`. Consequência levantada pelo responsável (2026-07-17): quando um bloqueio cai no fallback genérico ("Há um problema nos dados de … Revise a etapa …"), o DEV não sabe **qual** checagem falhou nem **qual entrada** disparou. O `id` da pendência já preserva o caminho parcialmente (`estrutural-0-autos-secoes-1-servicos-0`, `gate-exportacao.ts:239`), mas sem RN nem a descrição da checagem; e o antigo `ErroExportacao.detalhe` técnico (`exportar-documento.ts:87`) tornou-se inalcançável na prática, porque o botão de exportar agora nasce desabilitado no bloqueio (não há clique que produza o `detalhe`). Esta task recompõe a trilha de diagnóstico **por fora** da mensagem do usuário. Não é regra de negócio — é ferramenta de DEV; por isso não altera spec nem contrato.

## Fora de escopo

- Mudar **quais** documentos bloqueiam ou **como** a mensagem operacional é redigida (isso é a TASK-085, entregue) — o `mensagem` do usuário fica **intocado**, incluindo os testes-guarda que garantem que ele não vaza `[RN-xxx]`/`uuid`.
- Renderizar o diagnóstico técnico como **texto visível** na tela de Revisão ou Exportação (o `data-diagnostico` é atributo, não conteúdo; nada aparece para o usuário).
- Painel de DEV dedicado, feature-flag de UI, ou `NODE_ENV`-gated visual (alternativa D descartada — só A+B).
- Qualquer mudança de contrato JSON, de `ViolacaoEstrutural`/`esquemaDocumentoOperacao`, ou da taxonomia base de `Pendencia` além de **acrescentar um campo opcional** (`diagnostico?: string`) que os demais produtores de pendência simplesmente não preenchem.
- Estender o diagnóstico às pendências vivas (`coletarPendencias` — rota/descrição/matriz): esta task cobre só os erros estruturais do gate (origem do sintoma relatado).

## Specs fonte

- Spec 04 §14 (tom operacional na mensagem ao usuário — o diagnóstico técnico **não** pode reintroduzir tecniquês na superfície visível)
- Spec 04 §11 (as duas listas de Revisão — estrutura preservada; só ganha um atributo invisível)

## Regras envolvidas

- RN-078 (exportação bloqueada com pendências — o gate cujo diagnóstico esta task expõe)
- RN-076 / Spec 04 §14 (a mensagem visível segue linguagem operacional; o diagnóstico técnico vive fora dela, sem violar o tom)

## Entidades afetadas

- Nenhuma do modelo de domínio — camada de apresentação/gate (`Pendencia` ganha campo opcional; itens de lista de bloqueio)

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] `coletarErrosEstruturais` preenche, em cada erro estrutural, um `diagnostico` técnico com RN (quando houver), caminho JSON (`issue.path.join(".")`) e a mensagem crua do schema — sem alterar o campo `mensagem` operacional.
- [ ] O campo `diagnostico` é **opcional** em `Pendencia` (`diagnostico?: string`); pendências que não o preenchem continuam válidas e inalteradas (regressão-guarda: `coletarPendencias` intocado).
- [ ] Na lista de "Erros bloqueantes" (Revisão) e na lista de motivos da Exportação, cada item com `diagnostico` renderiza um atributo `data-diagnostico` com esse texto; itens sem `diagnostico` não recebem o atributo.
- [ ] Quando há erro estrutural e o ambiente **não é produção** (`process.env.NODE_ENV !== "production"`), um `console.debug` emite os diagnósticos; em produção, nenhum log é emitido.
- [ ] Nada do diagnóstico técnico aparece como **texto visível** na tela (o usuário continua vendo só a `mensagem` operacional — testes-guarda da TASK-085 permanecem verdes).
- [ ] `data-testid`/`aria-*` existentes preservados; E2E verdes.

## Casos válidos

- Documento com Seção órfã (RN-018): o `<li>` de bloqueio tem `data-diagnostico` contendo `RN-018` e o caminho `autos.secoes[i].servicos[j]`; o `mensagem` visível continua "A Seção Cidade - Nome não está sendo usada…" sem RN.
- Violação sem tradução dedicada (uuid de Viagem duplicada, cai no fallback): a `mensagem` visível é genérica, mas o `data-diagnostico` traz `RN-005` + caminho, e o `console.debug` (fora de produção) lista o item.

## Casos inválidos

- Diagnóstico técnico (`[RN-xxx]`, `uuid`, caminho JSON) aparecendo como **texto visível** no `<li>` (não só em atributo) → regressão do tom da Spec 04 §14; teste-guarda garante que o `textContent` do item permanece sem `[RN-` e sem `uuid`.
- Log emitido em produção (`NODE_ENV === "production"`) → teste garante `console.debug` não chamado nesse ambiente.

## Testes esperados

- Unitários: `coletarErrosEstruturais` popula `diagnostico` com RN+caminho+mensagem crua para casos dedicados e fallback; `mensagem` inalterado; pendências de `coletarPendencias` continuam sem `diagnostico`.
- Unitários/componente: a lista de bloqueio (Revisão) e a de Exportação renderizam `data-diagnostico` quando presente e o omitem quando ausente; `textContent` do item não contém `[RN-`/`uuid` (o técnico só no atributo).
- Unitários: `console.debug` chamado fora de produção e **não** chamado com `NODE_ENV === "production"` (mock de `console.debug`/`process.env`).
- E2E: opcional — inspecionar `data-diagnostico` num documento com violação estrutural.
- Snapshot/contrato JSON: N/A (não toca contrato).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/pendencias/pendencias.ts` (campo opcional `diagnostico?: string` em `Pendencia`)
- `src/formulario/exportacao/gate-exportacao.ts` (montar `diagnostico`; `console.debug` guardado por ambiente)
- `src/formulario/revisao/tela-revisao.tsx` e `src/formulario/exportacao/tela-exportacao.tsx` (renderizar `data-diagnostico` no `<li>`)
- Testes correspondentes em `testes/unitarios/formulario/`

## Dependências

- **TASK-085** (entregue, aprovada — `docs-dev/14-REVISOES/TASK-085-20260717.md`) — fornece `coletarErrosEstruturais`/`errosEstruturais` que esta task enriquece.

## Riscos

- Vazar o diagnóstico técnico para texto visível (em vez de só atributo) reintroduz o tecniquês que a TASK-085 removeu (Spec 04 §14) — o teste-guarda de `textContent` é o freio.
- `console.debug` ruidoso em teste: guardar por `NODE_ENV` e, se necessário, silenciar/mokar nos testes que não o exercitam.
- Acoplar `data-diagnostico` a um seletor de E2E: é atributo de diagnóstico, não contrato de teste público — E2E existentes não devem depender dele.

## Perguntas em aberto

- Nenhuma (ferramenta de diagnóstico de DEV; não é regra de negócio, não altera spec nem contrato — o formato visível segue fixado pela Spec 04 §14 e pela TASK-085).

---

## TASK-087 — Remover uma parada (Seção/Local) de um itinerário reconcilia os `horarios_paradas` das Viagens já existentes

## Objetivo

Corrigir um **bug vivo**, irmão da TASK-084: ao remover uma parada de um itinerário que **já tem Viagens** (horários de saída inseridos na grade), os `horarios_paradas[]` de cada Viagem **não são reconciliados** — continuam com um elemento para a parada removida, de modo que a contagem deixa de bater com o novo `paradas.length`. Isso dispara a violação **RN-063** ("`horarios_paradas` deve ter exatamente um elemento por Parada do itinerário — mesmo conjunto de ordem, sem faltar nem sobrar", `validacoes-estruturais.ts:409-415`), bloqueando a exportação. Ao final, o write-back da remoção de parada **reconcilia** os `horarios_paradas[]` de todas as Viagens do itinerário afetado, mantendo o documento estruturalmente válido no mesmo commit.

## Contexto

Reportado pelo responsável (2026-07-18): "ao excluir uma seção de um serviço (após já ter inserido horários de saída no serviço), está retornando essa msg [RN-063]". A TASK-084 fechou o caminho **RN-018** (a Seção órfã em `secao.servicos[]`) da mesma ação de remover parada, mas **não** o caminho **RN-063**: são bugs distintos da **mesma** ação. Diagnóstico: `servicosComItinerarioAtualizado` (`etapa-itinerarios.tsx:276-294`) reescreve apenas `paradas`, `rota` e `matriz_distancias` do itinerário no write-back — **nunca toca `itinerario.viagens[].horarios_paradas`**. Como a rota é recalculada na remoção (os `trechos` mudam), os offsets antigos já ficariam defasados; além disso a **contagem** passa a violar a RN-063 assim que qualquer parada some. As primitivas de recomputação já existem e são puras: `sugerirOffsetsIniciais` (`viagens/sugestao-inicial-offsets.ts`, RN-064) e `recomputarOffsetsComAncoras` (`viagens/redistribuicao-offsets.ts`, RN-065). A reconciliação-alvo é o **reset à sugestão inicial** (RN-066): recomputar `horarios_paradas[]` de cada Viagem pela `sugerirOffsetsIniciais(novasParadas, novosTrechos)`, preservando `uuid`, `horario_saida`, `dia_semana` e `viagem_feriado` (conjunto que a RN-066 já manda preservar). As âncoras manuais são estado efêmero de sessão (DEC-049), não gravado no JSON — não sobrevivem nem a um reload —, então o reset ao baseline é consistente com o modelo e não inventa regra.

## Fora de escopo

- A limpeza de `secao.servicos[]` / descarte de Seção órfã na remoção de parada — é a **TASK-084** (mesma ação, caminho RN-018; entregue). Esta task roda **junto/depois** dela, no mesmo write-back.
- Tornar o bloqueio de exportação **visível** ao usuário — é a **TASK-085** (entregue). Esta task remove a **causa** RN-063; a 085 já cuida do feedback.
- Preservar as âncoras manuais das paradas **sobreviventes** ao reconciliar (em vez do reset ao baseline) — refinamento de UX possível, mas exige remapear âncoras por `parada_ordem` deslocada; fica para decisão explícita de sequenciamento na `/analisar-task`, com o reset (RN-066) como padrão seguro e já definido.
- Reconciliar Viagens diante de **inserir/reordenar** parada — embora seja o **mesmo** ponto de código (o write-back), o gesto reportado é a **remoção**; a `/analisar-task` decide se o critério "reconciliar sempre que `paradas` mudam" já cobre os três de graça (recomendado, pois é a mesma correção) ou se restringe à remoção.
- Qualquer mudança de contrato JSON, de PDF ou do Comparador.

## Specs fonte

- Spec 02 §11 / §11.1 / §14 (Viagem, `horarios_paradas`, integridade estrutural)
- Spec 03 §8.1 (sugestão inicial por acúmulo de `duracao_s`) / §8.3 (reset à sugestão inicial)
- Spec 04 §7.3 (recálculo ao remover parada) / §8 (grade de horários por Serviço × sentido)

## Regras envolvidas

- RN-063 (um `horario_parada` por Parada; monotônico; primeiro `00:00:00`) — a violação que esta task fecha
- RN-064 (sugestão inicial por acúmulo de durações) — base da recomputação
- RN-066 (reset à sugestão inicial preservando `uuid`/`horario_saida`/`dia_semana`/`viagem_feriado`) — comportamento-alvo
- RN-065 (redistribuição por âncoras) — só se a `/analisar-task` optar por preservar âncoras sobreviventes (fora do escopo padrão)
- RN-004 (UUIDs preservadas — as Viagens mantêm `uuid` na reconciliação; round-trip)

## Entidades afetadas

- Viagem (`horarios_paradas[]`), Parada, Itinerário

## Ferramentas afetadas

- [x] Formulário

## Critérios de aceite

- [ ] Remover uma parada de um itinerário que já tem Viagens reconcilia os `horarios_paradas[]` de **todas** as Viagens daquele itinerário: exatamente um elemento por Parada sobrevivente, na nova `ordem` (RN-063).
- [ ] Os offsets reconciliados são a sugestão inicial (RN-064) sobre os **novos** `paradas`/`trechos`; o primeiro é `"00:00:00"` e a sequência é não decrescente (RN-063).
- [ ] `uuid`, `horario_saida`, `dia_semana` e `viagem_feriado` de cada Viagem são preservados (RN-066/RN-004) — round-trip de UUID.
- [ ] Após a remoção, o documento **não** apresenta a violação RN-063 em `coletarViolacoesEstruturais` (deixa de bloquear a exportação por esse motivo).
- [ ] Itinerário **sem** Viagens (grade ainda não preenchida) continua funcionando como hoje — a reconciliação é no-op quando `viagens` está vazio.
- [ ] A reconciliação ocorre no **mesmo commit** do write-back da remoção (junto da limpeza de Seção da TASK-084), sem deixar o documento inválido entre gestos.

## Casos válidos

- Serviço A→B→C→D com Viagens preenchidas (4 `horarios_paradas` por Viagem); remover C → cada Viagem passa a ter 3 `horarios_paradas` (ordem 1..3), offsets re-derivados dos novos trechos, `horario_saida`/`uuid` intactos; exportação deixa de bloquear por RN-063.
- Itinerário com 2 Viagens (uma comum, uma de feriado); remover uma parada intermediária → **ambas** reconciliadas; nenhuma sobra com a contagem antiga.

## Casos inválidos

- Remover uma parada **sem** reconciliar os `horarios_paradas` (comportamento atual) → RN-063 em `coletarViolacoesEstruturais` — é a regressão que esta task fecha; teste-guarda garante que a violação some.
- Reconciliação que **altere** `horario_saida`/`dia_semana`/`viagem_feriado`/`uuid` de alguma Viagem → recusada pelos testes de preservação (RN-066/RN-004).

## Testes esperados

- Unitários: a reconciliação pura (recompor `horarios_paradas[]` de uma lista de Viagens contra novos `paradas`/`trechos` via `sugerirOffsetsIniciais`) — contagem = `paradas.length`, primeiro `00:00:00`, não decrescente, campos preservados, no-op para `viagens: []`, não muta a entrada.
- Integração: remover parada na tabela lateral num itinerário com Viagens → documento resultante passa em `coletarViolacoesEstruturais` (sem RN-063) e em `esquemaDocumentoOperacao`; OSRM mockado.
- E2E: opcional — inserir horário na grade, voltar, remover Seção e confirmar que a exportação libera (coordenar com a TASK-085 se a visibilidade do gate for exercitada).
- Snapshot/contrato JSON: documento resultante válido; UUIDs de Viagem preservadas (round-trip RN-004).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/viagens/` (nova função pura de reconciliação, ou reuso direto de `sugerirOffsetsIniciais` mapeada sobre `itinerario.viagens`)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (`servicosComItinerarioAtualizado` passa a reconciliar `viagens[].horarios_paradas` ao reescrever `paradas`/`rota`)
- Testes correspondentes em `testes/unitarios/formulario/` e `testes/unitarios/contrato/`

## Dependências

- **TASK-084** (entregue) — fecha o caminho RN-018 da **mesma** ação de remover parada; esta task fecha o caminho RN-063 no mesmo write-back. Coordenar para que ambas as limpezas ocorram no mesmo commit.
- **TASK-019/TASK-061/TASK-080** (entregues) — write-back de itinerário e promoção de Serviço que esta task estende.

## Riscos

- Reconciliar Viagens de **todos** os itinerários vs. só o editado: a remoção de parada é por sentido, mas a RN-030 mantém o conjunto de Seções espelhado — garantir que a reconciliação atinja o itinerário efetivamente reescrito no write-back (o do sentido corrente) e que o outro sentido, se tocado pelo espelho (TASK-077), também seja reconciliado.
- Perda das âncoras manuais do usuário no reset (RN-066): é o comportamento-alvo e consistente com DEC-049 (âncoras efêmeras), mas deve ser confirmado na `/analisar-task` antes de implementar preservação de âncoras sobreviventes.

## Perguntas em aberto

- Nenhuma bloqueante (bug de integridade; comportamento-alvo determinado por RN-063 + RN-064/RN-066 e pelo precedente da TASK-084). A escolha entre **reset ao baseline** (padrão) e **preservar âncoras sobreviventes**, e a extensão a inserir/reordenar, são decisões de escopo/sequenciamento a fixar na `/analisar-task` — não dependem de decisão de domínio nova.

---

# TASK-088 — Remover Seção reconcilia `matriz_seccionamento` com `matriz_distancias`

## Objetivo

Ao editar um itinerário e remover uma Seção atendida pelo Serviço, reconciliar
`matriz_seccionamento` no mesmo write-back que recompõe `matriz_distancias`,
eliminando pares que deixaram de existir e mantendo o documento exportável pela
RN-059.

## Contexto

Bug vivo reportado pelo responsável em 2026-07-20: após remover uma Seção, a
exportação é bloqueada por `[RN-059] par de matriz_seccionamento deve existir em
matriz_distancias deste mesmo Serviço`. O write-back atual em
`servicosComItinerarioAtualizado` recompõe `matriz_distancias` pela TASK-026,
mas preserva integralmente a `matriz_seccionamento` anterior. Assim, pares que
referenciam a Seção removida ficam obsoletos.

A TASK-084 já limpa `secao.servicos[]` e descarta a Seção órfã; a TASK-046 já
reconcilia `horarios_paradas`. Esta task fecha apenas a terceira consequência
estrutural da mesma edição: a integridade entre as duas matrizes. Como
`matriz_seccionamento.distancia_km` é valor confirmado/editado pelo usuário
(RN-058), pares sobreviventes preservam seu valor; somente pares ausentes na
nova `matriz_distancias` são removidos.

## Fora de escopo

- Alterar o cálculo de `matriz_distancias` (TASK-026) ou seus valores.
- Alterar o editor da matriz de seccionamento, os botões de sugestão ou a regra
  de `distancia_km` confirmada (TASK-027; RN-058/RN-060).
- Habilitar automaticamente novos pares ao inserir uma Seção.
- Recalcular ou substituir `distancia_km` dos pares sobreviventes.
- Alterar a limpeza de `secao.servicos[]`, o descarte de Seção órfã ou a
  reconciliação de horários (TASK-084/TASK-046).
- Alterar o gate ou as mensagens de exportação (TASK-085/TASK-086/TASK-082).
- Qualquer mudança no contrato JSON, Comparador, PDF ou Ingestor.

## Specs fonte

- Spec 02 §8 — `matriz_distancias` contém todas as combinações de Seções
  atendidas pelo Serviço.
- Spec 02 §9 — cada par de `matriz_seccionamento` deve existir em
  `matriz_distancias`; `distancia_km` é o valor confirmado pelo usuário.
- Spec 02 §14 — integridade estrutural das duas matrizes.

## Regras envolvidas

- RN-054 — `matriz_distancias` tem todas as combinações não ordenadas de Seções
  atendidas pelo Serviço.
- RN-058 — `matriz_seccionamento` guarda pares habilitados e a distância
  confirmada/editada pelo usuário.
- RN-059 — cada par de seccionamento deve existir na `matriz_distancias` do
  mesmo Serviço, sem duplicatas e independentemente da ordem `{a,b}`.
- RN-015 — a reconciliação ocorre no Formulário; leitores não recalculam dados
  congelados.

## Entidades afetadas

- Serviço.
- Seção.
- Itinerário/Parada, apenas como origem da mudança do conjunto atendido.
- `ParDistancia` (`matriz_distancias`).
- `ParSecao` (`matriz_seccionamento`).

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor (⚠ exige decisão humana — RN-093)
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Depois de recompor `matriz_distancias`, `matriz_seccionamento` contém
      somente pares cuja chave não-direcional ainda existe na nova matriz.
- [ ] Remover uma Seção elimina todos e somente os pares de seccionamento que a
      referenciam; pares entre Seções sobreviventes permanecem.
- [ ] `distancia_km` e a ordem de armazenamento dos pares sobreviventes são
      preservados, sem reaplicar sugestões ou valores de `matriz_distancias`.
- [ ] Inserir uma Seção cria os novos pares apenas em `matriz_distancias` e não
      os habilita automaticamente em `matriz_seccionamento`.
- [ ] Editar Local, reordenar as mesmas Seções ou recalcular apenas a rota
      preserva todos os pares de seccionamento ainda válidos.
- [ ] A reconciliação ocorre no mesmo update de sessão do write-back de
      Paradas/rota, matriz de distâncias, horários e limpeza de Seções.
- [ ] O documento resultante não apresenta RN-059 e passa pela validação
      estrutural/exportação quando não houver outras violações.

## Casos válidos

- Serviço com Seções A, B e C, `matriz_distancias = [AB, AC, BC]` e
  `matriz_seccionamento = [AB(10), AC(20), BC(12)]`; remover C resulta em
  `matriz_distancias = [AB]` e `matriz_seccionamento = [AB(10)]`.
- No mesmo cenário, inserir D gera AD/BD/CD em `matriz_distancias`, mas mantém
  apenas os pares de seccionamento que o usuário já havia habilitado.
- Remover ou mover um Local intermediário, mantendo A/B/C, preserva integralmente
  `[AB(10), AC(20), BC(12)]`, mesmo que as distâncias roteadas mudem.

## Casos inválidos

- Preservar `AC` ou `BC` em `matriz_seccionamento` após C deixar de existir na
  nova `matriz_distancias` deve ser impedido pelo teste de regressão RN-059.
- Reconciliar sobrescrevendo `AB.distancia_km = 10` pelo novo
  `valor_adotado_de_distancia` é inválido: o valor confirmado do usuário deve
  permanecer.
- Inserir D e habilitar automaticamente AD/BD/CD em `matriz_seccionamento` é
  inválido: habilitação continua sendo escolha explícita do usuário.

## Testes esperados

- Unitários: função pura de reconciliação por chave não-direcional; remoção de
  todos e somente os pares obsoletos; preservação de `distancia_km`, ordem e
  imutabilidade; matriz vazia; ordem invertida `{a,b}`/`{b,a}`.
- Integração: write-back de remoção de Seção recompõe `matriz_distancias`,
  filtra `matriz_seccionamento` no mesmo update e produz documento sem RN-059;
  OSRM mockado.
- E2E: opcional — remover Seção com par de seccionamento habilitado e confirmar
  que a exportação deixa de bloquear por RN-059.
- Snapshot/contrato JSON: documento resultante passa no schema strict e em
  `coletarViolacoesEstruturais`; nenhuma mudança de contrato.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/matrizes/` — função pura para reconciliar pares de
  `matriz_seccionamento` contra `matriz_distancias` e exportação no `index.ts`.
- `src/formulario/itinerarios/etapa-itinerarios.tsx` — aplicar a reconciliação
  em `servicosComItinerarioAtualizado` no mesmo write-back.
- `testes/unitarios/formulario/` — testes puros e de integração do fluxo.

## Dependências

- TASK-026 — cálculo/recomposição de `matriz_distancias` (entregue).
- TASK-027 — semântica e operações de `matriz_seccionamento` (entregue).
- TASK-084 — limpeza de Seção na mesma ação de remoção (entregue).
- TASK-046 — reconciliação de horários no mesmo write-back (entregue).

## Riscos

- Filtrar por par ordenado apagaria escolhas válidas quando o armazenamento usa
  `{b,a}`; reutilizar `chaveParNaoDirecional` da TASK-026/RN-059.
- Recalcular `distancia_km` de par sobrevivente apagaria confirmação manual do
  usuário e violaria RN-058.
- Aplicar a limpeza em commit separado criaria uma janela de documento inválido
  entre o recálculo da matriz e a reconciliação.
- A futura TASK-077, ao espelhar remoções entre Ida/Volta, deve continuar
  passando pelo mesmo write-back consolidado.

## Perguntas em aberto

Nenhuma. A remoção de pares inexistentes é exigida pela RN-059, e a preservação
dos valores sobreviventes decorre da confirmação explícita da RN-058.

---

# TASK-089 — E2E `etapa-itinerarios.spec.ts:71` afere ausência de **bloqueante**, não ausência de pendência

## Objetivo

O E2E "mover parada recalcula com sucesso e atualiza a descrição (composer REAL,
DEC-046)" volta a passar, aferindo o que a RN-078 de fato garante — que um
recálculo bem-sucedido não deixa pendência **bloqueante** — em vez de exigir
painel de pendências totalmente vazio, condição que o alerta não bloqueante da
TASK-081 tornou impossível no fixture usado.

## Contexto

Achado registrado em `docs-dev/19-STATUS_EXECUCAO.md` §6.4, durante a
reavaliação da TASK-065
(`docs-dev/14-REVISOES/TASK-065-20260720-reavaliacao.md`, problema 4).

`testes/e2e/etapa-itinerarios.spec.ts:117` exige
`painel-pendencias → pendencia-item` com contagem **0** após a reordenação. A
**TASK-081** (`06a7ed4`) passou a emitir o alerta agregado "Serviços 0001-1SU,
0001-2SU sem grade de feriados — confirme se é intencional"
(`src/formulario/pendencias/pendencias.ts:184`), e o fixture
`testes/fixtures/carregar-multi-servico.json` não tem Viagem de feriado em
nenhum Serviço — então o painel legitimamente exibe 1 item de severidade
`alerta`, e a asserção falha. Falha **determinística**, 3/3 em `--repeat-each=3`,
não flakiness.

O comportamento do produto está **correto** pela RN-071 (grade vazia é válida,
vira alerta) e pela RN-078 (alerta não bloqueia). O defeito é da asserção, que
confunde "sem pendência bloqueante" com "sem nenhum item no painel". A intenção
original do teste — provada pelos vizinhos `:116` (`mensagem-sem-rota` ausente)
e `:134-144` (o caso de falha do OSRM, que exige `data-severidade="bloqueante"`)
— é que o recálculo bem-sucedido não produza bloqueio.

## Fora de escopo

- **Alterar `testes/fixtures/carregar-multi-servico.json`** para ganhar grade de
  feriados: fixture canônica compartilhada (TASK-041), consumida por outros
  testes; mudá-la para calar um alerta é conserto pelo lado errado e arrisca
  regressão fora desta task.
- Qualquer mudança em `src/formulario/pendencias/` — o alerta da TASK-081 está
  correto e permanece exatamente como está (RN-071/RN-078).
- Rever a granularidade ou o texto do alerta de feriados (decisão do responsável
  registrada na TASK-081).
- O outro vermelho histórico dessa suíte: nada a fazer sobre `:465`
  (clique direito sobre a linha), já verde pela TASK-065.
- Estabilização geral de E2E (paralelismo, subida do `next dev`) — não é desta
  task.

## Specs fonte

- Spec 04 §11 (taxonomia de pendências da Revisão: erros bloqueantes × alertas;
  "tabela de feriados vazia" está entre os **alertas**)
- Spec 04 §12 (o gate de exportação olha bloqueantes)
- Spec 03 §9.3 (grade de feriados)

## Regras envolvidas

- RN-078 (alertas **não** bloqueiam; só bloqueantes bloqueiam — é a regra que a
  asserção nova passa a aferir)
- RN-071 (grade de feriados vazia é válida, alerta não bloqueante — a razão de o
  item existir no painel)
- RN-048 (itinerário sem rota é bloqueante — o que o teste realmente quer negar
  no caminho de sucesso)
- RN-052 (editar recalcula — o comportamento sob teste, inalterado)

## Entidades afetadas

- Nenhuma. Nenhum modelo, nenhum campo: a alteração é de asserção de teste.

## Ferramentas afetadas

- [x] Formulário (só a suíte E2E; nenhum arquivo de `src/`)
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] `npx playwright test testes/e2e/etapa-itinerarios.spec.ts --workers=1`
      passa **9/9**, sem `--repeat-each` e com `--repeat-each=3` no teste
      corrigido.
- [ ] A asserção corrigida afere **ausência de pendência bloqueante**
      (`pendencia-item` filtrado por `data-severidade="bloqueante"`), não
      contagem total do painel.
- [ ] O teste continua provando o que provava: descrição recomposta pelo composer
      REAL ("Via Reordenada 1"), `mensagem-sem-rota` ausente, nova ordem das
      paradas — nenhuma dessas asserções é removida ou enfraquecida.
- [ ] O alerta de feriados **não** é silenciado: nem o fixture, nem
      `src/formulario/pendencias/`, nem o painel são alterados
      (`git show --stat` da task não contém nenhum arquivo de `src/`).
- [ ] Nenhuma outra asserção da suíte E2E exige painel de pendências vazio por
      contagem total — verificado por varredura de `pendencia-item` em
      `testes/e2e/` e corrigido no mesmo padrão se houver outra ocorrência.
- [ ] `npm test`, `npm run typecheck` e `npm run lint` permanecem verdes.

## Casos válidos

- Reordenar a primeira parada do itinerário de Volta do Serviço 0001-1SU com o
  OSRM mockado respondendo `code: "Ok"`: rota recalculada, descrição contendo
  "Via Reordenada 1", **zero** pendências bloqueantes — e o alerta de feriados
  presente no painel sem reprovar o teste.
- O mesmo cenário num documento hipotético **com** grade de feriados: continua
  verde (a asserção nova não depende da presença ou ausência do alerta).

## Casos inválidos

- OSRM devolvendo `NoRoute` (teste vizinho `:120`): a pendência bloqueante
  "está sem rota calculada" **aparece** e o filtro por
  `data-severidade="bloqueante"` a encontra — a asserção nova não pode tornar o
  caso de falha indistinguível do de sucesso.
- Substituir a asserção por remoção pura (apagar a linha `:117`) é inválido:
  perderia a garantia de RN-048/RN-078 no caminho de sucesso.
- Trocar a contagem total 0 por contagem total 1 (contar o alerta) é inválido:
  amarraria o teste de recálculo a um alerta de outra área, que volta a quebrar
  quando qualquer alerta novo entrar.

## Testes esperados

- Unitários: N/A — nenhum código de produção muda.
- Integração: N/A.
- E2E: `testes/e2e/etapa-itinerarios.spec.ts:71` corrigido e verde; os outros 8
  testes da suíte seguem verdes; `formulario-layout.spec.ts` (que já filtra
  `pendencia-item` por texto e severidade) permanece intocado e verde.
- Snapshot/contrato JSON: N/A.
- PDF: N/A.

## Arquivos prováveis

- `testes/e2e/etapa-itinerarios.spec.ts` — alterar a asserção `:117` (e só ela,
  salvo outra ocorrência encontrada na varredura).

## Dependências

- **TASK-081** (entregue) — origem do alerta que expôs a asserção frágil.
- TASK-019/044/DEC-046 (entregues) — donas do teste e do comportamento aferido.

## Riscos

- **Enfraquecer o teste ao consertá-lo:** filtrar por severidade não pode virar
  desculpa para deixar de afirmar a ausência de bloqueio; o caso `NoRoute`
  vizinho é a prova de que o filtro ainda detecta bloqueante.
- **Corrigir pelo fixture:** dar grade de feriados ao
  `carregar-multi-servico.json` faria o teste passar, mas mudaria a entrada de
  todos os outros consumidores da fixture canônica — daí o "Fora de escopo".
- **Reincidência:** qualquer alerta novo em `coletarPendencias` volta a quebrar
  qualquer asserção de contagem total; a varredura pedida nos critérios existe
  para não deixar outra igual para trás.

## Perguntas em aberto

Nenhuma. O comportamento correto está fixado pela RN-071 (alerta) e pela RN-078
(alerta não bloqueia); a task só realinha a asserção do teste com a regra.

---

# TASK-090 — Executor canônico e controlado da suíte completa para implementação e revisão

## Objetivo

Criar um único executor canônico para os testes unitários e E2E do ROTA, com
log verificável, servidor Next em porta dedicada e ciclo de vida controlado. A
implementação de qualquer task passa a produzir esse artefato uma única vez no
fim; a revisão reutiliza o log quando o conteúdo testado ainda coincide, sem
repetir desnecessariamente a suíte pesada.

## Contexto

Execuções do Playwright iniciadas por agentes têm repetidamente concluído os
casos mas permanecido presas no teardown do `next dev`; processos órfãos e a
reutilização da porta 3000 contaminam a execução seguinte com timeouts
artificiais. Na mesma máquina, a execução humana registrada em
`ultimo-test-all.log` terminou normalmente em menos de dois minutos (1.051
unitários e 58 E2E, ambos com código 0), demonstrando que o gargalo não é a
suíte nem seus quatro workers, mas o ownership do servidor/processos no caminho
automatizado.

Já existe no working tree um rascunho não commitado,
`scripts/executar-test-all-log.mjs`, e scripts preliminares em `package.json`.
Eles são insumo desta task, não entrega aceita de antemão: hoje agregam os dois
comandos e escrevem o log, mas ainda não possuem porta exclusiva, health check,
timeout global, fingerprint do conteúdo testado nem limpeza explícita da árvore
de processos.

A skill `implementar-task` já exige testes direcionados durante o trabalho e,
ao fim, lint/typecheck, uma única suíte completa e E2E/build sequenciais. Falta
canonizar **qual comando** produz a evidência final e como a conversa de
`revisar-aderencia` valida/reutiliza essa evidência.

## Fora de escopo

- Alterar regras de negócio, componentes de produção, contrato JSON, fixtures
  canônicas ou asserções funcionais dos testes existentes.
- Reduzir workers, pular testes, aumentar timeouts de casos para mascarar
  lentidão ou converter falha em aviso.
- Matar todos os processos `node`, limpar portas de forma ampla ou encerrar
  processo que não tenha sido criado pelo executor corrente.
- Depender de OSRM, tiles ou qualquer serviço externo real; os mocks atuais
  permanecem obrigatórios.
- Transformar logs em artefatos versionados ou fonte de verdade de negócio.
- Executar implementação e revisão formal na mesma conversa; a fronteira entre
  as skills permanece intacta.
- Corrigir as lacunas funcionais/coberturas da TASK-068 ou executar a TASK-089.

## Specs fonte

- Spec 01 §5/§6 — operação client-side e identidade preservada, protegidas pela
  regressão completa de importação/exportação.
- Spec 02 §10.1/§12 — extremos-Seção e UUIDs, invariantes da suíte fixa.
- Spec 03 §3.5/§3.6.2 — falha bloqueante do OSRM e abertura sem recálculo,
  cenários que exigem E2E determinístico com rede mockada.
- Spec 04 §11/§12/§14 — pendências, gate de exportação e estados de erro
  verificados pela suíte completa.

## Regras envolvidas

- RN-004 (round-trip preserva UUIDs)
- RN-010/013 (schema fechado, sem workflow e sem R$)
- RN-035 (extremos do itinerário são Seções)
- RN-041/042 (ponto de rota não cria Parada nem trecho)
- RN-048 (falha do OSRM bloqueia)
- RN-052 (abrir não chama OSRM; editar recalcula)
- RN-069 (feriado não altera contagens)
- RN-078 (pendências bloqueantes impedem exportação)
- RN-080 (Comparador permanece offline e somente-leitura)

Estas RN não ganham comportamento novo nesta task; são o conjunto crítico cuja
evidência não pode ser perdida, pulada ou falsamente marcada como verde pelo
executor.

## Entidades afetadas

- Nenhuma entidade de domínio. Afeta somente infraestrutura de testes, processo
  de implementação/revisão e seus artefatos efêmeros.

## Ferramentas afetadas

- [ ] Formulário (nenhum código de produção)
- [ ] Comparador (nenhum código de produção)
- [ ] Ingestor
- [ ] PDF (nenhum código de produção)
- [ ] JSON (contrato)
- Infraestrutura transversal: Vitest, Playwright, servidor Next de teste,
  scripts npm e skills operacionais.

## Critérios de aceite

- [ ] `npm run test:all:log` é o comando canônico único para a suíte completa
      (Vitest + Playwright), executa as etapas sequencialmente e devolve código
      0 somente se ambas terminarem verdes.
- [ ] O executor E2E é dono do servidor Next usado no teste: utiliza porta
      dedicada/configurável diferente de 3000, recusa porta já ocupada, inicia
      o servidor, aguarda health check e só então chama o Playwright.
- [ ] No caminho canônico, o Playwright não inicia nem reutiliza outro
      `webServer`; `reuseExistingServer` não permite executar contra servidor
      desconhecido.
- [ ] Sucesso, falha de teste, timeout, `SIGINT`, `SIGTERM` e exceção passam por
      `finally` que encerra **somente** a árvore do PID criado pelo executor.
      No Windows, eventual `taskkill /PID <pid> /T /F` usa o PID explícito do
      processo próprio; nunca há busca/kill amplo por nome.
- [ ] Há timeout configurável para boot e para a execução completa. Timeout
      termina com código não zero, registra a etapa e limpa o processo próprio.
- [ ] O log é escrito primeiro em arquivo temporário e só recebe marcador final
      `Resultado geral`/fim após todas as etapas fecharem. Log interrompido não
      pode parecer aprovado.
- [ ] O log registra: executor informado (`humano`, `Codex` ou equivalente),
      início/fim, Node/npm, branch/commit, estado sujo, comandos, porta, PID,
      códigos/sinais, tempos, limpeza e SHA-256 de um fingerprint determinístico
      dos arquivos relevantes (`src/`, `testes/`, configurações e manifests).
- [ ] Um verificador lê o log e retorna válido somente quando: marcador final
      aprovado existe, os dois códigos são 0 e o fingerprint atual coincide.
      Log ausente, truncado, vermelho ou de conteúdo diferente é rejeitado com
      motivo operacional legível.
- [ ] `implementar-task` passa a exigir: testes direcionados durante a edição;
      lint/typecheck; build quando aplicável; e **uma única** execução final de
      `npm run test:all:log`, preservando o log para a revisão. Falha é corrigida
      e repetida; processos pesados nunca rodam em paralelo.
- [ ] `revisar-aderencia` valida primeiro o log canônico. Se estiver aprovado e
      o fingerprint coincidir, registra quem executou e **não repete** a suíte;
      se estiver ausente/inválido/desatualizado, executa o comando uma única vez.
- [ ] `CLAUDE.md`, `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`,
      `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md` e
      `docs-dev/08-TEST_STRATEGY.md` documentam o mesmo protocolo, comando e
      critério de reutilização, sem instruções concorrentes.
- [ ] A execução canônica real termina por conta própria, sem intervenção
      manual, com 1.051+ testes unitários e 58+ E2E verdes no baseline atual;
      ao final, a porta dedicada está livre e nenhum processo criado permanece.
- [ ] O comando direto `npm test` continua disponível para testes direcionados;
      o caminho canônico não altera as asserções nem a quantidade da suíte.

## Casos válidos

- Execução humana limpa: `npm run test:all:log -- --executor=humano` inicia o
  servidor na porta dedicada, conclui unitários/E2E, limpa o PID, grava códigos
  0 e gera log aceito pelo verificador.
- Implementação executada pelo Codex antes do commit: após o commit, a revisão
  aceita o log porque o fingerprint de conteúdo coincide, mesmo que o hash do
  commit tenha mudado apenas para registrar aqueles mesmos arquivos.
- Revisão com log válido produzido pelo responsável: atribui a execução ao
  humano, registra a evidência no parecer e não roda a suíte outra vez.
- Duas execuções legítimas em momentos distintos: a segunda começa com a porta
  livre e não encontra processo órfão da primeira.

## Casos inválidos

- Porta dedicada já ocupada antes do início → falha rápida, informa porta/PID
  quando identificável e não reutiliza o servidor existente.
- E2E trava além do timeout → código não zero, log marcado como falha/timeout e
  árvore do processo próprio encerrada.
- Vitest ou Playwright retorna código não zero → resultado geral falha; nenhuma
  etapa vermelha é convertida em aprovada.
- Processo interrompido antes do resumo → arquivo sem marcador final é rejeitado
  pelo verificador.
- Código/teste/configuração muda depois do log → fingerprint diverge; revisão
  rejeita o artefato e executa a suíte uma única vez.
- Log aprovado de outro working tree ou sem identificação de executor → não é
  evidência reutilizável.
- Servidor externo já ativo na porta 3000 → irrelevante para o executor; ele não
  reutiliza nem encerra esse processo.

## Testes esperados

- Unitários: parser/verificador do log; fingerprint estável e sensível a mudança;
  composição do resumo; códigos 0/não zero; timeout; log truncado; validação do
  executor informado.
- Integração: processo HTTP descartável em porta dedicada para provar health
  check, detecção de porta ocupada, timeout e limpeza por PID sem atingir um
  segundo processo testemunha.
- E2E: executar `npm run test:all:log` no baseline real e comprovar códigos 0,
  marcador final, fingerprint aceito, porta livre e ausência do PID após saída.
- Snapshot/contrato JSON: N/A — contrato não muda.
- PDF: N/A — conteúdo/geração não mudam.

## Arquivos prováveis

- `package.json` — comandos canônicos (aproveitar/revisar o rascunho existente).
- `scripts/executar-test-all-log.mjs` — orquestração, log e resultado geral.
- `scripts/executar-e2e-controlado.mjs` — ownership do Next/Playwright, health
  check, timeout e cleanup por PID (ou módulo equivalente pequeno).
- `scripts/verificar-log-test-all.mjs` — validação/fingerprint reutilizável (ou
  módulo equivalente compartilhado).
- `playwright.config.ts` — base URL/porta externa no caminho canônico, sem reuso
  de servidor desconhecido.
- `testes/unitarios/scripts/` — testes dos módulos de infraestrutura.
- `CLAUDE.md`
- `.claude/skills/implementar-task/SKILL.md`
- `.claude/skills/revisar-aderencia/SKILL.md`
- `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`
- `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md`
- `docs-dev/08-TEST_STRATEGY.md`

## Dependências

- Nenhuma Q-xxx pendente. Decisão explícita do responsável em 2026-07-21:
  canonizar o executor na implementação e na revisão, com ownership/cleanup e
  reutilização do log humano válido.
- Recomendada como **próxima task operacional**, antes de novas implementações
  ou revisões pesadas, para interromper o desperdício recorrente.

## Riscos

- Encerrar processo alheio: mitigado por porta exclusiva e PID capturado no
  `spawn`; cleanup amplo por nome é proibido.
- Falso verde por log antigo: mitigado por marcador final, códigos e fingerprint
  do conteúdo testado.
- Falso vermelho por commit posterior ao teste: fingerprint é de conteúdo, não
  apenas do hash Git.
- Duplicar a suíte entre implementação e revisão: mitigado pela validação do
  log antes de qualquer execução na revisão.
- Complexidade cross-platform: separar lifecycle, fingerprint e parser em
  módulos pequenos e testar Windows/POSIX sem adicionar dependência de servidor.
- Working tree já contém rascunhos do executor; a implementação deve preservar
  e avaliar essas mudanças, não sobrescrevê-las cegamente.

## Perguntas em aberto

Nenhuma. O responsável aprovou explicitamente as propostas de porta dedicada,
ownership do servidor, timeout, cleanup, log canônico e uso tanto por
`implementar-task` quanto por `revisar-aderencia`.

---

## TASK-091 — Redesenho da tabela lateral unificada da etapa de itinerários (colunas explícitas, densidade e "X" de remover)

## Objetivo

A lista lateral da etapa de itinerários (paradas + pontos de rota intercalados, DEC-060/TASK-079) passa a ter **colunas explícitas** — `Cidade - Nome` · Tipo · mover (↑/↓) · remover ("X") —, todas na **mesma linha** por item, com **linhas mais compactas** e **zebrado de maior contraste**. É uma redecoração de apresentação: nenhum dado, nenhuma regra de montagem/rota e nenhum comportamento de edição mudam.

## Contexto

Reportado pelo responsável (2026-07-22): a tabela atual (`src/formulario/itinerarios/etapa-itinerarios.tsx`) tem só duas colunas ("Item do itinerário" / "Ações"), com rótulo e coordenadas amontoados na primeira e todos os botões ("↑", "↓", "Remover") na segunda; o zebrado herdado do componente `Tabela` (doc 18 §3 — `nth-child(even):bg-cinza-50`, hover `azul-50`) tem contraste baixo e as linhas são altas, dificultando a leitura. A lista unificada (TASK-079), o gesto de sync (TASK-064) e os motores de Seção/Local/ponto de rota já existem e permanecem intactos — esta task só reorganiza a superfície da tabela.

## Fora de escopo

- Sincronização de seleção tabela↔mapa e o scroll-into-view da linha selecionada — é a **TASK-064**. Esta task apenas **compõe** com o realce de seleção; não o reimplementa.
- Qualquer regra de OSRM / 350 m / montagem / ancoragem / reordenação — preservada: as setas continuam chamando `moverParada`/`moverPontoDeRotaNaTabela` e o "X" continua chamando `removerParadaNaTabela`/`aoRemoverPontoDeRota`.
- Vocabulário visual dos marcadores do mapa (TASK-068/DEC-069) — inalterado.
- Contrato JSON/schema — seleção e decoração são estado de UI efêmero (RN-096); nada é persistido.
- Alterar o token **global** de zebra de forma que afete outras tabelas do app sem a decisão da **Q-052**.

## Specs fonte

- Spec 04 §7/§7.3 (tabela lateral de paradas na etapa de itinerários)
- Spec 02 §5 (Seção = município + nome; convenção de exibição `Cidade - Nome da Seção`)
- Spec 02 §10.1/§10.4 (ordem de travessia; ponto de rota ancorado, sem identidade)
- doc 18 §2/§3/§4 (tokens; componente `Tabela` com zebra/hover; **variação por prop, nunca por `className`**) — vinculante (DEC-050)

## Regras envolvidas

- RN-025 (Seção tem município + nome — base do rótulo `Cidade - Nome`)
- RN-031 (Local pertence ao Serviço — a coluna "Tipo" o distingue como "Local de parada")
- RN-042 (ponto de rota sem identidade; é item discriminado, **não** Parada — a coluna "Tipo" e a ausência de `Cidade - Nome` refletem isso)
- RN-096 (redecoração não persiste nada; exportar JSON é o salvar)

## Entidades afetadas

- Seção, Local, ponto de rota (só apresentação na tabela; sem mudança de modelo)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] A tabela lateral tem colunas explícitas — `Cidade - Nome` · Tipo · Mover · Remover — todas na mesma linha por item.
- [ ] A coluna "Tipo" usa o vocabulário definido na **Q-052** para os três casos (Seção / Local de parada / ponto de rota).
- [ ] O ponto de rota, que não tem `Cidade - Nome`, exibe na coluna de nome o que a Q-052 definir (ex.: "Ponto de rota N" + coordenadas) e **continua** item discriminado, sem receber `parada-item` (RN-042).
- [ ] O botão de remover é um "X" compacto, com `aria-label` acessível, **preservando** os `data-testid` existentes (`parada-remover`, `remover-ponto-rota`).
- [ ] As setas ↑/↓ preservam `data-testid` e handlers atuais (`parada-mover-cima`/`-baixo`, `ponto-rota-mover-cima`/`-baixo`) e as regras de desabilitar (extremos / `podeMoverPontoDeRotaNaLista`).
- [ ] Linhas mais compactas e zebrado de maior contraste conforme a Q-052, **sem** alterar o token global de outras tabelas se a Q-052 optar por variante local.
- [ ] O zebrado **compõe com, sem mascarar**: o vermelho de Local extremo (DEC-070), o ciano do ponto de rota (DEC-069) e o realce de seleção da TASK-064 — os quatro estados perceptíveis simultaneamente, conforme a Q-052.
- [ ] Nenhuma mudança de dado/JSON e nenhum recálculo/OSRM disparado pela redecoração.
- [ ] E2E existentes verdes sem alterar seletores.

## Casos válidos

- Lista com 3 paradas + 1 ponto de rota intercalado → 4 linhas, cada uma com nome, tipo, setas e "X"; zebra alternada perceptível; a linha de ponto de rota mostra "Ponto de rota 1" na coluna de nome e "ponto de rota" na coluna Tipo.
- Linha de Local extremo inválido → mantém `data-estado="local-extremo"`, com texto/borda vermelhos legíveis **tanto** sobre a faixa clara **quanto** sobre a faixa escura do zebrado.

## Casos inválidos

- "X" que perca o `data-testid`/handler de remover → recusado (teste-guarda de seletor + E2E).
- Zebra/seleção que torne o vermelho de Local extremo imperceptível → recusado (teste de composição conforme Q-052).
- Ponto de rota recebendo `parada-item` ou a coluna `Cidade - Nome` preenchida como se fosse Parada → recusado (RN-042).

## Testes esperados

- Unitários: nenhum novo de regra (redecoração); eventual helper puro do rótulo de "Tipo" por item da lista unificada, se criado.
- Integração (jsdom, dublê de `@/shared/mapa`, padrão de `etapa-itinerarios.test.tsx`): `EtapaItinerarios` renderiza as quatro colunas por item; ponto de rota não recebe `parada-item`; "X" e setas preservam testids/handlers; **nenhuma** chamada de `dispararRecalculo` disparada só por renderizar/redecorar.
- E2E (`etapa-itinerarios.spec.ts`, tiles/OSRM mockados): seletores existentes continuam verdes; remover via "X" funciona; Local extremo mantém `data-estado`/`aria-invalid`.
- Snapshot/contrato JSON: N/A (nada persistido).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (estrutura da `<Tabela>`: colunas, células, "X")
- `src/shared/ui/tabela.tsx` + `src/app/globals.css` (variante/prop de densidade e zebra de maior contraste, **se** a Q-052 optar por variante em vez de mudar o token global)
- `src/app/globals.css` (classe do "X" e composição do estado de seleção com o zebrado), conforme Q-052
- Testes em `testes/unitarios/formulario/etapa-itinerarios.test.tsx` e `testes/e2e/etapa-itinerarios.spec.ts`

## Dependências

- **Q-052** (sem decisão registrada) → **a task nasce bloqueada**.
- **TASK-079** (entregue) — lista lateral unificada que esta task redecora.
- **TASK-064** (recomendada **antes**) — para o realce de seleção existir e o zebrado compor sobre ele em vez de brigar. Se a 091 rodar antes, **herda a obrigação** de não quebrar o sync que a 064 adicionará.

## Riscos

- **Colisão de quatro canais** na mesma linha — zebra (fundo), seleção da 064 (fundo/contorno), erro de Local extremo (vermelho) e ponto de rota (ciano): a Q-052 tem de fixar a precedência antes de implementar, senão o resultado fica à mercê da ordem de emissão do CSS (o "perde em silêncio" de doc 18 §4).
- Regressão de seletores E2E (doc 18 §6 — testids/aria intocáveis): o "X" e as setas devem manter os `data-testid`.
- Elevar o contraste do zebrado **alterando o token global** afetaria todas as tabelas do app — a Q-052 decide global × variante.

## Perguntas em aberto

- **Q-052** (bloqueante) — composição visual da lista unificada: colunas, zebra de maior contraste, densidade, vocabulário de "Tipo" e "X" de remover; token de zebra global × variante local.

---

## TASK-092 — Setas de mover lado a lado na tabela lateral + testes-guarda pendentes da revisão da TASK-091

## Objetivo

As setas ↑/↓ da coluna "Mover" da tabela lateral de itinerários passam a ficar **lado a lado, sem quebrar para baixo**, devolvendo à linha a altura de um único botão compacto. No mesmo ciclo, entram os dois testes-guarda deixados como follow-up pelo parecer da TASK-091: (a) asserção de integração das quatro colunas/vocabulário de "Tipo"/`aria-label` do "X"; (b) desseleção sobre linha de Local extremo preserva o estado vermelho.

## Contexto

Reportado pelo responsável (2026-07-22), após o fechamento do ciclo da TASK-091: os contêineres das setas usam `flex flex-wrap gap-1` (`src/formulario/itinerarios/etapa-itinerarios.tsx:913` e `:1026`) — o `flex-wrap` era útil quando a célula "Ações" reunia três botões (layout anterior à 091), mas na coluna estreita "Mover" faz a segunda seta quebrar para baixo, dobrando a altura da linha e contrariando o objetivo de linhas compactas da DEC-073. Os testes-guarda vêm dos problemas 1 e 2 de `docs-dev/14-REVISOES/TASK-091-20260722.md` (o segundo herdado da ressalva 2 de `14-REVISOES/TASK-064-20260722.md`).

## Fora de escopo

- Qualquer mudança nas decisões da DEC-073 já implementadas: colunas, vocabulário de "Tipo", densidade/zebra (`densidade="compacta"`), tamanho dos botões, precedência de canais — nada disso é rediscutido.
- Tokens globais, outras tabelas do app, `docs-dev/18-DESIGN_SYSTEM.md` (a entrada da tabela lateral já está registrada; um ajuste de `wrap` não altera contrato visual).
- Handlers, `data-testid`, `aria-*`, regras de desabilitar, motores de montagem/rota/OSRM — intocáveis.
- Sincronização tabela↔mapa (TASK-064) — apenas testada, não alterada.
- Contrato JSON/schema (RN-096; nada persistido).

## Specs fonte

- Spec 04 §7/§7.3 (tabela lateral de paradas na etapa de itinerários)
- doc 18 §3/§5 (componentes `Botao`/`Tabela` e entrada da tabela lateral — vinculante, DEC-050/073)

## Regras envolvidas

- RN-025 / RN-031 (vocabulário da coluna "Tipo": `Seção` / `Local de parada` — alvo do teste-guarda)
- RN-042 (ponto de rota: célula Tipo vazia, "Ponto de Rota N (lat, long)", nunca `parada-item` — alvo do teste-guarda)
- RN-035 + DEC-070 (estado vermelho de Local extremo que a desseleção deve preservar)
- RN-096 (seleção/desseleção é estado de UI efêmero; nada persistido, zero OSRM)

## Entidades afetadas

- Seção, Local, ponto de rota (só apresentação/testes; sem mudança de modelo)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] As setas ↑/↓ ficam na mesma linha horizontal dentro da célula "Mover" (sem wrap), tanto em linha de Parada quanto de ponto de rota, e a linha volta à altura de um único botão compacto.
- [ ] Teste de integração afere os quatro cabeçalhos (`Cidade - Nome` · Tipo · Mover · Remover), o vocabulário da coluna Tipo (`Seção`, `Local de parada`, célula vazia para ponto de rota) e o `aria-label="Remover …"` do "X".
- [ ] Teste de integração prova que desselecionar a linha de Local extremo (segundo clique) remove `aria-current`/`bg-azul-100` e **preserva** `data-estado="local-extremo"`, `text-erro` e `aria-invalid` — sem chamada OSRM.
- [ ] Nenhum `data-testid`/`aria-*`/handler alterado; E2E existentes verdes sem alterar seletores.
- [ ] Nenhuma chamada OSRM disparada pelos ajustes (fetch mockado com contagem).

## Casos válidos

- Lista com 3 paradas + 1 ponto de rota → cada célula "Mover" exibe ↑ e ↓ lado a lado; a altura da linha é a de um botão `compacto` único.
- Linha de Local extremo selecionada e depois desselecionada → vermelho (texto/borda/`aria-invalid`) intacto nos dois estados.

## Casos inválidos

- Wrap reintroduzido (setas empilhadas) → recusado pelo critério 1.
- Desseleção que apague `data-estado`/`aria-invalid` da linha inválida → recusado (teste do critério 3).
- Regressão de coluna/vocabulário/`aria-label` → recusado (teste-guarda do critério 2).

## Testes esperados

- Unitários: nenhum novo de regra (ajuste de apresentação).
- Integração (jsdom, padrão de `etapa-itinerarios.test.tsx`, OSRM mockado): os dois testes-guarda dos critérios 2 e 3; asserção de ausência de `flex-wrap` (ou presença de `flex-nowrap`) nos contêineres das setas.
- E2E: existentes verdes sem alterar seletores (nenhum cenário novo).
- Snapshot/contrato JSON: N/A (nada persistido).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (dois contêineres `flex flex-wrap gap-1` → sem wrap)
- `testes/unitarios/formulario/etapa-itinerarios.test.tsx` (testes-guarda novos)

## Dependências

- **TASK-091** (entregue — `f1eca46`, parecer aprovado com ressalvas) — é o layout que esta task ajusta e cujos follow-ups absorve.
- **TASK-064** (entregue) — o gesto de seleção/desseleção que o teste do critério 3 exercita.
- Nenhuma Q-xxx pendente.

## Riscos

- Baixo. O `flex-wrap` atual também protege contra overflow em célula muito estreita: com `nowrap`, conferir que o wrapper `overflow-x-auto` da `Tabela` absorve o excesso em viewport estreita, sem estourar o layout da coluna lateral.
- Teste de desseleção depende da ordem de eventos do jsdom (dois cliques na mesma linha) — seguir o padrão do teste de toggle já existente (`etapa-itinerarios.test.tsx:757`).

## Perguntas em aberto

- Nenhuma.

---

## TASK-093 — Suprimir o espelho Ida↔Volta quando o movimento de Seção não altera a subsequência de Seções (DEC-074)

## Objetivo

O gesto de mover uma Seção na tabela lateral só dispara o espelhamento Ida↔Volta (TASK-077) quando altera **de fato** a subsequência de Seções do sentido editado. A troca adjacente Seção↔**Local** (que mantém a subsequência idêntica) deixa de espelhar e de recalcular o outro sentido — os Locais do sentido não editado ficam intocados.

## Contexto

Condição do parecer `14-REVISOES/TASK-077-20260722.md` (Problema 1), decidida pela **DEC-074** item 1: hoje `moverParada` emite `GestoSecao` de movimento sempre que o item movido é Seção, mesmo quando a troca é com um Local e a subsequência não muda; o replay (remoção+reinserção) então recompõe o outro sentido e pode reposicionar Locais dele (ex.: Ida `A-1-B-C` → `A-B-1-C` faz a Volta `C-5-B-A` virar `C-B-5-A`), além de disparar um recálculo OSRM desnecessário. Isso contraria o critério que o próprio motor declara ("só gestos que tocam a subsequência de Seções disparam o espelho", `motor-montagem.ts`) e o princípio de Locais livres por sentido (Spec 02 §14; DEC-071). A correção adotada é a sugerida no parecer: comparar `subsequenciaSecoes(antes)` com `subsequenciaSecoes(depois)` e suprimir o gesto quando iguais. Deve rodar **antes da TASK-076** (que assume a Volta derivada e multiplica gestos no mesmo mapa).

## Fora de escopo

- Aviso DEC-068 para descarte de ponto de rota no sentido espelhado (**encerrado sem ação** — DEC-074 item 2).
- E2E de exportação com Volta derivada (**encerrado sem ação** — DEC-074 item 3; segue candidato natural à TASK-062/076).
- Qualquer mudança no motor de espelho (`espelharInsercaoDeSecao`/`espelharRemocaoDeSecao`/`espelharMovimentoDeSecao`) — a correção é no **disparo** do gesto, não no replay.
- Inserção e remoção de Seção — sempre alteram a subsequência; continuam espelhando como estão.
- Contrato JSON, validação estrutural da RN-030, filtro do reuso — inalterados.

## Specs fonte

- Spec 02 §14 (Locais livres por sentido; ordem inversa das Seções)
- Spec 04 §7.2 (Locais por sentido), §7.3 (reordenar = recalcular rota — do sentido editado)

## Regras envolvidas

- RN-030 (a subsequência de Seções inalterada mantém a ordem inversa por construção — nada a reespelhar)
- RN-052 (recálculo dispara para o sentido **alterado**; o outro sentido, intocado, não recalcula)
- RN-041..043 (pontos de rota do outro sentido intocados quando o espelho não dispara)

## Entidades afetadas

- Itinerário, Parada (ordem no sentido editado); o outro sentido fica intocado

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor (⚠ exige decisão humana — RN-093)
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Mover uma Seção por cima/baixo de um Local (subsequência de Seções idêntica antes/depois) não altera `paradasEmEdicao` nem `pontosDeRotaEmEdicao` do outro sentido e dispara **um** recálculo OSRM (só o sentido editado).
- [ ] Mover uma Seção por cima/baixo de outra **Seção** (subsequência alterada) continua espelhando e disparando **dois** recálculos sequenciais, como na TASK-077.
- [ ] Mover um **Local** continua sem espelhar (comportamento da TASK-077 preservado).
- [ ] Nenhum `data-testid`/`aria-*` alterado; suíte canônica verde.

## Casos válidos

- Ida `A-1-B-C` (Seções A,B,C; Local 1), mover B para cima (troca com o Local 1) → Ida `A-B-1-C`; Volta `C-5-B-A` permanece **exatamente** `C-5-B-A`; 1 chamada OSRM.
- Ida `A-B-C`, mover B para cima (troca com a Seção A) → Volta espelha para o inverso de `B-A-C`; 2 chamadas OSRM.

## Casos inválidos

- (guarda de regressão) Nenhum estado passa a ser recusado por esta task; o caso "inválido" é o comportamento antigo — Volta alterada/OSRM chamado 2× num movimento Seção↔Local — que os testes devem provar extinto.

## Testes esperados

- Unitários: N/A no motor (não muda); a decisão de disparo é da etapa.
- Integração (`etapa-itinerarios.test.tsx`): os dois primeiros critérios de aceite (outro sentido intocado + 1 chamada; Seção↔Seção segue com 2).
- E2E: ajustar contagens de chamadas OSRM **somente se** algum cenário existente mover Seção sobre Local (verificar; hoje os cenários movem Seção↔Seção ou Local).
- Snapshot/contrato JSON: N/A.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (`moverParada`: comparar `subsequenciaSecoes` antes/depois da reordenação e emitir `gestoSecao` só quando diferirem)
- `testes/unitarios/formulario/etapa-itinerarios.test.tsx`

## Riscos

- Baixos. Ponto único de decisão (`moverParada`); atenção a não suprimir o espelho no movimento Seção↔Seção com Locais adjacentes no meio (a comparação é da subsequência, não das posições).
- Interação com a TASK-076: ela assume a Volta derivada — esta task deve entrar **antes** para que o mapa bidirecional não herde o efeito colateral.

## Dependências

- TASK-077 (entregue, `553d1e6`); DEC-074 (registrada).

## Perguntas em aberto

- Nenhuma (DEC-074 decidida).

---

## TASK-094 — Local nasce unidirecional e o "X" da tabela remove a entidade Local inteira (DEC-075/DEC-076)

## Objetivo

Ao final, criar um Local num Serviço bidirecional gera **apenas** a geolocalização do sentido em edição (sem espelhamento Ida↔Volta), e o "X" da linha de um Local na tabela lateral remove a **entidade** de `servico.locais[]` junto com todas as Paradas que a referenciem. O gesto "Excluir ponto deste sentido" deixa de existir.

## Contexto

Após amadurecimento (responsável, 2026-07-23, DEC-075/DEC-076), o vínculo Ida↔Volta do Local não se sustenta: cada sentido lança seus próprios Locais, independentes. Hoje `camposDeCriacao` (`src/formulario/locais/fluxos-local.ts`) espelha os dois pontos em Serviço bidirecional (Spec 04 §7.2 antiga), e o único gesto de exclusão é `excluirSentidoDoLocal`, que **recusa** Local de ponto único (`ponto_unico`) — deixando a entidade **inapagável** e visível na lista mesmo sem Parada (lacuna deliberada da DEC-045, nunca retomada). Com o Local nascendo unidirecional, o gesto de excluir sentido perde a função e é substituído pela remoção da entidade. A Spec 04 §7.2 e §16 item 6 já foram atualizadas pelo responsável.

## Fora de escopo

- Formulário de nome inline na tabela — é a **TASK-095**.
- Qualquer mudança no contrato JSON/schema (Spec 02 §7.1 já admite Local com um ou dois pontos — RN-031/032 intocadas).
- Regra dos 350 m pareada (RN-032/Spec 03 §7.4): **permanece** no arrasto e nos leitores estáticos, aplicável a Locais legados com dois pontos — esta task não a remove nem a altera.
- Espelhamento de **Seções** na criação (Spec 04 §7.1) e RN-030 — inalterados.
- Remoção de **Seção** pelo "X" (segue removendo só a Parada — TASK-084/DEC-074) — inalterada.
- Reconciliação de horários/matriz decorrente da remoção (é das TASK-046/088, já entregues e reutilizadas pelo caminho de remoção de Parada).

## Specs fonte

- Spec 04 §7.2 (Local nasce unidirecional; "X" remove a entidade — texto atualizado 2026-07-23)
- Spec 04 §16 item 6 (criação espelhada só para Seções — texto atualizado 2026-07-23)
- Spec 02 §7 / §7.1 (Local é entidade do Serviço; ao menos uma geolocalização)
- Spec 02 §10.1 (Parada referencia XOR Seção/Local; extremos sempre Seção)

## Regras envolvidas

- RN-031 (Local pertence ao Serviço, sem tarifa, não compartilhado)
- RN-032 (Local tem ao menos uma geolocalização; pareada dos 350 m só quando ambas presentes)
- RN-033..036 (Parada XOR; ordem; extremos sempre Seção; Parada de sentido X exige `geolocalizacao_X`)
- RN-096 (exportar JSON é o salvar; nada de estado de fluxo persistido)

## Entidades afetadas

- Local (criação unidirecional; remoção da entidade)
- Parada (removida junto com o Local que referencia)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Criar um Local num Serviço **bidirecional** gera só a geolocalização do sentido em edição (`geolocalizacao_ida` XOR `geolocalizacao_volta`), nunca as duas espelhadas.
- [ ] Criar um Local num Serviço **unidirecional** mantém o comportamento atual (só o ponto daquele sentido).
- [ ] O "X" da linha de um Local na tabela lateral remove a entidade de `linhaAtual.locais` **e** todas as Paradas que a referenciam (nos dois sentidos, para Local legado com dois pontos).
- [ ] O botão "Excluir ponto deste sentido" e o gesto `excluirSentidoDoLocal` deixam de existir na UI; os `data-testid` `excluir-sentido-*` são removidos junto com o gesto (não renomeados).
- [ ] O "X" de **Seção** segue removendo apenas a Parada (comportamento atual preservado).
- [ ] Nenhum campo novo no JSON; round-trip de UUID preservado (RN-004) para Locais que permanecem.
- [ ] Remover o último Local de um itinerário não deixa entidade órfã em `servico.locais[]`.

## Casos válidos

- Serviço bidirecional, sentido em edição = Ida: clicar para criar Local "Padaria" → Local com só `geolocalizacao_ida`; a Volta não ganha ponto algum.
- Local "Padaria" (só Ida) com uma Parada na Ida: "X" na sua linha → some da lista de Locais e a Parada sai do itinerário da Ida.
- Local legado importado com Ida **e** Volta, com Parada em cada sentido: "X" → entidade removida e ambas as Paradas saem.

## Casos inválidos

- Tentar criar Local com a criação espelhando para o outro sentido → recusado (teste-guarda de `camposDeCriacao`).
- "X" de Local que remova a Parada mas **deixe** a entidade em `servico.locais[]` → recusado (teste de remoção de entidade).
- "X" de Local que remova também uma Seção ou Parada de Seção adjacente → recusado (só o Local-alvo e suas Paradas).

## Testes esperados

- Unitários: `camposDeCriacao` (bidirecional agora produz um ponto só); nova função pura de remoção de entidade Local (remove entidade + Paradas por `local_uuid`, preserva o resto); `excluirSentidoDoLocal` removida (e seus testes).
- Integração (jsdom, dublê de `@/shared/mapa`): `EtapaItinerarios` — criar Local bidirecional gera um ponto; "X" de Local remove entidade e Parada; "X" de Seção inalterado; sem chamada de recálculo indevida.
- E2E (`etapa-itinerarios.spec.ts`, tiles/OSRM mockados): fluxo criar Local → remover Local pelo "X"; ausência do botão "Excluir ponto deste sentido".
- Snapshot/contrato JSON: documento exportado após remoção não contém o Local removido nem Paradas órfãs; UUIDs dos remanescentes preservadas.
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/locais/fluxos-local.ts` (`camposDeCriacao` sem espelho; `excluirSentidoDoLocal` obsoleta; nova função pura de remoção de entidade)
- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (remover botão "Excluir ponto deste sentido"; "X" do Local chama remoção de entidade)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (`aoExcluirSentidoDeLocal` → remoção de entidade reutilizando `removerParadasDeLocal`)
- `src/formulario/locais/editor-locais.tsx` e `src/app/editor-locais-demo/page.tsx` (editor/demo — mesmo ajuste do botão)
- `src/formulario/locais/index.ts` (exports)
- Testes em `testes/unitarios/formulario/fluxos-local.test.ts`, `testes/unitarios/formulario/etapa-itinerarios.test.tsx`, `testes/e2e/*` que usam `excluir-sentido-*`

## Dependências

- **DEC-075/DEC-076** (registradas) e a edição da Spec 04 §7.2/§16 item 6 (aplicada pelo responsável 2026-07-23).
- Reutiliza `removerParadasDeLocal` (motor existente, TASK-077/DEC-045). Independente da TASK-095.

## Riscos

- Regressão em suítes que dependem de `excluir-sentido-*` (doc 18 §6 — testids intocáveis): exceção consciente autorizada pela DEC-076 (o gesto sai do produto, não é renomeado); mapear todos os usos antes de remover.
- Local legado com dois pontos: garantir que o "X" remova as Paradas de **ambos** os sentidos, não só a do sentido corrente.
- Não confundir remoção de entidade Local com a cascata de Seção órfã (TASK-084) — são caminhos distintos.

## Perguntas em aberto

- Nenhuma (DEC-075/DEC-076 decididas).

---

## TASK-095 — Formulário de nome de Seção/Local inline na tabela lateral, na posição de inserção (DEC-077)

## Objetivo

Ao final, ao escolher "Seção" ou "Local" no menu de criação do mapa, o campo de nome aparece como uma **linha-formulário inserida na tabela lateral, na posição exata onde a nova parada entrará** — janela de fundo branco no padrão da janela flutuante do mapa —, em vez do painel abaixo do mapa.

## Contexto

Pedido do responsável com mockup (2026-07-23, DEC-077): o campo de nome deve aparecer no contexto em que o item vai entrar na lista (ex.: entre `cityB` e `cityC`), não num `Painel` desconectado abaixo do mapa (`form-criar-secao`/`form-criar-local` em `src/formulario/itinerarios/editor-mapa-itinerario.tsx`). A âncora de inserção já é resolvida por `prepararInsercaoDeParada`. É escolha de UX dentro do espaço da Spec 04 §7.1/§7.2 (que só exige o nome digitado) — **sem mudança de spec**. Compõe com a tabela redesenhada da TASK-091 (DEC-073).

## Fora de escopo

- Mudança no fluxo de criação em si (tipos, validações, espelhamento) — é a **TASK-094**.
- Qualquer regra de OSRM / 350 m / montagem / ancoragem.
- Contrato JSON/schema — o formulário é estado de UI efêmero (RN-096).
- Redesenho geral da tabela (colunas, densidade, zebra) — é a **TASK-091**; esta task apenas **injeta** a linha-formulário na estrutura existente.
- Vocabulário de "Tipo" e marcadores do mapa (TASK-091/TASK-068) — inalterados.

## Specs fonte

- Spec 04 §7.1 (inserção de Seção; nome digitado pelo usuário)
- Spec 04 §7.2 (inserção de Local; nome digitado)
- Spec 04 §7/§7.3 (mapa + tabela lateral sincronizada durante a montagem)
- doc 18 §2/§3/§4 (tokens; componentes de `shared/ui`; variação por prop, não por `className`) — vinculante (DEC-050)

## Regras envolvidas

- RN-025 (Seção = município + nome; base do rótulo exibido)
- RN-031 (Local pertence ao Serviço)
- RN-034/035 (ordem 1-based; extremos sempre Seção — a posição de inserção respeita isso)
- RN-096 (nada persistido; formulário é estado de UI)

## Entidades afetadas

- Seção, Local (só a superfície de criação; sem mudança de modelo)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] Escolher "Seção"/"Local" no menu de criação insere uma linha-formulário na tabela lateral, na posição exata onde a parada entrará (âncora de `prepararInsercaoDeParada`).
- [ ] Criação **sem** âncora de linha (clique-direito fora da rota) → linha-formulário ao fim da tabela.
- [ ] A linha-formulário tem fundo branco no padrão da janela flutuante do mapa (`MenuFlutuante`/`Painel` de `shared/ui`), rótulo pequeno em cinza sem destaque ("Nome da Seção"/"Nome do Local"), campo de texto e botões `[Criar Seção]`/`[Criar Local]` e `[Cancelar]`.
- [ ] A tabela rola até a linha-formulário quando ela abre (scroll-into-view).
- [ ] O painel de criação **abaixo do mapa** deixa de existir.
- [ ] Os `data-testid` existentes são preservados: `form-criar-secao`, `form-criar-local`, `nome-secao-input`, `nome-local-input`, `confirmar-criar-secao`, `confirmar-criar-local`.
- [ ] Confirmar cria a parada na posição mostrada; cancelar remove a linha-formulário sem efeito colateral; nenhum recálculo/OSRM disparado só por abrir/cancelar.
- [ ] Sem `style=` inline; estilo por tokens/variante (doc 18 §4).

## Casos válidos

- Tabela `cityA - n1` · `cityB - n2` · `cityC - n3`; criar Local entre B e C → linha-formulário aparece entre as linhas de B e C, com rótulo "Nome do Local" e botões; ao confirmar "Padaria", entra como parada nessa posição.
- Criar Seção sem clicar sobre a linha da rota → linha-formulário no fim da tabela.

## Casos inválidos

- Linha-formulário que perca um dos `data-testid` obrigatórios → recusado (teste-guarda de seletor).
- Confirmar com nome vazio → botão desabilitado (comportamento atual preservado).
- Abrir a linha-formulário disparando recálculo/OSRM → recusado (teste de integração).

## Testes esperados

- Unitários: eventual helper puro de cálculo da posição da linha-formulário na lista, se criado.
- Integração (jsdom, dublê de `@/shared/mapa`): abrir criação de Seção/Local injeta a linha na posição correta; painel abaixo do mapa ausente; testids preservados; cancelar limpa; sem recálculo ao abrir/cancelar.
- E2E (`etapa-itinerarios.spec.ts`, tiles/OSRM mockados): criar Seção e Local pela linha-formulário inline; verificar posição relativa às demais linhas.
- Snapshot/contrato JSON: N/A (nada persistido pelo formulário).
- PDF: N/A.

## Arquivos prováveis

- `src/formulario/itinerarios/editor-mapa-itinerario.tsx` (remover os `Painel` de criação abaixo do mapa; injetar a linha-formulário na tabela na posição de inserção; scroll-into-view)
- `src/shared/ui/tabela.tsx` (se a linha-formulário exigir um slot/variante de linha na tabela — via prop, não `className`)
- Testes em `testes/unitarios/formulario/etapa-itinerarios.test.tsx` e `testes/e2e/etapa-itinerarios.spec.ts`

## Dependências

- **DEC-077** (registrada).
- **TASK-091** (redesenho da tabela lateral — DEC-073): recomendada **antes**, para a linha-formulário compor com a estrutura de colunas final. Se a 095 rodar antes, herda a obrigação de não quebrar as colunas que a 091 introduzirá.
- Independente da **TASK-094** (podem rodar em qualquer ordem; ambas tocam `editor-mapa-itinerario.tsx` — coordenar para evitar conflito de merge).

## Riscos

- Conflito de merge com a TASK-094 em `editor-mapa-itinerario.tsx` — sequenciar as duas.
- Scroll-into-view em tabela com muitas linhas: garantir que a linha-formulário fique visível sem "pular" a seleção da TASK-064.
- Preservar exatamente os `data-testid` ao mover o formulário de container (doc 18 §6).

## Perguntas em aberto

- Nenhuma (DEC-077 decidida).

---

## TASK-096 — Gravar `servico.locais[]` pelo caminho unificado da DEC-053 (Local some no modo "novo" após a promoção)

## Objetivo

Ao final, criar ou arrastar um Local num Serviço **já promovido** no fluxo "novo" grava a entidade em `servico.locais[]` de fato — hoje ela é descartada silenciosamente e a Parada fica com `local_uuid` pendurado, violando RN-036.

## Contexto

Bug relatado pelo responsável (2026-07-23), no fluxo **criar do zero**: o Local recém-criado aparece na tabela lateral com o **UUID cru** na coluna "Cidade - Nome", o painel de montagem acusa *"Uma Parada do itinerário de Ida do Serviço 1-1SU está com a referência de Seção/Local incompleta ou com a localização do sentido faltando"*, e a partir daí o mapa **não aceita mais pontos de rota**.

Causa localizada em `comLocaisAtualizados` (`src/formulario/itinerarios/etapa-itinerarios.tsx:400-415`), que bifurca por `base.modo` em vez de por `linhaAtual.completo`:

```ts
if (linhaAtual.completo && base.modo === "carregado") { /* documento.autos.servicos */ }
if (base.modo === "novo") { /* servicosEmConstrucao */ }
return base;   // ← perde o Local
```

No modo `"novo"`, assim que o Serviço ganha rota válida ele é promovido (**DEC-053**): `promoverServicoNaSessao` o retira de `servicosEmConstrucao` e o põe em `sessao.servicos`. A partir daí `linhaAtual.completo === true` **e** `base.modo === "novo"`, então o primeiro ramo não entra e o segundo mapeia uma lista que não contém mais o Serviço — devolvendo-a intacta. A Parada, essa sim, é comitada em `paradasEmEdicao`, produzindo a referência pendurada.

Os três sintomas são a mesma raiz: (1) a linha da tabela cai no fallback `parada.localUuid`; (2) `resolverParadasRota` falha por RN-036; (3) `aoCriarPontoDeRota` (`etapa-itinerarios.tsx:946`) faz `if (!resolucao.ok) return;` e engole o clique.

Seção não é afetada: `comSecoesAtualizadas` grava em `secoesEmConstrucao`, que é exatamente de onde `secoesDaSessao` lê no modo "novo" — os dois lados casam. O par correto para Serviços já existe e já está importado no arquivo: `servicosDaSessao`/`comServicosDaSessao` (`src/formulario/sessao.ts:162-182`).

Defeito **anterior** às TASK-094/095 (introduzido na TASK-019, commit `b1c83ff`); as duas apenas tornaram o caminho de criação de Local mais frequente. Não é regressão delas.

## Fora de escopo

- Qualquer mudança no fluxo de criação de Local (unidirecionalidade, "X" que remove a entidade) — é a **TASK-094**, entregue e aprovada.
- Qualquer mudança na linha-formulário inline — é a **TASK-095**, entregue e aprovada.
- Refatorar `comSecoesAtualizadas` (está correta) ou generalizar as duas numa só.
- Mudar o gatilho, a forma ou o momento da promoção (DEC-053) — esta task **consome** a promoção, não a altera.
- Tornar a falha de `aoCriarPontoDeRota` visível ao usuário (o `return` mudo da linha 946) — é sintoma, não causa; se merecer tratamento próprio, vira task separada (ver "Perguntas em aberto").
- Contrato JSON/schema — nada muda: `servico.locais[]` já existe (Spec 02 §7) e nada é gravado antes da exportação (RN-096).
- Correção do `transform: none !important` em `globals.css` (marcadores do mapa empilhados no canto superior esquerdo sob `prefers-reduced-motion`) — **já aplicada** como hotfix fora de task, junto da correção de redação do doc 18 §2. Bug independente.

## Specs fonte

- Spec 02 §7 (Local vive em `servico.locais[]`, entidade do Serviço)
- Spec 02 §7.1 (geolocalizações do Local)
- Spec 02 §10.1 (integridade referencial da Parada)
- Spec 04 §7.2 (criar/arrastar Local no mapa da etapa de itinerários)
- Spec 04 §6/§7/§8 via **DEC-053** (promoção `ServicoEmConstrucao` → `Servico`)

## Regras envolvidas

- **RN-036** — Referências de Parada íntegras e com geolocalização do sentido (é a regra hoje violada).
- **RN-031** — Local é entidade do Serviço, não compartilhado (é `servico.locais[]` que precisa receber a entidade).
- **RN-033** — Parada: XOR `secao_uuid`/`local_uuid` (a Parada gravada é bem formada; o que falta é o alvo).
- **RN-032** — geolocalização do sentido do Local (preservada pelo motor `criarLocalNoPonto`/`revalidarArrastoLocal`, intocado).
- **RN-004** — UUIDs preservadas (a gravação não pode recriar nem renumerar o Local).
- **RN-096** — exportar é o salvar: a sessão continua efêmera; nada de persistência nova.

## Entidades afetadas

- **Local** (`servico.locais[]`)
- **Serviço** (destino da gravação)
- **Parada** (deixa de ficar com referência pendurada — efeito, não alvo da edição)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] `comLocaisAtualizados` decide por `linhaAtual.completo`, não por `base.modo`: Serviço completo grava via `comServicosDaSessao(base, servicosDaSessao(base).map(...))`; Serviço em construção grava em `servicosEmConstrucao`.
- [ ] No modo `"novo"`, com o Serviço **já promovido**, criar um Local faz o Local aparecer em `servicosDaSessao(sessao)[i].locais` com a mesma UUID devolvida por `criarLocalNoPonto`.
- [ ] Nesse mesmo cenário, a linha da tabela lateral mostra `"Cidade - Nome"` (`nomeExibicaoLocal`), nunca o UUID cru.
- [ ] Nesse mesmo cenário, `resolverParadasRota` resolve a Parada do Local sem violação de RN-036 (nenhum aviso de "referência de Seção/Local incompleta").
- [ ] Nesse mesmo cenário, criar um ponto de rota clicando na linha da rota continua funcionando após a inserção do Local.
- [ ] No modo `"carregado"` (Serviço completo do documento) e no modo `"novo"` **antes** da promoção, o comportamento atual é preservado byte a byte.
- [ ] `aoAtualizarLocal` (arrastar o marcador do Local) grava pelo mesmo caminho corrigido — a coordenada nova sobrevive num Serviço promovido do modo "novo".
- [ ] Nenhuma UUID é recriada em nenhum dos caminhos (RN-004).
- [ ] `data-testid`/`aria-*` existentes intocados; nenhuma alteração de contrato, schema, OSRM ou PDF.

## Casos válidos

1. **Modo "novo", Serviço promovido** — documento criado do zero; Serviço `1-1SU` com itinerário de Ida já com rota válida (portanto promovido para `sessao.servicos`). Clique direito no mapa → "Local" → nome `"Rodoviária"` → confirmar. Esperado: `sessao.servicos[0].locais` contém `{ uuid, municipio: <derivado>, nome: "Rodoviária", geolocalizacao_ida: {…} }`; a tabela mostra `"<Município> - Rodoviária"`; nenhuma violação de montagem.
2. **Modo "novo", Serviço em construção** (ainda sem rota, não promovido) — mesmo gesto. Esperado: o Local vai para `servicosEmConstrucao[i].locais` (comportamento atual, preservado).
3. **Modo "carregado"** — JSON aberto, Serviço completo. Esperado: o Local vai para `documento.autos.servicos[i].locais` (comportamento atual, preservado).
4. **Arrasto no modo "novo" promovido** — Local existente arrastado 100 m. Esperado: `geolocalizacao_<sentido>` atualizada em `sessao.servicos[i].locais[j]`, mesma UUID, `municipio` rederivado (RN-029).
5. **Dois Locais em sequência no mesmo Serviço promovido** — o segundo não apaga o primeiro (a lista comitada parte da lista corrente, não de uma cópia obsoleta).

## Casos inválidos

1. **Serviço não encontrado na lista de destino** — `linhaAtual.servicoUuid` ausente tanto em `servicosDaSessao` quanto em `servicosEmConstrucao`: a função não pode devolver `base` calada (é exatamente o bug). Reação esperada: nenhuma Parada é comitada para uma entidade que não pôde ser gravada — o gesto é abortado antes do commit, ou a condição é impossível por construção e um teste prova a impossibilidade.
2. **Local fora do Estado de São Paulo** — `criarLocalNoPonto` devolve `{ ok: false, motivo: "fora_de_sp" }`: a mensagem literal da Spec 04 §14 continua aparecendo na linha-formulário inline e **nada** é gravado (comportamento da TASK-095, preservado).
3. **Arrasto que viola os 350 m pareados** (Local legado com dois pontos) — `revalidarArrastoLocal` recusa: o ponto não se move e nada é gravado (RN-032, comportamento preservado).
4. **`linhaAtual` nulo** — nenhum Serviço selecionado: a função devolve `base` inalterada, como hoje.

## Testes esperados

- **Unitários:** `comLocaisAtualizados` (ou a etapa via harness) nos quatro estados — carregado/completo, novo/completo-promovido, novo/em-construção, `linhaAtual` nulo —, assertando **em qual lista** o Local aterrissa e que a UUID é a mesma (RN-004). O caso novo/promovido é o teste de regressão desta task e deve falhar contra o código atual.
- **Integração:** em `testes/unitarios/formulario/etapa-itinerarios.test.tsx`, sessão no modo "novo" com Serviço promovido → criar Local pela linha-formulário inline (TASK-095) → asserir que a linha da tabela exibe `"Cidade - Nome"` e **não** o UUID, e que nenhum `aviso-montagem-invalida` de RN-036 é renderizado. Segundo teste: após inserir o Local, um clique na linha da rota ainda cria ponto de rota. OSRM mockado (DEC-029).
- **E2E:** em `testes/e2e/etapa-itinerarios.spec.ts` (ou no `fluxo-novo.spec.ts`, se existir): fluxo criar-do-zero → itinerário com rota → criar Local → a tabela mostra o nome e a etapa segue navegável. OSRM e tiles mockados.
- **Snapshot/contrato JSON:** nenhum novo; o round-trip de UUID existente já cobre a exportação e deve continuar verde.
- **PDF:** nenhum.

## Arquivos prováveis

- `src/formulario/itinerarios/etapa-itinerarios.tsx` (alterar `comLocaisAtualizados`; verificar se `aoCriarLocal`/`aoAtualizarLocal` precisam de guarda para o caso inválido 1)
- `testes/unitarios/formulario/etapa-itinerarios.test.tsx` (alterar — testes de regressão)
- `testes/e2e/etapa-itinerarios.spec.ts` (alterar, se o E2E entrar aqui)

## Dependências

- **DEC-053** (promoção `ServicoEmConstrucao` → `Servico`) — é o estado que expõe o bug; nenhuma mudança nela.
- **TASK-061/TASK-080** (promoção implementada, entregues) — pré-requisito factual.
- **TASK-094** e **TASK-095** (entregues e aprovadas) — esta task roda **depois** das duas e não desfaz nada delas.
- Nenhuma Q-xxx pendente: a task **não** nasce bloqueada.

## Riscos

- **Regressão nos modos preservados:** o ramo do modo "carregado" e o de Serviço em construção precisam de teste-guarda antes da mudança, senão a correção de um caminho pode calar outro.
- **`sessao` × `sessaoRef`:** `aplicarNovasParadas` monta a base a partir de `sessao` (valor do render) enquanto `recalcularERegistrar` lê `sessaoRef.current`. A correção deve manter essa fronteira como está — mexer nela é outra task.
- **Ordem de commit:** `aoComitarBase` roda antes do commit síncrono; `locaisParaResolver` precisa continuar recebendo a lista **com** o Local novo, senão a resolução (RN-036) falha por outro motivo.
- **Espelho Ida↔Volta:** Local é livre por sentido (Spec 02 §14; Spec 04 §7.2) e **não** espelha — a correção não pode introduzir espelhamento por efeito colateral (contraria DEC-075/TASK-094).

## Perguntas em aberto

- Nenhuma bloqueante. Fica registrado como observação para a `/analisar-task`: o `if (!resolucao.ok) return;` de `aoCriarPontoDeRota` (`etapa-itinerarios.tsx:946`) descarta o clique **sem qualquer feedback** ao usuário. Corrigida a causa desta task, o sintoma desaparece — mas o silêncio permanece como comportamento defensivo geral. Se o responsável julgar que merece feedback próprio, isso é task separada (parente da TASK-085, "tornar visível o motivo de qualquer bloqueio"), nunca escopo desta.

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
059 → 060 → 063 → 065 → 071 → 066 → 067 → 068 → 069
063 → 070
068 → 079 → 064
```

- TASK-063 (gesto de ponto de rota) e TASK-064 (sync tabela↔mapa) foram deferidas da TASK-060 por DEC-054. A TASK-064 agora roda **depois da TASK-079**, para projetar sobre a lista unificada e preservar o estado de erro da DEC-070.
- TASK-068/069/070 nasceram da **DEC-057** (identidade visual ciano do vértice, hover e clique-para-remover). A **TASK-068 foi ampliada**: depende também da TASK-067 e das DEC-069/070; implementa o fallback sem ancoragem e o erro contextual de Local em extremo. A ordem `068 → 069` permanece porque o fantasma da 069 reusa seu token; a TASK-070 continua independente da 068. A DEC-070 acrescenta a trava `068 → 079 → 064` e obriga a TASK-076 a preservar o erro por sentido.
- TASK-071 vem da **DEC-058** (Q-038 decidida): os pontos de rota da sessão sobrevivem a um recálculo que falha. **Precede a TASK-066** — as duas tocam a reaplicação dos pontos, e re-ancorar (066) uma lista que evapora numa falha seria construir sobre areia.
- TASK-065/066/067 vêm da **DEC-055** (Q-036), que superou em parte a DEC-054 invertendo os botões do mouse: esquerdo sobre a linha cria ponto de rota, direito abre menu Seção/Local. Todas dependem do **ancorador geométrico** entregue pela TASK-063. A **DEC-056** (Q-037) fixou a re-ancoragem dos pontos de rota e liberou TASK-066/067 — nenhuma task deste ramo está bloqueada.

**Revisão de UX do responsável (2026-07-17 — Q-040..Q-045 decididas em DEC-060..065; tasks TASK-073..079, todas liberadas):**

```text
073 (livre; literal do aviso após o dono fixar a §3.2 — DEC-065)
074 (livre, rodar antes das demais da etapa de mapa)
075 (livre — DEC-064)

ramo do mapa: 064 → 065 → 071 → 066 → 067
                        ├→ 068 → 069 → 070
                        └→ (depois do ramo) 079 → 076 → 077 → 078
```

- **Todas as Q foram decididas (DEC-060..065, 2026-07-17)** — nenhuma task deste bloco está bloqueada. **TASK-073/074/075** são independentes do ramo do mapa e podem rodar a qualquer momento (a 073 depende só de o dono colar o texto da DEC-065 na Spec 04 §3.2 para o passo do literal).
- Terminar o **ramo pendente do mapa** (064 → 065 → 071 → 066 → 067; 068 → 069 → 070) **antes** de 079/076/077/078, que retrabalham a mesma superfície — exceto a **074**, pequena, que convém rodar antes para não mover o alvo das demais.
- Ordem do sub-ramo novo: **079 → 076 → 077 → 078** — lista unificada primeiro (DEC-060, que a TASK-066 já implementa no caso da reordenação), depois o mapa bidirecional com abas/numeração (DEC-062), depois o espelhamento da Volta (DEC-063, que simplifica a tabela da Volta), e por fim a realocação de Seção (DEC-061, gesto novo sobre a superfície estabilizada).
- **Atenção TASK-066:** implementar já com o caso da reordenação da **DEC-060** (re-ancoragem posicional, sem descarte) — o critério de aceite correspondente foi atualizado na própria task.

**Fluxo criar-do-zero — promoção `ServicoEmConstrucao → Servico` (DEC-053 / Q-034) + E2E ponta a ponta (DEC-059 / Q-039):**

```text
061 (entregue) ─┐
                ├→ 062
032 ────────────┘
```

- TASK-062 (E2E criar-do-zero ponta a ponta) depende da **TASK-061** (promoção, entregue) **e da TASK-032** (tela de Revisão + gate/botão de exportação) — **DEC-059 / Q-039**: a UI de exportação que o E2E dispara é escopo da TASK-032, então a 062 foi re-sequenciada para rodar depois dela.
- **TASK-080** (correção, 2026-07-17): a promoção da TASK-061 ficou condicionada a `modo === "novo"`, então Serviços criados na sessão sobre um **JSON carregado** nunca eram promovidos. A 080 remove esse gate e promove nos dois modos. Depende só da **TASK-061** (entregue); pode rodar a qualquer momento.

**Correções de edição de itinerário e feedback de bloqueio (relatadas pelo responsável em 2026-07-17):**

```text
085 → 084 → 046 (absorve 087) → 088
083 (independente)
```

- **TASK-083** vem da **DEC-068** (Q-048): ponto de rota órfão na remoção de parada de extremo é descartado com aviso, fechando a ressalva da revisão da TASK-066. Toca só `reancorar-pontos-de-rota.ts` — independente das outras duas, pode rodar a qualquer momento.
- **TASK-084** (bug) corrige a raiz do "JSON travado após remover uma Seção": a remoção de parada passa a limpar `secao.servicos[]` e descartar a Seção órfã (análogo por-parada da cascata da TASK-080). Coordenar com a **TASK-077** (espelho Ida↔Volta).
- **TASK-085** (bug) torna **visível** o motivo de qualquer bloqueio de exportação (estrutural/técnico), hoje mudo. Recomendada **antes** da 084 (torna o sintoma diagnosticável de imediato) e **antes/junto da TASK-082** (senão o bloqueio de 350 m/tipificação da 082 também nasceria invisível).
- **TASK-087** foi absorvida pela **TASK-046**: o caso de remoção é regressão da reconciliação geral de horários (inserir/remover/reordenar) e não deve ser implementado isoladamente.
- **TASK-088** (bug, 2026-07-20) fecha o caminho **RN-059** da mesma ação: depois de `matriz_distancias` ser recomposta, filtra de `matriz_seccionamento` os pares que deixaram de existir, preservando os valores confirmados dos pares sobreviventes. Depende das **TASK-026/027/084/046**, todas entregues, e é prioridade máxima por bloquear a exportação.
- **TASK-089** (débito de teste, 2026-07-20) conserta a asserção de contagem total de pendências do E2E `etapa-itinerarios.spec.ts:71`, quebrada desde a **TASK-081** pelo alerta legítimo de grade de feriados vazia (RN-071/RN-078). Não toca `src/`; pode rodar a qualquer momento e mantém a suíte de itinerários verde para as tasks do mapa (067 em diante).
- **TASK-090** (infraestrutura de testes, 2026-07-21) cria o executor canônico
  com servidor Next controlado, log/fingerprint e cleanup por PID; deve rodar
  **antes da próxima implementação ou revisão pesada**, para que
  `implementar-task` produza uma única evidência final e `revisar-aderencia` a
  reutilize quando válida.
- **TASK-096** (bug, 2026-07-23) corrige `comLocaisAtualizados`, que bifurca por
  `base.modo` em vez de `linhaAtual.completo` e por isso **descarta o Local** num
  Serviço já promovido no modo "novo" (**DEC-053**), deixando a Parada com
  `local_uuid` pendurado (violação de **RN-036**) e travando a criação de pontos
  de rota. Defeito anterior às **TASK-094/095** (vem da TASK-019), não é
  regressão delas; roda **depois** das duas. Prioridade alta: inutiliza a
  inserção de Local no fluxo criar-do-zero.

**Bugs de gesto do mapa relatados pelo responsável em 2026-07-24:**

```text
097 (prioridade máxima) → 070
                        → 076 → 078
098 (independente da 097; após DEC-078)
```

- **TASK-097** (bug) corrige a reversão silenciosa do arrasto de marcador quando
  o cursor passa dentro da tolerância de 6 px da linha da rota: o hover
  (TASK-069/DEC-072) provoca um re-render por `mousemove` e
  `sincronizarMarcadores` devolve o marcador em arrasto à posição da prop, de
  modo que o `dragend` lê a coordenada antiga e o gesto vira no-op (viola
  **Spec 04 §7.3 itens 4/5/6** e **RN-052**). Atinge ponto de rota, Seção e
  Local. Defeito de implementação, sem lacuna de domínio. **Roda antes da
  TASK-070** (com a 070 no ar, um arrasto frustrado passa a ser candidato a
  remoção destrutiva) e antes da **TASK-076** (abas/dois painéis multiplicam os
  renders da mesma superfície).
- **TASK-098** implementa a **DEC-078** (Q-056): o `contextmenu` sobre a linha
  passa a entregar a **coordenada projetada** no traçado, como o clique esquerdo
  já faz desde a DEC-072 — a Seção/Local intermediária deixa de nascer deslocada
  da linha azul. Independente da 097; toca o mesmo arquivo (`shared/mapa/mapa.tsx`),
  então convém não rodar as duas em paralelo.

## TASK-097 — Arrastar marcador perto da linha da rota deixa de ser revertido pelo re-render do hover

## Objetivo

Ao final, arrastar um ponto de rota (ou um marcador de Seção/Local) e soltá-lo **sobre ou perto da linha da rota** aplica a nova coordenada e dispara o recálculo, como já acontece longe da linha. Hoje o gesto é silenciosamente revertido: o marcador volta à posição anterior e nada é recalculado.

## Contexto

Bug relatado pelo responsável (2026-07-24), reproduzível nos dois caminhos (Autos do zero e JSON carregado): o usuário arrasta um ponto de rota para cima da pista já pintada de azul pelo itinerário — exatamente o ajuste fino que a Spec 04 §7.3 item 6 prevê — e o sistema "não aceita e cancela o arrastar".

**Causa-raiz confirmada em diagnóstico** (teste descartável, reproduzido e depois removido), em quatro elos:

1. `src/shared/mapa/mapa.tsx` — a cada `mousemove` **dentro da tolerância de 6 px da camada de linhas**, o mapa chama `aoMoverSobreLinha(projeção)` (TASK-069/DEC-072).
2. `src/formulario/itinerarios/editor-mapa-itinerario.tsx` — o callback grava `preVisualizacao` com um **objeto novo a cada evento**, provocando um re-render por `mousemove`.
3. `src/shared/mapa/mapa.tsx` — todo render recria o array `marcadores`, disparando o `useEffect([marcadores])` → `sincronizarMarcadores`.
4. `sincronizarMarcadores` chama `existente.setLngLat(spec.posicao)` **incondicionalmente**, inclusive no marcador em arrasto. O `Marker.setLngLat` do MapLibre reposiciona sem checar estado de arrasto (verificado em `node_modules/maplibre-gl/dist/maplibre-gl-dev.js`). No `dragend`, o handler lê `marcador.getLngLat()` — já revertido para a posição da prop — e chama `aoArrastar` com a coordenada **antiga**: o gesto vira no-op.

Saída do diagnóstico (posições recebidas pelo marcador durante o arrasto sobre a linha): `[-46.45,-23.88]` (inicial) → `[-46.4,-23.9]` (arrasto) → **`[-46.45,-23.88]` (revertido)**. Com o cursor fora da linha, o controle passou sem reversão — o hover devolve `null` sobre um estado que já é `null`, o React descarta o update e não há re-render. É exatamente a assimetria relatada ("perto ou sobre a rota").

**Alcance maior que o relatado:** o mesmo mecanismo derruba o arrasto de **Seção e de Local** sempre que o marcador transita perto do traçado — o caso normal, já que a linha corre sobre as vias (argumento da própria DEC-055). O defeito atinge a Spec 04 §7.3 **item 4** ("move coordenadas arrastando marcadores; soltar o marcador dispara revalidação (350 m) e recálculo") tanto quanto o item 6.

Não exige decisão nova: a spec e a **RN-052** já mandam recalcular "no soltar de cada gesto". É defeito de implementação, não lacuna de domínio.

## Fora de escopo

- **Projetar/grudar a coordenada solta sobre a linha** — arrastar continua entregando a coordenada exata onde o usuário soltou (a projeção do clique direito é a **DEC-078/TASK-098**; a do clique esquerdo já é a DEC-072). Grudar o arrasto foi a opção **C descartada** na Q-056.
- **Clicar no vértice para remover o ponto de rota** — é a **TASK-070**, que roda depois desta.
- Qualquer mudança na regra dos 350 m, na derivação de município, no ancorador (`ancorarPontoNaRota`/`projetarNaLinha`), no motor de montagem ou no cliente OSRM.
- Mudar a affordance de hover em si (cor, forma ou existência do vértice fantasma — DEC-057/069/072): esta task só decide **quando** ele não deve aparecer.
- Otimizar o número de renders do `EditorMapaItinerario` (memoização do array de marcadores) — mitigação frágil que não é o invariante correto; se merecer, vira task própria.
- Contrato JSON, schema, `versao_schema`, PDF, Comparador — nada muda.

## Specs fonte

- Spec 04 §7.3 item 4 ("**Move coordenadas** arrastando marcadores; soltar o marcador dispara revalidação (350 m) e recálculo da rota")
- Spec 04 §7.3 item 5 ("recalcula a rota sempre que o itinerário muda … coordenada movida, ponto de rota criado/**movido**/removido")
- Spec 04 §7.3 item 6 (ponto de rota: "clicar sobre a linha da rota calculada cria um vértice **arrastável**; soltar recalcula")
- Spec 04 §7.3, regra explícita de UX ("Alterar itinerário, paradas, **coordenadas** ou pontos de rota chama OSRM — no momento do 'soltar'/confirmar de cada gesto")
- Spec 03 §3.6 (ponto de rota ancorado ao trecho que molda)

## Regras envolvidas

- **RN-052** — Abrir JSON não chama OSRM; **editar recalcula** ("alterar itinerário/paradas/**coordenadas**/pontos de rota recalcula, no 'soltar' de cada gesto"). É a regra hoje violada.
- **RN-042** — Ponto de rota sem identidade; a posição no array é a identidade dentro do gesto (o índice usado por `aoMoverPontoDeRota` precisa continuar correto).
- **RN-027** — 350 m por centroide cumulativo (Seção): a revalidação do arrasto de Seção passa a receber a coordenada realmente solta, e não a antiga.
- **RN-032** — 350 m pareado de Local: idem para o arrasto de Local.
- **RN-048** — Falha do OSRM no recálculo pós-arrasto não apaga a última rota válida.
- **RN-097** — `shared/mapa` é primitiva desacoplada: a correção precisa ser aditiva e não alterar o comportamento de consumidores que não usam `aoMoverSobreLinha` (Comparador futuro, demo pages).
- **RN-096** — nada de persistência nova; o estado de arrasto é efêmero e nunca exportado.

## Entidades afetadas

- **ponto de rota** (gesto principal relatado)
- **Seção** e **Local** (mesmo defeito no arrasto de suas geolocalizações — Spec 04 §7.3 item 4)
- Nenhuma entidade muda de forma no contrato JSON.

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] `sincronizarMarcadores` **não** chama `setLngLat` (nem remove/recria) o marcador que está em arrasto; os demais marcadores continuam sendo sincronizados normalmente no mesmo render.
- [ ] O estado "em arrasto" é derivado dos eventos `dragstart`/`dragend` do próprio `Marker`, guardado em `ref` (não em estado de React — não pode provocar render).
- [ ] Ao soltar um ponto de rota **sobre a linha da rota**, `aoArrastar` recebe a coordenada **onde o usuário soltou** (não a anterior) e o recálculo é disparado (RN-052).
- [ ] Ao soltar um marcador de **Seção** sobre/perto da linha, `revalidarArrasto` recebe a coordenada solta e a revalidação de 350 m roda sobre ela (RN-027); recusa continua devolvendo o marcador à posição antiga, como hoje (DEC-044).
- [ ] Ao soltar um marcador de **Local** sobre/perto da linha, idem com `revalidarArrastoLocal` (RN-032).
- [ ] Enquanto houver arrasto em curso, o mapa **não** emite `aoMoverSobreLinha` e o **vértice fantasma não aparece**; ao terminar o arrasto, o hover volta a funcionar normalmente (fantasma reaparece ao passar sobre a linha).
- [ ] Terminado o arrasto, a sincronização volta ao normal: um render subsequente reposiciona o marcador para a posição da prop (ex.: recálculo que reancora o ponto).
- [ ] Consumidor de `Mapa` **sem** `aoMoverSobreLinha` e sem marcador arrastável fica inalterado (RN-097) — demo pages e E2E de 350 m continuam verdes.
- [ ] Nenhum `data-testid`/`aria-*` alterado (doc 18 §6.5); nenhuma mudança em `src/shared/contrato/`.

## Casos válidos

- Itinerário com rota desenhada e 1 ponto de rota fora da via. Arrastar o vértice até ficar **em cima** da linha azul e soltar → o vértice permanece onde foi solto, `aoMoverPontoDeRota` recebe o índice correto e a coordenada nova, OSRM é chamado uma vez (mock).
- Mesmo cenário, arrastando o vértice para **longe** da linha (comportamento que já funciona hoje) → continua funcionando, sem regressão.
- Arrastar um marcador de **Seção** por cima da linha até um ponto a ≤ 350 m do centroide resultante → aceito, geolocalização atualizada, rota recalculada.
- Arrasto que atravessa a linha e termina fora dela → coordenada final é a de fora; o fantasma não apareceu em nenhum momento do trajeto.

## Casos inválidos

- Arrastar um marcador de **Seção** para além dos 350 m, passando por cima da linha → **recusado** com a mensagem de 350 m já existente, e o marcador volta à posição antiga (DEC-044/Q-025) — a recusa é de domínio e **não** pode ser confundida com a reversão que esta task elimina; teste explícito separando as duas.
- Arrastar um **Local** para além dos 350 m do par (Local legado com dois pontos) → recusado com a mensagem de Local, mesma separação.
- Arrasto seguido de falha do OSRM (mock `NoRoute`) → pendência bloqueante, última rota válida preservada (RN-048), e a coordenada solta **não** é revertida por causa da falha.
- `mousemove` sobre a linha **sem** nenhum arrasto em curso → o fantasma aparece normalmente (a supressão não pode vazar para o caso comum).

## Testes esperados

- **Unitários** (`testes/unitarios/mapa/mapa.test.tsx`): o dublê de `Marker` passa a registrar `on("dragstart"/"dragend")` e a gravar as chamadas de `setLngLat`. Casos: (a) re-render com o marcador em arrasto **não** produz nova chamada de `setLngLat` naquele marcador; (b) o mesmo re-render **sincroniza** os demais marcadores; (c) depois do `dragend`, um novo render volta a sincronizar o marcador; (d) `mousemove` sobre a linha durante o arrasto **não** chama `aoMoverSobreLinha`; (e) sem arrasto, chama (guarda de não-regressão da TASK-069).
- **Unitários** (`testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`): o marcador de ponto de rota continua expondo `aoArrastar` com o índice correto; o fantasma não é montado enquanto há arrasto.
- **Integração:** arrasto de ponto de rota com hover sobre a linha entre `dragstart` e `dragend` → `aplicarNovasParadas` recebe a lista com a coordenada **nova** e o OSRM mockado é chamado uma vez; asserção explícita de **RN-004** (as UUIDs de Seções/Locais do documento não mudam no gesto).
- **E2E** (`testes/e2e/etapa-itinerarios.spec.ts`, OSRM e tiles mockados): criar um ponto de rota, arrastá-lo até sobre a linha, soltar e aferir que a coordenada listada na tabela lateral mudou e que não há pendência bloqueante.
- **Snapshot/contrato JSON:** `pontos_de_rota` resultante bem-formado (`apos_parada_ordem ∈ [1, paradas−1]`, sem `uuid`) — RN-042.
- **PDF:** não se aplica.

## Arquivos prováveis

- **Alterar:** `src/shared/mapa/mapa.tsx` (ref de marcador em arrasto; guarda em `sincronizarMarcadores`; supressão de `aoMoverSobreLinha` durante o arrasto).
- **Alterar:** `src/formulario/itinerarios/editor-mapa-itinerario.tsx` — **somente se** a supressão do fantasma exigir sinal do lado do consumidor; a preferência é resolver inteiramente na primitiva.
- **Alterar:** `testes/unitarios/mapa/mapa.test.tsx`, `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`, `testes/e2e/etapa-itinerarios.spec.ts`.
- **Não tocar:** `src/shared/mapa/ancoragem.ts`, `src/formulario/roteamento/**`, `src/formulario/secoes/**`, `src/formulario/locais/**`, `src/shared/contrato/**`.

## Riscos

- **Marcador "preso"** se o `dragend` não disparar (desmontagem do marcador no meio do arrasto, remoção da lista): a limpeza do `ref` precisa cobrir a remoção do marcador em `sincronizarMarcadores` e o `unmount` do mapa, senão um marcador deixa de ser sincronizado para sempre. Caso inválido a testar.
- **Interação com a TASK-070** (clique no vértice remove): hoje o MapLibre suprime o `click` do elemento durante o arrasto (`pointerEvents = "none"` em `_onMove`), mas a 070 vai introduzir limiar de clique × arraste sobre este mesmo caminho. Esta task deve rodar **antes** da 070 — com a reversão viva, um arrasto frustrado é inofensivo; com a 070 no ar, passa a ser candidato a remoção destrutiva.
- **Interação com a TASK-076** (Ida e Volta no mesmo mapa): abas e dois painéis multiplicam os re-renders desta superfície. O guarda desta task é o invariante que impede a 076 de reintroduzir o defeito por outro caminho.
- Regressão da affordance de hover (TASK-069/DEC-072) se a supressão vazar para fora do arrasto — coberta por teste de não-regressão explícito.

## Perguntas em aberto

Nenhuma. O comportamento correto está fixado pela Spec 04 §7.3 itens 4/5/6 e pela RN-052; não há lacuna de domínio a decidir.

---

## TASK-098 — Clique direito sobre a linha entrega a coordenada projetada no traçado (DEC-078)

## Objetivo

Ao final, a Seção ou o Local criado pelo menu do **clique direito sobre a linha da rota** nasce na coordenada **projetada sobre o traçado** (ponto do itinerário mais próximo do clique), e não no pixel bruto do cursor. Clique direito fora da linha continua na coordenada bruta.

## Contexto

Bug relatado pelo responsável (2026-07-24): ao criar uma Seção/Local intermediária clicando com o botão direito **em cima do itinerário calculado**, a entidade não nasce sobre a linha (como acontece com o ponto de rota), mas no ponto exato onde o usuário clicou — deslocada do traçado, o que é inconveniente.

A causa é uma assimetria entre os dois botões em `src/shared/mapa/mapa.tsx`: o handler de `click` projeta a coordenada com `projetarSobreLinhas` antes de entregá-la (**DEC-072**, TASK-069), mas o handler de `contextmenu` repassa `evento.lngLat` cru. Essa coordenada segue intacta por `editor-mapa-itinerario.tsx` (`menuCriacao.posicao` → `aoIniciarCriacaoParada`) até `confirmarCriacaoInline` em `etapa-itinerarios.tsx`, onde vira a `geolocalizacao_*` persistida da entidade.

O **índice de inserção** na lista de paradas **já está correto** e não é objeto desta task: `indiceInsercaoParaPosicao` chama `ancorarPontoNaRota`, que projeta internamente. O único defeito é a coordenada da entidade.

Como a coordenada persistida é entrada da **RN-027** (350 m) e da **RN-029** (município), a mudança não podia ser decidida pelo implementador. Foi levantada como **Q-056** e decidida pelo responsável nesta mesma conversa: **DEC-078**, opção A — estender a DEC-072 ao botão direito.

## Fora de escopo

- **Grudar o arrasto de Seção/Local no traçado** — opção C explicitamente **descartada** na Q-056/DEC-078: arrastar continua entregando a coordenada solta, preservando o posicionamento deliberado fora da linha.
- **Alterar o índice de inserção** na lista de paradas (já correto, via `ancorarPontoNaRota`) ou o comportamento do clique direito **fora** da linha (continua acrescentando ao fim — DEC-055).
- Corrigir a reversão do arrasto perto da linha — é a **TASK-097**, independente desta.
- Mudar a tolerância do hit-test (6 px), a forma do menu flutuante, a linha-formulário inline (TASK-095/DEC-077) ou qualquer motor de Seção/Local/350 m/município.
- Contrato JSON, schema, `versao_schema`, PDF, Comparador — nada muda.

## Specs fonte

- Spec 04 §7.3 item 2 ("insere **Seções e Locais em ordem**, clicando no mapa")
- Spec 04 §7.3 item 6 (clicar sobre a linha da rota calculada) — origem da simetria com a DEC-072
- Spec 02 §5.1 (`secao.servicos[].geolocalizacao_ida`/`_volta`)
- Spec 02 §7.1 (geolocalizações do Local)
- Spec 03 §2.1/§2.2 (regra dos 350 m sobre a geolocalização) e §2.3 (município derivado)

## Regras envolvidas

- **RN-027** — 350 m por centroide cumulativo (Seção): passa a ser avaliada sobre a coordenada projetada; a regra **não muda de texto**, só a entrada.
- **RN-029** — Município derivado por ponto-em-polígono: idem; a derivação continua rodando sobre a coordenada efetivamente persistida.
- **RN-026** — Cada Serviço contribui suas geolocalizações à Seção (é este valor que passa a ser o projetado).
- **RN-032** — 350 m pareado de Local (inalterada; Local nasce unidirecional — DEC-075).
- **RN-042** — Ponto de rota (inalterado): esta task não toca o gesto do botão esquerdo.
- **RN-097** — extensão **aditiva** da primitiva `shared/mapa`: consumidor sem `aoClicarDireitoNaLinha` fica inalterado.
- **RN-004** — UUIDs preservadas: a projeção altera coordenada, nunca identidade.

## Entidades afetadas

- **Seção** (`geolocalizacao_ida`/`geolocalizacao_volta` da entrada do Serviço)
- **Local** (geolocalização do sentido em edição)
- **Parada** (posição na lista **inalterada** — só a coordenada da entidade muda)

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] `contextmenu` que **acerta** a camada de linhas entrega a `aoClicarDireitoNaLinha` a **mesma coordenada projetada** que um `click` no mesmo ponto entregaria a `aoClicarNaLinha` (paridade provada por teste).
- [ ] `contextmenu` **fora** da camada continua entregando a coordenada **bruta** a `aoClicarDireito`, sem projeção.
- [ ] A Seção criada pelo menu do clique direito sobre a linha persiste a coordenada **projetada** em `secao.servicos[].geolocalizacao_<sentido>` (RN-026).
- [ ] O Local criado pelo mesmo caminho persiste a coordenada projetada na geolocalização do sentido em edição (DEC-075 preservada — nasce unidirecional).
- [ ] A validação dos **350 m** (RN-027) e a derivação de **município** (RN-029) rodam sobre a coordenada projetada — recusa por 350 m e por "fora de SP" continuam funcionando, com as mensagens atuais.
- [ ] O **índice de inserção** na lista de paradas permanece o mesmo de hoje (nenhuma mudança em `indiceInsercaoParaPosicao`/`ancorarPontoNaRota`).
- [ ] A âncora de tela do menu flutuante (`ancoraTela`) continua na posição do **cursor**, não na projeção — o menu não pode saltar.
- [ ] Nenhum `data-testid`/`aria-*` alterado; consumidores sem `aoClicarDireitoNaLinha` inalterados (RN-097).

## Casos válidos

- Rota desenhada; clique direito a 3 px da linha, escolhendo "Seção" e confirmando o nome → o marcador quadrado da Seção nasce **sobre** a linha azul, e a `geolocalizacao_<sentido>` gravada é a projeção.
- Mesmo gesto escolhendo "Local" → marcador circular sobre a linha, Local unidirecional (DEC-075).
- Clique direito a 50 px da linha (fora da tolerância) → coordenada bruta, parada acrescentada ao fim (DEC-055), sem projeção.
- Itinerário **sem** rota calculada (nenhuma linha desenhada) → clique direito cai no caminho "fora da linha", como hoje.

## Casos inválidos

- Clique direito sobre a linha num ponto cuja **projeção** fica a > 350 m do centroide resultante da Seção → recusa de 350 m com a mensagem atual (RN-027); nenhuma Seção criada.
- Clique direito sobre a linha num ponto cuja projeção cai **fora de SP** (> 2 km de qualquer polígono) → erro "fora de SP" (RN-029), nenhuma entidade criada.
- Linha degenerada (`< 2` pontos, `projetarNaLinha` devolve `undefined`) → degrada para a coordenada **bruta**, sem quebrar o gesto nem descartar o clique em silêncio.

## Testes esperados

- **Unitários** (`testes/unitarios/mapa/mapa.test.tsx`): `contextmenu` com acerto na camada entrega a projeção (mesma coordenada do teste de `click` já existente da TASK-069); sem acerto, entrega a bruta; `ancoraTela` continua vindo de `originalEvent.clientX/clientY`.
- **Unitários** (`testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`): `aoIniciarCriacaoParada` recebe a coordenada projetada como `posicao` **e** como `posicaoNaLinha` quando o gesto foi sobre a linha.
- **Integração:** criar Seção e Local pelo clique direito sobre a linha → documento resultante com a geolocalização projetada; 350 m e município avaliados sobre ela; ordem das paradas idêntica à de hoje.
- **E2E** (`testes/e2e/etapa-itinerarios.spec.ts`, OSRM e tiles mockados): criar Seção pelo menu do clique direito sobre a linha e aferir a coordenada exibida na tabela lateral.
- **Snapshot/contrato JSON:** documento exportado continua válido no schema strict (RN-010); nenhum campo novo (RN-008..015).
- **PDF:** não se aplica.

## Arquivos prováveis

- **Alterar:** `src/shared/mapa/mapa.tsx` (handler de `contextmenu` reusa `projetarSobreLinhas`).
- **Alterar (provavelmente nada):** `src/formulario/itinerarios/editor-mapa-itinerario.tsx` e `etapa-itinerarios.tsx` — a coordenada já flui até `criarSecaoNoPonto`/`criarLocalNoPonto`; confirmar sem alterar lógica.
- **Alterar:** `testes/unitarios/mapa/mapa.test.tsx`, `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx`, `testes/e2e/etapa-itinerarios.spec.ts`.
- **Não tocar:** `src/shared/mapa/ancoragem.ts` (reusado sem alteração), `src/formulario/secoes/fluxos-secao.ts`, `src/formulario/locais/fluxos-local.ts`, `src/shared/contrato/**`.

## Riscos

- **Baixo acoplamento, efeito amplo:** a projeção passa a valer para **todo** consumidor de `aoClicarDireitoNaLinha`. Hoje só o mapa único de itinerários usa a prop — confirmar por varredura antes de fechar.
- Documentos **já exportados** com Seções fora do traçado permanecem válidos e não são migrados (nada reprocessa coordenada existente) — comportamento correto: nenhuma migração de dado é criada.
- Deslocamento de poucos metros pode, em caso de fronteira municipal, mudar a derivação da RN-029. Aceito na DEC-078; caso inválido de "fora de SP" coberto por teste.

## Perguntas em aberto

Nenhuma. **Q-056 decidida (DEC-078, 2026-07-24)**.

## TASK-099 — Renomear `aoAtualizarSessao` para `aoDefinirSessao` (par homófono `Sessao`/`Secao` no Formulário)

## Objetivo

Ao final, a prop/callback que troca **a sessão inteira de edição** não se chama mais `aoAtualizarSessao`, e por isso deixa de ser confundível com `aoAtualizarSecao`, que entrega **uma Seção**. Refactor puro de nomenclatura de código: nenhum comportamento, contrato, regra ou teste de asserção muda.

## Contexto

`aoAtualizarSessao` (7 arquivos de `src/`, 4 de testes, **59 ocorrências em 54 linhas** — conferido em 2026-07-24) e `aoAtualizarSecao` (`editor-secoes.tsx`, `editor-mapa-itinerario.tsx`, `painel-reuso-secao.tsx`, `app/editor-secoes-demo/page.tsx`) são coisas sem relação: a primeira troca o `SessaoFormulario` inteiro (`aplicacao-formulario.tsx:30` a liga ao `definirSessao` do React state); a segunda entrega uma `Secao` ao host, que a converte em gesto de sessão. O fluxo é sempre `aoAtualizarSecao` → host → `aoAtualizarSessao`, **nunca** o contrário.

Os dois nomes diferem por **uma letra**, são **homófonos em português** e ambos são props de callback do mesmo módulo (`formulario/itinerarios/etapa-itinerarios.tsx` usa as duas no mesmo arquivo, incluindo lado a lado nas linhas 1095/1116). Trocar um pelo outro por engano é plausível, e nos pontos em que as assinaturas casam o erro **compila em silêncio**.

Levantado durante a `/analisar-task` da TASK-097 e deixado **fora do escopo** dela (o "Fora de escopo" é vinculante). **Não é bug** — nada está quebrado hoje; é risco de leitura e de digitação.

**Escolha do nome.** "Seção" é nomenclatura oficial das specs (Spec 02 §5) e **intocável** (`docs-dev/04` princípio 12; `docs-dev/18` §6 item 7), então quem renomeia é o lado da sessão de trabalho. **Nome proposto: `aoDefinirSessao`.** Justificativa: (a) desfaz a colisão no **verbo**, não só no substantivo — `definir` vs. `atualizar` não são homófonos nem prefixo um do outro, e o par deixa de diferir por uma letra; (b) espelha o nome real da origem, `definirSessao` em `aplicacao-formulario.tsx:30`; (c) **preserva o vocabulário "sessão"**, já estabelecido em ~569 ocorrências (`SessaoFormulario`, `servicosDaSessao`, `secoesDaSessao`, `identidadeDaSessao`, `comServicosDaSessao`…), o que é exatamente o que permite deixar o tipo fora do escopo sem criar vocabulário dividido.

**`aoAtualizarDocumento` é a alternativa a recusar**, e a recusa é factual, não estética: a sessão **não é** o documento. `SessaoFormulario` tem dois modos e só o modo `"carregado"` carrega um `DocumentoOperacao` (`src/formulario/sessao.ts:112-149`); no modo `"novo"` não há documento nenhum. Pior, `documento` já é o nome de um **campo interno** da sessão — `aoAtualizarDocumento(sessao)` passaria a mentir sobre o que recebe. `aoAtualizarTrabalho` introduz um substantivo ("Trabalho") que não existe em lugar nenhum do código nem das specs, trocando uma confusão por um termo órfão. **A escolha final é do responsável** — é decisão de código, não de domínio, e por isso não abre Q-xxx nem DEC-xxx; se ele preferir outro nome, o resto da task vale sem alteração.

**Prioridade baixa**, com restrição de sequenciamento dura (ver Riscos).

## Fora de escopo

- **Renomear o tipo `SessaoFormulario`** (165 ocorrências) e os demais identificadores com "sessão" (`servicosDaSessao`, `obterSessao`, `montarSessaoNaEtapa`, `sessaoAtual`, `sessaoFinal`, `SESSAO_CARREGADA`…). Justificativa: o tipo **não colide com nada** — não existe `SecaoFormulario`, e `Secao` (o tipo do contrato) nunca aparece em posição intercambiável com ele. Arrastá-lo triplicaria o diff sem reduzir risco algum, e a proposta `aoDefinirSessao` mantém o vocabulário coerente justamente para tornar esse recorte defensável. Se um dia o vocabulário inteiro mudar, é outra task, com outra justificativa.
- **Renomear `aoAtualizarSecao`, `Secao`, `secoesDaSessao`** ou qualquer identificador do lado da entidade — proibido por `docs-dev/04` princípio 12 e `docs-dev/18` §6 item 7.
- **Renomear a prop `sessao`** (o dado) passada lado a lado com o callback, e os locais `secao`/`sessao` dentro dos corpos de função. Superfície muito maior, risco diferente, ganho marginal.
- **Qualquer mudança de comportamento**, de fluxo, de mensagem, de ordem de chamada, de assinatura ou de tipo. Se um `git diff` mostrar algo além de identificador renomeado (e o comentário que o cita), o refactor vazou.
- **Contrato JSON, `versao_schema`, schema zod, RN, spec, `docs-dev/` derivados** — nada muda. `src/shared/contrato/**` e todos os motores (roteamento, 350 m, município, montagem, matrizes) **não são tocados**.
- **Alterar `data-testid` ou `aria-*`** (`docs-dev/18` §6 item 5).
- **Reorganizar arquivos, extrair funções, "aproveitar para" simplificar** o fluxo da sessão.

## Specs fonte

- **Spec 02 §5** — Seção é entidade do Autos, compartilhada: fixa "Seção" como termo do domínio, logo o lado **não renomeável** do par.
- **Spec 04 §7.1** — Inserção de Seções: o gesto que `aoAtualizarSecao` serve.
- **Spec 04 §12** — Exportação JSON: exportar **é** salvar, portanto "sessão" é estado efêmero de edição e **não** é conceito de spec — é o lado renomeável do par.

## Regras envolvidas

- **RN-025** — Seção é entidade do Autos, compartilhada. Nomenclatura de Seção preservada integralmente.
- **RN-096** — o Formulário não persiste no servidor; a sessão é estado efêmero de memória, sem correspondente no contrato. Fundamenta renomear o lado da sessão.
- **RN-004** — UUIDs preservadas na importação: invariante que o refactor não pode roçar; o round-trip existente continua verde **sem alteração de asserção**.
- **RN-010** — schema strict, JSON só com dados de operação: nenhum campo, nenhum nome de campo do contrato muda.
- **RN-008..015** — contrato fechado: intocado.

## Entidades afetadas

**Nenhuma.** Não há mudança em Autos, Serviço, Seção, Local, Parada, ponto de rota ou Viagem — nem em estrutura, nem em nome, nem em comportamento. A mudança é de **identificador de código** de um callback de UI.

## Ferramentas afetadas

- [x] Formulário (apenas nomenclatura interna)
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] `grep -rn "aoAtualizarSessao" src testes` devolve **zero** ocorrências.
- [ ] O novo nome aparece exatamente nos **mesmos 11 arquivos** e nas mesmas posições (7 de `src/`, 4 de testes) — nenhum arquivo novo tocado, nenhum deixado para trás.
- [ ] `aoAtualizarSecao` permanece **byte a byte igual** nos 4 arquivos onde existe (`src/formulario/secoes/editor-secoes.tsx`, `src/formulario/itinerarios/editor-mapa-itinerario.tsx`, `src/formulario/itinerarios/painel-reuso-secao.tsx`, `src/app/editor-secoes-demo/page.tsx`) e em seus testes.
- [ ] O tipo `SessaoFormulario` e todo o restante do vocabulário "sessão" permanecem inalterados (fora de escopo declarado).
- [ ] `npm run typecheck` e `npm run lint` verdes.
- [ ] Suíte canônica completa verde (`npm run test:all:log`), **sem nenhuma asserção de comportamento alterada** — nos 4 arquivos de teste o diff é só o identificador.
- [ ] Nenhum `data-testid` e nenhum `aria-*` alterado (`docs-dev/18` §6 item 5) — verificável por `git diff`.
- [ ] `git diff -- src/shared/contrato src/shared/geo src/formulario/roteamento src/formulario/exportacao src/formulario/importacao` é **vazio**.
- [ ] Comentários que citam o nome antigo foram atualizados junto; nenhum comentário passou a descrever comportamento diferente.

## Casos válidos

- `src/formulario/aplicacao-formulario.tsx:30` — `<LayoutFormulario sessao={sessao} aoDefinirSessao={definirSessao} />`: o callback continua sendo o `definirSessao` do estado React, mesma referência, mesma assinatura `(sessao: SessaoFormulario) => void`.
- `src/formulario/layout/layout-formulario.tsx` — a prop é declarada, desestruturada e repassada às cinco etapas (Identificação, Serviços, Itinerários, Viagens, Matrizes) com o nome novo; nenhuma etapa fica com o nome antigo.
- `src/formulario/itinerarios/etapa-itinerarios.tsx:1095/1116` — `aoAtualizarSecao={aoCriarOuAtualizarSecao}` **permanece intacto** no mesmo componente em que `aoDefinirSessao` passa a ser consumido; é o ponto que dava origem à confusão e o que prova que ela acabou.
- Os 4 testes (`etapa-itinerarios.test.tsx`, `layout-formulario-shell.test.tsx`, `servicos-contadores.test.tsx`, `servicos-etapa.test.tsx`) passam com o nome novo, com o mesmo número de casos, os mesmos títulos e as mesmas asserções.

## Casos inválidos

Aqui "inválido" é o que **reprova a entrega**, não entrada de usuário — a task não introduz validação:

- Sobrou qualquer `aoAtualizarSessao` em `src/` ou `testes/` → reprova (rename parcial deixa dois nomes para a mesma coisa, pior que o estado atual).
- Um `data-testid`, um `aria-*` ou um texto de UI apareceu no diff → reprova (`docs-dev/18` §6 item 5).
- Um arquivo de `src/shared/contrato/**` ou de qualquer motor foi tocado → reprova.
- Alguma **asserção** de teste mudou (valor esperado, contagem, título de caso, mock) → reprova: é sinal de que o refactor vazou para comportamento.
- `SessaoFormulario` foi renomeado junto → reprova por ampliação de escopo.
- O rename foi feito por substituição cega de texto e alcançou `aoAtualizarSecao`, `secoesDaSessao` ou similares → reprova.

## Testes esperados

- **Unitários:** **nenhum teste novo e nenhum removido.** Os 4 arquivos que citam o nome sofrem substituição mecânica do identificador. A evidência é a suíte inteira verde com diff de asserções vazio.
- **Integração:** nenhuma alteração; `etapa-itinerarios.test.tsx` cobre o fluxo `aoAtualizarSecao` → host → callback de sessão e continua passando sem edição de asserção — é o teste que prova que a fiação sobreviveu ao rename.
- **E2E:** nenhuma alteração esperada (nenhum seletor depende de nome de prop). Se algum `.spec.ts` precisar mudar, **pare**: significa que um `data-testid` foi tocado.
- **Snapshot/contrato JSON:** inalterado; round-trip de RN-004 continua verde sem edição.
- **PDF:** não se aplica.

## Arquivos prováveis

- **Alterar (`src/`, 7):** `formulario/aplicacao-formulario.tsx`, `formulario/layout/layout-formulario.tsx`, `formulario/identificacao/identificacao.tsx`, `formulario/itinerarios/etapa-itinerarios.tsx`, `formulario/matrizes/etapa-matrizes.tsx`, `formulario/servicos/servicos.tsx`, `formulario/viagens/etapa-viagens.tsx`.
- **Alterar (testes, 4):** `testes/unitarios/formulario/etapa-itinerarios.test.tsx`, `layout-formulario-shell.test.tsx`, `servicos-contadores.test.tsx`, `servicos-etapa.test.tsx`.
- **Não tocar:** `src/formulario/sessao.ts` (o tipo e os seletores ficam fora do escopo — não há ocorrência do callback ali), `src/formulario/secoes/**`, `src/formulario/itinerarios/painel-reuso-secao.tsx`, `src/formulario/itinerarios/editor-mapa-itinerario.tsx`, `src/app/**`, `src/shared/**`, `docs/specs/**`, `docs-dev/**` (exceto o registro de conclusão em `19-STATUS_EXECUCAO.md`).

## Riscos

- **Conflito de merge — o risco principal.** `etapa-itinerarios.tsx` é editado por **TASK-097, 078** e (indiretamente) **098, 100**; um rename de 59 pontos atravessado no meio dessa fila cria conflito em arquivo grande, num diff que ninguém quer reler. **Restrição dura de sequenciamento: esta task roda DEPOIS de 097, 098, 078 e 100.** (As TASK-070 e TASK-076, que também tocavam este arquivo, foram **canceladas em 2026-07-24** — deixam de fazer parte desta restrição.) Registrado na ordem recomendada do `19-STATUS_EXECUCAO.md` §5.
- **Rename cego.** Substituição por texto sem limite de palavra pode alcançar identificadores vizinhos. Usar rename simbólico da IDE/TS ou `\baoAtualizarSessao\b`, e conferir com `git diff --stat` que só os 11 arquivos previstos aparecem.
- **Vazamento silencioso de escopo.** Renomear código convida a "melhorar de passagem". O diff só pode conter identificador + comentários que o citam.
- **Ganho é preventivo, não corretivo.** Nenhum bug é fechado aqui; se a fila de prioridades apertar, esta task cede lugar sempre.

## Perguntas em aberto

Nenhuma Q-xxx. Pendência **operacional**, não de domínio: o responsável confirma `aoDefinirSessao` (ou indica outro nome) antes da implementação — decisão de código, que por `docs-dev/04` não gera Q-xxx nem DEC-xxx.

## TASK-100 — Botão "redefinir Seção": todos os pontos do cluster voltam para o ponto do serviço/sentido em edição (DEC-080)

## Objetivo

Uma nova ação, disponível **só nas linhas de Seção** da tabela lateral, devolve **todos** os pontos daquela Seção (todas as entradas de `secao.servicos[]`, Ida e Volta, de todos os Serviços) para uma **única coordenada** — a do ponto do Serviço/sentido em edição no momento do clique —, com confirmação explícita antes de aplicar. Permite ao usuário desfazer de uma vez a diferenciação manual entre pontos e recomeçar a redesenhar a Seção a partir de um único lugar.

## Contexto

Pedido novo do responsável (2026-07-24), decidido pela **DEC-080** (Q-058): depois de usar o gesto de arrasto individual (por Serviço/sentido, DEC-044) ou a translação inteira da Seção (TASK-078/DEC-061/DEC-079) para posicionar os pontos, o usuário às vezes quer **desfazer toda a diferenciação** entre Serviços/sentidos de uma Seção e recomeçar do zero, sem ajustar cada contribuição manualmente uma a uma. Um botão de refresh na linha da Seção na tabela lateral abre uma confirmação; ao confirmar, todos os pontos do cluster colapsam na coordenada do ponto que estava sendo editado/visualizado no momento do clique (a Seção some do "desalinhamento" e RN-027 fica trivialmente satisfeita — distância zero ao centroide). Reusa o motor de translação introduzido pela TASK-078, aplicado com um destino fixo (o ponto de origem) em vez de um vetor de arrasto.

## Fora de escopo

- **Mover a Seção para um lugar novo escolhido pelo usuário** — isso é a TASK-078 (arrasto pelo botão esquerdo). Esta task só colapsa os pontos existentes num deles; não abre nenhum gesto de arrasto ou escolha de coordenada nova.
- **Desfazer/histórico** (Ctrl+Z) do reset — não previsto em spec nenhuma; a confirmação explícita (OK/Cancelar) é a única proteção contra acidente, por decisão da DEC-080. Não inventar undo.
- **Reset de Local** — Local é pareado por Serviço (Ida/Volta), não tem múltiplas contribuições divergentes por Serviço como a Seção; fora de escopo (mesma exclusão já aplicada à TASK-078).
- Qualquer mudança de contrato JSON (nenhum campo novo; as coordenadas mudam pelos caminhos existentes de `secao.servicos[]`).
- Alterar a ordem, o alinhamento ou as demais colunas da tabela lateral além de acrescentar o botão novo — as colunas existentes (nome, tipo, mover, remover) preservam posição e largura.

## Specs fonte

- Spec 02 §5.1/§5.2 (contribuições e clustering — a operação de reset é nova; nenhuma spec a descreve, por isso a DEC-080)
- Spec 03 §2.3 (município derivado do ponto/centroide), §7.2 (invariante dos 350 m)
- Spec 04 §7 (tabela lateral — layout e colunas), §14 (mensagens de recusa, ex. fora de SP)

## Regras envolvidas

- RN-027 (350 m — trivialmente satisfeita após o reset: todos os pontos coincidem)
- RN-029 (município re-derivado do ponto único; fora de SP → recusa integral, nenhum ponto movido)
- RN-004/001 (UUID da Seção e das entradas de `secao.servicos[]` preservadas)
- RN-052 (mover coordenadas recalcula as rotas dos itinerários afetados — de **todos** os Serviços que usam a Seção)
- RN-054..057 (matrizes dos Serviços afetados reconciliadas)

## Entidades afetadas

- Seção (todas as contribuições), Rota/Itinerário/matriz dos Serviços que a referenciam

## Ferramentas afetadas

- [x] Formulário
- [ ] Comparador
- [ ] Ingestor
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] A linha de uma Seção na tabela lateral exibe um botão de **refresh**, posicionado **depois** dos botões de mover (subir/descer) e **antes** do "X" de remover; o botão **não** aparece nas linhas de Local nem de ponto de rota.
- [ ] Clicar no botão abre uma janela de confirmação com o texto "Gostaria de redefinir todas as geolocalizações desta seção em todos os serviços e sentidos?" e as ações **OK** e **Cancelar**.
- [ ] **Cancelar** (ou fechar a janela) não altera nada; nenhuma chamada OSRM.
- [ ] **OK** aplica: todas as entradas de `secao.servicos[]` (Ida e Volta, todos os Serviços) passam a ter a mesma geolocalização — a do ponto do Serviço/sentido em edição no momento do clique.
- [ ] Após confirmar: município re-derivado do ponto único (RN-029); destino fora de SP → recusa integral com a mensagem existente, nenhum ponto movido (caso só alcançável se o ponto de origem já não estivesse em SP, o que não deveria ocorrer em documento válido — regressão-guarda).
- [ ] Todos os itinerários (de todos os Serviços) que referenciam a Seção têm a rota recalculada (RN-052) e a matriz reconciliada (RN-054..057); falha de OSRM em um deles → `sem-rota` daquele itinerário (RN-048), sem apagar a última rota válida dos demais.
- [ ] A UUID da Seção e as entradas de `secao.servicos[]` são preservadas (round-trip).
- [ ] As colunas da tabela lateral permanecem alinhadas com a coluna nova — larguras e cabeçalhos das colunas existentes não mudam.
- [ ] Nenhum `data-testid`/`aria-*` existente alterado; E2E atuais verdes.

## Casos válidos

- Seção com 4 pontos (2 Serviços × Ida/Volta) já diferenciados manualmente: clicar em refresh na linha da Seção, confirmar → os 4 pontos passam a coincidir na coordenada do ponto do Serviço/sentido que estava em edição; município re-derivado; as rotas dos 2 Serviços recalculam.
- Cancelar a confirmação: nenhum ponto muda, nenhuma chamada OSRM.

## Casos inválidos

- Seção com um único Serviço/sentido (pontos já coincidentes): reset é um no-op visível (confirma, mas nenhuma coordenada muda) — sem erro.
- OSRM falha no recálculo de um dos itinerários afetados → aquele itinerário em `sem-rota` com pendência; os demais seguem.

## Testes esperados

- Unitários: função pura de reset (todas as contribuições recebem a coordenada de origem; UUID preservada; município re-derivado; fora de SP recusa) — variante do motor de translação da TASK-078 com destino fixo.
- Integração: confirmar dispara recálculo por itinerário afetado (OSRM mockado; contagem de chamadas); cancelar não dispara nada; botão de refresh ausente em linhas de Local/ponto de rota (asserção negativa).
- E2E: diferenciar pontos de uma Seção entre dois Serviços, clicar em refresh, confirmar, e ver os pontos/rotas convergirem (OSRM/tiles mockados).

## Arquivos prováveis

- `src/formulario/secoes/fluxos-secao.ts` (função pura de reset, reusando o motor de translação da TASK-078)
- `src/shared/ui/` (componente de diálogo de confirmação, se ainda não houver um genérico reusável — conferir no design system, doc 18, antes de criar novo)
- `src/formulario/itinerarios/etapa-itinerarios.tsx` (botão na linha de Seção da tabela; commit + recálculo em cascata dos itinerários afetados)
- `docs-dev/18-DESIGN_SYSTEM.md` (ícone de refresh, posição na linha da tabela — doc 18 §6 se exigir token novo)

## Riscos

- **Depende da TASK-078** para o motor de translação em cascata (recálculo multi-Serviço, reconciliação de matrizes) — não duplicar essa lógica; reusar a função pura que a 078 introduz.
- **Confirmação é a única proteção contra reset acidental** — sem undo (fora de escopo, DEC-080); garantir que o texto da confirmação seja claro sobre o alcance (todos os serviços e sentidos, não só o corrente).
- Serviço em construção (modo novo): pontos vivem em `secoesEmConstrucao` — cobrir os dois modos.
- Layout da tabela: acrescentar uma coluna/botão sem quebrar o alinhamento das demais colunas em todas as densidades já suportadas pela DEC-073.

## Dependências

- **DEC-080** (decidida — task liberada). **Requer a TASK-078** (motor de translação em cascata multi-Serviço) — recomendado implementar depois dela, reusando a mesma função pura.

## Perguntas em aberto

- Nenhuma (Q-058 decidida pela DEC-080).

---

**Primeira task:** TASK-001; **primeira task de valor de negócio:** TASK-003 (schema do contrato) — é a fundação de tudo e o melhor ponto de partida para validar o processo spec-driven.
