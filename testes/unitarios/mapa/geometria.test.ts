import { describe, expect, it } from "vitest";
import {
  COR_LINHA_PADRAO,
  LARGURA_LINHA_PADRAO,
  linhasParaGeoJson,
  paraPosicao,
  type LinhaMapa,
} from "../../../src/shared/mapa/geometria";

// Unitários (categoria 8, docs-dev/08) — desenho de LineString (rota) sobre o
// mapa base, testado sem WebGL.

describe("paraPosicao", () => {
  it("converte Coordenada para o par [lng, lat] do GeoJSON", () => {
    expect(paraPosicao({ lng: -46.6, lat: -23.5 })).toEqual([-46.6, -23.5]);
  });
});

describe("linhasParaGeoJson", () => {
  it("monta FeatureCollection de LineString com cor/largura default", () => {
    const linhas: LinhaMapa[] = [
      {
        id: "rota",
        pontos: [
          { lng: -46.64, lat: -23.55 },
          { lng: -46.62, lat: -23.54 },
        ],
      },
    ];
    const gj = linhasParaGeoJson(linhas);
    expect(gj.type).toBe("FeatureCollection");
    expect(gj.features).toHaveLength(1);
    const feature = gj.features[0];
    expect(feature.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [-46.64, -23.55],
        [-46.62, -23.54],
      ],
    });
    expect(feature.properties).toMatchObject({
      id: "rota",
      cor: COR_LINHA_PADRAO,
      largura: LARGURA_LINHA_PADRAO,
    });
  });

  it("preserva cor/largura customizadas", () => {
    const gj = linhasParaGeoJson([
      {
        id: "x",
        pontos: [
          { lng: 0, lat: 0 },
          { lng: 1, lat: 1 },
        ],
        cor: "#ff0000",
        largura: 8,
      },
    ]);
    expect(gj.features[0].properties).toMatchObject({
      cor: "#ff0000",
      largura: 8,
    });
  });

  // Caso inválido: linha degenerada (< 2 pontos) não forma LineString e é
  // descartada, sem quebrar a fonte do mapa.
  it("descarta linhas com menos de 2 pontos", () => {
    const gj = linhasParaGeoJson([
      { id: "vazia", pontos: [] },
      { id: "unica", pontos: [{ lng: 0, lat: 0 }] },
      {
        id: "valida",
        pontos: [
          { lng: 0, lat: 0 },
          { lng: 1, lat: 1 },
        ],
      },
    ]);
    expect(gj.features).toHaveLength(1);
    expect(gj.features[0].properties?.id).toBe("valida");
  });
});
