import { describe, expect, test } from "vitest";
import { arredondaHalfUp } from "@/shared/calculo";

// TASK-043 — primitivo único de arredondamento half-up (Spec 03 §3.4;
// RN-050), consolidando `arredondaHalfUp` (ex-`extrair-rota.ts`) e
// `arredondar2` (ex-`validacoes-estruturais.ts`). Mesmos casos já cobertos
// nas duas suítes de origem, sem alteração de expectativa.

describe("arredondaHalfUp (RN-050, Spec 03 §3.4)", () => {
  test("half-up: 0,005 arredonda para 0,01 (não trunca nem banker's rounding)", () => {
    expect(arredondaHalfUp(0.005, 2)).toBe(0.01);
  });

  test("4 m → 0,00 km; 5 m → 0,01 km", () => {
    expect(arredondaHalfUp(4 / 1000, 2)).toBe(0);
    expect(arredondaHalfUp(5 / 1000, 2)).toBe(0.01);
  });

  test("caso genérico: 6543 m → 6,54 km", () => {
    expect(arredondaHalfUp(6543 / 1000, 2)).toBe(6.54);
  });

  test("duração arredonda ao inteiro (0 casas)", () => {
    expect(arredondaHalfUp(12.6, 0)).toBe(13);
  });

  test("caso de fechamento: 1,005 + 1,005 → soma dos arredondados é 2,02, não 2,01", () => {
    // Mesmo caso de RN-040/050 usado em extrairRota — prova que o helper
    // consolidado preserva a semântica que evita erro de fechamento.
    expect(arredondaHalfUp(1.005, 2)).toBe(1.01);
    expect(
      arredondaHalfUp(1.005, 2) + arredondaHalfUp(1.005, 2),
    ).toBeCloseTo(2.02, 9);
  });

  test("valor já exato não é corrompido pelo Number.EPSILON", () => {
    expect(arredondaHalfUp(2.02, 2)).toBe(2.02);
  });
});
