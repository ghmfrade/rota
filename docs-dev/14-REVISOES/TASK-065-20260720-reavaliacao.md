# Revisão da TASK-065 — reavaliação após correção

**Revisor:** Claude (sessão `/revisar-aderencia`, conversa separada da implementação)
**Data:** 2026-07-20
**Commit/branch revisado:** `edf0b44` ("Implementa TASK-065: inverter os gestos do mapa único") +
`6469a04` ("Implementa TASK-065: corrigir E2E de clique direito sobre a linha") — branch `redesign`

> Substitui, para efeito de status, o parecer `TASK-065-20260720.md` (**reprovado**), cuja única
> causa de reprovação — o E2E `etapa-itinerarios.spec.ts:465` vermelho — foi endereçada por
> `6469a04`. Este parecer reavalia a entrega inteira, não só o delta.

## Resultado

- [ ] Aprovado
- [x] **Aprovado com ressalvas**
- [ ] Reprovado

As ressalvas são de **cobertura de teste** e de **robustez do E2E**, não de regra: nenhuma RN Alta e
nenhum NEG-xxx foi violado, o escopo é exato e todas as verificações da superfície da task estão
verdes.

## Resumo da entrega

Inversão dos gestos do mapa único conforme DEC-055. O clique esquerdo deixou de criar Seção — a prop
`aoClicar` simplesmente não é mais passada ao `<Mapa>`
([editor-mapa-itinerario.tsx:328-339](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx#L328-L339))
—, restando `aoClicarNaLinha` (ponto de rota, TASK-063). O clique direito abre o novo
`MenuFlutuante` ([menu-flutuante.tsx](../../src/shared/ui/menu-flutuante.tsx), 145 linhas, exportado
em `src/shared/ui/index.ts`) com exatamente **Seção** e **Local**, que encaminham para os formulários
de criação existentes. `shared/mapa` ganhou o handler de `contextmenu` com âncora de viewport e o
callback `aoClicarDireitoNaLinha`, simétrico ao do esquerdo
([mapa.tsx:224-251](../../src/shared/mapa/mapa.tsx#L224-L251)). A dica de gestos foi reescrita
([editor-mapa-itinerario.tsx:310-314](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx#L310-L314))
e o doc 18 §3 registrou o componente. O commit de correção `6469a04` toca **apenas**
`testes/e2e/etapa-itinerarios.spec.ts` (+38/−4).

## O que mudou desde o parecer anterior

O `6469a04` diagnostica a falha como **do teste, não do produto**: no zoom inicial (Estado inteiro) os
3 marcadores do fixture ficam sobrepostos e cobrem os pixels do primeiro segmento, de modo que o
clique no ponto médio acertava o elemento DOM de um marcador (círculo de 16 px) e **nunca chegava ao
canvas do MapLibre** — daí o menu não abrir. A correção amplia o mapa com `mouse.wheel` em torno do
próprio segmento e clica a **85 % do segmento A→B**
([etapa-itinerarios.spec.ts:501-541](../../testes/e2e/etapa-itinerarios.spec.ts#L501-L541)).

Ponto central da condição nº 1 do parecer anterior — "**não** trocar o alvo do clique para um ponto
fora da linha só para ficar verde": **respeitada**. O alvo continua sobre o segmento entre as duas
paradas; o que mudou foi o zoom e o deslocamento ao longo do mesmo segmento para escapar dos círculos
dos marcadores. Nenhuma linha de produto foi alterada para acomodar o teste.

## Regras RN verificadas

- **RN-042** (ponto de rota sem identidade; o gesto do esquerdo só o cria sobre a linha) —
  **atendida**. `aoClicar` não é mais fornecido ao `<Mapa>`; o clique que não acerta a camada de
  linhas cai em `aoClicarRef.current?.()` indefinido
  ([mapa.tsx:205-222](../../src/shared/mapa/mapa.tsx#L205-L222)). Os vértices continuam identificados
  pelo índice do array, sem `uuid`
  ([editor-mapa-itinerario.tsx:174-182](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx#L174-L182)).
  Coberta por unitário (`editor-mapa-itinerario.test.tsx:301` — `[inválido]`) e por E2E
  (`etapa-itinerarios.spec.ts:386`, que também exige **zero** chamadas ao OSRM) — ambos verdes nesta
  revisão.
- **RN-052** (editar recalcula no "soltar"; abrir não chama OSRM) — **atendida**. `abrirMenuCriacao`
  ([editor-mapa-itinerario.tsx:191-197](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx#L191-L197))
  só mexe em estado local; o recálculo continua nos handlers de criação/arrasto preexistentes.
- **RN-097** (`shared/` reusável; extensão aditiva) — **atendida**. `aoClicarDireitoNaLinha` é opt-in
  e `aoClicarDireito` apenas **ganhou** um segundo parâmetro. Verificado por execução, não só por
  leitura: `mapa-base.spec.ts`, `editor-secoes-350m.spec.ts` e `editor-locais-350m.spec.ts` — os três
  consumidores E2E do `<Mapa>` que não passam os callbacks novos — rodaram **3 passed** nesta revisão.
- **RN-025 / RN-031** (Seção pertence ao Autos, Local ao Serviço; sem conversão implícita — NEG-012)
  — **atendidas**. A escolha do menu decide o tipo antes de qualquer criação e cada ramo chama seu
  motor (`criarSecaoNoPonto` / `criarLocalNoPonto`,
  [editor-mapa-itinerario.tsx:204-240](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx#L204-L240));
  não há caminho que converta um no outro. Unitários cobrem os dois ramos com município derivado.
- **RN-035** (último extremo é Seção) — **preservada**: o aviso continua acendendo quando o Local
  entra no fim, provado pelo E2E `:465` agora verde.
- **RN-004 / RN-007..015** (contrato JSON, UUID) — **N/A verificado**: nenhum arquivo de
  `src/shared/contrato/` nos dois commits; nenhum campo novo; suíte de contrato verde dentro dos 1029
  unitários.

## Specs verificadas

- **Spec 04 §7 / §7.3 item 6** (clique sobre a linha cria vértice arrastável) — **aderente**: o
  esquerdo sobre a linha segue criando ponto de rota, agora sem concorrer com a criação de Seção.
- **Spec 04 §7.1 / §7.2** (formulários de Seção e Local, 350 m, município derivado) — **aderente**:
  motores intocados; muda só quem abre o formulário.
- **Spec 03 §3.6** — **aderente**, inalterado por esta task.
- **DEC-055** — **aderente**: os três itens implementados (esquerdo sobre a linha = ponto de rota;
  esquerdo fora = pan; direito = menu Seção/Local). A inserção posicional continua fora, como manda o
  "Fora de escopo".
- **docs-dev/18 §3/§5/§6** — **aderente**: componente registrado na tabela do §3 (`sombra-3`,
  `radius-controle`, sem backdrop); `style=` inline restrito à posição calculada em runtime (exceção
  do §6.1); `className` no `Botao` só para largura (§6.4); nenhum `data-testid`/`aria-*` existente
  alterado (§6.5) — os 8 nomeados no critério de aceite seguem intactos e os E2E que os usam passam.

## Pontos corretos

- **Exclusão mútua por construção**, com `return` após o hit-test, sem flag de "modo" nem modificador
  de teclado — mesmo padrão já aprovado na TASK-063.
- **`MenuFlutuante` acessível de verdade:** `role="menu"` + `aria-label`, foco na primeira opção ao
  abrir, `ArrowUp`/`ArrowDown`/`Home`/`End`, `Esc`, clique fora e **restauração do foco anterior** na
  desmontagem ([menu-flutuante.tsx:72-114](../../src/shared/ui/menu-flutuante.tsx#L72-L114)).
- **Reposicionamento para caber na viewport** (`useLayoutEffect` + `MARGEM_VIEWPORT`).
- **Diagnóstico do E2E documentado no próprio teste** — o comentário
  ([:501-505](../../testes/e2e/etapa-itinerarios.spec.ts#L501-L505)) explica por que o zoom é
  necessário e afirma que o alvo geométrico do cenário não mudou. É o oposto de "mexer até ficar
  verde".
- **Asserções invertidas com citação da DEC**, não em silêncio: os testes que afirmavam
  "esquerdo → Seção" viraram casos `[inválido]`.

## Problemas encontrados

1. **(Ressalva) O E2E verde não distingue `aoClicarDireitoNaLinha` de `aoClicarDireito`.** Os dois
   callbacks apontam para o **mesmo** `abrirMenuCriacao`
   ([editor-mapa-itinerario.tsx:337-338](../../src/formulario/itinerarios/editor-mapa-itinerario.tsx#L337-L338)),
   então o menu abre igual, acertando a linha ou não. O critério de aceite ("clique direito, sobre a
   linha ou fora, abre o menu") está **provado**; o que continua **sem cobertura em qualquer camada**
   é o hit-test de `contextmenu` sobre a camada de linhas
   ([mapa.tsx:236-249](../../src/shared/mapa/mapa.tsx#L236-L249)) — o unitário dubla o `<Mapa>` e
   testa só o roteamento no editor (`grep` por `aoClicarDireitoNaLinha` retorna apenas o dublê em
   `editor-mapa-itinerario.test.tsx:24,151`, o consumidor e a definição). Isso não bloqueia a 065,
   mas **é da 067** — onde os dois caminhos passam a fazer coisas diferentes — a obrigação de cobrir
   esse hit-test antes de confiar nele.
2. **(Ressalva) O E2E `:465` ficou dependente de heurística de pixels.** Seis passos de
   `mouse.wheel(0, -500)` com `waitForTimeout` fixos e o alvo a 85 % do segmento são valores
   empíricos: mudar tamanho do marcador, zoom inicial ou o fixture pode quebrá-lo de novo. Rodou
   **3/3 verde** nesta revisão (`--repeat-each=3`), então não é flaky hoje; fica o registro.
3. **(Cosmético, herdado) Asserção morta no unitário.** Em
   `testes/unitarios/formulario/editor-mapa-itinerario.test.tsx:303-305` o
   `act(() => capturado.props?.aoClicar?.(P0_COORD))` é no-op — a linha seguinte prova que `aoClicar`
   é `undefined`. Intenção legítima (documentar o gesto que sumiu), chamada inócua. Já era o problema
   3 do parecer anterior, marcado como opcional; segue não corrigido e segue opcional.
4. **(Fora desta task, mas bloqueia a suíte) `etapa-itinerarios.spec.ts:71` falha de forma
   determinística — causa alheia à 065.** O teste exige
   `painel-pendencias → pendencia-item` com contagem **0** (`:117`), mas o fixture
   `carregar-multi-servico.json` produz o alerta *"Serviços 0001-1SU, 0001-2SU sem grade de feriados
   — confirme se é intencional"*, emitido por
   [pendencias.ts:184](../../src/formulario/pendencias/pendencias.ts#L184) e visível no snapshot de
   falha (`test-results/…-composer-REAL-DEC-046--chromium/error-context.md`, "0 bloqueante(s) / 1
   alerta(s)"). Esse alerta entrou com a **TASK-081** (`06a7ed4`, verificado como **ancestral** de
   `edf0b44` via `git merge-base --is-ancestor`), e **nenhum** dos dois commits da 065 toca
   `src/formulario/pendencias/`. Falhou 3/3 em `--repeat-each=3`, sempre na mesma asserção — não é a
   flakiness intermitente descrita no parecer anterior, é um **teste desatualizado em relação à
   TASK-081**. Precisa de task própria; não é retrabalho da 065.

## Violações de escopo

**Nenhuma.** Conferido item a item contra o "Fora de escopo":

- **Inserção posicional (TASK-067)** — não foi feita: `aoClicarDireitoNaLinha` aponta para o mesmo
  `abrirMenuCriacao` do caso fora da linha, sem cálculo de índice; a Parada continua indo para o fim
  (o E2E `:465` prova, exigindo o Local na **última** posição).
- Re-ancoragem (066), gesto de ponto de rota (063), 350 m/reuso/município (060), sync tabela↔mapa
  (064) — nenhum arquivo desses caminhos nos dois commits (`git show --stat`: 8 arquivos em `edf0b44`,
  todos previstos nos "Arquivos prováveis"; 1 arquivo de teste em `6469a04`).
- Contrato JSON — nenhum arquivo de `src/shared/contrato/`.
- Nenhum workflow, status, campo de fluxo ou valor monetário (NEG-001..019).

## Testes avaliados

- **cobertura das RN da task:** sim para RN-042/052/097/025/031 na camada unitária — menu com
  exatamente duas opções, cada escolha abrindo só o seu formulário, município derivado nos dois
  ramos, recusa fora de SP preservada, esquerdo fora da linha inerte, esquerdo sobre a linha criando
  ponto de rota. **Falta** (ressalva 1) o hit-test de `contextmenu` na camada `shared/mapa`.
- **casos inválidos testados:** sim — 4 casos `[inválido]` (esquerdo fora da linha; `Esc` sem
  selecionar; clique fora sem selecionar; fora de SP sem criar).
- **regressão de UUID:** N/A — a task não toca import/export/cópia.
- **OSRM mockado:** sim — nenhum teste fala com o serviço público; o E2E `:386` intercepta
  `router.project-osrm.org/**` e exige zero chamadas.
- **suíte executada com resultado (nesta revisão):**
  - `npm run typecheck` → **sem erros**.
  - `npm run lint` → **sem erros**.
  - `npm test` → **`Test Files 87 passed (87) | Tests 1029 passed (1029)`** (34,5 s) — verde.
  - `npx playwright test testes/e2e/etapa-itinerarios.spec.ts --workers=1` → **8 passed, 1 failed**
    (33,5 s). O único vermelho é o `:71`, do problema 4 (causa na TASK-081). **O `:465`, causa da
    reprovação anterior, passou** — e passou **3/3** em execução isolada com `--repeat-each=3`.
  - `npx playwright test mapa-base.spec.ts editor-locais-350m.spec.ts editor-secoes-350m.spec.ts
    --workers=1` → **3 passed** — nenhum consumidor antigo do `<Mapa>` regrediu.

## Checklist 07

**Resultado: 27 itens ok, 27 N/A, 1 com ressalva (nenhum violado).**

- **Escopo (6):** 6 ok. Não é SEI, não cria workflow, não cria status, não cria persistência, escopo
  exato, nenhuma regra inventada (as cores de marcador são inferência controlada declarada, herdada
  da TASK-060).
- **JSON (10):** 10 N/A — contrato intocado.
- **Domínio (11):** 3 ok (RN-025/031 Seção×Local separadas; RN-042 ponto de rota sem identidade;
  RN-035 extremos-Seção, provado pelo E2E `:465` verde), 8 N/A.
- **Comparador (7):** 7 N/A.
- **Roteamento (5):** 3 ok (RN-041..043 invariante preservado; RN-052 abrir não chama OSRM; RN-048
  inalterado), 2 N/A.
- **UI/PDF (9):** 2 ok (doc 18 §3/§5/§6.1/§6.4; `data-testid`/`aria-*` preservados), 7 N/A.
- **Testes (6):** 5 ok + 1 **com ressalva** → "Toda regra RN alterada possui teste": o roteamento do
  gesto tem teste em todas as camadas **exceto** o hit-test de `contextmenu` em `shared/mapa`
  (ressalva 1). O item "verificações executadas e reportadas honestamente", que reprovou a entrega
  anterior, está **atendido**: a superfície da task está verde e o único vermelho remanescente está
  atribuído, com evidência, a outra task.

## Pendências

Condições e follow-ups (nenhuma delas impede o merge desta task):

1. **Condição para a TASK-067:** cobrir o hit-test de `contextmenu` sobre a camada de linhas
   ([mapa.tsx:236-249](../../src/shared/mapa/mapa.tsx#L236-L249)) **antes** de a 067 fazer o caminho
   "sobre a linha" divergir do "fora da linha". Enquanto os dois abrem o mesmo menu, o caminho é
   invisível para os testes; a partir da 067 ele decide onde a Parada entra.
2. **Abrir task própria para o `etapa-itinerarios.spec.ts:71`** (problema 4): o teste ainda espera
   zero pendências num fixture que hoje produz o alerta de grade de feriados da TASK-081. É
   atualização de asserção de teste, não regra nova — mas exige decidir se o fixture ganha grade de
   feriados ou se a asserção passa a filtrar por severidade.
3. Opcional: limpar a asserção morta do problema 3.

Nenhuma Q-xxx nova. O desenho segue fechado pela DEC-055.

## Decisão

**Aprovado com ressalvas.** A causa única da reprovação anterior foi corrigida da forma certa: o
diagnóstico (marcadores sobrepostos interceptando o evento antes do canvas) é do **teste**, o produto
não foi alterado para acomodá-lo, e o alvo do clique **continua sobre a linha**, como a condição
exigia. Escopo exato, DEC-055 implementada, `shared/` estendido de forma aditiva e comprovadamente
sem regressão nos consumidores antigos, design system respeitado, contrato intocado, 1029 unitários
verdes, typecheck e lint limpos.

As duas ressalvas são explícitas e nenhuma é de regra: (a) o hit-test de `contextmenu` segue sem
teste próprio — vira **condição de entrada da TASK-067**, que é quem passa a depender dele; (b) o
`:465` depende de heurística de pixels e merece vigilância. O vermelho remanescente da suíte (`:71`)
não é desta task: a evidência — alerta de feriados da TASK-081, commit ancestral, nenhum arquivo de
pendências no diff — está registrada acima e vira task própria.
