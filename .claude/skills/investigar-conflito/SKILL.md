---
name: investigar-conflito
description: Análise estruturada de possível conflito entre specs do ROTA — determina se o conflito é real ou aparente, avalia impactos e entrega o texto pronto da Q-xxx para docs-dev/16. Nunca altera specs. Use quando dois trechos de spec/regra parecerem se contradizer.
---

# Investigar Conflito entre Specs

O usuário indicará as regras ou trechos de spec possivelmente conflitantes.

## Leitura obrigatória

1. Os trechos citados, **no contexto completo das suas seções**, em `docs/specs/`.
2. `docs-dev/01-RULE_INDEX.md` — as RN derivadas dos trechos.
3. `docs-dev/10-DECISION_LOG.md` — o conflito pode já ter sido superado por decisão registrada (as specs marcam superações nas seções "Decisões Fechadas").

## Análise (entregar nesta estrutura)

1. O que cada trecho determina, **literalmente**;
2. Se há conflito **real ou aparente** (redação × norma);
3. Impacto no domínio;
4. Impacto no JSON (contrato — Spec 02);
5. Impacto no Formulário;
6. Impacto no Comparador;
7. Decisão recomendada — com base na precedência já praticada pelas specs: **a spec mais específica e mais recente vence** (`docs-dev/00` §9; cite a evidência, ex.: Spec 02 §11 v0.6 superou o enum `regra_feriado` da Spec 03 v0.1);
8. Perguntas para decisão humana, no formato Q-xxx de `docs-dev/16-OPEN_QUESTIONS.md` (contexto, spec relacionada, impacto, opções, recomendação — decisão fica `Pendente`).

## Regras duras

- **Não altere nenhuma spec** (`docs/specs/**` é read-only — proibição de `docs-dev/04`).
- **Não decida sozinho**: a recomendação é recomendação; a decisão é humana e, quando tomada, entra via `/registrar-decisao`.
- Se o conflito for real, entregue o **texto pronto da Q-xxx** (numerada a partir da próxima livre em `docs-dev/16-OPEN_QUESTIONS.md`) para o usuário aprovar o registro.
