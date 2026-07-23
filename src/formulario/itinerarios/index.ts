// Montagem do itinerário (TASK-019; Spec 04 §7.1–§7.4; RN-030, RN-033..036,
// RN-038): motor puro de paradas, fiação do estado de rota ao vivo por
// itinerário (DEC-041/046/047) e a etapa real "Seções, Locais e Itinerários"
// que fecha o fio da TASK-044 (`ItinerarioAoVivo` → `coletarPendencias`).
export {
  paradaDeSecao,
  paradaDeLocal,
  chaveParadaEmEdicao,
  inserirParada,
  removerParada,
  reordenarParada,
  removerParadasDeLocal,
  ocorrenciasLocaisEmExtremo,
  paradasParaContrato,
  paradasEmEdicaoDeContrato,
  validarMontagem,
  conjuntoSecoesConsistente,
  resolverParadasRota,
  subsequenciaSecoes,
  espelharInsercaoDeSecao,
  espelharRemocaoDeSecao,
  espelharMovimentoDeSecao,
  espelharGestoDeSecao,
  type ParadaEmEdicao,
  type PosicaoExtrema,
  type OcorrenciaLocalExtremo,
  type CodigoViolacaoMontagem,
  type ViolacaoMontagem,
  type ResultadoParadasRota,
  type GestoSecao,
} from "./motor-montagem";
export {
  chaveItinerario,
  dispararRecalculo,
  itinerariosAoVivoDaSessao,
  pontosDeRotaDoItinerario,
  type EstadosRotaViva,
  type ResultadoDispararRecalculo,
} from "./estado-itinerarios";
export { promoverServico, promoverServicoNaSessao } from "./promocao-servico";
export {
  reconciliarHorariosAposMudancaItinerario,
  type ResultadoReconciliacaoHorariosItinerario,
} from "./reconciliar-horarios-itinerario";
export { EtapaItinerarios } from "./etapa-itinerarios";
export {
  EditorMapaItinerario,
  type PropsEditorMapaItinerario,
} from "./editor-mapa-itinerario";
export {
  PainelReusoSecao,
  type PropsPainelReusoSecao,
} from "./painel-reuso-secao";
