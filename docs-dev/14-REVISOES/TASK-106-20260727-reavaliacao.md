# Reavaliação da TASK-106

**Revisor:** Codex
**Data:** 2026-07-27
**Commit/branch revisado:** `75f2afa` (`redesign`), sobre a implementação
`c2db60a`, o parecer anterior `00c28ca` e o alinhamento documental
`1cef2ae`/`6ebbf82`

## Resultado

- [ ] Aprovado
- [x] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A entrega reconstrói a etapa Viagens como grade tabular compacta, ordenada por
`horario_saida`, com campos textuais HH:MM, seleção persistente de uma Viagem,
ações no hover e navegação Tab/Enter. A correção `75f2afa` fecha as três
divergências funcionais da revisão anterior — superfície contínua, Enter entre
Viagens e Tab vazio→vazio — e remove “Apagar bloco” conforme a DEC-088.

O núcleo está em `src/formulario/viagens/etapa-viagens.tsx`,
`campo-horario-grade.tsx` e `montagem-grade.ts`; a densidade compacta de
`Campo`/`Select` está em `src/shared/ui/`. Código, testes e verificações estão
verdes. Resta uma ressalva documental: as novas props públicas
`densidade="compacta"` de `Campo` e `Select` não foram registradas no contrato
visual de `docs-dev/18-DESIGN_SYSTEM.md`.

## Regras RN verificadas

- **RN-061 — atendida.** Cada célula preenchida continua sendo uma Viagem de um
  único dia; criação, seleção e remoção operam pela UUID da Viagem. A retirada
  de “Apagar bloco” evita tratar o alinhamento ordinal como unidade operacional.
- **RN-062 — preservada.** A ordenação tolera partidas com mesmo
  `horario_saida`, usando UUID apenas como desempate determinístico, sem criar
  validação de unicidade (`montagem-grade.ts:91-95`).
- **RN-063 — atendida.** A grade lê o horário absoluto pelo
  `horarios_paradas` da Viagem e a edição passante permanece delegada ao motor
  existente; o caso ausente retorna `undefined` e tem teste
  (`montagem-grade.ts:126-132`).
- **RN-064 — atendida com teste.** Digitar na primeira Seção continua criando a
  Viagem com a sugestão inicial; E2E em
  `testes/e2e/etapa-viagens.spec.ts:155`.
- **RN-065 — atendida com caso inválido.** Horário passante fora de ordem é
  recusado, mantém a célula em erro e não confirma; E2E em
  `testes/e2e/etapa-viagens.spec.ts:197`.
- **RN-066 — atendida com teste.** O reset por Viagem e em lote foi preservado;
  o E2E da edição passante comprova o reset por Viagem.
- **RN-067 — atendida.** O usuário digita horário de relógio em campo textual,
  recebe HH:MM e nunca vê `offset_horario`; entradas fora de 00:00–23:59 são
  rejeitadas (`horario-relogio.ts:37-62`,
  `campo-horario-grade.test.tsx:57-75`).
- **RN-068/RN-069 — preservadas no recorte atual.** As grades comum e de
  feriado continuam separadas e a legenda mantém a exclusão de feriado e
  operação excepcional das contagens da semana padrão
  (`etapa-viagens.tsx:627-632`).
- **RN-095/RN-096 — atendidas.** Seleção, hover, rascunho e erros são estados
  efêmeros client-side; não há workflow, backend ou persistência transacional.

## Specs verificadas

- **Spec 04 §2.4–§2.5 — aderente.** Horários absolutos são exibidos/digitados e
  offsets permanecem ocultos.
- **Spec 04 §8.1 — aderente.** Linhas são Seções no padrão oficial, colunas são
  SEG…DOM, Viagens são ordenadas temporalmente por dia e alinhadas por posição
  ordinal; a seleção usa bordas laterais contínuas, topo só na primeira Seção e
  base só na última (`etapa-viagens.tsx:323-366`).
- **Spec 04 §8.2 — aderente.** Digitar na primeira Seção cria a Viagem; edição
  passante, redistribuição e bloqueio fora de ordem permanecem ativos.
- **Spec 04 §8.3 — aderente ao texto vigente.** “X” apaga uma única Viagem; o
  motor/UI/testes de “Apagar bloco” foram removidos conforme DEC-088
  (`copias-grade.ts:69-74`, `etapa-viagens.tsx:248-256`).
- **Design system DEC-050 — aderente no código, divergente na documentação.**
  A UI usa componentes de `shared/ui`, tokens e nenhuma ocorrência de
  `style=` inline/valor hexadecimal foi encontrada no diff. Porém
  `CampoProps.densidade` e `SelectProps.densidade`
  (`src/shared/ui/campo.tsx:20-29`, `src/shared/ui/select.tsx:20-30`) não foram
  documentadas na linha `Campo / Select` de `docs-dev/18-DESIGN_SYSTEM.md`,
  contrariando a instrução expressa do §6.4 para registrar variantes novas.

## Pontos corretos

- A seleção é uma única superfície vertical: todas as células da mesma UUID
  recebem fundo e bordas laterais; somente a primeira recebe borda superior e
  somente a última, inferior. O E2E exige início/meio/fim e rejeita o antigo
  `ring-2` por célula (`testes/e2e/etapa-viagens.spec.ts:62-97`).
- `destinoNavegacaoGrade` mantém Tab no mesmo bloco/Seção e faz Enter avançar
  para a primeira Seção do bloco seguinte após a última Seção
  (`montagem-grade.ts:37-57`).
- A célula criável vazia pode iniciar Tab sem disparar criação inválida
  (`campo-horario-grade.tsx:48-61`), coberta em unitário e no percurso E2E
  terça→quarta (`campo-horario-grade.test.tsx:104-127`,
  `etapa-viagens.spec.ts:99-103`).
- O E2E percorre Enter da última Seção da primeira Viagem à segunda e desta até
  a célula criável (`testes/e2e/etapa-viagens.spec.ts:105-122`).
- As ações aparecem e somem com hover sem apagar a seleção; o “X” remove apenas
  a Viagem selecionada. A ausência de `apagar-bloco` também está protegida por
  E2E (`testes/e2e/etapa-viagens.spec.ts:89-97,274-298`).
- Não há chamada ao OSRM pela grade; os E2E com interceptação confirmam zero
  chamadas ao endpoint público.
- Typecheck, lint, build e a suíte canônica completa estão verdes.

## Problemas encontrados

1. **Baixa — variante visual pública não documentada (DEC-050).**
   `Campo` e `Select` ganharam a prop pública `densidade` com a variante
   `compacta`, implementada e testada, mas o contrato visual correspondente em
   `docs-dev/18-DESIGN_SYSTEM.md:60` ainda descreve somente o controle padrão.
   O §6.4 do mesmo documento determina que toda variante nova seja adicionada
   por prop **e documentada ali** (`docs-dev/18-DESIGN_SYSTEM.md:100`). Não há
   violação de RN de criticidade Alta nem de NEG-xxx, e o comportamento da grade
   está correto; por isso o desvio resulta em ressalva, não reprovação.

## Violações de escopo

- Nenhuma ampliação material. Campo textual, densidade, seleção, hover,
  navegação e ordenação pertencem ao objetivo da TASK-106.
- A remoção de `apagarBloco` está autorizada pela DEC-088 e pela Spec 04 §8.3
  vigente; `apagarViagem` e a futura operação de coluna permanecem distintas.
- Não foram implementados os gestos das TASK-107..112, contrato JSON,
  contagens, PDF ou Comparador.

## Consequências sobre outras tasks

- **TASK-107..111:** os arquivos dessas tasks declaram a TASK-106 como
  dependência (`docs-dev/06-BACKLOG_INICIAL.md:5433-5435,5500-5502,
  5569-5571,5637-5639,5705-5707`). A fundação funcional está corrigida, mas o
  ciclo da 106 permanece pendente até a condição documental desta ressalva.
- **TASK-112:** seu arquivo depende da TASK-105/104/102 e do alinhamento
  DEC-087, não da TASK-106 (`docs-dev/06-BACKLOG_INICIAL.md:5721-5727,
  5778-5780`); permanece fora desta condição.

## Testes avaliados

- **Cobertura das RN da task:** sim — RN-061/062/063/064/065/066/067 e
  preservação de RN-068/069 no recorte atual.
- **Casos inválidos testados:** sim — horário textual inválido, horário
  passante fora de ordem, parada inexistente e fronteiras de navegação.
- **Regressão de UUID:** N/A para esta task; contrato/import/export não foram
  alterados. Criação/cópia continuam cobertas pela suíte existente.
- **OSRM mockado:** sim — nenhuma dependência do serviço público; E2E verifica
  zero chamadas.
- **Suíte executada com resultado:** verde, reutilizada após
  `npm run test:all:verificar`: executor `Codex`, 95 arquivos/1.279 testes
  unitários e 76 E2E, códigos 0, fingerprint
  `8016e9533e286b852b0e165632bc5379188340f1d8e3c587508723b1828d6e25`,
  identidade do working tree
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`.
  A suíte pesada não foi repetida; porta 3100 e árvore do PID próprio foram
  encerradas pelo executor.
- **Verificações leves da revisão:** `npm run typecheck`, `npm run lint` e
  `npm run build` executados em 2026-07-27, todos verdes.

## Checklist 07

Resultado: **28 itens OK, 24 N/A, 1 violado**.

### Escopo

| Item | Estado | Evidência |
|---|---|---|
| Alteração pertence ao ROTA, não ao SEI (RN-095) | OK | Edição operacional de Viagens. |
| Não introduz workflow | OK | Nenhum fluxo/processo no diff. |
| Não cria status de pedido (RN-011) | OK | Nenhum status novo. |
| Não cria persistência transacional (RN-096) | OK | Estado client-side e sessão local. |
| Implementa apenas o escopo da task | OK | Diff restrito à grade, componentes necessários e testes. |
| Nenhuma regra nova inventada | OK | Comportamento sustentado pela Spec 04 §8, TASK-106 e DEC-088. |

### JSON (contrato)

| Item | Estado | Evidência |
|---|---|---|
| JSON só com dados de operação (RN-010) | OK | Contrato intocado. |
| JSON autossuficiente (RN-009) | OK | Nenhuma dependência externa nova. |
| Nenhum campo sem Spec 02 | OK | Zero campo novo. |
| UUIDs existentes preservadas (RN-004) | OK | Edições e seleção usam UUID existente. |
| Entidades novas recebem UUID nova (RN-002/007) | OK | Criação continua no factory existente; suíte verde. |
| XOR de Parada (RN-033) | N/A | Estrutura de Parada não alterada. |
| Sem R$ (RN-013) | OK | E2E específico verde. |
| Unidades/arredondamento (RN-014/050) | N/A | Distância/duração fora do diff. |
| Congelados não recalculados por leitores (RN-015) | N/A | Nenhum leitor alterado. |

### Domínio

| Item | Estado | Evidência |
|---|---|---|
| Seção e Local separados (RN-025/031) | OK | `linhasSecoes` mantém apenas Seções na grade. |
| Ponto de rota não vira Parada (RN-042) | N/A | Fora do diff. |
| Serviço mantém UUID (RN-001) | N/A | Serviço intocado. |
| `numero_n` não é identidade (RN-006) | N/A | Não usado como chave da grade. |
| Extremos continuam Seções (RN-035) | N/A | Itinerário não alterado. |
| Ida/Volta compartilham Seções (RN-030) | N/A | Conjunto de Seções não alterado. |
| Tipificação respeitada (RN-019..022) | N/A | Fora do escopo. |
| Viagem estratificada (RN-061) | OK | Dia/feriado/UUID preservados na grade. |
| Feriado fora das contagens (RN-069) | OK | Legenda da semana padrão preservada. |

### Comparador

| Item | Estado |
|---|---|
| UUID como base (RN-081) | N/A |
| Taxonomia de diff (RN-081..083) | N/A |
| Comparativo não gravado (RN-080/097) | N/A |
| Status/datas fora do diff (RN-012) | N/A |
| Autos diferentes bloqueados (RN-084) | N/A |
| Rota por sinais estáveis (RN-087) | N/A |
| Sem OSRM/persistência no Comparador (RN-080) | N/A |

### Roteamento

| Item | Estado | Evidência |
|---|---|---|
| OSRM indisponível bloqueia rota inválida (RN-048) | N/A | Edição de rota fora do diff. |
| Distância vem do OSRM (RN-047/050) | N/A | Distâncias intocadas. |
| Pontos de rota só condicionam traçado (RN-041..043) | N/A | Fora do diff. |
| Abrir JSON não chama OSRM (RN-052) | OK | E2E da grade confirma zero chamada. |
| Mensagens §14 sem tarifa (RN-049) | N/A | Falhas de rota intocadas. |

### UI/PDF

| Item | Estado | Evidência |
|---|---|---|
| Nome `Cidade - Nome da Seção` (RN-076) | OK | Reusa `nomeExibicaoSecao`. |
| Horário de relógio; offsets ocultos (RN-067/076) | OK | Campo textual e conversores. |
| Matrizes triangulares/sem R$ | N/A | Fora do escopo. |
| Locais fora da grade principal (RN-031/044/076) | OK | `linhasSecoes` e teste. |
| Aviso SEI no PDF (RN-077) | N/A | PDF intocado. |
| Gate de exportação (RN-078) | N/A | Exportação intocada. |
| Design system (DEC-050) | **VIOLADO** | Código usa props/tokens corretamente, mas a variante pública `densidade` não foi documentada no doc 18 §3/§6.4. |
| `data-testid`/`aria-*` preservados (DEC-050) | OK | Suíte verde; remoção de `apagar-bloco` autorizada pela DEC-088. |

### Testes

| Item | Estado | Evidência |
|---|---|---|
| RN alteradas/implementadas possuem teste | OK | RN da task cobertas em unitário/E2E. |
| Casos inválidos testados | OK | Horário inválido, fora de ordem e bordas cobertos. |
| Regressão UUID quando aplicável | N/A | Import/export/cópia não alterados. |
| Roteamento usa mock | OK | Zero dependência do OSRM público. |
| Fixtures canônicas reutilizadas | OK | E2E usa `carregar-multi-servico.json`. |
| Direcionados/typecheck/lint/build reportados | OK | Verificações verdes. |
| Evidência final canônica válida | OK | Fingerprint, identidade, marcador e códigos 0 confirmados. |
| Revisão reutilizou log válido | OK | Suíte pesada não repetida. |
| Porta/PIDs próprios encerrados | OK | Log registra cleanup da árvore do PID próprio. |

## Pendências

- **Condição de merge:** documentar no item `Campo / Select` de
  `docs-dev/18-DESIGN_SYSTEM.md` as variantes `densidade="padrao"` e
  `densidade="compacta"` e seus preenchimentos, conforme o §6.4 do próprio
  design system.
- Nenhuma Q-xxx aberta e nenhuma correção funcional pendente.
- Após cumprir a condição documental, atualizar este parecer/status sem
  reexecutar a suíte pesada se o verificador continuar aceitando o mesmo
  fingerprint.

## Decisão

**Aprovado com ressalvas.** As três falhas que reprovaram a entrega original
foram corrigidas e protegidas por testes válidos; “Apagar bloco” foi removido
conforme DEC-088; as RN de Viagem/horário permanecem atendidas; e todas as
verificações técnicas estão verdes. Não há violação de RN Alta nem de NEG-xxx.

A única divergência é documental e de baixa severidade: a API visual pública
criada em `Campo`/`Select` não foi registrada no design system vinculante. A
TASK-106 permanece na lista de pendentes, e as TASK-107..111 continuam
aguardando o fechamento desta condição, até que a documentação seja alinhada.
