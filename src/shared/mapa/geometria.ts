// Conversões puras entre o modelo de coordenadas do componente e o GeoJSON
// consumido pelas fontes do MapLibre. Isolado para testar o desenho de
// LineString (rota) sem depender de WebGL.

import type { FeatureCollection, LineString, Position } from "geojson";

/** Coordenada geográfica em graus. */
export interface Coordenada {
  lng: number;
  lat: number;
}

/** Uma linha (ex.: traçado de rota) a desenhar sobre o mapa. */
export interface LinhaMapa {
  id: string;
  pontos: Coordenada[];
  cor?: string;
  largura?: number;
}

export const COR_LINHA_PADRAO = "#1d4ed8";
export const LARGURA_LINHA_PADRAO = 4;

/** Converte uma Coordenada para o par `[lng, lat]` do GeoJSON. */
export function paraPosicao(c: Coordenada): [number, number] {
  return [c.lng, c.lat];
}

/** Converte uma posição GeoJSON `[longitude, latitude, ...]` para Coordenada. */
function dePosicao([lng, lat]: Position): Coordenada {
  return { lng, lat };
}

/**
 * Converte a `geometria` de uma Rota (GeoJSON `LineString`, coordenadas
 * `[longitude, latitude]` — Spec 02 §10.2) para a `LinhaMapa` que o `<Mapa>`
 * desenha. Função pura: não chama OSRM nem recalcula nada — só reformata a
 * rota já congelada/recalculada (RN-015/RN-046/RN-052).
 */
export function linhaDaGeometria(
  id: string,
  geometria: LineString,
  extras?: Pick<LinhaMapa, "cor" | "largura">,
): LinhaMapa {
  return {
    id,
    pontos: geometria.coordinates.map(dePosicao),
    ...extras,
  };
}

/**
 * Monta a `FeatureCollection` de LineStrings a partir das linhas. Linhas com
 * menos de 2 pontos não formam LineString válida e são descartadas (uma linha
 * degenerada não deve quebrar a fonte do mapa).
 */
export function linhasParaGeoJson(
  linhas: readonly LinhaMapa[],
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: linhas
      .filter((linha) => linha.pontos.length >= 2)
      .map((linha) => ({
        type: "Feature",
        properties: {
          id: linha.id,
          cor: linha.cor ?? COR_LINHA_PADRAO,
          largura: linha.largura ?? LARGURA_LINHA_PADRAO,
        },
        geometry: {
          type: "LineString",
          coordinates: linha.pontos.map(paraPosicao),
        },
      })),
  };
}
