# Revisão da TASK-124 (reavaliação pós-correção)

**Revisor:** Claude (revisão automatizada `/revisar-aderencia`, conversa separada da implementação e da revisão anterior)
**Data:** 2026-07-31
**Commit/branch revisado:** `1de5576` na branch `redesign` ("Corrige TASK-124: piso de legibilidade da largura da célula-âncora (DEC-102)"), sobre `36c2d5f` ("Implementa TASK-124"), working tree atual

## Resultado

- [x] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

Commit de correção sobre a reprovação registrada em
`14-REVISOES/TASK-124-20260731.md`. Troca `grid-cols-[minmax(0,1fr)_auto]` por
`grid-cols-[minmax(min-content,1fr)_auto]` nas três superfícies
(`src/formulario/viagens/etapa-viagens.tsx:1013,1121,1296`), eleva o campo de
`min-w-16` para `min-w-20` nas três, adiciona `min-w-0` ao `<span>` de erro do
headway para não inflar o piso, documenta a exigência de
`minmax(min-content,…)` na linha da `SuperficieFlutuante` do
`docs-dev/18-DESIGN_SYSTEM.md`, reescreve a asserção de piso do E2E para não
depender do próprio elemento sob teste e acrescenta um teste E2E novo (viewport
420px) exercitando o ramo de coluna mais estreita que o piso.

## Regras RN verificadas

- **RN-061** — atendida. O diff da correção só toca classes de largura,
  comentários e a fórmula de cálculo de piso do teste; nenhuma âncora,
  `data-viagem-uuid` ou associação superfície↔Viagem foi tocada.
- **RN-096** — atendida. Nenhuma mudança de estado persistido; largura
  continua vindo de `useState`/medição em runtime.
- **RN-004/RN-007** — N/A, como na revisão anterior.

## Specs verificadas

- **Spec 04 §8.1/§8.2/§8.3** — aderente, sem mudança em relação à revisão
  anterior (nenhum arquivo de estrutura da tabela ou de conjunto de ações no
  diff da correção).
- **`docs-dev/18-DESIGN_SYSTEM.md` §3/§5/§6** — aderente. A linha da
  `SuperficieFlutuante` agora documenta a condição real de funcionamento do
  piso (`minmax(min-content,…)`, não `minmax(0,…)`), corrigindo a divergência
  entre documentação e comportamento apontada na revisão anterior.

## Verificação dos dois problemas que motivaram a reprovação anterior

### Problema 1 (Alta) — piso de legibilidade não protegia o campo

**Resolvido.** Com `minmax(0,1fr)`, a função de mínimo da faixa é `0` e o
`min-content` do contêiner ignorava o campo — o `min-w-min` da
`SuperficieFlutuante` protegia só o botão. A troca para
`minmax(min-content,1fr)` faz a faixa do campo contribuir com o próprio
`min-content` (agora `min-w-20` = 80px) para o `min-content` do contêiner, de
modo que `min-w-min` passa a proteger campo **e** botão. Conferido nas três
superfícies (`superficie-headway` linha 1013, inserção posterior linha 1121,
inserção anterior linha 1296) e na própria `SuperficieFlutuante`
(`src/shared/ui/superficie-flutuante.tsx:263`, comentário atualizado
explicando a pré-condição). O `<span>` de erro do headway ganhou `min-w-0`
para não entrar no cálculo de `min-content` do grid com uma mensagem que pode
ser mais larga que o piso — correto, já que ele ocupa `col-span-2` numa linha
própria e não deveria dirigir a largura das colunas do grid.

### Problema 2 (Média) — E2E do piso era tautológico

**Resolvido.** `pisoDaSuperficie` (`testes/e2e/etapa-viagens.spec.ts:966-991`)
não mede mais `min-content` do próprio elemento sob teste; agora soma
`min-width` computado do `<input>` e do `<button>` internos, mais `gap`,
padding e borda do contêiner — valores fixados por CSS, independentes da
lógica de layout que está sob teste. O novo teste
`"TASK-124: [inválido] coluna mais estreita que o piso..."`
(`testes/e2e/etapa-viagens.spec.ts:1132-1249`) usa viewport de 420px para
forçar a coluna de segunda-feira abaixo do piso, com pré-condição explícita
(`caixaCelula!.width < pisoAnterior`) que teria falhado sob a implementação
anterior — a esse respeito o teste deixou de ser vácuo e passa a ser capaz de
detectar regressão. Cobre também o critério do placeholder `HH:MM` do headway
(medido via `canvas.measureText`, não `scrollWidth` de um campo vazio),
fechando o problema 3 (Baixa) da revisão anterior como bônus, embora esse não
fosse condição de merge.

Reexecutei o cálculo geométrico manualmente a partir das classes atuais para
conferir a tabela da revisão anterior:

| faixa | piso (`min-content` real) | observação |
|---|---|---|
| `minmax(0,1fr) auto` (reprovado) | 54px | campo fora do cálculo |
| `minmax(min-content,1fr) auto`, campo `min-w-16` (correção intermediária citada no problema 1) | 118px | suficiente, sem sobreposição |
| `minmax(min-content,1fr) auto`, campo `min-w-20` (**entregue**) | ~134px | mais folga que o mínimo suficiente |

Não refiz a medição em Chromium isolado (a revisão anterior já havia feito
isso); a tabela acima é aritmética sobre os mesmos componentes (`min-width` do
campo/botão + `gap` + padding + borda), coerente com o teste E2E novo passando
(ver evidência da suíte abaixo).

## Pontos corretos

- Correção mínima e cirúrgica: só classes de largura, um `min-w-0` num span de
  erro, comentários e testes — nenhum arquivo fora dos três já tocados pela
  implementação original.
- A pré-condição do novo teste E2E (`toBeLessThan(pisoAnterior)`) é exatamente
  o que impede a regressão de "teste vácuo" apontada como problema 2: sem essa
  linha, o teste poderia passar mesmo que a coluna não estivesse realmente
  abaixo do piso.
- `docs-dev/18-DESIGN_SYSTEM.md` deixou de descrever uma garantia que o código
  não entregava — a linha da `SuperficieFlutuante` agora nomeia a condição
  (`minmax(min-content,…)`) que o chamador precisa cumprir.
- Nenhum `data-testid`/`aria-*` renomeado ou removido no diff da correção.

## Problemas encontrados

### 1. (Baixa, documental, herdada da revisão anterior) TASK-124/125, DEC-102/103 e Q-080/081 continuam só no working tree

`git status` mostra `docs-dev/06-BACKLOG_INICIAL.md`, `docs-dev/10-DECISION_LOG.md`
e `docs-dev/16-OPEN_QUESTIONS.md` ainda **modificados e não comitados** — a
mesma pendência apontada como problema 4 na revisão de `36c2d5f`
(`14-REVISOES/TASK-124-20260731.md`), não resolvida pelo commit de correção
`1de5576`. O commit `1de5576` cita "DEC-102" tanto na mensagem quanto nos
comentários do código, mas o histórico do repositório ainda não contém a
decisão. É a mesma lição de processo já registrada nas TASK-100/TASK-120/
TASK-122 e, agora, pela segunda vez consecutiva na própria TASK-124.

**Não é motivo de reprovação** (não viola RN de criticidade Alta nem NEG-xxx),
mas vira **condição explícita de merge** nesta reavaliação, dado que já é a
segunda vez que o mesmo tipo de lacuna atravessa um ciclo de revisão sem ser
fechada.

## Violações de escopo

Nenhuma. O diff da correção altera apenas os três arquivos de código/teste já
tocados pela implementação original e o `docs-dev/18`; nenhum item do "Fora de
escopo" da task foi tocado (confirmado por reinspeção do diff completo de
`1de5576`, listado acima).

## Testes avaliados

- **cobertura das RN da task:** completa agora. O piso da DEC-102, que estava
  sem teste capaz de falhar, ganhou teste E2E com pré-condição explícita.
- **casos inválidos testados:** sim, incluindo o caso que faltava (coluna mais
  estreita que o piso) e o placeholder do headway.
- **regressão de UUID:** N/A.
- **OSRM mockado:** sim — o novo teste também usa `page.route(...).abort()` e
  `expect(chamouOsrm).toBe(false)`.
- **suíte executada com resultado:** verde, reutilizada sem reexecução.
  `npm run test:all:verificar` → "Log canônico válido. Executor: **Claude**.
  Fingerprint: `6d25fa9202a3dd2ea46872987893df46e7b15ed9fc178adc0440db151b30f4c3`.
  Working tree: `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`."
  O log (`ultimo-test-all.log`) traz `Resultado geral: APROVADO`, 107 E2E
  passados (1 flaky não relacionado, em `etapa-itinerarios.spec.ts`, fora do
  escopo da TASK-124) e código 0 nos dois executores. A suíte **não** foi
  repetida nesta revisão.

## Checklist 07

**Resultado: 33 itens ok, 40 N/A, 1 violado (documental, não bloqueante).**

- **Escopo** (6): todos ok.
- **JSON (contrato)** (10): todos N/A, sem mudança em relação à revisão
  anterior.
- **Domínio** (9): todos N/A.
- **Comparador** (7): todos N/A.
- **Roteamento** (5): N/A quanto à lógica; OSRM mockado confirmado.
- **UI/PDF** (8): 7 ok — a ressalva da revisão anterior ("UI aderente ao
  design system... sem `style=` inline fora das exceções", quanto ao piso de
  legibilidade documentado não corresponder ao entregue) está **resolvida**:
  a documentação e o código agora coincidem. `data-testid`/`aria-*`
  preservados.
- **Testes** (11): 10 ok — o item antes violado ("toda regra RN
  alterada/implementada possui teste") passa a ok, já que o piso ganhou teste
  capaz de falhar. 1 N/A (regressão de UUID). O item documental (versionamento
  de DEC/task) não é item do checklist 07 propriamente — é tratado como
  pendência de processo, não de checklist.

## Pendências

**Condição de merge:**

1. Comitar `docs-dev/06-BACKLOG_INICIAL.md`, `docs-dev/10-DECISION_LOG.md` e
   `docs-dev/16-OPEN_QUESTIONS.md` com a TASK-123/124/125, a DEC-102/DEC-103 e
   a Q-080/Q-081, via `/registrar-decisao` (as decisões já foram tomadas pelo
   responsável — falta só o commit). Sem isso, o repositório continua sem
   registro histórico de uma decisão já citada em dois commits de código.

**Follow-up (não impeditivo):**

- Nenhum item novo. O follow-up "folga do `min-w-16`/placeholder" da revisão
  anterior foi entregue por este mesmo commit (campo elevado a `min-w-20`,
  placeholder medido no E2E).

**Herdadas, sem task dona (registro, não pendência desta task):** o
alinhamento do fechamento da superfície ao "hover **ou** foco" da DEC-100,
aberto desde a TASK-121/TASK-122, segue sem dono — não verificado nesta
revisão.

## Decisão

**Aprovado com ressalvas.** Os dois problemas que motivaram a reprovação
anterior (`14-REVISOES/TASK-124-20260731.md`) estão corrigidos: o piso de
legibilidade da DEC-102 agora protege o campo `HH:MM`, não só o botão
(`minmax(min-content,1fr)` em vez de `minmax(0,1fr)`), e o teste que deveria
comprová-lo deixou de ser tautológico, com um caso novo que exercita
efetivamente o ramo de coluna estreita. Os oito critérios de aceite da task
estão atendidos. A única pendência remanescente é documental — a
fundamentação (TASK-123/124/125, DEC-102/103, Q-080/081) ainda não foi
comitada — e não chega a violar RN de criticidade Alta nem NEG-xxx, mas vira
condição explícita de merge por já ser a segunda vez que esse mesmo tipo de
lacuna atravessa o ciclo de revisão desta task.
