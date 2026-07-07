# 05 — TASK_TEMPLATE: Template Oficial de Task

Copie o bloco abaixo para criar uma task. Campos obrigatórios: todos. Uma task sem "Specs fonte" ou sem "Regras envolvidas" não é uma task válida — é sintoma de escopo inventado.

Numeração: `TASK-XXX` sequencial, nunca reutilizada (o backlog `06-BACKLOG_INICIAL.md` já reserva 001–040).

---

```md
# TASK-XXX — Título da task

## Objetivo

(1 a 3 frases: o que existe ao final que não existia antes)

## Contexto

(por que agora; o que já existe; dependências relevantes)

## Fora de escopo

(explícito — o que NÃO fazer, mesmo que pareça natural "aproveitar")

## Specs fonte

- Spec XX §YY
- Spec XX §ZZ

## Regras envolvidas

- RN-... (de docs-dev/01-RULE_INDEX.md)

## Entidades afetadas

- (de docs-dev/02-DOMAIN_MODEL.md — ex.: Seção, Parada, Viagem)

## Ferramentas afetadas

- [ ] Formulário
- [ ] Comparador
- [ ] Ingestor (⚠ exige decisão humana — RN-093)
- [ ] PDF
- [ ] JSON (contrato)

## Critérios de aceite

- [ ] (objetivo, verificável, um comportamento por item)
- [ ] ...
- [ ] ...

## Casos válidos

(entradas/estados que devem ser aceitos, com valores concretos)

## Casos inválidos

(entradas/estados que devem ser recusados, com a reação esperada —
mensagem, bloqueio, alerta)

## Testes esperados

- Unitários:
- Integração:
- E2E:
- Snapshot/contrato JSON:
- PDF:

## Arquivos prováveis

- (criar/alterar)

## Riscos

(regressão, dependência de Q-xxx pendente, interação com outras tasks)

## Perguntas em aberto

(nenhuma | referências a Q-xxx de docs-dev/16-OPEN_QUESTIONS.md)
```

---

## Regras de qualidade de uma task

1. **Pequena:** implementável e revisável numa sessão; se o plano passar de ~10 passos, quebrar.
2. **Rastreável:** cita `Spec XX §YY` e `RN-xxx` reais — nunca "conforme as specs".
3. **Testável:** critérios de aceite viram testes quase 1:1; casos inválidos são obrigatórios quando a task envolve validação.
4. **Fechada:** "Fora de escopo" preenchido — é o principal freio contra a IA ampliar escopo.
5. **Honesta com pendências:** se depende de `Q-xxx` sem decisão, a task nasce **bloqueada**.
