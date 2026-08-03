import { StyleSheet } from "@react-pdf/renderer";

// Folha de estilos do PDF operacional (TASK-033; Spec 04 §13.3 — "legível como
// tabela operacional de linha de ônibus, tipografia tabular").
//
// O PDF não é DOM: as classes Tailwind e os componentes de `shared/ui` não se
// aplicam aqui, e `@react-pdf` só entende sua própria `StyleSheet`. A proibição
// de `style=` inline do `docs-dev/18-DESIGN_SYSTEM.md` vale para a UI web; o
// equivalente aqui é concentrar toda a aparência do PDF neste arquivo, em vez de
// espalhá-la pelo componente. Os valores espelham os tokens do doc 18 (cinzas,
// azul de destaque) transcritos como literais, porque o PDF não lê CSS.

const CINZA_900 = "#111827";
const CINZA_700 = "#374151";
const CINZA_500 = "#6b7280";
const CINZA_200 = "#e5e7eb";
const AZUL_700 = "#1d4ed8";

export const estilosPdf = StyleSheet.create({
  pagina: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    color: CINZA_900,
    fontFamily: "Helvetica",
  },
  tituloDocumento: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
  },
  tituloBloco: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 14,
  },
  tituloItinerario: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
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
  linhaCabecalho: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CINZA_200,
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
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
  subtituloBloco: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
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
});
