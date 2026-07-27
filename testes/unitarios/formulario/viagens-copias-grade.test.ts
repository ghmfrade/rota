import { describe, expect, test } from "vitest";
import { REGEX_UUID_V4, type Itinerario, type Viagem } from "@/shared/contrato";
import {
  apagarBloco,
  apagarViagem,
  clonarDiasComunsParaFeriado,
  copiarViagemParaDias,
} from "@/formulario/viagens";

// TASK-030 — cópias e remoções da grade (Spec 04 §8.3/§8.4): copiar viagem para
// outro dia e "copiar dias comuns" criam entidades novas com UUIDs novas
// (RN-007/005), preservando offsets (RN-063) sem tocar as contagens; grades
// comum e de feriado independentes (RN-068); grade de feriados vazia é válida
// (RN-071); apagar viagem/bloco.

function viagem(
  uuid: string,
  diaSemana: Viagem["dia_semana"],
  horarioSaida: string,
  viagemFeriado = false,
): Viagem {
  return {
    uuid,
    horario_saida: horarioSaida,
    dia_semana: diaSemana,
    viagem_feriado: viagemFeriado,
    tabela_excepcional_uuid: null,
    horarios_paradas: [
      { parada_ordem: 1, offset_horario: "00:00:00" },
      { parada_ordem: 2, offset_horario: "00:07:00" }, // âncora manual (não é baseline)
      { parada_ordem: 3, offset_horario: "00:20:00" },
    ],
  };
}

function itinerario(viagens: Viagem[]): Itinerario {
  return {
    sentido: "ida",
    paradas: [
      { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
      { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
      { ordem: 3, secao_uuid: "33333333-3333-4333-8333-333333333333" },
    ],
    rota: {
      geometria: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      distancia_km: 1,
      duracao_s: 600,
      descricao_itinerario: [],
      trechos: [],
      pontos_de_rota: [],
    },
    viagens,
  } as unknown as Itinerario;
}

describe("copiarViagemParaDias (Spec 04 §8.3; RN-007/061)", () => {
  test("gera UUID nova por dia, ≠ origem, preservando horário/offsets/viagem_feriado e trocando dia_semana", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");

    const copias = copiarViagemParaDias(origem, ["terca", "quarta"]);

    expect(copias).toHaveLength(2); // N dias → N Viagens (RN-061)
    for (const copia of copias) {
      expect(copia.uuid).toMatch(REGEX_UUID_V4);
      expect(copia.uuid).not.toBe(origem.uuid); // RN-007/005
      expect(copia.horario_saida).toBe(origem.horario_saida);
      expect(copia.viagem_feriado).toBe(false);
      expect(copia.horarios_paradas).toEqual(origem.horarios_paradas); // RN-063 preservado
    }
    expect(copias.map((c) => c.dia_semana)).toEqual(["terca", "quarta"]);
    expect(copias[0].uuid).not.toBe(copias[1].uuid); // UUIDs distintas entre si
  });

  test("preserva viagem_feriado da origem (cópia dentro da grade de origem)", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00", true);
    const [copia] = copiarViagemParaDias(origem, ["terca"]);
    expect(copia.viagem_feriado).toBe(true);
  });

  test("cópia é objeto independente — mutar horarios_paradas da cópia não afeta a origem", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const [copia] = copiarViagemParaDias(origem, ["terca"]);
    copia.horarios_paradas[1].offset_horario = "00:99:99";
    expect(origem.horarios_paradas[1].offset_horario).toBe("00:07:00");
  });

  test("copiar para o mesmo dia da origem é reforço válido (RN-062), com UUID nova", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const [copia] = copiarViagemParaDias(origem, ["segunda"]);
    expect(copia.dia_semana).toBe("segunda");
    expect(copia.uuid).not.toBe(origem.uuid);
  });

  test("[inválido] lista de dias vazia → nenhuma Viagem", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    expect(copiarViagemParaDias(origem, [])).toEqual([]);
  });
});

describe("clonarDiasComunsParaFeriado (Spec 04 §8.4; RN-007/068)", () => {
  test("clona todas as comuns como feriado com UUIDs novas, sem tocar as comuns", () => {
    const c1 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const c2 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "09:00:00");
    const it = itinerario([c1, c2]);

    const resultado = clonarDiasComunsParaFeriado(it, "sobrescrever");

    const comuns = resultado.viagens.filter((v) => !v.viagem_feriado);
    const feriados = resultado.viagens.filter((v) => v.viagem_feriado);
    expect(comuns).toEqual([c1, c2]); // comuns intocadas
    expect(feriados).toHaveLength(2);
    for (const f of feriados) {
      expect(f.uuid).toMatch(REGEX_UUID_V4);
      expect([c1.uuid, c2.uuid]).not.toContain(f.uuid); // RN-007
    }
    // Pareamento por dia/horário/offsets, identidade nova (RN-068)
    expect(feriados.map((f) => f.dia_semana).sort()).toEqual(["segunda", "terca"]);
    expect(feriados.every((f) => f.horarios_paradas.length === 3)).toBe(true); // RN-063
  });

  test("sobrescrever descarta as Viagens de feriado existentes", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriadoAntigo = viagem("cccccccc-0000-4000-8000-000000000003", "domingo", "07:00:00", true);
    const it = itinerario([comum, feriadoAntigo]);

    const resultado = clonarDiasComunsParaFeriado(it, "sobrescrever");

    const feriados = resultado.viagens.filter((v) => v.viagem_feriado);
    expect(feriados).toHaveLength(1);
    expect(feriados[0].uuid).not.toBe(feriadoAntigo.uuid);
    expect(feriados[0].dia_semana).toBe("segunda"); // clone da comum, não o antigo
  });

  test("mesclar mantém as de feriado existentes e adiciona os clones (reforço válido — RN-062)", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriadoAntigo = viagem("cccccccc-0000-4000-8000-000000000003", "domingo", "07:00:00", true);
    const it = itinerario([comum, feriadoAntigo]);

    const resultado = clonarDiasComunsParaFeriado(it, "mesclar");

    const feriados = resultado.viagens.filter((v) => v.viagem_feriado);
    expect(feriados).toHaveLength(2);
    expect(feriados.some((f) => f.uuid === feriadoAntigo.uuid)).toBe(true); // antigo preservado
  });

  test("grade comum vazia: sobrescrever esvazia os feriados; mesclar preserva o que houver (RN-071)", () => {
    const feriadoAntigo = viagem("cccccccc-0000-4000-8000-000000000003", "domingo", "07:00:00", true);
    const it = itinerario([feriadoAntigo]);

    expect(clonarDiasComunsParaFeriado(it, "sobrescrever").viagens).toEqual([]);
    expect(clonarDiasComunsParaFeriado(it, "mesclar").viagens).toEqual([feriadoAntigo]);
  });
});

describe("apagarViagem (Spec 04 §8.3)", () => {
  test("remove só a Viagem de uuid dado", () => {
    const a = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const b = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "09:00:00");
    const resultado = apagarViagem(itinerario([a, b]), a.uuid);
    expect(resultado.viagens).toEqual([b]);
  });

  test("[inválido] uuid inexistente → itinerário inalterado", () => {
    const a = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const it = itinerario([a]);
    expect(apagarViagem(it, "zzzzzzzz-0000-4000-8000-000000000009").viagens).toEqual([a]);
  });
});

describe("apagarBloco (Spec 04 §8.3)", () => {
  test("remove a n-ésima partida (por posição ordinal) de cada dia da grade indicada", () => {
    // segunda: 08:00 (pos0), 09:00 (pos1); terca: 08:30 (pos0)
    const seg0 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const seg1 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "09:00:00");
    const ter0 = viagem("cccccccc-0000-4000-8000-000000000003", "terca", "08:30:00");
    const it = itinerario([seg0, seg1, ter0]);

    const resultado = apagarBloco(it, 0, false); // apaga a 1ª partida de cada dia

    const uuids = resultado.viagens.map((v) => v.uuid).sort();
    expect(uuids).toEqual([seg1.uuid]); // seg0 e ter0 (pos0) removidas; seg1 (pos1) fica
  });

  test("não toca a outra grade (feriado × comum independentes — RN-068)", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00", false);
    const feriado = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "08:00:00", true);
    const it = itinerario([comum, feriado]);

    // apaga bloco0 da grade de feriados: só a de feriado sai
    const resultado = apagarBloco(it, 0, true);
    expect(resultado.viagens).toEqual([comum]);
  });

  test("[inválido] posição sem Viagem em nenhum dia → itinerário inalterado", () => {
    const seg0 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const it = itinerario([seg0]);
    expect(apagarBloco(it, 5, false).viagens).toEqual([seg0]);
  });
});
