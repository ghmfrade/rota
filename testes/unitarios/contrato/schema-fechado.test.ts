import { describe, it } from "vitest";
import { documentoDaFixture, esperarInvalido } from "./utilitarios";

// Contrato/regressão (categorias 1 e 10) — schema fechado: campo extra,
// campo de fluxo e R$ são rejeitados em qualquer nível. RN-010, RN-013,
// RN-042; Spec 02 §16.

describe("schema fechado (RN-010/RN-013)", () => {
  it("rn010: recusa campo extra na raiz", () => {
    const doc = documentoDaFixture();
    doc.comparativo = {};
    esperarInvalido(doc);
  });

  it("rn010: recusa campo de fluxo autos.aprovado_por", () => {
    const doc = documentoDaFixture();
    doc.autos.aprovado_por = "Fulano";
    esperarInvalido(doc);
  });

  it("rn010: recusa campo de fluxo autos.historico", () => {
    const doc = documentoDaFixture();
    doc.autos.historico = [];
    esperarInvalido(doc);
  });

  it("rn010: recusa campo de fluxo autos.pendencias", () => {
    const doc = documentoDaFixture();
    doc.autos.pendencias = [];
    esperarInvalido(doc);
  });

  it("rn013: recusa campo monetário no Serviço (tarifa_reais)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tarifa_reais = 12.5;
    esperarInvalido(doc);
  });

  it("rn013: recusa campo monetário em par de seccionamento (valor_reais)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].matriz_seccionamento[0].valor_reais = 7.9;
    esperarInvalido(doc);
  });

  it("rn010: recusa campo extra em Viagem (autor)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].autor = "empresa";
    esperarInvalido(doc);
  });

  it("rn010: recusa campo extra em Parada (nome)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].paradas[0].nome = "Terminal";
    esperarInvalido(doc);
  });

  it("rn042: recusa ponto de rota com uuid — não é entidade comparável", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.pontos_de_rota[0].uuid =
      "0f7c2b1d-9a4e-4d2b-8c3f-6e5a1b2c3d40";
    esperarInvalido(doc);
  });
});
