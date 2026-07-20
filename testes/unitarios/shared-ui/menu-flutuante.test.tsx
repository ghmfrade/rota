// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { MenuFlutuante } from "@/shared/ui";
import { act, renderizar } from "./_ajuda-render";

const ANCORA = { x: 120, y: 80 };

function montar() {
  const aoEscolherSecao = vi.fn();
  const aoEscolherLocal = vi.fn();
  const aoFechar = vi.fn();
  const resultado = renderizar(
    <MenuFlutuante
      data-testid="menu-teste"
      rotuloAcessivel="Escolher tipo de Parada"
      ancora={ANCORA}
      aoFechar={aoFechar}
      opcoes={[
        { id: "secao", rotulo: "Seção", aoSelecionar: aoEscolherSecao },
        { id: "local", rotulo: "Local", aoSelecionar: aoEscolherLocal },
      ]}
    />,
  );
  return { ...resultado, aoEscolherSecao, aoEscolherLocal, aoFechar };
}

function tecla(alvo: Element, key: string) {
  act(() => {
    alvo.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("MenuFlutuante", () => {
  it("exibe exatamente as duas opções e foca a primeira ao abrir", () => {
    const { container, desmontar } = montar();
    const menu = container.querySelector('[role="menu"]')!;
    const opcoes = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

    expect(menu.getAttribute("aria-label")).toBe("Escolher tipo de Parada");
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(["Seção", "Local"]);
    expect(document.activeElement).toBe(opcoes[0]);
    expect((menu as HTMLElement).style.left).toBe("120px");
    expect((menu as HTMLElement).style.top).toBe("80px");
    desmontar();
  });

  it("seleciona uma opção e solicita o fechamento", () => {
    const { container, aoEscolherLocal, aoEscolherSecao, aoFechar, desmontar } = montar();
    const local = [...container.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === "Local",
    )!;

    act(() => local.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(aoEscolherLocal).toHaveBeenCalledTimes(1);
    expect(aoEscolherSecao).not.toHaveBeenCalled();
    expect(aoFechar).toHaveBeenCalledTimes(1);
    desmontar();
  });

  it("ArrowDown/ArrowUp navegam e Esc fecha sem selecionar [inválido]", () => {
    const { container, aoEscolherLocal, aoEscolherSecao, aoFechar, desmontar } = montar();
    const menu = container.querySelector('[role="menu"]')!;
    const opcoes = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

    tecla(menu, "ArrowDown");
    expect(document.activeElement).toBe(opcoes[1]);
    tecla(menu, "ArrowUp");
    expect(document.activeElement).toBe(opcoes[0]);
    tecla(menu, "Escape");

    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(aoEscolherSecao).not.toHaveBeenCalled();
    expect(aoEscolherLocal).not.toHaveBeenCalled();
    desmontar();
  });

  it("clique fora fecha sem selecionar [inválido]", () => {
    const { aoEscolherLocal, aoEscolherSecao, aoFechar, desmontar } = montar();

    act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));

    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(aoEscolherSecao).not.toHaveBeenCalled();
    expect(aoEscolherLocal).not.toHaveBeenCalled();
    desmontar();
  });
});
