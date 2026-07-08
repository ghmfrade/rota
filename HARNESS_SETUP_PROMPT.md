## PROMPT

```md
Você vai montar o HARNESS de desenvolvimento do projeto ROTA no Claude Code —
o plano de controle que faz as regras do projeto valerem automaticamente.
NÃO vai escrever código de aplicação nem criar o scaffold Next.js: isso é a
TASK-001 e passa pelo ciclo normal depois.

## Contexto do projeto

ROTA = Registro de Operação e Tabelas de Autos (ARTESP/SUCOL). Aplicação
React/Next.js majoritariamente client-side, sem backend transacional, cujo
contrato central é um JSON de operação (Spec 02). Ferramentas desacopladas
(Formulário, Comparador, Ingestor futuro) que só se comunicam pelo JSON.

A fonte de verdade do negócio são as specs em docs/specs/01..05. A camada
docs-dev/00..18 é derivada delas (regras com ID, protocolo, backlog, decisões).
Hierarquia em caso de divergência: spec > docs-dev/01-RULE_INDEX > demais
derivados > task > código.

## Leitura obrigatória ANTES de propor qualquer coisa

Leia, nesta ordem, e resuma o que extraiu de cada um:

1. docs-dev/00-README-SPEC-DRIVEN.md — fluxo de trabalho e ordem de leitura.
2. docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md — protocolo vinculante, formatos
   obrigatórios de resposta, proibições operacionais, modo supervisionado.
3. docs-dev/13-ARCHITECTURE_GUARDRAILS.md — arquitetura, proibições, stack.
4. docs-dev/11-NEGATIVE_REQUIREMENTS.md — o que o sistema NÃO deve fazer (NEG-xxx).
5. docs-dev/12-PROMPTS_OPERACIONAIS.md — os prompts do ciclo (viram skills).
6. docs-dev/05-TASK_TEMPLATE.md e 07-CHECKLIST_ADERENCIA_SPEC.md e
   14-REVIEW_REPORT_TEMPLATE.md — formatos que as skills devem reproduzir.
7. docs-dev/10-DECISION_LOG.md — decisões já fechadas (em especial DEC-028
   sobre a stack e DEC-030 sobre os dados estáticos).

Regras invioláveis que o harness deve reforçar (não reescrevê-las — apontar):

- Não inventar regra de negócio: lacuna vira Q-xxx em docs-dev/16, nunca decisão.
- Não alterar docs/specs/\*\* (sugestões vão para docs-dev/16-OPEN_QUESTIONS.md).
- Preservar UUIDs no import (RN-004) e o JSON como contrato fechado (RN-008..015).
- Sem workflow, backend, login, banco, status de pedido, R$ (NEG-001..019).
- Uma task por vez; nomenclatura oficial das specs em código e docs.

## Entregáveis (o harness)

### 1. CLAUDE.md na raiz do repositório

Arquivo curto e denso, carregado automaticamente em toda sessão. NÃO duplicar
as specs; apontar para elas. Deve conter, de forma enxuta:

- O que o ROTA é e o que NÃO é (1 parágrafo + ponteiro para Spec 01 §1/§3 e
  para a pergunta-teste "dado de operação × gestão do pedido" — docs-dev/00 §10).
- A hierarquia de verdade (spec > 01-RULE_INDEX > derivados > task > código).
- As não-negociáveis, cada uma com o ID de origem: RN-004 (UUID), contrato JSON
  (RN-008..015), sem workflow/backend/R$ (NEG-\*), uma task por vez.
- Stack fixada (DEC-028): Next.js/React + TypeScript, zod (strict), @react-pdf,
  Vitest/Playwright, MapLibre GL, OSRM demo (DEC-029). Sem dependência que exija
  servidor próprio até a Spec 06.
- Layout de módulos (docs-dev/13): shared/ (schema, validadores, geo, contagens),
  formulario/, comparador/ — formulario e comparador só dependem de shared/ e só
  se falam por JSON. data/ para os estáticos (DEC-030: autos_empresas.json,
  municipios.json + scripts/gerar_dados_estaticos.py).
- Ordem de leitura obrigatória ao implementar uma task (docs-dev/00 §4, lista da
  IA) e ponteiro explícito: "antes de codar qualquer task, rode /analisar-task".
- As skills disponíveis (item 2) e quando usar cada uma.
- Idioma: português; nomenclatura oficial (Autos, Serviço, Seção, Local, Parada,
  ponto de rota, numero_n, viagem_feriado…) — não traduzir/renomear conceitos.
- Seção "Comandos" com placeholder a preencher quando a TASK-001 criar o projeto
  (test, typecheck, lint, dev) — deixar marcado como pendente até o scaffold.

### 2. Skills do ciclo (.claude/skills/<nome>/SKILL.md)

Cada skill = um arquivo SKILL.md com frontmatter YAML (name, description) cujo
corpo é o procedimento correspondente de docs-dev/12, apontando para os docs
canônicos em vez de duplicá-los. Criar, no mínimo:

- analisar-task — executa o protocolo de docs-dev/04: lê a task, o protocolo,
  as specs referenciadas, as RN em 01-RULE_INDEX, 02-DOMAIN_MODEL e
  11-NEGATIVE_REQUIREMENTS; entrega no formato "Análise da Task"; se a task
  depender de Q-xxx sem decisão, declara bloqueio e para.
- implementar-task — segue o plano aprovado sem sair do escopo; testes com casos
  inválidos e mock de OSRM; entrega no formato "Implementação concluída".
- revisar-aderencia — percorre docs-dev/07 item a item e preenche
  docs-dev/14-REVIEW_REPORT_TEMPLATE.md; parecer aprovado/ressalvas/reprovado.
- nova-task — quebra uma funcionalidade em tasks pequenas usando
  docs-dev/05-TASK_TEMPLATE.md, numerando a partir do próximo TASK livre em
  docs-dev/06-BACKLOG_INICIAL.md; declara bloqueio se depender de Q-xxx.
- investigar-conflito — análise estruturada de conflito entre specs conforme
  docs-dev/12, sem alterar spec, entregando o texto pronto da Q-xxx.

Proponha (sem criar ainda) se vale uma skill registrar-decisao para o fluxo
Q-xxx → DEC-xxx (mover a decisão para docs-dev/10 e atualizar status em 16).

### 3. Hooks de enforcement (.claude/settings.json)

Só o que dá para travar mecanicamente por caminho/comando — seja honesto sobre
os limites (regras semânticas como "não vira workflow" continuam sendo revisão
humana + skill revisar-aderencia, não hook). No mínimo:

- PreToolUse que BLOQUEIA Edit/Write em docs/specs/\*\* (proibição de docs-dev/04:
  specs são read-only para quem implementa; mensagem apontando para docs-dev/16).
  Proponha, explicando trade-offs, se convém também: avisar ao criar arquivos com
  cara de backend/banco (prisma, migrations, server actions de escrita, rotas de
  API de persistência) — como aviso, não bloqueio rígido, para não gerar atrito.

### 4. Permissions (.claude/settings.json)

Allowlist dos comandos da stack para reduzir prompts de permissão: npm/npx/node,
vitest, playwright, tsc, next, e leituras de git (status, diff, log). Preservar
o conteúdo existente de .claude/settings.local.json — não sobrescrever.

## Como proceder (modo supervisionado)

1. Faça a leitura obrigatória e devolva um resumo do entendimento.
2. Aponte qualquer ambiguidade real como proposta de Q-xxx (não decida sozinho).
3. Proponha o PLANO: lista exata de arquivos a criar/alterar, com um esboço do
   conteúdo de cada um e a justificativa citando a origem (Spec/RN/NEG/DEC/doc).
4. PARE e aguarde aprovação humana antes de escrever qualquer arquivo.
5. Após aprovado: crie os arquivos, exatamente no escopo aprovado.
6. Entregue o resumo final: arquivos criados, como cada regra-fonte foi honrada,
   limitações do enforcement, e o próximo passo (rodar /analisar-task TASK-001).

## Fora de escopo (não fazer)

- NÃO criar o scaffold Next.js, package.json, tsconfig nem qualquer código de
  aplicação — isso é a TASK-001.
- NÃO alterar docs/specs/\*\* nem inventar regra, campo de JSON ou decisão.
- NÃO implementar nenhuma task do backlog.
- NÃO agrupar o setup com outra atividade "de brinde".
```

---

## Notas de operação

- **Depois de aprovado e construído**, o ciclo real começa com `/analisar-task TASK-001` (scaffold) → plano → aprovação → `/implementar-task` → `/revisar-aderencia`.
- Se durante o setup a IA propuser mudar uma spec ou decidir uma Q-xxx pendente, **recuse** — é sintoma de invenção de escopo (docs-dev/00 §5).
- Este documento é operacional: pode evoluir. Se a estrutura de skills/hooks mudar, atualize aqui e no `CLAUDE.md` gerado.
