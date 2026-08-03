# Revisão da TASK-034 (rodada de correção)

**Revisor:** Claude (revisão de aderência, conversa separada da implementação)
**Data:** 2026-08-03
**Commit/branch revisado:** `1de7534` (correção) sobre `79dcfe1` + `7e4f62a` (DEC-107),
branch `redesign`
**Parecer anterior:** `docs-dev/14-REVISOES/TASK-034-20260803.md` — **reprovado** por
violação da RN-076 (Alta) no artefato renderizado.

## Resultado

- [ ] Aprovado
- [ ] Aprovado com ressalvas
- [x] **Reprovado**

Motivo em uma linha: o desalinhamento reprovado na rodada anterior **foi corrigido de
fato**, mas o mecanismo escolhido para viabilizar colunas estreitas — o cabeçalho de
coluna diagonal — **não entrega o que a DEC-107 decidiu**: o rótulo **quebra em 3 a 5
linhas** dentro dos 38 pt da coluna (a DEC-107 exige "sem quebra de linha") e, girado a
45°, os cabeçalhos de colunas vizinhas **se sobrepõem** — o cabeçalho da matriz volta a
ser ilegível no PDF, que é o produto da task (RN-076, criticidade **Alta**).

## Resumo da entrega

Correção circunscrita a três arquivos de produção e dois de teste, exatamente o recorte
previsto no plano (`docs-dev/PLANO-TASK-034-CORRECAO.md` §4.4 — nada mais foi tocado):

- [matrizes-pdf.ts](src/formulario/pdf/matrizes-pdf.ts) — o modelo triangular semântico
  fica intacto; entra `dividirMatrizEmBlocos`, derivação **pura** de layout que parte a
  matriz em faixa de colunas × pedaço de linhas (`MAX_COLUNAS_POR_BLOCO = 7`,
  `MAX_LINHAS_POR_BLOCO = 16`), preenche o triângulo superior com `undefined` e calcula
  `alturaCabecalho`. Entra também `formatarKmSemUnidade`, local ao PDF.
- [estilos-pdf.ts](src/formulario/pdf/estilos-pdf.ts) — cinco estilos novos com **largura
  fixa** (`celulaMatrizValor`/`Diagonal`/`Vazia` a 38 pt, `cabecalhoLinhaMatriz` a 130 pt)
  e o par `cabecalhoColunaDiagonal`/`rotuloColunaDiagonal` do rótulo girado.
- [documento-pdf-operacional.tsx](src/formulario/pdf/documento-pdf-operacional.tsx) —
  `MatrizPdfView` mapeia blocos; `CelulaMatrizView` extraída; `wrap={false}` desce da
  matriz inteira para cada bloco; títulos ganham "(km)".
- Testes: `pdf-matrizes.test.ts` (+7 casos de `dividirMatrizEmBlocos`) e
  `pdf-renderizacao.test.tsx` (+4 casos, incluindo o de geometria que faltava).

## Situação das 4 condições do parecer anterior

| # | Condição | Situação |
|---|---|---|
| 1 | Alinhamento das colunas | **Cumprida** (ver "Pontos corretos" 1) |
| 2 | Teste de geometria que falharia antes | **Cumprida** (ver "Pontos corretos" 2) |
| 3 | Detalhe empilhado da célula bidirecional | **Cumprida**, com o formato **redecidido** pela DEC-107 (ver abaixo) |
| 4 | Reexecutar a evidência canônica | **Cumprida** (ver "Testes avaliados") |
| 5 | (follow-up) `wrap={false}` da matriz inteira | **Cumprida**, antecipada por decisão do responsável (D1 do plano) |

Sobre a condição 3: o parecer anterior pediu "média / ida / volta" com o rótulo "Média"
restrito ao bidirecional. A **DEC-107 item 3**, registrada depois (`7e4f62a`), decidiu o
contrário — empilhamento em `valor` / `I:` / `V:` e **sem** o rótulo "Média". A
implementação seguiu a DEC-107, que é a decisão mais recente e explícita do responsável;
a divergência com o texto do parecer anterior é **correta**, não um desvio.

## Regras RN verificadas

- **RN-076** (regras transversais do PDF) — **parcialmente violada**, por motivo
  **diferente** do da rodada anterior:
  - *matrizes triangulares inferiores* — **atendida agora**. Largura fixa por coluna +
    célula de preenchimento no triângulo superior; a repartição por linha que causava a
    reprovação anterior deixou de existir estruturalmente.
  - *`Cidade - Nome da Seção` nos cabeçalhos* — **violada na renderização**: o texto
    está correto no modelo, mas no papel o cabeçalho de coluna sai quebrado em 3–5
    fragmentos e sobreposto ao vizinho (problema 1).
  - *km, sem R$* — **atendida**. A unidade migrou para o título por decisão registrada
    (DEC-107 item 2); `pdf-renderizacao.test.tsx` assere "(km)" nos dois títulos e
    **nenhum** "km" nas células.
  - *sem offsets* — **atendida**, sem regressão (`pdf-regras-transversais.test.ts`
    inalterado, como o plano exigia).
  - *Locais só no anexo* — **atendida**, sem regressão.
- **RN-056** (`valor_adotado_de_distancia`; detalhe Ida/Volta) — **atendida**. `I:`/`V:`
  só existem quando `celula.bidirecional`; teste de caso inválido com
  `documentoUnidirecional` prova a ausência.
- **RN-054** (uma entrada por par) e **RN-058/RN-059** (par não habilitado) —
  **atendidas**. O preenchimento é `undefined`, nunca `MARCA_PAR_NAO_HABILITADO`, e há
  teste explícito disso — a distinção semântica entre as duas matrizes sobreviveu ao
  refator, que era o risco principal desta rodada.
- **RN-013 / NEG-017** (sem R$) — **atendida**, teste transversal inalterado.
- **RN-015 / NEG-019** (congelado, sem OSRM) — **atendida**. `dividirMatrizEmBlocos` é
  pura; nenhum `fetch` entrou.
- **RN-075, RN-061/RN-069/RN-099, RN-071, RN-031** — **atendidas**, não tocadas nesta
  rodada (arquivos de tabelas horárias e anexo intactos, como o plano previa).

## Specs verificadas

- **Spec 04 §9.1 / §13.1 itens 6–7** — a **forma triangular** e o **"X" na diagonal**
  passaram a ser aderentes; o **cabeçalho** ainda não (problema 1).
- **Spec 04 §13.3** ("uma página por bloco lógico") — aderente; a quebra em blocos
  `wrap={false}` refina sem alterar a estrutura de `Page`.
- **DEC-107 item 1** (cabeçalho diagonal a 45°, **sem quebra de linha**) — **divergente**
  (problema 1).
- **DEC-107 itens 2, 3 e 4** (unidade no título; célula empilhada `valor`/`I:`/`V:` sem
  "Média"; triangular, "X", `Cidade - Nome`, sem R$, "—" só no seccionamento) —
  **aderentes**, com teste para cada um.

## Pontos corretos

1. **O defeito bloqueante anterior foi corrigido na raiz, não remendado.** A causa era
   `flex` repartindo largura dentro de cada linha; a correção troca por `width` fixo
   (`estilos-pdf.ts:341-360`) **e** completa cada linha até `cabecalhos.length` com
   `celulaMatrizVazia`. Qualquer uma das duas isolada seria insuficiente; as duas juntas
   tornam a posição da coluna `j` independente de quantas células a linha tem. O
   comentário de cabeçalho dos estilos novos registra a causa, o que protege contra a
   reintrodução do `flex` por alguém que não leu o parecer.
2. **O teste de geometria que faltava existe e não é vacuo.** `pdf-renderizacao.test.tsx`
   compara, na árvore renderizada, `linhaCabecalho.filhos.length` com o de cada linha de
   dados. Com a fixture de 3 Seções, a linha 0 tinha 1 filho contra 4 do cabeçalho antes
   da correção — o teste **teria reprovado** o código anterior. É exatamente a lacuna
   apontada na rodada passada, agora fechada.
3. **Separação entre modelo e apresentação preservada.** `dividirMatrizEmBlocos` não
   altera `MatrizPdf`; a verdade semântica (quem é diagonal, quem é "—", quem tem valor)
   continua num só lugar, e o layout é derivado dela. É a decisão de projeto que permitiu
   testar a quebra em blocos com matrizes sintéticas de 9 e 20 Seções sem inventar
   documento inválido — nenhuma fixture do projeto tem Serviço tão grande, e o teste diz
   isso em comentário em vez de esconder.
4. **Estilos do anexo de Locais intocados.** `celulaMatriz`/`celulaCabecalhoMatriz`
   continuam servindo só à tabela de Locais (`documento-pdf-operacional.tsx:549-557`), como
   o plano exigia — o refator não vazou para o item 8.
5. **Inferências declaradas.** A estimativa de largura de texto
   (`length × fontSize × 0,5`), o fator 0,71 ≈ sen(45°) e a sincronização manual do
   `fontSize` entre módulo puro e folha de estilos estão comentadas como inferência
   controlada, com a conta de geometria da A4. Nada foi apresentado como se viesse da spec.

## Problemas encontrados

### 1. [BLOQUEANTE — RN-076 (Alta), DEC-107 item 1] O rótulo do cabeçalho diagonal quebra em 3–5 linhas e os cabeçalhos vizinhos se sobrepõem

**Local:** [estilos-pdf.ts:378-390](src/formulario/pdf/estilos-pdf.ts#L378-L390)
(`rotuloColunaDiagonal`), consumido em
[documento-pdf-operacional.tsx:516-519](src/formulario/pdf/documento-pdf-operacional.tsx#L516-L519).

`rotuloColunaDiagonal` é `position: "absolute"` com `bottom: 0` e `left: 0` e **sem
`width`**. No Yoga do `@react-pdf`, um filho absoluto sem largura declarada é medido
contra a largura interna do contêiner — aqui os **38 pt** de `cabecalhoColunaDiagonal`.
O `transform` é aplicado na pintura e **não participa da medição** (o próprio comentário
do código afirma isso, mas a consequência sobre a *largura disponível* não foi tirada):
o texto é quebrado **antes** de ser girado.

**Evidência — medida sobre o componente real desta task**, não por inferência. Rodei
`@react-pdf/layout` sobre a árvore produzida por `DocumentoPdfOperacional` com a fixture
`documentoExemploMinimo()` e inspecionei os nós de texto do cabeçalho:

```
"Santos - |Terminal |Central"                       linhas=3  w=35,1  h=26,4
"São |Vicente - |Terminal |Norte"                   linhas=4  w=35,1  h=35,2
"Praia |Grande - |Rodoviária |Praia |Grande"        linhas=5  w=38,0  h=44,0
```

(as seis ocorrências — três por matriz — se repetem nas duas matrizes). A DEC-107 item 1
decidiu o cabeçalho "na diagonal, a 45°, subindo, **sem quebra de linha**"; o que sai são
blocos de 3 a 5 linhas girados em conjunto.

**Consequência geométrica — sobreposição.** Com passo de coluna de 38 pt e rotação de
45°, a distância perpendicular entre rótulos vizinhos é `38 × cos45° ≈ 26,9 pt`. A
espessura de cada rótulo, perpendicular à direção do texto, é a **altura do bloco**:
26,4 / 35,2 / **44,0 pt**. Nos rótulos de 4 e 5 linhas a espessura **excede** o passo, e
os cabeçalhos de colunas adjacentes se invadem; no de 3 linhas fica no limite (26,4 vs
26,9). Com um rótulo de **uma** linha — o que a DEC-107 pediu — a espessura seria a altura
de linha, **8,8 pt**, folgadamente dentro dos 26,9 pt: é o próprio pressuposto que faz o
desenho fechar.

**Efeito colateral na altura reservada.** `calcularAlturaCabecalho`
([matrizes-pdf.ts:275-282](src/formulario/pdf/matrizes-pdf.ts#L275-L282)) estima a largura
do rótulo **sem quebra**. Para "Praia Grande - Rodoviária Praia Grande" (38 caracteres)
reserva `min(130; 38×8×0,5×0,71 + 6) ≈ 113,9 pt`, enquanto o bloco realmente girado ocupa
`(38 + 44) × 0,707 ≈ 58 pt`. Sobra ~56 pt de espaço morto por bloco de matriz — e o
`MAX_LINHAS_POR_BLOCO = 16` foi dimensionado contando com essa reserva. A conta do plano
(§3.1) é internamente coerente; ela só não descreve o que o motor faz, porque pressupõe a
linha única que o estilo não garante.

**Correção esperada:** declarar `width` explícito em `rotuloColunaDiagonal` — algo como
`ALTURA_MAX_CABECALHO / 0,71 ≈ 183 pt`, o comprimento máximo que a altura reservada já
comporta —, de modo que o texto caiba numa linha; a folga de ~119 pt à direita da última
coluna, já prevista no plano, é justamente o espaço para esse transbordo. Verifiquei que
`{ width: 200 }` no mesmo nó devolve `linhas=1, h=8,8` para os três rótulos.

**Lacuna de teste — e ela é fechável.** O parecer anterior registrou que "nenhum teste
observa geometria". Isso **não é mais verdade**: `@react-pdf/layout` + `@react-pdf/font`
estão instalados e aceitam a árvore de `pdf(<DocumentoPdfOperacional/>)`, devolvendo
`box` e `lines` de cada nó — foi assim que produzi a evidência acima, em Vitest, sem rede
e sem observar pixels. A correção deve vir com um teste que assere **`lines.length === 1`
em todo rótulo diagonal** das duas matrizes; ele reprovaria o código atual.

### 2. [BAIXA — higiene] `celulaDiagonal` ficou sem consumidor

**Local:** [estilos-pdf.ts:314-320](src/formulario/pdf/estilos-pdf.ts#L314-L320).
O estilo antigo da diagonal foi substituído por `celulaMatrizDiagonal` e não é mais
referenciado por nenhum arquivo (`grep` em `src/formulario/pdf/`); o lint não acusa
porque é propriedade de objeto. Diferente de `celulaMatriz`/`celulaCabecalhoMatriz`, que
**continuam** servindo à tabela de Locais e devem permanecer. Remover junto da correção
do problema 1.

### 3. [OBSERVAÇÃO — processo] O teste de "poder de detecção" não exercita código de produção

**Local:** `pdf-renderizacao.test.tsx`, caso "uma linha triangular sintética (sem
preenchimento) é acusada pela mesma varredura". Ele monta três objetos `NoPdf` à mão e
verifica que `filhos.length` difere — ou seja, testa a **expressão da asserção**, não o
componente. Não é um defeito (o teste de geometria do caso 2 de "Pontos corretos" já é
não-vacuo por si), mas é o mesmo padrão de espião decorativo que originou a TASK-045;
registrado para não virar precedente.

### 4. [OBSERVAÇÃO] Blocos múltiplos não têm cobertura de **renderização**

`dividirMatrizEmBlocos` tem testes fortes para 9 e 20 Seções, mas
`documentoExemploMinimo()` tem 3 Seções → **um** bloco. O caminho de renderização com
`continuacao: true` (título "(continuação)", cabeçalho repetido, zebra reiniciada) nunca é
exercido na árvore. Não impede a aprovação — o modelo está coberto e o renderizador só o
mapeia —, mas é onde uma regressão futura passaria despercebida.

## Violações de escopo

Nenhuma.

- Os três arquivos de produção alterados são exatamente os do plano; `tabelas-horarias-pdf.ts`,
  `anexo-tecnico-pdf.ts`, `modelo-pdf-operacional.ts`, `apresentacao-matriz-distancias.ts` e
  `etapa-matrizes.tsx` **não** foram tocados (`git show --stat 1de7534`).
- `formatarKm`, compartilhado com a etapa Matrizes da tela (TASK-048), foi **preservado**;
  a versão sem unidade é função nova e local ao PDF. A tela não muda de comportamento.
- `pdf-regras-transversais.test.ts` e `pdf-tabelas-horarias.test.ts` não mudaram de
  expectativa, que o plano definiu como sinal de vazamento de escopo.
- Nada de workflow, status, R$ ou campo de contrato entrou (NEG-001..007, NEG-017).
- A divergência de apresentação em relação ao exemplo literal do §9.1 está coberta pela
  **DEC-107**, registrada por `/registrar-decisao` em commit próprio (`7e4f62a`) **antes**
  da implementação — decisão do responsável, não inferência do implementador.

## Testes avaliados

- **cobertura das RN da task:** boa, com uma lacuna. RN-076 quanto a *forma triangular*
  passou a ter teste (a lacuna da rodada anterior); RN-054/056/058/059, RN-013 e a
  DEC-107 itens 2–3 têm teste dedicado. **Falta** o teste da **quebra de linha do rótulo
  diagonal** (DEC-107 item 1) — a lacuna onde vive o defeito bloqueante desta rodada, e
  que é automatizável (problema 1).
- **casos inválidos testados:** sim, e são bons — `documentoUnidirecional` sem `I:`/`V:`
  e sem "Média"; nenhuma célula com "km"; nenhum preenchimento virando
  `MARCA_PAR_NAO_HABILITADO`; diagonal na posição local `i − c0`.
- **regressão de UUID:** N/A — a task não escreve, importa, exporta nem copia entidade.
- **OSRM mockado:** N/A — nenhum módulo tocado faz `fetch`.
- **suíte executada com resultado:** **verde, log reutilizado sem repetir a suíte.**
  `npm run test:all:verificar` → `Log canônico válido. Executor: Claude. Fingerprint:
  bcf370a2cd7d1d68eb4c4ce18b7d1716b46a90d61b27ec56ddf7b973963c8624. Working tree:
  00c21aa501d19b4a9ade6b12db96274b9a6725e300e14f1fda33b4dc1336f57e.` Conteúdo:
  `Test Files 113 passed (113)`, `Tests 1572 passed (1572)` (+12 sobre os 1560 da rodada
  anterior), Playwright `107 passed (2.7m)`, `Código Testes unitários: 0`,
  `Código Testes E2E: 0`, `Resultado geral: APROVADO`, `FIM DO LOG CANÔNICO`. O
  fingerprint é **novo** — a pendência 4 do parecer anterior foi cumprida.
- **typecheck / lint executados nesta revisão:** `npm run typecheck` e `npm run lint` —
  ambos **limpos, sem saída de erro**.
- **A suíte verde não contradiz a reprovação:** o defeito é de **layout renderizado**.
  Diferentemente da rodada anterior, porém, ele **é** observável em teste — a evidência do
  problema 1 foi produzida com `@react-pdf/layout` dentro do Vitest do projeto.

## Checklist 07

**53 itens: 26 ok, 25 N/A, 1 com ressalva, 1 violado.**

- **Escopo (6/6 ok).** Pertence ao ROTA; sem workflow; sem status; sem persistência;
  apenas o escopo da correção; nenhuma regra inventada (DEC-107 fundamenta o formato,
  inferências de geometria declaradas).
- **JSON (3 ok, 6 N/A).** Nenhum campo novo; km com formatação local ao PDF; congelados
  só lidos (RN-015). N/A: escrita/UUID/XOR de parada.
- **Domínio (5 ok, 4 N/A).** Seção × Local separados; Serviço por UUID; `numero_n` só
  rótulo; Viagem estratificada; feriado/excepcional fora da semana padrão — nada alterado
  nesta rodada.
- **Comparador (7 N/A).** Task de Formulário/PDF.
- **Roteamento (5 N/A).** Nenhuma chamada, mock ou mensagem de rota.
- **UI/PDF (5 ok, 1 N/A, 1 violado, 1 ressalva).**
  - **VIOLADO** — "Nomes de Seção no padrão `Cidade - Nome da Seção` em telas, tabelas,
    matrizes e PDF? (RN-076)": o modelo produz o padrão, mas o cabeçalho de coluna sai
    quebrado e sobreposto no PDF (problema 1).
  - **ok (era o violado da rodada anterior)** — "Matrizes triangulares inferiores, em km,
    sem R$? (RN-076)".
  - ok — offsets ausentes; Locais só no anexo; aviso SEI no rodapé; `data-testid`/`aria-*`
    intocados (E2E verdes sem alterar seletores).
  - **ressalva** — design system (DEC-050): o PDF não é DOM e a aparência segue
    concentrada em `estilos-pdf.ts`; o array `[linhaCabecalhoDiagonal, { height }]` é o
    **primeiro** estilo dinâmico do arquivo. É geometria computada, está justificada em
    comentário e o teste tolera o array explicitamente — aceitável, mas é um precedente a
    não multiplicar.
  - N/A — gate de exportação com pendências (TASK-032).
- **Testes (6 ok, 1 ressalva, 2 N/A).** Ressalva: DEC-107 item 1 sem teste, sendo
  testável. N/A: regressão de UUID e mock de OSRM.

## Pendências

Condições para nova submissão (o ciclo **não** fecha sem elas):

1. **Impedir a quebra de linha do rótulo diagonal** — declarar `width` explícito em
   `rotuloColunaDiagonal` (≈ `ALTURA_MAX_CABECALHO / 0,71`), de modo que cada rótulo
   ocupe **uma** linha e a espessura girada (8,8 pt) fique dentro do passo de 26,9 pt
   entre colunas, eliminando a sobreposição.
2. **Acrescentar teste que falharia hoje** — usando `@react-pdf/layout` + `@react-pdf/font`
   sobre a árvore de `DocumentoPdfOperacional` (o padrão está demonstrado no problema 1),
   assertar `lines.length === 1` em todo rótulo diagonal das duas matrizes.
3. **Conferência visual do PDF gerado** — obrigatória pelo próprio plano (§5) e não
   evidenciada nesta rodada: sentido do giro, ausência de sobreposição, nada cortado à
   direita da última coluna. Foi assim que os dois defeitos apareceram.
4. **Remover `celulaDiagonal`**, agora sem consumidor (problema 2).
5. **Reexecutar a evidência canônica** (`npm run test:all:log`) — o fingerprint
   `bcf370a2…` expira assim que o código mudar.

Follow-ups não impeditivos (a critério do responsável):

6. Revisar `calcularAlturaCabecalho` depois da correção 1: com linha única a fórmula passa
   a descrever o desenho real, e `MAX_LINHAS_POR_BLOCO` pode ser reaferido.
7. Cobrir a renderização de matriz com **mais de um bloco** (observação 4).
8. Substituir o teste sintético de "poder de detecção" por um que exercite o componente
   (observação 3).

Q-xxx abertas relacionadas: nenhuma. Q-084 (DEC-106) e Q-085 (DEC-107) estão decididas e
aplicadas.

**Higiene de repositório:** `docs-dev/PLANO-TASK-034-CORRECAO.md` continua não versionado
na árvore de trabalho; o próprio arquivo declara que deve ser apagado após a
implementação. Apagar ao fechar o ciclo — não é derivado oficial.

## Decisão

**Reprovado**, pelo mesmo critério do template (violação de RN de criticidade **Alta**),
mas com um deslocamento importante em relação à rodada anterior: **o defeito que motivou
aquela reprovação foi genuinamente resolvido**. Largura fixa e células de preenchimento
eliminam a repartição por linha na raiz, e o teste de geometria que faltava existe e
teria reprovado o código antigo — as condições 1, 2 e 4 do parecer anterior estão
cumpridas, e a 3 foi cumprida no formato que a DEC-107 redecidiu.

O que impede o fechamento é um defeito **novo**, introduzido pelo mecanismo escolhido para
viabilizar colunas estreitas. O cabeçalho diagonal depende de o rótulo ser uma linha
única — é o que a DEC-107 item 1 decidiu e o que a conta de geometria do plano pressupõe —,
mas o estilo não declara largura, e o motor quebra o texto nos 38 pt da coluna antes de
girá-lo: 3 a 5 linhas por rótulo, e blocos de espessura maior que o passo entre colunas,
que portanto se sobrepõem. Medi isso sobre o componente real com a fixture do projeto,
não por inspeção visual nem por inferência. O resultado prático é o mesmo da rodada
anterior — a matriz impressa não é legível —, ainda que por outra causa, e o artefato final
é o produto desta task.

A correção é de **uma linha de estilo** (`width` em `rotuloColunaDiagonal`), e agora ela
vem acompanhada de algo que a rodada anterior não tinha: **um jeito de testar**. A
alegação de que "nenhum teste observa geometria" não se sustenta mais — `@react-pdf/layout`
roda em Vitest, sem rede, e devolve `box` e `lines` de cada nó. Fechado o item 1 com o
teste do item 2 e a conferência visual do item 3, a entrega deve passar.
