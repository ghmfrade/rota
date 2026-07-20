// Cliente OSRM do Formulário (Spec 03 §3.1–§3.6; RN-014/041/042/043/047/048/
// 049/050/051) — URL, intercalação e extração legs→trechos (com e sem pontos
// de rota), conversão m→km e tratamento de falha (retry, taxonomia
// bloqueante, mensagens); o motor headless de estado de rota ao vivo
// "abrir congelado × editar recalcula" (TASK-024; RN-015/046/052); e o
// compositor da descrição textual do itinerário (TASK-025; RN-044/045/046/
// 053, Spec 03 §3.7). O fio dos gestos de mapa (TASK-017/018/019) fica fora
// deste módulo.
export {
  montarUrlOsrm,
  urlBaseOsrm,
  OSRM_BASE_URL_PADRAO,
} from "./url-osrm";
export {
  extrairRota,
  type StepOsrm,
  type LegOsrm,
  type RotaBrutaOsrm,
  type RespostaOsrm,
  type ResultadoRotaOsrm,
  type OpcoesExtrairRota,
} from "./extrair-rota";
export {
  comporDescricao,
  limpaNomes,
  type ParadaRota,
} from "./compor-descricao";
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
export {
  congelarRotaCarregada,
  recalcularItinerario,
  type EstadoRotaViva,
  type EntradaRecalculo,
  type ComporDescricao,
} from "./estado-rota-viva";
export {
  inserirPontoDeRota,
  moverPontoDeRota,
  removerPontoDeRota,
} from "./posicionar-ponto-de-rota";
export {
  classificarMudancaSequenciaParadas,
  reancorarPontosDeRota,
  reancorarPontosDeRotaNaInsercaoPosicional,
  type MudancaSequenciaParadas,
} from "./reancorar-pontos-de-rota";
