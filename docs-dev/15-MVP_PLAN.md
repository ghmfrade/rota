# 15 — MVP_PLAN: Plano de MVP Incremental

Ondas de entrega. Cada MVP só começa com o anterior aceito (revisão de aderência). Tasks referenciadas: `06-BACKLOG_INICIAL.md`. Um MVP **não** redefine escopo de produto — só fatia as specs no tempo.

---

## MVP 0 — Fundação documental e contrato

**Objetivo:** o contrato JSON existe como código validável, com import/export mínimo — antes de qualquer tela rica.
**Entregáveis:** estrutura do projeto (TASK-001/002); schema completo com validações estruturais (TASK-003/004); factory de entidades (TASK-005); import com preservação de UUID (TASK-006); export proposta/vigente (TASK-007); fixtures canônicas e suíte de regressão (TASK-041/042); módulos de tipificação, geo e município (TASK-008..012).
**Fora de escopo:** qualquer UI além do mínimo para exercitar import/export; mapa; OSRM; PDF.
**Dependências:** decisão Q-003 (stack de teste/libs); Q-005 (formato das listas).
**Principais RN:** RN-001..018, RN-019..022, RN-027..029, RN-033..041, RN-054..059, RN-061..063.
**Riscos:** schema divergir da Spec 02 em detalhe fino (mitigação: casos negativos por validação da §14); subestimar o validador referencial.
**Critérios de aceite:** fixture da Spec 02 §15 valida; round-trip preserva UUIDs; toda validação da Spec 02 §14 tem teste negativo; campo de fluxo é rejeitado.

## MVP 1 — Formulário sem mapa avançado

**Objetivo:** montar uma operação completa **sem** roteamento fino: identificação, Serviços, Seções/Locais (posições simples), itinerários, viagens/horários e exportação.
**Entregáveis:** tela inicial e avisos (TASK-013); layout por etapas + pendências (TASK-014); Identificação (TASK-015); Serviços (TASK-016); grade de horários comum e feriados (TASK-028..030); contagens e revisão (TASK-031/032); exportação JSON integrada.
**Fora de escopo:** pontos de rota, descrição textual, matrizes calculadas (entram no MVP 2 — a exportação real fica bloqueada por rota pendente, conforme RN-048; para validação de fluxo usam-se fixtures).
**Dependências:** MVP 0.
**Principais RN:** RN-016/017, RN-023/024, RN-061..067, RN-068..073, RN-078/079.
**Riscos:** a grade (blocos por posição ordinal) é a UI mais complexa do Formulário; validar cedo com usuário real.
**Critérios de aceite:** criar documento do zero e por carga de vigente; grade cria Viagens estratificadas; redistribuição/reset conforme Spec 03 §8; contagens rotuladas.

## MVP 2 — Mapa e roteamento

**Objetivo:** o coração georreferenciado: mapa, Seções/Locais no mapa, OSRM, pontos de rota, distâncias e bloqueios.
**Entregáveis:** mapa base (TASK-020); cliente OSRM + falhas bloqueantes (TASK-021/022); pontos de rota (TASK-023); abrir congelado × recalcular (TASK-024); descrição textual (TASK-025); editores de Seção/Local/itinerário no mapa (TASK-017..019); matriz de distâncias e seccionamento (TASK-026/027).
**Fora de escopo:** PDF; comparador; OSRM auto-hospedado (registro Q-007 — demo serve ao desenvolvimento).
**Dependências:** MVP 1.
**Principais RN:** RN-025..032, RN-040..053, RN-054..060.
**Riscos:** instabilidade do OSRM demo durante desenvolvimento (mitigar com mocks e gravações); regra dos 350 m na UX (mensagens claras de recusa).
**Critérios de aceite:** rota forçada reproduzível após reimport; invariante trechos = paradas−1 com pontos de rota; falha de OSRM bloqueia exportação com mensagem da Spec 04 §14; matriz recalculada ao concluir edição.

## MVP 3 — PDF operacional

**Objetivo:** o primeiro artefato peticionável completo.
**Entregáveis:** PDF com estrutura da Spec 04 §13 (TASK-033/034): capa, resumo rotulado, serviços, itinerários (sequência de Seções, descrição textual, imagem do mapa), duas tabelas horárias, matrizes, anexo técnico, rodapé com aviso SEI.
**Fora de escopo:** R$ (versão futura); PDF comparativo.
**Dependências:** MVP 2.
**Principais RN:** RN-074..077, RN-013.
**Riscos:** legibilidade de tabelas grandes (muitas Seções × 7 dias); paginação.
**Critérios de aceite:** critérios 15, 20 da Spec 04 §15; testes de ausência (R$, offsets, workflow) verdes; leitura validada por um técnico.

## MVP 4 — Comparador

**Objetivo:** diff completo entre duas versões + PDF comparativo.
**Entregáveis:** carga e validação dos dois arquivos (TASK-035); motor de diff por UUID + taxonomia (TASK-036); telas (visão geral, serviços, horários, opções, matrizes) (TASK-037); mapa comparativo (TASK-038); PDF comparativo (TASK-039).
**Fora de escopo:** modo "Autos diferentes" (Q-008 — escape opcional, decidir antes); tarifa em R$; heurística refinada de entidade recriada (limiares — Spec 05 §21.3).
**Dependências:** MVP 3 (reusa contagens, formatos e captura de mapa); pares de fixtures vigente/proposta com diffs conhecidos.
**Principais RN:** RN-012, RN-080..092.
**Riscos:** tolerância de "rota alterada" sem valor fixado (Q-004) — bloquear TASK-038 até decisão; performance de diff em Autos grandes.
**Critérios de aceite:** critérios 1–15 da Spec 05 §19; comparador 100% offline; JSONs de entrada imutáveis.

## MVP 5 — Ingestor futuro

**Objetivo:** preparar (não implementar) a ingestão oficial.
**Entregáveis:** **Spec 06** (modelo PostgreSQL, mapeamento UUID→chave, checagens estáticas, política de recarga/versão) — TASK-040; plano de carga; validação de JSON aprovado como pré-ingestão.
**Fora de escopo:** implementação antes da decisão humana registrada (RN-093 — **não implementar antes da decisão**).
**Dependências:** MVPs 0–4 em produção; decisão institucional sobre o banco oficial.
**Principais RN:** RN-093, RN-094, RN-005.
**Riscos:** pressão para antecipar; mudanças de contrato tardias encarecem o mapeamento (mitigação: `versao_schema` disciplinado desde o MVP 0).
**Critérios de aceite:** Spec 06 aprovada; backlog de ingestão derivado dela; nenhuma linha de código de banco antes disso.
