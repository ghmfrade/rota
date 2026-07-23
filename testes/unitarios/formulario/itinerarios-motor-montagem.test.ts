import { describe, expect, test } from "vitest";
import {
  conjuntoSecoesConsistente,
  espelharGestoDeSecao,
  espelharInsercaoDeSecao,
  espelharMovimentoDeSecao,
  espelharRemocaoDeSecao,
  inserirParada,
  ocorrenciasLocaisEmExtremo,
  paradaDeLocal,
  paradaDeSecao,
  paradasEmEdicaoDeContrato,
  paradasParaContrato,
  removerParada,
  removerParadasDeLocal,
  reordenarParada,
  resolverParadasRota,
  subsequenciaSecoes,
  validarMontagem,
  type ParadaEmEdicao,
  type ViolacaoMontagem,
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

describe("ocorrenciasLocaisEmExtremo — RN-035/DEC-070", () => {
  test("lista válida não produz estado contextual", () => {
    expect(
      ocorrenciasLocaisEmExtremo([
        paradaDeSecao(SECAO_A.uuid),
        paradaDeLocal(LOCAL_X.uuid),
        paradaDeSecao(SECAO_B.uuid),
      ]),
    ).toEqual([]);
  });

  test("[inválido] identifica início e fim por ocorrência", () => {
    const outroLocal = "55555555-5555-4555-8555-555555555555";
    expect(
      ocorrenciasLocaisEmExtremo([
        paradaDeLocal(LOCAL_X.uuid),
        paradaDeSecao(SECAO_A.uuid),
        paradaDeLocal(outroLocal),
      ]),
    ).toEqual([
      { indice: 0, localUuid: LOCAL_X.uuid, posicoes: ["inicio"] },
      { indice: 2, localUuid: outroLocal, posicoes: ["fim"] },
    ]);
  });

  test("[inválido] um único Local é uma ocorrência nos dois extremos", () => {
    expect(ocorrenciasLocaisEmExtremo([paradaDeLocal(LOCAL_X.uuid)])).toEqual([
      { indice: 0, localUuid: LOCAL_X.uuid, posicoes: ["inicio", "fim"] },
    ]);
  });
});

describe("validarMontagem — RN-034/035/036", () => {
  test("itinerário válido (≥2 paradas, extremos Seção, geoloc do sentido presente) não tem violação", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    expect(validarMontagem(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "ida")).toEqual([]);
  });

  test("[inválido] menos de 2 paradas viola RN-034 com mensagem exibível ao usuário (TASK-047)", () => {
    const violacoes = validarMontagem([paradaDeSecao(SECAO_A.uuid)], [SECAO_A], [], SERVICO_UUID, "ida");
    const violacao = violacoes.find((v) => v.codigo === "RN-034");
    expect(violacao?.mensagem).toContain("ao menos 2 paradas");
  });

  test("[inválido] Local no início viola RN-035 (extremos sempre Seção) com mensagem exibível (TASK-047)", () => {
    const paradas = [paradaDeLocal(LOCAL_X.uuid), paradaDeSecao(SECAO_A.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A], [LOCAL_X], SERVICO_UUID, "ida");
    const violacao = violacoes.find((v) => v.codigo === "RN-035");
    expect(violacao?.mensagem).toContain("primeira parada");
  });

  test("[inválido] Local no final viola RN-035 (extremos sempre Seção) com mensagem exibível (TASK-047)", () => {
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(LOCAL_X.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A], [LOCAL_X], SERVICO_UUID, "ida");
    const violacao = violacoes.find((v) => v.codigo === "RN-035");
    expect(violacao?.mensagem).toContain("última parada");
  });

  test("[inválido] Seção sem geolocalização do sentido para este Serviço viola RN-036 com mensagem exibível (TASK-047)", () => {
    // SECAO_B não tem geolocalizacao_volta.
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const violacoes = validarMontagem(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "volta");
    const violacao = violacoes.find((v) => v.codigo === "RN-036");
    expect(violacao?.mensagem).toContain("geolocalização de Volta");
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

  test("[inválido] nenhuma mensagem de violação menciona tarifa/R$ (RN-049; TASK-047 as expõe na UI)", () => {
    const localSoIda: Local = { ...LOCAL_X, geolocalizacao_volta: undefined };
    const combinacoes: ViolacaoMontagem[] = [
      ...validarMontagem([paradaDeLocal(LOCAL_X.uuid)], [], [LOCAL_X], SERVICO_UUID, "ida"),
      ...validarMontagem(
        [paradaDeSecao(SECAO_A.uuid), paradaDeLocal(localSoIda.uuid), paradaDeSecao(SECAO_B.uuid)],
        [SECAO_A, SECAO_B],
        [localSoIda],
        SERVICO_UUID,
        "volta",
      ),
    ];
    expect(combinacoes.length).toBeGreaterThan(0);
    for (const violacao of combinacoes) {
      expect(violacao.mensagem).not.toMatch(/tarifa|R\$/i);
    }
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

// Espelhamento Ida↔Volta por gesto atômico de Seção (TASK-077; DEC-063/071).
// Letras (A-E) = Seções; números (1-4) = Locais — mesma notação da DEC-071.
const S_A = "a0000000-0000-4000-8000-000000000001";
const S_B = "a0000000-0000-4000-8000-000000000002";
const S_C = "a0000000-0000-4000-8000-000000000003";
const S_D = "a0000000-0000-4000-8000-000000000004";
const S_E = "a0000000-0000-4000-8000-000000000005";
const S_X = "a0000000-0000-4000-8000-000000000009";
const L_1 = "b0000000-0000-4000-8000-000000000001";
const L_2 = "b0000000-0000-4000-8000-000000000002";
const L_3 = "b0000000-0000-4000-8000-000000000003";
const L_4 = "b0000000-0000-4000-8000-000000000004";

describe("subsequenciaSecoes — insumo do espelho e da RN-030 (ordem inversa)", () => {
  test("extrai só as Seções, na ordem em que aparecem, ignorando Locais", () => {
    const paradas = [
      paradaDeSecao(S_A),
      paradaDeLocal(L_1),
      paradaDeSecao(S_B),
      paradaDeSecao(S_C),
    ];
    expect(subsequenciaSecoes(paradas)).toEqual([S_A, S_B, S_C]);
  });
});

describe("espelharInsercaoDeSecao — DEC-071 (Q-050, opção A)", () => {
  test("exemplo da DEC-071: Ida A-B → A-X-B; Volta B-1-2-A → B-X-1-2-A", () => {
    const idaDepois = [paradaDeSecao(S_A), paradaDeSecao(S_X), paradaDeSecao(S_B)];
    const volta = [paradaDeSecao(S_B), paradaDeLocal(L_1), paradaDeLocal(L_2), paradaDeSecao(S_A)];
    const resultado = espelharInsercaoDeSecao(volta, S_X, idaDepois);
    expect(resultado).toEqual([
      paradaDeSecao(S_B),
      paradaDeSecao(S_X),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeSecao(S_A),
    ]);
  });

  test("inserção no NOVO ÚLTIMO extremo do sentido editado vira o novo PRIMEIRO extremo do alvo", () => {
    // Ida A-B passa a A-B-X (X é o novo último extremo da Ida); X não tem
    // sucessora na Ida ⇒ na Volta (inverso), X é o novo PRIMEIRO extremo.
    const idaDepois = [paradaDeSecao(S_A), paradaDeSecao(S_B), paradaDeSecao(S_X)];
    const volta = [paradaDeSecao(S_B), paradaDeSecao(S_A)];
    const resultado = espelharInsercaoDeSecao(volta, S_X, idaDepois);
    expect(resultado).toEqual([paradaDeSecao(S_X), paradaDeSecao(S_B), paradaDeSecao(S_A)]);
  });

  test("não muta a lista alvo original", () => {
    const idaDepois = [paradaDeSecao(S_A), paradaDeSecao(S_X), paradaDeSecao(S_B)];
    const volta = [paradaDeSecao(S_B), paradaDeSecao(S_A)];
    espelharInsercaoDeSecao(volta, S_X, idaDepois);
    expect(volta).toEqual([paradaDeSecao(S_B), paradaDeSecao(S_A)]);
  });
});

describe("espelharRemocaoDeSecao — DEC-071", () => {
  test("elimina somente a ocorrência correspondente, sem reposicionar mais nada", () => {
    const volta = [
      paradaDeSecao(S_C),
      paradaDeLocal(L_1),
      paradaDeSecao(S_B),
      paradaDeLocal(L_2),
      paradaDeSecao(S_A),
    ];
    const resultado = espelharRemocaoDeSecao(volta, S_B);
    expect(resultado).toEqual([
      paradaDeSecao(S_C),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeSecao(S_A),
    ]);
  });

  test("[inválido] remoção pode deixar um Local no extremo do alvo — a função não corrige, só remove (DEC-070 cuida do estado)", () => {
    const volta = [paradaDeLocal(L_1), paradaDeSecao(S_B), paradaDeSecao(S_A)];
    const resultado = espelharRemocaoDeSecao(volta, S_B);
    expect(resultado).toEqual([paradaDeLocal(L_1), paradaDeSecao(S_A)]);
    expect(ocorrenciasLocaisEmExtremo(resultado)).toEqual([
      { indice: 0, localUuid: L_1, posicoes: ["inicio"] },
    ]);
  });
});

describe("espelharMovimentoDeSecao — DEC-071 (replay do gesto, nunca diff da sequência final)", () => {
  test("exemplo da DEC-071: mover D antes de C (Ida A-B-C-D-E → A-B-D-C-E) produz Volta E-1-2-C-D-3-B-4-A", () => {
    const idaDepois = [
      paradaDeSecao(S_A),
      paradaDeSecao(S_B),
      paradaDeSecao(S_D),
      paradaDeSecao(S_C),
      paradaDeSecao(S_E),
    ];
    const voltaAntes = [
      paradaDeSecao(S_E),
      paradaDeSecao(S_D),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeSecao(S_C),
      paradaDeLocal(L_3),
      paradaDeSecao(S_B),
      paradaDeLocal(L_4),
      paradaDeSecao(S_A),
    ];
    const resultado = espelharMovimentoDeSecao(voltaAntes, S_D, idaDepois);
    expect(resultado).toEqual([
      paradaDeSecao(S_E),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeSecao(S_C),
      paradaDeSecao(S_D),
      paradaDeLocal(L_3),
      paradaDeSecao(S_B),
      paradaDeLocal(L_4),
      paradaDeSecao(S_A),
    ]);
  });

  test("exemplo da DEC-071 (movimentos atômicos sucessivos até A-D-C-B-E) produz Volta E-1-2-3-B-C-D-4-A", () => {
    // O gesto da UI só move UMA Seção por vez (troca adjacente — `moverParada`
    // na etapa). "Movimentos sucessivos" da DEC-071 é uma SEQUÊNCIA de gestos
    // atômicos, nunca um "salto" — replay de cada um, em ordem:
    //   1) D antes de C: A-B-C-D-E → A-B-D-C-E (já coberto no teste acima)
    //   2) D antes de B: A-B-D-C-E → A-D-B-C-E
    //   3) C antes de B: A-D-B-C-E → A-D-C-B-E
    const voltaAposPasso1 = [
      paradaDeSecao(S_E),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeSecao(S_C),
      paradaDeSecao(S_D),
      paradaDeLocal(L_3),
      paradaDeSecao(S_B),
      paradaDeLocal(L_4),
      paradaDeSecao(S_A),
    ];

    const idaAposPasso2 = [
      paradaDeSecao(S_A),
      paradaDeSecao(S_D),
      paradaDeSecao(S_B),
      paradaDeSecao(S_C),
      paradaDeSecao(S_E),
    ];
    const voltaAposPasso2 = espelharMovimentoDeSecao(voltaAposPasso1, S_D, idaAposPasso2);
    expect(voltaAposPasso2).toEqual([
      paradaDeSecao(S_E),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeSecao(S_C),
      paradaDeLocal(L_3),
      paradaDeSecao(S_B),
      paradaDeSecao(S_D),
      paradaDeLocal(L_4),
      paradaDeSecao(S_A),
    ]);

    const idaAposPasso3 = [
      paradaDeSecao(S_A),
      paradaDeSecao(S_D),
      paradaDeSecao(S_C),
      paradaDeSecao(S_B),
      paradaDeSecao(S_E),
    ];
    const voltaAposPasso3 = espelharMovimentoDeSecao(voltaAposPasso2, S_C, idaAposPasso3);
    expect(voltaAposPasso3).toEqual([
      paradaDeSecao(S_E),
      paradaDeLocal(L_1),
      paradaDeLocal(L_2),
      paradaDeLocal(L_3),
      paradaDeSecao(S_B),
      paradaDeSecao(S_C),
      paradaDeSecao(S_D),
      paradaDeLocal(L_4),
      paradaDeSecao(S_A),
    ]);
  });

  test("não muta a lista alvo original", () => {
    const idaDepois = [paradaDeSecao(S_A), paradaDeSecao(S_C), paradaDeSecao(S_B)];
    const voltaAntes = [paradaDeSecao(S_B), paradaDeSecao(S_C), paradaDeSecao(S_A)];
    const copia = [...voltaAntes];
    espelharMovimentoDeSecao(voltaAntes, S_C, idaDepois);
    expect(voltaAntes).toEqual(copia);
  });
});

describe("espelharGestoDeSecao — despacho único usado pela etapa", () => {
  test("gesto de inserção delega para espelharInsercaoDeSecao", () => {
    const idaDepois = [paradaDeSecao(S_A), paradaDeSecao(S_X), paradaDeSecao(S_B)];
    const volta = [paradaDeSecao(S_B), paradaDeSecao(S_A)];
    expect(espelharGestoDeSecao(volta, { tipo: "insercao", secaoUuid: S_X }, idaDepois)).toEqual(
      espelharInsercaoDeSecao(volta, S_X, idaDepois),
    );
  });

  test("gesto de remoção delega para espelharRemocaoDeSecao", () => {
    const volta = [paradaDeSecao(S_B), paradaDeSecao(S_A)];
    expect(espelharGestoDeSecao(volta, { tipo: "remocao", secaoUuid: S_B }, volta)).toEqual(
      espelharRemocaoDeSecao(volta, S_B),
    );
  });

  test("gesto de movimento delega para espelharMovimentoDeSecao", () => {
    const idaDepois = [paradaDeSecao(S_A), paradaDeSecao(S_C), paradaDeSecao(S_B)];
    const volta = [paradaDeSecao(S_B), paradaDeSecao(S_C), paradaDeSecao(S_A)];
    expect(espelharGestoDeSecao(volta, { tipo: "movimento", secaoUuid: S_C }, idaDepois)).toEqual(
      espelharMovimentoDeSecao(volta, S_C, idaDepois),
    );
  });
});
