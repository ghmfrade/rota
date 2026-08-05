import { describe, expect, test, vi } from "vitest";

import { sugerirNomeDeParada } from "@/formulario/itinerarios/sugerir-nome-de-parada";
import type { Ponto } from "@/shared/geo";

// TASK-133 — sugerirNomeDeParada: orquestração pura de `/nearest`
// (consultarViaMaisProxima, TASK-131) + abreviação (abreviarNomeDeVia,
// TASK-130). `fetch` é sempre mockado — nenhum teste toca a rede real.

const PONTO: Ponto = { latitude: -23.5, longitude: -47.45 };

function respostaFetchMock(corpo: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(corpo),
  }) as unknown as typeof fetch;
}

describe("sugerirNomeDeParada (TASK-133; DEC-112)", () => {
  test("via encontrada ⇒ nome abreviado ao alvo de 25 caracteres", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Rua Francisco Aureliano Paiva", distance: 12.4 }],
    });

    const resultado = await sugerirNomeDeParada(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: true, nome: "R. Franci. Aureli. Paiva" });
  });

  test("nome curto não é alterado além da sigla de logradouro", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Rua Nova", distance: 3 }],
    });

    const resultado = await sugerirNomeDeParada(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: true, nome: "R. Nova" });
  });

  test("falha de rede (HTTP não-ok) ⇒ repassa motivo 'rede', sem abreviar nada", async () => {
    const fetchFn = respostaFetchMock({}, false);

    const resultado = await sugerirNomeDeParada(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "rede" });
  });

  test("falha de rede (fetch rejeitando) ⇒ motivo 'rede'", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;

    const resultado = await sugerirNomeDeParada(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "rede" });
  });

  test("code != Ok ⇒ motivo 'semResposta'", async () => {
    const fetchFn = respostaFetchMock({ code: "NoSegment", waypoints: [] });

    const resultado = await sugerirNomeDeParada(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });

  test("via sem nome ⇒ motivo 'semResposta'", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "", distance: 1 }],
    });

    const resultado = await sugerirNomeDeParada(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });
});
