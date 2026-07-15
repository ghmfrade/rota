import { describe, expect, test } from "vitest";
import { REGEX_UUID_V4 } from "@/shared/contrato";
import { atualizarHorarioSaida, criarViagemNaCelula } from "@/formulario/viagens";
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
