import { describe, expect, it } from "vitest";
import {
  ancorarPontoNaRota,
  projetarNaLinha,
} from "../../../src/shared/mapa/ancoragem";
import type { Coordenada } from "../../../src/shared/mapa/geometria";

// TASK-063 — ancorador geométrico do gesto de ponto de rota (Spec 03 §3.6,
// §3.6.1; RN-042). Testado como módulo puro, sem MapLibre: uma linha reta
// simples (norte→sul) com 3 "paradas" ao longo dela permite prever com
// exatidão o resultado esperado da projeção e da ancoragem.

// Linha reta ao longo do meridiano -46, de lat -23.0 a -24.0 (~111 km),
// dividida em 100 vértices — o traçado que a rota "calculada" desenharia.
const LINHA: Coordenada[] = Array.from({ length: 101 }, (_, i) => ({
  lng: -46,
  lat: -23.0 - i * 0.01,
}));

// Três paradas exatamente sobre a linha: A (início), B (meio), C (fim).
const A: Coordenada = { lng: -46, lat: -23.0 };
const B: Coordenada = { lng: -46, lat: -23.5 };
const C: Coordenada = { lng: -46, lat: -24.0 };

describe("projetarNaLinha", () => {
  it("projeta um ponto sobre a linha e acumula a distância ao longo do traçado", () => {
    const projecaoInicio = projetarNaLinha(A, LINHA);
    const projecaoMeio = projetarNaLinha(B, LINHA);
    const projecaoFim = projetarNaLinha(C, LINHA);

    expect(projecaoInicio?.distanciaAoLongoM).toBeCloseTo(0, 0);
    expect(projecaoMeio?.distanciaAoLongoM).toBeGreaterThan(projecaoInicio!.distanciaAoLongoM);
    expect(projecaoFim?.distanciaAoLongoM).toBeGreaterThan(projecaoMeio!.distanciaAoLongoM);
  });

  it("DEC-072: devolve o ponto pertencente à linha mais próximo do cursor", () => {
    const cursorForaDaLinha: Coordenada = { lng: -45.99, lat: -23.25 };
    const projecao = projetarNaLinha(cursorForaDaLinha, LINHA);

    expect(projecao?.posicao.lng).toBeCloseTo(-46, 8);
    expect(projecao?.posicao.lat).toBeCloseTo(-23.25, 8);
    expect(projecao?.distanciaPerpendicularM).toBeGreaterThan(0);
  });

  it("[inválido] linha degenerada (< 2 pontos) devolve undefined", () => {
    expect(projetarNaLinha(A, [])).toBeUndefined();
    expect(projetarNaLinha(A, [A])).toBeUndefined();
  });

  it("distância perpendicular é ~0 para um ponto exatamente sobre a linha", () => {
    const projecao = projetarNaLinha(B, LINHA);
    expect(projecao?.distanciaPerpendicularM).toBeLessThan(1);
  });
});

describe("ancorarPontoNaRota (Spec 03 §3.6 — ancorado entre duas paradas consecutivas)", () => {
  it("clique entre A e B ancora no trecho 1 (apos_parada_ordem = 1)", () => {
    const clique: Coordenada = { lng: -46, lat: -23.25 };
    const ancoragem = ancorarPontoNaRota(clique, LINHA, [A, B, C]);
    expect(ancoragem?.aposParadaOrdem).toBe(1);
  });

  it("clique entre B e C ancora no trecho 2 (apos_parada_ordem = 2)", () => {
    const clique: Coordenada = { lng: -46, lat: -23.75 };
    const ancoragem = ancorarPontoNaRota(clique, LINHA, [A, B, C]);
    expect(ancoragem?.aposParadaOrdem).toBe(2);
  });

  it("[borda] clique exatamente sobre B ancora deterministicamente depois de B", () => {
    const ancoragem = ancorarPontoNaRota(B, LINHA, [A, B, C]);
    expect(ancoragem?.aposParadaOrdem).toBe(2);
  });

  it("[inválido] clique antes da primeira parada satura em 1, nunca 0 (RN-042)", () => {
    const cliqueAntes: Coordenada = { lng: -46, lat: -22.9 };
    const ancoragem = ancorarPontoNaRota(cliqueAntes, LINHA, [A, B, C]);
    expect(ancoragem?.aposParadaOrdem).toBe(1);
    expect(ancoragem?.aposParadaOrdem).toBeGreaterThanOrEqual(1);
  });

  it("[inválido] clique depois da última parada satura em paradas.length - 1, nunca paradas.length (RN-042)", () => {
    const cliqueDepois: Coordenada = { lng: -46, lat: -24.1 };
    const ancoragem = ancorarPontoNaRota(cliqueDepois, LINHA, [A, B, C]);
    expect(ancoragem?.aposParadaOrdem).toBe(2);
    expect(ancoragem?.aposParadaOrdem).toBeLessThanOrEqual(2);
  });

  it("[inválido] menos de 2 paradas devolve undefined (sem trecho para ancorar)", () => {
    const clique: Coordenada = { lng: -46, lat: -23.5 };
    expect(ancorarPontoNaRota(clique, LINHA, [A])).toBeUndefined();
    expect(ancorarPontoNaRota(clique, LINHA, [])).toBeUndefined();
  });

  it("[inválido] linha degenerada devolve undefined", () => {
    const clique: Coordenada = { lng: -46, lat: -23.5 };
    expect(ancorarPontoNaRota(clique, [], [A, B, C])).toBeUndefined();
  });
});
