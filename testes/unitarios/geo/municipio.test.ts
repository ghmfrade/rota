import { describe, expect, it } from "vitest";
import {
  derivarMunicipio,
  ErroDeConsistenciaGeodados,
  indiceDeNomes,
  pontoDecisorLocal,
  pontoDecisorSecao,
  TETO_FALLBACK_M,
  type Ponto,
} from "../../../src/shared/geo";
import type { FeatureMunicipio } from "../../../src/shared/dados-estaticos";

// Unitários (categorias 2 e 3, docs-dev/08 — validação de domínio e cálculo)
// para a derivação de município por ponto-em-polígono (Spec 03 §2.3; RN-029;
// fallback de borda por ponto→segmento — DEC-031). OSRM não participa.

// Feature municipal sintética com um anel FECHADO (primeiro = último ponto),
// coordenadas [lon, lat] como no geojson real.
function feature(codarea: string, anel: [number, number][]): FeatureMunicipio {
  return {
    type: "Feature",
    properties: { codarea },
    geometry: { type: "Polygon", coordinates: [anel] },
  };
}

// Município A — retângulo lon∈[0,3], lat∈[0,1]. Assimétrico de propósito: um
// ponto certo (lon,lat) cairia FORA se o código trocasse os eixos (lat,lon).
const A = feature("3500001", [
  [0, 0],
  [3, 0],
  [3, 1],
  [0, 1],
  [0, 0],
]);
// Município B — retângulo disjunto lon∈[10,11], lat∈[0,1].
const B = feature("3500002", [
  [10, 0],
  [11, 0],
  [11, 1],
  [10, 1],
  [10, 0],
]);

const NOMES = indiceDeNomes([
  { codigo_ibge: "3500001", nome: "CidadeA" },
  { codigo_ibge: "3500002", nome: "CidadeB" },
]);

// Meridiano: a distância Haversine entre dois pontos de mesma longitude é
// exatamente |Δlat_rad| · R, independente da longitude. 1° ≈ 111.194,9 m.
const METROS_POR_GRAU_LAT = (Math.PI / 180) * 6_371_000;

describe("derivarMunicipio — ponto-em-polígono (Spec 03 §2.3)", () => {
  it("interior: retorna o município que contém o ponto (join codarea → nome)", () => {
    const ponto: Ponto = { latitude: 0.5, longitude: 1.5 };
    expect(derivarMunicipio(ponto, [A, B], NOMES)).toEqual({
      encontrado: true,
      nome: "CidadeA",
      codigoIbge: "3500001",
    });
  });

  it("polígonos disjuntos: casa no segundo quando o ponto está nele", () => {
    const ponto: Ponto = { latitude: 0.5, longitude: 10.5 };
    expect(derivarMunicipio(ponto, [A, B], NOMES)).toMatchObject({
      encontrado: true,
      nome: "CidadeB",
    });
  });

  it("respeita a ordem dos eixos [lon, lat]: ponto válido não vira fora-de-SP", () => {
    // (lon 2.5, lat 0.5) está dentro de A. Se o código lesse (lat, lon) como
    // (x=2.5? …), o ponto cairia fora de lat∈[0,1] e não casaria.
    const ponto: Ponto = { latitude: 0.5, longitude: 2.5 };
    expect(derivarMunicipio(ponto, [A], NOMES)).toMatchObject({
      encontrado: true,
      nome: "CidadeA",
    });
    // Espelho: trocar os eixos leva a fora-de-SP (guarda o teste acima).
    const trocado: Ponto = { latitude: 2.5, longitude: 0.5 };
    expect(derivarMunicipio(trocado, [A], NOMES)).toEqual({
      encontrado: false,
      motivo: "fora_de_sp",
    });
  });

  it("join ausente é inconsistência de dados, NÃO fora-de-SP", () => {
    const orfa = feature("3599999", [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
    const ponto: Ponto = { latitude: 0.5, longitude: 0.5 };
    expect(() => derivarMunicipio(ponto, [orfa], NOMES)).toThrow(
      ErroDeConsistenciaGeodados,
    );
  });
});

describe("derivarMunicipio — fallback de borda ≤ 2 km (DEC-031)", () => {
  // Pontos ao sul da aresta inferior de A (lat 0, lon∈[0,3]): a fronteira mais
  // próxima é essa aresta, e a distância é exatamente |lat|·(m/grau).
  it("ponto a ~1,1 km da fronteira adota o município mais próximo", () => {
    const ponto: Ponto = { latitude: -0.01, longitude: 1.5 }; // ~1111,9 m
    expect(derivarMunicipio(ponto, [A, B], NOMES)).toMatchObject({
      encontrado: true,
      nome: "CidadeA",
    });
  });

  it("logo abaixo de 2 km ainda adota o município", () => {
    const ponto: Ponto = { latitude: -0.017, longitude: 1.5 }; // ~1890 m
    expect(derivarMunicipio(ponto, [A], NOMES)).toMatchObject({
      encontrado: true,
      nome: "CidadeA",
    });
  });

  it("acima de 2 km é fora-de-SP (erro bloqueante)", () => {
    const ponto: Ponto = { latitude: -0.019, longitude: 1.5 }; // ~2113 m
    expect(derivarMunicipio(ponto, [A], NOMES)).toEqual({
      encontrado: false,
      motivo: "fora_de_sp",
    });
  });

  it("ponto muito distante é fora-de-SP", () => {
    const ponto: Ponto = { latitude: 50, longitude: 50 };
    expect(derivarMunicipio(ponto, [A, B], NOMES)).toEqual({
      encontrado: false,
      motivo: "fora_de_sp",
    });
  });

  it("distância à fronteira é ponto→segmento, não ponto→vértice", () => {
    // Ponto ao sul do MEIO da aresta inferior (lon 1.5), longe dos vértices
    // (lon 0 e 3). A distância correta é ~1112 m (perpendicular ao segmento);
    // a um vértice seria ~1,5° ≈ 167 km. O ponto está dentro dos 2 km só pela
    // medida ponto→segmento — se fosse ponto→vértice, viraria fora-de-SP.
    const ponto: Ponto = { latitude: -0.01, longitude: 1.5 };
    const distanciaAoVertice = 1.5 * METROS_POR_GRAU_LAT; // referência (~167 km)
    expect(distanciaAoVertice).toBeGreaterThan(TETO_FALLBACK_M);
    expect(derivarMunicipio(ponto, [A], NOMES)).toMatchObject({
      encontrado: true,
      nome: "CidadeA",
    });
  });
});

describe("pontos decisores (Spec 03 §2.3)", () => {
  it("Seção decide pelo centroide dos pontos aceitos", () => {
    const pontos: Ponto[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 2 },
      { latitude: 3, longitude: 1 },
    ];
    expect(pontoDecisorSecao(pontos)).toEqual({ latitude: 1, longitude: 1 });
  });

  it("Seção sem pontos é erro de uso (via centroide)", () => {
    expect(() => pontoDecisorSecao([])).toThrow();
  });

  it("Local com um sentido decide pelo ponto único", () => {
    const p: Ponto = { latitude: -23.5, longitude: -46.6 };
    expect(pontoDecisorLocal(p, undefined)).toEqual(p);
    expect(pontoDecisorLocal(undefined, p)).toEqual(p);
  });

  it("Local com Ida e Volta decide pelo ponto médio", () => {
    const ida: Ponto = { latitude: 0, longitude: 0 };
    const volta: Ponto = { latitude: 1, longitude: 3 };
    expect(pontoDecisorLocal(ida, volta)).toEqual({
      latitude: 0.5,
      longitude: 1.5,
    });
  });

  it("Local sem nenhuma geolocalização é erro de uso (RN-032)", () => {
    expect(() => pontoDecisorLocal(undefined, undefined)).toThrow();
  });
});
