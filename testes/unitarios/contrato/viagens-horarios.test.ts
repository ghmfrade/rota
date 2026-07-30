import { describe, expect, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) — Viagem estratificada por dia (Spec 02 §11, §14) e
// horarios_paradas (§11.1, §14).

describe("viagens (RN-061/RN-062)", () => {
  it("rn061: recusa dia_semana fora do enum", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].dia_semana = "SEGUNDA";
    esperarInvalido(doc);
  });

  it("rn061: recusa dia_semana com múltiplos dias", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].dia_semana =
      "segunda,terca";
    esperarInvalido(doc);
  });

  it("rn061: recusa viagem_feriado ausente", () => {
    const doc = documentoDaFixture();
    delete doc.autos.servicos[0].itinerarios[0].viagens[0].viagem_feriado;
    esperarInvalido(doc);
  });

  it("rn061: recusa horario_saida fora do formato HH:MM:SS", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horario_saida = "8:00";
    esperarInvalido(doc);
  });

  it("rn061: recusa horario_saida fora do relógio (24:00:00)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horario_saida = "24:00:00";
    esperarInvalido(doc);
  });

  it("rn062: aceita reforço de horário — duas viagens no mesmo dia e horário", () => {
    const doc = documentoDaFixture();
    const viagens = doc.autos.servicos[0].itinerarios[0].viagens;
    const quantidadeOriginal = viagens.length;
    const reforco = structuredClone(viagens[0]);
    reforco.uuid = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f";
    viagens.push(reforco);
    esperarValido(doc);

    const recarregado = JSON.parse(JSON.stringify(doc));
    esperarValido(recarregado);
    expect(recarregado.autos.servicos[0].itinerarios[0].viagens).toHaveLength(
      quantidadeOriginal + 1,
    );
    expect(
      recarregado.autos.servicos[0].itinerarios[0].viagens.map(
        (viagem: { uuid: string }) => viagem.uuid,
      ),
    ).toEqual(viagens.map((viagem: { uuid: string }) => viagem.uuid));
    expect(Object.keys(recarregado.autos.servicos[0].itinerarios[0].viagens[1])).toEqual(
      Object.keys(viagens[1]),
    );
  });
});

describe("horarios_paradas (RN-063)", () => {
  it("recusa elemento faltando para uma Parada", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas.pop();
    esperarInvalido(doc, "[RN-063]");
  });

  it("recusa elemento sobrando (parada_ordem inexistente)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas.push({
      parada_ordem: 5,
      offset_horario: "01:20:00",
    });
    esperarInvalido(doc, "[RN-063]");
  });

  it("recusa parada_ordem duplicada", () => {
    const doc = documentoDaFixture();
    const horarios =
      doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas;
    horarios[3].parada_ordem = 2;
    esperarInvalido(doc, "[RN-063]");
  });

  it("recusa offsets decrescentes na ordem das paradas", () => {
    const doc = documentoDaFixture();
    const horarios =
      doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas;
    horarios[1].offset_horario = "00:55:00"; // parada 2 depois da parada 3 (00:52:00)
    esperarInvalido(doc, "[RN-063]");
  });

  it('recusa primeiro offset diferente de "00:00:00"', () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas[0].offset_horario =
      "00:01:00";
    esperarInvalido(doc, "[RN-063]");
  });

  it("recusa offset com minutos inválidos (00:60:00)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas[1].offset_horario =
      "00:60:00";
    esperarInvalido(doc);
  });

  it("aceita offset acima de 24 h — duração, não hora de relógio (inferência da análise)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas[3].offset_horario =
      "25:00:00";
    esperarValido(doc);
  });
});
