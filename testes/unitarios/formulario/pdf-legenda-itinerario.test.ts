import { describe, expect, test } from "vitest";
import { numerarItinerario } from "@/formulario/pdf/legenda-itinerario";
import type { Itinerario, Local, Parada, Secao } from "@/shared/contrato";

// TASK-127 — numeração hierárquica das paradas do mapa/legenda do PDF
// (DEC-105; Spec 04 §13.1 itens 4d/8b). Módulo puro: fixtures mínimas
// construídas à mão (não precisam de `rota`/`viagens`/estrutura válida
// completa — `numerarItinerario` só lê `paradas` e `sentido`).

const SERVICO_UUID = "aaaaaaaa-0000-4000-8000-000000000001";
const OUTRO_SERVICO_UUID = "bbbbbbbb-0000-4000-8000-000000000002";

function secao(
  uuid: string,
  municipio: string,
  nome: string,
  pontosPorServico: Record<string, { latitude: number; longitude: number }> = {
    [SERVICO_UUID]: { latitude: 0, longitude: 0 },
  },
): Secao {
  return {
    uuid,
    municipio,
    nome,
    servicos: Object.entries(pontosPorServico).map(([servico_uuid, ponto]) => ({
      servico_uuid,
      geolocalizacao_ida: ponto,
      geolocalizacao_volta: ponto,
    })),
  };
}

function local(
  uuid: string,
  nome: string,
  municipio: string,
  geoloc: { latitude: number; longitude: number } | undefined = { latitude: 1, longitude: 1 },
  sentidos: readonly ("ida" | "volta")[] = ["ida", "volta"],
): Local {
  return {
    uuid,
    nome,
    municipio,
    ...(geoloc && sentidos.includes("ida") ? { geolocalizacao_ida: geoloc } : {}),
    ...(geoloc && sentidos.includes("volta") ? { geolocalizacao_volta: geoloc } : {}),
  };
}

function parada(ordem: number, ref: { secao?: string; local?: string }): Parada {
  return ref.secao !== undefined
    ? { ordem, secao_uuid: ref.secao }
    : { ordem, local_uuid: ref.local as string };
}

function itinerario(
  sentido: "ida" | "volta",
  paradas: Parada[],
): Pick<Itinerario, "sentido" | "paradas"> {
  return { sentido, paradas };
}

const SECAO_A = "11111111-0000-4000-8000-000000000001";
const SECAO_B = "22222222-0000-4000-8000-000000000002";
const SECAO_C = "33333333-0000-4000-8000-000000000003";
const LOCAL_X = "44444444-0000-4000-8000-000000000004";
const LOCAL_Y = "55555555-0000-4000-8000-000000000005";

describe("numerarItinerario — casos válidos (DEC-105)", () => {
  test("Seção A, Local X, Local Y, Seção B, Seção C: quadrados 1º/2º/3º e círculos 1.1/1.2; legenda só com A, B, C", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A"), secao(SECAO_B, "Cidade B", "Seção B"), secao(SECAO_C, "Cidade C", "Seção C")];
    const locais = [local(LOCAL_X, "Local X", "Cidade A"), local(LOCAL_Y, "Local Y", "Cidade A")];
    const it = itinerario("ida", [
      parada(1, { secao: SECAO_A }),
      parada(2, { local: LOCAL_X }),
      parada(3, { local: LOCAL_Y }),
      parada(4, { secao: SECAO_B }),
      parada(5, { secao: SECAO_C }),
    ]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, locais);

    expect(resultado.simbolos.map((s) => [s.tipo, s.rotulo])).toEqual([
      ["secao", "1º"],
      ["local", "1.1"],
      ["local", "1.2"],
      ["secao", "2º"],
      ["secao", "3º"],
    ]);
    expect(resultado.legendaSecoes).toEqual([
      { rotulo: "1º", nome: "Cidade A - Seção A" },
      { rotulo: "2º", nome: "Cidade B - Seção B" },
      { rotulo: "3º", nome: "Cidade C - Seção C" },
    ]);
    expect(resultado.identificadoresLocais).toEqual([
      { localUuid: LOCAL_X, identificador: "1.1" },
      { localUuid: LOCAL_Y, identificador: "1.2" },
    ]);
  });

  test("Volta com 4 Seções do mesmo Serviço recomeça em 1º — série independente da Ida", () => {
    const SECAO_D = "66666666-0000-4000-8000-000000000006";
    const secoes = [
      secao(SECAO_A, "Cidade A", "Seção A"),
      secao(SECAO_B, "Cidade B", "Seção B"),
      secao(SECAO_C, "Cidade C", "Seção C"),
      secao(SECAO_D, "Cidade D", "Seção D"),
    ];
    const volta = itinerario("volta", [
      parada(1, { secao: SECAO_D }),
      parada(2, { secao: SECAO_C }),
      parada(3, { secao: SECAO_B }),
      parada(4, { secao: SECAO_A }),
    ]);

    const resultado = numerarItinerario(volta, SERVICO_UUID, secoes, []);

    expect(resultado.legendaSecoes.map((s) => s.rotulo)).toEqual(["1º", "2º", "3º", "4º"]);
    expect(resultado.legendaSecoes[0].nome).toBe("Cidade D - Seção D");
  });

  test("itinerário sem nenhum Local: só quadrados, nenhuma série n.m criada", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A"), secao(SECAO_B, "Cidade B", "Seção B")];
    const it = itinerario("ida", [parada(1, { secao: SECAO_A }), parada(2, { secao: SECAO_B })]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, []);

    expect(resultado.simbolos.every((s) => s.tipo === "secao")).toBe(true);
    expect(resultado.identificadoresLocais).toEqual([]);
  });

  test("Seção reutilizada por dois Serviços com pontos distintos: cada Serviço lê o SEU ponto do SEU sentido (Spec 02 §5.1)", () => {
    const pontoServicoA = { latitude: 10, longitude: 10 };
    const pontoServicoB = { latitude: 20, longitude: 20 };
    const secaoCompartilhada = secao(SECAO_A, "Cidade A", "Seção A", {
      [SERVICO_UUID]: pontoServicoA,
      [OUTRO_SERVICO_UUID]: pontoServicoB,
    });
    const secaoFinal = secao(SECAO_B, "Cidade B", "Seção B", {
      [SERVICO_UUID]: { latitude: 0, longitude: 0 },
      [OUTRO_SERVICO_UUID]: { latitude: 0, longitude: 0 },
    });
    const it = itinerario("ida", [parada(1, { secao: SECAO_A }), parada(2, { secao: SECAO_B })]);

    const doServicoA = numerarItinerario(it, SERVICO_UUID, [secaoCompartilhada, secaoFinal], []);
    const doServicoB = numerarItinerario(it, OUTRO_SERVICO_UUID, [secaoCompartilhada, secaoFinal], []);

    expect(doServicoA.simbolos[0]).toMatchObject(pontoServicoA);
    expect(doServicoB.simbolos[0]).toMatchObject(pontoServicoB);
  });

  test("ordenação usa paradas[].ordem, não a ordem do array", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A"), secao(SECAO_B, "Cidade B", "Seção B")];
    const it = itinerario("ida", [parada(2, { secao: SECAO_B }), parada(1, { secao: SECAO_A })]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, []);

    expect(resultado.legendaSecoes.map((s) => s.nome)).toEqual([
      "Cidade A - Seção A",
      "Cidade B - Seção B",
    ]);
  });
});

describe("numerarItinerario — casos inválidos", () => {
  test("parada apontando secao_uuid inexistente: ignorada, sem quebrar a numeração das demais", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A")];
    const it = itinerario("ida", [
      parada(1, { secao: SECAO_A }),
      parada(2, { secao: "99999999-0000-4000-8000-000000000099" }),
      parada(3, { secao: SECAO_A }),
    ]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, []);

    expect(resultado.legendaSecoes.map((s) => s.rotulo)).toEqual(["1º", "2º"]);
  });

  test("parada apontando local_uuid inexistente: ignorada, sem quebrar a numeração", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A"), secao(SECAO_B, "Cidade B", "Seção B")];
    const it = itinerario("ida", [
      parada(1, { secao: SECAO_A }),
      parada(2, { local: "99999999-0000-4000-8000-000000000099" }),
      parada(3, { secao: SECAO_B }),
    ]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, []);

    expect(resultado.identificadoresLocais).toEqual([]);
    expect(resultado.legendaSecoes.map((s) => s.rotulo)).toEqual(["1º", "2º"]);
  });

  test("Local sem geolocalização do sentido em edição: não é desenhado, e o identificador não passa para o próximo Local", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A")];
    const semGeolocVolta = local(LOCAL_X, "Local X", "Cidade A", { latitude: 1, longitude: 1 }, ["ida"]);
    const comGeoloc = local(LOCAL_Y, "Local Y", "Cidade A");
    const it = itinerario("volta", [
      parada(1, { secao: SECAO_A }),
      parada(2, { local: LOCAL_X }), // só tem geolocalizacao_ida — inválido para a Volta
      parada(3, { local: LOCAL_Y }),
    ]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, [semGeolocVolta, comGeoloc]);

    expect(resultado.identificadoresLocais).toEqual([
      { localUuid: LOCAL_Y, identificador: "1.1" },
    ]);
  });

  test("itinerário sem paradas: listas vazias, sem exceção", () => {
    const it = itinerario("ida", []);

    expect(() => numerarItinerario(it, SERVICO_UUID, [], [])).not.toThrow();
    const resultado = numerarItinerario(it, SERVICO_UUID, [], []);
    expect(resultado).toEqual({ simbolos: [], legendaSecoes: [], identificadoresLocais: [] });
  });

  test("Local antes da primeira Seção (RN-035 violada em documento importado): sem prefixo inventado, nunca 0.1", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A")];
    const it = itinerario("ida", [
      parada(1, { local: LOCAL_X }),
      parada(2, { secao: SECAO_A }),
    ]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, [local(LOCAL_X, "Local X", "Cidade A")]);

    expect(resultado.simbolos[0].tipo).toBe("local");
    expect(resultado.simbolos[0].rotulo).toBeUndefined();
    expect(resultado.identificadoresLocais).toEqual([]);
  });

  test("numeração nunca mistura Seção e Local numa série contínua (DEC-105)", () => {
    const secoes = [secao(SECAO_A, "Cidade A", "Seção A"), secao(SECAO_B, "Cidade B", "Seção B")];
    const it = itinerario("ida", [
      parada(1, { secao: SECAO_A }),
      parada(2, { local: LOCAL_X }),
      parada(3, { secao: SECAO_B }),
    ]);

    const resultado = numerarItinerario(it, SERVICO_UUID, secoes, [local(LOCAL_X, "Local X", "Cidade A")]);

    // A Seção B é "2º" — o Local intermediário não consumiu um número de Seção.
    expect(resultado.legendaSecoes[1].rotulo).toBe("2º");
  });
});
