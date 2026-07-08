---
name: revisar-aderencia
description: Revisa a implementação de uma TASK do ROTA contra as specs e regras RN — percorre o checklist docs-dev/07 item a item e preenche o template de revisão docs-dev/14, com parecer aprovado / com ressalvas / reprovado. Use após toda implementação, antes do merge.
---

# Revisar Aderência à Spec

Revise a implementação da task indicada (diff da branch/commit atual, salvo indicação contrária do usuário).

## Leitura obrigatória

1. A task (objetivo, "Fora de escopo", critérios de aceite).
2. As specs referenciadas pela task, em `docs/specs/`.
3. As RN citadas em `docs-dev/01-RULE_INDEX.md`.
4. `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md` — o checklist a percorrer.
5. `docs-dev/14-REVIEW_REPORT_TEMPLATE.md` — o formato do parecer e os critérios de resultado.

## O que verificar

- Aderência às specs e às RN (cite `RN-xxx` em cada achado);
- Violações de escopo: código além do "Objetivo" ou dentro do "Fora de escopo";
- Workflow indevido ou campo de fluxo no JSON (NEG-001..007 de `docs-dev/11-NEGATIVE_REQUIREMENTS.md`);
- Preservação do contrato JSON e da regra de UUID (RN-004..007);
- Testes: existem, cobrem casos inválidos, não dependem do OSRM real (mock);
- Lacunas: regra da task sem teste; critério de aceite não verificado (matriz `docs-dev/03-TRACEABILITY_MATRIX.md`).

## Entrega

1. Percorra `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md` **item a item** (marque `N/A` quando não se aplicar; qualquer item aplicável não atendido → ressalva ou reprovação).
2. Preencha o `docs-dev/14-REVIEW_REPORT_TEMPLATE.md` completo.
3. Parecer objetivo pelos critérios do template: **aprovado** (escopo exato, RN com testes, checklist limpo), **aprovado com ressalvas** (desvios menores, sem violar RN Alta nem NEG-xxx; ressalvas viram condições explícitas) ou **reprovado** (violação de RN Alta, NEG-xxx, escopo relevante, testes ausentes ou verificações falhando) — com a lista de problemas ordenada por severidade.

Só depois de revisão aprovada avança-se para a próxima task (`docs-dev/00` §3).
