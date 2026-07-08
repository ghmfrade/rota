import { describe, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) — raiz, Autos, status/datas e enums. Spec 02 §3–§4, §6, §14.

describe("documento raiz e autos", () => {
  it("aceita o exemplo mínimo da Spec 02 §15 (critério de aceite 1)", () => {
    esperarValido(documentoDaFixture());
  });

  it("rn008: recusa documento sem versao_schema", () => {
    const doc = documentoDaFixture();
    delete doc.versao_schema;
    esperarInvalido(doc);
  });

  it("rn008: recusa versao_schema vazia", () => {
    const doc = documentoDaFixture();
    doc.versao_schema = "";
    esperarInvalido(doc, "[RN-008]");
  });

  it("recusa documento sem autos", () => {
    const doc = documentoDaFixture();
    delete doc.autos;
    esperarInvalido(doc);
  });

  it("recusa tipo de Autos fora do enum da Spec 01 §7", () => {
    const doc = documentoDaFixture();
    doc.autos.tipo = "Urbano";
    esperarInvalido(doc);
  });

  it("recusa codigo vazio", () => {
    const doc = documentoDaFixture();
    doc.autos.codigo = "";
    esperarInvalido(doc);
  });

  it('rn011: recusa status fora de proposta/vigente (ex.: "em_analise")', () => {
    const doc = documentoDaFixture();
    doc.autos.status = "em_analise";
    esperarInvalido(doc);
  });

  it("rn011: recusa proposta sem data_criacao", () => {
    const doc = documentoDaFixture();
    delete doc.autos.data_criacao;
    esperarInvalido(doc, "[RN-011]");
  });

  it("rn011: recusa os dois campos de data presentes", () => {
    const doc = documentoDaFixture();
    doc.autos.data_publicacao = "2026-07-02";
    esperarInvalido(doc, "[RN-011]");
  });

  it("rn011: recusa vigente com data_criacao", () => {
    const doc = documentoDaFixture();
    doc.autos.status = "vigente";
    esperarInvalido(doc, "[RN-011]");
  });

  it("rn011: aceita vigente com data_publicacao (caso válido)", () => {
    const doc = documentoDaFixture();
    doc.autos.status = "vigente";
    delete doc.autos.data_criacao;
    doc.autos.data_publicacao = "2026-06-15";
    esperarValido(doc);
  });

  it("recusa data fora do formato YYYY-MM-DD", () => {
    const doc = documentoDaFixture();
    doc.autos.data_criacao = "01/07/2026";
    esperarInvalido(doc);
  });

  it("rn018: recusa autos.servicos vazio", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos = [];
    esperarInvalido(doc, "[RN-018]");
  });

  it("rn019/dec-026: recusa caracteristica_veiculo SL — Semileito não existe", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].caracteristica_veiculo = "SL";
    esperarInvalido(doc);
  });

  it("rn024: recusa carater fora do enum principal/parcial/semidireta", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].carater = "expressa";
    esperarInvalido(doc);
  });
});
