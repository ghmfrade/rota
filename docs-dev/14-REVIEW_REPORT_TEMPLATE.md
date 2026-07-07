# 14 — REVIEW_REPORT_TEMPLATE: Template de Revisão de Entrega

Preencher para **toda** task concluída (revisor humano, apoiado ou não pelo prompt de revisão de `12-PROMPTS_OPERACIONAIS.md`). Arquivar junto da task.

---

```md
# Revisão da TASK-XXX

**Revisor:** ...
**Data:** AAAA-MM-DD
**Commit/branch revisado:** ...

## Resultado

- [ ] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

(2 a 5 linhas: o que foi entregue, em que arquivos)

## Regras RN verificadas

- RN-... — (atendida / violada / não verificável — como foi checada)

## Specs verificadas

- Spec XX §YY — (aderente / divergente — evidência)

## Pontos corretos

- ...

## Problemas encontrados

(ordenados por severidade; cada um com RN/NEG/spec violada e local no código)

- ...

## Violações de escopo

(código além do objetivo da task ou dentro do "Fora de escopo"; "nenhuma" se ok)

- ...

## Testes avaliados

- cobertura das RN da task: (sim/não — quais faltam)
- casos inválidos testados: (sim/não)
- regressão de UUID (se aplicável): (sim/não/N-A)
- OSRM mockado: (sim/N-A)
- suíte executada com resultado: (verde/vermelho — colar resumo real)

## Checklist 07

(resultado: X itens ok, Y N/A, Z violados — anexar os violados)

## Pendências

(o que precisa acontecer antes/depois do merge; Q-xxx abertas)

- ...

## Decisão

(justificativa do resultado; se "com ressalvas", o que é condição de merge
e o que vira follow-up; se "reprovado", o caminho de correção)
```

---

## Critérios de resultado

- **Aprovado:** escopo exato, RN atendidas com testes, checklist limpo.
- **Aprovado com ressalvas:** desvios menores que não violam RN de criticidade Alta nem NEG-xxx; ressalvas viram condições explícitas.
- **Reprovado:** qualquer violação de RN Alta, de NEG-xxx, de escopo relevante, ausência de testes das regras implementadas, ou verificações falhando.
