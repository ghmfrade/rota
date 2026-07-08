import { describe, expect, it } from "vitest";
import { esquemaDocumentoOperacao } from "@/shared/contrato";
import { documentoExemploMinimo } from "../../fixtures";
import { VARIANTES_INVALIDAS } from "../../fixtures/variantes-invalidas";
import { esperarInvalido, esperarValido } from "../contrato/utilitarios";

// Regressão permanente (categoria 10 da docs-dev/08 §10) — o schema fechado
// rejeita campo de FLUXO (RN-010) e campo de R$ (RN-013) em qualquer nível.
// É a fronteira do produto: o ROTA não é workflow e o JSON nunca guarda R$
// (Spec 02 §16; docs-dev/11). Esta suíte fixa consolida a guarda para que uma
// mudança futura no schema não afrouxe a rejeição sem ser percebida.

// Tipagem livre: o objetivo é injetar campos impossíveis nos tipos do contrato.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mutavel = any;

function comCampo(mutar: (doc: Mutavel) => void): unknown {
  const doc = documentoExemploMinimo() as Mutavel;
  mutar(doc);
  return doc;
}

describe("RN-010 — schema fechado rejeita campos de fluxo", () => {
  // Âncora positiva: a fixture-base limpa continua válida (a rejeição vem do
  // campo injetado, não de fragilidade do schema).
  it("aceita a fixture-base sem campos de fluxo", () => {
    esperarValido(documentoExemploMinimo());
  });

  const camposDeFluxo: { descricao: string; mutar: (doc: Mutavel) => void }[] = [
    {
      descricao: "campo extra na raiz",
      mutar: (doc) => (doc.campo_extra = true),
    },
    {
      descricao: "autos.aprovado_por (aprovação)",
      mutar: (doc) => (doc.autos.aprovado_por = "fulano"),
    },
    {
      descricao: "autos.historico (auditoria)",
      mutar: (doc) => (doc.autos.historico = []),
    },
    {
      descricao: "autos.pendencias (workflow)",
      mutar: (doc) => (doc.autos.pendencias = []),
    },
    {
      descricao: "autos.status fora de {proposta, vigente}",
      mutar: (doc) => (doc.autos.status = "em_analise"),
    },
    {
      descricao: "autor na Viagem (metadado de fluxo aninhado)",
      mutar: (doc) =>
        (doc.autos.servicos[0].itinerarios[0].viagens[0].autor = "fulano"),
    },
  ];

  it.each(camposDeFluxo)("rejeita $descricao", ({ mutar }) => {
    esperarInvalido(comCampo(mutar));
  });
});

describe("RN-013 — schema fechado rejeita valores monetários (R$)", () => {
  const camposDeReais: { descricao: string; mutar: (doc: Mutavel) => void }[] = [
    {
      descricao: "tarifa_reais no Serviço",
      mutar: (doc) => (doc.autos.servicos[0].tarifa_reais = 7.9),
    },
    {
      descricao: "valor_reais em par de seccionamento",
      mutar: (doc) => (doc.autos.servicos[0].matriz_seccionamento[0].valor_reais = 6.05),
    },
    {
      descricao: "preco em par de matriz_distancias",
      mutar: (doc) => (doc.autos.servicos[0].matriz_distancias[0].preco = 10),
    },
  ];

  it.each(camposDeReais)("rejeita $descricao", ({ mutar }) => {
    esperarInvalido(comCampo(mutar));
  });
});

// Reaproveita o catálogo canônico (TASK-041) como fonte única das mutações por
// RN, garantindo que a regressão fica atrelada às mesmas fixtures inválidas das
// demais suítes — sem duplicar mutações que envelheceriam em separado.
describe("RN-010/RN-013 — variantes canônicas continuam rejeitadas", () => {
  const alvo = VARIANTES_INVALIDAS.filter(
    (v) => v.rn === "RN-010" || v.rn === "RN-013",
  );

  it("o catálogo cobre RN-010 e RN-013", () => {
    expect(alvo.map((v) => v.rn).sort()).toEqual(["RN-010", "RN-013"]);
  });

  it.each(alvo)("$rn: $descricao é rejeitada", ({ construir }) => {
    expect(esquemaDocumentoOperacao.safeParse(construir()).success).toBe(false);
  });
});
