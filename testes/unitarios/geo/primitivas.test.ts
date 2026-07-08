import { describe, expect, it } from "vitest";
import {
  centroide,
  haversine,
  RAIO_TERRA_M,
  type Ponto,
} from "../../../src/shared/geo";

// Unitários (categoria 3, docs-dev/08) — Haversine e centroide com valores
// conhecidos (Spec 03 §2.1, §2.2). Únicas primitivas de distância em linha
// reta e agrupamento do projeto (RN-027, RN-087).

describe("haversine (RN-027, Spec 03 §2.1)", () => {
  it("usa R = 6.371.000 m (Spec 03 §2.1)", () => {
    expect(RAIO_TERRA_M).toBe(6_371_000);
  });

  it("distância de um ponto a ele mesmo é zero", () => {
    const p: Ponto = { latitude: -23.55, longitude: -46.63 };
    expect(haversine(p, p)).toBe(0);
  });

  it("é simétrica: haversine(a,b) === haversine(b,a)", () => {
    const a: Ponto = { latitude: -23.55, longitude: -46.63 };
    const b: Ponto = { latitude: -22.9, longitude: -47.1 };
    expect(haversine(a, b)).toBe(haversine(b, a));
  });

  it("1° de latitude no equador ≈ 111.194,93 m (valor de referência)", () => {
    const a: Ponto = { latitude: 0, longitude: 0 };
    const b: Ponto = { latitude: 1, longitude: 0 };
    expect(haversine(a, b)).toBeCloseTo(111_194.93, 1);
  });

  it("respeita a convergência dos meridianos — 1° de longitude vale menos a lat. 60° do que no equador", () => {
    const noEquador = haversine(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    const emLat60 = haversine(
      { latitude: 60, longitude: 0 },
      { latitude: 60, longitude: 1 },
    );

    // Euclidiana sobre graus crus daria o mesmo valor nos dois casos —
    // a Haversine correta reduz pela metade (cos 60° = 0,5).
    expect(noEquador).toBeCloseTo(111_194.93, 1);
    expect(emLat60).toBeCloseTo(55_596.93, 1);
  });

  it("escala sub-quilométrica coerente com o limiar de 350 m", () => {
    const a: Ponto = { latitude: -23.5, longitude: -46.6 };
    const b: Ponto = { latitude: -23.5 + 0.00315, longitude: -46.6 };
    expect(haversine(a, b)).toBeCloseTo(350.26, 1);
  });
});

describe("centroide (Spec 03 §2.2)", () => {
  it("de um único ponto é o próprio ponto", () => {
    const p: Ponto = { latitude: -23.55, longitude: -46.63 };
    expect(centroide([p])).toEqual(p);
  });

  it("é a média aritmética simples de lat/lon (dois pontos)", () => {
    const a: Ponto = { latitude: 0, longitude: 0 };
    const b: Ponto = { latitude: 2, longitude: 4 };
    expect(centroide([a, b])).toEqual({ latitude: 1, longitude: 2 });
  });

  it("é a média aritmética simples de lat/lon (três pontos)", () => {
    const pontos: Ponto[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 3, longitude: 0 },
      { latitude: 0, longitude: 6 },
    ];
    expect(centroide(pontos)).toEqual({ latitude: 1, longitude: 2 });
  });

  it("independe da ordem dos pontos (determinístico)", () => {
    const pontos: Ponto[] = [
      { latitude: -23.5, longitude: -46.6 },
      { latitude: -23.51, longitude: -46.61 },
      { latitude: -23.49, longitude: -46.59 },
    ];
    const invertido = [...pontos].reverse();
    expect(centroide(pontos)).toEqual(centroide(invertido));
  });

  it("caso inválido: conjunto vazio lança erro (Spec 03 §2.2 exige não-vazio)", () => {
    expect(() => centroide([])).toThrow();
  });

  it("todo ponto de um cluster válido fica a ≤ 350 m do seu centroide (base da RN-027)", () => {
    const pontos: Ponto[] = [
      { latitude: -23.5, longitude: -46.6 },
      { latitude: -23.5 + 0.0015, longitude: -46.6 },
    ];
    const c = centroide(pontos);
    for (const p of pontos) {
      expect(haversine(p, c)).toBeLessThanOrEqual(350);
    }
  });
});
