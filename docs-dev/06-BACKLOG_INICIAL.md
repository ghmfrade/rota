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
**Resumo:** Tabela da Spec 03 §10.2 como módulo puro: características permitidas por tipo, famílias, litoralidade, veículo único no semiurbano; usado por schema, dropdown e revalidação na troca de tipo.
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
**Resumo:** Seleção de Autos/empresa/tipo das listas; campos não editáveis pós-criação; troca de tipo revalida tipificação; selo de status.
**Regras RN:** RN-016, RN-023. **Depende de:** TASK-008, TASK-013.
**Testes esperados:** E2E; unitário da revalidação.

## TASK-016 — Etapa Serviços (CRUD + duplicar)

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Criar/editar/remover/duplicar Serviço: `numero_n` sequencial sugerido, dropdown filtrado por tipificação, `carater`, direcionalidade; duplicação com UUIDs novas e remoção em cascata de Seções órfãs.
**Regras RN:** RN-006, RN-007, RN-018, RN-019..021, RN-024. **Depende de:** TASK-005, TASK-008.
**Testes esperados:** unitários (duplicar → UUIDs novas, referências de Seção mantidas); E2E.

## TASK-017 — Editor de Seções no mapa

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Criar Seção clicando no mapa (nome digitado, município derivado somente-leitura), reutilizar Seções existentes, contribuição de geoloc por Serviço/sentido, arrasto com revalidação 350 m e oferta de "criar Seção nova" na recusa.
**Regras RN:** RN-025..027, RN-029. **Depende de:** TASK-010, TASK-011, TASK-020 (mapa base).
**Testes esperados:** unitários dos fluxos de inserção; E2E de recusa 350 m.

## TASK-018 — Editor de Locais no mapa

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Criar/arrastar/excluir-por-sentido Locais (criação bidirecional espelhada; exclusão de um sentido torna unidirecional e remove a parada do sentido), 350 m pareado, município derivado.
**Regras RN:** RN-031, RN-032, RN-029. **Depende de:** TASK-010, TASK-011, TASK-020.
**Testes esperados:** unitários; E2E.

## TASK-019 — Montagem do itinerário (paradas ordenadas + tabela lateral)

**Prioridade:** Alta · **Fase:** Formulário
**Resumo:** Inserir Seções/Locais em ordem, reordenar pela tabela lateral sincronizada com o mapa, validações de Parada (XOR, extremos, geoloc do sentido), conjunto de Seções Ida=Volta.
**Regras RN:** RN-030, RN-033..036, RN-038. **Depende de:** TASK-004, TASK-017, TASK-018.
**Testes esperados:** unitários; E2E (reordenar → recálculo sinalizado).

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
**Regras RN:** RN-071, RN-078. **Depende de:** TASK-014, TASK-025, TASK-026, TASK-029, TASK-031.
**Testes esperados:** integração (cada pendência ativa/desativa o gate); E2E.

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

---

## Ordem recomendada de execução

```text
001 → 002 → 003 → 004/005 (paralelo) → 041 → 006 → 007 → 042
→ 008/009 (paralelo) → 010 → 011 → 012
→ 013 → 014 → 015 → 016 → 020 → 021 → 022 → 023 → 024 → 017 → 018 → 019 → 025
→ 026 → 027 → 028 → 029 → 030 → 031 → 032
→ 033 → 034
→ 035 → 036 → 037 → 038 → 039
→ (decisão humana) 040
```

**Primeira task:** TASK-001; **primeira task de valor de negócio:** TASK-003 (schema do contrato) — é a fundação de tudo e o melhor ponto de partida para validar o processo spec-driven.
