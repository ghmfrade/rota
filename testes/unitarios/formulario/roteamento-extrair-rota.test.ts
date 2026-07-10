import { describe, expect, test } from "vitest";
import {
  arredondaHalfUp,
  extrairRota,
  type RespostaOsrm,
} from "@/formulario/roteamento";

// TASK-021 — extração legs→trechos e conversão m→km (Spec 03 §3.3/§3.4;
// RN-014, RN-040, RN-041, RN-050). Sem pontos de rota (mapeamento 1:1,
// TASK-023 generaliza). Nenhuma chamada de rede — só a resposta já recebida.

function respostaComLegs(
  legs: { distance: number; duration: number }[],
): RespostaOsrm {
  return {
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
        legs,
      },
    ],
  };
}

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
});

describe("extrairRota — mapeamento 1:1 leg→trecho (RN-041, Spec 03 §3.3)", () => {
  test("k paradas → k-1 trechos, origem/destino consecutivos", () => {
    const resposta = respostaComLegs([
      { distance: 1000, duration: 60 },
      { distance: 2000, duration: 120 },
      { distance: 3000, duration: 180 },
    ]);

    const resultado = extrairRota(resposta, 4);

    expect(resultado.trechos).toEqual([
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 1, duracao_s: 60 },
      { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 2, duracao_s: 120 },
      { parada_origem_ordem: 3, parada_destino_ordem: 4, distancia_km: 3, duracao_s: 180 },
    ]);
  });

  test("geometria é copiada diretamente de overview (RN-047)", () => {
    const resposta = respostaComLegs([{ distance: 1000, duration: 60 }]);
    const resultado = extrairRota(resposta, 2);
    expect(resultado.geometria).toEqual(resposta.routes[0].geometry);
  });

  test("conversão m→km half-up por trecho (RN-050)", () => {
    const resposta = respostaComLegs([{ distance: 6543, duration: 12.6 }]);
    const resultado = extrairRota(resposta, 2);
    expect(resultado.trechos[0].distancia_km).toBe(6.54);
    expect(resultado.trechos[0].duracao_s).toBe(13);
  });

  test("totais = soma dos trechos JÁ ARREDONDADOS, não o total global do OSRM (RN-040/050)", () => {
    // Dois trechos cujas distâncias brutas somam um total diferente da soma
    // dos arredondamentos individuais — prova que se usa a soma dos trechos.
    // 1.004 m → 1,00 km (arredonda para baixo); 1.006 m → 1,01 km.
    // Soma bruta = 2.010 m = 2,01 km; soma dos arredondados = 1,00 + 1,01 = 2,01.
    // Caso que expõe erro de fechamento: 1.005 + 1.005 = 2.010 m → total global
    // arredondaria para 2,01 km, mas cada trecho arredonda para 1,01 km cada
    // (half-up), somando 2,02 km — a soma dos trechos é a fonte da verdade.
    const resposta = respostaComLegs([
      { distance: 1005, duration: 10 },
      { distance: 1005, duration: 10 },
    ]);

    const resultado = extrairRota(resposta, 3);

    expect(resultado.trechos[0].distancia_km).toBe(1.01);
    expect(resultado.trechos[1].distancia_km).toBe(1.01);
    expect(resultado.distancia_km).toBe(2.02);
    expect(resultado.duracao_s).toBe(20);
  });

  test("[inválido] legs.length ≠ paradas.length - 1 lança erro identificável (RN-041)", () => {
    const resposta = respostaComLegs([{ distance: 1000, duration: 60 }]);
    expect(() => extrairRota(resposta, 4)).toThrow(/RN-041/);
  });

  test("[inválido] resposta sem routes[0] lança erro", () => {
    const resposta: RespostaOsrm = { code: "Ok", routes: [] };
    expect(() => extrairRota(resposta, 2)).toThrow(/routes/);
  });
});
