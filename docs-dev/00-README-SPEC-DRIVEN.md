# 00 — README: Spec-Driven Development do ROTA

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos (ARTESP/SUCOL)
**Pasta:** `docs-dev/` — camada operacional de desenvolvimento guiado por specs
**Specs originais:** `docs/specs/01..05` (fonte de verdade do negócio)

---

## 1. Objetivo

O ROTA será implementado de forma **incremental, rastreável e testável**, com auxílio de IA. O risco central desse modelo é a IA **inventar regra de negócio** ou **ampliar escopo** (transformar o ROTA num sistema de gestão de processo — papel que pertence ao SEI). Esta camada de documentos existe para impedir isso:

- toda regra tem **ID estável** (`RN-xxx`) e origem citada na spec;
- toda task referencia regras e specs;
- toda entrega é revisada contra um checklist de aderência;
- tudo que o sistema **não deve fazer** está escrito (`NEG-xxx`).

## 2. Papel de cada camada de documento

| Camada | Arquivos | Papel | Pode ser alterada por quem implementa? |
|---|---|---|---|
| **Specs originais** | `docs/specs/01..05` | Fonte de verdade do negócio. Definem O QUÊ e POR QUÊ. | **Não.** Sugestões vão para `16-OPEN_QUESTIONS.md` ou documento separado. |
| **Documentos derivados** | `docs-dev/01..17` | Índice de regras, modelo de domínio, rastreabilidade, protocolo de IA, backlog. Derivados das specs — nunca as contradizem. | Sim, quando uma spec mudar ou uma lacuna for encontrada — sempre citando a origem. |
| **Tasks** | criadas a partir de `05-TASK_TEMPLATE.md` | Unidade de trabalho pequena, com critérios de aceite e regras RN. | Sim (são operacionais). |
| **Código + testes** | (futuro) | Implementação. Só nasce de task aprovada. | Sim, dentro do escopo da task. |

**Hierarquia em caso de divergência:** Spec original > `01-RULE_INDEX.md` > demais derivados > task > código. Se um derivado contradiz uma spec, o derivado está errado — corrija-o e registre em `16-OPEN_QUESTIONS.md` se houver dúvida real.

## 3. Fluxo de trabalho

```text
Specs originais (docs/specs)
→ índice de regras            (01-RULE_INDEX.md)
→ matriz de rastreabilidade   (03-TRACEABILITY_MATRIX.md)
→ backlog                     (06-BACKLOG_INICIAL.md)
→ task pequena                (05-TASK_TEMPLATE.md)
→ análise da IA               (04-AI_IMPLEMENTATION_PROTOCOL.md — formato "Análise da Task")
→ plano                       (aprovado por humano em modo supervisionado)
→ implementação               (só o escopo da task)
→ testes                      (08-TEST_STRATEGY.md)
→ encerrar conversa de implementação
→ nova conversa
→ revisão de aderência        (07-CHECKLIST_ADERENCIA_SPEC.md + 14-REVIEW_REPORT_TEMPLATE.md)
```

A implementação e a revisão formal nunca ocorrem na mesma conversa. Só depois da
revisão de aderência, feita em uma nova conversa, avança-se para a próxima task.

## 4. Ordem de leitura

**Para um humano novo no projeto:**

1. `docs/specs/01-visao-geral.md` — o que é o ROTA e o que ele não é.
2. `02-DOMAIN_MODEL.md` (este kit) — entidades e diferenças sutis.
3. `docs/specs/02` a `05` — conforme a área em que vai trabalhar.
4. `06-BACKLOG_INICIAL.md` e `15-MVP_PLAN.md` — onde estamos.

**Para uma IA que vai implementar uma task (leitura obrigatória, nesta ordem):**

1. A task.
2. `04-AI_IMPLEMENTATION_PROTOCOL.md`.
3. As seções de spec referenciadas pela task.
4. As regras `RN-xxx` da task em `01-RULE_INDEX.md`.
5. `02-DOMAIN_MODEL.md` (entidades afetadas) e `11-NEGATIVE_REQUIREMENTS.md`.
6. `13-ARCHITECTURE_GUARDRAILS.md` se a task tocar arquitetura/dependências.
7. `18-DESIGN_SYSTEM.md` se a task tocar UI (componentes, telas, estilo) — vinculante (DEC-050).

## 5. Como criar tasks

- Parta do backlog (`06-BACKLOG_INICIAL.md`) ou quebre uma funcionalidade usando o prompt "quebrar funcionalidade" de `12-PROMPTS_OPERACIONAIS.md`.
- Use `05-TASK_TEMPLATE.md`. Uma task **sempre** tem: objetivo, fora de escopo, specs fonte (`Spec XX §YY`), regras `RN-xxx`, critérios de aceite objetivos e testes esperados.
- Task boa é pequena: "validar XOR de `secao_uuid`/`local_uuid` em Parada", não "fazer o formulário".
- Task que não consegue citar spec/regra de origem é sintoma de invenção de escopo — pare e registre em `16-OPEN_QUESTIONS.md`.

## 6. Como implementar tasks

Seguir o ciclo por task de `04-AI_IMPLEMENTATION_PROTOCOL.md`: ler → resumir entendimento → apontar ambiguidades → planejar → (aprovação humana) → implementar só o escopo → testar → entregar resumo final → encerrar a conversa. Nunca implementar duas tasks numa mesma entrega; nunca "aproveitar para melhorar" fora do escopo. A revisão formal é iniciada depois, em uma nova conversa.

## 7. Como revisar aderência

- Iniciar uma nova conversa, separada da implementação, e usar `/revisar-aderencia`.
- Percorrer `07-CHECKLIST_ADERENCIA_SPEC.md` item a item.
- Verificar que cada regra RN da task tem teste (matriz `03`).
- Registrar o parecer com `14-REVIEW_REPORT_TEMPLATE.md`: aprovado / aprovado com ressalvas / reprovado.

## 8. Como lidar com ambiguidades

1. **Não decidir sozinho.** Registrar como `Q-xxx` em `16-OPEN_QUESTIONS.md` (contexto, spec relacionada, impacto, opções, recomendação — decisão fica `Pendente`).
2. Se a task não pode prosseguir sem a decisão, a task fica bloqueada; escolher outra.
3. Se pode prosseguir com uma interpretação conservadora, marcar no código/task como **inferência controlada** e referenciar a `Q-xxx`.

## 9. Como lidar com conflitos entre specs

1. Registrar o conflito em `16-OPEN_QUESTIONS.md` e/ou na seção "Lacunas" da matriz `03`.
2. Regra de precedência já praticada pelas próprias specs: **a spec mais específica e mais recente vence** (ex.: Spec 02 §11 v0.6 superou o enum `regra_feriado` da Spec 03 v0.1; a Spec 03 §3.5 corrigiu a leitura da mensagem de erro da Spec 01 §8). As specs registram as superações em suas seções "Decisões Fechadas".
3. Usar o prompt "investigar conflito" de `12-PROMPTS_OPERACIONAIS.md` para análise estruturada.

## 10. Como decidir se algo pertence ao ROTA ou ao SEI

Pergunta-teste (Spec 01 §1/§3): **"isso é dado de operação da linha, ou é gestão do pedido?"**

- Itinerário, seções, horários, distâncias, viagens, rotas, PDF operacional/comparativo → **ROTA**.
- Status de análise, pendência, aprovação, manifestação, prazo, DOE, autor, histórico, permissão, e-mail → **SEI** (fora do sistema).
- Única exceção documentada: `autos.status` (`proposta`/`vigente`) + data condicional — etiqueta de autodeclaração do arquivo, **não** ciclo de vida (Spec 01 §3, Spec 02 §4.1). Nenhum outro campo de fluxo pode ser criado.

Na dúvida: `11-NEGATIVE_REQUIREMENTS.md` e `13-ARCHITECTURE_GUARDRAILS.md`.

## 11. Como garantir que o JSON continue sendo o contrato central

- Toda comunicação entre Formulário, Comparador e Ingestor passa **apenas** pelo JSON de operação (Spec 01 §2/§5) — nunca por estado compartilhado, banco, servidor ou API entre elas.
- Toda mudança de campo do JSON exige alteração da Spec 02 **antes** do código, e incremento consciente de `versao_schema` quando quebrar leitura.
- Exportar JSON = salvar; importar = retomar; UUIDs preservadas na importação (RN-004) — sem isso o Comparador degenera.
- Testes de contrato (categoria 1 de `08-TEST_STRATEGY.md`) protegem o schema contra regressão.

## 12. Mapa dos documentos deste kit

| Arquivo | Propósito |
|---|---|
| `01-RULE_INDEX.md` | Todas as regras de negócio com ID `RN-xxx`, origem, criticidade, critérios e exemplos. |
| `02-DOMAIN_MODEL.md` | Entidades, relações (Mermaid) e "coisas que parecem iguais, mas não são". |
| `03-TRACEABILITY_MATRIX.md` | Regra → spec → ferramenta → implementação provável → teste. + Lacunas. |
| `04-AI_IMPLEMENTATION_PROTOCOL.md` | Protocolo obrigatório para qualquer IA implementadora. |
| `05-TASK_TEMPLATE.md` | Template oficial de task. |
| `06-BACKLOG_INICIAL.md` | Backlog priorizado por fases, tasks pequenas com dependências. |
| `07-CHECKLIST_ADERENCIA_SPEC.md` | Checklist objetivo de revisão de qualquer entrega. |
| `08-TEST_STRATEGY.md` | Tipos de teste, ferramentas, cenários e regras RN associadas. |
| `09-DEFINITION_OF_DONE.md` | Definição de pronto, por tipo de entrega. |
| `10-DECISION_LOG.md` | Decisões já tomadas (`DEC-xxx`), com origem e consequências. |
| `11-NEGATIVE_REQUIREMENTS.md` | O que o sistema não deve fazer (`NEG-xxx`). |
| `12-PROMPTS_OPERACIONAIS.md` | Prompts prontos: analisar, implementar, revisar, quebrar, investigar conflito. |
| `13-ARCHITECTURE_GUARDRAILS.md` | Arquitetura esperada, proibições e riscos comuns com IA. |
| `14-REVIEW_REPORT_TEMPLATE.md` | Template de revisão humana por task. |
| `15-MVP_PLAN.md` | Ondas de entrega MVP 0 → MVP 5. |
| `16-OPEN_QUESTIONS.md` | Perguntas em aberto (`Q-xxx`), sem decisão inventada. |
| `17-SPEC_AUDIT.md` | Auditoria das specs: cobertura, conflitos, prontidão. |
| `18-DESIGN_SYSTEM.md` | Padrão visual vinculante (tokens, componentes `shared/ui`, ícones-carimbo, layout) — DEC-050. |
