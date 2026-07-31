# Revisão da TASK-120 — reavaliação

**Revisor:** Claude (revisão de aderência, conversa separada da implementação)
**Data:** 2026-07-30
**Commit/branch revisado:** `ceac3be` — "Implementa TASK-120: alinhamento documental da
semeadura de grades" (branch `redesign`), sobre a entrega `caec734` já avaliada em
`14-REVISOES/TASK-120-20260730.md`.

## Resultado

- [ ] Aprovado
- [x] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

Reavaliação da TASK-120 após o commit de follow-up. `ceac3be` **não toca código**: alinha a
camada derivada à Spec 04 §8.4/§8.5 vigente e à DEC-099 — reescreve a RN-007 em
`docs-dev/01-RULE_INDEX.md:58-63`, atualiza a menção da RN-099 em `:716-717`, corrige as
linhas RN-007/RN-099 em `docs-dev/03-TRACEABILITY_MATRIX.md:14` e `:100`, ajusta a observação
de Viagem em `docs-dev/02-DOMAIN_MODEL.md:156`, marca a DEC-087 como superada em parte pela
DEC-099 (`docs-dev/10-DECISION_LOG.md:750`) e registra o estado em
`docs-dev/19-STATUS_EXECUCAO.md`. O mesmo commit versiona as alterações de spec (Spec 02/03/04)
e as entradas DEC-099/100/101, Q-077/078/079 e TASK-120/121/122 que estavam pendentes no
working tree. O código de `src/formulario/viagens/copias-grade.ts`,
`src/formulario/viagens/etapa-viagens.tsx` e `src/formulario/viagens/index.ts` permanece o de
`caec734`, reconferido nesta revisão.

## Regras RN verificadas

- **RN-004** (identidade estável para o Comparador) — **atendida**. A Viagem casada do destino
  é preservada por spread do objeto existente em `src/formulario/viagens/copias-grade.ts:163-170`,
  trocando só discriminadores e `horarios_paradas`. Verificado no unitário
  `testes/unitarios/formulario/viagens-copias-grade.test.ts:276` e no E2E
  `testes/e2e/etapa-viagens.spec.ts:1466-1474` (a UUID exibida após sincronizar é a do feriado
  preexistente, não a da origem).
- **RN-005** (unicidade global das UUIDs) — **atendida**. Viagens acrescentadas saem sempre da
  fábrica `criarViagem` (`copias-grade.ts:106-119`); nunca há reuso da UUID de origem. Coberto
  em `viagens-copias-grade.test.ts:613` ("sincronização nunca reutiliza UUID da origem nem do
  destino removido").
- **RN-007** (UUID nova só para entidade acrescentada) — **atendida, e agora também no
  derivado**. A redação de `docs-dev/01-RULE_INDEX.md:58` passou a distinguir cópias
  **aditivas** (UUID nova) da **sincronização entre grades** (`Copiar (sobrescrever)` preserva
  a UUID do destino casado), e o exemplo inválido em `:63` deixou de descrever o comportamento
  entregue como violação. Confere com a Spec 04 §8.5
  (`docs/specs/04-formulario-ux-pdf.md:248-249`) e com a DEC-099
  (`docs-dev/10-DECISION_LOG.md:1257-1289`). **Ressalva documental do parecer anterior
  encerrada.**
- **RN-061** (Viagem estratificada / invariante dos discriminadores) — **atendida**. Clone e
  casamento normalizam `viagem_feriado` e `tabela_excepcional_uuid` para os da grade destino
  (`copias-grade.ts:110-118`, `:164-166`).
- **RN-062** (reforços coincidentes válidos) — **atendida**. Pareamento por ordem estável dentro
  do grupo `dia_semana + horario_saida` (`copias-grade.ts:143-171`), exatamente a DEC-099, sem
  impor unicidade. Teste em `viagens-copias-grade.test.ts:325`.
- **RN-063** (offsets completos e monotônicos) — **atendida**. Nada recalcula offsets; a
  sincronização copia `horarios_paradas` da origem por cópia defensiva
  (`copias-grade.ts:167-169`).
- **RN-099** (pertencimento à Tabela excepcional) — **atendida no código e no derivado**. Grades
  alheias permanecem intocadas (`copias-grade.ts:139-141`; teste `viagens-copias-grade.test.ts:389`),
  e o texto da RN-099 em `docs-dev/01-RULE_INDEX.md:716` passou a citar a ação única
  `Copiar (sobrescrever)` no lugar de "copiar dias comuns (Viagens novas, UUIDs novas)`.
- **RN-010/RN-013** (contrato fechado, sem R$) — **atendidas**. Nenhum campo novo; round-trip
  pelo `esquemaDocumentoOperacao` em `viagens-copias-grade.test.ts:424` e `:641`.

## Specs verificadas

- **Spec 04 §8.5** (`docs/specs/04-formulario-ux-pdf.md:245-250`) — **aderente**. Normalização
  dos discriminadores, destino vazio com UUIDs novas, destino com conteúdo sob confirmação,
  remoção dos ausentes, preservação das UUIDs casadas, acréscimo dos faltantes com UUID nova e
  casamento por contagem, tudo espelhado em `copias-grade.ts:131-177` e em
  `etapa-viagens.tsx:833-862`.
- **Spec 04 §8.4** (`:234`) — **aderente**. A grade de feriados expõe a mesma ação única com o
  seletor de origem estendido; o botão renderiza literalmente `Copiar (sobrescrever)`
  (`etapa-viagens.tsx:1689`, `:1760`).
- **Spec 04 §16 item 4** (`:478-482`) — **aderente**, inclusive quanto às três operações de
  cópia hoje descritas separadamente na spec.
- **Spec 04 §8.3** (`:225-230`) — **aderente por não-regressão**: `copiarViagemParaDias`,
  `copiarViagemParaDiaComGuarda` e `copiarDiaParaDiasComGuarda` continuam aditivos e com UUID
  nova (`copias-grade.ts:85-100`, `:201-277`), não tocados por esta entrega.
- **Spec 02 §11/§12/§14** — **aderentes**: `dia_semana` único, invariante
  `tabela_excepcional_uuid ≠ null ⇒ viagem_feriado = false`, ausência de unicidade imposta. O
  diff da Spec 02 em `ceac3be` é exclusivamente realinhamento de colunas das tabelas markdown
  (27 linhas alteradas, nenhuma mudança semântica — conferido linha a linha).
- **Spec 03 §9.1** (`docs/specs/03-regras-de-negocio-calculo.md:613-622`) — **aderente**: as
  grades seguem independentes e o texto passou a descrever a igualação por
  `Copiar (sobrescrever)` em vez de "cria Viagens novas, com UUIDs novas".

## Pontos corretos

- O follow-up 1 do parecer anterior foi cumprido integralmente e nos quatro lugares em que a
  contradição existia (RN-007, RN-099, matriz e modelo de domínio), mais o status da DEC-087.
  Não sobrou nenhum derivado afirmando o par sobrescrever/mesclar como semântica vigente.
- A edição dos derivados longos respeitou o cuidado de `CLAUDE.md`: `git show --numstat ceac3be`
  mostra `06-BACKLOG_INICIAL.md` **447/0** e `16-OPEN_QUESTIONS.md` **122/0** (append puro), e a
  única remoção em `10-DECISION_LOG.md` é a linha de status da DEC-087, substituída por versão
  mais longa. Nenhuma entrada foi apagada em silêncio.
- Busca por `ModoSemeaduraGrade`, `mesclar` e `Copiar origem` em `src/` e `testes/` retorna uma
  única ocorrência: a asserção **negativa** `testes/e2e/etapa-viagens.spec.ts:1512`, que prova
  que `copiar-dias-comuns-mesclar` não existe mais. A remoção do modo antigo é completa.
- `data-testid` sobreviventes preservados (`copiar-dias-comuns`,
  `copiar-dias-comuns-sobrescrever`, `copiar-dias-comuns-excepcional`,
  `copiar-dias-comuns-excepcional-sobrescrever` — `etapa-viagens.tsx:1679-1680`, `:1753-1754`).
- Cancelamento acontece antes de qualquer mutação (`etapa-viagens.tsx:838-845`) e a limpeza de
  estado efêmero é calculada por diferença entre o destino anterior e o resultado (`:851-861`),
  atingindo só as UUIDs realmente removidas — o "limpeza segura" pedido pela task.
- Nenhuma chamada a OSRM: os E2E tocados abortam `router.project-osrm.org` e afirmam
  `chamadasOsrm === 0` (`etapa-viagens.spec.ts:1479-1486`, `:1521`).

## Problemas encontrados

(ordenados por severidade)

1. **[Baixo — cobertura de teste] Segue aberto o follow-up 2 do parecer anterior.** A task lista
   em "Testes esperados" *imutabilidade da entrada* e *cópia defensiva dos `horarios_paradas`*,
   e a DEC-099 repete a exigência no "Impacto em implementação"
   (`docs-dev/10-DECISION_LOG.md:1284-1287`: "com testes para … idempotência, imutabilidade e
   preservação das UUIDs do destino"). O código faz as duas coisas
   (`copias-grade.ts:163-170` cria objetos novos e mapeia `horarios_paradas` para objetos
   novos), e há verificação análoga para a cópia unitária
   (`viagens-copias-grade.test.ts:91`, "cópia é objeto independente"), mas **nenhum teste de
   `semearGradeAPartirDeOutra`** prova que mutar o resultado não afeta a origem nem que o
   itinerário de entrada permanece intacto. `ceac3be` é documental e não fechou essa lacuna — o
   próprio `docs-dev/19-STATUS_EXECUCAO.md:16-18` a declara "permanece aberta".
2. **[Baixo — processo] O commit `ceac3be` mistura alteração de `docs/specs/**` com o
   alinhamento dos derivados.** `docs/specs/02`, `03` e `04` entram num commit cuja mensagem é
   "Implementa TASK-120", com a ressalva textual de que as mudanças de spec são do responsável e
   estavam pendentes no working tree. A conferência sustenta a ressalva — a Spec 04 §8.5 vigente
   já era a citada pelo parecer de `caec734`, anterior a este commit, e o diff da Spec 02 é só
   formatação —, então **não** houve autoria de spec pelo implementador (`docs-dev/04`
   princípio da proibição). Mas o histórico deixa de distinguir autoria: quem ler `git log`
   verá alteração de spec assinada como implementação de task. Registro como observação de
   processo, não como violação de RN.
3. **[Baixo — observação, não bloqueante] Âncoras de sessão (DEC-049) das Viagens casadas
   sobrevivem à sincronização** (`etapa-viagens.tsx:851-861`), ainda que seus
   `horarios_paradas` sejam integralmente substituídos pelos da origem. É exatamente o que a
   task pede ("limpeza dos estados efêmeros apenas para UUIDs realmente removidas") e não
   contradiz RN nem spec. Fica o registro de que a marcação "âncora manual" pode persistir sobre
   offsets que já não foram digitados pelo usuário; se incomodar, é nova task ou Q-xxx.

## Violações de escopo

Nenhuma. `ceac3be` altera apenas documentação; o código continua restrito aos três arquivos de
"Arquivos prováveis" mais os dois de teste. Não há alteração da cópia unitária entre dias, da
cópia de um dia para outros dias, do CRUD de Tabelas excepcionais, de contagens, PDF, Comparador
ou do contrato JSON — todos itens do "Fora de escopo". Reforços coincidentes continuam válidos
(RN-062), sem proibição introduzida. Nenhum campo de fluxo, workflow, persistência de servidor
ou valor monetário (NEG-001..019 não tocados).

## Testes avaliados

- **cobertura das RN da task:** sim para RN-004/005/007/061/062/063/099 — cada uma com ao menos
  um unitário direto em `testes/unitarios/formulario/viagens-copias-grade.test.ts` (`:253`,
  `:276`, `:325`, `:363`, `:389`, `:424`, `:545`, `:613`, `:641`) e cobertura E2E em
  `testes/e2e/etapa-viagens.spec.ts:1455-1521`. Falta apenas o par listado no Problema 1.
- **casos inválidos testados:** sim — `viagens-copias-grade.test.ts:237` (grade origem vazia
  esvazia o destino), `:389` (não mistura outra Tabela excepcional nem a grade de feriados),
  `:613` (nunca reutiliza UUID da origem nem do destino removido); no E2E, o caminho de
  cancelamento (`etapa-viagens.spec.ts:1514-1520`).
- **regressão de UUID:** sim — round-trip pelo schema em `viagens-copias-grade.test.ts:424` e
  `:641`, preservação da UUID casada em `:276`, e a asserção E2E `etapa-viagens.spec.ts:1470-1474`.
- **OSRM mockado:** sim — rotas abortadas e contador em zero nos E2E tocados.
- **suíte executada com resultado:** **verde, reutilizada sem repetir a suíte.**
  `npm run test:all:verificar` respondeu: *"Log canônico válido. Executor: Claude. Fingerprint:
  `ac9fd79ec6bab58f08f3ca8b730674678e83f47aee82fcf96e3e34eebcc91606`. Working tree:
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`."* O log registra
  `Test Files 100 passed (100)`, `Tests 1364 passed (1364)`, E2E `103 passed (41.8s)`,
  `Código Testes unitários: 0`, `Código Testes E2E: 0`, `Resultado geral: APROVADO`. Como
  `ceac3be` não altera código nem testes, a evidência continua correspondendo ao working tree
  revisado; `git status` está limpo.

## Checklist 07

**Resultado: 22 itens ok, 33 N/A, 1 com ressalva.**

- **Escopo (6 itens):** todos **ok** — nada de SEI/workflow/status/persistência (RN-095/011/096);
  escopo exato; toda decisão ancorada em Spec 04 §8.4/§8.5 e DEC-099.
- **JSON (10 itens):** **ok** RN-010, RN-009, "campo novo sem Spec 02", RN-004, RN-002/007,
  RN-013, RN-015; **N/A** RN-033 (paradas), RN-014/RN-050 (distâncias/durações não tocadas).
- **Domínio (9 itens):** **ok** RN-061 (Viagem estratificada) e RN-069 (feriado fora das
  contagens, inalterado); **N/A** os demais (Seção/Local, ponto de rota, Serviço, `numero_n`,
  extremos, Ida/Volta, tipificação).
- **Comparador (7 itens):** **N/A** — a entrega não toca o Comparador; a preservação de UUID
  serve à RN-004, verificada acima.
- **Roteamento (5 itens):** **N/A** — nenhuma chamada de rota; ausência provada nos E2E.
- **UI/PDF (8 itens):** **ok** DEC-050 (componente `Botao` de `shared/ui`, sem `style=` inline) e
  preservação de `data-testid`/`aria-*` sobreviventes; **N/A** padrão de nome de Seção, offsets
  no PDF, matrizes, Locais, aviso SEI, bloqueio de exportação.
- **Testes (9 itens):** **ok** oito itens (casos inválidos, regressão de UUID, OSRM mockado,
  fixtures canônicas, verificações direcionadas reportadas, evidência canônica única, reutilização
  do log válido sem repetir a suíte, porta 3100 liberada pelo executor do log). **Ressalva** no
  item "toda regra RN alterada/implementada possui teste (matriz `03`)": a matriz agora aponta
  corretamente `U + E2E` para a RN-007 (`docs-dev/03-TRACEABILITY_MATRIX.md:14`), mas a exigência
  de teste de imutabilidade que a DEC-099 associa à RN-007/RN-062 segue sem cobertura direta
  (Problema 1).

## Pendências

- **Condição de merge:** nenhuma. Nenhum problema encontrado viola RN de criticidade Alta nem
  NEG-xxx.
- **Follow-up 1 (documental) — ENCERRADO** por `ceac3be`: RN-007 reescrita, RN-099 atualizada,
  `03-TRACEABILITY_MATRIX.md` alinhada, DEC-087 marcada como superada em parte pela DEC-099 e
  `02-DOMAIN_MODEL.md` corrigido.
- **Follow-up 2 (teste) — ABERTO:** acrescentar os unitários de imutabilidade da entrada e de
  cópia defensiva dos `horarios_paradas` em `semearGradeAPartirDeOutra`, conforme "Testes
  esperados" da TASK-120 e o "Impacto em implementação" da DEC-099. Sem impacto no contrato nem
  no comportamento — é cobertura de regressão.
- **Follow-up 3 (processo, sem ação retroativa):** manter alterações de `docs/specs/**` em commit
  próprio do responsável, separado dos commits de implementação, para o histórico preservar a
  autoria (`docs-dev/04`).
- **Q-xxx abertas relevantes:** nenhuma para esta task. A Q-077 foi decidida pela DEC-099 e o
  pareamento por ordem estável está implementado conforme a decisão.

## Decisão

**Aprovado com ressalvas.** A reavaliação confirma que a TASK-120 entrega o objetivo integral —
ação única `Copiar (sobrescrever)`, confirmação em destino preenchido, cancelamento sem mutação,
remoção dos ausentes, preservação da UUID do destino casado, acréscimo dos faltantes com UUID
nova, destino vazio com UUIDs novas, idempotência e normalização dos discriminadores — com
aderência à Spec 04 §8.4/§8.5, à Spec 03 §9.1 e à DEC-099, e com a suíte canônica verde
reutilizada sem repetição. O commit `ceac3be` encerra a ressalva documental que motivava o
parecer anterior: os derivados `01-RULE_INDEX.md`, `03-TRACEABILITY_MATRIX.md` e
`02-DOMAIN_MODEL.md` deixaram de contradizer a spec vigente, e a DEC-087 está marcada como
superada em parte. Permanece uma única ressalva de baixa severidade — os dois unitários de
imutabilidade/cópia defensiva que a task e a DEC-099 pedem — mais duas observações não
bloqueantes (mistura de spec e derivados no mesmo commit; persistência das âncoras de sessão nas
Viagens casadas). Nenhuma impede o merge nem o avanço para a próxima task; o follow-up 2 deve ser
absorvido pela próxima task que tocar `copias-grade.ts`.
