import { afterEach, describe, expect, test, vi } from "vitest";
import {
  consultarViaMaisProxima,
  NEAREST_TIMEOUT_PADRAO_MS,
  OSRM_TIMEOUT_PADRAO_MS,
} from "@/formulario/roteamento";
import type { Ponto } from "@/shared/geo";

// TASK-131 — consultarViaMaisProxima: cliente fino sobre o `/nearest` do
// OSRM (Q-090/DEC-112), com política de falha **oposta** à do `/route`
// (categoria 4, docs-dev/08): sem retry, sem exceção propagada, falha
// silenciosa. `fetch` é sempre mockado — nenhum teste toca a rede real.

const PONTO: Ponto = { latitude: -23.5, longitude: -47.45 };

function respostaFetchMock(corpo: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(corpo),
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("consultarViaMaisProxima — montagem da URL (Spec 03 §3.2 por analogia, RN-047)", () => {
  test("monta GET {base}/nearest/v1/driving/{lon},{lat}?number=1, na ordem lon,lat", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Rua Francisco Aureliano Paiva", distance: 12.4 }],
    });

    await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://router.project-osrm.org/nearest/v1/driving/-47.45,-23.5?number=1",
      expect.anything(),
    );
  });

  test("baseUrl explícita sobrepõe o default", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Via X", distance: 1 }],
    });

    await consultarViaMaisProxima(PONTO, {
      fetchFn,
      baseUrl: "https://osrm.exemplo.com",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://osrm.exemplo.com/nearest/v1/driving/-47.45,-23.5?number=1",
      expect.anything(),
    );
  });

  test("NEXT_PUBLIC_OSRM_BASE_URL sobrepõe o default quando baseUrl não é informada", async () => {
    vi.stubEnv("NEXT_PUBLIC_OSRM_BASE_URL", "https://osrm.env.com");
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Via X", distance: 1 }],
    });

    await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://osrm.env.com/nearest/v1/driving/-47.45,-23.5?number=1",
      expect.anything(),
    );
  });

  test("baseUrl explícita tem precedência sobre a variável de ambiente", async () => {
    vi.stubEnv("NEXT_PUBLIC_OSRM_BASE_URL", "https://osrm.env.com");
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Via X", distance: 1 }],
    });

    await consultarViaMaisProxima(PONTO, {
      fetchFn,
      baseUrl: "https://osrm.override.com",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://osrm.override.com/nearest/v1/driving/-47.45,-23.5?number=1",
      expect.anything(),
    );
  });
});

describe("consultarViaMaisProxima — casos válidos", () => {
  test("waypoint com nome e distância ⇒ ok:true com distanciaM em metros, sem arredondar", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [
        {
          name: "Rua Francisco Aureliano Paiva",
          distance: 12.4,
          location: [-47.45, -23.5],
        },
      ],
    });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({
      ok: true,
      via: "Rua Francisco Aureliano Paiva",
      distanciaM: 12.4,
      localizacao: { longitude: -47.45, latitude: -23.5 },
    });
  });

  test("waypoint sem location ⇒ localizacao fica undefined", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "Via X", distance: 5 }],
    });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: true, via: "Via X", distanciaM: 5, localizacao: undefined });
  });

  test("NEAREST_TIMEOUT_PADRAO_MS é 5 s, menor que o timeout do /route (15 s)", () => {
    expect(NEAREST_TIMEOUT_PADRAO_MS).toBe(5_000);
    expect(NEAREST_TIMEOUT_PADRAO_MS).toBeLessThan(OSRM_TIMEOUT_PADRAO_MS);
  });
});

describe("consultarViaMaisProxima — casos inválidos: semResposta (nunca nome inventado)", () => {
  test("name ausente ⇒ semResposta", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ distance: 1 }],
    });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });

  test("name vazio ⇒ semResposta", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "", distance: 1 }],
    });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });

  test("name só com espaços ⇒ semResposta", async () => {
    const fetchFn = respostaFetchMock({
      code: "Ok",
      waypoints: [{ name: "   ", distance: 1 }],
    });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });

  test('code != "Ok" ⇒ semResposta', async () => {
    const fetchFn = respostaFetchMock({ code: "InvalidQuery" });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });

  test("waypoints vazio ⇒ semResposta", async () => {
    const fetchFn = respostaFetchMock({ code: "Ok", waypoints: [] });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });

  test("waypoints ausente ⇒ semResposta", async () => {
    const fetchFn = respostaFetchMock({ code: "Ok" });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "semResposta" });
  });
});

describe("consultarViaMaisProxima — casos inválidos: rede, sempre sem retry", () => {
  test("fetch que rejeita (offline) ⇒ rede, uma única chamada", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "rede" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("HTTP != 2xx ⇒ rede, sem tentar parsear o corpo", async () => {
    const jsonFn = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, json: jsonFn }) as unknown as typeof fetch;

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "rede" });
    expect(jsonFn).not.toHaveBeenCalled();
  });

  test("corpo não-JSON ⇒ rede", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("corpo inválido")),
    }) as unknown as typeof fetch;

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado).toEqual({ ok: false, motivo: "rede" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("[inválido] timeout aciona AbortController e resolve rede, sem retry", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }) as unknown as typeof fetch;

    const promessa = consultarViaMaisProxima(PONTO, { fetchFn, timeoutMs: 5_000 });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(promessa).resolves.toEqual({ ok: false, motivo: "rede" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("nenhum caminho inválido propaga exceção (promessa sempre resolve)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("qualquer falha")) as unknown as typeof fetch;

    await expect(consultarViaMaisProxima(PONTO, { fetchFn })).resolves.toEqual({
      ok: false,
      motivo: "rede",
    });
  });
});

describe("consultarViaMaisProxima — regressão: não contamina a política bloqueante do /route (RN-048 no sentido inverso)", () => {
  test("resultado ok:false desta consulta não é uma FalhaOsrm nem impede nada além de si mesma", async () => {
    const fetchFn = respostaFetchMock({ code: "InvalidQuery" });

    const resultado = await consultarViaMaisProxima(PONTO, { fetchFn });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(["rede", "semResposta"]).toContain(resultado.motivo);
      expect(resultado).not.toHaveProperty("falha");
    }
  });
});
