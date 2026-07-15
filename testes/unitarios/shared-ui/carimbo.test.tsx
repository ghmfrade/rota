// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Carimbo } from "@/shared/ui/carimbo";
import { renderizar } from "./_ajuda-render";

describe("Carimbo", () => {
  it("usa as classes de repouso por padrão", () => {
    const { container, desmontar } = renderizar(
      <Carimbo rotulo="Identificação">
        <svg />
      </Carimbo>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("border-cinza-500");
    expect(botao.className).toContain("text-cinza-500");
    expect(botao.className).not.toContain("bg-azul-600");
    desmontar();
  });

  it("usa as classes de estado ativo quando ativo=true", () => {
    const { container, desmontar } = renderizar(
      <Carimbo rotulo="Identificação" ativo>
        <svg />
      </Carimbo>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("bg-azul-600");
    expect(botao.className).toContain("border-azul-600");
    expect(botao.className).toContain("text-white");
    expect(botao.className).toContain("shadow-sombra-2");
    desmontar();
  });

  it("renderiza o ícone recebido via children", () => {
    const { container, desmontar } = renderizar(
      <Carimbo rotulo="Serviços">
        <svg data-testid="icone-servicos" />
      </Carimbo>,
    );
    expect(
      container.querySelector('[data-testid="icone-servicos"]'),
    ).not.toBeNull();
    desmontar();
  });

  it("usa rotulo como aria-label do botão", () => {
    const { container, desmontar } = renderizar(
      <Carimbo rotulo="Etapa Viagens">
        <svg />
      </Carimbo>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.getAttribute("aria-label")).toBe("Etapa Viagens");
    desmontar();
  });

  it("repassa data-testid, aria-current e demais props nativas", () => {
    const { container, desmontar } = renderizar(
      <Carimbo
        rotulo="Etapa Matrizes"
        data-testid="carimbo-matrizes"
        aria-current="step"
      >
        <svg />
      </Carimbo>,
    );
    const botao = container.querySelector(
      '[data-testid="carimbo-matrizes"]',
    )!;
    expect(botao.getAttribute("aria-current")).toBe("step");
    desmontar();
  });
});
