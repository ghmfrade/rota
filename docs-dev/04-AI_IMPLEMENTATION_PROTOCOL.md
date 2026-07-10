# 04 — AI_IMPLEMENTATION_PROTOCOL: Protocolo Oficial para Implementação com IA

Este documento instrui **qualquer IA** (Claude, Codex ou outra) que for implementar o ROTA. Ele é vinculante: uma entrega que viole este protocolo é **reprovada** na revisão de aderência, mesmo que o código funcione.

---

## Princípios obrigatórios

1. **Obedecer às specs** (`docs/specs/01..05`). Elas são a fonte de verdade; os documentos de `docs-dev/` são derivados delas.
2. **Não inventar regra de negócio.** Se a spec não diz, não existe. Lacuna → registrar em `16-OPEN_QUESTIONS.md`, nunca decidir sozinho.
3. **Não transformar o ROTA em workflow.** Nada de status de pedido, aprovação, pendência, histórico, permissões (RN-095; `11-NEGATIVE_REQUIREMENTS.md`).
4. **Preservar o JSON como contrato.** Mudança de campo exige mudança da Spec 02 primeiro; schema fechado; sem campos de fluxo; sem R$ (RN-008..015).
5. **Manter Formulário, Comparador e Ingestor desacoplados** — só o JSON os une (RN-097). Não antecipar o Ingestor (RN-093).
6. **Preservar UUIDs importadas** — a regra crítica nº 1 do projeto (RN-004). Qualquer código que toque import/export deve provar isso com teste.
7. **Implementar uma task por vez.** Nunca agrupar tasks nem "aproveitar para melhorar" fora do escopo.
8. **Planejar antes de codar.** Entregar a "Análise da Task" (formato abaixo) antes de qualquer implementação.
9. **Criar testes para toda regra RN implementada** (categorias em `08-TEST_STRATEGY.md`), incluindo casos inválidos.
10. **Informar arquivos alterados** no resumo final, sem omissões.
11. **Revisar aderência ao final** com `07-CHECKLIST_ADERENCIA_SPEC.md` e reportar o resultado.
12. **Usar a nomenclatura oficial das specs** (Autos, Serviço, Seção, Local, Parada, ponto de rota, `numero_n`, `viagem_feriado`…) em código, comentários e docs — não traduzir nem renomear conceitos.
13. **Marcar inferências.** Qualquer decisão que não esteja literalmente na spec deve ser marcada como *inferência controlada* na análise e na entrega.

## Fluxo obrigatório por task

```text
1. Ler a task.
2. Ler as specs referenciadas (seções citadas + vizinhas relevantes).
3. Ler RULE_INDEX (01) — as RN da task e as RN vizinhas do mesmo grupo.
4. Ler DOMAIN_MODEL (02) — entidades afetadas (e "coisas que parecem iguais").
5. Identificar regras RN afetadas (inclusive as não listadas na task, se houver — apontar).
6. Resumir entendimento com suas próprias palavras.
7. Identificar ambiguidades (→ 16-OPEN_QUESTIONS.md se novas).
8. Propor plano (arquivos, testes, riscos).
9. Aguardar aprovação humana, se estiver em modo supervisionado.
10. Implementar apenas o escopo da task.
11. Criar ou ajustar testes (casos válidos E inválidos).
12. Rodar verificações disponíveis (typecheck, lint, testes).
13. Entregar resumo final (formato abaixo).
14. Commit da implementação: `Implementa TASK-XXX: <título>` — só código e testes da task.
15. Fazer revisão de aderência (07-CHECKLIST_ADERENCIA_SPEC.md).
16. Salvar o parecer em `docs-dev/14-REVISOES/TASK-XXX-<AAAAMMDD>.md` e comitar: `Registra revisão de aderência da TASK-XXX: <parecer>`.
```

## Convenção de commits por task (obrigatória)

Cada task fecha em **dois commits**, nunca em um só e nunca com commit vazio:

1. **Implementação** — `Implementa TASK-XXX: <título>`. Contém apenas o código e os testes do escopo da task.
2. **Revisão de aderência** — `Registra revisão de aderência da TASK-XXX: <aprovado | com ressalvas | reprovado>`. Contém o arquivo do parecer salvo em `docs-dev/14-REVISOES/TASK-XXX-<AAAAMMDD>.md` (o template manda arquivar o parecer junto da task — `14-REVIEW_REPORT_TEMPLATE.md`).

O parecer **sempre** é salvo em arquivo; o commit de revisão nunca é vazio.

## Formato obrigatório da resposta ANTES da implementação

```md
# Análise da Task

## Resumo

(o que a task pede, nas suas palavras — 3 a 6 linhas)

## Regras envolvidas

- RN-... (listadas na task)
- RN-... (identificadas adicionalmente, com justificativa)

## Specs consultadas

- Spec XX §YY — (o que foi extraído de lá)

## Ambiguidades

- (nenhuma | lista; novas ambiguidades ganham proposta de Q-xxx)

## Plano de implementação

1. ...

## Arquivos previstos

- (criar/alterar, com caminho)

## Testes previstos

- (por categoria da 08-TEST_STRATEGY, com casos inválidos)

## Riscos

- (escopo, regressão, dependência de decisão pendente)
```

## Formato obrigatório da resposta APÓS a implementação

```md
# Implementação concluída

## Arquivos alterados

- (todos, criados e modificados)

## Regras atendidas

- RN-... (como cada uma foi atendida, em 1 linha)

## Testes criados/alterados

- (arquivo + o que cobre; destacar casos inválidos)

## Validações executadas

- (typecheck/lint/testes — com resultado real; falha é reportada como falha)

## Pontos de atenção

- (dívidas, inferências controladas, follow-ups)

## Aderência à spec

(resultado do checklist 07 — itens não aplicáveis marcados como N/A; violações são impeditivas)
```

## Proibições operacionais (resumo executável)

- ❌ Criar campo novo no JSON sem alteração prévia da Spec 02.
- ❌ Criar backend, banco, endpoint de escrita, login ou tabela de qualquer natureza para Formulário/Comparador.
- ❌ Regenerar UUID em import, edição ou cópia indevida (cópia legítima = entidade nova = UUID nova, RN-007).
- ❌ Usar `numero_n`, `nome` ou rótulo como chave.
- ❌ Fallback de rota em linha reta, distância "estimada" ou prosseguir sem rota OSRM válida.
- ❌ Recalcular dados congelados em Comparador/Ingestor/PDF.
- ❌ Exibir R$ ou offsets crus para o usuário; misturar feriado nas contagens.
- ❌ Implementar qualquer coisa de Ingestor/Spec 06 antes de decisão humana.
- ❌ Alterar `docs/specs/*` — sugestões vão para `16-OPEN_QUESTIONS.md`.

## Modo supervisionado × autônomo

- **Supervisionado (padrão):** parar após a "Análise da Task" e aguardar aprovação do plano.
- **Autônomo (quando explicitamente autorizado):** prosseguir sem parada, mas os dois formatos de resposta continuam obrigatórios, e qualquer ambiguidade nova **interrompe** a task (registra Q-xxx e para).
