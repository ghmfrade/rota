import { describe, expect, test } from "vitest";

import { reconciliarMatrizSeccionamento } from "@/formulario/matrizes";
import {
  coletarViolacoesEstruturais,
  esquemaDocumentoOperacao,
  type ParDistancia,
  type ParSecao,
} from "@/shared/contrato";
import { documentoExemploMinimo } from "../../fixtures";

const SECAO_A = "11111111-1111-4111-8111-111111111111";
const SECAO_B = "22222222-2222-4222-8222-222222222222";
const SECAO_C = "33333333-3333-4333-8333-333333333333";
const SECAO_D = "44444444-4444-4444-8444-444444444444";

function parDistancia(secaoAUuid: string, secaoBUuid: string): ParDistancia {
  return {
    secao_a_uuid: secaoAUuid,
    secao_b_uuid: secaoBUuid,
    valor_adotado_de_distancia: 999,
  };
}

function parSecao(
  secaoAUuid: string,
  secaoBUuid: string,
  distanciaKm: number,
): ParSecao {
  return {
    secao_a_uuid: secaoAUuid,
    secao_b_uuid: secaoBUuid,
    distancia_km: distanciaKm,
  };
}

describe("reconciliarMatrizSeccionamento (TASK-088; RN-058/059)", () => {
  test("remove todos e somente os pares ausentes na nova matriz_distancias", () => {
    const ab = parSecao(SECAO_A, SECAO_B, 10);
    const ac = parSecao(SECAO_A, SECAO_C, 20);
    const bc = parSecao(SECAO_B, SECAO_C, 12);

    const resultado = reconciliarMatrizSeccionamento(
      [ab, ac, bc],
      [parDistancia(SECAO_A, SECAO_B)],
    );

    expect(resultado).toEqual([ab]);
  });

  test("preserva ordem, orientação, objeto e distancia_km dos pares sobreviventes", () => {
    const cb = parSecao(SECAO_C, SECAO_B, 12.34);
    const ba = parSecao(SECAO_B, SECAO_A, 7.89);

    const resultado = reconciliarMatrizSeccionamento(
      [cb, ba],
      [parDistancia(SECAO_A, SECAO_B), parDistancia(SECAO_B, SECAO_C)],
    );

    expect(resultado).toEqual([cb, ba]);
    expect(resultado[0]).toBe(cb);
    expect(resultado[1]).toBe(ba);
    expect(resultado.map((par) => par.distancia_km)).toEqual([12.34, 7.89]);
  });

  test("inserir Seção não habilita automaticamente os novos pares", () => {
    const ab = parSecao(SECAO_A, SECAO_B, 10);

    const resultado = reconciliarMatrizSeccionamento(
      [ab],
      [
        parDistancia(SECAO_A, SECAO_B),
        parDistancia(SECAO_A, SECAO_D),
        parDistancia(SECAO_B, SECAO_D),
      ],
    );

    expect(resultado).toEqual([ab]);
  });

  test("mudança de rota ou Local preserva todos os pares ainda existentes", () => {
    const matrizSeccionamento = [
      parSecao(SECAO_A, SECAO_B, 10),
      parSecao(SECAO_A, SECAO_C, 20),
      parSecao(SECAO_B, SECAO_C, 12),
    ];

    const resultado = reconciliarMatrizSeccionamento(matrizSeccionamento, [
      parDistancia(SECAO_A, SECAO_B),
      parDistancia(SECAO_A, SECAO_C),
      parDistancia(SECAO_B, SECAO_C),
    ]);

    expect(resultado).toEqual(matrizSeccionamento);
  });

  test.each([
    { nome: "ambas vazias", seccionamento: [], distancias: [], esperado: [] },
    {
      nome: "todos os pares obsoletos",
      seccionamento: [parSecao(SECAO_A, SECAO_C, 20)],
      distancias: [parDistancia(SECAO_A, SECAO_B)],
      esperado: [],
    },
  ])("caso de borda: $nome", ({ seccionamento, distancias, esperado }) => {
    expect(reconciliarMatrizSeccionamento(seccionamento, distancias)).toEqual(esperado);
  });

  test("[inválido] não muta nenhuma das matrizes recebidas", () => {
    const matrizSeccionamento = [
      parSecao(SECAO_A, SECAO_B, 10),
      parSecao(SECAO_A, SECAO_C, 20),
    ];
    const matrizDistancias = [parDistancia(SECAO_A, SECAO_B)];
    const seccionamentoAntes = structuredClone(matrizSeccionamento);
    const distanciasAntes = structuredClone(matrizDistancias);

    const resultado = reconciliarMatrizSeccionamento(
      matrizSeccionamento,
      matrizDistancias,
    );

    expect(resultado).not.toBe(matrizSeccionamento);
    expect(matrizSeccionamento).toEqual(seccionamentoAntes);
    expect(matrizDistancias).toEqual(distanciasAntes);
  });

  test("[inválido] par obsoleto produz RN-059; reconciliado elimina a violação", () => {
    const documento = esquemaDocumentoOperacao.parse(documentoExemploMinimo());
    const servico = documento.autos.servicos[0];
    servico.matriz_distancias = [servico.matriz_distancias[0]];

    expect(
      coletarViolacoesEstruturais(documento).some((violacao) =>
        violacao.mensagem.includes("[RN-059]"),
      ),
    ).toBe(true);

    servico.matriz_seccionamento = reconciliarMatrizSeccionamento(
      servico.matriz_seccionamento,
      servico.matriz_distancias,
    );

    expect(
      coletarViolacoesEstruturais(documento).some((violacao) =>
        violacao.mensagem.includes("[RN-059]"),
      ),
    ).toBe(false);
  });
});
