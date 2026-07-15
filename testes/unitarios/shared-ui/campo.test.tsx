// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Campo } from "@/shared/ui/campo";
import { renderizar } from "./_ajuda-render";

describe("Campo", () => {
  it("associa o rótulo ao controle via htmlFor/id gerado (useId)", () => {
    const { container, desmontar } = renderizar(<Campo rotulo="Nome" />);
    const rotulo = container.querySelector("label")!;
    const entrada = container.querySelector("input")!;
    expect(rotulo.getAttribute("for")).toBe(entrada.id);
    expect(entrada.id).not.toBe("");
    expect(rotulo.textContent).toBe("Nome");
    desmontar();
  });

  it("usa o id explícito quando fornecido, em vez de gerar um novo", () => {
    const { container, desmontar } = renderizar(
      <Campo rotulo="Empresa" id="campo-empresa" />,
    );
    const entrada = container.querySelector("input")!;
    const rotulo = container.querySelector("label")!;
    expect(entrada.id).toBe("campo-empresa");
    expect(rotulo.getAttribute("for")).toBe("campo-empresa");
    desmontar();
  });

  it("exibe a mensagem de erro e marca borda/aria-invalid", () => {
    const { container, desmontar } = renderizar(
      <Campo rotulo="Código" erro="Código obrigatório" />,
    );
    const entrada = container.querySelector("input")!;
    expect(entrada.className).toContain("border-erro");
    expect(entrada.getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Código obrigatório");
    desmontar();
  });

  it("sem erro, usa a borda neutra e não marca aria-invalid", () => {
    const { container, desmontar } = renderizar(<Campo rotulo="Nome" />);
    const entrada = container.querySelector("input")!;
    expect(entrada.className).toContain("border-cinza-200");
    expect(entrada.getAttribute("aria-invalid")).toBeNull();
    desmontar();
  });

  it("repassa props nativas (data-testid, placeholder, value)", () => {
    const { container, desmontar } = renderizar(
      <Campo
        rotulo="Nome"
        data-testid="campo-nome"
        placeholder="Digite o nome"
        value="ROTA"
        onChange={() => {}}
      />,
    );
    const entrada = container.querySelector(
      '[data-testid="campo-nome"]',
    ) as HTMLInputElement;
    expect(entrada.placeholder).toBe("Digite o nome");
    expect(entrada.value).toBe("ROTA");
    desmontar();
  });

  it("funciona sem rótulo (não renderiza <label>)", () => {
    const { container, desmontar } = renderizar(<Campo data-testid="sem-rotulo" />);
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector('[data-testid="sem-rotulo"]')).not.toBeNull();
    desmontar();
  });
});
