import { describe, expect, it } from "vitest";
import { detectarPartidasCoincidentes } from "@/formulario/viagens";
import type { Servico, Viagem } from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
} from "../../fixtures";

function clonarViagem(
  origem: Viagem,
  uuid: string,
  alteracoes: Partial<Viagem> = {},
): Viagem {
  return {
    ...structuredClone(origem),
    uuid,
    ...alteracoes,
  };
}

function servicoMinimo(): Servico {
  return documentoExemploMinimo().autos.servicos[0];
}

describe("detectarPartidasCoincidentes (TASK-119; RN-061/062)", () => {
  it("não cria grupo com zero ou uma Viagem", () => {
    const servico = servicoMinimo();
    expect(
      detectarPartidasCoincidentes([
        { ...servico, itinerarios: [{ ...servico.itinerarios[0], viagens: [] }] },
      ]).grupos,
    ).toHaveLength(0);
    expect(detectarPartidasCoincidentes([servico]).grupos).toHaveLength(0);
  });

  it("mantém a primeira exibida como base e marca a segunda e a terceira como reforços", () => {
    const servico = servicoMinimo();
    const itinerario = servico.itinerarios[0];
    const origem = itinerario.viagens[0];
    origem.uuid = "30000000-0000-4000-8000-000000000003";
    origem.horario_saida = "08:00:00";
    origem.dia_semana = "quarta";
    const primeira = clonarViagem(
      origem,
      "10000000-0000-4000-8000-000000000001",
    );
    const segunda = clonarViagem(
      origem,
      "20000000-0000-4000-8000-000000000002",
      {
        horarios_paradas: origem.horarios_paradas.map((horario, indice) => ({
          ...horario,
          offset_horario:
            indice === 0 ? "00:00:00" : `00:${20 + indice}:00`,
        })),
      },
    );
    itinerario.viagens = [origem, segunda, primeira];

    const resultado = detectarPartidasCoincidentes([servico]);

    expect(resultado.grupos).toHaveLength(1);
    expect(resultado.grupos[0]).toMatchObject({
      diaSemana: "quarta",
      horarioSaida: "08:00:00",
      viagemBaseUuid: primeira.uuid,
      reforcosUuids: [segunda.uuid, origem.uuid],
    });
    expect([...resultado.reforcosUuids]).toEqual([
      segunda.uuid,
      origem.uuid,
    ]);
  });

  it("ignora offsets, mas separa dia, horário, sentido e grade", () => {
    const documento = documentoBidirecionalMultiServico();
    const servico = documento.autos.servicos[0];
    const ida = servico.itinerarios.find((itinerario) => itinerario.sentido === "ida")!;
    const volta = servico.itinerarios.find(
      (itinerario) => itinerario.sentido === "volta",
    )!;
    const origem = ida.viagens[0];
    origem.uuid = "10000000-0000-4000-8000-000000000001";
    origem.dia_semana = "segunda";
    origem.horario_saida = "08:00:00";
    origem.viagem_feriado = false;
    origem.tabela_excepcional_uuid = null;
    const reforco = clonarViagem(
      origem,
      "30000000-0000-4000-8000-000000000003",
      {
        horarios_paradas: origem.horarios_paradas.map((horario, indice) => ({
          ...horario,
          offset_horario:
            indice === 0 ? "00:00:00" : `00:${30 + indice}:00`,
        })),
      },
    );
    const outroDia = clonarViagem(
      origem,
      "40000000-0000-4000-8000-000000000004",
      { dia_semana: "terca" },
    );
    const outroHorario = clonarViagem(
      origem,
      "50000000-0000-4000-8000-000000000005",
      { horario_saida: "08:01:00" },
    );
    const feriado = clonarViagem(
      origem,
      "60000000-0000-4000-8000-000000000006",
      { viagem_feriado: true },
    );
    ida.viagens = [origem, reforco, outroDia, outroHorario, feriado];
    volta.viagens = [
      clonarViagem(
        volta.viagens[0],
        "70000000-0000-4000-8000-000000000007",
        { dia_semana: "segunda", horario_saida: "08:00:00" },
      ),
    ];

    const resultado = detectarPartidasCoincidentes([servico]);
    expect(resultado.grupos).toHaveLength(1);
    expect(resultado.grupos[0].reforcosUuids).toEqual([reforco.uuid]);
  });

  it("separa cada Tabela excepcional e usa a ordem visual na primeira origem", () => {
    const servico = servicoMinimo();
    const itinerario = servico.itinerarios[0];
    const origem = itinerario.viagens[0];
    servico.tabelas_excepcionais = [
      {
        uuid: "a0000000-0000-4000-8000-000000000001",
        tipo: "ferias_verao",
        descricao: null,
      },
      {
        uuid: "b0000000-0000-4000-8000-000000000002",
        tipo: "personalizado",
        descricao: "Operação B",
      },
    ];
    const comum1 = clonarViagem(
      origem,
      "10000000-0000-4000-8000-000000000001",
      { dia_semana: "sexta", horario_saida: "18:00:00" },
    );
    const comum2 = clonarViagem(
      comum1,
      "20000000-0000-4000-8000-000000000002",
    );
    const excepcionalA1 = clonarViagem(
      origem,
      "30000000-0000-4000-8000-000000000003",
      {
        dia_semana: "segunda",
        horario_saida: "06:00:00",
        tabela_excepcional_uuid: servico.tabelas_excepcionais[0].uuid,
      },
    );
    const excepcionalA2 = clonarViagem(
      excepcionalA1,
      "40000000-0000-4000-8000-000000000004",
    );
    const excepcionalB = clonarViagem(
      excepcionalA1,
      "50000000-0000-4000-8000-000000000005",
      { tabela_excepcional_uuid: servico.tabelas_excepcionais[1].uuid },
    );
    itinerario.viagens = [
      excepcionalA1,
      excepcionalA2,
      excepcionalB,
      comum1,
      comum2,
    ];

    const resultado = detectarPartidasCoincidentes([servico]);

    expect(resultado.grupos).toHaveLength(2);
    expect(resultado.alertasPorServico).toHaveLength(1);
    expect(resultado.alertasPorServico[0]).toMatchObject({
      numeroN: servico.numero_n,
      quantidadeGrupos: 2,
      primeiraOrigem: {
        gradeId: "comuns",
        diaSemana: "sexta",
        horarioSaida: "18:00:00",
        viagemBaseUuid: comum1.uuid,
      },
    });
    expect(resultado.grupos[1].gradeId).toBe(
      `excepcional-${servico.tabelas_excepcionais[0].uuid}`,
    );
  });

  it("é imutável e não trata duas ocorrências da mesma UUID como entidades distintas", () => {
    const servico = servicoMinimo();
    const viagem = servico.itinerarios[0].viagens[0];
    servico.itinerarios[0].viagens = [viagem, viagem];
    const antes = structuredClone(servico);

    const resultado = detectarPartidasCoincidentes([servico]);

    expect(resultado.grupos).toHaveLength(0);
    expect(servico).toEqual(antes);
  });
});
