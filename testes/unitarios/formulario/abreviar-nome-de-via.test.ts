import { describe, expect, test } from "vitest";
import {
  abreviarNomeDeVia,
  LIMITE_PADRAO_NOME_SUGERIDO,
} from "@/formulario/nomeacao";

// TASK-130 — abreviação de nome de via para a sugestão de nome de Seção/Local
// (Q-090/DEC-112). Função pura: sem UI, sem rede, sem contrato JSON. Os
// comprimentos são conferidos explicitamente (Array.from — code points).

const comprimento = (texto: string) => Array.from(texto).length;

describe("abreviarNomeDeVia — casos válidos", () => {
  test("cabe sem abreviar as demais palavras", () => {
    const resultado = abreviarNomeDeVia("Avenida Paulista");
    expect(resultado).toBe("Av. Paulista");
    expect(comprimento(resultado)).toBe(12);
  });

  test("corte igualitário com L=6 (L=7 não caberia)", () => {
    const resultado = abreviarNomeDeVia("Rua Francisco Aureliano Paiva");
    expect(resultado).toBe("R. Franci. Aureli. Paiva");
    expect(comprimento(resultado)).toBe(24);
    expect(comprimento(resultado)).toBeLessThanOrEqual(LIMITE_PADRAO_NOME_SUGERIDO);
  });

  test("corte igualitário desce até L=5, exatamente no limite", () => {
    const resultado = abreviarNomeDeVia("Rodovia Presidente Castelo Branco");
    expect(resultado).toBe("Rod. Presi. Caste. Branco");
    expect(comprimento(resultado)).toBe(25);
  });

  test("etapa de exceção reduz a primeira palavra do corpo abaixo de 5", () => {
    const resultado = abreviarNomeDeVia("Avenida Engenheiro Luís Carlos Berrini");
    expect(resultado).toBe("Av. E. Luís Carlos Berri.");
    expect(comprimento(resultado)).toBe(25);
  });

  test("espaços normalizados; conectivo curto intacto", () => {
    expect(abreviarNomeDeVia("  Rua   dos  Andradas ")).toBe("R. dos Andradas");
  });

  test("acento preservado na saída; reconhecimento do tipo é insensível a acento", () => {
    expect(abreviarNomeDeVia("Praça da Sé")).toBe("Pç. da Sé");
  });

  test("tipo desconhecido é tratado como palavra comum", () => {
    expect(abreviarNomeDeVia("Anhanguera")).toBe("Anhanguera");
  });

  test.each([
    ["Rua", "R."],
    ["RUA", "R."],
    ["rua", "R."],
    ["Avenida", "Av."],
    ["AVENIDA", "Av."],
    ["Rodovia", "Rod."],
    ["RODOVIA", "Rod."],
    ["Estrada", "Estr."],
    ["ESTRADA", "Estr."],
    ["Praça", "Pç."],
    ["PRACA", "Pç."],
    ["Alameda", "Al."],
    ["ALAMEDA", "Al."],
    ["Travessa", "Tv."],
    ["TRAVESSA", "Tv."],
    ["Largo", "Lgo."],
    ["LARGO", "Lgo."],
    ["Marginal", "Marg."],
    ["MARGINAL", "Marg."],
    ["Viaduto", "Vd."],
    ["VIADUTO", "Vd."],
    ["Via", "Via"],
    ["VIA", "Via"],
  ])("tabela de tipos: %s -> %s", (tipo, sigla) => {
    expect(abreviarNomeDeVia(`${tipo} Nome`)).toBe(`${sigla} Nome`);
  });

  test("tabela de tipos tem exatamente 11 pares (fechada nesta task)", () => {
    // Cobertura indireta: os 11 tipos acima e nenhum outro é reconhecido.
    expect(abreviarNomeDeVia("Rodoanel Nome")).toBe("Rodoanel Nome");
  });
});

describe("abreviarNomeDeVia — casos inválidos", () => {
  test.each([
    ["", ""],
    ["   ", ""],
    [undefined, ""],
  ])("entrada %j devolve string vazia, nunca lança", (entrada, esperado) => {
    expect(abreviarNomeDeVia(entrada)).toBe(esperado);
  });

  test("palavra única patologicamente longa é truncada, sem exceção", () => {
    const nomeGigante = "A".repeat(60);
    const resultado = abreviarNomeDeVia(nomeGigante);
    expect(comprimento(resultado)).toBeLessThanOrEqual(25);
    expect(resultado).toBe("A".repeat(25));
  });

  test("vírgula de borda é removida antes da contagem", () => {
    expect(abreviarNomeDeVia("Rua Andradas,")).toBe("R. Andradas");
  });

  test("nunca lança e nunca devolve 'undefined' ou marcador genérico", () => {
    expect(() => abreviarNomeDeVia(undefined)).not.toThrow();
    expect(abreviarNomeDeVia(undefined)).not.toContain("undefined");
    expect(abreviarNomeDeVia(undefined)).not.toBe("Via sem nome");
  });

  test("propriedade: saída nunca excede o limite, em vários limites", () => {
    const nomes = [
      "Rua Francisco Aureliano Paiva",
      "Avenida Paulista",
      "Rodovia Presidente Castelo Branco",
      "Avenida Engenheiro Luís Carlos Berrini",
      "Rua dos Andradas",
      "Praça da Sé",
      "Anhanguera",
      "Estrada Municipal do Barreiro Velho",
      "Alameda Santos",
      "Travessa São Bento",
      "Largo do Paissandu",
      "Marginal Pinheiros",
      "Viaduto do Chá",
      "Via Anchieta",
      "Rua Vergueiro",
      "Avenida Nove de Julho",
      "Rua Doutor Fernandes Coelho",
      "Rodovia dos Bandeirantes",
      "Avenida Brigadeiro Faria Lima",
      "Rua Cardeal Arcoverde",
      "Avenida Rebouças",
      "Rua Teodoro Sampaio",
      "Avenida Angélica",
      "Rua Bela Cintra",
      "Avenida Higienópolis",
      "Rua Consolação",
      "Avenida São João",
      "Rua Augusta",
      "Avenida Ipiranga",
      "Rua da Consolação",
    ];
    for (const limite of [10, 15, 25, 40]) {
      for (const nome of nomes) {
        const resultado = abreviarNomeDeVia(nome, limite);
        expect(comprimento(resultado)).toBeLessThanOrEqual(limite);
      }
    }
  });

  test("corte igualitário nunca abrevia palavra de até 5 caracteres", () => {
    // Com limite=13 o corte igualitário (L=5) já resolve, sem etapa de exceção:
    // "Andradas" (8) é abreviada; "dos" (3) permanece intacto.
    const resultado = abreviarNomeDeVia("Rua dos Andradas", 13);
    expect(resultado).toBe("R. dos Andra.");
    expect(comprimento(resultado)).toBe(13);
  });

  test("pureza: mesma entrada produz sempre a mesma saída", () => {
    const nome = "Rua Francisco Aureliano Paiva";
    expect(abreviarNomeDeVia(nome)).toBe(abreviarNomeDeVia(nome));
  });
});
