import { describe, expect, test } from "vitest";
import {
  numeroNComCaracteristica,
  regenerarSufixoNumeroN,
  sugerirNumeroN,
} from "@/formulario/servicos/numero-n";

// TASK-016 — `numero_n` de Serviço (RN-006; DEC-037; Spec 02 §6; Spec 03 §10.3
// regra 5). Categoria 2/10 (domínio, puro). Nenhum toque em rede/OSRM.

describe("sugerirNumeroN — sequencial por ordem de cadastro (RN-006)", () => {
  test("lista vazia começa em 1, com o código e o sufixo da característica", () => {
    expect(sugerirNumeroN("1000", [], "CR")).toBe("1000-1CR");
  });

  test("usa o maior sequencial existente + 1, ignorando o sufixo de característica", () => {
    expect(sugerirNumeroN("1000", ["1000-1CR", "1000-2EX"], "LE")).toBe(
      "1000-3LE",
    );
  });

  test("o sequencial vem do número, não da ordem do array", () => {
    expect(sugerirNumeroN("1000", ["1000-5CR", "1000-2EX"], "MX")).toBe(
      "1000-6MX",
    );
  });

  test("rótulos sem sequencial reconhecível não contam (caso inválido)", () => {
    // Rótulo livre sem dígitos → tratado como sem sequencial; sugestão volta a 1.
    expect(sugerirNumeroN("1000", ["rótulo-livre"], "CR")).toBe("1000-1CR");
  });
});

describe("regenerarSufixoNumeroN — troca de sufixo preservando o sequencial (DEC-037)", () => {
  test("substitui o código de característica do fim, mantendo código-sequencial", () => {
    expect(regenerarSufixoNumeroN("1000-2ME", "CL")).toBe("1000-2CL");
  });

  test("respeita códigos longos antes de curtos (SUL antes de SU)", () => {
    expect(regenerarSufixoNumeroN("1000-3SUL", "SU")).toBe("1000-3SU");
    expect(regenerarSufixoNumeroN("1000-1MML", "MM")).toBe("1000-1MM");
  });

  test("rótulo sem sufixo conhecido apenas anexa a característica (não lança)", () => {
    // Caso de rótulo importado fora da convenção: nunca lança (RN-006 — display).
    expect(regenerarSufixoNumeroN("N01", "CL")).toBe("N01CL");
  });

  test("numeroNComCaracteristica é o atalho sobre o campo do Serviço", () => {
    expect(numeroNComCaracteristica({ numero_n: "1000-2ME" }, "CL")).toBe(
      "1000-2CL",
    );
  });
});
