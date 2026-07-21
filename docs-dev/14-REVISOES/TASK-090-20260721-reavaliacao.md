# Revisão da TASK-090 — reavaliação

**Revisor:** Codex
**Data:** 2026-07-21
**Commit/branch revisado:** `aa79302` / `redesign` (correção sobre a entrega `735c992`)

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A entrega consolida um executor canônico para Vitest + Playwright, com servidor Next próprio na porta 3100, timeout, health check, limpeza por PID e log efêmero verificável. A correção `aa79302` vincula a evidência ao working tree e acrescenta cobertura dos caminhos negativos reais dos dois orquestradores.

Os arquivos centrais são `scripts/executar-test-all-log.mjs`, `scripts/executar-e2e-controlado.mjs`, `scripts/infraestrutura-test-all.mjs`, `scripts/verificar-log-test-all.mjs`, `testes/unitarios/scripts/executores-test-all.test.ts` e `testes/unitarios/scripts/infraestrutura-test-all.test.ts`.

## Regras RN verificadas

- RN-004 — atendida como regressão: importação/contrato não foram alterados e a suíte completa, com 1.080 testes unitários, ficou verde.
- RN-010/RN-013 — atendidas: nenhum campo de workflow ou valor monetário foi acrescentado ao JSON; o diff permanece restrito à infraestrutura de testes e ao protocolo operacional.
- RN-035 — não alterada; regressão completa verde.
- RN-041/RN-042 — não alteradas; regressão completa verde.
- RN-048 — atendida no recorte da task: os testes continuam sem dependência do OSRM real e nenhuma degradação de rota foi introduzida.
- RN-052 — não alterada; regressão completa verde.
- RN-069 — não alterada; regressão completa verde.
- RN-078 — não alterada; regressão completa verde.
- RN-080 — atendida: o Comparador não foi alterado e a infraestrutura não acrescenta persistência nem chamadas ao OSRM.

## Specs verificadas

- Spec 01 §5/§6 — aderente: contrato client-side e identidade estável não foram alterados; a regressão completa foi preservada.
- Spec 02 §10.1/§12 — aderente: extremos-Seção e UUIDs permanecem invariantes da suíte.
- Spec 03 §3.5/§3.6.2 — aderente: nenhum fallback ou recálculo de leitor foi introduzido; a rede de roteamento continua mockada nos testes.
- Spec 04 §11/§12/§14 — aderente: pendências, gate de exportação e mensagens não foram modificados e suas regressões ficaram verdes.

## Pontos corretos

- `npm run test:all:log` executa as etapas sequencialmente e aprova somente com os dois códigos zero (`scripts/executar-test-all-log.mjs:210`, `scripts/executar-test-all-log.mjs:217`, `scripts/executar-test-all-log.mjs:257`).
- O log temporário só é promovido depois do resumo final; interrupção preserva o temporário sem marcador de fim (`scripts/executar-test-all-log.mjs:245`, `scripts/executar-test-all-log.mjs:260`, `scripts/executar-test-all-log.mjs:271`).
- O caminho canônico usa servidor próprio, recusa porta ocupada, aguarda health check e desativa o `webServer` do Playwright (`scripts/executar-e2e-controlado.mjs:168`, `scripts/executar-e2e-controlado.mjs:207`, `scripts/executar-e2e-controlado.mjs:240`, `playwright.config.ts:21`).
- A limpeza usa apenas os PIDs capturados do build, Playwright e servidor; no Windows, `taskkill` recebe `/PID <pid> /T /F` explicitamente (`scripts/executar-e2e-controlado.mjs:127`, `scripts/infraestrutura-test-all.mjs:202`).
- O gerador registra o caminho canônico e sua identidade SHA-256; o verificador compara essa identidade e rejeita evidência de outro working tree (`scripts/executar-test-all-log.mjs:186`, `scripts/executar-test-all-log.mjs:201`, `scripts/verificar-log-test-all.mjs:55`, `testes/unitarios/scripts/infraestrutura-test-all.test.ts:111`).
- Os orquestradores reais estão cobertos sob Vitest/Playwright vermelho, timeout, `SIGINT`, `SIGTERM`, erro de spawn, exceção interna, porta ocupada e limpeza de processo testemunha (`testes/unitarios/scripts/executores-test-all.test.ts:95`, `testes/unitarios/scripts/executores-test-all.test.ts:122`, `testes/unitarios/scripts/executores-test-all.test.ts:144`, `testes/unitarios/scripts/executores-test-all.test.ts:180`, `testes/unitarios/scripts/executores-test-all.test.ts:236`, `testes/unitarios/scripts/infraestrutura-test-all.test.ts:184`).
- O protocolo está alinhado em `CLAUDE.md`, nas skills e em `docs-dev/04`, `07` e `08`; a TASK-090 passa a sustentar a evidência final das tasks seguintes, sem mudar regras de negócio delas.

## Problemas encontrados

- Nenhum.

## Violações de escopo

- Nenhuma. Não houve alteração em `src/`, contrato JSON, fixtures canônicas de operação ou asserções funcionais preexistentes.

## Testes avaliados

- cobertura das RN da task: N/A para comportamento novo de domínio; as RN citadas são invariantes de regressão e a suíte completa ficou verde.
- casos inválidos testados: sim — outro working tree, log truncado/vermelho, Vitest/Playwright vermelho, timeout, sinais, exceções, porta ocupada e cleanup seletivo.
- regressão de UUID (se aplicável): sim, pela suíte completa reutilizada (RN-004); a task não toca importação/exportação/cópia.
- OSRM mockado: sim; nenhum teste depende do serviço público.
- suíte executada com resultado: evidência canônica válida reutilizada, sem repetição — executor `Codex`, fingerprint `ca65e41242ee29422b28e9ee2229e1a220c31e16e83d9b8caff3b39bf0f342fa`, identidade do working tree `00c21aa501d19b4a9ade6b12db96274b9a6725e300e14f1fda33b4dc1336f57e`, 1.080 unitários e 58 E2E verdes. O log registra build verde, porta 3100, encerramento do PID próprio e resultado geral aprovado. `npm run lint` e `npm run typecheck` também terminaram com código 0 nesta revisão.

## Checklist 07

Resultado: **16 itens ok, 37 N/A, 0 violados**.

### Escopo

- [x] A alteração pertence ao ROTA, e não ao SEI (RN-095).
- [x] Não introduz workflow (RN-095).
- [x] Não cria status de pedido além de `autos.status` (RN-011).
- [x] Não cria persistência transacional (RN-096).
- [x] Implementa somente o escopo da task.
- [x] Não inventa regra de negócio.

### JSON (contrato)

- [x] O JSON continua contendo apenas dados de operação (RN-010).
- [x] O JSON continua autossuficiente (RN-009).
- [x] Nenhum campo novo foi adicionado.
- [N/A] Preservação de UUID na importação — importação não alterada (RN-004).
- [N/A] UUID nova para entidades novas/cópias — criação não alterada (RN-002/007).
- [N/A] XOR de Parada — contrato não alterado (RN-033).
- [x] Nenhum valor monetário entrou no JSON (RN-013).
- [N/A] Unidades/arredondamento — cálculo não alterado (RN-014/050).
- [N/A] Dados congelados — leitores não alterados (RN-015).

### Domínio

- [N/A] Seção e Local separados (RN-025/031).
- [N/A] Ponto de rota não tratado como Parada (RN-042).
- [N/A] Identidade de Serviço (RN-001).
- [N/A] `numero_n` como identidade (RN-006).
- [N/A] Extremos-Seção (RN-035).
- [N/A] Conjunto de Seções Ida/Volta (RN-030).
- [N/A] Tipificação (RN-019..022).
- [N/A] Estratificação de Viagem (RN-061).
- [N/A] Contagens de feriado (RN-069).

### Comparador

- [N/A] Comparação por UUID (RN-081).
- [N/A] Classificação de entidades (RN-081..083).
- [N/A] Imutabilidade do comparativo (RN-080/097).
- [N/A] `status`/datas fora do diff (RN-012).
- [N/A] Bloqueio de Autos diferentes (RN-084).
- [N/A] Comparação estável de rota (RN-087).
- [N/A] Comparador sem OSRM/persistência (RN-080).

### Roteamento

- [N/A] Falha do OSRM bloqueante — código de produção não alterado (RN-048).
- [N/A] Distância exclusivamente do OSRM (RN-047/050).
- [N/A] Pontos de rota e invariante de trechos (RN-041..043).
- [N/A] Abertura sem OSRM (RN-052).
- [N/A] Mensagens de erro (RN-049).

### UI/PDF

- [N/A] Nomes de Seção (RN-076).
- [N/A] Horários/offsets (RN-067/076).
- [N/A] Matrizes (RN-076).
- [N/A] Locais no PDF/grade/descrição (RN-031/044/076).
- [N/A] Aviso de fronteira com SEI no PDF (RN-077).
- [N/A] Gate de exportação (RN-078).
- [N/A] Design system (DEC-050).
- [N/A] Preservação de `data-testid`/`aria-*` (DEC-050).

### Testes

- [N/A] Toda RN alterada possui teste — nenhuma RN ganhou comportamento nesta task.
- [x] Casos inválidos foram testados.
- [N/A] Regressão UUID específica — a task não toca importação/exportação/cópia (RN-004/007).
- [x] Testes de roteamento usam OSRM mockado.
- [N/A] Fixtures canônicas de JSON — a infraestrutura usa uma fixture local de processo, não documento de operação.
- [x] Verificações direcionadas, lint, typecheck e build aplicável foram executados e reportados honestamente.
- [x] A evidência final veio de uma execução canônica e o verificador confirmou marcador, códigos, fingerprint e working tree.
- [x] A revisão reutilizou o log válido sem repetir a suíte.
- [x] A porta 3100 ficou livre, os PIDs próprios foram encerrados e nenhum processo alheio foi reutilizado ou finalizado.

## Pendências

- Nenhuma condição de merge e nenhuma Q-xxx nova.
- O parecer reprovado anterior, `TASK-090-20260721.md`, permanece arquivado como snapshot da primeira entrega; esta reavaliação registra a correção e o fechamento do ciclo.

## Decisão

**Aprovado.** A correção elimina os dois impeditivos da revisão anterior: evidência de outro working tree agora é rejeitada e os caminhos negativos dos orquestradores reais estão cobertos. Escopo, protocolo, lifecycle de processos e evidência canônica atendem integralmente aos critérios da TASK-090, com todas as verificações verdes.
