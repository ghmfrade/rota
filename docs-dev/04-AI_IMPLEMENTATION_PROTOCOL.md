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
11. **Autoavaliar a aderência ao final da implementação** com `07-CHECKLIST_ADERENCIA_SPEC.md` e reportar o resultado; o parecer formal é feito depois, por `/revisar-aderencia`, em uma nova conversa.
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
12. Rodar testes direcionados durante a edição; depois typecheck/lint, build quando aplicável e uma única suíte completa canônica (`npm run test:all:log -- --executor=<quem executa>`).
13. Entregar resumo final (formato abaixo).
14. Commit da implementação: `Implementa TASK-XXX: <título>` — só código e testes da task.
15. Encerrar a conversa de implementação.
16. Em uma nova conversa, executar `/revisar-aderencia` com o checklist `07-CHECKLIST_ADERENCIA_SPEC.md`.
17. Salvar o parecer em `docs-dev/14-REVISOES/TASK-XXX-<AAAAMMDD>.md` e comitar: `Registra revisão de aderência da TASK-XXX: <parecer>`.
```

A separação de conversas é obrigatória inclusive em modo autônomo: a autorização para
prosseguir sem a parada de aprovação do plano não autoriza emendar a revisão formal à
implementação. A nova conversa deve revisar os artefatos persistidos, sem depender da
memória ou das justificativas do implementador.

## Evidência canônica de testes

- `npm run test:all:log -- --executor=Codex` (ou `--executor=humano`) é o único caminho canônico da suíte completa: Vitest e Playwright sequenciais, servidor Next próprio em porta dedicada, timeout e cleanup somente da árvore do PID criado.
- O comando escreve `ultimo-test-all.log` primeiro como temporário e só publica o marcador final depois de ambas as etapas fecharem. O log registra executor, ambiente, Git, identidade SHA-256 do caminho canônico do working tree, comandos, porta/PIDs, códigos/sinais, tempos, limpeza e fingerprint SHA-256 do conteúdo testado.
- Implementação: testes direcionados durante a edição; lint/typecheck; build quando aplicável; **uma única** execução final de `test:all:log`. Se falhar, corrigir e repetir o mesmo comando. Processos pesados nunca rodam em paralelo.
- Revisão: rodar primeiro `npm run test:all:verificar`. Log aprovado com fingerprint coincidente e identidade do mesmo working tree é reutilizado, registrando executor/fingerprint/working tree no parecer e sem repetir a suíte. Log ausente, truncado, vermelho, desatualizado ou copiado de outro working tree exige uma execução de `test:all:log` pela revisão.
- `ultimo-test-all.log` é artefato efêmero ignorado pelo Git, não fonte de verdade de negócio. `npm test` continua disponível para testes direcionados; `npm run test:e2e` continua disponível para diagnóstico isolado, mas não substitui a evidência canônica.

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

(autoavaliação do implementador pelo checklist 07 — itens não aplicáveis marcados como N/A; violações são impeditivas; não substitui o parecer formal em nova conversa)
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
- **Autônomo (quando explicitamente autorizado):** prosseguir sem a parada entre análise e implementação, mas os dois formatos de resposta continuam obrigatórios, qualquer ambiguidade nova **interrompe** a task (registra Q-xxx e para) e a conversa sempre termina após a implementação; a revisão formal ocorre em outra conversa.
