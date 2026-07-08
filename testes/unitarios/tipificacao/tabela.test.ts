import { describe, expect, it } from "vitest";
import {
  CARACTERISTICAS_DE_VEICULO,
  TIPOS_DE_AUTOS,
} from "../../../src/shared/contrato/esquema";
import {
  caracteristicaPermitida,
  caracteristicasPermitidas,
  familiaDoTipo,
  servicosIncompativeisComTipo,
  TABELA_TIPIFICACAO,
  validarConjuntoDeCaracteristicas,
} from "../../../src/shared/tipificacao";

// Unitários (categoria 2, docs-dev/08) — tabela de tipificação inteira,
// válidos e inválidos (Spec 03 §10). Módulo puro: sem schema, sem OSRM.

describe("família por tipo (RN-019, Spec 03 §10.1)", () => {
  it("semiurbanos pertencem à família semiurbana", () => {
    expect(familiaDoTipo("Semiurbano")).toBe("semiurbana");
    expect(familiaDoTipo("Semiurbano Litorâneo")).toBe("semiurbana");
  });

  it("rodoviários pertencem à família rodoviária", () => {
    expect(familiaDoTipo("Rodoviário")).toBe("rodoviaria");
    expect(familiaDoTipo("Rodoviário Litorâneo")).toBe("rodoviaria");
  });
});

describe("características permitidas por tipo (Spec 03 §10.2)", () => {
  it("Semiurbano só admite SU (veículo único)", () => {
    expect(caracteristicasPermitidas("Semiurbano")).toEqual(["SU"]);
  });

  it("Semiurbano Litorâneo só admite SUL (veículo único)", () => {
    expect(caracteristicasPermitidas("Semiurbano Litorâneo")).toEqual(["SUL"]);
  });

  it("Rodoviário admite CR, EX, LE, ME, ML, MX, MM", () => {
    expect([...caracteristicasPermitidas("Rodoviário")].sort()).toEqual(
      ["CR", "EX", "LE", "ME", "ML", "MM", "MX"].sort(),
    );
  });

  it("Rodoviário Litorâneo admite CL, EX, LE, MEL, MLL, MX, MML", () => {
    expect([...caracteristicasPermitidas("Rodoviário Litorâneo")].sort()).toEqual(
      ["CL", "EX", "LE", "MEL", "MLL", "MML", "MX"].sort(),
    );
  });
});

describe("caracteristicaPermitida — matriz completa (RN-019/021/022)", () => {
  // Válidos: cada característica da linha do tipo é aceita.
  const casosValidos: [
    (typeof TIPOS_DE_AUTOS)[number],
    (typeof CARACTERISTICAS_DE_VEICULO)[number],
  ][] = TIPOS_DE_AUTOS.flatMap((tipo) =>
    caracteristicasPermitidas(tipo).map(
      (c) => [tipo, c] as [
        (typeof TIPOS_DE_AUTOS)[number],
        (typeof CARACTERISTICAS_DE_VEICULO)[number],
      ],
    ),
  );

  it.each(casosValidos)("aceita %s → %s", (tipo, caracteristica) => {
    expect(caracteristicaPermitida(tipo, caracteristica)).toBe(true);
  });

  // Inválidos: toda combinação fora da tabela é recusada.
  const casosInvalidos = TIPOS_DE_AUTOS.flatMap((tipo) =>
    CARACTERISTICAS_DE_VEICULO.filter(
      (c) => !caracteristicasPermitidas(tipo).includes(c),
    ).map((c) => [tipo, c] as const),
  );

  it.each(casosInvalidos)("recusa %s → %s", (tipo, caracteristica) => {
    expect(caracteristicaPermitida(tipo, caracteristica)).toBe(false);
  });
});

describe("família cruzada recusada (RN-019)", () => {
  it("SU em Rodoviário é recusado", () => {
    expect(caracteristicaPermitida("Rodoviário", "SU")).toBe(false);
  });

  it("SUL em Rodoviário Litorâneo é recusado", () => {
    expect(caracteristicaPermitida("Rodoviário Litorâneo", "SUL")).toBe(false);
  });

  it("CR em Semiurbano é recusado (SU não é rodoviária)", () => {
    expect(caracteristicaPermitida("Semiurbano", "CR")).toBe(false);
  });

  it("EX (rodoviária) em Semiurbano é recusado", () => {
    expect(caracteristicaPermitida("Semiurbano", "EX")).toBe(false);
  });
});

describe("litoralidade e exclusividade do convencional (RN-022)", () => {
  it("mistos não-litorâneos ME/ML/MM recusados em Rodoviário Litorâneo", () => {
    expect(caracteristicaPermitida("Rodoviário Litorâneo", "ME")).toBe(false);
    expect(caracteristicaPermitida("Rodoviário Litorâneo", "ML")).toBe(false);
    expect(caracteristicaPermitida("Rodoviário Litorâneo", "MM")).toBe(false);
  });

  it("mistos litorâneos MEL/MLL/MML recusados em Rodoviário", () => {
    expect(caracteristicaPermitida("Rodoviário", "MEL")).toBe(false);
    expect(caracteristicaPermitida("Rodoviário", "MLL")).toBe(false);
    expect(caracteristicaPermitida("Rodoviário", "MML")).toBe(false);
  });

  it("CR recusado em Rodoviário Litorâneo; CL recusado em Rodoviário", () => {
    expect(caracteristicaPermitida("Rodoviário Litorâneo", "CR")).toBe(false);
    expect(caracteristicaPermitida("Rodoviário", "CL")).toBe(false);
  });

  it("EX/LE/MX são neutros — aceitos nos dois tipos rodoviários", () => {
    for (const c of ["EX", "LE", "MX"] as const) {
      expect(caracteristicaPermitida("Rodoviário", c)).toBe(true);
      expect(caracteristicaPermitida("Rodoviário Litorâneo", c)).toBe(true);
    }
  });
});

describe("SL não existe (DEC-026)", () => {
  it("não está no enum de características", () => {
    expect(CARACTERISTICAS_DE_VEICULO).not.toContain("SL");
  });
});

describe("validarConjuntoDeCaracteristicas — conjunto de Serviços (Spec 03 §10.3)", () => {
  it("aceita conjunto vazio", () => {
    expect(validarConjuntoDeCaracteristicas("Rodoviário", [])).toEqual([]);
  });

  it("RN-020: Semiurbano com todos SU é válido", () => {
    expect(
      validarConjuntoDeCaracteristicas("Semiurbano", ["SU", "SU", "SU"]),
    ).toEqual([]);
  });

  it("RN-020: Semiurbano com SU e SUL é recusado (veículo único)", () => {
    const violacoes = validarConjuntoDeCaracteristicas("Semiurbano", [
      "SU",
      "SUL",
    ]);
    // SUL é fora da família E o conjunto viola veículo único.
    expect(violacoes.some((v) => v.mensagem.includes("[RN-020]"))).toBe(true);
    expect(violacoes.some((v) => v.mensagem.includes("[RN-019/021/022]"))).toBe(
      true,
    );
  });

  it("RN-021: Rodoviário aceita variação dentro do conjunto (CR, EX, LE)", () => {
    expect(
      validarConjuntoDeCaracteristicas("Rodoviário", ["CR", "EX", "LE"]),
    ).toEqual([]);
  });

  it("RN-021: CR + CL juntos são recusados (exigem tipos diferentes)", () => {
    // Em Rodoviário, CL é proibido; em Rodoviário Litorâneo, CR é proibido.
    const emRodoviario = validarConjuntoDeCaracteristicas("Rodoviário", [
      "CR",
      "CL",
    ]);
    expect(emRodoviario).toHaveLength(1);
    expect(emRodoviario[0].caracteristica).toBe("CL");

    const emLitoraneo = validarConjuntoDeCaracteristicas("Rodoviário Litorâneo", [
      "CR",
      "CL",
    ]);
    expect(emLitoraneo).toHaveLength(1);
    expect(emLitoraneo[0].caracteristica).toBe("CR");
  });

  it("aponta o índice do Serviço com característica inválida", () => {
    const violacoes = validarConjuntoDeCaracteristicas("Rodoviário", [
      "CR",
      "SU",
      "EX",
    ]);
    expect(violacoes).toHaveLength(1);
    expect(violacoes[0].indice).toBe(1);
    expect(violacoes[0].caracteristica).toBe("SU");
  });
});

describe("servicosIncompativeisComTipo — revalidação ao trocar tipo (RN-023)", () => {
  it("troca Rodoviário → Semiurbano: CR e EX ficam incompatíveis, SU some da lista", () => {
    // Cenário: Serviços [CR, EX] ao mudar o tipo para Semiurbano.
    expect(
      servicosIncompativeisComTipo("Semiurbano", ["CR", "EX"]),
    ).toEqual([0, 1]);
  });

  it("troca de litoralidade Rodoviário → Rodoviário Litorâneo: só CR/ME incompatíveis", () => {
    // EX é neutro (índice 1 permanece válido); CR (0) e ME (2) violam.
    expect(
      servicosIncompativeisComTipo("Rodoviário Litorâneo", ["CR", "EX", "ME"]),
    ).toEqual([0, 2]);
  });

  it("conjunto já compatível com o novo tipo não retorna nada", () => {
    expect(
      servicosIncompativeisComTipo("Rodoviário", ["CR", "EX", "MX"]),
    ).toEqual([]);
  });
});

describe("completude da partição fechada (Spec 03 §10.2, DEC-026)", () => {
  it("a tabela cobre exatamente os 4 tipos do enum", () => {
    expect(Object.keys(TABELA_TIPIFICACAO).sort()).toEqual(
      [...TIPOS_DE_AUTOS].sort(),
    );
  });

  it("toda caracteristica_veiculo do enum é permitida em ao menos um tipo", () => {
    for (const c of CARACTERISTICAS_DE_VEICULO) {
      const aparece = TIPOS_DE_AUTOS.some((tipo) =>
        caracteristicaPermitida(tipo, c),
      );
      expect(aparece, `característica ${c} sem tipo`).toBe(true);
    }
  });

  it("nenhuma característica permitida está fora do enum do contrato", () => {
    for (const tipo of TIPOS_DE_AUTOS) {
      for (const c of caracteristicasPermitidas(tipo)) {
        expect(CARACTERISTICAS_DE_VEICULO).toContain(c);
      }
    }
  });
});
