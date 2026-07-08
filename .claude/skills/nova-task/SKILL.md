---
name: nova-task
description: Quebra uma funcionalidade do ROTA em tasks pequenas, testáveis e rastreáveis usando o template docs-dev/05, numerando a partir do próximo TASK-XXX livre no backlog. Use quando uma funcionalidade nova precisar virar tasks; tasks que dependem de Q-xxx sem decisão nascem bloqueadas.
---

# Nova Task (quebrar funcionalidade)

Com base nas specs (`docs/specs/`) e no `docs-dev/01-RULE_INDEX.md`, quebre a funcionalidade indicada pelo usuário em tasks pequenas, testáveis e rastreáveis.

## Procedimento

1. Leia as seções de spec que cobrem a funcionalidade e as RN correspondentes em `docs-dev/01-RULE_INDEX.md`.
2. Verifique em `docs-dev/06-BACKLOG_INICIAL.md` o próximo `TASK-XXX` livre — numeração sequencial, **nunca reutilizada** (001–040 já reservadas).
3. Use o template oficial `docs-dev/05-TASK_TEMPLATE.md` — **todos** os campos são obrigatórios.

## Regras da quebra (`docs-dev/05` e `docs-dev/12`)

- Cada task implementável e revisável **numa sessão** (plano com mais de ~10 passos → quebrar de novo);
- Nada de tasks guarda-chuva ("fazer o formulário") — bom exemplo: "validar XOR de `secao_uuid`/`local_uuid` em Parada";
- Rastreável: cita `Spec XX §YY` e `RN-xxx` reais — nunca "conforme as specs". **Task que não consegue citar spec/regra de origem é sintoma de invenção de escopo**: pare e registre proposta de Q-xxx em `docs-dev/16-OPEN_QUESTIONS.md`;
- "Fora de escopo" preenchido — é o principal freio contra ampliação de escopo;
- Dependências explícitas entre as tasks;
- Task que exige decisão pendente (Q-xxx) nasce **bloqueada**, com a Q-xxx referenciada.

## Entrega

Para cada task: título; objetivo; contexto; fora de escopo; specs fonte (`Spec XX §YY`); regras RN; entidades afetadas; ferramentas afetadas; critérios de aceite; casos válidos e inválidos; testes esperados; arquivos prováveis; dependências; riscos; perguntas em aberto — no formato do bloco de `docs-dev/05-TASK_TEMPLATE.md`.
