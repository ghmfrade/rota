import { describe, expect, test } from "vitest";

import {
  formatarCoordenada,
  interpretarLatitude,
  interpretarLongitude,
  interpretarParDeCoordenadas,
} from "@/formulario/itinerarios/coordenada-criacao";

describe("formatarCoordenada (TASK-132)", () => {
  test("sempre 6 casas decimais", () => {
    expect(formatarCoordenada(-23.5)).toBe("-23.500000");
    expect(formatarCoordenada(0)).toBe("0.000000");
    expect(formatarCoordenada(-46.380123456)).toBe("-46.380123");
  });

  test("pura: mesma entrada produz sempre a mesma saída", () => {
    expect(formatarCoordenada(-23.9608)).toBe(formatarCoordenada(-23.9608));
  });
});

describe("interpretarLatitude (TASK-132)", () => {
  test.each([
    ["-23.500000", -23.5],
    ["-23,500000", -23.5],
    ["0", 0],
    ["-90", -90],
    ["90", 90],
    [" -23.5 ", -23.5],
  ])("aceita %s", (texto, esperado) => {
    const resultado = interpretarLatitude(texto);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor).toBe(esperado);
  });

  test.each([
    [""],
    ["   "],
    ["abc"],
    ["-91"],
    ["91"],
    ["1.2.3"],
    ["-23.500,00"],
    ["1e2"],
    ["--23"],
    ["23 5"],
  ])("[inválido] recusa %s", (texto) => {
    expect(interpretarLatitude(texto).ok).toBe(false);
  });
});

describe("interpretarLongitude (TASK-132)", () => {
  test.each([
    ["-46.380000", -46.38],
    ["-46,380000", -46.38],
    ["-180", -180],
    ["180", 180],
  ])("aceita %s", (texto, esperado) => {
    const resultado = interpretarLongitude(texto);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor).toBe(esperado);
  });

  test.each([[""], ["-181"], ["181"], ["abc"], ["1.2.3"]])(
    "[inválido] recusa %s",
    (texto) => {
      expect(interpretarLongitude(texto).ok).toBe(false);
    },
  );
});

describe("interpretarParDeCoordenadas (TASK-132)", () => {
  test("par válido devolve Coordenada { lat, lng }", () => {
    const resultado = interpretarParDeCoordenadas("-23.500000", "-46.380000");
    expect(resultado).toEqual({ ok: true, posicao: { lat: -23.5, lng: -46.38 } });
  });

  test("aceita vírgula decimal nos dois eixos", () => {
    const resultado = interpretarParDeCoordenadas("-23,5", "-46,38");
    expect(resultado).toEqual({ ok: true, posicao: { lat: -23.5, lng: -46.38 } });
  });

  test("[inválido] latitude ruim recusa com mensagem, mesmo com longitude boa", () => {
    const resultado = interpretarParDeCoordenadas("abc", "-46.38");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensagem.length).toBeGreaterThan(0);
  });

  test("[inválido] longitude ruim recusa com mensagem, mesmo com latitude boa", () => {
    const resultado = interpretarParDeCoordenadas("-23.5", "200");
    expect(resultado.ok).toBe(false);
  });

  test("[inválido] ambos vazios recusa", () => {
    expect(interpretarParDeCoordenadas("", "").ok).toBe(false);
  });
});
