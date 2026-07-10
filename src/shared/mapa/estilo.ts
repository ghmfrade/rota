// Builder puro do *style* MapLibre para o mapa base (Spec 01 §8 — OSM/MapLibre).
// Isolado do componente para ser testável sem WebGL e para conter, num só lugar,
// a troca eventual de provedor de tiles (config.ts).

import type { StyleSpecification } from "maplibre-gl";
import { ATRIBUICAO_OSM, urlDeTiles } from "./config";

/** Identificador da fonte e da camada raster de tiles. */
export const ID_FONTE_TILES = "osm";
export const ID_CAMADA_TILES = "osm-tiles";

/**
 * Monta um *style* MapLibre com uma única fonte raster de tiles OSM. `urlTiles`
 * (opcional) sobrepõe o default/env (ver `urlDeTiles`).
 */
export function estiloRasterOsm(urlTiles?: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      [ID_FONTE_TILES]: {
        type: "raster",
        tiles: [urlDeTiles(urlTiles)],
        tileSize: 256,
        attribution: ATRIBUICAO_OSM,
      },
    },
    layers: [
      {
        id: ID_CAMADA_TILES,
        type: "raster",
        source: ID_FONTE_TILES,
      },
    ],
  };
}
