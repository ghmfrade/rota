import type { PontoDeRota } from "@/shared/contrato";
// Submódulos diretos, não o índice de `shared/mapa` — o índice reexporta
// `./mapa` (importa `maplibre-gl`/CSS), inadequado para este módulo headless
// (`shared/mapa/index.ts` documenta a mesma restrição para testes de node).
import { projetarNaLinha } from "@/shared/mapa/ancoragem";
import type { Coordenada } from "@/shared/mapa/geometria";

// Posicionamento de pontos de rota dentro do array `rota.pontos_de_rota[]`
// (TASK-063; Spec 03 §3.6.1). A regra de travessia é o par
// `(apos_parada_ordem, índice no array)` — inserir sempre ao fim (como
// `Array.push`) quebraria essa regra sempre que o trecho já tiver outro
// ponto de rota. Este módulo insere o ponto novo na posição do array que
// preserva a ordem ao longo do traçado (RN-042), reprojetando os pontos
// existentes do MESMO trecho sobre a linha da rota para compará-los.

const paraCoordenada = (p: Pick<PontoDeRota, "latitude" | "longitude">): Coordenada => ({
  lng: p.longitude,
  lat: p.latitude,
});

function distanciaAoLongo(ponto: Coordenada, linhaRota: readonly Coordenada[]): number {
  return projetarNaLinha(ponto, linhaRota)?.distanciaAoLongoM ?? 0;
}

/**
 * Insere um ponto de rota novo, na posição do array que preserva a ordem de
 * travessia `(apos_parada_ordem, índice no array)` (§3.6.1): depois de todo
 * ponto de trecho anterior, antes de todo ponto de trecho posterior e, no
 * mesmo trecho, na posição correspondente à distância ao longo do traçado.
 * Não muta `pontosExistentes`.
 */
export function inserirPontoDeRota(
  pontosExistentes: readonly PontoDeRota[],
  linhaRota: readonly Coordenada[],
  novo: { latitude: number; longitude: number; aposParadaOrdem: number },
): PontoDeRota[] {
  const distanciaNovo = distanciaAoLongo(paraCoordenada(novo), linhaRota);

  let indiceInsercao = pontosExistentes.length;
  for (let i = 0; i < pontosExistentes.length; i++) {
    const existente = pontosExistentes[i];
    if (existente.apos_parada_ordem > novo.aposParadaOrdem) {
      indiceInsercao = i;
      break;
    }
    if (
      existente.apos_parada_ordem === novo.aposParadaOrdem &&
      distanciaAoLongo(paraCoordenada(existente), linhaRota) > distanciaNovo
    ) {
      indiceInsercao = i;
      break;
    }
  }

  const copia = [...pontosExistentes];
  copia.splice(indiceInsercao, 0, {
    apos_parada_ordem: novo.aposParadaOrdem,
    latitude: novo.latitude,
    longitude: novo.longitude,
  });
  return copia;
}

/**
 * Move o ponto de rota do índice `indice` para a nova coordenada, sem
 * re-ancorar (a re-ancoragem por mudança do CONJUNTO de paradas é a
 * DEC-056/TASK-066; arrastar o próprio vértice apenas muda a coordenada
 * dentro do mesmo trecho — Spec 03 §3.6 regra 1, "ancorado ao trecho que
 * molda"). Não muta `pontos`.
 */
export function moverPontoDeRota(
  pontos: readonly PontoDeRota[],
  indice: number,
  novaPosicao: { latitude: number; longitude: number },
): PontoDeRota[] {
  return pontos.map((ponto, i) =>
    i === indice ? { ...ponto, latitude: novaPosicao.latitude, longitude: novaPosicao.longitude } : ponto,
  );
}

/** Remove o ponto de rota do índice `indice`. Não muta `pontos`. */
export function removerPontoDeRota(
  pontos: readonly PontoDeRota[],
  indice: number,
): PontoDeRota[] {
  const copia = [...pontos];
  copia.splice(indice, 1);
  return copia;
}
