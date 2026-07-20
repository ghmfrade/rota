import { describe, expect, test } from "vitest";
import {
  coletarViolacoesEstruturais,
  esquemaDocumentoOperacao,
  type Itinerario,
  type Parada,
} from "@/shared/contrato";
import { reconciliarHorariosAposMudancaItinerario } from "@/formulario/itinerarios";
import { removerAncorasHorarioDeViagens } from "@/formulario/sessao";
import { documentoExemploMinimo } from "../../fixtures";

function itinerarioFixture(): Itinerario {
  return esquemaDocumentoOperacao.parse(documentoExemploMinimo()).autos.servicos[0]
    .itinerarios[0];
}

function cenarioRemocaoLocal() {
  const anterior = itinerarioFixture();
  const novasParadas: Parada[] = [
    { ...anterior.paradas[0], ordem: 1 },
    { ...anterior.paradas[1], ordem: 2 },
    { ...anterior.paradas[3], ordem: 3 },
  ];
  const novaRota: Itinerario["rota"] = {
    ...structuredClone(anterior.rota),
    pontos_de_rota: anterior.rota.pontos_de_rota ?? [],
    trechos: [
      { ...anterior.rota.trechos[0] },
      {
        parada_origem_ordem: 2,
        parada_destino_ordem: 3,
        distancia_km: 6,
        duracao_s: 720,
      },
    ],
  };
  return { anterior, novasParadas, novaRota };
}

describe("reconciliarHorariosAposMudancaItinerario (TASK-046/TASK-087)", () => {
  test("remoção recompõe todas as Viagens pelos novos trechos e preserva seus campos", () => {
    const { anterior, novasParadas, novaRota } = cenarioRemocaoLocal();
    const camposAntes = anterior.viagens.map(
      ({ uuid, horario_saida, dia_semana, viagem_feriado }) => ({
        uuid,
        horario_saida,
        dia_semana,
        viagem_feriado,
      }),
    );

    const resultado = reconciliarHorariosAposMudancaItinerario(
      anterior,
      novasParadas,
      novaRota,
    );

    expect(resultado.mudanca.tipo).toBe("remocao");
    expect(resultado.itinerario.viagens).toHaveLength(3); // comuns + feriado
    for (const viagem of resultado.itinerario.viagens) {
      expect(viagem.horarios_paradas).toEqual([
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:18:00" },
        { parada_ordem: 3, offset_horario: "00:30:00" },
      ]);
    }
    expect(
      resultado.itinerario.viagens.map(
        ({ uuid, horario_saida, dia_semana, viagem_feriado }) => ({
          uuid,
          horario_saida,
          dia_semana,
          viagem_feriado,
        }),
      ),
    ).toEqual(camposAntes);
    expect(resultado.uuidsViagensComAncorasDescartadas).toEqual(
      anterior.viagens.map((viagem) => viagem.uuid),
    );
  });

  test("inserção e reordenação também recompõem os horários (DEC-048)", () => {
    const anterior = itinerarioFixture();
    const local = anterior.paradas[2];
    const inseridas: Parada[] = [
      { ...anterior.paradas[0], ordem: 1 },
      { ...local, ordem: 2 },
      { ...anterior.paradas[1], ordem: 3 },
      { ...anterior.paradas[3], ordem: 4 },
      { ...local, ordem: 5 },
    ];
    const rotaInserida: Itinerario["rota"] = {
      ...structuredClone(anterior.rota),
      duracao_s: 100,
      distancia_km: 4,
      trechos: [1, 2, 3, 4].map((ordem) => ({
        parada_origem_ordem: ordem,
        parada_destino_ordem: ordem + 1,
        distancia_km: 1,
        duracao_s: 25,
      })),
    };
    const insercao = reconciliarHorariosAposMudancaItinerario(
      anterior,
      inseridas,
      rotaInserida,
    );
    expect(insercao.mudanca.tipo).toBe("insercao");
    expect(insercao.itinerario.viagens[0].horarios_paradas).toHaveLength(5);

    const reordenadas: Parada[] = [
      { ...anterior.paradas[0], ordem: 1 },
      { ...anterior.paradas[2], ordem: 2 },
      { ...anterior.paradas[1], ordem: 3 },
      { ...anterior.paradas[3], ordem: 4 },
    ];
    const reordenacao = reconciliarHorariosAposMudancaItinerario(
      anterior,
      reordenadas,
      anterior.rota,
    );
    expect(reordenacao.mudanca.tipo).toBe("reordenacao");
    expect(reordenacao.itinerario.viagens[0].horarios_paradas).toEqual([
      { parada_ordem: 1, offset_horario: "00:00:00" },
      { parada_ordem: 2, offset_horario: "00:18:00" },
      { parada_ordem: 3, offset_horario: "00:25:00" },
      { parada_ordem: 4, offset_horario: "00:30:00" },
    ]);
  });

  test("sequência inalterada preserva offsets manuais e âncoras de sessão", () => {
    const anterior = itinerarioFixture();
    const rotaComNovasDuracoes: Itinerario["rota"] = {
      ...structuredClone(anterior.rota),
      duracao_s: 2100,
      trechos: anterior.rota.trechos.map((trecho, indice) => ({
        ...trecho,
        duracao_s: [1200, 500, 400][indice],
      })),
    };
    const offsetsAntes = structuredClone(
      anterior.viagens.map((viagem) => viagem.horarios_paradas),
    );

    const resultado = reconciliarHorariosAposMudancaItinerario(
      anterior,
      anterior.paradas,
      rotaComNovasDuracoes,
    );

    expect(resultado.mudanca.tipo).toBe("inalterada");
    expect(resultado.itinerario.viagens.map((viagem) => viagem.horarios_paradas)).toEqual(
      offsetsAntes,
    );
    expect(resultado.uuidsViagensComAncorasDescartadas).toEqual([]);
  });

  test("itinerário sem Viagens é no-op e a função não muta as entradas", () => {
    const { anterior, novasParadas, novaRota } = cenarioRemocaoLocal();
    const semViagens = { ...structuredClone(anterior), viagens: [] };
    const copia = structuredClone(semViagens);

    const resultado = reconciliarHorariosAposMudancaItinerario(
      semViagens,
      novasParadas,
      novaRota,
    );

    expect(resultado.itinerario.viagens).toEqual([]);
    expect(resultado.uuidsViagensComAncorasDescartadas).toEqual([]);
    expect(semViagens).toEqual(copia);
  });

  test("descarta somente as âncoras das Viagens reconciliadas", () => {
    const { anterior, novasParadas, novaRota } = cenarioRemocaoLocal();
    const resultado = reconciliarHorariosAposMudancaItinerario(
      anterior,
      novasParadas,
      novaRota,
    );
    const uuidNaoAfetada = "99999999-9999-4999-8999-999999999999";
    const ancoras = Object.fromEntries([
      ...anterior.viagens.map((viagem) => [viagem.uuid, [2, 3]]),
      [uuidNaoAfetada, [2]],
    ]);

    const restantes = removerAncorasHorarioDeViagens(
      ancoras,
      resultado.uuidsViagensComAncorasDescartadas,
    );

    expect(restantes).toEqual({ [uuidNaoAfetada]: [2] });
    expect(Object.keys(ancoras)).toHaveLength(anterior.viagens.length + 1);
  });

  test("[inválido] write-back sem reconciliação produz RN-063; reconciliado passa no contrato", () => {
    const documentoInvalido = esquemaDocumentoOperacao.parse(documentoExemploMinimo());
    const { anterior, novasParadas, novaRota } = cenarioRemocaoLocal();
    documentoInvalido.autos.servicos[0].itinerarios[0] = {
      ...anterior,
      paradas: novasParadas,
      rota: novaRota,
    };
    expect(
      coletarViolacoesEstruturais(documentoInvalido).some((violacao) =>
        violacao.mensagem.includes("[RN-063]"),
      ),
    ).toBe(true);

    const reconciliado = reconciliarHorariosAposMudancaItinerario(
      anterior,
      novasParadas,
      novaRota,
    );
    const documentoValido = esquemaDocumentoOperacao.parse(documentoExemploMinimo());
    documentoValido.autos.servicos[0].itinerarios[0] = reconciliado.itinerario;

    expect(
      coletarViolacoesEstruturais(documentoValido).filter((violacao) =>
        violacao.mensagem.includes("[RN-063]"),
      ),
    ).toEqual([]);
    expect(esquemaDocumentoOperacao.safeParse(documentoValido).success).toBe(true);
  });
});
