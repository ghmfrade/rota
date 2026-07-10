import { describe, expect, test, vi } from "vitest";
import { solicitarRota } from "@/formulario/roteamento";
import type { Ponto } from "@/shared/geo";

// TASK-021 — solicitarRota: fetch fino + guarda mínima de `code` (Spec 03
// §3.2/§3.5). Retry e mensagens específicas por código são escopo da
// TASK-022 — aqui só se garante que uma resposta != "Ok" não produz um
// resultado inválido. `fetch` é sempre mockado (categoria 4, docs-dev/08):
// nenhum teste desta suíte toca a rede real.

const PARADA_A: Ponto = { latitude: -23.55, longitude: -46.63 };
const PARADA_B: Ponto = { latitude: -22.9, longitude: -47.1 };

function respostaFetchMock(corpo: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve(corpo),
  }) as unknown as typeof fetch;
}

describe("solicitarRota (Spec 03 §3.2/§3.3, mock de fetch)", () => {
  test("code Ok → devolve o resultado extraído (geometria/trechos/totais)", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      routes: [
        {
          geometry: { type: "LineString", coordinates: [[-46.63, -23.55], [-47.1, -22.9]] },
          legs: [{ distance: 1000, duration: 60 }],
        },
      ],
    });

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado.trechos).toEqual([
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 1, duracao_s: 60 },
    ]);
    expect(resultado.distancia_km).toBe(1);
    expect(resultado.duracao_s).toBe(60);
  });

  test("chama fetch exatamente com a URL montada por montarUrlOsrm, uma única vez", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      routes: [
        {
          geometry: { type: "LineString", coordinates: [[-46.63, -23.55], [-47.1, -22.9]] },
          legs: [{ distance: 1000, duration: 60 }],
        },
      ],
    });

    await solicitarRota([PARADA_A, PARADA_B], {
      fetchFn,
      baseUrl: "https://osrm.teste.exemplo",
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const urlChamada = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(urlChamada).toBe(
      "https://osrm.teste.exemplo/route/v1/driving/-46.63,-23.55;-47.1,-22.9" +
        "?overview=full&geometries=geojson&steps=true&annotations=false&continue_straight=false",
    );
  });

  test("[inválido] code NoRoute lança erro, SEM retry (nenhuma segunda chamada de fetch)", async () => {
    const fetchFn = respostaFetchMock({ code: "NoRoute", routes: [] });

    await expect(solicitarRota([PARADA_A, PARADA_B], { fetchFn })).rejects.toThrow(
      /NoRoute/,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("[inválido] code NoSegment também lança erro sem retry", async () => {
    const fetchFn = respostaFetchMock({ code: "NoSegment", routes: [] });

    await expect(solicitarRota([PARADA_A, PARADA_B], { fetchFn })).rejects.toThrow(
      /NoSegment/,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
