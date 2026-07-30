// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { Botao } from "@/shared/ui/botao";
import { renderizar } from "./_ajuda-render";

describe("Botao", () => {
  it("usa a variante secundário por padrão", () => {
    const { container, desmontar } = renderizar(<Botao>Salvar</Botao>);
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("border-cinza-200");
    desmontar();
  });

  it("aplica as classes da variante primário", () => {
    const { container, desmontar } = renderizar(
      <Botao variante="primario">Confirmar</Botao>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("bg-azul-600");
    expect(botao.className).toContain("hover:bg-azul-700");
    desmontar();
  });

  it("aplica as classes da variante perigo", () => {
    const { container, desmontar } = renderizar(
      <Botao variante="perigo">Excluir</Botao>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("bg-erro");
    desmontar();
  });

  it("aplica as classes da variante fantasma", () => {
    const { container, desmontar } = renderizar(
      <Botao variante="fantasma">Cancelar</Botao>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("hover:bg-cinza-100");
    expect(botao.className).not.toContain("border-cinza-200");
    desmontar();
  });

  it("aplica a variante alternador azul-clara da DEC-093", () => {
    const { container, desmontar } = renderizar(
      <Botao variante="alternador">Headway</Botao>,
    );
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("bg-azul-100");
    expect(botao.className).toContain("border-azul-300");
    desmontar();
  });

  it("repassa data-testid e demais props nativas", () => {
    const { container, desmontar } = renderizar(
      <Botao data-testid="botao-salvar" aria-label="Salvar formulário">
        Salvar
      </Botao>,
    );
    const botao = container.querySelector(
      '[data-testid="botao-salvar"]',
    ) as HTMLButtonElement;
    expect(botao).not.toBeNull();
    expect(botao.getAttribute("aria-label")).toBe("Salvar formulário");
    desmontar();
  });

  it("usa type=button por padrão, sem sobrescrever type explícito", () => {
    const { container, desmontar } = renderizar(
      <>
        <Botao data-testid="btn-default">Padrão</Botao>
        <Botao data-testid="btn-submit" type="submit">
          Enviar
        </Botao>
      </>,
    );
    expect(
      container.querySelector('[data-testid="btn-default"]')?.getAttribute("type"),
    ).toBe("button");
    expect(
      container.querySelector('[data-testid="btn-submit"]')?.getAttribute("type"),
    ).toBe("submit");
    desmontar();
  });

  it("não dispara onClick quando desabilitado", () => {
    const aoClicar = vi.fn();
    const { container, desmontar } = renderizar(
      <Botao disabled onClick={aoClicar} data-testid="botao-desabilitado">
        Indisponível
      </Botao>,
    );
    const botao = container.querySelector(
      '[data-testid="botao-desabilitado"]',
    ) as HTMLButtonElement;
    botao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(aoClicar).not.toHaveBeenCalled();
    desmontar();
  });

  it("dispara onClick quando habilitado", () => {
    const aoClicar = vi.fn();
    const { container, desmontar } = renderizar(
      <Botao onClick={aoClicar} data-testid="botao-habilitado">
        Confirmar
      </Botao>,
    );
    const botao = container.querySelector(
      '[data-testid="botao-habilitado"]',
    ) as HTMLButtonElement;
    botao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    desmontar();
  });

  it("usa o tamanho padrão (px-4 py-2) quando a prop não é informada", () => {
    const { container, desmontar } = renderizar(<Botao>Salvar</Botao>);
    const botao = container.querySelector("button")!;
    expect(botao.className).toContain("px-4");
    expect(botao.className).toContain("py-2");
    desmontar();
  });

  it("aplica o tamanho compacto (DEC-073/TASK-091) sem alterar variante/handlers", () => {
    const aoClicar = vi.fn();
    const { container, desmontar } = renderizar(
      <Botao tamanho="compacto" variante="fantasma" onClick={aoClicar} data-testid="botao-x">
        ✕
      </Botao>,
    );
    const botao = container.querySelector(
      '[data-testid="botao-x"]',
    ) as HTMLButtonElement;
    expect(botao.className).toContain("px-2");
    expect(botao.className).toContain("py-1");
    expect(botao.className).not.toContain("px-4");
    expect(botao.className).toContain("hover:bg-cinza-100");
    botao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    desmontar();
  });
});
