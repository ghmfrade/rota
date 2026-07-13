// Cliente OSRM do Formulário (Spec 03 §3.1–§3.5; RN-014/041/047/048/049/050) —
// URL, extração legs→trechos, conversão m→km e tratamento de falha (retry,
// taxonomia bloqueante, mensagens). Pontos de rota (TASK-023) e descrição
// textual (TASK-025) ficam fora deste módulo.
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
} from "./extrair-rota";
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
