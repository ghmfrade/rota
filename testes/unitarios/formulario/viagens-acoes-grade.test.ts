import { describe, expect, test } from "vitest";
import { REGEX_UUID_V4 } from "@/shared/contrato";
import {
  atualizarHorarioSaida,
  criarViagemNaCelula,
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
