# Reavaliação da TASK-118

**Revisor:** Codex
**Data:** 2026-07-30
**Commit/branch revisado:** branch `redesign`; implementação `7ac010f`, parecer inicial `a859852` e regularização documental `2a72bd1`

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A reavaliação verificou a única condição do parecer inicial: a definição da
TASK-118, Q-072 e DEC-094 agora estão versionadas no commit `2a72bd1`, e o
estado da task foi corrigido para “desbloqueada (DEC-094)”. O código já aprovado
continua tornando a geração por headway idempotente no mesmo dia e grade, sem
alterar reforços válidos fora desse gesto.

## Regras RN verificadas

- RN-004 — atendida: Viagens preexistentes preservam UUID e dados.
- RN-007 — atendida: somente horários ausentes recebem Viagens com UUID nova.
- RN-061 — atendida: dia e grade integram o critério da guarda.
- RN-062 — atendida: a guarda é local ao headway; reforços continuam válidos no
  contrato/importação.
- RN-063 — atendida: novas Viagens herdam `horarios_paradas`; existentes não
  são alteradas.
- RN-067 — atendida: a UI continua recebendo horários de relógio.
- RN-095/RN-096 — atendidas: aviso efêmero, sem workflow ou persistência.

## Specs verificadas

- Spec 02 §11/§12/§14 — aderente: estratificação, identidade e validade dos
  reforços preservadas.
- Spec 04 §8.2–§8.3 — aderente: guarda do gesto e aviso seguem a DEC-094.

## Pontos corretos

- `docs-dev/06-BACKLOG_INICIAL.md` contém a TASK-118 como desbloqueada, registra
  Q-072/DEC-094 como dependência cumprida e não mantém pergunta aberta.
- `docs-dev/10-DECISION_LOG.md` contém a DEC-094 completa, vinculada à Q-072 e
  à TASK-118.
- `docs-dev/16-OPEN_QUESTIONS.md` registra Q-072 como decidida pela DEC-094.
- O commit `2a72bd1` contém somente os três artefatos normativos da TASK-118;
  TASK-117/TASK-119 e suas decisões permaneceram fora dele.
- A consequência sobre a TASK-119 permanece explícita e independente: ela
  cobre detecção/destaque/alerta, sem alterar a guarda local da TASK-118.

## Problemas encontrados

- Nenhum. A única condição do parecer inicial foi resolvida.

## Violações de escopo

- Nenhuma.

## Testes avaliados

- cobertura das RN da task: sim
- casos inválidos testados: sim
- regressão de UUID (se aplicável): sim
- OSRM mockado: sim; o E2E comprova ausência de chamada
- suíte executada com resultado: verde — `npm run test:all:verificar`
  reutilizou o log válido do executor `Codex`, fingerprint
  `de9a38e30fd3fcb8a74128acd56c1e9e23a33ba99c4c6a29c212ed00644e36b9`,
  identidade do working tree
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`;
  1.326 unitários e 93 E2E, códigos 0

## Checklist 07

Resultado mantido do parecer inicial: **25 itens conformes, 28 N/A, 0
violados**. A condição documental, externa aos 53 itens técnicos, está
resolvida no `HEAD`.

### Escopo

- [x] Mudança pertence ao ROTA, sem workflow/status/persistência indevida.
- [x] Escopo restrito à TASK-118 e respaldado pela DEC-094.

### JSON (contrato)

- [x] Nenhum campo ou validação estrutural de unicidade foi adicionado.
- [x] UUIDs existentes são preservadas e entidades novas recebem UUID nova.
- [N/A] Demais invariantes do contrato não foram tocados.

### Domínio

- [x] Viagem permanece estratificada por dia e grade (RN-061).
- [N/A] Demais entidades/regras de domínio não foram tocadas.

### Comparador

- [N/A] Comparador não foi tocado.

### Roteamento

- [N/A] Roteamento não foi tocado; o E2E comprova zero chamadas ao OSRM.

### UI/PDF

- [x] Horários de relógio, componentes e seletores existentes foram preservados.
- [N/A] PDF, matrizes, Locais e gate de exportação não foram tocados.

### Testes

- [x] RN, casos inválidos, UUID, separação por dia/grade e idempotência cobertos.
- [x] Evidência canônica válida reutilizada sem repetir a suíte.
- [x] Execução canônica registrou códigos 0 e limpeza do servidor próprio.

## Pendências

- Nenhuma para a TASK-118.

## Decisão

**Aprovado.** A implementação continua tecnicamente aderente e a única ressalva
do parecer inicial foi encerrada pelo commit `2a72bd1`. A TASK-118 pode ser
marcada como concluída e removida da fila pendente.
