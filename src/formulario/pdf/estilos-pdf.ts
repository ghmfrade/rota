import { StyleSheet } from "@react-pdf/renderer";

// Folha de estilos do PDF operacional (TASK-033/TASK-126; Spec 04 §13.3 —
// "legível como tabela operacional de linha de ônibus, tipografia tabular").
//
// O PDF não é DOM: as classes Tailwind e os componentes de `shared/ui` não se
// aplicam aqui, e `@react-pdf` só entende sua própria `StyleSheet`. A proibição
// de `style=` inline do `docs-dev/18-DESIGN_SYSTEM.md` vale para a UI web; o
// equivalente aqui é concentrar toda a aparência do PDF neste arquivo, em vez
// de espalhá-la pelo componente. Os valores são os tokens do doc 18 §2,
// transcritos como literais porque o PDF não lê CSS/`@theme`.

/** Paleta do PDF — cada valor é o mesmo hex do token `--color-*` do doc 18 §2. */
export const PALETA_PDF = {
  cinza900: "#0f172a",
  cinza700: "#334155",
  cinza500: "#64748b",
  cinza200: "#e2e8f0",
  cinza100: "#f1f5f9",
  cinza50: "#f8fafc",
  azul900: "#1e3a5f",
  azul700: "#1d4ed8",
  azul600: "#2563eb",
  azul100: "#dbeafe",
} as const;

const {
  cinza900: CINZA_900,
  cinza700: CINZA_700,
  cinza500: CINZA_500,
  cinza200: CINZA_200,
  cinza100: CINZA_100,
  cinza50: CINZA_50,
  azul900: AZUL_900,
  azul700: AZUL_700,
  azul600: AZUL_600,
  azul100: AZUL_100,
} = PALETA_PDF;

export const estilosPdf = StyleSheet.create({
  pagina: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    color: CINZA_900,
    fontFamily: "Helvetica",
  },
  // Capa (§13.1 item 1) — página própria (§13.3, "uma página por bloco
  // lógico"): título, código em corpo destacado, pares rótulo-valor, selo.
  paginaCapa: {
    paddingTop: 96,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    color: CINZA_900,
    fontFamily: "Helvetica",
  },
  tituloDocumento: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: CINZA_500,
    marginBottom: 8,
  },
  codigoCapa: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
    marginBottom: 28,
  },
  tituloBloco: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
    marginBottom: 6,
    marginTop: 14,
  },
  tituloItinerario: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
    marginBottom: 4,
    marginTop: 12,
  },
  linhaIdentificacao: {
    flexDirection: "row",
    marginBottom: 3,
  },
  rotuloIdentificacao: {
    width: 120,
    color: CINZA_500,
  },
  valorIdentificacao: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
  },
  // Pares rótulo-valor da capa — linha mais espaçada que a identificação dos
  // blocos de Serviço, para a página isolada não parecer uma tabela comprimida.
  linhaCapa: {
    flexDirection: "row",
    marginBottom: 10,
  },
  rotuloCapa: {
    width: 160,
    color: CINZA_500,
    fontSize: 10,
  },
  valorCapa: {
    flex: 1,
    fontSize: 10,
    color: CINZA_900,
  },
  seloStatus: {
    alignSelf: "flex-start",
    backgroundColor: AZUL_100,
    color: AZUL_900,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    textTransform: "uppercase",
  },
  rotuloContagem: {
    color: CINZA_700,
    marginBottom: 6,
  },
  tabela: {
    borderTopWidth: 1,
    borderTopColor: CINZA_200,
    marginBottom: 8,
  },
  linhaTabela: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CINZA_200,
    paddingVertical: 3,
  },
  // Zebra: só as linhas de dados ímpares recebem o fundo — cabeçalho e total
  // têm estilo próprio, para as três faixas ficarem distinguíveis (TASK-126).
  linhaTabelaZebra: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CINZA_200,
    paddingVertical: 3,
    backgroundColor: CINZA_50,
  },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: CINZA_100,
    borderBottomWidth: 1,
    borderBottomColor: CINZA_200,
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
  },
  // Linha de total: distinta do cabeçalho (borda superior mais forte, sem
  // fundo) — antes reusava `linhaCabecalho` (observação 4 do parecer TASK-033).
  linhaTotal: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: CINZA_900,
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
  },
  celula: {
    flex: 1,
    paddingHorizontal: 3,
  },
  // A coluna "Faixa" carrega rótulo + intervalo ("Entre-pico almoço
  // (11:00–13:59)") e não cabe na largura das colunas numéricas.
  celulaFaixa: {
    flex: 2.4,
    paddingHorizontal: 3,
  },
  // Larguras proporcionais da tabela de resumo por Serviço (8 colunas):
  // "Serviço" precisa de mais espaço que as 7 colunas numéricas, que dividem o
  // restante igualmente (TASK-126 — nada de `flex: 1` uniforme).
  celulaServico: {
    flex: 1.6,
    paddingHorizontal: 3,
  },
  // Terceiro nível da hierarquia tipográfica (§13.3): abaixo de `tituloBloco`
  // em corpo e distinto dele em cor — o azul primário do doc 18 §2 marca o
  // subtítulo sem competir com o título, que fica no cinza mais escuro.
  subtituloBloco: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: AZUL_600,
    marginTop: 10,
    marginBottom: 4,
  },
  notaTabela: {
    color: CINZA_500,
    marginBottom: 4,
  },
  celulaNumerica: {
    flex: 1,
    paddingHorizontal: 3,
    textAlign: "right",
  },
  // §13.4 — parágrafo corrido, nunca tabela; Seções em destaque, vias simples.
  paragrafoDescricao: {
    marginBottom: 6,
    lineHeight: 1.4,
  },
  descricaoSecao: {
    fontFamily: "Helvetica-Bold",
    color: AZUL_700,
  },
  descricaoVia: {
    color: CINZA_700,
  },
  // DEC-109 item 3/DEC-111 item 3 — largura útil (515,28 pt) na proporção
  // 1400×840 da captura (`LARGURA_CAPTURA`/`ALTURA_CAPTURA`) = 309,17 pt; o
  // teto é a própria altura natural, então não recorta a imagem no caso
  // comum — só quando `documento-pdf-operacional.tsx` sobrepõe `height`
  // menor, no último degrau da escada de acomodação (DEC-111 item 4-iii).
  imagemMapa: {
    marginTop: 4,
    marginBottom: 8,
    width: "100%",
    maxHeight: 309.17,
    objectFit: "contain",
  },
  avisoSemImagem: {
    marginTop: 4,
    marginBottom: 8,
    color: CINZA_500,
  },
  // Legenda vertical do bloco de itinerário (DEC-105; TASK-127) — só Seções
  // (RN-076), símbolo numerado + `Cidade - Nome`, ligados por conector azul.
  legendaItinerario: {
    marginTop: 4,
    marginBottom: 8,
  },
  // Duas colunas lado a lado a partir de 12 Seções (DEC-111 item 1); a
  // largura de 48% com `space-between` deixa uma margem entre as colunas sem
  // depender de `gap`.
  legendaColunas: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendaColuna: {
    width: "48%",
  },
  legendaLinha: {
    flexDirection: "row",
  },
  // Coluna do símbolo + conector, largura fixa para o nome alinhar em coluna.
  legendaColunaSimbolo: {
    width: 18,
    alignItems: "center",
  },
  // Mesma cor/forma do quadrado de Seção da DEC-069, em escala de legenda.
  legendaSimbolo: {
    width: 13,
    height: 13,
    backgroundColor: AZUL_700,
    alignItems: "center",
    justifyContent: "center",
  },
  legendaNumero: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: CINZA_50,
  },
  // Conector vertical entre um símbolo e o próximo — some no último item.
  legendaConector: {
    width: 1.5,
    height: 10,
    backgroundColor: AZUL_700,
    marginTop: 1,
  },
  legendaNome: {
    flex: 1,
    paddingLeft: 6,
    paddingBottom: 8,
  },
  // Tabelas horárias (§13.2, TASK-034): grade Seções × dias. A coluna da Seção
  // carrega `Cidade - Nome` e é bem mais larga que as 7 colunas de horário,
  // que têm largura fixa conhecida (HH:MM) e dividem o resto igualmente.
  celulaSecaoHoraria: {
    flex: 2.6,
    paddingHorizontal: 3,
  },
  celulaHorario: {
    flex: 1,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  // Separador entre blocos (posições ordinais de partida — §8.1): a borda
  // superior mais forte impede que dois blocos consecutivos sejam lidos como
  // uma única viagem de muitas Seções.
  blocoHorario: {
    borderTopWidth: 1,
    borderTopColor: CINZA_500,
  },
  avisoGradeVazia: {
    color: CINZA_500,
    marginBottom: 8,
  },
  // Matrizes (§9.1/§9.2): triangular inferior. A coluna de cabeçalho de linha
  // repete o padrão `Cidade - Nome`; as células de valor são estreitas e
  // centradas, como na tela.
  celulaCabecalhoMatriz: {
    flex: 2.6,
    paddingHorizontal: 3,
  },
  celulaMatriz: {
    flex: 1.4,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  // Detalhe Ida/Volta do par bidirecional (§9.1) — na tela é expansível; no
  // papel fica sob o valor adotado, em corpo menor.
  detalheMatriz: {
    fontSize: 6,
    color: CINZA_500,
    textAlign: "center",
  },
  // Matriz triangular do PDF (correção da TASK-034; DEC-107) — largura FIXA
  // por coluna, nunca `flex`: o `flex` reparte a largura DENTRO de cada linha,
  // então linhas com números de células diferentes (o triângulo) nunca
  // alinhavam sob o mesmo cabeçalho (causa do desalinhamento reprovado no
  // parecer). Estilos exclusivos desta matriz — não confundir com
  // `celulaMatriz`/`celulaCabecalhoMatriz` acima, que continuam servindo só a
  // tabela de Locais do anexo técnico.
  tabelaMatriz: {
    borderTopWidth: 1,
    borderTopColor: CINZA_200,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  // Coluna do rótulo de linha (`Cidade - Nome da Seção`), sempre horizontal.
  // 170 pt (DEC-110 item 2): o nome mais longo da escala real medido no layout
  // real — "Praia Grande - Rodoviária Praia Grande", 160,2 pt a 9 pt de corpo —
  // cabe em UMA linha nos 164 pt úteis; a 130 pt quebrava em duas.
  // `justifyContent: center` centra o rótulo verticalmente na linha (a caixa
  // estica com a linha; sem ele o texto ficava colado no topo, contra a imagem
  // normativa da DEC-108).
  cabecalhoLinhaMatriz: {
    width: 170,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  // Réguas verticais entre colunas (DEC-110 item 6): `CINZA_500`, distinto do
  // `CINZA_200` dos separadores horizontais, e desenhadas EM ESCADA — só nas
  // células habitadas e na primeira célula de preenchimento à direita da
  // diagonal, que fecha a escada. O triângulo superior vazio não recebe régua,
  // como na imagem normativa `docs-dev/tabela distancias PDF.jpg`.
  celulaMatrizValor: {
    width: 38,
    paddingHorizontal: 3,
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: CINZA_500,
  },
  // Última célula da linha quando ela é habitada (a linha ocupa a faixa
  // inteira): fecha a escada pela direita, já que não há célula seguinte.
  celulaMatrizValorFinal: {
    width: 38,
    paddingHorizontal: 3,
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: CINZA_500,
    borderRightWidth: 1,
    borderRightColor: CINZA_500,
  },
  celulaMatrizDiagonal: {
    width: 38,
    paddingHorizontal: 3,
    textAlign: "center",
    color: CINZA_500,
    borderLeftWidth: 1,
    borderLeftColor: CINZA_500,
  },
  celulaMatrizDiagonalFinal: {
    width: 38,
    paddingHorizontal: 3,
    textAlign: "center",
    color: CINZA_500,
    borderLeftWidth: 1,
    borderLeftColor: CINZA_500,
    borderRightWidth: 1,
    borderRightColor: CINZA_500,
  },
  // Célula de preenchimento do triângulo superior (DEC-108) — `position:
  // relative` ancora o rótulo de coluna `absolute` que ela pode hospedar
  // (`rotuloColunaMatriz`); sem rótulo, permanece vazia como antes.
  celulaMatrizVazia: {
    width: 38,
    paddingHorizontal: 3,
    position: "relative",
  },
  // Preenchimento imediatamente à direita da última célula habitada: recebe a
  // régua esquerda para fechar o degrau da escada (DEC-110 item 6). É também a
  // célula que hospeda o rótulo da coluna seguinte (DEC-108 item 1).
  celulaMatrizVaziaBorda: {
    width: 38,
    paddingHorizontal: 3,
    position: "relative",
    borderLeftWidth: 1,
    borderLeftColor: CINZA_500,
  },
  // Linha de cabeçalho acima da matriz (DEC-108 item 2): sem altura dinâmica
  // — nenhum texto girado, então a linha tem a altura natural de uma linha.
  // Só a primeira coluna da faixa recebe rótulo aqui; as demais nascem dentro
  // do triângulo superior (`rotuloColunaHospedada`).
  // `minHeight` acomoda o rótulo da coluna 0, que é absoluto e ancorado no
  // RODAPÉ da célula (DEC-110): sem altura, a célula vazia mediria 0 pt e o
  // rótulo seria desenhado acima da própria linha, sobre o título do bloco.
  linhaCabecalhoMatriz: {
    flexDirection: "row",
    backgroundColor: CINZA_100,
    borderBottomWidth: 1,
    borderBottomColor: CINZA_200,
    paddingVertical: 4,
    minHeight: 18,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
  },
  // Rótulo horizontal da coluna (DEC-108 item 1 — substitui o cabeçalho
  // diagonal da DEC-107 item 1): **sem** `transform`. `width` fixo (maior que
  // os 38 pt da própria coluna) é o que garante `lines.length === 1` — um
  // filho absoluto sem largura própria seria medido contra a coluna estreita
  // e quebraria antes de qualquer rotação (causa da reprovação da TASK-034).
  //
  // 117 pt (DEC-110 item 3) é o teto aritmético com 7 colunas e rótulo de
  // linha a 170: o rótulo da ÚLTIMA coluna começa em
  // `40 + 170 + 6×38 = 438` e termina em `555`, dentro da margem direita
  // (555,3 pt). Como o contrato JSON não limita o nome da Seção, a garantia de
  // uma linha não vem da largura e sim de `maxLines: 1` — o excedente é
  // truncado com reticências (`textOverflow`), nunca quebrado. Ambos são lidos
  // do ESTILO pelo `@react-pdf/layout` (as props homônimas de `Text` são
  // ignoradas — verificado no motor).
  //
  // Ancorado no rodapé-esquerda da célula (DEC-110/parecer problema 3): o "X"
  // da própria coluna fica na linha imediatamente abaixo, e `top: 0` deixava o
  // rótulo a até 22,4 pt dele em linha alta (par bidirecional).
  rotuloColunaMatriz: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 117,
    maxLines: 1,
    textOverflow: "ellipsis",
    fontSize: 7,
    color: CINZA_900,
  },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: CINZA_200,
    paddingTop: 6,
    fontSize: 7,
    color: CINZA_500,
  },
  // Primeira linha do rodapé: schema/geração à esquerda, "Página X de Y"
  // (TASK-126) à direita, na mesma linha.
  rodapeLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
