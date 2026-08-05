# Revisão da TASK-132 — rodada de correção 1

**Revisor:** Claude (revisão de aderência, conversa separada da implementação e da correção)
**Data:** 2026-08-04
**Commit/branch revisado:** `c3b9628` na branch `orquestracao/20260805-0057`
(correção sobre `81d5654`; `git show --stat`: 2 arquivos, +70/−32)
**Parecer anterior:** `14-REVISOES/TASK-132-20260804.md` — *aprovado com ressalvas*, com
**uma condição de merge** (cobertura de "fora de SP" na criação inline) e **um follow-up não
impeditivo** (rateio de largura dos campos).

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A correção fecha as duas ressalvas e nada além disso. No teste
(`testes/unitarios/formulario/etapa-itinerarios.test.tsx:37-57`), o polígono sintético de
`RECURSOS_MUNICIPIO_TESTE` deixa de cobrir o globo e passa a ser a caixa lng [-60,-40] × lat
[-30,-20]; o teste "fora de SP" da criação inline troca o ponto impossível `{lng:200, lat:100}`
por `{lng:-55, lat:-10}` — **em faixa válida**, logo atravessa a validação nova e exercita a
derivação real de município — e passa a asseverar a **mensagem** (`MENSAGEM_FORA_DE_SP_LOCAL`),
não só a presença do elemento (`:2541-2578`); um teste irmão novo cobre o mesmo caminho para
**Seção** (`MENSAGEM_FORA_DE_SP_SECAO`, `:2582-2604`). Na UI
(`src/formulario/itinerarios/etapa-itinerarios.tsx:1409-1430`), o `flex-1` sai do `className`
do `Campo` e vai para um `div` wrapper `flex-1 min-w-0` em volta de cada campo.

## Regras RN verificadas

- **RN-096 / Spec 03 §2.3** (recusa "fora de SP" preservada na criação inline) — **atendida e
  agora provada.** `criarSecaoNoPonto` (`src/formulario/secoes/fluxos-secao.ts:146-155`) e
  `criarLocalNoPonto` (`src/formulario/locais/fluxos-local.ts:64,86`) têm `fora_de_sp` como
  **único** motivo de recusa na criação — o motivo `350m` existe apenas no fluxo de
  contribuição/reuso (`fluxos-local.ts:105-132`), que não é chamado aqui. Portanto a mensagem
  fixa exibida em `etapa-itinerarios.tsx:1069` e `:1082` é a única possível, e os dois testes
  novos exercitam exatamente esse ramo.
- **RN-034 / RN-035** (âncora de inserção, ordem 1-based) — **atendidas, e não regrediram com o
  estreitamento do polígono.** O teste da âncora usa a coordenada editada `(-25.000000,
  -50.000000)` (`etapa-itinerarios.test.tsx:2768-2769`), que continua **dentro** da caixa nova
  (lat -25 ∈ [-30,-20]; lng -50 ∈ [-60,-40]) — o Local é criado e a asserção de índice
  (`expect(indiceCriada).toBe(2)`, `:2784`) segue significativa, não vacuamente verde.
- **RN-004 / RN-005** (UUID) — atendidas: a correção não toca criação de entidade,
  import/export nem cópia.
- **RN-052 / RN-049** — inalteradas pela correção: nenhum `fetch`, nenhuma mensagem de OSRM
  no diff.
- **RN-010** (schema strict, sem campo novo) — atendida: o diff não toca schema nem produz
  campo novo.

## Specs verificadas

- **Spec 03 §2.3** (município por ponto-em-polígono) — aderente: a correção **não** mexe na
  derivação, só na fixture que a alimenta nos testes; o ray-casting real continua sendo o
  decisor.
- **Spec 04 §7.1/§7.2** — inalteradas: nenhuma mudança de comportamento de criação.
- **DEC-050 / `docs-dev/18`** — aderente: o wrapper é `div` com classes utilitárias de
  layout, sem `style=` inline; `Campo` segue de `shared/ui` e nenhum `data-testid`/`aria-*`
  foi renomeado (os três da task — `latitude-criacao-input`, `longitude-criacao-input`,
  `atualizar-ponto-criacao` — permanecem nos mesmos elementos).

## Pontos corretos

- **A correção do layout é a correta, não um paliativo.** `Campo` repassa `className` ao
  `<input>` (`src/shared/ui/campo.tsx`), que fica dentro de `MolduraControle`, um
  `div flex flex-col` (`src/shared/ui/moldura-controle.tsx:54`) — `flex-1` ali era no-op no
  eixo errado. Com o wrapper `flex-1 min-w-0` como item direto da faixa `div.flex gap-2`
  (`etapa-itinerarios.tsx:1409`) e o `w-full` que `classesDeControle` já aplica ao input
  (`moldura-controle.tsx:22`), os dois campos passam a dividir a faixa meio a meio e a
  encolher em coluna estreita. Critério de aceite "dois campos lado a lado, no máximo uma
  linha a mais" agora cumprido no espírito, não só na letra.
- **O estreitamento da fixture foi verificado contra todo o arquivo, não só contra o teste
  alterado.** Conferi os literais de coordenada de `etapa-itinerarios.test.tsx`: todos são
  `lng ≈ -46.3..-46.4`, `lat ≈ -23.5..-24.0` (e o `-25/-50` da âncora) — todos dentro da caixa
  nova. As coordenadas do documento-fixture (`testes/fixtures/spec02-15-exemplo-minimo.json`:
  latitudes -23.96..-24.01, longitudes -46.3x) também. A constante é **local a este arquivo**
  (`grep -rn RECURSOS_MUNICIPIO_TESTE testes/` retorna apenas ele), então o estreitamento não
  tem alcance fora dele.
- **Cobertura ampliada além do mínimo pedido:** a ressalva exigia repor o caso de Local; a
  correção repõe Local **e** adiciona Seção, que nunca teve o caminho `fora_de_sp` coberto
  pela criação inline. Contagem de testes sobe de 1713 para 1714 (+1 líquido) — nenhum teste
  foi removido, só um reescrito.
- **Comentários explicam a intenção frágil.** O bloco em `:31-36` registra que a caixa é
  deliberadamente estreita e por quê — sem isso, um futuro `lat: -10` "inocente" em outro
  teste quebraria de forma obscura.

## Problemas encontrados

Nenhum de severidade Baixa ou superior.

**Observação informativa (não é ressalva):** a fixture estreita cria um acoplamento novo — todo
teste futuro neste arquivo precisa usar coordenada dentro de lng [-60,-40] × lat [-30,-20] ou
cairá em "fora de SP". O comentário `:31-36` mitiga isso, e a falha resultante seria ruidosa
(mensagem de recusa visível), não silenciosa. Registro como contexto para quem escrever a
TASK-133 sobre este mesmo arquivo.

## Violações de escopo

Nenhuma. O diff toca **dois** arquivos e **apenas** as duas regiões apontadas pelo parecer
anterior: o bloco da fixture + o teste de "fora de SP" (mais o irmão de Seção), e a faixa
horizontal dos dois `Campo`. Verificado por leitura do `git show c3b9628` completo:
**nenhuma** mudança em `coordenada-criacao.ts`, **nenhuma** mudança no E2E, **nenhuma** chamada
a `/nearest`, **nenhum** pré-preenchimento de nome (TASK-133), **nenhum** `data-testid`
alterado, e nenhuma alteração de lógica de produção — a única mudança em `.tsx` é estrutura de
layout.

## Testes avaliados

- **cobertura das RN da task:** **sim, sem lacuna remanescente.** O caso inválido nomeado pela
  task ("coordenada válida mas fora de SP ⇒ mensagem existente, nada criado") tem agora teste
  direto nos dois tipos, asseverando a mensagem exata, a linha-formulário aberta e
  `paradasEmEdicao` intocado.
- **casos inválidos testados:** sim — os do módulo puro (`abc`, vazio, `-91`, `181`, `1.2.3`,
  `1e2`, `--23`, `23 5`, `-23.500,00`) mais, na UI, "fora de SP" para Local e Seção.
- **regressão de UUID:** N/A — a task não toca import/export/cópia.
- **OSRM mockado:** sim — nada na correção acessa rede; os testes novos nem chegam ao
  recálculo (a recusa acontece antes).
- **suíte executada com resultado:** **verde, log canônico reutilizado sem repetir a suíte.**
  `npm run test:all:verificar` ⇒ *"Log canônico válido. Executor: **Claude-orquestrado**.
  Fingerprint: `f909ea4d723cd54b2f7dae3c229d08ee243b66ba936cfc315012bc19547299f8`. Working
  tree: `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`"*. Conteúdo do log:
  `Test Files 116 passed (116)`, `Tests 1714 passed (1714)` — os 1713 da 1ª rodada **mais o
  teste de Seção da correção** —, E2E `112 passed`, `Código Testes unitários: 0`, `Código
  Testes E2E: 0`, `Resultado geral: APROVADO`, com limpeza registrada (*"árvore do PID próprio
  11816 encerrada"*). Nesta revisão rodei também `npm run typecheck` e `npm run lint`: **ambos
  limpos, sem saída de erro**. A revisão não subiu servidor nem repetiu a suíte.

## Checklist 07

**53 itens: 25 ok, 28 N/A, 0 violados.** (Avaliação do estado acumulado da task após a
correção; a contagem por seção é minha, item a item.)

- *Escopo* (6/6 ok): não é gestão de pedido (RN-095), nenhum workflow ou status (RN-011),
  nada persistido (RN-096), só o escopo da ressalva foi tocado, e nenhuma regra nova foi
  inventada — a inferência controlada (vírgula decimal) segue documentada em comentário e não
  foi alterada.
- *JSON* (5 ok, 4 N/A): apenas dados de operação, autossuficiente, nenhum campo novo, UUID
  preservada na edição, entidade nova com UUID nova; RN-033, RN-013, RN-014/050 e RN-015 N/A.
- *Domínio* (2 ok, 7 N/A): RN-025/031 (Seção e Local seguem entidades separadas — os dois
  testes novos provam que cada tipo tem seu próprio caminho de recusa) e RN-035 ok; RN-042,
  RN-001, RN-006, RN-030, RN-019..022, RN-061, RN-069 N/A.
- *Comparador* (0 ok, 7 N/A): nenhum arquivo de `comparador/` no diff.
- *Roteamento* (2 ok, 3 N/A): RN-052 e RN-049 ok; RN-048, RN-047/050, RN-041..043 N/A.
- *UI/PDF* (2 ok, 6 N/A): DEC-050 ok (wrapper com utilitários, sem `style=` inline,
  componentes de `shared/ui`) e `data-testid`/`aria-*` preservados ok; RN-076, RN-067,
  matrizes, RN-031/044, RN-077, RN-078 N/A.
- *Testes* (8 ok, 1 N/A): "toda regra com teste" sai de **ok com ressalva** para **ok pleno**;
  casos inválidos, OSRM mockado, fixtures canônicas, verificações direcionadas + typecheck/lint,
  evidência única, reutilização do log válido e porta/PID todos ok; regressão de UUID N/A.

## Pendências

- **Condições de merge:** **nenhuma.** A condição registrada na 1ª rodada está cumprida e
  verificada acima; o follow-up de layout também foi resolvido dentro do próprio ciclo e
  **deixa de existir como dívida**. O ciclo da TASK-132 está encerrado.
- **Q-xxx abertas:** nenhuma. Q-090 decidida (DEC-112) e a sub-decisão da vírgula decimal
  fechada dentro da task.
- **Consequência para a TASK-133:** a dependência dura permanece cumprida — o botão
  `atualizar-ponto-criacao` e o handler `atualizarPontoCriacaoInline`
  (`etapa-itinerarios.tsx:1029-1039`, `:1449-1455`) existem e são o ponto de entrada natural da
  recarga da sugestão de nome. Duas heranças concretas para quem implementar a 133 neste mesmo
  arquivo de teste: (a) a caixa municipal estreita descrita acima; (b) o wrapper de layout novo
  ocupa a faixa horizontal — um eventual indicador/aviso de sugestão precisará de lugar
  próprio, não desta faixa. O código das **TASK-130/131/133 não foi verificado nesta revisão**.

## Decisão

**Aprovado.** A correção é exatamente do tamanho da ressalva: dois arquivos, nenhuma mudança
de lógica de produção, nenhuma fuga para o escopo da TASK-133. A condição de merge está
efetivamente resolvida, não contornada — o teste deixou de ser vacuamente verde porque a
coordenada agora **atravessa** a validação de faixa e chega à derivação real de município, e a
asserção passou de "existe elemento" para "a mensagem é esta"; e o caminho ganhou o gêmeo de
Seção que faltava. Confirmei que o estreitamento do polígono não esvaziou nenhum outro teste do
arquivo (todos os literais de coordenada, inclusive o `-25/-50` da âncora, caem dentro da caixa)
e que a fixture não vaza para outros arquivos. O follow-up cosmético foi resolvido na raiz
certa (`MolduraControle`, não o input). Nenhuma RN Alta violada, nenhum NEG-xxx tocado, suíte
canônica verde com 1714 testes e 112 E2E, typecheck e lint limpos.
