import { describe, expect, test } from "vitest";
import { extrairRota, type RespostaOsrm } from "@/formulario/roteamento";

// TASK-021/023 — extração legs→trechos e conversão m→km (Spec 03 §3.3/§3.4/
// §3.6; RN-014, RN-040, RN-041, RN-050, RN-051). Cobre o mapeamento 1:1 sem
// pontos de rota (TASK-021) e os dois caminhos com pontos de rota —
// preferencial (waypoints honrado) e fallback (fusão de legs) — usando o
// exemplo literal da Spec 03 §3.6.1. Nenhuma chamada de rede — só a resposta
// já recebida.

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

// Exemplo literal da Spec 03 §3.6.1: 3 paradas A(1), B(2), C(3); p1,p2,p3 no
// trecho A→B (apos_parada_ordem=1), p4 no trecho B→C (apos_parada_ordem=2).
// Sequência de coordenadas: A,p1,p2,p3,B,p4,C (7 coordenadas) →
// indicesParadas=[0,4,6] (waypoints=0;4;6). Resultado esperado nos dois
// caminhos: 2 trechos (não 6/7), trechos.length == paradas.length - 1.
const INDICES_PARADAS_EXEMPLO = [0, 4, 6];

describe("extrairRota — pontos de rota, caminho preferencial (waypoints honrado — RN-051, Spec 03 §3.6.1)", () => {
  test("2 legs (A→B com p1..p3 embutidos, B→C com p4 embutido) → 2 trechos", () => {
    // Valores já agregados pelo OSRM (pass-through): trecho A→B = 512 m/50,4 s;
    // trecho B→C = 2.000 m/100 s — os mesmos totais do caminho fallback abaixo.
    const resposta = respostaComLegs([
      { distance: 512, duration: 50.4 },
      { distance: 2000, duration: 100 },
    ]);

    const resultado = extrairRota(resposta, 3, {
      indicesParadas: INDICES_PARADAS_EXEMPLO,
    });

    expect(resultado.trechos).toEqual([
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 0.51, duracao_s: 50 },
      { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 2, duracao_s: 100 },
    ]);
  });
});

describe("extrairRota — pontos de rota, caminho fallback (fusão de legs — RN-051, Spec 03 §3.6.1)", () => {
  test("6 legs (A→p1,p1→p2,p2→p3,p3→B | B→p4,p4→C) fundidos em 2 trechos, RESULTADO IDÊNTICO ao preferencial", () => {
    // Trecho A→B: 4 legs de 128 m / 12,6 s cada — soma bruta 512 m / 50,4 s.
    // Arredondar CADA leg antes de somar daria 0,13×4=0,52 km e 13×4=52 s
    // (errado); somar bruto e arredondar UMA VEZ dá 0,51 km e 50 s (RN-050),
    // igual ao caminho preferencial acima.
    const resposta = respostaComLegs([
      { distance: 128, duration: 12.6 },
      { distance: 128, duration: 12.6 },
      { distance: 128, duration: 12.6 },
      { distance: 128, duration: 12.6 },
      // Trecho B→C: 2 legs que somam 2.000 m / 100 s.
      { distance: 999, duration: 40 },
      { distance: 1001, duration: 60 },
    ]);

    const resultado = extrairRota(resposta, 3, {
      indicesParadas: INDICES_PARADAS_EXEMPLO,
    });

    expect(resultado.trechos).toEqual([
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 0.51, duracao_s: 50 },
      { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 2, duracao_s: 100 },
    ]);
  });

  test("[inválido] legs.length não corresponde nem ao 1:1 nem ao fallback esperado → erro RN-041", () => {
    const resposta = respostaComLegs([
      { distance: 100, duration: 10 },
      { distance: 100, duration: 10 },
      { distance: 100, duration: 10 },
    ]);

    expect(() =>
      extrairRota(resposta, 3, { indicesParadas: INDICES_PARADAS_EXEMPLO }),
    ).toThrow(/RN-041/);
  });
});

describe("extrairRota — pontos_de_rota ecoados no resultado (Spec 03 §3.6.2)", () => {
  test("pontosDeRota informados são devolvidos junto do resultado, para congelamento", () => {
    const pontosDeRota = [
      { apos_parada_ordem: 1, latitude: -23.1, longitude: -46.1 },
    ];
    const resposta = respostaComLegs([{ distance: 1000, duration: 60 }]);

    const resultado = extrairRota(resposta, 2, { pontosDeRota });

    expect(resultado.pontos_de_rota).toEqual(pontosDeRota);
  });

  test("sem pontosDeRota informados, o resultado traz array vazio (default [])", () => {
    const resposta = respostaComLegs([{ distance: 1000, duration: 60 }]);
    const resultado = extrairRota(resposta, 2);
    expect(resultado.pontos_de_rota).toEqual([]);
  });
});

// TASK-025 — exposição de `steps[].name`, insumo cru da descrição textual
// (Spec 03 §3.7.4). `nomesViasPorTrecho[i]` é paralelo a `trechos[i]`; a
// limpeza (§3.7.5) é do compositor (`compor-descricao.ts`), não desta função.
function respostaComLegsEsteps(
  legs: { distance: number; duration: number; steps?: { name?: string }[] }[],
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

describe("extrairRota — nomesViasPorTrecho (RN-047/053, Spec 03 §3.7.4)", () => {
  test("caminho 1:1 — nomesViasPorTrecho[i] são os step.name do leg i, na ordem", () => {
    const resposta = respostaComLegsEsteps([
      { distance: 1000, duration: 60, steps: [{ name: "Rua A" }, { name: "" }, { name: "Rua B" }] },
      { distance: 2000, duration: 120, steps: [{ name: "Avenida C" }] },
    ]);

    const resultado = extrairRota(resposta, 3);

    expect(resultado.nomesViasPorTrecho).toEqual([
      ["Rua A", "", "Rua B"],
      ["Avenida C"],
    ]);
  });

  test("[inválido] leg sem steps (RN-053, compatibilidade) → entrada vazia, sem lançar erro", () => {
    const resposta = respostaComLegsEsteps([{ distance: 1000, duration: 60 }]);
    const resultado = extrairRota(resposta, 2);
    expect(resultado.nomesViasPorTrecho).toEqual([[]]);
  });

  test("caminho fallback — concatena os step.name de todos os legs fundidos no trecho", () => {
    const resposta = respostaComLegsEsteps([
      { distance: 128, duration: 12.6, steps: [{ name: "Rua A" }] },
      { distance: 128, duration: 12.6, steps: [{ name: "Rua A" }] },
      { distance: 128, duration: 12.6, steps: [{ name: "Rua B" }] },
      { distance: 128, duration: 12.6, steps: [] },
      { distance: 999, duration: 40, steps: [{ name: "Rodovia X" }] },
      { distance: 1001, duration: 60, steps: [{ name: "Rodovia X" }] },
    ]);

    const resultado = extrairRota(resposta, 3, {
      indicesParadas: INDICES_PARADAS_EXEMPLO,
    });

    expect(resultado.nomesViasPorTrecho).toEqual([
      ["Rua A", "Rua A", "Rua B"],
      ["Rodovia X", "Rodovia X"],
    ]);
  });
});
