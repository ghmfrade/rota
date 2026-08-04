---
name: registrar-questao
description: Registra uma PERGUNTA em aberto (Q-xxx) em docs-dev/16-OPEN_QUESTIONS.md com status Pendente, quando uma lacuna de spec impede decidir. Nunca responde a pergunta nem toca o docs-dev/10 — a resposta é sempre humana, via /registrar-decisao. Use quando surgir ambiguidade real durante análise, implementação, correção ou revisão.
---

# Registrar Questão (Q-xxx Pendente)

Esta skill registra **a pergunta**. A **resposta** é do responsável pelo domínio, via
`/registrar-decisao`. A separação é o não-negociável nº 2 do `CLAUDE.md` ("não inventar regra
de negócio") e está no `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md` item 2: *"Lacuna → registrar
em `16-OPEN_QUESTIONS.md`, nunca decidir sozinho."*

## Quando usar

Uma lacuna **real**: a spec não diz, e sem saber você não consegue implementar sem inventar.

Não use para: preferência de estilo; algo que a spec já responde noutro parágrafo (procure
antes); dúvida sobre como codar (isso é decisão técnica sua, não regra de negócio); ou coisa
que o `docs-dev/10-DECISION_LOG.md` já decidiu (**confira sempre** antes de abrir).

## Procedimento

1. **Confirme que é lacuna.** Releia a spec citada pela task e busque `docs-dev/10` por
   decisão já existente sobre o tema. Q duplicada polui o registro tanto quanto Q ausente.
2. **Ache o próximo número livre** — o maior `## Q-0NN` do `docs-dev/16-OPEN_QUESTIONS.md` mais
   um. Numeração **nunca** é reutilizada, nem quando uma Q é abandonada.
3. **Acrescente a entrada**, no formato das Q existentes:

   ```
   ## Q-0NN — <título curto e específico>

   **Contexto:** <o que a spec diz, o que ela não diz, e onde isso trava>
   **Spec relacionada:** <Spec XX §YY; outras que colidem>
   **Impacto se não decidir:** <o que uma IA ou um humano faria de errado sem isso>
   **Opções possíveis:** 1. <…> 2. <…> 3. <…>
   **Recomendação técnica:** <sua leitura, com o porquê — é argumento, não decisão>
   **Decisão:** **Pendente.**
   ```

4. **Registre a origem** numa linha final: task em que a lacuna apareceu e, se for corrida
   orquestrada, o id da corrida.

## Como editar o arquivo — regra dura

O `docs-dev/16` é um dos derivados longos onde o `CLAUDE.md` registra um acidente real: um
`str.index` com marcador genérico apagou quatro DEC de uma vez. Portanto:

- **Só append.** Acrescente ao **fim da seção temática** correspondente (ou ao fim do arquivo,
  se nenhuma servir). Nunca `index`/`replace` em marcador que se repete — `**Decisão:**`,
  `**Contexto:**` e `**Spec relacionada:**` aparecem dezenas de vezes.
- **Confira depois de escrever:** `git diff --numstat docs-dev/16-OPEN_QUESTIONS.md`. O número
  de linhas **removidas tem que ser 0**. Qualquer remoção → restaure com
  `git checkout HEAD -- docs-dev/16-OPEN_QUESTIONS.md` e refaça; nunca remende o arquivo
  corrompido.
- Leia o diff antes de considerar feito.

## Proibições

- **Nunca** escrever em `docs-dev/10-DECISION_LOG.md` — nem "DEC provisória", nem rascunho.
- **Nunca** marcar a Q como decidida, nem preencher `**Decisão:**` com outra coisa que não
  `**Pendente.**`.
- **Nunca** redigir a recomendação técnica em tom de decisão ("fica definido que…"). Ela é
  argumento para o humano avaliar.
- **Nunca** alterar `docs/specs/**` (read-only, com hook).
- Se a lacuna exigir mudança de spec, **diga isso dentro da Q** e pare — quem altera spec é o
  responsável.

## Entrega

1. O número da Q criada e seu título.
2. O `git diff --numstat` do `docs-dev/16` (com **0 linhas removidas**, comprovado).
3. Qual task ficou bloqueada por ela.
4. Lembrete de que a decisão cabe ao responsável, via `/registrar-decisao`.

Não comite: quem chamou a skill decide o momento do commit.
