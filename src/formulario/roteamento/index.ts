// Cliente OSRM do Formulário (Spec 03 §3.1–§3.6; RN-014/041/042/043/047/048/
// 049/050/051) — URL, intercalação e extração legs→trechos (com e sem pontos
// de rota), conversão m→km e tratamento de falha (retry, taxonomia
// bloqueante, mensagens). Descrição textual (TASK-025) fica fora deste
// módulo.
export {
  montarUrlOsrm,
  urlBaseOsrm,
  OSRM_BASE_URL_PADRAO,
} from "./url-osrm";
export {
  extrairRota,
  type LegOsrm,
  type RotaBrutaOsrm,
  type RespostaOsrm,
  type ResultadoRotaOsrm,
  type OpcoesExtrairRota,
} from "./extrair-rota";
export {
  intercalarPontosDeRota,
  type SequenciaIntercalada,
} from "./intercalar-pontos-de-rota";
// `arredondaHalfUp` foi consolidado em `shared/calculo` (TASK-043) — reexportado
// aqui para não quebrar quem já importa de `@/formulario/roteamento`.
export { arredondaHalfUp } from "@/shared/calculo";
export {
  solicitarRota,
  OSRM_TIMEOUT_PADRAO_MS,
  type OpcoesClienteOsrm,
} from "./cliente-osrm";
export {
  mensagemDeFalha,
  type FalhaOsrm,
  type ResultadoRoteamento,
} from "./falhas-osrm";
