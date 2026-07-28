// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Dialogo } from "@/shared/ui";
import { act, renderizar } from "./_ajuda-render";

describe("Dialogo", () => {
  it("expõe semântica modal e recebe foco ao abrir", () => {
    const { container, desmontar } = renderizar(
      <Dialogo titulo="Copiar SEG para" aoFechar={vi.fn()}>
        <p>Conteúdo</p>
      </Dialogo>,
    );
    const dialogo = container.querySelector('[role="dialog"]') as HTMLDivElement;

    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(dialogo.getAttribute("aria-label")).toBe("Copiar SEG para");
    expect(document.activeElement).toBe(dialogo);
    desmontar();
  });

  it("fecha por Escape e clique no fundo sem fechar pelo conteúdo", () => {
    const aoFechar = vi.fn();
    const { container, desmontar } = renderizar(
      <Dialogo titulo="Confirmar" aoFechar={aoFechar}>
        <p>Conteúdo</p>
      </Dialogo>,
    );
    const fundo = container.firstElementChild as HTMLDivElement;

    act(() => fundo.querySelector("p")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(aoFechar).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(aoFechar).toHaveBeenCalledTimes(1);
    act(() => fundo.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(aoFechar).toHaveBeenCalledTimes(2);
    desmontar();
  });
});
