import type { PontoDeRota } from "@/shared/contrato";
import type { ParadaEmEdicao } from "./motor-montagem";

export type ItemListaIntercalada =
  | {
      tipo: "parada";
      parada: ParadaEmEdicao;
      indiceParada: number;
    }
  | {
      tipo: "ponto-de-rota";
      ponto: PontoDeRota;
      indicePonto: number;
      numeroNaTravessia: number;
    };

export type DirecaoMovimentoLista = "cima" | "baixo";

/**
 * Compõe a lista lateral na ordem real da travessia (TASK-079/DEC-060):
 * cada Parada é seguida pelos pontos cujo `apos_parada_ordem` corresponde à
 * sua ordem, preservando entre eles o índice original no array (RN-042).
 * Ponto de rota continua sendo um item discriminado, nunca uma Parada.
 */
export function montarListaIntercaladaItinerario(
  paradas: readonly ParadaEmEdicao[],
  pontosDeRota: readonly PontoDeRota[],
): ItemListaIntercalada[] {
  validarAncoras(paradas.length, pontosDeRota);

  const itens: ItemListaIntercalada[] = [];
  let numeroNaTravessia = 0;

  paradas.forEach((parada, indiceParada) => {
    itens.push({ tipo: "parada", parada, indiceParada });
    const ordemParada = indiceParada + 1;

    pontosDeRota.forEach((ponto, indicePonto) => {
      if (ponto.apos_parada_ordem !== ordemParada) return;
      numeroNaTravessia += 1;
      itens.push({
        tipo: "ponto-de-rota",
        ponto,
        indicePonto,
        numeroNaTravessia,
      });
    });
  });

  return itens;
}

/**
 * Move um ponto uma posição na lista unificada e reconstrói a representação
 * de contrato (`apos_parada_ordem` + ordem no array). Retorna `undefined`
 * quando o movimento deixaria o ponto antes da primeira ou depois da última
 * Parada, impedindo âncoras fora de `[1, paradas.length - 1]` (RN-042).
 * Coordenadas são preservadas integralmente.
 */
export function moverPontoDeRotaNaLista(
  paradas: readonly ParadaEmEdicao[],
  pontosDeRota: readonly PontoDeRota[],
  indicePonto: number,
  direcao: DirecaoMovimentoLista,
): PontoDeRota[] | undefined {
  const itens = montarListaIntercaladaItinerario(paradas, pontosDeRota);
  const indiceItem = itens.findIndex(
    (item) => item.tipo === "ponto-de-rota" && item.indicePonto === indicePonto,
  );
  if (indiceItem < 0) return undefined;

  const indiceDestino = indiceItem + (direcao === "cima" ? -1 : 1);
  if (indiceDestino < 0 || indiceDestino >= itens.length) return undefined;

  const reordenados = [...itens];
  [reordenados[indiceItem], reordenados[indiceDestino]] = [
    reordenados[indiceDestino],
    reordenados[indiceItem],
  ];

  const resultado: PontoDeRota[] = [];
  let paradasPercorridas = 0;
  for (const item of reordenados) {
    if (item.tipo === "parada") {
      paradasPercorridas += 1;
      continue;
    }
    if (paradasPercorridas < 1 || paradasPercorridas >= paradas.length) {
      return undefined;
    }
    resultado.push({ ...item.ponto, apos_parada_ordem: paradasPercorridas });
  }

  return resultado;
}

export function podeMoverPontoDeRotaNaLista(
  paradas: readonly ParadaEmEdicao[],
  pontosDeRota: readonly PontoDeRota[],
  indicePonto: number,
  direcao: DirecaoMovimentoLista,
): boolean {
  return moverPontoDeRotaNaLista(paradas, pontosDeRota, indicePonto, direcao) !== undefined;
}

function validarAncoras(
  quantidadeParadas: number,
  pontosDeRota: readonly PontoDeRota[],
): void {
  const maximoValido = quantidadeParadas - 1;
  for (const ponto of pontosDeRota) {
    if (ponto.apos_parada_ordem < 1 || ponto.apos_parada_ordem > maximoValido) {
      throw new Error(
        `[RN-042] apos_parada_ordem (${ponto.apos_parada_ordem}) deve estar em ` +
          `[1, ${maximoValido}] na lista lateral intercalada.`,
      );
    }
  }
}
