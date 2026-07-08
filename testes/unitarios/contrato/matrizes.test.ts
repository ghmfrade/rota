import { describe, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) — matriz_distancias (Spec 02 §8, §14) e
// matriz_seccionamento (§9, §14). O valor da média (RN-056, parte de
// cálculo) é escopo da TASK-026 — aqui só forma e condicionalidade.

describe("matriz_distancias", () => {
  it("rn054: recusa combinação de Seções ausente", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].matriz_distancias.pop();
    esperarInvalido(doc, "[RN-054]");
  });

  it("rn054: recusa par duplicado", () => {
    const doc = documentoDaFixture();
    const matriz = doc.autos.servicos[0].matriz_distancias;
    matriz.push(structuredClone(matriz[0]));
    esperarInvalido(doc, "[RN-054]");
  });

  it("rn054: recusa par com secao_a_uuid igual a secao_b_uuid", () => {
    const doc = documentoDaFixture();
    const par = doc.autos.servicos[0].matriz_distancias[0];
    par.secao_b_uuid = par.secao_a_uuid;
    esperarInvalido(doc, "[RN-054]");
  });

  it("rn054: recusa par com Seção não atendida pelo Serviço", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].matriz_distancias[0].secao_b_uuid =
      "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d";
    esperarInvalido(doc, "[RN-054]");
  });

  it("rn056: recusa par sem distancia_trecho_ida em Serviço com Ida", () => {
    const doc = documentoDaFixture();
    delete doc.autos.servicos[0].matriz_distancias[0].distancia_trecho_ida;
    esperarInvalido(doc, "[RN-056]");
  });

  it("rn056: recusa distancia_trecho_volta em Serviço só-Ida", () => {
    const doc = documentoDaFixture();
    const servico = doc.autos.servicos[0];
    servico.itinerarios = [servico.itinerarios[0]];
    // Mantém distancia_trecho_volta nos pares — deve ser recusado.
    esperarInvalido(doc, "[RN-056]");
  });
});

describe("matriz_seccionamento", () => {
  it("rn059: recusa par ausente de matriz_distancias", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].matriz_seccionamento[0].secao_b_uuid =
      "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d";
    esperarInvalido(doc, "[RN-059]");
  });

  it("rn059: recusa par duplicado na forma invertida ({a,b} == {b,a})", () => {
    const doc = documentoDaFixture();
    const seccionamento = doc.autos.servicos[0].matriz_seccionamento;
    // Entrada 1 vira o inverso da entrada 0 — par não-direcional duplicado.
    seccionamento[1] = {
      secao_a_uuid: seccionamento[0].secao_b_uuid,
      secao_b_uuid: seccionamento[0].secao_a_uuid,
      distancia_km: 8,
    };
    esperarInvalido(doc, "[RN-059]");
  });

  it("rn059: recusa par com secao_a_uuid igual a secao_b_uuid", () => {
    const doc = documentoDaFixture();
    const par = doc.autos.servicos[0].matriz_seccionamento[0];
    par.secao_b_uuid = par.secao_a_uuid;
    esperarInvalido(doc, "[RN-059]");
  });

  it("rn058: aceita matriz_seccionamento ausente (default [])", () => {
    const doc = documentoDaFixture();
    delete doc.autos.servicos[0].matriz_seccionamento;
    esperarValido(doc);
  });

  it("rn058: aceita subconjunto dos pares (nem todo par é habilitado)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].matriz_seccionamento = [
      doc.autos.servicos[0].matriz_seccionamento[0],
    ];
    esperarValido(doc);
  });
});
