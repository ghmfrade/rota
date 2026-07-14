export {
  calcularMatrizDistancias,
  matrizDistanciasDoServico,
  matrizDistanciasDesatualizada,
  secoesAtendidas,
  chaveParNaoDirecional,
} from "./calculo-matriz-distancias";
export {
  celulaDistancia,
  formatarKm,
  type CelulaDistancia,
} from "./apresentacao-matriz-distancias";
export {
  sugerirMenorDistancia,
  sugerirDistanciaDoServico,
} from "./sugestoes-seccionamento";
export {
  habilitarPar,
  desabilitarPar,
  definirDistancia,
  aplicarSugestaoEmLote,
  type MotivoRecusaHabilitar,
  type ResultadoHabilitarPar,
  type ModoSugestaoSeccionamento,
} from "./edicao-seccionamento";
export { EtapaMatrizes } from "./etapa-matrizes";
