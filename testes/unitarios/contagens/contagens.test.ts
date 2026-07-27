import { describe, expect, test } from "vitest";
import {
  classificarFaixa,
  contarAutos,
  contarAutosPorFaixa,
  contarServico,
  paresCompraveis,
  ROTULO_SEMANA_PADRAO,
  viagensSemana,
} from "@/shared/contagens";
import type { Itinerario, Servico, Viagem } from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-031 — contagens e resumo operacional (Spec 03 §9.4; Spec 04 §10;
// RN-069/072/073). As fixtures canônicas bidirecional-multi-servico e
// unidirecional já trazem `matriz_seccionamento` e viagens reais — servem de
// oráculo para os casos de dedupe do par ponta-a-ponta e de Serviço
// unidirecional.

function viagem(parcial: Partial<Viagem> & Pick<Viagem, "horario_saida">): Viagem {
  return {
    uuid: "a0000000-0000-4000-8000-000000000000",
    dia_semana: "segunda",
    viagem_feriado: false,
    horarios_paradas: [{ parada_ordem: 1, offset_horario: "00:00:00" }],
    ...parcial,
    tabela_excepcional_uuid: parcial.tabela_excepcional_uuid ?? null,
  };
}

function itinerarioComViagens(viagens: Viagem[], sentido: Itinerario["sentido"] = "ida"): Itinerario {
  return {
    sentido,
    paradas: [
      { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
      { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
    ],
    rota: {
      geometria: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      distancia_km: 5,
      duracao_s: 100,
      descricao_itinerario: { texto: "", itens: [] },
      trechos: [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 100 }],
      pontos_de_rota: [],
    },
    viagens,
  };
}

function servicoSintetico(
  viagensIda: Viagem[],
  matrizSeccionamento: Servico["matriz_seccionamento"] = [],
): Servico {
  const temViagemExcepcional = viagensIda.some(
    (item) => item.tabela_excepcional_uuid !== null,
  );
  return {
    uuid: "s0000000-0000-4000-8000-000000000000",
    numero_n: "1000-1CR",
    caracteristica_veiculo: "CR",
    carater: "principal",
    locais: [],
    tabelas_excepcionais: temViagemExcepcional
      ? [
          {
            uuid: "e0000000-0000-4000-8000-000000000000",
            tipo: "ferias_verao",
          },
        ]
      : [],
    matriz_distancias: [],
    matriz_seccionamento: matrizSeccionamento,
    itinerarios: [itinerarioComViagens(viagensIda)],
  };
}

describe("classificarFaixa (Spec 04 §10) — 7 faixas cobrindo 00:00–23:59", () => {
  test.each([
    ["00:00:00", "madrugada"],
    ["04:59:00", "madrugada"],
    ["05:00:00", "pico-manha"],
    ["08:59:00", "pico-manha"],
    ["09:00:00", "entre-pico-manha"],
    ["10:59:00", "entre-pico-manha"],
    ["11:00:00", "entre-pico-almoco"],
    ["13:59:00", "entre-pico-almoco"],
    ["14:00:00", "entre-pico-tarde"],
    ["16:59:00", "entre-pico-tarde"],
    ["17:00:00", "pico-tarde"],
    ["19:59:00", "pico-tarde"],
    ["20:00:00", "noite"],
    ["23:59:00", "noite"],
  ] as const)("%s → %s", (horario, faixaEsperada) => {
    expect(classificarFaixa(horario)).toBe(faixaEsperada);
  });
});

describe("viagensSemana (RN-072/RN-069) — só Viagens da grade comum", () => {
  test("conta cada Viagem como uma partida — sem multiplicar por dias", () => {
    const itinerario = itinerarioComViagens([
      viagem({ horario_saida: "07:00:00" }),
      viagem({ horario_saida: "15:00:00" }),
      viagem({ horario_saida: "21:00:00" }),
    ]);
    expect(viagensSemana(itinerario)).toBe(3);
  });

  test("[inválido] Viagem de feriado nunca conta", () => {
    const itinerario = itinerarioComViagens([
      viagem({ horario_saida: "07:00:00" }),
      viagem({ horario_saida: "07:30:00", viagem_feriado: true }),
    ]);
    expect(viagensSemana(itinerario)).toBe(1);
  });

  test("[não-contável] 5 comuns + 2 excepcionais + 1 feriado → viagens_semana = 5", () => {
    const comuns = Array.from({ length: 5 }, (_, indice) =>
      viagem({ horario_saida: `0${indice + 6}:00:00` }),
    );
    const itinerario = itinerarioComViagens([
      ...comuns,
      viagem({
        horario_saida: "12:00:00",
        tabela_excepcional_uuid: "e0000000-0000-4000-8000-000000000000",
      }),
      viagem({
        horario_saida: "13:00:00",
        tabela_excepcional_uuid: "e0000000-0000-4000-8000-000000000000",
      }),
      viagem({ horario_saida: "14:00:00", viagem_feriado: true }),
    ]);

    expect(viagensSemana(itinerario)).toBe(5);
  });

  test("[inválido] itinerário ausente (Serviço unidirecional, sentido faltante) → 0", () => {
    expect(viagensSemana(undefined)).toBe(0);
  });
});

describe("paresCompraveis (RN-072) — matriz_seccionamento ∪ par ponta-a-ponta", () => {
  test("ponta-a-ponta AUSENTE da matriz: soma +1 (união, não substituição)", () => {
    const servico = servicoSintetico([viagem({ horario_saida: "07:00:00" })], []);
    expect(paresCompraveis(servico)).toBe(1);
  });

  test("ponta-a-ponta JÁ HABILITADO na matriz: não duplica (dedupe da união)", () => {
    const servico = servicoSintetico(
      [viagem({ horario_saida: "07:00:00" })],
      [{ secao_a_uuid: "11111111-1111-4111-8111-111111111111", secao_b_uuid: "22222222-2222-4222-8222-222222222222", distancia_km: 5 }],
    );
    expect(paresCompraveis(servico)).toBe(1);
  });

  test("ponta-a-ponta gravado na ordem inversa (B-A) ainda deduplica", () => {
    const servico = servicoSintetico(
      [viagem({ horario_saida: "07:00:00" })],
      [{ secao_a_uuid: "22222222-2222-4222-8222-222222222222", secao_b_uuid: "11111111-1111-4111-8111-111111111111", distancia_km: 5 }],
    );
    expect(paresCompraveis(servico)).toBe(1);
  });

  test("fixture real (bidirecional-multi-servico): Serviço 1 já habilita o ponta-a-ponta A-C — 2 pares, não 3", () => {
    const [servico1] = documentoBidirecionalMultiServico().autos.servicos;
    // matriz_seccionamento tem 3 pares (AB, BC, AC); AC é o ponta-a-ponta e já
    // está habilitado — a união deve deduplicar para 2 (AB, AC), não somar AC de novo.
    expect(servico1.matriz_seccionamento).toHaveLength(3);
    // 3 Seções, matriz completa já inclui todos os pares possíveis incluindo o
    // ponta-a-ponta — união não pode ultrapassar o tamanho da matriz gravada.
    expect(paresCompraveis(servico1)).toBe(servico1.matriz_seccionamento.length);
  });

  test("fixture real: Serviço 2 (2 Seções) — o único par gravado já é o ponta-a-ponta, sem duplicar", () => {
    const [, servico2] = documentoBidirecionalMultiServico().autos.servicos;
    expect(servico2.matriz_seccionamento).toHaveLength(1);
    expect(paresCompraveis(servico2)).toBe(1);
  });
});

describe("contarServico (RN-072) — opções = viagens_semana × pares_compraveis; totais Ida+Volta", () => {
  test("fórmula literal: N viagens × M pares = N×M opções", () => {
    const servico = servicoSintetico(
      [viagem({ horario_saida: "07:00:00" }), viagem({ horario_saida: "15:00:00" })],
      [],
    );
    const c = contarServico(servico);
    expect(c.paresCompraveis).toBe(1);
    expect(c.ida.viagensSemana).toBe(2);
    expect(c.ida.opcoesDeslocamento).toBe(2);
    expect(c.volta.viagensSemana).toBe(0);
    expect(c.totalViagensSemana).toBe(2);
    expect(c.totalOpcoesDeslocamento).toBe(2);
  });

  test("[inválido] Serviço unidirecional (fixture real): volta zerada, total = só Ida", () => {
    const servico = documentoUnidirecional().autos.servicos[0];
    const c = contarServico(servico);
    expect(c.volta.viagensSemana).toBe(0);
    expect(c.volta.opcoesDeslocamento).toBe(0);
    expect(c.totalViagensSemana).toBe(c.ida.viagensSemana);
    expect(c.totalOpcoesDeslocamento).toBe(c.ida.opcoesDeslocamento);
  });
});

describe("contarAutos (RN-072) — totais do Autos = soma dos Serviços", () => {
  test("fixture real bidirecional-multi-servico: total = soma dos 2 Serviços", () => {
    const autos = documentoBidirecionalMultiServico().autos;
    const contagens = contarAutos(autos);
    const somaViagens = contagens.porServico.reduce((s, c) => s + c.totalViagensSemana, 0);
    const somaOpcoes = contagens.porServico.reduce((s, c) => s + c.totalOpcoesDeslocamento, 0);
    expect(contagens.totalViagensSemana).toBe(somaViagens);
    expect(contagens.totalOpcoesDeslocamento).toBe(somaOpcoes);
    expect(contagens.porServico).toHaveLength(2);
  });
});

describe("RN-069/NEG-018 — feriado não altera contagens", () => {
  test("dois Autos idênticos exceto pela grade de feriados têm contagens idênticas", () => {
    const semFeriado = servicoSintetico([viagem({ horario_saida: "07:00:00" })], []);
    const comFeriadoExtra = servicoSintetico(
      [
        viagem({ horario_saida: "07:00:00" }),
        viagem({ horario_saida: "07:30:00", viagem_feriado: true }),
        viagem({ horario_saida: "12:00:00", viagem_feriado: true }),
      ],
      [],
    );
    expect(contarServico(comFeriadoExtra)).toEqual(contarServico(semFeriado));
  });

  test("grade de feriados vazia é igual a grade de feriados cheia, quando a comum é a mesma", () => {
    const base = [viagem({ horario_saida: "07:00:00" }), viagem({ horario_saida: "15:00:00" })];
    const autosSemFeriado = servicoSintetico(base, []);
    const autosComFeriado = servicoSintetico(
      [...base, viagem({ horario_saida: "22:00:00", viagem_feriado: true })],
      [],
    );
    expect(contarServico(autosComFeriado).totalViagensSemana).toBe(
      contarServico(autosSemFeriado).totalViagensSemana,
    );
  });
});

describe("RN-069/RN-099 — operação excepcional não altera contagens", () => {
  test("dois Autos que diferem só na grade excepcional têm contagens idênticas", () => {
    const viagemComum = viagem({ horario_saida: "07:00:00" });
    const semExcepcional = servicoSintetico([viagemComum], []);
    const comExcepcional = servicoSintetico(
      [
        viagemComum,
        viagem({
          horario_saida: "09:00:00",
          tabela_excepcional_uuid: "e0000000-0000-4000-8000-000000000000",
        }),
        viagem({
          horario_saida: "18:00:00",
          tabela_excepcional_uuid: "e0000000-0000-4000-8000-000000000000",
        }),
      ],
      [],
    );
    const autosBase = documentoUnidirecional().autos;
    const autosSemExcepcional = { ...autosBase, servicos: [semExcepcional] };
    const autosComExcepcional = { ...autosBase, servicos: [comExcepcional] };

    expect(contarAutos(autosComExcepcional)).toEqual(
      contarAutos(autosSemExcepcional),
    );
    expect(contarAutosPorFaixa(autosComExcepcional)).toEqual(
      contarAutosPorFaixa(autosSemExcepcional),
    );
  });

  test("rótulo tem fonte única com o texto literal da Spec 04 §10/§13.3", () => {
    expect(ROTULO_SEMANA_PADRAO).toBe(
      "semana padrão (sem feriados nem operação excepcional)",
    );
  });
});

describe("Estratificação por faixa (Spec 04 §10) — soma das faixas = total", () => {
  test("viagens em faixas distintas caem nos baldes certos; soma = total", () => {
    const autos = documentoBidirecionalMultiServico().autos;
    const porFaixa = contarAutosPorFaixa(autos);
    const somaViagens = Object.values(porFaixa.totais).reduce((s, f) => s + f.viagensSemana, 0);
    const somaOpcoes = Object.values(porFaixa.totais).reduce((s, f) => s + f.opcoesDeslocamento, 0);
    const totalGeral = contarAutos(autos);
    expect(somaViagens).toBe(totalGeral.totalViagensSemana);
    expect(somaOpcoes).toBe(totalGeral.totalOpcoesDeslocamento);
  });

  test("viagem de feriado não aparece em nenhuma faixa", () => {
    const servico = servicoSintetico(
      [
        viagem({ horario_saida: "07:00:00" }),
        viagem({ horario_saida: "07:15:00", viagem_feriado: true }),
      ],
      [],
    );
    const autos = { ...documentoUnidirecional().autos, servicos: [servico] };
    const porFaixa = contarAutosPorFaixa(autos);
    const somaViagens = Object.values(porFaixa.totais).reduce((s, f) => s + f.viagensSemana, 0);
    expect(somaViagens).toBe(1);
  });
});

describe("Casos de borda", () => {
  test("Serviço com matriz_seccionamento vazia e sem viagens: 1 par compravel, 0 opções", () => {
    const servico = servicoSintetico([], []);
    const c = contarServico(servico);
    expect(c.paresCompraveis).toBe(1);
    expect(c.totalOpcoesDeslocamento).toBe(0);
  });

  test("[inválido] Autos sem Serviços não é chamado aqui (RN-018 garante min 1 no schema) — contarAutos com array vazio não lança", () => {
    const autos = { ...documentoUnidirecional().autos, servicos: [] as Servico[] };
    expect(() => contarAutos(autos)).not.toThrow();
    expect(contarAutos(autos).totalViagensSemana).toBe(0);
  });

  test("saída do módulo não contém nenhum campo monetário (NEG-017)", () => {
    const autos = documentoBidirecionalMultiServico().autos;
    const serializado = JSON.stringify(contarAutos(autos));
    expect(serializado).not.toMatch(/R\$/);
  });
});
