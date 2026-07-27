import { describe, expect, test } from "vitest";
import {
  formatarHms,
  horaMinutoParaHorarioRelogio,
  horarioParaHoraMinuto,
  normalizarEntradaHoraMinuto,
  somarHorarios,
} from "@/formulario/viagens";

// TASK-028 — conversões de horário de relógio da grade (Spec 04 §8.1/§8.2;
// RN-067): usuário digita horário de relógio, nunca offset. TASK-106 aceita
// digitação rápida com ou sem ":" e sempre normaliza para HH:MM.

describe("normalizarEntradaHoraMinuto (TASK-106; RN-067)", () => {
  test.each([
    ["0830", "08:30"],
    ["830", "08:30"],
    ["08:30", "08:30"],
    ["8:30", "08:30"],
  ])("normaliza %s para %s", (entrada, esperado) => {
    expect(normalizarEntradaHoraMinuto(entrada)).toBe(esperado);
  });

  test.each(["", "8", "08:3", "2400", "24:00", "0860", "08:60", "texto"])(
    "[inválido] rejeita %s",
    (entrada) => {
      expect(normalizarEntradaHoraMinuto(entrada)).toBeNull();
    },
  );
});

describe("horaMinutoParaHorarioRelogio (RN-067)", () => {
  test("converte HH:MM em HH:MM:SS com segundos 00", () => {
    expect(horaMinutoParaHorarioRelogio("08:15")).toBe("08:15:00");
  });

  test("converte entrada sem ':' em HH:MM:SS", () => {
    expect(horaMinutoParaHorarioRelogio("0815")).toBe("08:15:00");
  });

  test("[inválido] hora fora de 00–23 é rejeitada", () => {
    expect(horaMinutoParaHorarioRelogio("24:00")).toBeNull();
  });

  test("[inválido] minutos >= 60 são rejeitados", () => {
    expect(horaMinutoParaHorarioRelogio("08:60")).toBeNull();
  });

  test("[inválido] string vazia é rejeitada", () => {
    expect(horaMinutoParaHorarioRelogio("")).toBeNull();
  });
});

describe("horarioParaHoraMinuto", () => {
  test("trunca HH:MM:SS para HH:MM (exibição, Spec 04 §8.1)", () => {
    expect(horarioParaHoraMinuto("08:15:00")).toBe("08:15");
  });
});

describe("formatarHms", () => {
  test("zero-padded", () => {
    expect(formatarHms(5)).toBe("00:00:05");
    expect(formatarHms(65)).toBe("00:01:05");
    expect(formatarHms(3661)).toBe("01:01:01");
  });

  test("sem teto de 24h (Spec 03 §8.1)", () => {
    expect(formatarHms(90000)).toBe("25:00:00");
  });
});

describe("somarHorarios (RN-067 — horário absoluto para exibição)", () => {
  test("soma horario_saida + offset dentro do mesmo dia", () => {
    expect(somarHorarios("08:00:00", "00:30:00")).toBe("08:30:00");
  });

  test("[borda] ultrapassa meia-noite: soma dá módulo 24h", () => {
    expect(somarHorarios("23:50:00", "00:20:00")).toBe("00:10:00");
  });
});
