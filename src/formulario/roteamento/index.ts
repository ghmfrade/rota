// Cliente OSRM do Formulário (Spec 03 §3.1–§3.4; RN-014/041/047/050) — URL,
// extração legs→trechos e conversão m→km. Pontos de rota (TASK-023),
// tratamento de falha (TASK-022) e descrição textual (TASK-025) ficam fora
// deste módulo.
export {
  montarUrlOsrm,
  urlBaseOsrm,
  OSRM_BASE_URL_PADRAO,
} from "./url-osrm";
export {
  extrairRota,
  arredondaHalfUp,
  type LegOsrm,
  type RotaBrutaOsrm,
  type RespostaOsrm,
  type ResultadoRotaOsrm,
} from "./extrair-rota";
export {
  solicitarRota,
  type OpcoesClienteOsrm,
} from "./cliente-osrm";
