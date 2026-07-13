import { afterEach, describe, expect, test, vi } from "vitest";
import {
  solicitarRota,
  OSRM_TIMEOUT_PADRAO_MS,
} from "@/formulario/roteamento";
import type { Ponto } from "@/shared/geo";
import type { PontoDeRota } from "@/shared/contrato";

// TASK-022/023 — solicitarRota: fetch fino + tratamento de falha do OSRM
// (Spec 03 §3.5; RN-048/049) e intercalação de pontos de rota (§3.6;
// RN-042/051). `fetch` é sempre mockado (categoria 4, docs-dev/08): nenhum
// teste desta suíte toca a rede real. O sucesso (extração legs→trechos,
// RN-041/050) é da TASK-021 e permanece coberto aqui como guarda de regressão.

const PARADA_A: Ponto = { latitude: -23.55, longitude: -46.63 };
const PARADA_B: Ponto = { latitude: -22.9, longitude: -47.1 };
const PARADA_C: Ponto = { latitude: -22.0, longitude: -47.9 };

const ENVELOPE_OK = {
  code: "Ok",
  routes: [
    {
      geometry: {
        type: "LineString",
        coordinates: [
          [-46.63, -23.55],
          [-47.1, -22.9],
        ],
      },
      legs: [{ distance: 1000, duration: 60 }],
    },
  ],
};

/** Mock de `fetch` que resolve um corpo JSON fixo. */
function respostaFetchMock(corpo: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve(corpo),
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("solicitarRota — sucesso (Spec 03 §3.3/§3.4, mock de fetch)", () => {
  test("code Ok → { ok:true } com a rota extraída (geometria/trechos/totais)", async () => {
    const fetchFn = respostaFetchMock(ENVELOPE_OK);

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado.ok).toBe(true);
    // narrow por discriminante
    if (!resultado.ok) throw new Error("esperava sucesso");
    expect(resultado.rota.trechos).toEqual([
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 1, duracao_s: 60 },
    ]);
    expect(resultado.rota.distancia_km).toBe(1);
    expect(resultado.rota.duracao_s).toBe(60);
  });

  test("chama fetch com a URL montada por montarUrlOsrm, uma única vez", async () => {
    const fetchFn = respostaFetchMock(ENVELOPE_OK);

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
});

describe("solicitarRota — pontos de rota (Spec 03 §3.6; RN-042/051)", () => {
  const p1: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.2, longitude: -46.8 };

  test("intercala a coordenada na URL, anexa &waypoints e ecoa pontos_de_rota no resultado", async () => {
    const envelopeComPonto = {
      code: "Ok",
      routes: [
        {
          geometry: ENVELOPE_OK.routes[0].geometry,
          legs: [
            { distance: 500, duration: 30 },
            { distance: 1500, duration: 90 },
          ],
        },
      ],
    };
    const fetchFn = respostaFetchMock(envelopeComPonto);

    const resultado = await solicitarRota([PARADA_A, PARADA_B, PARADA_C], {
      fetchFn,
      pontosDeRota: [p1],
    });

    const urlChamada = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(urlChamada).toContain("-46.63,-23.55;-46.8,-23.2;-47.1,-22.9;-47.9,-22");
    expect(urlChamada).toContain("&waypoints=0;2;3");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava sucesso");
    expect(resultado.rota.pontos_de_rota).toEqual([p1]);
    expect(resultado.rota.trechos).toEqual([
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 0.5, duracao_s: 30 },
      { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 1.5, duracao_s: 90 },
    ]);
  });

  test("[inválido] NoSegment cuja coordenada rejeitada é a de um PONTO DE ROTA → indiceCoordenada undefined (genérico, não cita parada errada)", async () => {
    // Sequência intercalada: A(0), p1(1), B(2), C(3) — a coordenada rejeitada
    // (índice 1) é o ponto de rota, não uma parada.
    const fetchFn = respostaFetchMock({
      code: "NoSegment",
      message: "Could not find a matching segment for coordinate 1",
      routes: [],
    });

    const resultado = await solicitarRota([PARADA_A, PARADA_B, PARADA_C], {
      fetchFn,
      pontosDeRota: [p1],
    });

    expect(resultado).toEqual({
      ok: false,
      falha: { tipo: "sem-segmento", indiceCoordenada: undefined },
    });
  });

  test("[inválido] NoSegment cuja coordenada rejeitada é uma PARADA (com pontos de rota presentes) → mapeia para o índice correto da parada", async () => {
    // Sequência intercalada: A(0), p1(1), B(2), C(3) — a coordenada rejeitada
    // (índice 2) é a parada B, que é a parada de índice 1 (0-based).
    const fetchFn = respostaFetchMock({
      code: "NoSegment",
      message: "Could not find a matching segment for coordinate 2",
      routes: [],
    });

    const resultado = await solicitarRota([PARADA_A, PARADA_B, PARADA_C], {
      fetchFn,
      pontosDeRota: [p1],
    });

    expect(resultado).toEqual({
      ok: false,
      falha: { tipo: "sem-segmento", indiceCoordenada: 1 },
    });
  });
});

describe("solicitarRota — erros semânticos sem retry (Spec 03 §3.5)", () => {
  test("[inválido] NoRoute → { ok:false, sem-rota }, SEM retry (fetch 1×)", async () => {
    const fetchFn = respostaFetchMock({ code: "NoRoute", routes: [] });

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({ ok: false, falha: { tipo: "sem-rota" } });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("[inválido] NoSegment com índice na message → identifica a coordenada (best-effort)", async () => {
    const fetchFn = respostaFetchMock({
      code: "NoSegment",
      message: "Could not find a matching segment for coordinate 1",
      routes: [],
    });

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({
      ok: false,
      falha: { tipo: "sem-segmento", indiceCoordenada: 1 },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("[inválido] NoSegment sem índice legível → indiceCoordenada undefined (genérico)", async () => {
    const fetchFn = respostaFetchMock({ code: "NoSegment", routes: [] });

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({
      ok: false,
      falha: { tipo: "sem-segmento", indiceCoordenada: undefined },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("[inválido] outro code != Ok → { ok:false, codigo-inesperado } com o código, sem retry", async () => {
    const fetchFn = respostaFetchMock({ code: "InvalidQuery", routes: [] });

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({
      ok: false,
      falha: { tipo: "codigo-inesperado", code: "InvalidQuery" },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("[inválido] nenhuma falha produz rota (sem fallback — RN-048/NEG-015)", async () => {
    const fetchFn = respostaFetchMock({ code: "NoRoute", routes: [] });

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado.ok).toBe(false);
    expect("rota" in resultado).toBe(false);
  });
});

describe("solicitarRota — falha de rede/timeout com 1 retry (Spec 03 §3.5, RN-048)", () => {
  test("rede falha na 1ª e resolve Ok na 2ª → sucesso após o retry (fetch 2×)", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede caiu"))
      .mockResolvedValueOnce({ json: () => Promise.resolve(ENVELOPE_OK) }) as unknown as typeof fetch;

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("[inválido] rede falha nas duas tentativas → indisponivel, exatamente 1 retry (fetch 2×)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("rede caiu")) as unknown as typeof fetch;

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({ ok: false, falha: { tipo: "indisponivel" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("[inválido] corpo não-JSON é tratado como indisponibilidade (json rejeita) → retry → indisponivel", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      json: () => Promise.reject(new Error("Unexpected token < in JSON")),
    }) as unknown as typeof fetch;

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({ ok: false, falha: { tipo: "indisponivel" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("retry semântico: rede falha na 1ª, NoRoute na 2ª → sem-rota (o retry é só da rede)", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede caiu"))
      .mockResolvedValueOnce({ json: () => Promise.resolve({ code: "NoRoute", routes: [] }) }) as unknown as typeof fetch;

    const resultado = await solicitarRota([PARADA_A, PARADA_B], { fetchFn });

    expect(resultado).toEqual({ ok: false, falha: { tipo: "sem-rota" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("solicitarRota — timeout via AbortController (Spec 03 §3.5)", () => {
  test("default de timeout é 15 s (decisão da TASK-022), ajustável por chamada", () => {
    expect(OSRM_TIMEOUT_PADRAO_MS).toBe(15_000);
  });

  test("[inválido] tentativa que estoura o timeout aborta e, esgotado o retry, resulta indisponivel", async () => {
    vi.useFakeTimers();
    // fetch que só rejeita quando o signal for abortado (simula travamento).
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }) as unknown as typeof fetch;

    const promessa = solicitarRota([PARADA_A, PARADA_B], { fetchFn, timeoutMs: 15_000 });
    // 1ª tentativa estoura o timeout → aborta → entra no retry…
    await vi.advanceTimersByTimeAsync(15_000);
    // …2ª tentativa também estoura → indisponivel.
    await vi.advanceTimersByTimeAsync(15_000);

    await expect(promessa).resolves.toEqual({ ok: false, falha: { tipo: "indisponivel" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
