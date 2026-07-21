# Revisão da TASK-068 — reavaliação

**Revisor:** Codex
**Data:** 2026-07-21
**Commit/branch revisado:** `37502b4` + correção `861b5a4` / `redesign` (definição ampliada da TASK-068 e DEC-070 presentes no working tree)

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A entrega fecha o vocabulário visual dos marcadores, degrada para inserção ao fim quando o clique posicional não pode ser ancorado e apresenta o estado contextual de Local em extremo. A correção `861b5a4` completa os cenários de início, falha geométrica, isolamento por sentido e promoção do Serviço. O bloqueio de RN-035 chega ao gate por estado efêmero, sem alterar o contrato JSON.

## Regras RN verificadas

- RN-025 / RN-031 — **atendidas**: Seção e Local permanecem entidades distintas; a diferenciação adicionada é apenas visual (`src/formulario/itinerarios/editor-mapa-itinerario.tsx:137`, `src/formulario/itinerarios/editor-mapa-itinerario.tsx:154`).
- RN-035 — **atendida**: Locais extremos são derivados por ocorrência, recusados antes do OSRM, sinalizados na tabela/mapa, impedem promoção e geram pendência bloqueante (`src/formulario/itinerarios/motor-montagem.ts:105`, `src/formulario/itinerarios/etapa-itinerarios.tsx:397`, `src/formulario/itinerarios/promocao-servico.ts:52`, `src/formulario/pendencias/pendencias.ts:117`).
- RN-042 — **atendida**: ponto de rota continua sendo marcador pequeno, sem identidade ou entrada na tabela de Paradas (`src/formulario/itinerarios/editor-mapa-itinerario.tsx:180`, `src/formulario/itinerarios/etapa-itinerarios.tsx:815`).
- RN-052 — **atendida**: a edição válida recalcula; montagem inválida/fallback com Local extremo é validada antes da chamada ao OSRM (`src/formulario/itinerarios/etapa-itinerarios.tsx:397`, `src/formulario/itinerarios/estado-itinerarios.ts:118`).
- RN-076 — **atendida no recorte de UI**: a tabela mantém os nomes oficiais de Seção/Local, sem criar rótulo para ponto de rota (`src/formulario/itinerarios/etapa-itinerarios.tsx:820`).
- RN-078 — **atendida**: o estado efêmero `paradasEmEdicao` produz pendência bloqueante mesmo com documento/rota anterior válidos (`src/formulario/pendencias/pendencias.ts:117`, `testes/unitarios/formulario/gate-exportacao.test.ts:80`).

## Specs verificadas

- Spec 02 §5 e §7 — **aderente**: a aparência distingue Seção de Local sem alterar modelo ou referências.
- Spec 02 §10.1 e §14 — **aderente**: o estado intermediário não flexibiliza a exigência de Seções nos extremos; promoção/exportação continuam bloqueadas.
- Spec 02 §10.4 — **aderente**: ponto de rota permanece fora das Paradas e sem identidade.
- Spec 03 §3.6 / §3.6.2 — **aderente**: os pontos de rota apenas condicionam o traçado e continuam preservados na edição.
- Spec 04 §7 / §7.3 — **aderente**: mapa único exibe Seção, Local e ponto de rota com vocabulário distinto; o fallback não descarta silenciosamente a entidade criada.
- Spec 04 §11 / §12 / §14 — **aderente**: a explicação é operacional e acessível, e a exportação fica bloqueada enquanto RN-035 persistir.

## Pontos corretos

- A hierarquia `9 < 12 < 16` vem de tokens do design system e é aferida por teste (`src/app/globals.css:29`, `testes/e2e/etapa-itinerarios.spec.ts:275`).
- `forma: "quadrado"` e `tamanho: "medio"` são extensões aditivas; consumidores existentes mantêm o pino padrão (`src/shared/mapa/mapa.tsx:39`).
- O marcador inválido preserva círculo e preenchimento verde, alterando apenas a borda para `--color-erro` (`src/app/globals.css:99`, `testes/e2e/etapa-itinerarios.spec.ts:311`).
- A linha inválida tem texto, foco, `aria-invalid` e descrição por `aria-describedby`, sem depender apenas de cor ou hover (`src/formulario/itinerarios/etapa-itinerarios.tsx:831`, `src/shared/ui/tooltip.tsx:103`).
- O fallback cobre ausência de linha/estado resolvível e falha geométrica de ancoragem, sempre inserindo ao fim (`src/formulario/itinerarios/etapa-itinerarios.tsx:496`, `testes/unitarios/formulario/etapa-itinerarios.test.tsx:362`, `testes/unitarios/formulario/etapa-itinerarios.test.tsx:415`).
- O bloqueio é isolado por itinerário/sentido e desaparece ao tornar o Local intermediário (`testes/unitarios/formulario/etapa-itinerarios.test.tsx:455`, `testes/e2e/etapa-itinerarios.spec.ts:348`).
- A promoção do Serviço tem defesa própria contra rota anterior válida mascarar RN-035 (`src/formulario/itinerarios/promocao-servico.ts:52`, `testes/unitarios/formulario/promocao-servico-sessao.test.ts:196`).

## Problemas encontrados

- Nenhum problema impeditivo ou desvio menor encontrado nesta reavaliação.

## Violações de escopo

- Nenhuma. As alterações em `Mapa`, `Tooltip`, pendências e promoção são necessárias aos itens A–E e não implementam hover da linha (TASK-069), remoção de vértice (TASK-070), mudança de contrato, ancorador ou motor de roteamento.

## Testes avaliados

- cobertura das RN da task: **sim** — forma/tamanho/cor, início/fim, fallback por montagem e por falha geométrica, ausência de OSRM, feedback contextual, recuperação, isolamento por sentido, gate e promoção.
- casos inválidos testados: **sim** — Local no primeiro/último lugar, rota anterior válida, falha de ancoragem, montagem inválida e Serviço em construção.
- regressão de UUID: **N/A** — a task não toca importação, exportação, cópia ou factory de identidade; a suíte geral de UUID permaneceu verde.
- OSRM mockado: **sim** — `fetch`/rota Playwright são mockados nos testes da task (`testes/unitarios/formulario/etapa-itinerarios.test.tsx:514`, `testes/e2e/etapa-itinerarios.spec.ts:238`).
- verificações complementares desta revisão: `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` — **código 0**.
- suíte canônica: o log válido existente foi reutilizado, conforme o protocolo. Executor `Codex`; fingerprint `032dfe88d074fcf9ff60092907dfdda1292517d923303ce99b47ce13681e0f5c`; working tree `00c21aa501d19b4a9ade6b12db96274b9a6725e300e14f1fda33b4dc1336f57e`. Resultado: **90 arquivos / 1.083 testes unitários aprovados; 58 E2E aprovados; códigos 0; resultado geral APROVADO** (`ultimo-test-all.log:32`, `ultimo-test-all.log:170`, `ultimo-test-all.log:186`).

## Checklist 07

Resultado: **30 itens atendidos, 23 N/A, 0 violados**.

### Escopo

- [x] Alteração pertence ao ROTA, não ao SEI (RN-095).
- [x] Não introduz workflow (RN-095).
- [x] Não cria status de pedido (RN-011).
- [x] Não cria persistência transacional (RN-096).
- [x] Implementa apenas o escopo da TASK-068.
- [x] Não inventa regra; comportamento fundamentado nas specs, RN e DEC-069/070.

### JSON (contrato)

- [x] JSON continua contendo apenas dados de operação (RN-010).
- [x] JSON continua autossuficiente (RN-009).
- [x] Nenhum campo novo foi adicionado.
- [N/A] Preservação de UUID na importação/edição (RN-004) — contrato/importador não tocados.
- [N/A] UUID nova para entidade nova/cópia (RN-002/007) — factory não tocada.
- [N/A] XOR de Parada (RN-033) — schema/modelo de Parada não tocados.
- [x] Nenhum valor monetário entrou no JSON (RN-013).
- [N/A] Unidades/arredondamento (RN-014/050) — cálculo não tocado.
- [N/A] Dados congelados em leitores (RN-015) — leitores não tocados.

### Domínio

- [x] Seção e Local continuam separados (RN-025/031).
- [x] Ponto de rota não virou Parada/Seção/Local (RN-042).
- [x] Serviço mantém identidade UUID na promoção (RN-001).
- [N/A] `numero_n` como identidade (RN-006) — lógica de identidade não tocada.
- [x] Extremos continuam sendo Seções (RN-035).
- [N/A] Conjunto de Seções Ida/Volta (RN-030) — regra não tocada.
- [N/A] Tipificação (RN-019..022) — não tocada.
- [N/A] Estratificação de Viagem (RN-061) — não tocada.
- [N/A] Feriado/contagens (RN-069) — não tocados.

### Comparador

- [N/A] Comparação por UUID (RN-081).
- [N/A] Taxonomia adicionada/removida/alterada/inalterada (RN-081..083).
- [N/A] Comparativo fora do JSON e sem mutação (RN-080/097).
- [N/A] `status`/datas fora do diff (RN-012).
- [N/A] Bloqueio de Autos diferentes (RN-084).
- [N/A] Comparação estável de rota (RN-087).
- [N/A] Comparador sem OSRM/persistência (RN-080).

### Roteamento

- [x] Montagem inválida não aceita rota/fallback inventado (RN-048).
- [N/A] Distância exclusivamente do OSRM (RN-047/050) — cálculo não tocado.
- [x] Pontos de rota apenas condicionam o traçado (RN-041..043).
- [x] Abrir JSON continua sem OSRM; editar recalcula (RN-052).
- [x] Mensagens operacionais e sem tarifa (RN-049 / Spec 04 §14).

### UI/PDF

- [x] Nomes de Seção mantêm o padrão oficial na tabela (RN-076).
- [N/A] Horários/offsets (RN-067/076).
- [N/A] Matrizes triangulares/sem R$ (RN-076).
- [N/A] Local fora da grade principal/descrição/PDF (RN-031/044/076) — superfícies não tocadas.
- [N/A] Aviso de fronteira com o SEI no PDF (RN-077).
- [x] Exportação bloqueada por pendência de RN-035 (RN-078).
- [x] UI aderente ao design system e tokens (DEC-050).
- [x] `data-testid`/`aria-*` existentes preservados; atributos novos são aditivos (DEC-050).

### Testes

- [x] RN implementadas possuem testes conforme a matriz 03.
- [x] Casos inválidos foram testados.
- [N/A] Regressão específica de UUID — task não toca import/export/cópia.
- [x] Testes de roteamento usam OSRM mockado.
- [x] Fixtures canônicas são reutilizadas.
- [x] Verificações direcionadas, typecheck/lint e build foram executados e reportados.
- [x] Evidência final canônica tem marcador, códigos 0, fingerprint e identidade válidos.
- [x] A revisão reutilizou o log válido sem repetir a suíte.
- [x] Executor registrou limpeza do PID próprio e nenhum servidor alheio foi reutilizado/finalizado.

## Pendências

- Nenhuma condição de merge para a TASK-068.
- A condição de merge herdada da TASK-067 foi concluída pelo item D e seus testes.
- TASK-069 fica desbloqueada; TASK-079/064/076 devem preservar/compor o estado de erro já definido, conforme suas próprias tasks.

## Decisão

**Aprovado.** A entrega completa e a correção satisfazem os critérios da TASK-068, as RN de criticidade Alta afetadas têm cobertura válida, o checklist não tem item aplicável violado e todas as verificações estão verdes. O ciclo da TASK-068 está concluído e ela pode sair da lista de pendentes.
