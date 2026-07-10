import { afterEach, describe, expect, test } from "vitest";
import {
  montarUrlOsrm,
  urlBaseOsrm,
  OSRM_BASE_URL_PADRAO,
} from "@/formulario/roteamento";
import type { Ponto } from "@/shared/geo";

// TASK-021 — montagem da URL de requisição ao OSRM (Spec 03 §3.2; RN-047).
// Sem pontos de rota (TASK-023) e sem rede real (categoria 4, docs-dev/08).

const PARADA_A: Ponto = { latitude: -23.55, longitude: -46.63 };
const PARADA_B: Ponto = { latitude: -22.9, longitude: -47.1 };
const PARADA_C: Ponto = { latitude: -22.0, longitude: -47.9 };

afterEach(() => {
  delete process.env.NEXT_PUBLIC_OSRM_BASE_URL;
});

describe("montarUrlOsrm (RN-047, Spec 03 §3.2)", () => {
  test("usa o perfil driving e os parâmetros fixos da requisição", () => {
    const url = montarUrlOsrm([PARADA_A, PARADA_B]);
    expect(url).toContain("/route/v1/driving/");
    expect(url).toContain("overview=full");
    expect(url).toContain("geometries=geojson");
    expect(url).toContain("steps=true");
    expect(url).toContain("annotations=false");
    expect(url).toContain("continue_straight=false");
  });

  test("coordenadas em lon,lat, na ordem das paradas, separadas por ;", () => {
    const url = montarUrlOsrm([PARADA_A, PARADA_B, PARADA_C]);
    const coordenadas = url
      .split("/route/v1/driving/")[1]
      .split("?")[0];
    expect(coordenadas).toBe(
      "-46.63,-23.55;-47.1,-22.9;-47.9,-22",
    );
  });

  test("usa o demo público como base default", () => {
    const url = montarUrlOsrm([PARADA_A, PARADA_B]);
    expect(url.startsWith(OSRM_BASE_URL_PADRAO)).toBe(true);
  });

  test("override explícito de baseUrl prevalece", () => {
    const url = montarUrlOsrm([PARADA_A, PARADA_B], "https://osrm.exemplo.gov.br");
    expect(url.startsWith("https://osrm.exemplo.gov.br")).toBe(true);
  });

  test("[inválido] menos de 2 paradas lança erro (RN-034/RN-047)", () => {
    expect(() => montarUrlOsrm([PARADA_A])).toThrow(/RN-047/);
    expect(() => montarUrlOsrm([])).toThrow(/RN-047/);
  });
});

describe("urlBaseOsrm — configurabilidade (DEC-029)", () => {
  test("default é o demo público quando não há override nem env var", () => {
    expect(urlBaseOsrm()).toBe(OSRM_BASE_URL_PADRAO);
  });

  test("variável de ambiente NEXT_PUBLIC_OSRM_BASE_URL é respeitada", () => {
    process.env.NEXT_PUBLIC_OSRM_BASE_URL = "https://osrm.producao.exemplo";
    expect(urlBaseOsrm()).toBe("https://osrm.producao.exemplo");
  });

  test("override explícito prevalece sobre a variável de ambiente", () => {
    process.env.NEXT_PUBLIC_OSRM_BASE_URL = "https://osrm.producao.exemplo";
    expect(urlBaseOsrm("https://osrm.override.exemplo")).toBe(
      "https://osrm.override.exemplo",
    );
  });

  test("[inválido] variável em branco (só espaços) é ignorada, cai no default", () => {
    process.env.NEXT_PUBLIC_OSRM_BASE_URL = "   ";
    expect(urlBaseOsrm()).toBe(OSRM_BASE_URL_PADRAO);
  });
});
