---
name: analisar-task
description: Analisa uma TASK do ROTA antes de qualquer implementação — leitura obrigatória das specs/regras e entrega no formato "Análise da Task" do protocolo. Use sempre antes de codar uma task. Declara bloqueio se a task depender de Q-xxx sem decisão.
---

# Analisar Task

Você vai analisar a task indicada pelo usuário (ex.: `TASK-001`, definida em `docs-dev/06-BACKLOG_INICIAL.md` ou em arquivo próprio). **Não implemente nada nesta skill.**

## Leitura obrigatória, nesta ordem

1. A task (no backlog `docs-dev/06-BACKLOG_INICIAL.md` ou arquivo indicado).
2. `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md` — protocolo vinculante; o formato de saída vem de lá.
3. As specs referenciadas pela task (seções citadas + vizinhas relevantes), em `docs/specs/`.
4. `docs-dev/01-RULE_INDEX.md` — as RN da task e as vizinhas do mesmo grupo.
5. `docs-dev/02-DOMAIN_MODEL.md` — entidades afetadas (atenção a "coisas que parecem iguais, mas não são").
6. `docs-dev/11-NEGATIVE_REQUIREMENTS.md` — o que não fazer.
7. `docs-dev/13-ARCHITECTURE_GUARDRAILS.md` — se a task tocar arquitetura/dependências.

## Entrega

Exatamente o formato **"Análise da Task"** de `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`:

1. Resumo (com suas palavras, 3–6 linhas);
2. Regras RN envolvidas (as listadas na task + as identificadas adicionalmente, com justificativa);
3. Specs consultadas (Spec XX §YY — o que foi extraído de cada);
4. Ambiguidades (novas ganham proposta de Q-xxx no formato de `docs-dev/16-OPEN_QUESTIONS.md` — não decida sozinho);
5. Plano de implementação;
6. Arquivos previstos (criar/alterar, com caminho);
7. Testes previstos (por categoria de `docs-dev/08-TEST_STRATEGY.md`, com casos inválidos; OSRM sempre mockado);
8. Riscos.

## Regras duras

- Se a task depender de uma Q-xxx sem decisão registrada em `docs-dev/10-DECISION_LOG.md`, **declare a task bloqueada e pare**.
- Qualquer decisão não literal na spec deve ser marcada como *inferência controlada*.
- Modo supervisionado (padrão): **pare após a análise** e aguarde aprovação humana do plano antes de rodar `/implementar-task`.
