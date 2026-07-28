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

  it("contém Tab e Shift+Tab entre os controles focáveis", () => {
    const { container, desmontar } = renderizar(
      <Dialogo titulo="Confirmar" aoFechar={vi.fn()}>
        <button type="button">Primeiro</button>
        <button type="button">Último</button>
      </Dialogo>,
    );
    const botoes = container.querySelectorAll("button");

    act(() => botoes[1].focus());
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
    expect(document.activeElement).toBe(botoes[0]);

    act(() => botoes[0].focus());
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
      ),
    );
    expect(document.activeElement).toBe(botoes[1]);
    desmontar();
  });

  it("mantém o foco em nova renderização, usa o callback vigente e restaura o acionador ao fechar", () => {
    const acionador = document.createElement("button");
    document.body.appendChild(acionador);
    acionador.focus();
    const aoFecharInicial = vi.fn();
    const aoFecharVigente = vi.fn();
    const { container, rerenderizar, desmontar } = renderizar(
      <Dialogo titulo="Copiar" aoFechar={aoFecharInicial}>
        <button type="button">SEG</button>
      </Dialogo>,
    );
    const botaoDia = container.querySelector("button") as HTMLButtonElement;

    act(() => botaoDia.focus());
    rerenderizar(
      <Dialogo titulo="Copiar" aoFechar={aoFecharVigente}>
        <button type="button">SEG selecionada</button>
      </Dialogo>,
    );

    expect(document.activeElement).toBe(botaoDia);
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(aoFecharInicial).not.toHaveBeenCalled();
    expect(aoFecharVigente).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(botaoDia);

    desmontar();
    expect(document.activeElement).toBe(acionador);
    acionador.remove();
  });
});
