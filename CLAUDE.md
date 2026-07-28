# ROTA — Registro de Operação e Tabelas de Autos (ARTESP/SUCOL)

## O que é (e o que NÃO é)

O ROTA é um conjunto de ferramentas React/Next.js majoritariamente client-side — Formulário, Comparador e Ingestor (futuro) — de apoio à elaboração e verificação de tabelas operacionais de linhas intermunicipais. As ferramentas são desacopladas e só se comunicam pelo JSON de operação (Spec 02). O ROTA **não** gerencia processo: pedido, aprovação, status, prazo, pendência e publicação vivem no SEI (Spec 01 §1/§3). Pergunta-teste antes de qualquer feature: **"isso é dado de operação da linha, ou é gestão do pedido?"** — gestão é SEI, fora do sistema (`docs-dev/00-README-SPEC-DRIVEN.md` §10).

## Hierarquia de verdade

Spec original (`docs/specs/01..05`) > `docs-dev/01-RULE_INDEX.md` > demais derivados (`docs-dev/`) > task > código. Derivado que contradiz spec está errado — corrija o derivado e registre dúvida real em `docs-dev/16-OPEN_QUESTIONS.md`.

## Não-negociáveis

- **`docs/specs/**` é read-only** para quem implementa (proibição de `docs-dev/04`). Sugestão de mudança de spec → `docs-dev/16-OPEN_QUESTIONS.md`. Um hook bloqueia Edit/Write nesses caminhos.
- **Não inventar regra de negócio** (`docs-dev/04` princípio 2): se a spec não diz, não existe. Lacuna vira Q-xxx em `docs-dev/16`, nunca decisão própria.
- **UUIDs preservadas na importação** (RN-004) — a regra crítica nº 1 do projeto. Qualquer código que toque import/export/cópia prova isso com teste de round-trip.
- **JSON é contrato fechado** (RN-008..015): campo novo exige alterar a Spec 02 **antes** do código; sem campos de fluxo (exceção estreita: `autos.status` proposta/vigente, RN-011); sem R$ (RN-013); schema strict rejeita campos extras (RN-010).
- **Sem workflow, backend, login, banco, status de pedido, R$** (NEG-001..019 em `docs-dev/11-NEGATIVE_REQUIREMENTS.md`). Exportar JSON **é** o salvar (RN-096).
- **Uma task por vez** (`docs-dev/04` princípio 7). O "Fora de escopo" da task é vinculante; nada de "aproveitar para melhorar".

## Stack fixada (DEC-028/029/030 em `docs-dev/10-DECISION_LOG.md`)

Next.js/React + TypeScript · zod em modo strict (RN-010) · @react-pdf (PDF client-side) · Vitest (unitários) + Playwright (E2E) — testes **nunca** dependem do OSRM real, mock sempre · MapLibre GL (Spec 01 §8) · OSRM demo público `router.project-osrm.org`, perfil `driving`, com URL base configurável (DEC-029) · Tailwind CSS 4 para estilo (DEC-050), tokens via `@theme`. Nenhuma dependência que exija servidor próprio (ORM, fila, auth SDK) até a Spec 06.

O padrão visual é governado por `docs-dev/18-DESIGN_SYSTEM.md` (vinculante para tasks de UI — DEC-050): componentes de `src/shared/ui/`, tokens, ícones-carimbo SVG próprios, sem `style=` inline; `data-testid`/`aria-*` existentes são intocáveis.

## Layout de módulos (`docs-dev/13-ARCHITECTURE_GUARDRAILS.md`)

- `shared/` — schema do contrato JSON, validadores, primitivas geo, contagens, componentes de UI (`shared/ui/`).
- `formulario/` e `comparador/` — só dependem de `shared/` e só se comunicam por arquivo JSON. Sem imports cruzados; Comparador nunca chama OSRM nem escreve.
- `data/` — estáticos: `autos_empresas.json` e `municipios.json` (DEC-030), gerados por `scripts/gerar_dados_estaticos.py` a partir dos CSVs de origem. Regenerar quando os CSVs mudarem.

## Ciclo por task

**Antes de codar qualquer task, rode `/analisar-task`.** Ordem de leitura obrigatória (`docs-dev/00` §4):

1. A task.
2. `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md` (vinculante — formatos de resposta obrigatórios).
3. As seções de spec referenciadas pela task.
4. As RN da task em `docs-dev/01-RULE_INDEX.md` (e vizinhas do grupo).
5. `docs-dev/02-DOMAIN_MODEL.md` (entidades afetadas) e `docs-dev/11-NEGATIVE_REQUIREMENTS.md`.
6. `docs-dev/13-ARCHITECTURE_GUARDRAILS.md` se tocar arquitetura/dependências.
7. `docs-dev/18-DESIGN_SYSTEM.md` se tocar UI (vinculante — DEC-050).

Modo supervisionado é o padrão: parar após a "Análise da Task" e aguardar aprovação humana do plano.

Após implementar e entregar a task, encerre a conversa. A revisão de aderência deve ser
executada com `/revisar-aderencia` em **uma nova conversa**, baseada nos artefatos
persistidos. Nunca implemente e produza o parecer formal de revisão na mesma conversa,
inclusive em modo autônomo.

## Skills

| Skill | Quando usar |
|---|---|
| `/analisar-task` | Antes de implementar qualquer task — leitura obrigatória + "Análise da Task"; declara bloqueio se depender de Q-xxx sem decisão. |
| `/implementar-task` | Após plano aprovado — implementa só o escopo, entrega "Implementação concluída" e encerra a conversa. |
| `/revisar-aderencia` | Em nova conversa após toda implementação — checklist `docs-dev/07` item a item + parecer no template `docs-dev/14`. |
| `/nova-task` | Para quebrar uma funcionalidade em tasks pequenas com o template `docs-dev/05`. |
| `/investigar-conflito` | Diante de conflito entre specs — análise estruturada, sem alterar spec, entrega Q-xxx pronta. |
| `/registrar-decisao` | **Só por decisão explícita do responsável** — move Q-xxx decidida para DEC-xxx em `docs-dev/10` e atualiza `docs-dev/16`. |

## Idioma e nomenclatura

Português em código, comentários, docs e mensagens. Nomenclatura oficial das specs — **Autos, Serviço, Seção, Local, Parada, ponto de rota, `numero_n`, `viagem_feriado`, `offset_horario`** — nunca traduzir nem renomear conceitos (`docs-dev/04` princípio 12).

## Comandos

- Dev: `npm run dev`
- Build (export estático em `out/`): `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Testes unitários (Vitest): `npm test` (watch: `npm run test:watch`)
- E2E isolado (Playwright): `npm run test:e2e` — sobe `next dev` sozinho; requer navegador instalado (`npx playwright install chromium`)
- Suíte completa canônica: `npm run test:all:log -- --executor=Codex` (ou `--executor=humano`) — Vitest + Playwright sequenciais, servidor Next próprio na porta dedicada 3100, timeout e cleanup por PID; nunca executar em paralelo com build/E2E.
- Verificar/reutilizar a evidência: `npm run test:all:verificar` — aceita `ultimo-test-all.log` somente com marcador final aprovado, os dois códigos 0, fingerprint do conteúdo atual e identidade do mesmo working tree.

Na implementação, use testes direcionados durante a edição, depois lint/typecheck e build quando aplicável, e produza **uma única** evidência final com `test:all:log`. A revisão executa primeiro `test:all:verificar`: se o log for válido, registra executor/fingerprint/identidade do working tree e não repete a suíte; se for ausente, truncado, vermelho, desatualizado ou originado em outro working tree, roda `test:all:log` uma vez. O log é efêmero (`*.log`), nunca versionado nem fonte de verdade de negócio.

## Limites do enforcement automático

O hook de proteção cobre apenas Edit/Write diretos em `docs/specs/**`; edição via shell não é interceptada — a proibição continua valendo pelo protocolo `docs-dev/04`. Regras semânticas (não virar workflow, não inventar regra, escopo da task) **não são hookáveis**: são garantidas por revisão humana + `/revisar-aderencia`.

## Edição dos derivados longos (`docs-dev/` 06, 10, 16, 19)

Esses documentos repetem as mesmas fórmulas em dezenas de entradas (`**Status:** Aceita ·`, `**Impacto em implementação:**`, `**Exige alteração de spec antes do código**`, `## Fora de escopo`). Editar por script sem cuidado apaga entradas inteiras em silêncio — já ocorreu: um `str.index` com marcador genérico casou na DEC-087 em vez da DEC-092 e removeu quatro DEC de uma vez.

- Ancore em trecho **comprovadamente único** (`assert count == 1`) ou em faixa de linhas com **verificação das bordas** antes de substituir. Nunca `index`/`replace` em marcador que se repete.
- Prefira **append** (nova DEC, nova Q, nova task) a recorte de região.
- Depois de editar, confira `git diff --numstat` e leia as linhas removidas: remoção não intencional → **restaurar do `HEAD`** e refazer, nunca remendar o arquivo corrompido.
