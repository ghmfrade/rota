---
name: registrar-decisao
description: Registra uma decisão humana já tomada sobre uma Q-xxx do ROTA — cria a DEC-xxx em docs-dev/10-DECISION_LOG.md e atualiza o status em docs-dev/16-OPEN_QUESTIONS.md. Só use quando o responsável pelo domínio invocar explicitamente, informando qual Q-xxx e qual opção foi decidida. Nunca use para decidir por conta própria.
---

# Registrar Decisão (Q-xxx → DEC-xxx)

## Pré-condição inegociável

Esta skill **só executa decisão explícita do responsável pelo domínio**, dada literalmente pelo usuário nesta conversa (qual `Q-xxx` e qual opção/conteúdo decidido). Se qualquer parte da decisão não foi informada pelo usuário — a Q-xxx, a opção escolhida, ou detalhes que exijam interpretação — **pare e pergunte**. Deduzir, completar ou "recomendar e já registrar" viola o princípio 2 de `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md` (não inventar regra de negócio) e o `docs-dev/00` §8 (não decidir sozinho).

## Procedimento

1. Leia a `Q-xxx` em `docs-dev/16-OPEN_QUESTIONS.md` (contexto, spec relacionada, impacto, opções) e confirme que a decisão informada pelo usuário corresponde a ela. Divergência entre o que o usuário disse e o que a Q-xxx descreve → pergunte antes.
2. Verifique em `docs-dev/10-DECISION_LOG.md` o próximo `DEC-xxx` sequencial livre (numeração nunca reutilizada).
3. Crie a entrada no `docs-dev/10-DECISION_LOG.md`, no formato das entradas existentes:
   - **Status:** Aceita · **Origem:** "decisão do responsável pelo domínio, opção N da Q-xxx" (+ specs relacionadas) · **Data:** a data de hoje;
   - **Decisão:** o que foi decidido (fiel ao que o usuário informou);
   - **Motivo:** o racional dado pelo usuário (ou o da opção escolhida na Q-xxx);
   - **Consequências:** inclusive "resolve a Q-xxx" e tasks desbloqueadas/afetadas (ver `docs-dev/06-BACKLOG_INICIAL.md`);
   - **Impacto em implementação:** RN afetadas, módulos, tasks.
4. Atualize a `Q-xxx` em `docs-dev/16-OPEN_QUESTIONS.md`: status de `Pendente` para decidida, com referência à `DEC-xxx` (siga o padrão das Q já resolvidas no arquivo).
5. Se a decisão afetar RN existentes, **aponte** quais entradas de `docs-dev/01-RULE_INDEX.md` / `docs-dev/03-TRACEABILITY_MATRIX.md` precisam de atualização — mas só as edite se o usuário pedir (é o prompt "atualizar derivados" de `docs-dev/12`).

## Limites

- **Nunca** alterar `docs/specs/**` — se a decisão implicar mudança de spec, registre a DEC e aponte a mudança necessária para o responsável aplicar.
- Uma invocação = uma Q-xxx. Várias decisões = várias invocações.
- Entrega final: diff resumido do que foi registrado em `10` e `16`, e a lista de tasks/RN impactadas.
