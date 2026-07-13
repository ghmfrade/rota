# 06 — BACKLOG_INICIAL: Backlog Priorizado

**Formato por task:** prioridade, fase, resumo, regras RN, dependências, critérios de aceite resumidos, testes esperados. Cada item vira uma task completa com `05-TASK_TEMPLATE.md` antes de ser implementado.
**Fases:** 1 Fundação · 2 Contrato JSON · 3 Validações de domínio · 4 Formulário · 5 Mapa e roteamento · 6 Distâncias e seccionamento · 7 Viagens e horários · 8 PDF operacional · 9 Comparador · 10 PDF comparativo · 11 Ingestor futuro · 12 Qualidade e testes.
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
**Regras RN:** RN-030, RN-033..036, RN-038. **Depende de:** TASK-004, TASK-017, TASK-018, TASK-024 (estado de rota ao vivo por itinerário — RN-052; DEC-041), TASK-044 (pendência bloqueante "itinerário sem rota válida" já disponível em `coletarPendencias`).
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

---

## Ordem recomendada de execução

```text
001 → 002 → 003 → 004/005 (paralelo) → 041 → 006 → 007 → 042
→ 008/009 (paralelo) → 010 → 011 → 012
→ 013 → 014 → 015 → 016 → 020 → 021 → 043 → 022 → 023 → 024 → 044 → 045 → 017 → 018 → 019 → 025
→ 026 → 027 → 028 → 029 → 030 → 031 → 032
→ 033 → 034
→ 035 → 036 → 037 → 038 → 039
→ (decisão humana) 040
```

**Primeira task:** TASK-001; **primeira task de valor de negócio:** TASK-003 (schema do contrato) — é a fundação de tudo e o melhor ponto de partida para validar o processo spec-driven.
