# 12 — PROMPTS_OPERACIONAIS: Prompts Prontos para IA/Codex

Prompts para os momentos do ciclo (`00-README-SPEC-DRIVEN.md` §3). Substitua `TASK-XXX`/`...` antes de usar. Todos assumem que a IA tem acesso a `docs/specs/` e `docs-dev/`.

---

## Prompt para analisar uma task

```md
Você vai analisar a TASK-XXX.

Leia, nesta ordem:

- a task;
- docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md (protocolo vinculante);
- as specs referenciadas pela task (seções citadas);
- docs-dev/01-RULE_INDEX.md (as RN da task e as vizinhas do mesmo grupo);
- docs-dev/02-DOMAIN_MODEL.md (entidades afetadas);
- docs-dev/11-NEGATIVE_REQUIREMENTS.md.

Não implemente ainda.

Entregue no formato "Análise da Task" do protocolo:

1. resumo da task;
2. regras RN envolvidas (incluindo as que você identificar além das listadas);
3. specs consultadas (com o que extraiu de cada);
4. ambiguidades (proponha Q-xxx para as novas);
5. plano de implementação;
6. arquivos que pretende criar/alterar;
7. testes necessários (com casos inválidos);
8. riscos.

Se a task depender de uma Q-xxx sem decisão, declare a task bloqueada e pare.
```

## Prompt para implementar uma task

```md
Implemente a TASK-XXX seguindo o plano aprovado.

Requisitos:

- não sair do escopo (o "Fora de escopo" da task é vinculante);
- respeitar as regras RN citadas e o docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md;
- criar/ajustar testes (casos válidos e inválidos; mock do OSRM sempre);
- não inventar regra de negócio — lacuna vira Q-xxx, não decisão sua;
- não introduzir workflow, persistência de servidor ou campos novos no JSON;
- preservar o contrato JSON (Spec 02) e as UUIDs em qualquer import/cópia;
- rodar as verificações disponíveis e reportar resultados reais;
- entregar o resumo final no formato "Implementação concluída" do protocolo
  (arquivos alterados, regras atendidas, testes, validações, pontos de
  atenção, aderência à spec via docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md).
```

## Prompt para revisar aderência à spec

```md
Revise a implementação da TASK-XXX (diff em anexo/branch indicada).

Leia a task, as specs referenciadas, as RN citadas e o
docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md.

Verifique:

- aderência às specs e às regras RN (cite RN-xxx em cada achado);
- violações de escopo (código além do "Objetivo" ou dentro do "Fora de escopo");
- presença de workflow indevido ou campo de fluxo no JSON (NEG-001..007);
- preservação do contrato JSON e da regra de UUID (RN-004..007);
- testes: existem, cobrem casos inválidos, não dependem do OSRM real;
- lacunas (regra da task sem teste; critério de aceite não verificado).

Percorra o checklist 07 item a item (marque N/A quando não se aplicar) e
preencha o docs-dev/14-REVIEW_REPORT_TEMPLATE.md.

Entregue parecer objetivo: aprovado, aprovado com ressalvas ou reprovado —
com a lista de problemas ordenada por severidade.
```

## Prompt para quebrar uma funcionalidade em tasks

```md
Com base nas specs (docs/specs) e no docs-dev/01-RULE_INDEX.md, quebre a
funcionalidade abaixo em tasks pequenas, testáveis e rastreáveis, usando o
docs-dev/05-TASK_TEMPLATE.md e numerando a partir do próximo TASK-XXX livre
em docs-dev/06-BACKLOG_INICIAL.md.

Funcionalidade:
...

Regras da quebra:

- cada task implementável e revisável numa sessão;
- nada de tasks guarda-chuva ("fazer o formulário");
- dependências explícitas entre as tasks;
- nenhuma task pode exigir decisão pendente (Q-xxx) sem declarar-se bloqueada.

Para cada task, informar: título; objetivo; regras RN; specs fonte
(Spec XX §YY); critérios de aceite; testes esperados; dependências; riscos.
```

## Prompt para investigar conflito entre specs

```md
Existe possível conflito entre as seguintes regras ou trechos de spec:
...

Leia os trechos citados no contexto completo das suas seções, mais
docs-dev/01-RULE_INDEX.md e docs-dev/10-DECISION_LOG.md (o conflito pode já
ter sido superado por decisão registrada — as specs marcam superações nas
seções "Decisões Fechadas").

Analise:

- o que cada trecho determina, literalmente;
- se há conflito real ou aparente (redação × norma);
- impacto no domínio;
- impacto no JSON (contrato);
- impacto no Formulário;
- impacto no Comparador;
- decisão recomendada (com base na precedência: spec mais específica e mais
  recente vence — cite a evidência);
- perguntas para decisão humana (formato Q-xxx, para
  docs-dev/16-OPEN_QUESTIONS.md).

Não altere nenhuma spec. Entregue a análise e, se o conflito for real,
o texto pronto da Q-xxx.
```

## Prompt para atualizar os documentos derivados após mudança de spec

```md
A spec XX mudou (diff/versão em anexo). Atualize a camada derivada:

1. identifique regras RN afetadas em docs-dev/01-RULE_INDEX.md (alterar
   descrição/origem; NUNCA reutilizar ID; regra removida fica marcada como
   "Superada", com referência);
2. atualize docs-dev/03-TRACEABILITY_MATRIX.md e, se preciso,
   02-DOMAIN_MODEL.md, 10-DECISION_LOG.md (nova DEC-xxx) e
   16-OPEN_QUESTIONS.md (Q-xxx respondidas ganham a decisão e status);
3. liste tasks do backlog impactadas (bloquear/ajustar);
4. entregue o resumo do que mudou e por quê, com citações Spec XX §YY.
```
