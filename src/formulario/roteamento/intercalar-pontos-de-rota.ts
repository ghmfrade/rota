import type { Ponto } from "@/shared/geo";
import type { PontoDeRota } from "@/shared/contrato";

// Intercalação de pontos de rota na sequência de coordenadas do OSRM (Spec 03
// §3.6, §3.6.1; RN-042). Vértices de forçamento não são Parada nem Seção — só
// influenciam o traçado (RN-043) — por isso entram na requisição como
// coordenadas adicionais, nunca como paradas novas.

/** Resultado da intercalação: a sequência completa de coordenadas a enviar ao
 * OSRM e os índices (0-based), dentro dela, que correspondem às paradas
 * originais — usados para `waypoints` (§3.2) e para a extração (§3.6.1). */
export interface SequenciaIntercalada {
  coordenadas: Ponto[];
  indicesParadas: number[];
}

/**
 * Percorre as paradas em ordem e, após a parada `k` (1-based, `ordem` na
 * travessia), insere todos os pontos de rota com `apos_parada_ordem == k`, na
 * ordem em que aparecem no array de entrada (RN-042 — ordem de travessia =
 * `(apos_parada_ordem, índice no array)`). Sem pontos de rota, devolve a
 * sequência idêntica às paradas (compatível com o caminho da TASK-021).
 *
 * `apos_parada_ordem` deve estar em `[1, paradas.length - 1]` (Spec 02 §10.4)
 * — fora desse intervalo lança erro identificável (RN-042).
 */
export function intercalarPontosDeRota(
  paradas: readonly Ponto[],
  pontosDeRota: readonly PontoDeRota[] = [],
): SequenciaIntercalada {
  const maximoValido = paradas.length - 1;
  for (const ponto of pontosDeRota) {
    if (ponto.apos_parada_ordem < 1 || ponto.apos_parada_ordem > maximoValido) {
      throw new Error(
        `[RN-042] apos_parada_ordem (${ponto.apos_parada_ordem}) deve estar em ` +
          `[1, ${maximoValido}] (Spec 02 §10.4) — nunca após a última parada.`,
      );
    }
  }

  const coordenadas: Ponto[] = [];
  const indicesParadas: number[] = [];

  paradas.forEach((parada, indice) => {
    const ordemParada = indice + 1;
    coordenadas.push(parada);
    indicesParadas.push(coordenadas.length - 1);

    pontosDeRota
      .filter((ponto) => ponto.apos_parada_ordem === ordemParada)
      .forEach((ponto) => {
        coordenadas.push({ latitude: ponto.latitude, longitude: ponto.longitude });
      });
  });

  return { coordenadas, indicesParadas };
}
