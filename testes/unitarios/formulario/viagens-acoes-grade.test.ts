import { describe, expect, test, vi } from "vitest";
import { REGEX_UUID_V4 } from "@/shared/contrato";
import {
  atualizarHorarioSaida,
  criarViagemNaCelula,
  gerarViagensPorHeadway,
  inserirViagemPorOffsetRelativo,
} from "@/formulario/viagens";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-028 — ações da grade: criar Viagem por célula (RN-061/064/067) e
// reeditar a partida de uma Viagem existente (inferência controlada da
// Análise da Task).

function itinerarioDaFixture() {
  return documentoExemploMinimo().autos.servicos[0].itinerarios[0];
}

describe("criarViagemNaCelula (RN-061/064/067)", () => {
  test("cria Viagem com uuid nova, dia/horário corretos e offsets pela sugestão inicial", () => {
    const itinerario = itinerarioDaFixture();

    const viagem = criarViagemNaCelula(itinerario, "quarta", "08:15");

    expect(viagem).not.toBeNull();
    expect(viagem!.uuid).toMatch(REGEX_UUID_V4);
    expect(viagem!.dia_semana).toBe("quarta");
    expect(viagem!.horario_saida).toBe("08:15:00");
    expect(viagem!.viagem_feriado).toBe(false);
    // horarios_paradas completo — um elemento por Parada, incl. o Local (RN-063/067)
    expect(viagem!.horarios_paradas).toHaveLength(itinerario.paradas.length);
    expect(viagem!.horarios_paradas[0].offset_horario).toBe("00:00:00");
  });

  test("UUID gerada é única a cada chamada (RN-001/002)", () => {
    const itinerario = itinerarioDaFixture();
    const v1 = criarViagemNaCelula(itinerario, "quarta", "08:00");
    const v2 = criarViagemNaCelula(itinerario, "quarta", "08:00");
    expect(v1!.uuid).not.toBe(v2!.uuid);
  });

  test("[inválido] horário malformado não cria Viagem", () => {
    const itinerario = itinerarioDaFixture();
    expect(criarViagemNaCelula(itinerario, "quarta", "25:99")).toBeNull();
    expect(criarViagemNaCelula(itinerario, "quarta", "")).toBeNull();
  });
});

describe("atualizarHorarioSaida (reeditar a partida — TASK-029: preserva offsets/âncoras)", () => {
  test("muda só horario_saida e PRESERVA horarios_paradas (offsets/âncoras), com uuid/dia_semana/viagem_feriado intactos", () => {
    const itinerario = itinerarioDaFixture();
    // Viagem com uma âncora manual (offset da 2ª parada editado à mão): a
    // reedição da partida NÃO pode re-derivar e apagar essa âncora (RN-065).
    const original = {
      ...itinerario.viagens[0],
      horarios_paradas: itinerario.viagens[0].horarios_paradas.map((h, i) =>
        i === 1 ? { ...h, offset_horario: "00:07:00" } : h,
      ),
    };

    const atualizada = atualizarHorarioSaida(original, "09:30");

    expect(atualizada).not.toBeNull();
    expect(atualizada!.uuid).toBe(original.uuid);
    expect(atualizada!.dia_semana).toBe(original.dia_semana);
    expect(atualizada!.viagem_feriado).toBe(original.viagem_feriado);
    expect(atualizada!.horario_saida).toBe("09:30:00");
    // offsets preservados — inclusive a âncora manual (não re-derivada)
    expect(atualizada!.horarios_paradas).toEqual(original.horarios_paradas);
  });

  test("[inválido] horário malformado não altera a Viagem original", () => {
    const itinerario = itinerarioDaFixture();
    const original = itinerario.viagens[0];

    const resultado = atualizarHorarioSaida(original, "abc");

    expect(resultado).toBeNull();
    expect(original.horario_saida).toBe("08:00:00"); // Viagem original intocada
  });
});

describe("inserirViagemPorOffsetRelativo (TASK-107; DEC-082)", () => {
  test("cria outra Viagem no mesmo dia e grade, com UUID nova e offsets herdados", () => {
    const origem = {
      ...itinerarioDaFixture().viagens[0],
      tabela_excepcional_uuid: "11111111-1111-4111-8111-111111111111",
      horarios_paradas: itinerarioDaFixture().viagens[0].horarios_paradas.map((h, indice) =>
        indice === 1 ? { ...h, offset_horario: "00:07:00" } : { ...h },
      ),
    };

    const copia = inserirViagemPorOffsetRelativo(origem, 70);

    expect(copia).not.toBeNull();
    expect(copia!.uuid).toMatch(REGEX_UUID_V4);
    expect(copia!.uuid).not.toBe(origem.uuid);
    expect(copia!.horario_saida).toBe("09:10:00");
    expect(copia!.dia_semana).toBe(origem.dia_semana);
    expect(copia!.viagem_feriado).toBe(origem.viagem_feriado);
    expect(copia!.tabela_excepcional_uuid).toBe(origem.tabela_excepcional_uuid);
    expect(copia!.horarios_paradas).toEqual(origem.horarios_paradas);
    expect(copia!.horarios_paradas).not.toBe(origem.horarios_paradas);
    expect(copia!.horarios_paradas[1]).not.toBe(origem.horarios_paradas[1]);
  });

  test("aceita limites do dia e reforço de horário", () => {
    const origem = itinerarioDaFixture().viagens[0];
    expect(inserirViagemPorOffsetRelativo({ ...origem, horario_saida: "00:10:00" }, -10)?.horario_saida).toBe(
      "00:00:00",
    );
    expect(inserirViagemPorOffsetRelativo({ ...origem, horario_saida: "23:49:00" }, 10)?.horario_saida).toBe(
      "23:59:00",
    );
    expect(inserirViagemPorOffsetRelativo(origem, 0)?.horario_saida).toBe(origem.horario_saida);
  });

  test("[inválido] recusa resultado fora do dia ou deslocamento fracionário", () => {
    const origem = itinerarioDaFixture().viagens[0];
    expect(inserirViagemPorOffsetRelativo({ ...origem, horario_saida: "00:05:00" }, -10)).toBeNull();
    expect(inserirViagemPorOffsetRelativo({ ...origem, horario_saida: "23:55:00" }, 10)).toBeNull();
    expect(inserirViagemPorOffsetRelativo(origem, 1.5)).toBeNull();
  });
});

describe("gerarViagensPorHeadway (TASK-108; DEC-083)", () => {
  test("gera partidas posteriores até o limite inclusivo, com UUIDs novas e offsets herdados", () => {
    const origem = {
      ...itinerarioDaFixture().viagens[0],
      tabela_excepcional_uuid: "11111111-1111-4111-8111-111111111111",
      horarios_paradas: itinerarioDaFixture().viagens[0].horarios_paradas.map((h, indice) =>
        indice === 1 ? { ...h, offset_horario: "00:07:00" } : { ...h },
      ),
    };

    const resultado = gerarViagensPorHeadway(origem, "01:10", "17:00", [origem]);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.viagens.map((viagem) => viagem.horario_saida)).toEqual([
      "09:10:00",
      "10:20:00",
      "11:30:00",
      "12:40:00",
      "13:50:00",
      "15:00:00",
      "16:10:00",
    ]);
    expect(new Set(resultado.viagens.map((viagem) => viagem.uuid)).size).toBe(
      resultado.viagens.length,
    );
    for (const viagem of resultado.viagens) {
      expect(viagem.uuid).toMatch(REGEX_UUID_V4);
      expect(viagem.uuid).not.toBe(origem.uuid);
      expect(viagem.dia_semana).toBe(origem.dia_semana);
      expect(viagem.viagem_feriado).toBe(origem.viagem_feriado);
      expect(viagem.tabela_excepcional_uuid).toBe(origem.tabela_excepcional_uuid);
      expect(viagem.horarios_paradas).toEqual(origem.horarios_paradas);
      expect(viagem.horarios_paradas).not.toBe(origem.horarios_paradas);
    }
  });

  test("inclui partida exatamente no limite e para antes de virar o dia", () => {
    const origem = itinerarioDaFixture().viagens[0];
    const inclusivo = gerarViagensPorHeadway(
      { ...origem, horario_saida: "08:00:00" },
      "01:00",
      "10:00",
      [],
    );
    const fimDoDia = gerarViagensPorHeadway(
      { ...origem, horario_saida: "22:30:00" },
      "00:45",
      "23:59",
      [],
    );

    expect(inclusivo).toMatchObject({
      ok: true,
      viagens: [{ horario_saida: "09:00:00" }, { horario_saida: "10:00:00" }],
      horariosIgnorados: 0,
    });
    expect(fimDoDia).toMatchObject({
      ok: true,
      viagens: [{ horario_saida: "23:15:00" }],
      horariosIgnorados: 0,
    });
  });

  test("limite igual à origem ou headway maior que a janela produz lote vazio", () => {
    const origem = itinerarioDaFixture().viagens[0];

    expect(gerarViagensPorHeadway(origem, "00:10", "08:00", [origem])).toEqual({
      ok: true,
      viagens: [],
      horariosIgnorados: 0,
    });
    expect(gerarViagensPorHeadway(origem, "10:00", "09:00", [origem])).toEqual({
      ok: true,
      viagens: [],
      horariosIgnorados: 0,
    });
  });

  test("DEC-094: mescla lote parcialmente coincidente e preserva integralmente as existentes", () => {
    const origem = {
      ...structuredClone(itinerarioDaFixture().viagens[0]),
      horario_saida: "08:00:00",
    };
    const existente09 = {
      ...structuredClone(origem),
      uuid: "11111111-1111-4111-8111-111111111111",
      horario_saida: "09:00:00",
      horarios_paradas: origem.horarios_paradas.map((horario, indice) =>
        indice === 1 ? { ...horario, offset_horario: "00:55:00" } : horario,
      ),
    };
    const feriado10 = {
      ...structuredClone(origem),
      uuid: "22222222-2222-4222-8222-222222222222",
      horario_saida: "10:00:00",
      viagem_feriado: true,
    };
    const outroDia11 = {
      ...structuredClone(origem),
      uuid: "33333333-3333-4333-8333-333333333333",
      horario_saida: "11:00:00",
      dia_semana: "terca" as const,
    };
    const existentes = [origem, existente09, feriado10, outroDia11];
    const antes = structuredClone(existentes);

    const resultado = gerarViagensPorHeadway(origem, "01:00", "11:00", existentes);

    expect(resultado).toMatchObject({
      ok: true,
      horariosIgnorados: 1,
      viagens: [{ horario_saida: "10:00:00" }, { horario_saida: "11:00:00" }],
    });
    expect(existentes).toEqual(antes);
    if (!resultado.ok) return;
    expect(resultado.viagens.every((viagem) => viagem.viagem_feriado === false)).toBe(true);
    expect(resultado.viagens.every((viagem) => viagem.dia_semana === origem.dia_semana)).toBe(true);
  });

  test("DEC-094: colisão total é no-op e não gera UUIDs antes de filtrar", () => {
    const origem = {
      ...structuredClone(itinerarioDaFixture().viagens[0]),
      horario_saida: "08:00:00",
    };
    const existentes = [
      origem,
      {
        ...structuredClone(origem),
        uuid: "11111111-1111-4111-8111-111111111111",
        horario_saida: "09:00:00",
      },
      {
        ...structuredClone(origem),
        uuid: "22222222-2222-4222-8222-222222222222",
        horario_saida: "10:00:00",
      },
    ];
    const gerarUuid = vi.spyOn(globalThis.crypto, "randomUUID");

    try {
      expect(gerarViagensPorHeadway(origem, "01:00", "10:00", existentes)).toEqual({
        ok: true,
        viagens: [],
        horariosIgnorados: 2,
      });
      expect(gerarUuid).not.toHaveBeenCalled();
    } finally {
      gerarUuid.mockRestore();
    }
  });

  test.each([
    ["00:00", "17:00", "headway-invalido"],
    ["-01:00", "17:00", "headway-invalido"],
    ["abc", "17:00", "headway-invalido"],
    ["01:10", "25:00", "limite-invalido"],
    ["01:10", "07:00", "limite-anterior"],
  ] as const)(
    "[inválido] recusa headway/limite inválido sem gerar Viagem",
    (headway, limite, motivo) => {
      const resultado = gerarViagensPorHeadway(
        itinerarioDaFixture().viagens[0],
        headway,
        limite,
        itinerarioDaFixture().viagens,
      );
      expect(resultado).toEqual({ ok: false, motivo });
    },
  );
});
