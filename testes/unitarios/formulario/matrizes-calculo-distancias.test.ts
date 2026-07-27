import { describe, expect, test } from "vitest";
import {
  calcularMatrizDistancias,
  matrizDistanciasDesatualizada,
  matrizDistanciasDoServico,
} from "@/formulario/matrizes";
import type { Itinerario } from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-026 — cálculo de `matriz_distancias` (Spec 02 §8; Spec 03 §4/§5;
// RN-054..057). As fixtures canônicas já trazem `matriz_distancias`
// consistente com `itinerarios[].paradas`/`rota.trechos` (provado por
// `fixtures-canonicas.test.ts` contra o schema) — por isso servem de oráculo:
// recomputar a partir dos itinerarios deve reproduzir exatamente o array
// gravado.

function ordenarPorPar(matriz: ReturnType<typeof calcularMatrizDistancias>) {
  return [...matriz].sort((a, b) =>
    `${a.secao_a_uuid}|${a.secao_b_uuid}`.localeCompare(`${b.secao_a_uuid}|${b.secao_b_uuid}`),
  );
}

describe("calcularMatrizDistancias — pares com Locais no meio (exemplo Spec 02 §15)", () => {
  test("recomputa exatamente a matriz gravada, incluindo a média half-up 6,00/6,10→6,05 (RN-056)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];

    const recomputada = calcularMatrizDistancias(servico.itinerarios);

    expect(ordenarPorPar(recomputada)).toEqual(ordenarPorPar(servico.matriz_distancias));
    const parComLocal = recomputada.find(
      (par) =>
        par.distancia_trecho_ida === 6 || par.distancia_trecho_volta === 6.1,
    );
    expect(parComLocal?.valor_adotado_de_distancia).toBe(6.05);
  });

  test("[inválido] o Local intermediário nunca gera par próprio (DEC-027/Q-002)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const localUuid = servico.itinerarios[0].paradas.find((p) => p.local_uuid)?.local_uuid;
    expect(localUuid).toBeDefined();

    const recomputada = calcularMatrizDistancias(servico.itinerarios);

    for (const par of recomputada) {
      expect(par.secao_a_uuid).not.toBe(localUuid);
      expect(par.secao_b_uuid).not.toBe(localUuid);
    }
  });

  test("todas as combinações de 3 Seções são geradas (RN-054): 3 pares para 3 Seções", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    expect(calcularMatrizDistancias(servico.itinerarios)).toHaveLength(3);
  });
});

describe("calcularMatrizDistancias — unidirecional (RN-056)", () => {
  test("só distancia_trecho_ida presente; valor_adotado = o único valor", () => {
    const servico = documentoUnidirecional().autos.servicos[0];

    const recomputada = calcularMatrizDistancias(servico.itinerarios);

    expect(recomputada).toEqual(servico.matriz_distancias);
    expect(recomputada[0].distancia_trecho_volta).toBeUndefined();
    expect(recomputada[0].valor_adotado_de_distancia).toBe(
      recomputada[0].distancia_trecho_ida,
    );
  });
});

describe("calcularMatrizDistancias — bidirecional multi-Serviço (RN-054/055)", () => {
  test("Serviço com 3 Seções: recomputa AB, BC, AC idênticos ao gravado", () => {
    const [servico] = documentoBidirecionalMultiServico().autos.servicos;

    const recomputada = calcularMatrizDistancias(servico.itinerarios);

    expect(ordenarPorPar(recomputada)).toEqual(ordenarPorPar(servico.matriz_distancias));
  });

  test("Serviço com 2 Seções (segundo Serviço do Autos) — intra-Serviço, não lê o primeiro", () => {
    const [, servico] = documentoBidirecionalMultiServico().autos.servicos;

    const recomputada = calcularMatrizDistancias(servico.itinerarios);

    expect(recomputada).toEqual(servico.matriz_distancias);
    expect(recomputada).toHaveLength(1);
  });
});

describe("calcularMatrizDistancias — casos sintéticos e de borda", () => {
  const SECAO_A = "11111111-1111-4111-8111-111111111111";
  const SECAO_B = "22222222-2222-4222-8222-222222222222";

  function itinerario(sentido: Itinerario["sentido"], paradas: Itinerario["paradas"], trechos: Itinerario["rota"]["trechos"]): Itinerario {
    return {
      sentido,
      paradas,
      rota: {
        geometria: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
        distancia_km: trechos.reduce((s, t) => s + t.distancia_km, 0),
        duracao_s: 0,
        descricao_itinerario: { texto: "", itens: [] },
        trechos,
        pontos_de_rota: [],
      },
      viagens: [
        {
          uuid: "aaaaaaaa-0000-4000-8000-000000000000",
          horario_saida: "08:00:00",
          dia_semana: "segunda",
          viagem_feriado: false,
          tabela_excepcional_uuid: null,
          horarios_paradas: paradas.map((p) => ({ parada_ordem: p.ordem, offset_horario: "00:00:00" })),
        },
      ],
    };
  }

  test("independência de ordem: A antes ou depois de B soma o mesmo total", () => {
    const idaAB = itinerario(
      "ida",
      [{ ordem: 1, secao_uuid: SECAO_A }, { ordem: 2, secao_uuid: SECAO_B }],
      [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 100 }],
    );
    const voltaBA = itinerario(
      "volta",
      [{ ordem: 1, secao_uuid: SECAO_B }, { ordem: 2, secao_uuid: SECAO_A }],
      [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 100 }],
    );

    const [par] = calcularMatrizDistancias([idaAB, voltaBA]);

    expect(par.distancia_trecho_ida).toBe(5);
    expect(par.distancia_trecho_volta).toBe(5);
    expect(par.valor_adotado_de_distancia).toBe(5);
  });

  test("[inválido] Serviço com < 2 Seções: matriz vazia, sem lançar", () => {
    const itinerarioUnico = itinerario(
      "ida",
      [{ ordem: 1, secao_uuid: SECAO_A }, { ordem: 2, local_uuid: "33333333-3333-4333-8333-333333333333" }],
      [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 100 }],
    );

    expect(() => calcularMatrizDistancias([itinerarioUnico])).not.toThrow();
    expect(calcularMatrizDistancias([itinerarioUnico])).toEqual([]);
  });

  test("[inválido] Ida e Volta ainda não sincronizadas (edição parcial): par ausente, não lançar", () => {
    const SECAO_C = "33333333-3333-4333-8333-333333333333";
    const idaComC = itinerario(
      "ida",
      [{ ordem: 1, secao_uuid: SECAO_A }, { ordem: 2, secao_uuid: SECAO_C }],
      [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 100 }],
    );
    const voltaSemC = itinerario(
      "volta",
      [{ ordem: 1, secao_uuid: SECAO_B }, { ordem: 2, secao_uuid: SECAO_A }],
      [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 100 }],
    );

    // Seções atendidas: A, C (via Ida), B (via Volta) — par A-C só tem Ida
    // (Volta não o referencia), par A-B só tem Volta (Ida não o referencia).
    expect(() => calcularMatrizDistancias([idaComC, voltaSemC])).not.toThrow();
    const recomputada = calcularMatrizDistancias([idaComC, voltaSemC]);
    // Nenhum par é completo dos dois lados quando ambos os itinerarios
    // existem e um deles não localiza a Seção — RN-056 exige os dois campos
    // quando bidirecional, então o par fica de fora até sincronizar.
    expect(recomputada).toEqual([]);
  });
});

describe("matrizDistanciasDoServico — adaptador de Serviço", () => {
  test("devolve o mesmo resultado de calcularMatrizDistancias(servico.itinerarios)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    expect(matrizDistanciasDoServico(servico)).toEqual(
      calcularMatrizDistancias(servico.itinerarios),
    );
  });
});

describe("matrizDistanciasDesatualizada — pendência 'matriz desatualizada' (Spec 04 §9.1/§11; RN-078)", () => {
  test("matriz gravada consistente com as rotas atuais → false", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    expect(matrizDistanciasDesatualizada(servico)).toBe(false);
  });

  test("insensível à ordem de armazenamento dos pares", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    servico.matriz_distancias = [...servico.matriz_distancias].reverse();
    expect(matrizDistanciasDesatualizada(servico)).toBe(false);
  });

  test("valor_adotado_de_distancia divergente → true", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    servico.matriz_distancias[0].valor_adotado_de_distancia += 1;
    expect(matrizDistanciasDesatualizada(servico)).toBe(true);
  });

  test("par ausente da matriz gravada (itinerário mudou) → true", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    servico.matriz_distancias.pop();
    expect(matrizDistanciasDesatualizada(servico)).toBe(true);
  });

  test("[inválido] Serviço unidirecional consistente → false", () => {
    const servico = documentoUnidirecional().autos.servicos[0];
    expect(matrizDistanciasDesatualizada(servico)).toBe(false);
  });
});
