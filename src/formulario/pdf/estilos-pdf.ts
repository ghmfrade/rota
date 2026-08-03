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
  sequenciaSecoes: {
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    color: AZUL_700,
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
  imagemMapa: {
    marginTop: 4,
    marginBottom: 8,
    width: "100%",
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
  celulaDiagonal: {
    flex: 1.4,
    paddingHorizontal: 3,
    textAlign: "center",
    color: CINZA_500,
  },
  // Matriz triangular do PDF (correção da TASK-034; DEC-107) — largura FIXA
  // por coluna, nunca `flex`: o `flex` reparte a largura DENTRO de cada linha,
  // então linhas com números de células diferentes (o triângulo) nunca
  // alinhavam sob o mesmo cabeçalho (causa do desalinhamento reprovado no
  // parecer). Estilos exclusivos desta matriz — não confundir com
  // `celulaMatriz`/`celulaCabecalhoMatriz`/`celulaDiagonal` acima, que
  // continuam servindo só a tabela de Locais do anexo técnico.
  tabelaMatriz: {
    borderTopWidth: 1,
    borderTopColor: CINZA_200,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  // Coluna do rótulo de linha (`Cidade - Nome da Seção`), que continua
  // horizontal — só os cabeçalhos de COLUNA giram (D6).
  cabecalhoLinhaMatriz: {
    width: 130,
    paddingHorizontal: 3,
  },
  celulaMatrizValor: {
    width: 38,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  celulaMatrizDiagonal: {
    width: 38,
    paddingHorizontal: 3,
    textAlign: "center",
    color: CINZA_500,
  },
  celulaMatrizVazia: {
    width: 38,
    paddingHorizontal: 3,
  },
  // Linha de cabeçalho com altura reservada (vinda do bloco — `alturaCabecalho`
  // é o único valor de estilo dinâmico do documento, ver o comentário no
  // componente) para os rótulos diagonais não serem cortados.
  linhaCabecalhoDiagonal: {
    flexDirection: "row",
    backgroundColor: CINZA_100,
    borderBottomWidth: 1,
    borderBottomColor: CINZA_200,
    fontFamily: "Helvetica-Bold",
    color: CINZA_900,
  },
  // Contêiner de cada coluna do cabeçalho — `position: relative` ancora o
  // rótulo `absolute` dentro dos 38 pt da própria coluna, não da linha
  // inteira; a altura vem do `stretch` padrão do Yoga (herda a altura fixada
  // em `linhaCabecalhoDiagonal`).
  cabecalhoColunaDiagonal: {
    width: 38,
    position: "relative",
  },
  // Rótulo do cabeçalho de coluna girado a 45° (D6). `transform` não afeta o
  // layout (só a pintura) — por isso a altura da linha é reservada à parte, e
  // o rótulo é ancorado no canto inferior esquerdo da própria coluna
  // (`transformOriginX/Y`) para subir para a direita sem empurrar nada.
  rotuloColunaDiagonal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    fontSize: 8,
    color: CINZA_900,
    transformOriginX: "0%",
    transformOriginY: "100%",
    transform: "rotate(-45deg)",
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
