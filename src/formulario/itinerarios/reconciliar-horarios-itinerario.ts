import type { Itinerario, Parada } from "@/shared/contrato";
import { resetarOffsetsEmLote } from "@/formulario/viagens/acoes-grade";
import {
  classificarMudancaSequenciaParadas,
  type MudancaSequenciaParadas,
} from "@/formulario/roteamento";

export interface ResultadoReconciliacaoHorariosItinerario {
  itinerario: Itinerario;
  mudanca: MudancaSequenciaParadas;
  uuidsViagensComAncorasDescartadas: string[];
}

/** Identidade contextual da Parada (Spec 02 §10.1; RN-033). */
function chaveParada(parada: Parada): string {
  return parada.secao_uuid !== undefined
    ? `secao:${parada.secao_uuid}`
    : `local:${parada.local_uuid}`;
}

/**
 * Compõe o Itinerário gravado com Paradas/rota recém-recalculadas e aplica a
 * DEC-048: mudança de ordem/conjunto reseta TODAS as Viagens pela sugestão
 * inicial da rota nova; sequência inalterada preserva os offsets confirmados.
 *
 * As UUIDs retornadas identificam exatamente as âncoras efêmeras que o
 * chamador deve descartar no mesmo update de sessão (DEC-049). Função pura;
 * não muta o Itinerário anterior.
 */
export function reconciliarHorariosAposMudancaItinerario(
  itinerarioAnterior: Itinerario,
  novasParadas: readonly Parada[],
  novaRota: Itinerario["rota"],
): ResultadoReconciliacaoHorariosItinerario {
  const mudanca = classificarMudancaSequenciaParadas(
    itinerarioAnterior.paradas.map(chaveParada),
    novasParadas.map(chaveParada),
  );
  const itinerarioAtualizado: Itinerario = {
    ...itinerarioAnterior,
    paradas: novasParadas.map((parada) => ({ ...parada })),
    rota: novaRota,
  };

  if (mudanca.tipo === "inalterada") {
    return {
      itinerario: itinerarioAtualizado,
      mudanca,
      uuidsViagensComAncorasDescartadas: [],
    };
  }

  return {
    itinerario: resetarOffsetsEmLote(itinerarioAtualizado),
    mudanca,
    uuidsViagensComAncorasDescartadas: itinerarioAnterior.viagens.map(
      (viagem) => viagem.uuid,
    ),
  };
}
