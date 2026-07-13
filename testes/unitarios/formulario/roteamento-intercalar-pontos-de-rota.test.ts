import { describe, expect, test } from "vitest";
import { intercalarPontosDeRota } from "@/formulario/roteamento";
import type { Ponto } from "@/shared/geo";
import type { PontoDeRota } from "@/shared/contrato";

// TASK-023 — intercalação de pontos de rota na sequência de coordenadas do
// OSRM (Spec 03 §3.6.1; RN-042). Exemplo literal: 3 paradas (A, B, C), 3
// pontos em apos_parada_ordem=1 (p1,p2,p3) e 1 em apos_parada_ordem=2 (p4) →
// 7 coordenadas, waypoints=0;4;6.

const A: Ponto = { latitude: -23.0, longitude: -46.0 };
const B: Ponto = { latitude: -23.5, longitude: -46.5 };
const C: Ponto = { latitude: -24.0, longitude: -47.0 };

const p1: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.1, longitude: -46.1 };
const p2: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.2, longitude: -46.2 };
const p3: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.3, longitude: -46.3 };
const p4: PontoDeRota = { apos_parada_ordem: 2, latitude: -23.7, longitude: -46.8 };

describe("intercalarPontosDeRota — exemplo trabalhado (Spec 03 §3.6.1)", () => {
  test("A, p1, p2, p3, B, p4, C — waypoints nos índices 0;4;6", () => {
    const resultado = intercalarPontosDeRota([A, B, C], [p1, p2, p3, p4]);

    expect(resultado.coordenadas).toEqual([
      A,
      { latitude: p1.latitude, longitude: p1.longitude },
      { latitude: p2.latitude, longitude: p2.longitude },
      { latitude: p3.latitude, longitude: p3.longitude },
      B,
      { latitude: p4.latitude, longitude: p4.longitude },
      C,
    ]);
    expect(resultado.indicesParadas).toEqual([0, 4, 6]);
  });

  test("sem pontos de rota, a sequência é idêntica às paradas (compatibilidade TASK-021)", () => {
    const resultado = intercalarPontosDeRota([A, B, C]);

    expect(resultado.coordenadas).toEqual([A, B, C]);
    expect(resultado.indicesParadas).toEqual([0, 1, 2]);
  });

  test("vários pontos no mesmo trecho preservam a ordem do array (RN-042)", () => {
    // p3, p2, p1 fora de ordem no array — a sequência deve seguir a ordem do
    // array, não uma ordenação implícita por coordenada.
    const resultado = intercalarPontosDeRota([A, B], [p3, p1, p2]);
    expect(resultado.coordenadas).toEqual([
      A,
      { latitude: p3.latitude, longitude: p3.longitude },
      { latitude: p1.latitude, longitude: p1.longitude },
      { latitude: p2.latitude, longitude: p2.longitude },
      B,
    ]);
  });

  test("[inválido] apos_parada_ordem == paradas.length lança erro RN-042", () => {
    const invalido: PontoDeRota = { apos_parada_ordem: 3, latitude: 0, longitude: 0 };
    expect(() => intercalarPontosDeRota([A, B, C], [invalido])).toThrow(/RN-042/);
  });

  test("[inválido] apos_parada_ordem == 0 lança erro RN-042", () => {
    const invalido: PontoDeRota = { apos_parada_ordem: 0, latitude: 0, longitude: 0 };
    expect(() => intercalarPontosDeRota([A, B, C], [invalido])).toThrow(/RN-042/);
  });
});
