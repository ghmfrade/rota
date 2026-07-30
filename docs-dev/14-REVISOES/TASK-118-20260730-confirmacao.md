# Confirmação da revisão da TASK-118

**Revisor:** Codex
**Data:** 2026-07-30
**Commit/branch revisado:** branch `redesign`, HEAD `b23a51b`; implementação
`7ac010f`, fundamentação normativa `2a72bd1`

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A geração por headway consulta as Viagens atuais do itinerário e ignora somente
partidas com o mesmo `dia_semana`, `horario_saida` e grade, sem comparar
offsets. As partidas ausentes são criadas com UUID nova e cópia defensiva dos
offsets; a UI preserva o itinerário existente e apresenta aviso não bloqueante
com a quantidade ignorada.

O escopo técnico está em
`src/formulario/viagens/acoes-grade.ts:104`,
`src/formulario/viagens/copias-grade.ts:60` e
`src/formulario/viagens/etapa-viagens.tsx:376`, com regressões unitárias, de
contrato e E2E. A TASK-118, a Q-072 encerrada e a DEC-094 estão versionadas no
commit documental `2a72bd1`.

## Regras RN verificadas

- **RN-004 — atendida.** A guarda não edita nem substitui a Viagem
  preexistente: apenas consulta `viagensExistentes` e devolve as novas
  (`src/formulario/viagens/acoes-grade.ts:104-160`). O unitário preserva
  integralmente o array de existentes
  (`testes/unitarios/formulario/viagens-acoes-grade.test.ts:205`), e o E2E
  confirma UUID e offset da partida preexistente
  (`testes/e2e/etapa-viagens.spec.ts:564`).
- **RN-007 — atendida.** A filtragem ocorre antes de `criarViagem`; somente os
  horários ausentes chegam à fábrica, que gera `crypto.randomUUID()`
  (`src/shared/contrato/fabricas.ts:52`). Há teste de UUIDs novas e distintas
  nas partidas criadas e teste garantindo zero chamadas de `randomUUID` na
  colisão total
  (`testes/unitarios/formulario/viagens-acoes-grade.test.ts:130-157`,
  `testes/unitarios/formulario/viagens-acoes-grade.test.ts:246`).
- **RN-061 — atendida.** A guarda compara dia e os dois discriminadores de grade
  (`viagem_feriado` e `tabela_excepcional_uuid`) em
  `src/formulario/viagens/copias-grade.ts:49-73`; as novas Viagens mantêm o dia
  e a grade da origem (`src/formulario/viagens/acoes-grade.ts:150-155`).
- **RN-062 — atendida.** A guarda é local à geração por headway; schema e
  importação não foram alterados no commit `7ac010f`. O contrato continua
  aceitando duas Viagens no mesmo dia e horário
  (`testes/unitarios/contrato/viagens-horarios.test.ts:43`).
- **RN-063 — atendida.** Cada Viagem nova recebe uma cópia integral e defensiva
  de `horarios_paradas`; a existente não é tocada
  (`src/formulario/viagens/acoes-grade.ts:150-156`).
- **RN-067 — atendida.** A UI continua recebendo headway e limite como horários
  de relógio e normaliza os rascunhos antes de chamar o motor
  (`src/formulario/viagens/etapa-viagens.tsx:380-386`). Nenhum offset foi exposto
  pela entrega.

## Specs verificadas

- **Spec 02 §11 — aderente.** A implementação preserva a estratificação por dia
  e grade e não converte a guarda local em unicidade estrutural. A permissão de
  reforços da spec (`docs/specs/02-esquema-json-operacao.md:376`) permanece
  coberta pelo teste de contrato.
- **Spec 02 §12 — aderente.** Entidades preexistentes conservam identidade e
  somente Viagens realmente novas recebem UUID nova, conforme
  `docs/specs/02-esquema-json-operacao.md:395-402`.
- **Spec 02 §14 — aderente.** Não houve alteração de schema nem inclusão de
  validação de duplicidade.
- **Spec 04 §8.2 — aderente.** A entrada continua em horário de relógio e os
  offsets permanecem internos (`docs/specs/04-formulario-ux-pdf.md:216-221`).
- **Spec 04 §8.3 + DEC-094 — aderente.** O critério compartilhado considera
  dia, horário e grade, preserva o destino e produz aviso não bloqueante
  (`docs-dev/10-DECISION_LOG.md:1050-1087`).

## Pontos corretos

- O predicado compartilhado evita divergência entre as guardas locais de cópia
  e headway (`src/formulario/viagens/copias-grade.ts:60`).
- O filtro ocorre antes da criação da UUID
  (`src/formulario/viagens/acoes-grade.ts:134-157`).
- Colisões de outra grade ou de outro dia não bloqueiam a criação; offsets são
  ignorados na igualdade
  (`testes/unitarios/formulario/viagens-acoes-grade.test.ts:205` e
  `testes/unitarios/formulario/viagens-copias-grade.test.ts:105`).
- Colisão parcial cria apenas os horários ausentes; colisão total é no-op
  observável e repetível
  (`testes/unitarios/formulario/viagens-acoes-grade.test.ts:205-276`).
- O handler acrescenta apenas as novas Viagens, mantém as âncoras efêmeras das
  existentes e avisa quantos horários foram ignorados
  (`src/formulario/viagens/etapa-viagens.tsx:376-421`).
- O E2E confirma mescla parcial, idempotência, UUID/offset preexistentes e
  ausência de chamada ao OSRM
  (`testes/e2e/etapa-viagens.spec.ts:564-633`).

## Problemas encontrados

- Nenhum problema de aderência ou impeditivo.
- Observação não impeditiva: `npm run lint` terminou com código 0 e nenhum
  erro, mas reportou um aviso de variável não utilizada em
  `testes/e2e/etapa-viagens.spec.ts:591` (`viagemUuid`). O aviso não altera a
  execução do teste nem viola RN/NEG ou critério de aceite da TASK-118.

## Violações de escopo

- Nenhuma. O commit de implementação `7ac010f` altera somente o Formulário e
  seus testes; não toca schema, importação, JSON, PDF, Comparador, Ingestor,
  contagens, cálculo de headway ou roteamento.

## Consequências sobre outras tasks

- Nenhuma consequência nova ou dependência impeditiva foi identificada. O
  contrato JSON e as fronteiras entre módulos permanecem inalterados. Não se
  atribui comportamento a outra task nesta confirmação.

## Testes avaliados

- **Cobertura das RN da task:** sim — RN-004, RN-007, RN-061, RN-062, RN-063 e
  RN-067 possuem evidência unitária, contratual e/ou E2E proporcional ao risco.
- **Casos inválidos testados:** sim — headway zero/malformado, limite inválido
  ou anterior, colisão total, outra grade e outro dia.
- **Regressão de UUID:** sim — novas recebem UUIDs distintas; existentes são
  preservadas; colisão total não gera UUID.
- **OSRM mockado:** sim — o E2E intercepta
  `https://router.project-osrm.org/**` e confirma que a chamada não ocorreu.
- **Suíte executada com resultado:** evidência canônica reutilizada após
  `npm run test:all:verificar`: **APROVADO**, executor `Codex`, 97 arquivos e
  1.326 testes unitários aprovados; 93 E2E aprovados, com 1 retry classificado
  como flaky; códigos unitário/E2E 0. Fingerprint
  `de9a38e30fd3fcb8a74128acd56c1e9e23a33ba99c4c6a29c212ed00644e36b9`;
  identidade do working tree
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`.
  O servidor Next próprio da porta 3100 foi encerrado com sua árvore de PID.
  A suíte pesada não foi repetida, conforme o protocolo de revisão.
- **Verificações leves da revisão:** `npm run typecheck` terminou com código 0;
  `npm run lint` terminou com código 0, nenhum erro e o aviso não impeditivo
  descrito acima. O build aprovado consta da evidência canônica reutilizada.

## Checklist 07

### Escopo

- [x] A alteração pertence ao ROTA, e não ao SEI (RN-095).
- [x] Não introduz workflow (RN-095).
- [x] Não cria status de pedido (RN-011).
- [x] Não cria persistência transacional (RN-096).
- [x] Implementa somente o objetivo e respeita o “Fora de escopo”.
- [x] A decisão de negócio está fundamentada na DEC-094 e nas specs citadas.

### JSON (contrato)

- [x] O JSON continua contendo apenas dados de operação (RN-010).
- [x] N/A — a autossuficiência do JSON não foi tocada (RN-009).
- [x] Nenhum campo novo foi adicionado.
- [x] UUIDs das Viagens preexistentes são preservadas (RN-004).
- [x] Viagens novas recebem UUID nova (RN-002/RN-007).
- [x] N/A — referências XOR de Parada não foram tocadas (RN-033).
- [x] N/A — valores monetários não foram tocados (RN-013).
- [x] N/A — distâncias, durações e arredondamento não foram tocados
  (RN-014/RN-050).
- [x] N/A — dados congelados não foram tocados (RN-015).

### Domínio

- [x] N/A — separação Seção/Local não foi tocada (RN-025/RN-031).
- [x] N/A — ponto de rota não foi tocado (RN-042).
- [x] N/A — identidade de Serviço não foi tocada (RN-001).
- [x] N/A — `numero_n` não participa da lógica (RN-006).
- [x] N/A — extremos do itinerário não foram tocados (RN-035).
- [x] N/A — relação Ida/Volta não foi tocada (RN-030).
- [x] N/A — tipificação não foi tocada (RN-019..022).
- [x] A Viagem continua estratificada por um dia e uma grade (RN-061).
- [x] N/A — contagens de feriado não foram tocadas (RN-069).

### Comparador

- [x] N/A — base de comparação não foi tocada (RN-081).
- [x] N/A — classificação de diferenças não foi tocada (RN-081..083).
- [x] N/A — o Comparador e os arquivos de entrada não foram tocados
  (RN-080/RN-097).
- [x] N/A — `status`/datas do diff não foram tocados (RN-012).
- [x] N/A — bloqueio de Autos diferentes não foi tocado (RN-084).
- [x] N/A — comparação de rota não foi tocada (RN-087).
- [x] N/A — o Comparador não faz parte do diff (RN-080).

### Roteamento

- [x] N/A — tratamento de indisponibilidade do OSRM não foi tocado (RN-048).
- [x] N/A — cálculo de distância não foi tocado (RN-047/RN-050).
- [x] N/A — pontos de rota e trechos não foram tocados (RN-041..043).
- [x] N/A — abertura de JSON não foi tocada (RN-052).
- [x] N/A — mensagens de roteamento não foram tocadas (RN-049).

### UI/PDF

- [x] N/A — nomes de Seção não foram tocados (RN-076).
- [x] Usuário continua digitando horários de relógio; offsets não aparecem
  (RN-067/RN-076).
- [x] N/A — matrizes não foram tocadas (RN-076).
- [x] N/A — exibição de Locais não foi tocada (RN-031/RN-044/RN-076).
- [x] N/A — PDF não foi tocado (RN-077).
- [x] N/A — exportação não foi tocada (RN-078).
- [x] UI aderente ao design system: componentes compartilhados, token
  `text-alerta` e ausência de `style=` novo (DEC-050).
- [x] `data-testid`/`aria-*` da entrega foram preservados e a suíte E2E passou
  (DEC-050).

### Testes

- [x] Todas as RN implementadas possuem cobertura na matriz da entrega.
- [x] Casos inválidos e no-op foram testados.
- [x] Há regressão explícita de UUID (RN-004/RN-007).
- [x] O E2E intercepta o OSRM e confirma ausência de chamada.
- [x] Fixtures canônicas são reutilizadas nos testes de contrato e da etapa.
- [x] Testes e build constam da evidência canônica; typecheck e lint foram
  executados nesta revisão e reportados honestamente.
- [x] A evidência final possui marcador, códigos 0, fingerprint e identidade
  válidos.
- [x] A revisão reutilizou o log válido e não repetiu a suíte pesada.
- [x] A porta 3100 foi controlada e a árvore do PID próprio foi encerrada.

**Resultado do checklist:** 23 itens atendidos, 30 N/A, 0 violados.

## Pendências

- Nenhuma. Q-072 está decidida e registrada como DEC-094.

## Decisão

**Aprovado.** As ressalvas documentais anteriores estão resolvidas no commit
`2a72bd1`; a implementação atual permanece aderente às specs, às RN e à
DEC-094, com escopo exato, contrato preservado, testes suficientes e evidência
canônica verde. O aviso isolado de lint não constitui falha nem condição de
merge. A TASK-118 permanece concluída e apta a merge.
