import { afterEach, describe, expect, test, vi } from "vitest";
import {
  comporDescricao,
  congelarRotaCarregada,
  recalcularItinerario,
  type ComporDescricao,
  type EstadoRotaViva,
  type ParadaRota,
} from "@/formulario/roteamento";
import { esquemaRota, type DescricaoItinerario } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";

// TASK-024 — motor headless "abrir congelado × editar recalcula" (DEC-041;
// RN-015/046/052). `congelarRotaCarregada` materializa o caminho de abertura
// (garantia dura: 0 chamadas OSRM — RN-052, Spec 04 §3.1 item 6);
// `recalcularItinerario` orquestra o "soltar" do gesto de edição, reaplicando
// pontos de rota (Spec 03 §3.6.2) e delegando a descrição a um composer
// injetável (TASK-025 fica fora — RN-046/§3.7.7/§3.7.8).

const PARADA_A: Ponto = { latitude: -23.55, longitude: -46.63 };
const PARADA_B: Ponto = { latitude: -22.9, longitude: -47.1 };

const DESCRICAO_CONGELADA: DescricaoItinerario = {
  texto: "Seção A, Rua X, Seção B",
  itens: [
    { tipo: "secao", secao_uuid: "11111111-1111-4111-8111-111111111111", rotulo: "Cidade A - Seção A" },
    { tipo: "via", nome: "Rua X" },
    { tipo: "secao", secao_uuid: "22222222-2222-4222-8222-222222222222", rotulo: "Cidade B - Seção B" },
  ],
};

/** `Rota` congelada de exemplo — a mesma forma que `esquemaRota` valida. */
const ROTA_CONGELADA = {
  geometria: {
    type: "LineString" as const,
    coordinates: [
      [-46.63, -23.55],
      [-47.1, -22.9],
    ] as [number, number][],
  },
  distancia_km: 12.34,
  duracao_s: 900,
  descricao_itinerario: DESCRICAO_CONGELADA,
  trechos: [
    { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 12.34, duracao_s: 900 },
  ],
  pontos_de_rota: [],
};

const ENVELOPE_OK = {
  code: "Ok",
  routes: [
    {
      geometry: ROTA_CONGELADA.geometria,
      legs: [{ distance: 1000, duration: 60 }],
    },
  ],
};

/** Mock de `fetch` que resolve um corpo JSON fixo — nenhum teste desta suíte
 * toca a rede real (categoria 4/9, docs-dev/08). */
function respostaFetchMock(corpo: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve(corpo),
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("congelarRotaCarregada — abrir JSON (RN-052; Spec 04 §3.1 item 6)", () => {
  test("devolve { situacao: 'congelada', rota } idêntica à gravada, sem qualquer fetch", () => {
    // Espião ATIVO sobre o fetch global efetivamente disponível à unidade
    // (DEC-042): mockImplementation garante que qualquer chamada acidental
    // estoure alto em vez de ir à rede real, e a asserção `not.toHaveBeenCalled`
    // vira guard de regressão de verdade — falharia se `congelarRotaCarregada`
    // passasse a chamar o OSRM na abertura (RN-052).
    const fetchEspiao = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.reject(new Error("abrir JSON não deve chamar fetch (RN-052)")),
      );

    const estado = congelarRotaCarregada(ROTA_CONGELADA);

    expect(estado).toEqual({ situacao: "congelada", rota: ROTA_CONGELADA });
    expect(fetchEspiao).not.toHaveBeenCalled();
  });

  test("a descrição devolvida é a congelada, sem recompor via OSRM (RN-046)", () => {
    const estado = congelarRotaCarregada(ROTA_CONGELADA);

    if (estado.situacao !== "congelada") throw new Error("esperava congelada");
    expect(estado.rota.descricao_itinerario).toBe(DESCRICAO_CONGELADA);
  });
});

describe("recalcularItinerario — sucesso (RN-046/052; Spec 03 §3.7.7)", () => {
  test("code Ok → { situacao: 'recalculada' } com rota schema-válida, compondo a descrição 1x", async () => {
    const fetchFn = respostaFetchMock(ENVELOPE_OK);
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO_CONGELADA);

    const estado = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B] },
      comporDescricao,
      { fetchFn },
    );

    expect(estado.situacao).toBe("recalculada");
    if (estado.situacao !== "recalculada") throw new Error("esperava recalculada");
    expect(esquemaRota.safeParse(estado.rota).success).toBe(true);
    expect(estado.rota.descricao_itinerario).toBe(DESCRICAO_CONGELADA);
    expect(comporDescricao).toHaveBeenCalledTimes(1);
  });

  test("reaplica os pontos de rota persistidos na requisição (Spec 03 §3.6.2)", async () => {
    const p1 = { apos_parada_ordem: 1, latitude: -23.2, longitude: -46.8 };
    const envelopeComPonto = {
      code: "Ok",
      routes: [
        {
          geometry: ROTA_CONGELADA.geometria,
          legs: [
            { distance: 500, duration: 30 },
            { distance: 1500, duration: 90 },
          ],
        },
      ],
    };
    const fetchFn = respostaFetchMock(envelopeComPonto);
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO_CONGELADA);

    const estado = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B], pontosDeRota: [p1] },
      comporDescricao,
      { fetchFn },
    );

    const urlChamada = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(urlChamada).toContain("-46.63,-23.55;-46.8,-23.2;-47.1,-22.9");
    expect(urlChamada).toContain("&waypoints=0;2");
    expect(estado.situacao).toBe("recalculada");
    if (estado.situacao !== "recalculada") throw new Error("esperava recalculada");
    expect(estado.rota.pontos_de_rota).toEqual([p1]);
  });
});

describe("recalcularItinerario — falha do OSRM (RN-048; Spec 03 §3.5/§3.7.8)", () => {
  test("[inválido] NoRoute → { situacao: 'sem-rota' }, SEM compor descrição", async () => {
    const fetchFn = respostaFetchMock({ code: "NoRoute", routes: [] });
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO_CONGELADA);

    const estado: EstadoRotaViva = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B] },
      comporDescricao,
      { fetchFn },
    );

    expect(estado).toEqual({ situacao: "sem-rota", falha: { tipo: "sem-rota" } });
    expect(comporDescricao).not.toHaveBeenCalled();
  });

  test("[inválido] falha de rede persistente (2x) → indisponivel, sem compor descrição", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("rede caiu")) as unknown as typeof fetch;
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO_CONGELADA);

    const estado = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B] },
      comporDescricao,
      { fetchFn },
    );

    expect(estado).toEqual({ situacao: "sem-rota", falha: { tipo: "indisponivel" } });
    expect(comporDescricao).not.toHaveBeenCalled();
  });

  test("[inválido] code inesperado → 'sem-rota' carrega o código, sem compor descrição", async () => {
    const fetchFn = respostaFetchMock({ code: "InvalidQuery", routes: [] });
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO_CONGELADA);

    const estado = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B] },
      comporDescricao,
      { fetchFn },
    );

    expect(estado).toEqual({
      situacao: "sem-rota",
      falha: { tipo: "codigo-inesperado", code: "InvalidQuery" },
    });
    expect(comporDescricao).not.toHaveBeenCalled();
  });

  test("[inválido] nenhuma falha produz rota — sem fallback (RN-048/NEG-015)", async () => {
    const fetchFn = respostaFetchMock({ code: "NoRoute", routes: [] });
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO_CONGELADA);

    const estado = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B] },
      comporDescricao,
      { fetchFn },
    );

    expect(estado.situacao).toBe("sem-rota");
    expect("rota" in estado).toBe(false);
  });
});

// TASK-025 — costura do composer REAL (não mock) no recálculo bem-sucedido
// (DEC-046): prova que `recalcularItinerario` + `comporDescricao` produzem uma
// `rota` schema-válida de ponta a ponta, sem placeholder.
describe("recalcularItinerario — composer real injetado (TASK-025; DEC-046)", () => {
  test("produz descricao_itinerario a partir dos steps do envelope OSRM (mockado)", async () => {
    const SECAO_A_UUID = "11111111-1111-4111-8111-111111111111";
    const SECAO_B_UUID = "22222222-2222-4222-8222-222222222222";
    const paradaA: ParadaRota = {
      ...PARADA_A,
      secao: { uuid: SECAO_A_UUID, rotulo: "Cidade A - Seção A" },
    };
    const paradaB: ParadaRota = {
      ...PARADA_B,
      secao: { uuid: SECAO_B_UUID, rotulo: "Cidade B - Seção B" },
    };
    const envelopeComSteps = {
      code: "Ok",
      routes: [
        {
          geometry: ROTA_CONGELADA.geometria,
          legs: [{ distance: 1000, duration: 60, steps: [{ name: "Rua Treta" }] }],
        },
      ],
    };
    const fetchFn = respostaFetchMock(envelopeComSteps);

    const estado = await recalcularItinerario(
      { paradas: [paradaA, paradaB] },
      comporDescricao,
      { fetchFn },
    );

    expect(estado.situacao).toBe("recalculada");
    if (estado.situacao !== "recalculada") throw new Error("esperava recalculada");
    expect(esquemaRota.safeParse(estado.rota).success).toBe(true);
    expect(estado.rota.descricao_itinerario).toEqual({
      texto: "Cidade A - Seção A, Rua Treta, Cidade B - Seção B.",
      itens: [
        { tipo: "secao", secao_uuid: SECAO_A_UUID, rotulo: "Cidade A - Seção A" },
        { tipo: "via", nome: "Rua Treta" },
        { tipo: "secao", secao_uuid: SECAO_B_UUID, rotulo: "Cidade B - Seção B" },
      ],
    });
  });
});
