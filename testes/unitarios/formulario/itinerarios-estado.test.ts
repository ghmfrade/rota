import { describe, expect, test, vi } from "vitest";
import {
  chaveItinerario,
  chaveParadaEmEdicao,
  dispararRecalculo,
  itinerariosAoVivoDaSessao,
  paradasParaContrato,
  pontosDeRotaDoItinerario,
  reconciliarHorariosAposMudancaItinerario,
} from "@/formulario/itinerarios";
import { paradaDeSecao } from "@/formulario/itinerarios";
import { reancorarPontosDeRota } from "@/formulario/roteamento";
import {
  esquemaDocumentoOperacao,
  esquemaRota,
  type DescricaoItinerario,
  type Itinerario,
} from "@/shared/contrato";
import type { PontoDeRota, Secao } from "@/shared/contrato";
import type { SessaoFormulario } from "@/formulario/sessao";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-019 — fiação do estado de rota ao vivo por itinerário: `dispararRecalculo`
// resolve as paradas em edição e injeta o `comporDescricao` REAL (não mock,
// sem placeholder — DEC-046); `itinerariosAoVivoDaSessao` monta o
// `ItinerarioAoVivo[]` (TASK-044) para TODA a sessão, fechando o fio da
// "obrigação de fiação" registrada em docs-dev/06.

const SECAO_A: Secao = {
  uuid: "11111111-1111-4111-8111-111111111111",
  municipio: "Santos",
  nome: "Terminal A",
  servicos: [
    {
      servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      geolocalizacao_ida: { latitude: -23.96, longitude: -46.33 },
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
    },
  ],
};
const SECAO_C: Secao = {
  uuid: "33333333-3333-4333-8333-333333333333",
  municipio: "Praia Grande",
  nome: "Terminal C",
  servicos: [
    {
      servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      geolocalizacao_ida: { latitude: -24.0, longitude: -46.4 },
    },
  ],
};
const SERVICO_UUID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

function respostaFetchMock(corpo: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(corpo) }) as unknown as typeof fetch;
}

describe("chaveItinerario", () => {
  test("combina servicoUuid e sentido de forma estável", () => {
    expect(chaveItinerario("abc", "ida")).toBe("abc-ida");
    expect(chaveItinerario("abc", "ida")).toBe(chaveItinerario("abc", "ida"));
    expect(chaveItinerario("abc", "ida")).not.toBe(chaveItinerario("abc", "volta"));
  });
});

describe("pontosDeRotaDoItinerario — TASK-071/DEC-058, fonte de sessão sobre o eco congelado", () => {
  test("entrada na sessão (pontosDeRotaEmEdicao) tem prioridade sobre o eco do documento", () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const itinerario = servico.itinerarios[0];
    const chave = chaveItinerario(servico.uuid, itinerario.sentido);
    const pontoDaSessao = { apos_parada_ordem: 2, latitude: -1, longitude: -2 };

    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      pontosDeRotaEmEdicao: { [chave]: [pontoDaSessao] },
    };

    expect(pontosDeRotaDoItinerario(sessao, servico.uuid, itinerario.sentido)).toEqual([pontoDaSessao]);
  });

  test("sem entrada na sessão, cai no eco `rota.pontos_de_rota` do itinerário carregado (reedição fiel, sem OSRM)", () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const itinerario = servico.itinerarios[0];

    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    expect(pontosDeRotaDoItinerario(sessao, servico.uuid, itinerario.sentido)).toEqual(
      itinerario.rota.pontos_de_rota,
    );
  });

  test("[inválido] entrada da sessão como lista VAZIA (pontos removidos) prevalece — não recai no eco do documento", () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const itinerario = servico.itinerarios[0];
    const chave = chaveItinerario(servico.uuid, itinerario.sentido);

    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      pontosDeRotaEmEdicao: { [chave]: [] },
    };

    expect(pontosDeRotaDoItinerario(sessao, servico.uuid, itinerario.sentido)).toEqual([]);
  });

  test("[inválido] Serviço/sentido inexistente, sem sessão nem documento → lista vazia, sem exceção", () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    expect(pontosDeRotaDoItinerario(sessao, "uuid-inexistente", "ida")).toEqual([]);
  });
});

describe("dispararRecalculo — injeta o comporDescricao REAL (DEC-046), OSRM mockado", () => {
  test("sucesso: rota schema-válida com descricao_itinerario composta a partir das Seções e steps do OSRM", async () => {
    const envelope = {
      code: "Ok",
      routes: [
        {
          geometry: { type: "LineString", coordinates: [[-46.33, -23.96], [-46.391, -23.963]] },
          legs: [{ distance: 1000, duration: 60, steps: [{ name: "Rua Treta" }] }],
        },
      ],
    };
    const fetchFn = respostaFetchMock(envelope);
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];

    const resultado = await dispararRecalculo(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "ida", [], {
      fetchFn,
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok");
    expect(resultado.estado.situacao).toBe("recalculada");
    if (resultado.estado.situacao !== "recalculada") throw new Error("esperava recalculada");
    expect(esquemaRota.safeParse(resultado.estado.rota).success).toBe(true);
    const descricao: DescricaoItinerario = resultado.estado.rota.descricao_itinerario;
    expect(descricao.texto).toBe("Santos - Terminal A, Rua Treta, São Vicente - Terminal B.");
  });

  test("[inválido] falha do OSRM (NoRoute) → sem-rota, sem chamar comporDescricao (RN-048)", async () => {
    const fetchFn = respostaFetchMock({ code: "NoRoute", routes: [] });
    const paradas = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];

    const resultado = await dispararRecalculo(paradas, [SECAO_A, SECAO_B], [], SERVICO_UUID, "ida", [], {
      fetchFn,
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok");
    expect(resultado.estado).toEqual({ situacao: "sem-rota", falha: { tipo: "sem-rota" } });
  });

  test("[inválido] itinerário incompleto (< 2 paradas) NÃO chama o OSRM — devolve as violações", async () => {
    const fetchFn = vi.fn();
    const resultado = await dispararRecalculo(
      [paradaDeSecao(SECAO_A.uuid)],
      [SECAO_A],
      [],
      SERVICO_UUID,
      "ida",
      [],
      { fetchFn: fetchFn as unknown as typeof fetch },
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("esperava violação");
    expect(resultado.violacoes.length).toBeGreaterThan(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("TASK-066 — re-ancoragem antes de reaplicar (DEC-056/DEC-060), composição real da etapa", () => {
  // Reproduz a composição de `aplicarNovasParadas` (etapa-itinerarios.tsx):
  // re-ancorar os pontos de rota persistidos ANTES de repassá-los a
  // `dispararRecalculo` — sem isso, remover uma parada faz
  // `intercalarPontosDeRota` lançar dentro de `solicitarRota`, virando
  // rejeição não tratada (o bug que esta task fecha).
  const envelopeDoisTrechos = {
    code: "Ok",
    routes: [
      {
        geometry: { type: "LineString", coordinates: [[-46.33, -23.96], [-46.4, -24.0]] },
        legs: [
          { distance: 1000, duration: 60, steps: [{ name: "Rua Treta" }] },
        ],
      },
    ],
  };

  test("remover a parada do meio (B): pontos dos dois trechos sobrevivem, fundidos, sem rejeição não tratada", async () => {
    const paradasAntes = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid), paradaDeSecao(SECAO_C.uuid)];
    const paradasDepois = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_C.uuid)];
    const pontosCrus: PontoDeRota[] = [
      { apos_parada_ordem: 1, latitude: -23.97, longitude: -46.34 }, // A→B
      { apos_parada_ordem: 2, latitude: -23.99, longitude: -46.38 }, // B→C
    ];

    const pontosReancorados = reancorarPontosDeRota(
      paradasAntes.map(chaveParadaEmEdicao),
      paradasDepois.map(chaveParadaEmEdicao),
      pontosCrus,
    );
    // Fundidos no único trecho A→C (apos_parada_ordem=1), sequência preservada.
    expect(pontosReancorados).toEqual([
      { ...pontosCrus[0], apos_parada_ordem: 1 },
      { ...pontosCrus[1], apos_parada_ordem: 1 },
    ]);

    const fetchFn = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(envelopeDoisTrechos),
    }) as unknown as typeof fetch;

    const resultado = await dispararRecalculo(
      paradasDepois,
      [SECAO_A, SECAO_C],
      [],
      SERVICO_UUID,
      "ida",
      pontosReancorados,
      { fetchFn },
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok");
    expect(resultado.estado.situacao).toBe("recalculada");
    if (resultado.estado.situacao !== "recalculada") throw new Error("esperava recalculada");
    // `pontos_de_rota` resultante válido por esquemaRota (Spec 02 §14) em todos
    // os caminhos — inclusive depois de fundir os pontos dos dois trechos.
    expect(esquemaRota.safeParse(resultado.estado.rota).success).toBe(true);
    expect(resultado.estado.rota.pontos_de_rota).toEqual(pontosReancorados);
  });

  test("[inválido] reaplicar os pontos CRUS (sem re-ancorar) após remover a parada do meio não lança — vira sem-rota (RN-048)", async () => {
    const paradasDepois = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_C.uuid)];
    const pontosCrus: PontoDeRota[] = [
      { apos_parada_ordem: 1, latitude: -23.97, longitude: -46.34 },
      { apos_parada_ordem: 2, latitude: -23.99, longitude: -46.38 }, // fora de [1, 1] após a remoção
    ];
    const fetchFn = vi.fn();

    const resultado = await dispararRecalculo(
      paradasDepois,
      [SECAO_A, SECAO_C],
      [],
      SERVICO_UUID,
      "ida",
      pontosCrus,
      { fetchFn: fetchFn as unknown as typeof fetch },
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok (sem-rota é um ESTADO, não uma rejeição)");
    expect(resultado.estado).toEqual({
      situacao: "sem-rota",
      falha: { tipo: "ponto-de-rota-invalido" },
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("TASK-046/TASK-087 — rota recalculada alimenta a reconciliação", () => {
  test("remoção usa os novos trechos do OSRM mockado e recompõe todas as Viagens", async () => {
    const base = esquemaDocumentoOperacao.parse(documentoExemploMinimo()).autos.servicos[0]
      .itinerarios[0];
    const paradasAntes = [
      paradaDeSecao(SECAO_A.uuid),
      paradaDeSecao(SECAO_B.uuid),
      paradaDeSecao(SECAO_C.uuid),
    ];
    const paradasDepois = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_C.uuid)];
    const anterior: Itinerario = {
      ...base,
      paradas: paradasParaContrato(paradasAntes),
      rota: {
        ...base.rota,
        distancia_km: 2,
        duracao_s: 120,
        pontos_de_rota: [],
        trechos: [
          {
            parada_origem_ordem: 1,
            parada_destino_ordem: 2,
            distancia_km: 1,
            duracao_s: 60,
          },
          {
            parada_origem_ordem: 2,
            parada_destino_ordem: 3,
            distancia_km: 1,
            duracao_s: 60,
          },
        ],
      },
      viagens: base.viagens.map((viagem) => ({
        ...viagem,
        horarios_paradas: [
          { parada_ordem: 1, offset_horario: "00:00:00" },
          { parada_ordem: 2, offset_horario: "00:05:00" },
          { parada_ordem: 3, offset_horario: "00:10:00" },
        ],
      })),
    };
    const fetchFn = respostaFetchMock({
      code: "Ok",
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [[-46.33, -23.96], [-46.4, -24.0]],
          },
          legs: [{ distance: 1500, duration: 90, steps: [{ name: "Rodovia Nova" }] }],
        },
      ],
    });

    const recalculo = await dispararRecalculo(
      paradasDepois,
      [SECAO_A, SECAO_C],
      [],
      SERVICO_UUID,
      "ida",
      [],
      { fetchFn },
    );

    expect(recalculo.ok).toBe(true);
    if (!recalculo.ok || recalculo.estado.situacao !== "recalculada") {
      throw new Error("esperava rota recalculada");
    }
    const reconciliacao = reconciliarHorariosAposMudancaItinerario(
      anterior,
      paradasParaContrato(paradasDepois),
      recalculo.estado.rota,
    );

    expect(reconciliacao.mudanca.tipo).toBe("remocao");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    for (const viagem of reconciliacao.itinerario.viagens) {
      expect(viagem.horarios_paradas).toEqual([
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:01:30" },
      ]);
    }
  });

  test("TASK-083: remover a última Parada descarta o ponto órfão e recalcula sem sem-rota", async () => {
    const paradasAntes = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid), paradaDeSecao(SECAO_C.uuid)];
    const paradasDepois = [paradaDeSecao(SECAO_A.uuid), paradaDeSecao(SECAO_B.uuid)];
    const pontosCrus: PontoDeRota[] = [
      { apos_parada_ordem: 2, latitude: -23.99, longitude: -46.38 },
    ];
    const pontosReancorados = reancorarPontosDeRota(
      paradasAntes.map(chaveParadaEmEdicao),
      paradasDepois.map(chaveParadaEmEdicao),
      pontosCrus,
    );
    expect(pontosReancorados).toEqual([]);

    const fetchFn = respostaFetchMock({
      code: "Ok",
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [[-46.33, -23.96], [-46.391, -23.963]],
          },
          legs: [{ distance: 1200, duration: 75, steps: [{ name: "Rodovia Nova" }] }],
        },
      ],
    });
    const resultado = await dispararRecalculo(
      paradasDepois,
      [SECAO_A, SECAO_B],
      [],
      SERVICO_UUID,
      "ida",
      pontosReancorados,
      { fetchFn },
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperava ok");
    expect(resultado.estado.situacao).toBe("recalculada");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("itinerariosAoVivoDaSessao — TASK-044, obrigação de fiação (docs-dev/06)", () => {
  test("itinerário completo NUNCA tocado nesta sessão entra com o congelamento do rota do arquivo (RN-015)", () => {
    const documento = documentoExemploMinimo();
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const lista = itinerariosAoVivoDaSessao(sessao);

    expect(lista.length).toBe(documento.autos.servicos.flatMap((s) => s.itinerarios).length);
    expect(lista.every((i) => i.estadoRota.situacao === "congelada")).toBe(true);
  });

  test("estado ao vivo registrado na sessão (recálculo desta edição) tem prioridade sobre o congelamento do arquivo", () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const itinerario = servico.itinerarios[0];
    const chave = chaveItinerario(servico.uuid, itinerario.sentido);

    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      estadosRotaViva: { [chave]: { situacao: "sem-rota", falha: { tipo: "sem-rota" } } },
    };

    const lista = itinerariosAoVivoDaSessao(sessao);
    const entrada = lista.find((i) => i.numeroN === servico.numero_n && i.sentido === itinerario.sentido);
    expect(entrada?.estadoRota.situacao).toBe("sem-rota");
  });

  test("modo novo sem Serviço em construção tocado → lista vazia (sem pendência prematura)", () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    expect(itinerariosAoVivoDaSessao(sessao)).toEqual([]);
  });

  test("Serviço em construção só entra depois de ter algum estado registrado (itinerário WIP não pendência)", () => {
    const sessaoSemEstado: SessaoFormulario = {
      modo: "novo",
      servicosEmConstrucao: [
        {
          uuid: SERVICO_UUID,
          numero_n: "1-1CR",
          caracteristica_veiculo: "CR",
          carater: "principal",
          direcionalidade: "ida",
        },
      ],
    };
    expect(itinerariosAoVivoDaSessao(sessaoSemEstado)).toEqual([]);

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const sessaoComEstado: SessaoFormulario = {
      ...sessaoSemEstado,
      estadosRotaViva: { [chave]: { situacao: "sem-rota", falha: { tipo: "sem-rota" } } },
    };
    const lista = itinerariosAoVivoDaSessao(sessaoComEstado);
    expect(lista).toEqual([{ numeroN: "1-1CR", sentido: "ida", estadoRota: { situacao: "sem-rota", falha: { tipo: "sem-rota" } } }]);
  });
});
