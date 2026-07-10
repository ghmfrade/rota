import { describe, expect, it } from "vitest";
import {
  estiloRasterOsm,
  ID_CAMADA_TILES,
  ID_FONTE_TILES,
} from "../../../src/shared/mapa/estilo";
import {
  ATRIBUICAO_OSM,
  TILES_URL_PADRAO,
} from "../../../src/shared/mapa/config";

// Unitários (categoria 8, docs-dev/08) — style MapLibre com fonte raster OSM
// única (Spec 01 §8), testado sem WebGL.

describe("estiloRasterOsm (Spec 01 §8)", () => {
  it("monta um style v8 com fonte raster apontando para o default OSM", () => {
    const estilo = estiloRasterOsm();
    expect(estilo.version).toBe(8);
    const fonte = estilo.sources[ID_FONTE_TILES];
    expect(fonte).toMatchObject({
      type: "raster",
      tiles: [TILES_URL_PADRAO],
      tileSize: 256,
      attribution: ATRIBUICAO_OSM,
    });
  });

  it("tem uma única camada raster ligada à fonte de tiles", () => {
    const estilo = estiloRasterOsm();
    expect(estilo.layers).toHaveLength(1);
    expect(estilo.layers[0]).toMatchObject({
      id: ID_CAMADA_TILES,
      type: "raster",
      source: ID_FONTE_TILES,
    });
  });

  it("respeita o override de URL de tiles", () => {
    const estilo = estiloRasterOsm("https://custom.example/{z}/{x}/{y}.png");
    const fonte = estilo.sources[ID_FONTE_TILES] as { tiles: string[] };
    expect(fonte.tiles).toEqual(["https://custom.example/{z}/{x}/{y}.png"]);
  });
});
