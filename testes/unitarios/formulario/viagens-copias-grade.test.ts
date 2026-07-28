import { describe, expect, test } from "vitest";
import { REGEX_UUID_V4, type Itinerario, type Viagem } from "@/shared/contrato";
import {
  apagarViagem,
  apagarViagensDoDia,
  clonarDiasComunsParaFeriado,
  copiarDiaParaDiasComGuarda,
  copiarViagemParaDiaComGuarda,
  copiarViagemParaDias,
  diaAoLado,
} from "@/formulario/viagens";

// TASK-030 — cópias e remoções da grade (Spec 04 §8.3/§8.4): copiar viagem para
// outro dia e "copiar dias comuns" criam entidades novas com UUIDs novas
// (RN-007/005), preservando offsets (RN-063) sem tocar as contagens; grades
// comum e de feriado independentes (RN-068); grade de feriados vazia é válida
// (RN-071); apagar uma Viagem.

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

describe("cópia unitária com guarda (DEC-084/092; RN-062)", () => {
  test("copia para dia arbitrário, preserva a origem e normaliza a grade destino", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const resultado = copiarViagemParaDiaComGuarda(itinerario([origem]), origem.uuid, "quinta", {
      viagem_feriado: true,
      tabela_excepcional_uuid: null,
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.copia.uuid).not.toBe(origem.uuid);
    expect(resultado.copia.dia_semana).toBe("quinta");
    expect(resultado.copia.viagem_feriado).toBe(true);
    expect(resultado.copia.tabela_excepcional_uuid).toBeNull();
    expect(resultado.copia.horarios_paradas).toEqual(origem.horarios_paradas);
    expect(origem.dia_semana).toBe("segunda");
  });

  test("[inválido] recusa somente o gesto quando já há horário na mesma grade, ignorando offsets", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const destino = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00");
    destino.horarios_paradas[1].offset_horario = "00:12:00";
    const resultado = copiarViagemParaDiaComGuarda(itinerario([origem, destino]), origem.uuid, "terca", {
      viagem_feriado: false,
      tabela_excepcional_uuid: null,
    });
    expect(resultado).toEqual({ ok: false, motivo: "horario-existente" });
    expect(destino.uuid).toBe("bbbbbbbb-0000-4000-8000-000000000002");
  });

  test("[inválido] própria coluna cancela; mesmo horário em outra grade não bloqueia", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriado = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00", true);
    const it = itinerario([origem, feriado]);
    expect(
      copiarViagemParaDiaComGuarda(it, origem.uuid, "segunda", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }),
    ).toEqual({ ok: false, motivo: "mesma-coluna" });
    expect(
      copiarViagemParaDiaComGuarda(it, origem.uuid, "terca", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }).ok,
    ).toBe(true);
  });

  test("atalhos resolvem somente vizinhos, sem wrap SEG↔DOM", () => {
    expect(diaAoLado("segunda", -1)).toBeNull();
    expect(diaAoLado("domingo", 1)).toBeNull();
    expect(diaAoLado("quarta", -1)).toBe("terca");
    expect(diaAoLado("quarta", 1)).toBe("quinta");
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

describe("operações de dia inteiro (DEC-085; RN-007/061/062)", () => {
  test("copia todas as Viagens da coluna para vários destinos com UUIDs novas", () => {
    const origem08 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const origem09 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "09:00:00");

    const resultado = copiarDiaParaDiasComGuarda(
      itinerario([origem08, origem09]),
      "segunda",
      ["sabado", "domingo"],
      { viagem_feriado: false, tabela_excepcional_uuid: null },
    );

    expect(resultado.copias).toHaveLength(4);
    expect(resultado.horariosIgnorados).toBe(0);
    expect(resultado.itinerario.viagens).toHaveLength(6);
    expect(resultado.copias.every((copia) => copia.uuid !== origem08.uuid && copia.uuid !== origem09.uuid)).toBe(true);
    expect(new Set(resultado.copias.map((copia) => copia.uuid)).size).toBe(4);
    expect(resultado.copias.map((copia) => `${copia.dia_semana}:${copia.horario_saida}`).sort()).toEqual([
      "domingo:08:00:00",
      "domingo:09:00:00",
      "sabado:08:00:00",
      "sabado:09:00:00",
    ]);
    expect(resultado.copias.every((copia) => copia.horarios_paradas[1].offset_horario === "00:07:00")).toBe(true);
  });

  test("mescla sem substituir e avisa as cópias bloqueadas pela guarda da mesma grade", () => {
    const origem08 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const origem09 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "09:00:00");
    const existente = viagem("cccccccc-0000-4000-8000-000000000003", "sabado", "08:00:00");
    existente.horarios_paradas[1].offset_horario = "00:15:00";

    const resultado = copiarDiaParaDiasComGuarda(
      itinerario([origem08, origem09, existente]),
      "segunda",
      ["sabado"],
      { viagem_feriado: false, tabela_excepcional_uuid: null },
    );

    expect(resultado.copias).toHaveLength(1);
    expect(resultado.copias[0].horario_saida).toBe("09:00:00");
    expect(resultado.horariosIgnorados).toBe(1);
    expect(resultado.itinerario.viagens.find((item) => item.uuid === existente.uuid)).toEqual(existente);
  });

  test("[inválido] não copia para a origem, ignora lista vazia e não confunde outra grade", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriado = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00", true);
    const it = itinerario([comum, feriado]);

    expect(
      copiarDiaParaDiasComGuarda(it, "segunda", [], {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }),
    ).toEqual({ itinerario: it, copias: [], horariosIgnorados: 0 });
    const resultado = copiarDiaParaDiasComGuarda(it, "segunda", ["segunda", "terca"], {
      viagem_feriado: false,
      tabela_excepcional_uuid: null,
    });
    expect(resultado.copias).toHaveLength(1);
    expect(resultado.horariosIgnorados).toBe(0);
  });

  test("apaga somente as Viagens do dia e da grade informados", () => {
    const comumSeg = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const comumTer = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00");
    const feriadoSeg = viagem("cccccccc-0000-4000-8000-000000000003", "segunda", "08:00:00", true);
    const it = itinerario([comumSeg, comumTer, feriadoSeg]);

    expect(
      apagarViagensDoDia(it, "segunda", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }).viagens,
    ).toEqual([comumTer, feriadoSeg]);
  });

  test("[inválido] apagar dia sem Viagens é um no-op", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const it = itinerario([comum]);
    expect(
      apagarViagensDoDia(it, "domingo", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }).viagens,
    ).toEqual([comum]);
  });
});
