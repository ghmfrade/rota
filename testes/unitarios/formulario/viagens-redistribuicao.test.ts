import { describe, expect, test } from "vitest";
import type { Parada, Trecho } from "@/shared/contrato";
import {
  baselineSegundos,
  editarHorarioPassante,
  offsetForaDeOrdem,
  recomputarOffsetsComAncoras,
  resetarOffsetsEmLote,
  resetarOffsetsViagem,
} from "@/formulario/viagens";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-029 — redistribuição proporcional entre âncoras (Spec 03 §8.2; RN-065) e
// reset à sugestão inicial (Spec 03 §8.3; RN-066). Cálculo puro: paradas/trechos
// mínimos construídos à mão para controlar o baseline; casos com Local ocultos
// não são necessários aqui (a fórmula só usa `parada.ordem` e `duracao_s`).

// As funções puras só leem `parada.ordem` / `trecho.parada_origem_ordem` /
// `duracao_s`; objetos mínimos bastam para o cálculo.
function parada(ordem: number): Parada {
  return { ordem, secao_uuid: `s${ordem}` } as unknown as Parada;
}
function trecho(origem: number, destino: number, duracao_s: number): Trecho {
  return { parada_origem_ordem: origem, parada_destino_ordem: destino, duracao_s } as unknown as Trecho;
}

/** Itinerário A(1)→a(2)→B(3), trechos de 30 min cada — o exemplo do enunciado. */
function itinerario3Paradas() {
  return {
    paradas: [parada(1), parada(2), parada(3)],
    rota: { trechos: [trecho(1, 2, 1800), trecho(2, 3, 1800)] },
  } as unknown as Parameters<typeof editarHorarioPassante>[1];
}

const off = (horarios: { parada_ordem: number; offset_horario: string }[], ordem: number) =>
  horarios.find((h) => h.parada_ordem === ordem)!.offset_horario;

describe("baselineSegundos (Spec 03 §8.1)", () => {
  test("acumula duracao_s por parada.ordem, primeira em 0", () => {
    const base = baselineSegundos(
      [parada(1), parada(2), parada(3)],
      [trecho(1, 2, 1800), trecho(2, 3, 1800)],
    );
    expect(base.get(1)).toBe(0);
    expect(base.get(2)).toBe(1800);
    expect(base.get(3)).toBe(3600);
  });
});

describe("recomputarOffsetsComAncoras (RN-065)", () => {
  test("exemplo literal: A=0, a=30, B=60 → fixa B=50 ⇒ a=25", () => {
    const horarios = recomputarOffsetsComAncoras(
      [parada(1), parada(2), parada(3)],
      [trecho(1, 2, 1800), trecho(2, 3, 1800)],
      new Map([
        [1, 0],
        [3, 3000], // B fixado em 50 min
      ]),
    );
    expect(off(horarios, 1)).toBe("00:00:00");
    expect(off(horarios, 2)).toBe("00:25:00"); // reinterpolado proporcionalmente
    expect(off(horarios, 3)).toBe("00:50:00");
  });

  test("offsets ficam não decrescentes (monotonicidade — RN-063)", () => {
    const horarios = recomputarOffsetsComAncoras(
      [parada(1), parada(2), parada(3), parada(4)],
      [trecho(1, 2, 600), trecho(2, 3, 600), trecho(3, 4, 600)],
      new Map([
        [1, 0],
        [3, 1200],
      ]),
    );
    const seq = horarios.map((h) => h.offset_horario);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i] >= seq[i - 1]).toBe(true);
    }
  });

  test("tail após a última âncora mantém as durações de baseline apeadas", () => {
    // Âncora em a(2)=40 min; b(3) e c(4) são tail (baseline 10 min cada após a).
    const horarios = recomputarOffsetsComAncoras(
      [parada(1), parada(2), parada(3), parada(4)],
      [trecho(1, 2, 1800), trecho(2, 3, 600), trecho(3, 4, 600)],
      new Map([
        [1, 0],
        [2, 2400], // a fixado em 40 min (baseline era 30)
      ]),
    );
    expect(off(horarios, 2)).toBe("00:40:00");
    expect(off(horarios, 3)).toBe("00:50:00"); // 40 + baseline(10)
    expect(off(horarios, 4)).toBe("01:00:00"); // 50 + baseline(10)
  });

  test("baseline degenerado (durações nulas entre âncoras) → distribuição uniforme", () => {
    // Trechos 2→3 e 3→4 com duracao_s = 0: a(3) e b(4) coincidiriam no baseline;
    // entre as âncoras A(1)=0 e C(5)=40 min, as três derivadas ficam uniformes.
    const horarios = recomputarOffsetsComAncoras(
      [parada(1), parada(2), parada(3), parada(4), parada(5)],
      [trecho(1, 2, 0), trecho(2, 3, 0), trecho(3, 4, 0), trecho(4, 5, 0)],
      new Map([
        [1, 0],
        [5, 2400],
      ]),
    );
    expect(off(horarios, 2)).toBe("00:10:00");
    expect(off(horarios, 3)).toBe("00:20:00");
    expect(off(horarios, 4)).toBe("00:30:00");
    expect(off(horarios, 5)).toBe("00:40:00");
  });
});

describe("offsetForaDeOrdem (bloqueio de fora-de-ordem — Spec 04 §8.2)", () => {
  const ancoras = new Map([
    [1, 0],
    [3, 3000],
  ]);

  test("dentro da janela entre âncoras → permitido", () => {
    expect(offsetForaDeOrdem(ancoras, 2, 1500)).toBe(false);
  });
  test("[inválido] maior que a próxima âncora → recusado", () => {
    expect(offsetForaDeOrdem(ancoras, 2, 3600)).toBe(true);
  });
  test("[inválido] menor que a âncora anterior → recusado", () => {
    expect(offsetForaDeOrdem(ancoras, 4, 2000)).toBe(true); // tail, < âncora em 3 (3000)
  });
});

describe("editarHorarioPassante (Spec 04 §8.2; RN-065/067)", () => {
  function viagemBaseline() {
    return {
      uuid: "11111111-1111-4111-8111-111111111111",
      horario_saida: "08:00:00",
      dia_semana: "segunda" as const,
      viagem_feriado: false,
      tabela_excepcional_uuid: null,
      horarios_paradas: [
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:30:00" },
        { parada_ordem: 3, offset_horario: "01:00:00" },
      ],
    };
  }

  test("digitar horário de relógio absoluto na parada B (08:50) ancora e redistribui a derivada", () => {
    const resultado = editarHorarioPassante(viagemBaseline(), itinerario3Paradas(), [], 3, "08:50");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(off(resultado.viagem.horarios_paradas, 2)).toBe("00:25:00");
    expect(off(resultado.viagem.horarios_paradas, 3)).toBe("00:50:00");
    expect(resultado.ancoras).toEqual([3]);
    expect(resultado.viagem.uuid).toBe(viagemBaseline().uuid); // identidade preservada
  });

  test("[inválido] fora-de-ordem (passante > próxima âncora já fixada) é recusado e não altera", () => {
    const viagem = {
      ...viagemBaseline(),
      horarios_paradas: [
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:30:00" },
        { parada_ordem: 3, offset_horario: "00:50:00" },
      ],
    };
    // ord3 já é âncora em 50 min; editar ord2 para 08:55 (55 min) violaria a ordem.
    const resultado = editarHorarioPassante(viagem, itinerario3Paradas(), [3], 2, "08:55");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("fora-de-ordem");
  });

  test("[inválido] fora-de-ordem (passante < âncora anterior) é recusado", () => {
    const viagem = {
      ...viagemBaseline(),
      horarios_paradas: [
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:30:00" },
        { parada_ordem: 3, offset_horario: "01:00:00" },
      ],
    };
    // ord2 âncora em 30 min; editar ord3 para 08:20 (20 min) < âncora anterior.
    const resultado = editarHorarioPassante(viagem, itinerario3Paradas(), [2], 3, "08:20");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("fora-de-ordem");
  });

  test("[inválido] horário malformado retorna 'invalido' sem tocar a Viagem", () => {
    const resultado = editarHorarioPassante(viagemBaseline(), itinerario3Paradas(), [], 3, "25:99");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("invalido");
  });
});

describe("reset à sugestão inicial (Spec 03 §8.3; RN-066)", () => {
  function itinerarioFixture() {
    return documentoExemploMinimo().autos.servicos[0].itinerarios[0];
  }

  test("resetarOffsetsViagem re-deriva pela sugestão inicial e preserva uuid/saida/dia/feriado", () => {
    const itinerario = itinerarioFixture();
    const original = itinerario.viagens[0]; // offsets manuais 0/37/52/70 min
    const resetada = resetarOffsetsViagem(original, itinerario);

    // baseline do itinerário: 0 / 18 / 25 / 30 min (1080 / +420 / +300 s)
    expect(resetada.horarios_paradas.map((h) => h.offset_horario)).toEqual([
      "00:00:00",
      "00:18:00",
      "00:25:00",
      "00:30:00",
    ]);
    expect(resetada.uuid).toBe(original.uuid);
    expect(resetada.horario_saida).toBe(original.horario_saida);
    expect(resetada.dia_semana).toBe(original.dia_semana);
    expect(resetada.viagem_feriado).toBe(original.viagem_feriado);
  });

  test("reset é idempotente (aplicar 2× dá o mesmo resultado)", () => {
    const itinerario = itinerarioFixture();
    const uma = resetarOffsetsViagem(itinerario.viagens[0], itinerario);
    const duas = resetarOffsetsViagem(uma, itinerario);
    expect(duas.horarios_paradas).toEqual(uma.horarios_paradas);
  });

  test("resetarOffsetsEmLote reseta todas as Viagens do itinerário", () => {
    const itinerario = itinerarioFixture();
    const resetado = resetarOffsetsEmLote(itinerario);
    const baseline = ["00:00:00", "00:18:00", "00:25:00", "00:30:00"];
    for (const viagem of resetado.viagens) {
      expect(viagem.horarios_paradas.map((h) => h.offset_horario)).toEqual(baseline);
    }
    // identidades e nº de Viagens preservados
    expect(resetado.viagens.map((v) => v.uuid)).toEqual(itinerario.viagens.map((v) => v.uuid));
  });
});
