import { describe, expect, test } from "vitest";
import {
  conjuntoSecoesConsistente,
  inserirParada,
  paradaDeLocal,
  paradaDeSecao,
  paradasEmEdicaoDeContrato,
  paradasParaContrato,
  removerParada,
  removerParadasDeLocal,
  reordenarParada,
  resolverParadasRota,
  validarMontagem,
  type ParadaEmEdicao,
} from "@/formulario/itinerarios";
import type { Local, Secao } from "@/shared/contrato";

// TASK-019 — motor puro de montagem do itinerário (Spec 04 §7.3; RN-030,
// RN-033..036, RN-038). XOR (RN-033) é garantido por construção do union
// discriminado `ParadaEmEdicao`; aqui testam-se as operações de array e as
// validações que dependem do itinerário inteiro.

const SECAO_A: Secao = {
  uuid: "11111111-1111-4111-8111-111111111111",
  municipio: "Santos",
  nome: "Terminal A",
  servicos: [
    {
      servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      geolocalizacao_ida: { latitude: -23.96, longitude: -46.33 },
      geolocalizacao_volta: { latitude: -23.961, longitude: -46.331 },
    },
  ],
};

const SECAO_B: Secao = {
  uuid: "22222222-2222-4222-8222-222222222222",
  municipio: "São Vicente",
  nome: "Terminal B",
  servicos: [
    {
      servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      geolocalizacao_ida: { latitude: -23.963, longitude: -46.391 },
      // Sem geolocalizacao_volta — usada no caso RN-036 inválido.
    },
  ],
};

// Seção sem NENHUMA entrada para o Serviço corrente (RN-036 inválido).
const SECAO_SEM_CONTRIBUICAO: Secao = {
  uuid: "33333333-3333-4333-8333-333333333333",
  municipio: "Praia Grande",
  nome: "Terminal C",
  servicos: [],
};

const LOCAL_X: Local = {
  uuid: "44444444-4444-4444-8444-444444444444",
  municipio: "Santos",
  nome: "Ponto X",
  geolocalizacao_ida: { latitude: -23.97, longitude: -46.34 },
  geolocalizacao_volta: { latitude: -23.971, longitude: -46.341 },
};

const SERVICO_UUID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

describe("inserirParada / removerParada / reordenarParada — operações de array puras", () => {
  test("insere ao final por padrão (Spec 04 §7.3 item 2, 'insere em ordem')", () => {
    const paradas = inserirParada([paradaDeSecao(SECAO_A.uuid)], paradaDeSecao(SECAO_B.uuid));
    expect(paradas).toEqual([paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)]);
  });

  test("insere em posição específica sem mutar o array original", () => {
    const original = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const paradas = inserirParada(original, paradaDeLocal(LOCAL_X.uuid), 1);
    expect(paradas).toEqual([
      paradaDeSecao(SECAO_A.uuid),
      paradaDeLocal(LOCAL_X.uuid),
      paradaDeSecao(SECAO_B.uuid),
    ]);
    expect(original).toHaveLength(2); // não mutado
  });

  test("removerParada remove pelo índice sem mutar o array original", () => {
    const original = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_B.uuid)];
    const paradas = removerParada(original, 1);
    expect(paradas).toEqual([paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)]);
    expect(original).toHaveLength(3);
  });

  test("reordenarParada move a parada de uma posição para outra (tabela lateral, Spec 04 §7.3 item 3)", () => {
    const original = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_B.uuid)];
    const paradas = reordenarParada(original, 2, 0);
    expect(paradas).toEqual([paradaDeSecao(SECAO_B.uuid), paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid)]);
  });

  test("removerParadasDeLocal remove toda parada que referencia o Local (DEC-045)", () => {
    const original = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_B.uuid)];
    const paradas = removerParadasDeLocal(original, LOCAL_X.uuid);
    expect(paradas).toEqual([paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)]);
  });

  test("[inválido] removerParadasDeLocal não remove paradas de Seção nem de outro Local", () => {
    const outroLocal = "55555555-5555-4555-8555-555555555555";
    const original = [paradaDeLocal(LOCAL_X.uuid), paradaDeLocal(outroLocal), paradaDeSecao(SECAO_A.uuid)];
    const paradas = removerParadasDeLocal(original, LOCAL_X.uuid);
    expect(paradas).toEqual([paradaDeLocal(outroLocal), paradaDeSecao(SECAO_A.uuid)]);
  });
});

describe("paradasParaContrato / paradasEmEdicaoDeContrato — conversão com o contrato (RN-034)", () => {
  test("atribui ordem 1-based pela posição no array", () => {
    const paradas: ParadaEmEdicao[] = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_B.uuid)];
    expect(paradasParaContrato(paradas)).toEqual([
      { ordem: 1, secao_uuid: SECAO_A.uuid },
      { ordem: 2, local_uuid: LOCAL_X.uuid },
      { ordem: 3, secao_uuid: SECAO_B.uuid },
    ]);
  });

  test("é a conversão inversa de paradasEmEdicaoDeContrato, reordenando por 'ordem'", () => {
    const doContrato = [
      { ordem: 2, local_uuid: LOCAL_X.uuid },
      { ordem: 1, secao_uuid: SECAO_A.uuid },
    ];
    expect(paradasEmEdicaoDeContrato(doContrato)).toEqual([
      paradaDeSecao(SECAO_A.uuid),
      paradaDeLocal(LOCAL_X.uuid),
    ]);
  });
});

describe("validarMontagem — RN-034/035/036", () => {
  test("itinerário válido (≥2 paradas, extremos Seção, geoloc do sentido presente) não tem violação", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    expect(validarMontagem(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "ida")).toEqual([]);
  });

  test("[inválido] menos de 2 paradas viola RN-034", () => {
    const violacoes = validarMontagem([paradaDeSecao(SECAO_A.uuid)], [SECAO_A], [], SERVICO_UUID, "ida");
    expect(violacoes.some((v) => v.codigo === "RN-034")).toBe(true);
  });

  test("[inválido] Local no início viola RN-035 (extremos sempre Seção)", () => {
    const paradas = [paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_A.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A], [LOCAL_X], SERVICO_UUID, "ida");
    expect(violacoes.some((v) => v.codigo === "RN-035")).toBe(true);
  });

  test("[inválido] Local no final viola RN-035 (extremos sempre Seção)", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A], [LOCAL_X], SERVICO_UUID, "ida");
    expect(violacoes.some((v) => v.codigo === "RN-035")).toBe(true);
  });

  test("[inválido] Seção sem geolocalização do sentido para este Serviço viola RN-036", () => {
    // SECAO_B não tem geolocalizacao_volta.
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "volta");
    expect(violacoes.some((v) => v.codigo === "RN-036")).toBe(true);
  });

  test("[inválido] Seção sem NENHUMA entrada para o Serviço corrente viola RN-036", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_SEM_CONTRIBUICAO.uuid)];
    const violacoes = validarMontagem(
      paradas,
      [SECAO_A, SECAO_SEM_CONTRIBUICAO],
      [],
      SERVICO_UUID,
      "ida",
    );
    expect(violacoes.some((v) => v.codigo === "RN-036")).toBe(true);
  });

  test("[inválido] Local sem geolocalização do sentido viola RN-036", () => {
    const localSoIda: Local = { ...LOCAL_X, geolocalizacao_volta: undefined };
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(localSoIda.uuid), paradaDeSecao(SECAO_B.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A, SECAO_B], [localSoIda], SERVICO_UUID, "volta");
    expect(violacoes.some((v) => v.codigo === "RN-036")).toBe(true);
  });
});

describe("conjuntoSecoesConsistente — RN-030 (DEC-047)", () => {
  test("mesmo conjunto de Seções em ordens diferentes é consistente", () => {
    const ida = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const volta = [paradaDeSecao(SECAO_B.uuid), paradaDeSecao(SECAO_A.uuid)];
    expect(conjuntoSecoesConsistente(ida, volta)).toBe(true);
  });

  test("Locais podem divergir livremente entre Ida e Volta sem afetar a consistência", () => {
    const ida = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_B.uuid)];
    const volta = [paradaDeSecao(SECAO_B.uuid), paradaDeSecao(SECAO_A.uuid)];
    expect(conjuntoSecoesConsistente(ida, volta)).toBe(true);
  });

  test("[inválido] conjuntos de Seções diferentes não são consistentes", () => {
    const ida = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const volta = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_SEM_CONTRIBUICAO.uuid)];
    expect(conjuntoSecoesConsistente(ida, volta)).toBe(false);
  });

  test("Serviço unidirecional (um lado ausente) não é divergência (RN-038)", () => {
    const ida = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    expect(conjuntoSecoesConsistente(ida, undefined)).toBe(true);
    expect(conjuntoSecoesConsistente(undefined, undefined)).toBe(true);
  });
});

describe("resolverParadasRota — resolve para ParadaRota[] (insumo de recalcularItinerario/comporDescricao)", () => {
  test("Seção resolve com o marco (secao.uuid/rotulo — RN-044) e Ponto do sentido", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const resultado = resolverParadasRota(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "ida");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok");
    expect(resultado.paradas).toEqual([
      { latitude: -23.96, longitude: -46.33, secao: { uuid: SECAO_A.uuid, rotulo: "Santos - Terminal A" } },
      { latitude: -23.963, longitude: -46.391, secao: { uuid: SECAO_B.uuid, rotulo: "São Vicente - Terminal B" } },
    ]);
  });

  test("Local resolve SEM marco de Seção (§3.7.3 — Locais nunca entram na descrição)", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_A.uuid)];
    // Usa SECAO_A nos dois extremos só para simplificar o exemplo — o motor não
    // proíbe Seção repetida (isso é comportamento de itinerário circular, fora
    // do escopo desta checagem específica).
    const resultado = resolverParadasRota(paradas, [SECAO_A], [LOCAL_X], SERVICO_UUID, "ida");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok");
    expect(resultado.paradas[1]).toEqual({ latitude: -23.97, longitude: -46.34 });
    expect("secao" in resultado.paradas[1]).toBe(false);
  });

  test("[inválido] itinerário incompleto devolve as violações, sem resolver paradas (não chama OSRM)", () => {
    const resultado = resolverParadasRota(
      [paradaDeSecao(SECAO_A.uuid)],
      [SECAO_A],
      [],
      SERVICO_UUID,
      "ida",
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("esperava violação");
    expect(resultado.violacoes.some((v) => v.codigo === "RN-034")).toBe(true);
  });
});
