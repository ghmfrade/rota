import type { LineString } from "geojson";
import { describe, expect, it } from "vitest";
import {
  COR_LINHA_PADRAO,
  LARGURA_LINHA_PADRAO,
  limitesDaGeometria,
  limitesDeCoordenadas,
  linhaDaGeometria,
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

describe("linhaDaGeometria", () => {
  // TASK-059 — conversor `rota.geometria` (GeoJSON LineString, Spec 02 §10.2)
  // → LinhaMapa, para desenhar a rota ativa da etapa de itinerários.

  it("converte coordinates [lon,lat] para pontos {lng,lat} preservando a ordem", () => {
    const geometria: LineString = {
      type: "LineString",
      coordinates: [
        [-46.64, -23.55],
        [-46.62, -23.54],
        [-46.6, -23.53],
      ],
    };
    const linha = linhaDaGeometria("rota-ativa", geometria);
    expect(linha).toEqual<LinhaMapa>({
      id: "rota-ativa",
      pontos: [
        { lng: -46.64, lat: -23.55 },
        { lng: -46.62, lat: -23.54 },
        { lng: -46.6, lat: -23.53 },
      ],
    });
  });

  it("não confunde geometrias de ida e volta (ids e traçados distintos)", () => {
    const geometriaIda: LineString = {
      type: "LineString",
      coordinates: [
        [-46.64, -23.55],
        [-46.62, -23.54],
      ],
    };
    const geometriaVolta: LineString = {
      type: "LineString",
      coordinates: [
        [-46.62, -23.54],
        [-46.64, -23.55],
      ],
    };
    const linhaIda = linhaDaGeometria("rota-ida", geometriaIda);
    const linhaVolta = linhaDaGeometria("rota-volta", geometriaVolta);
    expect(linhaIda.id).toBe("rota-ida");
    expect(linhaVolta.id).toBe("rota-volta");
    expect(linhaIda.pontos).not.toEqual(linhaVolta.pontos);
  });

  it("repassa cor/largura opcionais quando informadas", () => {
    const geometria: LineString = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };
    const linha = linhaDaGeometria("rota-ativa", geometria, { cor: "#ff0000", largura: 6 });
    expect(linha.cor).toBe("#ff0000");
    expect(linha.largura).toBe(6);
  });

  // Caso inválido: LineString com o mínimo estrutural (2 pontos, Spec 02
  // §10.2) continua convertendo normalmente — degeneração é tratada a jusante
  // por `linhasParaGeoJson` (linha com < 2 pontos é descartada), não aqui.
  it("converte o mínimo de 2 pontos sem descartar (a rejeição de linha degenerada é de linhasParaGeoJson)", () => {
    const geometria: LineString = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };
    const linha = linhaDaGeometria("rota-ativa", geometria);
    expect(linha.pontos).toHaveLength(2);
  });
});

// DEC-104 / Spec 04 §13.1 item 4d — enquadramento da rota na imagem do mapa do
// PDF: a rota precisa aparecer centralizada e inteiramente contida, o que
// depende destes limites. Puro, testável sem WebGL.

describe("limitesDeCoordenadas", () => {
  it("devolve [[oeste, sul], [leste, norte]] contendo todas as coordenadas", () => {
    const limites = limitesDeCoordenadas([
      { lng: -46.6, lat: -23.5 },
      { lng: -47.1, lat: -22.9 },
      { lng: -46.2, lat: -23.9 },
    ]);

    expect(limites).toEqual([
      [-47.1, -23.9],
      [-46.2, -22.9],
    ]);
  });

  it("um único ponto gera limites degenerados (o fitBounds centraliza nele)", () => {
    expect(limitesDeCoordenadas([{ lng: -46.6, lat: -23.5 }])).toEqual([
      [-46.6, -23.5],
      [-46.6, -23.5],
    ]);
  });

  // Caso inválido: sem coordenada não há o que enquadrar — a captura falha e a
  // falha é tolerada (DEC-104), em vez de produzir um mapa arbitrário.
  it("lista vazia devolve null", () => {
    expect(limitesDeCoordenadas([])).toBeNull();
  });
});

describe("limitesDaGeometria", () => {
  it("enquadra a LineString congelada da rota (Spec 02 §10.2 — [lng, lat])", () => {
    const geometria: LineString = {
      type: "LineString",
      coordinates: [
        [-46.6, -23.5],
        [-46.4, -23.2],
        [-46.9, -23.8],
      ],
    };

    expect(limitesDaGeometria(geometria)).toEqual([
      [-46.9, -23.8],
      [-46.4, -23.2],
    ]);
  });
});
