import { describe, expect, test } from "vitest";
import { sugerirOffsetsIniciais } from "@/formulario/viagens";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-028 — sugestão inicial de offsets (Spec 03 §8.1; RN-064): acúmulo de
// `trecho.duracao_s` a partir da primeira Parada, cobrindo TODA Parada do
// itinerário (Seções e Locais ocultos — RN-067). A fixture
// `spec02-15-exemplo-minimo` tem um Local intermediário (ordem 3) entre duas
// Seções — cenário exigido pela RN-067 ("Locais ocultos recebem horários
// internamente").

describe("sugerirOffsetsIniciais (RN-064)", () => {
  test("primeira Parada sempre 00:00:00", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const itinerario = servico.itinerarios[0];

    const offsets = sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos);

    expect(offsets[0]).toEqual({ parada_ordem: 1, offset_horario: "00:00:00" });
  });

  test("acumula duracao_s de trecho em trecho, incluindo a Parada de Local (RN-067)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const itinerario = servico.itinerarios[0];
    // trechos: 1→2 (1080s=18min), 2→3 (420s=7min), 3→4 (300s=5min)

    const offsets = sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos);

    expect(offsets).toEqual([
      { parada_ordem: 1, offset_horario: "00:00:00" },
      { parada_ordem: 2, offset_horario: "00:18:00" },
      { parada_ordem: 3, offset_horario: "00:25:00" }, // Local (ordem 3) recebe offset também
      { parada_ordem: 4, offset_horario: "00:30:00" },
    ]);
  });

  test("um elemento por Parada — mesmo conjunto de ordem (RN-063)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const itinerario = servico.itinerarios[0];

    const offsets = sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos);

    expect(offsets.map((o) => o.parada_ordem).sort((a, b) => a - b)).toEqual(
      itinerario.paradas.map((p) => p.ordem).sort((a, b) => a - b),
    );
  });

  test("resultado é não decrescente (RN-063) mesmo com paradas fora de ordem na entrada", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const itinerario = servico.itinerarios[0];
    const paradasEmbaralhadas = [...itinerario.paradas].reverse();

    const offsets = sugerirOffsetsIniciais(paradasEmbaralhadas, itinerario.rota.trechos);
    const ordenados = [...offsets].sort((a, b) => a.parada_ordem - b.parada_ordem);

    for (let i = 1; i < ordenados.length; i++) {
      expect(ordenados[i].offset_horario >= ordenados[i - 1].offset_horario).toBe(true);
    }
  });

  test("[borda] trecho com duracao_s = 0: parada derivada coincide com a vizinha (Spec 03 §8.2)", () => {
    const paradas = [
      { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
      { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
    ];
    const trechos = [
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 0, duracao_s: 0 },
    ];

    const offsets = sugerirOffsetsIniciais(paradas, trechos);

    expect(offsets).toEqual([
      { parada_ordem: 1, offset_horario: "00:00:00" },
      { parada_ordem: 2, offset_horario: "00:00:00" },
    ]);
  });

  test("[borda] acúmulo pode ultrapassar 24h — hora sem teto de 2 dígitos (Spec 03 §8.1)", () => {
    const paradas = [
      { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
      { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
    ];
    const trechos = [
      {
        parada_origem_ordem: 1,
        parada_destino_ordem: 2,
        distancia_km: 0,
        duracao_s: 90000, // 25h
      },
    ];

    const offsets = sugerirOffsetsIniciais(paradas, trechos);

    expect(offsets[1].offset_horario).toBe("25:00:00");
  });

  test("itinerário de 2 paradas: só primeira (00:00:00) e a acumulada do único trecho", () => {
    const paradas = [
      { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
      { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
    ];
    const trechos = [
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 5, duracao_s: 600 },
    ];

    const offsets = sugerirOffsetsIniciais(paradas, trechos);

    expect(offsets).toEqual([
      { parada_ordem: 1, offset_horario: "00:00:00" },
      { parada_ordem: 2, offset_horario: "00:10:00" },
    ]);
  });
});
