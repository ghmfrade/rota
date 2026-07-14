import type { z } from "zod";
import { esquemaRota, type DescricaoItinerario, type PontoDeRota } from "@/shared/contrato";
import type { ParadaRota } from "./compor-descricao";
import { solicitarRota, type OpcoesClienteOsrm } from "./cliente-osrm";
import type { ResultadoRotaOsrm } from "./extrair-rota";
import type { FalhaOsrm } from "./falhas-osrm";

// Motor headless de "abrir congelado × editar recalcula" (TASK-024; DEC-041,
// Q-022). Entrega só o modelo de estado de rota ao vivo e o orquestrador do
// "soltar" do gesto — o fio dos gestos reais do mapa (arrastar/reordenar/criar
// parada ou ponto de rota) é das TASK-017/018/019, que passam a depender
// funcionalmente deste módulo. Nenhuma UI, nenhum estado de sessão aqui.

/** `Rota` completa (Spec 02 §10.2) — mesma forma que `esquemaRota` valida. */
type Rota = z.infer<typeof esquemaRota>;

/**
 * Estado ao vivo da rota de UM itinerário em edição (DEC-041; RN-015/046/052):
 *
 * - `congelada` — espelha `itinerario.rota` do JSON carregado, sem tocar o
 *   OSRM (RN-052; Spec 04 §3.1 item 6). Resultado de abrir um documento
 *   existente.
 * - `recalculada` — produto de uma edição (parada/coordenada/ponto de rota)
 *   roteada com sucesso (Spec 03 §3.6.2, §3.7.7).
 * - `sem-rota` — o recálculo falhou (RN-048); carrega a `FalhaOsrm` da
 *   taxonomia da TASK-022. Alimenta a pendência bloqueante da TASK-044
 *   (DEC-040) — esta task só produz o estado, não o gate de exportação.
 */
export type EstadoRotaViva =
  | { situacao: "congelada"; rota: Rota }
  | { situacao: "recalculada"; rota: Rota }
  | { situacao: "sem-rota"; falha: FalhaOsrm };

/**
 * Composer da descrição textual do itinerário (`rota.descricao_itinerario`,
 * Spec 02 §10.5) — o algoritmo pleno é `comporDescricao` (`compor-descricao.ts`,
 * TASK-025, Spec 03 §3.7, RN-044/045/046/053), injetado aqui para o motor
 * headless da TASK-024 não antecipá-lo (DEC-041). Assinatura revisada pela
 * TASK-025 (follow-up gravado na revisão da TASK-024): recebe as paradas com
 * o marco de Seção (`ParadaRota`, quando houver) e os nomes de via crus por
 * trecho — os insumos reais de `comporDescricao`.
 */
export type ComporDescricao = (
  paradas: readonly ParadaRota[],
  nomesViasPorTrecho: ResultadoRotaOsrm["nomesViasPorTrecho"],
) => DescricaoItinerario;

/**
 * Materializa o estado `congelada` a partir da `rota` já gravada no JSON
 * (Spec 02 §10.2) — função pura e síncrona, **sem** requisição ao OSRM
 * (RN-052; Spec 04 §3.1 item 6). É o caminho de "abrir JSON".
 */
export function congelarRotaCarregada(rota: Rota): EstadoRotaViva {
  return { situacao: "congelada", rota };
}

/**
 * Entrada de `recalcularItinerario`: paradas já resolvidas em coordenadas,
 * com o marco de Seção quando houver (`ParadaRota` — mesma forma que
 * `solicitarRota` consome, por `extends Ponto`, mais o insumo de
 * `comporDescricao`), e os pontos de rota a reaplicar (Spec 03 §3.6.2 — os
 * persistidos no arquivo, reproduzindo o traçado forçado na reedição sem
 * retrabalho manual).
 */
export interface EntradaRecalculo {
  paradas: readonly ParadaRota[];
  /** Pontos de rota persistidos a reaplicar (default `[]` — itinerário sem
   * traçado forçado). */
  pontosDeRota?: readonly PontoDeRota[];
}

/**
 * Orquestra o "soltar" do gesto de edição (RN-052; Spec 04 §7.3/§7.4):
 * solicita a rota ao OSRM reaplicando os pontos de rota informados e, só em
 * caso de sucesso, recompõe a descrição textual via `comporDescricao`
 * (RN-046/RN-053, §3.7.7). Em falha (RN-048), devolve `sem-rota` sem compor
 * descrição — sem rota válida, nada depois dela é produzido (§3.7.8).
 */
export async function recalcularItinerario(
  entrada: EntradaRecalculo,
  comporDescricao: ComporDescricao,
  opcoesOsrm: OpcoesClienteOsrm = {},
): Promise<EstadoRotaViva> {
  const { paradas, pontosDeRota = [] } = entrada;
  const resultado = await solicitarRota(paradas, { ...opcoesOsrm, pontosDeRota });

  if (!resultado.ok) {
    return { situacao: "sem-rota", falha: resultado.falha };
  }

  const descricao_itinerario = comporDescricao(paradas, resultado.rota.nomesViasPorTrecho);
  const rota: Rota = {
    geometria: resultado.rota.geometria,
    distancia_km: resultado.rota.distancia_km,
    duracao_s: resultado.rota.duracao_s,
    trechos: resultado.rota.trechos,
    pontos_de_rota: resultado.rota.pontos_de_rota,
    descricao_itinerario,
  };
  return { situacao: "recalculada", rota };
}
