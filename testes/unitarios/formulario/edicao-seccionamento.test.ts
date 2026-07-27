import { describe, expect, test } from "vitest";
import {
  aplicarSugestaoEmLote,
  definirDistancia,
  desabilitarPar,
  habilitarPar,
} from "@/formulario/matrizes";
import type { ParDistancia, ParSecao, Servico } from "@/shared/contrato";

// TASK-027 — operações de edição de `matriz_seccionamento` (Spec 02 §9;
// Spec 04 §9.2; RN-058/059/060). Todas imutáveis e por par não-direcional.

const SECAO_A = "11111111-1111-4111-8111-111111111111";
const SECAO_B = "22222222-2222-4222-8222-222222222222";
const SECAO_C = "33333333-3333-4333-8333-333333333333";

function parDistancia(
  secaoAUuid: string,
  secaoBUuid: string,
  valorAdotado: number,
): ParDistancia {
  return {
    secao_a_uuid: secaoAUuid,
    secao_b_uuid: secaoBUuid,
    valor_adotado_de_distancia: valorAdotado,
  };
}

function servico(overrides: Partial<Servico> & { uuid: string }): Servico {
  return {
    numero_n: "1",
    caracteristica_veiculo: "CR",
    carater: "principal",
    locais: [],
    tabelas_excepcionais: [],
    itinerarios: [],
    matriz_distancias: [],
    matriz_seccionamento: [],
    ...overrides,
  };
}

describe("habilitarPar (Spec 04 §9.2; RN-058/059)", () => {
  test("cria a entrada com a distância sugerida informada", () => {
    const s = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });

    const resultado = habilitarPar(s, SECAO_A, SECAO_B, 12);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.matrizSeccionamento).toEqual([
        { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
      ]);
    }
  });

  test("idempotente: habilitar par já habilitado não duplica", () => {
    const s = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
      matriz_seccionamento: [{ secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 }],
    });

    const resultado = habilitarPar(s, SECAO_A, SECAO_B, 99);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.matrizSeccionamento).toHaveLength(1);
      expect(resultado.matrizSeccionamento[0].distancia_km).toBe(12);
    }
  });

  test("[inválido] secao_a_uuid == secao_b_uuid é recusado (RN-059)", () => {
    const s = servico({ uuid: "s1", matriz_distancias: [] });

    const resultado = habilitarPar(s, SECAO_A, SECAO_A, 5);

    expect(resultado).toEqual({ ok: false, motivo: "secoes-iguais" });
  });

  test("[inválido] par ausente em matriz_distancias do Serviço é recusado (RN-059)", () => {
    const s = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });

    const resultado = habilitarPar(s, SECAO_A, SECAO_C, 5);

    expect(resultado).toEqual({ ok: false, motivo: "par-ausente-em-matriz-distancias" });
  });

  test("RN-004: não altera nenhuma UUID de Seção referenciada", () => {
    const s = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });

    const resultado = habilitarPar(s, SECAO_A, SECAO_B, 12);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.matrizSeccionamento[0].secao_a_uuid).toBe(SECAO_A);
      expect(resultado.matrizSeccionamento[0].secao_b_uuid).toBe(SECAO_B);
    }
  });
});

describe("desabilitarPar (Spec 04 §9.2)", () => {
  test("remove a entrada do par", () => {
    const matriz: ParSecao[] = [
      { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
      { secao_a_uuid: SECAO_B, secao_b_uuid: SECAO_C, distancia_km: 6 },
    ];

    expect(desabilitarPar(matriz, SECAO_A, SECAO_B)).toEqual([matriz[1]]);
  });

  test("independe da ordem do par ({a,b} == {b,a})", () => {
    const matriz: ParSecao[] = [
      { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
    ];

    expect(desabilitarPar(matriz, SECAO_B, SECAO_A)).toEqual([]);
  });

  test("[inválido] par não habilitado é no-op", () => {
    const matriz: ParSecao[] = [
      { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
    ];

    expect(desabilitarPar(matriz, SECAO_A, SECAO_C)).toEqual(matriz);
  });
});

describe("definirDistancia (edição manual — RN-058)", () => {
  test("edita só o par alvo, preservando os demais", () => {
    const matriz: ParSecao[] = [
      { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
      { secao_a_uuid: SECAO_B, secao_b_uuid: SECAO_C, distancia_km: 6 },
    ];

    const atualizada = definirDistancia(matriz, SECAO_A, SECAO_B, 20);

    expect(atualizada[0].distancia_km).toBe(20);
    expect(atualizada[1]).toEqual(matriz[1]);
  });

  test("[inválido] par não habilitado é no-op", () => {
    const matriz: ParSecao[] = [
      { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
    ];

    expect(definirDistancia(matriz, SECAO_A, SECAO_C, 20)).toEqual(matriz);
  });
});

describe("aplicarSugestaoEmLote (Spec 03 §6.1; RN-060)", () => {
  test("modo 'menor-distancia': aplica o mínimo entre Serviços a todos os pares habilitados", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [
        parDistancia(SECAO_A, SECAO_B, 12),
        parDistancia(SECAO_B, SECAO_C, 8),
      ],
      matriz_seccionamento: [
        { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 999 },
        { secao_a_uuid: SECAO_B, secao_b_uuid: SECAO_C, distancia_km: 999 },
      ],
    });
    const s2 = servico({
      uuid: "s2",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 9)],
    });

    const atualizada = aplicarSugestaoEmLote(s1, [s1, s2], "menor-distancia");

    expect(atualizada.find((p) => p.secao_a_uuid === SECAO_A)?.distancia_km).toBe(9);
    expect(atualizada.find((p) => p.secao_a_uuid === SECAO_B)?.distancia_km).toBe(8);
  });

  test("modo 'do-servico': aplica o valor_adotado do próprio Serviço, ignora outros", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
      matriz_seccionamento: [
        { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 999 },
      ],
    });
    const s2 = servico({
      uuid: "s2",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 5)],
    });

    const atualizada = aplicarSugestaoEmLote(s1, [s1, s2], "do-servico");

    expect(atualizada[0].distancia_km).toBe(12);
  });

  test("só toca pares já HABILITADOS — nunca habilita par novo", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [
        parDistancia(SECAO_A, SECAO_B, 12),
        parDistancia(SECAO_B, SECAO_C, 8),
      ],
      matriz_seccionamento: [
        { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 12 },
      ],
    });

    const atualizada = aplicarSugestaoEmLote(s1, [s1], "menor-distancia");

    expect(atualizada).toHaveLength(1);
    expect(atualizada[0].secao_a_uuid).toBe(SECAO_A);
  });

  test("último modo acionado vale: aplicar 'menor-distancia' depois 'do-servico' resulta em 'do-servico'", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
      matriz_seccionamento: [
        { secao_a_uuid: SECAO_A, secao_b_uuid: SECAO_B, distancia_km: 999 },
      ],
    });
    const s2 = servico({
      uuid: "s2",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 5)],
    });

    const primeiraAplicacao = aplicarSugestaoEmLote(s1, [s1, s2], "menor-distancia");
    const s1AposPrimeira = { ...s1, matriz_seccionamento: primeiraAplicacao };
    const segundaAplicacao = aplicarSugestaoEmLote(s1AposPrimeira, [s1AposPrimeira, s2], "do-servico");

    expect(primeiraAplicacao[0].distancia_km).toBe(5);
    expect(segundaAplicacao[0].distancia_km).toBe(12);
  });
});
