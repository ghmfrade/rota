import { describe, expect, test } from "vitest";
import { mensagemDeFalha, type FalhaOsrm } from "@/formulario/roteamento";

// TASK-022 — camada de mensagens da taxonomia de falha do OSRM (Spec 04 §14;
// Spec 03 §3.5; RN-049). Foco: cada falha vira um texto operacional e NENHUMA
// menciona tarifa (RN-049) — o teste-chave pedido pela task.

/** Todas as variantes de FalhaOsrm, para a verificação exaustiva anti-tarifa. */
const TODAS_AS_FALHAS: FalhaOsrm[] = [
  { tipo: "indisponivel" },
  { tipo: "sem-rota" },
  { tipo: "sem-segmento" },
  { tipo: "sem-segmento", indiceCoordenada: 2 },
  { tipo: "codigo-inesperado", code: "InvalidQuery" },
];

describe("mensagemDeFalha — textos por tipo (Spec 04 §14)", () => {
  test("indisponivel → fala só do serviço de rotas", () => {
    expect(mensagemDeFalha({ tipo: "indisponivel" })).toBe(
      "Serviço de cálculo de rotas temporariamente indisponível — tente novamente em instantes.",
    );
  });

  test("sem-rota → aponta o problema de traçado", () => {
    expect(mensagemDeFalha({ tipo: "sem-rota" })).toBe(
      "Não há caminho viário entre as paradas na ordem definida. Revise a ordem ou as posições.",
    );
  });

  test("sem-segmento com índice → identifica a parada pelo número (1-based)", () => {
    // indiceCoordenada 0-based; a mensagem humaniza para nº 3.
    expect(mensagemDeFalha({ tipo: "sem-segmento", indiceCoordenada: 2 })).toBe(
      "A parada nº 3 não pôde ser associada a uma via. Arraste o ponto para mais perto de uma rua.",
    );
  });

  test("sem-segmento sem índice → forma genérica (não inventa qual parada)", () => {
    expect(mensagemDeFalha({ tipo: "sem-segmento" })).toBe(
      "Uma das paradas não pôde ser associada a uma via. Arraste o ponto para mais perto de uma rua.",
    );
  });

  test("codigo-inesperado → mensagem genérica com o código retornado (§3.5 linha 4)", () => {
    expect(mensagemDeFalha({ tipo: "codigo-inesperado", code: "InvalidQuery" })).toContain(
      "InvalidQuery",
    );
  });
});

describe("mensagemDeFalha — nenhuma mensagem menciona tarifa (RN-049)", () => {
  test("[inválido] todas as falhas: sem 'tarifa'/'tarif'/'R$'/'reais'", () => {
    for (const falha of TODAS_AS_FALHAS) {
      const mensagem = mensagemDeFalha(falha).toLowerCase();
      expect(mensagem).not.toMatch(/tarif|r\$|reais/);
    }
  });
});
