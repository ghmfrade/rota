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
- Rodar as verificações disponíveis e **reportar resultados reais**; toda falha deve ser corrigida e o comando repetido.

## Ordem das verificações

1. Durante a implementação, rodar **somente os testes direcionados** aos arquivos/regras alterados.
2. Rodar `lint` e `typecheck`; corrigir todas as falhas antes de avançar.
3. Rodar `build` quando aplicável e corrigir todas as falhas antes da evidência final.
4. Rodar a **suíte completa uma única vez, no fim**, exclusivamente com `npm run test:all:log -- --executor=Codex`. O comando executa Vitest + Playwright sequencialmente, controla o servidor Next e preserva `ultimo-test-all.log` para a revisão.
5. Se a suíte falhar, corrigir e repetir o mesmo comando até ficar verde. Não rodar E2E separado depois do log canônico e nunca executar processos pesados em paralelo.

Antes de reportar sucesso, rode `npm run test:all:verificar`. O verificador precisa aceitar o marcador final, os dois códigos 0, o fingerprint atual e a identidade do mesmo working tree. Log ausente, truncado, vermelho, desatualizado ou copiado de outro working tree é falha, nunca evidência reutilizável.

## Entrega

Exatamente o formato **"Implementação concluída"** de `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`:

1. Arquivos alterados (todos, criados e modificados, sem omissões);
2. Regras atendidas (RN-xxx — como cada uma foi atendida, 1 linha);
3. Testes criados/alterados (destacar casos inválidos);
4. Validações executadas (com resultado real);
5. Pontos de atenção (dívidas, inferências controladas, follow-ups);
6. Aderência à spec (resultado do checklist `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md`; violações são impeditivas).

## Commit

Após a entrega, comite **só o código e os testes desta task** com a mensagem `Implementa TASK-XXX: <título>` (convenção de dois commits por task — `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`). A revisão é um commit à parte, feito por `/revisar-aderencia`.

## Encerramento obrigatório da conversa

Depois da entrega e do commit da implementação, **encerre esta conversa**. Não invoque
`/revisar-aderencia`, não produza o parecer formal e não atualize o status de execução na
mesma conversa, mesmo em modo autônomo ou se ainda houver contexto disponível.

Oriente o usuário a abrir **uma nova conversa** e solicitar `/revisar-aderencia` para a
mesma TASK. A seção "Aderência à spec" desta entrega é somente a autoavaliação do
implementador; ela não substitui a revisão independente da conversa seguinte.
