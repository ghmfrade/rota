# Reavaliação final da TASK-117

**Revisor:** Codex
**Data:** 2026-07-30
**Commit/branch revisado:** `feb82b2` + `bf98389` / `redesign` (`HEAD c09c4e5`)

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

O commit `feb82b2` reancora as operações de dia inteiro nos cabeçalhos
`SEG…DOM`, restringe o `X` à remoção de uma Viagem e recompõe o headway em duas
linhas com máscara temporal e botão lateral. O commit documental `bf98389`
versiona isoladamente a definição da TASK-117, Q-071/DEC-093 e a variante
`alternador` do `Botao`, encerrando a única condição do parecer anterior.

## Regras RN verificadas

- RN-004 — atendida: a task não altera importação nem regenera identidades; as
  regressões canônicas de preservação de UUID permanecem verdes.
- RN-007 — atendida: a ação do cabeçalho delega ao motor
  `copiarDiaParaDiasComGuarda`, que cria as cópias por `criarViagem`
  (`src/formulario/viagens/copias-grade.ts:173`).
- RN-061 — atendida: dia e grade são mantidos separadamente no estado do menu e
  repassados às operações de cópia/remoção
  (`src/formulario/viagens/etapa-viagens.tsx:153`,
  `src/formulario/viagens/etapa-viagens.tsx:1292`).
- RN-062 — atendida: a entrega não introduz unicidade por horário; a regressão
  E2E conserva todos os reforços da origem
  (`testes/e2e/etapa-viagens.spec.ts:1020`).
- RN-063 — atendida: os motores e `horarios_paradas` não foram alterados; a
  cópia continua exercitada pela suíte.
- RN-067 — atendida: os campos recebem horários de relógio, exibem `HH:MM` e só
  habilitam a geração quando ambos são temporalmente válidos
  (`src/formulario/viagens/etapa-viagens.tsx:93`,
  `src/formulario/viagens/etapa-viagens.tsx:1091`).
- RN-096 — atendida: menu, confirmações, modo e rascunhos são estados React
  efêmeros; nenhum backend, endpoint de escrita ou campo JSON foi criado.

## Specs verificadas

- Spec 04 §8.1 — aderente: as grades mantêm as sete colunas semânticas e cada
  `<th scope="col">` contém o botão acessível do respectivo dia
  (`src/formulario/viagens/etapa-viagens.tsx:1150`).
- Spec 04 §8.2 — aderente: a ação “Restaurar sugestão” e a edição por Viagem
  permanecem separadas das operações de dia
  (`src/formulario/viagens/etapa-viagens.tsx:874`).
- Spec 04 §8.3 — aderente: o hover não oferece cópia unitária visível; arrasto e
  atalhos continuam cobertos pelas regressões existentes
  (`testes/e2e/etapa-viagens.spec.ts:1002`,
  `testes/e2e/etapa-viagens.spec.ts:1071`).
- Spec 02 §11 — aderente: cada Viagem continua em um único dia e uma única
  grade, com reforços permitidos.
- Spec 02 §12 — aderente: as cópias continuam entidades novas com UUID nova,
  sem regenerar a identidade da origem.

## Pontos corretos

- O menu do cabeçalho contém exatamente “Copiar para outro dia” e “Apagar o
  dia”, carregando dia e grade até a ação
  (`src/formulario/viagens/etapa-viagens.tsx:1292`).
- O `X` abre uma confirmação restrita à Viagem e preserva
  `data-testid="dialogo-opcoes-apagar"`
  (`src/formulario/viagens/etapa-viagens.tsx:1322`).
- Há regressão própria para apagar somente o dia escolhido na grade de feriados
  (`testes/e2e/etapa-viagens.spec.ts:965`).
- A variante inativa `alternador` e o estado ativo `primario` estão
  implementados, testados e agora documentados
  (`src/shared/ui/botao.tsx:42`,
  `testes/unitarios/shared-ui/botao.test.tsx:44`,
  `docs-dev/18-DESIGN_SYSTEM.md:59`).
- A estrutura de duas linhas, o botão abrangente, a máscara `1 → 00:01`,
  `123 → 01:23`, o inválido `9875 → 98:75` e o bloqueio da geração são
  aferidos no navegador (`testes/e2e/etapa-viagens.spec.ts:482`).
- O componente usado pelo novo menu cobre foco inicial, setas, `Home`/`End`,
  `Esc`, clique fora e restauração do foco
  (`src/shared/ui/menu-flutuante.tsx:53`,
  `testes/unitarios/shared-ui/menu-flutuante.test.tsx:33`).
- `bf98389` contém somente a TASK-117, DEC-093, Q-071 e a alteração pontual do
  design system; `git show --check bf98389` não apontou erro.

## Problemas encontrados

- Nenhum.

## Violações de escopo

- Nenhuma. O commit funcional contém somente os sete arquivos de
  código/testes ligados à TASK-117; o commit documental contém somente seus
  quatro artefatos normativos. Contrato JSON, PDF, Comparador, contagens,
  arrasto e atalhos não foram alterados.

## Testes avaliados

- cobertura das RN da task: sim — identidade, cópia, grade, reforços e offsets
  permanecem cobertos; composição e máscara têm testes unitários e E2E;
- casos inválidos testados: sim — cancelamento, destino vazio, valor temporal
  impossível, headway zero/limite anterior e ausência de cópia no hover;
- regressão de UUID: sim — as regressões canônicas de RN-004/RN-007 e a cópia
  de reforços permanecem verdes;
- OSRM mockado: sim — o E2E intercepta o endpoint e confirma ausência de
  chamada (`testes/e2e/etapa-viagens.spec.ts:482`);
- verificações leves da revisão: `npm run typecheck` e `npm run build` verdes;
  `npm run lint` terminou com código `0` e um aviso sem erro em
  `testes/e2e/etapa-viagens.spec.ts:591`, dentro do cenário da TASK-118 e fora
  do diff funcional da TASK-117;
- suíte executada com resultado: verde — `npm run test:all:verificar`
  reaproveitou, sem repetição, o log canônico do executor `Codex`, com 97
  arquivos/1.326 testes unitários e 93 E2E aprovados, códigos Vitest/Playwright
  `0` e marcador final aprovado;
- evidência: fingerprint
  `de9a38e30fd3fcb8a74128acd56c1e9e23a33ba99c4c6a29c212ed00644e36b9`;
  working tree
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`;
- infraestrutura: a evidência registra a porta dedicada livre e os processos
  próprios encerrados; nenhum servidor alheio foi reutilizado ou finalizado.

## Checklist 07

**Resultado:** 24 itens atendidos, 29 N/A, 0 violados.

### Escopo

- [x] Pertence ao ROTA, não ao SEI (RN-095).
- [x] Não introduz workflow (RN-095).
- [x] Não cria status de pedido (RN-011).
- [x] Não cria persistência transacional (RN-096).
- [x] Implementa apenas o escopo da TASK-117.
- [x] Não inventa regra: a interação deriva da DEC-093.

### JSON (contrato)

- [x] Continua contendo apenas dados de operação (RN-010).
- [x] Continua autossuficiente (RN-009).
- [x] Nenhum campo novo foi adicionado.
- [x] UUIDs existentes permanecem preservadas (RN-004).
- [x] Cópias continuam recebendo UUID nova (RN-002/RN-007).
- [N/A] Referência Seção/Local de Paradas não foi alterada (RN-033).
- [N/A] Valores monetários não pertencem à superfície alterada (RN-013).
- [N/A] Distâncias/durações/arredondamento não foram alterados
  (RN-014/RN-050).
- [N/A] Dados congelados não são recalculados nesta task (RN-015).

### Domínio

- [N/A] Separação Seção/Local não foi alterada (RN-025/RN-031).
- [N/A] Pontos de rota não foram alterados (RN-042).
- [N/A] Identidade de Serviço não foi alterada (RN-001).
- [N/A] `numero_n` não participa da alteração (RN-006).
- [N/A] Extremos de itinerário não foram alterados (RN-035).
- [N/A] Relação de Seções entre Ida/Volta não foi alterada (RN-030).
- [N/A] Tipo/característica não foram alterados (RN-019..022).
- [x] Viagem continua estratificada por dia e grade (RN-061).
- [N/A] Contagens de feriado não foram alteradas (RN-069).

### Comparador

- [N/A] Base de comparação por UUID (RN-081).
- [N/A] Taxonomia do diff (RN-081..083).
- [N/A] Comparativo fora do JSON (RN-080/RN-097).
- [N/A] `status`/datas fora do diff (RN-012).
- [N/A] Bloqueio por Autos diferente (RN-084).
- [N/A] Comparação estável de rota (RN-087).
- [N/A] Ausência de OSRM/persistência no Comparador (RN-080).

### Roteamento

- [N/A] Tratamento de OSRM indisponível (RN-048).
- [N/A] Origem/conversão de distância roteada (RN-047/RN-050).
- [N/A] Invariante de pontos de rota/trechos (RN-041..043).
- [N/A] Abertura sem OSRM (RN-052).
- [N/A] Mensagens de roteamento (RN-049).

### UI/PDF

- [N/A] Padrão de nome de Seção não foi alterado (RN-076).
- [x] Usuário digita horários de relógio, não offsets (RN-067/RN-076).
- [N/A] Matrizes não foram alteradas (RN-076).
- [N/A] Exibição de Locais não foi alterada (RN-031/RN-044/RN-076).
- [N/A] PDF não foi alterado (RN-077).
- [N/A] Exportação não foi alterada (RN-078).
- [x] UI usa `shared/ui`, tokens e variante por prop, sem `style=` local
  indevido (DEC-050).
- [x] `data-testid`/`aria-*` existentes foram preservados (DEC-050).

### Testes

- [x] Regras RN aplicáveis possuem regressão.
- [x] Há casos inválidos.
- [x] Há regressão de UUID aplicável (RN-004/RN-007).
- [x] OSRM é interceptado e não é acessado no cenário alterado.
- [x] Fixtures canônicas foram reutilizadas.
- [x] Verificações foram reportadas honestamente.
- [x] A evidência final veio de uma única execução canônica válida.
- [x] A revisão reutilizou o log válido sem repetir a suíte.
- [x] Porta e processos próprios foram limpos.

## Pendências

- Nenhuma condição de merge permanece para a TASK-117.
- Nenhuma Q-xxx funcional permanece aberta; Q-071 está decidida pela DEC-093.

## Decisão

**Aprovado.** O código atende às specs, RN, critérios de aceite, requisitos
negativos e escopo, com cobertura válida e suíte canônica verde. O commit
`bf98389` fecha integralmente a ressalva documental do parecer anterior sem
misturar artefatos de outras tasks. A TASK-117 pode sair da fila de pendentes e
ser marcada como concluída.
