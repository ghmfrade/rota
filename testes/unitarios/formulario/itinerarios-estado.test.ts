import { describe, expect, test, vi } from "vitest";
import {
  chaveItinerario,
  dispararRecalculo,
  itinerariosAoVivoDaSessao,
} from "@/formulario/itinerarios";
import { paradaDeSecao } from "@/formulario/itinerarios";
import { esquemaRota, type DescricaoItinerario } from "@/shared/contrato";
import type { Secao } from "@/shared/contrato";
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
