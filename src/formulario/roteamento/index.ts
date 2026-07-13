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
  type OpcoesClienteOsrm,
} from "./cliente-osrm";
