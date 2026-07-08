---
name: implementar-task
description: Implementa uma TASK do ROTA seguindo o plano já aprovado na "Análise da Task" — só o escopo da task, com testes (casos válidos e inválidos, OSRM mockado) e entrega no formato "Implementação concluída". Use somente após aprovação humana do plano de /analisar-task.
---

# Implementar Task

Implemente a task indicada seguindo o **plano aprovado** na "Análise da Task". Se não houver análise aprovada nesta conversa ou referenciada pelo usuário, pare e rode `/analisar-task` primeiro.

## Requisitos vinculantes (`docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`)

- **Não sair do escopo** — o "Fora de escopo" da task é vinculante; nada de "aproveitar para melhorar".
- **Não inventar regra de negócio** — lacuna vira proposta de Q-xxx em `docs-dev/16-OPEN_QUESTIONS.md`, não decisão sua. Ambiguidade nova **interrompe** a task.
- **Não introduzir** workflow, persistência de servidor, login, banco, nem campos novos no JSON (mudança de campo exige alterar a Spec 02 antes — RN-008..015; NEG-001..019).
- **Preservar o contrato JSON** (Spec 02) e as **UUIDs** em qualquer import/cópia (RN-004, RN-007) — com teste de round-trip quando tocar import/export.
- **Testes** para toda RN implementada (categorias de `docs-dev/08-TEST_STRATEGY.md`), com casos válidos **e inválidos**; **mock do OSRM sempre** — nenhum teste depende do serviço público.
- **Nomenclatura oficial das specs** em código, comentários e docs — não traduzir conceitos.
- Rodar as verificações disponíveis (typecheck, lint, testes — ver seção "Comandos" do `CLAUDE.md`) e **reportar resultados reais** (falha é reportada como falha).

## Entrega

Exatamente o formato **"Implementação concluída"** de `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`:

1. Arquivos alterados (todos, criados e modificados, sem omissões);
2. Regras atendidas (RN-xxx — como cada uma foi atendida, 1 linha);
3. Testes criados/alterados (destacar casos inválidos);
4. Validações executadas (com resultado real);
5. Pontos de atenção (dívidas, inferências controladas, follow-ups);
6. Aderência à spec (resultado do checklist `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md`; violações são impeditivas).

Depois da entrega, o próximo passo do ciclo é `/revisar-aderencia`.
