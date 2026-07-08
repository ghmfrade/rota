import { expect } from "vitest";
import { esquemaDocumentoOperacao } from "@/shared/contrato";
import fixtura from "../../fixtures/spec02-15-exemplo-minimo.json";

// As mutações dirigidas precisam de tipagem livre — o objetivo é justamente
// produzir documentos estruturalmente inválidos, impossíveis nos tipos do
// contrato.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocumentoMutavel = any;

/** Cópia profunda do exemplo mínimo da Spec 02 §15, pronta para mutação. */
export function documentoDaFixture(): DocumentoMutavel {
  return structuredClone(fixtura);
}

export function esperarValido(documento: unknown): void {
  const resultado = esquemaDocumentoOperacao.safeParse(documento);
  const mensagens = resultado.success
    ? ""
    : resultado.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
  expect(resultado.success, `documento deveria ser válido:\n${mensagens}`).toBe(
    true,
  );
}

export function esperarInvalido(
  documento: unknown,
  trechoDaMensagem?: string,
): void {
  const resultado = esquemaDocumentoOperacao.safeParse(documento);
  expect(resultado.success, "documento deveria ser inválido").toBe(false);
  if (!resultado.success && trechoDaMensagem) {
    const mensagens = resultado.error.issues
      .map((issue) => issue.message)
      .join("\n");
    expect(mensagens).toContain(trechoDaMensagem);
  }
}
