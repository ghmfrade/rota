import { describe, expect, test } from "vitest";
import { sugerirDistanciaDoServico, sugerirMenorDistancia } from "@/formulario/matrizes";
import type { ParDistancia, Servico } from "@/shared/contrato";
import { documentoBidirecionalMultiServico } from "../../fixtures";

// TASK-027 — os dois algoritmos de sugestão de UI para
// `matriz_seccionamento.distancia_km` (Spec 03 §6; RN-060).

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

describe("sugerirMenorDistancia (Spec 03 §6.2; RN-060)", () => {
  test("toma o menor valor_adotado_de_distancia do par entre 3 Serviços", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });
    const s2 = servico({
      uuid: "s2",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 9)],
    });
    const s3 = servico({
      uuid: "s3",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 15)],
    });

    expect(sugerirMenorDistancia([s1, s2, s3], SECAO_A, SECAO_B)).toBe(9);
  });

  test("independe da ordem do par ({a,b} == {b,a} — RN-059)", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_B, SECAO_A, 9)],
    });

    expect(sugerirMenorDistancia([s1], SECAO_A, SECAO_B)).toBe(9);
  });

  test("empate: dois Serviços com o mesmo valor_adotado → esse valor, sem ambiguidade (§6.4)", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 10)],
    });
    const s2 = servico({
      uuid: "s2",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 10)],
    });

    expect(sugerirMenorDistancia([s1, s2], SECAO_A, SECAO_B)).toBe(10);
  });

  test("par atendido só pelo Serviço corrente: os dois modos coincidem (§6.4)", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });
    const s2 = servico({ uuid: "s2", matriz_distancias: [] });

    expect(sugerirMenorDistancia([s1, s2], SECAO_A, SECAO_B)).toBe(
      sugerirDistanciaDoServico(s1, SECAO_A, SECAO_B),
    );
  });

  test("[inválido] nenhum Serviço atende o par → undefined, sem inventar valor", () => {
    const s1 = servico({ uuid: "s1", matriz_distancias: [] });

    expect(sugerirMenorDistancia([s1], SECAO_A, SECAO_B)).toBeUndefined();
  });

  test("sem conversão de unidade — devolve exatamente o valor em km lido", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 8.25)],
    });

    expect(sugerirMenorDistancia([s1], SECAO_A, SECAO_B)).toBe(8.25);
  });

  test("integração com fixture canônica: dois Serviços atendem {Santos, São Vicente} com o mesmo valor", () => {
    const [servicoCR1, servicoCR2] = documentoBidirecionalMultiServico().autos.servicos;

    const menor = sugerirMenorDistancia(
      [servicoCR1, servicoCR2],
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    );

    expect(menor).toBe(8);
  });
});

describe("sugerirDistanciaDoServico (Spec 03 §6.3; RN-060)", () => {
  test("usa exclusivamente o valor_adotado do próprio Serviço, ignora outros menores", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });

    expect(sugerirDistanciaDoServico(s1, SECAO_A, SECAO_B)).toBe(12);
  });

  test("independe da ordem do par", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_B, SECAO_A, 12)],
    });

    expect(sugerirDistanciaDoServico(s1, SECAO_A, SECAO_B)).toBe(12);
  });

  test("[inválido] par ausente em matriz_distancias do próprio Serviço → undefined (erro de forma, não sugestão — §6.4)", () => {
    const s1 = servico({
      uuid: "s1",
      matriz_distancias: [parDistancia(SECAO_A, SECAO_B, 12)],
    });

    expect(sugerirDistanciaDoServico(s1, SECAO_A, SECAO_C)).toBeUndefined();
  });
});
