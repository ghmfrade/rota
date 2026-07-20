# Revisão da TASK-083 (reavaliação)

**Revisor:** Claude
**Data:** 2026-07-20
**Commit/branch revisado:** `12dc3b3` (`redesign`) — diff acumulado `a52dadc..12dc3b3`
**Substitui:** `docs-dev/14-REVISOES/TASK-083-20260720.md` (reprovado em `a12db0c`)

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

`reancorarPontosDeRota` passa a descartar, no caminho de remoção, os pontos cujo
`apos_parada_ordem` reancorado cai fora de `[1, paradas.length − 1]` — exatamente
os órfãos do trecho terminal quando a Parada removida é um extremo (DEC-068).
`EtapaItinerarios` exibe um aviso efêmero (`role="status"`) por Serviço/sentido
quando a reancoragem automática reduz a contagem de pontos. O commit `12dc3b3`
fecha as duas pendências da reprovação anterior: acrescenta
`testes/unitarios/formulario/etapa-itinerarios.test.tsx` (217 linhas), que
renderiza a etapa real, remove Parada de extremo pela tabela lateral e comprova
o aviso e seu caráter não bloqueante.

## Regras RN verificadas

- **RN-042 — atendida, agora com cobertura completa.** O filtro está em
  [reancorar-pontos-de-rota.ts:135-139](src/formulario/roteamento/reancorar-pontos-de-rota.ts#L135-L139),
  usando `limiteSuperiorExclusivo = chavesParadasDepois.length`. Os quatro
  caminhos e a pós-condição estão em
  [roteamento-reancorar-pontos-de-rota.test.ts:70-150](testes/unitarios/formulario/roteamento-reancorar-pontos-de-rota.test.ts#L70-L150).
  Verifiquei manualmente os ramos `insercao` e `reordenacao`: nenhum pode
  produzir valor fora do intervalo, então o docstring de pós-condição deixou de
  ser overclaim.
- **RN-048 — atendida.** A rede em `cliente-osrm.ts` não foi tocada pelo diff
  (`git diff a52dadc..12dc3b3 -- src` mostra só dois arquivos alterados) e o
  caso de JSON importado corrompido continua coberto em
  [itinerarios-estado.test.ts:248](testes/unitarios/formulario/itinerarios-estado.test.ts#L248).
- **RN-041 — atendida.** O descarte não cria nem remove trechos; o recálculo usa
  apenas as Paradas restantes.
- **RN-004..007 — N/A.** Não há importação, cópia ou criação de entidade.
- **RN-010/RN-011 — atendidas.** Nenhum campo novo no contrato. O aviso vive em
  `useState` local
  ([etapa-itinerarios.tsx:127](src/formulario/itinerarios/etapa-itinerarios.tsx#L127)),
  fora da sessão e do JSON — confirmado por `grep` de `descartePontoDeRota` em
  `src/`, que só encontra ocorrências dentro de `etapa-itinerarios.tsx`.
- **RN-095/RN-096 — atendidas.** Sem workflow, sem persistência transacional.

## Specs verificadas

- **Spec 02 §10.4 — aderente.** O intervalo `[1, paradas.length − 1]` é o mesmo
  predicado que `validacoes-estruturais.ts:317` cobra do documento; a função
  passa a garanti-lo na origem.
- **Spec 03 §3.6/§3.6.1/§3.6.2 — aderente.** O ponto continua sem identidade,
  sem virar Parada e sem gerar trecho.
- **Spec 04 §11 — aderente.** O aviso não entra na lista fechada de pendências:
  o teste da etapa chama `coletarPendencias` após a remoção e exige
  `bloqueantes == []`
  ([etapa-itinerarios.test.tsx:186-190](testes/unitarios/formulario/etapa-itinerarios.test.tsx#L186-L190)).
- **DEC-068 — cumprida integralmente:** descarte + aviso, ambos verificados.

## Pontos corretos

- O descarte é derivado da pós-condição da RN-042, não de uma detecção paralela
  de "extremo" — o mesmo filtro cobre também o caso degenerado de restar uma
  única Parada (nenhum trecho, todos os pontos descartados).
- O aviso só é recalculado quando a reancoragem é automática
  (`reancoragemAutomatica = opcoes.pontosDeRota === undefined`,
  [etapa-itinerarios.tsx:355](src/formulario/itinerarios/etapa-itinerarios.tsx#L355)),
  evitando falso positivo em edição explícita de pontos.
- O novo teste de etapa mantém a `EtapaItinerarios` real e mocka apenas o filho
  MapLibre, os dados estáticos e o `fetch` — nenhuma chamada ao OSRM real,
  conforme a stack fixada.
- Cobre o negativo: remoção do **meio** não exibe o aviso e preserva o ponto
  fundido
  ([etapa-itinerarios.test.tsx:196-215](testes/unitarios/formulario/etapa-itinerarios.test.tsx#L196-L215)).
- Design system respeitado: classe `text-alerta`, token existente
  (`--color-alerta` em `src/app/globals.css:23`), sem `style=` inline; nenhum
  `data-testid`/`aria-*` preexistente foi alterado.

## Problemas encontrados

Nenhum impeditivo.

### Observações não impeditivas

1. **Baixa — rótulo de teste.** O caso de remoção do meio está prefixado
   `[inválido]` em `etapa-itinerarios.test.tsx:196`, mas é um caso válido de
   regressão-guarda. Cosmético, não afeta a cobertura.
2. **Baixa — ciclo de vida do aviso.** O booleano por Serviço/sentido só é
   reavaliado no próximo gesto de reancoragem automática daquele par; não há
   dispensa explícita nem limpeza ao alternar Serviço/sentido e voltar. A
   DEC-068 exige apenas "aviso não bloqueante" e não define dispensa — não há
   regra a inventar aqui, fica registrado como comportamento conhecido.

## Sobre a suíte vermelha da revisão anterior

A reprovação de `a12db0c` registrou 19 suítes `.tsx` falhando com
`Cannot find module '/@fs/C:/Projetos/ROTA/...'`. Nesta revisão, `npm test --
--run` terminou **verde: 85 arquivos, 1017 testes**. O diff `a12db0c..12dc3b3`
não toca `vitest.config.ts`, `package.json` nem `tsconfig.json` (verificado com
`git diff --stat`), o que confirma o diagnóstico da revisão anterior: a falha era
de ambiente/cache de resolução, não do código da task.

## Violações de escopo

- Nenhuma. O diff acumulado toca 2 arquivos de `src/` e 3 de `testes/`, todos
  previstos pela task. Nada do "Fora de escopo" foi alterado: `cliente-osrm.ts`,
  os demais caminhos de `reancorarPontosDeRota`, `secao.servicos[]` (TASK-084) e
  o contrato JSON permanecem intactos.

## Consequências sobre outras tasks

- **TASK-066** — a ressalva que originou esta task está fechada: a pós-condição
  do docstring agora vale pela própria função.
- **TASK-084 / TASK-088** — tocam a mesma ação de remover Parada, mas em outros
  campos (`secao.servicos[]`, `matriz_seccionamento`). Não conferi o código
  dessas tasks nesta revisão; a única interação previsível é convivência no mesmo
  gesto, sem conflito de arquivo.
- **TASK-067 / TASK-079** — consomem `reancorarPontosDeRota`; passam a poder
  assumir a pós-condição de intervalo. **Não verificado nesta revisão** se já
  existe código dessas tasks dependendo do comportamento antigo.

## Testes avaliados

- cobertura das RN da task: **completa** — descarte nos dois extremos,
  preservação no meio, pós-condição em todos os caminhos, exibição do aviso e
  caráter não bloqueante;
- casos inválidos testados: **sim** — gesto não atômico lança com `/RN-042/`;
  ponto importado fora do intervalo continua caindo na rede da RN-048;
- regressão de UUID: **N/A**;
- OSRM mockado: **sim** — `vi.stubGlobal("fetch", ...)` no teste de etapa,
  `fetchFn` mockado em `itinerarios-estado.test.ts`;
- suíte executada com resultado: **verde** — `npm test -- --run`: 85 arquivos,
  1017 testes, 0 falhas; `npm run typecheck`: verde; `npm run lint`: verde.

## Checklist 07

**Resultado: 18 itens OK, 32 N/A, 0 violados.**

### Escopo

- RN-095, sem gestão do SEI: **OK**.
- RN-095, sem workflow: **OK**.
- RN-011, sem status de pedido: **OK**.
- RN-096, sem persistência transacional: **OK**.
- somente escopo da task: **OK**.
- nenhuma regra inventada: **OK** — o comportamento vem da DEC-068.

### JSON (contrato)

- somente dados de operação: **OK**.
- autossuficiência de leitores: **N/A**.
- nenhum campo novo: **OK**.
- preservação de UUID importada: **N/A**.
- UUID nova para entidade nova/cópia: **N/A**.
- XOR Seção/Local: **N/A**.
- nenhum valor monetário: **OK**.
- unidades e half-up: **N/A**.
- dados congelados não recalculados por leitores: **N/A**.

### Domínio

- Seção e Local separados: **N/A**.
- ponto de rota não tratado como entidade/Parada/trecho: **OK**.
- identidade de Serviço por UUID: **N/A**.
- `numero_n` fora da identidade: **N/A**.
- extremos como Seções: **N/A**.
- conjunto de Seções Ida/Volta: **N/A**.
- tipificação: **N/A**.
- estratificação de Viagem: **N/A**.
- feriado fora das contagens: **N/A**.

### Comparador

- Os sete itens de comparação, diff, `status`, Autos, rota estável e ausência de
  OSRM/persistência: **N/A**.

### Roteamento

- falha do OSRM sem fallback: **OK** — defesa da RN-048 preservada.
- distância exclusivamente do OSRM: **N/A** — caminho existente não alterado.
- pontos somente condicionam traçado e preservam contagem: **OK**.
- abrir JSON sem OSRM: **N/A**.
- mensagens de erro da Spec 04 §14: **N/A**.

### UI/PDF

- nomes de Seção: **N/A**.
- horários/offsets: **N/A**.
- matrizes: **N/A**.
- Locais no PDF/grade: **N/A**.
- aviso SEI no PDF: **N/A**.
- bloqueio de exportação: **N/A**.
- design system: **OK** — token `text-alerta`, sem `style=` inline.
- seletores e `aria-*` existentes preservados: **OK**.

### Testes

- toda regra implementada possui teste: **OK**.
- casos inválidos: **OK**.
- regressão UUID: **N/A**.
- OSRM mockado: **OK**.
- fixtures canônicas: **OK** — o teste de etapa parte de
  `documentoExemploMinimo()` (`testes/fixtures/spec02-15-exemplo-minimo.json`),
  sem inventar JSON de contrato.
- verificações executadas e verdes: **OK**.

## Pendências

Nenhuma condição impeditiva. Sugestões opcionais para uma próxima passagem pela
etapa (não são condições desta aprovação): renomear o rótulo `[inválido]` do
teste de remoção do meio e decidir, se algum dia a spec pedir, o ciclo de
dispensa do aviso.

## Decisão

**Aprovado.** As duas causas da reprovação anterior foram sanadas: o aviso da
DEC-068 passou a ter teste que renderiza a etapa real e comprova o caráter não
bloqueante, e a suíte completa está verde junto com typecheck e lint. O escopo
permanece exato e nenhuma RN Alta ou NEG-xxx foi violada.
