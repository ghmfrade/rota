# Revisão da TASK-033 — fechamento das ressalvas

**Revisor:** Claude (Opus 5), sessão `/revisar-aderencia` separada da implementação
**Data:** 2026-08-02
**Commit/branch revisado:** `1a77a85` — "Implementa TASK-033: fecha as ressalvas da
revisão e estratifica por Serviço" (branch `redesign`, working tree limpo). Revisão
incremental sobre `32cd8ae`, já revisado em `14-REVISOES/TASK-033-20260731.md`.

## Resultado

- [ ] Aprovado
- [x] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

Fecha as duas ressalvas e as duas observações do parecer de 2026-07-31, sem tocar
contrato JSON, gate de exportação nem captura de mapa. O resumo do §13.1 item 2 passa
a trazer os **7 contadores por Serviço** do §10 (entram `opcoesIda`/`opcoesVolta` —
[modelo-pdf-operacional.ts:86](../../src/formulario/pdf/modelo-pdf-operacional.ts#L86),
[:330](../../src/formulario/pdf/modelo-pdf-operacional.ts#L330)); a estratificação por
faixa ganha o recorte **por Serviço** que o §10 exige além do total do Autos
([:127](../../src/formulario/pdf/modelo-pdf-operacional.ts#L127),
[:345](../../src/formulario/pdf/modelo-pdf-operacional.ts#L345)); os rótulos de faixa
passam a carregar o intervalo da spec por um helper único em `shared/contagens`
([contagens.ts:34](../../src/shared/contagens/contagens.ts#L34)); a composição do
parágrafo da descrição vira função pura com ponto final e fallback para o texto
congelado ([:197](../../src/formulario/pdf/modelo-pdf-operacional.ts#L197)); e
`sequenciaDeSecoes` passa a ordenar por `paradas[].ordem`
([:277](../../src/formulario/pdf/modelo-pdf-operacional.ts#L277)). 7 arquivos,
+434/−35 linhas, das quais 231 em teste.

## Regras RN verificadas

- **RN-074** (estrutura fixa; criticidade Alta) — **atendida**, agora sem a ressalva
  anterior. O item 2 traz os contadores do §10 completos: por Serviço os 7 da spec, por
  Autos as 2 somas que a spec define nesse nível (as colunas sem definição saem com "—"
  em vez de número inventado —
  [documento-pdf-operacional.tsx:74-87](../../src/formulario/pdf/documento-pdf-operacional.tsx#L74-L87)),
  e a estratificação por faixa "por Serviço e no total do Autos". `ORDEM_BLOCOS`
  intacta; itens 5–8 continuam reservados para a TASK-034.
- **RN-072** (fórmulas; Alta) — **atendida**. Nenhuma soma nova: o modelo lê
  `contarAutos`/`contarAutosPorFaixa` e só reprojeta
  ([:345-361](../../src/formulario/pdf/modelo-pdf-operacional.ts#L345-L361)). O teste
  compara linha a linha com o resultado das funções puras e ainda fecha as somas
  (Serviços × faixa = total do Autos por faixa = total geral —
  [pdf-modelo-operacional.test.ts](../../testes/unitarios/formulario/pdf-modelo-operacional.test.ts)).
  `paresCompraveis` de fato não varia por faixa: `contarServico` o deriva de
  `matriz_seccionamento` ∪ ponta-a-ponta, que a restrição de viagens não altera
  ([contagens.ts:101-112](../../src/shared/contagens/contagens.ts#L101-L112),
  [:191-214](../../src/shared/contagens/contagens.ts#L191-L214)) — exibi-lo uma vez por
  Serviço é fiel, não é atalho.
- **RN-076** (transversais; Alta) — **atendida**. O rótulo de faixa passou a conter
  hora (`Pico manhã (05:00–08:59)`), o que exigia atenção: o texto é **derivado de
  `FAIXAS_HORARIO`**, nunca redigitado, e o guarda transversal não foi afrouxado — as
  asserções negativas de offset e de `horario_saida` continuam intactas
  ([pdf-regras-transversais.test.ts:53-67](../../testes/unitarios/formulario/pdf-regras-transversais.test.ts#L53-L67))
  e ganharam um teste **positivo** que fixa exatamente quais 14 horas podem aparecer no
  resumo ([:69-87](../../testes/unitarios/formulario/pdf-regras-transversais.test.ts#L69-L87)).
  Nomes `Cidade - Nome` e ausência de R$/Locais seguem cobertos.
- **RN-069/NEG-018** (rótulo semana padrão; Alta) — **atendida** no conteúdo: o rótulo
  vem de `ROTULO_SEMANA_PADRAO` e abre o bloco de resumo
  ([documento-pdf-operacional.tsx:45-48](../../src/formulario/pdf/documento-pdf-operacional.tsx#L45-L48)),
  antes de todas as tabelas novas. Ver Observação 2 sobre paginação.
- **RN-077** (aviso SEI) — **atendida**, inalterada: `Rodape` continua `fixed` nas duas
  `Page` ([documento-pdf-operacional.tsx:18-30](../../src/formulario/pdf/documento-pdf-operacional.tsx#L18-L30)).
- **RN-015/NEG-019** (dado congelado) — **atendidas**. A mudança de maior risco aqui é
  o fallback do parágrafo: sem `itens`, o PDF passa a exibir
  `descricao_itinerario.texto` **como está**, sem recompor nada
  ([:197-206](../../src/formulario/pdf/modelo-pdf-operacional.ts#L197-L206)); e o
  ponto final acrescentado é o mesmo do texto congelado, com teste que remonta os itens
  e compara ao texto do documento.
- **RN-004/RN-007** (UUID) — **N/A**: nenhuma escrita, cópia, import ou export. As
  UUIDs de Serviço são usadas só como chave de lista/render.
- **RN-078** (gate) — **N/A nesta entrega**: `tela-exportacao.tsx` não foi tocado.
- **RN-011/RN-095** (sem workflow) — **atendidas**: nenhum texto novo de processo; o
  teste negativo de NEG-001..019 varre o modelo inteiro, inclusive os blocos novos.

## Specs verificadas

- **Spec 04 §10** — **aderente**, e é o ponto central desta entrega. A lista "Por
  Serviço" tem 7 contadores e os 7 estão no PDF; "Por Autos" tem 2 e são os 2 exibidos;
  "Todos os contadores acima são apresentados também estratificados por essas faixas
  (tabela faixa × contador, **por Serviço e no total do Autos**)" — o recorte por
  Serviço, ausente antes, existe agora. A coluna "Intervalo" da tabela de faixas da
  spec aparece embutida no rótulo, com os mesmos limites (en dash inclusive).
- **Spec 04 §13.1 item 2** — **aderente** (era o "parcialmente aderente" do parecer
  anterior).
- **Spec 04 §13.4** — **aderente**. Parágrafo corrido, nunca tabela; realce por `itens`;
  fechamento com ponto, como o texto congelado e como o painel da UI.
- **Spec 04 §13.3** — aderente no que esta entrega toca (contagens rotuladas, sem
  offsets). Tipografia/paginação são matéria declarada da TASK-126.
- **Spec 02 §10** — **aderente**. `paradas` já é contratualmente ordenado por `ordem`;
  o `sort` defensivo não muda o resultado do documento válido e alinha o PDF ao hábito
  de `motor-montagem.ts`/`montagem-grade.ts`/`redistribuicao-offsets.ts`.

## Pontos corretos

- O helper `rotuloFaixaComIntervalo` mora em `shared/contagens`, junto da constante de
  onde os limites saem — a alternativa óbvia (formatar no PDF) teria criado a segunda
  cópia dos horários da spec, exatamente o que RN-076 desconfia.
- Reconhecer que o teste transversal ficaria ambíguo com horas no resumo e responder com
  uma asserção **positiva e exaustiva** (as 14 horas permitidas, em ordem) em vez de
  relaxar o guarda negativo. Um `horario_saida` que vaze para o rótulo quebra o teste.
- `paresCompraveis` fora das linhas de faixa é decisão fundamentada e **assertada**
  (`expect(faixas[0]).not.toHaveProperty("paresCompraveis")`), não omissão silenciosa.
- Cobertura de borda real: Serviço unidirecional com colunas de Volta **zeradas e
  presentes**, faixa sem partida saindo zerada em vez de omitida, descrição sem `itens`
  (documento inválido perante o schema, montado deliberadamente fora do `parse`).
- O teste de ordenação de `paradas` inverte o array e exige a mesma travessia — prova o
  comportamento, não a existência do `sort`.
- Nenhum `data-testid`/`aria-*` alterado; nenhum E2E precisou mudar.

## Problemas encontrados

1. **[Ressalva 1 — média · documental] A decisão que autorizou a estratificação por
   Serviço não está registrada.** A mensagem do commit `1a77a85` a atribui a "decisão do
   responsável", mas não há DEC nem Q correspondente: `docs-dev/10-DECISION_LOG.md` e
   `docs-dev/16-OPEN_QUESTIONS.md` não têm entrada sobre estratificação por Serviço
   (verificado por busca nesta revisão; a DEC-105/Q-083 do commit anterior tratam da
   imagem do mapa). **Não há regra inventada** — a Spec 04 §10 exige o recorte
   literalmente, então o código está certo com ou sem decisão registrada. O que falta é
   o rastro: o parecer anterior pedia explicitamente que essa escolha fosse "tomada uma
   vez, para tela e PDF juntos", e um leitor futuro não encontra onde ela foi tomada.
2. **[Ressalva 2 — média] A tela de Revisão ficou para trás: agora o PDF mostra mais que
   a tela.** `resumo-operacional.tsx` continua com uma única tabela de faixas, legendada
   "Por faixa de horário — **total do Autos**"
   ([resumo-operacional.tsx:105-129](../../src/formulario/resumo/resumo-operacional.tsx#L105-L129)),
   sem o recorte por Serviço — verificado abrindo o arquivo nesta revisão. O §10 governa
   **as duas** superfícies ("Painel na tela de Revisão (e seção correspondente no PDF)"),
   de modo que a assimetria apenas trocou de lado em relação ao parecer de 2026-07-31.
   A superfície da tela pertence à TASK-031, já concluída, e **não há task pendente
   registrada** para essa lacuna — sem registro, ela se perde.
3. **[Observação — informativa] `paresCompraveis` sai da tabela faixa × contador.** O
   §10 diz "tabela faixa × contador" para todos os contadores; a entrega o exibe como
   nota acima da tabela
   ([documento-pdf-operacional.tsx:115-119](../../src/formulario/pdf/documento-pdf-operacional.tsx#L115-L119)).
   Como o valor é comprovadamente invariante entre faixas, nenhuma informação se perde e
   sete repetições idênticas seriam ruído numa peça operacional. Registro como desvio de
   **forma** aceito conscientemente, para que não seja lido depois como esquecimento.
4. **[Observação — informativa] A tabela do resumo foi a 8 colunas com larguras `flex:
   1`.** "Pares compráveis" e "Viagens Volta" recebem a mesma largura que "Serviço"
   ([documento-pdf-operacional.tsx:51-73](../../src/formulario/pdf/documento-pdf-operacional.tsx#L51-L73)).
   Legibilidade e larguras proporcionais são critério de aceite explícito da **TASK-126**
   (`docs-dev/06-BACKLOG_INICIAL.md`), que também declara estas colunas novas como
   pré-requisito seu — a ordem TASK-033 → TASK-126 está correta e nada precisa mudar
   aqui. `celulaFaixa: flex 2.4` já antecipa o problema na coluna que mais cresceu.
5. **[Observação — informativa] O rótulo da RN-069 pode se separar das tabelas na
   paginação.** Com N Serviços, o resumo passa a ocupar mais de uma página, e o rótulo
   "semana padrão…" fica só na primeira. O conteúdo está correto (a RN pede o rótulo
   junto das contagens, e ele abre o bloco), e a **TASK-126** já traz como caso inválido
   "contagem exibida sem o rótulo … após a reorganização: reprovado" — anoto para que
   essa task trate o rótulo como cabeçalho repetido, não como linha solta.

## Violações de escopo

Nenhuma. Toda a entrega cabe no §13.1 item 2 e no §13.4, que são a TASK-033. A
estratificação por Serviço **não é escopo novo**: é a parte do item 2 ("incluindo a
estratificação por faixa de horário", com o §10 definindo o recorte) que faltava na
primeira entrega. Os itens 5–8 continuam fora, `ORDEM_BLOCOS` não foi reordenada, o gate
da RN-078 e a captura de mapa não foram tocados, e nada da TASK-126 (tokens, capa em
página própria, dimensão da captura) foi antecipado. O único arquivo fora de
`formulario/pdf/` é `shared/contagens/contagens.ts`, e só para acrescentar um formatador
puro derivado de constante existente — nenhum consumidor atual muda de comportamento.

## Testes avaliados

- **cobertura das RN da task:** sim. RN-074 (7 contadores por Serviço; estratificação
  por Serviço com 7 faixas; faixa vazia presente), RN-072 (igualdade com as funções
  puras + fechamento das somas), RN-076 (guarda negativo mantido + horas permitidas
  fixadas), RN-069 (rótulo inalterado; feriado/excepcional fora), §13.4 (ponto final,
  remontagem idêntica ao texto congelado, fallback), Spec 02 §10 (ordenação por `ordem`).
- **casos inválidos testados:** sim — Serviço unidirecional, faixa sem partida,
  descrição com `itens` vazio (documento propositalmente fora do `parse`), `paradas`
  fora de ordem, além dos casos já existentes de captura/gate.
- **regressão de UUID:** N/A — nenhuma escrita, cópia, import ou export.
- **OSRM mockado:** N/A — o subsistema não chama OSRM; nada novo toca rede.
- **suíte executada com resultado:** **verde, reutilizada sem reexecução.**
  `npm run test:all:verificar` → "Log canônico válido. Executor: **Claude**. Fingerprint:
  `00e3fbfcf10056d0c1f359d78d1029fa1257f128439e9fbb26eec06a395a9cea`. Working tree:
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`." Fingerprint novo
  em relação ao parecer de 2026-07-31 (`f614313f…`), como esperado por o código ter
  mudado; identidade de working tree é a mesma. Rodados nesta revisão: `npm run
  typecheck` (limpo), `npm run lint` (limpo), `npm run check:rastreabilidade`
  ("toda Q/DEC citada tem entrada canônica").

## Checklist 07

**52 itens: 34 ok, 18 N/A, 0 violados.**

- **Escopo (6):** todos ok — pertence ao ROTA; nenhum workflow, status ou persistência
  novos; escopo exato do §13.1 item 2 / §13.4; nenhuma regra inventada (cada escolha cita
  Spec 04 §10 ou §13.4). A **Ressalva 1** não marca item aqui: falta o registro da
  decisão, não a base normativa.
- **JSON (9):** ok/N/A — nenhum campo novo, nada gravado, dado congelado só lido (o
  fallback exibe `texto` sem recompor). UUID: N/A.
- **Domínio (9):** ok/N/A — Seção × Local preservados (Locais continuam fora do corpo,
  com teste), `numero_n` só como rótulo, identidade por UUID nas listas, feriado e
  excepcional fora das contagens com rótulo.
- **Comparador (7):** **N/A** — task do Formulário; `shared/contagens` ganhou só um
  formatador, sem alterar contador algum consumido pelo Comparador.
- **Roteamento (5):** **N/A** — nenhuma chamada a OSRM.
- **UI/PDF (8):** todos ok — inclusive o item "conteúdo do PDF conforme §13", que era o
  **parcial** do parecer anterior e agora fecha. Sem `style=` inline novo;
  `estilos-pdf.ts` segue concentrando a aparência (o `@react-pdf` não lê CSS);
  `data-testid`/`aria-*` intocados.
- **Testes (8):** todos ok — fixtures canônicas reutilizadas, evidência única via
  `test:all:log` reutilizada por `test:all:verificar`, porta 3100 liberada e PIDs
  próprios encerrados conforme o log.

## Pendências

- **Condição de merge:** nenhuma. A condição do parecer de 2026-07-31 (colunas "Opções
  de deslocamento — Ida/Volta") está **fechada e testada**.
- **Ressalva 1 (a fazer antes do próximo ciclo de PDF):** registrar a decisão de
  estratificar por Serviço como DEC em `docs-dev/10-DECISION_LOG.md` via
  `/registrar-decisao`, com o responsável confirmando o alcance (só PDF, ou PDF + tela).
  Registro documental — não exige tocar código.
- **Ressalva 2 (a fazer no mesmo movimento):** abrir task para a estratificação por
  Serviço no painel de Revisão (`resumo-operacional.tsx`), ou decidir explicitamente que
  a tela permanece só com o total. Enquanto não houver registro, a lacuna do §10 na tela
  fica invisível para quem ler o backlog.
- **Follow-ups já endereçados por task existente:** larguras de coluna (Observação 4) e
  rótulo da RN-069 repetido na paginação (Observação 5) são critério de aceite da
  **TASK-126**, que declara estas colunas como pré-requisito — a ordem correta é
  TASK-033 → TASK-126 → TASK-034/TASK-127.
- **Q-xxx abertas que afetem esta task:** nenhuma.
- **Consequência para outras tasks:** a **TASK-034** herda `ORDEM_BLOCOS` e a folha de
  estilos inalteradas e ganha `rotuloFaixaComIntervalo` e o teste positivo de horas
  permitidas — ao trazer as tabelas horárias (§13.2), esse teste **precisará ser
  estendido**, pois horários de saída passarão a ser conteúdo legítimo do PDF; hoje ele
  os proíbe ([pdf-regras-transversais.test.ts:62-67](../../testes/unitarios/formulario/pdf-regras-transversais.test.ts#L62-L67)).
  A **TASK-126** herda 8 colunas e um resumo bem mais alto que o de `32cd8ae` — o
  dimensionamento de página deve ser feito sobre este conteúdo, não sobre o anterior.

## Decisão

**Aprovado com ressalvas.** A condição de merge do parecer anterior está cumprida com
teste; a Ressalva 2 (ponto final e destino de `descricaoTexto`) e as duas observações
(estratificação por Serviço, ordenação por `ordem`) foram fechadas — e fechadas do jeito
certo, com a regra extraída para função pura e assertável em vez de resolvida dentro do
JSX. Nenhuma RN de criticidade Alta é violada, nenhum NEG-xxx é tocado, o contrato JSON
não muda, o guarda transversal do PDF saiu mais forte e não mais fraco, e as verificações
estão verdes com evidência canônica válida reutilizada. As duas ressalvas remanescentes
são **documentais**, não de código: uma decisão exercida sem registro e uma lacuna do §10
na tela que ficou sem dono. Não bloqueiam o merge — mas, se não virarem DEC e task agora,
o §10 fica cumprido no PDF e esquecido na tela, que é exatamente o desalinhamento que o
parecer de 2026-07-31 pediu para evitar.
